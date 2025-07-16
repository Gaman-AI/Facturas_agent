"""
Agent Manager for coordinating browser automation tasks
"""

import asyncio
import logging
import threading
import json
from typing import Dict, Optional, Any, List
from datetime import datetime
from dataclasses import dataclass
import traceback
import os

# Browser-use imports
from browser_use import Agent, BrowserSession, BrowserProfile
from browser_use import ChatOpenAI, ChatAnthropic

# Local imports
from src.db.database import get_db_session
from src.db.models import Task, TaskStep
from src.schemas.schemas import TaskStatus, StepType
from src.agent.socket_manager import socket_manager
from src.core.config import settings

logger = logging.getLogger(__name__)

@dataclass
class AgentSession:
    task_id: str
    status: str
    agent: Optional[Agent] = None
    browser_session: Optional[BrowserSession] = None
    browser_profile: Optional[BrowserProfile] = None
    thread: Optional[threading.Thread] = None
    stop_event: Optional[threading.Event] = None
    pause_event: Optional[threading.Event] = None
    loop: Optional[asyncio.AbstractEventLoop] = None

class AgentManager:
    def __init__(self):
        self.active_sessions: Dict[str, AgentSession] = {}
        self._setup_llm()

class BrowserUseAgentManager(AgentManager):
    def __init__(self):
        super().__init__()
    
    def _setup_llm(self):
        """Setup the LLM based on available API keys"""
        try:
            if settings.OPENAI_API_KEY:
                self.llm = ChatOpenAI(
                    api_key=settings.OPENAI_API_KEY,
                    model="gpt-4o",
                    temperature=0.1,
                    timeout=60
                )
                logger.info("Initialized OpenAI LLM")
            elif settings.ANTHROPIC_API_KEY:
                self.llm = ChatAnthropic(
                    api_key=settings.ANTHROPIC_API_KEY,
                    model="claude-3-5-sonnet-20241022",
                    temperature=0.1,
                    timeout=60
                )
                logger.info("Initialized Anthropic LLM")
            else:
                # Fallback to OpenAI without API key (will use environment variable)
                self.llm = ChatOpenAI(
                    model="gpt-4o",
                    temperature=0.1,
                    timeout=60
                )
                logger.warning("No API key provided in settings, using environment variables")
        except Exception as e:
            logger.error(f"Error setting up LLM: {e}")
            raise e
    
    async def start_agent_session(self, task_id: str, prompt: str) -> bool:
        """Start a new browser-use agent session"""
        try:
            # Check if session already exists
            if task_id in self.active_sessions:
                logger.warning(f"Agent session for task {task_id} already exists")
                return False
            
            # Update task status to running
            await self._update_task_status(task_id, TaskStatus.RUNNING)
            
            # Create agent session
            session = AgentSession(
                task_id=task_id,
                status=TaskStatus.RUNNING,
                stop_event=threading.Event(),
                pause_event=threading.Event()
            )
            
            # Start agent in a separate thread with its own event loop
            session.thread = threading.Thread(
                target=self._run_agent_thread,
                args=(task_id, prompt, session),
                daemon=True
            )
            session.thread.start()
            
            self.active_sessions[task_id] = session
            
            logger.info(f"Started browser-use agent session for task {task_id}")
            return True
            
        except Exception as e:
            logger.error(f"Error starting agent session for task {task_id}: {e}")
            await self._update_task_status(task_id, TaskStatus.FAILED, str(e))
            return False
    
    def _run_agent_thread(self, task_id: str, prompt: str, session: AgentSession):
        """Run the browser-use agent in a separate thread"""
        try:
            # Create new event loop for this thread
            loop = asyncio.new_event_loop()
            asyncio.set_event_loop(loop)
            session.loop = loop
            
            # Run the async agent execution
            loop.run_until_complete(self._execute_agent_async(task_id, prompt, session))
            
        except Exception as e:
            logger.error(f"Error in agent thread for task {task_id}: {e}")
            logger.error(traceback.format_exc())
            loop = asyncio.get_event_loop()
            loop.run_until_complete(self._update_task_status(task_id, TaskStatus.FAILED, str(e)))
        finally:
            # Clean up session
            if task_id in self.active_sessions:
                del self.active_sessions[task_id]
            
            # Close the event loop
            if session.loop and not session.loop.is_closed():
                session.loop.close()
    
    async def _execute_agent_async(self, task_id: str, prompt: str, session: AgentSession):
        """Execute the browser-use agent asynchronously with new API"""
        browser_session = None
        agent = None
        
        try:
            # Send initial thinking step
            await self._send_step_update(
                task_id, 
                StepType.THINKING, 
                {"message": f"Initializing browser automation for task: {prompt}"}
            )
            
            # Create browser profile with NEW API
            browser_profile = BrowserProfile(
                headless=settings.BROWSER_HEADLESS,
                browser_type=settings.BROWSER_TYPE.lower() if hasattr(settings, 'BROWSER_TYPE') else "chromium",
                viewport={'width': 1920, 'height': 1080},
                wait_for_network_idle_page_load_time=3.0,
                downloads_path='./tmp/downloads/',
                trace_path='./tmp/traces/',
                slow_mo=1000 if not settings.BROWSER_HEADLESS else 0
            )
            session.browser_profile = browser_profile
            
            # Initialize browser session
            await self._send_step_update(
                task_id, 
                StepType.ACTION, 
                {"message": "Starting browser session..."}
            )
            
            browser_session = BrowserSession(
                browser_profile=browser_profile
            )
            session.browser_session = browser_session
            
            await self._send_step_update(
                task_id, 
                StepType.OBSERVATION, 
                {"message": "Browser session started successfully"}
            )
            
            # Initialize agent with NEW API
            await self._send_step_update(
                task_id, 
                StepType.ACTION, 
                {"message": "Initializing AI agent..."}
            )
            
            agent = Agent(
                task=prompt,
                llm=self.llm,
                browser_session=browser_session,
                use_vision=True,
                max_failures=3,
                save_conversation_path='./tmp/conversations/'
            )
            session.agent = agent
            
            await self._send_step_update(
                task_id, 
                StepType.OBSERVATION, 
                {"message": "AI agent initialized and ready"}
            )
            
            # Execute the task with step-by-step monitoring
            await self._send_step_update(
                task_id, 
                StepType.THINKING, 
                {"message": "Agent is analyzing the task and planning execution strategy..."}
            )
            
            # Run the agent with custom step monitoring
            result = await self._run_agent_with_monitoring(agent, task_id, session)
            
            # Handle successful completion
            if result:
                await self._send_step_update(
                    task_id, 
                    StepType.OBSERVATION, 
                    {
                        "message": "Task completed successfully!",
                        "result": result if isinstance(result, (dict, list, str)) else str(result)
                    }
                )
                await self._update_task_status(task_id, TaskStatus.COMPLETED)
            else:
                await self._send_step_update(
                    task_id, 
                    StepType.OBSERVATION, 
                    {"message": "Task completed (no specific result returned)"}
                )
                await self._update_task_status(task_id, TaskStatus.COMPLETED)
            
        except Exception as e:
            error_msg = f"Agent execution failed: {str(e)}"
            logger.error(f"Agent execution error for task {task_id}: {e}")
            logger.error(traceback.format_exc())
            
            await self._send_step_update(
                task_id, 
                StepType.ERROR, 
                {"message": error_msg, "error": str(e)}
            )
            await self._update_task_status(task_id, TaskStatus.FAILED, error_msg)
            
        finally:
            # Cleanup browser
            if browser_session:
                try:
                    await self._send_step_update(
                        task_id, 
                        StepType.ACTION, 
                        {"message": "Closing browser session..."}
                    )
                    await browser_session.close()
                    await self._send_step_update(
                        task_id, 
                        StepType.OBSERVATION, 
                        {"message": "Browser session closed"}
                    )
                except Exception as e:
                    logger.error(f"Error closing browser for task {task_id}: {e}")
    
    async def _run_agent_with_monitoring(self, agent: Agent, task_id: str, session: AgentSession) -> Any:
        """Run the agent with step-by-step monitoring and pause/stop support"""
        step_count = 0
        max_steps = 50  # Prevent infinite loops
        
        try:
            # Define hook function for monitoring agent steps
            async def step_hook(agent_obj):
                nonlocal step_count
                step_count += 1
                
                # Check for stop signal
                if session.stop_event.is_set():
                    return
                
                # Handle pause
                while session.pause_event.is_set() and not session.stop_event.is_set():
                    await asyncio.sleep(0.5)
                
                # Check if stop was requested during pause
                if session.stop_event.is_set():
                    return
                
                # Send step update
                try:
                    # Get current page info if available
                    current_url = "unknown"
                    if hasattr(agent_obj, 'browser_session') and agent_obj.browser_session:
                        try:
                            current_page = await agent_obj.browser_session.get_current_page()
                            if current_page:
                                current_url = current_page.url
                        except Exception:
                            pass
                    
                    await self._send_step_update(
                        task_id,
                        StepType.ACTION,
                        {
                            "message": f"Step {step_count}: Agent is working...",
                            "current_url": current_url,
                            "step_number": step_count
                        }
                    )
                    
                    # Prevent excessive steps
                    if step_count > max_steps:
                        await self._send_step_update(
                            task_id, 
                            StepType.ERROR, 
                            {"message": f"Task exceeded maximum steps ({max_steps}). Stopping execution."}
                        )
                        session.stop_event.set()
                        return
                        
                except Exception as e:
                    logger.error(f"Error in step hook for task {task_id}: {e}")
            
            # Run the agent with the step hook
            result = await agent.run(
                on_step_start=step_hook,
                max_steps=max_steps
            )
            
            # Check if execution was stopped
            if session.stop_event.is_set():
                return None
                
            return result
            
        except Exception as e:
            logger.error(f"Error in agent monitoring for task {task_id}: {e}")
            raise e
    
    async def pause_agent_session(self, task_id: str) -> bool:
        """Pause an active agent session"""
        try:
            if task_id not in self.active_sessions:
                logger.warning(f"No active session found for task {task_id}")
                return False
            
            session = self.active_sessions[task_id]
            session.pause_event.set()
            session.status = TaskStatus.PAUSED
            
            await self._update_task_status(task_id, TaskStatus.PAUSED)
            await self._send_step_update(
                task_id,
                StepType.OBSERVATION,
                {"message": "Task paused by user. Agent is waiting for resume signal."}
            )
            
            logger.info(f"Paused browser-use agent session for task {task_id}")
            return True
            
        except Exception as e:
            logger.error(f"Error pausing agent session for task {task_id}: {e}")
            return False
    
    async def resume_agent_session(self, task_id: str) -> bool:
        """Resume a paused agent session"""
        try:
            if task_id not in self.active_sessions:
                logger.warning(f"No active session found for task {task_id}")
                return False
            
            session = self.active_sessions[task_id]
            session.pause_event.clear()
            session.status = TaskStatus.RUNNING
            
            await self._update_task_status(task_id, TaskStatus.RUNNING)
            await self._send_step_update(
                task_id,
                StepType.OBSERVATION,
                {"message": "Task resumed. Agent is continuing execution."}
            )
            
            logger.info(f"Resumed browser-use agent session for task {task_id}")
            return True
            
        except Exception as e:
            logger.error(f"Error resuming agent session for task {task_id}: {e}")
            return False
    
    async def stop_agent_session(self, task_id: str) -> bool:
        """Stop an active agent session"""
        try:
            if task_id not in self.active_sessions:
                logger.warning(f"No active session found for task {task_id}")
                return False
            
            session = self.active_sessions[task_id]
            session.stop_event.set()
            session.pause_event.clear()  # Clear pause if set
            
            # Close browser if it exists
            if session.browser_session:
                try:
                    if session.loop and not session.loop.is_closed():
                        # Run browser close in the session's event loop
                        future = asyncio.run_coroutine_threadsafe(
                            session.browser_session.close(), 
                            session.loop
                        )
                        future.result(timeout=10)  # Wait up to 10 seconds
                except Exception as e:
                    logger.error(f"Error closing browser for task {task_id}: {e}")
            
            # Wait for thread to complete (with timeout)
            if session.thread and session.thread.is_alive():
                session.thread.join(timeout=10.0)
                if session.thread.is_alive():
                    logger.warning(f"Agent thread for task {task_id} did not stop gracefully")
            
            await self._update_task_status(task_id, TaskStatus.FAILED, "Task stopped by user")
            await self._send_step_update(
                task_id,
                StepType.OBSERVATION,
                {"message": "Task stopped by user request. Browser session closed."}
            )
            
            # Clean up session
            if task_id in self.active_sessions:
                del self.active_sessions[task_id]
            
            logger.info(f"Stopped browser-use agent session for task {task_id}")
            return True
            
        except Exception as e:
            logger.error(f"Error stopping agent session for task {task_id}: {e}")
            return False
    
    def get_session_status(self, task_id: str) -> Optional[str]:
        """Get the status of an agent session"""
        session = self.active_sessions.get(task_id)
        return session.status if session else None
    
    def get_active_sessions(self) -> Dict[str, str]:
        """Get all active sessions and their statuses"""
        return {task_id: session.status for task_id, session in self.active_sessions.items()}
    
    async def _send_step_update(self, task_id: str, step_type: StepType, content: dict):
        """Send a step update via WebSocket and store in database"""
        # Add timestamp to content
        content_with_timestamp = {
            **content,
            "timestamp": datetime.utcnow().isoformat()
        }
        
        # Store step in database
        db = get_db_session()
        try:
            db_step = TaskStep(
                task_id=task_id,
                step_type=step_type.value,
                content=content_with_timestamp,
                timestamp=datetime.utcnow()
            )
            db.add(db_step)
            db.commit()
            
            # Send via WebSocket
            await socket_manager.send_step_update(
                task_id=task_id,
                step_type=step_type.value,
                content=content_with_timestamp
            )
            
        except Exception as e:
            logger.error(f"Error sending step update for task {task_id}: {e}")
        finally:
            db.close()
    
    async def _update_task_status(self, task_id: str, status: TaskStatus, error_message: str = None):
        """Update task status in database and notify via WebSocket"""
        db = get_db_session()
        try:
            task = db.query(Task).filter(Task.id == task_id).first()
            if task:
                task.status = status.value
                if error_message:
                    task.error_message = error_message
                if status in [TaskStatus.COMPLETED, TaskStatus.FAILED]:
                    task.completed_at = datetime.utcnow()
                
                db.commit()
                
                # Send status change via WebSocket
                await socket_manager.send_status_change(
                    task_id=task_id,
                    status=status.value,
                    error_message=error_message
                )
                
        except Exception as e:
            logger.error(f"Error updating task status for task {task_id}: {e}")
        finally:
            db.close()

# Global browser-use agent manager instance
agent_manager = BrowserUseAgentManager() 
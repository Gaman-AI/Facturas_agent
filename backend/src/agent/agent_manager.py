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
from browser_use import Agent, Browser, BrowserConfig, ChatOpenAI, ChatAnthropic

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
    browser: Optional[Browser] = None
    thread: Optional[threading.Thread] = None
    stop_event: Optional[threading.Event] = None
    pause_event: Optional[threading.Event] = None
    loop: Optional[asyncio.AbstractEventLoop] = None

class BrowserUseAgentManager:
    def __init__(self):
        self.active_sessions: Dict[str, AgentSession] = {}
        self._setup_llm()
    
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
        """Execute the browser-use agent asynchronously"""
        browser = None
        agent = None
        
        try:
            # Send initial thinking step
            await self._send_step_update(
                task_id, 
                StepType.THINKING, 
                {"message": f"Initializing browser automation for task: {prompt}"}
            )
            
            # Configure browser
            browser_config = BrowserConfig(
                headless=settings.HEADLESS_BROWSER,
                browser_type=settings.BROWSER_TYPE.lower() if hasattr(settings, 'BROWSER_TYPE') else "chromium",
            )
            
            # Initialize browser
            await self._send_step_update(
                task_id, 
                StepType.ACTION, 
                {"message": "Starting browser session..."}
            )
            
            browser = Browser(config=browser_config)
            session.browser = browser
            
            await self._send_step_update(
                task_id, 
                StepType.OBSERVATION, 
                {"message": "Browser session started successfully"}
            )
            
            # Initialize agent
            await self._send_step_update(
                task_id, 
                StepType.ACTION, 
                {"message": "Initializing AI agent..."}
            )
            
            agent = Agent(
                task=prompt,
                llm=self.llm,
                browser=browser,
                max_actions_per_step=10,
                max_failures=3,
                validate_output=True
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
            if browser:
                try:
                    await self._send_step_update(
                        task_id, 
                        StepType.ACTION, 
                        {"message": "Closing browser session..."}
                    )
                    await browser.close()
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
            # Get the agent's history to monitor steps
            history = agent.history
            last_history_length = 0
            
            # Start the agent execution in a task
            agent_task = asyncio.create_task(agent.run())
            
            # Monitor the agent's progress
            while not agent_task.done():
                # Check for stop signal
                if session.stop_event.is_set():
                    agent_task.cancel()
                    await self._send_step_update(
                        task_id, 
                        StepType.OBSERVATION, 
                        {"message": "Task stopped by user request"}
                    )
                    return None
                
                # Handle pause
                while session.pause_event.is_set() and not session.stop_event.is_set():
                    await asyncio.sleep(0.5)
                
                # Check if stop was requested during pause
                if session.stop_event.is_set():
                    agent_task.cancel()
                    return None
                
                # Monitor new history entries
                current_history_length = len(history.history)
                if current_history_length > last_history_length:
                    # Process new history entries
                    for i in range(last_history_length, current_history_length):
                        if i < len(history.history):
                            await self._process_history_entry(task_id, history.history[i], step_count + i)
                    
                    last_history_length = current_history_length
                
                # Prevent excessive steps
                step_count += 1
                if step_count > max_steps:
                    agent_task.cancel()
                    await self._send_step_update(
                        task_id, 
                        StepType.ERROR, 
                        {"message": f"Task exceeded maximum steps ({max_steps}). Stopping execution."}
                    )
                    return None
                
                # Small delay to prevent busy waiting
                await asyncio.sleep(1)
            
            # Get the result
            try:
                result = await agent_task
                return result
            except asyncio.CancelledError:
                return None
            
        except Exception as e:
            logger.error(f"Error in agent monitoring for task {task_id}: {e}")
            raise e
    
    async def _process_history_entry(self, task_id: str, entry: Any, step_number: int):
        """Process a single history entry and send appropriate updates"""
        try:
            # Parse the history entry based on browser-use structure
            if hasattr(entry, 'model_output'):
                model_output = entry.model_output
                
                # Handle thinking/reasoning
                if hasattr(model_output, 'current_state') and model_output.current_state:
                    await self._send_step_update(
                        task_id,
                        StepType.THINKING,
                        {
                            "message": f"Step {step_number + 1}: Analyzing current state",
                            "current_state": model_output.current_state.model_dump() if hasattr(model_output.current_state, 'model_dump') else str(model_output.current_state)
                        }
                    )
                
                # Handle actions
                if hasattr(model_output, 'action') and model_output.action:
                    action = model_output.action
                    action_description = f"Executing action: {action.__class__.__name__}"
                    
                    if hasattr(action, 'text'):
                        action_description += f" - {action.text}"
                    elif hasattr(action, 'coordinate'):
                        action_description += f" at {action.coordinate}"
                    
                    await self._send_step_update(
                        task_id,
                        StepType.ACTION,
                        {
                            "message": action_description,
                            "action_type": action.__class__.__name__,
                            "action_details": action.model_dump() if hasattr(action, 'model_dump') else str(action)
                        }
                    )
            
            # Handle results/observations
            if hasattr(entry, 'result'):
                result = entry.result
                if result:
                    await self._send_step_update(
                        task_id,
                        StepType.OBSERVATION,
                        {
                            "message": f"Step {step_number + 1} completed",
                            "result": result.model_dump() if hasattr(result, 'model_dump') else str(result)
                        }
                    )
            
            # Handle errors
            if hasattr(entry, 'error') and entry.error:
                await self._send_step_update(
                    task_id,
                    StepType.ERROR,
                    {
                        "message": f"Error in step {step_number + 1}: {entry.error}",
                        "error": str(entry.error)
                    }
                )
                
        except Exception as e:
            logger.error(f"Error processing history entry for task {task_id}: {e}")
            # Send a generic update if we can't parse the entry
            await self._send_step_update(
                task_id,
                StepType.OBSERVATION,
                {
                    "message": f"Agent executed step {step_number + 1}",
                    "raw_entry": str(entry)
                }
            )
    
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
            if session.browser:
                try:
                    if session.loop and not session.loop.is_closed():
                        # Run browser close in the session's event loop
                        future = asyncio.run_coroutine_threadsafe(
                            session.browser.close(), 
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
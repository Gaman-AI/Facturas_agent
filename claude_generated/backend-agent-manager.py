import asyncio
import logging
from typing import Dict, Optional
from datetime import datetime
import threading
import json
from dataclasses import dataclass

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
    thread: Optional[threading.Thread] = None
    stop_event: Optional[threading.Event] = None
    pause_event: Optional[threading.Event] = None

class AgentManager:
    def __init__(self):
        self.active_sessions: Dict[str, AgentSession] = {}
    
    async def start_agent_session(self, task_id: str, prompt: str) -> bool:
        """Start a new agent session for the given task"""
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
            
            # Start agent in a separate thread
            session.thread = threading.Thread(
                target=self._run_agent_thread,
                args=(task_id, prompt, session.stop_event, session.pause_event),
                daemon=True
            )
            session.thread.start()
            
            self.active_sessions[task_id] = session
            
            logger.info(f"Started agent session for task {task_id}")
            return True
            
        except Exception as e:
            logger.error(f"Error starting agent session for task {task_id}: {e}")
            await self._update_task_status(task_id, TaskStatus.FAILED, str(e))
            return False
    
    def _run_agent_thread(self, task_id: str, prompt: str, stop_event: threading.Event, pause_event: threading.Event):
        """Run the agent in a separate thread"""
        try:
            logger.info(f"Agent thread started for task {task_id}")
            
            # Simulate agent steps (replace with actual browser-use integration)
            steps = [
                {"type": "thinking", "content": {"message": f"Analyzing the task: {prompt}"}},
                {"type": "action", "content": {"message": "Initializing browser session..."}},
                {"type": "observation", "content": {"message": "Browser session started successfully"}},
                {"type": "action", "content": {"message": "Navigating to target website..."}},
                {"type": "observation", "content": {"message": "Website loaded successfully"}},
                {"type": "thinking", "content": {"message": "Analyzing page content and planning next steps"}},
                {"type": "action", "content": {"message": "Executing task-specific actions..."}},
                {"type": "observation", "content": {"message": "Task completed successfully"}},
            ]
            
            for i, step in enumerate(steps):
                # Check if we should stop
                if stop_event.is_set():
                    logger.info(f"Agent stopped for task {task_id}")
                    break
                
                # Check if we should pause
                while pause_event.is_set():
                    if stop_event.is_set():
                        break
                    threading.Event().wait(0.1)  # Small delay while paused
                
                if stop_event.is_set():
                    break
                
                # Send step update
                asyncio.run(self._send_step_update(task_id, step))
                
                # Simulate processing time
                threading.Event().wait(2.0)
            
            # Complete the task if not stopped
            if not stop_event.is_set():
                asyncio.run(self._update_task_status(task_id, TaskStatus.COMPLETED))
                logger.info(f"Agent completed task {task_id}")
            
        except Exception as e:
            logger.error(f"Error in agent thread for task {task_id}: {e}")
            asyncio.run(self._update_task_status(task_id, TaskStatus.FAILED, str(e)))
        finally:
            # Clean up session
            if task_id in self.active_sessions:
                del self.active_sessions[task_id]
    
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
            
            logger.info(f"Paused agent session for task {task_id}")
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
            
            logger.info(f"Resumed agent session for task {task_id}")
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
            
            # Wait for thread to complete (with timeout)
            if session.thread and session.thread.is_alive():
                session.thread.join(timeout=5.0)
            
            await self._update_task_status(task_id, TaskStatus.FAILED, "Task stopped by user")
            
            # Clean up session
            if task_id in self.active_sessions:
                del self.active_sessions[task_id]
            
            logger.info(f"Stopped agent session for task {task_id}")
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
    
    async def _send_step_update(self, task_id: str, step: dict):
        """Send a step update via WebSocket and store in database"""
        # Store step in database
        db = get_db_session()
        try:
            db_step = TaskStep(
                task_id=task_id,
                step_type=step["type"],
                content=step["content"],
                timestamp=datetime.utcnow()
            )
            db.add(db_step)
            db.commit()
            
            # Send via WebSocket
            await socket_manager.send_step_update(
                task_id=task_id,
                step_type=step["type"],
                content=step["content"]
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

# Global agent manager instance
agent_manager = AgentManager()
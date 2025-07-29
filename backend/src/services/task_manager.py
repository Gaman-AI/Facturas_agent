"""
Task Manager Service - Handles task lifecycle management for browser automation
"""

import asyncio
import uuid
from datetime import datetime
from typing import Dict, Optional
from enum import Enum
import logging

logger = logging.getLogger(__name__)

class TaskStatus(Enum):
    CREATED = "created"
    INITIALIZING = "initializing"
    CONNECTING = "connecting"
    RUNNING = "running"
    COMPLETED = "completed"
    FAILED = "failed"
    CANCELLED = "cancelled"
    STOPPED = "stopped"

class TaskManager:
    """Manages browser automation task lifecycle"""
    
    def __init__(self):
        self.active_tasks: Dict[str, dict] = {}
        self.completed_tasks: Dict[str, dict] = {}
        self._lock = asyncio.Lock()
    
    async def create_task(self, task_description: str) -> str:
        """Create a new task and return task ID"""
        async with self._lock:
            task_id = str(uuid.uuid4())
            self.active_tasks[task_id] = {
                "id": task_id,
                "description": task_description,
                "status": TaskStatus.CREATED.value,
                "created_at": datetime.now(),
                "updated_at": datetime.now(),
                "session": None,
                "agent": None,
                "result": None,
                "error": None,
                "live_url": None,
                "progress": None,
                "cancel_event": asyncio.Event()
            }
            logger.info(f"Created task {task_id}: {task_description}")
            return task_id
    
    async def get_task(self, task_id: str) -> Optional[dict]:
        """Get task by ID from active or completed tasks"""
        async with self._lock:
            if task_id in self.active_tasks:
                return self.active_tasks[task_id].copy()
            if task_id in self.completed_tasks:
                return self.completed_tasks[task_id].copy()
            return None
    
    async def update_task_status(self, task_id: str, status: TaskStatus, **kwargs):
        """Update task status and additional fields"""
        async with self._lock:
            if task_id in self.active_tasks:
                self.active_tasks[task_id]["status"] = status.value
                self.active_tasks[task_id]["updated_at"] = datetime.now()
                
                for key, value in kwargs.items():
                    self.active_tasks[task_id][key] = value
                
                logger.info(f"Updated task {task_id} status to {status.value}")
    
    async def complete_task(self, task_id: str, result: str = None, error: str = None):
        """Complete a task and move it to completed tasks"""
        async with self._lock:
            if task_id in self.active_tasks:
                task = self.active_tasks.pop(task_id)
                task["status"] = TaskStatus.COMPLETED.value if result else TaskStatus.FAILED.value
                task["result"] = result
                task["error"] = error
                task["completed_at"] = datetime.now()
                task["updated_at"] = datetime.now()
                
                # Clean up references
                task["session"] = None
                task["agent"] = None
                task["cancel_event"] = None
                
                self.completed_tasks[task_id] = task
                
                status_msg = "completed" if result else "failed"
                logger.info(f"Task {task_id} {status_msg}")
    
    async def cancel_task(self, task_id: str):
        """Cancel a running task"""
        async with self._lock:
            if task_id in self.active_tasks:
                task = self.active_tasks[task_id]
                task["cancel_event"].set()
                task["status"] = TaskStatus.CANCELLED.value
                task["updated_at"] = datetime.now()
                logger.info(f"Cancelled task {task_id}")
    
    async def stop_task(self, task_id: str):
        """Stop a running task"""
        async with self._lock:
            if task_id in self.active_tasks:
                task = self.active_tasks[task_id]
                task["cancel_event"].set()
                task["status"] = TaskStatus.STOPPED.value
                task["updated_at"] = datetime.now()
                logger.info(f"Stopped task {task_id}")
    
    async def get_all_tasks(self) -> Dict[str, dict]:
        """Get all tasks (active and completed)"""
        async with self._lock:
            all_tasks = {}
            all_tasks.update(self.active_tasks)
            all_tasks.update(self.completed_tasks)
            return all_tasks
    
    async def get_task_summary(self, task_id: str) -> Optional[dict]:
        """Get task summary without sensitive data"""
        task = await self.get_task(task_id)
        if not task:
            return None
        
        return {
            "task_id": task_id,
            "description": task["description"],
            "status": task["status"],
            "created_at": task["created_at"],
            "updated_at": task["updated_at"],
            "live_url": task.get("live_url"),
            "progress": task.get("progress"),
            "error": task.get("error") if task["status"] in [TaskStatus.FAILED.value, TaskStatus.CANCELLED.value] else None
        }
    
    async def get_all_task_summaries(self) -> list:
        """Get all task summaries"""
        all_tasks = await self.get_all_tasks()
        summaries = []
        
        for task_id, task in all_tasks.items():
            summary = await self.get_task_summary(task_id)
            if summary:
                summaries.append(summary)
        
        return sorted(summaries, key=lambda x: x["created_at"], reverse=True)
    
    async def cleanup_old_tasks(self, max_completed_tasks: int = 100):
        """Clean up old completed tasks to prevent memory issues"""
        async with self._lock:
            if len(self.completed_tasks) > max_completed_tasks:
                # Sort by completion time and keep only the most recent
                sorted_tasks = sorted(
                    self.completed_tasks.items(),
                    key=lambda x: x[1]["completed_at"],
                    reverse=True
                )
                
                # Keep only the most recent tasks
                self.completed_tasks = dict(sorted_tasks[:max_completed_tasks])
                logger.info(f"Cleaned up old completed tasks, keeping {max_completed_tasks}")
    
    async def get_stats(self) -> dict:
        """Get task manager statistics"""
        async with self._lock:
            active_count = len(self.active_tasks)
            completed_count = len(self.completed_tasks)
            
            # Count by status
            status_counts = {}
            for task in self.active_tasks.values():
                status = task["status"]
                status_counts[status] = status_counts.get(status, 0) + 1
            
            return {
                "active_tasks": active_count,
                "completed_tasks": completed_count,
                "total_tasks": active_count + completed_count,
                "status_counts": status_counts
            }

# Global task manager instance
task_manager = TaskManager() 
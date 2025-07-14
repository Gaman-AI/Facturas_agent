from sqlalchemy.orm import Session
from typing import List, Optional
import logging
from datetime import datetime

from src.db.models import Task, TaskStep
from src.schemas.schemas import TaskCreate, TaskUpdate, TaskResponse, TaskListResponse, TaskStatus
from src.agent.agent_manager import agent_manager

logger = logging.getLogger(__name__)

class TaskService:
    
    @staticmethod
    async def create_task(db: Session, task_data: TaskCreate) -> TaskResponse:
        """Create a new task and start the agent session"""
        try:
            # Create task in database
            db_task = Task(
                prompt=task_data.prompt,
                status=TaskStatus.PENDING.value,
                created_at=datetime.utcnow()
            )
            
            db.add(db_task)
            db.commit()
            db.refresh(db_task)
            
            logger.info(f"Created task {db_task.id} with prompt: {task_data.prompt}")
            
            # Start agent session asynchronously
            success = await agent_manager.start_agent_session(db_task.id, task_data.prompt)
            
            if not success:
                # Update task status to failed if agent couldn't start
                db_task.status = TaskStatus.FAILED.value
                db_task.error_message = "Failed to start agent session"
                db.commit()
            
            # Convert to response model
            return TaskResponse.from_orm(db_task)
            
        except Exception as e:
            logger.error(f"Error creating task: {e}")
            db.rollback()
            raise e
    
    @staticmethod
    def get_task(db: Session, task_id: str) -> Optional[TaskResponse]:
        """Get a task by ID with all its steps"""
        try:
            task = db.query(Task).filter(Task.id == task_id).first()
            if not task:
                return None
            
            return TaskResponse.from_orm(task)
            
        except Exception as e:
            logger.error(f"Error getting task {task_id}: {e}")
            raise e
    
    @staticmethod
    def get_tasks(db: Session, skip: int = 0, limit: int = 100) -> List[TaskListResponse]:
        """Get all tasks (without steps for performance)"""
        try:
            tasks = db.query(Task).order_by(Task.created_at.desc()).offset(skip).limit(limit).all()
            return [TaskListResponse.from_orm(task) for task in tasks]
            
        except Exception as e:
            logger.error(f"Error getting tasks: {e}")
            raise e
    
    @staticmethod
    async def pause_task(db: Session, task_id: str) -> bool:
        """Pause a running task"""
        try:
            # Check if task exists
            task = db.query(Task).filter(Task.id == task_id).first()
            if not task:
                logger.warning(f"Task {task_id} not found")
                return False
            
            if task.status != TaskStatus.RUNNING.value:
                logger.warning(f"Task {task_id} is not running (status: {task.status})")
                return False
            
            # Pause the agent session
            success = await agent_manager.pause_agent_session(task_id)
            
            if success:
                logger.info(f"Paused task {task_id}")
            
            return success
            
        except Exception as e:
            logger.error(f"Error pausing task {task_id}: {e}")
            return False
    
    @staticmethod
    async def resume_task(db: Session, task_id: str) -> bool:
        """Resume a paused task"""
        try:
            # Check if task exists
            task = db.query(Task).filter(Task.id == task_id).first()
            if not task:
                logger.warning(f"Task {task_id} not found")
                return False
            
            if task.status != TaskStatus.PAUSED.value:
                logger.warning(f"Task {task_id} is not paused (status: {task.status})")
                return False
            
            # Resume the agent session
            success = await agent_manager.resume_agent_session(task_id)
            
            if success:
                logger.info(f"Resumed task {task_id}")
            
            return success
            
        except Exception as e:
            logger.error(f"Error resuming task {task_id}: {e}")
            return False
    
    @staticmethod
    async def stop_task(db: Session, task_id: str) -> bool:
        """Stop a running or paused task"""
        try:
            # Check if task exists
            task = db.query(Task).filter(Task.id == task_id).first()
            if not task:
                logger.warning(f"Task {task_id} not found")
                return False
            
            if task.status in [TaskStatus.COMPLETED.value, TaskStatus.FAILED.value]:
                logger.warning(f"Task {task_id} is already finished (status: {task.status})")
                return False
            
            # Stop the agent session
            success = await agent_manager.stop_agent_session(task_id)
            
            if success:
                logger.info(f"Stopped task {task_id}")
            
            return success
            
        except Exception as e:
            logger.error(f"Error stopping task {task_id}: {e}")
            return False
    
    @staticmethod
    def delete_task(db: Session, task_id: str) -> bool:
        """Delete a task and all its steps"""
        try:
            # Check if task is still running
            task = db.query(Task).filter(Task.id == task_id).first()
            if not task:
                logger.warning(f"Task {task_id} not found")
                return False
            
            if task.status in [TaskStatus.RUNNING.value, TaskStatus.PAUSED.value]:
                logger.warning(f"Cannot delete running/paused task {task_id}")
                return False
            
            # Delete task (steps will be deleted due to cascade)
            db.delete(task)
            db.commit()
            
            logger.info(f"Deleted task {task_id}")
            return True
            
        except Exception as e:
            logger.error(f"Error deleting task {task_id}: {e}")
            db.rollback()
            return False
    
    @staticmethod
    def get_task_steps(db: Session, task_id: str) -> List[dict]:
        """Get all steps for a specific task"""
        try:
            steps = db.query(TaskStep).filter(TaskStep.task_id == task_id).order_by(TaskStep.timestamp.asc()).all()
            return [
                {
                    "id": step.id,
                    "step_type": step.step_type,
                    "content": step.content,
                    "timestamp": step.timestamp.isoformat()
                }
                for step in steps
            ]
            
        except Exception as e:
            logger.error(f"Error getting task steps for task {task_id}: {e}")
            return [] 
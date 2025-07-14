from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session
from typing import List
import logging

from src.db.database import get_db
from src.schemas.schemas import (
    TaskCreate, 
    TaskResponse, 
    TaskListResponse,
    TaskStatus
)
from src.services.task_service import TaskService

logger = logging.getLogger(__name__)
router = APIRouter()

@router.post("/tasks", response_model=TaskResponse)
async def create_task(
    task_data: TaskCreate,
    db: Session = Depends(get_db)
):
    """Create a new automation task"""
    try:
        task = await TaskService.create_task(db, task_data)
        return task
    except Exception as e:
        logger.error(f"Error creating task: {e}")
        raise HTTPException(status_code=500, detail="Failed to create task")

@router.get("/tasks", response_model=List[TaskListResponse])
async def get_tasks(
    skip: int = Query(0, ge=0),
    limit: int = Query(100, ge=1, le=1000),
    db: Session = Depends(get_db)
):
    """Get all tasks"""
    try:
        tasks = TaskService.get_tasks(db, skip=skip, limit=limit)
        return tasks
    except Exception as e:
        logger.error(f"Error getting tasks: {e}")
        raise HTTPException(status_code=500, detail="Failed to retrieve tasks")

@router.get("/tasks/{task_id}", response_model=TaskResponse)
async def get_task(
    task_id: str,
    db: Session = Depends(get_db)
):
    """Get a specific task by ID"""
    try:
        task = TaskService.get_task(db, task_id)
        if not task:
            raise HTTPException(status_code=404, detail="Task not found")
        return task
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error getting task {task_id}: {e}")
        raise HTTPException(status_code=500, detail="Failed to retrieve task")

@router.post("/tasks/{task_id}/pause")
async def pause_task(
    task_id: str,
    db: Session = Depends(get_db)
):
    """Pause a running task"""
    try:
        success = await TaskService.pause_task(db, task_id)
        if not success:
            raise HTTPException(status_code=400, detail="Failed to pause task")
        return {"message": "Task paused successfully", "task_id": task_id}
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error pausing task {task_id}: {e}")
        raise HTTPException(status_code=500, detail="Failed to pause task")

@router.post("/tasks/{task_id}/resume")
async def resume_task(
    task_id: str,
    db: Session = Depends(get_db)
):
    """Resume a paused task"""
    try:
        success = await TaskService.resume_task(db, task_id)
        if not success:
            raise HTTPException(status_code=400, detail="Failed to resume task")
        return {"message": "Task resumed successfully", "task_id": task_id}
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error resuming task {task_id}: {e}")
        raise HTTPException(status_code=500, detail="Failed to resume task")

@router.post("/tasks/{task_id}/stop")
async def stop_task(
    task_id: str,
    db: Session = Depends(get_db)
):
    """Stop a running or paused task"""
    try:
        success = await TaskService.stop_task(db, task_id)
        if not success:
            raise HTTPException(status_code=400, detail="Failed to stop task")
        return {"message": "Task stopped successfully", "task_id": task_id}
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error stopping task {task_id}: {e}")
        raise HTTPException(status_code=500, detail="Failed to stop task")

@router.delete("/tasks/{task_id}")
async def delete_task(
    task_id: str,
    db: Session = Depends(get_db)
):
    """Delete a completed or failed task"""
    try:
        success = TaskService.delete_task(db, task_id)
        if not success:
            raise HTTPException(status_code=400, detail="Failed to delete task")
        return {"message": "Task deleted successfully", "task_id": task_id}
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error deleting task {task_id}: {e}")
        raise HTTPException(status_code=500, detail="Failed to delete task")

@router.get("/tasks/{task_id}/steps")
async def get_task_steps(
    task_id: str,
    db: Session = Depends(get_db)
):
    """Get all steps for a specific task"""
    try:
        # First check if task exists
        task = TaskService.get_task(db, task_id)
        if not task:
            raise HTTPException(status_code=404, detail="Task not found")
        
        steps = TaskService.get_task_steps(db, task_id)
        return {"task_id": task_id, "steps": steps}
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error getting task steps for {task_id}: {e}")
        raise HTTPException(status_code=500, detail="Failed to retrieve task steps")
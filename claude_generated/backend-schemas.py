from pydantic import BaseModel, Field
from typing import Optional, List, Any, Dict
from datetime import datetime
from enum import Enum

class TaskStatus(str, Enum):
    PENDING = "pending"
    RUNNING = "running"
    PAUSED = "paused"
    COMPLETED = "completed"
    FAILED = "failed"

class StepType(str, Enum):
    THINKING = "thinking"
    ACTION = "action"
    OBSERVATION = "observation"
    ERROR = "error"

# Task Schemas
class TaskCreate(BaseModel):
    prompt: str = Field(..., min_length=1, max_length=2000, description="Task description")

class TaskUpdate(BaseModel):
    status: Optional[TaskStatus] = None
    error_message: Optional[str] = None
    result: Optional[Dict[str, Any]] = None

class TaskStepCreate(BaseModel):
    step_type: StepType
    content: Dict[str, Any]

class TaskStepResponse(BaseModel):
    id: int
    task_id: str
    step_type: str
    content: Dict[str, Any]
    timestamp: datetime
    
    class Config:
        from_attributes = True

class TaskResponse(BaseModel):
    id: str
    prompt: str
    status: str
    created_at: datetime
    completed_at: Optional[datetime] = None
    error_message: Optional[str] = None
    result: Optional[Dict[str, Any]] = None
    steps: Optional[List[TaskStepResponse]] = []
    
    class Config:
        from_attributes = True

class TaskListResponse(BaseModel):
    id: str
    prompt: str
    status: str
    created_at: datetime
    completed_at: Optional[datetime] = None
    
    class Config:
        from_attributes = True

# WebSocket Message Schemas
class WebSocketMessage(BaseModel):
    type: str  # step_update, status_change, error
    task_id: str
    data: Dict[str, Any]

class AgentStepUpdate(BaseModel):
    step_type: StepType
    content: Dict[str, Any]
    timestamp: Optional[datetime] = None

# Health Check Schema
class HealthResponse(BaseModel):
    status: str
    timestamp: datetime
    version: str = "1.0.0"
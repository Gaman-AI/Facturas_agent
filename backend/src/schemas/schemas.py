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

# Browser Agent Schemas
class BrowserTaskRequest(BaseModel):
    task_description: str = Field(..., min_length=1, max_length=2000, description="Browser task description")
    prompt: Optional[str] = Field(None, description="Alternative field name for task description")
    llm_provider: str = Field(default="openai", description="LLM provider to use")
    model: str = Field(default="gpt-4o", description="Model to use")
    browser_config: Optional[Dict[str, Any]] = Field(default=None, description="Browser configuration")
    session_id: Optional[str] = Field(None, description="Session ID for WebSocket connection")
    
    def get_task_description(self) -> str:
        """Get task description from either field"""
        return self.task_description or self.prompt or ""

class BrowserTaskResponse(BaseModel):
    task_id: str
    status: str
    result: Optional[Dict[str, Any]] = None
    actions: Optional[List[str]] = []
    execution_time: Optional[float] = None
    logs: Optional[List[Dict[str, Any]]] = []

# Health Check Schema
class HealthResponse(BaseModel):
    status: str
    timestamp: datetime
    version: str = "1.0.0" 
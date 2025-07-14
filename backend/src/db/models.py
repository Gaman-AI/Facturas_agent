from sqlalchemy import Column, Integer, String, Text, DateTime, JSON, ForeignKey
from sqlalchemy.ext.declarative import declarative_base
from sqlalchemy.orm import relationship
from datetime import datetime
import uuid

Base = declarative_base()

class Task(Base):
    __tablename__ = "tasks"
    
    id = Column(String, primary_key=True, default=lambda: str(uuid.uuid4()))
    prompt = Column(Text, nullable=False)
    status = Column(String(20), nullable=False, default="pending")  # pending, running, paused, completed, failed
    created_at = Column(DateTime, default=datetime.utcnow)
    completed_at = Column(DateTime, nullable=True)
    error_message = Column(Text, nullable=True)
    result = Column(JSON, nullable=True)
    
    # Relationship to task steps
    steps = relationship("TaskStep", back_populates="task", cascade="all, delete-orphan")
    
    def __repr__(self):
        return f"<Task(id={self.id}, status={self.status}, prompt={self.prompt[:50]}...)>"

class TaskStep(Base):
    __tablename__ = "task_steps"
    
    id = Column(Integer, primary_key=True, autoincrement=True)
    task_id = Column(String, ForeignKey("tasks.id"), nullable=False)
    step_type = Column(String(50), nullable=False)  # thinking, action, observation, error
    content = Column(JSON, nullable=False)
    timestamp = Column(DateTime, default=datetime.utcnow)
    
    # Relationship to task
    task = relationship("Task", back_populates="steps")
    
    def __repr__(self):
        return f"<TaskStep(id={self.id}, task_id={self.task_id}, type={self.step_type})>" 
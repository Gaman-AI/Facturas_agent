#!/usr/bin/env python3
"""
Simple FastAPI server with Browser-Use Agent
Minimal implementation for testing browser automation
"""

import asyncio
import sys
import logging
from typing import Optional
from datetime import datetime

# Set Windows event loop policy FIRST
if sys.platform.startswith('win'):
    asyncio.set_event_loop_policy(asyncio.WindowsProactorEventLoopPolicy())
    print("✅ Windows Proactor Event Loop Policy set")

from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
import uvicorn

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)

# Pydantic models
class TaskRequest(BaseModel):
    task: str
    url: Optional[str] = None
    headless: bool = True

class TaskResponse(BaseModel):
    task_id: str
    status: str
    message: str
    result: Optional[str] = None
    error: Optional[str] = None

# Create FastAPI app
app = FastAPI(
    title="Simple Browser Agent",
    description="Simple browser automation using browser-use",
    version="1.0.0"
)

# Add CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Store running tasks (in production, use a proper database)
tasks = {}

async def run_browser_task(task_id: str, task_description: str, url: Optional[str] = None, headless: bool = True):
    """Run a browser automation task"""
    try:
        logger.info(f"🤖 Starting task {task_id}: {task_description}")
        tasks[task_id]["status"] = "running"
        
        # Import browser-use
        from browser_use import Agent
        from langchain_openai import ChatOpenAI
        
        # Initialize LLM (you can also use other LLMs or mock it for testing)
        # For testing, we'll use a simple approach
        try:
            # Try to use OpenAI (if API key is available)
            llm = ChatOpenAI(model="gpt-4")
        except:
            # Fallback: we'll create a simple mock LLM
            logger.warning("⚠️ No OpenAI API key found, using mock LLM for testing")
            from langchain_core.language_models.fake import FakeListLLM
            llm = FakeListLLM(responses=["I'll help you navigate the website and complete the task."])
        
        # Create the agent
        agent = Agent(
            task=task_description,
            llm=llm,
            use_vision=True,
            save_conversation_path=f"./logs/conversation_{task_id}.json",
            max_failures=3,
            browser_config={
                "headless": headless,
                "disable_security": True,
            }
        )
        
        # Add URL to task if provided
        if url:
            task_description = f"Navigate to {url} and {task_description}"
            agent.task = task_description
        
        # Run the task
        result = await agent.run()
        
        # Update task status
        tasks[task_id]["status"] = "completed"
        tasks[task_id]["result"] = str(result)
        tasks[task_id]["completed_at"] = datetime.now().isoformat()
        
        logger.info(f"✅ Task {task_id} completed successfully")
        return result
        
    except Exception as e:
        logger.error(f"❌ Task {task_id} failed: {e}")
        tasks[task_id]["status"] = "failed"
        tasks[task_id]["error"] = str(e)
        tasks[task_id]["completed_at"] = datetime.now().isoformat()
        raise e

@app.get("/")
async def root():
    """Root endpoint"""
    return {
        "message": "Simple Browser Agent API",
        "version": "1.0.0",
        "endpoints": {
            "create_task": "POST /task",
            "get_task": "GET /task/{task_id}",
            "health": "GET /health"
        }
    }

@app.get("/health")
async def health_check():
    """Health check endpoint"""
    try:
        # Test if browser-use is available
        from browser_use import Agent
        return {
            "status": "healthy",
            "timestamp": datetime.now().isoformat(),
            "browser_use_available": True
        }
    except ImportError:
        return {
            "status": "degraded",
            "timestamp": datetime.now().isoformat(),
            "browser_use_available": False,
            "error": "browser-use not installed"
        }

@app.post("/task", response_model=TaskResponse)
async def create_task(request: TaskRequest):
    """Create and run a browser automation task"""
    
    # Generate task ID
    task_id = f"task_{datetime.now().strftime('%Y%m%d_%H%M%S')}_{len(tasks)}"
    
    # Initialize task
    tasks[task_id] = {
        "task_id": task_id,
        "task": request.task,
        "url": request.url,
        "status": "created",
        "created_at": datetime.now().isoformat(),
        "result": None,
        "error": None
    }
    
    logger.info(f"📋 Created task {task_id}: {request.task}")
    
    # Start the task in background
    asyncio.create_task(
        run_browser_task(
            task_id=task_id,
            task_description=request.task,
            url=request.url,
            headless=request.headless
        )
    )
    
    return TaskResponse(
        task_id=task_id,
        status="created",
        message=f"Task created and started: {request.task}"
    )

@app.get("/task/{task_id}", response_model=TaskResponse)
async def get_task(task_id: str):
    """Get task status and result"""
    
    if task_id not in tasks:
        raise HTTPException(status_code=404, detail="Task not found")
    
    task = tasks[task_id]
    
    return TaskResponse(
        task_id=task_id,
        status=task["status"],
        message=f"Task status: {task['status']}",
        result=task.get("result"),
        error=task.get("error")
    )

@app.get("/tasks")
async def list_tasks():
    """List all tasks"""
    return {
        "tasks": list(tasks.values()),
        "count": len(tasks)
    }

@app.delete("/task/{task_id}")
async def delete_task(task_id: str):
    """Delete a task"""
    if task_id not in tasks:
        raise HTTPException(status_code=404, detail="Task not found")
    
    del tasks[task_id]
    return {"message": f"Task {task_id} deleted"}

# Test endpoint for browser automation
@app.post("/test")
async def test_browser():
    """Test browser automation with a simple task"""
    
    test_task = TaskRequest(
        task="Navigate to example.com and get the page title",
        url="https://example.com",
        headless=True
    )
    
    return await create_task(test_task)

if __name__ == "__main__":
    print("🚀 Starting Simple Browser Agent API...")
    print("📖 Available endpoints:")
    print("  POST /task - Create a new browser automation task")
    print("  GET /task/{task_id} - Get task status")
    print("  GET /tasks - List all tasks")
    print("  POST /test - Run a test task")
    print("  GET /health - Health check")
    print()
    print("💡 Example usage:")
    print('  curl -X POST "http://localhost:8000/task" \\')
    print('    -H "Content-Type: application/json" \\')
    print('    -d \'{"task": "Get the page title", "url": "https://example.com"}\'')
    print()
    
    uvicorn.run(
        "main:app",
        host="0.0.0.0",
        port=8000,
        reload=True,
        log_level="info"
    )
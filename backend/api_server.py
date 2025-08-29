#!/usr/bin/env python3
"""
Simple FastAPI server for Browser Automation Service
"""

import os
import logging
from datetime import datetime
from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from typing import Optional, Dict, Any

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)

# FastAPI app
app = FastAPI(
    title="CFDI Browser Automation Service",
    description="Mexican CFDI 4.0 Invoice Automation via Browser-Use",
    version="2.0.0"
)

# CORS configuration
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Health check endpoint
@app.get("/health")
async def health_check():
    return {
        "status": "healthy",
        "service": "cfdi-browser-automation",
        "version": "2.0.0",
        "timestamp": datetime.utcnow().isoformat(),
        "python_version": f"{os.sys.version_info.major}.{os.sys.version_info.minor}.{os.sys.version_info.micro}"
    }

# Root endpoint
@app.get("/")
async def root():
    return {
        "message": "CFDI Browser Automation Service",
        "version": "2.0.0",
        "status": "online",
        "timestamp": datetime.utcnow().isoformat()
    }

# Task request model
class TaskRequest(BaseModel):
    task: str
    vendor_url: Optional[str] = None
    model: str = "gpt-4"
    max_steps: int = 50
    timeout_minutes: int = 30

# Task execution endpoint
@app.post("/run-task")
async def run_task(request: TaskRequest):
    try:
        logger.info(f"Received task: {request.task}")
        
        # Placeholder response for testing
        return {
            "status": "received",
            "task": request.task,
            "message": "Task received successfully (testing mode)",
            "timestamp": datetime.utcnow().isoformat()
        }
        
    except Exception as e:
        logger.error(f"Task execution failed: {e}")
        raise HTTPException(status_code=500, detail=str(e))

if __name__ == "__main__":
    import uvicorn
    
    port = int(os.getenv("PORT", 9000))
    host = os.getenv("HOST", "0.0.0.0")
    
    logger.info(f"Starting server on {host}:{port}")
    
    uvicorn.run(
        "api_server:app",
        host=host,
        port=port,
        log_level="info",
        reload=False
    )

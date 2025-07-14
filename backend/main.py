from fastapi import FastAPI, WebSocket, WebSocketDisconnect, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from contextlib import asynccontextmanager
import uvicorn
import logging
from src.core.config import settings
from src.api.endpoints import tasks, health, browser_agent_realtime
from src.agent.socket_manager import socket_manager
from src.db.database import create_tables

# Configure logging
logging.basicConfig(level=getattr(logging, settings.LOG_LEVEL))
logger = logging.getLogger(__name__)

@asynccontextmanager
async def lifespan(app: FastAPI):
    # Startup
    logger.info("Starting up the Browser Use Agent API...")
    logger.info(f"API will be available at: http://{settings.HOST}:{settings.PORT}")
    logger.info(f"CORS origins: {settings.cors_origins}")
    
    try:
        await create_tables()
        logger.info("Database tables created/verified successfully")
    except Exception as e:
        logger.error(f"Failed to create database tables: {e}")
        raise
    
    yield
    
    # Shutdown
    logger.info("Shutting down the Browser Use Agent API...")

app = FastAPI(
    title=settings.PROJECT_NAME,
    description="API for managing browser automation tasks with real-time updates",
    version="1.0.0",
    lifespan=lifespan
)

# Enhanced CORS middleware configuration
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.cors_origins,
    allow_credentials=True,
    allow_methods=["GET", "POST", "PUT", "DELETE", "OPTIONS", "PATCH"],
    allow_headers=["*"],
    expose_headers=["*"],
)

# Add error handling middleware
@app.exception_handler(Exception)
async def global_exception_handler(request, exc):
    logger.error(f"Global exception handler: {exc}")
    return JSONResponse(
        status_code=500,
        content={"detail": "Internal server error", "error": str(exc)}
    )

# Include API routes with proper prefixes
app.include_router(health.router, prefix=settings.API_V1_STR, tags=["health"])
app.include_router(tasks.router, prefix=settings.API_V1_STR, tags=["tasks"])
app.include_router(browser_agent_realtime.router, prefix=settings.API_V1_STR, tags=["browser-agent-realtime"])

# Legacy WebSocket endpoint for backward compatibility
@app.websocket("/ws/{task_id}")
async def websocket_endpoint(websocket: WebSocket, task_id: str):
    await socket_manager.connect(websocket, task_id)
    try:
        while True:
            # Keep connection alive and listen for any client messages
            data = await websocket.receive_text()
            logger.info(f"Received message from client for task {task_id}: {data}")
    except WebSocketDisconnect:
        socket_manager.disconnect(websocket, task_id)
        logger.info(f"Client disconnected from task {task_id}")
    except Exception as e:
        logger.error(f"WebSocket error for task {task_id}: {e}")
        socket_manager.disconnect(websocket, task_id)

# Root endpoint
@app.get("/")
async def root():
    return {
        "message": "Browser Use Agent API is running",
        "version": "1.0.0",
        "docs": "/docs",
        "health": f"{settings.API_V1_STR}/health"
    }

# Health check endpoint at root level
@app.get("/health")
async def health_check():
    return {
        "status": "healthy",
        "service": "Browser Use Agent API",
        "version": "1.0.0"
    }

if __name__ == "__main__":
    uvicorn.run(
        "main:app",
        host=settings.HOST,
        port=settings.PORT,
        reload=True,
        log_level=settings.LOG_LEVEL.lower()
    ) 
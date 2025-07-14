from fastapi import FastAPI, WebSocket, WebSocketDisconnect
from fastapi.middleware.cors import CORSMiddleware
from contextlib import asynccontextmanager
import uvicorn
import logging
from src.core.config import settings
from src.api.endpoints import tasks, health
from src.agent.socket_manager import socket_manager
from src.db.database import create_tables

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

@asynccontextmanager
async def lifespan(app: FastAPI):
    # Startup
    logger.info("Starting up the application...")
    await create_tables()
    logger.info("Database tables created/verified")
    yield
    # Shutdown
    logger.info("Shutting down the application...")

app = FastAPI(
    title="Browser Use Agent API",
    description="API for managing browser automation tasks",
    version="1.0.0",
    lifespan=lifespan
)

# CORS middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000", "http://localhost:5173"],  # React dev servers
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Include API routes
app.include_router(health.router, prefix="/api/v1", tags=["health"])
app.include_router(tasks.router, prefix="/api/v1", tags=["tasks"])

# WebSocket endpoint for real-time updates
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

@app.get("/")
async def root():
    return {"message": "Browser Use Agent API is running"}

if __name__ == "__main__":
    uvicorn.run(
        "main:app",
        host="0.0.0.0",
        port=8000,
        reload=True,
        log_level="info"
    )
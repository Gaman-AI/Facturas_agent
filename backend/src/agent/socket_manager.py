from fastapi import WebSocket
from typing import Dict, List
import json
import logging
from src.schemas.schemas import WebSocketMessage

logger = logging.getLogger(__name__)

class SocketManager:
    def __init__(self):
        # Dictionary to store active connections: {task_id: [websocket1, websocket2, ...]}
        self.active_connections: Dict[str, List[WebSocket]] = {}
    
    async def connect(self, websocket: WebSocket, task_id: str):
        """Accept a new WebSocket connection for a specific task"""
        await websocket.accept()
        
        if task_id not in self.active_connections:
            self.active_connections[task_id] = []
        
        self.active_connections[task_id].append(websocket)
        logger.info(f"Client connected to task {task_id}. Total connections: {len(self.active_connections[task_id])}")
    
    def disconnect(self, websocket: WebSocket, task_id: str):
        """Remove a WebSocket connection"""
        if task_id in self.active_connections:
            if websocket in self.active_connections[task_id]:
                self.active_connections[task_id].remove(websocket)
                logger.info(f"Client disconnected from task {task_id}. Remaining connections: {len(self.active_connections[task_id])}")
            
            # Clean up empty task entries
            if not self.active_connections[task_id]:
                del self.active_connections[task_id]
    
    async def broadcast_to_task(self, task_id: str, message: dict):
        """Send a message to all clients connected to a specific task"""
        if task_id not in self.active_connections:
            logger.warning(f"No active connections for task {task_id}")
            return
        
        # Create a copy of the connections list to avoid modification during iteration
        connections = self.active_connections[task_id].copy()
        
        for websocket in connections:
            try:
                await websocket.send_text(json.dumps(message))
            except Exception as e:
                logger.error(f"Error sending message to websocket for task {task_id}: {e}")
                # Remove failed connection
                self.disconnect(websocket, task_id)
    
    async def send_step_update(self, task_id: str, step_type: str, content: dict):
        """Send a step update to all clients connected to a task"""
        message = {
            "type": "step_update",
            "task_id": task_id,
            "data": {
                "step_type": step_type,
                "content": content,
                "timestamp": None  # Will be set by the frontend
            }
        }
        await self.broadcast_to_task(task_id, message)
        logger.info(f"Sent step update for task {task_id}: {step_type}")
    
    async def send_status_change(self, task_id: str, status: str, error_message: str = None):
        """Send a status change to all clients connected to a task"""
        message = {
            "type": "status_change",
            "task_id": task_id,
            "data": {
                "status": status,
                "error_message": error_message
            }
        }
        await self.broadcast_to_task(task_id, message)
        logger.info(f"Sent status change for task {task_id}: {status}")
    
    def get_connection_count(self, task_id: str) -> int:
        """Get the number of active connections for a task"""
        return len(self.active_connections.get(task_id, []))
    
    def get_all_task_ids(self) -> List[str]:
        """Get all task IDs with active connections"""
        return list(self.active_connections.keys())

# Global socket manager instance
socket_manager = SocketManager() 
"""
Real-time Browser Agent API with WebSocket support
Provides live browser automation with visible interactions and real-time logs
"""

from fastapi import APIRouter, WebSocket, HTTPException, BackgroundTasks
from fastapi.responses import HTMLResponse
from typing import Dict, Any, List, Optional
import asyncio
import json
import os
from datetime import datetime
from pathlib import Path

from src.services.browser_use_service import BrowserUseService
from src.core.config import settings
from src.schemas.schemas import BrowserTaskRequest, BrowserTaskResponse

router = APIRouter()

# Store active websocket connections
active_connections: List[WebSocket] = []

class BrowserAgentRealtimeManager:
    """Manages real-time browser agent execution with websocket communication"""
    
    def __init__(self):
        self.active_sessions: Dict[str, Dict[str, Any]] = {}
        
    async def connect_websocket(self, websocket: WebSocket, session_id: str):
        """Connect a websocket for real-time updates"""
        await websocket.accept()
        active_connections.append(websocket)
        
        # Send connection confirmation
        await websocket.send_text(json.dumps({
            "type": "connection",
            "message": f"Connected to session {session_id}",
            "timestamp": datetime.now().isoformat()
        }))
        
    async def disconnect_websocket(self, websocket: WebSocket):
        """Disconnect a websocket"""
        if websocket in active_connections:
            active_connections.remove(websocket)
            
    async def broadcast_update(self, message: Dict[str, Any]):
        """Broadcast update to all connected websockets"""
        message_str = json.dumps(message)
        disconnected = []
        
        for connection in active_connections:
            try:
                await connection.send_text(message_str)
            except:
                disconnected.append(connection)
                
        # Remove disconnected connections
        for conn in disconnected:
            active_connections.remove(conn)
            
    async def execute_task_with_realtime(
        self, 
        task_request: BrowserTaskRequest,
        session_id: str
    ) -> BrowserTaskResponse:
        """Execute browser task with real-time updates"""
        
        # Store session info
        self.active_sessions[session_id] = {
            "task": task_request.task_description,
            "status": "starting",
            "start_time": datetime.now().isoformat(),
            "logs": []
        }
        
        # Broadcast task start
        await self.broadcast_update({
            "type": "task_start",
            "session_id": session_id,
            "task": task_request.task_description,
            "timestamp": datetime.now().isoformat()
        })
        
        try:
            # Create custom browser service with real-time logging
            service = BrowserUseService()
            
            # Configure for real-time visibility
            browser_config = {
                "headless": False,  # Always show browser for real-time
                "use_vision": True,
                "max_failures": 3,
                "wait_for_network_idle": 2.0,
                "slow_mo": 1000,  # Slow down for visibility
                "window_size": {"width": 1280, "height": 720},
                "save_conversation": True,
                "trace_path": f"./tmp/traces/{session_id}/",
                "conversation_path": f"./tmp/conversations/"
            }
            
            # Add real-time logging callback
            original_execute = service.execute_task
            
            async def execute_with_logging(*args, **kwargs):
                """Wrapper to add real-time logging"""
                
                # Override browser config
                if 'browser_config' in kwargs:
                    kwargs['browser_config'].update(browser_config)
                else:
                    kwargs['browser_config'] = browser_config
                
                # Execute task
                result = await original_execute(*args, **kwargs)
                
                # Stream logs in real-time
                await self.stream_logs(session_id)
                
                return result
                
            service.execute_task = execute_with_logging
            
            # Execute the task
            result = await service.execute_task(
                task_description=task_request.task_description,
                llm_provider=task_request.llm_provider,
                model=task_request.model,
                browser_config=browser_config
            )
            
            # Update session status
            self.active_sessions[session_id]["status"] = "completed"
            self.active_sessions[session_id]["end_time"] = datetime.now().isoformat()
            self.active_sessions[session_id]["result"] = result
            
            # Broadcast completion
            await self.broadcast_update({
                "type": "task_complete",
                "session_id": session_id,
                "result": result,
                "timestamp": datetime.now().isoformat()
            })
            
            # Clean up
            await service.cleanup()
            
            return BrowserTaskResponse(
                task_id=session_id,
                status="completed" if result.get("success") else "failed",
                result=result,
                actions=[],  # Actions are not tracked in current implementation
                execution_time=0,  # Execution time is not tracked in current implementation
                logs=self.active_sessions[session_id]["logs"]
            )
            
        except Exception as e:
            # Handle errors
            self.active_sessions[session_id]["status"] = "failed"
            self.active_sessions[session_id]["error"] = str(e)
            self.active_sessions[session_id]["end_time"] = datetime.now().isoformat()
            
            await self.broadcast_update({
                "type": "task_error",
                "session_id": session_id,
                "error": str(e),
                "timestamp": datetime.now().isoformat()
            })
            
            # Return error response instead of raising exception
            return BrowserTaskResponse(
                task_id=session_id,
                status="failed",
                result={"success": False, "error": str(e)},
                actions=[],
                execution_time=0,
                logs=self.active_sessions[session_id]["logs"]
            )
            
    async def stream_logs(self, session_id: str):
        """Stream conversation logs in real-time"""
        try:
            # Find the latest conversation file
            conversations_dir = Path("./tmp/conversations")
            if not conversations_dir.exists():
                return
                
            # Get the latest conversation file
            conversation_files = list(conversations_dir.glob("conversation_*.txt"))
            if not conversation_files:
                return
                
            latest_file = max(conversation_files, key=lambda f: f.stat().st_mtime)
            
            # Read and stream the log
            with open(latest_file, 'r', encoding='utf-8') as f:
                content = f.read()
                
            # Extract key information
            log_data = {
                "type": "log_update",
                "session_id": session_id,
                "conversation_file": str(latest_file),
                "content": content[-2000:],  # Last 2000 characters
                "timestamp": datetime.now().isoformat()
            }
            
            await self.broadcast_update(log_data)
            
        except Exception as e:
            await self.broadcast_update({
                "type": "log_error",
                "session_id": session_id,
                "error": str(e),
                "timestamp": datetime.now().isoformat()
            })

# Create manager instance
agent_manager = BrowserAgentRealtimeManager()

@router.websocket("/browser-agent/ws/{session_id}")
async def websocket_endpoint(websocket: WebSocket, session_id: str):
    """WebSocket endpoint for real-time browser agent updates"""
    await agent_manager.connect_websocket(websocket, session_id)
    
    try:
        while True:
            # Keep connection alive and listen for client messages
            data = await websocket.receive_text()
            message = json.loads(data)
            
            # Handle different message types
            if message.get("type") == "ping":
                await websocket.send_text(json.dumps({
                    "type": "pong",
                    "timestamp": datetime.now().isoformat()
                }))
                
    except Exception as e:
        print(f"WebSocket error: {e}")
    finally:
        await agent_manager.disconnect_websocket(websocket)

@router.post("/browser-agent/realtime", response_model=BrowserTaskResponse)
async def execute_browser_task_realtime(
    task_request: BrowserTaskRequest,
    background_tasks: BackgroundTasks,
    session_id: Optional[str] = None
):
    """Execute browser task with real-time updates via WebSocket"""
    
    if not session_id:
        session_id = f"session_{int(datetime.now().timestamp())}"
        
    # Execute task in background with real-time updates
    return await agent_manager.execute_task_with_realtime(task_request, session_id)

@router.get("/browser-agent/logs/{session_id}")
async def get_session_logs(session_id: str):
    """Get complete logs for a session"""
    
    if session_id not in agent_manager.active_sessions:
        raise HTTPException(status_code=404, detail="Session not found")
        
    session = agent_manager.active_sessions[session_id]
    
    # Also get conversation file
    conversations_dir = Path("./tmp/conversations")
    conversation_files = list(conversations_dir.glob("conversation_*.txt"))
    
    logs = []
    for file in conversation_files:
        try:
            with open(file, 'r', encoding='utf-8') as f:
                logs.append({
                    "file": str(file),
                    "content": f.read(),
                    "modified": file.stat().st_mtime
                })
        except:
            continue
    
    return {
        "session_id": session_id,
        "session_info": session,
        "conversation_logs": logs
    }

@router.get("/browser-agent/viewer")
async def get_browser_viewer():
    """Get HTML viewer for real-time browser agent execution"""
    
    html_content = """
    <!DOCTYPE html>
    <html>
    <head>
        <title>Browser Agent Real-Time Viewer</title>
        <style>
            body { font-family: Arial, sans-serif; margin: 20px; background: #f5f5f5; }
            .container { max-width: 1200px; margin: 0 auto; }
            .header { background: #2c3e50; color: white; padding: 20px; border-radius: 8px; margin-bottom: 20px; }
            .status { padding: 10px; margin: 10px 0; border-radius: 4px; }
            .status.connected { background: #d4edda; color: #155724; }
            .status.disconnected { background: #f8d7da; color: #721c24; }
            .logs { background: white; padding: 20px; border-radius: 8px; height: 400px; overflow-y: auto; font-family: monospace; font-size: 12px; }
            .log-entry { margin: 5px 0; padding: 5px; border-left: 3px solid #007bff; }
            .log-entry.error { border-left-color: #dc3545; }
            .log-entry.success { border-left-color: #28a745; }
            .controls { background: white; padding: 20px; border-radius: 8px; margin-bottom: 20px; }
            .form-group { margin-bottom: 15px; }
            .form-group label { display: block; margin-bottom: 5px; font-weight: bold; }
            .form-group input, .form-group select, .form-group textarea { width: 100%; padding: 8px; border: 1px solid #ddd; border-radius: 4px; }
            .btn { background: #007bff; color: white; padding: 10px 20px; border: none; border-radius: 4px; cursor: pointer; }
            .btn:hover { background: #0056b3; }
            .btn:disabled { background: #6c757d; cursor: not-allowed; }
        </style>
    </head>
    <body>
        <div class="container">
            <div class="header">
                <h1>🤖 Browser Agent Real-Time Viewer</h1>
                <p>Watch your browser automation tasks execute in real-time</p>
            </div>
            
            <div class="controls">
                <div class="form-group">
                    <label for="task">Task Description:</label>
                    <textarea id="task" placeholder="Enter your browser automation task..." rows="3">Search for OpenAI latest updates on Google</textarea>
                </div>
                
                <div class="form-group">
                    <label for="llm_provider">LLM Provider:</label>
                    <select id="llm_provider">
                        <option value="openai">OpenAI</option>
                        <option value="anthropic">Anthropic</option>
                        <option value="google">Google</option>
                    </select>
                </div>
                
                <div class="form-group">
                    <label for="model">Model:</label>
                    <select id="model">
                        <option value="gpt-4o">GPT-4o</option>
                        <option value="gpt-4o-mini">GPT-4o-mini</option>
                        <option value="claude-3-sonnet-20240229">Claude 3 Sonnet</option>
                    </select>
                </div>
                
                <button id="startBtn" class="btn">🚀 Start Browser Agent</button>
                <button id="stopBtn" class="btn" disabled>⏹️ Stop Agent</button>
            </div>
            
            <div id="status" class="status disconnected">
                🔴 Disconnected - Click "Start Browser Agent" to begin
            </div>
            
            <div class="logs">
                <div id="logs-container">
                    <p>🔍 Logs will appear here when you start a task...</p>
                </div>
            </div>
        </div>
        
        <script>
            let ws = null;
            let sessionId = null;
            
            const statusDiv = document.getElementById('status');
            const logsContainer = document.getElementById('logs-container');
            const startBtn = document.getElementById('startBtn');
            const stopBtn = document.getElementById('stopBtn');
            
            function addLog(message, type = 'info') {
                const logEntry = document.createElement('div');
                logEntry.className = `log-entry ${type}`;
                logEntry.innerHTML = `[${new Date().toLocaleTimeString()}] ${message}`;
                logsContainer.appendChild(logEntry);
                logsContainer.scrollTop = logsContainer.scrollHeight;
            }
            
            function updateStatus(message, connected = false) {
                statusDiv.textContent = message;
                statusDiv.className = `status ${connected ? 'connected' : 'disconnected'}`;
            }
            
            function connectWebSocket() {
                sessionId = `session_${Date.now()}`;
                ws = new WebSocket(`ws://localhost:8000/api/v1/browser-agent/ws/${sessionId}`);
                
                ws.onopen = function() {
                    updateStatus('🟢 Connected - Ready to execute tasks', true);
                    addLog('WebSocket connected', 'success');
                };
                
                ws.onmessage = function(event) {
                    const data = JSON.parse(event.data);
                    
                    switch(data.type) {
                        case 'connection':
                            addLog(`Connected to session: ${data.message}`, 'success');
                            break;
                        case 'task_start':
                            addLog(`🚀 Task started: ${data.task}`, 'info');
                            break;
                        case 'task_complete':
                            addLog(`✅ Task completed successfully`, 'success');
                            addLog(`Result: ${JSON.stringify(data.result, null, 2)}`, 'info');
                            break;
                        case 'task_error':
                            addLog(`❌ Task failed: ${data.error}`, 'error');
                            break;
                        case 'log_update':
                            addLog(`📝 Log update received`, 'info');
                            break;
                        case 'pong':
                            // Handle ping-pong
                            break;
                        default:
                            addLog(`📨 ${data.type}: ${data.message || JSON.stringify(data)}`, 'info');
                    }
                };
                
                ws.onclose = function() {
                    updateStatus('🔴 Disconnected', false);
                    addLog('WebSocket disconnected', 'error');
                    startBtn.disabled = false;
                    stopBtn.disabled = true;
                };
                
                ws.onerror = function(error) {
                    addLog(`WebSocket error: ${error}`, 'error');
                };
                
                // Send periodic pings
                setInterval(() => {
                    if (ws && ws.readyState === WebSocket.OPEN) {
                        ws.send(JSON.stringify({type: 'ping'}));
                    }
                }, 30000);
            }
            
            startBtn.addEventListener('click', async function() {
                const task = document.getElementById('task').value;
                const llm_provider = document.getElementById('llm_provider').value;
                const model = document.getElementById('model').value;
                
                if (!task.trim()) {
                    alert('Please enter a task description');
                    return;
                }
                
                startBtn.disabled = true;
                stopBtn.disabled = false;
                logsContainer.innerHTML = '';
                
                // Connect WebSocket
                connectWebSocket();
                
                // Wait a bit for connection
                setTimeout(async () => {
                    try {
                        // Start the task
                        const response = await fetch('/api/v1/browser-agent/realtime', {
                            method: 'POST',
                            headers: {
                                'Content-Type': 'application/json',
                            },
                            body: JSON.stringify({
                                task_description: task,
                                llm_provider: llm_provider,
                                model: model
                            })
                        });
                        
                        if (!response.ok) {
                            throw new Error(`HTTP error! status: ${response.status}`);
                        }
                        
                        const result = await response.json();
                        addLog(`Task submitted successfully: ${result.task_id}`, 'success');
                        
                    } catch (error) {
                        addLog(`Error starting task: ${error.message}`, 'error');
                        startBtn.disabled = false;
                        stopBtn.disabled = true;
                    }
                }, 1000);
            });
            
            stopBtn.addEventListener('click', function() {
                if (ws) {
                    ws.close();
                }
                startBtn.disabled = false;
                stopBtn.disabled = true;
                addLog('Task stopped by user', 'info');
            });
        </script>
    </body>
    </html>
    """
    
    return HTMLResponse(content=html_content) 
"""
Browserbase MCP Service - Browser automation using Browserbase cloud infrastructure
"""

import asyncio
import json
import os
import time
from typing import Optional, Dict, Any, List
from datetime import datetime
import httpx
from src.core.config import settings

class BrowserbaseService:
    """Service for browser automation using Browserbase cloud infrastructure via MCP"""
    
    def __init__(self):
        self.api_key = os.getenv("BROWSERBASE_API_KEY", "bb_live_G7qbUim5tJFdYeKYczuql052KsE")
        self.project_id = os.getenv("BROWSERBASE_PROJECT_ID", "08f774e3-fcd2-4c27-a660-c8eac3875eb7")
        self.base_url = "https://api.browserbase.com/v1"
        self.active_sessions: Dict[str, Dict[str, Any]] = {}
        self.session_contexts: Dict[str, str] = {}
        
    async def shutdown(self):
        """Clean up all resources when service is shutting down"""
        try:
            await self.cleanup_all_sessions()
            print("✅ Browserbase service shutdown cleanup completed")
        except Exception as e:
            print(f"⚠️  Error during browserbase service shutdown: {str(e)}")
        
    async def create_session(self, context_name: Optional[str] = None) -> Dict[str, Any]:
        """Create a new browserbase session using MCP tools"""
        try:
            # Ensure we have capacity for a new session
            capacity_result = await self.ensure_session_capacity()
            if not capacity_result["success"]:
                return capacity_result
            
            # Import the MCP client
            from src.utils.mcp_browserbase_client import mcp_browserbase_client
            
            # Try to create session via MCP first
            mcp_result = await mcp_browserbase_client.create_session_via_mcp(context_name)
            
            if mcp_result["success"]:
                session_id = mcp_result["session_id"]
                
                # Store session info
                self.active_sessions[session_id] = {
                    "id": session_id,
                    "status": "RUNNING",
                    "created_at": datetime.now().isoformat(),
                    "live_view_url": mcp_result.get("live_view_url", f"https://www.browserbase.com/sessions/{session_id}"),
                    "connect_url": mcp_result.get("connect_url"),
                    "context_name": context_name,
                    "created_via": "MCP"
                }
                
                return {
                    "success": True,
                    "session_id": session_id,
                    "live_view_url": mcp_result.get("live_view_url", f"https://www.browserbase.com/sessions/{session_id}"),
                    "connect_url": mcp_result.get("connect_url"),
                    "status": "RUNNING",
                    "created_via": "MCP"
                }
            else:
                # Fall back to REST API
                headers = {
                    "x-bb-api-key": self.api_key,
                    "Content-Type": "application/json"
                }
                
                payload = {
                    "projectId": self.project_id,
                    "keepAlive": True,
                    "timeout": 3600  # 1 hour timeout
                }
                
                if context_name:
                    payload["contextId"] = context_name
                
                async with httpx.AsyncClient() as client:
                    response = await client.post(
                        f"{self.base_url}/sessions",
                        headers=headers,
                        json=payload,
                        timeout=30
                    )
                
                    if response.status_code == 201:
                        session_data = response.json()
                        session_id = session_data["id"]
                        
                        # Store session info
                        self.active_sessions[session_id] = {
                            "id": session_id,
                            "status": "RUNNING",
                            "created_at": datetime.now().isoformat(),
                            "live_view_url": f"https://www.browserbase.com/sessions/{session_id}",
                            "connect_url": session_data.get("connectUrl"),
                            "context_name": context_name,
                            "created_via": "REST_API"
                        }
                        
                        return {
                            "success": True,
                            "session_id": session_id,
                            "live_view_url": f"https://www.browserbase.com/sessions/{session_id}",
                            "connect_url": session_data.get("connectUrl"),
                            "status": "RUNNING",
                            "created_via": "REST_API"
                        }
                    elif response.status_code == 429:
                        # Too many requests - try cleanup and retry once
                        error_data = response.json() if response.headers.get('content-type', '').startswith('application/json') else {}
                        
                        return {
                            "success": False,
                            "error": f"Session limit exceeded: {error_data.get('message', 'Too many concurrent sessions')}. Try the cleanup endpoint first.",
                            "retry_suggested": True,
                            "cleanup_endpoint": "/api/v1/browserbase/cleanup/all",
                            "mcp_error": mcp_result.get("error", "MCP creation failed")
                        }
                    else:
                        return {
                            "success": False,
                            "error": f"Failed to create session via both MCP and REST: MCP error: {mcp_result.get('error', 'Unknown')}, REST error: {response.status_code} - {response.text}"
                        }
                    
        except Exception as e:
            return {
                "success": False,
                "error": f"Error creating session: {str(e)}"
            }
    
    async def get_session_status(self, session_id: str) -> Dict[str, Any]:
        """Get session status and info"""
        try:
            if session_id in self.active_sessions:
                session_info = self.active_sessions[session_id]
                
                # Check if session is still active via API
                headers = {
                    "x-bb-api-key": self.api_key,
                    "Content-Type": "application/json"
                }
                
                async with httpx.AsyncClient() as client:
                    response = await client.get(
                        f"{self.base_url}/sessions/{session_id}",
                        headers=headers,
                        timeout=10
                    )
                    
                    if response.status_code == 200:
                        api_data = response.json()
                        session_info["status"] = api_data.get("status", "UNKNOWN")
                        
                        return {
                            "success": True,
                            "session_id": session_id,
                            "status": session_info["status"],
                            "live_view_url": session_info["live_view_url"],
                            "connect_url": session_info.get("connect_url"),
                            "created_at": session_info["created_at"],
                            "context_name": session_info.get("context_name")
                        }
                    else:
                        # Session not found, remove from active sessions
                        del self.active_sessions[session_id]
                        return {
                            "success": False,
                            "error": f"Session not found: {session_id}"
                        }
            else:
                return {
                    "success": False,
                    "error": f"Session not found in active sessions: {session_id}"
                }
                
        except Exception as e:
            return {
                "success": False,
                "error": f"Error getting session status: {str(e)}"
            }
    
    async def terminate_session(self, session_id: str) -> Dict[str, Any]:
        """Terminate a browserbase session using MCP tools"""
        try:
            # Import the MCP client
            from src.utils.mcp_browserbase_client import mcp_browserbase_client
            
            # Use MCP to close the session
            result = await mcp_browserbase_client.close_session_via_mcp()
            
            if result["success"]:
                # Remove from active sessions
                if session_id in self.active_sessions:
                    del self.active_sessions[session_id]
                
                return {
                    "success": True,
                    "message": f"Session {session_id} terminated successfully via MCP"
                }
            else:
                # Try REST API as fallback
                headers = {
                    "x-bb-api-key": self.api_key
                }
                
                async with httpx.AsyncClient() as client:
                    response = await client.post(
                        f"{self.base_url}/sessions/{session_id}/stop",
                        headers=headers,
                        timeout=10
                    )
                    
                    if response.status_code in [200, 204]:  # Both 200 and 204 are success for termination
                        # Remove from active sessions
                        if session_id in self.active_sessions:
                            del self.active_sessions[session_id]
                        
                        return {
                            "success": True,
                            "message": f"Session {session_id} terminated successfully via REST API"
                        }
                    elif response.status_code == 404:
                        # Session not found - consider it already terminated
                        if session_id in self.active_sessions:
                            del self.active_sessions[session_id]
                        
                        return {
                            "success": True,
                            "message": f"Session {session_id} not found (already terminated)"
                        }
                    else:
                        return {
                            "success": False,
                            "error": f"Failed to terminate session via both MCP and REST: MCP error: {result.get('error', 'Unknown')}, REST error: {response.status_code} - {response.text}"
                        }
                        
        except Exception as e:
            return {
                "success": False,
                "error": f"Error terminating session: {str(e)}"
            }
    
    async def get_live_view_url(self, session_id: str) -> str:
        """Get the live view URL for a session"""
        if session_id in self.active_sessions:
            return self.active_sessions[session_id]["live_view_url"]
        return f"https://www.browserbase.com/sessions/{session_id}"
    
    async def list_active_sessions(self) -> List[Dict[str, Any]]:
        """List all active sessions"""
        return list(self.active_sessions.values())
    
    async def fetch_all_sessions_from_browserbase(self) -> Dict[str, Any]:
        """Fetch all sessions from Browserbase API (not just locally tracked ones)"""
        try:
            headers = {
                "x-bb-api-key": self.api_key
            }
            
            async with httpx.AsyncClient() as client:
                response = await client.get(
                    f"{self.base_url}/sessions",
                    headers=headers,
                    timeout=30
                )
                
                if response.status_code == 200:
                    sessions_data = response.json()
                    
                    # Extract session list (API returns different formats)
                    if isinstance(sessions_data, list):
                        sessions = sessions_data
                    elif isinstance(sessions_data, dict) and 'sessions' in sessions_data:
                        sessions = sessions_data['sessions']
                    elif isinstance(sessions_data, dict) and 'data' in sessions_data:
                        sessions = sessions_data['data']
                    else:
                        sessions = []
                    
                    # Filter only running sessions
                    running_sessions = [
                        session for session in sessions 
                        if session.get('status') in ['RUNNING', 'CREATED', 'STARTING']
                    ]
                    
                    return {
                        "success": True,
                        "sessions": running_sessions,
                        "total_sessions": len(sessions),
                        "running_sessions": len(running_sessions)
                    }
                else:
                    return {
                        "success": False,
                        "error": f"Failed to fetch sessions: {response.status_code} - {response.text}"
                    }
                    
        except Exception as e:
            return {
                "success": False,
                "error": f"Error fetching sessions: {str(e)}"
            }
    
    async def cleanup_all_sessions(self) -> Dict[str, Any]:
        """Clean up all active sessions (both locally tracked and on Browserbase)"""
        try:
            cleanup_results = []
            
            # First, try to close MCP session if active
            from src.utils.mcp_browserbase_client import mcp_browserbase_client
            if mcp_browserbase_client.is_session_active():
                print("🔄 Closing active MCP session...")
                mcp_close_result = await mcp_browserbase_client.close_session_via_mcp()
                cleanup_results.append({
                    "session_id": mcp_browserbase_client.get_active_session_id() or "mcp_session",
                    "success": mcp_close_result["success"],
                    "error": mcp_close_result.get("error"),
                    "source": "mcp_session"
                })
            
            # Then, get all sessions from Browserbase API
            browserbase_sessions_result = await self.fetch_all_sessions_from_browserbase()
            
            if browserbase_sessions_result["success"]:
                browserbase_sessions = browserbase_sessions_result["sessions"]
                print(f"📊 Found {len(browserbase_sessions)} active sessions on Browserbase")
                
                # Cleanup all sessions found on Browserbase
                for session in browserbase_sessions:
                    session_id = session.get("id")
                    if session_id:
                        result = await self.terminate_session(session_id)
                        cleanup_results.append({
                            "session_id": session_id,
                            "success": result["success"],
                            "error": result.get("error"),
                            "source": "browserbase_api"
                        })
            else:
                print(f"⚠️  Could not fetch sessions from Browserbase: {browserbase_sessions_result['error']}")
                
            # Also cleanup any locally tracked sessions that might not be on Browserbase
            local_sessions = list(self.active_sessions.keys())
            for session_id in local_sessions:
                # Only cleanup if not already cleaned up from Browserbase API
                if not any(r["session_id"] == session_id for r in cleanup_results):
                    result = await self.terminate_session(session_id)
                    cleanup_results.append({
                        "session_id": session_id,
                        "success": result["success"],
                        "error": result.get("error"),
                        "source": "local_tracking"
                    })
            
            # Clear local tracking
            self.active_sessions.clear()
            
            successful_cleanups = sum(1 for r in cleanup_results if r["success"])
            
            return {
                "success": True,
                "message": f"Cleaned up {successful_cleanups}/{len(cleanup_results)} sessions",
                "results": cleanup_results,
                "total_found": len(cleanup_results),
                "successful_cleanups": successful_cleanups
            }
            
        except Exception as e:
            return {
                "success": False,
                "error": f"Error during cleanup: {str(e)}"
            }
    
    async def validate_and_cleanup_sessions(self) -> Dict[str, Any]:
        """Validate existing sessions and clean up dead ones"""
        try:
            headers = {
                "x-bb-api-key": self.api_key
            }
            
            dead_sessions = []
            valid_sessions = []
            
            # Check each tracked session
            for session_id in list(self.active_sessions.keys()):
                try:
                    async with httpx.AsyncClient() as client:
                        response = await client.get(
                            f"{self.base_url}/sessions/{session_id}",
                            headers=headers,
                            timeout=10
                        )
                        
                        if response.status_code == 200:
                            api_data = response.json()
                            status = api_data.get("status", "UNKNOWN")
                            
                            if status in ["COMPLETED", "FAILED", "CANCELLED"]:
                                # Session is dead, remove it
                                dead_sessions.append(session_id)
                                del self.active_sessions[session_id]
                            else:
                                # Session is still active
                                valid_sessions.append(session_id)
                                self.active_sessions[session_id]["status"] = status
                        else:
                            # Session not found on server, remove from local tracking
                            dead_sessions.append(session_id)
                            del self.active_sessions[session_id]
                            
                except Exception as e:
                    # If we can't check the session, assume it's dead
                    dead_sessions.append(session_id)
                    if session_id in self.active_sessions:
                        del self.active_sessions[session_id]
            
            return {
                "success": True,
                "dead_sessions_removed": len(dead_sessions),
                "valid_sessions": len(valid_sessions),
                "dead_sessions": dead_sessions,
                "valid_sessions": valid_sessions
            }
            
        except Exception as e:
            return {
                "success": False,
                "error": f"Error validating sessions: {str(e)}"
            }
    
    async def ensure_session_capacity(self) -> Dict[str, Any]:
        """Ensure we have capacity to create a new session"""
        try:
            # First, validate and cleanup dead sessions
            validation_result = await self.validate_and_cleanup_sessions()
            
            if not validation_result["success"]:
                return validation_result
            
            # Check if we still have too many active sessions
            active_count = len(self.active_sessions)
            
            if active_count >= 1:  # Browserbase free tier limit
                # Try to clean up all sessions
                cleanup_result = await self.cleanup_all_sessions()
                
                if not cleanup_result["success"]:
                    return {
                        "success": False,
                        "error": "Too many active sessions and cleanup failed",
                        "cleanup_result": cleanup_result
                    }
                
                return {
                    "success": True,
                    "message": "Session capacity ensured through cleanup",
                    "cleanup_performed": True,
                    "sessions_cleaned": cleanup_result["results"]
                }
            
            return {
                "success": True,
                "message": "Session capacity available",
                "cleanup_performed": False,
                "active_sessions": active_count
            }
            
        except Exception as e:
            return {
                "success": False,
                "error": f"Error ensuring session capacity: {str(e)}"
            }
    
    async def create_context(self, name: str) -> Dict[str, Any]:
        """Create a new browserbase context for session reuse"""
        try:
            headers = {
                "x-bb-api-key": self.api_key,
                "Content-Type": "application/json"
            }
            
            payload = {
                "projectId": self.project_id,
                "name": name
            }
            
            async with httpx.AsyncClient() as client:
                response = await client.post(
                    f"{self.base_url}/contexts",
                    headers=headers,
                    json=payload,
                    timeout=30
                )
                
                if response.status_code == 201:
                    context_data = response.json()
                    context_id = context_data["id"]
                    
                    # Store context info
                    self.session_contexts[name] = context_id
                    
                    return {
                        "success": True,
                        "context_id": context_id,
                        "name": name
                    }
                else:
                    return {
                        "success": False,
                        "error": f"Failed to create context: {response.status_code} - {response.text}"
                    }
                    
        except Exception as e:
            return {
                "success": False,
                "error": f"Error creating context: {str(e)}"
            }
    
    async def delete_context(self, context_name: str) -> Dict[str, Any]:
        """Delete a browserbase context"""
        try:
            if context_name not in self.session_contexts:
                return {
                    "success": False,
                    "error": f"Context not found: {context_name}"
                }
            
            context_id = self.session_contexts[context_name]
            headers = {
                "x-bb-api-key": self.api_key
            }
            
            async with httpx.AsyncClient() as client:
                response = await client.delete(
                    f"{self.base_url}/contexts/{context_id}",
                    headers=headers,
                    timeout=10
                )
                
                if response.status_code in [200, 204]:  # 204 No Content is success for deletion
                    # Remove from contexts
                    del self.session_contexts[context_name]
                    
                    return {
                        "success": True,
                        "message": f"Context {context_name} deleted successfully"
                    }
                else:
                    return {
                        "success": False,
                        "error": f"Failed to delete context: {response.status_code} - {response.text}"
                    }
                    
        except Exception as e:
            return {
                "success": False,
                "error": f"Error deleting context: {str(e)}"
            }

# Global instance
browserbase_service = BrowserbaseService() 
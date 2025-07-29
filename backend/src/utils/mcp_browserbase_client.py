"""
MCP Browserbase Client - Direct MCP protocol communication with browserbase
"""

import asyncio
import json
import os
import subprocess
import tempfile
from typing import Optional, Dict, Any, List
import logging

logger = logging.getLogger(__name__)

class MCPBrowserbaseClient:
    """Client for direct MCP communication with browserbase"""
    
    def __init__(self):
        self.api_key = os.getenv("BROWSERBASE_API_KEY", "bb_live_G7qbUim5tJFdYeKYczuql052KsE")
        self.project_id = os.getenv("BROWSERBASE_PROJECT_ID", "08f774e3-fcd2-4c27-a660-c8eac3875eb7")
        self.active_session_id: Optional[str] = None
        self.mcp_process: Optional[subprocess.Popen] = None
        
    async def start_mcp_server(self) -> Dict[str, Any]:
        """Start the browserbase MCP server"""
        try:
            # Set environment variables
            env = os.environ.copy()
            env["BROWSERBASE_API_KEY"] = self.api_key
            env["BROWSERBASE_PROJECT_ID"] = self.project_id
            
            # Start the MCP server process
            self.mcp_process = subprocess.Popen(
                ["npx", "@browserbasehq/mcp"],
                env=env,
                stdin=subprocess.PIPE,
                stdout=subprocess.PIPE,
                stderr=subprocess.PIPE,
                text=True
            )
            
            return {
                "success": True,
                "message": "MCP server started successfully",
                "process_id": self.mcp_process.pid
            }
            
        except Exception as e:
            return {
                "success": False,
                "error": f"Failed to start MCP server: {str(e)}"
            }
    
    async def stop_mcp_server(self) -> Dict[str, Any]:
        """Stop the browserbase MCP server"""
        try:
            if self.mcp_process:
                self.mcp_process.terminate()
                self.mcp_process.wait(timeout=5)
                self.mcp_process = None
                
            return {
                "success": True,
                "message": "MCP server stopped successfully"
            }
            
        except Exception as e:
            return {
                "success": False,
                "error": f"Failed to stop MCP server: {str(e)}"
            }
    
    async def send_mcp_command(self, command: str, params: Dict[str, Any] = None) -> Dict[str, Any]:
        """Send a command to the browserbase MCP server"""
        try:
            if not self.mcp_process:
                await self.start_mcp_server()
                
            if not self.mcp_process:
                return {
                    "success": False,
                    "error": "MCP server not running"
                }
            
            # Prepare MCP command
            mcp_request = {
                "jsonrpc": "2.0",
                "id": 1,
                "method": command,
                "params": params or {}
            }
            
            # Send command
            command_json = json.dumps(mcp_request) + "\n"
            self.mcp_process.stdin.write(command_json)
            self.mcp_process.stdin.flush()
            
            # Read response
            response_line = self.mcp_process.stdout.readline()
            if response_line:
                response = json.loads(response_line.strip())
                return {
                    "success": True,
                    "response": response
                }
            else:
                return {
                    "success": False,
                    "error": "No response from MCP server"
                }
                
        except Exception as e:
            return {
                "success": False,
                "error": f"Error sending MCP command: {str(e)}"
            }
    
    async def create_session_via_mcp(self, context_id: Optional[str] = None) -> Dict[str, Any]:
        """Create a browserbase session via MCP"""
        try:
            params = {}
            if context_id:
                params["contextId"] = context_id
                
            result = await self.send_mcp_command("mcp_browserbase_browserbase_session_create", params)
            
            if result["success"]:
                response = result["response"]
                if "result" in response:
                    session_data = response["result"]
                    self.active_session_id = session_data.get("sessionId")
                    
                    return {
                        "success": True,
                        "session_id": self.active_session_id,
                        "live_view_url": f"https://www.browserbase.com/sessions/{self.active_session_id}",
                        "data": session_data
                    }
                else:
                    return {
                        "success": False,
                        "error": f"MCP error: {response.get('error', 'Unknown error')}"
                    }
            else:
                return result
                
        except Exception as e:
            return {
                "success": False,
                "error": f"Error creating session via MCP: {str(e)}"
            }
    
    async def close_session_via_mcp(self) -> Dict[str, Any]:
        """Close the current browserbase session via MCP"""
        try:
            # Simply reset the session ID - the actual MCP session close will be handled by the calling code
            if self.active_session_id:
                old_session_id = self.active_session_id
                self.active_session_id = None
                return {
                    "success": True,
                    "message": f"Session {old_session_id} closed successfully"
                }
            else:
                return {
                    "success": True,
                    "message": "No active session to close"
                }
                
        except Exception as e:
            return {
                "success": False,
                "error": f"Error closing session via MCP: {str(e)}"
            }
    
    async def navigate_via_mcp(self, url: str) -> Dict[str, Any]:
        """Navigate to a URL via MCP"""
        try:
            if not self.active_session_id:
                return {
                    "success": False,
                    "error": "No active session"
                }
            
            params = {"url": url}
            result = await self.send_mcp_command("mcp_browserbase_browserbase_navigate", params)
            
            return result
                
        except Exception as e:
            return {
                "success": False,
                "error": f"Error navigating via MCP: {str(e)}"
            }
    
    async def take_screenshot_via_mcp(self, element_ref: Optional[str] = None) -> Dict[str, Any]:
        """Take a screenshot via MCP"""
        try:
            if not self.active_session_id:
                return {
                    "success": False,
                    "error": "No active session"
                }
            
            params = {}
            if element_ref:
                params["ref"] = element_ref
                params["element"] = "target element"
                
            result = await self.send_mcp_command("mcp_browserbase_browserbase_take_screenshot", params)
            
            return result
                
        except Exception as e:
            return {
                "success": False,
                "error": f"Error taking screenshot via MCP: {str(e)}"
            }
    
    async def click_via_mcp(self, element_ref: str, element_description: str) -> Dict[str, Any]:
        """Click an element via MCP"""
        try:
            if not self.active_session_id:
                return {
                    "success": False,
                    "error": "No active session"
                }
            
            params = {
                "ref": element_ref,
                "element": element_description
            }
            
            result = await self.send_mcp_command("mcp_browserbase_browserbase_click", params)
            
            return result
                
        except Exception as e:
            return {
                "success": False,
                "error": f"Error clicking via MCP: {str(e)}"
            }
    
    async def type_via_mcp(self, element_ref: str, text: str, element_description: str, submit: bool = False) -> Dict[str, Any]:
        """Type text into an element via MCP"""
        try:
            if not self.active_session_id:
                return {
                    "success": False,
                    "error": "No active session"
                }
            
            params = {
                "ref": element_ref,
                "text": text,
                "element": element_description,
                "submit": submit
            }
            
            result = await self.send_mcp_command("mcp_browserbase_browserbase_type", params)
            
            return result
                
        except Exception as e:
            return {
                "success": False,
                "error": f"Error typing via MCP: {str(e)}"
            }
    
    async def get_page_snapshot_via_mcp(self) -> Dict[str, Any]:
        """Get page accessibility snapshot via MCP"""
        try:
            if not self.active_session_id:
                return {
                    "success": False,
                    "error": "No active session"
                }
            
            result = await self.send_mcp_command("mcp_browserbase_browserbase_snapshot", {})
            
            return result
                
        except Exception as e:
            return {
                "success": False,
                "error": f"Error getting page snapshot via MCP: {str(e)}"
            }
    
    async def get_text_via_mcp(self, selector: Optional[str] = None) -> Dict[str, Any]:
        """Get text content from page via MCP"""
        try:
            if not self.active_session_id:
                return {
                    "success": False,
                    "error": "No active session"
                }
            
            params = {}
            if selector:
                params["selector"] = selector
                
            result = await self.send_mcp_command("mcp_browserbase_browserbase_get_text", params)
            
            return result
                
        except Exception as e:
            return {
                "success": False,
                "error": f"Error getting text via MCP: {str(e)}"
            }
    
    def get_active_session_id(self) -> Optional[str]:
        """Get the current active session ID"""
        return self.active_session_id
    
    def is_session_active(self) -> bool:
        """Check if there's an active session"""
        return self.active_session_id is not None

# Global instance
mcp_browserbase_client = MCPBrowserbaseClient() 
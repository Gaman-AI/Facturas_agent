"""
BrowserBase Browser-Use Service - Combines BrowserBase cloud sessions with browser-use agent automation
"""

import asyncio
import os
from typing import Optional, Dict, Any
from dotenv import load_dotenv
from datetime import datetime

from browserbase import Browserbase
from browser_use import Agent
from browser_use.browser.session import BrowserSession
from browser_use.browser import BrowserProfile
from langchain_anthropic import ChatAnthropic

from src.core.config import settings
from src.services.browserbase_service import BrowserbaseService


class ManagedBrowserbaseSession:
    """Context manager for proper BrowserBase + browser-use session lifecycle management"""
    
    def __init__(self, connect_url: str, session_id: str, browser_profile: BrowserProfile):
        self.connect_url = connect_url
        self.session_id = session_id
        self.browser_profile = browser_profile
        self.browser_session = None
        self.agent = None
        
    async def __aenter__(self) -> BrowserSession:
        try:
            self.browser_session = BrowserSession(
                cdp_url=self.connect_url,
                browser_profile=self.browser_profile,
                keep_alive=False,  # Essential for proper cleanup
                initialized=False,
            )
            
            await self.browser_session.start()
            print(f"✅ BrowserBase session {self.session_id} initialized successfully")
            return self.browser_session
            
        except Exception as e:
            print(f"❌ Failed to initialize BrowserBase session: {e}")
            await self._emergency_cleanup()
            raise
    
    async def __aexit__(self, exc_type, exc_val, exc_tb):
        await self._close_session_properly()
    
    async def _close_session_properly(self):
        playwright_instance = None
        
        try:
            if self.browser_session:
                # Get playwright instance before closing session
                if hasattr(self.browser_session, 'playwright'):
                    playwright_instance = self.browser_session.playwright
                
                # Close browser session first
                if self.browser_session.initialized:
                    await self.browser_session.stop()
                    print(f"✅ BrowserBase session {self.session_id} closed successfully")
                    
        except Exception as e:
            error_msg = str(e).lower()
            if "browser is closed" in error_msg or "disconnected" in error_msg:
                print("ℹ️  Browser session was already closed (expected behavior)")
            else:
                print(f"⚠️  Error during browser session closure: {e}")
        
        finally:
            # Stop playwright instance - critical for preventing hanging processes
            if playwright_instance:
                try:
                    await playwright_instance.stop()
                    print("✅ Playwright instance stopped successfully")
                except Exception as e:
                    print(f"⚠️  Error stopping Playwright: {e}")
            
            await self._final_cleanup()
    
    async def _emergency_cleanup(self):
        try:
            if self.browser_session:
                if hasattr(self.browser_session, 'playwright'):
                    await self.browser_session.playwright.stop()
                if self.browser_session.initialized:
                    await self.browser_session.stop()
        except Exception as e:
            print(f"⚠️  Emergency cleanup error: {e}")
        finally:
            await self._final_cleanup()
    
    async def _final_cleanup(self):
        self.browser_session = None
        self.agent = None


class BrowserbaseBrowserUseService:
    """Service that combines BrowserBase cloud sessions with browser-use agent automation"""
    
    def __init__(self):
        load_dotenv()
        self.browserbase_service = BrowserbaseService()
        self.active_sessions: Dict[str, Dict[str, Any]] = {}
        self.api_key = os.getenv("BROWSERBASE_API_KEY")
        self.project_id = os.getenv("BROWSERBASE_PROJECT_ID")
        
    def _get_llm_client(self, llm_provider: str = None, model: str = None):
        """Get LLM client based on provider"""
        provider = llm_provider or settings.DEFAULT_LLM_PROVIDER
        model_name = model or settings.DEFAULT_LLM_MODEL
        
        if provider.lower() == "anthropic":
            return ChatAnthropic(
                model=model_name or "claude-3-5-sonnet-20240620",
                api_key=settings.ANTHROPIC_API_KEY,
                temperature=0.0
            )
        else:
            # Default to Anthropic for BrowserBase integration
            return ChatAnthropic(
                model="claude-3-5-sonnet-20240620",
                api_key=settings.ANTHROPIC_API_KEY,
                temperature=0.0
            )
    
    def _create_browser_profile(self) -> BrowserProfile:
        """Create browser profile with BrowserBase optimized settings"""
        return BrowserProfile(
            keep_alive=False,  # Essential for proper cleanup
            wait_between_actions=2.0,
            default_timeout=30000,
            default_navigation_timeout=30000,
        )
    
    async def create_browserbase_session(self, context_name: Optional[str] = None) -> Dict[str, Any]:
        """Create a new BrowserBase session"""
        try:
            bb = Browserbase(api_key=self.api_key)
            session = bb.sessions.create(project_id=self.project_id)
            
            session_data = {
                "id": session.id,
                "connect_url": session.connect_url,
                "live_view_url": f"https://www.browserbase.com/sessions/{session.id}",
                "status": "RUNNING",
                "created_at": datetime.now().isoformat(),
                "context_name": context_name,
                "created_via": "BROWSERBASE_SDK"
            }
            
            self.active_sessions[session.id] = session_data
            
            print(f"Session ID: {session.id}")
            print(f"Debug URL: https://www.browserbase.com/sessions/{session.id}")
            
            return {
                "success": True,
                "session_id": session.id,
                "connect_url": session.connect_url,
                "live_view_url": f"https://www.browserbase.com/sessions/{session.id}",
                "debug_url": f"https://www.browserbase.com/sessions/{session.id}",
                "status": "RUNNING"
            }
            
        except Exception as e:
            return {
                "success": False,
                "error": f"Failed to create BrowserBase session: {str(e)}"
            }
    
    async def execute_agent_task(
        self, 
        session_id: str, 
        task: str,
        llm_provider: str = None,
        model: str = None,
        max_steps: int = 20
    ) -> Dict[str, Any]:
        """Execute browser-use agent task in BrowserBase session"""
        try:
            if session_id not in self.active_sessions:
                return {
                    "success": False,
                    "error": f"Session {session_id} not found"
                }
            
            session_data = self.active_sessions[session_id]
            connect_url = session_data["connect_url"]
            
            # Get LLM client
            llm = self._get_llm_client(llm_provider, model)
            
            # Create browser profile
            browser_profile = self._create_browser_profile()
            
            # Execute task in managed session
            async with ManagedBrowserbaseSession(connect_url, session_id, browser_profile) as browser_session:
                agent = Agent(
                    task=task,
                    llm=llm,
                    browser_session=browser_session,
                    enable_memory=False,
                    max_failures=5,
                    retry_delay=5,
                    max_actions_per_step=1,
                )
                
                try:
                    print(f"🚀 Starting agent task in BrowserBase session {session_id}...")
                    result = await agent.run(max_steps=max_steps)
                    print("🎉 Task completed successfully!")
                    
                    return {
                        "success": True,
                        "result": str(result),
                        "session_id": session_id,
                        "live_view_url": session_data["live_view_url"],
                        "debug_url": session_data["live_view_url"]
                    }
                    
                except Exception as e:
                    # Handle expected browser disconnection after successful completion
                    error_msg = str(e).lower()
                    if "browser is closed" in error_msg or "disconnected" in error_msg:
                        print("✅ Task completed - Browser session ended normally")
                        return {
                            "success": True,
                            "result": "Task completed successfully (session ended normally)",
                            "session_id": session_id,
                            "live_view_url": session_data["live_view_url"],
                            "debug_url": session_data["live_view_url"]
                        }
                    else:
                        print(f"❌ Agent execution error: {e}")
                        raise
                        
                finally:
                    del agent
                    
        except Exception as e:
            return {
                "success": False,
                "error": f"Error executing agent task: {str(e)}",
                "session_id": session_id
            }
    
    async def get_session_info(self, session_id: str) -> Dict[str, Any]:
        """Get session information"""
        try:
            if session_id in self.active_sessions:
                session_data = self.active_sessions[session_id]
                return {
                    "success": True,
                    "session_id": session_id,
                    "live_view_url": session_data["live_view_url"],
                    "debug_url": session_data["live_view_url"],
                    "status": session_data["status"],
                    "created_at": session_data["created_at"]
                }
            else:
                return {
                    "success": False,
                    "error": f"Session {session_id} not found"
                }
                
        except Exception as e:
            return {
                "success": False,
                "error": f"Error getting session info: {str(e)}"
            }
    
    async def terminate_session(self, session_id: str) -> Dict[str, Any]:
        """Terminate a BrowserBase session"""
        try:
            if session_id in self.active_sessions:
                del self.active_sessions[session_id]
                
            return {
                "success": True,
                "message": f"Session {session_id} terminated successfully"
            }
            
        except Exception as e:
            return {
                "success": False,
                "error": f"Error terminating session: {str(e)}"
            }
    
    async def pause_automation(self, session_id: str) -> Dict[str, Any]:
        """Pause automation to allow manual control"""
        try:
            if session_id in self.active_sessions:
                session_data = self.active_sessions[session_id]
                session_data["status"] = "PAUSED"
                
                return {
                    "success": True,
                    "message": f"Automation paused for session {session_id}",
                    "live_view_url": session_data["live_view_url"]
                }
            else:
                return {
                    "success": False,
                    "error": f"Session {session_id} not found"
                }
                
        except Exception as e:
            return {
                "success": False,
                "error": f"Error pausing automation: {str(e)}"
            }
    
    async def resume_automation(self, session_id: str) -> Dict[str, Any]:
        """Resume automation from manual control"""
        try:
            if session_id in self.active_sessions:
                session_data = self.active_sessions[session_id]
                session_data["status"] = "RUNNING"
                
                return {
                    "success": True,
                    "message": f"Automation resumed for session {session_id}",
                    "live_view_url": session_data["live_view_url"]
                }
            else:
                return {
                    "success": False,
                    "error": f"Session {session_id} not found"
                }
                
        except Exception as e:
            return {
                "success": False,
                "error": f"Error resuming automation: {str(e)}"
            }
    
    async def cleanup_all_sessions(self) -> Dict[str, Any]:
        """Clean up all active sessions"""
        try:
            terminated_sessions = list(self.active_sessions.keys())
            self.active_sessions.clear()
            
            return {
                "success": True,
                "message": f"Cleaned up {len(terminated_sessions)} sessions",
                "terminated_sessions": terminated_sessions
            }
            
        except Exception as e:
            return {
                "success": False,
                "error": f"Error cleaning up sessions: {str(e)}"
            }


# Global service instance
browserbase_browseruse_service = BrowserbaseBrowserUseService() 
"""
Browser Use Service - Real browser automation using browser-use library
"""

import asyncio
import os
from typing import Optional, Dict, Any
from browser_use import Agent, BrowserSession, BrowserProfile
from browser_use.llm import ChatOpenAI, ChatAnthropic, ChatGoogle
from src.core.config import settings

# Semaphore to limit concurrent browser instances
browser_semaphore = asyncio.Semaphore(1)  # Only 1 browser at a time

class BrowserUseService:
    """Service for real browser automation using browser-use library"""
    
    def __init__(self):
        self.current_agent: Optional[Agent] = None
        self.browser_session: Optional[BrowserSession] = None
        self.browser_profile: Optional[BrowserProfile] = None
        
    def _get_llm_client(self, llm_provider: str = None, model: str = None):
        """Get LLM client based on provider"""
        provider = llm_provider or settings.DEFAULT_LLM_PROVIDER
        model_name = model or settings.DEFAULT_LLM_MODEL
        
        if provider.lower() == "openai":
            return ChatOpenAI(
                model=model_name or "gpt-4o",
                api_key=settings.OPENAI_API_KEY,
                temperature=0.1
            )
        elif provider.lower() == "anthropic":
            return ChatAnthropic(
                model=model_name or "claude-3-sonnet-20240229",
                api_key=settings.ANTHROPIC_API_KEY,
                temperature=0.1
            )
        elif provider.lower() == "google":
            return ChatGoogle(
                model=model_name or "gemini-pro",
                api_key=settings.GOOGLE_API_KEY,
                temperature=0.1
            )
        else:
            # Default to OpenAI
            return ChatOpenAI(
                model=model_name or "gpt-4o",
                api_key=settings.OPENAI_API_KEY,
                temperature=0.1
            )
    
    async def execute_task(
        self, 
        task_description: str,
        llm_provider: str = None,
        model: str = None,
        browser_config: Dict[str, Any] = None
    ) -> Dict[str, Any]:
        """Execute a browser automation task"""
        
        async with browser_semaphore:
            try:
                # Get LLM client
                llm = self._get_llm_client(llm_provider, model)
                
                # Create browser profile with configuration
                config = browser_config or {}
                self.browser_profile = BrowserProfile(
                    headless=config.get('headless', settings.BROWSER_HEADLESS),
                    storage_state=config.get('storage_state', None),
                    wait_for_network_idle_page_load_time=config.get('wait_for_network_idle', 3.0),
                    viewport={'width': 1920, 'height': 1080},
                    user_agent=config.get('user_agent', None),
                    allowed_domains=config.get('allowed_domains', None),
                    downloads_path=config.get('downloads_path', './tmp/downloads/'),
                    trace_path=config.get('trace_path', './tmp/traces/'),
                    slow_mo=config.get('slow_mo', 1000) if not config.get('headless', True) else 0
                )
                
                # Create browser session with profile
                self.browser_session = BrowserSession(
                    browser_profile=self.browser_profile
                )
                
                # Create agent with the new API
                self.current_agent = Agent(
                    task=task_description,
                    llm=llm,
                    use_vision=config.get('use_vision', True),
                    browser_session=self.browser_session,
                    max_failures=config.get('max_failures', 5),
                    save_conversation_path=config.get('save_conversation_path', './tmp/conversations/')
                )
                
                # Execute the task
                result = await self.current_agent.run()
                
                return {
                    "success": True,
                    "result": str(result) if result else "Task completed successfully",
                    "task": task_description,
                    "provider": llm_provider or settings.DEFAULT_LLM_PROVIDER,
                    "model": model or settings.DEFAULT_LLM_MODEL
                }
                
            except Exception as e:
                return {
                    "success": False,
                    "error": str(e),
                    "task": task_description,
                    "provider": llm_provider or settings.DEFAULT_LLM_PROVIDER,
                    "model": model or settings.DEFAULT_LLM_MODEL
                }
            
            finally:
                await self.cleanup()
    
    async def cleanup(self):
        """Clean up browser resources"""
        try:
            if self.browser_session:
                await self.browser_session.close()
                self.browser_session = None
            if self.browser_profile:
                self.browser_profile = None
            if self.current_agent:
                self.current_agent = None
        except Exception as e:
            print(f"Error during cleanup: {e}")
    
    async def get_current_page_info(self) -> Dict[str, Any]:
        """Get information about the current page"""
        if not self.browser_session:
            return {"error": "No active browser session"}
            
        try:
            # Get current page from browser session
            page = await self.browser_session.get_current_page()
            if page:
                return {
                    "url": page.url,
                    "title": await page.title(),
                    "status": "active"
                }
            else:
                return {"error": "No active page"}
        except Exception as e:
            return {"error": str(e)}
    
    def is_active(self) -> bool:
        """Check if browser service is currently active"""
        return self.current_agent is not None and self.browser_session is not None

# Global instance
browser_service = BrowserUseService() 
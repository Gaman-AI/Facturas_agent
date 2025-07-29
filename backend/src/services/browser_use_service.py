"""
Browser Use Service - Real browser automation using browser-use library with PyQt5 embedded browser
"""

import asyncio
import os
from typing import Optional, Dict, Any
from browser_use import Agent, BrowserSession, BrowserProfile
from browser_use.llm import ChatOpenAI, ChatAnthropic, ChatGoogle
from src.core.config import settings
from src.browser.embedded_browser import browser_manager, EmbeddedBrowser

# Semaphore to limit concurrent browser instances
browser_semaphore = asyncio.Semaphore(1)  # Only 1 browser at a time

# Global browser session for embedded browser support
_global_browser_session: Optional[BrowserSession] = None
_embedded_browser_instance: Optional[EmbeddedBrowser] = None

class BrowserUseService:
    """Service for real browser automation using browser-use library with PyQt5 embedded browser"""
    
    def __init__(self):
        self.current_agent: Optional[Agent] = None
        self.browser_session: Optional[BrowserSession] = None
        self.browser_profile: Optional[BrowserProfile] = None
        self.embedded_browser: Optional[EmbeddedBrowser] = None
        
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
    
    async def _get_or_create_embedded_browser(self, config: Dict[str, Any] = None) -> EmbeddedBrowser:
        """Get or create embedded browser instance"""
        global _embedded_browser_instance
        
        if _embedded_browser_instance is None:
            # Initialize the browser manager
            browser_manager.initialize()
            
            # Get the embedded browser instance
            _embedded_browser_instance = browser_manager.get_browser()
            
            # Start the embedded browser (opens new window)
            browser_manager.start()
            
            print("🌐 PyQt5 Embedded Browser window opened")
            print("🎯 Agent will execute tasks in the embedded browser")
            
        return _embedded_browser_instance
    
    async def _get_or_create_browser_session(self, config: Dict[str, Any] = None) -> BrowserSession:
        """Get or create a browser session using PyQt5 embedded browser"""
        global _global_browser_session
        
        if _global_browser_session is None:
            config = config or {}
            
            # Get the embedded browser instance
            self.embedded_browser = await self._get_or_create_embedded_browser(config)
            
            # Create a custom browser session that uses the embedded browser
            _global_browser_session = EmbeddedBrowserSession(self.embedded_browser)
            
            print("🔗 Browser session created with PyQt5 embedded browser")
        
        return _global_browser_session
    
    async def execute_task(
        self, 
        task_description: str,
        llm_provider: str = None,
        model: str = None,
        browser_config: Dict[str, Any] = None
    ) -> Dict[str, Any]:
        """Execute a browser automation task in PyQt5 embedded browser"""
        
        async with browser_semaphore:
            try:
                # Get LLM client
                llm = self._get_llm_client(llm_provider, model)
                
                # Get or create browser session with embedded browser
                self.browser_session = await self._get_or_create_browser_session(browser_config)
                
                # Create agent with the embedded browser session
                self.current_agent = Agent(
                    task=task_description,
                    llm=llm,
                    use_vision=browser_config.get('use_vision', True) if browser_config else True,
                    browser_session=self.browser_session,
                    max_failures=browser_config.get('max_failures', 5) if browser_config else 5,
                    save_conversation_path=browser_config.get('save_conversation_path', './tmp/conversations/') if browser_config else './tmp/conversations/'
                )
                
                print(f"🤖 Starting agent execution in embedded browser: {task_description}")
                
                # Execute the task in the embedded browser
                result = await self.current_agent.run()
                
                return {
                    "success": True,
                    "result": result,
                    "error": None,
                    "browser_type": "PyQt5 Embedded Browser"
                }
                
            except Exception as e:
                print(f"❌ Error executing task in embedded browser: {e}")
                return {
                    "success": False,
                    "result": None,
                    "error": str(e),
                    "browser_type": "PyQt5 Embedded Browser"
                }
    
    async def stop_agent(self):
        """Stop the current agent"""
        if self.current_agent:
            # Stop the agent
            if hasattr(self.current_agent, 'stop'):
                self.current_agent.stop()
            self.current_agent = None
            print("🛑 Agent stopped")
    
    async def close_browser(self):
        """Close the embedded browser"""
        global _global_browser_session, _embedded_browser_instance
        
        if _global_browser_session:
            _global_browser_session = None
            
        if _embedded_browser_instance:
            browser_manager.stop()
            _embedded_browser_instance = None
            print("🔒 Embedded browser closed")


class EmbeddedBrowserSession:
    """Custom browser session that uses PyQt5 embedded browser"""
    
    def __init__(self, embedded_browser: EmbeddedBrowser):
        self.embedded_browser = embedded_browser
        self.page_adapter = embedded_browser.get_current_page_playwright_equivalent()
        self.is_setup = False
        self.context = None
        self.browser = None
    
    async def setup(self):
        """Setup the browser session"""
        if not self.is_setup:
            # Initialize the page adapter
            await self.page_adapter.goto("about:blank")
            self.is_setup = True
            print("✅ Embedded browser session setup complete")
    
    async def get_page(self):
        """Get the current page (PyQt5 adapter)"""
        return self.page_adapter
    
    async def new_page(self):
        """Create a new page (returns the same page for embedded browser)"""
        return self.page_adapter
    
    async def close(self):
        """Close the browser session"""
        if self.embedded_browser:
            browser_manager.stop()
            print("🔒 Browser session closed")
    
    async def __aenter__(self):
        await self.setup()
        return self
    
    async def __aexit__(self, exc_type, exc_val, exc_tb):
        await self.close()
    
    # Browser-use compatibility methods
    @property
    def current_page(self):
        """Get current page (browser-use compatibility)"""
        return self.page_adapter
    
    async def get_current_page(self):
        """Get current page async (browser-use compatibility)"""
        return self.page_adapter
    
    def set_page_callback(self, callback):
        """Set page callback for browser-use compatibility"""
        if self.embedded_browser:
            self.embedded_browser.set_agent_callback(callback)

# Global browser service instance
browser_service = BrowserUseService() 
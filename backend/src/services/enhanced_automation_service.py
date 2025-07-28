"""
Enhanced Automation Service - Browser-use agent with BrowserBase live view
"""

import asyncio
import os
from typing import Optional
from dotenv import load_dotenv
import logging

from browserbase import Browserbase
from browser_use import Agent as BrowserUseAgent
from browser_use.browser.session import BrowserSession
from browser_use.browser import BrowserProfile
from langchain_anthropic import ChatAnthropic

from src.services.task_manager import task_manager, TaskStatus
from src.core.config import settings

logger = logging.getLogger(__name__)

class ManagedBrowserSession:
    """Context manager for proper BrowserSession lifecycle management"""
    
    def __init__(self, cdp_url: str, browser_profile: BrowserProfile, session_id: str = None):
        self.cdp_url = cdp_url
        self.browser_profile = browser_profile
        self.browser_session = None
        self.session_id = session_id

    async def __aenter__(self) -> BrowserSession:
        try:
            logger.info(f"🔗 Connecting to BrowserBase CDP URL: {self.cdp_url[:50]}...")
            self.browser_session = BrowserSession(
                cdp_url=self.cdp_url,
                browser_profile=self.browser_profile,
                keep_alive=False,
                initialized=False,
            )
            logger.info("🚀 Starting browser session...")
            await self.browser_session.start()
            logger.info("✅ Browser session initialized successfully")
            logger.info(f"🌐 Browser session ready for automation")
            return self.browser_session
        except Exception as e:
            logger.error(f"❌ Failed to initialize browser session: {e}")
            logger.error(f"CDP URL: {self.cdp_url}")
            await self._emergency_cleanup()
            raise

    async def __aexit__(self, exc_type, exc_val, exc_tb):
        await self._close_session_properly()

    async def _close_session_properly(self):
        playwright_instance = None
        try:
            if self.browser_session:
                if hasattr(self.browser_session, 'playwright'):
                    playwright_instance = self.browser_session.playwright
                if self.browser_session.initialized:
                    await self.browser_session.stop()
                    logger.info("✅ Browser session closed successfully")
        except Exception as e:
            error_msg = str(e).lower()
            if "browser is closed" in error_msg or "disconnected" in error_msg:
                logger.info("ℹ️ Browser session was already closed (expected behavior)")
            else:
                logger.warning(f"⚠️ Error during browser session closure: {e}")
        finally:
            if playwright_instance:
                try:
                    await playwright_instance.stop()
                    logger.info("✅ Playwright instance stopped successfully")
                except Exception as e:
                    logger.warning(f"⚠️ Error stopping Playwright: {e}")
            
            # Terminate BrowserBase session to free up concurrent session limit
            await self._terminate_browserbase_session()
            await self._final_cleanup()

    async def _emergency_cleanup(self):
        try:
            if self.browser_session:
                if hasattr(self.browser_session, 'playwright'):
                    await self.browser_session.playwright.stop()
                if self.browser_session.initialized:
                    await self.browser_session.stop()
        except Exception as e:
            logger.warning(f"⚠️ Emergency cleanup error: {e}")
        finally:
            await self._final_cleanup()

    async def _terminate_browserbase_session(self):
        """Terminate the BrowserBase session to free up concurrent session limit"""
        if self.session_id:
            try:
                from dotenv import load_dotenv
                load_dotenv()
                bb = Browserbase(api_key=os.getenv("BROWSERBASE_API_KEY"))
                # Use the correct method to terminate the session
                bb.sessions.terminate(self.session_id)
                logger.info(f"✅ BrowserBase session {self.session_id} terminated successfully")
            except Exception as e:
                logger.warning(f"⚠️ Failed to terminate BrowserBase session {self.session_id}: {e}")

    async def _final_cleanup(self):
        self.browser_session = None
        self.session_id = None

class EnhancedAutomationService:
    """Enhanced automation service using browser-use agent with BrowserBase live view"""
    
    def __init__(self):
        load_dotenv()
        self.api_key = os.getenv("BROWSERBASE_API_KEY")
        self.project_id = os.getenv("BROWSERBASE_PROJECT_ID")
        self.anthropic_key = os.getenv("ANTHROPIC_API_KEY")
        
        if not self.api_key or not self.project_id:
            logger.warning("BrowserBase credentials not found - live view may not work")
        
        if not self.anthropic_key:
            logger.warning("Anthropic API key not found - agent may not work")
    
    async def create_browserbase_session(self):
        """Create a new BrowserBase session for live view"""
        try:
            bb = Browserbase(api_key=self.api_key)
            session = bb.sessions.create(project_id=self.project_id)
            
            live_url = f"https://www.browserbase.com/sessions/{session.id}"
            
            logger.info(f"Created BrowserBase session: {session.id}")
            logger.info(f"Live view URL: {live_url}")
            
            return session, live_url
        except Exception as e:
            logger.error(f"Failed to create BrowserBase session: {e}")
            raise
    
    def create_browser_profile(self) -> BrowserProfile:
        """Create browser profile with optimal settings following best practices"""
        return BrowserProfile(
            keep_alive=False,  # Critical for proper session cleanup
            wait_between_actions=2.0,
            default_timeout=30000,
            default_navigation_timeout=30000,
        )
    
    def get_llm_client(self, llm_provider: str = None, model: str = None):
        """Get LLM client for the browser-use agent"""
        provider = llm_provider or settings.DEFAULT_LLM_PROVIDER
        model_name = model or settings.DEFAULT_LLM_MODEL
        
        if provider.lower() == "anthropic":
            return ChatAnthropic(
                model=model_name or "claude-3-5-sonnet-20240620",
                api_key=self.anthropic_key,
                temperature=0.0
            )
        else:
            # Default to Anthropic
            return ChatAnthropic(
                model="claude-3-5-sonnet-20240620",
                api_key=self.anthropic_key,
                temperature=0.0
            )
    
    async def run_automation_task_with_control(
        self, 
        task_id: str, 
        browser_session: BrowserSession, 
        task_description: str,
        llm_provider: str = None,
        model: str = None,
        max_steps: int = 20
    ) -> str:
        """Execute automation task with cancellation support"""
        
        # Get LLM client
        llm = self.get_llm_client(llm_provider, model)
        
        # Create browser-use agent
        logger.info(f"🤖 Creating browser-use agent for task: {task_description[:100]}...")
        agent = BrowserUseAgent(
            task=task_description,
            llm=llm,
            browser_session=browser_session,
            enable_memory=False,
            max_failures=5,
            retry_delay=5,
            max_actions_per_step=1,
        )
        logger.info(f"✅ Browser-use agent created successfully")
        
        # Store agent reference for potential cancellation
        await task_manager.update_task_status(task_id, TaskStatus.RUNNING, agent=agent)
        
        try:
            logger.info(f"🚀 Starting browser-use agent for task {task_id}")
            await task_manager.update_task_status(task_id, TaskStatus.RUNNING, progress="Agent started")
            
            # Add detailed logging for debugging
            logger.info(f"Agent configuration: max_steps={max_steps}, enable_memory=False")
            logger.info(f"LLM provider: {llm_provider or 'anthropic'}, model: {model or 'claude-3-5-sonnet-20240620'}")
            
            # Execute the task with detailed progress tracking
            await task_manager.update_task_status(task_id, TaskStatus.RUNNING, progress="Browser-use agent is starting...")
            logger.info(f"🎬 Agent.run() starting for task {task_id}")
            
            # Add a small delay and status update to show agent is working
            await asyncio.sleep(2)
            await task_manager.update_task_status(task_id, TaskStatus.RUNNING, progress="Browser-use agent is working...")
            
            result = await agent.run(max_steps=max_steps)
            logger.info(f"🏁 Agent.run() completed for task {task_id}")
            
            logger.info(f"🎉 Task {task_id} completed successfully!")
            logger.info(f"Result: {str(result)[:200]}...")  # Log first 200 chars of result
            return str(result)
            
        except Exception as e:
            error_msg = str(e).lower()
            full_error = str(e)
            
            # Log full error for debugging
            logger.error(f"❌ Agent execution error for task {task_id}: {full_error}")
            
            if "browser is closed" in error_msg or "disconnected" in error_msg:
                logger.info(f"✅ Task {task_id} completed - Browser session ended normally")
                return "Task completed successfully (session ended normally)"
            elif "timeout" in error_msg:
                logger.error(f"⏰ Task {task_id} timed out")
                raise Exception(f"Task timed out: {full_error}")
            elif "anthropic" in error_msg or "api" in error_msg:
                logger.error(f"🤖 LLM API error for task {task_id}")
                raise Exception(f"LLM API error: {full_error}")
            else:
                logger.error(f"💥 Unexpected error for task {task_id}")
                raise Exception(f"Automation error: {full_error}")
        finally:
            # Clean up agent reference
            await task_manager.update_task_status(task_id, TaskStatus.RUNNING, agent=None)
            del agent
    
    async def execute_task_background(
        self, 
        task_id: str, 
        task_description: str,
        llm_provider: str = None,
        model: str = None,
        max_steps: int = 20
    ):
        """Execute task in background with full lifecycle management"""
        try:
            # Update status to initializing
            await task_manager.update_task_status(
                task_id, 
                TaskStatus.INITIALIZING, 
                progress="Creating BrowserBase session"
            )
            
            # Create BrowserBase session for live view
            session, live_url = await self.create_browserbase_session()
            
            # Update status to connecting
            await task_manager.update_task_status(
                task_id, 
                TaskStatus.CONNECTING, 
                progress="Connecting to browser",
                live_url=live_url
            )
            
            # Create browser profile
            browser_profile = self.create_browser_profile()
            
            # Execute task with managed browser session
            logger.info(f"🔗 Establishing managed browser session for task {task_id}")
            async with ManagedBrowserSession(session.connect_url, browser_profile, session.id) as browser_session:
                # Store session reference
                await task_manager.update_task_status(task_id, TaskStatus.CONNECTING, session=browser_session)
                
                # Add delay to allow browser session to fully initialize
                logger.info("⏳ Waiting for browser session to fully initialize...")
                await asyncio.sleep(3)
                
                # Execute the automation task
                logger.info(f"🎯 Starting automation task execution for task {task_id}")
                result = await self.run_automation_task_with_control(
                    task_id, 
                    browser_session, 
                    task_description,
                    llm_provider,
                    model,
                    max_steps
                )
                
                # Complete the task
                await task_manager.complete_task(task_id, result=result)
                logger.info(f"Task {task_id} completed successfully")
                
        except Exception as e:
            # Complete the task with error
            await task_manager.complete_task(task_id, error=str(e))
            logger.error(f"Task {task_id} failed: {e}")
    
    async def start_task(
        self, 
        task_description: str,
        llm_provider: str = None,
        model: str = None,
        max_steps: int = 20
    ) -> str:
        """Start a new automation task"""
        
        # Create task
        task_id = await task_manager.create_task(task_description)
        
        # Start background execution
        asyncio.create_task(self.execute_task_background(
            task_id, 
            task_description,
            llm_provider,
            model,
            max_steps
        ))
        
        return task_id
    
    async def stop_task(self, task_id: str) -> bool:
        """Stop a running task"""
        task = await task_manager.get_task(task_id)
        if not task:
            return False
        
        if task["status"] not in [TaskStatus.RUNNING.value, TaskStatus.CONNECTING.value, TaskStatus.INITIALIZING.value]:
            return False
        
        try:
            # Signal cancellation
            await task_manager.stop_task(task_id)
            
            # Try to stop browser session if available
            if task.get("session"):
                try:
                    await task["session"].stop()
                    logger.info(f"Browser session stopped for task {task_id}")
                except Exception as e:
                    logger.warning(f"Error stopping browser session for task {task_id}: {e}")
            
            return True
            
        except Exception as e:
            logger.error(f"Failed to stop task {task_id}: {e}")
            return False
    
    async def get_task_status(self, task_id: str) -> Optional[dict]:
        """Get current task status"""
        return await task_manager.get_task_summary(task_id)
    
    async def list_all_tasks(self) -> list:
        """List all tasks"""
        return await task_manager.get_all_task_summaries()
    
    async def get_stats(self) -> dict:
        """Get service statistics"""
        return await task_manager.get_stats()

# Global service instance
automation_service = EnhancedAutomationService() 

from typing import Optional
from src.agent.agent_manager import AgentManager
from src.agent.browser_use.browser_use_agent import BrowserUseAgent
from src.browser.custom_browser import CustomBrowser
from src.browser.custom_context import CustomBrowserContext
from src.controller.custom_controller import CustomController
from browser_use.browser.context import BrowserContextConfig
from browser_use.browser.browser import BrowserConfig
from src.utils.llm_provider import get_llm_model
import asyncio
import logging

logger = logging.getLogger(__name__)

class AgentService:
    _instance = None

    def __new__(cls):
        if cls._instance is None:
            cls._instance = super(AgentService, cls).__new__(cls)
            cls._instance.agent: Optional[BrowserUseAgent] = None
            cls._instance.browser: Optional[CustomBrowser] = None
            cls._instance.browser_context: Optional[CustomBrowserContext] = None
            cls._instance.controller: Optional[CustomController] = None
            cls._instance.task: Optional[asyncio.Task] = None
        return cls._instance

    async def start_agent(self, config: dict):
        logger.info("Starting agent...")
        try:
            # Browser configuration
            browser_config = BrowserConfig(
                headless=config.get("headless", False),
                disable_security=config.get("disable_security", True),
                window_width=config.get("window_width", 1280),
                window_height=config.get("window_height", 1024),
            )
            
            # Create browser
            self.browser = CustomBrowser(config=browser_config)
            
            # Create browser context
            context_config = BrowserContextConfig(
                window_width=config.get("window_width", 1280),
                window_height=config.get("window_height", 1024),
                save_downloads_path="./tmp/downloads",
            )
            self.browser_context = await self.browser.new_context(config=context_config)
            
            # Create controller
            self.controller = CustomController()

            # Get LLM
            llm_provider = config.get("llm_provider", "openai")
            llm_model = config.get("llm_model", "gpt-4o")
            llm = get_llm_model(llm_provider, model_name=llm_model)

            # Create agent
            task_description = config.get("objective", "No objective provided")
            self.agent = BrowserUseAgent(
                task=task_description,
                llm=llm,
                browser=self.browser,
                browser_context=self.browser_context,
                controller=self.controller,
                use_vision=config.get("use_vision", True),
                max_actions_per_step=config.get("max_actions_per_step", 10),
            )
            
            # Start the agent task
            self.task = asyncio.create_task(self.agent.run(max_steps=config.get("max_steps", 100)))
            logger.info("Agent started successfully.")
        except Exception as e:
            logger.error(f"Failed to start agent: {e}")
            raise

    async def stop_agent(self):
        logger.info("Stopping agent...")
        if self.task:
            self.task.cancel()
        if self.browser:
            await self.browser.close()
        self.agent = None
        self.browser = None
        self.browser_context = None
        self.controller = None
        self.task = None
        logger.info("Agent stopped successfully.")

    def get_agent_status(self):
        if self.task and not self.task.done():
            return "running"
        return "idle"

agent_service = AgentService() 
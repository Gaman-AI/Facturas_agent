import asyncio
import os
from src.agent.browser_use.browser_use_agent import BrowserUseAgent
from src.browser.custom_browser import CustomBrowser
from src.controller.custom_controller import CustomController
from browser_use.browser.browser import BrowserConfig
from browser_use.browser.context import BrowserContextConfig
from src.utils import llm_provider

async def main():
    # 1. Setup browser and context
    browser = CustomBrowser(config=BrowserConfig(headless=True))
    context = await browser.new_context(config=BrowserContextConfig(window_width=1280, window_height=1100))

    # 2. Setup controller
    controller = CustomController()

    # 3. Setup LLM (using OpenAI as example, adjust as needed)
    llm = llm_provider.get_llm_model(
        provider="openai",
        model_name="gpt-4o",
        temperature=0.5,
        api_key=os.getenv("OPENAI_API_KEY", "")
    )

    # 4. Create agent
    agent = BrowserUseAgent(
        task="Go to example.com and take a screenshot",
        llm=llm,
        browser=browser,
        browser_context=context,
        controller=controller,
        use_vision=True,
    )

    # 5. Run agent and print each step
    print("Running agent task...")
    history = await agent.run(max_steps=10)
    print("\n--- Final Result ---")
    print(history.final_result())
    print("\n--- Step-by-step History ---")
    for step in history.history:
        print(f"Step: {step}")
    print("\n--- Errors ---")
    print(history.errors())

    # Cleanup
    await context.close()
    await browser.close()
    await controller.close_mcp_client()

if __name__ == "__main__":
    asyncio.run(main()) 
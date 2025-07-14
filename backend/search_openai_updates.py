"""
Search for OpenAI latest updates using browser-use agent
"""
import asyncio
import os
from dotenv import load_dotenv
from src.services.browser_use_service import BrowserUseService

# Load environment variables
load_dotenv()

async def search_openai_updates():
    """Search for OpenAI latest updates on Google"""
    print("🔍 Searching for OpenAI latest updates...")
    print("=" * 50)
    
    # Check if API key is available
    if not os.getenv('OPENAI_API_KEY'):
        print("❌ No OPENAI_API_KEY found in environment")
        print("Please set your OpenAI API key in the .env file")
        return False
        
    service = BrowserUseService()
    
    try:
        # Task: Search for OpenAI latest updates
        task_description = "Go to Google and search for 'OpenAI latest update'. Click on the first few relevant results to see what's new with OpenAI."
        
        print(f"🤖 Task: {task_description}")
        print("👀 Watch the browser window for live interactions...")
        print("⏳ Starting browser automation...")
        
        result = await service.execute_task(
            task_description=task_description,
            llm_provider="openai",
            model="gpt-4o",  # Use latest model
            browser_config={
                "headless": False,  # Show browser window
                "use_vision": True,  # Enable AI vision
                "max_failures": 3,
                "wait_for_network_idle": 2.0,
                "slow_mo": 1500,  # Slow down for better visibility
                "window_size": {"width": 1280, "height": 720}
            }
        )
        
        print("\n" + "=" * 50)
        print("✅ Task completed successfully!")
        print(f"📊 Result: {result.get('result', 'No result available')}")
        
        if result.get('actions'):
            print(f"🎯 Actions performed: {len(result['actions'])}")
            for i, action in enumerate(result['actions'][:5], 1):  # Show first 5 actions
                print(f"   {i}. {action}")
        
        return True
        
    except Exception as e:
        print(f"❌ Error: {e}")
        return False
        
    finally:
        # Clean up
        await service.cleanup()

if __name__ == "__main__":
    asyncio.run(search_openai_updates()) 
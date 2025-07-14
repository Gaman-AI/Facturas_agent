"""
Test script to verify browser visibility and interaction
"""
import asyncio
import os
from dotenv import load_dotenv
from src.services.browser_use_service import BrowserUseService

# Load environment variables
load_dotenv()

async def test_visible_browser():
    """Test visible browser interaction"""
    print("🎯 Testing Visible Browser Interaction")
    print("=" * 50)
    
    # Check if API key is available
    if not os.getenv('OPENAI_API_KEY'):
        print("❌ No OPENAI_API_KEY found in environment")
        print("Please set your OpenAI API key in environment variables")
        return False
        
    service = BrowserUseService()
    
    try:
        print("🚀 Starting browser agent...")
        print("👀 A browser window should open - watch for the agent's actions!")
        print("⏱️  Actions are slowed down to 2 seconds for better visibility")
        print("🎬 The agent will:")
        print("   1. Open Google")
        print("   2. Search for 'browser automation'")
        print("   3. Click on the first result")
        print("-" * 50)
        
        # Execute the task with visible browser and extra slow motion
        result = await service.execute_task(
            task_description="Go to google.com, search for 'browser automation', and click on the first search result",
            llm_provider="openai",
            model="gpt-4o-mini",
            browser_config={
                "headless": False,          # Show the browser window
                "use_vision": True,         # Enable AI vision to see the page
                "max_failures": 3,          # Allow some retries
                "wait_for_network_idle": 3.0,  # Wait for pages to load
                "slow_mo": 2000,            # Extra slow (2 seconds between actions)
                "allowed_domains": None,    # Allow all domains
                "downloads_path": "./tmp/downloads/",
                "trace_path": "./tmp/traces/",
                "save_conversation_path": "./tmp/conversations/"
            }
        )
        
        print("\n" + "=" * 50)
        print("✅ Task completed!")
        print(f"🎯 Result: {result.get('success', False)}")
        if result.get('success'):
            print(f"📄 Details: {result.get('result', 'No details')}")
        else:
            print(f"❌ Error: {result.get('error', 'Unknown error')}")
            
        return result.get('success', False)
        
    except Exception as e:
        print(f"\n❌ Error during execution: {str(e)}")
        return False
        
    finally:
        # Cleanup
        await service.cleanup()

if __name__ == "__main__":
    print("🔧 Browser Visibility Test")
    print("This will open a browser window where you can see the agent working")
    print("Make sure you have your OpenAI API key set in environment variables")
    print("")
    
    # Run the test
    success = asyncio.run(test_visible_browser())
    
    if success:
        print("\n✅ Browser interaction test completed successfully!")
        print("You should have seen the browser window with the agent's actions.")
    else:
        print("\n❌ Browser interaction test failed!")
        print("Check the error messages above for troubleshooting.") 
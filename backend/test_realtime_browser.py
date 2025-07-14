"""
Test script to verify real-time browser endpoint with visible browser
"""
import asyncio
import os
from dotenv import load_dotenv
from src.api.endpoints.browser_agent_realtime import BrowserAgentRealtimeManager
from src.schemas.schemas import BrowserTaskRequest

# Load environment variables
load_dotenv()

async def test_realtime_browser():
    """Test real-time browser endpoint with visible browser"""
    print("🎯 Testing Real-Time Browser Endpoint")
    print("=" * 50)
    
    # Check if API key is available
    if not os.getenv('OPENAI_API_KEY'):
        print("❌ No OPENAI_API_KEY found in environment")
        print("Please set your OpenAI API key in environment variables")
        return False
        
    # Create manager
    manager = BrowserAgentRealtimeManager()
    
    try:
        print("🚀 Starting real-time browser agent...")
        print("👀 A browser window should open - watch for the agent's actions!")
        print("⏱️  Actions are slowed down for better visibility")
        print("🎬 The agent will:")
        print("   1. Open a news website")
        print("   2. Find and read a news article")
        print("   3. Summarize what it found")
        print("-" * 50)
        
        # Create task request
        task_request = BrowserTaskRequest(
            task_description="Go to bbc.com/news, find an interesting technology article, and summarize it",
            llm_provider="openai",
            model="gpt-4o-mini"
        )
        
        session_id = "test_session_123"
        
        # Execute the task
        result = await manager.execute_task_with_realtime(
            task_request=task_request,
            session_id=session_id
        )
        
        print("\n" + "=" * 50)
        print("✅ Task completed!")
        print(f"🎯 Result: {result.success}")
        if result.success:
            print(f"📄 Details: {result.result}")
        else:
            print(f"❌ Error: {result.error}")
            
        return result.success
        
    except Exception as e:
        print(f"\n❌ Error during execution: {str(e)}")
        return False

if __name__ == "__main__":
    print("🔧 Real-Time Browser Endpoint Test")
    print("This will test the real-time browser endpoint with visible browser window")
    print("Make sure you have your OpenAI API key set in environment variables")
    print("")
    
    # Run the test
    success = asyncio.run(test_realtime_browser())
    
    if success:
        print("\n✅ Real-time browser test completed successfully!")
        print("You should have seen the browser window with the agent's actions.")
    else:
        print("\n❌ Real-time browser test failed!")
        print("Check the error messages above for troubleshooting.") 
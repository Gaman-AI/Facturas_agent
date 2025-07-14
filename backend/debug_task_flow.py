"""
Debug script to test the complete task flow and identify issues
"""
import asyncio
import json
from datetime import datetime
from src.api.endpoints.browser_agent_realtime import BrowserAgentRealtimeManager
from src.schemas.schemas import BrowserTaskRequest

async def debug_task_flow():
    """Debug the complete task flow"""
    print("🔍 Debugging Task Flow")
    print("=" * 50)
    
    # Create manager and task request
    manager = BrowserAgentRealtimeManager()
    task_request = BrowserTaskRequest(
        task_description="Go to google.com and search for 'hello world'",
        llm_provider="openai",
        model="gpt-4o-mini"
    )
    
    session_id = f"debug_session_{int(datetime.now().timestamp())}"
    
    print(f"🎯 Task: {task_request.task_description}")
    print(f"🆔 Session ID: {session_id}")
    print(f"🤖 LLM: {task_request.llm_provider}/{task_request.model}")
    print("-" * 50)
    
    try:
        print("🚀 Step 1: Creating browser service...")
        from src.services.browser_use_service import BrowserUseService
        service = BrowserUseService()
        print("✅ Browser service created successfully")
        
        print("\n🔧 Step 2: Configuring browser...")
        browser_config = {
            "headless": False,
            "use_vision": True,
            "max_failures": 3,
            "wait_for_network_idle": 2.0,
            "slow_mo": 1000,
            "window_size": {"width": 1280, "height": 720},
            "save_conversation": True,
            "trace_path": f"./tmp/traces/{session_id}/",
            "conversation_path": f"./tmp/conversations/"
        }
        print("✅ Browser configuration set")
        print(f"   - Headless: {browser_config['headless']}")
        print(f"   - Slow motion: {browser_config['slow_mo']}ms")
        print(f"   - Window size: {browser_config['window_size']}")
        
        print("\n🎬 Step 3: Executing browser task...")
        print("   (This should open a browser window)")
        result = await service.execute_task(
            task_description=task_request.task_description,
            llm_provider=task_request.llm_provider,
            model=task_request.model,
            browser_config=browser_config
        )
        
        print("\n📊 Step 4: Analyzing result...")
        print(f"   - Type: {type(result)}")
        print(f"   - Success: {result.get('success', 'N/A')}")
        print(f"   - Result: {result.get('result', 'N/A')}")
        print(f"   - Error: {result.get('error', 'N/A')}")
        
        if result.get('success'):
            print("\n✅ Task completed successfully!")
            print(f"   - Provider: {result.get('provider')}")
            print(f"   - Model: {result.get('model')}")
            print(f"   - Task: {result.get('task')}")
            print(f"   - Result: {result.get('result')}")
        else:
            print("\n❌ Task failed!")
            print(f"   - Error: {result.get('error')}")
            
        print("\n🧹 Step 5: Cleaning up...")
        await service.cleanup()
        print("✅ Cleanup completed")
        
        return result
        
    except Exception as e:
        print(f"\n💥 Error in debug flow: {str(e)}")
        print(f"   - Type: {type(e)}")
        import traceback
        traceback.print_exc()
        return None

if __name__ == "__main__":
    print("🐛 Task Flow Debug Script")
    print("This will test the complete browser task flow and identify issues")
    print("Make sure you have your OpenAI API key set in environment variables")
    print("")
    
    # Run the debug
    result = asyncio.run(debug_task_flow())
    
    if result:
        print("\n" + "=" * 50)
        print("✅ Debug completed successfully!")
        print("The browser task flow is working correctly.")
    else:
        print("\n" + "=" * 50)
        print("❌ Debug failed!")
        print("Check the error messages above for troubleshooting.") 
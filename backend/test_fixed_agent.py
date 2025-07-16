#!/usr/bin/env python
"""
Test script to verify the browser agent works with the fixed code
"""
import asyncio
import sys
import os
sys.path.append(os.path.join(os.path.dirname(__file__), 'src'))

from src.agent.agent_manager import agent_manager
from src.core.config import settings
import uuid

async def test_browser_agent():
    """Test the browser agent with a simple task"""
    
    print("=" * 50)
    print("Testing Fixed Browser Agent")
    print("=" * 50)
    
    # Create a test task
    task_id = str(uuid.uuid4())
    task_prompt = "Go to google.com and search for 'OpenAI'"
    
    print(f"Task ID: {task_id}")
    print(f"Task: {task_prompt}")
    print("-" * 50)
    
    # Start the agent session
    try:
        print("Starting browser agent session...")
        success = await agent_manager.start_agent_session(task_id, task_prompt)
        
        if success:
            print("✅ Browser agent session started successfully!")
            print("🔥 A browser window should open and start performing the task!")
            print("Check the terminal output for real-time progress...")
            
            # Wait a bit to let the agent start
            await asyncio.sleep(5)
            
            # Check active sessions
            active_sessions = list(agent_manager.active_sessions.keys())
            print(f"Active sessions: {active_sessions}")
            
            # Let it run for a while
            print("Letting agent run for 30 seconds...")
            await asyncio.sleep(30)
            
            # Stop the session
            print("Stopping agent session...")
            await agent_manager.stop_agent_session(task_id)
            print("✅ Agent session stopped")
            
        else:
            print("❌ Failed to start browser agent session")
            
    except Exception as e:
        print(f"❌ Error testing browser agent: {e}")
        import traceback
        traceback.print_exc()

if __name__ == "__main__":
    # Make sure we have the environment set up
    print("Configuration:")
    print(f"BROWSER_HEADLESS: {settings.BROWSER_HEADLESS}")
    print(f"BROWSER_TYPE: {getattr(settings, 'BROWSER_TYPE', 'chromium')}")
    print(f"OPENAI_API_KEY: {'✅ Set' if settings.OPENAI_API_KEY else '❌ Not set'}")
    print()
    
    asyncio.run(test_browser_agent()) 
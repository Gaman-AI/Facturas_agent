"""
Demo script to show browser-use agent interaction in headed mode
"""
import asyncio
import os
from dotenv import load_dotenv
from src.services.browser_use_service import BrowserUseService

# Load environment variables
load_dotenv()

async def demo_google_search():
    """Demo: Google search with visible browser interaction"""
    print("🌐 Starting Browser-Use Agent Demo")
    print("=" * 50)
    
    # Check if API key is available
    if not os.getenv('OPENAI_API_KEY'):
        print("❌ No OPENAI_API_KEY found in environment")
        print("Please set your OpenAI API key in the .env file")
        return False
        
    service = BrowserUseService()
    
    try:
        print("🤖 Task: Search for 'browser automation tools' on Google")
        print("👀 Watch the browser window to see the agent in action!")
        print("⏱️  Actions are slowed down for better visibility")
        print("-" * 50)
        
        # Execute the task with visible browser
        result = await service.execute_task(
            task_description="Go to google.com and search for 'browser automation tools', then click on the first result",
            llm_provider="openai",
            model="gpt-4o-mini",
            browser_config={
                "headless": False,          # Show the browser window
                "use_vision": True,         # Enable AI vision to see the page
                "max_failures": 3,          # Allow some retries
                "wait_for_network_idle": 2.0,  # Wait for pages to load
                "slow_mo": 1500,            # Slow down actions (1.5 seconds between actions)
                "allowed_domains": None,    # Allow all domains
                "downloads_path": "./tmp/downloads/"
            }
        )
        
        print("\n" + "=" * 50)
        if result["success"]:
            print("✅ Demo completed successfully!")
            print(f"📝 Result: {result['result']}")
            print(f"🔧 Used: {result['provider']} with model {result['model']}")
        else:
            print("❌ Demo failed!")
            print(f"💥 Error: {result['error']}")
            
        return result["success"]
        
    except Exception as e:
        print(f"❌ Demo exception: {e}")
        return False
    finally:
        print("\n🧹 Cleaning up browser session...")
        await service.cleanup()
        print("✅ Cleanup complete!")

async def demo_billing_simulation():
    """Demo: Simulate electronic billing automation"""
    print("\n🌐 Starting Electronic Billing Simulation Demo")
    print("=" * 50)
    
    if not os.getenv('OPENAI_API_KEY'):
        print("❌ No OPENAI_API_KEY found in environment")
        return False
        
    service = BrowserUseService()
    
    try:
        print("🤖 Task: Simulate electronic billing data extraction")
        print("👀 Watch the browser navigate to a demo invoice website")
        print("-" * 50)
        
        # Simulate billing task
        result = await service.execute_task(
            task_description="Go to httpbin.org/json and extract all the data you can see, then explain what this data could represent in a billing context",
            llm_provider="openai",
            model="gpt-4o-mini",
            browser_config={
                "headless": False,
                "use_vision": True,
                "max_failures": 2,
                "wait_for_network_idle": 2.0,
                "slow_mo": 1200,
                "downloads_path": "./tmp/downloads/"
            }
        )
        
        print("\n" + "=" * 50)
        if result["success"]:
            print("✅ Billing simulation completed!")
            print(f"📄 Extracted data: {result['result']}")
        else:
            print("❌ Billing simulation failed!")
            print(f"💥 Error: {result['error']}")
            
        return result["success"]
        
    except Exception as e:
        print(f"❌ Billing simulation exception: {e}")
        return False
    finally:
        print("\n🧹 Cleaning up browser session...")
        await service.cleanup()

async def main():
    """Run the demo"""
    print("🚀 Browser-Use Agent Visual Demo")
    print("=" * 60)
    print("This demo will show you how the browser-use agent works")
    print("by opening a visible browser window and performing tasks.")
    print("=" * 60)
    
    # Run Google search demo
    demo1_success = await demo_google_search()
    
    # Wait a bit between demos
    if demo1_success:
        print("\n⏳ Waiting 3 seconds before next demo...")
        await asyncio.sleep(3)
        
        # Run billing simulation demo
        demo2_success = await demo_billing_simulation()
        
        print("\n🎉 Demo Summary:")
        print(f"  📊 Google Search Demo: {'✅ Success' if demo1_success else '❌ Failed'}")
        print(f"  📋 Billing Simulation Demo: {'✅ Success' if demo2_success else '❌ Failed'}")
    else:
        print("\n⚠️  Skipping second demo due to first demo failure")
    
    print("\n" + "=" * 60)
    print("🎯 This demonstrates how browser-use can automate:")
    print("  • Web navigation and search")
    print("  • Data extraction from websites")
    print("  • Form filling and interactions")
    print("  • Electronic billing automation")
    print("=" * 60)

if __name__ == "__main__":
    asyncio.run(main()) 
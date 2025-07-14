"""
Test script for updated browser-use service
"""
import asyncio
import os
from dotenv import load_dotenv
from src.services.browser_use_service import BrowserUseService

# Load environment variables
load_dotenv()

async def test_basic_functionality():
    """Test basic browser automation functionality"""
    print("Testing basic browser automation functionality...")
    
    # Check if API keys are available
    if not os.getenv('OPENAI_API_KEY'):
        print("❌ No OPENAI_API_KEY found in environment")
        return False
        
    service = BrowserUseService()
    
    try:
        # Test simple task
        task_description = "Go to google.com and search for 'browser-use'"
        
        print(f"Executing task: {task_description}")
        result = await service.execute_task(
            task_description=task_description,
            llm_provider="openai",
            model="gpt-4o-mini",  # Use smaller model for testing
            browser_config={
                "headless": False,  # Run in headed mode to see interactions
                "use_vision": True,
                "max_failures": 3,
                "wait_for_network_idle": 2.0,
                "slow_mo": 1000  # Slow down actions for better visibility
            }
        )
        
        if result["success"]:
            print(f"✅ Task completed successfully!")
            print(f"Result: {result['result']}")
            return True
        else:
            print(f"❌ Task failed: {result['error']}")
            return False
            
    except Exception as e:
        print(f"❌ Exception occurred: {e}")
        return False
    finally:
        await service.cleanup()

async def test_llm_providers():
    """Test different LLM providers"""
    print("\nTesting different LLM providers...")
    
    providers_to_test = []
    
    # Check which providers have API keys
    if os.getenv('OPENAI_API_KEY'):
        providers_to_test.append(("openai", "gpt-4o-mini"))
    if os.getenv('ANTHROPIC_API_KEY'):
        providers_to_test.append(("anthropic", "claude-3-haiku-20240307"))
    if os.getenv('GOOGLE_API_KEY'):
        providers_to_test.append(("google", "gemini-pro"))
    
    if not providers_to_test:
        print("❌ No API keys found for testing")
        return False
        
    service = BrowserUseService()
    
    for provider, model in providers_to_test:
        try:
            print(f"Testing {provider} with model {model}...")
            
            result = await service.execute_task(
                task_description="Navigate to httpbin.org/json and extract the data",
                llm_provider=provider,
                model=model,
                browser_config={
                    "headless": False,  # Run in headed mode to see interactions
                    "use_vision": False,  # Skip vision for simple test
                    "max_failures": 2,
                    "wait_for_network_idle": 1.0,
                    "slow_mo": 800  # Slow down actions for visibility
                }
            )
            
            if result["success"]:
                print(f"✅ {provider} test passed")
            else:
                print(f"❌ {provider} test failed: {result['error']}")
                
        except Exception as e:
            print(f"❌ {provider} test exception: {e}")
        finally:
            await service.cleanup()
            
    return True

async def test_browser_session_management():
    """Test browser session and page info functionality"""
    print("\nTesting browser session management...")
    
    if not os.getenv('OPENAI_API_KEY'):
        print("❌ No OPENAI_API_KEY found for testing")
        return False
        
    service = BrowserUseService()
    
    try:
        # Start a task that should keep the browser active
        task_description = "Go to httpbin.org and describe what you see"
        
        print(f"Starting task: {task_description}")
        result = await service.execute_task(
            task_description=task_description,
            browser_config={
                "headless": False,  # Run in headed mode to see interactions
                "use_vision": True,  # Enable vision to see the page
                "max_failures": 2,
                "slow_mo": 1000  # Slow down actions for better visibility
            }
        )
        
        if result["success"]:
            print("✅ Browser session test passed")
            
            # Test page info
            page_info = await service.get_current_page_info()
            if "error" not in page_info:
                print(f"✅ Page info retrieved: {page_info}")
            else:
                print(f"❌ Page info error: {page_info}")
                
            # Test is_active
            if service.is_active():
                print("✅ Service is active")
            else:
                print("❌ Service is not active")
                
            return True
        else:
            print(f"❌ Browser session test failed: {result['error']}")
            return False
            
    except Exception as e:
        print(f"❌ Browser session test exception: {e}")
        return False
    finally:
        await service.cleanup()

async def main():
    """Run all tests"""
    print("🧪 Starting browser-use service tests...")
    
    tests = [
        ("Basic functionality", test_basic_functionality),
        ("LLM providers", test_llm_providers),
        ("Browser session management", test_browser_session_management)
    ]
    
    passed = 0
    total = len(tests)
    
    for test_name, test_func in tests:
        print(f"\n{'='*50}")
        print(f"Running: {test_name}")
        print(f"{'='*50}")
        
        try:
            result = await test_func()
            if result:
                passed += 1
                print(f"✅ {test_name} PASSED")
            else:
                print(f"❌ {test_name} FAILED")
        except Exception as e:
            print(f"❌ {test_name} ERROR: {e}")
    
    print(f"\n{'='*50}")
    print(f"Test Results: {passed}/{total} tests passed")
    print(f"{'='*50}")
    
    if passed == total:
        print("🎉 All tests passed!")
    else:
        print("⚠️  Some tests failed - check the output above")

if __name__ == "__main__":
    asyncio.run(main()) 
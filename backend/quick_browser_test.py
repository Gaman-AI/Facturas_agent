#!/usr/bin/env python3
"""
Quick test to verify browser-use library works
"""

import asyncio
import sys

# Set Windows event loop policy first
if sys.platform.startswith('win'):
    asyncio.set_event_loop_policy(asyncio.WindowsProactorEventLoopPolicy())
    print("✅ Windows Proactor Event Loop Policy set")

async def test_browser_use():
    try:
        # Test basic imports
        print("📦 Testing imports...")
        from browser_use import Agent
        from playwright.async_api import async_playwright
        print("✅ Imports successful")
        
        # Test playwright directly first
        print("🎭 Testing Playwright...")
        async with async_playwright() as p:
            browser = await p.chromium.launch(headless=True)
            page = await browser.new_page()
            await page.goto("https://example.com")
            title = await page.title()
            await browser.close()
            print(f"✅ Playwright test passed - Title: {title}")
        
        # Test browser-use Agent
        print("🤖 Testing browser-use Agent...")
        agent = Agent(
            task="Navigate to https://example.com and get the page title",
            llm=None  # We'll use the default or mock LLM
        )
        
        print("✅ Agent created successfully")
        
        # Try to run a simple task (this might fail without proper LLM setup)
        try:
            result = await agent.run()
            print(f"✅ Agent task completed: {result}")
        except Exception as e:
            print(f"⚠️ Agent task failed (expected without LLM): {e}")
            print("✅ But Agent instantiation works!")
        
        return True
        
    except ImportError as e:
        print(f"❌ Import error: {e}")
        print("💡 Try: pip install browser-use playwright")
        return False
    except Exception as e:
        print(f"❌ Test failed: {e}")
        print(f"Error type: {type(e).__name__}")
        return False

async def test_subprocess():
    """Test subprocess creation specifically"""
    try:
        print("🧪 Testing subprocess creation...")
        proc = await asyncio.create_subprocess_exec(
            'python', '--version',
            stdout=asyncio.subprocess.PIPE,
            stderr=asyncio.subprocess.PIPE
        )
        stdout, stderr = await proc.communicate()
        
        if proc.returncode == 0:
            version = stdout.decode().strip()
            print(f"✅ Subprocess test passed - {version}")
            return True
        else:
            print(f"❌ Subprocess failed with return code: {proc.returncode}")
            return False
            
    except NotImplementedError as e:
        print(f"❌ NotImplementedError: {e}")
        print("💡 Event loop doesn't support subprocesses")
        return False
    except Exception as e:
        print(f"❌ Subprocess test failed: {e}")
        return False

if __name__ == "__main__":
    print("🧪 Quick Browser-Use Test")
    print("=" * 40)
    
    async def run_tests():
        # Test 1: Subprocess support
        subprocess_ok = await test_subprocess()
        print()
        
        # Test 2: Browser-use functionality
        browser_use_ok = await test_browser_use()
        print()
        
        # Summary
        print("=" * 40)
        if subprocess_ok and browser_use_ok:
            print("🎉 All tests passed! You're ready to run the main application.")
        elif subprocess_ok:
            print("⚠️ Subprocess works but browser-use has issues. Check dependencies.")
        else:
            print("❌ Subprocess support failed. This will cause browser automation issues.")
            print("💡 Try running this script in a different environment.")
        
        return subprocess_ok and browser_use_ok
    
    try:
        success = asyncio.run(run_tests())
        sys.exit(0 if success else 1)
    except Exception as e:
        print(f"❌ Test runner failed: {e}")
        sys.exit(1)
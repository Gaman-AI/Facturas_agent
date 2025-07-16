#!/usr/bin/env python3
"""
Backend Testing Script for Browser Use Agent
Run this script to test if your backend is working properly
"""

import asyncio
import aiohttp
import json
import sys
import time
from datetime import datetime

# Configuration
BASE_URL = "http://localhost:8000"
API_V1 = "/api/v1"

async def test_health_check():
    """Test basic health check"""
    print("🏥 Testing health check...")
    try:
        async with aiohttp.ClientSession() as session:
            async with session.get(f"{BASE_URL}/health") as response:
                data = await response.json()
                print(f"✅ Health check: {data}")
                return response.status == 200
    except Exception as e:
        print(f"❌ Health check failed: {e}")
        return False

async def test_browser_automation():
    """Test browser automation capability"""
    print("🌐 Testing browser automation...")
    try:
        async with aiohttp.ClientSession() as session:
            async with session.post(f"{BASE_URL}/debug/test-browser") as response:
                data = await response.json()
                if response.status == 200:
                    print(f"✅ Browser test: {data}")
                    return True
                else:
                    print(f"❌ Browser test failed: {data}")
                    return False
    except Exception as e:
        print(f"❌ Browser test failed: {e}")
        return False

async def create_test_task():
    """Create a test browser automation task"""
    print("📋 Creating test task...")
    
    task_data = {
        "prompt": "Navigate to https://example.com and get the page title",
        "vendor_url": "https://example.com",
        "company_id": "test-company",
        "task_type": "browser_automation"
    }
    
    try:
        async with aiohttp.ClientSession() as session:
            async with session.post(
                f"{BASE_URL}{API_V1}/tasks",
                json=task_data,
                headers={"Content-Type": "application/json"}
            ) as response:
                data = await response.json()
                if response.status in [200, 201]:
                    print(f"✅ Task created: {data}")
                    return data.get('task_id') or data.get('id')
                else:
                    print(f"❌ Task creation failed: {data}")
                    return None
    except Exception as e:
        print(f"❌ Task creation failed: {e}")
        return None

async def monitor_task(task_id, timeout=30):
    """Monitor task progress"""
    print(f"👀 Monitoring task {task_id}...")
    
    start_time = time.time()
    while time.time() - start_time < timeout:
        try:
            async with aiohttp.ClientSession() as session:
                async with session.get(f"{BASE_URL}{API_V1}/tasks/{task_id}") as response:
                    if response.status == 200:
                        data = await response.json()
                        status = data.get('status', 'unknown')
                        print(f"📊 Task status: {status}")
                        
                        if status in ['completed', 'failed', 'error']:
                            print(f"🏁 Task finished with status: {status}")
                            return data
                        
                    await asyncio.sleep(2)
        except Exception as e:
            print(f"❌ Error monitoring task: {e}")
            break
    
    print("⏰ Task monitoring timeout")
    return None

async def test_websocket_connection(task_id):
    """Test WebSocket connection for real-time updates"""
    print(f"🔌 Testing WebSocket connection for task {task_id}...")
    
    try:
        import websockets
        
        uri = f"ws://localhost:8000/ws/{task_id}"
        async with websockets.connect(uri) as websocket:
            print("✅ WebSocket connected")
            
            # Send a ping
            await websocket.send(json.dumps({"type": "ping"}))
            
            # Listen for a few seconds
            try:
                message = await asyncio.wait_for(websocket.recv(), timeout=5.0)
                print(f"📨 Received: {message}")
            except asyncio.TimeoutError:
                print("⏰ No message received within timeout")
            
            return True
            
    except ImportError:
        print("⚠️ websockets library not installed, skipping WebSocket test")
        print("💡 Install with: pip install websockets")
        return False
    except Exception as e:
        print(f"❌ WebSocket test failed: {e}")
        return False

async def run_full_test():
    """Run complete backend test suite"""
    print("🧪 Starting Backend Test Suite")
    print("=" * 50)
    
    # Test 1: Basic health check
    health_ok = await test_health_check()
    if not health_ok:
        print("❌ Basic health check failed - server may not be running")
        return False
    
    print()
    
    # Test 2: Browser automation capability
    browser_ok = await test_browser_automation()
    if not browser_ok:
        print("⚠️ Browser automation test failed - Playwright issues detected")
    
    print()
    
    # Test 3: Create and monitor a task
    task_id = await create_test_task()
    if not task_id:
        print("❌ Failed to create test task")
        return False
    
    print()
    
    # Test 4: Monitor task progress
    result = await monitor_task(task_id)
    if result:
        print(f"✅ Task completed: {result}")
    
    print()
    
    # Test 5: WebSocket connection
    ws_ok = await test_websocket_connection(task_id)
    
    print()
    print("=" * 50)
    
    # Summary
    if health_ok and browser_ok and task_id and result:
        print("🎉 All tests passed! Backend is working properly.")
        return True
    else:
        print("⚠️ Some tests failed. Check the logs above for details.")
        return False

def print_troubleshooting_guide():
    """Print troubleshooting guide"""
    print("\n🔧 TROUBLESHOOTING GUIDE")
    print("=" * 50)
    print("If tests failed, try these steps:")
    print()
    print("1. 🚀 Start the server:")
    print("   python main.py")
    print()
    print("2. 🎭 Install Playwright browsers:")
    print("   playwright install")
    print("   playwright install chromium")
    print()
    print("3. 📦 Install missing dependencies:")
    print("   pip install websockets psutil")
    print()
    print("4. 🔍 Check server logs for detailed error messages")
    print()
    print("5. 💻 For Windows users:")
    print("   - Ensure you're using Python 3.8+")
    print("   - Try running as administrator")
    print("   - Check Windows Defender isn't blocking the process")
    print()
    print("6. 🌐 Test endpoints manually:")
    print(f"   - Health: {BASE_URL}/health")
    print(f"   - Docs: {BASE_URL}/docs")
    print(f"   - Browser test: {BASE_URL}/debug/test-browser")

if __name__ == "__main__":
    if len(sys.argv) > 1 and sys.argv[1] == "--help":
        print("🧪 Backend Testing Script")
        print("Usage: python test_backend.py [--help]")
        print()
        print("This script tests all backend functionality:")
        print("- Health checks")
        print("- Browser automation")
        print("- Task creation and monitoring")
        print("- WebSocket connections")
        print()
        print_troubleshooting_guide()
        sys.exit(0)
    
    print(f"🕐 Starting tests at {datetime.now()}")
    
    try:
        # Set Windows event loop policy if needed
        if sys.platform.startswith('win'):
            asyncio.set_event_loop_policy(asyncio.WindowsProactorEventLoopPolicy())
        
        # Run the test suite
        success = asyncio.run(run_full_test())
        
        if not success:
            print_troubleshooting_guide()
            sys.exit(1)
            
    except KeyboardInterrupt:
        print("\n⏹️ Tests interrupted by user")
    except Exception as e:
        print(f"\n❌ Test suite failed with error: {e}")
        print_troubleshooting_guide()
        sys.exit(1)
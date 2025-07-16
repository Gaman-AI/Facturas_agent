#!/usr/bin/env python3
"""
Test script to verify backend fixes work with frontend expectations
"""

import requests
import json
import asyncio
import websockets
from datetime import datetime

class FixedBackendTester:
    def __init__(self, base_url: str = "http://localhost:8000"):
        self.base_url = base_url
        self.session = requests.Session()
        self.task_id = None
        
    def test_root_endpoint(self):
        """Test the root endpoint"""
        try:
            response = self.session.get(f"{self.base_url}/")
            print(f"✅ Root endpoint: {response.status_code}")
            if response.status_code == 200:
                data = response.json()
                print(f"   Response: {data}")
                return True
            return False
        except Exception as e:
            print(f"❌ Root endpoint failed: {e}")
            return False
    
    def test_health_endpoint(self):
        """Test the health endpoint"""
        try:
            response = self.session.get(f"{self.base_url}/api/v1/health")
            print(f"✅ Health endpoint: {response.status_code}")
            if response.status_code == 200:
                data = response.json()
                print(f"   Response: {data}")
                return True
            return False
        except Exception as e:
            print(f"❌ Health endpoint failed: {e}")
            return False
    
    def test_create_task_frontend_format(self):
        """Test creating a task with frontend format"""
        task_data = {
            "prompt": "Search for OpenAI in Google"
        }
        
        try:
            print(f"\n🚀 Creating task with frontend format...")
            response = self.session.post(
                f"{self.base_url}/api/v1/tasks",
                json=task_data,
                headers={"Content-Type": "application/json"}
            )
            
            print(f"✅ Create task: {response.status_code}")
            if response.status_code in [200, 201, 202]:
                result = response.json()
                print(f"   Task created: {result}")
                
                # Extract task_id
                if "id" in result:
                    self.task_id = result["id"]
                    print(f"   Task ID: {self.task_id}")
                
                return True
            else:
                print(f"❌ Task creation failed: {response.text}")
                return False
                
        except Exception as e:
            print(f"❌ Task creation error: {e}")
            return False
    
    def test_agent_endpoint_frontend_format(self):
        """Test the agent endpoint with frontend format"""
        task_data = {
            "task": "Search for OpenAI in Google",
            "prompt": "Search for OpenAI in Google"
        }
        
        try:
            print(f"\n🎯 Testing agent endpoint with frontend format...")
            response = self.session.post(
                f"{self.base_url}/api/v1/agent",
                json=task_data,
                headers={"Content-Type": "application/json"}
            )
            
            print(f"✅ Agent endpoint: {response.status_code}")
            if response.status_code in [200, 201, 202]:
                result = response.json()
                print(f"   Agent response: {result}")
                return True
            else:
                print(f"❌ Agent endpoint failed: {response.text}")
                return False
                
        except Exception as e:
            print(f"❌ Agent endpoint error: {e}")
            return False
    
    def test_browser_agent_realtime_frontend_format(self):
        """Test browser agent realtime with frontend format"""
        task_data = {
            "prompt": "Search for OpenAI in Google",
            "session_id": f"test_session_{int(datetime.now().timestamp())}"
        }
        
        try:
            print(f"\n🤖 Testing browser agent realtime with frontend format...")
            response = self.session.post(
                f"{self.base_url}/api/v1/browser-agent-realtime",
                json=task_data,
                headers={"Content-Type": "application/json"}
            )
            
            print(f"✅ Browser agent realtime: {response.status_code}")
            if response.status_code in [200, 201, 202]:
                result = response.json()
                print(f"   Browser agent response: {result}")
                return True
            else:
                print(f"❌ Browser agent realtime failed: {response.text}")
                return False
                
        except Exception as e:
            print(f"❌ Browser agent realtime error: {e}")
            return False
    
    async def test_websocket_frontend_format(self):
        """Test WebSocket connection with frontend format"""
        if not self.task_id:
            self.task_id = f"test_task_{int(datetime.now().timestamp())}"
        
        ws_url = f"ws://localhost:8000/ws/{self.task_id}"
        print(f"\n🔌 Testing WebSocket with frontend format: {ws_url}")
        
        try:
            async with websockets.connect(ws_url, timeout=5) as websocket:
                print("✅ WebSocket connected successfully")
                
                # Send a test message
                await websocket.send("test message")
                print("   📤 Sent test message")
                
                # Try to receive a message (with timeout)
                try:
                    message = await asyncio.wait_for(websocket.recv(), timeout=3.0)
                    print(f"   📨 Received: {message}")
                except asyncio.TimeoutError:
                    print("   ⚠️ No response received (this is normal)")
                
                return True
                
        except Exception as e:
            print(f"❌ WebSocket failed: {e}")
            return False
    
    def run_comprehensive_test(self):
        """Run all tests"""
        print("=" * 60)
        print("🧪 FIXED BACKEND TEST SUITE")
        print("=" * 60)
        
        tests_passed = 0
        total_tests = 6
        
        # Test 1: Root endpoint
        print("\n1️⃣ Testing Root Endpoint...")
        if self.test_root_endpoint():
            tests_passed += 1
        
        # Test 2: Health endpoint
        print("\n2️⃣ Testing Health Endpoint...")
        if self.test_health_endpoint():
            tests_passed += 1
        
        # Test 3: Tasks endpoint with frontend format
        print("\n3️⃣ Testing Tasks Endpoint (Frontend Format)...")
        if self.test_create_task_frontend_format():
            tests_passed += 1
        
        # Test 4: Agent endpoint with frontend format
        print("\n4️⃣ Testing Agent Endpoint (Frontend Format)...")
        if self.test_agent_endpoint_frontend_format():
            tests_passed += 1
        
        # Test 5: Browser Agent Realtime with frontend format
        print("\n5️⃣ Testing Browser Agent Realtime (Frontend Format)...")
        if self.test_browser_agent_realtime_frontend_format():
            tests_passed += 1
        
        # Test 6: WebSocket
        print("\n6️⃣ Testing WebSocket...")
        try:
            if asyncio.run(self.test_websocket_frontend_format()):
                tests_passed += 1
        except Exception as e:
            print(f"❌ WebSocket test failed: {e}")
        
        print("\n" + "=" * 60)
        print(f"✅ TESTS COMPLETED: {tests_passed}/{total_tests} passed")
        if tests_passed == total_tests:
            print("🎉 All tests passed! Frontend-Backend integration should work!")
        else:
            print("⚠️ Some tests failed. Check the issues above.")
        print("=" * 60)

def main():
    """Main function"""
    # Test different ports
    ports = [8000, 8001, 5000, 3000]
    
    for port in ports:
        base_url = f"http://localhost:{port}"
        print(f"\n🔍 Testing fixed backend at {base_url}...")
        
        try:
            # Quick connectivity test
            response = requests.get(f"{base_url}/", timeout=2)
            if response.status_code == 200:
                print(f"✅ Found backend at {base_url}")
                tester = FixedBackendTester(base_url)
                tester.run_comprehensive_test()
                return
        except:
            continue
    
    print("\n❌ No backend found!")
    print("Please start your backend:")
    print("  cd backend")
    print("  python main.py")
    print("  # or")
    print("  uvicorn main:app --reload --port 8000")

if __name__ == "__main__":
    main()
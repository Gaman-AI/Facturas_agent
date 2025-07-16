#!/usr/bin/env python3
"""
Accurate Backend Test - Based on actual backend API structure
"""

import requests
import json
import time
import asyncio
import websockets
from datetime import datetime

class AccurateBackendTester:
    def __init__(self, base_url: str = "http://localhost:8000"):
        self.base_url = base_url
        self.session = requests.Session()
        self.task_id = None
        
    def test_root_endpoint(self):
        """Test the root endpoint"""
        try:
            response = self.session.get(f"{self.base_url}/")
            print(f"Root endpoint: {response.status_code}")
            if response.status_code == 200:
                data = response.json()
                print(f"✅ Root response: {json.dumps(data, indent=2)}")
                return True
            return False
        except Exception as e:
            print(f"❌ Root endpoint failed: {e}")
            return False
    
    def test_health_endpoint(self):
        """Test the health endpoint"""
        try:
            response = self.session.get(f"{self.base_url}/api/v1/health")
            print(f"Health endpoint: {response.status_code}")
            if response.status_code == 200:
                data = response.json()
                print(f"✅ Health response: {json.dumps(data, indent=2)}")
                return True
            return False
        except Exception as e:
            print(f"❌ Health endpoint failed: {e}")
            return False
    
    def test_create_task(self):
        """Test creating a task via the tasks endpoint"""
        # Based on the backend structure, try the tasks endpoint
        task_data = {
            "prompt": "Search for OpenAI in Google",
            "description": "Navigate to Google and search for OpenAI company"
        }
        
        try:
            print(f"\n🚀 Creating task: {json.dumps(task_data, indent=2)}")
            response = self.session.post(
                f"{self.base_url}/api/v1/tasks",
                json=task_data,
                headers={"Content-Type": "application/json"}
            )
            
            print(f"Create task response: {response.status_code}")
            print(f"Response body: {response.text}")
            
            if response.status_code in [200, 201, 202]:
                try:
                    result = response.json()
                    print(f"✅ Task created: {json.dumps(result, indent=2)}")
                    
                    # Try to extract task_id
                    if "task_id" in result:
                        self.task_id = result["task_id"]
                    elif "id" in result:
                        self.task_id = result["id"]
                    
                    return True
                except json.JSONDecodeError:
                    print("✅ Task created (non-JSON response)")
                    return True
            else:
                print(f"❌ Task creation failed: {response.text}")
                return False
                
        except Exception as e:
            print(f"❌ Task creation error: {e}")
            return False
    
    def test_browser_agent_realtime(self):
        """Test the browser agent realtime endpoint"""
        task_data = {
            "prompt": "Search for OpenAI in Google",
            "session_id": f"test_session_{int(time.time())}"
        }
        
        try:
            print(f"\n🤖 Testing browser agent realtime: {json.dumps(task_data, indent=2)}")
            response = self.session.post(
                f"{self.base_url}/api/v1/browser-agent-realtime",
                json=task_data,
                headers={"Content-Type": "application/json"}
            )
            
            print(f"Browser agent response: {response.status_code}")
            print(f"Response body: {response.text}")
            
            if response.status_code in [200, 201, 202]:
                try:
                    result = response.json()
                    print(f"✅ Browser agent task started: {json.dumps(result, indent=2)}")
                    return True
                except json.JSONDecodeError:
                    print("✅ Browser agent task started (non-JSON response)")
                    return True
            else:
                print(f"❌ Browser agent failed: {response.text}")
                return False
                
        except Exception as e:
            print(f"❌ Browser agent error: {e}")
            return False
    
    def test_agent_endpoint(self):
        """Test the agent endpoint"""
        task_data = {
            "task": "Search for OpenAI in Google",
            "prompt": "Search for OpenAI in Google"
        }
        
        try:
            print(f"\n🎯 Testing agent endpoint: {json.dumps(task_data, indent=2)}")
            response = self.session.post(
                f"{self.base_url}/api/v1/agent",
                json=task_data,
                headers={"Content-Type": "application/json"}
            )
            
            print(f"Agent endpoint response: {response.status_code}")
            print(f"Response body: {response.text}")
            
            if response.status_code in [200, 201, 202]:
                try:
                    result = response.json()
                    print(f"✅ Agent task started: {json.dumps(result, indent=2)}")
                    return True
                except json.JSONDecodeError:
                    print("✅ Agent task started (non-JSON response)")
                    return True
            else:
                print(f"❌ Agent endpoint failed: {response.text}")
                return False
                
        except Exception as e:
            print(f"❌ Agent endpoint error: {e}")
            return False
    
    async def test_websocket(self):
        """Test WebSocket connection"""
        if not self.task_id:
            # Use a dummy task_id for testing
            self.task_id = f"test_task_{int(time.time())}"
        
        ws_url = f"ws://localhost:8000/ws/{self.task_id}"
        print(f"\n🔌 Testing WebSocket: {ws_url}")
        
        try:
            async with websockets.connect(ws_url, timeout=5) as websocket:
                print("✅ WebSocket connected successfully")
                
                # Send a test message
                await websocket.send("test message")
                print("📤 Sent test message")
                
                # Try to receive a message (with timeout)
                try:
                    message = await asyncio.wait_for(websocket.recv(), timeout=3.0)
                    print(f"📨 Received: {message}")
                except asyncio.TimeoutError:
                    print("⚠️ No response received (this is normal)")
                
                return True
                
        except Exception as e:
            print(f"❌ WebSocket failed: {e}")
            return False
    
    def run_comprehensive_test(self):
        """Run all tests"""
        print("=" * 60)
        print("🧪 COMPREHENSIVE BACKEND TEST")
        print("=" * 60)
        
        # Test 1: Root endpoint
        print("\n1️⃣ Testing Root Endpoint...")
        self.test_root_endpoint()
        
        # Test 2: Health endpoint
        print("\n2️⃣ Testing Health Endpoint...")
        self.test_health_endpoint()
        
        # Test 3: Tasks endpoint
        print("\n3️⃣ Testing Tasks Endpoint...")
        self.test_create_task()
        
        # Test 4: Browser Agent Realtime
        print("\n4️⃣ Testing Browser Agent Realtime...")
        self.test_browser_agent_realtime()
        
        # Test 5: Agent endpoint
        print("\n5️⃣ Testing Agent Endpoint...")
        self.test_agent_endpoint()
        
        # Test 6: WebSocket
        print("\n6️⃣ Testing WebSocket...")
        try:
            asyncio.run(self.test_websocket())
        except Exception as e:
            print(f"❌ WebSocket test failed: {e}")
        
        print("\n" + "=" * 60)
        print("✅ COMPREHENSIVE TEST COMPLETED")
        print("=" * 60)

def main():
    """Main function"""
    # Test different ports
    ports = [8000, 8001, 5000, 3000]
    
    for port in ports:
        base_url = f"http://localhost:{port}"
        print(f"\n🔍 Testing backend at {base_url}...")
        
        try:
            # Quick connectivity test
            response = requests.get(f"{base_url}/", timeout=2)
            if response.status_code == 200:
                print(f"✅ Found backend at {base_url}")
                tester = AccurateBackendTester(base_url)
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
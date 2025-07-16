#!/usr/bin/env python3
"""
Backend API Test Script
Tests the backend service by sending a task request and monitoring the response.
"""

import requests
import json
import time
import asyncio
import websockets
import threading
from datetime import datetime
from typing import Optional

class BackendTester:
    def __init__(self, base_url: str = "http://localhost:8000"):
        self.base_url = base_url
        self.session = requests.Session()
        self.task_id: Optional[str] = None
        
    def test_health_check(self) -> bool:
        """Test if the backend is running"""
        try:
            response = self.session.get(f"{self.base_url}/health")
            print(f"Health check: {response.status_code}")
            if response.status_code == 200:
                print(f"Response: {response.json()}")
                return True
            return False
        except requests.exceptions.ConnectionError:
            print("❌ Backend is not running or not accessible")
            return False
        except Exception as e:
            print(f"❌ Health check failed: {e}")
            return False

    def test_create_task(self) -> bool:
        """Test creating a new task"""
        task_data = {
            "prompt": "Search for OpenAI in Google",
            "description": "Navigate to Google and search for OpenAI",
            "task_type": "web_search",
            "priority": "normal"
        }
        
        try:
            print(f"\n🚀 Creating task with data: {json.dumps(task_data, indent=2)}")
            response = self.session.post(
                f"{self.base_url}/api/v1/tasks",
                json=task_data,
                headers={"Content-Type": "application/json"}
            )
            
            print(f"Create task response: {response.status_code}")
            
            if response.status_code in [200, 201]:
                result = response.json()
                print(f"✅ Task created successfully: {json.dumps(result, indent=2)}")
                
                # Extract task_id from response
                if "task_id" in result:
                    self.task_id = result["task_id"]
                elif "id" in result:
                    self.task_id = result["id"]
                else:
                    print("⚠️ No task_id found in response")
                    
                return True
            else:
                print(f"❌ Failed to create task: {response.text}")
                return False
                
        except Exception as e:
            print(f"❌ Task creation failed: {e}")
            return False

    def test_get_task_status(self) -> bool:
        """Test getting task status"""
        if not self.task_id:
            print("❌ No task_id available for status check")
            return False
            
        try:
            response = self.session.get(f"{self.base_url}/api/v1/tasks/{self.task_id}")
            print(f"Task status response: {response.status_code}")
            
            if response.status_code == 200:
                result = response.json()
                print(f"✅ Task status: {json.dumps(result, indent=2)}")
                return True
            else:
                print(f"❌ Failed to get task status: {response.text}")
                return False
                
        except Exception as e:
            print(f"❌ Task status check failed: {e}")
            return False

    async def test_websocket_connection(self) -> bool:
        """Test WebSocket connection for real-time updates"""
        if not self.task_id:
            print("❌ No task_id available for WebSocket test")
            return False
            
        ws_url = f"ws://localhost:8000/ws/{self.task_id}"
        print(f"\n🔌 Testing WebSocket connection: {ws_url}")
        
        try:
            async with websockets.connect(ws_url) as websocket:
                print("✅ WebSocket connected successfully")
                
                # Listen for messages for 10 seconds
                try:
                    message = await asyncio.wait_for(websocket.recv(), timeout=10.0)
                    print(f"📨 Received WebSocket message: {message}")
                    return True
                except asyncio.TimeoutError:
                    print("⚠️ No WebSocket messages received within 10 seconds")
                    return True  # Connection worked, just no messages
                    
        except Exception as e:
            print(f"❌ WebSocket connection failed: {e}")
            return False

    def test_alternative_endpoints(self):
        """Test alternative endpoint patterns"""
        endpoints_to_try = [
            "/",
            "/docs",
            "/api/v1/health",
            "/api/health",
            "/status",
            "/api/v1/tasks",
        ]
        
        print(f"\n🔍 Testing alternative endpoints:")
        for endpoint in endpoints_to_try:
            try:
                response = self.session.get(f"{self.base_url}{endpoint}")
                print(f"  {endpoint}: {response.status_code}")
                if response.status_code == 200:
                    try:
                        data = response.json()
                        print(f"    Response: {json.dumps(data, indent=4)[:200]}...")
                    except:
                        print(f"    Response: {response.text[:100]}...")
            except Exception as e:
                print(f"  {endpoint}: Error - {e}")

    def run_all_tests(self):
        """Run all tests in sequence"""
        print("=" * 60)
        print("🧪 BACKEND API TEST SUITE")
        print("=" * 60)
        
        # Test 1: Health Check
        print("\n1️⃣ Testing Backend Health...")
        if not self.test_health_check():
            print("❌ Backend health check failed. Trying alternative endpoints...")
            self.test_alternative_endpoints()
            return
        
        # Test 2: Create Task
        print("\n2️⃣ Testing Task Creation...")
        if not self.test_create_task():
            print("❌ Task creation failed")
            return
            
        # Test 3: Get Task Status
        print("\n3️⃣ Testing Task Status...")
        self.test_get_task_status()
        
        # Test 4: WebSocket Connection
        print("\n4️⃣ Testing WebSocket Connection...")
        try:
            asyncio.run(self.test_websocket_connection())
        except Exception as e:
            print(f"❌ WebSocket test failed: {e}")
        
        print("\n" + "=" * 60)
        print("✅ TEST SUITE COMPLETED")
        print("=" * 60)

def main():
    """Main function to run the tests"""
    # Test different possible backend URLs
    possible_urls = [
        "http://localhost:8000",
        "http://localhost:8001", 
        "http://127.0.0.1:8000",
        "http://127.0.0.1:8001"
    ]
    
    print("🔍 Searching for running backend...")
    
    for url in possible_urls:
        print(f"\nTrying {url}...")
        tester = BackendTester(url)
        
        try:
            response = requests.get(f"{url}/health", timeout=2)
            if response.status_code == 200:
                print(f"✅ Found backend at {url}")
                tester.run_all_tests()
                return
        except:
            try:
                response = requests.get(f"{url}/", timeout=2)
                if response.status_code == 200:
                    print(f"✅ Found backend at {url}")
                    tester.run_all_tests()
                    return
            except:
                continue
    
    print("\n❌ No backend found at any of the tested URLs")
    print("Please make sure your backend is running on one of these ports:")
    for url in possible_urls:
        print(f"  - {url}")
    
    print("\nTo start your backend, try:")
    print("  cd backend")
    print("  python main.py")
    print("  # or")
    print("  uvicorn main:app --reload --port 8000")

if __name__ == "__main__":
    main()
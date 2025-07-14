#!/usr/bin/env python3
"""
Comprehensive Connection Test Script for Browser Agent Backend
Tests all API endpoints, WebSocket connections, and service health
"""

import asyncio
import json
import time
import requests
import websockets
from typing import Dict, Any, Optional
from datetime import datetime
import sys
import os

# Add the src directory to the path
sys.path.append(os.path.join(os.path.dirname(__file__), 'src'))

from src.core.config import settings

class ConnectionTester:
    def __init__(self, base_url: str = "http://localhost:8000"):
        self.base_url = base_url
        self.api_url = f"{base_url}/api/v1"
        self.ws_url = f"ws://localhost:8000"
        self.results = []
        
    def log_result(self, test_name: str, success: bool, message: str = "", details: Any = None):
        """Log test result"""
        result = {
            "test": test_name,
            "success": success,
            "message": message,
            "details": details,
            "timestamp": datetime.now().isoformat()
        }
        self.results.append(result)
        
        status = "✅ PASS" if success else "❌ FAIL"
        print(f"{status} {test_name}: {message}")
        
        if details and not success:
            print(f"    Details: {details}")
    
    def test_basic_connection(self):
        """Test basic connection to backend"""
        try:
            response = requests.get(f"{self.base_url}/", timeout=5)
            success = response.status_code == 200
            message = f"Status: {response.status_code}"
            details = response.json() if success else response.text
            self.log_result("Basic Connection", success, message, details)
            return success
        except Exception as e:
            self.log_result("Basic Connection", False, str(e))
            return False
    
    def test_health_endpoints(self):
        """Test health check endpoints"""
        endpoints = [
            "/health",
            "/api/v1/health"
        ]
        
        all_passed = True
        for endpoint in endpoints:
            try:
                response = requests.get(f"{self.base_url}{endpoint}", timeout=5)
                success = response.status_code == 200
                message = f"Status: {response.status_code}"
                details = response.json() if success else response.text
                self.log_result(f"Health Check {endpoint}", success, message, details)
                if not success:
                    all_passed = False
            except Exception as e:
                self.log_result(f"Health Check {endpoint}", False, str(e))
                all_passed = False
        
        return all_passed
    
    def test_cors_headers(self):
        """Test CORS configuration"""
        try:
            headers = {
                'Origin': 'http://localhost:3000',
                'Access-Control-Request-Method': 'POST',
                'Access-Control-Request-Headers': 'Content-Type'
            }
            response = requests.options(f"{self.api_url}/health", headers=headers, timeout=5)
            
            cors_headers = {
                'Access-Control-Allow-Origin': response.headers.get('Access-Control-Allow-Origin'),
                'Access-Control-Allow-Methods': response.headers.get('Access-Control-Allow-Methods'),
                'Access-Control-Allow-Headers': response.headers.get('Access-Control-Allow-Headers'),
            }
            
            success = response.status_code == 200 and cors_headers['Access-Control-Allow-Origin'] is not None
            message = f"Status: {response.status_code}"
            self.log_result("CORS Configuration", success, message, cors_headers)
            return success
        except Exception as e:
            self.log_result("CORS Configuration", False, str(e))
            return False
    
    def test_api_endpoints(self):
        """Test main API endpoints"""
        endpoints = [
            ("GET", "/api/v1/health", {}),
            ("GET", "/api/v1/tasks", {}),
            ("GET", "/api/v1/browser-agent/viewer", {}),
        ]
        
        all_passed = True
        for method, endpoint, data in endpoints:
            try:
                if method == "GET":
                    response = requests.get(f"{self.base_url}{endpoint}", timeout=5)
                elif method == "POST":
                    response = requests.post(f"{self.base_url}{endpoint}", json=data, timeout=5)
                
                success = response.status_code in [200, 201]
                message = f"Status: {response.status_code}"
                details = response.text[:200] if not success else "OK"
                self.log_result(f"API {method} {endpoint}", success, message, details)
                if not success:
                    all_passed = False
            except Exception as e:
                self.log_result(f"API {method} {endpoint}", False, str(e))
                all_passed = False
        
        return all_passed
    
    async def test_websocket_legacy(self):
        """Test legacy WebSocket endpoint"""
        try:
            task_id = "test-task-123"
            uri = f"{self.ws_url}/ws/{task_id}"
            
            async with websockets.connect(uri, timeout=5) as websocket:
                # Send a test message
                await websocket.send(json.dumps({"type": "test", "message": "Hello"}))
                
                # Try to receive a message (with timeout)
                try:
                    response = await asyncio.wait_for(websocket.recv(), timeout=2)
                    self.log_result("WebSocket Legacy", True, "Connected and responsive", {"uri": uri})
                    return True
                except asyncio.TimeoutError:
                    self.log_result("WebSocket Legacy", True, "Connected (no immediate response)", {"uri": uri})
                    return True
                    
        except Exception as e:
            self.log_result("WebSocket Legacy", False, str(e), {"uri": uri})
            return False
    
    async def test_websocket_browser_agent(self):
        """Test browser agent WebSocket endpoint"""
        try:
            session_id = "test-session-123"
            uri = f"{self.ws_url}/api/v1/browser-agent/ws/{session_id}"
            
            async with websockets.connect(uri, timeout=5) as websocket:
                # Send a ping
                await websocket.send(json.dumps({"type": "ping"}))
                
                # Try to receive a message (with timeout)
                try:
                    response = await asyncio.wait_for(websocket.recv(), timeout=2)
                    response_data = json.loads(response)
                    success = response_data.get("type") == "connection"
                    message = "Connected and received confirmation"
                    self.log_result("WebSocket Browser Agent", success, message, {"uri": uri, "response": response_data})
                    return success
                except asyncio.TimeoutError:
                    self.log_result("WebSocket Browser Agent", True, "Connected (no immediate response)", {"uri": uri})
                    return True
                    
        except Exception as e:
            self.log_result("WebSocket Browser Agent", False, str(e), {"uri": uri})
            return False
    
    def test_browser_agent_endpoints(self):
        """Test browser agent specific endpoints"""
        endpoints = [
            ("GET", "/api/v1/browser-agent/viewer"),
            ("GET", "/api/v1/browser-agent/logs/test-session"),
        ]
        
        all_passed = True
        for method, endpoint in endpoints:
            try:
                if method == "GET":
                    response = requests.get(f"{self.base_url}{endpoint}", timeout=5)
                
                # For browser agent endpoints, we expect 200 or 404 (if session doesn't exist)
                success = response.status_code in [200, 404]
                message = f"Status: {response.status_code}"
                details = response.text[:200] if response.status_code >= 400 else "OK"
                self.log_result(f"Browser Agent {method} {endpoint}", success, message, details)
                if not success:
                    all_passed = False
            except Exception as e:
                self.log_result(f"Browser Agent {method} {endpoint}", False, str(e))
                all_passed = False
        
        return all_passed
    
    def test_environment_config(self):
        """Test environment configuration"""
        config_tests = [
            ("HOST", settings.HOST),
            ("PORT", settings.PORT),
            ("CORS_ORIGINS", settings.cors_origins),
            ("LOG_LEVEL", settings.LOG_LEVEL),
            ("DATABASE_URL", settings.DATABASE_URL),
        ]
        
        all_passed = True
        for name, value in config_tests:
            success = value is not None and value != ""
            message = f"Value: {value}"
            self.log_result(f"Config {name}", success, message)
            if not success:
                all_passed = False
        
        return all_passed
    
    async def run_all_tests(self):
        """Run all connection tests"""
        print("🧪 Starting comprehensive connection tests...")
        print("=" * 50)
        
        # Test environment configuration
        self.test_environment_config()
        
        # Test basic connection
        basic_connection = self.test_basic_connection()
        if not basic_connection:
            print("❌ Basic connection failed. Is the backend running?")
            return False
        
        # Test health endpoints
        self.test_health_endpoints()
        
        # Test CORS
        self.test_cors_headers()
        
        # Test API endpoints
        self.test_api_endpoints()
        
        # Test browser agent endpoints
        self.test_browser_agent_endpoints()
        
        # Test WebSocket endpoints
        await self.test_websocket_legacy()
        await self.test_websocket_browser_agent()
        
        # Summary
        print("\n" + "=" * 50)
        print("📊 TEST SUMMARY")
        print("=" * 50)
        
        passed = sum(1 for r in self.results if r["success"])
        total = len(self.results)
        
        print(f"Total tests: {total}")
        print(f"Passed: {passed}")
        print(f"Failed: {total - passed}")
        print(f"Success rate: {passed/total*100:.1f}%")
        
        if passed == total:
            print("\n🎉 All tests passed! Backend is ready.")
            return True
        else:
            print(f"\n⚠️  {total - passed} tests failed. Check the issues above.")
            return False
    
    def save_results(self, filename: str = "connection_test_results.json"):
        """Save test results to file"""
        with open(filename, 'w') as f:
            json.dump(self.results, f, indent=2)
        print(f"📝 Test results saved to {filename}")


async def main():
    """Main test runner"""
    if len(sys.argv) > 1:
        base_url = sys.argv[1]
    else:
        base_url = "http://localhost:8000"
    
    print(f"🔗 Testing connection to: {base_url}")
    
    tester = ConnectionTester(base_url)
    success = await tester.run_all_tests()
    
    # Save results
    tester.save_results()
    
    # Exit with appropriate code
    sys.exit(0 if success else 1)


if __name__ == "__main__":
    asyncio.run(main()) 
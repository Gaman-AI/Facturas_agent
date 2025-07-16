#!/usr/bin/env python3
"""
Simple Backend Test - Quick test for OpenAI search task
"""

import requests
import json
import time

def test_backend():
    """Simple test to send a search task to the backend"""
    
    # Try different backend URLs
    urls = ["http://localhost:8000", "http://localhost:8001"]
    
    for base_url in urls:
        print(f"Testing backend at: {base_url}")
        
        try:
            # Test if backend is running
            health_response = requests.get(f"{base_url}/health", timeout=5)
            print(f"Health check: {health_response.status_code}")
        except:
            try:
                # Try root endpoint
                root_response = requests.get(f"{base_url}/", timeout=5)
                print(f"Root endpoint: {root_response.status_code}")
            except:
                print(f"❌ Backend not accessible at {base_url}")
                continue
        
        # Task data - trying different possible formats
        task_formats = [
            # Format 1: Simple prompt
            {
                "prompt": "Search for OpenAI in Google"
            },
            # Format 2: Detailed task
            {
                "prompt": "Search for OpenAI in Google",
                "task_type": "browser_automation",
                "description": "Navigate to Google and search for OpenAI"
            },
            # Format 3: Browser task request format
            {
                "task": "Search for OpenAI in Google",
                "url": "https://google.com",
                "instructions": "Go to Google and search for OpenAI"
            }
        ]
        
        # Try different endpoints
        endpoints = [
            "/api/v1/tasks",
            "/tasks", 
            "/api/tasks",
            "/execute",
            "/browser/execute"
        ]
        
        for endpoint in endpoints:
            for i, task_data in enumerate(task_formats):
                try:
                    print(f"\n🚀 Testing {base_url}{endpoint} with format {i+1}")
                    print(f"Data: {json.dumps(task_data, indent=2)}")
                    
                    response = requests.post(
                        f"{base_url}{endpoint}",
                        json=task_data,
                        headers={"Content-Type": "application/json"},
                        timeout=10
                    )
                    
                    print(f"Response: {response.status_code}")
                    
                    if response.status_code in [200, 201, 202]:
                        print(f"✅ SUCCESS! Response: {response.text}")
                        return True
                    else:
                        print(f"Response body: {response.text}")
                        
                except Exception as e:
                    print(f"❌ Error: {e}")
        
        print(f"\n❌ No working endpoints found for {base_url}")
    
    return False

if __name__ == "__main__":
    print("=" * 50)
    print("🧪 SIMPLE BACKEND TEST")
    print("=" * 50)
    
    if not test_backend():
        print("\n❌ Backend test failed!")
        print("\nTroubleshooting:")
        print("1. Make sure your backend is running:")
        print("   cd backend")
        print("   python main.py")
        print("2. Check if it's running on a different port")
        print("3. Check the backend logs for errors")
    else:
        print("\n✅ Backend is working!")
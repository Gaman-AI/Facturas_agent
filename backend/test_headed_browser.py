#!/usr/bin/env python3
"""
Test script to demonstrate headed browser automation
This will show visible browser actions in real-time
"""

import requests
import json
import time
import sys

def test_headed_browser():
    """Test the headed browser with visible automation"""
    print("🎬 Headed Browser Automation Demo")
    print("=" * 50)
    
    # Test with a more interactive task
    task_data = {
        "prompt": "Go to https://www.google.com, search for 'browser automation', click on the first result, and take a screenshot"
    }
    
    try:
        # Test backend health
        print("🏥 Testing backend health...")
        health_response = requests.get("http://localhost:8000/health", timeout=5)
        print(f"✅ Backend: {health_response.status_code} - {health_response.json()}")
        
        # Create task
        print(f"\n🎯 Creating headed browser task...")
        print(f"📋 Task: {task_data['prompt']}")
        print(f"\n🔍 Watch for:")
        print("  • Browser window opening (Chrome/Chromium)")
        print("  • Navigation to Google")
        print("  • Search input typing")
        print("  • Click on first result")
        print("  • Slow motion actions (1 second delay)")
        
        response = requests.post(
            "http://localhost:8000/api/v1/tasks",
            json=task_data,
            headers={"Content-Type": "application/json"},
            timeout=10
        )
        
        if response.status_code == 200:
            task_result = response.json()
            task_id = task_result.get("id")
            print(f"\n✅ Task created: {task_id}")
            print(f"📊 Status: {task_result.get('status')}")
            
            print(f"\n⏳ Browser should be opening now...")
            print("🎬 Watch the browser window for live automation!")
            
            # Monitor task progress
            for i in range(30):  # Check for 30 seconds
                time.sleep(2)
                try:
                    status_response = requests.get(f"http://localhost:8000/api/v1/tasks/{task_id}")
                    if status_response.status_code == 200:
                        status_data = status_response.json()
                        current_status = status_data.get('status')
                        print(f"📈 [{i*2}s] Status: {current_status}")
                        
                        if current_status == 'completed':
                            print("🎉 Task completed!")
                            if status_data.get('result'):
                                print(f"📄 Result: {status_data.get('result')}")
                            break
                        elif current_status == 'failed':
                            print("❌ Task failed!")
                            if status_data.get('result'):
                                print(f"📄 Error: {status_data.get('result')}")
                            break
                except Exception as e:
                    print(f"⚠️ Status check error: {e}")
            
            print("\n🎬 Demo completed!")
            
        else:
            print(f"❌ Failed to create task: {response.status_code}")
            print(f"Response: {response.text}")
            
    except requests.exceptions.ConnectionError:
        print("❌ Cannot connect to backend!")
        print("Make sure backend is running: python main.py")
        
    except Exception as e:
        print(f"❌ Error: {e}")

if __name__ == "__main__":
    test_headed_browser() 
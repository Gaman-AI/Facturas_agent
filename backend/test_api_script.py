#!/usr/bin/env python3
"""
Test script for the Simple Browser Agent API
"""

import requests
import time
import json

BASE_URL = "http://localhost:8000"

def test_health():
    """Test health endpoint"""
    print("🏥 Testing health endpoint...")
    try:
        response = requests.get(f"{BASE_URL}/health")
        print(f"Status: {response.status_code}")
        print(f"Response: {response.json()}")
        return response.status_code == 200
    except Exception as e:
        print(f"❌ Health check failed: {e}")
        return False

def create_task(task_description, url=None, headless=True):
    """Create a browser automation task"""
    print(f"📋 Creating task: {task_description}")
    
    payload = {
        "task": task_description,
        "headless": headless
    }
    
    if url:
        payload["url"] = url
    
    try:
        response = requests.post(
            f"{BASE_URL}/task",
            json=payload,
            headers={"Content-Type": "application/json"}
        )
        
        if response.status_code in [200, 201]:
            data = response.json()
            print(f"✅ Task created: {data['task_id']}")
            return data["task_id"]
        else:
            print(f"❌ Failed to create task: {response.status_code}")
            print(f"Response: {response.text}")
            return None
            
    except Exception as e:
        print(f"❌ Error creating task: {e}")
        return None

def get_task_status(task_id):
    """Get task status"""
    try:
        response = requests.get(f"{BASE_URL}/task/{task_id}")
        if response.status_code == 200:
            return response.json()
        else:
            print(f"❌ Error getting task status: {response.status_code}")
            return None
    except Exception as e:
        print(f"❌ Error getting task status: {e}")
        return None

def monitor_task(task_id, timeout=60):
    """Monitor task until completion"""
    print(f"👀 Monitoring task {task_id}...")
    
    start_time = time.time()
    while time.time() - start_time < timeout:
        status_data = get_task_status(task_id)
        if status_data:
            status = status_data["status"]
            print(f"📊 Status: {status}")
            
            if status in ["completed", "failed"]:
                print(f"🏁 Task finished!")
                if status_data.get("result"):
                    print(f"✅ Result: {status_data['result']}")
                if status_data.get("error"):
                    print(f"❌ Error: {status_data['error']}")
                return status_data
        
        time.sleep(3)
    
    print("⏰ Monitoring timeout")
    return None

def run_test_examples():
    """Run some test examples"""
    
    print("🧪 Running test examples...")
    print("=" * 50)
    
    # Test 1: Simple page title extraction
    print("\n🌐 Test 1: Get page title from example.com")
    task_id = create_task(
        task_description="Get the page title and main heading",
        url="https://example.com",
        headless=True
    )
    
    if task_id:
        result = monitor_task(task_id, timeout=30)
        print(f"Result: {result}")
    
    print("\n" + "="*50)
    
    # Test 2: Google search
    print("\n🔍 Test 2: Google search")
    task_id = create_task(
        task_description="Search for 'OpenAI GPT' and get the first 3 results",
        url="https://google.com",
        headless=True
    )
    
    if task_id:
        result = monitor_task(task_id, timeout=45)
        print(f"Result: {result}")
    
    print("\n" + "="*50)
    
    # Test 3: GitHub trending
    print("\n📈 Test 3: GitHub trending")
    task_id = create_task(
        task_description="Get the top 5 trending repositories this week",
        url="https://github.com/trending",
        headless=True
    )
    
    if task_id:
        result = monitor_task(task_id, timeout=45)
        print(f"Result: {result}")

def interactive_mode():
    """Interactive mode for creating custom tasks"""
    print("\n🎮 Interactive Mode")
    print("Enter your browser automation tasks. Type 'quit' to exit.")
    
    while True:
        print("\n" + "-"*30)
        task = input("📋 Enter task description: ").strip()
        
        if task.lower() in ['quit', 'exit', 'q']:
            break
        
        if not task:
            continue
            
        url = input("🌐 Enter URL (optional): ").strip()
        if not url:
            url = None
            
        headless_input = input("👻 Headless mode? (y/n, default=y): ").strip().lower()
        headless = headless_input != 'n'
        
        # Create and monitor task
        task_id = create_task(task, url, headless)
        if task_id:
            monitor_task(task_id, timeout=60)

def main():
    """Main function"""
    print("🤖 Simple Browser Agent - Test Client")
    print("=" * 50)
    
    # Check if server is running
    if not test_health():
        print("❌ Server is not running. Please start the server first:")
        print("   python main.py")
        return
    
    print("\nChoose an option:")
    print("1. Run test examples")
    print("2. Interactive mode")
    print("3. Just health check")
    
    choice = input("\nEnter choice (1-3): ").strip()
    
    if choice == "1":
        run_test_examples()
    elif choice == "2":
        interactive_mode()
    elif choice == "3":
        print("Health check completed!")
    else:
        print("Invalid choice")

if __name__ == "__main__":
    main()
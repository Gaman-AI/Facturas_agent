import requests
import json
import time

def test_agent_endpoints():
    base_url = "http://localhost:8000/api/v1"
    
    # Wait for server to start
    print("Waiting for server to start...")
    time.sleep(10)
    
    # Test health endpoint
    print("Testing health endpoint...")
    try:
        response = requests.get(f"{base_url}/health")
        print(f"Health check: {response.status_code} - {response.json()}")
    except Exception as e:
        print(f"Health check failed: {e}")
    
    # Test agent status endpoint
    print("Testing agent status endpoint...")
    try:
        response = requests.get(f"{base_url}/agent/status")
        print(f"Agent status: {response.status_code} - {response.json()}")
    except Exception as e:
        print(f"Agent status failed: {e}")
    
    # Test agent start endpoint
    print("Testing agent start endpoint...")
    config = {
        "objective": "Go to google.com and search for 'hello world'",
        "llm_provider": "openai",
        "llm_model": "gpt-4o",
        "headless": False,
        "use_vision": True,
        "max_steps": 10
    }
    
    try:
        response = requests.post(f"{base_url}/agent/start", json=config)
        print(f"Agent start: {response.status_code} - {response.json()}")
    except Exception as e:
        print(f"Agent start failed: {e}")
    
    # Wait a bit and check status again
    time.sleep(3)
    try:
        response = requests.get(f"{base_url}/agent/status")
        print(f"Agent status after start: {response.status_code} - {response.json()}")
    except Exception as e:
        print(f"Agent status after start failed: {e}")

if __name__ == "__main__":
    test_agent_endpoints() 
"""
Test script to verify API endpoints are working correctly
"""
import requests
import json

def test_api_endpoints():
    """Test all API endpoints"""
    
    base_url = "http://localhost:8000"
    
    print("🔍 Testing API Endpoints")
    print("=" * 50)
    
    # Test 1: Root endpoint
    try:
        response = requests.get(f"{base_url}/")
        print(f"✅ Root endpoint: {response.status_code} - {response.json()}")
    except Exception as e:
        print(f"❌ Root endpoint failed: {e}")
    
    # Test 2: Health endpoint
    try:
        response = requests.get(f"{base_url}/api/v1/health")
        print(f"✅ Health endpoint: {response.status_code} - {response.json()}")
    except Exception as e:
        print(f"❌ Health endpoint failed: {e}")
    
    # Test 3: Browser agent viewer endpoint
    try:
        response = requests.get(f"{base_url}/api/v1/browser-agent/viewer")
        print(f"✅ Browser agent viewer: {response.status_code} - Content length: {len(response.text)}")
    except Exception as e:
        print(f"❌ Browser agent viewer failed: {e}")
    
    # Test 4: API documentation
    try:
        response = requests.get(f"{base_url}/docs")
        print(f"✅ API docs: {response.status_code} - Available")
    except Exception as e:
        print(f"❌ API docs failed: {e}")
    
    print("\n🌐 Available Endpoints:")
    print("- Root: http://localhost:8000/")
    print("- Health: http://localhost:8000/api/v1/health")
    print("- Browser Agent Viewer: http://localhost:8000/api/v1/browser-agent/viewer")
    print("- API Documentation: http://localhost:8000/docs")
    print("- WebSocket: ws://localhost:8000/api/v1/browser-agent/ws/{session_id}")
    
    print("\n🔧 Frontend Configuration:")
    print("- API Base URL: http://localhost:8000/api/v1")
    print("- WebSocket URL: ws://localhost:8000/api/v1/browser-agent/ws/{session_id}")

if __name__ == "__main__":
    test_api_endpoints() 
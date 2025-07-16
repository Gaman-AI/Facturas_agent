import requests
import json
import time

def test_start_agent():
    url = "http://localhost:8000/api/v1/agent/start"
    config = {"objective": "Go to google.com and search for 'hello world'"}
    
    # Wait for the server to start
    time.sleep(5)
    
    try:
        response = requests.post(url, json=config)
        response.raise_for_status()  # Raise an exception for bad status codes
        print(response.json())
    except requests.exceptions.RequestException as e:
        print(f"An error occurred: {e}")

if __name__ == "__main__":
    test_start_agent() 
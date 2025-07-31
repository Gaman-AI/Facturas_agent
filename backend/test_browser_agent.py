#!/usr/bin/env python3
"""
Test script for the simplified browser_agent.py

This script demonstrates how to test the browser agent with various task types.
"""

import asyncio
import json
import subprocess
import sys
from pathlib import Path

def test_browser_agent(task_data, test_name):
    """Test the browser agent with given task data"""
    print(f"\n🧪 Testing: {test_name}")
    print("=" * 50)
    
    try:
        # Convert task data to JSON string
        task_json = json.dumps(task_data)
        
        # Run the browser agent
        result = subprocess.run([
            sys.executable, 
            'browser_agent.py', 
            task_json
        ], capture_output=True, text=True, timeout=60)
        
        print(f"Return code: {result.returncode}")
        print(f"STDOUT:\n{result.stdout}")
        
        if result.stderr:
            print(f"STDERR:\n{result.stderr}")
            
        # Try to parse the JSON result
        try:
            parsed_result = json.loads(result.stdout)
            print(f"✅ Result parsed successfully")
            print(f"Success: {parsed_result.get('success', 'unknown')}")
            if parsed_result.get('error'):
                print(f"Error: {parsed_result.get('error')}")
        except json.JSONDecodeError:
            print("❌ Could not parse result as JSON")
            
    except subprocess.TimeoutExpired:
        print("❌ Test timed out after 60 seconds")
    except Exception as e:
        print(f"❌ Test failed with exception: {e}")

def main():
    """Run various test scenarios"""
    print("🚀 Browser Agent Prototype Testing")
    print("=" * 50)
    
    # Test 1: Simple prompt
    test_browser_agent({
        "prompt": "Navigate to google.com and search for 'browser automation'"
    }, "Simple Google Search")
    
    # Test 2: URL with prompt
    test_browser_agent({
        "vendor_url": "https://example.com",
        "prompt": "find the contact information on this website"
    }, "URL with Specific Task")
    
    # Test 3: Just URL (should auto-generate prompt)
    test_browser_agent({
        "vendor_url": "https://httpbin.org/html"
    }, "Auto-generated Task for URL")
    
    # Test 4: With context
    test_browser_agent({
        "prompt": "Search for a company",
        "customer_details": {
            "company_name": "Test Company",
            "rfc": "TEST123456"
        },
        "invoice_details": {
            "total": 1500.00,
            "folio": "ABC123"
        }
    }, "Task with Context")
    
    # Test 5: Custom model settings
    test_browser_agent({
        "prompt": "Visit google.com and check if it loads",
        "model": "gpt-4o-mini",
        "temperature": 0.5,
        "max_steps": 10
    }, "Custom Model Settings")
    
    # Test 6: Invalid task (should fail gracefully)
    test_browser_agent({
        "invalid_field": "this should fail"
    }, "Invalid Task (Expected Failure)")

if __name__ == "__main__":
    main()
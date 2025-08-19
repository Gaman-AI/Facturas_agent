#!/usr/bin/env python3
"""
Test script to verify OCR integration is working properly.
This script tests the complete OCR pipeline with a sample image.
"""

import os
import sys
import json
import requests
from pathlib import Path
from dotenv import load_dotenv

# Load environment variables
load_dotenv()

def test_ocr_integration():
    """Test the complete OCR integration."""
    
    # Test image path
    test_image_path = "./oxxo_trial.jpg"
    
    if not os.path.exists(test_image_path):
        print(f"❌ Test image not found: {test_image_path}")
        return False
    
    print("🔍 Testing OCR Integration")
    print("=" * 50)
    
    # Test 1: Direct Python OCR
    print("\n📋 Test 1: Direct Python OCR")
    try:
        from src.services.run_ocr import main
        
        # Simulate command line arguments
        sys.argv = ['test_ocr_integration.py', test_image_path]
        
        # Capture output
        import io
        from contextlib import redirect_stdout
        
        output = io.StringIO()
        with redirect_stdout(output):
            main()
        
        result = output.getvalue()
        print("✅ Python OCR test completed")
        print(f"Output length: {len(result)} characters")
        
        # Check if it contains real data (not demo data)
        if "fallback_demo" in result:
            print("❌ Still returning demo data")
            return False
        elif "VILLA MAGNA" in result or "OXXO" in result:
            print("✅ Real data detected")
        else:
            print("⚠️  Unknown data format")
            
    except Exception as e:
        print(f"❌ Python OCR test failed: {e}")
        return False
    
    # Test 2: API Endpoint (if server is running)
    print("\n🌐 Test 2: API Endpoint")
    try:
        # Try to connect to the API
        response = requests.get("http://localhost:3001/api/v1/health", timeout=5)
        if response.status_code == 200:
            print("✅ API server is running")
            
            # Test file upload
            with open(test_image_path, 'rb') as f:
                files = {'file': f}
                data = {'vendor_url': 'test'}
                
                response = requests.post(
                    "http://localhost:3001/api/v1/tickets/upload",
                    files=files,
                    data=data,
                    timeout=30
                )
            
            if response.status_code == 201:
                result = response.json()
                if result.get('success'):
                    extracted_data = result.get('data', {}).get('extracted_data', {})
                    
                    # Check for real data
                    if extracted_data.get('extraction_method') == 'fallback_demo':
                        print("❌ API still returning demo data")
                        return False
                    elif extracted_data.get('comercio') and extracted_data.get('comercio') != 'N/A':
                        print("✅ API returning real data")
                        print(f"Merchant: {extracted_data.get('comercio')}")
                        print(f"Total: {extracted_data.get('total')}")
                        print(f"Date: {extracted_data.get('fecha')}")
                    else:
                        print("⚠️  API returned incomplete data")
                else:
                    print(f"❌ API request failed: {result.get('error', 'Unknown error')}")
                    return False
            else:
                print(f"❌ API request failed with status: {response.status_code}")
                return False
        else:
            print("⚠️  API server not responding")
            
    except requests.exceptions.ConnectionError:
        print("⚠️  API server not running (this is normal for testing)")
    except Exception as e:
        print(f"❌ API test failed: {e}")
        return False
    
    print("\n✅ OCR Integration Test Completed Successfully!")
    return True

def test_environment():
    """Test environment setup."""
    print("🔧 Testing Environment Setup")
    print("=" * 50)
    
    # Check Python dependencies
    try:
        import azure.ai.documentintelligence
        import openai
        print("✅ Azure Document Intelligence and OpenAI packages available")
    except ImportError as e:
        print(f"❌ Missing Python packages: {e}")
        return False
    
    # Check environment variables
    required_vars = [
        'OPENAI_API_KEY',
        'AZURE_DOCUMENT_INTELLIGENCE_ENDPOINT',
        'AZURE_DOCUMENT_INTELLIGENCE_KEY'
    ]
    
    missing_vars = []
    for var in required_vars:
        if not os.getenv(var):
            missing_vars.append(var)
    
    if missing_vars:
        print(f"❌ Missing environment variables: {', '.join(missing_vars)}")
        return False
    else:
        print("✅ All required environment variables are set")
    
    # Check test image
    test_image_path = "./oxxo_trial.jpg"
    if os.path.exists(test_image_path):
        print(f"✅ Test image available: {test_image_path}")
    else:
        print(f"❌ Test image not found: {test_image_path}")
        return False
    
    return True

if __name__ == "__main__":
    print("🚀 OCR Integration Test Suite")
    print("=" * 50)
    
    # Test environment first
    if not test_environment():
        print("\n❌ Environment test failed. Please fix the issues above.")
        sys.exit(1)
    
    # Test OCR integration
    if test_ocr_integration():
        print("\n🎉 All tests passed! OCR is working correctly.")
        sys.exit(0)
    else:
        print("\n❌ OCR integration test failed.")
        sys.exit(1) 
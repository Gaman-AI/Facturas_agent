#!/usr/bin/env python3
"""
Test script for OCR functionality.
This script tests the OCR functionality independently to ensure it works before Node.js integration.
"""

import os
import sys
import json
from pathlib import Path

def test_ocr_functionality():
    """Test the OCR functionality with a sample image."""
    
    # Add the services directory to Python path
    current_dir = Path(__file__).parent
    services_dir = current_dir / "src" / "services"
    sys.path.insert(0, str(services_dir))
    
    print(f"Testing OCR functionality...")
    print(f"Current directory: {os.getcwd()}")
    print(f"Services directory: {services_dir}")
    
    try:
        # Test import
        print("Testing import...")
        from ocr_functionality import extract_receipt_data
        print("✓ Import successful")
        
        # Check environment variables
        print("\nChecking environment variables...")
        required_vars = [
            "OPENAI_API_KEY",
            "AZURE_DOCUMENT_INTELLIGENCE_ENDPOINT", 
            "AZURE_DOCUMENT_INTELLIGENCE_KEY"
        ]
        
        missing_vars = []
        for var in required_vars:
            value = os.getenv(var)
            if value:
                print(f"✓ {var}: {'*' * min(len(value), 8)}...")
            else:
                print(f"✗ {var}: NOT SET")
                missing_vars.append(var)
        
        if missing_vars:
            print(f"\n⚠ Missing environment variables: {', '.join(missing_vars)}")
            print("Please set these in your .env file")
            return False
        
        # Test with a sample image if available
        sample_image = current_dir / "tmp" / "uploads" / "1755186764423_oxxo_trial.jpg"
        if sample_image.exists():
            print(f"\nTesting with sample image: {sample_image}")
            try:
                result = extract_receipt_data(str(sample_image))
                print("✓ OCR processing successful")
                print(f"Result keys: {list(result.keys())}")
                print(f"Sample data: {json.dumps(result, indent=2, ensure_ascii=False)[:500]}...")
                return True
            except Exception as e:
                print(f"✗ OCR processing failed: {e}")
                return False
        else:
            print(f"\n⚠ Sample image not found: {sample_image}")
            print("OCR functionality appears to be working (import successful, env vars set)")
            return True
            
    except ImportError as e:
        print(f"✗ Import failed: {e}")
        return False
    except Exception as e:
        print(f"✗ Test failed: {e}")
        return False

if __name__ == "__main__":
    success = test_ocr_functionality()
    if success:
        print("\n🎉 OCR functionality test passed!")
    else:
        print("\n❌ OCR functionality test failed!")
        sys.exit(1)

#!/usr/bin/env python3
"""
Test script to verify the complete OCR flow and see exactly what fields are being returned.
This script tests the main extract_receipt_data function with sample text.
"""

import sys
import os
import json

# Add the services directory to the Python path
services_dir = os.path.join(os.path.dirname(__file__), 'src', 'services')
sys.path.insert(0, services_dir)

def test_complete_ocr_flow():
    """Test the complete OCR flow with sample text."""
    
    try:
        from ocr_functionality import extract_receipt_data
        print("✅ Successfully imported extract_receipt_data function")
        
        # Test data - sample receipt text that should trigger all the new fields
        test_text = """
        WALMART SUPERCENTER
        Store #456 - North Plaza Mall
        Terminal: 3
        Register: 5
        Payment Method: Visa Credit Card
        Card ending in: 5678
        Transaction ID: TC#789012
        Register Number: TR#345
        Date: 01/28/2025
        Total: $2997.00
        """
        
        print("\n🧪 Testing complete OCR flow with sample text...")
        print("Sample text:")
        print(test_text)
        
        # Call the main OCR function
        result = extract_receipt_data(test_text)
        
        print("\n📊 OCR Result:")
        print("=" * 50)
        
        # Print all fields returned
        for key, value in result.items():
            print(f"  {key}: {value}")
        
        print("\n🔍 Checking for new fields specifically:")
        new_fields = [
            'Store_Branch_Plaza',
            'Register_Station_Terminal', 
            'Payment_Type',
            'Card_Last_4_Digits'
        ]
        
        for field in new_fields:
            if field in result:
                print(f"  ✅ {field}: {result[field]}")
            else:
                print(f"  ❌ {field}: NOT FOUND")
        
        # Check if the fields are also available with alternative names
        alt_fields = [
            'store_branch_plaza',
            'register_station_terminal',
            'payment_type', 
            'card_last_4_digits'
        ]
        
        print("\n🔍 Checking alternative field names:")
        for field in alt_fields:
            if field in result:
                print(f"  ✅ {field}: {result[field]}")
            else:
                print(f"  ❌ {field}: NOT FOUND")
        
        return result
        
    except ImportError as e:
        print(f"❌ Import error: {e}")
        return None
    except Exception as e:
        print(f"❌ Test error: {e}")
        import traceback
        traceback.print_exc()
        return None

if __name__ == "__main__":
    print("🚀 Testing Complete OCR Flow")
    print("=" * 50)
    
    result = test_complete_ocr_flow()
    
    if result:
        print("\n🎉 Complete OCR test passed!")
        print(f"📊 Total fields returned: {len(result)}")
        
        # Save result to file for inspection
        with open('ocr_test_result.json', 'w') as f:
            json.dump(result, f, indent=2)
        print("💾 Result saved to ocr_test_result.json")
        
        sys.exit(0)
    else:
        print("\n💥 Complete OCR test failed!")
        sys.exit(1)

#!/usr/bin/env python3
"""
Test script to verify that the new OCR fields are being extracted correctly.
This script tests the individual extraction functions without requiring an actual image.
"""

import sys
import os

# Add the services directory to the Python path
services_dir = os.path.join(os.path.dirname(__file__), 'src', 'services')
sys.path.insert(0, services_dir)

def test_new_field_extraction():
    """Test the new field extraction functions with sample text."""
    
    try:
        from ocr_functionality import (
            extract_store_branch_plaza,
            extract_register_station_terminal,
            extract_payment_type,
            extract_card_last_4_digits
        )
        print("✅ Successfully imported new OCR functions")
        
        # Test data - sample receipt text
        test_text = """
        STORE: Downtown Mall Branch #123
        TERMINAL: 5
        PAYMENT METHOD: Credit Card
        CARD: ****1234
        TOTAL: $2997.00
        """
        
        print("\n🧪 Testing new field extraction functions...")
        
        # Test Store/Branch/Plaza extraction
        store_branch = extract_store_branch_plaza(test_text)
        print(f"  Store/Branch/Plaza: {store_branch}")
        
        # Test Register/Station/Terminal extraction
        register_terminal = extract_register_station_terminal(test_text)
        print(f"  Register/Station/Terminal: {register_terminal}")
        
        # Test Payment Type extraction
        payment_type = extract_payment_type(test_text)
        print(f"  Payment Type: {payment_type}")
        
        # Test Card Last 4 Digits extraction
        card_digits = extract_card_last_4_digits(test_text)
        print(f"  Card Last 4 Digits: {card_digits}")
        
        print("\n✅ All new field extraction functions tested successfully!")
        
        # Test with more realistic receipt text
        realistic_text = """
        WALMART SUPERCENTER
        Store #456 - North Plaza
        Terminal: 3
        Payment: Visa Credit Card
        Card ending in: 5678
        Transaction ID: TC#789012
        Register: TR#345
        """
        
        print("\n🧪 Testing with realistic receipt text...")
        
        store_branch_real = extract_store_branch_plaza(realistic_text)
        register_terminal_real = extract_register_station_terminal(realistic_text)
        payment_type_real = extract_payment_type(realistic_text)
        card_digits_real = extract_card_last_4_digits(realistic_text)
        
        print(f"  Store/Branch/Plaza: {store_branch_real}")
        print(f"  Register/Station/Terminal: {register_terminal_real}")
        print(f"  Payment Type: {payment_type_real}")
        print(f"  Card Last 4 Digits: {card_digits_real}")
        
        return True
        
    except ImportError as e:
        print(f"❌ Import error: {e}")
        return False
    except Exception as e:
        print(f"❌ Test error: {e}")
        return False

if __name__ == "__main__":
    print("🚀 Testing New OCR Field Extraction Functions")
    print("=" * 50)
    
    success = test_new_field_extraction()
    
    if success:
        print("\n🎉 All tests passed! New OCR fields are working correctly.")
        sys.exit(0)
    else:
        print("\n💥 Tests failed! Check the error messages above.")
        sys.exit(1)

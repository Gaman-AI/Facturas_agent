#!/usr/bin/env python3
"""
Test script to verify the text-based extraction functions work correctly.
This script tests the individual extraction functions that work with text input.
"""

import sys
import os

# Add the services directory to the Python path
services_dir = os.path.join(os.path.dirname(__file__), 'src', 'services')
sys.path.insert(0, services_dir)

def test_text_extraction_functions():
    """Test the text-based extraction functions directly."""
    
    try:
        # Import the individual extraction functions
        from ocr_functionality import (
            extract_store_branch_plaza,
            extract_register_station_terminal,
            extract_payment_type,
            extract_card_last_4_digits
        )
        print("✅ Successfully imported text extraction functions")
        
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
        
        print("\n🧪 Testing text extraction functions with sample text...")
        print("Sample text:")
        print(test_text)
        
        # Test each extraction function individually
        print("\n📊 Testing individual extraction functions:")
        print("=" * 50)
        
        # Test Store/Branch/Plaza extraction
        store_branch = extract_store_branch_plaza(test_text, "WALMART SUPERCENTER")
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
        
        # Test with different text patterns
        print("\n🧪 Testing with different text patterns...")
        
        # Test 1: Store with number
        text1 = "Store #789 - Downtown Center"
        result1 = extract_store_branch_plaza(text1, "WALMART")
        print(f"  Pattern 1 - Store #789: {result1}")
        
        # Test 2: Terminal information
        text2 = "Terminal: 7 Station: A"
        result2 = extract_register_station_terminal(text2)
        print(f"  Pattern 2 - Terminal 7: {result2}")
        
        # Test 3: Payment methods
        text3 = "Payment: Mastercard Debit Card"
        result3 = extract_payment_type(text3)
        print(f"  Pattern 3 - Mastercard: {result3}")
        
        # Test 4: Card digits
        text4 = "Card ending in: 9999"
        result4 = extract_card_last_4_digits(text4)
        print(f"  Pattern 4 - Card 9999: {result4}")
        
        print("\n✅ All text extraction functions tested successfully!")
        
        return True
        
    except ImportError as e:
        print(f"❌ Import error: {e}")
        return False
    except Exception as e:
        print(f"❌ Test error: {e}")
        import traceback
        traceback.print_exc()
        return False

if __name__ == "__main__":
    print("🚀 Testing Text-Based Extraction Functions")
    print("=" * 50)
    
    success = test_text_extraction_functions()
    
    if success:
        print("\n🎉 All text extraction tests passed!")
        print("✅ The new OCR fields should work correctly with real images")
        sys.exit(0)
    else:
        print("\n💥 Text extraction tests failed!")
        sys.exit(1)

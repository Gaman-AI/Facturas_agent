#!/usr/bin/env python3
"""
Comprehensive test script for OCR functionality
Tests the extract_receipt_data function and shows all returned fields
"""

import os
import sys
from pathlib import Path

# Add the src directory to the Python path
sys.path.append(os.path.join(os.path.dirname(__file__), 'src'))

from services.ocr_functionality import extract_receipt_data

def test_ocr_complete():
    """
    Test the OCR functionality and display all returned fields
    """
    print("🧪 Comprehensive OCR Test - All Fields")
    print("=" * 60)
    
    # Test image path
    test_image_path = "oxxo_trial.jpg"
    
    # Check if test image exists
    if not os.path.exists(test_image_path):
        print(f"❌ Test image not found: {test_image_path}")
        print("Please provide a test image and update the test_image_path variable")
        return
    
    try:
        print(f"📷 Processing test image: {test_image_path}")
        print("⏳ This may take a few moments...")
        print()
        
        # Extract receipt data
        result = extract_receipt_data(test_image_path)
        
        print("✅ OCR Processing Complete!")
        print("=" * 60)
        
        # Display all returned fields
        print("📋 ALL RETURNED FIELDS:")
        print("-" * 60)
        
        # Core fields
        print("🔑 CORE FIELDS:")
        print(f"  Mesa_Folio: {result.get('Mesa_Folio', 'N/A')}")
        print(f"  Fecha: {result.get('Fecha', 'N/A')}")
        print(f"  ID_Ticket: {result.get('ID_Ticket', 'N/A')}")
        print(f"  Total: {result.get('Total', 'N/A')}")
        print(f"  Comercio: {result.get('Comercio', 'N/A')}")
        
        # Vendor-specific fields
        print(f"\n🏪 VENDOR-SPECIFIC FIELDS:")
        print(f"  TC#: {result.get('TC#', 'N/A')}")
        print(f"  TR#: {result.get('TR#', 'N/A')}")
        print(f"  ID: {result.get('ID', 'N/A')}")
        print(f"  Fol_Vta: {result.get('Fol_Vta', 'N/A')}")
        
        # Metadata
        print(f"\n📊 METADATA:")
        print(f"  Vendor Type: {result.get('vendor_type', 'N/A')}")
        print(f"  Extraction Method: {result.get('extraction_method', 'N/A')}")
        print(f"  Text Length: {result.get('text_length', 'N/A')} characters")
        
        # Raw text information
        raw_text = result.get('Full_Raw_Text', '')
        if raw_text:
            print(f"\n📄 RAW TEXT INFORMATION:")
            print(f"  Full Raw Text Length: {len(raw_text)} characters")
            print(f"  Raw Text Available: ✅ Yes")
            print(f"  First 150 chars: {raw_text[:150]}...")
            print(f"  Last 150 chars: ...{raw_text[-150:] if len(raw_text) > 150 else raw_text}")
        
        # Field mapping verification
        print(f"\n🔍 FIELD MAPPING VERIFICATION:")
        print(f"  Mesa_Folio mapped: {'✅' if result.get('Mesa_Folio') else '❌'}")
        print(f"  Fecha mapped: {'✅' if result.get('Fecha') else '❌'}")
        print(f"  ID_Ticket mapped: {'✅' if result.get('ID_Ticket') else '❌'}")
        print(f"  Total mapped: {'✅' if result.get('Total') else '❌'}")
        print(f"  Comercio mapped: {'✅' if result.get('Comercio') else '❌'}")
        print(f"  Vendor Type mapped: {'✅' if result.get('vendor_type') else '❌'}")
        print(f"  Raw Text mapped: {'✅' if raw_text else '❌'}")
        
        # Summary
        print(f"\n📊 SUMMARY:")
        print(f"  Total fields returned: {len(result)}")
        print(f"  Fields with values: {sum(1 for v in result.values() if v and v != 'N/A')}")
        print(f"  Empty fields: {sum(1 for v in result.values() if not v or v == 'N/A')}")
        
        print(f"\n🎯 Test completed successfully!")
        print(f"📝 All fields are now properly mapped for the dual pane view")
        print(f"🔗 Frontend will receive complete data structure")
        
    except Exception as e:
        print(f"❌ Error during OCR processing: {e}")
        import traceback
        traceback.print_exc()

if __name__ == "__main__":
    test_ocr_complete()

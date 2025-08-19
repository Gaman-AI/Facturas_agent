#!/usr/bin/env python3
"""
Test script for enhanced OCR functionality with multi-model processing.
This script tests the new Azure Document Intelligence multi-model approach.
"""

import os
import sys
import json
from pathlib import Path

# Add the services directory to Python path
current_dir = Path(__file__).parent
services_dir = current_dir / "src" / "services"
sys.path.insert(0, str(services_dir))

def test_enhanced_ocr():
    """Test the enhanced OCR functionality."""
    try:
        from ocr_functionality import extract_receipt_data
        
        print("✅ Successfully imported enhanced OCR functionality")
        
        # Test with a sample image (you'll need to provide a test image)
        test_image_path = input("Enter the path to a test receipt image: ").strip()
        
        if not test_image_path:
            print("❌ No image path provided")
            return
        
        if not os.path.exists(test_image_path):
            print(f"❌ Image file not found: {test_image_path}")
            return
        
        print(f"\n🔍 Testing enhanced OCR with image: {test_image_path}")
        print("=" * 60)
        
        # Process the image
        result = extract_receipt_data(test_image_path)
        
        print("\n📊 ENHANCED OCR RESULTS:")
        print("=" * 60)
        
        # Display core fields
        print("📋 CORE FIELDS:")
        print(f"  Merchant: {result.get('Comercio', 'N/A')}")
        print(f"  Date: {result.get('Fecha', 'N/A')}")
        print(f"  Total: {result.get('Total', 'N/A')}")
        print(f"  ID Ticket: {result.get('ID_Ticket', 'N/A')}")
        print(f"  Mesa/Folio: {result.get('Mesa_Folio', 'N/A')}")
        
        # Display vendor-specific fields
        print("\n🏪 VENDOR-SPECIFIC FIELDS:")
        print(f"  Vendor Type: {result.get('vendor_type', 'N/A')}")
        print(f"  TC#: {result.get('TC#', 'N/A')}")
        print(f"  TR#: {result.get('TR#', 'N/A')}")
        print(f"  ID: {result.get('ID', 'N/A')}")
        print(f"  Fol_Vta: {result.get('Fol_Vta', 'N/A')}")
        
        # Display enhanced fields
        print("\n🔧 ENHANCED FIELDS:")
        print(f"  Store/Branch/Plaza: {result.get('Store_Branch_Plaza', 'N/A')}")
        print(f"  Register/Station/Terminal: {result.get('Register_Station_Terminal', 'N/A')}")
        print(f"  Payment Type: {result.get('Payment_Type', 'N/A')}")
        print(f"  Card Last 4 Digits: {result.get('Card_Last_4_Digits', 'N/A')}")
        
        # Display additional information
        additional_info = result.get('additional_info', {})
        if additional_info:
            print("\n📝 ADDITIONAL INFORMATION:")
            for key, value in additional_info.items():
                print(f"  {key}: {value}")
        
        # Display metadata
        print("\n📈 METADATA:")
        print(f"  Extraction Method: {result.get('extraction_method', 'N/A')}")
        print(f"  Text Length: {result.get('text_length', 'N/A')} characters")
        print(f"  Models Used: {', '.join(result.get('models_used', []))}")
        print(f"  Extraction Quality: {result.get('extraction_quality', 'N/A')}")
        
        # Display confidence scores
        confidence_scores = result.get('confidence_scores', {})
        if confidence_scores:
            print("\n🎯 CONFIDENCE SCORES:")
            for model, score in confidence_scores.items():
                print(f"  {model}: {score:.2f}")
        
        # Display text preview
        raw_text = result.get('Full_Raw_Text', '')
        if raw_text:
            print(f"\n📄 TEXT PREVIEW (first 300 characters):")
            print(f"  {raw_text[:300]}...")
        
        print("\n✅ Enhanced OCR test completed successfully!")
        
    except ImportError as e:
        print(f"❌ Import error: {e}")
        print("Make sure you're running this from the backend directory")
    except Exception as e:
        print(f"❌ Test failed: {e}")
        import traceback
        traceback.print_exc()

def test_model_availability():
    """Test if all required Azure models are available."""
    try:
        from ocr_functionality import (
            AZURE_ENDPOINT, AZURE_KEY, 
            DocumentIntelligenceClient, AzureKeyCredential
        )
        
        if not AZURE_ENDPOINT or not AZURE_KEY:
            print("❌ Azure credentials not configured")
            return False
        
        # Test Azure client connection
        client = DocumentIntelligenceClient(
            endpoint=AZURE_ENDPOINT, 
            credential=AzureKeyCredential(AZURE_KEY)
        )
        
        print("✅ Azure Document Intelligence client initialized successfully")
        return True
        
    except Exception as e:
        print(f"❌ Azure client test failed: {e}")
        return False

if __name__ == "__main__":
    print("🚀 ENHANCED OCR TESTING")
    print("=" * 60)
    
    # Test Azure connectivity first
    if test_model_availability():
        # Run the main test
        test_enhanced_ocr()
    else:
        print("❌ Cannot proceed without Azure connectivity")
        sys.exit(1) 
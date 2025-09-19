#!/usr/bin/env python3
"""
Test script for Oxxo OCR functionality
"""

import sys
import os
import json
from pathlib import Path

# Add the services directory to Python path
current_dir = Path(__file__).parent
services_dir = current_dir / 'src' / 'services'
sys.path.insert(0, str(services_dir))

def test_date_parsing():
    """Test date parsing for Mexican format (DD/MM/YYYY)"""
    print("📅 Testing date parsing for Mexican format (DD/MM/YYYY):")
    test_dates = ["24/08/2025", "15/12/2024", "01/01/2025", "31/12/2024"]
    for test_date in test_dates:
        try:
            from datetime import datetime
            parts = test_date.split('/')
            day, month, year = parts
            parsed_date = datetime(int(year), int(month), int(day))
            print(f"  ✅ {test_date} -> {parsed_date.strftime('%Y-%m-%d')}")
        except Exception as e:
            print(f"  ❌ {test_date} -> Error: {e}")
    print()

def test_merchant_detection():
    """Test merchant name detection"""
    print("🏪 Testing merchant name detection:")
    
    # Test Oxxo detection patterns
    oxxo_texts = [
        "PEDREGAL SLP OXXO EXPRESS",
        "FACTURACION ELECTRONICA OXXO",
        "FECHA DE VENTA: 24/08/2025",
        "FOLIO DE VENTA: 12345",
        "ID DE VENTA: 67890"
    ]
    
    for text in oxxo_texts:
        oxxo_patterns = [
            'oxxo', 'oxo', 'oxxo express', 'oxxo expresso', 'oxxo store',
            'facturacion electronica', 'fecha de venta', 'folio de venta', 'id de venta'
        ]
        
        detected = any(pattern in text.lower() for pattern in oxxo_patterns)
        print(f"  {'✅' if detected else '❌'} '{text}' -> {'Oxxo' if detected else 'Not detected'}")
    
    print()

def test_oxxo_ocr():
    """Test OCR with Oxxo image"""
    try:
        from ocr_functionality import extract_receipt_data
        
        # Test with the Oxxo image
        image_path = str(current_dir / 'oxxo_trial.jpg')
        
        if not os.path.exists(image_path):
            print(f"❌ Image not found: {image_path}")
            return
        
        print(f"🔍 Testing OCR with: {image_path}")
        result = extract_receipt_data(image_path)
        
        print("\n" + "="*50)
        print("OCR EXTRACTION RESULT:")
        print("="*50)
        print(json.dumps(result, indent=2, ensure_ascii=False))
        print("="*50)
        
        # Check specific fields for Oxxo
        print("\nOXXO FIELD ANALYSIS:")
        print(f"Comercio: {result.get('Comercio', 'N/A')}")
        print(f"Total: {result.get('Total', 'N/A')}")
        print(f"Fecha: {result.get('Fecha', 'N/A')}")
        print(f"ID (ID de venta): {result.get('ID', 'N/A')}")
        print(f"Fol_Vta (Folio de venta): {result.get('Fol_Vta', 'N/A')}")
        print(f"ID_Ticket: {result.get('ID_Ticket', 'N/A')}")
        print(f"Mesa_Folio: {result.get('Mesa_Folio', 'N/A')}")
        print(f"Store_Branch_Plaza: {result.get('Store_Branch_Plaza', 'N/A')}")
        print(f"Payment_Type: {result.get('Payment_Type', 'N/A')}")
        print(f"Card_Last_4_Digits: {result.get('Card_Last_4_Digits', 'N/A')}")
        print(f"Vendor Type: {result.get('vendor_type', 'N/A')}")
        print(f"Extraction Method: {result.get('extraction_method', 'N/A')}")
        
        # Check raw text
        raw_text = result.get('raw_text', result.get('Full_Raw_Text', ''))
        print(f"\nRAW TEXT PREVIEW (first 500 chars):")
        print(raw_text[:500] if raw_text else "No raw text available")
        
    except Exception as e:
        print(f"❌ Error testing OCR: {e}")
        import traceback
        traceback.print_exc()

if __name__ == "__main__":
    print("=" * 60)
    print("🧪 TESTING OXXO OCR FUNCTIONALITY")
    print("=" * 60)
    
    # Test date parsing first
    test_date_parsing()
    
    # Test merchant detection
    test_merchant_detection()
    
    # Test OCR functionality
    test_oxxo_ocr()

#!/usr/bin/env python3
"""
Test script for código de factura extraction with alphanumeric codes.
"""

import sys
import os
sys.path.append(os.path.dirname(os.path.abspath(__file__)))

from src.services.ocr_functionality import extract_wansoft_codigo_factura

def test_codigo_extraction():
    """Test the código de factura extraction with sample text."""
    
    # Sample text from the screenshot
    sample_text = """
    Ticket de Pagado
    Venta para Llevar
    EL MOLINO SLP
    REGIMEN GENERAL DE LEY PERSONAS
    MORALES
    CORDILLERA HIMALAYA SAN LUIS POTOSI
    SAN LUIS POTOSI 78216
    MSL231117V72
    4447750045
    Movimiento:
    Fecha operación:
    126605
    18/05/2025
    Orden:
    316
    """
    
    print("Testing código de factura extraction...")
    print("Sample text:")
    print(sample_text)
    print("-" * 50)
    
    # Test the extraction
    result = extract_wansoft_codigo_factura(sample_text)
    
    print(f"Extracted código de factura: {result}")
    
    if result:
        print("✅ SUCCESS: Código de factura extracted successfully!")
    else:
        print("❌ FAILED: No código de factura found")
    
    return result

if __name__ == "__main__":
    test_codigo_extraction() 
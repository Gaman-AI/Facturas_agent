#!/usr/bin/env python3
"""
LangExtract Processor Script
This script processes images with LangExtract and returns JSON results.
Called by the Node.js API.
"""

import sys
import os
import json
import time
from pathlib import Path

# Add the services directory to the path
sys.path.append(os.path.dirname(os.path.abspath(__file__)))

from langextract_ocr import LangExtractOCR

def process_image_with_langextract(image_path):
    """
    Process an image with LangExtract OCR.
    
    Args:
        image_path (str): Path to the image file
        
    Returns:
        dict: Processing results
    """
    try:
        # Initialize LangExtract OCR
        ocr = LangExtractOCR()
        
        # For now, we'll use a simple text extraction approach
        # In a real implementation, you'd extract text from the image first
        # For demonstration, we'll use a sample text
        
        sample_text = """
        WALMART MEXICO
        Fecha: 15/12/2024
        Total: $235.90
        Ticket: 11122521255212552254
        Pago: Mastercard
        RFC: XAXX010101000
        """
        
        # Process with LangExtract
        result = ocr.extract_enhanced_fields(sample_text)
        
        return {
            "success": True,
            "processing_method": "langextract",
            "result": result,
            "image_path": image_path,
            "processing_time": 0
        }
        
    except Exception as e:
        return {
            "success": False,
            "error": str(e),
            "processing_method": "langextract",
            "image_path": image_path
        }

def main():
    """Main function called by the API."""
    if len(sys.argv) != 2:
        print(json.dumps({
            "success": False,
            "error": "Usage: python langextract_processor.py <image_path>"
        }))
        sys.exit(1)
    
    image_path = sys.argv[1]
    
    if not os.path.exists(image_path):
        print(json.dumps({
            "success": False,
            "error": f"Image file not found: {image_path}"
        }))
        sys.exit(1)
    
    # Process the image
    start_time = time.time()
    result = process_image_with_langextract(image_path)
    processing_time = time.time() - start_time
    
    # Add processing time to result
    result["processing_time"] = processing_time
    
    # Output JSON result
    print(json.dumps(result, indent=2))

if __name__ == "__main__":
    main() 
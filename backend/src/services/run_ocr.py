#!/usr/bin/env python3
"""
Standalone OCR script for processing receipt images.
This script can be called directly from Node.js to avoid dynamic code generation issues.
"""

import sys
import json
import os
import traceback
from pathlib import Path

def main():
    """Main entry point for the OCR script."""
    try:
        # Add the current directory to Python path for imports
        current_dir = Path(__file__).parent
        sys.path.insert(0, str(current_dir))
        
        # Import the enhanced OCR functionality with GEQS scoring
        try:
            from enhanced_ocr_with_geqs import extract_receipt_data_with_geqs
            print(f"[OCR] Using enhanced OCR with GEQS quality scoring", file=sys.stderr)
        except ImportError:
            try:
                from ocr_functionality_with_confidence import extract_receipt_data_with_confidence as extract_receipt_data_with_geqs
                print(f"[OCR] Fallback to OCR with confidence scoring", file=sys.stderr)
            except ImportError:
                # Final fallback to original functionality
                from ocr_functionality import extract_receipt_data as extract_receipt_data_with_geqs
                print(f"[OCR] Final fallback to original OCR functionality", file=sys.stderr)
        
        # Check if image path was provided
        if len(sys.argv) != 2:
            error_msg = "Usage: python run_ocr.py <image_path>"
            # Use stderr for error messages and ensure proper encoding
            print(f"[OCR] Error: {error_msg}", file=sys.stderr)
            error_result = {"error": error_msg, "success": False}
            # Use sys.stdout.buffer for binary-safe output to avoid encoding issues
            sys.stdout.buffer.write(json.dumps(error_result, ensure_ascii=False).encode('utf-8'))
            sys.stdout.buffer.write(b'\n')
            sys.exit(1)
        
        image_path = sys.argv[1]
        
        # Validate image path exists
        if not os.path.exists(image_path):
            error_msg = f"Image file not found: {image_path}"
            print(f"[OCR] Error: {error_msg}", file=sys.stderr)
            error_result = {"error": error_msg, "success": False}
            sys.stdout.buffer.write(json.dumps(error_result, ensure_ascii=False).encode('utf-8'))
            sys.stdout.buffer.write(b'\n')
            sys.exit(1)
        
        # Process the image with GEQS quality scoring
        print(f"[OCR] Processing image with GEQS quality scoring: {image_path}", file=sys.stderr)
        result = extract_receipt_data_with_geqs(image_path)
        
        # Return successful result using binary-safe output
        json_output = json.dumps(result, ensure_ascii=False)
        sys.stdout.buffer.write(json_output.encode('utf-8'))
        sys.stdout.buffer.write(b'\n')
        
    except ImportError as e:
        error_msg = f"Import failed: {str(e)}"
        print(f"[OCR] Import error: {error_msg}", file=sys.stderr)
        error_result = {"error": error_msg, "success": False}
        sys.stdout.buffer.write(json.dumps(error_result, ensure_ascii=False).encode('utf-8'))
        sys.stdout.buffer.write(b'\n')
        sys.exit(1)
    except Exception as e:
        error_msg = f"OCR processing failed: {str(e)}"
        print(f"[OCR] Error: {error_msg}", file=sys.stderr)
        print(f"[OCR] Traceback: {traceback.format_exc()}", file=sys.stderr)
        error_result = {"error": error_msg, "success": False}
        sys.stdout.buffer.write(json.dumps(error_result, ensure_ascii=False).encode('utf-8'))
        sys.stdout.buffer.write(b'\n')
        sys.exit(1)

if __name__ == "__main__":
    main()

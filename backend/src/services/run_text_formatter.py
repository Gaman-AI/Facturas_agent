#!/usr/bin/env python3
"""
Standalone Text Formatter script for processing OCR raw text.
This script can be called directly from Node.js to format raw OCR text.
"""

import sys
import json
import os
import traceback
from pathlib import Path

def main():
    """Main entry point for the text formatter script."""
    try:
        # Add the current directory to Python path for imports
        current_dir = Path(__file__).parent
        sys.path.insert(0, str(current_dir))
        
        # Import the text formatter functionality
        from text_formatter import format_ocr_text
        
        # Check if text file path and vendor type were provided
        if len(sys.argv) < 2:
            error_msg = "Usage: python run_text_formatter.py <text_file_path> [vendor_type]"
            print(f"[TEXT_FORMATTER] Error: {error_msg}", file=sys.stderr)
            error_result = {"error": error_msg, "success": False}
            sys.stdout.buffer.write(json.dumps(error_result, ensure_ascii=False).encode('utf-8'))
            sys.stdout.buffer.write(b'\n')
            sys.exit(1)
        
        text_file_path = sys.argv[1]
        vendor_type = sys.argv[2] if len(sys.argv) > 2 else 'auto'
        
        # Validate text file exists
        if not os.path.exists(text_file_path):
            error_msg = f"Text file not found: {text_file_path}"
            print(f"[TEXT_FORMATTER] Error: {error_msg}", file=sys.stderr)
            error_result = {"error": error_msg, "success": False}
            sys.stdout.buffer.write(json.dumps(error_result, ensure_ascii=False).encode('utf-8'))
            sys.stdout.buffer.write(b'\n')
            sys.exit(1)
        
        # Read the text file
        print(f"[TEXT_FORMATTER] Reading text file: {text_file_path}", file=sys.stderr)
        with open(text_file_path, 'r', encoding='utf-8') as f:
            raw_text = f.read()
        
        if not raw_text.strip():
            error_msg = "Text file is empty"
            print(f"[TEXT_FORMATTER] Error: {error_msg}", file=sys.stderr)
            error_result = {"error": error_msg, "success": False}
            sys.stdout.buffer.write(json.dumps(error_result, ensure_ascii=False).encode('utf-8'))
            sys.stdout.buffer.write(b'\n')
            sys.exit(1)
        
        # Format the text
        print(f"[TEXT_FORMATTER] Formatting text with vendor type: {vendor_type}", file=sys.stderr)
        formatted_text = format_ocr_text(raw_text, vendor_type)
        
        # Detect vendor type if auto
        detected_vendor = vendor_type
        if vendor_type == 'auto':
            from text_formatter import OCRTextFormatter
            formatter = OCRTextFormatter()
            detected_vendor = formatter._detect_vendor_type(raw_text)
        
        # Return successful result using binary-safe output
        result = {
            "success": True,
            "formatted_text": formatted_text,
            "vendor_type": detected_vendor,
            "original_length": len(raw_text),
            "formatted_length": len(formatted_text)
        }
        
        json_output = json.dumps(result, ensure_ascii=False)
        sys.stdout.buffer.write(json_output.encode('utf-8'))
        sys.stdout.buffer.write(b'\n')
        
        print(f"[TEXT_FORMATTER] Formatting completed successfully", file=sys.stderr)
        print(f"[TEXT_FORMATTER] Original length: {len(raw_text)} characters", file=sys.stderr)
        print(f"[TEXT_FORMATTER] Formatted length: {len(formatted_text)} characters", file=sys.stderr)
        print(f"[TEXT_FORMATTER] Detected vendor: {detected_vendor}", file=sys.stderr)
        
    except ImportError as e:
        error_msg = f"Import failed: {str(e)}"
        print(f"[TEXT_FORMATTER] Import error: {error_msg}", file=sys.stderr)
        error_result = {"error": error_msg, "success": False}
        sys.stdout.buffer.write(json.dumps(error_result, ensure_ascii=False).encode('utf-8'))
        sys.stdout.buffer.write(b'\n')
        sys.exit(1)
    except Exception as e:
        error_msg = f"Text formatting failed: {str(e)}"
        print(f"[TEXT_FORMATTER] Error: {error_msg}", file=sys.stderr)
        print(f"[TEXT_FORMATTER] Traceback: {traceback.format_exc()}", file=sys.stderr)
        error_result = {"error": error_msg, "success": False}
        sys.stdout.buffer.write(json.dumps(error_result, ensure_ascii=False).encode('utf-8'))
        sys.stdout.buffer.write(b'\n')
        sys.exit(1)

if __name__ == "__main__":
    main()

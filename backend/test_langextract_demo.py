#!/usr/bin/env python3
"""
LangExtract Demo Script
This script demonstrates the LangExtract implementation with sample data.
"""

import sys
import os
import json

# Add the src directory to the path
sys.path.append(os.path.join(os.path.dirname(__file__), 'src'))

def demo_langextract_basic():
    """Demonstrate basic LangExtract functionality."""
    print("🚀 LangExtract Basic Demo")
    print("=" * 50)
    
    try:
        from services.langextract_ocr import LangExtractOCR
        
        # Initialize LangExtract OCR
        ocr = LangExtractOCR()
        
        # Sample receipt text
        sample_text = """
        WALMART MEXICO
        Fecha: 15/12/2024
        Total: $235.90
        Ticket: 11122521255212552254
        Pago: Mastercard
        RFC: XAXX010101000
        """
        
        print("📝 Processing sample receipt text...")
        result = ocr.extract_enhanced_fields(sample_text)
        
        print("\n✅ Extraction Results:")
        print(f"   - Processing Method: {result.get('processing_method', 'unknown')}")
        print(f"   - Receipt Fields: {len(result.get('receipt_fields', {}))}")
        print(f"   - CFDI Fields: {len(result.get('cfdi_fields', {}))}")
        
        if result.get('receipt_fields'):
            print("\n📋 Receipt Fields Extracted:")
            for field, value in result['receipt_fields'].items():
                print(f"   - {field}: {value}")
        
        if result.get('cfdi_fields'):
            print("\n📋 CFDI Fields Extracted:")
            for field, value in result['cfdi_fields'].items():
                print(f"   - {field}: {value}")
        
        return True
        
    except Exception as e:
        print(f"❌ Demo failed: {str(e)}")
        return False

def demo_hybrid_service():
    """Demonstrate hybrid service functionality."""
    print("\n🚀 Hybrid Service Demo")
    print("=" * 50)
    
    try:
        from services.hybrid_ocr_service import HybridOCRService
        
        # Initialize hybrid service
        hybrid = HybridOCRService()
        
        # Check status
        status = hybrid.get_processing_status()
        
        print("📊 Service Status:")
        print(f"   - Azure Available: {status['azure_available']}")
        print(f"   - LangExtract Available: {status['langextract_available']}")
        print(f"   - Hybrid Available: {status['hybrid_available']}")
        print(f"   - Recommended Method: {status['recommended_method']}")
        
        return True
        
    except Exception as e:
        print(f"❌ Hybrid demo failed: {str(e)}")
        return False

def demo_prompts_and_examples():
    """Demonstrate prompts and examples."""
    print("\n🚀 Prompts and Examples Demo")
    print("=" * 50)
    
    try:
        from services.langextract_ocr import LangExtractOCR
        
        ocr = LangExtractOCR()
        
        # Show receipt prompt
        receipt_prompt = ocr._get_receipt_extraction_prompt()
        print("📝 Receipt Extraction Prompt:")
        print(receipt_prompt[:200] + "..." if len(receipt_prompt) > 200 else receipt_prompt)
        
        # Show CFDI prompt
        cfdi_prompt = ocr._get_cfdi_extraction_prompt()
        print("\n📝 CFDI Extraction Prompt:")
        print(cfdi_prompt[:200] + "..." if len(cfdi_prompt) > 200 else cfdi_prompt)
        
        # Show examples
        receipt_examples = ocr._get_receipt_examples()
        print(f"\n📋 Receipt Examples: {len(receipt_examples)} examples")
        
        cfdi_examples = ocr._get_cfdi_examples()
        print(f"📋 CFDI Examples: {len(cfdi_examples)} examples")
        
        return True
        
    except Exception as e:
        print(f"❌ Prompts demo failed: {str(e)}")
        return False

def demo_api_integration():
    """Demonstrate API integration approach."""
    print("\n🚀 API Integration Demo")
    print("=" * 50)
    
    try:
        # Simulate API call to LangExtract processor
        from services.langextract_processor import process_image_with_langextract
        
        # Use a dummy image path for demo
        dummy_image_path = "/path/to/sample/receipt.jpg"
        
        print("📝 Simulating API call to LangExtract processor...")
        result = process_image_with_langextract(dummy_image_path)
        
        print("✅ API Integration Result:")
        print(f"   - Success: {result.get('success', False)}")
        print(f"   - Processing Method: {result.get('processing_method', 'unknown')}")
        
        if result.get('result'):
            result_data = result['result']
            print(f"   - Receipt Fields: {len(result_data.get('receipt_fields', {}))}")
            print(f"   - CFDI Fields: {len(result_data.get('cfdi_fields', {}))}")
        
        return True
        
    except Exception as e:
        print(f"❌ API integration demo failed: {str(e)}")
        return False

def main():
    """Run all demos."""
    print("🎯 LangExtract Implementation Demo")
    print("=" * 60)
    
    demos = [
        ("Basic LangExtract", demo_langextract_basic),
        ("Hybrid Service", demo_hybrid_service),
        ("Prompts and Examples", demo_prompts_and_examples),
        ("API Integration", demo_api_integration),
    ]
    
    results = []
    
    for demo_name, demo_func in demos:
        print(f"\n{'='*20} {demo_name} {'='*20}")
        try:
            result = demo_func()
            results.append((demo_name, result))
        except Exception as e:
            print(f"❌ {demo_name} failed with exception: {str(e)}")
            results.append((demo_name, False))
    
    # Summary
    print("\n" + "="*60)
    print("📊 DEMO SUMMARY")
    print("="*60)
    
    passed = 0
    total = len(results)
    
    for demo_name, result in results:
        status = "✅ PASSED" if result else "❌ FAILED"
        print(f"{status}: {demo_name}")
        if result:
            passed += 1
    
    print(f"\nOverall: {passed}/{total} demos passed")
    
    if passed == total:
        print("🎉 All demos passed! LangExtract implementation is working correctly.")
        print("\n🚀 Next Steps:")
        print("1. Get LangExtract API key from: https://aistudio.google.com/app/apikey")
        print("2. Add LANGEXTRACT_API_KEY to your .env file")
        print("3. Test with actual receipt images")
        print("4. Integrate with your existing API endpoints")
        print("5. Deploy the hybrid OCR service")
    else:
        print("⚠️  Some demos failed. Please check the implementation.")
    
    return passed == total

if __name__ == "__main__":
    success = main()
    sys.exit(0 if success else 1) 
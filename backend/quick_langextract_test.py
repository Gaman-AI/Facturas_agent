#!/usr/bin/env python3
"""
Quick test script for LangExtract implementation verification.
This script tests the basic structure and imports without requiring API keys.
"""

import os
import sys

def test_imports():
    """Test if all required modules can be imported."""
    print("🧪 Testing Module Imports...")
    
    try:
        # Test basic imports
        import langextract
        print("✅ LangExtract imported successfully")
        
        from langextract.data import ExampleData, Extraction
        print("✅ LangExtract data classes imported successfully")
        
        return True
    except ImportError as e:
        print(f"❌ Import failed: {str(e)}")
        return False

def test_class_structure():
    """Test if our custom classes can be instantiated."""
    print("\n🧪 Testing Class Structure...")
    
    try:
        # Add src to path
        sys.path.append(os.path.join(os.path.dirname(__file__), 'src'))
        
        # Test LangExtractOCR class
        from services.langextract_ocr import LangExtractOCR
        
        # Create instance (without API key)
        ocr = LangExtractOCR()
        print("✅ LangExtractOCR class instantiated successfully")
        
        # Test method availability
        methods = [
            'extract_receipt_fields',
            'extract_cfdi_fields', 
            'extract_enhanced_fields',
            'create_visualization'
        ]
        
        for method in methods:
            if hasattr(ocr, method):
                print(f"✅ Method {method} available")
            else:
                print(f"❌ Method {method} missing")
                return False
        
        return True
        
    except Exception as e:
        print(f"❌ Class structure test failed: {str(e)}")
        return False

def test_hybrid_service():
    """Test hybrid service structure."""
    print("\n🧪 Testing Hybrid Service Structure...")
    
    try:
        # Add src to path
        sys.path.append(os.path.join(os.path.dirname(__file__), 'src'))
        
        # Test HybridOCRService class
        from services.hybrid_ocr_service import HybridOCRService
        
        # Create instance
        hybrid = HybridOCRService()
        print("✅ HybridOCRService class instantiated successfully")
        
        # Test method availability
        methods = [
            'process_receipt',
            'process_with_visualization',
            'get_processing_status'
        ]
        
        for method in methods:
            if hasattr(hybrid, method):
                print(f"✅ Method {method} available")
            else:
                print(f"❌ Method {method} missing")
                return False
        
        # Test status method
        status = hybrid.get_processing_status()
        print(f"✅ Status method works: {status}")
        
        return True
        
    except Exception as e:
        print(f"❌ Hybrid service test failed: {str(e)}")
        return False

def test_prompts_and_examples():
    """Test if prompts and examples are properly defined."""
    print("\n🧪 Testing Prompts and Examples...")
    
    try:
        # Add src to path
        sys.path.append(os.path.join(os.path.dirname(__file__), 'src'))
        
        from services.langextract_ocr import LangExtractOCR
        
        ocr = LangExtractOCR()
        
        # Test receipt prompt
        receipt_prompt = ocr._get_receipt_extraction_prompt()
        if receipt_prompt and len(receipt_prompt) > 100:
            print("✅ Receipt extraction prompt defined")
        else:
            print("❌ Receipt extraction prompt too short or empty")
            return False
        
        # Test CFDI prompt
        cfdi_prompt = ocr._get_cfdi_extraction_prompt()
        if cfdi_prompt and len(cfdi_prompt) > 100:
            print("✅ CFDI extraction prompt defined")
        else:
            print("❌ CFDI extraction prompt too short or empty")
            return False
        
        # Test examples
        receipt_examples = ocr._get_receipt_examples()
        if receipt_examples and len(receipt_examples) > 0:
            print(f"✅ Receipt examples defined ({len(receipt_examples)} examples)")
        else:
            print("❌ No receipt examples defined")
            return False
        
        cfdi_examples = ocr._get_cfdi_examples()
        if cfdi_examples and len(cfdi_examples) > 0:
            print(f"✅ CFDI examples defined ({len(cfdi_examples)} examples)")
        else:
            print("❌ No CFDI examples defined")
            return False
        
        return True
        
    except Exception as e:
        print(f"❌ Prompts and examples test failed: {str(e)}")
        return False

def main():
    """Run all tests."""
    print("🚀 LangExtract Implementation Verification")
    print("=" * 50)
    
    tests = [
        ("Module Imports", test_imports),
        ("Class Structure", test_class_structure),
        ("Hybrid Service", test_hybrid_service),
        ("Prompts and Examples", test_prompts_and_examples),
    ]
    
    results = []
    
    for test_name, test_func in tests:
        print(f"\n{'='*20} {test_name} {'='*20}")
        try:
            result = test_func()
            results.append((test_name, result))
        except Exception as e:
            print(f"❌ {test_name} failed with exception: {str(e)}")
            results.append((test_name, False))
    
    # Summary
    print("\n" + "="*50)
    print("📊 VERIFICATION SUMMARY")
    print("="*50)
    
    passed = 0
    total = len(results)
    
    for test_name, result in results:
        status = "✅ PASSED" if result else "❌ FAILED"
        print(f"{status}: {test_name}")
        if result:
            passed += 1
    
    print(f"\nOverall: {passed}/{total} tests passed")
    
    if passed == total:
        print("🎉 All tests passed! LangExtract implementation is ready.")
        print("\nNext steps:")
        print("1. Get LangExtract API key from: https://aistudio.google.com/app/apikey")
        print("2. Add LANGEXTRACT_API_KEY to your .env file")
        print("3. Test with actual receipt images")
        print("4. Integrate with your existing API endpoints")
    else:
        print("⚠️  Some tests failed. Please check the implementation.")
    
    return passed == total

if __name__ == "__main__":
    success = main()
    sys.exit(0 if success else 1) 
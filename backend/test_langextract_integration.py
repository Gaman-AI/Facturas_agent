#!/usr/bin/env python3
"""
Quick test script for LangExtract integration and hybrid OCR service.
This script tests the basic functionality without requiring actual images.
"""

import os
import sys
import json
from dotenv import load_dotenv

# Add the src directory to the path
sys.path.append(os.path.join(os.path.dirname(__file__), 'src'))

# Load environment variables
load_dotenv()

def test_langextract_basic():
    """Test basic LangExtract functionality."""
    print("🧪 Testing LangExtract Basic Functionality...")
    
    try:
        from services.langextract_ocr import LangExtractOCR
        
        # Initialize LangExtract OCR
        langextract_ocr = LangExtractOCR()
        
        # Test with sample text
        sample_text = """
        WALMART MEXICO
        Fecha: 15/12/2024
        Total: $235.90
        Ticket: 11122521255212552254
        Pago: Mastercard
        RFC: XAXX010101000
        """
        
        print("📝 Testing with sample receipt text...")
        result = langextract_ocr.extract_enhanced_fields(sample_text)
        
        print("✅ LangExtract Basic Test Results:")
        print(f"   - Processing Method: {result.get('processing_method', 'unknown')}")
        print(f"   - Receipt Fields: {len(result.get('receipt_fields', {}))}")
        print(f"   - CFDI Fields: {len(result.get('cfdi_fields', {}))}")
        print(f"   - Errors: {len(result.get('errors', []))}")
        
        if result.get('errors'):
            print("   ⚠️  Errors found:")
            for error in result['errors']:
                print(f"      - {error}")
        
        return True
        
    except Exception as e:
        print(f"❌ LangExtract Basic Test Failed: {str(e)}")
        return False

def test_hybrid_service():
    """Test hybrid OCR service initialization."""
    print("\n🧪 Testing Hybrid OCR Service...")
    
    try:
        from services.hybrid_ocr_service import HybridOCRService
        
        # Initialize hybrid service
        hybrid_service = HybridOCRService()
        
        # Check status
        status = hybrid_service.get_processing_status()
        
        print("✅ Hybrid Service Status:")
        print(f"   - Azure Available: {status['azure_available']}")
        print(f"   - LangExtract Available: {status['langextract_available']}")
        print(f"   - Hybrid Available: {status['hybrid_available']}")
        print(f"   - Recommended Method: {status['recommended_method']}")
        
        return True
        
    except Exception as e:
        print(f"❌ Hybrid Service Test Failed: {str(e)}")
        return False

def test_environment_setup():
    """Test environment variable setup."""
    print("\n🧪 Testing Environment Setup...")
    
    # Check required environment variables
    required_vars = {
        "AZURE_DOCUMENT_INTELLIGENCE_ENDPOINT": "Azure Document Intelligence Endpoint",
        "AZURE_DOCUMENT_INTELLIGENCE_KEY": "Azure Document Intelligence Key",
        "LANGEXTRACT_API_KEY": "LangExtract API Key",
        "OPENAI_API_KEY": "OpenAI API Key"
    }
    
    missing_vars = []
    available_vars = []
    
    for var_name, description in required_vars.items():
        value = os.getenv(var_name)
        if value:
            available_vars.append(f"✅ {description}: Configured")
        else:
            missing_vars.append(f"❌ {description}: Missing")
    
    print("Environment Variables Status:")
    for var in available_vars:
        print(f"   {var}")
    for var in missing_vars:
        print(f"   {var}")
    
    if missing_vars:
        print("\n⚠️  Setup Instructions:")
        print("   1. Get LangExtract API key from: https://aistudio.google.com/app/apikey")
        print("   2. Add to your .env file:")
        print("      LANGEXTRACT_API_KEY=your_api_key_here")
        print("   3. For full functionality, ensure Azure credentials are also configured")
    
    return len(missing_vars) == 0

def test_langextract_installation():
    """Test LangExtract package installation."""
    print("\n🧪 Testing LangExtract Installation...")
    
    try:
        import langextract
        print(f"✅ LangExtract installed successfully (version: {langextract.__version__ if hasattr(langextract, '__version__') else 'unknown'})")
        
        # Test basic import
        from langextract.data import ExampleData, Extraction
        print("✅ LangExtract data classes imported successfully")
        
        return True
        
    except ImportError as e:
        print(f"❌ LangExtract installation failed: {str(e)}")
        print("   Try running: pip install langextract")
        return False

def main():
    """Run all tests."""
    print("🚀 LangExtract Integration Test Suite")
    print("=" * 50)
    
    tests = [
        ("LangExtract Installation", test_langextract_installation),
        ("Environment Setup", test_environment_setup),
        ("LangExtract Basic Functionality", test_langextract_basic),
        ("Hybrid Service", test_hybrid_service),
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
    print("📊 TEST SUMMARY")
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
        print("🎉 All tests passed! LangExtract integration is ready.")
        print("\nNext steps:")
        print("1. Add LANGEXTRACT_API_KEY to your .env file")
        print("2. Test with actual receipt images")
        print("3. Integrate with your existing API endpoints")
    else:
        print("⚠️  Some tests failed. Please check the setup instructions above.")
    
    return passed == total

if __name__ == "__main__":
    success = main()
    sys.exit(0 if success else 1) 
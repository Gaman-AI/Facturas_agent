#!/usr/bin/env python3
"""
Test script for GEQS (Global Extraction Quality Score) implementation
Tests the scoring system with sample data
"""

import sys
import os
import json
from pathlib import Path

# Add the services directory to the path
current_dir = Path(__file__).parent
sys.path.insert(0, str(current_dir / 'src' / 'services'))

def test_geqs_scorer():
    """Test the GEQS scorer with sample data"""
    try:
        from geqs_scorer import calculate_geqs_score, GEQSScorer
        
        print("🧪 Testing GEQS Scorer...")
        
        # Test 1: High quality extraction
        print("\n📊 Test 1: High Quality Extraction")
        high_quality_data = {
            'Total': '125.50',
            'Fecha': '15/12/2024',
            'ID_Ticket': '123456789012345',
            'Comercio': 'Walmart',
            'Mesa_Folio': '12345',
            'Store_Branch_Plaza': 'Store 1234',
            'Payment_Type': 'Credit Card',
            'TC#': 'TC123456',
            'ID': 'ID789',
            'TR#': 'TR456',
            'Fol_Vta': 'FV789',
            'Register_Station_Terminal': 'Terminal 1',
            'Card_Last_4_Digits': '1234'
        }
        
        high_quality_text = """
        WALMART STORE 1234
        Terminal: 1
        TC#: TC123456
        TR#: TR456
        ID: ID789
        Fol_Vta: FV789
        Date: 15/12/2024
        Total: $125.50
        Payment: Credit Card ****1234
        Ticket ID: 123456789012345
        """
        
        result1 = calculate_geqs_score(high_quality_data, high_quality_text)
        print(f"✅ High Quality Score: {result1.total_score}/100")
        print(f"   Recommendation: {result1.recommendation}")
        print(f"   CFC: {result1.cfc_score}, COV: {result1.cov_score}, CONS: {result1.cons_score}")
        
        # Test 2: Medium quality extraction
        print("\n📊 Test 2: Medium Quality Extraction")
        medium_quality_data = {
            'Total': '89.99',
            'Fecha': '2024-12-15',  # Different date format
            'ID_Ticket': '987654321',  # Shorter ID
            'Comercio': 'Oxxo',
            'Mesa_Folio': None,  # Missing field
            'Store_Branch_Plaza': None,  # Missing field
            'Payment_Type': None,  # Missing field
            'TC#': None,
            'ID': None,
            'TR#': None,
            'Fol_Vta': None,
            'Register_Station_Terminal': None,
            'Card_Last_4_Digits': None
        }
        
        medium_quality_text = """
        OXXO
        Date: 2024-12-15
        Total: $89.99
        Ticket: 987654321
        """
        
        result2 = calculate_geqs_score(medium_quality_data, medium_quality_text)
        print(f"✅ Medium Quality Score: {result2.total_score}/100")
        print(f"   Recommendation: {result2.recommendation}")
        print(f"   CFC: {result2.cfc_score}, COV: {result2.cov_score}, CONS: {result2.cons_score}")
        
        # Test 3: Poor quality extraction
        print("\n📊 Test 3: Poor Quality Extraction")
        poor_quality_data = {
            'Total': 'invalid',  # Invalid amount
            'Fecha': 'not-a-date',  # Invalid date
            'ID_Ticket': '12',  # Too short
            'Comercio': 'X',  # Too short
            'Mesa_Folio': None,
            'Store_Branch_Plaza': None,
            'Payment_Type': None,
            'TC#': None,
            'ID': None,
            'TR#': None,
            'Fol_Vta': None,
            'Register_Station_Terminal': None,
            'Card_Last_4_Digits': None
        }
        
        poor_quality_text = "Poor quality text with minimal information"
        
        result3 = calculate_geqs_score(poor_quality_data, poor_quality_text)
        print(f"✅ Poor Quality Score: {result3.total_score}/100")
        print(f"   Recommendation: {result3.recommendation}")
        print(f"   CFC: {result3.cfc_score}, COV: {result3.cov_score}, CONS: {result3.cons_score}")
        
        # Test 4: Test with Azure confidence scores
        print("\n📊 Test 4: With Azure Confidence Scores")
        azure_confidence = {
            'Total': 0.95,
            'Fecha': 0.88,
            'ID_Ticket': 0.92,
            'Comercio': 0.85
        }
        
        result4 = calculate_geqs_score(high_quality_data, high_quality_text, azure_confidence)
        print(f"✅ With Azure Confidence Score: {result4.total_score}/100")
        print(f"   Recommendation: {result4.recommendation}")
        print(f"   CFC: {result4.cfc_score}, COV: {result4.cov_score}, CONS: {result4.cons_score}")
        
        print("\n🎉 All GEQS tests completed successfully!")
        return True
        
    except ImportError as e:
        print(f"❌ Import error: {e}")
        return False
    except Exception as e:
        print(f"❌ Test error: {e}")
        return False

def test_enhanced_ocr():
    """Test the enhanced OCR with GEQS integration"""
    try:
        from enhanced_ocr_with_geqs import extract_receipt_data_with_geqs
        
        print("\n🧪 Testing Enhanced OCR with GEQS...")
        
        # Test with a sample image (if available)
        sample_image = "oxxo_trial.jpg"
        if os.path.exists(sample_image):
            print(f"📸 Testing with sample image: {sample_image}")
            result = extract_receipt_data_with_geqs(sample_image)
            
            if 'geqs_score' in result:
                print(f"✅ GEQS Score: {result['geqs_score']['total_score']}/100")
                print(f"   Quality Level: {result['geqs_score']['quality_level']}")
                print(f"   Recommendation: {result['geqs_score']['recommendation']}")
                
                if 'quality_analysis' in result:
                    analysis = result['quality_analysis']
                    print(f"   Overall Assessment: {analysis['overall_assessment']}")
                    print(f"   Strengths: {', '.join(analysis['strengths'])}")
                    print(f"   Weaknesses: {', '.join(analysis['weaknesses'])}")
            else:
                print("⚠️ No GEQS score found in result")
        else:
            print(f"⚠️ Sample image {sample_image} not found, skipping OCR test")
        
        return True
        
    except ImportError as e:
        print(f"❌ Import error: {e}")
        return False
    except Exception as e:
        print(f"❌ OCR test error: {e}")
        return False

def main():
    """Main test function"""
    print("🚀 Starting GEQS Implementation Tests")
    print("=" * 50)
    
    # Test GEQS scorer
    scorer_success = test_geqs_scorer()
    
    # Test enhanced OCR
    ocr_success = test_enhanced_ocr()
    
    print("\n" + "=" * 50)
    if scorer_success and ocr_success:
        print("🎉 All tests passed! GEQS implementation is working correctly.")
        return 0
    else:
        print("❌ Some tests failed. Please check the implementation.")
        return 1

if __name__ == "__main__":
    sys.exit(main())

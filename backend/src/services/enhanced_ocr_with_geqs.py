# Enhanced OCR Service with GEQS Integration
# Drop-in replacement for existing OCR functionality with quality scoring

import os
import sys
import json
from typing import Dict, Any, Optional
from dotenv import load_dotenv

# Add the services directory to the path
sys.path.append(os.path.dirname(os.path.abspath(__file__)))

# Import existing OCR functionality
from ocr_functionality import extract_receipt_data as original_extract_receipt_data

# Import GEQS scorer
from geqs_scorer import calculate_geqs_score, GEQSResult

# Load environment variables
BASE_DIR = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
env_path = os.path.join(BASE_DIR, '.env')
load_dotenv(env_path)

def extract_receipt_data_with_geqs(image_path: str, include_confidence_scores: bool = True) -> Dict[str, Any]:
    """
    Enhanced receipt processing with GEQS quality scoring
    
    Args:
        image_path (str): Path to the receipt image
        include_confidence_scores (bool): Whether to include detailed confidence analysis
        
    Returns:
        dict: Enhanced extraction results with GEQS scoring
    """
    print(f"[ENHANCED-OCR-GEQS] Processing receipt with quality scoring: {image_path}", file=sys.stderr)
    
    try:
        # Extract data using original OCR functionality
        print(f"[ENHANCED-OCR-GEQS] Running original OCR extraction...", file=sys.stderr)
        ocr_result = original_extract_receipt_data(image_path)
        
        if not ocr_result or 'error' in ocr_result:
            print(f"[ENHANCED-OCR-GEQS] OCR extraction failed, returning original result", file=sys.stderr)
            return ocr_result
        
        # Extract the data for GEQS analysis
        extracted_data = {
            'Total': ocr_result.get('Total', ''),
            'Fecha': ocr_result.get('Fecha', ''),
            'ID_Ticket': ocr_result.get('ID_Ticket', ''),
            'Comercio': ocr_result.get('Comercio', ''),
            'Mesa_Folio': ocr_result.get('Mesa_Folio', ''),
            'Store_Branch_Plaza': ocr_result.get('Store_Branch_Plaza', ''),
            'Payment_Type': ocr_result.get('Payment_Type', ''),
            'TC#': ocr_result.get('TC#', ''),
            'ID': ocr_result.get('ID', ''),
            'TR#': ocr_result.get('TR#', ''),
            'Fol_Vta': ocr_result.get('Fol_Vta', ''),
            'Register_Station_Terminal': ocr_result.get('Register_Station_Terminal', ''),
            'Card_Last_4_Digits': ocr_result.get('Card_Last_4_Digits', '')
        }
        
        # Get raw text for analysis
        raw_text = ocr_result.get('Full_Raw_Text', '') or ocr_result.get('raw_text', '')
        
        # Calculate GEQS score
        print(f"[ENHANCED-OCR-GEQS] Calculating GEQS quality score...", file=sys.stderr)
        geqs_result = calculate_geqs_score(extracted_data, raw_text)
        
        # Enhance the original result with GEQS data
        enhanced_result = ocr_result.copy()
        
        # Add GEQS scoring data
        enhanced_result['geqs_score'] = {
            'total_score': geqs_result.total_score,
            'cfc_score': geqs_result.cfc_score,
            'cov_score': geqs_result.cov_score,
            'cons_score': geqs_result.cons_score,
            'msa_score': geqs_result.msa_score,
            'ilq_score': geqs_result.ilq_score,
            'recommendation': geqs_result.recommendation,
            'quality_level': _get_quality_level(geqs_result.total_score)
        }
        
        # Add detailed analysis if requested
        if include_confidence_scores:
            enhanced_result['geqs_details'] = geqs_result.details
            enhanced_result['quality_analysis'] = _generate_quality_analysis(geqs_result)
        
        # Add processing metadata
        enhanced_result['processing_metadata'] = {
            'geqs_enabled': True,
            'geqs_version': '1.0.0',
            'quality_assessed': True,
            'original_extraction_method': ocr_result.get('extraction_method', 'unknown')
        }
        
        print(f"[ENHANCED-OCR-GEQS] GEQS analysis completed - Score: {geqs_result.total_score}/100", file=sys.stderr)
        print(f"[ENHANCED-OCR-GEQS] Recommendation: {geqs_result.recommendation}", file=sys.stderr)
        
        return enhanced_result
        
    except Exception as e:
        print(f"[ENHANCED-OCR-GEQS] Error during GEQS processing: {str(e)}", file=sys.stderr)
        # Return original result if GEQS fails
        try:
            return original_extract_receipt_data(image_path)
        except Exception as fallback_error:
            print(f"[ENHANCED-OCR-GEQS] Fallback OCR also failed: {str(fallback_error)}", file=sys.stderr)
            return {
                'error': f'OCR processing failed: {str(e)}',
                'success': False,
                'geqs_enabled': True,
                'geqs_error': str(e)
            }

def _get_quality_level(score: float) -> str:
    """Convert GEQS score to quality level"""
    if score >= 85:
        return "EXCELLENT"
    elif score >= 70:
        return "GOOD"
    elif score >= 50:
        return "FAIR"
    else:
        return "POOR"

def _generate_quality_analysis(geqs_result: GEQSResult) -> Dict[str, Any]:
    """Generate human-readable quality analysis"""
    analysis = {
        'overall_assessment': _get_overall_assessment(geqs_result.total_score),
        'strengths': _identify_strengths(geqs_result),
        'weaknesses': _identify_weaknesses(geqs_result),
        'recommendations': _get_improvement_recommendations(geqs_result),
        'confidence_breakdown': _get_confidence_breakdown(geqs_result)
    }
    return analysis

def _get_overall_assessment(score: float) -> str:
    """Get overall assessment based on score"""
    if score >= 85:
        return "High-quality extraction with excellent confidence"
    elif score >= 70:
        return "Good quality extraction with minor issues"
    elif score >= 50:
        return "Fair quality extraction requiring review"
    else:
        return "Poor quality extraction requiring manual verification"

def _identify_strengths(geqs_result: GEQSResult) -> list:
    """Identify extraction strengths"""
    strengths = []
    
    if geqs_result.cfc_score >= 80:
        strengths.append("High field confidence scores")
    if geqs_result.cov_score >= 80:
        strengths.append("Complete field coverage")
    if geqs_result.cons_score >= 80:
        strengths.append("Good data consistency")
    if geqs_result.msa_score >= 70:
        strengths.append("Strong multi-signal agreement")
    if geqs_result.ilq_score >= 70:
        strengths.append("Good image quality")
    
    return strengths if strengths else ["Basic extraction completed"]

def _identify_weaknesses(geqs_result: GEQSResult) -> list:
    """Identify extraction weaknesses"""
    weaknesses = []
    
    if geqs_result.cfc_score < 60:
        weaknesses.append("Low field confidence scores")
    if geqs_result.cov_score < 60:
        weaknesses.append("Missing required fields")
    if geqs_result.cons_score < 60:
        weaknesses.append("Data consistency issues")
    if geqs_result.msa_score < 50:
        weaknesses.append("Poor multi-signal agreement")
    if geqs_result.ilq_score < 50:
        weaknesses.append("Poor image quality")
    
    return weaknesses if weaknesses else ["No major weaknesses detected"]

def _get_improvement_recommendations(geqs_result: GEQSResult) -> list:
    """Get improvement recommendations"""
    recommendations = []
    
    if geqs_result.cfc_score < 70:
        recommendations.append("Consider retaking photo with better lighting")
    if geqs_result.cov_score < 70:
        recommendations.append("Ensure all receipt areas are visible in photo")
    if geqs_result.cons_score < 70:
        recommendations.append("Verify extracted values manually")
    if geqs_result.msa_score < 60:
        recommendations.append("Check for OCR errors in key fields")
    if geqs_result.ilq_score < 60:
        recommendations.append("Use higher resolution image or better camera")
    
    if geqs_result.total_score < 70:
        recommendations.append("Manual review recommended before processing")
    
    return recommendations if recommendations else ["Extraction quality is acceptable"]

def _get_confidence_breakdown(geqs_result: GEQSResult) -> Dict[str, str]:
    """Get confidence breakdown by component"""
    breakdown = {}
    
    # CFC assessment
    if geqs_result.cfc_score >= 80:
        breakdown['field_confidence'] = "Excellent"
    elif geqs_result.cfc_score >= 60:
        breakdown['field_confidence'] = "Good"
    else:
        breakdown['field_confidence'] = "Needs improvement"
    
    # Coverage assessment
    if geqs_result.cov_score >= 80:
        breakdown['coverage'] = "Complete"
    elif geqs_result.cov_score >= 60:
        breakdown['coverage'] = "Mostly complete"
    else:
        breakdown['coverage'] = "Incomplete"
    
    # Consistency assessment
    if geqs_result.cons_score >= 80:
        breakdown['consistency'] = "Excellent"
    elif geqs_result.cons_score >= 60:
        breakdown['consistency'] = "Good"
    else:
        breakdown['consistency'] = "Has issues"
    
    # Multi-signal agreement assessment
    if geqs_result.msa_score >= 70:
        breakdown['agreement'] = "Strong"
    elif geqs_result.msa_score >= 50:
        breakdown['agreement'] = "Moderate"
    else:
        breakdown['agreement'] = "Weak"
    
    # Image quality assessment
    if geqs_result.ilq_score >= 70:
        breakdown['image_quality'] = "Good"
    elif geqs_result.ilq_score >= 50:
        breakdown['image_quality'] = "Fair"
    else:
        breakdown['image_quality'] = "Poor"
    
    return breakdown

# Convenience function for backward compatibility
def extract_receipt_data(image_path: str) -> Dict[str, Any]:
    """
    Backward compatible function that includes GEQS scoring
    """
    return extract_receipt_data_with_geqs(image_path, include_confidence_scores=True)

# Function to get GEQS score only (for testing/debugging)
def get_geqs_score_only(extracted_data: Dict[str, Any], raw_text: str = "") -> GEQSResult:
    """
    Calculate only the GEQS score without full OCR processing
    Useful for testing or re-scoring existing data
    """
    return calculate_geqs_score(extracted_data, raw_text)

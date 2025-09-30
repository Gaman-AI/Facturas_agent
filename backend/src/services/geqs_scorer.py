# GEQS - Global Extraction Quality Score
# Comprehensive quality assessment for OCR extraction results

import re
import math
import sys
from datetime import datetime
from typing import Dict, List, Tuple, Optional, Any
from dataclasses import dataclass
import json

@dataclass
class FieldConfidence:
    """Represents confidence data for a single field"""
    field_name: str
    confidence: float
    value: Any
    importance_weight: float = 1.0

@dataclass
class GEQSResult:
    """Complete GEQS scoring result"""
    total_score: float
    cfc_score: float  # Calibrated Field Confidence
    cov_score: float  # Coverage & Completeness
    cons_score: float  # Consistency Checks
    msa_score: float  # Multi-Signal Agreement
    ilq_score: float  # Image & Layout Quality
    recommendation: str
    details: Dict[str, Any]

class GEQSScorer:
    """
    Global Extraction Quality Score calculator
    Provides 0-100 score summarizing OCR extraction trustworthiness
    """
    
    def __init__(self):
        # Field importance weights (higher = more important)
        self.field_weights = {
            'Total': 1.0,
            'Fecha': 0.9,
            'ID_Ticket': 0.8,
            'Comercio': 0.7,
            'Mesa_Folio': 0.6,
            'Store_Branch_Plaza': 0.5,
            'Payment_Type': 0.4,
            'TC#': 0.3,
            'ID': 0.3,
            'TR#': 0.3,
            'Fol_Vta': 0.3,
            'Register_Station_Terminal': 0.2,
            'Card_Last_4_Digits': 0.2
        }
        
        # Required fields for coverage calculation
        self.required_fields = ['Total', 'Fecha', 'ID_Ticket', 'Comercio']
        
        # GEQS component weights (must sum to 1.0)
        self.component_weights = {
            'CFC': 0.45,  # Calibrated Field Confidence
            'COV': 0.20,  # Coverage & Completeness
            'CONS': 0.20, # Consistency Checks
            'MSA': 0.10,  # Multi-Signal Agreement
            'ILQ': 0.05   # Image & Layout Quality
        }
        
        # Default thresholds
        self.thresholds = {
            'auto_approve': 85,
            'soft_approve': 70,
            'human_review': 70
        }

    def calculate_geqs(self, extracted_data: Dict[str, Any], raw_text: str = "", 
                      azure_confidence: Optional[Dict[str, float]] = None) -> GEQSResult:
        """
        Calculate complete GEQS score for extracted data
        
        Args:
            extracted_data: Dictionary of extracted field values
            raw_text: Raw OCR text for analysis
            azure_confidence: Optional Azure confidence scores per field
            
        Returns:
            GEQSResult with complete scoring breakdown
        """
        print(f"[GEQS] Calculating quality score for {len(extracted_data)} fields", file=sys.stderr)
        
        # Calculate each component
        cfc_score = self._calculate_cfc(extracted_data, azure_confidence)
        cov_score = self._calculate_cov(extracted_data)
        cons_score = self._calculate_cons(extracted_data)
        msa_score = self._calculate_msa(extracted_data, raw_text)
        ilq_score = self._calculate_ilq(raw_text, extracted_data)
        
        # Calculate weighted total
        total_score = (
            self.component_weights['CFC'] * cfc_score +
            self.component_weights['COV'] * cov_score +
            self.component_weights['CONS'] * cons_score +
            self.component_weights['MSA'] * msa_score +
            self.component_weights['ILQ'] * ilq_score
        ) * 100  # Convert to 0-100 scale
        
        # Determine recommendation
        recommendation = self._get_recommendation(total_score)
        
        # Prepare detailed breakdown
        details = {
            'field_confidences': self._get_field_confidences(extracted_data, azure_confidence),
            'missing_required_fields': self._get_missing_required_fields(extracted_data),
            'consistency_issues': self._get_consistency_issues(extracted_data),
            'multi_signal_agreement': self._get_msa_details(extracted_data, raw_text),
            'image_quality_metrics': self._get_ilq_details(raw_text, extracted_data)
        }
        
        return GEQSResult(
            total_score=round(total_score, 2),
            cfc_score=round(cfc_score * 100, 2),
            cov_score=round(cov_score * 100, 2),
            cons_score=round(cons_score * 100, 2),
            msa_score=round(msa_score * 100, 2),
            ilq_score=round(ilq_score * 100, 2),
            recommendation=recommendation,
            details=details
        )

    def _calculate_cfc(self, extracted_data: Dict[str, Any], 
                      azure_confidence: Optional[Dict[str, float]] = None) -> float:
        """
        Calibrated Field Confidence - Maps Azure confidences to realistic probabilities
        Weighted by field importance
        """
        if not azure_confidence:
            # Estimate confidence based on field presence and value quality
            return self._estimate_field_confidence(extracted_data)
        
        weighted_confidence = 0.0
        total_weight = 0.0
        
        for field_name, value in extracted_data.items():
            if field_name in self.field_weights and value and str(value).strip() != "N/A":
                weight = self.field_weights[field_name]
                confidence = azure_confidence.get(field_name, 0.5)  # Default 50% if not provided
                
                # Calibrate confidence (simple monotone mapping for now)
                calibrated_confidence = self._calibrate_confidence(confidence)
                
                weighted_confidence += calibrated_confidence * weight
                total_weight += weight
        
        return weighted_confidence / total_weight if total_weight > 0 else 0.0

    def _calculate_cov(self, extracted_data: Dict[str, Any]) -> float:
        """
        Coverage & Completeness - Percent of required fields present
        """
        present_fields = 0
        total_required = len(self.required_fields)
        
        for field in self.required_fields:
            if (field in extracted_data and 
                extracted_data[field] and 
                str(extracted_data[field]).strip() not in ["", "N/A", "None"]):
                present_fields += 1
        
        return present_fields / total_required if total_required > 0 else 0.0

    def _calculate_cons(self, extracted_data: Dict[str, Any]) -> float:
        """
        Consistency Checks - Math and format sanity checks
        """
        consistency_score = 0.0
        total_checks = 0
        
        # Check 1: Total amount format (should be numeric)
        total_value = extracted_data.get('Total', '')
        if total_value and str(total_value).strip() not in ["", "N/A"]:
            total_checks += 1
            if self._is_valid_amount(total_value):
                consistency_score += 1.0
        
        # Check 2: Date format validation
        fecha_value = extracted_data.get('Fecha', '')
        if fecha_value and str(fecha_value).strip() not in ["", "N/A"]:
            total_checks += 1
            if self._is_valid_date(fecha_value):
                consistency_score += 1.0
        
        # Check 3: Ticket ID format (should contain numbers)
        ticket_id = extracted_data.get('ID_Ticket', '')
        if ticket_id and str(ticket_id).strip() not in ["", "N/A"]:
            total_checks += 1
            if self._is_valid_ticket_id(ticket_id):
                consistency_score += 1.0
        
        # Check 4: Merchant name presence
        comercio = extracted_data.get('Comercio', '')
        if comercio and str(comercio).strip() not in ["", "N/A"]:
            total_checks += 1
            if len(str(comercio).strip()) > 2:  # Reasonable merchant name length
                consistency_score += 1.0
        
        return consistency_score / total_checks if total_checks > 0 else 0.0

    def _calculate_msa(self, extracted_data: Dict[str, Any], raw_text: str) -> float:
        """
        Multi-Signal Agreement - Agreement between Azure and secondary extractors
        """
        if not raw_text:
            return 0.5  # Neutral score if no raw text available
        
        agreement_score = 0.0
        total_comparisons = 0
        
        # Compare Total amount
        azure_total = extracted_data.get('Total', '')
        if azure_total and str(azure_total).strip() not in ["", "N/A"]:
            total_comparisons += 1
            regex_total = self._extract_total_regex(raw_text)
            if regex_total and self._values_agree(azure_total, regex_total):
                agreement_score += 1.0
        
        # Compare Date
        azure_date = extracted_data.get('Fecha', '')
        if azure_date and str(azure_date).strip() not in ["", "N/A"]:
            total_comparisons += 1
            regex_date = self._extract_date_regex(raw_text)
            if regex_date and self._dates_agree(azure_date, regex_date):
                agreement_score += 1.0
        
        # Compare Merchant
        azure_merchant = extracted_data.get('Comercio', '')
        if azure_merchant and str(azure_merchant).strip() not in ["", "N/A"]:
            total_comparisons += 1
            regex_merchant = self._extract_merchant_regex(raw_text)
            if regex_merchant and self._merchants_agree(azure_merchant, regex_merchant):
                agreement_score += 1.0
        
        return agreement_score / total_comparisons if total_comparisons > 0 else 0.5

    def _calculate_ilq(self, raw_text: str, extracted_data: Dict[str, Any]) -> float:
        """
        Image & Layout Quality - Quick proxies for image quality
        """
        if not raw_text:
            return 0.0
        
        quality_score = 0.0
        total_metrics = 0
        
        # Metric 1: Text density (reasonable amount of text)
        text_length = len(raw_text.strip())
        total_metrics += 1
        if text_length > 100:  # Minimum reasonable text length
            quality_score += 1.0
        elif text_length > 50:
            quality_score += 0.5
        
        # Metric 2: Presence of key patterns (numbers, dates, currency)
        total_metrics += 1
        pattern_score = 0
        if re.search(r'\d+\.\d{2}', raw_text):  # Currency pattern
            pattern_score += 0.33
        if re.search(r'\d{1,2}[/-]\d{1,2}[/-]\d{2,4}', raw_text):  # Date pattern
            pattern_score += 0.33
        if re.search(r'\d{4,}', raw_text):  # Long number (ticket ID)
            pattern_score += 0.34
        quality_score += pattern_score
        
        # Metric 3: Field extraction success rate
        total_metrics += 1
        extracted_fields = sum(1 for v in extracted_data.values() 
                             if v and str(v).strip() not in ["", "N/A"])
        total_fields = len(extracted_data)
        if total_fields > 0:
            extraction_rate = extracted_fields / total_fields
            quality_score += extraction_rate
        
        return quality_score / total_metrics if total_metrics > 0 else 0.0

    def _calibrate_confidence(self, raw_confidence: float) -> float:
        """
        Calibrate Azure confidence to realistic probability
        Simple monotone mapping for now
        """
        # Map 0-1 confidence to more realistic 0-1 probability
        if raw_confidence < 0.5:
            return raw_confidence * 0.8  # Reduce overconfidence
        elif raw_confidence < 0.8:
            return raw_confidence * 0.9  # Slight reduction
        else:
            return min(raw_confidence * 1.1, 1.0)  # Slight boost for high confidence

    def _estimate_field_confidence(self, extracted_data: Dict[str, Any]) -> float:
        """
        Estimate confidence when Azure confidence not available
        Based on field presence and value quality
        """
        total_confidence = 0.0
        total_weight = 0.0
        
        for field_name, value in extracted_data.items():
            if field_name in self.field_weights and value and str(value).strip() not in ["", "N/A"]:
                weight = self.field_weights[field_name]
                
                # Estimate confidence based on value characteristics
                confidence = 0.5  # Base confidence
                
                # Boost confidence for well-formatted values
                if field_name == 'Total' and self._is_valid_amount(value):
                    confidence = 0.8
                elif field_name == 'Fecha' and self._is_valid_date(value):
                    confidence = 0.8
                elif field_name == 'ID_Ticket' and self._is_valid_ticket_id(value):
                    confidence = 0.7
                elif field_name == 'Comercio' and len(str(value).strip()) > 3:
                    confidence = 0.7
                
                total_confidence += confidence * weight
                total_weight += weight
        
        return total_confidence / total_weight if total_weight > 0 else 0.0

    def _is_valid_amount(self, value: Any) -> bool:
        """Check if value is a valid monetary amount"""
        try:
            str_val = str(value).strip()
            # Remove currency symbols and spaces
            clean_val = re.sub(r'[^\d.,]', '', str_val)
            if not clean_val:
                return False
            # Try to parse as float
            float(clean_val.replace(',', '.'))
            return True
        except (ValueError, AttributeError):
            return False

    def _is_valid_date(self, value: Any) -> bool:
        """Check if value is a valid date format"""
        try:
            str_val = str(value).strip()
            # Check common date patterns
            date_patterns = [
                r'\d{1,2}[/-]\d{1,2}[/-]\d{2,4}',  # DD/MM/YYYY or DD-MM-YYYY
                r'\d{4}[/-]\d{1,2}[/-]\d{1,2}',    # YYYY/MM/DD or YYYY-MM-DD
            ]
            return any(re.search(pattern, str_val) for pattern in date_patterns)
        except (ValueError, AttributeError):
            return False

    def _is_valid_ticket_id(self, value: Any) -> bool:
        """Check if value looks like a valid ticket ID"""
        try:
            str_val = str(value).strip()
            # Should contain numbers and be reasonable length
            return bool(re.search(r'\d', str_val)) and 3 <= len(str_val) <= 50
        except (ValueError, AttributeError):
            return False

    def _extract_total_regex(self, text: str) -> Optional[str]:
        """Extract total amount using regex patterns"""
        patterns = [
            r'total[:\s]*\$?(\d+[.,]\d{2})',
            r'subtotal[:\s]*\$?(\d+[.,]\d{2})',
            r'amount[:\s]*\$?(\d+[.,]\d{2})',
            r'\$(\d+[.,]\d{2})',
            r'(\d+[.,]\d{2})\s*pesos?',
        ]
        
        for pattern in patterns:
            match = re.search(pattern, text, re.IGNORECASE)
            if match:
                return match.group(1)
        return None

    def _extract_date_regex(self, text: str) -> Optional[str]:
        """Extract date using regex patterns"""
        patterns = [
            r'(\d{1,2}[/-]\d{1,2}[/-]\d{2,4})',
            r'(\d{4}[/-]\d{1,2}[/-]\d{1,2})',
        ]
        
        for pattern in patterns:
            match = re.search(pattern, text)
            if match:
                return match.group(1)
        return None

    def _extract_merchant_regex(self, text: str) -> Optional[str]:
        """Extract merchant name using regex patterns"""
        # Look for common merchant patterns
        patterns = [
            r'(walmart|oxxo|soriana|chedraui|costco)',
            r'merchant[:\s]*([a-zA-Z\s]+)',
            r'store[:\s]*([a-zA-Z\s]+)',
        ]
        
        for pattern in patterns:
            match = re.search(pattern, text, re.IGNORECASE)
            if match:
                return match.group(1).strip()
        return None

    def _values_agree(self, val1: Any, val2: Any) -> bool:
        """Check if two values agree (within tolerance for numbers)"""
        try:
            # Clean and convert to float for comparison
            clean1 = float(str(val1).replace(',', '.').replace('$', '').strip())
            clean2 = float(str(val2).replace(',', '.').replace('$', '').strip())
            return abs(clean1 - clean2) < 0.01  # 1 cent tolerance
        except (ValueError, AttributeError):
            return str(val1).strip().lower() == str(val2).strip().lower()

    def _dates_agree(self, date1: Any, date2: Any) -> bool:
        """Check if two dates agree (normalize format first)"""
        try:
            # Simple string comparison after normalization
            norm1 = str(date1).strip().replace('-', '/')
            norm2 = str(date2).strip().replace('-', '/')
            return norm1 == norm2
        except (ValueError, AttributeError):
            return False

    def _merchants_agree(self, merchant1: Any, merchant2: Any) -> bool:
        """Check if two merchant names agree"""
        try:
            return str(merchant1).strip().lower() == str(merchant2).strip().lower()
        except (ValueError, AttributeError):
            return False

    def _get_recommendation(self, score: float) -> str:
        """Get recommendation based on GEQS score"""
        if score >= self.thresholds['auto_approve']:
            return "Auto-approve extraction"
        elif score >= self.thresholds['soft_approve']:
            return "Soft-approve; flag for value-sensitive documents"
        else:
            return "Human review required; consider better image capture"

    def _get_field_confidences(self, extracted_data: Dict[str, Any], 
                              azure_confidence: Optional[Dict[str, float]] = None) -> Dict[str, float]:
        """Get confidence scores for each field with nuanced scoring"""
        confidences = {}
        for field_name, value in extracted_data.items():
            if field_name in self.field_weights:
                if azure_confidence and field_name in azure_confidence:
                    # Use Azure confidence if available
                    confidences[field_name] = azure_confidence[field_name]
                else:
                    # Calculate nuanced confidence based on field characteristics
                    if value and str(value).strip() not in ["", "N/A"]:
                        confidences[field_name] = self._calculate_field_confidence(field_name, value)
                    else:
                        confidences[field_name] = 0.0
        return confidences

    def _calculate_field_confidence(self, field_name: str, value: Any) -> float:
        """Calculate nuanced confidence score for a field based on its characteristics"""
        value_str = str(value).strip()
        
        # Base confidence starts at 0.5
        confidence = 0.5
        
        # Field-specific validation and confidence adjustment
        if field_name == 'Total':
            if self._is_valid_amount(value_str):
                confidence = 0.95  # Very high confidence for valid amounts
            elif re.match(r'^\d+\.?\d*$', value_str):
                confidence = 0.85  # High confidence for numeric values
            else:
                confidence = 0.5  # Medium confidence for invalid amounts
                
        elif field_name == 'Fecha':
            if self._is_valid_date(value_str):
                confidence = 0.95  # Very high confidence for valid dates
            elif re.match(r'\d{1,2}[/-]\d{1,2}[/-]\d{2,4}', value_str):
                confidence = 0.75  # High confidence for date-like strings
            else:
                confidence = 0.4  # Low confidence for invalid dates
                
        elif field_name == 'ID_Ticket':
            if self._is_valid_ticket_id(value_str):
                confidence = 0.9  # Very high confidence for valid ticket IDs
            elif len(value_str) >= 10 and value_str.isdigit():
                confidence = 0.8  # High confidence for long numeric IDs
            else:
                confidence = 0.5  # Medium confidence for short/invalid IDs
                
        elif field_name == 'Comercio':
            if len(value_str) >= 3 and value_str.isalpha():
                confidence = 0.9  # Very high confidence for proper merchant names
            elif len(value_str) >= 2:
                confidence = 0.75  # High confidence for short names
            else:
                confidence = 0.4  # Low confidence for very short names
                
        elif field_name == 'Mesa_Folio':
            if re.match(r'^\d{4,6}$', value_str):
                confidence = 0.9  # Very high confidence for proper folio format
            elif value_str.isdigit():
                confidence = 0.8  # High confidence for numeric values
            else:
                confidence = 0.5  # Medium confidence for non-numeric
                
        elif field_name == 'Payment_Type':
            valid_types = ['credit', 'debit', 'cash', 'contado', 'efectivo', 'tarjeta']
            if value_str.lower() in valid_types:
                confidence = 0.95  # Very high confidence for known payment types
            elif len(value_str) >= 3:
                confidence = 0.75  # High confidence for other strings
            else:
                confidence = 0.4  # Low confidence for short strings
                
        elif field_name in ['TC#', 'TR#']:
            if re.match(r'^\d{10,25}$', value_str):  # Extended range to 25 digits
                confidence = 0.9  # Very high confidence for proper transaction numbers
            elif len(value_str) >= 10 and value_str.isdigit():
                confidence = 0.85  # High confidence for long numeric values
            elif value_str.isdigit():
                confidence = 0.8  # High confidence for numeric values
            else:
                confidence = 0.5  # Medium confidence for non-numeric
                
        elif field_name in ['Store_Branch_Plaza', 'Register_Station_Terminal', 'Card_Last_4_Digits']:
            if value_str and value_str != "N/A":
                confidence = 0.7  # Medium confidence for present values
            else:
                confidence = 0.0  # No confidence for missing values
                
        else:
            # Default confidence based on value quality
            if len(value_str) >= 5:
                confidence = 0.7  # Medium confidence for substantial values
            elif len(value_str) >= 2:
                confidence = 0.5  # Low-medium confidence for short values
            else:
                confidence = 0.3  # Low confidence for very short values
        
        # Apply slight importance weight adjustment (less aggressive)
        importance_weight = self.field_weights.get(field_name, 0.5)
        # Only apply a small adjustment based on importance
        if importance_weight >= 0.8:  # High importance fields
            confidence = min(1.0, confidence * 1.05)  # Slight boost
        elif importance_weight <= 0.3:  # Low importance fields
            confidence = confidence * 0.95  # Slight reduction
        
        # Ensure confidence is within bounds
        return max(0.0, min(1.0, confidence))

    def _get_missing_required_fields(self, extracted_data: Dict[str, Any]) -> List[str]:
        """Get list of missing required fields"""
        missing = []
        for field in self.required_fields:
            if (field not in extracted_data or 
                not extracted_data[field] or 
                str(extracted_data[field]).strip() in ["", "N/A"]):
                missing.append(field)
        return missing

    def _get_consistency_issues(self, extracted_data: Dict[str, Any]) -> List[str]:
        """Get list of consistency issues found"""
        issues = []
        
        total_value = extracted_data.get('Total', '')
        if total_value and not self._is_valid_amount(total_value):
            issues.append(f"Invalid total amount format: {total_value}")
        
        fecha_value = extracted_data.get('Fecha', '')
        if fecha_value and not self._is_valid_date(fecha_value):
            issues.append(f"Invalid date format: {fecha_value}")
        
        ticket_id = extracted_data.get('ID_Ticket', '')
        if ticket_id and not self._is_valid_ticket_id(ticket_id):
            issues.append(f"Invalid ticket ID format: {ticket_id}")
        
        return issues

    def _get_msa_details(self, extracted_data: Dict[str, Any], raw_text: str) -> Dict[str, Any]:
        """Get detailed multi-signal agreement analysis"""
        details = {
            'total_agreement': False,
            'date_agreement': False,
            'merchant_agreement': False,
            'regex_extractions': {}
        }
        
        if raw_text:
            details['regex_extractions']['total'] = self._extract_total_regex(raw_text)
            details['regex_extractions']['date'] = self._extract_date_regex(raw_text)
            details['regex_extractions']['merchant'] = self._extract_merchant_regex(raw_text)
            
            # Check agreements
            azure_total = extracted_data.get('Total', '')
            if azure_total and details['regex_extractions']['total']:
                details['total_agreement'] = self._values_agree(azure_total, details['regex_extractions']['total'])
            
            azure_date = extracted_data.get('Fecha', '')
            if azure_date and details['regex_extractions']['date']:
                details['date_agreement'] = self._dates_agree(azure_date, details['regex_extractions']['date'])
            
            azure_merchant = extracted_data.get('Comercio', '')
            if azure_merchant and details['regex_extractions']['merchant']:
                details['merchant_agreement'] = self._merchants_agree(azure_merchant, details['regex_extractions']['merchant'])
        
        return details

    def _get_ilq_details(self, raw_text: str, extracted_data: Dict[str, Any]) -> Dict[str, Any]:
        """Get detailed image and layout quality metrics"""
        details = {
            'text_length': len(raw_text) if raw_text else 0,
            'extraction_rate': 0.0,
            'pattern_matches': {
                'currency': bool(re.search(r'\d+\.\d{2}', raw_text)) if raw_text else False,
                'date': bool(re.search(r'\d{1,2}[/-]\d{1,2}[/-]\d{2,4}', raw_text)) if raw_text else False,
                'ticket_id': bool(re.search(r'\d{4,}', raw_text)) if raw_text else False
            }
        }
        
        if extracted_data:
            extracted_fields = sum(1 for v in extracted_data.values() 
                                 if v and str(v).strip() not in ["", "N/A"])
            total_fields = len(extracted_data)
            details['extraction_rate'] = extracted_fields / total_fields if total_fields > 0 else 0.0
        
        return details

# Convenience function for easy integration
def calculate_geqs_score(extracted_data: Dict[str, Any], raw_text: str = "", 
                        azure_confidence: Optional[Dict[str, float]] = None) -> GEQSResult:
    """
    Convenience function to calculate GEQS score
    
    Args:
        extracted_data: Dictionary of extracted field values
        raw_text: Raw OCR text for analysis
        azure_confidence: Optional Azure confidence scores per field
        
    Returns:
        GEQSResult with complete scoring breakdown
    """
    scorer = GEQSScorer()
    return scorer.calculate_geqs(extracted_data, raw_text, azure_confidence)

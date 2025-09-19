"""
Azure-Aligned Confidence Scorer for Ticket Field Extraction
This module provides confidence scoring that aligns with Azure Document Intelligence's methodologies.

The scorer evaluates both Azure's native field extractions and custom field extractions,
providing confidence scores similar to what Azure Document Intelligence Studio displays.
"""

import sys
import re
import json
from typing import Dict, List, Optional, Tuple, Any, Union
from dataclasses import dataclass, field
from collections import Counter
from enum import Enum


class ConfidenceLevel(Enum):
    """Confidence level classifications matching Azure's standards."""
    HIGH = "high"      # 80-100%
    MEDIUM = "medium"  # 50-79%
    LOW = "low"        # 0-49%
    UNKNOWN = "unknown"  # No confidence data available


@dataclass
class FieldConfidence:
    """Represents confidence data for a single field."""
    field_name: str
    value: str
    confidence: float
    source: str  # 'azure_native', 'custom_extraction', 'pattern_validation'
    level: ConfidenceLevel
    validation_boosts: List[str] = field(default_factory=list)
    ocr_word_confidences: List[float] = field(default_factory=list)
    
    def __post_init__(self):
        """Calculate confidence level based on score."""
        if self.confidence >= 0.8:
            self.level = ConfidenceLevel.HIGH
        elif self.confidence >= 0.5:
            self.level = ConfidenceLevel.MEDIUM
        elif self.confidence >= 0.0:
            self.level = ConfidenceLevel.LOW
        else:
            self.level = ConfidenceLevel.UNKNOWN


@dataclass
class DocumentConfidenceReport:
    """Comprehensive confidence report for a document."""
    overall_confidence: float
    total_fields: int
    high_confidence_fields: int
    medium_confidence_fields: int
    low_confidence_fields: int
    field_confidences: Dict[str, FieldConfidence]
    confidence_sources: int
    azure_extracted_fields: Dict[str, Any] = field(default_factory=dict)
    custom_extracted_fields: Dict[str, Any] = field(default_factory=dict)
    
    def get_confidence_breakdown(self) -> Dict[str, Any]:
        """Get detailed confidence breakdown."""
        return {
            'overall_confidence': round(self.overall_confidence * 100, 2),
            'total_fields': self.total_fields,
            'high_confidence': self.high_confidence_fields,
            'medium_confidence': self.medium_confidence_fields,
            'low_confidence': self.low_confidence_fields,
            'confidence_distribution': {
                'high': round((self.high_confidence_fields / max(1, self.total_fields)) * 100, 2),
                'medium': round((self.medium_confidence_fields / max(1, self.total_fields)) * 100, 2),
                'low': round((self.low_confidence_fields / max(1, self.total_fields)) * 100, 2)
            },
            'confidence_sources': self.confidence_sources
        }


class AzureAlignedConfidenceScorer:
    """
    A confidence scorer that mimics Azure Document Intelligence Studio's approach.
    
    This class provides confidence scoring for both Azure native extractions and 
    custom field extractions, following Azure's confidence scoring methodologies.
    """
    
    def __init__(self):
        """Initialize the confidence scorer."""
        self.azure_native_confidences: Dict[str, FieldConfidence] = {}
        self.custom_field_confidences: Dict[str, FieldConfidence] = {}
        
        # Field mapping for different ticket formats
        self.field_mappings = {
            # Core CFDI fields
            'merchant_name': ['Comercio', 'comercio', 'MerchantName'],
            'transaction_date': ['Fecha', 'fecha', 'TransactionDate'],
            'total_amount': ['Total', 'total'],
            'ticket_id': ['ID_Ticket', 'id_ticket', 'ID'],
            'folio': ['Mesa_Folio', 'mesa_folio', 'Fol_Vta', 'folio_venta'],
            
            # Vendor-specific fields
            'tc_number': ['TC#', 'tc_number'],
            'tr_number': ['TR#', 'tr_number'],
            'store_info': ['Store_Branch_Plaza', 'store_branch_plaza'],
            'register_info': ['Register_Station_Terminal', 'register_station_terminal'],
            'payment_type': ['Payment_Type', 'payment_type'],
            'card_digits': ['Card_Last_4_Digits', 'card_last_4_digits']
        }
        
        # Validation patterns for different field types
        self.validation_patterns = {
            'date': [
                r'\d{2}/\d{2}/\d{4}',  # DD/MM/YYYY
                r'\d{4}-\d{2}-\d{2}',  # YYYY-MM-DD
                r'\d{2}-\d{2}-\d{4}',  # DD-MM-YYYY
            ],
            'amount': [
                r'^\d+\.?\d*$',        # Numeric amount
                r'^\$?\d+\.?\d*$',     # Amount with optional $
            ],
            'ticket_number': [
                r'^\d{8,}$',           # 8+ digit numbers
                r'^\d+\s+\d+\s+\d+',   # Grouped numbers
            ],
            'card_digits': [
                r'^\d{4}$',            # Exactly 4 digits
            ]
        }
    
    def extract_azure_native_confidence(self, receipt_result: Any, read_result: Any) -> Dict[str, FieldConfidence]:
        """
        Extract all native confidence scores from Azure Document Intelligence.
        This mirrors what Azure Studio shows in its interface.
        """
        print(f"[CONFIDENCE] Extracting Azure native confidence scores", file=sys.stderr)
        confidence_data = {}
        
        # Extract receipt model field confidences
        if receipt_result and hasattr(receipt_result, 'documents') and receipt_result.documents:
            try:
                for document in receipt_result.documents:
                    if hasattr(document, 'fields') and document.fields:
                        for field_name, field_obj in document.fields.items():
                            if hasattr(field_obj, 'confidence') and field_obj.confidence is not None:
                                # Extract field value
                                field_value = self._extract_field_value(field_obj)
                                
                                confidence_data[field_name] = FieldConfidence(
                                    field_name=field_name,
                                    value=str(field_value) if field_value else "",
                                    confidence=float(field_obj.confidence),
                                    source='azure_native',
                                    level=ConfidenceLevel.UNKNOWN  # Will be set in __post_init__
                                )
                                
                            # Handle nested fields (like Items in receipts)
                            if hasattr(field_obj, 'value_array') and field_obj.value_array:
                                for idx, item in enumerate(field_obj.value_array):
                                    if hasattr(item, 'value_object') and item.value_object:
                                        for sub_field_name, sub_field in item.value_object.items():
                                            if hasattr(sub_field, 'confidence') and sub_field.confidence is not None:
                                                key = f"{field_name}[{idx}].{sub_field_name}"
                                                sub_value = self._extract_field_value(sub_field)
                                                
                                                confidence_data[key] = FieldConfidence(
                                                    field_name=key,
                                                    value=str(sub_value) if sub_value else "",
                                                    confidence=float(sub_field.confidence),
                                                    source='azure_native',
                                                    level=ConfidenceLevel.UNKNOWN
                                                )
            except Exception as e:
                print(f"[CONFIDENCE] Error extracting Azure native confidence: {e}", file=sys.stderr)
        else:
            print(f"[CONFIDENCE] No Azure receipt result or documents available", file=sys.stderr)
        
        print(f"[CONFIDENCE] Extracted {len(confidence_data)} Azure native fields", file=sys.stderr)
        return confidence_data
    
    def _extract_field_value(self, field_obj: Any) -> Any:
        """Extract the actual value from an Azure field object."""
        if hasattr(field_obj, 'value_string') and field_obj.value_string:
            return field_obj.value_string
        elif hasattr(field_obj, 'value_date') and field_obj.value_date:
            return field_obj.value_date.strftime("%d/%m/%Y")
        elif hasattr(field_obj, 'value_currency') and field_obj.value_currency:
            return field_obj.value_currency.amount
        elif hasattr(field_obj, 'value_number') and field_obj.value_number is not None:
            return field_obj.value_number
        else:
            return None
    
    def calculate_extraction_confidence(self, extracted_value: str, 
                                      word_confidences: List[float], 
                                      read_result: Any,
                                      field_type: str = 'generic') -> float:
        """
        Calculate Azure-style confidence for custom extracted fields.
        This uses the underlying OCR confidence of the words that make up the extracted value.
        """
        if not extracted_value or extracted_value == "N/A":
            return 0.0
        
        # Find matching word confidences from read result
        matching_confidences = self._find_word_confidences(extracted_value, read_result)
        
        if matching_confidences:
            # Base confidence from OCR word recognition
            base_confidence = sum(matching_confidences) / len(matching_confidences)
        else:
            # Fallback confidence based on field type and validation
            base_confidence = 0.3
        
        # Apply validation boost
        validation_boost = self._calculate_validation_boost(extracted_value, field_type)
        
        # Combine confidences
        final_confidence = min(1.0, max(0.0, base_confidence + validation_boost))
        
        print(f"[CONFIDENCE] Field '{extracted_value}' -> base: {base_confidence:.3f}, boost: {validation_boost:.3f}, final: {final_confidence:.3f}", file=sys.stderr)
        
        return final_confidence
    
    def _find_word_confidences(self, extracted_value: str, read_result: Any) -> List[float]:
        """Find OCR word confidences for the extracted value."""
        if not read_result or not hasattr(read_result, 'pages') or not read_result.pages:
            return []
        
        value_words = extracted_value.lower().strip().split()
        matching_confidences = []
        
        try:
            for page in read_result.pages:
                if hasattr(page, 'lines') and page.lines:
                    for line in page.lines:
                        if hasattr(line, 'content') and line.content:
                            line_text = line.content.lower()
                            
                            # Check if our extracted value appears in this line
                            if any(word in line_text for word in value_words if len(word) > 2):
                                if hasattr(line, 'words') and line.words:
                                    for word in line.words:
                                        if hasattr(word, 'content') and hasattr(word, 'confidence'):
                                            word_content = word.content.lower().strip()
                                            if word_content in value_words:
                                                matching_confidences.append(word.confidence)
        except Exception as e:
            print(f"[CONFIDENCE] Error finding word confidences: {e}", file=sys.stderr)
        
        return matching_confidences
    
    def _calculate_validation_boost(self, value: str, field_type: str) -> float:
        """Calculate validation boost based on pattern matching and field type."""
        boost = 0.0
        
        # Pattern-based validation
        if field_type in self.validation_patterns:
            for pattern in self.validation_patterns[field_type]:
                if re.match(pattern, value, re.IGNORECASE):
                    boost += 0.1
                    break
        
        # Length-based validation
        if field_type == 'ticket_number' and len(value) >= 12:
            boost += 0.05
        elif field_type == 'amount' and '.' in value:
            boost += 0.05
        elif field_type == 'date' and len(value) == 10:
            boost += 0.05
        
        # Format consistency validation
        if field_type == 'card_digits' and value.isdigit() and len(value) == 4:
            boost += 0.15
        
        return min(0.2, boost)  # Cap boost at 0.2
    
    def add_azure_native_field(self, field_name: str, value: Any, confidence: float):
        """Add a field that Azure natively extracted with its confidence."""
        self.azure_native_confidences[field_name] = FieldConfidence(
            field_name=field_name,
            value=str(value) if value is not None else "",
            confidence=float(confidence),
            source='azure_native',
            level=ConfidenceLevel.UNKNOWN  # Set in __post_init__
        )
    
    def add_custom_extracted_field(self, field_name: str, value: str, 
                                 ocr_confidence: float, validation_boost: float = 0.0,
                                 field_type: str = 'generic'):
        """
        Add a field we extracted ourselves with OCR-based confidence.
        
        Args:
            field_name: Name of the field
            value: Extracted value
            ocr_confidence: Confidence based on OCR word recognition
            validation_boost: Additional confidence if the value passes validation rules
            field_type: Type of field for specialized validation
        """
        # Combine OCR confidence with validation boost
        final_confidence = max(0.0, min(1.0, ocr_confidence + validation_boost))
        
        validation_reasons = []
        if validation_boost > 0:
            validation_reasons.append(f"pattern_match_+{validation_boost:.2f}")
        
        self.custom_field_confidences[field_name] = FieldConfidence(
            field_name=field_name,
            value=value,
            confidence=final_confidence,
            source='custom_extraction',
            level=ConfidenceLevel.UNKNOWN,  # Set in __post_init__
            validation_boosts=validation_reasons
        )
    
    def get_field_confidence(self, field_name: str) -> float:
        """Get the confidence for a specific field, preferring Azure native when available."""
        # Check mapped field names
        for mapped_names in self.field_mappings.values():
            if field_name in mapped_names:
                # Try to find in Azure native first
                for azure_field in self.azure_native_confidences:
                    if azure_field in mapped_names:
                        return self.azure_native_confidences[azure_field].confidence
        
        # Direct field name lookup
        if field_name in self.azure_native_confidences:
            return self.azure_native_confidences[field_name].confidence
        
        if field_name in self.custom_field_confidences:
            return self.custom_field_confidences[field_name].confidence
        
        return 0.0
    
    def generate_confidence_report(self) -> DocumentConfidenceReport:
        """Generate a comprehensive confidence report similar to Azure Studio's output."""
        all_fields = {**self.azure_native_confidences, **self.custom_field_confidences}
        
        if not all_fields:
            return DocumentConfidenceReport(
                overall_confidence=0.0,
                total_fields=0,
                high_confidence_fields=0,
                medium_confidence_fields=0,
                low_confidence_fields=0,
                field_confidences={},
                confidence_sources=0
            )
        
        # Count confidence levels
        high_count = sum(1 for f in all_fields.values() if f.level == ConfidenceLevel.HIGH)
        medium_count = sum(1 for f in all_fields.values() if f.level == ConfidenceLevel.MEDIUM)
        low_count = sum(1 for f in all_fields.values() if f.level == ConfidenceLevel.LOW)
        
        # Calculate overall confidence (weighted average)
        total_confidence = sum(f.confidence for f in all_fields.values())
        overall_confidence = total_confidence / len(all_fields)
        
        # Separate Azure and custom fields for report
        azure_fields = {k: {
            'value': v.value,
            'confidence': round(v.confidence * 100, 2),
            'level': v.level.value
        } for k, v in self.azure_native_confidences.items()}
        
        custom_fields = {k: {
            'value': v.value,
            'confidence': round(v.confidence * 100, 2),
            'level': v.level.value,
            'validation_boosts': v.validation_boosts
        } for k, v in self.custom_field_confidences.items()}
        
        return DocumentConfidenceReport(
            overall_confidence=overall_confidence,
            total_fields=len(all_fields),
            high_confidence_fields=high_count,
            medium_confidence_fields=medium_count,
            low_confidence_fields=low_count,
            field_confidences=all_fields,
            confidence_sources=len(set(f.source for f in all_fields.values())),
            azure_extracted_fields=azure_fields,
            custom_extracted_fields=custom_fields
        )
    
    def score_ticket_fields(self, ticket_data: Dict[str, Any], 
                          azure_receipt_result: Any = None,
                          azure_read_result: Any = None) -> Dict[str, Any]:
        """
        Score all fields in a ticket, combining Azure native and custom extraction confidences.
        
        Args:
            ticket_data: Dictionary containing extracted ticket fields
            azure_receipt_result: Azure receipt analysis result
            azure_read_result: Azure read analysis result
            
        Returns:
            Dictionary with confidence scores added to each field
        """
        print(f"[CONFIDENCE] Scoring ticket fields for {len(ticket_data)} fields", file=sys.stderr)
        
        # Clear previous data
        self.azure_native_confidences.clear()
        self.custom_field_confidences.clear()
        
        # Extract Azure native confidences if available
        if azure_receipt_result:
            azure_confidences = self.extract_azure_native_confidence(azure_receipt_result, azure_read_result)
            self.azure_native_confidences.update(azure_confidences)
        
        # Process each field in the ticket data
        scored_ticket = {}
        for field_name, field_value in ticket_data.items():
            if field_name.endswith('_Confidence') or field_name in ['raw_text', 'Full_Raw_Text', 'vendor_type', 'extraction_method']:
                # Skip confidence fields and metadata
                scored_ticket[field_name] = field_value
                continue
            
            # Determine field type for validation
            field_type = self._determine_field_type(field_name)
            
            # Calculate confidence for this field
            confidence = self._calculate_field_confidence(
                field_name, str(field_value) if field_value else "", 
                field_type, azure_read_result
            )
            
            # Add to scored ticket
            scored_ticket[field_name] = field_value
            scored_ticket[f"{field_name}_Confidence"] = round(confidence * 100, 2)
        
        # Generate overall confidence report
        confidence_report = self.generate_confidence_report()
        
        # Add confidence metadata
        scored_ticket['overall_document_confidence'] = round(confidence_report.overall_confidence * 100, 2)
        scored_ticket['total_confidence_sources'] = confidence_report.confidence_sources
        scored_ticket['confidence_breakdown'] = confidence_report.get_confidence_breakdown()
        
        print(f"[CONFIDENCE] Scoring complete - Overall: {scored_ticket['overall_document_confidence']:.1f}%", file=sys.stderr)
        
        return scored_ticket
    
    def _determine_field_type(self, field_name: str) -> str:
        """Determine the field type for validation purposes."""
        field_name_lower = field_name.lower()
        
        if 'fecha' in field_name_lower or 'date' in field_name_lower:
            return 'date'
        elif 'total' in field_name_lower or 'amount' in field_name_lower:
            return 'amount'
        elif 'ticket' in field_name_lower or 'id' in field_name_lower or 'folio' in field_name_lower:
            return 'ticket_number'
        elif 'card' in field_name_lower and 'digit' in field_name_lower:
            return 'card_digits'
        else:
            return 'generic'
    
    def _calculate_field_confidence(self, field_name: str, field_value: str, 
                                  field_type: str, read_result: Any) -> float:
        """Calculate confidence for a specific field."""
        # Check if we have Azure native confidence for this field
        azure_confidence = self._get_azure_confidence_for_field(field_name)
        if azure_confidence is not None:
            return azure_confidence
        
        # Calculate custom extraction confidence
        word_confidences = self._find_word_confidences(field_value, read_result)
        ocr_confidence = sum(word_confidences) / len(word_confidences) if word_confidences else 0.3
        
        validation_boost = self._calculate_validation_boost(field_value, field_type)
        
        final_confidence = min(1.0, max(0.0, ocr_confidence + validation_boost))
        
        # Add to custom fields tracking
        self.add_custom_extracted_field(field_name, field_value, ocr_confidence, validation_boost, field_type)
        
        return final_confidence
    
    def _get_azure_confidence_for_field(self, field_name: str) -> Optional[float]:
        """Get Azure native confidence for a field if available."""
        # Direct match
        if field_name in self.azure_native_confidences:
            return self.azure_native_confidences[field_name].confidence
        
        # Check field mappings
        for mapped_names in self.field_mappings.values():
            if field_name in mapped_names:
                for azure_field in self.azure_native_confidences:
                    if azure_field in mapped_names:
                        return self.azure_native_confidences[azure_field].confidence
        
        # Check for common Azure field names
        azure_field_map = {
            'Comercio': 'MerchantName',
            'comercio': 'MerchantName',
            'Fecha': 'TransactionDate',
            'fecha': 'TransactionDate',
            'Total': 'Total',
            'total': 'Total'
        }
        
        if field_name in azure_field_map:
            azure_field = azure_field_map[field_name]
            if azure_field in self.azure_native_confidences:
                return self.azure_native_confidences[azure_field].confidence
        
        return None

import os
import sys
import textwrap
from typing import Dict, List, Optional, Any
from dotenv import load_dotenv
import langextract as lx
from langextract.data import ExampleData, Extraction

# Load environment variables
BASE_DIR = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
env_path = os.path.join(BASE_DIR, '.env')
load_dotenv(env_path)

class LangExtractOCR:
    """
    LangExtract-based OCR service for enhanced document processing.
    Provides flexible field extraction using LLMs with custom schemas.
    """
    
    def __init__(self, model_id: str = "gemini-2.5-flash"):
        """
        Initialize LangExtract OCR service.
        
        Args:
            model_id (str): LLM model to use (default: gemini-2.5-flash)
        """
        self.model_id = model_id
        self.api_key = os.getenv("LANGEXTRACT_API_KEY")
        
        if not self.api_key:
            print("[LANGEXTRACT] Warning: LANGEXTRACT_API_KEY not found in environment", file=sys.stderr)
            print("[LANGEXTRACT] You can get a free API key from: https://aistudio.google.com/app/apikey", file=sys.stderr)
    
    def _get_receipt_extraction_prompt(self) -> str:
        """Get the prompt for receipt field extraction."""
        return textwrap.dedent("""
            Extract structured information from Mexican receipts and invoices.
            Focus on CFDI 4.0 compliant fields and common receipt information.
            
            Extract the following fields:
            1. Merchant/Store name
            2. Transaction date
            3. Total amount
            4. Subtotal
            5. Tax amount
            6. Ticket/Receipt ID
            7. Payment method
            8. Customer information (if available)
            9. RFC (tax identification) if present
            10. Fiscal regime if present
            
            Use exact text from the document. Do not paraphrase or infer values.
            Provide meaningful attributes for each extraction to add context.
            Handle Mexican currency format (MXN) and date formats (DD/MM/YYYY).
        """)
    
    def _get_receipt_examples(self) -> List[ExampleData]:
        """Get few-shot examples for receipt extraction."""
        return [
            ExampleData(
                text="WALMART MEXICO\nFecha: 15/12/2024\nTotal: $235.90\nTicket: 11122521255212552254\nPago: Mastercard",
                extractions=[
                    Extraction(
                        extraction_class="merchant_name",
                        extraction_text="WALMART MEXICO",
                        attributes={"type": "retail_store", "country": "Mexico"}
                    ),
                    Extraction(
                        extraction_class="transaction_date",
                        extraction_text="15/12/2024",
                        attributes={"format": "DD/MM/YYYY"}
                    ),
                    Extraction(
                        extraction_class="total",
                        extraction_text="$235.90",
                        attributes={"currency": "MXN", "type": "total_amount"}
                    ),
                    Extraction(
                        extraction_class="ticket_id",
                        extraction_text="11122521255212552254",
                        attributes={"type": "receipt_identifier"}
                    ),
                    Extraction(
                        extraction_class="payment_method",
                        extraction_text="Mastercard",
                        attributes={"type": "credit_card"}
                    ),
                ]
            ),
            ExampleData(
                text="COSTCO MEXICO\nFecha: 20/12/2024\nSubtotal: $1,500.00\nIVA: $240.00\nTotal: $1,740.00\nFolio: 123456789",
                extractions=[
                    Extraction(
                        extraction_class="merchant_name",
                        extraction_text="COSTCO MEXICO",
                        attributes={"type": "wholesale_store", "country": "Mexico"}
                    ),
                    Extraction(
                        extraction_class="transaction_date",
                        extraction_text="20/12/2024",
                        attributes={"format": "DD/MM/YYYY"}
                    ),
                    Extraction(
                        extraction_class="subtotal",
                        extraction_text="$1,500.00",
                        attributes={"currency": "MXN", "type": "subtotal"}
                    ),
                    Extraction(
                        extraction_class="tax",
                        extraction_text="$240.00",
                        attributes={"currency": "MXN", "type": "IVA", "rate": "16%"}
                    ),
                    Extraction(
                        extraction_class="total",
                        extraction_text="$1,740.00",
                        attributes={"currency": "MXN", "type": "total_amount"}
                    ),
                    Extraction(
                        extraction_class="ticket_id",
                        extraction_text="123456789",
                        attributes={"type": "folio_number"}
                    ),
                ]
            )
        ]
    
    def _get_cfdi_extraction_prompt(self) -> str:
        """Get the prompt for CFDI-specific field extraction."""
        return textwrap.dedent("""
            Extract CFDI 4.0 (Mexican electronic invoice) specific fields from documents.
            
            Focus on:
            1. RFC (Registro Federal de Contribuyentes) - Tax identification
            2. Fiscal regime codes (601, 603, 605, etc.)
            3. Invoice number and folio
            4. CFDI version (4.0)
            5. Payment method and form
            6. Tax breakdown (IVA, IEPS, ISR)
            7. Customer and vendor information
            8. Certification and validation data
            
            Use exact text from the document. CFDI fields are highly structured.
            Provide confidence scores and field validation where possible.
        """)
    
    def _get_cfdi_examples(self) -> List[ExampleData]:
        """Get few-shot examples for CFDI extraction."""
        return [
            ExampleData(
                text="CFDI 4.0\nRFC Emisor: XAXX010101000\nRegimen Fiscal: 601\nFolio Fiscal: A1B2C3D4-E5F6-7890-ABCD-EF1234567890\nTotal: $1,000.00",
                extractions=[
                    Extraction(
                        extraction_class="cfdi_version",
                        extraction_text="4.0",
                        attributes={"type": "cfdi_version"}
                    ),
                    Extraction(
                        extraction_class="rfc_emisor",
                        extraction_text="XAXX010101000",
                        attributes={"type": "tax_identification", "entity": "emitter"}
                    ),
                    Extraction(
                        extraction_class="fiscal_regime",
                        extraction_text="601",
                        attributes={"type": "fiscal_regime_code", "description": "General de Ley Personas Morales"}
                    ),
                    Extraction(
                        extraction_class="folio_fiscal",
                        extraction_text="A1B2C3D4-E5F6-7890-ABCD-EF1234567890",
                        attributes={"type": "fiscal_folio", "format": "UUID"}
                    ),
                    Extraction(
                        extraction_class="total",
                        extraction_text="$1,000.00",
                        attributes={"currency": "MXN", "type": "total_amount"}
                    ),
                ]
            )
        ]
    
    def extract_receipt_fields(self, text: str) -> Dict[str, Any]:
        """
        Extract receipt fields using LangExtract.
        
        Args:
            text (str): Text content from document
            
        Returns:
            Dict[str, Any]: Extracted fields with confidence scores
        """
        try:
            print(f"[LANGEXTRACT] Extracting receipt fields with {self.model_id}...", file=sys.stderr)
            
            result = lx.extract(
                text_or_documents=text,
                prompt_description=self._get_receipt_extraction_prompt(),
                examples=self._get_receipt_examples(),
                model_id=self.model_id,
                extraction_passes=2,  # Multiple passes for better recall
                max_workers=10,  # Parallel processing
                max_char_buffer=1000  # Optimal chunk size
            )
            
            # Convert extractions to structured format
            extracted_fields = {}
            confidence_scores = {}
            
            for extraction in result.extractions:
                field_name = extraction.extraction_class
                field_value = extraction.extraction_text
                confidence = getattr(extraction, 'confidence', 0.8)  # Default confidence
                
                extracted_fields[field_name] = field_value
                confidence_scores[field_name] = confidence
            
            print(f"[LANGEXTRACT] Extracted {len(extracted_fields)} fields", file=sys.stderr)
            
            return {
                "extracted_fields": extracted_fields,
                "confidence_scores": confidence_scores,
                "processing_method": "langextract",
                "model_used": self.model_id,
                "total_extractions": len(extracted_fields)
            }
            
        except Exception as e:
            print(f"[LANGEXTRACT] Error extracting receipt fields: {str(e)}", file=sys.stderr)
            return {
                "extracted_fields": {},
                "confidence_scores": {},
                "processing_method": "langextract",
                "model_used": self.model_id,
                "error": str(e)
            }
    
    def extract_cfdi_fields(self, text: str) -> Dict[str, Any]:
        """
        Extract CFDI-specific fields using LangExtract.
        
        Args:
            text (str): Text content from document
            
        Returns:
            Dict[str, Any]: Extracted CFDI fields with confidence scores
        """
        try:
            print(f"[LANGEXTRACT] Extracting CFDI fields with {self.model_id}...", file=sys.stderr)
            
            result = lx.extract(
                text_or_documents=text,
                prompt_description=self._get_cfdi_extraction_prompt(),
                examples=self._get_cfdi_examples(),
                model_id=self.model_id,
                extraction_passes=3,  # More passes for complex CFDI documents
                max_workers=10,
                max_char_buffer=800  # Smaller chunks for precise CFDI extraction
            )
            
            # Convert extractions to structured format
            cfdi_fields = {}
            confidence_scores = {}
            
            for extraction in result.extractions:
                field_name = extraction.extraction_class
                field_value = extraction.extraction_text
                confidence = getattr(extraction, 'confidence', 0.8)
                
                cfdi_fields[field_name] = field_value
                confidence_scores[field_name] = confidence
            
            print(f"[LANGEXTRACT] Extracted {len(cfdi_fields)} CFDI fields", file=sys.stderr)
            
            return {
                "cfdi_fields": cfdi_fields,
                "confidence_scores": confidence_scores,
                "processing_method": "langextract_cfdi",
                "model_used": self.model_id,
                "total_extractions": len(cfdi_fields)
            }
            
        except Exception as e:
            print(f"[LANGEXTRACT] Error extracting CFDI fields: {str(e)}", file=sys.stderr)
            return {
                "cfdi_fields": {},
                "confidence_scores": {},
                "processing_method": "langextract_cfdi",
                "model_used": self.model_id,
                "error": str(e)
            }
    
    def extract_enhanced_fields(self, text: str) -> Dict[str, Any]:
        """
        Extract both receipt and CFDI fields for comprehensive processing.
        
        Args:
            text (str): Text content from document
            
        Returns:
            Dict[str, Any]: Combined extraction results
        """
        print(f"[LANGEXTRACT] Starting enhanced field extraction...", file=sys.stderr)
        
        # Extract receipt fields
        receipt_result = self.extract_receipt_fields(text)
        
        # Extract CFDI fields
        cfdi_result = self.extract_cfdi_fields(text)
        
        # Combine results
        combined_result = {
            "receipt_fields": receipt_result.get("extracted_fields", {}),
            "cfdi_fields": cfdi_result.get("cfdi_fields", {}),
            "receipt_confidence": receipt_result.get("confidence_scores", {}),
            "cfdi_confidence": cfdi_result.get("confidence_scores", {}),
            "processing_method": "langextract_enhanced",
            "model_used": self.model_id,
            "total_receipt_fields": receipt_result.get("total_extractions", 0),
            "total_cfdi_fields": cfdi_result.get("total_extractions", 0),
            "errors": []
        }
        
        # Collect any errors
        if "error" in receipt_result:
            combined_result["errors"].append(f"Receipt extraction: {receipt_result['error']}")
        if "error" in cfdi_result:
            combined_result["errors"].append(f"CFDI extraction: {cfdi_result['error']}")
        
        print(f"[LANGEXTRACT] Enhanced extraction completed: {combined_result['total_receipt_fields']} receipt + {combined_result['total_cfdi_fields']} CFDI fields", file=sys.stderr)
        
        return combined_result
    
    def create_visualization(self, extraction_result: Dict[str, Any], output_path: str = "langextract_visualization.html") -> str:
        """
        Create interactive visualization of extraction results.
        
        Args:
            extraction_result (Dict[str, Any]): Extraction results
            output_path (str): Path to save visualization
            
        Returns:
            str: Path to created visualization file
        """
        try:
            # Save results to JSONL format for visualization
            import json
            import tempfile
            
            with tempfile.NamedTemporaryFile(mode='w', suffix='.jsonl', delete=False) as f:
                # Convert extraction result to LangExtract format
                # This is a simplified version - you may need to adapt based on your data structure
                json.dump(extraction_result, f)
                temp_file = f.name
            
            # Generate visualization
            html_content = lx.visualize(temp_file)
            
            # Save visualization
            with open(output_path, "w", encoding="utf-8") as f:
                if hasattr(html_content, 'data'):
                    f.write(html_content.data)
                else:
                    f.write(str(html_content))
            
            # Clean up temp file
            os.unlink(temp_file)
            
            print(f"[LANGEXTRACT] Visualization saved to: {output_path}", file=sys.stderr)
            return output_path
            
        except Exception as e:
            print(f"[LANGEXTRACT] Error creating visualization: {str(e)}", file=sys.stderr)
            return ""

# Example usage and testing
if __name__ == "__main__":
    # Test the LangExtract OCR service
    langextract_ocr = LangExtractOCR()
    
    # Sample receipt text
    sample_text = """
    WALMART MEXICO
    Fecha: 15/12/2024
    Total: $235.90
    Ticket: 11122521255212552254
    Pago: Mastercard
    RFC: XAXX010101000
    """
    
    print("Testing LangExtract OCR...")
    result = langextract_ocr.extract_enhanced_fields(sample_text)
    print(f"Result: {result}") 
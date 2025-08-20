import os
import sys
import json
from typing import Dict, Any, Optional
from dotenv import load_dotenv

# Import existing Azure OCR functionality
from .ocr_functionality import extract_receipt_data
from .langextract_ocr import LangExtractOCR

# Load environment variables
BASE_DIR = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
env_path = os.path.join(BASE_DIR, '.env')
load_dotenv(env_path)

class HybridOCRService:
    """
    Hybrid OCR service that combines Azure Document Intelligence and LangExtract
    for optimal document processing results.
    """
    
    def __init__(self, model_id: str = "gemini-2.5-flash"):
        """
        Initialize hybrid OCR service.
        
        Args:
            model_id (str): LangExtract model to use
        """
        self.langextract_ocr = LangExtractOCR(model_id)
        self.azure_enabled = self._check_azure_availability()
        self.langextract_enabled = self._check_langextract_availability()
        
        print(f"[HYBRID-OCR] Azure enabled: {self.azure_enabled}", file=sys.stderr)
        print(f"[HYBRID-OCR] LangExtract enabled: {self.langextract_enabled}", file=sys.stderr)
    
    def _check_azure_availability(self) -> bool:
        """Check if Azure Document Intelligence is available."""
        try:
            azure_endpoint = os.getenv("AZURE_DOCUMENT_INTELLIGENCE_ENDPOINT")
            azure_key = os.getenv("AZURE_DOCUMENT_INTELLIGENCE_KEY")
            return bool(azure_endpoint and azure_key)
        except Exception:
            return False
    
    def _check_langextract_availability(self) -> bool:
        """Check if LangExtract is available."""
        try:
            api_key = os.getenv("LANGEXTRACT_API_KEY")
            return bool(api_key)
        except Exception:
            return False
    
    def process_receipt(self, image_path: str, use_hybrid: bool = True) -> Dict[str, Any]:
        """
        Process receipt using hybrid approach or fallback to available services.
        
        Args:
            image_path (str): Path to receipt image
            use_hybrid (bool): Whether to use hybrid approach (default: True)
            
        Returns:
            Dict[str, Any]: Combined processing results
        """
        print(f"[HYBRID-OCR] Processing receipt: {image_path}", file=sys.stderr)
        
        results = {
            "azure_result": None,
            "langextract_result": None,
            "combined_result": {},
            "processing_method": "unknown",
            "errors": [],
            "warnings": []
        }
        
        # Step 1: Extract text using Azure (if available)
        if self.azure_enabled:
            try:
                print(f"[HYBRID-OCR] Running Azure Document Intelligence...", file=sys.stderr)
                azure_result = extract_receipt_data(image_path)
                results["azure_result"] = azure_result
                print(f"[HYBRID-OCR] Azure processing completed", file=sys.stderr)
            except Exception as e:
                error_msg = f"Azure processing failed: {str(e)}"
                results["errors"].append(error_msg)
                print(f"[HYBRID-OCR] {error_msg}", file=sys.stderr)
        
        # Step 2: Extract text and process with LangExtract (if available)
        if self.langextract_enabled:
            try:
                print(f"[HYBRID-OCR] Running LangExtract processing...", file=sys.stderr)
                
                # Get text from Azure result or extract from image
                text_content = ""
                if results["azure_result"] and "full_raw_text" in results["azure_result"]:
                    text_content = results["azure_result"]["full_raw_text"]
                else:
                    # Fallback: extract text from image (simplified)
                    text_content = self._extract_text_from_image_simple(image_path)
                
                if text_content:
                    langextract_result = self.langextract_ocr.extract_enhanced_fields(text_content)
                    results["langextract_result"] = langextract_result
                    print(f"[HYBRID-OCR] LangExtract processing completed", file=sys.stderr)
                else:
                    results["warnings"].append("No text content available for LangExtract processing")
                    
            except Exception as e:
                error_msg = f"LangExtract processing failed: {str(e)}"
                results["errors"].append(error_msg)
                print(f"[HYBRID-OCR] {error_msg}", file=sys.stderr)
        
        # Step 3: Combine results
        if use_hybrid and results["azure_result"] and results["langextract_result"]:
            results["combined_result"] = self._combine_results(results["azure_result"], results["langextract_result"])
            results["processing_method"] = "hybrid"
        elif results["azure_result"]:
            results["combined_result"] = results["azure_result"]
            results["processing_method"] = "azure_only"
        elif results["langextract_result"]:
            results["combined_result"] = results["langextract_result"]
            results["processing_method"] = "langextract_only"
        else:
            results["processing_method"] = "failed"
            results["errors"].append("No processing method succeeded")
        
        print(f"[HYBRID-OCR] Processing completed using method: {results['processing_method']}", file=sys.stderr)
        return results
    
    def _extract_text_from_image_simple(self, image_path: str) -> str:
        """
        Simple text extraction from image (fallback method).
        This is a basic implementation - you may want to enhance this.
        
        Args:
            image_path (str): Path to image
            
        Returns:
            str: Extracted text
        """
        try:
            # This is a placeholder - in a real implementation, you might use:
            # - OCR libraries like Tesseract
            # - Cloud OCR services
            # - Or rely on Azure's text extraction
            
            # For now, return empty string to indicate no text extraction
            return ""
        except Exception as e:
            print(f"[HYBRID-OCR] Simple text extraction failed: {str(e)}", file=sys.stderr)
            return ""
    
    def _combine_results(self, azure_result: Dict[str, Any], langextract_result: Dict[str, Any]) -> Dict[str, Any]:
        """
        Combine Azure and LangExtract results intelligently.
        
        Args:
            azure_result (Dict[str, Any]): Azure processing results
            langextract_result (Dict[str, Any]): LangExtract processing results
            
        Returns:
            Dict[str, Any]: Combined results
        """
        combined = {
            "merchant_name": "",
            "transaction_date": "",
            "total": "",
            "subtotal": "",
            "tax": "",
            "ticket_id": "",
            "payment_method": "",
            "rfc": "",
            "fiscal_regime": "",
            "cfdi_fields": {},
            "confidence_scores": {},
            "processing_method": "hybrid",
            "azure_fields": {},
            "langextract_fields": {},
            "full_raw_text": azure_result.get("full_raw_text", "")
        }
        
        # Extract Azure fields
        azure_fields = {}
        if "merchant_name" in azure_result:
            azure_fields["merchant_name"] = azure_result["merchant_name"]
        if "transaction_date" in azure_result:
            azure_fields["transaction_date"] = azure_result["transaction_date"]
        if "total" in azure_result:
            azure_fields["total"] = azure_result["total"]
        if "ticket_id" in azure_result:
            azure_fields["ticket_id"] = azure_result["ticket_id"]
        
        # Extract LangExtract fields
        langextract_fields = {}
        receipt_fields = langextract_result.get("receipt_fields", {})
        cfdi_fields = langextract_result.get("cfdi_fields", {})
        
        # Combine fields with priority logic
        combined["merchant_name"] = azure_fields.get("merchant_name") or receipt_fields.get("merchant_name", "")
        combined["transaction_date"] = azure_fields.get("transaction_date") or receipt_fields.get("transaction_date", "")
        combined["total"] = azure_fields.get("total") or receipt_fields.get("total", "")
        combined["ticket_id"] = azure_fields.get("ticket_id") or receipt_fields.get("ticket_id", "")
        
        # Add LangExtract-specific fields
        combined["rfc"] = cfdi_fields.get("rfc_emisor", "") or receipt_fields.get("rfc", "")
        combined["fiscal_regime"] = cfdi_fields.get("fiscal_regime", "")
        combined["cfdi_fields"] = cfdi_fields
        
        # Store individual results for reference
        combined["azure_fields"] = azure_fields
        combined["langextract_fields"] = {
            "receipt_fields": receipt_fields,
            "cfdi_fields": cfdi_fields
        }
        
        # Calculate confidence scores
        combined["confidence_scores"] = {
            "azure": 0.95 if azure_fields else 0.0,  # Azure has proven high accuracy
            "langextract_receipt": langextract_result.get("receipt_confidence", {}),
            "langextract_cfdi": langextract_result.get("cfdi_confidence", {})
        }
        
        return combined
    
    def process_with_visualization(self, image_path: str, output_dir: str = ".") -> Dict[str, Any]:
        """
        Process receipt and create visualization.
        
        Args:
            image_path (str): Path to receipt image
            output_dir (str): Directory to save visualization
            
        Returns:
            Dict[str, Any]: Processing results with visualization path
        """
        # Process the receipt
        results = self.process_receipt(image_path)
        
        # Create visualization if LangExtract was used
        if results["langextract_result"]:
            try:
                viz_path = os.path.join(output_dir, f"langextract_viz_{os.path.basename(image_path)}.html")
                viz_file = self.langextract_ocr.create_visualization(
                    results["langextract_result"], 
                    viz_path
                )
                results["visualization_path"] = viz_file
                print(f"[HYBRID-OCR] Visualization created: {viz_file}", file=sys.stderr)
            except Exception as e:
                print(f"[HYBRID-OCR] Visualization creation failed: {str(e)}", file=sys.stderr)
                results["visualization_error"] = str(e)
        
        return results
    
    def get_processing_status(self) -> Dict[str, Any]:
        """
        Get the status of available processing methods.
        
        Returns:
            Dict[str, Any]: Status information
        """
        return {
            "azure_available": self.azure_enabled,
            "langextract_available": self.langextract_enabled,
            "hybrid_available": self.azure_enabled and self.langextract_enabled,
            "recommended_method": "hybrid" if self.azure_enabled and self.langextract_enabled else "azure_only" if self.azure_enabled else "langextract_only" if self.langextract_enabled else "none"
        }

# Example usage and testing
if __name__ == "__main__":
    # Test the hybrid OCR service
    hybrid_service = HybridOCRService()
    
    # Check status
    status = hybrid_service.get_processing_status()
    print(f"Processing Status: {status}")
    
    # Test with a sample image (if available)
    # sample_image = "path/to/sample/receipt.jpg"
    # if os.path.exists(sample_image):
    #     result = hybrid_service.process_receipt(sample_image)
    #     print(f"Processing Result: {json.dumps(result, indent=2)}")
    # else:
    #     print("Sample image not found. Please provide a valid image path for testing.") 
"""
Enhanced OCR Functionality with Azure-Aligned Confidence Scoring
This module extends the existing OCR functionality to include comprehensive confidence scoring
that aligns with Azure Document Intelligence Studio's methodologies.
"""

import os
import re
import sys
import json
from dotenv import load_dotenv
from azure.core.credentials import AzureKeyCredential
from azure.ai.documentintelligence import DocumentIntelligenceClient
from openai import OpenAI

# Import our confidence scorer
from azure_aligned_confidence_scorer import AzureAlignedConfidenceScorer

# Load environment variables
BASE_DIR = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
env_path = os.path.join(BASE_DIR, '.env')
load_dotenv(env_path)

# Get required environment variables
OPENAI_API_KEY = os.getenv("OPENAI_API_KEY")
AZURE_ENDPOINT = os.getenv("AZURE_DOCUMENT_INTELLIGENCE_ENDPOINT")
AZURE_KEY = os.getenv("AZURE_DOCUMENT_INTELLIGENCE_KEY")

# Initialize clients
openai_client = OpenAI(api_key=OPENAI_API_KEY)


def extract_receipt_data_with_confidence(image_path):
    """
    Enhanced receipt processing with comprehensive confidence scoring.
    This function extends the original extract_receipt_data with Azure-aligned confidence scoring.
    
    Args:
        image_path (str): Path to the receipt image.
    Returns:
        dict: Comprehensive extraction results with confidence scores for all fields.
    """
    print(f"[ENHANCED-OCR-CONFIDENCE] Processing receipt with confidence scoring: {image_path}", file=sys.stderr)
    
    # Validate environment variables
    if not AZURE_ENDPOINT or not AZURE_KEY:
        error_msg = "Missing Azure Document Intelligence credentials."
        print(f"[ENHANCED-OCR-CONFIDENCE] Error: {error_msg}", file=sys.stderr)
        raise ValueError(error_msg)
    
    if not OPENAI_API_KEY:
        error_msg = "Missing OpenAI API key."
        print(f"[ENHANCED-OCR-CONFIDENCE] Error: {error_msg}", file=sys.stderr)
        raise ValueError(error_msg)
    
    # Validate image file exists
    if not os.path.exists(image_path):
        error_msg = f"Image file not found: {image_path}"
        print(f"[ENHANCED-OCR-CONFIDENCE] Error: {error_msg}", file=sys.stderr)
        raise FileNotFoundError(error_msg)
    
    try:
        # Initialize Azure Document Intelligence client
        document_intelligence_client = DocumentIntelligenceClient(
            endpoint=AZURE_ENDPOINT, credential=AzureKeyCredential(AZURE_KEY)
        )
        print(f"[ENHANCED-OCR-CONFIDENCE] Azure client initialized successfully", file=sys.stderr)
    except Exception as e:
        error_msg = f"Failed to initialize Azure client: {str(e)}"
        print(f"[ENHANCED-OCR-CONFIDENCE] Error: {error_msg}", file=sys.stderr)
        raise RuntimeError(error_msg)

    # Read the image
    with open(image_path, "rb") as image_file:
        image_data = image_file.read()

    # Variables to store extracted data
    merchant_name = ""
    transaction_date = ""
    azure_total = ""
    receipt_result = None
    read_result = None

    try:
        # PRIMARY: Extract structured data with prebuilt receipt model
        print(f"[ENHANCED-OCR-CONFIDENCE] Starting Azure receipt analysis", file=sys.stderr)
        receipt_poller = document_intelligence_client.begin_analyze_document(
            "prebuilt-receipt", image_data
        )
        receipt_result = receipt_poller.result()

        # Extract basic fields using Azure
        for idx, receipt in enumerate(receipt_result.documents):
            merchant_field = receipt.fields.get("MerchantName")
            if merchant_field:
                merchant_name = merchant_field.value_string
            date_field = receipt.fields.get("TransactionDate")
            if date_field:
                transaction_date = date_field.value_date.strftime("%d/%m/%Y")
            total_field = receipt.fields.get("Total")
            if total_field:
                azure_total = total_field.value_currency.amount
            break
            
        print(f"[ENHANCED-OCR-CONFIDENCE] Azure receipt analysis completed", file=sys.stderr)

    except Exception as e:
        print(f"[ENHANCED-OCR-CONFIDENCE] Receipt analysis failed, continuing with read model: {str(e)}", file=sys.stderr)
        
    try:
        # FALLBACK: Extract full text with prebuilt read model
        print(f"[ENHANCED-OCR-CONFIDENCE] Starting Azure read analysis", file=sys.stderr)
        read_poller = document_intelligence_client.begin_analyze_document(
            "prebuilt-read", image_data
        )
        read_result = read_poller.result()

        # Extract complete text
        full_text = ""
        for page in read_result.pages:
            for line in page.lines:
                line_content = line.content
                if line_content:
                    try:
                        line_content.encode('utf-8').decode('utf-8')
                        full_text += line_content + "\n"
                    except (UnicodeEncodeError, UnicodeDecodeError):
                        print(f"[ENHANCED-OCR-CONFIDENCE] Warning: Unicode issue in line content, cleaning...", file=sys.stderr)
                        cleaned_content = line_content.encode('ascii', 'ignore').decode('ascii')
                        full_text += cleaned_content + "\n"
        
        print(f"[ENHANCED-OCR-CONFIDENCE] Azure read analysis completed", file=sys.stderr)
        
    except Exception as e:
        print(f"[ENHANCED-OCR-CONFIDENCE] Read analysis also failed: {str(e)}", file=sys.stderr)
        full_text = ""

    # Log text extraction results
    print(f"[ENHANCED-OCR-CONFIDENCE] Extracted text length: {len(full_text)} characters", file=sys.stderr)
    
    # Import and use the enhanced extraction from the original module
    try:
        from ocr_functionality import extract_advanced_ticket_info
        ticket_info = extract_advanced_ticket_info(full_text, merchant_name)
        receipt_id = ticket_info['id']
        folio = ticket_info['folio']
        enhanced_total = ticket_info['total']
        vendor_type = ticket_info['vendor_type']
    except ImportError:
        print(f"[ENHANCED-OCR-CONFIDENCE] Warning: Could not import enhanced extraction, using basic extraction", file=sys.stderr)
        # Fallback to basic extraction
        receipt_id = "N/A"
        folio = "N/A" 
        enhanced_total = azure_total
        vendor_type = "generic"
    
    # Extract additional fields using the original module's functions
    try:
        from ocr_functionality import (
            extract_store_branch_plaza, 
            extract_register_station_terminal,
            extract_payment_type, 
            extract_card_last_4_digits
        )
        store_branch_plaza = extract_store_branch_plaza(full_text, merchant_name)
        register_station_terminal = extract_register_station_terminal(full_text)
        payment_type = extract_payment_type(full_text)
        card_last_4_digits = extract_card_last_4_digits(full_text)
    except ImportError:
        print(f"[ENHANCED-OCR-CONFIDENCE] Warning: Could not import additional field extractors", file=sys.stderr)
        store_branch_plaza = None
        register_station_terminal = None
        payment_type = None
        card_last_4_digits = None

    # Choose the best available total
    final_total = enhanced_total if enhanced_total is not None else azure_total
    
    # Create basic ticket data structure
    ticket_data = {
        # Core extracted fields
        "Mesa_Folio": folio if folio else "N/A",
        "Fecha": transaction_date,
        "ID_Ticket": receipt_id if receipt_id else "N/A",
        "Total": final_total,
        
        # Vendor-specific fields
        "TC#": "N/A",  # Will be populated based on vendor type
        "TR#": "N/A",
        "ID": receipt_id if receipt_id else "N/A",
        "Fol_Vta": folio if folio else "N/A",
        
        # Enhanced fields
        "Store_Branch_Plaza": store_branch_plaza if store_branch_plaza else "N/A",
        "Register_Station_Terminal": register_station_terminal if register_station_terminal else "N/A",
        "Payment_Type": payment_type if payment_type else "N/A",
        "Card_Last_4_Digits": card_last_4_digits if card_last_4_digits else "N/A",
        
        # Additional fields
        "Comercio": merchant_name,
        
        # Raw text and metadata
        "Full_Raw_Text": full_text,
        "vendor_type": vendor_type,
        "extraction_method": "enhanced_with_confidence"
    }
    
    # Map fields based on vendor type
    if vendor_type == 'walmart':
        ticket_data["TC#"] = ticket_data["ID_Ticket"]
        ticket_data["TR#"] = ticket_data["Mesa_Folio"]
    elif vendor_type == 'oxxo':
        ticket_data["ID"] = ticket_data["ID_Ticket"]
        ticket_data["Fol_Vta"] = ticket_data["Mesa_Folio"]
    elif vendor_type == 'costco':
        ticket_data["ID"] = ticket_data["ID_Ticket"]
        ticket_data["Fol_Vta"] = ticket_data["Mesa_Folio"]

    # **CONFIDENCE SCORING - THE MAIN ENHANCEMENT**
    print(f"[ENHANCED-OCR-CONFIDENCE] Starting confidence scoring analysis", file=sys.stderr)
    
    # Initialize the confidence scorer
    confidence_scorer = AzureAlignedConfidenceScorer()
    
    # Score all fields with confidence
    scored_ticket_data = confidence_scorer.score_ticket_fields(
        ticket_data=ticket_data,
        azure_receipt_result=receipt_result,
        azure_read_result=read_result
    )
    
    print(f"[ENHANCED-OCR-CONFIDENCE] Confidence scoring completed", file=sys.stderr)
    
    # Add alternative field names for frontend compatibility
    alternative_fields = {
        # Snake case versions
        "mesa_folio": scored_ticket_data.get("Mesa_Folio"),
        "fecha": scored_ticket_data.get("Fecha"),
        "id_ticket": scored_ticket_data.get("ID_Ticket"),
        "total": scored_ticket_data.get("Total"),
        "comercio": scored_ticket_data.get("Comercio"),
        "tc_number": scored_ticket_data.get("TC#"),
        "tr_number": scored_ticket_data.get("TR#"),
        "id": scored_ticket_data.get("ID"),
        "folio_venta": scored_ticket_data.get("Fol_Vta"),
        "store_branch_plaza": scored_ticket_data.get("Store_Branch_Plaza"),
        "register_station_terminal": scored_ticket_data.get("Register_Station_Terminal"),
        "payment_type": scored_ticket_data.get("Payment_Type"),
        "card_last_4_digits": scored_ticket_data.get("Card_Last_4_Digits"),
        "raw_text": scored_ticket_data.get("Full_Raw_Text"),
        
        # Confidence versions (snake case)
        "mesa_folio_confidence": scored_ticket_data.get("Mesa_Folio_Confidence"),
        "fecha_confidence": scored_ticket_data.get("Fecha_Confidence"),
        "id_ticket_confidence": scored_ticket_data.get("ID_Ticket_Confidence"),
        "total_confidence": scored_ticket_data.get("Total_Confidence"),
        "comercio_confidence": scored_ticket_data.get("Comercio_Confidence"),
        "tc_number_confidence": scored_ticket_data.get("TC#_Confidence"),
        "tr_number_confidence": scored_ticket_data.get("TR#_Confidence"),
        "id_confidence": scored_ticket_data.get("ID_Confidence"),
        "folio_venta_confidence": scored_ticket_data.get("Fol_Vta_Confidence"),
        "store_branch_plaza_confidence": scored_ticket_data.get("Store_Branch_Plaza_Confidence"),
        "register_station_terminal_confidence": scored_ticket_data.get("Register_Station_Terminal_Confidence"),
        "payment_type_confidence": scored_ticket_data.get("Payment_Type_Confidence"),
        "card_last_4_digits_confidence": scored_ticket_data.get("Card_Last_4_Digits_Confidence")
    }
    
    # Merge alternative field names
    scored_ticket_data.update(alternative_fields)
    
    # Final safety check: ensure all values are JSON-safe
    def make_json_safe(obj):
        """Recursively make all values in the object JSON-safe"""
        if isinstance(obj, dict):
            return {k: make_json_safe(v) for k, v in obj.items()}
        elif isinstance(obj, list):
            return [make_json_safe(item) for item in obj]
        elif isinstance(obj, str):
            try:
                json.dumps(obj)
                return obj
            except (UnicodeEncodeError, UnicodeDecodeError):
                print(f"[ENHANCED-OCR-CONFIDENCE] Warning: Cleaning problematic string for JSON safety", file=sys.stderr)
                return obj.encode('ascii', 'ignore').decode('ascii')
        else:
            return obj
    
    # Apply safety check to the result
    safe_result = make_json_safe(scored_ticket_data)
    
    # Test JSON serialization before returning
    try:
        json.dumps(safe_result, ensure_ascii=False)
        print(f"[ENHANCED-OCR-CONFIDENCE] Result is JSON-safe", file=sys.stderr)
    except Exception as e:
        print(f"[ENHANCED-OCR-CONFIDENCE] Warning: JSON serialization test failed: {e}", file=sys.stderr)
        # Fallback: return minimal safe data
        safe_result = {
            "error": "Data contained problematic characters and was cleaned",
            "success": False,
            "text_length": len(full_text) if full_text else 0
        }
    
    # Log final results
    overall_conf = safe_result.get('overall_document_confidence', 0)
    total_sources = safe_result.get('total_confidence_sources', 0)
    print(f"[ENHANCED-OCR-CONFIDENCE] Processing completed successfully", file=sys.stderr)
    print(f"[ENHANCED-OCR-CONFIDENCE] Overall document confidence: {overall_conf}%", file=sys.stderr)
    print(f"[ENHANCED-OCR-CONFIDENCE] Confidence sources: {total_sources}", file=sys.stderr)
    
    return safe_result


# Backward compatibility function
def extract_receipt_data(image_path):
    """
    Backward compatibility wrapper that calls the enhanced function.
    This ensures existing code continues to work while adding confidence scoring.
    """
    return extract_receipt_data_with_confidence(image_path)

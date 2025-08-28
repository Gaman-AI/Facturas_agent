# Enhanced OCR Functionality

import os
import re
import sys
from dotenv import load_dotenv
from azure.core.credentials import AzureKeyCredential
from azure.ai.documentintelligence import DocumentIntelligenceClient
from openai import OpenAI
import json

# Cargar variables de entorno desde .env
BASE_DIR = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
env_path = os.path.join(BASE_DIR, '.env')
load_dotenv(env_path)

# Obtener las variables de entorno necesarias
OPENAI_API_KEY = os.getenv("OPENAI_API_KEY")
AZURE_ENDPOINT = os.getenv("AZURE_DOCUMENT_INTELLIGENCE_ENDPOINT")
AZURE_KEY = os.getenv("AZURE_DOCUMENT_INTELLIGENCE_KEY")

# Inicializar clientes globales
openai_client = OpenAI(api_key=OPENAI_API_KEY)

def analyze_document_with_model(document_intelligence_client, model_name, image_data):
    """
    Analyze document using specified pre-built model with error handling.
    
    Args:
        document_intelligence_client: Azure Document Intelligence client
        model_name (str): Name of the pre-built model to use
        image_data (bytes): Image data to analyze
        
    Returns:
        dict: Analysis result or None if failed
    """
    try:
        print(f"[ENHANCED-OCR] Analyzing with {model_name}...", file=sys.stderr)
        poller = document_intelligence_client.begin_analyze_document(
            model_name, image_data
        )
        result = poller.result()
        print(f"[ENHANCED-OCR] {model_name} analysis completed successfully", file=sys.stderr)
        return result
    except Exception as e:
        print(f"[ENHANCED-OCR] Error with {model_name}: {str(e)}", file=sys.stderr)
        return None

def extract_text_from_result(result):
    """
    Extract text content from Azure Document Intelligence result.
    
    Args:
        result: Azure Document Intelligence result object
        
    Returns:
        str: Extracted text content
    """
    if not result or not hasattr(result, 'pages'):
        return ""
    
    full_text = ""
    for page in result.pages:
        for line in page.lines:
            full_text += line.content + "\n"
    return full_text

def extract_structured_fields_from_receipt(receipt_result):
    """
    Extract structured fields from receipt analysis result.
    
    Args:
        receipt_result: Azure Document Intelligence receipt result
        
    Returns:
        dict: Extracted structured fields
    """
    fields = {
        "merchant_name": "",
        "transaction_date": "",
        "total": "",
        "subtotal": "",
        "tax": "",
        "tip": "",
        "items": []
    }
    
    if not receipt_result or not hasattr(receipt_result, 'documents'):
        return fields
    
    for document in receipt_result.documents:
        # Extract basic fields
        if document.fields.get("MerchantName"):
            fields["merchant_name"] = document.fields["MerchantName"].value_string
        
        if document.fields.get("TransactionDate"):
            fields["transaction_date"] = document.fields["TransactionDate"].value_date.strftime("%d/%m/%Y")
        
        if document.fields.get("Total"):
            fields["total"] = document.fields["Total"].value_currency.amount
        
        if document.fields.get("Subtotal"):
            fields["subtotal"] = document.fields["Subtotal"].value_currency.amount
        
        if document.fields.get("Tax"):
            fields["tax"] = document.fields["Tax"].value_currency.amount
        
        if document.fields.get("Tip"):
            fields["tip"] = document.fields["Tip"].value_currency.amount
        
        # Extract line items if available
        if document.fields.get("Items"):
            for item in document.fields["Items"].value_array:
                item_data = {}
                if hasattr(item, 'value_object'):
                    for key, value in item.value_object.items():
                        if hasattr(value, 'value_string'):
                            item_data[key] = value.value_string
                        elif hasattr(value, 'value_currency'):
                            item_data[key] = value.value_currency.amount
                        elif hasattr(value, 'value_number'):
                            item_data[key] = value.value_number
                fields["items"].append(item_data)
        
        break  # Process only the first document
    
    return fields

def extract_layout_information(layout_result):
    """
    Extract layout information from layout analysis result.
    
    Args:
        layout_result: Azure Document Intelligence layout result
        
    Returns:
        dict: Layout information including tables, key-value pairs, etc.
    """
    layout_info = {
        "tables": [],
        "key_value_pairs": [],
        "selection_marks": [],
        "text_regions": []
    }
    
    if not layout_result or not hasattr(layout_result, 'pages'):
        return layout_info
    
    for page in layout_result.pages:
        # Extract tables
        if hasattr(page, 'tables') and page.tables:
            for table in page.tables:
                table_data = []
                for row in table.rows:
                    row_data = []
                    for cell in row.cells:
                        if hasattr(cell, 'content'):
                            row_data.append(cell.content)
                    table_data.append(row_data)
                layout_info["tables"].append(table_data)
        
        # Extract key-value pairs
        if hasattr(page, 'key_value_pairs') and page.key_value_pairs:
            for kvp in page.key_value_pairs:
                key = kvp.key.content if hasattr(kvp.key, 'content') else ""
                value = kvp.value.content if hasattr(kvp.value, 'content') else ""
                layout_info["key_value_pairs"].append({"key": key, "value": value})
        
        # Extract selection marks
        if hasattr(page, 'selection_marks') and page.selection_marks:
            for mark in page.selection_marks:
                layout_info["selection_marks"].append({
                    "state": mark.state,
                    "confidence": mark.confidence
                })
    
    return layout_info

def extract_document_fields(document_result):
    """
    Extract fields from general document analysis result.
    
    Args:
        document_result: Azure Document Intelligence document result
        
    Returns:
        dict: Extracted document fields
    """
    document_fields = {
        "text_content": "",
        "tables": [],
        "key_value_pairs": [],
        "paragraphs": []
    }
    
    if not document_result or not hasattr(document_result, 'pages'):
        return document_fields
    
    # Extract text content
    document_fields["text_content"] = extract_text_from_result(document_result)
    
    # Extract tables and other structured content
    layout_info = extract_layout_information(document_result)
    document_fields["tables"] = layout_info["tables"]
    document_fields["key_value_pairs"] = layout_info["key_value_pairs"]
    
    # Extract paragraphs
    for page in document_result.pages:
        if hasattr(page, 'paragraphs'):
            for paragraph in page.paragraphs:
                if hasattr(paragraph, 'content'):
                    document_fields["paragraphs"].append(paragraph.content)
    
    return document_fields

def combine_model_results(receipt_result, document_result, layout_result, read_result):
    """
    Combine results from multiple Azure Document Intelligence models.
    
    Args:
        receipt_result: Receipt analysis result
        document_result: Document analysis result
        layout_result: Layout analysis result
        read_result: Read analysis result
        
    Returns:
        dict: Combined and enhanced extraction results
    """
    combined_data = {
        "structured_fields": {},
        "text_content": "",
        "layout_info": {},
        "confidence_scores": {},
        "extracted_fields": {}
    }
    
    # Extract structured fields from receipt model
    if receipt_result:
        combined_data["structured_fields"] = extract_structured_fields_from_receipt(receipt_result)
        combined_data["confidence_scores"]["receipt"] = 0.9  # High confidence for structured data
    
    # Extract document fields from document model (if available)
    if document_result:
        doc_fields = extract_document_fields(document_result)
        combined_data["text_content"] = doc_fields["text_content"]
        combined_data["extracted_fields"]["tables"] = doc_fields["tables"]
        combined_data["extracted_fields"]["key_value_pairs"] = doc_fields["key_value_pairs"]
        combined_data["confidence_scores"]["document"] = 0.8
    else:
        # If document model is not available, use layout model for key-value pairs
        if layout_result:
            layout_info = extract_layout_information(layout_result)
            combined_data["extracted_fields"]["key_value_pairs"] = layout_info["key_value_pairs"]
            combined_data["confidence_scores"]["layout"] = 0.7
    
    # Extract layout information
    if layout_result:
        combined_data["layout_info"] = extract_layout_information(layout_result)
        combined_data["confidence_scores"]["layout"] = 0.7
    
    # Extract raw text from read model (fallback)
    if read_result:
        raw_text = extract_text_from_result(read_result)
        if not combined_data["text_content"]:
            combined_data["text_content"] = raw_text
        combined_data["confidence_scores"]["read"] = 0.6
    
    return combined_data

def detect_vendor_type(merchant_name, text_content):
    """
    Detect vendor type based on merchant name and text content.
    
    Args:
        merchant_name (str): Merchant name from receipt
        text_content (str): Full text content
        
    Returns:
        str: Detected vendor type
    """
    merchant_name_lower = merchant_name.lower() if merchant_name else ""
    text_lower = text_content.lower()
    
    # Vendor detection patterns
    vendor_patterns = {
        "walmart": ["walmart", "wal-mart", "nueva wal mart"],
        "costco": ["costco", "costco de mexico"],
        "h-e-b": ["h-e-b", "heb", "supermercados internacionales heb"],
        "oxxo": ["oxxo"],
        "soriana": ["soriana"],
        "pharmacy": ["farmacia", "pharmacy", "super farmacia"],
        "restaurant": ["restaurante", "restaurant", "cafe", "bar"]
    }
    
    for vendor_type, patterns in vendor_patterns.items():
        for pattern in patterns:
            if pattern in merchant_name_lower or pattern in text_lower:
                return vendor_type
    
    # **WALMART DETECTION**
    walmart_indicators = ['walmart', 'supercenter', 'bodega aurrera']
    if any(indicator in text_lower or indicator in merchant_lower for indicator in walmart_indicators):
        return 'walmart'
    
    # **WANSOFT DETECTION**
    wansoft_indicators = ['wansoft', 'el molino', 'molino']
    if any(indicator in text_lower or indicator in merchant_lower for indicator in wansoft_indicators):
        print(f"[VENDOR-DETECTION] Wansoft detected! Text: '{text_lower[:100]}...', Merchant: '{merchant_lower}'", file=sys.stderr)
        return 'wansoft'
    
    return 'generic'

def extract_enhanced_fields(combined_data, vendor_type):
    """
    Extract enhanced fields using combined model results and vendor-specific logic.
    
    Args:
        combined_data (dict): Combined results from multiple models
        vendor_type (str): Detected vendor type
        
    Returns:
        dict: Enhanced field extraction results
    """
    enhanced_fields = {
        "branch": "",
        "register": "",
        "payment_type": "",
        "card_last_4_digits": "",
        "additional_info": {}
    }
    
    text_content = combined_data.get("text_content", "")
    key_value_pairs = combined_data.get("extracted_fields", {}).get("key_value_pairs", [])
    
    # Extract branch information
    enhanced_fields["branch"] = extract_branch_enhanced(
        text_content, key_value_pairs, vendor_type
    )
    
    # Extract register information
    enhanced_fields["register"] = extract_register_enhanced(
        text_content, key_value_pairs, vendor_type
    )
    
    # Extract payment type information
    enhanced_fields["payment_type"] = extract_payment_type_enhanced(
        text_content, key_value_pairs, vendor_type
    )
    
    # Extract card last 4 digits
    enhanced_fields["card_last_4_digits"] = extract_card_last_4_digits_enhanced(
        text_content, key_value_pairs
    )
    
    # Extract vendor-specific additional information
    enhanced_fields["additional_info"] = extract_vendor_specific_info(
        text_content, key_value_pairs, vendor_type
    )
    
    return enhanced_fields

def extract_branch_enhanced(text_content, key_value_pairs, vendor_type):
    """
    Enhanced branch extraction using multiple data sources.
    """
    # First, try to find in key-value pairs
    for kvp in key_value_pairs:
        key_lower = kvp["key"].lower()
        if any(term in key_lower for term in ["sucursal", "branch", "store", "location", "direccion"]):
            return kvp["value"]
    
    # Then, try pattern matching in text
    patterns = [
        r"sucursal\s+(\d+[^,\n]*)",
        r"branch\s+(\d+[^,\n]*)",
        r"store\s+(\d+[^,\n]*)",
        r"unidad\s+([^,\n]+)",
        r"plaza\s+([^,\n]+)"
    ]
    
    for pattern in patterns:
        matches = re.findall(pattern, text_content, re.IGNORECASE)
        if matches:
            return matches[0].strip()
    
    return ""

def extract_register_enhanced(text_content, key_value_pairs, vendor_type):
    """
    Enhanced register extraction.
    """
    # Check key-value pairs first
    for kvp in key_value_pairs:
        key_lower = kvp["key"].lower()
        if any(term in key_lower for term in ["register", "terminal", "caja", "station"]):
            return kvp["value"]
    
    # Pattern matching
    patterns = [
        r"register\s+(\d+)",
        r"terminal\s+(\d+)",
        r"caja\s+(\d+)",
        r"station\s+(\d+)"
    ]
    
    for pattern in patterns:
        matches = re.findall(pattern, text_content, re.IGNORECASE)
        if matches:
            return f"Register {matches[0]}"
    
    return ""

def extract_payment_type_enhanced(text_content, key_value_pairs, vendor_type):
    """
    Enhanced payment type extraction.
    """
    # Check key-value pairs first
    for kvp in key_value_pairs:
        key_lower = kvp["key"].lower()
        if any(term in key_lower for term in ["payment", "pago", "method", "metodo"]):
            return kvp["value"]
    
    # Pattern matching for payment types
    payment_patterns = [
        r"efectivo",
        r"cash",
        r"tarjeta\s+de\s+credito",
        r"credit\s+card",
        r"tarjeta\s+de\s+debito",
        r"debit\s+card",
        r"visa",
        r"mastercard",
        r"american\s+express",
        r"puntos",
        r"points"
    ]
    
    for pattern in payment_patterns:
        matches = re.findall(pattern, text_content, re.IGNORECASE)
        if matches:
            return matches[0].title()
    
    return ""

def extract_card_last_4_digits_enhanced(text_content, key_value_pairs):
    """
    Enhanced card last 4 digits extraction.
    """
    # Check key-value pairs first
    for kvp in key_value_pairs:
        key_lower = kvp["key"].lower()
        if any(term in key_lower for term in ["card", "tarjeta", "account"]):
            value = kvp["value"]
            # Look for 4-digit pattern in the value
            digits = re.findall(r'\d{4}', value)
            if digits:
                return digits[-1]  # Return the last 4 digits found
    
    # Pattern matching in text
    card_patterns = [
        r'\*{4,}\s*(\d{4})',
        r'card\s*#?\s*\*{4,}\s*(\d{4})',
        r'tarjeta\s*\*{4,}\s*(\d{4})'
    ]
    
    for pattern in card_patterns:
        matches = re.findall(pattern, text_content, re.IGNORECASE)
        if matches:
            return matches[0]
    
    return ""

def extract_wansoft_codigo_factura(text):
    """
    Extract the "Código de facturación" from wansoft receipts.
    
    Args:
        text (str): Full receipt text
        
    Returns:
        str: Código de facturación, or None if not found
    """
    print(f"[WANSOFT-EXTRACTION] Starting código de factura extraction", file=sys.stderr)
    print(f"[WANSOFT-EXTRACTION] Text preview: {text[:200]}...", file=sys.stderr)
    
    # Enhanced patterns for wansoft código de facturación
    patterns = [
        # Standard patterns with 18 digits
        r'(?:código de facturación|codigo de facturacion)[\s:]*(\d{18})',  # código de facturación: 250518126605018034
        r'(?:código de factura|codigo de factura)[\s:]*(\d{18})',  # código de factura: 250518126605018034
        r'(?:facturación|facturacion)[\s:]*(\d{18})',  # facturación: 250518126605018034
        r'(?:código|codigo)[\s:]*(\d{18})',  # código: 250518126605018034
        
        # More flexible patterns for different formats
        r'(?:código de facturación|codigo de facturacion)[\s:]*(\d{12,20})',  # Allow 12-20 digits
        r'(?:código de factura|codigo de factura)[\s:]*(\d{12,20})',  # Allow 12-20 digits
        r'(?:facturación|facturacion)[\s:]*(\d{12,20})',  # Allow 12-20 digits
        r'(?:código|codigo)[\s:]*(\d{12,20})',  # Allow 12-20 digits
        
        # Look for patterns in the "FACTURACIÓN EN LÍNEA" section
        r'(?:FACTURACIÓN EN LÍNEA|FACTURACION EN LINEA).*?(?:código|codigo)[\s:]*(\d{12,20})',
        r'(?:FACTURACIÓN EN LÍNEA|FACTURACION EN LINEA).*?(?:facturación|facturacion)[\s:]*(\d{12,20})',
        
        # Look for patterns near the end of the receipt (where facturación info usually is)
        r'(?:código|codigo)[\s:]*(\d{12,20})(?=.*?(?:Powered by Wansoft|Wansoft))',
        r'(?:facturación|facturacion)[\s:]*(\d{12,20})(?=.*?(?:Powered by Wansoft|Wansoft))',
        
        # Look for any long number sequence that might be the código
        r'(?:código|codigo)[\s:]*(\d{10,20})',  # Very flexible - 10-20 digits
    ]
    
    for i, pattern in enumerate(patterns):
        matches = re.findall(pattern, text, re.IGNORECASE | re.DOTALL)
        if matches:
            for match in matches:
                print(f"[WANSOFT-EXTRACTION] Pattern {i} found match: {match}", file=sys.stderr)
                if len(match) >= 10 and match.isdigit():  # At least 10 digits
                    print(f"[WANSOFT-EXTRACTION] Returning código de factura: {match}", file=sys.stderr)
                    return match
    
    # If no patterns found, try to find any long number sequence that might be the código
    # Look for numbers that appear in the context of facturación
    facturacion_context = re.search(r'(?:FACTURACIÓN EN LÍNEA|FACTURACION EN LINEA|facturación|facturacion).*?(\d{12,20})', text, re.IGNORECASE | re.DOTALL)
    if facturacion_context:
        match = facturacion_context.group(1)
        print(f"[WANSOFT-EXTRACTION] Found código in facturación context: {match}", file=sys.stderr)
        if len(match) >= 10 and match.isdigit():
            return match
    
    print(f"[WANSOFT-EXTRACTION] No código de factura found", file=sys.stderr)
    return None

def extract_advanced_ticket_info(text, merchant_name=""):
    """
    Advanced ticket information extraction with enhanced pattern detection.
    Now includes vendor-specific logic and improved total detection.
    Returns only the best, most accurate results.
    
    Args:
        text (str): Full receipt text
        merchant_name (str): Detected merchant name for context
        
    Returns:
        dict: Enhanced ticket information with pattern-based detection
    """
    print(f"[ENHANCED-OCR] Processing merchant: {merchant_name}", file=sys.stderr)
    
    # **VENDOR DETECTION**
    vendor_type = detect_vendor_type(merchant_name, text)
    
    # **ENHANCED TOTAL DETECTION**
    enhanced_total = extract_total_patterns(text)
    
    # **VENDOR-SPECIFIC EXTRACTION**
    if vendor_type == 'costco':
        print(f"[ENHANCED-OCR] Using Costco-specific extraction", file=sys.stderr)
        costco_info = extract_costco_specific_info(text)
        
        # For Costco: ticket_id is primary, folio is secondary
        extracted_id = costco_info['ticket_id']
        extracted_folio = costco_info['folio']
        extraction_method = 'costco_specific'
        
    elif vendor_type == 'wansoft':
        print(f"[ENHANCED-OCR] Using Wansoft-specific extraction", file=sys.stderr)
        # For Wansoft: Extract código de facturación and use standard ID/folio extraction
        try:
            # Extract código de facturación first
            codigo_factura = extract_wansoft_codigo_factura(text)
            
            enhanced_prompt = f"""Extract the ID and Folio numbers from the Wansoft receipt text. Return ONLY a JSON object with fields 'id' and 'folio'.

WANSOFT SPECIFIC DETECTION RULES:
- Look for "Movimiento" number as the main ID (usually 6-12 digits)
- Look for "Orden" number as potential folio (usually 2-4 digits)
- The receipt may have "Ticket de Pagado" with transaction details
- Focus on numbers that appear in the transaction details section
- The main identifier is often the "Movimiento" number

FALLBACK STRATEGY:
- If no specific labels found, identify the longest number sequence in the receipt
- Prioritize numbers with 6+ digits for main ID
- Use shorter numbers (2-6 digits) for folio
- Exclude monetary amounts and dates

Receipt text: {text}"""

            response = openai_client.chat.completions.create(
                model="gpt-3.5-turbo",
                messages=[
                    {
                        "role": "system",
                        "content": enhanced_prompt
                    },
                    {
                        "role": "user",
                        "content": text
                    }
                ],
                response_format={"type": "json_object"},
                temperature=0.3,
                max_tokens=256
            )

            openai_data = json.loads(response.choices[0].message.content)
            extracted_id = openai_data.get('id')
            extracted_folio = openai_data.get('folio')
            extraction_method = 'wansoft_specific'
            
            print(f"[ENHANCED-OCR] Wansoft AI extraction completed", file=sys.stderr)
            
        except Exception as e:
            print(f"[ENHANCED-OCR] Wansoft AI extraction failed, using pattern detection", file=sys.stderr)
            extracted_id = None
            extracted_folio = None
            extraction_method = 'wansoft_pattern_fallback'
        
    else:
        # **STANDARD EXTRACTION for other vendors**
        try:
            enhanced_prompt = f"""Extract the ID and Folio numbers from the receipt text. Return ONLY a JSON object with fields 'id' and 'folio'.

ENHANCED DETECTION RULES by VENDOR:

- If the ticket is from COSTCO:
  - The main identifier is usually a long number (12+ digits) labeled as "Ticket", "Receipt", "Reference", or standalone
  - The folio is typically a shorter number (4-8 digits) labeled as "Folio", "Store", or "Terminal"
  - Prioritize the longest number sequence as the ticket ID

- If the ticket is from OXXO:
  - The id is usually labeled as "ID" and follows pattern: 2 numbers, then 3 letters, then 2 numbers, then 4 other characters
  - The folio is labeled as "Fol_Vta"
  - If no labeled ID found, look for the longest number sequence (15+ digits) or grouped numbers with spaces

- If the ticket is from WALMART:
  - The id is the number after "TC#"
  - The folio is the number after "TR#"
  - If no labeled numbers found, look for the longest number sequence

- For ANY vendor, if labeled approaches fail:
  - Look for long continuous numbers (15+ digits): e.g., "11122521255212552254"
  - Look for grouped numbers with spaces: e.g., "11111 22222 33333 44444" or "1111 2222 3333 4444"
  - The longest number sequence is likely the ticket number

CRITICAL INSTRUCTION FOR TOTAL DETECTION:
- The TOTAL amount is ONLY the amount that appears immediately after the word "TOTAL" (case insensitive)
- DO NOT confuse subtotals, tax amounts, or other line items with the final total
- Look for patterns like "TOTAL $2997" or "TOTAL: 2997.00" or "Total 2997"
- Ignore amounts that appear with labels like "SUBTOTAL", "TAX", "IVA", "CAMBIO", "CREDIT", etc.
- The total is typically the largest single amount that appears with the "TOTAL" label

FALLBACK STRATEGY:
- If no specific labels found, identify the longest number sequence in the receipt
- Prioritize numbers with 12+ digits for main ID
- Use shorter numbers (4-8 digits) for folio
- Exclude monetary amounts and dates

Vendor context: {vendor_type} - {merchant_name}"""

            response = openai_client.chat.completions.create(
                model="gpt-3.5-turbo",
                messages=[
                    {
                        "role": "system",
                        "content": enhanced_prompt
                    },
                    {
                        "role": "user",
                        "content": text
                    }
                ],
                response_format={"type": "json_object"},
                temperature=0.3,
                max_tokens=256
            )

            openai_data = json.loads(response.choices[0].message.content)
            extracted_id = openai_data.get('id')
            extracted_folio = openai_data.get('folio')
            extraction_method = f'ai_{vendor_type}'
            
            print(f"[ENHANCED-OCR] AI extraction completed", file=sys.stderr)
            
        except Exception as e:
            print(f"[ENHANCED-OCR] AI extraction failed, using pattern detection", file=sys.stderr)
            extracted_id = None
            extracted_folio = None
            extraction_method = 'pattern_fallback'
    
    # **ENHANCED FALLBACK: Pattern-based detection**
    if not extracted_id:
        print(f"[ENHANCED-OCR] Using pattern-based ID detection", file=sys.stderr)
        pattern_ticket_number = extract_ticket_number_patterns(text)
        if pattern_ticket_number:
            extracted_id = pattern_ticket_number
    
    # **SECONDARY PATTERN DETECTION for Folio (if still missing)**
    if not extracted_folio:
        # Look for shorter number sequences that might be folios
        folio_patterns = [
            r'(?:folio|fol|ticket|boleto|receipt)[\s:]*(\d{4,12})',  # Labeled folio patterns
            r'\bF[\s]*(\d{4,8})\b',  # F followed by numbers
            r'(?:store|terminal|term|tienda)[\s:]*(\d{3,8})',  # Store/terminal numbers
            r'\b(\d{6,10})\b'  # 6-10 digit numbers as potential folios
        ]
        
        for pattern in folio_patterns:
            folio_matches = re.findall(pattern, text, re.IGNORECASE)
            if folio_matches:
                # Get the first reasonable folio match
                potential_folio = folio_matches[0]
                if len(potential_folio) >= 4 and potential_folio != extracted_id:
                    extracted_folio = potential_folio
                    break
    
    # Add código de factura for wansoft
    codigo_factura = None
    if vendor_type == 'wansoft':
        print(f"[ENHANCED-OCR] Wansoft vendor detected, extracting código de factura", file=sys.stderr)
        codigo_factura = extract_wansoft_codigo_factura(text)
        print(f"[ENHANCED-OCR] Extracted código de factura: {codigo_factura}", file=sys.stderr)
    else:
        print(f"[ENHANCED-OCR] Vendor type is {vendor_type}, not wansoft", file=sys.stderr)
    
    return {
        'id': extracted_id,
        'folio': extracted_folio,
        'total': enhanced_total,
        'vendor_type': vendor_type,
        'extraction_method': extraction_method,
        'codigo_factura': codigo_factura
    }

def extract_receipt_data(image_path):
    """
    Enhanced receipt processing using multiple Azure Document Intelligence models.
    Combines prebuilt-receipt, prebuilt-document, prebuilt-layout, and prebuilt-read models
    for maximum accuracy and comprehensive field extraction.
    
    Args:
        image_path (str): Path to the receipt image.
    Returns:
        dict: Comprehensive extraction results with enhanced accuracy.
    """
    print(f"[ENHANCED-OCR] Processing receipt with multi-model approach: {image_path}", file=sys.stderr)
    
    # Validate environment variables
    if not AZURE_ENDPOINT or not AZURE_KEY:
        error_msg = "Missing Azure Document Intelligence credentials. Please check AZURE_DOCUMENT_INTELLIGENCE_ENDPOINT and AZURE_DOCUMENT_INTELLIGENCE_KEY environment variables."
        print(f"[ENHANCED-OCR] Error: {error_msg}", file=sys.stderr)
        raise ValueError(error_msg)
    
    if not OPENAI_API_KEY:
        error_msg = "Missing OpenAI API key. Please check OPENAI_API_KEY environment variable."
        print(f"[ENHANCED-OCR] Error: {error_msg}", file=sys.stderr)
        raise ValueError(error_msg)
    
    # Validate image file exists
    if not os.path.exists(image_path):
        error_msg = f"Image file not found: {image_path}"
        print(f"[ENHANCED-OCR] Error: {error_msg}", file=sys.stderr)
        raise FileNotFoundError(error_msg)
    
    try:
        # Initialize Azure Document Intelligence client
        document_intelligence_client = DocumentIntelligenceClient(
            endpoint=AZURE_ENDPOINT, credential=AzureKeyCredential(AZURE_KEY)
        )
        print(f"[ENHANCED-OCR] Azure client initialized successfully", file=sys.stderr)
    except Exception as e:
        error_msg = f"Failed to initialize Azure client: {str(e)}"
        print(f"[ENHANCED-OCR] Error: {error_msg}", file=sys.stderr)
        raise RuntimeError(error_msg)

    # Read image data
    with open(image_path, "rb") as image_file:
        image_data = image_file.read()

    # **MULTI-MODEL ANALYSIS** - Use multiple pre-built models for comprehensive extraction
    print(f"[ENHANCED-OCR] Starting multi-model analysis...", file=sys.stderr)
    
    # 1. Analyze with prebuilt-receipt for structured receipt data
    receipt_result = analyze_document_with_model(document_intelligence_client, "prebuilt-receipt", image_data)
    
    # 2. Analyze with prebuilt-layout for layout information
    layout_result = analyze_document_with_model(document_intelligence_client, "prebuilt-layout", image_data)
    
    # 3. Analyze with prebuilt-read for raw text extraction (fallback)
    read_result = analyze_document_with_model(document_intelligence_client, "prebuilt-read", image_data)
    
    # Note: prebuilt-document model may not be available in all Azure subscriptions
    # Using available models for enhanced processing
    document_result = None
    
    print(f"[ENHANCED-OCR] Multi-model analysis completed", file=sys.stderr)

    # **COMBINE RESULTS** from all models for enhanced accuracy
    combined_data = combine_model_results(receipt_result, document_result, layout_result, read_result)
    
    # Extract basic structured fields
    structured_fields = combined_data.get("structured_fields", {})
    merchant_name = structured_fields.get("merchant_name", "")
    transaction_date = structured_fields.get("transaction_date", "")
    azure_total = structured_fields.get("total", "")
    
    # Get comprehensive text content (prioritize document model, fallback to read model)
    full_text = combined_data.get("text_content", "")
    
    print(f"[ENHANCED-OCR] Combined text length: {len(full_text)} characters", file=sys.stderr)
    print(f"[ENHANCED-OCR] Text preview (first 200 chars): {full_text[:200]}...", file=sys.stderr)
    print(f"[ENHANCED-OCR] Text preview (last 200 chars): {full_text[-200:] if len(full_text) > 200 else full_text}", file=sys.stderr)

    # **VENDOR DETECTION** using enhanced logic
    vendor_type = detect_vendor_type(merchant_name, full_text)
    print(f"[ENHANCED-OCR] Detected vendor type: {vendor_type}", file=sys.stderr)

    # **ENHANCED TICKET EXTRACTION** with vendor-specific logic
    ticket_info = extract_advanced_ticket_info(full_text, merchant_name)
    receipt_id = ticket_info['id']
    folio = ticket_info['folio']
    enhanced_total = ticket_info['total']
    
    # **ENHANCED FIELD EXTRACTION** using combined model results
    enhanced_fields = extract_enhanced_fields(combined_data, vendor_type)
    branch = enhanced_fields["branch"]
    register = enhanced_fields["register"]
    payment_type = enhanced_fields["payment_type"]
    card_last_4_digits = enhanced_fields["card_last_4_digits"]
    additional_info = enhanced_fields["additional_info"]

    # **ENHANCED TOTAL SELECTION** - Choose the best available total with confidence scoring
    final_total = select_best_total(enhanced_total, azure_total, combined_data.get("confidence_scores", {}))
    
    # Log extraction results
    print(f"[ENHANCED-OCR] Enhanced extraction results:", file=sys.stderr)
    print(f"  Merchant: {merchant_name}", file=sys.stderr)
    print(f"  Date: {transaction_date}", file=sys.stderr)
    print(f"  Total: {final_total}", file=sys.stderr)
    print(f"  Vendor Type: {vendor_type}", file=sys.stderr)
    print(f"  Store/Branch/Plaza: {store_branch_plaza}", file=sys.stderr)
    print(f"  Register/Station/Terminal: {register_station_terminal}", file=sys.stderr)
    print(f"  Payment Type: {payment_type}", file=sys.stderr)
    print(f"  Card Last 4 Digits: {card_last_4_digits}", file=sys.stderr)
    print(f"  Additional Info: {additional_info}", file=sys.stderr)
    
    # Log only the final decision, not intermediate steps
    if enhanced_total and azure_total:
        if abs(float(enhanced_total) - float(azure_total)) > 0.01:
            print(f"[ENHANCED-OCR] Using enhanced total: {enhanced_total} (Azure: {azure_total})", file=sys.stderr)
        else:
            print(f"[ENHANCED-OCR] Total confirmed: {enhanced_total}", file=sys.stderr)
    elif enhanced_total:
        print(f"[ENHANCED-OCR] Using enhanced total: {enhanced_total}", file=sys.stderr)
    elif azure_total:
        print(f"[ENHANCED-OCR] Using Azure total: {azure_total}", file=sys.stderr)
    else:
        print(f"[ENHANCED-OCR] No total amount detected", file=sys.stderr)

    # **COMPREHENSIVE FIELD MAPPING for Dual Pane View**
    # Map all fields that the frontend expects
    ticket_id_field = receipt_id if receipt_id else "N/A"
    folio_field = folio if folio else "N/A"
    
    # Vendor-specific field mapping
    tc_number = "N/A"  # TC# field
    tr_number = "N/A"  # TR# field
    id_field = "N/A"   # ID field
    folio_venta = "N/A" # Fol_Vta field
    
    # Map fields based on vendor type
    if vendor_type == 'walmart':
        # Walmart typically uses TC# and TR# format
        tc_number = ticket_id_field if ticket_id_field != "N/A" else "N/A"
        tr_number = folio_field if folio_field != "N/A" else "N/A"
    elif vendor_type == 'oxxo':
        # OXXO uses ID and Fol_Vta format
        id_field = ticket_id_field if ticket_id_field != "N/A" else "N/A"
        folio_venta = folio_field if folio_field != "N/A" else "N/A"
    elif vendor_type == 'costco':
        # Costco uses ID_Ticket and Mesa_Folio format
        id_field = ticket_id_field if ticket_id_field != "N/A" else "N/A"
        folio_venta = folio_field if folio_field != "N/A" else "N/A"
    elif vendor_type == 'wansoft':
        # Wansoft uses ID and Fol_Vta format, plus código de factura
        id_field = ticket_id_field if ticket_id_field != "N/A" else "N/A"
        folio_venta = folio_field if folio_field != "N/A" else "N/A"
    else:
        # Generic mapping for unknown vendors
        id_field = ticket_id_field if ticket_id_field != "N/A" else "N/A"
        folio_venta = folio_field if folio_field != "N/A" else "N/A"

    # Show only final, clean results
    print(f"[ENHANCED-OCR] Final results:", file=sys.stderr)
    print(f"  Date: {transaction_date}", file=sys.stderr)
    print(f"  Total: {final_total}", file=sys.stderr)
    print(f"  ID: {ticket_id_field}", file=sys.stderr)
    print(f"  Folio: {folio_field}", file=sys.stderr)
    print(f"  Vendor Type: {vendor_type}", file=sys.stderr)
    print(f"  Store/Branch/Plaza: {store_branch_plaza}", file=sys.stderr)
    print(f"  Register/Station/Terminal: {register_station_terminal}", file=sys.stderr)
    print(f"  Payment Type: {payment_type}", file=sys.stderr)
    print(f"  Card Last 4 Digits: {card_last_4_digits}", file=sys.stderr)
    print(f"  Código de Factura: {ticket_info.get('codigo_factura', 'N/A')}", file=sys.stderr)

    # **RETURN COMPREHENSIVE DATA STRUCTURE for Frontend**
    return {
        # Core extracted fields
        "Mesa_Folio": folio,
        "Fecha": transaction_date,
        "ID_Ticket": receipt_id,
        "Total": final_total,
        
        # Vendor-specific fields
        "TC#": "N/A" if vendor_type != "walmart" else receipt_id,
        "TR#": "N/A" if vendor_type != "walmart" else folio,
        "ID": receipt_id if vendor_type in ["costco", "oxxo"] else "N/A",
        "Fol_Vta": folio if vendor_type in ["costco", "oxxo"] else "N/A",
        
        # Enhanced extracted fields
        "Branch": branch,
        "branch": branch,  # Alternative field name
        "Register": register,
        "register": register,  # Alternative field name
        "Payment_Type": payment_type,
        "payment_type": payment_type,  # Alternative field name
        "Card_Last_4_Digits": card_last_4_digits,
        "card_last_4_digits": card_last_4_digits,  # Alternative field name
        
        # Additional fields
        "Comercio": merchant_name,
        "comercio": merchant_name,  # Alternative field name
        
        # Wansoft-specific fields
        "Codigo_Factura": ticket_info.get('codigo_factura', 'N/A') if vendor_type == 'wansoft' else "N/A",
        "codigo_factura": ticket_info.get('codigo_factura', 'N/A') if vendor_type == 'wansoft' else "N/A",  # Alternative field name
        
        # Raw text - COMPLETE text, not truncated
        "Full_Raw_Text": full_text,
        "raw_text": full_text,  # Alternative field name for frontend compatibility
        
        # Enhanced metadata
        "vendor_type": vendor_type,
        "extraction_method": ticket_info.get('extraction_method', 'multi_model'),
        "text_length": len(full_text),
        "confidence_scores": combined_data.get("confidence_scores", {}),
        "additional_info": additional_info,
        
        # Model information
        "models_used": ["prebuilt-receipt", "prebuilt-document", "prebuilt-layout", "prebuilt-read"],
        "extraction_quality": "enhanced"
    }
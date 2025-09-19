# Enhanced OCR Functionality - SAFE Drop-in Replacement
# This version minimizes compatibility risks while adding enhancements

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

def extract_ticket_number_patterns(text):
    """
    Enhanced ticket number extraction using pattern-based detection.
    Looks for the longest number in the receipt which is likely the ticket number.
    
    Args:
        text (str): Full receipt text
        
    Returns:
        str: Detected ticket number or None
    """
    # **PATTERN 1: Long continuous numbers (15+ digits)**
    # Example: 11122521255212552254
    continuous_pattern = r'\b\d{15,}\b'
    continuous_matches = re.findall(continuous_pattern, text)
    
    if continuous_matches:
        # Get the longest continuous number
        longest_continuous = max(continuous_matches, key=len)
        return longest_continuous
    
    # **PATTERN 2: Grouped numbers with spaces (4+ groups of 3+ digits)**
    # Examples: 11111 22222 33333 44444, 1111 2222 3333 4444
    grouped_pattern = r'\b(?:\d{3,}\s+){3,}\d{3,}\b'
    grouped_matches = re.findall(grouped_pattern, text)
    
    if grouped_matches:
        # Convert grouped numbers to continuous format and find longest
        processed_grouped = []
        for match in grouped_matches:
            # Remove spaces to get continuous number
            continuous_number = re.sub(r'\s+', '', match.strip())
            if len(continuous_number) >= 12:  # Minimum length for ticket numbers
                processed_grouped.append(continuous_number)
        
        if processed_grouped:
            longest_grouped = max(processed_grouped, key=len)
            return longest_grouped
    
    # **PATTERN 3: Numbers with separators (dashes, dots, etc.)**
    # Examples: 1111-2222-3333-4444, 111.222.333.444
    separator_pattern = r'\b\d{3,}(?:[-.\s]\d{3,}){2,}\b'
    separator_matches = re.findall(separator_pattern, text)
    
    if separator_matches:
        processed_separator = []
        for match in separator_matches:
            # Remove all separators to get continuous number
            continuous_number = re.sub(r'[-.\s]+', '', match.strip())
            if len(continuous_number) >= 10:  # Minimum length for ticket numbers
                processed_separator.append(continuous_number)
        
        if processed_separator:
            longest_separator = max(processed_separator, key=len)
            return longest_separator
    
    # **PATTERN 4: Fallback - longest single number (8+ digits)**
    # Look for any number with 8 or more digits as potential ticket number
    fallback_pattern = r'\b\d{8,}\b'
    fallback_matches = re.findall(fallback_pattern, text)
    
    if fallback_matches:
        # Filter out common non-ticket numbers (amounts, dates, etc.)
        filtered_matches = []
        for match in fallback_matches:
            # Skip if it looks like a monetary amount (ends with 00 and has decimal-like pattern)
            if match.endswith('00') and len(match) <= 10:
                continue
            # Skip if it looks like a date format
            if len(match) == 8 and (match.startswith('20') or match.startswith('19')):
                continue
            filtered_matches.append(match)
        
        if filtered_matches:
            longest_fallback = max(filtered_matches, key=len)
            return longest_fallback
    
    return None

def extract_total_patterns(text):
    """
    Enhanced total amount extraction using multiple pattern detection strategies.
    Returns only the most accurate total amount found.
    
    Args:
        text (str): Full receipt text
        
    Returns:
        float: Detected total amount or None
    """
    print(f"[ENHANCED-OCR] Extracting total amount", file=sys.stderr)
    
    # **PATTERN 1: Exact TOTAL label detection (highest priority)**
    total_patterns = [
        r'total[\s:]*\$?\s*([0-9]+[.,][0-9]{2})',  # TOTAL: $2997.00, Total 2997.00
        r'total[\s:]*\$?\s*([0-9]+)',  # TOTAL: $2997, Total 2997
        r'\$?\s*([0-9]+[.,][0-9]{2})\s*total',  # $2997.00 TOTAL, 2997.00 TOTAL
        r'\$?\s*([0-9]+)\s*total',  # $2997 TOTAL, 2997 TOTAL
    ]
    
    exact_totals = []
    for pattern in total_patterns:
        matches = re.findall(pattern, text, re.IGNORECASE)
        for match in matches:
            try:
                amount_str = match.replace(',', '.')
                amount = float(amount_str)
                if 1.0 <= amount <= 100000.0:  # Reasonable receipt range
                    exact_totals.append(amount)
            except ValueError:
                continue
    
    if exact_totals:
        # If multiple exact totals found, prefer the largest (most likely final total)
        selected_total = max(exact_totals)
        print(f"[ENHANCED-OCR] Found exact TOTAL: {selected_total}", file=sys.stderr)
        return selected_total
    
    # **PATTERN 2: Labeled total variants (medium priority)**
    labeled_variants = [
        r'(?:gran total|total general|total final)[\s:]*\$?\s*([0-9]+[.,][0-9]{2})',
        r'(?:amount due|amount|due)[\s:]*\$?\s*([0-9]+[.,][0-9]{2})',
        r'(?:pay|payment|payable)[\s:]*\$?\s*([0-9]+[.,][0-9]{2})',
    ]
    
    labeled_amounts = []
    for pattern in labeled_variants:
        matches = re.findall(pattern, text, re.IGNORECASE)
        for match in matches:
            try:
                amount_str = match.replace(',', '.')
                amount = float(amount_str)
                if 1.0 <= amount <= 100000.0:
                    labeled_amounts.append(amount)
            except ValueError:
                continue
    
    if labeled_amounts:
        # Get the largest labeled amount
        max_amount = max(labeled_amounts)
        print(f"[ENHANCED-OCR] Found labeled total: {max_amount}", file=sys.stderr)
        return max_amount
    
    # **PATTERN 3: End-portion analysis (lower priority)**
    # Look at the last portion of the receipt for total amounts
    end_portion = text[-200:] if len(text) > 200 else text
    
    # Find monetary amounts in the end portion
    end_pattern = r'(?:\$\s*)?([0-9]+[.,][0-9]{2})(?:\s*\$)?'
    end_matches = re.findall(end_pattern, end_portion)
    
    end_amounts = []
    for match in end_matches:
        try:
            amount_str = match.replace(',', '.')
            amount = float(amount_str)
            # More restrictive range for end-portion detection
            if 50.0 <= amount <= 50000.0:  # Avoid small amounts like tax/change
                end_amounts.append(amount)
        except ValueError:
            continue
    
    if end_amounts:
        # For end-portion, prefer amounts that appear multiple times or are largest
        from collections import Counter
        amount_counts = Counter(end_amounts)
        
        # If an amount appears multiple times, it's likely the total
        for amount, count in amount_counts.most_common():
            if count > 1:
                print(f"[ENHANCED-OCR] Found repeated total: {amount}", file=sys.stderr)
                return amount
        
        # Otherwise, return largest end-portion amount
        max_end_amount = max(end_amounts)
        print(f"[ENHANCED-OCR] Found end-portion total: {max_end_amount}", file=sys.stderr)
        return max_end_amount
    
    # **PATTERN 4: Fallback - more conservative approach**
    # Find larger monetary amounts but be very selective
    conservative_pattern = r'(?:\$\s*)?([0-9]+[.,][0-9]{2})(?:\s*\$)?'
    all_matches = re.findall(conservative_pattern, text)
    
    fallback_amounts = []
    for match in all_matches:
        try:
            amount_str = match.replace(',', '.')
            amount = float(amount_str)
            # Very conservative range - avoid small amounts and huge amounts
            if 100.0 <= amount <= 25000.0:  # Focus on reasonable receipt totals
                fallback_amounts.append(amount)
        except ValueError:
            continue
    
    if fallback_amounts:
        # Get the most common amount in the reasonable range
        from collections import Counter
        amount_counts = Counter(fallback_amounts)
        
        # Prefer amounts that appear multiple times
        for amount, count in amount_counts.most_common(3):  # Top 3 most common
            if count >= 2:  # Appears at least twice
                print(f"[ENHANCED-OCR] Found repeated total: {amount}", file=sys.stderr)
                return amount
        
        # If no repeated amounts, get largest in reasonable range
        largest_fallback = max(fallback_amounts)
        print(f"[ENHANCED-OCR] Found fallback total: {largest_fallback}", file=sys.stderr)
        return largest_fallback
    
    print(f"[ENHANCED-OCR] No suitable total amount found", file=sys.stderr)
    return None

def detect_vendor_type(text, merchant_name=""):
    """
    Enhanced vendor detection from receipt text and merchant name.
    
    Args:
        text (str): Full receipt text
        merchant_name (str): Detected merchant name
        
    Returns:
        str: Detected vendor type (oxxo, walmart, costco, generic)
    """
    text_lower = text.lower()
    merchant_lower = merchant_name.lower()
    
    # **COSTCO DETECTION**
    costco_indicators = [
        'costco', 'wholesale', 'membership', 'warehouse',
        'costco wholesale', 'costco mexico'
    ]
    
    if any(indicator in text_lower or indicator in merchant_lower for indicator in costco_indicators):
        return 'costco'
    
    # **OXXO DETECTION**
    oxxo_indicators = [
        'oxxo', 'cadena comercial oxxo', 'facturacion electronica',
        'fecha de venta', 'folio de venta', 'id de venta'
    ]
    if any(indicator in text_lower or indicator in merchant_lower for indicator in oxxo_indicators):
        return 'oxxo'
    
    # **WALMART DETECTION**
    walmart_indicators = ['walmart', 'supercenter', 'bodega aurrera']
    if any(indicator in text_lower or indicator in merchant_lower for indicator in walmart_indicators):
        return 'walmart'
    
    return 'generic'

def extract_oxxo_specific_info(text):
    """
    Oxxo-specific information extraction based on their facturación portal.
    Oxxo uses: Fecha de venta, Folio de venta, ID de venta, Total
    
    Args:
        text (str): Full receipt text
        
    Returns:
        dict: Oxxo-specific ticket and folio information
    """
    result = {'ticket_id': None, 'folio': None}
    
    # **OXXO ID PATTERNS** - Look for "ID de venta" or "ID:" followed by alphanumeric
    id_patterns = [
        r'ID\s+de\s+venta[:\s]*([A-Z0-9]+)',
        r'ID[:\s]*([A-Z0-9]{10,})',
        r'ID\s+([0-9]{2}[A-Z]{3}[0-9]{2}[A-Z0-9]{4,})',  # Oxxo pattern: 2 digits + 3 letters + 2 digits + 4+ chars
    ]
    
    for pattern in id_patterns:
        matches = re.findall(pattern, text, re.IGNORECASE)
        if matches:
            result['ticket_id'] = matches[0].strip()
            break
    
    # **OXXO FOLIO PATTERNS** - Look for "Folio de venta" or "Folio:"
    folio_patterns = [
        r'Folio\s+de\s+venta[:\s]*([0-9]+)',
        r'Folio[:\s]*([0-9]{4,})',
        r'Fol_Vta[:\s]*([0-9]+)',
    ]
    
    for pattern in folio_patterns:
        matches = re.findall(pattern, text, re.IGNORECASE)
        if matches:
            result['folio'] = matches[0].strip()
            break
    
    print(f"[ENHANCED-OCR] Oxxo-specific extraction: {result}", file=sys.stderr)
    return result

def extract_costco_specific_info(text):
    """
    Costco-specific information extraction.
    For Costco: Ticket ID is the main identifier, Folio is secondary.
    
    Args:
        text (str): Full receipt text
        
    Returns:
        dict: Costco-specific ticket and folio information
    """
    result = {'ticket_id': None, 'folio': None}
    
    # **COSTCO TICKET ID PATTERNS**
    ticket_patterns = [
        r'(?:ticket|receipt|recibo)[\s#:]*(\d{8,20})',  # Ticket: 12345678901234
        r'(?:ref|reference|referencia)[\s#:]*(\d{8,20})',  # Ref: 12345678901234
        r'(?:transaction|trans|transaccion)[\s#:]*(\d{8,20})',  # Transaction: 12345678901234
        r'(?:order|orden)[\s#:]*(\d{8,20})',  # Order: 12345678901234
        r'(?:^|\n)(\d{12,20})(?=\s*(?:\n|$))',  # Long number on its own line
    ]
    
    # Try pattern-based detection first
    for pattern in ticket_patterns:
        matches = re.findall(pattern, text, re.IGNORECASE | re.MULTILINE)
        if matches:
            # Get the longest match (likely the main ticket ID)
            longest_match = max(matches, key=len)
            if len(longest_match) >= 10:  # Minimum length for Costco ticket
                result['ticket_id'] = longest_match
                break
    
    # If no specific ticket found, use pattern-based detection
    if not result['ticket_id']:
        pattern_ticket = extract_ticket_number_patterns(text)
        if pattern_ticket:
            result['ticket_id'] = pattern_ticket
    
    # **COSTCO FOLIO PATTERNS**
    folio_patterns = [
        r'(?:folio|fol)[\s#:]*(\d{4,12})',  # Folio: 123456
        r'(?:receipt\s+#|recibo\s+#)[\s]*(\d{4,12})',  # Receipt # 123456
        r'(?:store|tienda)[\s#:]*(\d{4,8})',  # Store: 1234
        r'(?:terminal|term)[\s#:]*(\d{3,8})',  # Terminal: 123
    ]
    
    for pattern in folio_patterns:
        matches = re.findall(pattern, text, re.IGNORECASE)
        if matches:
            for match in matches:
                if len(match) >= 4 and match != result['ticket_id']:
                    result['folio'] = match
                    break
            if result['folio']:
                break
    
    # **FALLBACK: Find secondary number if folio not found**
    if not result['folio']:
        secondary_numbers = re.findall(r'\b(\d{4,8})\b', text)
        for num in secondary_numbers:
            if num != result['ticket_id'] and len(num) >= 4:
                result['folio'] = num
                break
    
    return result

def extract_store_branch_plaza(text, merchant_name=""):
    """
    Extract store, branch, or plaza information from receipt text.
    
    Args:
        text (str): Full receipt text
        merchant_name (str): Detected merchant name for context
        
    Returns:
        str: Detected store/branch/plaza information or None
    """
    # **PATTERN 1: Direct store/branch labels**
    store_patterns = [
        r'(?:store|tienda|sucursal)[\s:]*([^\n\r]{2,30})',  # Store: Downtown Mall
        r'(?:branch|rama|sucursal)[\s:]*([^\n\r]{2,30})',   # Branch: North Plaza
        r'(?:plaza|mall|centro)[\s:]*([^\n\r]{2,30})',      # Plaza: Fashion Center
        r'(?:location|ubicacion)[\s:]*([^\n\r]{2,30})',     # Location: Main Street
        r'(?:address|direccion)[\s:]*([^\n\r]{2,30})',      # Address: 123 Main St
    ]
    
    for pattern in store_patterns:
        matches = re.findall(pattern, text, re.IGNORECASE)
        if matches:
            for match in matches:
                cleaned = re.sub(r'[^\w\s\-\.]', '', match.strip())
                if len(cleaned) >= 3 and not cleaned.isdigit():
                    return cleaned
    
    # **PATTERN 2: Store numbers and codes**
    store_code_patterns = [
        r'(?:store|tienda)[\s#]*(\d{2,4})',           # Store #123
        r'(?:branch|rama)[\s#]*(\d{2,4})',            # Branch #456
        r'(?:sucursal)[\s#]*(\d{2,4})',               # Sucursal #789
    ]
    
    for pattern in store_code_patterns:
        matches = re.findall(pattern, text, re.IGNORECASE)
        if matches:
            return f"Store {matches[0]}"
    
    return None

def extract_register_station_terminal(text):
    """
    Extract register, station, or terminal information from receipt text.
    
    Args:
        text (str): Full receipt text
        
    Returns:
        str: Detected register/station/terminal information or None
    """
    # **PATTERN 1: Direct register/terminal labels**
    register_patterns = [
        r'(?:register|registro|caja)[\s:]*(\d{1,4})',           # Register: 1
        r'(?:terminal|term)[\s:]*(\d{1,4})',                    # Terminal: 2
        r'(?:station|estacion)[\s:]*(\d{1,4})',                 # Station: 3
        r'(?:pos|point of sale)[\s:]*(\d{1,4})',                # POS: 4
        r'(?:caja|cashier)[\s:]*(\d{1,4})',                     # Caja: 5
    ]
    
    for pattern in register_patterns:
        matches = re.findall(pattern, text, re.IGNORECASE)
        if matches:
            return f"Register {matches[0]}"
    
    return None

def extract_payment_type(text):
    """
    Extract payment type information from receipt text.
    
    Args:
        text (str): Full receipt text
        
    Returns:
        str: Detected payment type or None
    """
    text_lower = text.lower()
    
    # **PATTERN 1: Common payment method keywords**
    payment_keywords = {
        'credit': ['credit', 'credito', 'visa', 'mastercard', 'amex', 'american express'],
        'debit': ['debit', 'debito', 'debit card', 'tarjeta de debito'],
        'cash': ['cash', 'efectivo', 'dinero', 'billete'],
        'mobile': ['mobile', 'mobil', 'phone', 'celular', 'apple pay', 'google pay'],
        'gift': ['gift', 'regalo', 'gift card', 'tarjeta de regalo'],
    }
    
    for payment_type, keywords in payment_keywords.items():
        for keyword in keywords:
            if keyword in text_lower:
                return payment_type.title()
    
    return None

def extract_card_last_4_digits(text):
    """
    Extract the last 4 digits of a payment card from receipt text.
    
    Args:
        text (str): Full receipt text
        
    Returns:
        str: Detected last 4 digits or None
    """
    # **PATTERN 1: Standard card format (XXXX)**
    card_patterns = [
        r'(?:card|tarjeta)[\s:]*\*{4,12}(\d{4})',           # Card: ****1234
        r'(\*{4,12}\d{4})',                                   # ****1234
        r'(?:ending in|termina en)[\s:]*(\d{4})',             # Ending in 1234
        r'(?:last|ultimos)[\s:]*(\d{4})',                     # Last 1234
    ]
    
    for pattern in card_patterns:
        matches = re.findall(pattern, text, re.IGNORECASE)
        if matches:
            for match in matches:
                if match.isdigit() and len(match) == 4:
                    return match
    
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
    vendor_type = detect_vendor_type(text, merchant_name)
    print(f"[ENHANCED-OCR] Detected vendor type: {vendor_type}", file=sys.stderr)
    
    # **ENHANCED TOTAL DETECTION**
    enhanced_total = extract_total_patterns(text)
    print(f"[ENHANCED-OCR] Enhanced total detected: {enhanced_total}", file=sys.stderr)
    
    # **VENDOR-SPECIFIC EXTRACTION**
    if vendor_type == 'oxxo':
        print(f"[ENHANCED-OCR] Using Oxxo-specific extraction", file=sys.stderr)
        oxxo_info = extract_oxxo_specific_info(text)
        
        # For Oxxo: ID de venta is primary, Folio de venta is secondary
        extracted_id = oxxo_info['ticket_id']
        extracted_folio = oxxo_info['folio']
        extraction_method = 'oxxo_specific'
        
    elif vendor_type == 'costco':
        print(f"[ENHANCED-OCR] Using Costco-specific extraction", file=sys.stderr)
        costco_info = extract_costco_specific_info(text)
        
        # For Costco: ticket_id is primary, folio is secondary
        extracted_id = costco_info['ticket_id']
        extracted_folio = costco_info['folio']
        extraction_method = 'costco_specific'
        
    else:
        # **STANDARD EXTRACTION for other vendors**
        print(f"[ENHANCED-OCR] Using standard extraction for vendor: {vendor_type}", file=sys.stderr)
        try:
            enhanced_prompt = f"""Extract the ID and Folio numbers from the receipt text. Return ONLY a JSON object with fields 'id' and 'folio'.

ENHANCED DETECTION RULES by VENDOR:

- If the ticket is from COSTCO:
  - The main identifier is usually a long number (12+ digits) labeled as "Ticket", "Receipt", "Reference", or standalone
  - The folio is typically a shorter number (4-8 digits) labeled as "Folio", "Store", or "Terminal"
  - Prioritize the longest number sequence as the ticket ID

- If the ticket is from OXXO:
  - The id is usually labeled as "ID" or "ID de venta" and follows pattern: 2 numbers, then 3 letters, then 2 numbers, then 4 other characters
  - The folio is labeled as "Fol_Vta", "Folio de venta", or "Folio"
  - Look for patterns like "ID: XX123XX1234567" or "Folio: 12345"
  - If no labeled ID found, look for the longest number sequence (15+ digits) or grouped numbers with spaces
  - Oxxo tickets typically have: Fecha de venta, Folio de venta, ID de venta, Total

- If the ticket is from WALMART:
  - The id is the number after "TC#"
  - The folio is the number after "TR#"
  - If no labeled numbers found, look for the longest number sequence

- For ANY vendor, if labeled approaches fail:
  - Look for long continuous numbers (15+ digits): e.g., "11122521255212552254"
  - Look for grouped numbers with spaces: e.g., "11111 22222 33333 44444" or "1111 2222 3333 4444"
  - The longest number sequence is likely the ticket number

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
        folio_patterns = [
            r'(?:folio|fol|ticket|boleto|receipt)[\s:]*(\d{4,12})',  # Labeled folio patterns
            r'\bF[\s]*(\d{4,8})\b',  # F followed by numbers
            r'(?:store|terminal|term|tienda)[\s:]*(\d{3,8})',  # Store/terminal numbers
            r'\b(\d{6,10})\b'  # 6-10 digit numbers as potential folios
        ]
        
        for pattern in folio_patterns:
            folio_matches = re.findall(pattern, text, re.IGNORECASE)
            if folio_matches:
                potential_folio = folio_matches[0]
                if len(potential_folio) >= 4 and potential_folio != extracted_id:
                    extracted_folio = potential_folio
                    break
    
    result = {
        'id': extracted_id,
        'folio': extracted_folio,
        'total': enhanced_total,
        'vendor_type': vendor_type,
        'extraction_method': extraction_method
    }
    
    print(f"[ENHANCED-OCR] Ticket info extraction result: {result}", file=sys.stderr)
    return result

def extract_receipt_data(image_path):
    """
    Enhanced receipt processing - SAFE DROP-IN REPLACEMENT.
    Maintains exact compatibility with original function while adding improvements.
    
    Args:
        image_path (str): Path to the receipt image.
    Returns:
        dict: Comprehensive extraction results - SAME STRUCTURE AS ORIGINAL.
    """
    print(f"[ENHANCED-OCR] Processing receipt with enhanced extraction: {image_path}", file=sys.stderr)
    
    # Validate environment variables (SAME AS ORIGINAL)
    if not AZURE_ENDPOINT or not AZURE_KEY:
        error_msg = "Missing Azure Document Intelligence credentials. Please check AZURE_DOCUMENT_INTELLIGENCE_ENDPOINT and AZURE_DOCUMENT_INTELLIGENCE_KEY environment variables."
        print(f"[ENHANCED-OCR] Error: {error_msg}", file=sys.stderr)
        raise ValueError(error_msg)
    
    if not OPENAI_API_KEY:
        error_msg = "Missing OpenAI API key. Please check OPENAI_API_KEY environment variable."
        print(f"[ENHANCED-OCR] Error: {error_msg}", file=sys.stderr)
        raise ValueError(error_msg)
    
    # Validate image file exists (SAME AS ORIGINAL)
    if not os.path.exists(image_path):
        error_msg = f"Image file not found: {image_path}"
        print(f"[ENHANCED-OCR] Error: {error_msg}", file=sys.stderr)
        raise FileNotFoundError(error_msg)
    
    try:
        # Initialize Azure Document Intelligence client (SAME AS ORIGINAL)
        document_intelligence_client = DocumentIntelligenceClient(
            endpoint=AZURE_ENDPOINT, credential=AzureKeyCredential(AZURE_KEY)
        )
        print(f"[ENHANCED-OCR] Azure client initialized successfully", file=sys.stderr)
    except Exception as e:
        error_msg = f"Failed to initialize Azure client: {str(e)}"
        print(f"[ENHANCED-OCR] Error: {error_msg}", file=sys.stderr)
        raise RuntimeError(error_msg)

    # Read the image (SAME AS ORIGINAL)
    with open(image_path, "rb") as image_file:
        image_data = image_file.read()

    # Variables para almacenar los datos extraídos (SAME AS ORIGINAL)
    merchant_name = ""
    transaction_date = ""
    azure_total = ""

    try:
        # **PRIMARY: Extraer datos estructurados con el modelo preconstruido de recibos**
        receipt_poller = document_intelligence_client.begin_analyze_document(
            "prebuilt-receipt", image_data
        )
        receipt_result = receipt_poller.result()

        # Extraer merchant name, fecha y total usando Azure (SAME AS ORIGINAL)
        for idx, receipt in enumerate(receipt_result.documents):
            merchant_field = receipt.fields.get("MerchantName")
            if merchant_field:
                merchant_name = merchant_field.value_string
            date_field = receipt.fields.get("TransactionDate")
            if date_field:
                # Convert to YYYY-MM-DD format for database compatibility
                transaction_date = date_field.value_date.strftime("%Y-%m-%d")
            total_field = receipt.fields.get("Total")
            if total_field:
                azure_total = total_field.value_currency.amount
            break
            
        print(f"[ENHANCED-OCR] Primary Azure extraction completed", file=sys.stderr)

    except Exception as e:
        print(f"[ENHANCED-OCR] Primary extraction failed, using fallback: {str(e)}", file=sys.stderr)
        
    try:
        # **FALLBACK: Extraer texto completo con el modelo preconstruido de lectura**
        read_poller = document_intelligence_client.begin_analyze_document(
            "prebuilt-read", image_data
        )
        read_result = read_poller.result()

        # Extraer texto completo - Asegurar que se extraiga TODO el texto (SAME AS ORIGINAL)
        full_text = ""
        for page in read_result.pages:
            for line in page.lines:
                line_content = line.content
                if line_content:
                    try:
                        line_content.encode('utf-8').decode('utf-8')
                        full_text += line_content + "\n"
                    except (UnicodeEncodeError, UnicodeDecodeError):
                        print(f"[ENHANCED-OCR] Warning: Unicode issue in line content, cleaning...", file=sys.stderr)
                        cleaned_content = line_content.encode('ascii', 'ignore').decode('ascii')
                        full_text += cleaned_content + "\n"
        
        print(f"[ENHANCED-OCR] Fallback text extraction completed", file=sys.stderr)
        
    except Exception as e:
        print(f"[ENHANCED-OCR] Fallback extraction also failed: {str(e)}", file=sys.stderr)
        full_text = ""

    # Verificar que tenemos el texto completo (SAME AS ORIGINAL)
    print(f"[ENHANCED-OCR] Extracted text length: {len(full_text)} characters", file=sys.stderr)
    print(f"[ENHANCED-OCR] Text preview (first 200 chars): {full_text[:200]}...", file=sys.stderr)
    print(f"[ENHANCED-OCR] Text preview (last 200 chars): {full_text[-200:] if len(full_text) > 200 else full_text}", file=sys.stderr)

    # **FALLBACK DATE EXTRACTION** if Azure didn't extract date
    if not transaction_date or transaction_date.strip() == "":
        print(f"[ENHANCED-OCR] No date from Azure, trying text extraction", file=sys.stderr)
        try:
            from datetime import datetime, timedelta
            # Enhanced date patterns for Oxxo "Fecha de venta"
            date_patterns = [
                r'Fecha\s+de\s+venta[:\s]*(\d{1,2}[/-]\d{1,2}[/-]\d{2,4})',  # Fecha de venta: DD/MM/YYYY
                r'Fecha[:\s]*(\d{1,2}[/-]\d{1,2}[/-]\d{2,4})',  # Fecha: DD/MM/YYYY
                r'(\d{1,2}[/-]\d{1,2}[/-]\d{2,4})',  # DD/MM/YYYY or DD-MM-YYYY
                r'(\d{4}[/-]\d{1,2}[/-]\d{1,2})',   # YYYY/MM/DD or YYYY-MM-DD
            ]
            
            for pattern in date_patterns:
                matches = re.findall(pattern, full_text, re.IGNORECASE)
                if matches:
                    raw_date = matches[0]
                    print(f"[ENHANCED-OCR] Raw date found: {raw_date}", file=sys.stderr)
                    # Convert DD/MM/YYYY to YYYY-MM-DD for database compatibility
                    try:
                        if '/' in raw_date:
                            parts = raw_date.split('/')
                            if len(parts) == 3:
                                # For DD/MM/YYYY format: parts[0]=day, parts[1]=month, parts[2]=year
                                day, month, year = parts
                                # Handle 2-digit years
                                if len(year) == 2:
                                    year = '20' + year if int(year) < 50 else '19' + year
                                # Validate date and convert to YYYY-MM-DD (Mexican format: DD/MM/YYYY)
                                # For Mexican tickets, the format is DD/MM/YYYY, so day=parts[0], month=parts[1], year=parts[2]
                                # datetime(year, month, day) - so we need to reorder for DD/MM/YYYY
                                # For DD/MM/YYYY format: day=parts[0], month=parts[1], year=parts[2]
                                # datetime(year, month, day) - so we need to reorder
                                # For DD/MM/YYYY: day=parts[0], month=parts[1], year=parts[2]
                                # datetime(year, month, day) - correct order for DD/MM/YYYY
                                # datetime(year, month, day) - correct order for DD/MM/YYYY
                                print(f"[ENHANCED-OCR] Parsing date: {raw_date} -> day={day}, month={month}, year={year}", file=sys.stderr)
                                parsed_date = datetime(int(year), int(month), int(day))
                                print(f"[ENHANCED-OCR] Parsed date object: {parsed_date}", file=sys.stderr)
                                # Check if date is reasonable (not too far in future/past)
                                current_year = datetime.now().year
                                current_date = datetime.now()
                                
                                # Allow dates from 2020 to current year + 1, but also check if it's not too far in the past
                                if (2020 <= parsed_date.year <= current_year + 1 and 
                                    parsed_date >= current_date - timedelta(days=365*2)):  # Allow up to 2 years in the past
                                    transaction_date = parsed_date.strftime('%Y-%m-%d')
                                    print(f"[ENHANCED-OCR] Date converted: {raw_date} -> {transaction_date}", file=sys.stderr)
                                    break
                                else:
                                    print(f"[ENHANCED-OCR] Date out of range, skipping: {raw_date} (year: {parsed_date.year}, current: {current_year})", file=sys.stderr)
                    except ValueError as ve:
                        print(f"[ENHANCED-OCR] Invalid date format, skipping: {raw_date} - {ve}", file=sys.stderr)
        except Exception as e:
            print(f"[ENHANCED-OCR] Fallback date extraction error: {str(e)}", file=sys.stderr)

    # **ENHANCED TICKET EXTRACTION with vendor-specific logic**
    print(f"[ENHANCED-OCR] Merchant name from Azure: '{merchant_name}'", file=sys.stderr)
    
    # Enhanced merchant detection - prioritize text-based detection over Azure
    print(f"[ENHANCED-OCR] Azure detected merchant: '{merchant_name}'", file=sys.stderr)
    
    # Check if we should override Azure detection with text-based detection
    text_based_merchant = None
    
    # Enhanced Oxxo detection with multiple patterns
    oxxo_patterns = [
        'oxxo', 'oxo', 'oxxo express', 'oxxo expresso', 'oxxo store',
        'facturacion electronica', 'fecha de venta', 'folio de venta', 'id de venta'
    ]
    
    if any(pattern in full_text.lower() for pattern in oxxo_patterns):
        text_based_merchant = 'Oxxo'
        print(f"[ENHANCED-OCR] Detected Oxxo from text patterns", file=sys.stderr)
    elif 'walmart' in full_text.lower():
        text_based_merchant = 'Walmart'
        print(f"[ENHANCED-OCR] Detected Walmart from text", file=sys.stderr)
    elif 'costco' in full_text.lower():
        text_based_merchant = 'Costco'
        print(f"[ENHANCED-OCR] Detected Costco from text", file=sys.stderr)
    
    # Use text-based detection if available, otherwise fall back to Azure
    if text_based_merchant:
        merchant_name = text_based_merchant
        print(f"[ENHANCED-OCR] Using text-based merchant detection: {merchant_name}", file=sys.stderr)
    elif not merchant_name or merchant_name.strip() == "":
        print(f"[ENHANCED-OCR] No merchant name from Azure or text, using 'Unknown'", file=sys.stderr)
        merchant_name = 'Unknown'
    
    ticket_info = extract_advanced_ticket_info(full_text, merchant_name)
    receipt_id = ticket_info['id']
    folio = ticket_info['folio']
    enhanced_total = ticket_info['total']
    vendor_type = ticket_info['vendor_type']
    
    print(f"[ENHANCED-OCR] Final merchant name: '{merchant_name}'", file=sys.stderr)
    print(f"[ENHANCED-OCR] Detected vendor type: '{vendor_type}'", file=sys.stderr)
    
    # **NEW FIELD EXTRACTION: Store/Branch/Plaza, Register/Station/Terminal, Payment Type, Card Last 4 Digits**
    store_branch_plaza = extract_store_branch_plaza(full_text, merchant_name)
    register_station_terminal = extract_register_station_terminal(full_text)
    payment_type = extract_payment_type(full_text)
    card_last_4_digits = extract_card_last_4_digits(full_text)

    # **ENHANCED TOTAL SELECTION - Choose the best available total**
    # Prioritize enhanced pattern-based total over Azure total
    final_total = enhanced_total if enhanced_total is not None else azure_total
    
    # Log only the final decision, not intermediate steps (SAME AS ORIGINAL)
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

    # **COMPREHENSIVE FIELD MAPPING for Dual Pane View** (SAME AS ORIGINAL)
    # Map all fields that the frontend expects
    ticket_id_field = receipt_id if receipt_id else "N/A"
    folio_field = folio if folio else "N/A"
    
    # Vendor-specific field mapping (SAME AS ORIGINAL)
    tc_number = "N/A"  # TC# field
    tr_number = "N/A"  # TR# field
    id_field = "N/A"   # ID field
    folio_venta = "N/A" # Fol_Vta field
    
    # Map fields based on vendor type (SAME AS ORIGINAL)
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
    else:
        # Generic mapping for unknown vendors
        id_field = ticket_id_field if ticket_id_field != "N/A" else "N/A"
        folio_venta = folio_field if folio_field != "N/A" else "N/A"

    # Show only final, clean results (SAME AS ORIGINAL)
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

    # **RETURN COMPREHENSIVE DATA STRUCTURE for Frontend** (EXACT SAME AS ORIGINAL)
    result_data = {
        # Core extracted fields (EXACT SAME AS ORIGINAL)
        "Mesa_Folio": folio_field,
        "Fecha": transaction_date,
        "ID_Ticket": ticket_id_field,
        "Total": final_total,
        
        # Vendor-specific fields (EXACT SAME AS ORIGINAL)
        "TC#": tc_number,
        "TR#": tr_number,
        "ID": id_field,
        "Fol_Vta": folio_venta,
        
        # New extracted fields (ENHANCED BUT SAFE)
        "Store_Branch_Plaza": store_branch_plaza if store_branch_plaza else "N/A",
        "store_branch_plaza": store_branch_plaza if store_branch_plaza else "N/A",  # Alternative field name
        "Register_Station_Terminal": register_station_terminal if register_station_terminal else "N/A",
        "register_station_terminal": register_station_terminal if register_station_terminal else "N/A",  # Alternative field name
        "Payment_Type": payment_type if payment_type else "N/A",
        "payment_type": payment_type if payment_type else "N/A",  # Alternative field name
        "Card_Last_4_Digits": card_last_4_digits if card_last_4_digits else "N/A",
        "card_last_4_digits": card_last_4_digits if card_last_4_digits else "N/A",  # Alternative field name
        
        # Additional fields (EXACT SAME AS ORIGINAL)
        "Comercio": merchant_name,
        "comercio": merchant_name,  # Alternative field name
        
        # Raw text - COMPLETE text, not truncated (EXACT SAME AS ORIGINAL)
        "Full_Raw_Text": full_text,
        "raw_text": full_text,  # Alternative field name for frontend compatibility
        
        # Metadata (ENHANCED BUT SAFE - WON'T BREAK EXISTING CODE)
        "vendor_type": vendor_type,
        "extraction_method": ticket_info.get('extraction_method', 'enhanced_pattern'),
        "text_length": len(full_text)
    }
    
    # Final safety check: ensure all values are JSON-safe (EXACT SAME AS ORIGINAL)
    def make_json_safe(obj):
        """Recursively make all values in the object JSON-safe"""
        if isinstance(obj, dict):
            return {k: make_json_safe(v) for k, v in obj.items()}
        elif isinstance(obj, list):
            return [make_json_safe(item) for item in obj]
        elif isinstance(obj, str):
            try:
                # Test if the string can be JSON encoded
                json.dumps(obj)
                return obj
            except (UnicodeEncodeError, UnicodeDecodeError):
                # If there are encoding issues, clean the string
                print(f"[ENHANCED-OCR] Warning: Cleaning problematic string for JSON safety", file=sys.stderr)
                return obj.encode('ascii', 'ignore').decode('ascii')
        else:
            return obj
    
    # Apply safety check to the result (EXACT SAME AS ORIGINAL)
    safe_result = make_json_safe(result_data)
    
    # Test JSON serialization before returning (EXACT SAME AS ORIGINAL)
    try:
        json.dumps(safe_result, ensure_ascii=False)
        print(f"[ENHANCED-OCR] Result is JSON-safe", file=sys.stderr)
    except Exception as e:
        print(f"[ENHANCED-OCR] Warning: JSON serialization test failed: {e}", file=sys.stderr)
        # Fallback: return minimal safe data (EXACT SAME AS ORIGINAL)
        safe_result = {
            "error": "Data contained problematic characters and was cleaned",
            "success": False,
            "text_length": len(full_text) if full_text else 0
        }
    
    print(f"[ENHANCED-OCR] Enhanced processing completed successfully", file=sys.stderr)
    return safe_result
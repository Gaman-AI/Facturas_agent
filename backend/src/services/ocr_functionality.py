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
        str: Detected vendor type (oxxo, walmart, costco, h-e-b, generic)
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
    
    # **H-E-B DETECTION**
    heb_indicators = [
        'h-e-b', 'heb', 'supermercados internacionales heb', 
        'supermercados intern. heb', 'supermercados internacionales heb'
    ]
    
    if any(indicator in text_lower or indicator in merchant_lower for indicator in heb_indicators):
        return 'h-e-b'
    
    # **OXXO DETECTION**
    oxxo_indicators = ['oxxo', 'cadena comercial oxxo']
    if any(indicator in text_lower or indicator in merchant_lower for indicator in oxxo_indicators):
        return 'oxxo'
    
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

def extract_heb_specific_info(text):
    """
    H-E-B-specific information extraction.
    For H-E-B: Focus on extracting sucursal (branch) information from the bottom section.
    
    Args:
        text (str): Full receipt text
        
    Returns:
        dict: H-E-B-specific sucursal information
    """
    result = {'sucursal': None}
    
    # **H-E-B SUCURSAL PATTERNS - Look specifically at the bottom section**
    # Based on the receipt format, sucursal appears after store information
    # Order matters - more specific patterns first
    sucursal_patterns = [
        # Pattern 1: "HEB [BRANCH NAME]" format (most common) - standalone line - PRIORITY 1
        r'(?:^|\n)\s*heb\s+(las\s+lomas|las\s+fuentes|san\s+luis\s+potosi|monterrey|reynosa|obispado)\s*(?:\n|$)',
        # Pattern 2: "SUCURSAL HEB [BRANCH NAME]" format
        r'sucursal\s+heb\s+([^,\n\r]{2,30})',
        # Pattern 3: "HEB [BRANCH NAME]" format - after store info
        r'(?:supermercados intern\.?\s+heb[^,\n\r]*?)\n\s*heb\s+(las\s+lomas|las\s+fuentes|san\s+luis\s+potosi|monterrey|reynosa|obispado)',
        # Pattern 4: "SUCURSAL [BRANCH NAME]" format (but exclude URLs and common words)
        r'sucursal\s+([^,\n\r]{2,30})(?![^,\n\r]*(?:www\.|http|o en|de su|durante|mes|compra|servicio|cliente|cualquier|facturacion))',
        # Pattern 5: Look for branch names in address context but limit capture
        r'(?:blvd\.|avenida|calle)[^,\n\r]*?([^,\n\r]{2,20})(?=\s+(?:cp|c\.p\.|col\.|tel\.))',
    ]
    
    # Try pattern-based detection
    for pattern in sucursal_patterns:
        matches = re.findall(pattern, text, re.IGNORECASE | re.MULTILINE)
        if matches:
            # Get the first match and clean it
            match = matches[0].strip()
            # Remove common address elements that might be captured
            cleaned_match = re.sub(r'\s+(?:cp|c\.p\.|col\.|tel\.|teléfono)\s+\d+.*$', '', match, flags=re.IGNORECASE)
            cleaned_match = cleaned_match.strip()
            
            if len(cleaned_match) >= 3 and not cleaned_match.isdigit():
                result['sucursal'] = cleaned_match
                break
    
    # **FALLBACK: Look for branch information in the bottom third of the receipt**
    if not result['sucursal']:
        lines = text.split('\n')
        # Focus on the bottom third of the receipt where branch info typically appears
        bottom_section_start = max(0, len(lines) - len(lines) // 3)
        bottom_section = '\n'.join(lines[bottom_section_start:])
        
        # Look for branch indicators in the bottom section
        branch_indicators = [
            r'heb\s+([^,\n\r]{2,30})',
            r'sucursal\s+([^,\n\r]{2,30})',
            r'(las\s+lomas|las\s+fuentes|san\s+luis\s+potosi)',
        ]
        
        for pattern in branch_indicators:
            matches = re.findall(pattern, bottom_section, re.IGNORECASE)
            if matches:
                match = matches[0].strip()
                if len(match) >= 3 and not match.isdigit():
                    result['sucursal'] = match
                    break
    
    return result

def extract_branch(text, merchant_name=""):
    """
    Extract branch information from receipt text.
    
    Args:
        text (str): Full receipt text
        merchant_name (str): Detected merchant name for context
        
    Returns:
        str: Detected branch information or None
    """
    # **H-E-B SPECIFIC EXTRACTION**
    # Check if this is an H-E-B receipt and use specific extraction
    if 'heb' in merchant_name.lower() or 'h-e-b' in merchant_name.lower():
        heb_info = extract_heb_specific_info(text)
        if heb_info['sucursal']:
            return heb_info['sucursal']
    
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

def extract_register(text):
    """
    Extract register information from receipt text.
    
    Args:
        text (str): Full receipt text
        
    Returns:
        str: Detected register information or None
    """
    # **PATTERN 1: Pharmacy/Store cashier format (CAJA X - NAME)**
    pharmacy_patterns = [
        r'(?:caja|cashier)[\s:]*(\d{1,4})[\s\-]+([a-zA-Z\s]{2,30})(?:\n|$)',  # CAJA 4 - KARLA URIBE
        r'(?:caja|cashier)[\s:]*(\d{1,4})[\s]+([a-zA-Z\s]{2,30})(?:\n|$)',     # CAJA 4 KARLA URIBE
        r'(?:caja|cashier)[\s:]*(\d{1,4})[\s\-]+([a-zA-Z\s]{2,30})(?:\n|$)',   # Caja 4 - Karla Uribe
    ]
    
    for pattern in pharmacy_patterns:
        matches = re.findall(pattern, text, re.IGNORECASE)
        if matches:
            register_num, cashier_name = matches[0]
            # Clean the cashier name - remove extra whitespace and newlines
            cashier_name = re.sub(r'\s+', ' ', cashier_name.strip())
            # Remove any trailing text after the name (but keep the full name)
            cashier_name = re.sub(r'\s+\n.*$', '', cashier_name)
            if len(cashier_name) >= 2:
                return cashier_name  # Return the cashier name instead of register number
    
    # **PATTERN 2: Direct register/terminal labels (fallback)**
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
    vendor_type = detect_vendor_type(text, merchant_name)
    
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
        
    elif vendor_type == 'h-e-b':
        print(f"[ENHANCED-OCR] Using H-E-B-specific extraction", file=sys.stderr)
        # For H-E-B: Use standard extraction but with enhanced patterns
        try:
            enhanced_prompt = f"""Extract the ID and Folio numbers from the H-E-B receipt text. Return ONLY a JSON object with fields 'id' and 'folio'.

H-E-B SPECIFIC DETECTION RULES:
- Look for ticket numbers near the top of the receipt (usually 6-12 digits)
- Look for folio numbers that might be labeled as "Ticket", "Folio", or standalone numbers
- H-E-B receipts often have transaction numbers and store identifiers
- Focus on numbers that appear in the transaction details section

FALLBACK STRATEGY:
- If no specific labels found, identify the longest number sequence in the receipt
- Prioritize numbers with 6+ digits for main ID
- Use shorter numbers (3-6 digits) for folio
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
            extraction_method = 'heb_specific'
            
            print(f"[ENHANCED-OCR] H-E-B AI extraction completed", file=sys.stderr)
            
        except Exception as e:
            print(f"[ENHANCED-OCR] H-E-B AI extraction failed, using pattern detection", file=sys.stderr)
            extracted_id = None
            extracted_folio = None
            extraction_method = 'heb_pattern_fallback'
        
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
                transaction_date = date_field.value_date.strftime("%d/%m/%Y")
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

    # **ENHANCED TICKET EXTRACTION with vendor-specific logic**
    ticket_info = extract_advanced_ticket_info(full_text, merchant_name)
    receipt_id = ticket_info['id']
    folio = ticket_info['folio']
    enhanced_total = ticket_info['total']
    vendor_type = ticket_info['vendor_type']
    
    # **NEW FIELD EXTRACTION: Branch, Register, Payment Type, Card Last 4 Digits**
    branch = extract_branch(full_text, merchant_name)
    register = extract_register(full_text)
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
    elif vendor_type == 'wansoft':
        # Wansoft uses ID and Fol_Vta format, plus código de factura
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
    print(f"  Branch: {branch}", file=sys.stderr)
    print(f"  Register: {register}", file=sys.stderr)
    print(f"  Payment Type: {payment_type}", file=sys.stderr)
    print(f"  Card Last 4 Digits: {card_last_4_digits}", file=sys.stderr)
    print(f"  Código de Factura: {ticket_info.get('codigo_factura', 'N/A')}", file=sys.stderr)

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
        "Branch": branch if branch else "N/A",
        "branch": branch if branch else "N/A",  # Alternative field name
        "Register": register if register else "N/A",
        "register": register if register else "N/A",  # Alternative field name
        "Payment_Type": payment_type if payment_type else "N/A",
        "payment_type": payment_type if payment_type else "N/A",  # Alternative field name
        "Card_Last_4_Digits": card_last_4_digits if card_last_4_digits else "N/A",
        "card_last_4_digits": card_last_4_digits if card_last_4_digits else "N/A",  # Alternative field name
        
        # Additional fields (EXACT SAME AS ORIGINAL)
        "Comercio": merchant_name,
        "comercio": merchant_name,  # Alternative field name
        
        # Wansoft-specific fields
        "Codigo_Factura": ticket_info.get('codigo_factura', 'N/A') if vendor_type == 'wansoft' else "N/A",
        "codigo_factura": ticket_info.get('codigo_factura', 'N/A') if vendor_type == 'wansoft' else "N/A",  # Alternative field name
        
        # Raw text - COMPLETE text, not truncated (EXACT SAME AS ORIGINAL)
        "Full_Raw_Text": full_text,
        "raw_text": full_text,  # Alternative field name for frontend compatibility
        
        # Metadata (ENHANCED BUT SAFE - WON'T BREAK EXISTING CODE)
        "vendor_type": vendor_type,
        "extraction_method": ticket_info.get('extraction_method', 'enhanced_pattern'),
        "text_length": len(full_text),
        "codigo_factura_included": bool(ticket_info.get('codigo_factura'))
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
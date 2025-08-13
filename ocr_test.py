import os
import re
from dotenv import load_dotenv, find_dotenv
from azure.core.credentials import AzureKeyCredential
from azure.ai.documentintelligence import DocumentIntelligenceClient
from openai import OpenAI
import json

# Cargar variables de entorno desde .env (detección robusta)
# Busca automáticamente la primera .env hacia arriba desde el CWD o la ruta del archivo
dotenv_path = find_dotenv(usecwd=True) or find_dotenv(filename=".env", raise_error_if_not_found=False)
if dotenv_path:
    load_dotenv(dotenv_path)
else:
    # Fallback: intenta cargar del directorio del script
    load_dotenv(os.path.join(os.path.dirname(os.path.abspath(__file__)), ".env"))

# Obtener las variables de entorno necesarias
OPENAI_API_KEY = os.getenv("OPENAI_API_KEY")
AZURE_ENDPOINT = os.getenv("AZURE_DOCUMENT_INTELLIGENCE_ENDPOINT")
AZURE_KEY = os.getenv("AZURE_DOCUMENT_INTELLIGENCE_KEY")

# Inicializar clientes globales
# Si la clave está en el entorno, el cliente también puede leerla sin pasarla explícitamente
openai_client = OpenAI(api_key=OPENAI_API_KEY) if OPENAI_API_KEY else OpenAI()

def extract_ticket_number_patterns(text):
    """
    Enhanced ticket number extraction using pattern-based detection.
    Looks for the longest number in the receipt which is likely the ticket number.
    
    Args:
        text (str): Full receipt text
        
    Returns:
        str: Detected ticket number or None
    """
    print(f"[ENHANCED-OCR] Starting pattern-based ticket number detection")
    
    # **PATTERN 1: Long continuous numbers (15+ digits)**
    # Example: 11122521255212552254
    continuous_pattern = r'\b\d{15,}\b'
    continuous_matches = re.findall(continuous_pattern, text)
    
    if continuous_matches:
        # Get the longest continuous number
        longest_continuous = max(continuous_matches, key=len)
        print(f"[ENHANCED-OCR] Found long continuous number: {longest_continuous} (length: {len(longest_continuous)})")
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
                print(f"[ENHANCED-OCR] Found grouped number: '{match}' -> {continuous_number} (length: {len(continuous_number)})")
        
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
                print(f"[ENHANCED-OCR] Found separated number: '{match}' -> {continuous_number} (length: {len(continuous_number)})")
        
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
            print(f"[ENHANCED-OCR] Found fallback number: {longest_fallback} (length: {len(longest_fallback)})")
            return longest_fallback
    
    print(f"[ENHANCED-OCR] No suitable ticket number patterns found")
    return None

def extract_total_patterns(text):
    """
    Enhanced total amount extraction using pattern-based detection.
    Looks for monetary amounts with better accuracy, focusing on "total" labels.
    
    Args:
        text (str): Full receipt text
        
    Returns:
        float: Detected total amount or None
    """
    print(f"[ENHANCED-OCR] Starting pattern-based total detection")
    
    # **PATTERN 1: Exact "TOTAL" label patterns (highest priority)**
    # Look specifically for "total" label (case insensitive)
    exact_total_patterns = [
        r'(?:^|\n)\s*total[\s:$]*([0-9]+[.,][0-9]{2})',  # Line starting with total
        r'total[\s:$]+([0-9]+[.,][0-9]{2})',  # Total followed by amount
        r'total\s*\$\s*([0-9]+[.,][0-9]{2})',  # Total $123.45
        r'(?:^|\n)total\s*([0-9]+[.,][0-9]{2})',  # Total at start of line
        r'total[\s:]*\$?[\s]*([0-9]+[.,][0-9]{2})',  # Total with optional $
    ]
    
    for pattern in exact_total_patterns:
        matches = re.findall(pattern, text, re.IGNORECASE | re.MULTILINE)
        if matches:
            # Convert all matches and find the most reasonable one
            total_amounts = []
            for match in matches:
                try:
                    amount_str = match.replace(',', '.')
                    amount = float(amount_str)
                    # Filter for reasonable total amounts (not tax amounts or small items)
                    if 10.0 <= amount <= 100000.0:  # Reasonable total range
                        total_amounts.append(amount)
                        print(f"[ENHANCED-OCR] Found exact TOTAL label: {match} -> {amount}")
                except ValueError:
                    continue
            
            if total_amounts:
                # If multiple totals found, prefer the largest reasonable one
                selected_total = max(total_amounts)
                print(f"[ENHANCED-OCR] Selected exact TOTAL: {selected_total}")
                return selected_total
    
    # **PATTERN 2: Other total-like labels (medium priority)**
    # Look for other total indicators
    other_total_patterns = [
        r'(?:subtotal|importe|amount|sum|suma)[\s:$]*([0-9]+[.,][0-9]{2})',
        r'(?:total\s+a\s+pagar|amount\s+due)[\s:$]*([0-9]+[.,][0-9]{2})',
        r'(?:total\s+general|grand\s+total)[\s:$]*([0-9]+[.,][0-9]{2})',
        r'(?:importe\s+total|total\s+amount)[\s:$]*([0-9]+[.,][0-9]{2})',
    ]
    
    for pattern in other_total_patterns:
        matches = re.findall(pattern, text, re.IGNORECASE | re.MULTILINE)
        if matches:
            amounts = []
            for match in matches:
                try:
                    amount_str = match.replace(',', '.')
                    amount = float(amount_str)
                    if 10.0 <= amount <= 100000.0:
                        amounts.append(amount)
                        print(f"[ENHANCED-OCR] Found labeled total variant: {match} -> {amount}")
                except ValueError:
                    continue
            
            if amounts:
                max_amount = max(amounts)
                print(f"[ENHANCED-OCR] Selected labeled variant total: {max_amount}")
                return max_amount
    
    # **PATTERN 3: End-of-receipt total (lower priority)**
    # Look for $ amounts in the last portion of the text, but be more selective
    end_portion = text[-300:]  # Reduced to last 300 characters for more precision
    print(f"[ENHANCED-OCR] Analyzing end portion: {end_portion[-100:]}...")  # Show last 100 chars for debugging
    
    # More specific end-portion patterns
    end_patterns = [
        r'(?:^|\n)\s*\$\s*([0-9]+[.,][0-9]{2})\s*(?:\n|$)',  # $123.45 on its own line
        r'(?:^|\n)\s*([0-9]+[.,][0-9]{2})\s*\$\s*(?:\n|$)',  # 123.45$ on its own line
        r'(?:^|\n)\s*([0-9]+[.,][0-9]{2})\s*(?:\n|$)',  # Amount on its own line near end
    ]
    
    end_amounts = []
    for pattern in end_patterns:
        matches = re.findall(pattern, end_portion, re.MULTILINE)
        for match in matches:
            try:
                amount_str = match.replace(',', '.')
                amount = float(amount_str)
                # More restrictive range for end-portion detection
                if 50.0 <= amount <= 50000.0:  # Avoid small amounts like tax/change
                    end_amounts.append(amount)
                    print(f"[ENHANCED-OCR] Found end-portion amount: {match} -> {amount}")
            except ValueError:
                continue
    
    if end_amounts:
        # For end-portion, prefer amounts that appear multiple times or are largest
        from collections import Counter
        amount_counts = Counter(end_amounts)
        
        # If an amount appears multiple times, it's likely the total
        for amount, count in amount_counts.most_common():
            if count > 1:
                print(f"[ENHANCED-OCR] Selected repeated end-portion total: {amount} (appeared {count} times)")
                return amount
        
        # Otherwise, return largest end-portion amount
        max_end_amount = max(end_amounts)
        print(f"[ENHANCED-OCR] Selected largest end-portion total: {max_end_amount}")
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
                print(f"[ENHANCED-OCR] Selected repeated fallback total: {amount} (appeared {count} times)")
                return amount
        
        # If no repeated amounts, get largest in reasonable range
        largest_fallback = max(fallback_amounts)
        print(f"[ENHANCED-OCR] Selected conservative fallback total: {largest_fallback}")
        return largest_fallback
    
    print(f"[ENHANCED-OCR] No suitable total amount found")
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
        print(f"[ENHANCED-OCR] Detected vendor: COSTCO")
        return 'costco'
    
    # **OXXO DETECTION**
    oxxo_indicators = ['oxxo', 'cadena comercial oxxo']
    if any(indicator in text_lower or indicator in merchant_lower for indicator in oxxo_indicators):
        print(f"[ENHANCED-OCR] Detected vendor: OXXO")
        return 'oxxo'
    
    # **WALMART DETECTION**
    walmart_indicators = ['walmart', 'supercenter', 'bodega aurrera']
    if any(indicator in text_lower or indicator in merchant_lower for indicator in walmart_indicators):
        print(f"[ENHANCED-OCR] Detected vendor: WALMART")
        return 'walmart'
    
    print(f"[ENHANCED-OCR] Detected vendor: GENERIC")
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
    print(f"[ENHANCED-OCR] Starting Costco-specific extraction")
    
    result = {'ticket_id': None, 'folio': None}
    
    # **COSTCO TICKET ID PATTERNS**
    # Costco often uses different formats for ticket identification
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
                print(f"[ENHANCED-OCR] Found Costco ticket ID: {longest_match}")
                break
    
    # If no specific ticket found, use pattern-based detection
    if not result['ticket_id']:
        pattern_ticket = extract_ticket_number_patterns(text)
        if pattern_ticket:
            result['ticket_id'] = pattern_ticket
            print(f"[ENHANCED-OCR] Using pattern-detected ticket for Costco: {pattern_ticket}")
    
    # **COSTCO FOLIO PATTERNS**
    # Costco folio is often a shorter number
    folio_patterns = [
        r'(?:folio|fol)[\s#:]*(\d{4,12})',  # Folio: 123456
        r'(?:receipt\s+#|recibo\s+#)[\s]*(\d{4,12})',  # Receipt # 123456
        r'(?:store|tienda)[\s#:]*(\d{4,8})',  # Store: 1234
        r'(?:terminal|term)[\s#:]*(\d{3,8})',  # Terminal: 123
    ]
    
    for pattern in folio_patterns:
        matches = re.findall(pattern, text, re.IGNORECASE)
        if matches:
            # Get first reasonable folio match
            for match in matches:
                if len(match) >= 4 and match != result['ticket_id']:
                    result['folio'] = match
                    print(f"[ENHANCED-OCR] Found Costco folio: {match}")
                    break
            if result['folio']:
                break
    
    # **FALLBACK: Find secondary number if folio not found**
    if not result['folio']:
        # Look for shorter numbers that could be folios
        secondary_numbers = re.findall(r'\b(\d{4,8})\b', text)
        for num in secondary_numbers:
            if num != result['ticket_id'] and len(num) >= 4:
                result['folio'] = num
                print(f"[ENHANCED-OCR] Using fallback folio for Costco: {num}")
                break
    
    return result

def extract_advanced_ticket_info(text, merchant_name=""):
    """
    Advanced ticket information extraction with enhanced pattern detection.
    Now includes vendor-specific logic and improved total detection.
    
    Args:
        text (str): Full receipt text
        merchant_name (str): Detected merchant name for context
        
    Returns:
        dict: Enhanced ticket information with pattern-based detection
    """
    print(f"[ENHANCED-OCR] Starting advanced ticket info extraction for merchant: {merchant_name}")
    
    # **VENDOR DETECTION**
    vendor_type = detect_vendor_type(text, merchant_name)
    
    # **ENHANCED TOTAL DETECTION**
    enhanced_total = extract_total_patterns(text)
    
    # **VENDOR-SPECIFIC EXTRACTION**
    if vendor_type == 'costco':
        print(f"[ENHANCED-OCR] Using Costco-specific extraction logic")
        costco_info = extract_costco_specific_info(text)
        
        # For Costco: ticket_id is primary, folio is secondary
        extracted_id = costco_info['ticket_id']
        extracted_folio = costco_info['folio']
        extraction_method = 'costco_specific'
        
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
            extraction_method = f'enhanced_ai_{vendor_type}'
            
            print(f"[ENHANCED-OCR] OpenAI extraction - ID: {extracted_id}, Folio: {extracted_folio}")
            
        except Exception as e:
            print(f"[ENHANCED-OCR] OpenAI extraction failed: {e}")
            extracted_id = None
            extracted_folio = None
            extraction_method = 'pattern_fallback'
    
    # **ENHANCED FALLBACK: Pattern-based detection**
    if not extracted_id:
        print(f"[ENHANCED-OCR] No labeled ID found, using pattern-based detection")
        pattern_ticket_number = extract_ticket_number_patterns(text)
        if pattern_ticket_number:
            extracted_id = pattern_ticket_number
            print(f"[ENHANCED-OCR] Pattern-based ID detected: {extracted_id}")
    
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
                    print(f"[ENHANCED-OCR] Pattern-based Folio detected: {extracted_folio}")
                    break
    
    return {
        'id': extracted_id,
        'folio': extracted_folio,
        'total': enhanced_total,
        'vendor_type': vendor_type,
        'extraction_method': extraction_method
    }

def extract_receipt_data(image_path):
    """
    Procesa una imagen de recibo/factura y extrae los datos relevantes usando Azure Document Intelligence y OpenAI.
    Enhanced with pattern-based ticket number detection, improved total extraction, and vendor-specific logic.
    
    Args:
        image_path (str): Ruta de la imagen del recibo.
    Returns:
        dict: Diccionario con merchant_name, transaction_date, total, ID y folio (vendor-specific handling).
    """
    print(f"[ENHANCED-OCR] Processing receipt: {image_path}")
    
    # Inicializar el cliente de Azure Document Intelligence
    document_intelligence_client = DocumentIntelligenceClient(
        endpoint=AZURE_ENDPOINT, credential=AzureKeyCredential(AZURE_KEY)
    )

    # Leer la imagen
    with open(image_path, "rb") as image_file:
        image_data = image_file.read()

    # Extraer datos estructurados con el modelo preconstruido de recibos
    receipt_poller = document_intelligence_client.begin_analyze_document(
        "prebuilt-receipt", image_data
    )
    receipt_result = receipt_poller.result()

    # Extraer texto crudo con el modelo preconstruido de lectura
    read_poller = document_intelligence_client.begin_analyze_document(
        "prebuilt-read", image_data
    )
    read_result = read_poller.result()

    # Variables para almacenar los datos extraídos
    merchant_name = ""
    transaction_date = ""
    azure_total = ""

    # Extraer merchant name, fecha y total usando Azure
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

    # Extraer texto completo
    full_text = "\n".join([line.content for page in read_result.pages for line in page.lines])
    print(f"[ENHANCED-OCR] Extracted text length: {len(full_text)} characters")

    # **ENHANCED TICKET EXTRACTION with vendor-specific logic**
    ticket_info = extract_advanced_ticket_info(full_text, merchant_name)
    receipt_id = ticket_info['id']
    folio = ticket_info['folio']
    enhanced_total = ticket_info['total']
    vendor_type = ticket_info['vendor_type']
    extraction_method = ticket_info['extraction_method']

    # **ENHANCED TOTAL SELECTION**
    # Prioritize enhanced pattern-based total over Azure total
    final_total = enhanced_total if enhanced_total is not None else azure_total
    
    if enhanced_total and azure_total:
        # If both exist, use the enhanced one but log the difference
        if abs(float(enhanced_total) - float(azure_total)) > 0.01:
            print(f"[ENHANCED-OCR] Total mismatch - Enhanced: {enhanced_total}, Azure: {azure_total}, Using Enhanced")
        else:
            print(f"[ENHANCED-OCR] Total values match - Using enhanced: {enhanced_total}")
    elif enhanced_total:
        print(f"[ENHANCED-OCR] Using enhanced pattern-based total: {enhanced_total}")
    elif azure_total:
        print(f"[ENHANCED-OCR] Using Azure-detected total: {azure_total}")
    else:
        print(f"[ENHANCED-OCR] No total amount detected")

    # **VENDOR-SPECIFIC FIELD MAPPING**
    if vendor_type == 'costco':
        # For Costco: Use Ticket ID as main ID, and ensure folio is filled
        print(f"[ENHANCED-OCR] Applying Costco-specific field mapping")
        
        # Costco prioritizes Ticket ID over Folio
        if receipt_id:
            ticket_id_field = receipt_id  # Main identifier for Costco
            folio_field = folio if folio else "N/A"  # Secondary identifier
        else:
            # If no ticket ID found, check if folio could be the main identifier
            ticket_id_field = folio if folio and len(folio) >= 8 else "N/A"
            folio_field = "N/A"
            
        print(f"[ENHANCED-OCR] Costco mapping - Ticket ID: {ticket_id_field}, Folio: {folio_field}")
        
    else:
        # For other vendors: Standard ID/Folio mapping
        ticket_id_field = receipt_id
        folio_field = folio

    print(f"[ENHANCED-OCR] Final extraction results:")
    print(f"  - Merchant: {merchant_name}")
    print(f"  - Vendor Type: {vendor_type}")
    print(f"  - Date: {transaction_date}")
    print(f"  - Total (Enhanced): {enhanced_total}")
    print(f"  - Total (Azure): {azure_total}")
    print(f"  - Final Total: {final_total}")
    print(f"  - Ticket ID: {ticket_id_field}")
    print(f"  - Folio: {folio_field}")
    print(f"  - Extraction Method: {extraction_method}")

    return {
        "full_text": full_text,
        "Comercio": merchant_name,
        "Fecha": transaction_date,
        "Total": final_total,
        'ID_Ticket': ticket_id_field,
        'Mesa_Folio': folio_field,
        'vendor_type': vendor_type,
        'extraction_method': extraction_method,
        'enhanced_ocr': True,
        'total_sources': {
            'enhanced_total': enhanced_total,
            'azure_total': azure_total,
            'selected_total': final_total
        }
    }

if __name__ == "__main__":
    import argparse
    import sys
    import json as _json

    parser = argparse.ArgumentParser(
        description="Extract receipt data using Azure Document Intelligence and OpenAI."
    )
    parser.add_argument(
        "-i",
        "--image",
        default="oxxo_trial.jpg",
        help="Path to the receipt image (default: oxxo_trial.jpg)",
    )

    args = parser.parse_args()

    image_path = args.image

    if not os.path.exists(image_path):
        print(f"[ERROR] Image not found: {image_path}")
        sys.exit(1)

    try:
        result = extract_receipt_data(image_path)

        # Print structured details (excluding raw text for readability first)
        printable = {k: v for k, v in result.items() if k != "full_text"}
        print("\n=== Extracted Details ===")
        print(_json.dumps(printable, indent=2, ensure_ascii=False))

        # Print raw OCR text
        print("\n=== Raw OCR Text ===")
        print(result.get("full_text", ""))

    except Exception as exc:
        print(f"[ERROR] Extraction failed: {exc}")
        sys.exit(2)
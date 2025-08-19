"""
Vendor-specific templates and configurations for enhanced OCR processing.
This module contains vendor-specific field mappings, patterns, and validation rules.
"""

# Vendor-specific field mappings and patterns
VENDOR_TEMPLATES = {
    "walmart": {
        "name_patterns": ["walmart", "wal-mart", "nueva wal mart"],
        "field_mappings": {
            "merchant_name": ["MerchantName"],
            "transaction_date": ["TransactionDate"],
            "total": ["Total"],
            "ticket_id": ["TC#", "TransactionID"],
            "folio": ["TR#", "RegisterNumber"],
            "store_location": ["StoreLocation", "Branch"],
            "payment_method": ["PaymentMethod", "CardType"],
            "card_number": ["CardNumber", "AccountNumber"]
        },
        "validation_rules": {
            "total_min": 0.01,
            "total_max": 10000.00,
            "date_format": "%d/%m/%Y",
            "required_fields": ["merchant_name", "total", "ticket_id"]
        },
        "enhancement_priority": ["prebuilt-receipt", "prebuilt-layout", "prebuilt-read"]
    },
    
    "costco": {
        "name_patterns": ["costco", "costco de mexico", "costco wholesale"],
        "field_mappings": {
            "merchant_name": ["MerchantName"],
            "transaction_date": ["TransactionDate"],
            "total": ["Total"],
            "ticket_id": ["TicketID", "TransactionID"],
            "folio": ["Folio", "StoreNumber"],
            "membership": ["MembershipNumber", "MemberID"],
            "warehouse": ["WarehouseNumber", "StoreNumber"],
            "payment_method": ["PaymentMethod"],
            "card_number": ["CardNumber"]
        },
        "validation_rules": {
            "total_min": 0.01,
            "total_max": 50000.00,
            "date_format": "%d/%m/%Y",
            "required_fields": ["merchant_name", "total", "membership"]
        },
        "enhancement_priority": ["prebuilt-receipt", "prebuilt-layout", "prebuilt-read"]
    },
    
    "h-e-b": {
        "name_patterns": ["h-e-b", "heb", "supermercados internacionales heb"],
        "field_mappings": {
            "merchant_name": ["MerchantName"],
            "transaction_date": ["TransactionDate"],
            "total": ["Total"],
            "ticket_id": ["TicketID", "TransactionID"],
            "folio": ["Folio", "AuditNumber"],
            "store_location": ["StoreLocation", "Branch"],
            "payment_method": ["PaymentMethod", "CardType"],
            "card_number": ["CardNumber"],
            "promotional_info": ["PromotionalInfo", "DiscountInfo"]
        },
        "validation_rules": {
            "total_min": 0.01,
            "total_max": 5000.00,
            "date_format": "%d/%m/%Y",
            "required_fields": ["merchant_name", "total"]
        },
        "enhancement_priority": ["prebuilt-receipt", "prebuilt-layout", "prebuilt-read"]
    },
    
    "oxxo": {
        "name_patterns": ["oxxo", "cadena comercial oxxo"],
        "field_mappings": {
            "merchant_name": ["MerchantName"],
            "transaction_date": ["TransactionDate"],
            "total": ["Total"],
            "ticket_id": ["ID", "TransactionID"],
            "folio": ["Fol_Vta", "Folio"],
            "store_location": ["StoreLocation"],
            "payment_method": ["PaymentMethod"],
            "card_number": ["CardNumber"]
        },
        "validation_rules": {
            "total_min": 0.01,
            "total_max": 2000.00,
            "date_format": "%d/%m/%Y",
            "required_fields": ["merchant_name", "total", "ticket_id"]
        },
        "enhancement_priority": ["prebuilt-receipt", "prebuilt-layout", "prebuilt-read"]
    },
    
    "soriana": {
        "name_patterns": ["soriana"],
        "field_mappings": {
            "merchant_name": ["MerchantName"],
            "transaction_date": ["TransactionDate"],
            "total": ["Total"],
            "ticket_id": ["TicketID", "TransactionID"],
            "folio": ["Folio", "RegisterNumber"],
            "store_location": ["StoreLocation", "Branch"],
            "payment_method": ["PaymentMethod"],
            "card_number": ["CardNumber"],
            "points_info": ["PointsInfo", "LoyaltyInfo"]
        },
        "validation_rules": {
            "total_min": 0.01,
            "total_max": 10000.00,
            "date_format": "%d/%m/%Y",
            "required_fields": ["merchant_name", "total"]
        },
        "enhancement_priority": ["prebuilt-receipt", "prebuilt-layout", "prebuilt-read"]
    },
    
    "pharmacy": {
        "name_patterns": ["farmacia", "pharmacy", "super farmacia"],
        "field_mappings": {
            "merchant_name": ["MerchantName"],
            "transaction_date": ["TransactionDate"],
            "total": ["Total"],
            "ticket_id": ["TicketID", "TransactionID"],
            "folio": ["Folio", "InvoiceNumber"],
            "store_location": ["StoreLocation", "Branch"],
            "payment_method": ["PaymentMethod"],
            "card_number": ["CardNumber"],
            "prescription_info": ["PrescriptionInfo", "RxInfo"]
        },
        "validation_rules": {
            "total_min": 0.01,
            "total_max": 3000.00,
            "date_format": "%d/%m/%Y",
            "required_fields": ["merchant_name", "total"]
        },
        "enhancement_priority": ["prebuilt-receipt", "prebuilt-layout", "prebuilt-read"]
    },
    
    "restaurant": {
        "name_patterns": ["restaurante", "restaurant", "cafe", "bar"],
        "field_mappings": {
            "merchant_name": ["MerchantName"],
            "transaction_date": ["TransactionDate"],
            "total": ["Total"],
            "ticket_id": ["TicketID", "OrderNumber"],
            "folio": ["Folio", "TableNumber"],
            "tip": ["Tip", "Gratuity"],
            "subtotal": ["Subtotal"],
            "tax": ["Tax", "IVA"],
            "payment_method": ["PaymentMethod"],
            "card_number": ["CardNumber"]
        },
        "validation_rules": {
            "total_min": 0.01,
            "total_max": 5000.00,
            "date_format": "%d/%m/%Y",
            "required_fields": ["merchant_name", "total"]
        },
        "enhancement_priority": ["prebuilt-receipt", "prebuilt-layout", "prebuilt-read"]
    }
}

def get_vendor_template(vendor_type):
    """
    Get vendor-specific template configuration.
    
    Args:
        vendor_type (str): Type of vendor (walmart, costco, etc.)
        
    Returns:
        dict: Vendor template configuration or default template
    """
    return VENDOR_TEMPLATES.get(vendor_type, VENDOR_TEMPLATES.get("generic", {}))

def get_enhancement_priority(vendor_type):
    """
    Get the priority order of Azure models for a specific vendor.
    
    Args:
        vendor_type (str): Type of vendor
        
    Returns:
        list: Ordered list of model names by priority
    """
    template = get_vendor_template(vendor_type)
    return template.get("enhancement_priority", ["prebuilt-receipt", "prebuilt-layout", "prebuilt-read"])

def get_field_mappings(vendor_type):
    """
    Get field mappings for a specific vendor.
    
    Args:
        vendor_type (str): Type of vendor
        
    Returns:
        dict: Field mappings for the vendor
    """
    template = get_vendor_template(vendor_type)
    return template.get("field_mappings", {})

def get_validation_rules(vendor_type):
    """
    Get validation rules for a specific vendor.
    
    Args:
        vendor_type (str): Type of vendor
        
    Returns:
        dict: Validation rules for the vendor
    """
    template = get_vendor_template(vendor_type)
    return template.get("validation_rules", {})

def validate_extraction_result(result, vendor_type):
    """
    Validate extraction result against vendor-specific rules.
    
    Args:
        result (dict): Extraction result
        vendor_type (str): Type of vendor
        
    Returns:
        dict: Validation results with errors and warnings
    """
    validation_rules = get_validation_rules(vendor_type)
    validation_result = {
        "is_valid": True,
        "errors": [],
        "warnings": [],
        "confidence_score": 0.0
    }
    
    # Check required fields
    required_fields = validation_rules.get("required_fields", [])
    for field in required_fields:
        if not result.get(field) or result.get(field) == "N/A":
            validation_result["errors"].append(f"Missing required field: {field}")
            validation_result["is_valid"] = False
    
    # Validate total amount
    total = result.get("Total")
    if total and total != "N/A":
        try:
            total_float = float(total)
            total_min = validation_rules.get("total_min", 0.01)
            total_max = validation_rules.get("total_max", 10000.00)
            
            if total_float < total_min:
                validation_result["warnings"].append(f"Total amount ({total}) is below minimum ({total_min})")
            elif total_float > total_max:
                validation_result["warnings"].append(f"Total amount ({total}) is above maximum ({total_max})")
        except (ValueError, TypeError):
            validation_result["errors"].append("Invalid total amount format")
            validation_result["is_valid"] = False
    
    # Calculate confidence score based on field completeness
    total_fields = len(required_fields)
    present_fields = sum(1 for field in required_fields if result.get(field) and result.get(field) != "N/A")
    validation_result["confidence_score"] = present_fields / total_fields if total_fields > 0 else 0.0
    
    return validation_result

def get_vendor_specific_extractors(vendor_type):
    """
    Get vendor-specific extraction functions.
    
    Args:
        vendor_type (str): Type of vendor
        
    Returns:
        dict: Vendor-specific extraction functions
    """
    extractors = {
        "walmart": {
            "extract_store_info": extract_walmart_store_info,
            "extract_payment_info": extract_walmart_payment_info
        },
        "costco": {
            "extract_membership_info": extract_costco_membership_info,
            "extract_warehouse_info": extract_costco_warehouse_info
        },
        "h-e-b": {
            "extract_promotional_info": extract_heb_promotional_info,
            "extract_store_location": extract_heb_store_location
        }
    }
    
    return extractors.get(vendor_type, {})

# Vendor-specific extraction functions
def extract_walmart_store_info(text_content, key_value_pairs):
    """Extract Walmart-specific store information."""
    store_info = {}
    
    # Look for store number patterns
    store_patterns = [
        r"store\s*#?\s*(\d+)",
        r"tienda\s*#?\s*(\d+)",
        r"unidad\s+(\d+)"
    ]
    
    for pattern in store_patterns:
        matches = re.findall(pattern, text_content, re.IGNORECASE)
        if matches:
            store_info["store_number"] = matches[0]
            break
    
    return store_info

def extract_walmart_payment_info(text_content, key_value_pairs):
    """Extract Walmart-specific payment information."""
    payment_info = {}
    
    # Look for Walmart-specific payment patterns
    payment_patterns = [
        r"walmart\s+card",
        r"walmart\s+credit",
        r"walmart\s+debit"
    ]
    
    for pattern in payment_patterns:
        if re.search(pattern, text_content, re.IGNORECASE):
            payment_info["walmart_card"] = True
            break
    
    return payment_info

def extract_costco_membership_info(text_content, key_value_pairs):
    """Extract Costco-specific membership information."""
    membership_info = {}
    
    # Look for membership number patterns
    membership_patterns = [
        r"membership\s*#?\s*(\d+)",
        r"membresia\s*#?\s*(\d+)",
        r"member\s*#?\s*(\d+)"
    ]
    
    for pattern in membership_patterns:
        matches = re.findall(pattern, text_content, re.IGNORECASE)
        if matches:
            membership_info["membership_number"] = matches[0]
            break
    
    return membership_info

def extract_costco_warehouse_info(text_content, key_value_pairs):
    """Extract Costco-specific warehouse information."""
    warehouse_info = {}
    
    # Look for warehouse number patterns
    warehouse_patterns = [
        r"warehouse\s*#?\s*(\d+)",
        r"almacen\s*#?\s*(\d+)",
        r"sucursal\s*(\d+)"
    ]
    
    for pattern in warehouse_patterns:
        matches = re.findall(pattern, text_content, re.IGNORECASE)
        if matches:
            warehouse_info["warehouse_number"] = matches[0]
            break
    
    return warehouse_info

def extract_heb_promotional_info(text_content, key_value_pairs):
    """Extract H-E-B-specific promotional information."""
    promotional_info = {}
    
    # Look for H-E-B promotional patterns
    promotional_patterns = [
        r"heb\s+afi",
        r"descuento\s+heb",
        r"promocion\s+heb"
    ]
    
    promotional_lines = []
    for pattern in promotional_patterns:
        if re.search(pattern, text_content, re.IGNORECASE):
            promotional_lines.append(pattern)
    
    if promotional_lines:
        promotional_info["promotional_offers"] = promotional_lines
    
    return promotional_info

def extract_heb_store_location(text_content, key_value_pairs):
    """Extract H-E-B-specific store location information."""
    location_info = {}
    
    # Look for H-E-B location patterns
    location_patterns = [
        r"heb\s+([^,\n]+)",
        r"las\s+lomas",
        r"san\s+luis\s+potosi"
    ]
    
    for pattern in location_patterns:
        matches = re.findall(pattern, text_content, re.IGNORECASE)
        if matches:
            location_info["store_location"] = matches[0].strip()
            break
    
    return location_info 
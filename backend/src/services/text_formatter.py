#!/usr/bin/env python3
"""
Text Formatter for OCR Raw Text
Transforms raw OCR text into a structured, readable format
"""

import re
import json
from typing import Dict, List, Optional, Tuple

class OCRTextFormatter:
    """
    Formats raw OCR text into structured, readable format
    """
    
    def __init__(self):
        self.vendor_patterns = {
            'walmart': {
                'store_name': r'^([A-Z\s]+)$',
                'company_name': r'^([A-Z\s\.]+S\s+DE\s+RL\s+DE\s+CV)$',
                'address': r'^([A-Z0-9\s\.]+)$',
                'rfc': r'RFC\.\s*([A-Z0-9]+)',
                'unit': r'UNIDAD\s+([A-Z\s]+)',
                'store_address': r'DR\.([^:]+):\s*([A-Z0-9\s\.]+)',
                'tax_regime': r'REGIMEN\s+FISCAL\s*-\s*(\d+)\s*([A-Z\s]+)',
                'phone': r'VENTA\s+EN\s+LINEA\s+(\d+)',
                'store_code': r'TDA#(\d+)',
                'operator': r'OP#(\d+)',
                'terminal': r'TE#\s*(\d+)',
                'transaction': r'TR#\s*(\d+)',
                'tc_number': r'TC#\s*(\d+)',
                'total': r'TOTAL\s*\$\s*([0-9]+[.,][0-9]{2})',
                'payment_method': r'(CREDITO|DEBITO|EFECTIVO)\s+([A-Z\s]+)',
                'card_type': r'TARJETA:\s*([A-Z\s]+)',
                'card_account': r'CUENTA:\s*\*\*\s*(\d+)\s*([A-Z])',
                'amount': r'IMPORTE:\s*([0-9]+[.,][0-9]{2})',
                'authorization': r'AUTORIZACION:\s*(\d+)',
                'affiliation': r'AFILIACION:\s*(\d+)',
                'aid': r'AID:\s*([A-Z0-9]+)',
                'arqc': r'ARQC:\s*([A-Z0-9]+)',
                'customer_name': r'Nombre Cliente:\s*([A-Z\s]+)',
                'benefits_url': r'www\.([a-z0-9\.]+)',
                'iva_percentage': r'IVA\s+(\d+\.?\d*)%\s*\$?\s*([0-9]+[.,][0-9]{2})',
                'items_count': r'ARTICULOS VENDIDOS\s+(\d+)'
            }
        }
    
    def format_walmart_receipt(self, raw_text: str) -> str:
        """
        Format Walmart receipt text into structured format
        """
        lines = raw_text.strip().split('\n')
        formatted_sections = []
        
        # Extract basic store information
        store_info = self._extract_store_info(lines)
        formatted_sections.append(self._format_store_section(store_info))
        
        # Extract transaction details
        transaction_info = self._extract_transaction_info(lines)
        formatted_sections.append(self._format_transaction_section(transaction_info))
        
        # Extract products
        products = self._extract_products(lines)
        formatted_sections.append(self._format_products_section(products))
        
        # Extract totals
        totals = self._extract_totals(lines)
        formatted_sections.append(self._format_totals_section(totals))
        
        # Extract payment information
        payment_info = self._extract_payment_info(lines)
        formatted_sections.append(self._format_payment_section(payment_info))
        
        # Extract benefits
        benefits = self._extract_benefits(lines)
        if benefits:
            formatted_sections.append(self._format_benefits_section(benefits))
        
        return '\n\n'.join(formatted_sections)
    
    def _extract_store_info(self, lines: List[str]) -> Dict[str, str]:
        """Extract store information from lines"""
        store_info = {}
        
        for i, line in enumerate(lines):
            line = line.strip()
            if not line:
                continue
                
            # Store name (first line)
            if i == 0 and not store_info.get('store_name'):
                store_info['store_name'] = line
            
            # Company name (second line)
            elif i == 1 and 'S DE RL DE CV' in line:
                store_info['company_name'] = line
            
            # Address (third line)
            elif i == 2 and not store_info.get('address'):
                store_info['address'] = line
            
            # RFC
            elif 'RFC.' in line:
                rfc_match = re.search(r'RFC\.\s*([A-Z0-9]+)', line)
                if rfc_match:
                    store_info['rfc'] = rfc_match.group(1)
            
            # Unit
            elif line.startswith('UNIDAD'):
                unit_match = re.search(r'UNIDAD\s+([A-Z\s]+)', line)
                if unit_match:
                    store_info['unit'] = unit_match.group(1).strip()
            
            # Store address
            elif 'DR.' in line and ':' in line:
                store_match = re.search(r'DR\.([^:]+):\s*([A-Z0-9\s\.]+)', line)
                if store_match:
                    store_info['store_address'] = f"{store_match.group(1).strip()}: {store_match.group(2).strip()}"
            
            # Tax regime
            elif 'REGIMEN FISCAL' in line:
                regime_match = re.search(r'REGIMEN\s+FISCAL\s*-\s*(\d+)\s*([A-Z\s]+)', line)
                if regime_match:
                    store_info['tax_regime'] = f"{regime_match.group(1)}, {regime_match.group(2).strip()}"
            
            # Phone
            elif 'VENTA EN LINEA' in line:
                phone_match = re.search(r'VENTA\s+EN\s+LINEA\s+(\d+)', line)
                if phone_match:
                    store_info['phone'] = phone_match.group(1)
                    store_info['sale_type'] = 'EN LINEA'
        
        return store_info
    
    def _extract_transaction_info(self, lines: List[str]) -> Dict[str, str]:
        """Extract transaction details"""
        transaction_info = {}
        
        for line in lines:
            line = line.strip()
            
            # Store code
            if 'TDA#' in line:
                tda_match = re.search(r'TDA#(\d+)', line)
                if tda_match:
                    transaction_info['store_code'] = tda_match.group(1)
            
            # Operator
            if 'OP#' in line:
                op_match = re.search(r'OP#(\d+)', line)
                if op_match:
                    transaction_info['operator'] = op_match.group(1)
            
            # Terminal
            if 'TE#' in line:
                te_match = re.search(r'TE#\s*(\d+)', line)
                if te_match:
                    transaction_info['terminal'] = te_match.group(1)
            
            # Transaction
            if 'TR#' in line:
                tr_match = re.search(r'TR#\s*(\d+)', line)
                if tr_match:
                    transaction_info['transaction'] = tr_match.group(1)
            
            # TC Number
            if 'TC#' in line:
                tc_match = re.search(r'TC#\s*(\d+)', line)
                if tc_match:
                    transaction_info['tc_number'] = tc_match.group(1)
        
        return transaction_info
    
    def _extract_products(self, lines: List[str]) -> List[Dict[str, str]]:
        """Extract product information"""
        products = []
        current_product = {}
        
        for i, line in enumerate(lines):
            line = line.strip()
            
            # Skip empty lines and headers
            if not line or line in ['$', 'TOTAL', 'CREDITO', 'DEBITO', 'EFECTIVO']:
                continue
            
            # Product line pattern: price + product code + name
            # Example: "18.72A\n200710018726 PAPA GAJO"
            if re.match(r'^\d+\.\d+[A-Z]?$', line):
                # This is a price line
                current_product = {'price': line}
                continue
            
            # Product code and name
            if re.match(r'^\d+\s+[A-Z\s]+$', line):
                if current_product:
                    parts = line.split(' ', 1)
                    if len(parts) == 2:
                        current_product['code'] = parts[0]
                        current_product['name'] = parts[1]
                        current_product['quantity'] = '1'  # Default quantity
                        products.append(current_product.copy())
                        current_product = {}
        
        return products
    
    def _extract_totals(self, lines: List[str]) -> Dict[str, str]:
        """Extract total information"""
        totals = {}
        
        for line in lines:
            line = line.strip()
            
            # Main total
            if 'TOTAL' in line and '$' in line:
                total_match = re.search(r'TOTAL\s*\$\s*([0-9]+[.,][0-9]{2})', line)
                if total_match:
                    totals['total'] = total_match.group(1)
            
            # IVA percentage and amount
            if 'IVA' in line and '%' in line:
                iva_match = re.search(r'IVA\s+(\d+\.?\d*)%\s*\$?\s*([0-9]+[.,][0-9]{2})', line)
                if iva_match:
                    totals['iva_percentage'] = iva_match.group(1)
                    totals['iva_amount'] = iva_match.group(2)
            
            # Items count
            if 'ARTICULOS VENDIDOS' in line:
                items_match = re.search(r'ARTICULOS VENDIDOS\s+(\d+)', line)
                if items_match:
                    totals['items_count'] = items_match.group(1)
        
        return totals
    
    def _extract_payment_info(self, lines: List[str]) -> Dict[str, str]:
        """Extract payment information"""
        payment_info = {}
        
        for line in lines:
            line = line.strip()
            
            # Payment method
            if 'CREDITO' in line or 'DEBITO' in line or 'EFECTIVO' in line:
                payment_match = re.search(r'(CREDITO|DEBITO|EFECTIVO)\s+([A-Z\s]+)', line)
                if payment_match:
                    payment_info['method'] = payment_match.group(1)
                    payment_info['provider'] = payment_match.group(2).strip()
            
            # Card type
            if 'TARJETA:' in line:
                card_match = re.search(r'TARJETA:\s*([A-Z\s]+)', line)
                if card_match:
                    payment_info['card_type'] = card_match.group(1).strip()
            
            # Card account
            if 'CUENTA:' in line:
                account_match = re.search(r'CUENTA:\s*\*\*\s*(\d+)\s*([A-Z])', line)
                if account_match:
                    payment_info['card_account'] = f"**{account_match.group(1)} {account_match.group(2)}"
            
            # Amount
            if 'IMPORTE:' in line:
                amount_match = re.search(r'IMPORTE:\s*([0-9]+[.,][0-9]{2})', line)
                if amount_match:
                    payment_info['amount'] = amount_match.group(1)
            
            # Authorization
            if 'AUTORIZACION:' in line:
                auth_match = re.search(r'AUTORIZACION:\s*(\d+)', line)
                if auth_match:
                    payment_info['authorization'] = auth_match.group(1)
            
            # Affiliation
            if 'AFILIACION:' in line:
                aff_match = re.search(r'AFILIACION:\s*(\d+)', line)
                if aff_match:
                    payment_info['affiliation'] = aff_match.group(1)
            
            # AID
            if 'AID:' in line:
                aid_match = re.search(r'AID:\s*([A-Z0-9]+)', line)
                if aid_match:
                    payment_info['aid'] = aid_match.group(1)
            
            # ARQC
            if 'ARQC:' in line:
                arqc_match = re.search(r'ARQC:\s*([A-Z0-9]+)', line)
                if arqc_match:
                    payment_info['arqc'] = arqc_match.group(1)
        
        return payment_info
    
    def _extract_benefits(self, lines: List[str]) -> Dict[str, str]:
        """Extract benefits information"""
        benefits = {}
        
        for line in lines:
            line = line.strip()
            
            # Customer name
            if 'Nombre Cliente:' in line:
                name_match = re.search(r'Nombre Cliente:\s*([A-Z\s]+)', line)
                if name_match:
                    benefits['customer_name'] = name_match.group(1).strip()
            
            # Benefits URL
            if 'www.' in line:
                url_match = re.search(r'www\.([a-z0-9\.]+)', line)
                if url_match:
                    benefits['benefits_url'] = f"www.{url_match.group(1)}"
        
        return benefits
    
    def _format_store_section(self, store_info: Dict[str, str]) -> str:
        """Format store information section"""
        section = "**Información de la Tienda:**\n"
        
        if store_info.get('store_name'):
            section += f"Tienda: {store_info['store_name']}\n"
        
        if store_info.get('company_name'):
            section += f"Razón Social: {store_info['company_name']}\n"
        
        if store_info.get('address'):
            section += f"Dirección: {store_info['address']}\n"
        
        if store_info.get('rfc'):
            section += f"RFC: {store_info['rfc']}\n"
        
        if store_info.get('unit'):
            section += f"Unidad: {store_info['unit']}\n"
        
        if store_info.get('store_address'):
            section += f"Dirección de la tienda: {store_info['store_address']}\n"
        
        if store_info.get('tax_regime'):
            section += f"Régimen Fiscal: {store_info['tax_regime']}\n"
        
        if store_info.get('phone'):
            section += f"Teléfono: {store_info['phone']}\n"
        
        if store_info.get('sale_type'):
            section += f"Venta: {store_info['sale_type']}\n"
        
        return section.strip()
    
    def _format_transaction_section(self, transaction_info: Dict[str, str]) -> str:
        """Format transaction details section"""
        section = "**Detalles de compra:**\n"
        
        if transaction_info.get('store_code'):
            section += f"TDA#: {transaction_info['store_code']}\n"
        
        if transaction_info.get('operator'):
            section += f"OP#: {transaction_info['operator']}\n"
        
        if transaction_info.get('terminal'):
            section += f"TE#: {transaction_info['terminal']}\n"
        
        if transaction_info.get('transaction'):
            section += f"TR#: {transaction_info['transaction']}\n"
        
        return section.strip()
    
    def _format_products_section(self, products: List[Dict[str, str]]) -> str:
        """Format products section"""
        section = "**Productos:**\n"
        
        for i, product in enumerate(products, 1):
            section += f"{i}. Producto: {product.get('name', 'N/A')}\n"
            section += f"   Código: {product.get('code', 'N/A')}\n"
            section += f"   Precio: ${product.get('price', 'N/A')}\n"
            section += f"   Cantidad: {product.get('quantity', '1')}\n"
            section += "\n"
        
        return section.strip()
    
    def _format_totals_section(self, totals: Dict[str, str]) -> str:
        """Format totals section"""
        section = "**Totales:**\n"
        
        if totals.get('total'):
            section += f"Total: ${totals['total']}\n"
        
        if totals.get('iva_percentage') and totals.get('iva_amount'):
            section += f"IVA ({totals['iva_percentage']}%): ${totals['iva_amount']}\n"
        
        if totals.get('items_count'):
            section += f"Número de artículos vendidos: {totals['items_count']}\n"
        
        return section.strip()
    
    def _format_payment_section(self, payment_info: Dict[str, str]) -> str:
        """Format payment information section"""
        section = "**Método de pago:**\n"
        
        if payment_info.get('method'):
            section += f"Tipo de pago: {payment_info['method']}\n"
        
        if payment_info.get('provider'):
            section += f"Proveedor: {payment_info['provider']}\n"
        
        if payment_info.get('card_type'):
            section += f"Pago con tarjeta: {payment_info['card_type']}\n"
        
        if payment_info.get('card_account'):
            section += f"Cuenta: {payment_info['card_account']}\n"
        
        if payment_info.get('amount'):
            section += f"Importe: ${payment_info['amount']}\n"
        
        if payment_info.get('authorization'):
            section += f"Autorización: {payment_info['authorization']}\n"
        
        if payment_info.get('affiliation'):
            section += f"Afiliación: {payment_info['affiliation']}\n"
        
        if payment_info.get('aid'):
            section += f"AID: {payment_info['aid']}\n"
        
        if payment_info.get('arqc'):
            section += f"ARQC: {payment_info['arqc']}\n"
        
        return section.strip()
    
    def _format_benefits_section(self, benefits: Dict[str, str]) -> str:
        """Format benefits section"""
        section = "**Beneficios:**\n"
        
        if benefits.get('customer_name'):
            section += f"Nombre cliente: {benefits['customer_name']}\n"
        
        if benefits.get('benefits_url'):
            section += f"Consulta más beneficios en: {benefits['benefits_url']}\n"
        
        return section.strip()
    
    def format_text(self, raw_text: str, vendor_type: str = 'walmart') -> str:
        """
        Main method to format raw OCR text
        
        Args:
            raw_text: Raw text from OCR
            vendor_type: Type of vendor (walmart, oxxo, costco, etc.)
            
        Returns:
            Formatted text string
        """
        if not raw_text or not raw_text.strip():
            return "No text available to format"
        
        # Detect vendor type if not provided
        if vendor_type == 'auto':
            vendor_type = self._detect_vendor_type(raw_text)
        
        # Format based on vendor type
        if vendor_type == 'walmart':
            return self.format_walmart_receipt(raw_text)
        else:
            # Generic formatting for other vendors
            return self._format_generic_receipt(raw_text)
    
    def _detect_vendor_type(self, raw_text: str) -> str:
        """Detect vendor type from raw text"""
        text_lower = raw_text.lower()
        
        if 'walmart' in text_lower or 'wal mart' in text_lower:
            return 'walmart'
        elif 'oxxo' in text_lower:
            return 'oxxo'
        elif 'costco' in text_lower:
            return 'costco'
        else:
            return 'generic'
    
    def _format_generic_receipt(self, raw_text: str) -> str:
        """Generic formatting for unknown vendors"""
        lines = raw_text.strip().split('\n')
        formatted_lines = []
        
        for line in lines:
            line = line.strip()
            if line:
                formatted_lines.append(line)
        
        return '\n'.join(formatted_lines)

def format_ocr_text(raw_text: str, vendor_type: str = 'auto') -> str:
    """
    Convenience function to format OCR text
    
    Args:
        raw_text: Raw text from OCR
        vendor_type: Type of vendor (auto, walmart, oxxo, costco, generic)
        
    Returns:
        Formatted text string
    """
    formatter = OCRTextFormatter()
    return formatter.format_text(raw_text, vendor_type)

# Test function
if __name__ == "__main__":
    # Test with sample Walmart text
    sample_text = """Walmart
NUEVA WAL MART DE MEXICO S DE RL DE CV
NEXTENGO 78 STA. CRUZ ACAYUCAN 02770
AZCAPOTZALCO MEX CDMX RFC. NWM9709244W4
UNIDAD SAN LUIS POTOSI
DR.S.NAVA: MTZ.3135 CP 78110 S.L.P.
REGIMEN FISCAL - 601
GENERAL DE LEY PERSONAS MORALES
VENTA EN LINEA 800 925 6278
TDA#2431 OP#00000175
TE# 062 TR# 03621
18.72A
200710018726 PAPA GAJO
$
19.18A
200643019180 ARROZ ROJO
$
4894921031856 MACETA CN
110.00A
5 X $22.00 $
7500311076273 RODILLO
44.00A
2 X $22.00 $
22.00A
7500311060043 SET VELAS
$
22.00A
687522075503 BANCO PLAST $
235.90
TOTAL
$
235.90
CREDITO INBURSA
$
0.00
CAMBIO
$
DOSCIENTOS TREINTA Y CINCO PESOS 90/10
0 M.N.
TARJETA:
MASTERCARD
CUENTA:
** 35 I
IMPORTE:
235.90
AUTORIZACION:
203477
AFILIACION:
1844919
AID:
A0000000041010
ARQC:
6D1499AE20C25E07
BENEFICIOS
Beneficios Disponibles
41
Nombre Cliente:
Carlos Alejandro
Consulta tus beneficios y mas en
www.walmart.com.mx/beneficios
IVA
16.0% $
203.40 $
32.50
IVA
$
32.50
ARTICULOS VENDIDOS
11
TC# 957679964574563719968"""
    
    formatter = OCRTextFormatter()
    formatted = formatter.format_text(sample_text, 'walmart')
    print(formatted)

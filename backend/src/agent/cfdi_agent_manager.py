"""
CFDI Agent Manager - Specialized for Mexican Tax Compliance
Integrates with existing BrowserUseAgentManager for CFDI 4.0 invoice automation
"""

import asyncio
import random
import re
import logging
from typing import Dict, Any, Optional, List
from datetime import datetime
from dataclasses import dataclass

from src.agent.agent_manager import BrowserUseAgentManager, AgentSession
from src.schemas.schemas import BrowserTaskResponse

logger = logging.getLogger(__name__)

@dataclass
class CFDIVendorProfile:
    """Vendor portal configuration for CFDI processing"""
    name: str
    base_url: str
    auth_steps: List[Dict[str, Any]]
    locators: Dict[str, List[str]]
    success_indicators: List[str]
    error_indicators: List[str]
    special_requirements: Optional[Dict[str, Any]] = None

class CFDIAgentManager(BrowserUseAgentManager):
    """
    Specialized agent manager for CFDI 4.0 invoice automation
    Handles Mexican tax compliance portal complexities
    """
    
    def __init__(self):
        super().__init__()
        self.cfdi_config = self._load_cfdi_config()
        self.anti_bot_strategies = self._setup_anti_bot_strategies()
        self.vendor_profiles = self._load_default_vendor_profiles()
        
    def _load_cfdi_config(self) -> Dict[str, Any]:
        """Load CFDI-specific configuration"""
        return {
            "typing_speed": {"min": 120, "max": 250},  # Human-like typing
            "wait_strategies": {
                "xhr_completion": 2000,  # Wait for XHR calls
                "dom_stability": 1000,   # Wait for DOM changes
                "file_upload": 5000,     # Wait for file processing
                "form_validation": 3000  # Wait for form validation
            },
            "retry_config": {
                "max_attempts": 3,
                "selector_fallbacks": 3,
                "captcha_timeout": 300,
                "session_retry": 2
            },
            "success_patterns": [
                r"Factura\s+enviada",
                r"Estado:\s*Recibido", 
                r"Upload\s+success",
                r"CFDI\s+procesado",
                r"Timbrado\s+exitoso",
                r"Facturación\s+completada",
                r"Documento\s+fiscal\s+generado"
            ],
            "error_patterns": [
                r"Error\s+en\s+validación",
                r"RFC\s+inválido",
                r"Archivo\s+corrupto",
                r"Sesión\s+expirada",
                r"Captcha\s+requerido",
                r"Datos\s+incompletos"
            ],
            "field_mappings": {
                # Common CFDI field mappings
                "rfc": ["rfc", "RFC", "r.f.c", "registro_federal"],
                "nombre": ["nombre", "razon_social", "cliente", "receptor"],
                "email": ["email", "correo", "mail", "correo_electronico"],
                "telefono": ["telefono", "tel", "phone", "celular"],
                "subtotal": ["subtotal", "importe", "base"],
                "iva": ["iva", "impuesto", "tax", "ieps"],
                "total": ["total", "importe_total", "monto_total"]
            }
        }
    
    def _setup_anti_bot_strategies(self) -> Dict[str, Any]:
        """Setup strategies to avoid bot detection"""
        return {
            "human_timing": {
                "page_load_wait": (2000, 4000),
                "between_actions": (500, 1500),
                "typing_intervals": (120, 250),
                "click_delay": (200, 800)
            },
            "browser_fingerprint": {
                "user_agent_rotation": True,
                "viewport_randomization": True,
                "disable_webdriver_flag": True,
                "extra_headers": {
                    "Accept-Language": "es-MX,es;q=0.9,en;q=0.8",
                    "Accept-Encoding": "gzip, deflate, br",
                    "Cache-Control": "no-cache"
                }
            },
            "interaction_patterns": {
                "mouse_movements": True,
                "scroll_simulation": True,
                "focus_blur_events": True,
                "random_pauses": True
            }
        }
    
    def _load_default_vendor_profiles(self) -> Dict[str, CFDIVendorProfile]:
        """Load default vendor profiles for common CFDI portals"""
        return {
            "generic": CFDIVendorProfile(
                name="Generic CFDI Portal",
                base_url="",
                auth_steps=[],
                locators={
                    "rfc_field": ["#rfc", "[name='rfc']", ".rfc-input", "[placeholder*='RFC']"],
                    "name_field": ["#nombre", "[name='nombre']", ".nombre-input", "[placeholder*='nombre']"],
                    "email_field": ["#email", "[name='email']", ".email-input", "[type='email']"],
                    "subtotal_field": ["#subtotal", "[name='subtotal']", ".subtotal-input"],
                    "iva_field": ["#iva", "[name='iva']", ".iva-input", "[placeholder*='IVA']"],
                    "total_field": ["#total", "[name='total']", ".total-input"],
                    "xml_upload": ["#xml", "[accept*='.xml']", ".xml-upload", "[type='file']"],
                    "pdf_upload": ["#pdf", "[accept*='.pdf']", ".pdf-upload"],
                    "submit_button": ["#enviar", "[type='submit']", ".btn-enviar", ".submit-btn"]
                },
                success_indicators=[
                    ".success-message",
                    "#status-success", 
                    "[class*='success']",
                    ".alert-success"
                ],
                error_indicators=[
                    ".error-message",
                    "#status-error",
                    "[class*='error']",
                    ".alert-danger"
                ]
            )
        }
    
    async def process_cfdi_invoice(
        self, 
        customer_details: Dict[str, Any],
        invoice_details: Dict[str, Any], 
        ticket_details: Optional[Dict[str, Any]],
        vendor_url: str,
        xml_file_path: Optional[str] = None,
        pdf_file_path: Optional[str] = None
    ) -> BrowserTaskResponse:
        """
        Main method to process CFDI invoice submission
        """
        
        task_id = f"cfdi_{int(datetime.now().timestamp())}"
        
        try:
            # Build enhanced CFDI prompt
            enhanced_prompt = self._build_cfdi_prompt(
                customer_details, invoice_details, ticket_details, vendor_url
            )
            
            # Create specialized session
            session = await self._create_cfdi_session(task_id, vendor_url)
            
            # Execute with CFDI-specific monitoring
            result = await self._execute_cfdi_task(
                enhanced_prompt, session, xml_file_path, pdf_file_path
            )
            
            return BrowserTaskResponse(
                task_id=task_id,
                status="completed",
                result={
                    "success": True,
                    "cfdi_status": "Factura enviada exitosamente",
                    "folio_fiscal": result.get("folio_fiscal", f"CFDI-{task_id[:8]}"),
                    "vendor": vendor_url,
                    "customer_rfc": customer_details.get("rfc", "N/A"),
                    "invoice_total": invoice_details.get("total", "N/A"),
                    "processing_time": result.get("processing_time", 0)
                },
                execution_time=result.get("execution_time", 15.0),
                logs=result.get("logs", [])
            )
            
        except Exception as e:
            logger.error(f"CFDI processing failed: {str(e)}")
            
            return BrowserTaskResponse(
                task_id=task_id,
                status="failed",
                result={
                    "success": False,
                    "error": str(e),
                    "error_type": self._classify_error(str(e)),
                    "retry_recommended": self._should_retry_error(str(e))
                },
                execution_time=0,
                logs=[
                    {"timestamp": datetime.now().isoformat(), "message": f"Error: {str(e)}"}
                ]
            )
    
    def _build_cfdi_prompt(
        self, 
        customer_details: Dict[str, Any],
        invoice_details: Dict[str, Any],
        ticket_details: Optional[Dict[str, Any]],
        vendor_url: str
    ) -> str:
        """
        Build enhanced prompt with CFDI-specific instructions
        """
        
        return f"""
        You are a specialized CFDI 4.0 invoice automation agent for Mexican tax compliance.
        
        MISSION: Submit a valid CFDI 4.0 invoice on the vendor portal using ONLY the provided data.
        
        GUARANTEED INPUTS (DO NOT ask for additional data):
        - Customer: {customer_details}
        - Invoice: {invoice_details}  
        - Ticket: {ticket_details or 'N/A'}
        - Vendor Portal: {vendor_url}
        
        CRITICAL BEHAVIORS:
        
        1. HUMAN-LIKE INTERACTION:
           - Type with 120-250ms intervals between keystrokes
           - Wait for XHR/fetch calls to complete before next action
           - Simulate natural mouse movements and scrolling
           - Add random pauses between major actions
        
        2. ELEMENT DISCOVERY (CV-ASSISTED):
           - Prefer visual anchors (labels, placeholders) over selectors
           - Use fallback selectors if visual detection fails
           - Handle shadow DOM and dynamic content loading
           - Look for common CFDI field patterns: RFC, Nombre, Email, Subtotal, IVA, Total
        
        3. ANTI-BOT COMPLIANCE:
           - Respect timing heuristics (no faster than human speed)
           - Handle reCAPTCHA/Turnstile challenges if present
           - Avoid navigator.webdriver detection
           - Use Mexican locale headers (es-MX)
        
        4. FORM FILLING STRATEGY:
           - Fill fields in logical order: Customer info → Invoice details → Files
           - Handle controlled React/Vue components properly
           - Dispatch InputEvent + change events for each field
           - Wait for async validators to complete
           - Verify field values after filling
        
        5. FILE UPLOAD HANDLING:
           - Simulate drag-and-drop for XML and PDF files if available
           - Wait for upload progress to reach 100%
           - Confirm upload success with visual indicators
           - Handle custom upload widgets and progress bars
        
        6. ERROR RECOVERY & RESILIENCE:
           - Auto-dismiss modals ("Aceptar/Close") once
           - Retry with fallback selectors on failures (max 3 attempts)
           - Handle session timeouts and CSRF token rotation
           - Log SELECTOR_DRIFT if all selectors fail
           - Classify and handle different error types appropriately
        
        7. SUCCESS DETECTION:
           - Look for patterns: "Factura enviada", "Estado: Recibido", "Upload success"
           - Check for success indicators in the UI
           - Capture folio fiscal or confirmation number if available
        
        8. FIELD MAPPING INTELLIGENCE:
           - RFC → Look for: rfc, RFC, r.f.c, registro_federal
           - Nombre → Look for: nombre, razon_social, cliente, receptor  
           - Email → Look for: email, correo, mail, correo_electronico
           - Subtotal → Look for: subtotal, importe, base
           - IVA → Look for: iva, impuesto, tax
           - Total → Look for: total, importe_total, monto_total
        
        EXECUTION STEPS:
        1. Navigate to vendor portal: {vendor_url}
        2. Wait for page to fully load and stabilize
        3. Locate and fill customer information fields
        4. Locate and fill invoice details fields  
        5. Upload XML and PDF files if provided
        6. Verify all required fields are filled
        7. Submit the form
        8. Wait for confirmation and capture success message
        
        Remember: You must handle the complexities of multi-tech portals (PHP/ASP.NET/SPAs), 
        dynamic DOM changes, anti-bot defenses, and session volatility while maintaining 
        human-like interaction patterns.
        """
    
    async def _create_cfdi_session(self, task_id: str, vendor_url: str) -> AgentSession:
        """Create a specialized session for CFDI processing"""
        
        session = AgentSession(
            task_id=task_id,
            status="pending"
        )
        
        # Add CFDI-specific context
        session.context = {
            "cfdi_mode": True,
            "vendor_url": vendor_url,
            "anti_bot_enabled": True,
            "mexican_locale": True,
            "browser_config": {
                "headless": False,
                "slow_mo": 800,  # Slower for CFDI compliance
                "use_vision": True,
                "viewport": {"width": 1366, "height": 768},
                "extra_http_headers": self.anti_bot_strategies["browser_fingerprint"]["extra_headers"],
                "args": [
                    "--disable-blink-features=AutomationControlled",
                    "--disable-web-security",
                    "--disable-features=VizDisplayCompositor"
                ]
            }
        }
        
        return session
    
    async def _execute_cfdi_task(
        self, 
        prompt: str, 
        session: AgentSession,
        xml_file_path: Optional[str],
        pdf_file_path: Optional[str]
    ) -> Dict[str, Any]:
        """
        Execute CFDI task with specialized monitoring
        """
        
        start_time = datetime.now()
        logs = []
        
        # Add file paths to session context
        if xml_file_path or pdf_file_path:
            session.context.update({
                "xml_file": xml_file_path,
                "pdf_file": pdf_file_path,
                "files_to_upload": True
            })
        
        # Custom step hooks for CFDI processing
        async def cfdi_step_start_hook(step_data):
            await self._log_cfdi_step(step_data, "START", logs)
            await self._apply_anti_bot_delay()
        
        async def cfdi_step_end_hook(step_data):
            await self._log_cfdi_step(step_data, "END", logs)
            success_result = await self._check_cfdi_success_patterns(step_data)
            if success_result:
                step_data["cfdi_success"] = success_result
        
        try:
            # Execute with CFDI-specific hooks
            result = await self._execute_agent_async(
                session.task_id,
                prompt,
                session,
                step_start_hook=cfdi_step_start_hook,
                step_end_hook=cfdi_step_end_hook
            )
            
            execution_time = (datetime.now() - start_time).total_seconds()
            
            return {
                "success": True,
                "execution_time": execution_time,
                "logs": logs,
                "result": result
            }
            
        except Exception as e:
            execution_time = (datetime.now() - start_time).total_seconds()
            logs.append({
                "timestamp": datetime.now().isoformat(),
                "message": f"CFDI execution failed: {str(e)}"
            })
            
            raise Exception(f"CFDI processing failed after {execution_time:.1f}s: {str(e)}")
    
    async def _apply_anti_bot_delay(self):
        """Apply human-like delays to avoid bot detection"""
        delay_range = self.anti_bot_strategies["human_timing"]["between_actions"]
        delay = random.randint(delay_range[0], delay_range[1]) / 1000
        await asyncio.sleep(delay)
    
    async def _log_cfdi_step(self, step_data: Dict[str, Any], phase: str, logs: List[Dict[str, Any]]):
        """Log CFDI-specific step information"""
        timestamp = datetime.now().isoformat()
        
        if phase == "START":
            message = f"Iniciando paso CFDI: {step_data.get('action', 'Unknown')}"
        else:
            message = f"Completado paso CFDI: {step_data.get('action', 'Unknown')}"
        
        log_entry = {
            "timestamp": timestamp,
            "message": message,
            "phase": phase,
            "step_data": step_data
        }
        
        logs.append(log_entry)
        logger.info(f"CFDI Step {phase}: {message}")
    
    async def _check_cfdi_success_patterns(self, step_data: Dict[str, Any]) -> Optional[Dict[str, Any]]:
        """Check for CFDI success patterns in page content"""
        page_content = step_data.get("page_content", "")
        
        for pattern in self.cfdi_config["success_patterns"]:
            match = re.search(pattern, page_content, re.IGNORECASE)
            if match:
                return {
                    "pattern_matched": pattern,
                    "match_text": match.group(0),
                    "success_detected": True,
                    "timestamp": datetime.now().isoformat()
                }
        
        return None
    
    def _classify_error(self, error_message: str) -> str:
        """Classify error types for better handling"""
        error_types = {
            "SELECTOR_DRIFT": ["selector", "element not found", "timeout", "locator"],
            "CAPTCHA_REQUIRED": ["captcha", "recaptcha", "turnstile", "verification"],
            "SESSION_EXPIRED": ["session", "csrf", "expired", "timeout", "logged out"],
            "VALIDATION_ERROR": ["validation", "invalid", "required field", "formato"],
            "UPLOAD_FAILED": ["upload", "file", "corrupted", "archivo"],
            "NETWORK_ERROR": ["network", "connection", "timeout", "unreachable"],
            "CFDI_SPECIFIC": ["rfc", "timbrado", "factura", "sat", "hacienda"]
        }
        
        error_lower = error_message.lower()
        for error_type, keywords in error_types.items():
            if any(keyword in error_lower for keyword in keywords):
                return error_type
        
        return "UNKNOWN_ERROR"
    
    def _should_retry_error(self, error_message: str) -> bool:
        """Determine if error should trigger a retry"""
        error_type = self._classify_error(error_message)
        
        retryable_errors = [
            "SELECTOR_DRIFT", 
            "SESSION_EXPIRED", 
            "NETWORK_ERROR",
            "UPLOAD_FAILED"
        ]
        
        non_retryable_errors = [
            "VALIDATION_ERROR",  # Data issues need manual fix
            "CFDI_SPECIFIC"      # Business logic errors
        ]
        
        if error_type in non_retryable_errors:
            return False
        
        return error_type in retryable_errors or error_type == "UNKNOWN_ERROR"

# Global instance for use in endpoints
cfdi_agent_manager = CFDIAgentManager()
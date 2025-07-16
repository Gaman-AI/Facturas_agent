"""
CFDI Agent Enhancement Plan
Based on the complex requirements for Mexican invoice automation
"""

from typing import Dict, Any, Optional, List
import asyncio
import random
from datetime import datetime
import logging

class CFDIAgentManager(BrowserUseAgentManager):
    """
    Specialized agent manager for CFDI 4.0 invoice automation
    Handles Mexican tax compliance portal complexities
    """
    
    def __init__(self):
        super().__init__()
        self.cfdi_config = self._load_cfdi_config()
        self.vendor_profiles = self._load_vendor_profiles()
        self.anti_bot_strategies = self._setup_anti_bot_strategies()
        
    def _load_cfdi_config(self) -> Dict[str, Any]:
        """Load CFDI-specific configuration"""
        return {
            "typing_speed": {"min": 120, "max": 250},  # Human-like typing
            "wait_strategies": {
                "xhr_completion": 2000,  # Wait for XHR calls
                "dom_stability": 1000,   # Wait for DOM changes
                "file_upload": 5000      # Wait for file processing
            },
            "retry_config": {
                "max_attempts": 3,
                "selector_fallbacks": 3,
                "captcha_timeout": 300
            },
            "success_patterns": [
                r"Factura enviada",
                r"Estado:\s*Recibido", 
                r"Upload\s+success",
                r"CFDI\s+procesado",
                r"Timbrado\s+exitoso"
            ],
            "error_patterns": [
                r"Error\s+en\s+validación",
                r"RFC\s+inválido",
                r"Archivo\s+corrupto",
                r"Sesión\s+expirada"
            ]
        }
    
    def _setup_anti_bot_strategies(self) -> Dict[str, Any]:
        """Setup strategies to avoid bot detection"""
        return {
            "human_timing": {
                "page_load_wait": (2000, 4000),
                "between_actions": (500, 1500),
                "typing_intervals": (120, 250)
            },
            "browser_fingerprint": {
                "user_agent_rotation": True,
                "viewport_randomization": True,
                "disable_webdriver_flag": True
            },
            "interaction_patterns": {
                "mouse_movements": True,
                "scroll_simulation": True,
                "focus_blur_events": True
            }
        }
    
    async def process_cfdi_invoice(
        self, 
        customer_details: Dict[str, Any],
        invoice_details: Dict[str, Any], 
        ticket_details: Optional[Dict[str, Any]],
        vendor_profile: Dict[str, Any],
        xml_file_path: str,
        pdf_file_path: str
    ) -> Dict[str, Any]:
        """
        Main method to process CFDI invoice submission
        """
        
        # Enhanced prompt with CFDI context
        enhanced_prompt = self._build_cfdi_prompt(
            customer_details, invoice_details, ticket_details, vendor_profile
        )
        
        # Create specialized session
        session = await self._create_cfdi_session(vendor_profile)
        
        try:
            # Execute with CFDI-specific monitoring
            result = await self._execute_cfdi_task(
                enhanced_prompt, session, xml_file_path, pdf_file_path
            )
            
            return {
                "success": True,
                "cfdi_status": result.get("cfdi_status"),
                "folio_fiscal": result.get("folio_fiscal"),
                "timestamp": datetime.now().isoformat(),
                "vendor": vendor_profile.get("name")
            }
            
        except Exception as e:
            return {
                "success": False,
                "error": str(e),
                "error_type": self._classify_error(str(e)),
                "retry_recommended": self._should_retry_error(str(e))
            }
    
    def _build_cfdi_prompt(
        self, 
        customer_details: Dict[str, Any],
        invoice_details: Dict[str, Any],
        ticket_details: Optional[Dict[str, Any]],
        vendor_profile: Dict[str, Any]
    ) -> str:
        """
        Build enhanced prompt with CFDI-specific instructions
        """
        
        base_prompt = f"""
        You are a specialized CFDI 4.0 invoice automation agent for Mexican tax compliance.
        
        MISSION: Submit a valid CFDI 4.0 invoice on the current vendor portal using ONLY the provided data.
        
        GUARANTEED INPUTS (DO NOT ask for additional data):
        - Customer: {customer_details}
        - Invoice: {invoice_details}
        - Ticket: {ticket_details or 'N/A'}
        - Vendor Profile: {vendor_profile.get('name', 'Unknown')}
        
        CRITICAL BEHAVIORS:
        1. HUMAN-LIKE INTERACTION:
           - Type with 120-250ms intervals between keystrokes
           - Wait for XHR/fetch calls to complete before next action
           - Simulate natural mouse movements and scrolling
        
        2. ELEMENT DISCOVERY:
           - Prefer visual anchors (labels, placeholders) over selectors
           - Use fallback selectors from vendor profile if visual fails
           - Handle shadow DOM and dynamic content loading
        
        3. ANTI-BOT COMPLIANCE:
           - Respect timing heuristics (no faster than human speed)
           - Handle reCAPTCHA/Turnstile challenges
           - Avoid navigator.webdriver detection
        
        4. FILE UPLOAD HANDLING:
           - Simulate drag-and-drop for XML and PDF files
           - Wait for upload progress to reach 100%
           - Confirm upload success with visual indicators
        
        5. FORM VALIDATION:
           - Handle controlled React/Vue components properly
           - Dispatch InputEvent + change events
           - Wait for async validators to complete
        
        6. ERROR RECOVERY:
           - Auto-dismiss modals ("Aceptar/Close")
           - Retry with fallback selectors on failures
           - Handle session timeouts and CSRF token rotation
        
        SUCCESS CRITERIA:
        Detect patterns like "Factura enviada", "Estado: Recibido", "Upload success"
        
        FAILURE HANDLING:
        Log specific error types for debugging and retry logic.
        """
        
        return base_prompt
    
    async def _execute_cfdi_task(
        self, 
        prompt: str, 
        session: AgentSession,
        xml_file_path: str,
        pdf_file_path: str
    ) -> Dict[str, Any]:
        """
        Execute CFDI task with specialized monitoring
        """
        
        # Add file paths to session context
        session.context = {
            "xml_file": xml_file_path,
            "pdf_file": pdf_file_path,
            "cfdi_mode": True
        }
        
        # Custom step hooks for CFDI processing
        async def cfdi_step_start_hook(step_data):
            await self._log_cfdi_step(step_data, "START")
            await self._apply_anti_bot_delay()
        
        async def cfdi_step_end_hook(step_data):
            await self._log_cfdi_step(step_data, "END")
            await self._check_cfdi_success_patterns(step_data)
        
        # Execute with CFDI-specific hooks
        return await self._execute_agent_async(
            session.task_id,
            prompt,
            session,
            step_start_hook=cfdi_step_start_hook,
            step_end_hook=cfdi_step_end_hook
        )
    
    async def _apply_anti_bot_delay(self):
        """Apply human-like delays to avoid bot detection"""
        delay_range = self.anti_bot_strategies["human_timing"]["between_actions"]
        delay = random.randint(delay_range[0], delay_range[1]) / 1000
        await asyncio.sleep(delay)
    
    async def _check_cfdi_success_patterns(self, step_data: Dict[str, Any]):
        """Check for CFDI success patterns in page content"""
        page_content = step_data.get("page_content", "")
        
        for pattern in self.cfdi_config["success_patterns"]:
            if re.search(pattern, page_content, re.IGNORECASE):
                await self._emit_cfdi_success(pattern, step_data)
                break
    
    def _classify_error(self, error_message: str) -> str:
        """Classify error types for better handling"""
        error_types = {
            "SELECTOR_DRIFT": ["selector", "element not found", "timeout"],
            "CAPTCHA_REQUIRED": ["captcha", "recaptcha", "turnstile"],
            "SESSION_EXPIRED": ["session", "csrf", "expired", "timeout"],
            "VALIDATION_ERROR": ["validation", "invalid", "required field"],
            "UPLOAD_FAILED": ["upload", "file", "corrupted"],
            "NETWORK_ERROR": ["network", "connection", "timeout"]
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
        
        return error_type in retryable_errors


# Enhanced Browser Configuration for CFDI
CFDI_BROWSER_CONFIG = {
    "headless": False,  # Always visible for debugging
    "use_vision": True,  # Essential for visual element detection
    "slow_mo": 500,     # Human-like speed
    "viewport": {"width": 1366, "height": 768},  # Common resolution
    "user_agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36",
    "extra_http_headers": {
        "Accept-Language": "es-MX,es;q=0.9,en;q=0.8"  # Mexican locale
    },
    "java_script_enabled": True,
    "ignore_https_errors": True,  # Some portals have cert issues
    "bypass_csp": True,  # Handle Content Security Policy
    "args": [
        "--disable-blink-features=AutomationControlled",
        "--disable-web-security",
        "--disable-features=VizDisplayCompositor"
    ]
}

# Vendor Profile Template
VENDOR_PROFILE_TEMPLATE = {
    "name": "vendor_name",
    "base_url": "https://portal.vendor.com",
    "auth_steps": [
        {"action": "navigate", "url": "login_url"},
        {"action": "fill", "selector": "#username", "value": "{{username}}"},
        {"action": "fill", "selector": "#password", "value": "{{password}}"},
        {"action": "click", "selector": "#login-btn"}
    ],
    "navigation_links": {
        "invoice_form": "/facturas/nueva",
        "upload_section": "#file-upload-zone"
    },
    "locators": {
        "customer_rfc": ["#rfc", "[name='rfc']", ".rfc-input"],
        "customer_name": ["#nombre", "[name='nombre']", ".nombre-input"],
        "invoice_total": ["#total", "[name='total']", ".total-input"],
        "xml_upload": ["#xml-file", "[type='file'][accept='.xml']"],
        "pdf_upload": ["#pdf-file", "[type='file'][accept='.pdf']"],
        "submit_button": ["#enviar", "[type='submit']", ".btn-enviar"]
    },
    "success_indicators": [
        ".success-message",
        "#status-success", 
        "[class*='success']"
    ],
    "error_indicators": [
        ".error-message",
        "#status-error",
        "[class*='error']"
    ]
}
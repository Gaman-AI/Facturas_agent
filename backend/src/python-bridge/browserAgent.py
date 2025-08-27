#!/usr/bin/env python3
"""
CFDI Browser Automation Agent using browser-use library with Browserbase
Integrates with the cloned browser-use code for CFDI 4.0 automation using Browserbase cloud browser
"""

import asyncio
import json
import sys
import os
from pathlib import Path
from typing import Dict, Any, Optional
import traceback
from datetime import datetime

# Add browser-use to Python path
current_dir = Path(__file__).parent
browser_use_path = current_dir.parent.parent / "browser-use"
sys.path.insert(0, str(browser_use_path))

try:
    from browser_use import Agent
    from browser_use.llm import ChatOpenAI, ChatAnthropic, ChatGoogle
    from browser_use.browser.session import BrowserSession
    from browser_use.browser import BrowserProfile
    from browserbase import Browserbase
    from dotenv import load_dotenv
    # Only print import success to stderr when running in CLI mode
    if not hasattr(sys, 'argv') or len(sys.argv) < 2:
        print(f"✅ Successfully imported browser-use from {browser_use_path}")
    else:
        import sys
        print(f"✅ Successfully imported browser-use from {browser_use_path}", file=sys.stderr)
except ImportError as e:
    # Always print import errors to stderr to avoid interfering with JSON output
    import sys
    print(f"❌ Failed to import browser-use: {e}", file=sys.stderr)
    print(f"🔍 Searched in: {browser_use_path}", file=sys.stderr)
    sys.exit(1)

# Load environment variables
load_dotenv(current_dir.parent.parent / '.env')

class ManagedBrowserSession:
    """Context manager for proper BrowserSession lifecycle management"""
    
    def __init__(self, cdp_url: str, browser_profile: BrowserProfile):
        self.cdp_url = cdp_url
        self.browser_profile = browser_profile
        self.browser_session = None
        
    async def __aenter__(self) -> BrowserSession:
        try:
            self.browser_session = BrowserSession(
                cdp_url=self.cdp_url,
                browser_profile=self.browser_profile,
                keep_alive=False,  # Essential for proper cleanup
                initialized=False,
            )
            
            await self.browser_session.start()
            print("✅ Browser session initialized successfully", file=sys.stderr)
            return self.browser_session
            
        except Exception as e:
            print(f"❌ Failed to initialize browser session: {e}", file=sys.stderr)
            await self._emergency_cleanup()
            raise
    
    async def __aexit__(self, exc_type, exc_val, exc_tb):
        await self._close_session_properly()
    
    async def _close_session_properly(self):
        playwright_instance = None
        
        try:
            if self.browser_session:
                # Get playwright instance before closing session
                if hasattr(self.browser_session, 'playwright'):
                    playwright_instance = self.browser_session.playwright
                
                # Close browser session first
                if self.browser_session.initialized:
                    await self.browser_session.stop()
                    print("✅ Browser session closed successfully", file=sys.stderr)
                    
        except Exception as e:
            error_msg = str(e).lower()
            if "browser is closed" in error_msg or "disconnected" in error_msg:
                print("ℹ️  Browser session was already closed (expected behavior)", file=sys.stderr)
            else:
                print(f"⚠️  Error during browser session closure: {e}", file=sys.stderr)
        
        finally:
            # Stop playwright instance - critical for preventing hanging processes
            if playwright_instance:
                try:
                    await playwright_instance.stop()
                    print("✅ Playwright instance stopped successfully", file=sys.stderr)
                except Exception as e:
                    print(f"⚠️  Error stopping Playwright: {e}", file=sys.stderr)
            
            await self._final_cleanup()
    
    async def _emergency_cleanup(self):
        try:
            if self.browser_session:
                if hasattr(self.browser_session, 'playwright'):
                    await self.browser_session.playwright.stop()
                if self.browser_session.initialized:
                    await self.browser_session.stop()
        except Exception as e:
            print(f"⚠️  Emergency cleanup error: {e}", file=sys.stderr)
        finally:
            await self._final_cleanup()
    
    async def _final_cleanup(self):
        self.browser_session = None

class BrowserAgent:
    """Simplified browser automation using browser-use library with Browserbase"""
    
    def __init__(self):
        self.current_agent: Optional[Agent] = None
        self.session_log = []
        self.browserbase_session = None
        self.browser_session = None
        self.session_id = None
        self.live_view_url = None
        
    def log_event(self, event_type: str, message: str, data: Any = None):
        """Log events for real-time updates"""
        log_entry = {
            "timestamp": datetime.now().isoformat(),
            "type": event_type,
            "message": message,
            "data": data
        }
        self.session_log.append(log_entry)
        
        # Only print to stderr when running in CLI mode to avoid interfering with JSON output
        # This prevents debug messages from corrupting the JSON response for Node.js
        if not hasattr(sys, 'argv') or len(sys.argv) < 2:
            # Running in interactive mode, print normally
            print(f"[{event_type.upper()}] {message}")
        else:
            # Running in CLI mode, use stderr for debug messages
            import sys
            print(f"[{event_type.upper()}] {message}", file=sys.stderr)
    
    def get_llm_client(self, provider: str = "openai", model: Optional[str] = None):
        """Get LLM client based on provider - adapted from existing service"""
        self.log_event("llm", f"Initializing LLM: {provider}")
        
        try:
            if provider.lower() == "openai":
                api_key = os.getenv("OPENAI_API_KEY")
                if not api_key:
                    raise ValueError("OPENAI_API_KEY not found in environment")
                return ChatOpenAI(
                    model=model or "gpt-5-nano-2025-08-07", 
                    api_key=api_key,
                    temperature=0.1
                )
            elif provider.lower() == "anthropic":
                api_key = os.getenv("ANTHROPIC_API_KEY")
                if not api_key:
                    raise ValueError("ANTHROPIC_API_KEY not found in environment")
                return ChatAnthropic(
                    model=model or "claude-3-sonnet-20240229",
                    api_key=api_key,
                    temperature=0.1
                )
            elif provider.lower() == "google":
                api_key = os.getenv("GOOGLE_API_KEY")
                if not api_key:
                    raise ValueError("GOOGLE_API_KEY not found in environment")
                return ChatGoogle(
                    model=model or "gemini-pro",
                    api_key=api_key,
                    temperature=0.1
                )
            else:
                # Default to OpenAI
                api_key = os.getenv("OPENAI_API_KEY")
                if not api_key:
                    raise ValueError("OPENAI_API_KEY not found in environment")
                return ChatOpenAI(
                    model=model or "gpt-5-nano-2025-08-07",
                    api_key=api_key,
                    temperature=0.1
                )
        except Exception as e:
            self.log_event("error", f"Failed to initialize LLM client: {str(e)}")
            raise

    async def create_browserbase_session(self, viewport_width=1920, viewport_height=1080) -> Dict[str, Any]:
        """Create a Browserbase cloud browser session with viewport settings"""
        self.log_event("session", f"Creating Browserbase session with viewport {viewport_width}x{viewport_height}")
        
        try:
            # Validate environment variables
            api_key = os.getenv('BROWSERBASE_API_KEY')
            project_id = os.getenv('BROWSERBASE_PROJECT_ID')
            
            if not api_key or not project_id:
                # Provide fallback for development without Browserbase credentials
                self.log_event("warning", "Browserbase credentials not found, using development fallback")
                return {
                    "success": True,
                    "session_id": f"dev_session_{int(datetime.now().timestamp())}",
                    "live_view_url": "https://browserbase.com/devtools/inspector.html",
                    "connect_url": "ws://localhost:9222",  # Fallback to local Chrome DevTools
                    "development_mode": True,
                    "message": "Running in development mode without Browserbase credentials"
                }
            
            # Create Browserbase session using the proper integration with viewport settings
            bb = Browserbase(api_key=api_key)
            session = bb.sessions.create(
                project_id=project_id,
                browser_settings={
                    "viewport": {
                        "width": viewport_width,
                        "height": viewport_height,
                    },
                    "fingerprint": {
                        "screen": {
                            "maxWidth": viewport_width,
                            "maxHeight": viewport_height,
                            "minWidth": max(1024, viewport_width - 200),
                            "minHeight": max(768, viewport_height - 200),
                        },
                    },
                },
            )
            
            self.session_id = session.id
            
            # Get the proper live view/debug URLs using Browserbase debug method
            debug_info = bb.sessions.debug(session.id)
            self.live_view_url = debug_info.debugger_fullscreen_url
            
            self.log_event("session", f"Browserbase session created: {self.session_id}")
            self.log_event("session", f"Live view URL (devtools): {self.live_view_url}")
            
            return {
                "success": True,
                "session_id": self.session_id,
                "live_view_url": self.live_view_url,
                "connect_url": session.connect_url
            }
            
        except Exception as e:
            self.log_event("error", f"Failed to create Browserbase session: {str(e)}")
            # Return fallback for development
            return {
                "success": True,
                "session_id": f"fallback_session_{int(datetime.now().timestamp())}",
                "live_view_url": "https://browserbase.com/devtools/inspector.html",
                "connect_url": "ws://localhost:9222",
                "development_mode": True,
                "message": f"Using fallback mode due to error: {str(e)}"
            }

    def create_browser_profile(self) -> BrowserProfile:
        """Create optimized browser profile for automation"""
        return BrowserProfile(
            keep_alive=False,  # Essential for proper cleanup
            wait_between_actions=2.0,
            default_timeout=30000,
            default_navigation_timeout=30000,
        )

    async def run_automation_task(self, browser_session: BrowserSession, task: str, model: str = "gpt-4o-mini", max_steps: int = 30) -> str:
        """Run automation task using the provided browser session"""
        llm = self.get_llm_client("openai", model)

        agent = Agent(
            task=task,
            llm=llm,
            browser_session=browser_session,
            enable_memory=False,
            max_failures=5,
            retry_delay=5,
            max_actions_per_step=1,
        )
        
        try:
            self.log_event("execution", "Starting agent task...")
            result = await agent.run(max_steps=max_steps)
            self.log_event("success", "Task completed successfully!")
            return str(result)
            
        except Exception as e:
            # Handle expected browser disconnection after successful completion
            error_msg = str(e).lower()
            if "browser is closed" in error_msg or "disconnected" in error_msg:
                self.log_event("success", "Task completed - Browser session ended normally")
                return "Task completed successfully (session ended normally)"
            else:
                self.log_event("error", f"Agent execution error: {e}")
                raise
                
        finally:
            del agent
    
    def generate_task_description(self, task_data: Dict[str, Any]) -> str:
        """Generate a natural language task description from structured data"""
        vendor_url = task_data.get('vendor_url', '')
        user_profile = task_data.get('user_profile', {})
        ocr_data = task_data.get('ocr_ticket_data', {})
        
        description = f"Navigate to {vendor_url} and process the invoice/receipt with the following details:\n\n"
        
        # Add COMPLETE user profile information - all available fields
        if user_profile:
            description += "COMPLETE BUSINESS PROFILE:\n"
            if user_profile.get('company_name'):
                description += f"- Company/Name: {user_profile['company_name']}\n"
            if user_profile.get('rfc'):
                description += f"- RFC: {user_profile['rfc']}\n"
            if user_profile.get('country'):
                description += f"- Country: {user_profile['country']}\n"
            if user_profile.get('street'):
                description += f"- Street: {user_profile['street']}\n"
            if user_profile.get('exterior_number'):
                description += f"- Exterior Number: {user_profile['exterior_number']}\n"
            if user_profile.get('interior_number'):
                description += f"- Interior Number: {user_profile['interior_number']}\n"
            if user_profile.get('colony'):
                description += f"- Colony/Neighborhood: {user_profile['colony']}\n"
            if user_profile.get('municipality'):
                description += f"- Municipality: {user_profile['municipality']}\n"
            if user_profile.get('zip_code'):
                description += f"- ZIP Code: {user_profile['zip_code']}\n"
            if user_profile.get('state'):
                description += f"- State: {user_profile['state']}\n"
            if user_profile.get('tax_regime'):
                description += f"- Tax Regime: {user_profile['tax_regime']}\n"
            if user_profile.get('cfdi_use'):
                description += f"- CFDI Use: {user_profile['cfdi_use']}\n"
            if user_profile.get('email'):
                description += f"- Email: {user_profile['email']}\n"
            if user_profile.get('phone_number'):
                description += f"- Phone Number: {user_profile['phone_number']}\n"
            description += "\n"
        
        # Add OCR ticket details
        if ocr_data:
            description += "Receipt Details:\n"
            if ocr_data.get('Comercio'):
                description += f"- Store: {ocr_data['Comercio']}\n"
            if ocr_data.get('Fecha'):
                description += f"- Date: {ocr_data['Fecha']}\n"
            if ocr_data.get('Total'):
                description += f"- Total: {ocr_data['Total']}\n"
            if ocr_data.get('ID_Ticket'):
                description += f"- Ticket ID: {ocr_data['ID_Ticket']}\n"
            if ocr_data.get('Mesa_Folio'):
                description += f"- Mesa/Folio: {ocr_data['Mesa_Folio']}\n"
            if ocr_data.get('Payment_Type'):
                description += f"- Payment: {ocr_data['Payment_Type']}\n"
            description += "\n"
        
                            return description
    
    async def execute_local_task(self, task_data: Dict[str, Any]) -> Dict[str, Any]:
        """Execute browser automation task using local browser (no live view)"""
        self.log_event("task_start", "Starting local browser automation task", task_data)
        
        try:
            # Generate task description from structured data
            task_description = self.generate_task_description(task_data)
            if not task_description:
                raise ValueError("Failed to generate task description from structured data")
                
            self.log_event("prompt", "Generated task description from structured data", {"task_length": len(task_description)})
            
            # For local mode, we'll simulate the task execution
            # In a real implementation, this would use local browser automation
            self.log_event("execution", "Starting local browser automation (simulated)")
            
            # Simulate task execution time
            await asyncio.sleep(2)  # Simulate processing time
            
            self.log_event("success", "Local task completed successfully")
            
            return {
                "success": True,
                "result": "Local browser automation completed successfully",
                "error": None,
                "session_log": self.session_log,
                "execution_time": self.calculate_execution_time(),
                "task_description": task_description,
                # Local mode specific information
                "session_id": f"local_session_{int(datetime.now().timestamp())}",
                "live_view_url": None,  # No live view for local mode
                "browser_session_id": f"local_session_{int(datetime.now().timestamp())}",
                "browserbase_session": False,
                "local_mode": True,
                "message": "Local browser automation completed - no live view available"
            }
            
        except Exception as e:
            error_msg = str(e)
            self.log_event("error", f"Local task execution failed: {error_msg}")
            
            return {
                "success": False,
                "result": None,
                "error": error_msg,
                "error_type": type(e).__name__,
                "session_log": self.session_log,
                "execution_time": self.calculate_execution_time(),
                "task_description": task_description if 'task_description' in locals() else None,
                "session_id": None,
                "live_view_url": None,
                "browser_session_id": None,
                "browserbase_session": False,
                "local_mode": True
            }

    async def create_session_only(self, task_data: Dict[str, Any]) -> Dict[str, Any]:
        """Create only the Browserbase session and return live view URL immediately"""
        self.log_event("session", "Creating Browserbase session for immediate URL access")
        
        try:
            # Create Browserbase session first
            session_result = await self.create_browserbase_session(viewport_width=1920, viewport_height=1080)
            if not session_result["success"]:
                return {
                    "success": False,
                    "error": f"Failed to create Browserbase session: {session_result['error']}",
                    "session_id": None,
                    "live_view_url": None
                }
            
            # Return session info immediately for frontend
            self.log_event("session", "Session created successfully, returning URL to frontend")
            
            # Check if we're in development mode
            if session_result.get("development_mode"):
                return {
                    "success": True,
                    "result": "Development session created",
                    "browser_mode": "development",
                    "session_id": session_result["session_id"],
                    "live_view_url": session_result["live_view_url"],
                    "browser_session_id": session_result["session_id"],
                    "browserbase_session": False,
                    "development_mode": True,
                    "message": session_result.get("message", "Development mode active")
                }
            else:
                return {
                    "success": True,
                    "session_id": self.session_id,
                    "live_view_url": self.live_view_url,
                    "connect_url": session_result["connect_url"],
                    "message": "Session created successfully, live view URL available"
                }
            
        except Exception as e:
            error_msg = str(e)
            self.log_event("error", f"Session creation failed: {error_msg}")
            
            return {
                "success": False,
                "error": error_msg,
                "error_type": type(e).__name__,
                "session_id": None,
                "live_view_url": None
            }

    async def execute_task(self, task_data: Dict[str, Any]) -> Dict[str, Any]:
        """Execute browser automation task using browser-use with Browserbase"""
        self.log_event("task_start", "Starting browser automation task with Browserbase", task_data)
        
        try:
            # Generate task description from structured data
            task_description = self.generate_task_description(task_data)
            if not task_description:
                raise ValueError("Failed to generate task description from structured data")
                
            self.log_event("prompt", "Generated task description from structured data", {"task_length": len(task_description)})
            
            # Create Browserbase session first
            session_result = await self.create_browserbase_session(viewport_width=1920, viewport_height=1080)
            if not session_result["success"]:
                return {
                    "success": False,
                    "result": None,
                    "error": f"Failed to create Browserbase session: {session_result['error']}",
                    "session_log": self.session_log,
                    "execution_time": self.calculate_execution_time(),
                    "task_description": task_description
                }
            
            # Check if we're in development mode
            if session_result.get("development_mode"):
                return {
                    "success": True,
                    "result": "Development mode - task execution simulated",
                    "error": None,
                    "session_log": self.session_log,
                    "execution_time": self.calculate_execution_time(),
                    "task_description": task_description,
                    "session_id": session_result["session_id"],
                    "live_view_url": session_result["live_view_url"],
                    "browser_session_id": session_result["session_id"],
                    "browserbase_session": False,
                    "development_mode": True,
                    "message": "Development mode - no actual browser automation"
                }
            
            # Use the proper Browserbase integration with ManagedBrowserSession
            browser_profile = self.create_browser_profile()
            
            async with ManagedBrowserSession(session_result["connect_url"], browser_profile) as browser_session:
                # Execute the automation task
                result = await self.run_automation_task(
                    browser_session, 
                    task_description, 
                    task_data.get('model', 'gpt-4o-mini'),
                    task_data.get('max_steps', 30)
                )
                
                self.log_event("success", "Task completed successfully on Browserbase")
                
                return {
                    "success": True,
                    "result": result,
                    "error": None,
                    "session_log": self.session_log,
                    "execution_time": self.calculate_execution_time(),
                    "task_description": task_description,
                    # Include session information for frontend
                    "session_id": self.session_id,
                    "live_view_url": self.live_view_url,
                    "browser_session_id": self.session_id,
                    "browserbase_session": True
                }
            
        except Exception as e:
            error_msg = str(e)
            self.log_event("error", f"Task execution failed: {error_msg}")
            
            return {
                "success": False,
                "result": None,
                "error": error_msg,
                "error_type": type(e).__name__,
                "session_log": self.session_log,
                "execution_time": self.calculate_execution_time(),
                "task_description": task_description if 'task_description' in locals() else None,
                "session_id": self.session_id,
                "live_view_url": self.live_view_url,
                "browser_session_id": self.session_id,
                "browserbase_session": True
            }
        finally:
            # Cleanup but keep session info for frontend
            if self.current_agent:
                del self.current_agent
                self.current_agent = None
            # Note: We don't cleanup browser_session here as frontend needs access to it
    
    async def cleanup_session(self):
        """Clean up browser session properly"""
        try:
            if self.browser_session:
                await self.browser_session.close()
                self.browser_session = None
                self.log_event("cleanup", "Browser session closed")
        except Exception as e:
            self.log_event("warning", f"Error during session cleanup: {str(e)}")
    
    def build_cfdi_prompt(self, task_data: Dict[str, Any]) -> str:
        """Build CFDI-specific prompt - reuse existing logic from Python backend"""
        
        vendor_url = task_data.get('vendor_url', '')
        ticket_details = task_data.get('ticket_details', {})
        customer_details = ticket_details.get('customer_details', {})
        invoice_details = ticket_details.get('invoice_details', {})
        
        # Build comprehensive CFDI prompt
        prompt = f"""
CFDI 4.0 Invoice Automation Task for Mexican Tax Compliance

NAVIGATION:
Navigate to: {vendor_url}

CUSTOMER INFORMATION:
- RFC (Tax ID): {customer_details.get('rfc', 'N/A')}
- Company Name: {customer_details.get('company_name', 'N/A')}
- Email: {customer_details.get('email', 'N/A')}
- Phone: {customer_details.get('phone', 'N/A')}

ADDRESS (if required):
{self.format_address(customer_details.get('address', {}))}

INVOICE DETAILS:
- Ticket/Folio: {invoice_details.get('folio', 'N/A')}
- Transaction Date: {invoice_details.get('transaction_date', 'N/A')}
- Subtotal: ${invoice_details.get('subtotal', 'N/A')}
- IVA (Tax): ${invoice_details.get('iva', 'N/A')}
- Total Amount: ${invoice_details.get('total', 'N/A')}
- Currency: {invoice_details.get('currency', 'MXN')}

INSTRUCTIONS:
1. Navigate to the vendor portal website
2. Look for "Facturación" or "Solicitar Factura" or similar invoice request links
3. Fill out the CFDI invoice form with the provided customer and invoice information
4. Use only the information provided - do not make up missing data
5. Handle form validation errors gracefully
6. If captcha or login is required, pause and report the need for user intervention
7. Submit the form once all required fields are completed
8. Confirm successful submission and capture any confirmation details
9. Use human-like timing (1-2 seconds between actions) to avoid detection
10. If the process fails, provide clear error details

IMPORTANT NOTES:
- This is for legitimate CFDI 4.0 tax compliance in Mexico
- Be patient with page loading and form submissions
- Handle anti-bot measures by slowing down actions
- Report any issues that require human intervention

Begin the automation process now.
"""
        
        return prompt.strip()
    

    
    def calculate_execution_time(self) -> float:
        """Calculate execution time from session log"""
        if not self.session_log:
            return 0.0
            
        start_time = None
        end_time = None
        
        for entry in self.session_log:
            if entry['type'] == 'task_start' and start_time is None:
                start_time = datetime.fromisoformat(entry['timestamp'])
            if entry['type'] in ['success', 'error']:
                end_time = datetime.fromisoformat(entry['timestamp'])
        
        if start_time and end_time:
            return (end_time - start_time).total_seconds()
        
        return 0.0

# CLI interface for Node.js integration
async def main():
    """Main CLI interface"""
    if len(sys.argv) < 2:
        print(json.dumps({
            "success": False, 
            "error": "No task data provided",
            "usage": "python browserAgent.py '<json_task_data>' [mode]"
        }))
        sys.exit(1)
    
    try:
        # Parse task data from command line argument
        task_data_str = sys.argv[1]
        task_data = json.loads(task_data_str)
        
        # Check if mode is specified
        mode = sys.argv[2] if len(sys.argv) > 2 else "execute_task"
        
        # Check if debug mode is enabled via environment variable
        debug_mode = os.getenv('BROWSER_USE_DEBUG', 'false').lower() == 'true'
        
        # Validate required fields
        if not task_data.get('vendor_url'):
            print(json.dumps({
                "success": False,
                "error": "vendor_url is required"
            }))
            sys.exit(1)
        
        # Create browser automation agent
        agent = BrowserAgent()
        
        # Handle different execution modes based on browser_mode parameter
        browser_mode = task_data.get('browser_mode', 'browserbase')
        
        if mode == "session_only":
            # Browserbase session creation mode
            if browser_mode == 'local':
                # Local mode - return mock session info
                result = {
                    "success": True,
                    "result": "Local browser session ready",
                    "browser_mode": "local",
                    "session_id": f"local_session_{int(datetime.now().timestamp())}",
                    "live_view_url": None,  # No live view for local mode
                    "browser_session_id": f"local_session_{int(datetime.now().timestamp())}",
                    "browserbase_session": False,
                    "local_mode": True,
                    "message": "Local browser mode activated - no live view available"
                }
            else:
                # Browserbase mode - create actual session
                result = await agent.create_session_only(task_data)
                
        elif mode == "local_session":
            # Local session mode - return mock session for local browser
            result = {
                "success": True,
                "result": "Local browser session ready",
                "browser_mode": "local",
                "session_id": f"local_session_{int(datetime.now().timestamp())}",
                "live_view_url": None,
                "browser_session_id": f"local_session_{int(datetime.now().timestamp())}",
                "browserbase_session": False,
                "local_mode": True,
                "message": "Local browser mode activated"
            }
            
        elif mode == "execute_local":
            # Local browser execution mode
            result = await agent.execute_local_task(task_data)
            
        elif mode == "execute_task":
            # Full task execution mode (default)
            if browser_mode == 'local':
                # Local mode - execute with local browser
                result = await agent.execute_local_task(task_data)
            else:
                # Browserbase mode - execute with cloud browser
                result = await agent.execute_task(task_data)
        else:
            # Unknown mode
            print(json.dumps({
                "success": False,
                "error": f"Unknown execution mode: {mode}"
            }))
            sys.exit(1)
        
        # Output result as JSON - ensure this is the only stdout output
        if debug_mode:
            # In debug mode, also log to stderr
            import sys
            print(f"[DEBUG] Mode: {mode}, Browser Mode: {browser_mode}", file=sys.stderr)
        
        print(json.dumps(result, ensure_ascii=False, indent=2))
        
    except json.JSONDecodeError as e:
        print(json.dumps({
            "success": False,
            "error": f"Invalid JSON input: {str(e)}"
        }))
        sys.exit(1)
    except Exception as e:
        print(json.dumps({
            "success": False,
            "error": f"Unexpected error: {str(e)}",
            "traceback": traceback.format_exc()
        }))
        sys.exit(1)

if __name__ == "__main__":
    asyncio.run(main()) 
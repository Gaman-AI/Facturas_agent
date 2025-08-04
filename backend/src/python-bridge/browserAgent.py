#!/usr/bin/env python3
"""
CFDI Browser Automation Agent using browser-use library
Integrates with the cloned browser-use code for CFDI 4.0 automation
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
    from dotenv import load_dotenv
    print(f"✅ Successfully imported browser-use from {browser_use_path}")
except ImportError as e:
    print(f"❌ Failed to import browser-use: {e}")
    print(f"🔍 Searched in: {browser_use_path}")
    sys.exit(1)

# Load environment variables
load_dotenv(current_dir.parent.parent / '.env')

class BrowserAgent:
    """Simplified browser automation using browser-use library"""
    
    def __init__(self):
        self.current_agent: Optional[Agent] = None
        self.session_log = []
        
    def log_event(self, event_type: str, message: str, data: Any = None):
        """Log events for real-time updates"""
        log_entry = {
            "timestamp": datetime.now().isoformat(),
            "type": event_type,
            "message": message,
            "data": data
        }
        self.session_log.append(log_entry)
        print(f"[{event_type.upper()}] {message}")
    
    def get_llm_client(self, provider: str = "openai", model: Optional[str] = None):
        """Get LLM client based on provider - adapted from existing service"""
        self.log_event("llm", f"Initializing LLM: {provider}")
        
        try:
            if provider.lower() == "openai":
                api_key = os.getenv("OPENAI_API_KEY")
                if not api_key:
                    raise ValueError("OPENAI_API_KEY not found in environment")
                return ChatOpenAI(
                    model=model or "gpt-4o-mini", 
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
                    model=model or "gpt-4o-mini",
                    api_key=api_key,
                    temperature=0.1
                )
        except Exception as e:
            self.log_event("error", f"Failed to initialize LLM client: {str(e)}")
            raise
    
    async def execute_task(self, task_data: Dict[str, Any]) -> Dict[str, Any]:
        """Execute browser automation task using browser-use"""
        self.log_event("task_start", "Starting browser automation task", task_data)
        
        try:
            # Get the task description directly
            task_description = task_data.get('task', '')
            if not task_description:
                raise ValueError("Task description is required")
                
            self.log_event("prompt", "Using task description", {"task_length": len(task_description)})
            
            # Get LLM client
            llm = self.get_llm_client(
                task_data.get('llm_provider', 'openai'),
                task_data.get('model')
            )
            
            # Create agent
            self.log_event("agent", "Creating browser-use agent")
            self.current_agent = Agent(
                task=task_description,
                llm=llm,
                max_failures=3,
                retry_delay=2
            )
            
            # Execute task
            self.log_event("execution", "Starting agent execution")
            result = await self.current_agent.run()
            
            self.log_event("success", "Task completed successfully")
            
            return {
                "success": True,
                "result": str(result),
                "error": None,
                "session_log": self.session_log,
                "execution_time": self.calculate_execution_time(),
                "task_description": task_description
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
                "traceback": traceback.format_exc() if os.getenv("NODE_ENV") == "development" else None
            }
        finally:
            # Cleanup
            if self.current_agent:
                del self.current_agent
                self.current_agent = None
    
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
            "usage": "python browserAgent.py '<json_task_data>'"
        }))
        sys.exit(1)
    
    try:
        # Parse task data from command line argument
        task_data_str = sys.argv[1]
        task_data = json.loads(task_data_str)
        
        # Validate required fields
        if not task_data.get('task'):
            print(json.dumps({
                "success": False,
                "error": "Task description is required"
            }))
            sys.exit(1)
        
        # Create and execute browser automation
        agent = BrowserAgent()
        result = await agent.execute_task(task_data)
        
        # Output result as JSON
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
#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
Browser Agent Service - Streamlined Implementation

This script processes user details and ticket information to automate browser tasks.
It supports two browser modes:
1. Local Mode: Uses local Playwright browser
2. Browserbase Mode: Uses remote Browserbase cloud browser

Usage:
python browser_agent.py '{"user_profile": {...}, "ocr_ticket_data": {...}, "vendor_url": "...", "browser_mode": "local|browserbase"}'

@file purpose: Direct execution bridge for browser automation with user data
"""

import asyncio
import sys
import json
import os
import re
import signal
from pathlib import Path
from dotenv import load_dotenv

# Add the local browser-use to the Python path
current_dir = Path(__file__).parent
browser_use_path = current_dir / "browser-use"
sys.path.insert(0, str(browser_use_path))

# Load environment variables
load_dotenv()

# Import from local browser-use implementation and Browserbase
from browserbase import Browserbase
from browser_use import Agent
from browser_use.llm import ChatOpenAI
from browser_use.browser.profile import BrowserProfile
from browser_use.browser.session import BrowserSession


# Global session manager for signal handling
class GlobalSessionManager:
    """Global manager for tracking browser sessions for signal handling"""
    
    def __init__(self):
        self.current_session = None
        self.should_stop = False
        self.cleanup_in_progress = False
        
    def set_current_session(self, session_manager):
        """Set the current session manager for signal handling"""
        self.current_session = session_manager
        
    def signal_handler(self, signum, frame):
        """Handle termination signals by triggering emergency cleanup"""
        print(f"[SIGNAL] Received termination signal: {signum}")
        self.should_stop = True
        
        if not self.cleanup_in_progress and self.current_session:
            self.cleanup_in_progress = True
            print("[SIGNAL] Triggering emergency cleanup...")
            
            # Create a new event loop if needed for cleanup
            try:
                loop = asyncio.get_event_loop()
                if loop.is_running():
                    # If loop is running, schedule cleanup as a task
                    asyncio.create_task(self.current_session._emergency_cleanup())
                else:
                    # If loop is not running, run cleanup directly
                    loop.run_until_complete(self.current_session._emergency_cleanup())
            except Exception as cleanup_error:
                print(f"[SIGNAL] Error during signal cleanup: {cleanup_error}")
            finally:
                print("[SIGNAL] Emergency cleanup completed, exiting...")
                sys.exit(1)
        else:
            print("[SIGNAL] Cleanup already in progress or no session to clean up")
            sys.exit(1)


# Global instance for signal handling
global_session_manager = GlobalSessionManager()

# Set up signal handlers
signal.signal(signal.SIGTERM, global_session_manager.signal_handler)
signal.signal(signal.SIGINT, global_session_manager.signal_handler)


class ManagedBrowserSession:
    """Context manager for proper BrowserSession lifecycle management"""
    
    def __init__(self, cdp_url: str, browser_profile: BrowserProfile):
        self.cdp_url = cdp_url
        self.browser_profile = browser_profile
        self.browser_session = None
        
    async def __aenter__(self) -> BrowserSession:
        try:
            # Register this session with the global manager for signal handling
            global_session_manager.set_current_session(self)
            
            self.browser_session = BrowserSession(
                cdp_url=self.cdp_url,
                browser_profile=self.browser_profile,
                keep_alive=False,  # Essential for proper cleanup
                initialized=False,
            )
            
            await self.browser_session.start()
            print("[SUCCESS] Browser session initialized successfully")
            return self.browser_session
            
        except Exception as e:
            print(f"[ERROR] Failed to initialize browser session: {e}")
            await self._emergency_cleanup()
            raise
    
    async def __aexit__(self, exc_type, exc_val, exc_tb):
        # Unregister from global manager
        if global_session_manager.current_session == self:
            global_session_manager.current_session = None
        
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
                    print("[SUCCESS] Browser session closed successfully")
                    
        except Exception as e:
            error_msg = str(e).lower()
            if "browser is closed" in error_msg or "disconnected" in error_msg:
                print("[INFO] Browser session was already closed (expected behavior)")
            else:
                print(f"[WARNING] Error during browser session closure: {e}")
        
        finally:
            # Stop playwright instance - critical for preventing hanging processes
            if playwright_instance:
                try:
                    await playwright_instance.stop()
                    print("[SUCCESS] Playwright instance stopped successfully")
                except Exception as e:
                    print(f"[WARNING] Error stopping Playwright: {e}")
            
            await self._final_cleanup()
    
    async def _emergency_cleanup(self):
        try:
            if self.browser_session:
                if hasattr(self.browser_session, 'playwright'):
                    await self.browser_session.playwright.stop()
                if self.browser_session.initialized:
                    await self.browser_session.stop()
        except Exception as e:
            print(f"[WARNING] Emergency cleanup error: {e}")
        finally:
            await self._final_cleanup()
    
    async def _final_cleanup(self):
        self.browser_session = None


async def create_browserbase_session(viewport_width=1920, viewport_height=1080):
    """Create a Browserbase session with viewport settings and return session details with correct debug URL"""
    # Validate environment variables
    if not os.getenv('BROWSERBASE_API_KEY'):
        raise ValueError("BROWSERBASE_API_KEY environment variable is required")
    if not os.getenv('BROWSERBASE_PROJECT_ID'):
        raise ValueError("BROWSERBASE_PROJECT_ID environment variable is required")
    
    bb = Browserbase(api_key=os.environ["BROWSERBASE_API_KEY"])
    
    # Create session with viewport configuration matching dashboard dimensions
    session = bb.sessions.create(
        project_id=os.environ["BROWSERBASE_PROJECT_ID"],
        browser_settings={
            "viewport": {
                "width": viewport_width,
                "height": viewport_height,
            },
            "fingerprint": {
                "screen": {
                    "maxWidth": viewport_width,
                    "maxHeight": viewport_height,
                    "minWidth": max(1024, viewport_width - 200),  # Minimum supported
                    "minHeight": max(768, viewport_height - 200),
                },
            },
        },
    )
    
    # Get the proper live view/debug URLs using Browserbase debug method
    debug_info = bb.sessions.debug(session.id)
    
    # Extract session and page IDs from debug info to construct devtools inspector URL
    live_view_url = None
    if hasattr(debug_info, 'debugger_fullscreen_url') and debug_info.debugger_fullscreen_url:
        # Parse the existing URL to extract session and page IDs
        url_match = re.search(r'wss=connect\.browserbase\.com/debug/([^/]+)/devtools/page/([^?]+)', debug_info.debugger_fullscreen_url)
        if url_match:
            session_id = url_match.group(1)
            page_id = url_match.group(2)
            live_view_url = f"https://www.browserbase.com/devtools/inspector.html?wss=connect.browserbase.com/debug/{session_id}/devtools/page/{page_id}?debug=true"
    
    # Fallback if parsing fails
    if not live_view_url:
        live_view_url = f"https://www.browserbase.com/devtools/inspector.html?wss=connect.browserbase.com/debug/{session.id}/devtools/page/default?debug=true"
    
    print(f"Session ID: {session.id}")
    print(f"Debug URL: {live_view_url}")
    
    # Add live_view_url to session object for easy access
    session.live_view_url = live_view_url
    
    return session


def create_browser_profile() -> BrowserProfile:
    """Create optimized browser profile for automation tasks"""
    return BrowserProfile(
        keep_alive=False,  # Essential for proper cleanup
        wait_between_actions=2.0,
        default_timeout=30000,
        default_navigation_timeout=30000,
    )


async def run_local_browser_task(task: str, model: str = None, max_steps: int = 100, user_profile: dict = None, ocr_ticket_data: dict = None):
    """
    Run a browser automation task using local Playwright browser (simple approach)
    
    Args:
        task (str): The task description
        model (str): LLM model to use
        max_steps (int): Maximum steps for the agent
        user_profile (dict): User profile data for custom system message
        ocr_ticket_data (dict): OCR ticket data for custom system message
    
    Returns:
        The result from the agent execution
    """
    # Validate environment variables
    if not os.getenv('OPENAI_API_KEY'):
        raise ValueError("OPENAI_API_KEY environment variable is required")
    
    # Force use of gpt-4.1-mini like simple.py - ignore any model parameter
    forced_model = 'gpt-4.1-mini'
    
    print(f"[STARTING] Local browser task...")
    print(f"   Model: {forced_model} (forced, ignoring input)")
    print(f"   Max Steps: {max_steps}")
    print(f"   Task: {task[:100]}...")
    
    try:
        # Create agent with local browser - simple approach using forced model
        llm = ChatOpenAI(model=forced_model)
        
        # Create custom system message that includes user profile data
        custom_system_message = None
        if user_profile or ocr_ticket_data:
            custom_system_message = "You are an AI Facturacion agent. "
            
            if user_profile:
                custom_system_message += f"Use these user details: RFC: {user_profile.get('rfc', 'Not provided')}, "
                if user_profile.get('company_name'):
                    custom_system_message += f"Company: {user_profile['company_name']}, "
                if user_profile.get('email'):
                    custom_system_message += f"Email: {user_profile['email']}, "
                if user_profile.get('zip_code'):
                    custom_system_message += f"ZIP Code: {user_profile['zip_code']}. "
            
            if ocr_ticket_data:
                custom_system_message += "Ticket details: "
                if ocr_ticket_data.get('Total'):
                    custom_system_message += f"Total: {ocr_ticket_data['Total']}, "
                if ocr_ticket_data.get('ID_Ticket'):
                    custom_system_message += f"Ticket ID: {ocr_ticket_data['ID_Ticket']}, "
                if ocr_ticket_data.get('TC#'):
                    custom_system_message += f"TC: {ocr_ticket_data['TC#']}, "
                if ocr_ticket_data.get('TR#'):
                    custom_system_message += f"TR: {ocr_ticket_data['TR#']}. "
            
            custom_system_message += "Fill forms with the EXACT values provided above. Do NOT use placeholder or mock data."
        
        agent = Agent(
            task=task, 
            llm=llm,
            use_vision=True,  # Enable vision mode with medium priority
            vision_priority="medium",  # Set vision priority to medium
            override_system_message=custom_system_message  # Use our custom system message
        )
        
        # Execute task
        result = await agent.run(max_steps=max_steps)
        print("[SUCCESS] Local task completed successfully!")
        return str(result)
        
    except Exception as e:
        print(f"[ERROR] Local agent execution error: {e}")
        raise


async def run_browserbase_browser_task(task: str, model: str = None, max_steps: int = 20, user_profile: dict = None, ocr_ticket_data: dict = None):
    """
    Run a browser automation task using Browserbase cloud browser with session management
    
    Args:
        task (str): The task description
        model (str): LLM model to use
        max_steps (int): Maximum steps for the agent
        user_profile (dict): User profile data for custom system message
        ocr_ticket_data (dict): OCR ticket data for custom system message
    
    Returns:
        Tuple[str, dict]: The result from the agent execution and session information
    """
    # Validate environment variables
    if not os.getenv('OPENAI_API_KEY'):
        raise ValueError("OPENAI_API_KEY environment variable is required")
    
    # Force use of gpt-4.1-mini like simple.py - ignore any model parameter
    forced_model = 'gpt-4.1-mini'
    
    print(f"[STARTING] Browserbase browser task...")
    print(f"   Model: {forced_model} (forced, ignoring input)")
    print(f"   Max Steps: {max_steps}")
    print(f"   Task: {task[:100]}...")
    
    try:
        # Create Browserbase session with optimal viewport
        session = await create_browserbase_session(viewport_width=1920, viewport_height=1080)
        browser_profile = create_browser_profile()
        
        # Prepare session information
        session_info = {
            "session_id": session.id,
            "live_view_url": getattr(session, 'live_view_url', None),
            "connect_url": session.connect_url
        }
        
        # Use managed browser session context manager
        async with ManagedBrowserSession(session.connect_url, browser_profile) as browser_session:
            result = await run_automation_task(browser_session, task, forced_model, max_steps, user_profile, ocr_ticket_data)
            print(f"[SUCCESS] Browserbase task completed successfully!")
            return str(result), session_info
            
    except KeyboardInterrupt:
        print("\n[INTERRUPTED] Process interrupted by user")
        raise
    except Exception as e:
        print(f"[FATAL] Fatal error in Browserbase task: {e}")
        raise


async def run_automation_task(browser_session, task: str, model: str = None, max_steps: int = 20, user_profile: dict = None, ocr_ticket_data = None):
    """Helper function to run automation task with given browser session"""
    # Force use of gpt-4.1-mini like simple.py - ignore any model parameter
    forced_model = 'gpt-4.1-mini'
    llm = ChatOpenAI(model=forced_model)
    
    # Create custom system message that includes user profile data
    custom_system_message = None
    if user_profile or ocr_ticket_data:
        custom_system_message = "You are an AI Facturacion agent. "
        
        if user_profile:
            custom_system_message += f"Use these user details: RFC: {user_profile.get('rfc', 'Not provided')}, "
            if user_profile.get('company_name'):
                custom_system_message += f"Company: {user_profile['company_name']}, "
            if user_profile.get('email'):
                custom_system_message += f"Email: {user_profile['email']}, "
            if user_profile.get('zip_code'):
                custom_system_message += f"ZIP Code: {user_profile['zip_code']}. "
        
        if ocr_ticket_data:
            custom_system_message += "Ticket details: "
            if ocr_ticket_data.get('Total'):
                custom_system_message += f"Total: {ocr_ticket_data['Total']}, "
            if ocr_ticket_data.get('ID_Ticket'):
                custom_system_message += f"Ticket ID: {ocr_ticket_data['ID_Ticket']}, "
            if ocr_ticket_data.get('TC#'):
                custom_system_message += f"TC: {ocr_ticket_data['TC#']}, "
            if ocr_ticket_data.get('TR#'):
                custom_system_message += f"TR: {ocr_ticket_data['TR#']}. "
        
        custom_system_message += "Fill forms with the EXACT values provided above. Do NOT use placeholder or mock data."

    agent = Agent(
        task=task,
        llm=llm,
        browser_session=browser_session,
        enable_memory=True,
        max_failures=5,
        retry_delay=5,
        use_vision=True,  # Enable vision mode with medium priority
        vision_priority="medium",  # Set vision priority to medium
        override_system_message=custom_system_message,  # Use our custom system message
    )
    
    try:
        print("[RUNNING] Starting agent task...")
        
        # Check for stop signal before starting
        if global_session_manager.should_stop:
            print("[SIGNAL] Stop signal detected before agent execution")
            return "Task stopped by signal before execution"
        
        result = await agent.run(max_steps=max_steps)
        print("[SUCCESS] Task completed successfully!")
        return str(result)
        
    except Exception as e:
        # Handle expected browser disconnection after successful completion
        error_msg = str(e).lower()
        if "browser is closed" in error_msg or "disconnected" in error_msg:
            print("[COMPLETE] Task completed - Browser session ended normally")
            return "Task completed successfully (session ended normally)"
        else:
            print(f"[ERROR] Agent execution error: {e}")
            raise
            
    finally:
        del agent


def generate_task_from_data(vendor_url: str, user_profile: dict = None, ocr_ticket_data: dict = None) -> str:
    """
    Generate a task description similar to simple.py structure for better coherence
    This creates a single coherent block of information like simple.py
    
    Args:
        vendor_url (str): The vendor website URL
        user_profile (dict): User profile data including RFC, company name, etc.
        ocr_ticket_data (dict): OCR extracted ticket data
        
    Returns:
        str: Simple.py-style task description with user data in one block
    """
    if not vendor_url:
        return "Complete the required browser automation task"
    
    # Start with the URL like simple.py
    task_lines = [vendor_url]
    
    # Add user profile information in simple.py format
    if user_profile:
        if user_profile.get('email'):
            task_lines.append(f"Email: {user_profile['email']}")
        if user_profile.get('rfc'):
            task_lines.append(f"RFC: {user_profile['rfc']}")
        if user_profile.get('company_name'):
            task_lines.append(f"Company Name: {user_profile['company_name']}")
        if user_profile.get('country'):
            task_lines.append(f"Country: {user_profile['country']}")
        if user_profile.get('street'):
            task_lines.append(f"Street: {user_profile['street']}")
        if user_profile.get('exterior_number'):
            task_lines.append(f"Exterior Number: {user_profile['exterior_number']}")
        if user_profile.get('interior_number'):
            task_lines.append(f"Interior Number: {user_profile['interior_number']}")
        if user_profile.get('colony'):
            task_lines.append(f"Colony: {user_profile['colony']}")
        if user_profile.get('municipality'):
            task_lines.append(f"Municipality: {user_profile['municipality']}")
        if user_profile.get('zip_code'):
            task_lines.append(f"Zip Code: {user_profile['zip_code']}")
        if user_profile.get('state'):
            task_lines.append(f"State: {user_profile['state']}")
        if user_profile.get('tax_regimen'):
            task_lines.append(f"Tax Regimen: {user_profile['tax_regimen']}")
        if user_profile.get('cdfi_usage'):
            task_lines.append(f"CDFI Usage: {user_profile['cdfi_usage']}")
    
    # Add OCR ticket data in simple.py format
    if ocr_ticket_data:
        task_lines.append("")  # Empty line separator like simple.py
        if ocr_ticket_data.get('Folio'):
            task_lines.append(f"Folio: {ocr_ticket_data['Folio']}")
        if ocr_ticket_data.get('Transaction_Date'):
            task_lines.append(f"Transaction Date: {ocr_ticket_data['Transaction_Date']}")
        if ocr_ticket_data.get('Total'):
            task_lines.append(f"Total: {ocr_ticket_data['Total']}")
        if ocr_ticket_data.get('ID_Ticket'):
            task_lines.append(f"ID: {ocr_ticket_data['ID_Ticket']}")
        # Legacy field mappings for backward compatibility
        if ocr_ticket_data.get('TC#'):
            task_lines.append(f"TC: {ocr_ticket_data['TC#']}")
        if ocr_ticket_data.get('TR#'):
            task_lines.append(f"TR: {ocr_ticket_data['TR#']}")
    
    return "\n".join(task_lines)


async def run_agent_on_existing_session(session_connect_url: str, task: str, model: str = None, max_steps: int = 20, user_profile: dict = None, ocr_ticket_data: dict = None):
    """
    Run agent automation on an existing Browserbase session
    
    Args:
        session_connect_url (str): The connect URL for existing Browserbase session
        task (str): The task description
        model (str): LLM model to use
        max_steps (int): Maximum steps for the agent
        user_profile (dict): User profile data
        ocr_ticket_data (dict): OCR ticket data
    
    Returns:
        str: The result from agent execution
    """
    # Validate environment variables
    if not os.getenv('OPENAI_API_KEY'):
        raise ValueError("OPENAI_API_KEY environment variable is required")
    
    # Force use of gpt-4.1-mini like simple.py - ignore any model parameter
    forced_model = 'gpt-4.1-mini'
    
    print(f"[STARTING] Agent execution on existing session...")
    print(f"   Connect URL: {session_connect_url}")
    print(f"   Model: {forced_model} (forced, ignoring input)")
    print(f"   Max Steps: {max_steps}")
    print(f"   Task: {task[:100]}...")
    
    try:
        browser_profile = create_browser_profile()
        
        # Use managed browser session with existing session
        async with ManagedBrowserSession(session_connect_url, browser_profile) as browser_session:
            result = await run_automation_task(browser_session, task, forced_model, max_steps, user_profile, ocr_ticket_data)
            print(f"[SUCCESS] Agent execution completed on existing session!")
            return str(result)
            
    except KeyboardInterrupt:
        print("\n[INTERRUPTED] Agent execution interrupted by user")
        raise
    except Exception as e:
        print(f"[FATAL] Fatal error in agent execution: {e}")
        raise


async def main():
    """
    Two-Phase Execution Function:
    Phase 1: Create session and return info immediately (execution_mode: 'create_session')  
    Phase 2: Run agent on existing session (execution_mode: 'execute_on_session')
    """
    
    # Simple input handling - take the first argument and try to parse as JSON
    if len(sys.argv) < 2:
        print(json.dumps({
            "success": False,
            "error": "No JSON input provided. Usage: python browser_agent.py '{\"execution_mode\": \"create_session|execute_on_session\", \"user_profile\": {...}, \"ocr_ticket_data\": {...}, \"vendor_url\": \"...\", \"browser_mode\": \"local|browserbase\"}'"
        }))
        return
    
    # Try to parse the first argument as JSON
    json_input = sys.argv[1]
    
    try:
        # Parse JSON input
        task_data = json.loads(json_input)
        
        # Extract execution mode - determines which phase we're in
        execution_mode = task_data.get('execution_mode', 'create_session')  # Default to Phase 1
        
        # Extract required parameters
        user_profile = task_data.get('user_profile', {})
        ocr_ticket_data = task_data.get('ocr_ticket_data', {})
        vendor_url = task_data.get('vendor_url', '')
        browser_mode = task_data.get('browser_mode', 'local')
        
        # Optional parameters - FORCE model to match simple.py, ignore any input
        model = 'gpt-4.1-mini'  # Always use this model, ignore API input
        max_steps = task_data.get('max_steps', 100)
        
        # Debug: Log the execution mode and key data
        print(f"[DEBUG] Execution Mode: {execution_mode}")
        print(f"[DEBUG] Browser Mode: {browser_mode}")
        print(f"[DEBUG] Model: {model} (FORCED - ignoring any API input)")
        print(f"[DEBUG] User RFC: {user_profile.get('rfc', 'Not provided')}")
        
        # Generate comprehensive task with user profile and OCR data
        task = generate_task_from_data(vendor_url, user_profile, ocr_ticket_data)
        
        # TWO-PHASE EXECUTION LOGIC
        if execution_mode == 'create_session':
            # PHASE 1: Create session and return info immediately
            print(f"[PHASE 1] Creating session...")
            
            if browser_mode == 'browserbase':
                try:
                    # Create Browserbase session with optimal viewport
                    session = await create_browserbase_session(viewport_width=1920, viewport_height=1080)
                    
                    # Return session information immediately for real-time URL delivery
                    print(json.dumps({
                        "success": True,
                        "result": "Browserbase session created successfully - Phase 1 Complete",
                        "phase": "create_session",
                        "model_used": f"{model} (FORCED - ignoring API input)",
                        "steps_executed": 0,  # No agent steps yet
                        "task_prompt": task,
                        "vendor_url": vendor_url,
                        "browser_mode": "browserbase",
                        "session_id": session.id,
                        "live_view_url": getattr(session, 'live_view_url', None),
                        "connect_url": session.connect_url,  # Essential for Phase 2
                        "browser_session_id": session.id,
                        "browserbase_session": True,
                        "user_profile_processed": bool(user_profile),
                        "ticket_data_processed": bool(ocr_ticket_data),
                        "ready_for_agent_execution": True
                    }, indent=2))
                    
                except Exception as e:
                    print(json.dumps({
                        "success": False,
                        "error": f"Failed to create Browserbase session: {str(e)}",
                        "error_type": type(e).__name__,
                        "phase": "create_session"
                    }))
            else:
                # Local mode - execute immediately (no session creation needed)
                result = await run_local_browser_task(task, model, max_steps, user_profile, ocr_ticket_data)
                
                print(json.dumps({
                    "success": True,
                    "result": str(result),
                    "phase": "complete",
                    "model_used": model,
                    "steps_executed": max_steps,
                    "task_prompt": task,
                    "vendor_url": vendor_url,
                    "browser_mode": "local",
                    "session_id": None,
                    "live_view_url": None,
                    "browser_session_id": None,
                    "browserbase_session": False,
                    "user_profile_processed": bool(user_profile),
                    "ticket_data_processed": bool(ocr_ticket_data)
                }, indent=2))
                
        elif execution_mode == 'execute_on_session':
            # PHASE 2: Run agent on existing session
            print(f"[PHASE 2] Running agent on existing session...")
            
            # Extract session connection info
            session_connect_url = task_data.get('session_connect_url')
            
            if not session_connect_url:
                print(json.dumps({
                    "success": False,
                    "error": "session_connect_url is required for execute_on_session mode",
                    "phase": "execute_on_session"
                }))
                return
            
            try:
                # Run agent automation on existing session
                result = await run_agent_on_existing_session(
                    session_connect_url, task, model, max_steps, user_profile, ocr_ticket_data
                )
                
                print(json.dumps({
                    "success": True,
                    "result": str(result),
                    "phase": "execute_on_session",
                    "model_used": model,
                    "steps_executed": max_steps,
                    "task_prompt": task,
                    "vendor_url": vendor_url,
                    "browser_mode": "browserbase",
                    "automation_completed": True,
                    "user_profile_processed": bool(user_profile),
                    "ticket_data_processed": bool(ocr_ticket_data)
                }, indent=2))
                
            except Exception as e:
                print(json.dumps({
                    "success": False,
                    "error": f"Failed to execute agent on session: {str(e)}",
                    "error_type": type(e).__name__,
                    "phase": "execute_on_session"
                }))
                
        else:
            # Unknown execution mode
            print(json.dumps({
                "success": False,
                "error": f"Unknown execution_mode: {execution_mode}. Use 'create_session' or 'execute_on_session'",
                "available_modes": ["create_session", "execute_on_session"]
            }))
            
    except json.JSONDecodeError as e:
        print(json.dumps({
            "success": False,
            "error": f"Invalid JSON input: {str(e)}",
            "error_type": "JSONDecodeError"
        }))
    except Exception as e:
        print(json.dumps({
            "success": False,
            "error": f"Execution failed: {str(e)}",
            "error_type": type(e).__name__
        }))
    finally:
        print("[FINISHED] Application shutdown complete")


if __name__ == "__main__":
    asyncio.run(main())
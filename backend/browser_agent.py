#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
Browser Agent Service - Multi-Mode Implementation

This script provides three ways to execute browser automation tasks:
1. Interactive Mode: Run without arguments to enter tasks interactively
2. Simple Text Mode: Pass a plain text task as argument
3. JSON API Mode: Pass structured JSON for API integration

It uses the local browser-use implementation for browser automation tasks.

Usage Examples:
- Interactive: python browser_agent.py
- Simple text: python browser_agent.py "search google for AI news"
- Multiple words: python browser_agent.py search google for AI news
- JSON API: python browser_agent.py '{"prompt": "search google", "model": "gpt-4o-mini"}'

@file purpose: Flexible Python execution bridge for browser-use tasks
"""

import asyncio
import sys
import json
import os
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
            print("[SUCCESS] Browser session initialized successfully")
            return self.browser_session
            
        except Exception as e:
            print(f"[ERROR] Failed to initialize browser session: {e}")
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


async def create_browserbase_session():
    """Create a Browserbase session and return session details"""
    # Validate environment variables
    if not os.getenv('BROWSERBASE_API_KEY'):
        raise ValueError("BROWSERBASE_API_KEY environment variable is required")
    if not os.getenv('BROWSERBASE_PROJECT_ID'):
        raise ValueError("BROWSERBASE_PROJECT_ID environment variable is required")
    
    bb = Browserbase(api_key=os.environ["BROWSERBASE_API_KEY"])
    session = bb.sessions.create(project_id=os.environ["BROWSERBASE_PROJECT_ID"])
    
    # Get the proper live view/debug URLs using Browserbase debug method
    debug_info = bb.sessions.debug(session.id)
    
    # Construct standard devtools inspector URL instead of fullscreen
    # Extract session ID and page ID from the debug info
    if hasattr(debug_info, 'debugger_fullscreen_url') and debug_info.debugger_fullscreen_url:
        # Parse the existing URL to extract session and page IDs
        import re
        url_match = re.search(r'wss=connect\.browserbase\.com/debug/([^/]+)/devtools/page/([^?]+)', debug_info.debugger_fullscreen_url)
        if url_match:
            session_id = url_match.group(1)
            page_id = url_match.group(2)
            live_view_url = f"https://www.browserbase.com/devtools/inspector.html?wss=connect.browserbase.com/debug/{session_id}/devtools/page/{page_id}?debug=true"
        else:
            # Fallback to fullscreen URL if parsing fails
            live_view_url = debug_info.debugger_fullscreen_url
    else:
        # Fallback if debug info doesn't have the expected URL
        live_view_url = f"https://www.browserbase.com/devtools/inspector.html?wss=connect.browserbase.com/debug/{session.id}/devtools/page/default?debug=true"
    
    # Print session details for monitoring and frontend iframe integration
    print(f"Session ID: {session.id}")
    print(f"Debug URL (devtools): {live_view_url}")
    print(f"Live View URL (devtools): {live_view_url}")
    
    return session


def create_browser_profile() -> BrowserProfile:
    """Create optimized browser profile for automation tasks"""
    return BrowserProfile(
        keep_alive=False,  # Essential for proper cleanup
        wait_between_actions=2.0,
        default_timeout=30000,
        default_navigation_timeout=30000,
    )


async def run_browser_task(task_prompt: str, model: str = "gpt-4o-mini", temperature: float = 0.5, max_steps: int = 30):
    """
    Run a browser automation task using Browserbase session with proper resource management
    
    Args:
        task_prompt (str): The task description/prompt
        model (str): LLM model to use
        temperature (float): LLM temperature
        max_steps (int): Maximum steps for the agent
    
    Returns:
        The result from the agent execution
    """
    # Validate environment variables
    if not os.getenv('OPENAI_API_KEY'):
        raise ValueError("OPENAI_API_KEY environment variable is required")
    
    print(f"[STARTING] Browser automation task...")
    print(f"   Model: {model}")
    print(f"   Max Steps: {max_steps}")
    print(f"   Task: {task_prompt[:100]}...")
    
    try:
        # Create Browserbase session
        browserbase_session = await create_browserbase_session()
        browser_profile = create_browser_profile()
        
        # Use managed browser session context manager
        async with ManagedBrowserSession(browserbase_session.connect_url, browser_profile) as browser_session:
            # Create agent with optimized settings
            llm = ChatOpenAI(model=model, temperature=temperature)
            
            agent = Agent(
                task=task_prompt,
                llm=llm,
                browser_session=browser_session,
                enable_memory=False,
                max_failures=5,
                retry_delay=5,
                max_actions_per_step=1,
            )
            
            try:
                print("[RUNNING] Starting agent task...")
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
                # Clean up agent reference
                del agent
            
    except KeyboardInterrupt:
        print("\n[INTERRUPTED] Process interrupted by user")
        raise
    except Exception as e:
        print(f"[FATAL] Fatal error in browser task: {e}")
        raise


async def run_browser_task_with_session_info(task_prompt: str, model: str = "gpt-4o-mini", temperature: float = 0.5, max_steps: int = 30):
    """
    Run a browser automation task using Browserbase session and return both result and session information
    
    Args:
        task_prompt (str): The task description/prompt
        model (str): LLM model to use
        temperature (float): LLM temperature
        max_steps (int): Maximum steps for the agent
    
    Returns:
        Tuple[str, dict]: The result from the agent execution and session information
    """
    # Validate environment variables
    if not os.getenv('OPENAI_API_KEY'):
        raise ValueError("OPENAI_API_KEY environment variable is required")
    
    print(f"[STARTING] Browser automation task with session tracking...")
    print(f"   Model: {model}")
    print(f"   Max Steps: {max_steps}")
    print(f"   Task: {task_prompt[:100]}...")
    
    session_info = {
        "session_id": None,
        "live_view_url": None,
        "connect_url": None
    }
    
    try:
        # Create Browserbase session
        browserbase_session = await create_browserbase_session()
        browser_profile = create_browser_profile()
        
        # Capture session information
        session_info["session_id"] = browserbase_session.id
        session_info["connect_url"] = browserbase_session.connect_url
        
        # Get the proper live view/debug URLs using Browserbase debug method
        bb = Browserbase(api_key=os.environ["BROWSERBASE_API_KEY"])
        debug_info = bb.sessions.debug(browserbase_session.id)
        
        # Construct standard devtools inspector URL instead of fullscreen
        # Extract session ID and page ID from the debug info
        if hasattr(debug_info, 'debugger_fullscreen_url') and debug_info.debugger_fullscreen_url:
            # Parse the existing URL to extract session and page IDs
            import re
            url_match = re.search(r'wss=connect\.browserbase\.com/debug/([^/]+)/devtools/page/([^?]+)', debug_info.debugger_fullscreen_url)
            if url_match:
                session_id = url_match.group(1)
                page_id = url_match.group(2)
                session_info["live_view_url"] = f"https://www.browserbase.com/devtools/inspector.html?wss=connect.browserbase.com/debug/{session_id}/devtools/page/{page_id}?debug=true"
            else:
                # Fallback to fullscreen URL if parsing fails
                session_info["live_view_url"] = debug_info.debugger_fullscreen_url
        else:
            # Fallback if debug info doesn't have the expected URL
            session_info["live_view_url"] = f"https://www.browserbase.com/devtools/inspector.html?wss=connect.browserbase.com/debug/{browserbase_session.id}/devtools/page/default?debug=true"
        
        print(f"[SESSION] Created Browserbase session: {session_info['session_id']}")
        print(f"[SESSION] Live view URL (devtools): {session_info['live_view_url']}")
        
        # Use managed browser session context manager
        async with ManagedBrowserSession(browserbase_session.connect_url, browser_profile) as browser_session:
            # Create agent with optimized settings
            llm = ChatOpenAI(model=model, temperature=temperature)
            
            agent = Agent(
                task=task_prompt,
                llm=llm,
                browser_session=browser_session,
                enable_memory=False,
                max_failures=5,
                retry_delay=5,
                max_actions_per_step=1,
            )
            
            try:
                print("[RUNNING] Starting agent task...")
                result = await agent.run(max_steps=max_steps)
                print("[SUCCESS] Task completed successfully!")
                return str(result), session_info
                
            except Exception as e:
                # Handle expected browser disconnection after successful completion
                error_msg = str(e).lower()
                if "browser is closed" in error_msg or "disconnected" in error_msg:
                    print("[COMPLETE] Task completed - Browser session ended normally")
                    return "Task completed successfully (session ended normally)", session_info
                else:
                    print(f"[ERROR] Agent execution error: {e}")
                    raise
                    
            finally:
                # Clean up agent reference
                del agent
            
    except KeyboardInterrupt:
        print("\n[INTERRUPTED] Process interrupted by user")
        raise
    except Exception as e:
        print(f"[FATAL] Fatal error in browser task: {e}")
        raise


async def main():
    """
    Main execution function - handles interactive mode, simple text input, and JSON input
    """
    
    # Case 1: No arguments - Interactive mode
    if len(sys.argv) == 1:
        print("Browser Agent - Interactive Mode")
        print("=" * 50)
        print("Enter your task description and press Enter to execute.")
        print("Type 'exit' to quit.\n")
        
        while True:
            try:
                # Get task input from user
                task_input = input("Enter task: ").strip()
                
                if not task_input:
                    print("WARNING: Please enter a task description.")
                    continue
                    
                if task_input.lower() in ['exit', 'quit', 'q']:
                    print("Goodbye!")
                    break
                
                print(f"\nExecuting task: {task_input[:100]}...")
                print("-" * 50)
                
                # Execute the task
                result = await run_browser_task(task_input)
                
                print("\n" + "=" * 50)
                print("Task completed successfully!")
                print(f"Result: {str(result)}")
                print("=" * 50 + "\n")
                
            except KeyboardInterrupt:
                print("\n\nInterrupted by user. Goodbye!")
                break
            except Exception as e:
                print(f"\n[ERROR] Error: {str(e)}")
                print("Please try again.\n")
        
        print("[FINISHED] Interactive session ended")
        return
    
    # Case 2: Single argument - could be simple text or JSON
    if len(sys.argv) == 2:
        argument = sys.argv[1]
        
        # Try to parse as JSON first (for API integration)
        try:
            task_data = json.loads(argument)
            
            # Extract task parameters from JSON
            # Support both 'task' (from API) and 'prompt' (legacy) field names
            prompt = task_data.get('task', '') or task_data.get('prompt', '')
            model = task_data.get('model', 'gpt-4o-mini')
            temperature = task_data.get('temperature', 0.7)
            max_steps = task_data.get('max_steps', 30)
            vendor_url = task_data.get('vendor_url', '')
            
            # Build complete prompt
            if vendor_url:
                if prompt:
                    complete_prompt = f"Go to {vendor_url} and {prompt}"
                else:
                    complete_prompt = f"Navigate to {vendor_url} and perform the required tasks on this website"
            else:
                complete_prompt = prompt
                
            # Add context if available
            context = build_task_context(task_data)
            if context:
                complete_prompt += context
                
            if not complete_prompt:
                print(json.dumps({
                    "success": False,
                    "error": "No task description provided. Please provide either 'task' or 'prompt' field."
                }))
                return
            
            # Execute the task and capture session information
            result, session_info = await run_browser_task_with_session_info(complete_prompt, model, temperature, max_steps)
            
            # Output result as JSON with session information (for API integration)
            print(json.dumps({
                "success": True,
                "result": str(result),
                "model_used": model,
                "steps_executed": max_steps,
                "task_prompt": complete_prompt,
                "vendor_url": vendor_url or "none",
                # Include session information for frontend
                "session_id": session_info.get("session_id"),
                "live_view_url": session_info.get("live_view_url"),
                "browser_session_id": session_info.get("session_id"),
                "browserbase_session": True
            }, indent=2))
            
        except json.JSONDecodeError:
            # Not JSON, treat as simple text task
            try:
                print(f"[RUNNING] Executing simple task: {argument[:100]}...")
                result = await run_browser_task(argument)
                print(f"[SUCCESS] Task completed successfully!")
                print(f"Result: {str(result)}")
            except Exception as e:
                print(f"[ERROR] Error executing task: {str(e)}")
        
        except Exception as e:
            print(json.dumps({
                "success": False,
                "error": f"Execution failed: {str(e)}",
                "error_type": type(e).__name__,
                # Try to include session information even on error
                "session_id": None,
                "live_view_url": None,
                "browser_session_id": None,
                "browserbase_session": False
            }))
        
        finally:
            print("[FINISHED] Application shutdown complete")
        
        return
    
    # Case 3: Multiple arguments - treat as simple text task (join arguments)
    if len(sys.argv) > 2:
        task_text = " ".join(sys.argv[1:])
        try:
            print(f"[RUNNING] Executing task: {task_text[:100]}...")
            result = await run_browser_task(task_text, model="gpt-4o-mini")
            print(f"[SUCCESS] Task completed successfully!")
            print(f"Result: {str(result)}")
        except Exception as e:
            print(f"[ERROR] Error executing task: {str(e)}")
        finally:
            print("[FINISHED] Application shutdown complete")
        return


def build_task_context(task_data: dict) -> str:
    """
    Add simple context to the task prompt based on available data
    
    Args:
        task_data (dict): Task data containing context information
        
    Returns:
        str: Additional context string to append to the prompt
    """
    context_parts = []
    
    # Add customer details if available
    customer_details = task_data.get('customer_details', {})
    if customer_details and isinstance(customer_details, dict):
        if customer_details.get('rfc'):
            context_parts.append(f"Customer RFC: {customer_details['rfc']}")
        if customer_details.get('email'):
            context_parts.append(f"Customer Email: {customer_details['email']}")
        if customer_details.get('company_name'):
            context_parts.append(f"Company: {customer_details['company_name']}")
    
    # Add invoice details if available
    invoice_details = task_data.get('invoice_details', {})
    if invoice_details and isinstance(invoice_details, dict):
        if invoice_details.get('total'):
            context_parts.append(f"Total Amount: {invoice_details['total']}")
        if invoice_details.get('folio'):
            context_parts.append(f"Folio: {invoice_details['folio']}")
    
    return "\nContext: " + "; ".join(context_parts) if context_parts else ""


if __name__ == "__main__":
    asyncio.run(main())
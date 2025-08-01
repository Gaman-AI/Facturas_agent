#!/usr/bin/env python3
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

# Import from local browser-use implementation (same as simple.py)
from browser_use import Agent
from browser_use.llm import ChatOpenAI


async def run_browser_task(task_prompt: str, model: str = "gpt-4o-mini", temperature: float = 0.7, max_steps: int = 30):
    """
    Run a browser automation task - simplified version like simple.py
    
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
    
    print(f"Starting browser automation task...")
    print(f"   Model: {model}")
    print(f"   Max Steps: {max_steps}")
    print(f"   Task: {task_prompt[:100]}...")
    
    # Create agent exactly like simple.py
    agent = Agent(
        task=task_prompt,
        llm=ChatOpenAI(model=model, temperature=temperature)
    )
    
    # Run the agent
    result = await agent.run()
    
    print("Task completed successfully!")
    return result


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
                print(f"\nError: {str(e)}")
                print("Please try again.\n")
        
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
            
            # Execute the task
            result = await run_browser_task(complete_prompt, model, temperature, max_steps)
            
            # Output result as JSON (for API integration)
            print(json.dumps({
                "success": True,
                "result": str(result),
                "model_used": model,
                "steps_executed": max_steps,
                "task_prompt": complete_prompt,
                "vendor_url": vendor_url or "none"
            }, indent=2))
            
        except json.JSONDecodeError:
            # Not JSON, treat as simple text task
            try:
                print(f"Executing simple task: {argument[:100]}...")
                result = await run_browser_task(argument)
                print(f"Task completed successfully!")
                print(f"Result: {str(result)}")
            except Exception as e:
                print(f"Error executing task: {str(e)}")
        
        except Exception as e:
            print(json.dumps({
                "success": False,
                "error": f"Execution failed: {str(e)}",
                "error_type": type(e).__name__
            }))
        
        return
    
    # Case 3: Multiple arguments - treat as simple text task (join arguments)
    if len(sys.argv) > 2:
        task_text = " ".join(sys.argv[1:])
        try:
            print(f"Executing task: {task_text[:100]}...")
            result = await run_browser_task(task_text)
            print(f"Task completed successfully!")
            print(f"Result: {str(result)}")
        except Exception as e:
            print(f"Error executing task: {str(e)}")
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
#!/usr/bin/env python3
"""
Browser Agent Service for CFDI Automation

This script provides a bridge between the Node.js backend and the local browser-use implementation.
It executes browser automation tasks for CFDI (invoice) generation across different vendor websites.

@file purpose: Defines the Python execution bridge for browser-use tasks
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

# Import from local browser-use implementation
from browser_use import Agent
from browser_use.llm.openai.chat import ChatOpenAI


class BrowserAgentExecutor:
    """
    Handles the execution of browser automation tasks using the local browser-use implementation.
    """
    
    def __init__(self):
        self.default_model = "gpt-4.1-mini"
        self.default_temperature = 1.0
    
    async def execute_task(self, task_data: dict) -> dict:
        """
        Execute a browser automation task
        
        Args:
            task_data (dict): Task configuration containing:
                - prompt (str): The task description/prompt
                - model (str, optional): LLM model to use
                - temperature (float, optional): LLM temperature
                - max_steps (int, optional): Maximum steps for the agent
                - vendor_url (str, optional): Specific vendor URL (included in prompt)
                - customer_details (dict, optional): Customer information for CFDI
                - invoice_details (dict, optional): Invoice information
        
        Returns:
            dict: Execution result with success status and data/error
        """
        try:
            # Extract task parameters
            prompt = task_data.get('prompt', '')
            model = task_data.get('model', self.default_model)
            temperature = task_data.get('temperature', self.default_temperature)
            max_steps = task_data.get('max_steps', 50)
            
            # Build comprehensive prompt if structured data is provided
            if not prompt and 'vendor_url' in task_data:
                prompt = self._build_cfdi_prompt(task_data)
            
            if not prompt:
                return {
                    "success": False,
                    "error": "No prompt provided and insufficient data to build prompt"
                }
            
            # Initialize the LLM
            llm = ChatOpenAI(
                model=model,
                temperature=temperature
            )
            
            # Create and run the agent
            agent = Agent(task=prompt, llm=llm)
            
            print(f"🚀 Starting browser agent task...")
            print(f"   Model: {model}")
            print(f"   Max Steps: {max_steps}")
            print(f"   Prompt: {prompt[:100]}...")
            
            result = await agent.run(max_steps=max_steps)
            
            print("✅ Task completed successfully!")
            
            return {
                "success": True,
                "result": str(result),
                "model_used": model,
                "steps_taken": max_steps,
                "prompt": prompt
            }
            
        except Exception as e:
            error_msg = str(e)
            print(f"❌ Agent execution error: {error_msg}")
            
            return {
                "success": False,
                "error": error_msg,
                "error_type": type(e).__name__
            }
    
    def _build_cfdi_prompt(self, task_data: dict) -> str:
        """
        Build a comprehensive CFDI automation prompt from structured data
        
        Args:
            task_data (dict): Structured task data
            
        Returns:
            str: Complete prompt for the browser agent
        """
        vendor_url = task_data.get('vendor_url', '')
        customer_details = task_data.get('customer_details', {})
        invoice_details = task_data.get('invoice_details', {})
        
        prompt_parts = [
            f"Go to {vendor_url} and complete the CFDI (electronic invoice) generation process."
        ]
        
        # Add customer details if available
        if customer_details:
            prompt_parts.append("\nCustomer details:")
            if customer_details.get('rfc'):
                prompt_parts.append(f"RFC: {customer_details['rfc']}")
            if customer_details.get('email'):
                prompt_parts.append(f"Email: {customer_details['email']}")
            if customer_details.get('company_name'):
                prompt_parts.append(f"Company Name: {customer_details['company_name']}")
            if customer_details.get('address'):
                address = customer_details['address']
                if address.get('street'):
                    prompt_parts.append(f"Street: {address['street']}")
                if address.get('exterior_number'):
                    prompt_parts.append(f"Exterior Number: {address['exterior_number']}")
                if address.get('interior_number'):
                    prompt_parts.append(f"Interior Number: {address['interior_number']}")
                if address.get('colony'):
                    prompt_parts.append(f"Colony: {address['colony']}")
                if address.get('municipality'):
                    prompt_parts.append(f"Municipality: {address['municipality']}")
                if address.get('zip_code'):
                    prompt_parts.append(f"Zip Code: {address['zip_code']}")
                if address.get('state'):
                    prompt_parts.append(f"State: {address['state']}")
                if address.get('country'):
                    prompt_parts.append(f"Country: {address['country']}")
        
        # Add invoice details if available
        if invoice_details:
            prompt_parts.append("\nInvoice details:")
            if invoice_details.get('ticket_id'):
                prompt_parts.append(f"Ticket ID: {invoice_details['ticket_id']}")
            if invoice_details.get('folio'):
                prompt_parts.append(f"Folio: {invoice_details['folio']}")
            if invoice_details.get('transaction_date'):
                prompt_parts.append(f"Transaction Date: {invoice_details['transaction_date']}")
            if invoice_details.get('total'):
                prompt_parts.append(f"Total: {invoice_details['total']}")
            if invoice_details.get('currency'):
                prompt_parts.append(f"Currency: {invoice_details['currency']}")
            if invoice_details.get('subtotal'):
                prompt_parts.append(f"Subtotal: {invoice_details['subtotal']}")
            if invoice_details.get('iva'):
                prompt_parts.append(f"IVA: {invoice_details['iva']}")
        
        prompt_parts.append("\nInstructions:")
        prompt_parts.append("- Only use the details that are necessary for the CFDI generation")
        prompt_parts.append("- Fill in the required fields step by step")
        prompt_parts.append("- Complete the entire process until the CFDI is generated")
        prompt_parts.append("- If there are any errors, try to resolve them")
        prompt_parts.append("- Return the final status and any generated CFDI information")
        
        return "\n".join(prompt_parts)


async def main():
    """
    Main execution function - handles command line arguments and executes the task
    """
    if len(sys.argv) != 2:
        print(json.dumps({
            "success": False,
            "error": "Usage: python browser_agent.py '<task_json>'"
        }))
        sys.exit(1)
    
    try:
        # Parse task data from command line argument
        task_json = sys.argv[1]
        task_data = json.loads(task_json)
        
        # Execute the task
        executor = BrowserAgentExecutor()
        result = await executor.execute_task(task_data)
        
        # Output result as JSON
        print(json.dumps(result, indent=2))
        
    except json.JSONDecodeError as e:
        print(json.dumps({
            "success": False,
            "error": f"Invalid JSON in task data: {str(e)}"
        }))
        sys.exit(1)
    except Exception as e:
        print(json.dumps({
            "success": False,
            "error": f"Unexpected error: {str(e)}",
            "error_type": type(e).__name__
        }))
        sys.exit(1)


if __name__ == "__main__":
    asyncio.run(main())
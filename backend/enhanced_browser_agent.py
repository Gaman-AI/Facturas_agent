#!/usr/bin/env python3
"""
Enhanced Browser Agent with Real-time Thinking Updates

This enhanced version of the browser agent includes real-time thinking callbacks
that can be captured and transmitted to the frontend for live monitoring.

Features:
- Real-time thinking process monitoring
- Step-by-step execution tracking
- Memory and goal updates
- WebSocket-compatible output format
"""

import asyncio
import sys
import json
import os
from pathlib import Path
from dotenv import load_dotenv
import requests

# Add the local browser-use to the Python path
current_dir = Path(__file__).parent
browser_use_path = current_dir / "browser-use"
sys.path.insert(0, str(browser_use_path))

# Load environment variables
load_dotenv()

# Import from local browser-use implementation
from browser_use import Agent
from browser_use.llm import ChatOpenAI


class RealTimeThinkingMonitor:
    """Monitor agent thinking in real-time and send updates"""
    
    def __init__(self, task_id: str, websocket_url: str = None):
        self.task_id = task_id
        self.websocket_url = websocket_url
        self.step_number = 0
        self.thinking_history = []
        
    async def on_step_start(self, agent):
        """Called when agent step starts"""
        self.step_number += 1
        
        step_data = {
            'type': 'step_start',
            'step_number': self.step_number,
            'timestamp': asyncio.get_event_loop().time()
        }
        
        await self.send_update(step_data)
        print(f"[THINKING] Starting step {self.step_number}")
    
    async def on_step_end(self, agent):
        """Called when agent step ends"""
        # Get the agent's last model output for thinking data
        if hasattr(agent, 'state') and agent.state.last_model_output:
            model_output = agent.state.last_model_output
            
            # Send thinking update
            if hasattr(model_output, 'thinking') and model_output.thinking:
                thinking_data = {
                    'type': 'thinking',
                    'step_number': self.step_number,
                    'content': model_output.thinking,
                    'timestamp': asyncio.get_event_loop().time()
                }
                await self.send_update(thinking_data)
                print(f"[THINKING] {model_output.thinking[:100]}...")
            
            # Send memory update
            if hasattr(model_output, 'memory') and model_output.memory:
                memory_data = {
                    'type': 'memory',
                    'step_number': self.step_number,
                    'content': model_output.memory,
                    'timestamp': asyncio.get_event_loop().time()
                }
                await self.send_update(memory_data)
                print(f"[MEMORY] {model_output.memory}")
            
            # Send goal update
            if hasattr(model_output, 'next_goal') and model_output.next_goal:
                goal_data = {
                    'type': 'goal',
                    'step_number': self.step_number,
                    'content': model_output.next_goal,
                    'metadata': {'goal_status': 'active'},
                    'timestamp': asyncio.get_event_loop().time()
                }
                await self.send_update(goal_data)
                print(f"[GOAL] {model_output.next_goal}")
            
            # Send evaluation update
            if hasattr(model_output, 'evaluation_previous_goal') and model_output.evaluation_previous_goal:
                evaluation_data = {
                    'type': 'evaluation',
                    'step_number': self.step_number,
                    'content': model_output.evaluation_previous_goal,
                    'timestamp': asyncio.get_event_loop().time()
                }
                await self.send_update(evaluation_data)
                print(f"[EVALUATION] {model_output.evaluation_previous_goal}")
            
            # Send action updates
            if hasattr(model_output, 'action') and model_output.action:
                for i, action in enumerate(model_output.action):
                    action_data = {
                        'type': 'action',
                        'step_number': self.step_number,
                        'content': f"Executing action: {action.__class__.__name__}",
                        'metadata': {
                            'action_type': action.__class__.__name__,
                            'action_index': i
                        },
                        'timestamp': asyncio.get_event_loop().time()
                    }
                    await self.send_update(action_data)
                    print(f"[ACTION] {action.__class__.__name__}")
    
    async def send_update(self, data):
        """Send update to WebSocket or store for later retrieval"""
        data['task_id'] = self.task_id
        self.thinking_history.append(data)
        
        # For now, just print to stdout in JSON format for Node.js to capture
        # In a full implementation, this would send to WebSocket server
        update_json = json.dumps({
            'websocket_update': True,
            'data': data
        })
        print(f"WS_UPDATE: {update_json}")
    
    def get_thinking_history(self):
        """Get all thinking updates for this session"""
        return self.thinking_history


async def run_browser_task_with_monitoring(
    task_prompt: str, 
    model: str = "gpt-4o-mini", 
    temperature: float = 0.1, 
    max_steps: int = 30,
    task_id: str = None
):
    """
    Run a browser automation task with real-time thinking monitoring
    
    Args:
        task_prompt (str): The task description/prompt
        model (str): LLM model to use
        temperature (float): LLM temperature
        max_steps (int): Maximum steps for the agent
        task_id (str): Unique task identifier for monitoring
    
    Returns:
        Tuple of (result, thinking_history)
    """
    # Validate environment variables
    if not os.getenv('OPENAI_API_KEY'):
        raise ValueError("OPENAI_API_KEY environment variable is required")
    
    # Generate task ID if not provided
    if not task_id:
        task_id = f"task_{asyncio.get_event_loop().time()}"
    
    print(f"[STARTING] Monitored browser automation task...")
    print(f"   Task ID: {task_id}")
    print(f"   Model: {model}")
    print(f"   Max Steps: {max_steps}")
    print(f"   Task: {task_prompt[:100]}...")
    
    # Create monitoring system
    monitor = RealTimeThinkingMonitor(task_id)
    
    # Create agent with thinking enabled
    agent = Agent(
        task=task_prompt,
        llm=ChatOpenAI(model=model, temperature=temperature),
        use_thinking=True,  # Enable thinking process
        enable_memory=True  # Enable memory system
    )
    
    try:
        # Run the agent with monitoring hooks
        result = await agent.run(
            max_steps=max_steps,
            on_step_start=monitor.on_step_start,
            on_step_end=monitor.on_step_end
        )
        
        print("[SUCCESS] Task completed successfully!")
        
        # Return result and thinking history
        return {
            'success': True,
            'result': str(result),
            'task_id': task_id,
            'thinking_history': monitor.get_thinking_history(),
            'total_steps': monitor.step_number
        }
        
    except Exception as e:
        error_data = {
            'type': 'error',
            'content': str(e),
            'timestamp': asyncio.get_event_loop().time()
        }
        await monitor.send_update(error_data)
        
        print(f"❌ Task execution error: {e}")
        
        return {
            'success': False,
            'error': str(e),
            'task_id': task_id,
            'thinking_history': monitor.get_thinking_history(),
            'total_steps': monitor.step_number
        }


async def main():
    """
    Main execution function with enhanced monitoring support
    """
    
    try:
        if len(sys.argv) < 2:
            print("❌ Usage: python enhanced_browser_agent.py '<task_description>' or '<json_data>'")
            sys.exit(1)
        
        # Join all arguments to handle multi-word tasks
        input_data = ' '.join(sys.argv[1:])
        
        # Try to parse as JSON first (API mode)
        try:
            json_data = json.loads(input_data)
            
            # Extract parameters from JSON
            task_prompt = json_data.get('task', json_data.get('prompt', ''))
            model = json_data.get('model', 'gpt-4o-mini')
            temperature = float(json_data.get('temperature', 0.1))
            max_steps = int(json_data.get('max_steps', 30))
            task_id = json_data.get('task_id')
            
            if not task_prompt:
                raise ValueError("No task description provided in JSON")
            
            print(f"[JSON API Mode] - Task: {task_prompt[:50]}...")
            
        except json.JSONDecodeError:
            # Simple text mode
            task_prompt = input_data
            model = "gpt-4o-mini"
            temperature = 0.1
            max_steps = 30
            task_id = None
            
            print(f"[Text Mode] - Task: {task_prompt[:50]}...")
        
        # Execute the task with monitoring
        result = await run_browser_task_with_monitoring(
            task_prompt=task_prompt,
            model=model,
            temperature=temperature,
            max_steps=max_steps,
            task_id=task_id
        )
        
        # Output result as JSON for Node.js integration
        print("\n" + "="*50)
        print("FINAL_RESULT:")
        print(json.dumps(result, indent=2))
        
    except KeyboardInterrupt:
        print("\n[STOPPED] Task interrupted by user")
        sys.exit(1)
    except Exception as e:
        error_result = {
            'success': False,
            'error': str(e),
            'error_type': type(e).__name__
        }
        print(f"\n[ERROR] Fatal error: {e}")
        print("FINAL_RESULT:")
        print(json.dumps(error_result, indent=2))
        sys.exit(1)


if __name__ == "__main__":
    asyncio.run(main())
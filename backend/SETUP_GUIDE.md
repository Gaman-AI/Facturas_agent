# Browser Agent Setup Guide

## Quick Setup for Browser Visibility

### 1. Environment Variables
Create a `.env` file in the `backend` directory with your API keys:

```env
# Required: OpenAI API Key
OPENAI_API_KEY=your_openai_api_key_here

# Optional: Other LLM providers
ANTHROPIC_API_KEY=your_anthropic_api_key_here
GOOGLE_API_KEY=your_google_api_key_here

# Browser Configuration (already set for visibility)
BROWSER_HEADLESS=False
DEFAULT_LLM_PROVIDER=openai
DEFAULT_LLM_MODEL=gpt-4o-mini
```

### 2. Test Browser Visibility

To verify that the browser window opens correctly:

```bash
# Navigate to backend directory
cd backend

# Activate virtual environment
.\browser_env\Scripts\activate

# Run the visibility test
python test_browser_visibility.py
```

### 3. Test Real-time Endpoint

To test the real-time browser endpoint:

```bash
# Navigate to backend directory
cd backend

# Activate virtual environment
.\browser_env\Scripts\activate

# Run the real-time test
python test_realtime_browser.py
```

### 4. What to Expect

When you run a browser task:

1. **🌐 Separate Browser Window**: A new browser window will open on your screen
2. **⏱️ Slow Motion**: Actions are slowed down (1-2 seconds between actions) for visibility
3. **🤖 Agent Actions**: You'll see the agent clicking, typing, and navigating automatically
4. **📊 Real-time Logs**: Logs will appear in the frontend while the browser runs

### 5. Common Issues

**Browser window doesn't appear:**
- Check that `BROWSER_HEADLESS=False` in your environment
- Ensure you have sufficient permissions to open browser windows
- Check if the browser window is minimized or behind other windows

**API Key errors:**
- Make sure your OpenAI API key is valid and has sufficient credits
- Check that the `.env` file is in the correct location (`backend/.env`)

**Connection errors:**
- Ensure backend is running on port 8000
- Ensure frontend is running on port 3000
- Check that ports are not blocked by firewall

### 6. Browser Configuration

The browser is configured with these settings for optimal visibility:

```python
browser_config = {
    "headless": False,          # Show the browser window
    "use_vision": True,         # Enable AI vision
    "max_failures": 3,          # Allow some retries
    "wait_for_network_idle": 2.0,  # Wait for pages to load
    "slow_mo": 1000,            # Slow down actions (1 second)
    "viewport": {"width": 1920, "height": 1080},  # Large viewport
}
```

### 7. Running the Full Application

1. **Start Backend:**
   ```bash
   cd backend
   .\browser_env\Scripts\activate
   python -m uvicorn main:app --host 0.0.0.0 --port 8000 --reload
   ```

2. **Start Frontend:**
   ```bash
   cd frontend
   npm run dev
   ```

3. **Access the Application:**
   - Open http://localhost:3000 in your browser
   - Navigate to the Browser Agent Realtime page
   - Enter a task and watch the browser window open automatically

### 8. Tips for Best Experience

- **Monitor both screens**: Watch the agent in the browser window and the logs in the frontend
- **Allow time**: Complex tasks may take several minutes to complete
- **Check your task**: Make sure your task description is clear and achievable
- **Be patient**: The agent is designed to be thorough and will retry if needed 
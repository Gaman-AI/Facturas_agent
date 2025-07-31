# Browser Agent - Simplified Prototype

This document describes the simplified browser agent implementation for creating a working prototype of browser automation tasks.

## Overview

The browser agent provides a streamlined way to execute browser automation tasks using the local browser-use implementation. Tasks can be submitted from the frontend and executed in a local browser without complex real-time features.

## Architecture

```
Frontend → Node.js API → browserAgentService → pythonBridge → browser_agent.py → browser-use
```

## Key Features

- **Simple task execution** with automatic prompt generation
- **Local browser automation** using browser-use library
- **OpenAI integration** for intelligent task understanding
- **Flexible task configuration** (model, temperature, max_steps)
- **Context-aware execution** with customer/invoice details
- **Clean JSON communication** between Node.js and Python

## API Endpoints

### Create Browser Task
```
POST /api/v1/tasks/browser-use
```

**Request body:**
```json
{
  "prompt": "Navigate to google.com and search for 'test'",
  "vendor_url": "https://example.com",
  "customer_details": {
    "company_name": "Test Company",
    "rfc": "TEST123456"
  },
  "invoice_details": {
    "total": 1500.00,
    "folio": "ABC123"
  },
  "model": "gpt-4o-mini",
  "temperature": 0.7,
  "max_steps": 30
}
```

### Get Task Status
```
GET /api/v1/tasks/browser-use/:taskId
```

### List Tasks
```
GET /api/v1/tasks/browser-use?limit=10&offset=0
```

### Health Check
```
GET /api/v1/tasks/browser-use/health
```

## Task Configuration

| Parameter | Type | Default | Description |
|-----------|------|---------|-------------|
| `prompt` | string | - | Task description |
| `vendor_url` | string | - | URL to navigate to (auto-prepended to prompt) |
| `model` | string | "gpt-4o-mini" | OpenAI model to use |
| `temperature` | number | 0.7 | LLM temperature (0-1) |
| `max_steps` | number | 30 | Maximum agent steps |
| `customer_details` | object | - | Customer context information |
| `invoice_details` | object | - | Invoice context information |

## Environment Setup

1. **Install dependencies:**
   ```bash
   cd backend
   pip install -r requirements.txt
   npm install
   ```

2. **Set environment variables:**
   ```bash
   cp env.example .env
   # Edit .env and add your OPENAI_API_KEY
   ```

3. **Start the backend:**
   ```bash
   npm start
   ```

## Testing

### Python Direct Testing
```bash
cd backend
python test_browser_agent.py
```

### API Testing
```bash
cd backend
node test_api_browser_agent.js
```

### Manual Testing
```bash
cd backend
python browser_agent.py '{"prompt": "Navigate to google.com and search for test"}'
```

## Example Tasks

### Simple Navigation
```json
{
  "prompt": "Go to google.com and search for 'browser automation'"
}
```

### URL with Task
```json
{
  "vendor_url": "https://example.com",
  "prompt": "find the contact information"
}
```

### URL Only (Auto-prompt)
```json
{
  "vendor_url": "https://httpbin.org/html"
}
```

### With Context
```json
{
  "prompt": "Search for company information",
  "customer_details": {
    "company_name": "Test Company",
    "rfc": "TEST123456"
  }
}
```

## Task Flow

1. **Frontend submits** task via API
2. **browserAgentService** creates task record and executes asynchronously
3. **pythonBridge** spawns browser_agent.py with task JSON
4. **browser_agent.py** initializes browser-use agent with OpenAI LLM
5. **Agent executes** task in local browser
6. **Results returned** through the chain back to frontend

## Error Handling

- **Missing API key**: Clear error message about OPENAI_API_KEY
- **Invalid JSON**: Proper validation and error responses
- **Task failures**: Detailed error information with error types
- **Timeouts**: Configurable timeout handling
- **Browser issues**: Graceful degradation and error reporting

## Limitations (Prototype)

- **No real-time updates**: Tasks run asynchronously without live progress
- **No live browser view**: Results returned after completion
- **Simple context**: Basic customer/invoice detail integration
- **In-memory storage**: Tasks stored in memory (not persistent)
- **Basic retry logic**: Limited error recovery mechanisms

## Next Steps

1. **Test basic functionality** with simple navigation tasks
2. **Validate API integration** with frontend components
3. **Add persistence** using Supabase for task storage
4. **Implement real-time updates** via WebSocket
5. **Add live browser view** integration
6. **Enhanced error recovery** and retry mechanisms

## Troubleshooting

### Common Issues

1. **"OPENAI_API_KEY not found"**
   - Add your OpenAI API key to the .env file

2. **"Task execution timeout"**
   - Reduce max_steps or increase timeout in pythonBridge.js

3. **"Browser failed to start"**
   - Check that Chrome/Chromium is installed
   - Verify browser-use dependencies are installed

4. **"Python script not found"**
   - Ensure browser_agent.py is in the backend directory
   - Check pythonBridge.js script path configuration

### Debug Mode

Enable debug logging by setting:
```bash
export BROWSER_USE_SETUP_LOGGING=true
export DEBUG=browser-agent:*
```

## Contributing

When making changes:
1. Follow the user rules (11 rules outlined)
2. Update dev_documentation.txt with changes
3. Test both Python direct execution and API integration
4. Ensure no linting errors
5. Document any new environment variables or dependencies
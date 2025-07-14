# Database Configuration
DATABASE_URL=sqlite:///./browser_agent.db

# API Configuration
API_V1_STR=/api/v1
PROJECT_NAME=Browser Use Agent

# CORS Settings (comma-separated)
BACKEND_CORS_ORIGINS=http://localhost:3000,http://localhost:5173

# LLM API Keys (optional - for browser-use integration)
OPENAI_API_KEY=your_openai_api_key_here
ANTHROPIC_API_KEY=your_anthropic_api_key_here

# Browser Configuration
HEADLESS_BROWSER=false
BROWSER_TYPE=chromium

# Task Configuration
MAX_CONCURRENT_TASKS=5
TASK_TIMEOUT_SECONDS=3600

# Logging
LOG_LEVEL=INFO
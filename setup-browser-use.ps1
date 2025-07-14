#!/usr/bin/env pwsh

Write-Host "Setting up Browser-Use Integration..." -ForegroundColor Green

# Check if Python is available
if (-not (Get-Command python -ErrorAction SilentlyContinue)) {
    Write-Host "Python not found. Please install Python 3.11+ first." -ForegroundColor Red
    exit 1
}

# Check Python version
$pythonVersion = python --version
Write-Host "Python version: $pythonVersion" -ForegroundColor Blue

# Navigate to backend directory
Set-Location backend

# Activate virtual environment if it exists
if (Test-Path "venv/Scripts/Activate.ps1") {
    Write-Host "Activating virtual environment..." -ForegroundColor Yellow
    & "venv/Scripts/Activate.ps1"
} else {
    Write-Host "Virtual environment not found. Creating one..." -ForegroundColor Yellow
    python -m venv venv
    & "venv/Scripts/Activate.ps1"
}

# Install/update requirements
Write-Host "Installing requirements..." -ForegroundColor Yellow
pip install -r requirements.txt

# Install Playwright browsers
Write-Host "Installing Playwright browsers..." -ForegroundColor Yellow
playwright install chromium --with-deps

# Create .env file if it doesn't exist
if (-not (Test-Path ".env")) {
    Write-Host "Creating .env file..." -ForegroundColor Yellow
    @"
# API Configuration
API_V1_STR=/api/v1
PROJECT_NAME=Browser Use Agent

# Database Configuration
DATABASE_URL=sqlite:///./browser_automation.db

# CORS Settings (comma-separated)
BACKEND_CORS_ORIGINS=http://localhost:3000,http://localhost:5173

# LLM Provider API Keys (Add your keys here)
OPENAI_API_KEY=your_openai_api_key_here
ANTHROPIC_API_KEY=your_anthropic_api_key_here

# Default LLM Settings
DEFAULT_LLM_PROVIDER=openai
DEFAULT_MODEL=gpt-4o
LLM_TEMPERATURE=0.0

# Browser Configuration
HEADLESS_BROWSER=false
BROWSER_TYPE=chromium
BROWSER_WINDOW_WIDTH=1280
BROWSER_WINDOW_HEIGHT=1024
USE_VISION=true
MAX_ACTIONS_PER_STEP=1
MAX_STEPS=25

# Task Configuration
TASK_TIMEOUT=300
MAX_CONCURRENT_TASKS=5

# Logging Configuration
LOG_LEVEL=INFO
"@ | Out-File -FilePath ".env" -Encoding utf8
    
    Write-Host "Created .env file. Please add your API keys!" -ForegroundColor Green
}

# Initialize database
Write-Host "Initializing database..." -ForegroundColor Yellow
python init_db.py

# Go back to root
Set-Location ..

# Frontend setup
Write-Host "Setting up frontend..." -ForegroundColor Yellow
Set-Location frontend

# Install frontend dependencies
if (Test-Path "package.json") {
    npm install
}

# Create frontend .env file if it doesn't exist
if (-not (Test-Path ".env")) {
    Write-Host "Creating frontend .env file..." -ForegroundColor Yellow
    @"
# API Configuration
VITE_API_BASE_URL=http://localhost:8000

# WebSocket Configuration
VITE_WS_BASE_URL=ws://localhost:8000

# Development
VITE_DEV_MODE=true

# Logging
VITE_LOG_LEVEL=info
"@ | Out-File -FilePath ".env" -Encoding utf8
    
    Write-Host "Created frontend .env file." -ForegroundColor Green
}

# Go back to root
Set-Location ..

Write-Host ""
Write-Host "Setup complete! Next steps:" -ForegroundColor Green
Write-Host "1. Add your API keys to backend/.env" -ForegroundColor White
Write-Host "2. Start the backend: .\start-backend.ps1" -ForegroundColor White
Write-Host "3. Start the frontend: cd frontend && npm run dev" -ForegroundColor White
Write-Host ""
Write-Host "Browser-Use Integration is now ready!" -ForegroundColor Green 
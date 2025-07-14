#!/usr/bin/env pwsh

# Browser-Use Setup Script for Windows
# This script sets up the Python 3.11 environment and installs browser-use dependencies

Write-Host "=== Browser-Use Environment Setup ===" -ForegroundColor Green

# Check if Python 3.11 is available
Write-Host "Checking Python 3.11 availability..." -ForegroundColor Yellow
try {
    $pythonVersion = py -3.11 --version 2>$null
    if ($LASTEXITCODE -eq 0) {
        Write-Host "✓ Python 3.11 found: $pythonVersion" -ForegroundColor Green
    } else {
        Write-Host "✗ Python 3.11 not found. Please install Python 3.11 from https://python.org" -ForegroundColor Red
        exit 1
    }
} catch {
    Write-Host "✗ Python 3.11 not found. Please install Python 3.11 from https://python.org" -ForegroundColor Red
    exit 1
}

# Navigate to backend directory
Set-Location $PSScriptRoot

# Create virtual environment
Write-Host "Creating Python 3.11 virtual environment..." -ForegroundColor Yellow
if (Test-Path "venv") {
    Write-Host "Virtual environment already exists. Backing up old one..." -ForegroundColor Yellow
    if (Test-Path "venv_backup") {
        Remove-Item -Recurse -Force "venv_backup" -ErrorAction SilentlyContinue
    }
    Move-Item "venv" "venv_backup" -Force -ErrorAction SilentlyContinue
}

py -3.11 -m venv venv
if ($LASTEXITCODE -ne 0) {
    Write-Host "✗ Failed to create virtual environment" -ForegroundColor Red
    exit 1
}
Write-Host "✓ Virtual environment created" -ForegroundColor Green

# Activate virtual environment
Write-Host "Activating virtual environment..." -ForegroundColor Yellow
& "venv\Scripts\Activate.ps1"
if ($LASTEXITCODE -ne 0) {
    Write-Host "✗ Failed to activate virtual environment" -ForegroundColor Red
    exit 1
}
Write-Host "✓ Virtual environment activated" -ForegroundColor Green

# Upgrade pip
Write-Host "Upgrading pip..." -ForegroundColor Yellow
python -m pip install --upgrade pip
if ($LASTEXITCODE -ne 0) {
    Write-Host "⚠️ Warning: Failed to upgrade pip, continuing..." -ForegroundColor Yellow
}

# Install wheel and setuptools first
Write-Host "Installing build tools..." -ForegroundColor Yellow
python -m pip install wheel setuptools

# Install dependencies from requirements.txt
Write-Host "Installing Python dependencies..." -ForegroundColor Yellow
python -m pip install -r requirements.txt
if ($LASTEXITCODE -ne 0) {
    Write-Host "✗ Failed to install dependencies" -ForegroundColor Red
    exit 1
}
Write-Host "✓ Dependencies installed" -ForegroundColor Green

# Install Playwright browsers
Write-Host "Installing Playwright browsers..." -ForegroundColor Yellow
python -m playwright install chromium
if ($LASTEXITCODE -ne 0) {
    Write-Host "⚠️ Warning: Failed to install Playwright browsers, continuing..." -ForegroundColor Yellow
}
Write-Host "✓ Playwright browsers installed" -ForegroundColor Green

# Create necessary directories
Write-Host "Creating necessary directories..." -ForegroundColor Yellow
New-Item -ItemType Directory -Force -Path "tmp\traces" | Out-Null
New-Item -ItemType Directory -Force -Path "tmp\conversations" | Out-Null
Write-Host "✓ Directories created" -ForegroundColor Green

# Create .env file if it doesn't exist
if (-not (Test-Path ".env")) {
    Write-Host "Creating .env file template..." -ForegroundColor Yellow
    @"
# LLM Provider Configuration
OPENAI_API_KEY=your_openai_api_key_here
ANTHROPIC_API_KEY=your_anthropic_api_key_here
AZURE_OPENAI_ENDPOINT=your_azure_endpoint_here
AZURE_OPENAI_KEY=your_azure_key_here
GOOGLE_API_KEY=your_google_api_key_here
DEEPSEEK_API_KEY=your_deepseek_api_key_here
GROK_API_KEY=your_grok_api_key_here

# Browser-Use Configuration
DEFAULT_LLM_PROVIDER=openai
DEFAULT_LLM_MODEL=gpt-4o
BROWSER_HEADLESS=true
BROWSER_TIMEOUT=30000
USE_VISION=true
MAX_AGENT_FAILURES=5

# Development Settings
DEBUG=false
"@ | Out-File -FilePath ".env" -Encoding UTF8
    Write-Host "✓ .env file template created" -ForegroundColor Green
    Write-Host "📝 Please edit .env file and add your API keys" -ForegroundColor Cyan
}

# Test browser-use installation
Write-Host "Testing browser-use installation..." -ForegroundColor Yellow
python -c "import browser_use; print('browser-use version:', browser_use.__version__)" 2>$null
if ($LASTEXITCODE -eq 0) {
    Write-Host "✓ browser-use installation verified" -ForegroundColor Green
} else {
    Write-Host "⚠️ Warning: Could not verify browser-use installation" -ForegroundColor Yellow
}

# Initialize database
Write-Host "Initializing database..." -ForegroundColor Yellow
python init_db.py
if ($LASTEXITCODE -eq 0) {
    Write-Host "✓ Database initialized" -ForegroundColor Green
} else {
    Write-Host "⚠️ Warning: Database initialization failed" -ForegroundColor Yellow
}

Write-Host "=== Setup Complete ===" -ForegroundColor Green
Write-Host ""
Write-Host "Next steps:" -ForegroundColor Cyan
Write-Host "1. Edit .env file and add your API keys" -ForegroundColor White
Write-Host "2. Run .\start-backend.ps1 to start the server" -ForegroundColor White
Write-Host ""
Write-Host "Dependencies installed:" -ForegroundColor Yellow
python -m pip list | findstr "browser-use\|fastapi\|playwright\|pydantic" 
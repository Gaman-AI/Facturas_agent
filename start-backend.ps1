#!/usr/bin/env pwsh

# Browser Automation Agent Backend Startup Script

Write-Host "Starting Browser Automation Agent Backend..." -ForegroundColor Green

# Navigate to backend directory
Set-Location -Path "backend"

# Check if virtual environment exists
if (-not (Test-Path "venv\Scripts\Activate.ps1")) {
    Write-Host "Virtual environment not found. Please run setup-browser-use.ps1 first." -ForegroundColor Red
    exit 1
}

Write-Host "Activating virtual environment..." -ForegroundColor Yellow
try {
    & "venv\Scripts\Activate.ps1"
    if ($LASTEXITCODE -ne 0) {
        throw "Failed to activate virtual environment"
    }
    Write-Host "Virtual environment activated" -ForegroundColor Green
} catch {
    Write-Host "Failed to activate virtual environment: $_" -ForegroundColor Red
    Write-Host "Please run setup-browser-use.ps1 to create a new environment." -ForegroundColor Yellow
    exit 1
}

# Verify Python version
Write-Host "Verifying Python version..." -ForegroundColor Yellow
try {
    $pythonVersion = python --version 2>&1
    Write-Host "Using Python: $pythonVersion" -ForegroundColor Green
    
    # Check if it's Python 3.11+
    if ($pythonVersion -match "Python 3\.1[1-9]") {
        Write-Host "Python version is compatible with browser-use" -ForegroundColor Green
    } else {
        Write-Host "Warning: Python version may not be compatible with browser-use (requires 3.11+)" -ForegroundColor Yellow
    }
} catch {
    Write-Host "Could not verify Python version" -ForegroundColor Red
}

# Check if .env file exists
if (-not (Test-Path ".env")) {
    Write-Host "Warning: .env file not found. Creating template..." -ForegroundColor Yellow
    
    $envContent = @'
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
'@
    
    $envContent | Out-File -FilePath ".env" -Encoding UTF8
    Write-Host ".env template created. Please add your API keys." -ForegroundColor Cyan
}

# Check for required dependencies
Write-Host "Checking dependencies..." -ForegroundColor Yellow
$missingDeps = @()

$requiredPackages = @("fastapi", "browser-use", "playwright", "pydantic", "uvicorn")
foreach ($package in $requiredPackages) {
    $installed = python -m pip show $package 2>$null
    if ($LASTEXITCODE -ne 0) {
        $missingDeps += $package
    }
}

if ($missingDeps.Count -gt 0) {
    Write-Host "Missing dependencies: $($missingDeps -join ', ')" -ForegroundColor Red
    Write-Host "Please run setup-browser-use.ps1 to install dependencies." -ForegroundColor Yellow
    exit 1
}
Write-Host "All dependencies found" -ForegroundColor Green

# Create necessary directories
Write-Host "Creating necessary directories..." -ForegroundColor Yellow
New-Item -ItemType Directory -Force -Path "tmp\traces" | Out-Null
New-Item -ItemType Directory -Force -Path "tmp\conversations" | Out-Null

# Initialize database
Write-Host "Initializing database..." -ForegroundColor Yellow
try {
    python init_db.py
    if ($LASTEXITCODE -eq 0) {
        Write-Host "Database initialized" -ForegroundColor Green
    } else {
        Write-Host "Warning: Database initialization had issues, continuing..." -ForegroundColor Yellow
    }
} catch {
    Write-Host "Warning: Could not initialize database: $_" -ForegroundColor Yellow
}

# Start the FastAPI server
Write-Host "Starting FastAPI server on http://localhost:8000..." -ForegroundColor Green
Write-Host "Press Ctrl+C to stop the server" -ForegroundColor Yellow
Write-Host "========================================" -ForegroundColor Cyan

try {
    python -m uvicorn main:app --host 0.0.0.0 --port 8000 --reload
} catch {
    Write-Host "Failed to start server: $_" -ForegroundColor Red
    exit 1
} 
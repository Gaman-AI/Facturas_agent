#!/usr/bin/env pwsh
# Setup Backend Environment Script

Write-Host "Setting up Browser Automation Agent Backend..." -ForegroundColor Green

# Navigate to backend directory
Set-Location -Path "backend"

# Check if Python is available
if (Get-Command python -ErrorAction SilentlyContinue) {
    Write-Host "Python found. Creating virtual environment..." -ForegroundColor Blue
    
    # Create virtual environment
    python -m venv venv
    
    # Activate virtual environment
    & "venv\Scripts\Activate.ps1"
    
    # Upgrade pip
    Write-Host "Upgrading pip..." -ForegroundColor Blue
    python -m pip install --upgrade pip
    
    # Install dependencies
    Write-Host "Installing Python dependencies..." -ForegroundColor Blue
    pip install -r requirements.txt
    
    # Initialize database
    Write-Host "Initializing database..." -ForegroundColor Blue
    python init_db.py
    
    Write-Host "Backend setup complete!" -ForegroundColor Green
    Write-Host "You can now run: .\start-backend.ps1" -ForegroundColor Yellow
} else {
    Write-Host "Python not found. Please install Python 3.11+ first." -ForegroundColor Red
}

# Return to root directory
Set-Location -Path ".." 
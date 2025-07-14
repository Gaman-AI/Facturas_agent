#!/usr/bin/env pwsh

Write-Host "Starting Browser Automation Agent Development Environment..." -ForegroundColor Green
Write-Host "============================================================" -ForegroundColor Green

# Function to start backend
function Start-Backend {
    Write-Host "Starting Backend (FastAPI)..." -ForegroundColor Blue
    Start-Process powershell -ArgumentList "-NoExit", "-Command", "cd '$PWD'; .\start-backend.ps1"
}

# Function to start frontend  
function Start-Frontend {
    Write-Host "Starting Frontend (Next.js)..." -ForegroundColor Cyan
    Start-Process powershell -ArgumentList "-NoExit", "-Command", "cd '$PWD'; .\start-frontend.ps1"
}

# Start both services
Start-Backend
Start-Sleep -Seconds 3
Start-Frontend

Write-Host ""
Write-Host "Development servers starting..." -ForegroundColor Green
Write-Host "Backend API: http://localhost:8000" -ForegroundColor Blue
Write-Host "Frontend UI: http://localhost:3000" -ForegroundColor Cyan
Write-Host ""
Write-Host "Press Ctrl+C in each terminal window to stop the servers" -ForegroundColor Yellow 
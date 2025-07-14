#!/usr/bin/env pwsh

Write-Host "Starting Frontend (Next.js)..." -ForegroundColor Green

# Navigate to frontend directory
Set-Location -Path "frontend"

# Check if node_modules exists
if (-not (Test-Path "node_modules")) {
    Write-Host "Installing dependencies..." -ForegroundColor Yellow
    npm install --legacy-peer-deps
}

# Start the Next.js development server
Write-Host "Starting Next.js development server on http://localhost:3000" -ForegroundColor Cyan
npm run dev

# Return to root directory
Set-Location -Path ".." 
#!/usr/bin/env pwsh

# Enhanced Browser Automation Agent Services Startup Script
# This script ensures proper service order and connection verification

param(
    [switch]$SkipTests = $false,
    [switch]$Verbose = $false,
    [int]$BackendWaitTime = 10,
    [int]$FrontendWaitTime = 5
)

Write-Host "🚀 Starting Browser Automation Agent Services..." -ForegroundColor Green
Write-Host "=============================================" -ForegroundColor Green

# Function to check if a port is available
function Test-Port {
    param([int]$Port)
    try {
        $connection = New-Object System.Net.Sockets.TcpClient
        $connection.Connect("localhost", $Port)
        $connection.Close()
        return $true
    } catch {
        return $false
    }
}

# Function to wait for service to be ready
function Wait-ForService {
    param(
        [string]$Name,
        [int]$Port,
        [int]$TimeoutSeconds = 30
    )
    
    Write-Host "⏳ Waiting for $Name to be ready on port $Port..." -ForegroundColor Yellow
    
    $elapsed = 0
    while ($elapsed -lt $TimeoutSeconds) {
        if (Test-Port -Port $Port) {
            Write-Host "✅ $Name is ready!" -ForegroundColor Green
            return $true
        }
        Start-Sleep -Seconds 1
        $elapsed++
        if ($Verbose) {
            Write-Host "." -NoNewline
        }
    }
    
    Write-Host "❌ $Name did not start within $TimeoutSeconds seconds" -ForegroundColor Red
    return $false
}

# Function to test HTTP endpoint
function Test-HttpEndpoint {
    param(
        [string]$Url,
        [int]$TimeoutSeconds = 10
    )
    
    try {
        $response = Invoke-WebRequest -Uri $Url -Method GET -TimeoutSec $TimeoutSeconds -UseBasicParsing
        return $response.StatusCode -eq 200
    } catch {
        if ($Verbose) {
            Write-Host "HTTP test failed for $Url : $($_.Exception.Message)" -ForegroundColor Red
        }
        return $false
    }
}

# Check prerequisites
Write-Host "🔍 Checking prerequisites..." -ForegroundColor Cyan

# Check if backend directory exists
if (-not (Test-Path "backend")) {
    Write-Host "❌ Backend directory not found. Please run from project root." -ForegroundColor Red
    exit 1
}

# Check if frontend directory exists
if (-not (Test-Path "frontend")) {
    Write-Host "❌ Frontend directory not found. Please run from project root." -ForegroundColor Red
    exit 1
}

# Check if backend virtual environment exists
if (-not (Test-Path "backend/venv/Scripts/Activate.ps1")) {
    Write-Host "❌ Backend virtual environment not found. Please run setup-backend.ps1 first." -ForegroundColor Red
    exit 1
}

# Check if frontend node_modules exists
if (-not (Test-Path "frontend/node_modules")) {
    Write-Host "❌ Frontend dependencies not found. Please run 'npm install' in frontend directory." -ForegroundColor Red
    exit 1
}

# Check if ports are available
$backendPort = 8000
$frontendPort = 3000

if (Test-Port -Port $backendPort) {
    Write-Host "⚠️  Port $backendPort is already in use. Backend might already be running or port is blocked." -ForegroundColor Yellow
    $userChoice = Read-Host "Do you want to continue anyway? (y/n)"
    if ($userChoice -ne "y") {
        Write-Host "❌ Startup cancelled by user." -ForegroundColor Red
        exit 1
    }
}

if (Test-Port -Port $frontendPort) {
    Write-Host "⚠️  Port $frontendPort is already in use. Frontend might already be running or port is blocked." -ForegroundColor Yellow
    $userChoice = Read-Host "Do you want to continue anyway? (y/n)"
    if ($userChoice -ne "y") {
        Write-Host "❌ Startup cancelled by user." -ForegroundColor Red
        exit 1
    }
}

Write-Host "✅ Prerequisites check passed!" -ForegroundColor Green

# Start Backend
Write-Host "🐍 Starting Backend (FastAPI)..." -ForegroundColor Blue
$backendProcess = Start-Process powershell -ArgumentList @(
    "-NoExit",
    "-Command",
    "cd '$PWD\backend'; & 'venv\Scripts\Activate.ps1'; python main.py"
) -PassThru

if ($backendProcess) {
    Write-Host "✅ Backend process started (PID: $($backendProcess.Id))" -ForegroundColor Green
    
    # Wait for backend to be ready
    $backendReady = Wait-ForService -Name "Backend" -Port $backendPort -TimeoutSeconds $BackendWaitTime
    
    if ($backendReady) {
        # Test backend API
        Write-Host "🧪 Testing backend API..." -ForegroundColor Cyan
        $apiTest = Test-HttpEndpoint -Url "http://localhost:$backendPort/health" -TimeoutSeconds 5
        
        if ($apiTest) {
            Write-Host "✅ Backend API is responding correctly!" -ForegroundColor Green
        } else {
            Write-Host "⚠️  Backend API test failed, but port is open. Check logs." -ForegroundColor Yellow
        }
    } else {
        Write-Host "❌ Backend failed to start properly. Check the backend terminal for errors." -ForegroundColor Red
        exit 1
    }
} else {
    Write-Host "❌ Failed to start backend process." -ForegroundColor Red
    exit 1
}

# Wait a bit before starting frontend
Start-Sleep -Seconds 2

# Start Frontend
Write-Host "⚛️  Starting Frontend (Next.js)..." -ForegroundColor Cyan
$frontendProcess = Start-Process powershell -ArgumentList @(
    "-NoExit",
    "-Command",
    "cd '$PWD\frontend'; npm run dev"
) -PassThru

if ($frontendProcess) {
    Write-Host "✅ Frontend process started (PID: $($frontendProcess.Id))" -ForegroundColor Green
    
    # Wait for frontend to be ready
    $frontendReady = Wait-ForService -Name "Frontend" -Port $frontendPort -TimeoutSeconds $FrontendWaitTime
    
    if ($frontendReady) {
        # Test frontend
        Write-Host "🧪 Testing frontend..." -ForegroundColor Cyan
        $frontendTest = Test-HttpEndpoint -Url "http://localhost:$frontendPort" -TimeoutSeconds 5
        
        if ($frontendTest) {
            Write-Host "✅ Frontend is responding correctly!" -ForegroundColor Green
        } else {
            Write-Host "⚠️  Frontend test failed, but port is open. Frontend might still be starting." -ForegroundColor Yellow
        }
    } else {
        Write-Host "⚠️  Frontend might still be starting. Check the frontend terminal." -ForegroundColor Yellow
    }
} else {
    Write-Host "❌ Failed to start frontend process." -ForegroundColor Red
    exit 1
}

# Run connection tests if not skipped
if (-not $SkipTests) {
    Write-Host "🧪 Running connection tests..." -ForegroundColor Cyan
    
    # Check if connection test script exists
    if (Test-Path "backend/test_connections.py") {
        try {
            Push-Location "backend"
            & "venv\Scripts\python.exe" "test_connections.py"
            $testResult = $LASTEXITCODE
            Pop-Location
            
            if ($testResult -eq 0) {
                Write-Host "✅ All connection tests passed!" -ForegroundColor Green
            } else {
                Write-Host "⚠️  Some connection tests failed. Check the output above." -ForegroundColor Yellow
            }
        } catch {
            Write-Host "⚠️  Could not run connection tests: $($_.Exception.Message)" -ForegroundColor Yellow
        }
    } else {
        Write-Host "⚠️  Connection test script not found. Skipping tests." -ForegroundColor Yellow
    }
}

# Final status
Write-Host ""
Write-Host "🎉 Services started successfully!" -ForegroundColor Green
Write-Host "===========================================" -ForegroundColor Green
Write-Host "Backend API: http://localhost:$backendPort" -ForegroundColor Blue
Write-Host "Frontend UI: http://localhost:$frontendPort" -ForegroundColor Cyan
Write-Host "API Docs: http://localhost:$backendPort/docs" -ForegroundColor Blue
Write-Host "Browser Agent Viewer: http://localhost:$backendPort/api/v1/browser-agent/viewer" -ForegroundColor Blue
Write-Host ""
Write-Host "To stop the services, close both terminal windows or press Ctrl+C in each." -ForegroundColor Yellow
Write-Host ""
Write-Host "📝 Quick Start:" -ForegroundColor Magenta
Write-Host "1. Open http://localhost:$frontendPort in your browser" -ForegroundColor White
Write-Host "2. Navigate to the Browser Agent Realtime page" -ForegroundColor White
Write-Host "3. Enter a task and click 'Start Browser Agent'" -ForegroundColor White
Write-Host "4. Watch the real-time logs and browser automation!" -ForegroundColor White

# Save process information for cleanup
$processInfo = @{
    backend = $backendProcess.Id
    frontend = $frontendProcess.Id
    timestamp = Get-Date
}

$processInfo | ConvertTo-Json | Out-File "running_services.json" -Encoding UTF8
Write-Host "💾 Process information saved to running_services.json" -ForegroundColor Gray 
#!/usr/bin/env pwsh

# Comprehensive Setup Verification Script
# This script verifies the entire Browser Automation Agent setup

param(
    [switch]$Fix = $false,
    [switch]$Verbose = $false
)

Write-Host "🔍 Browser Automation Agent Setup Verification" -ForegroundColor Cyan
Write-Host "=============================================" -ForegroundColor Cyan

$script:issuesFound = 0
$script:issuesFixed = 0

# Function to log issues and optionally fix them
function Test-Requirement {
    param(
        [string]$Name,
        [scriptblock]$Test,
        [scriptblock]$Fix = $null,
        [string]$FixDescription = "",
        [string]$FailureMessage = ""
    )
    
    $result = & $Test
    
    if ($result) {
        Write-Host "✅ $Name" -ForegroundColor Green
        return $true
    } else {
        Write-Host "❌ $Name" -ForegroundColor Red
        if ($FailureMessage) {
            Write-Host "   $FailureMessage" -ForegroundColor Yellow
        }
        
        $script:issuesFound++
        
        if ($Fix -and $Fix) {
            if ($FixDescription) {
                Write-Host "   🔧 $FixDescription" -ForegroundColor Blue
            }
            
            try {
                & $Fix
                Write-Host "   ✅ Fixed!" -ForegroundColor Green
                $script:issuesFixed++
                return $true
            } catch {
                Write-Host "   ❌ Fix failed: $($_.Exception.Message)" -ForegroundColor Red
                return $false
            }
        }
        
        return $false
    }
}

# Project Structure Tests
Write-Host "`n📁 Project Structure" -ForegroundColor Magenta
Write-Host "===================" -ForegroundColor Magenta

Test-Requirement -Name "Backend directory exists" -Test {
    Test-Path "backend"
} -FailureMessage "Backend directory is missing"

Test-Requirement -Name "Frontend directory exists" -Test {
    Test-Path "frontend"
} -FailureMessage "Frontend directory is missing"

Test-Requirement -Name "Memory bank directory exists" -Test {
    Test-Path "memory-bank"
} -FailureMessage "Memory bank directory is missing"

# Backend Requirements
Write-Host "`n🐍 Backend Requirements" -ForegroundColor Magenta
Write-Host "======================" -ForegroundColor Magenta

Test-Requirement -Name "Python virtual environment exists" -Test {
    Test-Path "backend/venv"
} -Fix {
    if ($Fix) {
        Push-Location "backend"
        python -m venv venv
        Pop-Location
    }
} -FixDescription "Creating Python virtual environment" -FailureMessage "Run: cd backend && python -m venv venv"

Test-Requirement -Name "Python activation script exists" -Test {
    Test-Path "backend/venv/Scripts/Activate.ps1"
} -FailureMessage "Virtual environment activation script not found"

Test-Requirement -Name "Requirements file exists" -Test {
    Test-Path "backend/requirements.txt"
} -FailureMessage "Requirements.txt file is missing"

Test-Requirement -Name "Backend main.py exists" -Test {
    Test-Path "backend/main.py"
} -FailureMessage "Main.py file is missing"

Test-Requirement -Name "Backend src directory structure" -Test {
    (Test-Path "backend/src") -and 
    (Test-Path "backend/src/api") -and 
    (Test-Path "backend/src/core") -and 
    (Test-Path "backend/src/db") -and 
    (Test-Path "backend/src/services")
} -FailureMessage "Backend source directory structure is incomplete"

# Test Python installation
Test-Requirement -Name "Python is installed" -Test {
    try {
        $pythonVersion = python --version 2>&1
        if ($pythonVersion -like "Python 3.*") {
            if ($Verbose) {
                Write-Host "   Version: $pythonVersion" -ForegroundColor Gray
            }
            return $true
        }
        return $false
    } catch {
        return $false
    }
} -FailureMessage "Python 3 is not installed or not in PATH"

# Frontend Requirements
Write-Host "`n⚛️  Frontend Requirements" -ForegroundColor Magenta
Write-Host "========================" -ForegroundColor Magenta

Test-Requirement -Name "Node.js is installed" -Test {
    try {
        $nodeVersion = node --version 2>&1
        if ($nodeVersion -like "v*") {
            if ($Verbose) {
                Write-Host "   Version: $nodeVersion" -ForegroundColor Gray
            }
            return $true
        }
        return $false
    } catch {
        return $false
    }
} -FailureMessage "Node.js is not installed or not in PATH"

Test-Requirement -Name "Package.json exists" -Test {
    Test-Path "frontend/package.json"
} -FailureMessage "Package.json file is missing"

Test-Requirement -Name "Frontend dependencies installed" -Test {
    Test-Path "frontend/node_modules"
} -Fix {
    if ($Fix) {
        Push-Location "frontend"
        npm install
        Pop-Location
    }
} -FixDescription "Installing frontend dependencies" -FailureMessage "Run: cd frontend && npm install"

Test-Requirement -Name "Next.js config exists" -Test {
    Test-Path "frontend/next.config.mjs"
} -FailureMessage "Next.js configuration file is missing"

# Configuration Files
Write-Host "`n⚙️  Configuration Files" -ForegroundColor Magenta
Write-Host "=======================" -ForegroundColor Magenta

Test-Requirement -Name "Backend .env file exists" -Test {
    Test-Path "backend/.env"
} -Fix {
    if ($Fix) {
        @"
# Backend Environment Configuration
DATABASE_URL=sqlite:///./browser_agent.db
API_V1_STR=/api/v1
PROJECT_NAME=Browser Use Agent
HOST=0.0.0.0
PORT=8000
BACKEND_CORS_ORIGINS=["http://localhost:3000", "http://localhost:5173", "http://localhost:8000"]
DEFAULT_LLM_PROVIDER=openai
DEFAULT_LLM_MODEL=gpt-4o
BROWSER_HEADLESS=false
BROWSER_TYPE=chromium
LOG_LEVEL=INFO
SECRET_KEY=your_secret_key_here_change_in_production
"@ | Out-File -FilePath "backend/.env" -Encoding UTF8
    }
} -FixDescription "Creating backend .env file" -FailureMessage "Backend .env file is missing"

Test-Requirement -Name "Frontend .env.local file exists" -Test {
    Test-Path "frontend/.env.local"
} -Fix {
    if ($Fix) {
        @"
# Frontend Environment Configuration
NEXT_PUBLIC_API_BASE_URL=http://localhost:8000
NEXT_PUBLIC_WS_BASE_URL=ws://localhost:8000
NEXT_PUBLIC_API_TIMEOUT=30000
NEXT_PUBLIC_ENVIRONMENT=development
NEXT_PUBLIC_DEBUG=true
"@ | Out-File -FilePath "frontend/.env.local" -Encoding UTF8
    }
} -FixDescription "Creating frontend .env.local file" -FailureMessage "Frontend .env.local file is missing"

# Python Dependencies
Write-Host "`n📦 Python Dependencies" -ForegroundColor Magenta
Write-Host "======================" -ForegroundColor Magenta

Test-Requirement -Name "Python dependencies installed" -Test {
    try {
        Push-Location "backend"
        & "venv/Scripts/python.exe" -c "import fastapi, uvicorn, browser_use" 2>$null
        Pop-Location
        return $LASTEXITCODE -eq 0
    } catch {
        if (Test-Path "backend") { Pop-Location }
        return $false
    }
} -Fix {
    if ($Fix) {
        Push-Location "backend"
        & "venv/Scripts/pip.exe" install -r requirements.txt
        Pop-Location
    }
} -FixDescription "Installing Python dependencies" -FailureMessage "Run: cd backend && venv/Scripts/pip install -r requirements.txt"

# API Key Configuration
Write-Host "`n🔑 API Key Configuration" -ForegroundColor Magenta
Write-Host "========================" -ForegroundColor Magenta

Test-Requirement -Name "OpenAI API key configured" -Test {
    if (Test-Path "backend/.env") {
        $envContent = Get-Content "backend/.env" -Raw
        return $envContent -match "OPENAI_API_KEY=(?!your_openai_api_key_here)"
    }
    return $false
} -FailureMessage "OpenAI API key not configured in backend/.env"

# Port Availability
Write-Host "`n🔌 Port Availability" -ForegroundColor Magenta
Write-Host "===================" -ForegroundColor Magenta

Test-Requirement -Name "Port 8000 available (Backend)" -Test {
    try {
        $connection = New-Object System.Net.Sockets.TcpClient
        $connection.Connect("localhost", 8000)
        $connection.Close()
        return $false  # Port is in use
    } catch {
        return $true   # Port is available
    }
} -FailureMessage "Port 8000 is already in use"

Test-Requirement -Name "Port 3000 available (Frontend)" -Test {
    try {
        $connection = New-Object System.Net.Sockets.TcpClient
        $connection.Connect("localhost", 3000)
        $connection.Close()
        return $false  # Port is in use
    } catch {
        return $true   # Port is available
    }
} -FailureMessage "Port 3000 is already in use"

# Startup Scripts
Write-Host "`n📜 Startup Scripts" -ForegroundColor Magenta
Write-Host "==================" -ForegroundColor Magenta

Test-Requirement -Name "Start services script exists" -Test {
    Test-Path "start-services.ps1"
} -FailureMessage "start-services.ps1 script is missing"

Test-Requirement -Name "Stop services script exists" -Test {
    Test-Path "stop-services.ps1"
} -FailureMessage "stop-services.ps1 script is missing"

Test-Requirement -Name "Connection test script exists" -Test {
    Test-Path "backend/test_connections.py"
} -FailureMessage "Connection test script is missing"

# Memory Bank Documentation
Write-Host "`n📚 Memory Bank Documentation" -ForegroundColor Magenta
Write-Host "============================" -ForegroundColor Magenta

$memoryBankFiles = @(
    "Application Flow Documentation.md",
    "Backend Architecture Document.md",
    "Electronic Billing Agent.md",
    "Frontend Design Guidelines.md",
    "Project Requirement Document.md",
    "Technology Stack.md"
)

foreach ($file in $memoryBankFiles) {
    Test-Requirement -Name "Memory bank: $file" -Test {
        Test-Path "memory-bank/$file"
    } -FailureMessage "Memory bank documentation file is missing"
}

# Summary
Write-Host "`n📊 Verification Summary" -ForegroundColor Cyan
Write-Host "======================" -ForegroundColor Cyan

$totalTests = $script:issuesFound + ($script:issuesFixed * 0) + (100 - $script:issuesFound)  # Rough estimate
$passedTests = $totalTests - $script:issuesFound + $script:issuesFixed

Write-Host "Issues found: $($script:issuesFound)" -ForegroundColor $(if ($script:issuesFound -eq 0) { "Green" } else { "Red" })
Write-Host "Issues fixed: $($script:issuesFixed)" -ForegroundColor $(if ($script:issuesFixed -gt 0) { "Green" } else { "Gray" })
Write-Host "Outstanding issues: $($script:issuesFound - $script:issuesFixed)" -ForegroundColor $(if (($script:issuesFound - $script:issuesFixed) -eq 0) { "Green" } else { "Red" })

if ($script:issuesFound -eq 0) {
    Write-Host "`n🎉 Setup verification completed successfully!" -ForegroundColor Green
    Write-Host "Your Browser Automation Agent is ready to use." -ForegroundColor Green
    Write-Host "`nTo start the services, run:" -ForegroundColor Cyan
    Write-Host "  .\start-services.ps1" -ForegroundColor White
} elseif ($script:issuesFixed -eq $script:issuesFound) {
    Write-Host "`n✅ All issues have been fixed!" -ForegroundColor Green
    Write-Host "Your Browser Automation Agent is now ready to use." -ForegroundColor Green
    Write-Host "`nTo start the services, run:" -ForegroundColor Cyan
    Write-Host "  .\start-services.ps1" -ForegroundColor White
} else {
    Write-Host "`n⚠️  Setup verification found issues that need attention." -ForegroundColor Yellow
    Write-Host "Please resolve the issues marked with ❌ above." -ForegroundColor Yellow
    
    if (-not $Fix) {
        Write-Host "`nTo automatically fix some issues, run:" -ForegroundColor Cyan
        Write-Host "  .\verify-setup.ps1 -Fix" -ForegroundColor White
    }
    
    Write-Host "`nFor manual setup instructions, check:" -ForegroundColor Cyan
    Write-Host "  - README.md" -ForegroundColor White
    Write-Host "  - memory-bank/*.md documentation" -ForegroundColor White
}

# Exit code based on results
if ($script:issuesFound -eq 0 -or $script:issuesFixed -eq $script:issuesFound) {
    exit 0
} else {
    exit 1
} 
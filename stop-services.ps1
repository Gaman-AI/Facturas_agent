#!/usr/bin/env pwsh

# Stop Browser Automation Agent Services Script
# This script cleanly stops all running services

Write-Host "🛑 Stopping Browser Automation Agent Services..." -ForegroundColor Red
Write-Host "=============================================" -ForegroundColor Red

# Function to stop process by PID
function Stop-ProcessById {
    param(
        [int]$ProcessId,
        [string]$Name
    )
    
    try {
        $process = Get-Process -Id $ProcessId -ErrorAction SilentlyContinue
        if ($process) {
            Write-Host "🔄 Stopping $Name (PID: $ProcessId)..." -ForegroundColor Yellow
            Stop-Process -Id $ProcessId -Force
            Write-Host "✅ $Name stopped successfully" -ForegroundColor Green
            return $true
        } else {
            Write-Host "⚠️  $Name process (PID: $ProcessId) not found" -ForegroundColor Yellow
            return $false
        }
    } catch {
        Write-Host "❌ Failed to stop $Name (PID: $ProcessId): $($_.Exception.Message)" -ForegroundColor Red
        return $false
    }
}

# Function to stop processes by name
function Stop-ProcessesByName {
    param(
        [string]$ProcessName,
        [string]$DisplayName
    )
    
    $processes = Get-Process -Name $ProcessName -ErrorAction SilentlyContinue
    if ($processes) {
        Write-Host "🔄 Found $($processes.Count) $DisplayName process(es)..." -ForegroundColor Yellow
        foreach ($process in $processes) {
            try {
                Stop-Process -Id $process.Id -Force
                Write-Host "✅ Stopped $DisplayName (PID: $($process.Id))" -ForegroundColor Green
            } catch {
                Write-Host "❌ Failed to stop $DisplayName (PID: $($process.Id)): $($_.Exception.Message)" -ForegroundColor Red
            }
        }
    } else {
        Write-Host "ℹ️  No $DisplayName processes found" -ForegroundColor Gray
    }
}

# Function to free up ports
function Free-Port {
    param([int]$Port)
    
    try {
        $processes = Get-NetTCPConnection -LocalPort $Port -ErrorAction SilentlyContinue | 
                     Select-Object -ExpandProperty OwningProcess -Unique
        
        if ($processes) {
            Write-Host "🔄 Freeing up port $Port..." -ForegroundColor Yellow
            foreach ($pid in $processes) {
                try {
                    $process = Get-Process -Id $pid -ErrorAction SilentlyContinue
                    if ($process) {
                        Write-Host "  Stopping process: $($process.Name) (PID: $pid)" -ForegroundColor Gray
                        Stop-Process -Id $pid -Force
                    }
                } catch {
                    Write-Host "  Failed to stop process PID $pid" -ForegroundColor Yellow
                }
            }
        }
    } catch {
        Write-Host "⚠️  Could not check port $Port usage" -ForegroundColor Yellow
    }
}

# Try to read saved process information
$processInfoFile = "running_services.json"
if (Test-Path $processInfoFile) {
    try {
        $processInfo = Get-Content $processInfoFile -Raw | ConvertFrom-Json
        Write-Host "📖 Found saved process information" -ForegroundColor Cyan
        
        # Stop processes by saved PID
        if ($processInfo.backend) {
            Stop-ProcessById -ProcessId $processInfo.backend -Name "Backend"
        }
        
        if ($processInfo.frontend) {
            Stop-ProcessById -ProcessId $processInfo.frontend -Name "Frontend"
        }
        
        # Remove the process info file
        Remove-Item $processInfoFile -Force
        Write-Host "🗑️  Removed process information file" -ForegroundColor Gray
        
    } catch {
        Write-Host "⚠️  Could not read process information file: $($_.Exception.Message)" -ForegroundColor Yellow
    }
} else {
    Write-Host "ℹ️  No saved process information found" -ForegroundColor Gray
}

# Stop processes by name as fallback
Write-Host "🔄 Stopping processes by name..." -ForegroundColor Cyan

# Stop Python processes (backend)
Stop-ProcessesByName -ProcessName "python" -DisplayName "Python (Backend)"

# Stop Node.js processes (frontend)
Stop-ProcessesByName -ProcessName "node" -DisplayName "Node.js (Frontend)"

# Stop any remaining PowerShell processes that might be running our scripts
$currentPid = [System.Diagnostics.Process]::GetCurrentProcess().Id
$psProcesses = Get-Process -Name "powershell" -ErrorAction SilentlyContinue | Where-Object { $_.Id -ne $currentPid }

if ($psProcesses) {
    Write-Host "🔄 Found other PowerShell processes..." -ForegroundColor Yellow
    foreach ($process in $psProcesses) {
        # Check if this might be one of our service processes
        $commandLine = (Get-CimInstance Win32_Process -Filter "ProcessId = $($process.Id)" -ErrorAction SilentlyContinue).CommandLine
        if ($commandLine -and ($commandLine -like "*start-backend*" -or $commandLine -like "*start-frontend*" -or $commandLine -like "*main.py*" -or $commandLine -like "*npm run dev*")) {
            Write-Host "  Stopping service PowerShell process (PID: $($process.Id))" -ForegroundColor Gray
            try {
                Stop-Process -Id $process.Id -Force
            } catch {
                Write-Host "  Failed to stop PowerShell process PID $($process.Id)" -ForegroundColor Yellow
            }
        }
    }
}

# Free up ports
Write-Host "🔄 Freeing up ports..." -ForegroundColor Cyan
Free-Port -Port 8000  # Backend
Free-Port -Port 3000  # Frontend

# Clean up temporary files
Write-Host "🧹 Cleaning up temporary files..." -ForegroundColor Cyan

$cleanupPaths = @(
    "backend/browser_agent.db-journal",
    "backend/connection_test_results.json",
    "backend/tmp/traces/*",
    "backend/tmp/conversations/*",
    "backend/__pycache__",
    "backend/src/__pycache__",
    "backend/src/api/__pycache__",
    "backend/src/core/__pycache__",
    "backend/src/db/__pycache__",
    "backend/src/services/__pycache__",
    "backend/src/agent/__pycache__",
    "backend/src/schemas/__pycache__",
    "frontend/.next",
    "frontend/node_modules/.cache"
)

foreach ($path in $cleanupPaths) {
    if (Test-Path $path) {
        try {
            if ((Get-Item $path).PSIsContainer) {
                Remove-Item $path -Recurse -Force -ErrorAction SilentlyContinue
            } else {
                Remove-Item $path -Force -ErrorAction SilentlyContinue
            }
            Write-Host "  Cleaned: $path" -ForegroundColor Gray
        } catch {
            Write-Host "  Could not clean: $path" -ForegroundColor Yellow
        }
    }
}

# Final check
Write-Host "🔍 Final status check..." -ForegroundColor Cyan

# Check if ports are now free
$port8000Free = -not (Test-NetConnection -ComputerName "localhost" -Port 8000 -InformationLevel Quiet -WarningAction SilentlyContinue)
$port3000Free = -not (Test-NetConnection -ComputerName "localhost" -Port 3000 -InformationLevel Quiet -WarningAction SilentlyContinue)

if ($port8000Free) {
    Write-Host "✅ Port 8000 is now free" -ForegroundColor Green
} else {
    Write-Host "⚠️  Port 8000 is still in use" -ForegroundColor Yellow
}

if ($port3000Free) {
    Write-Host "✅ Port 3000 is now free" -ForegroundColor Green
} else {
    Write-Host "⚠️  Port 3000 is still in use" -ForegroundColor Yellow
}

Write-Host ""
Write-Host "🎯 Services stopped successfully!" -ForegroundColor Green
Write-Host "===========================================" -ForegroundColor Green
Write-Host "All Browser Automation Agent services have been stopped." -ForegroundColor White
Write-Host "Ports 8000 and 3000 should now be available for use." -ForegroundColor White
Write-Host ""
Write-Host "To start services again, run:" -ForegroundColor Cyan
Write-Host "  .\start-services.ps1" -ForegroundColor White 
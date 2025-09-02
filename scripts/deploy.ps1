# ===========================================
# CFDI Automation Platform - PowerShell Deployment Script
# Production deployment with comprehensive checks
# ===========================================

param(
    [switch]$CleanVolumes,
    [switch]$Help
)

# Configuration
$ScriptDir = $PSScriptRoot
$ProjectRoot = Split-Path -Parent $ScriptDir
$EnvFile = Join-Path $ProjectRoot "docker.env"
$ComposeFile = Join-Path $ProjectRoot "docker-compose.yml"
$BackupDir = Join-Path $ProjectRoot "backups"

# Functions
function Write-InfoLog {
    param([string]$Message)
    Write-Host "[INFO] $Message" -ForegroundColor Blue
}

function Write-SuccessLog {
    param([string]$Message)
    Write-Host "[SUCCESS] $Message" -ForegroundColor Green
}

function Write-WarningLog {
    param([string]$Message)
    Write-Host "[WARNING] $Message" -ForegroundColor Yellow
}

function Write-ErrorLog {
    param([string]$Message)
    Write-Host "[ERROR] $Message" -ForegroundColor Red
}

# Print usage
function Show-Usage {
    Write-Host ""
    Write-Host "Usage: .\scripts\deploy.ps1 [OPTIONS]"
    Write-Host ""
    Write-Host "Options:"
    Write-Host "  -CleanVolumes  Remove unused Docker volumes (WARNING: may remove data)"
    Write-Host "  -Help          Show this help message"
    Write-Host ""
    Write-Host "Examples:"
    Write-Host "  .\scripts\deploy.ps1                Deploy the application"
    Write-Host "  .\scripts\deploy.ps1 -CleanVolumes  Deploy and clean unused volumes"
}

# Check prerequisites
function Test-Prerequisites {
    Write-InfoLog "🔍 Checking prerequisites..."
    
    # Check Docker
    try {
        $dockerVersion = docker --version 2>$null
        if (-not $dockerVersion) {
            Write-ErrorLog "Docker is not installed or not in PATH"
            exit 1
        }
        Write-InfoLog "✓ Docker found: $dockerVersion"
    }
    catch {
        Write-ErrorLog "Docker is not installed or not in PATH"
        exit 1
    }
    
    # Check Docker Compose
    try {
        $composeVersion = docker compose version 2>$null
        if (-not $composeVersion) {
            Write-ErrorLog "Docker Compose is not installed or not in PATH"
            exit 1
        }
        Write-InfoLog "✓ Docker Compose found: $composeVersion"
    }
    catch {
        Write-ErrorLog "Docker Compose is not installed or not in PATH"
        exit 1
    }
    
    # Check if running as Administrator (optional warning)
    $currentPrincipal = New-Object Security.Principal.WindowsPrincipal([Security.Principal.WindowsIdentity]::GetCurrent())
    if ($currentPrincipal.IsInRole([Security.Principal.WindowsBuiltInRole]::Administrator)) {
        Write-WarningLog "Running as Administrator is not always necessary"
    }
    
    # Check Docker daemon
    try {
        docker info 2>$null | Out-Null
        if ($LASTEXITCODE -ne 0) {
            Write-ErrorLog "Docker daemon is not running"
            exit 1
        }
        Write-InfoLog "✓ Docker daemon is running"
    }
    catch {
        Write-ErrorLog "Docker daemon is not running"
        exit 1
    }
    
    Write-SuccessLog "All prerequisites met"
}

# Validate environment file
function Test-Environment {
    Write-InfoLog "🔧 Validating environment configuration..."
    
    if (-not (Test-Path $EnvFile)) {
        Write-WarningLog "Environment file not found at $EnvFile"
        Write-InfoLog "Creating from template..."
        
        $templateFile = Join-Path $ProjectRoot "docker.env.template"
        if (Test-Path $templateFile) {
            Copy-Item $templateFile $EnvFile
            Write-ErrorLog "Please configure your environment variables in $EnvFile and run again"
            exit 1
        }
        else {
            Write-ErrorLog "No environment template found"
            exit 1
        }
    }
    
    # Check for required variables
    $requiredVars = @(
        "SUPABASE_URL",
        "SUPABASE_ANON_KEY", 
        "JWT_SECRET",
        "OPENAI_API_KEY",
        "BROWSERBASE_API_KEY"
    )
    
    $missingVars = @()
    $envContent = Get-Content $EnvFile
    
    foreach ($var in $requiredVars) {
        $found = $envContent | Where-Object { $_ -match "^$var=" -and $_ -notmatch "^$var=your_" }
        if (-not $found) {
            $missingVars += $var
        }
    }
    
    if ($missingVars.Count -gt 0) {
        Write-ErrorLog "Missing or unconfigured required environment variables:"
        foreach ($var in $missingVars) {
            Write-Host "  - $var" -ForegroundColor Red
        }
        Write-ErrorLog "Please configure these variables in $EnvFile"
        exit 1
    }
    
    Write-SuccessLog "Environment configuration validated"
}

# Create backup directory
function Initialize-Backup {
    Write-InfoLog "📁 Setting up backup directory..."
    if (-not (Test-Path $BackupDir)) {
        New-Item -ItemType Directory -Path $BackupDir -Force | Out-Null
    }
    Write-SuccessLog "Backup directory ready at $BackupDir"
}

# Build and deploy
function Start-Deployment {
    Write-InfoLog "🚀 Building and deploying services..."
    
    Set-Location $ProjectRoot
    
    # Build images
    Write-InfoLog "Building Docker images..."
    docker compose build --no-cache
    if ($LASTEXITCODE -ne 0) {
        Write-ErrorLog "Failed to build Docker images"
        exit 1
    }
    
    # Start services
    Write-InfoLog "Starting services..."
    docker compose up -d
    if ($LASTEXITCODE -ne 0) {
        Write-ErrorLog "Failed to start services"
        exit 1
    }
    
    # Wait for services to be healthy
    Write-InfoLog "Waiting for services to be healthy..."
    $maxWait = 300  # 5 minutes
    $waitTime = 0
    
    while ($waitTime -lt $maxWait) {
        $services = docker compose ps --services
        $healthyCount = 0
        $totalServices = $services.Count
        
        foreach ($service in $services) {
            $status = docker compose ps --status=running $service 2>$null
            if ($status -match "healthy") {
                $healthyCount++
            }
        }
        
        if ($healthyCount -eq $totalServices) {
            Write-SuccessLog "All services are healthy"
            break
        }
        
        Write-InfoLog "Services starting... ($healthyCount/$totalServices healthy)"
        Start-Sleep 10
        $waitTime += 10
    }
    
    if ($waitTime -ge $maxWait) {
        Write-WarningLog "Services did not become healthy within expected time"
        Write-InfoLog "You can check service status with: docker compose ps"
    }
}

# Verify deployment
function Test-Deployment {
    Write-InfoLog "🔍 Verifying deployment..."
    
    # Check service status
    Write-InfoLog "Service status:"
    docker compose ps
    
    # Check health endpoints
    $endpoints = @(
        "http://localhost:80/health",
        "http://localhost:8000/health", 
        "http://localhost:9000/health"
    )
    
    foreach ($endpoint in $endpoints) {
        Write-InfoLog "Checking $endpoint..."
        try {
            $response = Invoke-WebRequest -Uri $endpoint -UseBasicParsing -TimeoutSec 10
            if ($response.StatusCode -eq 200) {
                Write-SuccessLog "✓ $endpoint is responding"
            }
            else {
                Write-WarningLog "✗ $endpoint returned status code $($response.StatusCode)"
            }
        }
        catch {
            Write-WarningLog "✗ $endpoint is not responding"
        }
    }
    
    # Show access URLs
    Write-SuccessLog "🌐 Deployment complete!"
    Write-Host ""
    Write-Host "Access URLs:" -ForegroundColor Cyan
    Write-Host "  • Frontend:    http://localhost" -ForegroundColor White
    Write-Host "  • Backend API: http://localhost/api" -ForegroundColor White
    Write-Host "  • API Docs:    http://localhost:8000/docs" -ForegroundColor White
    Write-Host "  • Python API:  http://localhost:9000/docs" -ForegroundColor White
    Write-Host ""
    Write-Host "Management commands:" -ForegroundColor Cyan
    Write-Host "  • View logs:   docker compose logs -f" -ForegroundColor White
    Write-Host "  • Stop:        docker compose down" -ForegroundColor White
    Write-Host "  • Restart:     docker compose restart" -ForegroundColor White
    Write-Host "  • Status:      docker compose ps" -ForegroundColor White
}

# Cleanup function
function Invoke-Cleanup {
    Write-InfoLog "🧹 Cleaning up..."
    Set-Location $ProjectRoot
    
    # Remove unused images
    docker image prune -f
    
    # Remove unused volumes (careful with this in production)
    if ($CleanVolumes) {
        Write-WarningLog "Removing unused volumes..."
        docker volume prune -f
    }
}

# Main execution
function Main {
    Write-Host ""
    Write-Host "🚀 CFDI Automation Platform Deployment" -ForegroundColor Cyan
    Write-Host "=======================================" -ForegroundColor Cyan
    Write-Host ""
    
    # Show help if requested
    if ($Help) {
        Show-Usage
        return
    }
    
    try {
        # Run deployment steps
        Test-Prerequisites
        Test-Environment
        Initialize-Backup
        Start-Deployment
        Test-Deployment
        
        # Cleanup if requested
        if ($CleanVolumes) {
            Invoke-Cleanup
        }
        
        Write-SuccessLog "🎉 Deployment completed successfully!"
        Write-Host ""
    }
    catch {
        Write-ErrorLog "Deployment failed: $($_.Exception.Message)"
        Write-ErrorLog "Stack trace: $($_.ScriptStackTrace)"
        exit 1
    }
}

# Handle script interruption
trap {
    Write-ErrorLog "Deployment interrupted"
    exit 1
}

# Run main function
Main

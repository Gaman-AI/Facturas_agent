# Docker Deployment Script for CFDI Automation Platform
# PowerShell script for Windows deployment

param(
    [Parameter(Mandatory=$false)]
    [ValidateSet("dev", "production", "backend-only")]
    [string]$Environment = "production",
    
    [Parameter(Mandatory=$false)]
    [switch]$Build,
    
    [Parameter(Mandatory=$false)]
    [switch]$Clean,
    
    [Parameter(Mandatory=$false)]
    [switch]$Logs
)

# Set error action preference
$ErrorActionPreference = "Stop"

# Colors for output
$Colors = @{
    Info = "Cyan"
    Success = "Green"
    Warning = "Yellow"
    Error = "Red"
}

# Function to write colored output
function Write-ColorOutput {
    param(
        [string]$Message,
        [string]$Color = "White"
    )
    Write-Host $Message -ForegroundColor $Colors[$Color]
}

# Function to check Docker status
function Test-DockerStatus {
    try {
        $null = docker version
        Write-ColorOutput "✅ Docker is running" "Success"
        return $true
    }
    catch {
        Write-ColorOutput "❌ Docker is not running or not accessible" "Error"
        Write-ColorOutput "Please start Docker Desktop and try again" "Warning"
        return $false
    }
}

# Function to check Docker Compose
function Test-DockerCompose {
    try {
        $null = docker-compose version
        Write-ColorOutput "✅ Docker Compose is available" "Success"
        return $true
    }
    catch {
        Write-ColorOutput "❌ Docker Compose is not available" "Error"
        Write-ColorOutput "Please install Docker Compose and try again" "Warning"
        return $false
    }
}

# Function to clean up containers and volumes
function Remove-DockerResources {
    Write-ColorOutput "🧹 Cleaning up Docker resources..." "Info"
    
    try {
        # Stop and remove containers
        docker-compose -f docker-compose.$Environment.yml down --remove-orphans -v
        Write-ColorOutput "✅ Containers and volumes cleaned up" "Success"
    }
    catch {
        Write-ColorOutput "⚠️  Some resources may not have been cleaned up" "Warning"
    }
}

# Function to build images
function Build-DockerImages {
    Write-ColorOutput "🔨 Building Docker images..." "Info"
    
    try {
        $composeFile = "docker-compose.$Environment.yml"
        docker-compose -f $composeFile build --no-cache
        Write-ColorOutput "✅ Docker images built successfully" "Success"
    }
    catch {
        Write-ColorOutput "❌ Failed to build Docker images" "Error"
        throw
    }
}

# Function to start services
function Start-DockerServices {
    Write-ColorOutput "🚀 Starting Docker services..." "Info"
    
    try {
        $composeFile = "docker-compose.$Environment.yml"
        docker-compose -f $composeFile up -d
        
        Write-ColorOutput "✅ Docker services started successfully" "Success"
        Write-ColorOutput "⏳ Waiting for services to be healthy..." "Info"
        
        # Wait for services to be healthy
        Start-Sleep -Seconds 30
        
        # Check service status
        docker-compose -f $composeFile ps
    }
    catch {
        Write-ColorOutput "❌ Failed to start Docker services" "Error"
        throw
    }
}

# Function to show logs
function Show-DockerLogs {
    Write-ColorOutput "📋 Showing Docker logs..." "Info"
    
    try {
        $composeFile = "docker-compose.$Environment.yml"
        docker-compose -f $composeFile logs -f --tail=100
    }
    catch {
        Write-ColorOutput "❌ Failed to show Docker logs" "Error"
    }
}

# Function to check service health
function Test-ServiceHealth {
    Write-ColorOutput "🏥 Checking service health..." "Info"
    
    $services = @(
        @{Name="Frontend"; URL="http://localhost:3000/api/health"},
        @{Name="Backend API"; URL="http://localhost:8000/health"},
        @{Name="Browser Automation"; URL="http://localhost:9000/health"}
    )
    
    foreach ($service in $services) {
        try {
            $response = Invoke-WebRequest -Uri $service.URL -TimeoutSec 10 -ErrorAction Stop
            if ($response.StatusCode -eq 200) {
                Write-ColorOutput "✅ $($service.Name) is healthy" "Success"
            } else {
                Write-ColorOutput "⚠️  $($service.Name) returned status $($response.StatusCode)" "Warning"
            }
        }
        catch {
            Write-ColorOutput "❌ $($service.Name) is not responding" "Error"
        }
    }
}

# Main execution
try {
    Write-ColorOutput "🚀 CFDI Automation Platform Docker Deployment" "Info"
    Write-ColorOutput "Environment: $Environment" "Info"
    Write-ColorOutput "Build: $Build" "Info"
    Write-ColorOutput "Clean: $Clean" "Info"
    Write-ColorOutput "Logs: $Logs" "Info"
    Write-Host ""
    
    # Check prerequisites
    if (-not (Test-DockerStatus)) { exit 1 }
    if (-not (Test-DockerCompose)) { exit 1 }
    
    # Change to project directory
    $projectDir = Split-Path -Parent $PSScriptRoot
    Set-Location $projectDir
    Write-ColorOutput "📁 Working directory: $(Get-Location)" "Info"
    
    # Clean up if requested
    if ($Clean) {
        Remove-DockerResources
    }
    
    # Build images if requested
    if ($Build) {
        Build-DockerImages
    }
    
    # Start services
    Start-DockerServices
    
    # Wait a bit more for services to stabilize
    Write-ColorOutput "⏳ Waiting for services to stabilize..." "Info"
    Start-Sleep -Seconds 60
    
    # Check service health
    Test-ServiceHealth
    
    # Show logs if requested
    if ($Logs) {
        Show-DockerLogs
    }
    
    Write-ColorOutput "🎉 Deployment completed successfully!" "Success"
    Write-ColorOutput "Frontend: http://localhost:3000" "Info"
    Write-ColorOutput "Backend API: http://localhost:8000" "Info"
    Write-ColorOutput "Browser Automation: http://localhost:9000" "Info"
    
    if ($Environment -eq "dev") {
        Write-ColorOutput "Development Nginx: http://localhost:8080" "Info"
    } else {
        Write-ColorOutput "Production Nginx: http://localhost:80" "Info"
    }
}
catch {
    Write-ColorOutput "💥 Deployment failed: $($_.Exception.Message)" "Error"
    Write-ColorOutput "Stack trace: $($_.ScriptStackTrace)" "Error"
    exit 1
}
finally {
    Write-ColorOutput "🏁 Deployment script completed" "Info"
}

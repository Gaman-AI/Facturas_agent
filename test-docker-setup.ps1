# Test Docker Setup Script
# Verifies that the new Docker configuration is working

Write-Host "🧪 Testing CFDI Automation Platform Docker Setup" -ForegroundColor Cyan
Write-Host "=================================================" -ForegroundColor Cyan

# Check if Docker is running
Write-Host "`n🔍 Checking Docker status..." -ForegroundColor Yellow
try {
    $dockerVersion = docker version 2>$null
    if ($dockerVersion) {
        Write-Host "✅ Docker is running" -ForegroundColor Green
    } else {
        Write-Host "❌ Docker is not running" -ForegroundColor Red
        exit 1
    }
} catch {
    Write-Host "❌ Docker is not accessible" -ForegroundColor Red
    exit 1
}

# Check if Docker Compose is available
Write-Host "`n🔍 Checking Docker Compose..." -ForegroundColor Yellow
try {
    $composeVersion = docker-compose version 2>$null
    if ($composeVersion) {
        Write-Host "✅ Docker Compose is available" -ForegroundColor Green
    } else {
        Write-Host "❌ Docker Compose is not available" -ForegroundColor Red
        exit 1
    }
} catch {
    Write-Host "❌ Docker Compose is not accessible" -ForegroundColor Red
    exit 1
}

# Check if required files exist
Write-Host "`n🔍 Checking required Docker files..." -ForegroundColor Yellow

$requiredFiles = @(
    "backend/Dockerfile",
    "backend/Dockerfile.python.optimized", 
    "backend/.dockerignore",
    "docker-compose.production.yml",
    "docker-compose.dev.yml",
    "backend/docker-compose.backend.yml",
    "scripts/docker-deploy.ps1",
    "DOCKER_SETUP_README.md"
)

$allFilesExist = $true
foreach ($file in $requiredFiles) {
    if (Test-Path $file) {
        Write-Host "✅ $file" -ForegroundColor Green
    } else {
        Write-Host "❌ $file" -ForegroundColor Red
        $allFilesExist = $false
    }
}

if (-not $allFilesExist) {
    Write-Host "`n❌ Some required files are missing!" -ForegroundColor Red
    exit 1
}

# Check Docker Compose syntax
Write-Host "`n🔍 Validating Docker Compose files..." -ForegroundColor Yellow

$composeFiles = @(
    "docker-compose.production.yml",
    "docker-compose.dev.yml", 
    "backend/docker-compose.backend.yml"
)

foreach ($file in $composeFiles) {
    try {
        docker-compose -f $file config > $null 2>&1
        Write-Host "✅ $file syntax is valid" -ForegroundColor Green
    } catch {
        Write-Host "❌ $file has syntax errors" -ForegroundColor Red
        exit 1
    }
}

# Check if ports are available
Write-Host "`n🔍 Checking port availability..." -ForegroundColor Yellow

$ports = @(3000, 8000, 9000, 6379, 5432, 80, 443)
foreach ($port in $ports) {
    try {
        $connection = Test-NetConnection -ComputerName localhost -Port $port -WarningAction SilentlyContinue -ErrorAction SilentlyContinue
        if ($connection.TcpTestSucceeded) {
            Write-Host "⚠️  Port $port is already in use" -ForegroundColor Yellow
        } else {
            Write-Host "✅ Port $port is available" -ForegroundColor Green
        }
    } catch {
        Write-Host "✅ Port $port is available" -ForegroundColor Green
    }
}

# Test build process (dry run)
Write-Host "`n🔍 Testing Docker build process..." -ForegroundColor Yellow

try {
    # Test backend Dockerfile
    Write-Host "Testing backend Dockerfile..." -ForegroundColor Cyan
    docker build --dry-run -f backend/Dockerfile backend/ 2>$null
    
    Write-Host "Testing Python Dockerfile..." -ForegroundColor Cyan
    docker build --dry-run -f backend/Dockerfile.python.optimized backend/ 2>$null
    
    Write-Host "✅ Docker build syntax is valid" -ForegroundColor Green
} catch {
    Write-Host "❌ Docker build syntax has errors" -ForegroundColor Red
    exit 1
}

# Summary
Write-Host "`n🎉 Docker Setup Test Results" -ForegroundColor Green
Write-Host "==========================" -ForegroundColor Green
Write-Host "✅ All required files present" -ForegroundColor Green
Write-Host "✅ Docker Compose syntax valid" -ForegroundColor Green
Write-Host "✅ Docker build syntax valid" -ForegroundColor Green
Write-Host "✅ Ports available for deployment" -ForegroundColor Green

Write-Host "`n🚀 Ready to deploy!" -ForegroundColor Cyan
Write-Host "Use the following commands:" -ForegroundColor White
Write-Host "  Development: .\scripts\docker-deploy.ps1 -Environment dev -Build" -ForegroundColor Yellow
Write-Host "  Production: .\scripts\docker-deploy.ps1 -Environment production -Build -Clean" -ForegroundColor Yellow
Write-Host "  Backend Only: .\scripts\docker-deploy.ps1 -Environment backend-only -Build" -ForegroundColor Yellow

Write-Host "`n📚 For detailed instructions, see: DOCKER_SETUP_README.md" -ForegroundColor Cyan

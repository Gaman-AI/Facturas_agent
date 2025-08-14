# PowerShell Script for Setting Up Virtual Environment on Windows
# Run this script from the backend directory

Write-Host "🚀 Setting up Virtual Environment for Hybrid Backend..." -ForegroundColor Green

# Check if Python is installed
Write-Host "Checking Python installation..." -ForegroundColor Yellow
try {
    $pythonVersion = python --version 2>&1
    Write-Host "✅ Python found: $pythonVersion" -ForegroundColor Green
} catch {
    Write-Host "❌ Python not found. Please install Python 3.11+ first." -ForegroundColor Red
    exit 1
}

# Check if Node.js is installed
Write-Host "Checking Node.js installation..." -ForegroundColor Yellow
try {
    $nodeVersion = node --version 2>&1
    Write-Host "✅ Node.js found: $nodeVersion" -ForegroundColor Green
} catch {
    Write-Host "❌ Node.js not found. Please install Node.js 18+ first." -ForegroundColor Red
    exit 1
}

# Check if npm is installed
Write-Host "Checking npm installation..." -ForegroundColor Yellow
try {
    $npmVersion = npm --version 2>&1
    Write-Host "✅ npm found: $npmVersion" -ForegroundColor Green
} catch {
    Write-Host "❌ npm not found. Please install npm first." -ForegroundColor Red
    exit 1
}

# Create Python virtual environment
Write-Host "Creating Python virtual environment..." -ForegroundColor Yellow
if (Test-Path ".venv") {
    Write-Host "⚠️  Virtual environment already exists. Removing..." -ForegroundColor Yellow
    Remove-Item -Recurse -Force ".venv"
}

python -m venv .venv
if ($LASTEXITCODE -ne 0) {
    Write-Host "❌ Failed to create virtual environment" -ForegroundColor Red
    exit 1
}
Write-Host "✅ Virtual environment created successfully" -ForegroundColor Green

# Activate virtual environment
Write-Host "Activating virtual environment..." -ForegroundColor Yellow
& ".venv\Scripts\Activate.ps1"
if ($LASTEXITCODE -ne 0) {
    Write-Host "❌ Failed to activate virtual environment" -ForegroundColor Red
    exit 1
}
Write-Host "✅ Virtual environment activated" -ForegroundColor Green

# Upgrade pip
Write-Host "Upgrading pip..." -ForegroundColor Yellow
python -m pip install --upgrade pip
if ($LASTEXITCODE -ne 0) {
    Write-Host "❌ Failed to upgrade pip" -ForegroundColor Red
    exit 1
}
Write-Host "✅ pip upgraded successfully" -ForegroundColor Green

# Install Python dependencies
Write-Host "Installing Python dependencies..." -ForegroundColor Yellow
pip install -r requirements.txt
if ($LASTEXITCODE -ne 0) {
    Write-Host "❌ Failed to install Python dependencies" -ForegroundColor Red
    exit 1
}
Write-Host "✅ Python dependencies installed successfully" -ForegroundColor Green

# Install browser-use in development mode
Write-Host "Installing browser-use in development mode..." -ForegroundColor Yellow
cd browser-use
pip install -e .
if ($LASTEXITCODE -ne 0) {
    Write-Host "❌ Failed to install browser-use" -ForegroundColor Red
    exit 1
}
cd ..
Write-Host "✅ browser-use installed successfully" -ForegroundColor Green

# Install Node.js dependencies
Write-Host "Installing Node.js dependencies..." -ForegroundColor Yellow
npm install
if ($LASTEXITCODE -ne 0) {
    Write-Host "❌ Failed to install Node.js dependencies" -ForegroundColor Red
    exit 1
}
Write-Host "✅ Node.js dependencies installed successfully" -ForegroundColor Green

# Test installations
Write-Host "Testing installations..." -ForegroundColor Yellow

# Test Python Azure SDK
Write-Host "Testing Azure SDK..." -ForegroundColor Cyan
python -c "import azure.ai.documentintelligence; print('✅ Azure SDK working')" 2>$null
if ($LASTEXITCODE -eq 0) {
    Write-Host "✅ Azure SDK test passed" -ForegroundColor Green
} else {
    Write-Host "❌ Azure SDK test failed" -ForegroundColor Red
}

# Test browser-use
Write-Host "Testing browser-use..." -ForegroundColor Cyan
python -c "import browser_use; print('✅ browser-use working')" 2>$null
if ($LASTEXITCODE -eq 0) {
    Write-Host "✅ browser-use test passed" -ForegroundColor Green
} else {
    Write-Host "❌ browser-use test failed" -ForegroundColor Red
}

# Test Node.js
Write-Host "Testing Node.js..." -ForegroundColor Cyan
node -e "console.log('✅ Node.js working')" 2>$null
if ($LASTEXITCODE -eq 0) {
    Write-Host "✅ Node.js test passed" -ForegroundColor Green
} else {
    Write-Host "❌ Node.js test failed" -ForegroundColor Red
}

Write-Host "`n🎉 Setup completed successfully!" -ForegroundColor Green
Write-Host "`n📋 Next steps:" -ForegroundColor Cyan
Write-Host "1. Copy .env.example to .env and configure your Azure credentials" -ForegroundColor White
Write-Host "2. Activate virtual environment: .venv\Scripts\Activate.ps1" -ForegroundColor White
Write-Host "3. Run Node.js server: npm run dev" -ForegroundColor White
Write-Host "4. Run Python services in another terminal (with activated virtual environment)" -ForegroundColor White

Write-Host "`n💡 Remember to always activate the virtual environment before running Python code!" -ForegroundColor Yellow

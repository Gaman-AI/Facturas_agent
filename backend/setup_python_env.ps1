# PowerShell script to set up Python environment for OCR functionality
# Run this script from the backend directory

Write-Host "Setting up Python environment for OCR functionality..." -ForegroundColor Green

# Check if Python is installed
try {
    $pythonVersion = python --version 2>&1
    Write-Host "Python found: $pythonVersion" -ForegroundColor Green
} catch {
    Write-Host "Python not found. Please install Python 3.8+ and try again." -ForegroundColor Red
    exit 1
}

# Check if pip is available
try {
    $pipVersion = pip --version 2>&1
    Write-Host "Pip found: $pipVersion" -ForegroundColor Green
} catch {
    Write-Host "Pip not found. Please install pip and try again." -ForegroundColor Red
    exit 1
}

# Install required packages
Write-Host "Installing required Python packages..." -ForegroundColor Yellow

$packages = @(
    "azure-ai-documentintelligence",
    "azure-core", 
    "openai",
    "python-dotenv",
    "Pillow",
    "requests"
)

foreach ($package in $packages) {
    Write-Host "Installing $package..." -ForegroundColor Cyan
    try {
        pip install $package
        Write-Host "$package installed successfully" -ForegroundColor Green
    } catch {
        Write-Host "Failed to install $package" -ForegroundColor Red
        Write-Host "Error: $($_.Exception.Message)" -ForegroundColor Red
    }
}

# Check if .env file exists
$envFile = Join-Path (Get-Location) ".env"
if (Test-Path $envFile) {
    Write-Host ".env file found" -ForegroundColor Green
} else {
    Write-Host ".env file not found. Please create one with required environment variables:" -ForegroundColor Yellow
    Write-Host "OPENAI_API_KEY=your_openai_key" -ForegroundColor Cyan
    Write-Host "AZURE_DOCUMENT_INTELLIGENCE_ENDPOINT=your_azure_endpoint" -ForegroundColor Cyan
    Write-Host "AZURE_DOCUMENT_INTELLIGENCE_KEY=your_azure_key" -ForegroundColor Cyan
}

Write-Host "Python environment setup complete!" -ForegroundColor Green
Write-Host "You can now test the OCR functionality." -ForegroundColor Green

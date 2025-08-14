# Virtual Environment Setup Guide for Hybrid Backend

## Overview
This project uses a hybrid backend with both Node.js and Python components:
- **Node.js Backend**: Main API server (Express.js)
- **Python Integration**: Browser automation and Azure AI services
- **Dependencies**: Managed separately for each language

## Prerequisites
- Python 3.11+ installed
- Node.js 18+ installed
- Git for cloning the repository

## Step 1: Clone and Navigate to Project
```bash
cd backend
```

## Step 2: Set Up Python Virtual Environment

### Option A: Using `uv` (Recommended - Faster)
```bash
# Install uv if you don't have it
pip install uv

# Create virtual environment
uv venv --python 3.11

# Activate virtual environment
# On Windows:
.venv\Scripts\activate
# On macOS/Linux:
source .venv/bin/activate

# Install Python dependencies
uv sync
```

### Option B: Using `pip` and `venv`
```bash
# Create virtual environment
python -m venv .venv

# Activate virtual environment
# On Windows:
.venv\Scripts\activate
# On macOS/Linux:
source .venv/bin/activate

# Upgrade pip
pip install --upgrade pip

# Install Python dependencies
pip install -r requirements.txt

# Install browser-use in development mode
cd browser-use
pip install -e .
cd ..
```

## Step 3: Set Up Node.js Dependencies
```bash
# Install Node.js dependencies
npm install
```

## Step 4: Environment Configuration
```bash
# Copy environment template
cp .env.example .env

# Edit .env file with your Azure credentials
# AZURE_DOCUMENT_INTELLIGENCE_ENDPOINT=your_endpoint
# AZURE_DOCUMENT_INTELLIGENCE_KEY=your_key
# AZURE_STORAGE_CONNECTION_STRING=your_connection_string
```

## Step 5: Verify Installation

### Test Python Dependencies
```bash
# Activate virtual environment first
.venv\Scripts\activate  # Windows
# source .venv/bin/activate  # macOS/Linux

# Test Azure imports
python -c "import azure.ai.documentintelligence; print('Azure SDK installed successfully')"

# Test browser-use
python -c "import browser_use; print('Browser-use installed successfully')"
```

### Test Node.js Dependencies
```bash
# Test Node.js server
npm run dev
```

## Step 6: Running the Hybrid Backend

### Terminal 1: Python Services
```bash
# Activate virtual environment
.venv\Scripts\activate  # Windows
# source .venv/bin/activate  # macOS/Linux

# Run Python services (if any)
python src/python-bridge/browserAgent.py
```

### Terminal 2: Node.js Server
```bash
# Run Node.js server
npm run dev
```

## Virtual Environment Management

### Activating Virtual Environment
```bash
# Windows
.venv\Scripts\activate

# macOS/Linux
source .venv/bin/activate
```

### Deactivating Virtual Environment
```bash
deactivate
```

### Updating Dependencies
```bash
# Update Python dependencies
pip install -r requirements.txt --upgrade

# Update Node.js dependencies
npm update
```

### Adding New Dependencies
```bash
# Python dependencies
pip install package_name
pip freeze > requirements.txt

# Node.js dependencies
npm install package_name
```

## Troubleshooting

### Common Issues

1. **Python not found**: Ensure Python 3.11+ is installed and in PATH
2. **pip not found**: Upgrade pip with `python -m pip install --upgrade pip`
3. **Azure SDK import errors**: Verify virtual environment is activated
4. **Node.js version issues**: Use Node.js 18+ as specified in package.json
5. **Permission errors**: Run as administrator or use `--user` flag

### Reset Virtual Environment
```bash
# Remove existing environment
rm -rf .venv  # macOS/Linux
# rmdir /s .venv  # Windows

# Recreate following steps above
```

## Development Workflow

1. **Always activate virtual environment** before running Python code
2. **Use separate terminals** for Python and Node.js services
3. **Keep dependencies updated** with `pip install -r requirements.txt` and `npm update`
4. **Test both environments** after major dependency changes

## Notes
- The `browser-use` package is installed in development mode (`-e`) for live code changes
- Azure dependencies are Python-only and managed through pip
- Node.js dependencies are managed through npm
- Both environments can run simultaneously in separate terminals

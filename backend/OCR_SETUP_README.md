# OCR Setup and Troubleshooting Guide

This guide explains how to set up and troubleshoot the OCR (Optical Character Recognition) functionality for processing receipt images.

## Overview

The OCR system uses:
- **Azure Document Intelligence** for structured data extraction
- **OpenAI** for enhanced text processing
- **Python** for the core OCR logic
- **Node.js** for the API interface

## Prerequisites

1. **Python 3.8+** installed and accessible via `python` command
2. **pip** package manager
3. **Environment variables** configured (see Environment Setup below)

## Quick Setup

### 1. Install Python Dependencies

Run the setup script from the `backend` directory:

```powershell
# Windows PowerShell
.\setup_python_env.ps1

# Or manually install packages
pip install -r requirements.txt
```

### 2. Set Environment Variables

Create a `.env` file in the `backend` directory with:

```env
OPENAI_API_KEY=your_openai_api_key_here
AZURE_DOCUMENT_INTELLIGENCE_ENDPOINT=your_azure_endpoint_here
AZURE_DOCUMENT_INTELLIGENCE_KEY=your_azure_key_here
```

### 3. Test OCR Functionality

Test the OCR system independently:

```bash
cd backend
python test_ocr.py
```

## Architecture

```
Frontend → Node.js API → Python OCR Script → Azure + OpenAI → Results
```

### Key Components

1. **`run_ocr.py`** - Standalone Python script for OCR processing
2. **`ocr_functionality.py`** - Core OCR logic and Azure integration
3. **`tickets.js`** - Node.js API endpoint for file uploads
4. **`test_ocr.py`** - Independent testing script

## Troubleshooting

### Common Issues

#### 1. "Python script returned empty output"

**Cause**: Python script is failing silently or not producing stdout
**Solutions**:
- Check Python dependencies: `pip list | grep azure`
- Verify environment variables: `python test_ocr.py`
- Check Python executable path: `which python` or `where python`

#### 2. Import Errors

**Cause**: Missing Python packages or incorrect paths
**Solutions**:
- Install dependencies: `pip install -r requirements.txt`
- Check Python path: `python -c "import sys; print(sys.path)"`
- Verify file locations

#### 3. Environment Variable Issues

**Cause**: Missing or incorrect API keys
**Solutions**:
- Verify `.env` file exists and contains correct values
- Check variable names match exactly
- Restart Node.js server after changing `.env`

#### 4. Azure Authentication Errors

**Cause**: Invalid Azure credentials or endpoint
**Solutions**:
- Verify Azure Document Intelligence service is active
- Check endpoint URL format (should end with `.cognitiveservices.azure.com/`)
- Ensure API key has proper permissions

### Debug Steps

1. **Test Python independently**:
   ```bash
   python test_ocr.py
   ```

2. **Check Python environment**:
   ```bash
   python -c "import azure.ai.documentintelligence; print('Azure OK')"
   python -c "import openai; print('OpenAI OK')"
   ```

3. **Verify file paths**:
   ```bash
   ls -la backend/src/services/
   ```

4. **Check Node.js execution**:
   - Look for `[OCR]` log messages in Node.js console
   - Verify Python script path resolution

### Log Analysis

The system provides detailed logging:

- **`[OCR]`** - Node.js OCR integration logs
- **`[ENHANCED-OCR]`** - Python OCR processing logs
- **stderr** - Python error output (captured by Node.js)

## Testing

### Manual Testing

1. Upload an image via the frontend
2. Check Node.js console for OCR logs
3. Verify Python script execution
4. Check for JSON output parsing

### Automated Testing

```bash
# Test OCR functionality
python test_ocr.py

# Test Node.js integration
npm test
```

## Performance Optimization

- **Image size**: Optimize images to reasonable dimensions (max 10MB)
- **Batch processing**: Process multiple images sequentially
- **Caching**: Consider caching OCR results for repeated images

## Security Considerations

- **API keys**: Never commit `.env` files to version control
- **File validation**: Validate uploaded file types and sizes
- **Rate limiting**: Implement API rate limiting for OCR endpoints

## Support

If issues persist:

1. Check this troubleshooting guide
2. Run `python test_ocr.py` for detailed error information
3. Review Node.js and Python console logs
4. Verify all prerequisites are met
5. Check Azure and OpenAI service status

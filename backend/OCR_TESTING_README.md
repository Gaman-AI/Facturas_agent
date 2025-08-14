# OCR Functionality Testing Guide

## Overview
This guide explains how to test the updated OCR functionality that extracts core fields from receipt images.

## Updated Return Fields
The OCR function now returns only these core fields:
- **Mesa/Folio**: The folio or table number from the receipt
- **Fecha**: Transaction date in DD/MM/YYYY format
- **ID Ticket**: The main ticket/receipt identifier
- **Total**: The total amount from the receipt
- **Full_Raw_Text**: Complete raw text extracted from the image

## Prerequisites
1. **Environment Variables**: Ensure your `.env` file contains:
   ```
   OPENAI_API_KEY=your_openai_api_key
   AZURE_DOCUMENT_INTELLIGENCE_ENDPOINT=your_azure_endpoint
   AZURE_DOCUMENT_INTELLIGENCE_KEY=your_azure_key
   ```

2. **Dependencies**: Install required packages:
   ```bash
   pip install -r requirements_ocr.txt
   ```

## Testing Steps

### 1. Prepare Test Image
- Place a test receipt image in the `backend/` directory
- Update the `test_image_path` variable in `test_ocr.py` to match your image filename
- Supported formats: JPG, PNG, PDF

### 2. Run the Test
```bash
cd backend
python test_ocr.py
```

### 3. Expected Output
The test will display:
- Processing status
- Extracted core fields
- Raw text preview (first 200 characters)
- Success/error messages

## Test Image Requirements
- **Clear Image**: High resolution, good lighting
- **Receipt Content**: Should contain date, total, and identification numbers
- **Format**: Common receipt formats (restaurant, retail, etc.)

## Troubleshooting
- **Missing Dependencies**: Install packages from `requirements_ocr.txt`
- **Environment Variables**: Check `.env` file configuration
- **Image Issues**: Ensure image is readable and in supported format
- **API Limits**: Verify Azure and OpenAI API quotas

## Code Changes Made
- Simplified return structure to core fields only
- Removed vendor-specific complexity
- Streamlined field mapping
- Added comprehensive test script
- Maintained enhanced OCR detection algorithms

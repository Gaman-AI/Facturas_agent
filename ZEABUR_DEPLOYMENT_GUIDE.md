# 🚀 Zeabur Deployment Guide for Facturas Agent

## 🔧 Issue Resolution

### Problem
Your deployment was failing because:
```
⚠️  Python not available - browser automation will not work
⚠️  Python executable not found - browser automation may not work
```

### Root Cause
- Zeabur was only deploying the Node.js backend service
- OCR functionality requires Python to be available in the same container
- The original Dockerfile was Node.js only

### Solution
Created a **unified Dockerfile** that includes both Node.js and Python in the same container.

---

## 📁 Files Created/Modified

### 1. Updated `backend/Dockerfile`
- ✅ Added Python 3.11 support
- ✅ Installed Python dependencies (requirements.txt + requirements_ocr.txt)
- ✅ Added OCR-specific system dependencies
- ✅ Set proper Python environment variables
- ✅ Updated port to 8080 (Zeabur standard)

### 2. Created `backend/Dockerfile.zeabur`
- ✅ Alternative unified Dockerfile specifically for Zeabur
- ✅ Optimized for single-container deployment

### 3. Created `zeabur.json`
- ✅ Zeabur deployment configuration
- ✅ Health check configuration
- ✅ Environment variables setup

---

## 🚀 Deployment Steps

### Step 1: Update Your Zeabur Service
1. Go to your Zeabur dashboard
2. Select your `facturas-agent` service
3. Go to **Settings** → **Build & Deploy**
4. Update the **Dockerfile Path** to: `backend/Dockerfile`
5. Set **Port** to: `8080`

### Step 2: Environment Variables
Make sure these environment variables are set in Zeabur:

```bash
# Required for OCR functionality
OPENAI_API_KEY=your_openai_api_key_here
AZURE_DOCUMENT_INTELLIGENCE_ENDPOINT=your_azure_endpoint_here
AZURE_DOCUMENT_INTELLIGENCE_KEY=your_azure_key_here

# Node.js configuration
NODE_ENV=production
PORT=8080
START_WORKER=true

# Python configuration
PYTHONUNBUFFERED=1
PYTHONDONTWRITEBYTECODE=1

# Database (if using Supabase)
SUPABASE_URL=your_supabase_url
SUPABASE_ANON_KEY=your_supabase_anon_key

# Other required variables
PYTHON_EXECUTABLE=python3
```

### Step 3: Deploy
1. Click **Deploy** in Zeabur
2. Monitor the build logs
3. Verify Python is available: Look for Python installation in logs

---

## ✅ Verification

### Check Python Availability
After deployment, the logs should show:
```
✅ Python 3.x.x available
✅ Python dependencies installed
✅ OCR functionality ready
```

### Test OCR Endpoint
```bash
curl -X GET https://your-app.zeabur.app/api/v1/tickets/test-ocr
```

Expected response:
```json
{
  "success": true,
  "message": "OCR test completed successfully",
  "result": {
    "status": "success",
    "message": "OCR module imported successfully"
  }
}
```

---

## 🔍 Troubleshooting

### If Python Still Not Available
1. Check build logs for Python installation errors
2. Verify `requirements_ocr.txt` exists and has correct dependencies
3. Ensure environment variables are set correctly

### If OCR Still Fails
1. Test the OCR endpoint: `/api/v1/tickets/test-ocr`
2. Check Python dependencies in logs
3. Verify Azure and OpenAI API keys

### If Build Fails
1. Check Dockerfile syntax
2. Verify all required files exist
3. Check for missing dependencies

---

## 📊 Expected Logs After Fix

```
[Zeabur] Building with Dockerfile: backend/Dockerfile
[Zeabur] Installing Python 3.x.x...
[Zeabur] Installing Python dependencies...
[Zeabur] Installing Node.js dependencies...
[Zeabur] Starting application...

🔌 WebSocket server initialized on /api/v1/browser-agent/ws
✅ Environment configuration validated
🚀 Starting CFDI Automation Backend...
📝 Node.js version: v20.x.x
🐍 Python version: 3.x.x
✅ Python available - OCR functionality ready
✅ Queue service initialized successfully
🎯 Server listening on port 8080
🚀 CFDI Automation Backend Server Started!
```

---

## 🎯 Key Changes Made

1. **Unified Container**: Node.js + Python in same container
2. **Python Dependencies**: Added OCR requirements
3. **Environment Variables**: Proper Python configuration
4. **Port Configuration**: Updated to Zeabur standard (8080)
5. **Health Checks**: Added proper health check endpoints

---

## 📞 Support

If you still encounter issues:
1. Check the build logs in Zeabur dashboard
2. Verify all environment variables are set
3. Test the OCR endpoint after deployment
4. Check Python availability in container logs

The OCR functionality should now work properly in your Zeabur deployment! 🎉

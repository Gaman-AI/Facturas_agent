import express from 'express'
import path from 'path'
import fs from 'fs/promises'
import { fileURLToPath } from 'url'
import multer from 'multer'
import { spawn } from 'child_process'
import { execSync } from 'child_process'

const router = express.Router()

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

// Temp uploads directory inside backend/tmp/uploads
const uploadsDir = path.join(__dirname, '..', '..', 'tmp', 'uploads')

// Ensure uploads directory exists
async function ensureUploadsDir() {
  await fs.mkdir(uploadsDir, { recursive: true })
}

// Configure multer storage to save files to uploadsDir
const storage = multer.diskStorage({
  destination: async function (req, file, cb) {
    try {
      await ensureUploadsDir()
      cb(null, uploadsDir)
    } catch (e) {
      cb(e, uploadsDir)
    }
  },
  filename: function (req, file, cb) {
    const timestamp = Date.now()
    const safeName = file.originalname.replace(/[^a-zA-Z0-9_.-]/g, '_')
    cb(null, `${timestamp}_${safeName}`)
  }
})

const upload = multer({ storage })

// In-memory store for ticket results (simple temp cache)
const ticketStore = new Map()

function generateTicketId() {
  return `ticket_${Math.random().toString(36).slice(2, 10)}${Math.random().toString(36).slice(2, 6)}`
}

async function runPythonOCR(imagePath) {
  try {
    // Use the standalone Python script
    const pythonExec = process.env.PYTHON_EXECUTABLE || 'python'
    const ocrScriptPath = path.resolve(__dirname, '..', 'services', 'run_ocr.py')
    const backendDir = path.resolve(__dirname, '..')
    
    console.log(`[OCR] Script path: ${ocrScriptPath}`)
    console.log(`[OCR] Backend directory: ${backendDir}`)
    console.log(`[OCR] Image path: ${imagePath}`)
    console.log(`[OCR] Current working directory: ${process.cwd()}`)
    
    console.log(`[OCR] Executing Python script...`)
    
    // Execute the standalone Python script
    const result = execSync(`${pythonExec} "${ocrScriptPath}" "${imagePath}"`, { 
      encoding: 'utf8',
      stdio: ['pipe', 'pipe', 'pipe'],
      shell: true,
      cwd: backendDir, // Use the backend directory as working directory
      env: process.env // Pass all environment variables to Python subprocess
    })
    
    console.log(`[OCR] Python output: ${result}`)
    
    // Check if result is empty or invalid
    if (!result || result.trim() === '') {
      throw new Error('Python script returned empty output')
    }
    
    // Try to parse the JSON result
    let ocrResult
    try {
      ocrResult = JSON.parse(result.trim())
    } catch (parseError) {
      console.error(`[OCR] JSON parse error: ${parseError.message}`)
      console.error(`[OCR] Raw output: ${result}`)
      throw new Error(`Invalid JSON output from Python script: ${parseError.message}`)
    }
    
    // Check if the result contains an error
    if (ocrResult.error) {
      throw new Error(`Python script error: ${ocrResult.error}`)
    }
    
    return ocrResult
    
  } catch (error) {
    console.error(`[OCR] Execution error: ${error.message}`)
    console.error(`[OCR] Error details:`, error)
    throw new Error(`OCR processing failed: ${error.message}`)
  }
}

// POST /api/v1/tickets/upload
router.post('/upload', upload.single('file'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ success: false, error: 'No file uploaded' })
    }

    const vendorUrl = req.body.vendor_url || null
    const imagePath = req.file.path
    const ticketId = generateTicketId()

    let ocrData = null
    try {
      ocrData = await runPythonOCR(imagePath)
    } catch (e) {
      // If OCR fails, still return minimal info with status FAILED
      console.error('OCR invocation failed:', e)
      ticketStore.set(ticketId, {
        status: 'FAILED',
        file: {
          filename: req.file.filename,
          path: imagePath,
          mimetype: req.file.mimetype,
          size: req.file.size
        },
        vendor_url: vendorUrl,
        extracted_data: null,
        error: e.message,
        created_at: new Date().toISOString(),
      })

      return res.status(201).json({
        success: true,
        data: {
          ticket_id: ticketId,
          status: 'FAILED',
          file_info: {
            filename: req.file.originalname,
            size: req.file.size,
            type: req.file.mimetype
          },
          vendor_url: vendorUrl,
          extracted_data: null,
          message: 'OCR processing failed'
        }
      })
    }

    // Normalize extracted data keys for frontend convenience
    const normalized = {
      // Core fields
      mesa_folio: ocrData?.Mesa_Folio || ocrData?.mesa_folio || null,
      fecha: ocrData?.Fecha || ocrData?.fecha || null,
      id_ticket: ocrData?.ID_Ticket || ocrData?.id_ticket || null,
      total: ocrData?.Total || ocrData?.total || null,
      comercio: ocrData?.Comercio || ocrData?.comercio || null,
      
      // Vendor-specific fields
      tc_number: ocrData?.['TC#'] || ocrData?.tc_number || null,
      tr_number: ocrData?.['TR#'] || ocrData?.tr_number || null,
      id: ocrData?.ID || ocrData?.id || null,
      folio_venta: ocrData?.Fol_Vta || ocrData?.folio_venta || null,
      
      // New enhanced fields
      store_branch_plaza: ocrData?.Store_Branch_Plaza || ocrData?.store_branch_plaza || null,
      register_station_terminal: ocrData?.Register_Station_Terminal || ocrData?.register_station_terminal || null,
      payment_type: ocrData?.Payment_Type || ocrData?.payment_type || null,
      card_last_4_digits: ocrData?.Card_Last_4_Digits || ocrData?.card_last_4_digits || null,
      
      // Raw text and metadata
      raw_text: ocrData?.Full_Raw_Text || ocrData?.raw_text || ocrData?.full_text || null,
      vendor_type: ocrData?.vendor_type || null,
      extraction_method: ocrData?.extraction_method || null,
      text_length: ocrData?.text_length || null,
      
      // Alternative field names for frontend compatibility
      Mesa_Folio: ocrData?.Mesa_Folio || null,
      Fecha: ocrData?.Fecha || null,
      ID_Ticket: ocrData?.ID_Ticket || null,
      Total: ocrData?.Total || null,
      Comercio: ocrData?.Comercio || null,
      'TC#': ocrData?.['TC#'] || null,
      'TR#': ocrData?.['TR#'] || null,
      'ID': ocrData?.ID || null,
      'Fol_Vta': ocrData?.Fol_Vta || null,
      
      // New enhanced fields with alternative names
      Store_Branch_Plaza: ocrData?.Store_Branch_Plaza || null,
      Register_Station_Terminal: ocrData?.Register_Station_Terminal || null,
      Payment_Type: ocrData?.Payment_Type || null,
      Card_Last_4_Digits: ocrData?.Card_Last_4_Digits || null
    }

    ticketStore.set(ticketId, {
      status: 'EXTRACTION_COMPLETE',
      file: {
        filename: req.file.filename,
        path: imagePath,
        mimetype: req.file.mimetype,
        size: req.file.size
      },
      vendor_url: vendorUrl,
      extracted_data: normalized,
      created_at: new Date().toISOString(),
    })

    return res.status(201).json({
      success: true,
      data: {
        ticket_id: ticketId,
        status: 'EXTRACTION_COMPLETE',
        file_info: {
          filename: req.file.originalname,
          size: req.file.size,
          type: req.file.mimetype
        },
        vendor_url: vendorUrl,
        extracted_data: normalized
      }
    })
  } catch (error) {
    console.error('Upload error:', error)
    return res.status(500).json({ success: false, error: 'Internal Server Error' })
  }
})

// GET /api/v1/tickets/test-ocr
router.get('/test-ocr', async (req, res) => {
  try {
    console.log('[OCR] Testing OCR functionality...')
    
    // Test the Python script execution without actually calling the OCR function
    const pythonExec = process.env.PYTHON_EXECUTABLE || 'python'
    const ocrScriptPath = path.resolve(__dirname, '..', 'services', 'ocr_functionality.py')
    const servicesDir = path.dirname(ocrScriptPath)
    const backendDir = path.resolve(__dirname, '..')
    
    console.log(`[OCR] Script path: ${ocrScriptPath}`)
    console.log(`[OCR] Services directory: ${servicesDir}`)
    console.log(`[OCR] Backend directory: ${backendDir}`)
    
    const pythonCode = `
import sys
import json
import os

print("Python script starting...", file=sys.stderr)
print(f"Current working directory: {os.getcwd()}", file=sys.stderr)
print(f"Python executable: {sys.executable}", file=sys.stderr)
print(f"Python version: {sys.version}", file=sys.stderr)

# Add the services directory to Python path
services_dir = r'${servicesDir.replace(/\\/g, '\\\\')}'
print(f"Adding to path: {services_dir}", file=sys.stderr)
sys.path.insert(0, services_dir)

try:
    from ocr_functionality import extract_receipt_data
    print("Import successful", file=sys.stderr)
    print(json.dumps({"status": "success", "message": "OCR module imported successfully", "path": services_dir}))
    
except ImportError as e:
    error_msg = f"Import failed: {str(e)}"
    print(error_msg, file=sys.stderr)
    print(json.dumps({"error": error_msg, "success": False}))
    sys.exit(1)
except Exception as e:
    error_msg = f"Unexpected error: {str(e)}"
    print(error_msg, file=sys.stderr)
    print(json.dumps({"error": error_msg, "success": False}))
    sys.exit(1)
`
    
    console.log(`[OCR] Executing Python test script...`)
    
    const result = execSync(pythonCode, { 
      encoding: 'utf8',
      stdio: ['pipe', 'pipe', 'pipe'],
      shell: true,
      cwd: backendDir,
      env: process.env // Pass all environment variables to Python subprocess
    })
    
    console.log(`[OCR] Python test output: ${result}`)
    
    // Check if result is empty or invalid
    if (!result || result.trim() === '') {
      throw new Error('Python test script returned empty output')
    }
    
    // Try to parse the JSON result
    let testResult
    try {
      testResult = JSON.parse(result.trim())
    } catch (parseError) {
      console.error(`[OCR] JSON parse error: ${parseError.message}`)
      console.error(`[OCR] Raw output: ${result}`)
      throw new Error(`Invalid JSON output from Python test script: ${parseError.message}`)
    }
    
    // Check if the result contains an error
    if (testResult.error) {
      throw new Error(`Python test script error: ${testResult.error}`)
    }
    
    return res.json({
      success: true,
      message: 'OCR test completed successfully',
      result: testResult
    })
    
  } catch (error) {
    console.error('[OCR] Test failed:', error)
    return res.status(500).json({
      success: false,
      error: error.message,
      details: error.stack
    })
  }
})

// GET /api/v1/tickets/:ticketId/status
router.get('/:ticketId/status', async (req, res) => {
  try {
    const { ticketId } = req.params
    const data = ticketStore.get(ticketId)
    if (!data) {
      return res.status(404).json({ success: false, error: 'Ticket not found' })
    }
    return res.json({ success: true, data: { ticket_id: ticketId, status: data.status, extracted_data: data.extracted_data } })
  } catch (error) {
    console.error('Status error:', error)
    return res.status(500).json({ success: false, error: 'Internal Server Error' })
  }
})

export default router



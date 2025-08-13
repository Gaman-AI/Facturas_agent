import express from 'express'
import path from 'path'
import fs from 'fs/promises'
import { fileURLToPath } from 'url'
import { spawn } from 'child_process'
import multer from 'multer'

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
  return new Promise((resolve, reject) => {
    const runnerPath = path.join(__dirname, '..', 'services', 'ocr_invoke.py')
    const pythonExec = process.env.PYTHON_EXECUTABLE || 'python'

    const proc = spawn(pythonExec, [runnerPath, imagePath], { stdio: ['ignore', 'pipe', 'pipe'] })

    let stdout = ''
    let stderr = ''
    proc.stdout.on('data', d => { stdout += d.toString() })
    proc.stderr.on('data', d => { stderr += d.toString() })
    proc.on('close', code => {
      if (code === 0) {
        try {
          const result = JSON.parse(stdout.trim())
          resolve(result)
        } catch (e) {
          reject(new Error(`Failed to parse OCR output: ${e.message}; Output: ${stdout}; Stderr: ${stderr}`))
        }
      } else {
        reject(new Error(`OCR process exited with code ${code}: ${stderr || stdout}`))
      }
    })
    proc.on('error', err => reject(err))
  })
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
      mesa_folio: ocrData?.Mesa_Folio || ocrData?.mesa_folio || null,
      fecha: ocrData?.Fecha || ocrData?.fecha || null,
      id_ticket: ocrData?.ID_Ticket || ocrData?.id_ticket || null,
      total: ocrData?.Total || ocrData?.total || null,
      comercio: ocrData?.Comercio || ocrData?.comercio || null,
      raw_text: ocrData?.full_text || ocrData?.raw_text || null,
      vendor_type: ocrData?.vendor_type || null,
      extraction_method: ocrData?.extraction_method || null
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



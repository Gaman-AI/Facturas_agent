import express from 'express'
import multer from 'multer'
import { analyzeInvoiceAzure } from '../services/ocrAzureService.js'

const router = express.Router()

// Configure multer for in-memory storage
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 25 * 1024 * 1024 } // 25MB
})

// Health check for OCR module
router.get('/health', (req, res) => {
  res.json({ success: true, data: { module: 'ocr', provider: 'azure' } })
})

// POST /api/v1/ocr/azure - analyze invoice
router.post('/azure', upload.single('file'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ success: false, error: 'No file uploaded' })
    }

    const buffer = req.file.buffer
    const contentType = req.file.mimetype || 'application/pdf'

    const result = await analyzeInvoiceAzure(buffer, contentType)
    if (!result.ok) {
      return res.status(502).json({ success: false, error: result.error })
    }

    return res.json({ success: true, data: result.data })
  } catch (error) {
    return res.status(500).json({ success: false, error: error.message || 'OCR error' })
  }
})

export default router 
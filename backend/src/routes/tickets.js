import express from 'express'
import multer from 'multer'
import { authenticate } from '../middleware/auth.js'
import ticketsService from '../services/ticketsService.js'
import browserAgentService from '../services/browserAgentService.js'

const router = express.Router()

const upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 25 * 1024 * 1024 } })

// POST /api/v1/tickets/upload
router.post('/upload', authenticate, upload.single('file'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ success: false, error: 'No file uploaded' })
    }

    const created = ticketsService.createTicket(req.user.id, req.file, {
      vendor_url: req.body.vendor_url,
      vendor_name: req.body.vendor_name,
      priority: req.body.priority
    })

    return res.status(201).json({ success: true, data: created })
  } catch (err) {
    return res.status(500).json({ success: false, error: err.message || 'Upload failed' })
  }
})

// GET /api/v1/tickets/:ticketId/status
router.get('/:ticketId/status', authenticate, async (req, res) => {
  const rec = ticketsService.getTicket(req.params.ticketId, req.user.id)
  if (!rec) return res.status(404).json({ success: false, error: 'Ticket not found' })

  return res.json({
    success: true,
    data: {
      ticket_id: rec.id,
      status: rec.status,
      processing_stage: rec.processingStage,
      progress_percentage: rec.progressPercentage,
      vendor_info: {
        detected_vendor: rec.vendorDetected || rec.vendorName || null,
        confidence: rec.vendorConfidence || (rec.vendorName ? 0.95 : null),
        vendor_url: rec.vendorUrl || null,
        logo_detected: false
      },
      extracted_data: rec.extractedData,
      ocr_metadata: rec.ocrMetadata,
      updated_at: rec.updatedAt
    }
  })
})

// POST /api/v1/tickets/:ticketId/create-agent-task
router.post('/:ticketId/create-agent-task', authenticate, async (req, res) => {
  const rec = ticketsService.getTicket(req.params.ticketId, req.user.id)
  if (!rec) return res.status(404).json({ success: false, error: 'Ticket not found' })

  try {
    const taskData = {
      vendor_url: req.body.vendor_url_override || rec.vendorUrl,
      prompt: req.body.combined_prompt || undefined,
      customer_details: req.body.user_profile || undefined,
      invoice_details: {
        ticket_id: rec.extractedData?.id_ticket,
        total: rec.extractedData?.total,
        transaction_date: rec.extractedData?.fecha
      },
      max_steps: 50,
      timeout_minutes: 30
    }

    const task = await browserAgentService.createTask(req.user.id, taskData)
    ticketsService.attachAgentTask(rec.id, task)

    return res.status(201).json({
      success: true,
      data: {
        agent_task_id: task.id,
        ticket_id: rec.id,
        status: 'PENDING',
        task_data: {
          vendor_url: task.vendorUrl,
          vendor_name: rec.vendorDetected || rec.vendorName || null,
          user_profile: req.body.user_profile || null,
          ticket_data: {
            id_ticket: rec.extractedData?.id_ticket,
            total: rec.extractedData?.total,
            fecha: rec.extractedData?.fecha,
            mesa_folio: rec.extractedData?.mesa_folio,
            caja_number: rec.extractedData?.caja_number,
            sucursal: rec.extractedData?.sucursal
          },
          combined_prompt: req.body.combined_prompt || null
        },
        browserbase_session: {
          session_id: task.browserSessionId || task.sessionId || null,
          live_view_url: task.liveViewUrl || null,
          status: 'INITIALIZING'
        },
        created_at: new Date().toISOString(),
        estimated_completion: new Date(Date.now() + 2 * 60 * 1000).toISOString()
      }
    })
  } catch (err) {
    return res.status(500).json({ success: false, error: err.message || 'Failed to create agent task' })
  }
})

// GET /api/v1/tickets
router.get('/', authenticate, async (req, res) => {
  const page = parseInt(req.query.page || '1')
  const limit = parseInt(req.query.limit || '10')
  const status = req.query.status || 'all'
  const sort = req.query.sort || 'created_at'
  const order = req.query.order || 'desc'
  const result = ticketsService.listTickets(req.user.id, { page, limit, status, sort, order })
  return res.json({ success: true, data: result })
})

// DELETE /api/v1/tickets/:ticketId
router.delete('/:ticketId', authenticate, async (req, res) => {
  const result = ticketsService.deleteTicket(req.params.ticketId, req.user.id)
  if (!result.ok) return res.status(404).json({ success: false, error: result.error })
  return res.json({ success: true, data: { ticket_id: req.params.ticketId, message: 'Ticket and associated data deleted successfully', deleted_items: { ticket_file: true, extracted_data: true, agent_task: true, browserbase_session: 'terminated' } } })
})

export default router 
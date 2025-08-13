import { v4 as uuidv4 } from 'uuid'
import websocket from './ticketsWebSocketService.js'
import { analyzeInvoiceAzure } from './ocrAzureService.js'

class TicketsService {
  constructor() {
    this.tickets = new Map()
  }

  createTicket(userId, file, options = {}) {
    const id = `ticket_${uuidv4().replace(/-/g, '').slice(0, 12)}`
    const now = new Date().toISOString()

    const record = {
      id,
      userId,
      status: 'PROCESSING',
      processingStage: 'OCR_EXTRACTION',
      progressPercentage: 0,
      filename: file.originalname || 'upload',
      fileSize: file.size || 0,
      fileType: file.mimetype || 'application/octet-stream',
      fileBuffer: file.buffer, // kept in memory for demo; replace with storage in prod
      vendorUrl: options.vendor_url || null,
      vendorName: options.vendor_name || null,
      vendorDetected: null,
      vendorConfidence: null,
      estimatedProcessingTime: '30-45 seconds',
      createdAt: now,
      updatedAt: now,
      completedAt: null,
      extractedData: null,
      ocrMetadata: null,
      agentTaskId: null
    }

    this.tickets.set(id, record)

    // kick off async OCR
    this._processOCR(record).catch(err => {
      this._update(record.id, {
        status: 'FAILED',
        processingStage: 'OCR_EXTRACTION',
        progressPercentage: 100,
        updatedAt: new Date().toISOString(),
        ocrMetadata: { error: err.message }
      })
    })

    return this._formatCreateResponse(record)
  }

  async _processOCR(record) {
    try {
      // emit initial progress
      websocket.broadcast(record.id, {
        type: 'ocr_progress',
        data: {
          ticket_id: record.id,
          stage: 'text_extraction',
          progress: 10,
          estimated_completion: record.estimatedProcessingTime
        }
      })

      // Call Azure OCR
      const start = Date.now()
      const ocr = await analyzeInvoiceAzure(record.fileBuffer, record.fileType)

      // simple staged progress updates
      websocket.broadcast(record.id, {
        type: 'ocr_progress',
        data: { ticket_id: record.id, stage: 'text_extraction', progress: 60 }
      })

      if (!ocr.ok) {
        this._update(record.id, {
          status: 'FAILED',
          progressPercentage: 100,
          updatedAt: new Date().toISOString(),
          ocrMetadata: { error: ocr.error }
        })
        return
      }

      const processingTimeMs = Date.now() - start

      // Map minimal extracted fields
      const extracted = {
        mesa_folio: ocr.data?.invoice_id || null,
        fecha: ocr.data?.invoice_date || null,
        id_ticket: ocr.data?.invoice_id || null,
        total: ocr.data?.total || null,
        subtotal: ocr.data?.subtotal || null,
        iva: ocr.data?.total_tax || null,
        raw_text: null,
        confidence_scores: {
          overall_confidence: 0.9,
          total: 0.9,
          fecha: 0.85,
          id_ticket: 0.95
        },
        vendor_detected: record.vendorName || null,
        vendor_confidence: record.vendorName ? 0.95 : null
      }

      const ocrMetadata = {
        processing_time_ms: processingTimeMs,
        image_quality: 'UNKNOWN',
        text_regions_detected: null,
        language_detected: 'es-MX',
        orientation_corrected: false
      }

      this._update(record.id, {
        status: 'EXTRACTION_COMPLETE',
        processingStage: 'OCR_EXTRACTION',
        progressPercentage: 100,
        updatedAt: new Date().toISOString(),
        extractedData: extracted,
        ocrMetadata
      })

      websocket.broadcast(record.id, {
        type: 'extraction_complete',
        data: {
          ticket_id: record.id,
          extracted_data: extracted,
          confidence_score: extracted.confidence_scores.overall_confidence,
          ready_for_agent: true
        }
      })
    } catch (err) {
      this._update(record.id, {
        status: 'FAILED',
        progressPercentage: 100,
        updatedAt: new Date().toISOString(),
        ocrMetadata: { error: err.message }
      })
    }
  }

  _update(id, updates) {
    const rec = this.tickets.get(id)
    if (!rec) return null
    Object.assign(rec, updates)
    this.tickets.set(id, rec)
    return rec
  }

  getTicket(id, userId) {
    const rec = this.tickets.get(id)
    if (!rec || (userId && rec.userId !== userId)) return null
    return rec
  }

  listTickets(userId, { page = 1, limit = 10, status = 'all', sort = 'created_at', order = 'desc' } = {}) {
    let all = Array.from(this.tickets.values()).filter(t => t.userId === userId)

    if (status && status !== 'all') {
      all = all.filter(t => (t.status || '').toUpperCase() === status.toUpperCase())
    }

    const total = all.length
    const start = (page - 1) * limit

    // sort by created_at or updated_at
    const sortKey = sort === 'updated_at' ? 'updatedAt' : 'createdAt'
    all.sort((a, b) => {
      const av = new Date(a[sortKey]).getTime()
      const bv = new Date(b[sortKey]).getTime()
      return order === 'asc' ? av - bv : bv - av
    })

    const items = all.slice(start, start + limit)

    return {
      tickets: items.map(t => ({
        ticket_id: t.id,
        filename: t.filename,
        vendor_detected: t.vendorDetected || t.vendorName || null,
        status: t.status,
        total_amount: t.extractedData?.total || null,
        ticket_date: t.extractedData?.fecha || null,
        processing_time_ms: t.ocrMetadata?.processing_time_ms || null,
        agent_task_id: t.agentTaskId || null,
        agent_status: null,
        created_at: t.createdAt,
        completed_at: t.completedAt
      })),
      pagination: {
        page,
        limit,
        total,
        total_pages: Math.max(1, Math.ceil(total / limit)),
        has_next: start + limit < total,
        has_prev: page > 1
      }
    }
  }

  attachAgentTask(ticketId, task) {
    const rec = this._update(ticketId, { agentTaskId: task?.id })
    if (rec) {
      websocket.broadcast(ticketId, {
        type: 'agent_started',
        data: {
          task_id: task.id,
          browserbase_session_id: task.sessionId || task.browserSessionId || 'unknown',
          live_view_url: task.liveViewUrl || null
        }
      })
    }
    return rec
  }

  deleteTicket(ticketId, userId) {
    const rec = this.getTicket(ticketId, userId)
    if (!rec) return { ok: false, error: 'Ticket not found' }
    this.tickets.delete(ticketId)
    return { ok: true }
  }

  _formatCreateResponse(rec) {
    return {
      ticket_id: rec.id,
      status: rec.status,
      file_info: {
        filename: rec.filename,
        size: rec.fileSize,
        type: rec.fileType
      },
      vendor_url: rec.vendorUrl,
      vendor_detected: rec.vendorName || null,
      estimated_processing_time: rec.estimatedProcessingTime,
      created_at: rec.createdAt
    }
  }
}

export default new TicketsService() 
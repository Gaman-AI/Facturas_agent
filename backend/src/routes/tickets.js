import express from 'express'
import multer from 'multer'
import ticketStorageService from '../services/ticketStorageService.js'
import { authenticate } from '../middleware/auth.js'
import { ValidationError, NotFoundError } from '../middleware/errorHandler.js'

const router = express.Router()

// Configure multer for file uploads
const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 50 * 1024 * 1024, // 50MB limit
  },
  fileFilter: (req, file, cb) => {
    const allowedTypes = [
      'image/jpeg',
      'image/png',
      'image/jpg', 
      'application/pdf',
      'image/webp'
    ]
    
    if (allowedTypes.includes(file.mimetype)) {
      cb(null, true)
    } else {
      cb(new ValidationError('Invalid file type. Only JPEG, PNG, PDF, and WebP files are allowed.'), false)
    }
  }
})

/**
 * @route POST /api/v1/tickets/upload
 * @desc Upload a new ticket/invoice file with OCR processing
 * @access Private
 */
router.post('/upload', authenticate, upload.single('file'), async (req, res, next) => {
  try {
    console.log('📤 Upload request received:', {
      hasFile: !!req.file,
      fileName: req.file?.originalname,
      fileSize: req.file?.size,
      userId: req.user?.id,
      body: req.body
    })

    if (!req.file) {
      throw new ValidationError('No file uploaded')
    }

    const { vendor_url } = req.body

    console.log('🔄 Starting file upload to Supabase Storage...')
    // Upload file to Supabase Storage
    const uploadResult = await ticketStorageService.uploadTicket(
      req.file.buffer,
      req.file.originalname,
      req.file.mimetype,
      req.user.id
    )
    console.log('✅ File upload successful:', uploadResult)

    // Save initial ticket record to database
    const ticketData = {
      userId: req.user.id,
      fileName: uploadResult.originalName,
      fileSize: uploadResult.size,
      fileType: req.file.mimetype,
      fileUrl: uploadResult.fileUrl,
      status: 'uploaded',
      processing_status: 'ocr_processing',
      comercio: null // Will be filled by OCR
    }

    const ticket = await ticketStorageService.saveTicketRecord(ticketData)
    console.log('✅ Ticket record saved:', ticket.id)

    // Process with OCR in the background
    try {
      console.log('🔄 Starting OCR processing...')
      const ocrResult = await ticketStorageService.processTicketWithOCR(ticket.id, req.file.buffer, vendor_url)
      console.log('✅ OCR processing completed:', ocrResult)

      // Update ticket with extracted data - use cleaned data
      const updateData = {
        status: 'processed',
        processing_status: 'completed',
        ...ocrResult.extractedData,
        comercio: ocrResult.extractedData.comercio || 'Unknown'
      }
      
      console.log('🔄 Updating ticket with OCR data:', updateData)
      const updatedTicket = await ticketStorageService.updateTicket(ticket.id, updateData)

      res.status(201).json({
        success: true,
        message: 'Ticket uploaded and processed successfully',
        data: {
          ticket_id: ticket.id,
          ticket: updatedTicket,
          upload: uploadResult,
          extracted_data: ocrResult.extractedData
        }
      })
    } catch (ocrError) {
      console.error('❌ OCR processing failed:', ocrError)
      
      // Create fallback data with basic information
      const fallbackData = {
        comercio: vendor_url.includes('walmart') ? 'Walmart' : 
                 vendor_url.includes('oxxo') ? 'Oxxo' :
                 vendor_url.includes('soriana') ? 'Soriana' :
                 vendor_url.includes('chedraui') ? 'Chedraui' :
                 vendor_url.includes('aurrera') ? 'Aurrera' : 'Unknown',
        mesa_folio: null,
        id_ticket: null,
        store_branch_plaza: null,
        payment_type: null,
        tc_number: null,
        ticket_id: ticket.id,
        fecha: null,
        total: null,
        register_station_terminal: null,
        card_last_4_digits: null,
        tr_number: null,
        fol_vta: null
      }
      
      // Update ticket with fallback data
      const updatedTicket = await ticketStorageService.updateTicket(ticket.id, {
        status: 'processed',
        processing_status: 'completed',
        ...fallbackData,
        error_message: `OCR failed: ${ocrError.message}`
      })

      res.status(201).json({
        success: true,
        message: 'Ticket uploaded successfully (OCR processing failed)',
        data: {
          ticket_id: ticket.id,
          ticket: updatedTicket,
          upload: uploadResult,
          extracted_data: fallbackData,
          ocr_error: ocrError.message
        }
      })
    }
  } catch (error) {
    next(error)
  }
})

/**
 * @route GET /api/v1/tickets
 * @desc Get user's tickets with pagination and filtering
 * @access Private
 */
router.get('/', authenticate, async (req, res, next) => {
  try {
    const {
      page = 1,
      limit = 20,
      status,
      processing_status,
      search,
      sortBy = 'created_at',
      sortOrder = 'desc'
    } = req.query

    const options = {
      page: parseInt(page),
      limit: parseInt(limit),
      status,
      processing_status,
      search,
      sortBy,
      sortOrder
    }

    const result = await ticketStorageService.getUserTickets(req.user.id, options)

    res.json({
      success: true,
      data: result
    })
  } catch (error) {
    next(error)
  }
})

/**
 * @route GET /api/v1/tickets/:id
 * @desc Get a specific ticket by ID
 * @access Private
 */
router.get('/:id', authenticate, async (req, res, next) => {
  try {
    const { id } = req.params

    if (!id) {
      throw new ValidationError('Ticket ID is required')
    }

    const ticket = await ticketStorageService.getTicketById(id, req.user.id)

    res.json({
      success: true,
      data: ticket
    })
  } catch (error) {
    next(error)
  }
})

/**
 * @route PUT /api/v1/tickets/:id
 * @desc Update a ticket
 * @access Private
 */
router.put('/:id', authenticate, async (req, res, next) => {
  try {
    const { id } = req.params
    const updateData = req.body

    if (!id) {
      throw new ValidationError('Ticket ID is required')
    }

    // Remove fields that shouldn't be updated directly
    delete updateData.id
    delete updateData.user_id
    delete updateData.created_at
    delete updateData.file_url
    delete updateData.file_name
    delete updateData.file_size
    delete updateData.file_type

    const ticket = await ticketStorageService.updateTicket(id, updateData)

    res.json({
      success: true,
      message: 'Ticket updated successfully',
      data: ticket
    })
  } catch (error) {
    next(error)
  }
})

/**
 * @route DELETE /api/v1/tickets/:id
 * @desc Delete a ticket and its file
 * @access Private
 */
router.delete('/:id', authenticate, async (req, res, next) => {
  try {
    const { id } = req.params

    if (!id) {
      throw new ValidationError('Ticket ID is required')
    }

    await ticketStorageService.deleteTicket(id, req.user.id)

    res.json({
      success: true,
      message: 'Ticket deleted successfully'
    })
  } catch (error) {
    next(error)
  }
})

/**
 * @route POST /api/v1/tickets/:id/process
 * @desc Process a ticket with OCR and data extraction
 * @access Private
 */
router.post('/:id/process', authenticate, async (req, res, next) => {
  try {
    const { id } = req.params

    if (!id) {
      throw new ValidationError('Ticket ID is required')
    }

    // Verify ticket belongs to user
    await ticketStorageService.getTicketById(id, req.user.id)

    const result = await ticketStorageService.processTicket(id)

    res.json({
      success: true,
      message: 'Ticket processing started',
      data: result
    })
  } catch (error) {
    next(error)
  }
})

/**
 * @route GET /api/v1/tickets/stats/overview
 * @desc Get ticket statistics for the user
 * @access Private
 */
router.get('/stats/overview', authenticate, async (req, res, next) => {
  try {
    const stats = await ticketStorageService.getTicketStats(req.user.id)

    res.json({
      success: true,
      data: stats
    })
  } catch (error) {
    next(error)
  }
})

/**
 * @route GET /api/v1/tickets/export
 * @desc Export tickets data (CSV/JSON)
 * @access Private
 */
router.get('/export', authenticate, async (req, res, next) => {
  try {
    const { format = 'json', status, processing_status } = req.query

    const options = {
      page: 1,
      limit: 10000, // Large limit for export
      status,
      processing_status
    }

    const result = await ticketStorageService.getUserTickets(req.user.id, options)

    if (format === 'csv') {
      // Convert to CSV format
      const csv = convertToCSV(result.tickets)
      res.setHeader('Content-Type', 'text/csv')
      res.setHeader('Content-Disposition', 'attachment; filename=tickets.csv')
      res.send(csv)
    } else {
      res.json({
        success: true,
        data: result.tickets
      })
    }
  } catch (error) {
    next(error)
  }
})

/**
 * Helper function to convert tickets to CSV
 */
function convertToCSV(tickets) {
  if (tickets.length === 0) return ''

  const headers = [
    'ID',
    'File Name',
    'Ticket Number',
    'Vendor Name',
    'Vendor RFC',
    'Total Amount',
    'Currency',
    'Issue Date',
    'Due Date',
    'Status',
    'Processing Status',
    'Created At',
    'Processed At'
  ]

  const rows = tickets.map(ticket => [
    ticket.id,
    ticket.file_name,
    ticket.ticket_number || '',
    ticket.vendor_name || '',
    ticket.vendor_rfc || '',
    ticket.total_amount || '',
    ticket.currency || '',
    ticket.issue_date || '',
    ticket.due_date || '',
    ticket.status,
    ticket.processing_status,
    ticket.created_at,
    ticket.processed_at || ''
  ])

  return [headers, ...rows].map(row => 
    row.map(field => `"${String(field).replace(/"/g, '""')}"`).join(',')
  ).join('\n')
}

export default router
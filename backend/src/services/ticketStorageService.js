import { createClient } from '@supabase/supabase-js'
import config from '../config/index.js'
import { v4 as uuidv4 } from 'uuid'
import path from 'path'

/**
 * Ticket Storage Service for handling invoice/factura file uploads and storage
 * Integrates with Supabase Storage and database
 */
class TicketStorageService {
  constructor() {
    this.supabase = createClient(
      config.supabase.url,
      config.supabase.serviceKey // Use service key for admin operations
    )
    this.bucketName = 'tickets' // Supabase storage bucket for tickets
  }

  /**
   * Initialize the storage bucket if it doesn't exist
   */
  async initializeBucket() {
    try {
      console.log('🔍 Checking if tickets bucket exists...')
      const { data, error } = await this.supabase.storage.getBucket(this.bucketName)
      
      // Check for bucket not found error (404 or specific error message)
      if (error && (error.statusCode === 404 || error.message?.includes('Bucket not found') || error.message?.includes('not found'))) {
        console.log('📦 Bucket not found, creating tickets storage bucket...')
        // Bucket doesn't exist, create it
        const { data: bucketData, error: bucketError } = await this.supabase.storage.createBucket(
          this.bucketName,
          {
            public: false, // Private bucket for security
            fileSizeLimit: 50 * 1024 * 1024, // 50MB limit
            allowedMimeTypes: [
              'image/jpeg',
              'image/png', 
              'image/jpg',
              'application/pdf',
              'image/webp'
            ]
          }
        )
        
        if (bucketError) {
          console.error('❌ Failed to create bucket:', bucketError)
          throw new Error(`Failed to create storage bucket: ${bucketError.message}`)
        }
        
        console.log('✅ Created tickets storage bucket successfully')
        return bucketData
      } else if (error) {
        console.error('❌ Error checking bucket:', error)
        throw new Error(`Failed to check storage bucket: ${error.message}`)
      }
      
      console.log('✅ Tickets storage bucket exists')
      return data
    } catch (error) {
      console.error('❌ Error initializing storage bucket:', error)
      throw error
    }
  }

  /**
   * Upload a ticket file to Supabase Storage
   * @param {Buffer} fileBuffer - File buffer
   * @param {string} fileName - Original file name
   * @param {string} mimeType - File MIME type
   * @param {string} userId - User ID
   * @returns {Object} Upload result with file URL and metadata
   */
  async uploadTicket(fileBuffer, fileName, mimeType, userId) {
    try {
      // Ensure bucket exists
      await this.initializeBucket()
      
      // Generate unique file path
      const fileExtension = path.extname(fileName)
      const uniqueFileName = `${userId}/${uuidv4()}${fileExtension}`
      
      // Upload file to Supabase Storage
      const { data, error } = await this.supabase.storage
        .from(this.bucketName)
        .upload(uniqueFileName, fileBuffer, {
          contentType: mimeType,
          cacheControl: '3600',
          upsert: false
        })
      
      if (error) {
        throw new Error(`Failed to upload file: ${error.message}`)
      }
      
      // Get public URL
      const { data: urlData } = this.supabase.storage
        .from(this.bucketName)
        .getPublicUrl(uniqueFileName)
      
      return {
        success: true,
        filePath: data.path,
        fileUrl: urlData.publicUrl,
        fileName: uniqueFileName,
        originalName: fileName,
        size: fileBuffer.length
      }
    } catch (error) {
      console.error('❌ Error uploading ticket:', error)
      throw error
    }
  }

  /**
   * Save ticket record to database
   * @param {Object} ticketData - Ticket data
   * @returns {Object} Created ticket record
   */
  async saveTicketRecord(ticketData) {
    try {
      const { data, error } = await this.supabase
        .from('tickets')
        .insert([{
          user_id: ticketData.userId,
          file_name: ticketData.fileName,
          file_size: ticketData.fileSize,
          file_type: ticketData.fileType,
          file_url: ticketData.fileUrl,
          status: ticketData.status || 'uploaded',
          processing_status: ticketData.processing_status || 'pending',
          // Only the specified fields
          mesa_folio: ticketData.mesaFolio || null,
          id_ticket: ticketData.idTicket || null,
          store_branch_plaza: ticketData.storeBranchPlaza || null,
          payment_type: ticketData.paymentType || null,
          tc_number: ticketData.tcNumber || null,
          ticket_id: ticketData.ticketId || null,
          fecha: ticketData.fecha || null,
          total: ticketData.total || null,
          register_station_terminal: ticketData.registerStationTerminal || null,
          card_last_4_digits: ticketData.cardLast4Digits || null,
          tr_number: ticketData.trNumber || null,
          fol_vta: ticketData.folVta || null,
          comercio: ticketData.comercio || null
        }])
        .select()
        .single()
      
      if (error) {
        throw new Error(`Failed to save ticket record: ${error.message}`)
      }
      
      return data
    } catch (error) {
      console.error('❌ Error saving ticket record:', error)
      throw error
    }
  }

  /**
   * Get tickets for a user with pagination and filtering
   * @param {string} userId - User ID
   * @param {Object} options - Query options
   * @returns {Object} Paginated tickets
   */
  async getUserTickets(userId, options = {}) {
    try {
      const {
        page = 1,
        limit = 20,
        status = null,
        processing_status = null,
        search = null,
        sortBy = 'created_at',
        sortOrder = 'desc'
      } = options
      
      let query = this.supabase
        .from('tickets')
        .select('*', { count: 'exact' })
        .eq('user_id', userId)
      
      // Apply filters
      if (status) {
        query = query.eq('status', status)
      }
      
      if (processing_status) {
        query = query.eq('processing_status', processing_status)
      }
      
      if (search) {
        query = query.or(`file_name.ilike.%${search}%,ticket_number.ilike.%${search}%,vendor_name.ilike.%${search}%`)
      }
      
      // Apply sorting
      query = query.order(sortBy, { ascending: sortOrder === 'asc' })
      
      // Apply pagination
      const from = (page - 1) * limit
      const to = from + limit - 1
      query = query.range(from, to)
      
      const { data, error, count } = await query
      
      if (error) {
        throw new Error(`Failed to fetch tickets: ${error.message}`)
      }
      
      // Debug: Log the first ticket to check if file_url is present
      if (data && data.length > 0) {
        console.log('🔍 First ticket data from getUserTickets:', JSON.stringify(data[0], null, 2))
        console.log('🔍 File URL present:', !!data[0].file_url)
      }
      
      return {
        tickets: data || [],
        pagination: {
          page,
          limit,
          total: count || 0,
          totalPages: Math.ceil((count || 0) / limit)
        }
      }
    } catch (error) {
      console.error('❌ Error fetching user tickets:', error)
      throw error
    }
  }

  /**
   * Get a specific ticket by ID
   * @param {string} ticketId - Ticket ID
   * @param {string} userId - User ID (for security)
   * @returns {Object} Ticket record
   */
  async getTicketById(ticketId, userId) {
    try {
      const { data, error } = await this.supabase
        .from('tickets')
        .select('*')
        .eq('id', ticketId)
        .eq('user_id', userId)
        .single()
      
      if (error) {
        if (error.code === 'PGRST116') {
          throw new Error('Ticket not found')
        }
        throw new Error(`Failed to fetch ticket: ${error.message}`)
      }
      
      return data
    } catch (error) {
      console.error('❌ Error fetching ticket:', error)
      throw error
    }
  }

  /**
   * Update ticket processing status and results
   * @param {string} ticketId - Ticket ID
   * @param {Object} updateData - Update data
   * @returns {Object} Updated ticket record
   */
  async updateTicket(ticketId, updateData) {
    try {
      const { data, error } = await this.supabase
        .from('tickets')
        .update({
          ...updateData,
          updated_at: new Date().toISOString()
        })
        .eq('id', ticketId)
        .select()
        .single()
      
      if (error) {
        throw new Error(`Failed to update ticket: ${error.message}`)
      }
      
      return data
    } catch (error) {
      console.error('❌ Error updating ticket:', error)
      throw error
    }
  }

  /**
   * Delete a ticket and its associated file
   * @param {string} ticketId - Ticket ID
   * @param {string} userId - User ID (for security)
   * @returns {boolean} Success status
   */
  async deleteTicket(ticketId, userId) {
    try {
      // First get the ticket to get file path
      const ticket = await this.getTicketById(ticketId, userId)
      
      // Delete file from storage
      if (ticket.file_url) {
        const filePath = ticket.file_url.split('/').pop() // Extract file path from URL
        const { error: storageError } = await this.supabase.storage
          .from(this.bucketName)
          .remove([filePath])
        
        if (storageError) {
          console.warn('⚠️ Failed to delete file from storage:', storageError.message)
        }
      }
      
      // Delete ticket record
      const { error } = await this.supabase
        .from('tickets')
        .delete()
        .eq('id', ticketId)
        .eq('user_id', userId)
      
      if (error) {
        throw new Error(`Failed to delete ticket: ${error.message}`)
      }
      
      return true
    } catch (error) {
      console.error('❌ Error deleting ticket:', error)
      throw error
    }
  }

  /**
   * Get ticket statistics for a user
   * @param {string} userId - User ID
   * @returns {Object} Ticket statistics
   */
  async getTicketStats(userId) {
    try {
      const { data, error } = await this.supabase
        .from('tickets')
        .select('status, processing_status, created_at')
        .eq('user_id', userId)
      
      if (error) {
        throw new Error(`Failed to fetch ticket stats: ${error.message}`)
      }
      
      const stats = {
        total: data.length,
        byStatus: {},
        byProcessingStatus: {},
        thisMonth: 0,
        thisWeek: 0
      }
      
      const now = new Date()
      const thisMonth = new Date(now.getFullYear(), now.getMonth(), 1)
      const thisWeek = new Date(now.setDate(now.getDate() - now.getDay()))
      
      data.forEach(ticket => {
        // Count by status
        stats.byStatus[ticket.status] = (stats.byStatus[ticket.status] || 0) + 1
        
        // Count by processing status
        stats.byProcessingStatus[ticket.processing_status] = (stats.byProcessingStatus[ticket.processing_status] || 0) + 1
        
        // Count recent tickets
        const ticketDate = new Date(ticket.created_at)
        if (ticketDate >= thisMonth) {
          stats.thisMonth++
        }
        if (ticketDate >= thisWeek) {
          stats.thisWeek++
        }
      })
      
      return stats
    } catch (error) {
      console.error('❌ Error fetching ticket stats:', error)
      throw error
    }
  }

  /**
   * Process uploaded ticket with OCR and data extraction
   * @param {string} ticketId - Ticket ID
   * @returns {Object} Processing result
   */
  async processTicket(ticketId) {
    try {
      // Update status to processing
      await this.updateTicket(ticketId, {
        status: 'processing',
        processing_status: 'ocr_processing'
      })
      
      // Get ticket details
      const ticket = await this.getTicketById(ticketId, null) // Admin access
      
      // TODO: Integrate with OCR service
      // This would call your existing OCR functionality
      const ocrResults = {
        extracted_text: 'Sample extracted text',
        confidence: 0.95,
        processing_time: 1.5
      }
      
      const extractedData = {
        ticket_number: 'TKT-2024-001',
        vendor_name: 'Sample Vendor',
        total_amount: 1500.00,
        issue_date: '2024-01-15'
      }
      
      // Update ticket with results
      const updatedTicket = await this.updateTicket(ticketId, {
        status: 'processed',
        processing_status: 'completed',
        ocr_results: ocrResults,
        extracted_data: extractedData,
        processed_at: new Date().toISOString()
      })
      
      return updatedTicket
    } catch (error) {
      // Update status to failed
      await this.updateTicket(ticketId, {
        status: 'failed',
        processing_status: 'error',
        error_message: error.message
      })
      
      console.error('❌ Error processing ticket:', error)
      throw error
    }
  }

  /**
   * Process ticket with OCR and extract ticket data
   * @param {string} ticketId - Ticket ID
   * @param {Buffer} fileBuffer - File buffer
   * @param {string} vendorUrl - Vendor URL for context
   * @returns {Object} OCR processing result
   */
  async processTicketWithOCR(ticketId, fileBuffer, vendorUrl) {
    try {
      console.log('🔄 Starting OCR processing for ticket:', ticketId)
      
      // Save file temporarily for OCR processing
      const fs = await import('fs')
      const path = await import('path')
      const os = await import('os')
      const { spawn } = await import('child_process')
      const { promisify } = await import('util')
      
      const tempDir = os.tmpdir()
      const tempFilePath = path.join(tempDir, `ticket_${ticketId}_${Date.now()}.jpg`)
      
      try {
        // Write buffer to temporary file
        fs.writeFileSync(tempFilePath, fileBuffer)
        console.log('📁 Temporary file created:', tempFilePath)
        
        // Call Python OCR script
        const pythonScript = path.join(process.cwd(), 'src', 'services', 'run_ocr.py')
        console.log('🐍 Calling Python OCR script:', pythonScript)
        
        const ocrResult = await new Promise((resolve, reject) => {
          const pythonProcess = spawn('python', [pythonScript, tempFilePath], {
            stdio: ['pipe', 'pipe', 'pipe']
          })
          
          let stdout = ''
          let stderr = ''
          
          pythonProcess.stdout.on('data', (data) => {
            stdout += data.toString()
          })
          
          pythonProcess.stderr.on('data', (data) => {
            stderr += data.toString()
          })
          
          pythonProcess.on('close', (code) => {
            if (code === 0) {
              try {
                const result = JSON.parse(stdout)
                resolve(result)
              } catch (parseError) {
                console.error('❌ Failed to parse OCR result:', parseError)
                console.error('Raw stdout:', stdout)
                reject(new Error(`Failed to parse OCR result: ${parseError.message}`))
              }
            } else {
              console.error('❌ Python OCR script failed with code:', code)
              console.error('Stderr:', stderr)
              reject(new Error(`OCR script failed with code ${code}: ${stderr}`))
            }
          })
          
          pythonProcess.on('error', (error) => {
            console.error('❌ Failed to start Python OCR script:', error)
            reject(new Error(`Failed to start OCR script: ${error.message}`))
          })
        })
        
        console.log('✅ OCR processing completed:', ocrResult)
        console.log('🔍 OCR result type:', typeof ocrResult)
        console.log('🔍 OCR result keys:', Object.keys(ocrResult || {}))
        
        // Extract and map the data to our database schema
        const extractedData = this.mapOCRDataToTicketFields(ocrResult, vendorUrl)
        
        // Validate and clean the extracted data before returning
        const cleanedData = this.validateAndCleanExtractedData(extractedData)
        
        return {
          success: true,
          extractedData: cleanedData,
          rawText: ocrResult.raw_text || ocrResult.Full_Raw_Text || '',
          confidence: ocrResult.confidence || 0.8
        }
      } finally {
        // Clean up temporary file
        try {
          if (fs.existsSync(tempFilePath)) {
            fs.unlinkSync(tempFilePath)
            console.log('🗑️ Temporary file cleaned up')
          }
        } catch (cleanupError) {
          console.warn('⚠️ Failed to clean up temporary file:', cleanupError.message)
        }
      }
    } catch (error) {
      console.error('❌ OCR processing error:', error)
      throw new Error(`OCR processing failed: ${error.message}`)
    }
  }

  /**
   * Map OCR result data to ticket database fields
   * @param {Object} ocrResult - OCR processing result
   * @param {string} vendorUrl - Vendor URL for context
   * @returns {Object} Mapped ticket data
   */
  mapOCRDataToTicketFields(ocrResult, vendorUrl) {
    console.log('🔍 OCR Result received:', JSON.stringify(ocrResult, null, 2))
    
    // Extract comercio from vendor URL or OCR data
    let comercio = 'Unknown'
    if (vendorUrl) {
      if (vendorUrl.includes('walmart')) comercio = 'Walmart'
      else if (vendorUrl.includes('oxxo')) comercio = 'Oxxo'
      else if (vendorUrl.includes('soriana')) comercio = 'Soriana'
      else if (vendorUrl.includes('chedraui')) comercio = 'Chedraui'
      else if (vendorUrl.includes('aurrera')) comercio = 'Aurrera'
      else if (vendorUrl.includes('bodega')) comercio = 'Bodega Aurrera'
    }
    
    // Use OCR data if available
    if (ocrResult.comercio || ocrResult.Comercio) {
      comercio = ocrResult.comercio || ocrResult.Comercio
    }

    // Map all possible field variations from OCR result
    const mappedData = {
      mesa_folio: ocrResult.mesa_folio || ocrResult.Mesa_Folio || ocrResult['Mesa_Folio'] || null,
      id_ticket: ocrResult.id_ticket || ocrResult.ID_Ticket || ocrResult['ID_Ticket'] || null,
      store_branch_plaza: ocrResult.store_branch_plaza || ocrResult['Store_Branch_Plaza'] || ocrResult.Store_Branch_Plaza || null,
      payment_type: ocrResult.payment_type || ocrResult['Payment_Type'] || ocrResult.Payment_Type || null,
      tc_number: ocrResult.tc_number || ocrResult['TC#'] || ocrResult['TC#'] || null,
      ticket_id: ocrResult.ticket_id || ocrResult.ID || ocrResult.id || null,
      fecha: ocrResult.fecha || ocrResult.Fecha || ocrResult.fecha || null,
      total: ocrResult.total || ocrResult.Total ? parseFloat(ocrResult.total || ocrResult.Total) : null,
      register_station_terminal: ocrResult.register_station_terminal || ocrResult['Register_Station_Terminal'] || ocrResult.Register_Station_Terminal || null,
      card_last_4_digits: ocrResult.card_last_4_digits || ocrResult['Card_Last_4_Digits'] || ocrResult.Card_Last_4_Digits || null,
      tr_number: ocrResult.tr_number || ocrResult['TR#'] || ocrResult['TR#'] || null,
      fol_vta: ocrResult.folio_venta || ocrResult['Fol_Vta'] || ocrResult.Fol_Vta || null,
      comercio: comercio
    }

    console.log('🔍 Mapped data:', JSON.stringify(mappedData, null, 2))
    return mappedData
  }

  /**
   * Validate and clean extracted data to prevent database errors
   * @param {Object} data - Extracted data
   * @returns {Object} Cleaned data
   */
  validateAndCleanExtractedData(data) {
    const cleaned = { ...data }
    
    // Validate and clean date
    if (cleaned.fecha) {
      try {
        // Check if fecha is a valid date string
        const date = new Date(cleaned.fecha)
        if (isNaN(date.getTime())) {
          console.warn('⚠️ Invalid date format, setting to null:', cleaned.fecha)
          cleaned.fecha = null
        } else {
          // Ensure date is in YYYY-MM-DD format
          cleaned.fecha = date.toISOString().split('T')[0]
          console.log('✅ Date validated and formatted:', cleaned.fecha)
        }
      } catch (error) {
        console.warn('⚠️ Date validation error, setting to null:', error.message)
        cleaned.fecha = null
      }
    }
    
    // Validate and clean total
    if (cleaned.total) {
      try {
        const total = parseFloat(cleaned.total)
        if (isNaN(total) || total < 0) {
          console.warn('⚠️ Invalid total amount, setting to null:', cleaned.total)
          cleaned.total = null
        } else {
          cleaned.total = total
        }
      } catch (error) {
        console.warn('⚠️ Total validation error, setting to null:', error.message)
        cleaned.total = null
      }
    }
    
    // Clean string fields - remove "N/A" and empty strings
    const stringFields = ['mesa_folio', 'id_ticket', 'store_branch_plaza', 'payment_type', 
                         'tc_number', 'ticket_id', 'register_station_terminal', 
                         'card_last_4_digits', 'tr_number', 'fol_vta', 'comercio']
    
    stringFields.forEach(field => {
      if (cleaned[field] === 'N/A' || cleaned[field] === '' || cleaned[field] === null) {
        cleaned[field] = null
      }
    })
    
    console.log('🔍 Cleaned data:', JSON.stringify(cleaned, null, 2))
    return cleaned
  }
}

export default new TicketStorageService()

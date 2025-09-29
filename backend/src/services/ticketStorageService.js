import { createClient } from '@supabase/supabase-js'
import config from '../config/index.js'
import { v4 as uuidv4 } from 'uuid'
import path from 'path'

class TicketStorageService {
  constructor() {
    this.supabase = createClient(
      config.supabase.url,
      config.supabase.serviceKey
    )
    this.bucketName = 'tickets'
  }

  async initializeBucket() {
    try {
      const { data, error } = await this.supabase.storage.getBucket(this.bucketName)

      if (error && (error.statusCode === 404 || error.message?.includes('not found'))) {
        const { data: bucketData, error: bucketError } = await this.supabase.storage.createBucket(this.bucketName, {
          public: false,
          fileSizeLimit: 50 * 1024 * 1024,
          allowedMimeTypes: ['image/jpeg', 'image/png', 'image/jpg', 'application/pdf', 'image/webp']
        })

        if (bucketError) {
          throw new Error(`Failed to create storage bucket: ${bucketError.message}`)
        }

        return bucketData
      } else if (error) {
        throw new Error(`Failed to check storage bucket: ${error.message}`)
      }

      return data
    } catch (error) {
      console.error('❌ Error initializing storage bucket:', error)
      throw error
    }
  }

  async uploadTicket(fileBuffer, fileName, mimeType, userId) {
    try {
      await this.initializeBucket()

      const fileExtension = path.extname(fileName)
      const uniqueFileName = `${userId}/${uuidv4()}${fileExtension}`

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

      if (status) {
        query = query.eq('status', status)
      }

      if (processing_status) {
        query = query.eq('processing_status', processing_status)
      }

      if (search) {
        query = query.or(`file_name.ilike.%${search}%,ticket_id.ilike.%${search}%,comercio.ilike.%${search}%`)
      }

      query = query.order(sortBy, { ascending: sortOrder === 'asc' })

      const from = (page - 1) * limit
      const to = from + limit - 1
      query = query.range(from, to)

      const { data, error, count } = await query

      if (error) {
        throw new Error(`Failed to fetch tickets: ${error.message}`)
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

  async getTicketById(ticketId, userId) {
    try {
      const query = this.supabase
        .from('tickets')
        .select('*')
        .eq('id', ticketId)

      if (userId) {
        query.eq('user_id', userId)
      }

      const { data, error } = await query.single()

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

  async deleteTicket(ticketId, userId) {
    try {
      const ticket = await this.getTicketById(ticketId, userId)

      if (ticket.file_url) {
        const filePath = ticket.file_url.replace(/^.*\/storage\/v1\/object\/public\/tickets\//, '')
        const { error: storageError } = await this.supabase.storage
          .from(this.bucketName)
          .remove([filePath])

        if (storageError) {
          console.warn('⚠️ Failed to delete file from storage:', storageError.message)
        }
      }

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
      const thisWeek = new Date(now)
      thisWeek.setDate(now.getDate() - now.getDay())

      data.forEach(ticket => {
        stats.byStatus[ticket.status] = (stats.byStatus[ticket.status] || 0) + 1
        stats.byProcessingStatus[ticket.processing_status] = (stats.byProcessingStatus[ticket.processing_status] || 0) + 1

        const ticketDate = new Date(ticket.created_at)
        if (ticketDate >= thisMonth) stats.thisMonth++
        if (ticketDate >= thisWeek) stats.thisWeek++
      })

      return stats
    } catch (error) {
      console.error('❌ Error fetching ticket stats:', error)
      throw error
    }
  }

  async processTicket(ticketId) {
    try {
      await this.updateTicket(ticketId, {
        status: 'processing',
        processing_status: 'ocr_processing'
      })

      const ticket = await this.getTicketById(ticketId, null)

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

      const updatedTicket = await this.updateTicket(ticketId, {
        status: 'processed',
        processing_status: 'completed',
        ocr_results: ocrResults,
        extracted_data: extractedData,
        processed_at: new Date().toISOString()
      })

      return updatedTicket
    } catch (error) {
      await this.updateTicket(ticketId, {
        status: 'failed',
        processing_status: 'error',
        error_message: error.message
      })

      console.error('❌ Error processing ticket:', error)
      throw error
    }
  }

  async processTicketWithOCR(ticketId, fileBuffer, vendorUrl) {
    try {
      const fs = await import('fs')
      const pathModule = await import('path')
      const os = await import('os')
      const { spawn } = await import('child_process')

      const tempDir = os.tmpdir()
      const tempFilePath = pathModule.join(tempDir, `ticket_${ticketId}_${Date.now()}.jpg`)

      try {
        fs.writeFileSync(tempFilePath, fileBuffer)

        const pythonScript = pathModule.join(process.cwd(), 'src', 'services', 'run_ocr.py')

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
                reject(new Error(`Failed to parse OCR result: ${parseError.message}`))
              }
            } else {
              reject(new Error(`OCR script failed with code ${code}: ${stderr}`))
            }
          })

          pythonProcess.on('error', (error) => {
            reject(new Error(`Failed to start OCR script: ${error.message}`))
          })
        })

        const extractedData = this.mapOCRDataToTicketFields(ocrResult, vendorUrl)
        const cleanedData = this.validateAndCleanExtractedData(extractedData)

        return {
          success: true,
          extractedData: cleanedData,
          rawText: ocrResult.raw_text || ocrResult.Full_Raw_Text || '',
          confidence: ocrResult.confidence || 0.8
        }
      } finally {
        try {
          if (fs.existsSync(tempFilePath)) {
            fs.unlinkSync(tempFilePath)
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

  mapOCRDataToTicketFields(ocrResult, vendorUrl) {
    let comercio = 'Unknown'
    if (vendorUrl) {
      if (vendorUrl.includes('walmart')) comercio = 'Walmart'
      else if (vendorUrl.includes('oxxo')) comercio = 'Oxxo'
      else if (vendorUrl.includes('soriana')) comercio = 'Soriana'
      else if (vendorUrl.includes('chedraui')) comercio = 'Chedraui'
      else if (vendorUrl.includes('aurrera')) comercio = 'Aurrera'
      else if (vendorUrl.includes('bodega')) comercio = 'Bodega Aurrera'
    }

    if (ocrResult.comercio || ocrResult.Comercio) {
      comercio = ocrResult.comercio || ocrResult.Comercio
    }

    return {
      // Core fields
      mesa_folio: ocrResult.mesa_folio || ocrResult.Mesa_Folio || ocrResult['Mesa_Folio'] || null,
      id_ticket: ocrResult.id_ticket || ocrResult.ID_Ticket || ocrResult['ID_Ticket'] || null,
      store_branch_plaza: ocrResult.store_branch_plaza || ocrResult['Store_Branch_Plaza'] || ocrResult.Store_Branch_Plaza || null,
      payment_type: ocrResult.payment_type || ocrResult['Payment_Type'] || ocrResult.Payment_Type || null,
      tc_number: ocrResult.tc_number || ocrResult['TC#'] || ocrResult['TC#'] || null,
      ticket_id: ocrResult.ticket_id || ocrResult.ID || ocrResult.id || null,
      fecha: ocrResult.fecha || ocrResult.Fecha || null,
      total: ocrResult.total || ocrResult.Total ? parseFloat(ocrResult.total || ocrResult.Total) : null,
      register_station_terminal: ocrResult.register_station_terminal || ocrResult['Register_Station_Terminal'] || ocrResult.Register_Station_Terminal || null,
      card_last_4_digits: ocrResult.card_last_4_digits || ocrResult['Card_Last_4_Digits'] || ocrResult.Card_Last_4_Digits || null,
      tr_number: ocrResult.tr_number || ocrResult['TR#'] || ocrResult['TR#'] || null,
      fol_vta: ocrResult.folio_venta || ocrResult['Fol_Vta'] || ocrResult.Fol_Vta || null,
      comercio,
      
      // Confidence scores (preserve all)
      mesa_folio_confidence: ocrResult.mesa_folio_confidence || ocrResult.Mesa_Folio_Confidence || null,
      id_ticket_confidence: ocrResult.id_ticket_confidence || ocrResult.ID_Ticket_Confidence || null,
      store_branch_plaza_confidence: ocrResult.store_branch_plaza_confidence || ocrResult.Store_Branch_Plaza_Confidence || null,
      payment_type_confidence: ocrResult.payment_type_confidence || ocrResult.Payment_Type_Confidence || null,
      tc_number_confidence: ocrResult.tc_number_confidence || ocrResult['TC#_Confidence'] || null,
      ticket_id_confidence: ocrResult.ticket_id_confidence || ocrResult.ID_Confidence || null,
      fecha_confidence: ocrResult.fecha_confidence || ocrResult.Fecha_Confidence || null,
      total_confidence: ocrResult.total_confidence || ocrResult.Total_Confidence || null,
      register_station_terminal_confidence: ocrResult.register_station_terminal_confidence || ocrResult.Register_Station_Terminal_Confidence || null,
      card_last_4_digits_confidence: ocrResult.card_last_4_digits_confidence || ocrResult.Card_Last_4_Digits_Confidence || null,
      tr_number_confidence: ocrResult.tr_number_confidence || ocrResult['TR#_Confidence'] || null,
      fol_vta_confidence: ocrResult.folio_venta_confidence || ocrResult.Fol_Vta_Confidence || null,
      comercio_confidence: ocrResult.comercio_confidence || ocrResult.Comercio_Confidence || null,
      
      // Alternative capitalized confidence field names for frontend compatibility
      Mesa_Folio_Confidence: ocrResult.Mesa_Folio_Confidence || ocrResult.mesa_folio_confidence || null,
      ID_Ticket_Confidence: ocrResult.ID_Ticket_Confidence || ocrResult.id_ticket_confidence || null,
      Store_Branch_Plaza_Confidence: ocrResult.Store_Branch_Plaza_Confidence || ocrResult.store_branch_plaza_confidence || null,
      Payment_Type_Confidence: ocrResult.Payment_Type_Confidence || ocrResult.payment_type_confidence || null,
      'TC#_Confidence': ocrResult['TC#_Confidence'] || ocrResult.tc_number_confidence || null,
      ID_Confidence: ocrResult.ID_Confidence || ocrResult.ticket_id_confidence || null,
      Fecha_Confidence: ocrResult.Fecha_Confidence || ocrResult.fecha_confidence || null,
      Total_Confidence: ocrResult.Total_Confidence || ocrResult.total_confidence || null,
      Register_Station_Terminal_Confidence: ocrResult.Register_Station_Terminal_Confidence || ocrResult.register_station_terminal_confidence || null,
      Card_Last_4_Digits_Confidence: ocrResult.Card_Last_4_Digits_Confidence || ocrResult.card_last_4_digits_confidence || null,
      'TR#_Confidence': ocrResult['TR#_Confidence'] || ocrResult.tr_number_confidence || null,
      Fol_Vta_Confidence: ocrResult.Fol_Vta_Confidence || ocrResult.folio_venta_confidence || null,
      Comercio_Confidence: ocrResult.Comercio_Confidence || ocrResult.comercio_confidence || null,
      
      // Alternative capitalized field names for frontend compatibility
      Mesa_Folio: ocrResult.Mesa_Folio || ocrResult.mesa_folio || null,
      ID_Ticket: ocrResult.ID_Ticket || ocrResult.id_ticket || null,
      Store_Branch_Plaza: ocrResult.Store_Branch_Plaza || ocrResult.store_branch_plaza || null,
      Payment_Type: ocrResult.Payment_Type || ocrResult.payment_type || null,
      'TC#': ocrResult['TC#'] || ocrResult.tc_number || null,
      ID: ocrResult.ID || ocrResult.id || ocrResult.ticket_id || null,
      Fecha: ocrResult.Fecha || ocrResult.fecha || null,
      Total: ocrResult.Total || ocrResult.total || null,
      Register_Station_Terminal: ocrResult.Register_Station_Terminal || ocrResult.register_station_terminal || null,
      Card_Last_4_Digits: ocrResult.Card_Last_4_Digits || ocrResult.card_last_4_digits || null,
      'TR#': ocrResult['TR#'] || ocrResult.tr_number || null,
      Fol_Vta: ocrResult.Fol_Vta || ocrResult.folio_venta || null,
      Comercio: comercio,
      
      // Raw text and metadata
      raw_text: ocrResult.raw_text || ocrResult.Full_Raw_Text || ocrResult.full_text || '',
      Full_Raw_Text: ocrResult.Full_Raw_Text || ocrResult.raw_text || ocrResult.full_text || '',
      vendor_type: ocrResult.vendor_type || null,
      extraction_method: ocrResult.extraction_method || null,
      overall_document_confidence: ocrResult.overall_document_confidence || null,
      total_confidence_sources: ocrResult.total_confidence_sources || null,
      confidence_breakdown: ocrResult.confidence_breakdown || null
    }
  }

  validateAndCleanExtractedData(data) {
    const cleaned = { ...data }

    if (cleaned.fecha) {
      try {
        const date = new Date(cleaned.fecha)
        if (isNaN(date.getTime())) {
          cleaned.fecha = null
        } else {
          cleaned.fecha = date.toISOString().split('T')[0]
        }
      } catch (error) {
        cleaned.fecha = null
      }
    }

    if (cleaned.total) {
      try {
        const total = parseFloat(cleaned.total)
        if (isNaN(total) || total < 0) {
          cleaned.total = null
        } else {
          cleaned.total = total
        }
      } catch (error) {
        cleaned.total = null
      }
    }

    const stringFields = ['mesa_folio', 'id_ticket', 'store_branch_plaza', 'payment_type', 'tc_number', 'ticket_id', 'register_station_terminal', 'card_last_4_digits', 'tr_number', 'fol_vta', 'comercio']

    stringFields.forEach(field => {
      if (cleaned[field] === 'N/A' || cleaned[field] === '') {
        cleaned[field] = null
      }
    })

    return cleaned
  }
}

export default new TicketStorageService()

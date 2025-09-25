import { supabase } from './supabase'

export interface Ticket {
  id: string
  user_id: string
  file_name: string
  file_size: number
  file_type: string
  file_url: string
  status: 'uploaded' | 'processing' | 'processed' | 'failed' | 'archived'
  processing_status: 'pending' | 'ocr_processing' | 'data_extraction' | 'validation' | 'completed' | 'error'
  created_at: string
  // Form fields
  mesa_folio?: string
  id_ticket?: string
  store_branch_plaza?: string
  payment_type?: string
  tc_number?: string
  ticket_id?: string
  fecha?: string
  total?: number
  register_station_terminal?: string
  card_last_4_digits?: string
  tr_number?: string
  fol_vta?: string
  comercio?: string
}

export interface TicketUploadData {
  file: File
  taskId?: string
  // Only the specified fields
  mesaFolio?: string
  idTicket?: string
  storeBranchPlaza?: string
  paymentType?: string
  tcNumber?: string
  ticketId?: string
  fecha?: string
  total?: number
  registerStationTerminal?: string
  cardLast4Digits?: string
  trNumber?: string
  folVta?: string
  comercio?: string
}

export interface TicketFilters {
  page?: number
  limit?: number
  status?: string
  processing_status?: string
  search?: string
  sortBy?: string
  sortOrder?: 'asc' | 'desc'
}

export interface TicketStats {
  total: number
  byStatus: Record<string, number>
  byProcessingStatus: Record<string, number>
  thisMonth: number
  thisWeek: number
}

export interface PaginatedTickets {
  tickets: Ticket[]
  pagination: {
    page: number
    limit: number
    total: number
    totalPages: number
  }
}

class TicketService {
  private baseUrl = process.env.NEXT_PUBLIC_API_BASE_URL || 'http://localhost:8000'

  private async getAuthHeaders() {
    const token = localStorage.getItem('token')
    return {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`
    }
  }

  private async getAuthHeadersForUpload() {
    const token = localStorage.getItem('token')
    return {
      'Authorization': `Bearer ${token}`
    }
  }

  /**
   * Upload a new ticket file
   */
  async uploadTicket(data: TicketUploadData): Promise<{ ticket: Ticket; upload: any }> {
    try {
      const formData = new FormData()
      formData.append('file', data.file)
      
      if (data.taskId) formData.append('taskId', data.taskId)
      if (data.ticketNumber) formData.append('ticketNumber', data.ticketNumber)
      if (data.vendorName) formData.append('vendorName', data.vendorName)
      if (data.vendorRfc) formData.append('vendorRfc', data.vendorRfc)
      if (data.totalAmount) formData.append('totalAmount', data.totalAmount.toString())
      if (data.currency) formData.append('currency', data.currency)
      if (data.issueDate) formData.append('issueDate', data.issueDate)
      if (data.dueDate) formData.append('dueDate', data.dueDate)

      const response = await fetch(`${this.baseUrl}/api/v1/tickets/upload`, {
        method: 'POST',
        headers: await this.getAuthHeadersForUpload(),
        body: formData
      })

      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.error || 'Failed to upload ticket')
      }

      const result = await response.json()
      return result.data
    } catch (error) {
      console.error('Error uploading ticket:', error)
      throw error
    }
  }

  /**
   * Get user's tickets with pagination and filtering
   */
  async getTickets(filters: TicketFilters = {}): Promise<PaginatedTickets> {
    try {
      const params = new URLSearchParams()
      
      if (filters.page) params.append('page', filters.page.toString())
      if (filters.limit) params.append('limit', filters.limit.toString())
      if (filters.status) params.append('status', filters.status)
      if (filters.processing_status) params.append('processing_status', filters.processing_status)
      if (filters.search) params.append('search', filters.search)
      if (filters.sortBy) params.append('sortBy', filters.sortBy)
      if (filters.sortOrder) params.append('sortOrder', filters.sortOrder)

      const response = await fetch(`${this.baseUrl}/api/v1/tickets?${params}`, {
        method: 'GET',
        headers: await this.getAuthHeaders()
      })

      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.error || 'Failed to fetch tickets')
      }

      const result = await response.json()
      return result.data
    } catch (error) {
      console.error('Error fetching tickets:', error)
      throw error
    }
  }

  /**
   * Get a specific ticket by ID
   */
  async getTicketById(id: string): Promise<Ticket> {
    try {
      const response = await fetch(`${this.baseUrl}/api/v1/tickets/${id}`, {
        method: 'GET',
        headers: await this.getAuthHeaders()
      })

      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.error || 'Failed to fetch ticket')
      }

      const result = await response.json()
      return result.data
    } catch (error) {
      console.error('Error fetching ticket:', error)
      throw error
    }
  }

  /**
   * Update a ticket
   */
  async updateTicket(id: string, data: Partial<Ticket>): Promise<Ticket> {
    try {
      const response = await fetch(`${this.baseUrl}/api/v1/tickets/${id}`, {
        method: 'PUT',
        headers: await this.getAuthHeaders(),
        body: JSON.stringify(data)
      })

      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.error || 'Failed to update ticket')
      }

      const result = await response.json()
      return result.data
    } catch (error) {
      console.error('Error updating ticket:', error)
      throw error
    }
  }

  /**
   * Delete a ticket
   */
  async deleteTicket(id: string): Promise<void> {
    try {
      const response = await fetch(`${this.baseUrl}/api/v1/tickets/${id}`, {
        method: 'DELETE',
        headers: await this.getAuthHeaders()
      })

      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.error || 'Failed to delete ticket')
      }
    } catch (error) {
      console.error('Error deleting ticket:', error)
      throw error
    }
  }

  /**
   * Process a ticket with OCR and data extraction
   */
  async processTicket(id: string): Promise<Ticket> {
    try {
      const response = await fetch(`${this.baseUrl}/api/v1/tickets/${id}/process`, {
        method: 'POST',
        headers: await this.getAuthHeaders()
      })

      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.error || 'Failed to process ticket')
      }

      const result = await response.json()
      return result.data
    } catch (error) {
      console.error('Error processing ticket:', error)
      throw error
    }
  }

  /**
   * Get ticket statistics
   */
  async getTicketStats(): Promise<TicketStats> {
    try {
      const response = await fetch(`${this.baseUrl}/api/v1/tickets/stats/overview`, {
        method: 'GET',
        headers: await this.getAuthHeaders()
      })

      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.error || 'Failed to fetch ticket stats')
      }

      const result = await response.json()
      return result.data
    } catch (error) {
      console.error('Error fetching ticket stats:', error)
      throw error
    }
  }

  /**
   * Export tickets data
   */
  async exportTickets(format: 'json' | 'csv' = 'json', filters: Partial<TicketFilters> = {}): Promise<any> {
    try {
      const params = new URLSearchParams()
      params.append('format', format)
      
      if (filters.status) params.append('status', filters.status)
      if (filters.processing_status) params.append('processing_status', filters.processing_status)

      const response = await fetch(`${this.baseUrl}/api/v1/tickets/export?${params}`, {
        method: 'GET',
        headers: await this.getAuthHeaders()
      })

      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.error || 'Failed to export tickets')
      }

      if (format === 'csv') {
        return await response.text()
      } else {
        return await response.json()
      }
    } catch (error) {
      console.error('Error exporting tickets:', error)
      throw error
    }
  }

  /**
   * Download ticket file
   */
  async downloadTicketFile(ticket: Ticket): Promise<void> {
    try {
      const response = await fetch(ticket.file_url)
      const blob = await response.blob()
      
      const url = window.URL.createObjectURL(blob)
      const link = document.createElement('a')
      link.href = url
      link.download = ticket.file_name
      document.body.appendChild(link)
      link.click()
      document.body.removeChild(link)
      window.URL.revokeObjectURL(url)
    } catch (error) {
      console.error('Error downloading ticket file:', error)
      throw error
    }
  }

  /**
   * Get file preview URL for images
   */
  getFilePreviewUrl(ticket: Ticket): string | null {
    const imageTypes = ['image/jpeg', 'image/png', 'image/jpg', 'image/webp']
    if (imageTypes.includes(ticket.file_type)) {
      return ticket.file_url
    }
    return null
  }

  /**
   * Format file size for display
   */
  formatFileSize(bytes: number): string {
    if (bytes === 0) return '0 Bytes'
    
    const k = 1024
    const sizes = ['Bytes', 'KB', 'MB', 'GB']
    const i = Math.floor(Math.log(bytes) / Math.log(k))
    
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i]
  }

  /**
   * Format currency amount
   */
  formatCurrency(amount: number, currency: string = 'MXN'): string {
    return new Intl.NumberFormat('es-MX', {
      style: 'currency',
      currency: currency
    }).format(amount)
  }

  /**
   * Format date for display
   */
  formatDate(dateString: string): string {
    return new Date(dateString).toLocaleDateString('es-MX', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    })
  }

  /**
   * Get status badge color
   */
  getStatusColor(status: string): string {
    const colors: Record<string, string> = {
      uploaded: 'bg-blue-100 text-blue-800',
      processing: 'bg-yellow-100 text-yellow-800',
      processed: 'bg-green-100 text-green-800',
      failed: 'bg-red-100 text-red-800',
      archived: 'bg-gray-100 text-gray-800'
    }
    return colors[status] || 'bg-gray-100 text-gray-800'
  }

  /**
   * Get processing status badge color
   */
  getProcessingStatusColor(status: string): string {
    const colors: Record<string, string> = {
      pending: 'bg-gray-100 text-gray-800',
      ocr_processing: 'bg-blue-100 text-blue-800',
      data_extraction: 'bg-purple-100 text-purple-800',
      validation: 'bg-yellow-100 text-yellow-800',
      completed: 'bg-green-100 text-green-800',
      error: 'bg-red-100 text-red-800'
    }
    return colors[status] || 'bg-gray-100 text-gray-800'
  }
}

export const ticketService = new TicketService()

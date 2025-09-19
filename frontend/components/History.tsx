'use client'

import React, { useState, useEffect } from 'react'
import { ticketService, Ticket, TicketFilters, TicketStats } from '../services/ticketService'
import { Button } from './ui/button'
import { Input } from './ui/input'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from './ui/select'
import { Badge } from './ui/badge'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from './ui/card'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from './ui/table'
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from './ui/dialog'
import { Tabs, TabsContent, TabsList, TabsTrigger } from './ui/tabs'
import { 
  Upload, 
  Search, 
  Filter, 
  Download, 
  Eye, 
  Trash2, 
  RefreshCw, 
  FileText, 
  Image as ImageIcon,
  Calendar,
  DollarSign,
  Building2,
  Hash,
  AlertCircle,
  CheckCircle,
  Clock,
  XCircle
} from 'lucide-react'
import { toast } from 'react-hot-toast'

interface HistoryProps {
  onUploadClick?: () => void
}

export default function History({ onUploadClick }: HistoryProps) {
  const [tickets, setTickets] = useState<Ticket[]>([])
  const [stats, setStats] = useState<TicketStats | null>(null)
  const [loading, setLoading] = useState(true)
  const [selectedTicket, setSelectedTicket] = useState<Ticket | null>(null)
  const [filters, setFilters] = useState<TicketFilters>({
    page: 1,
    limit: 20,
    sortBy: 'created_at',
    sortOrder: 'desc'
  })
  const [pagination, setPagination] = useState({
    page: 1,
    limit: 20,
    total: 0,
    totalPages: 0
  })

  // Load tickets and stats
  useEffect(() => {
    loadTickets()
    loadStats()
  }, [filters])

  const loadTickets = async () => {
    try {
      setLoading(true)
      const result = await ticketService.getTickets(filters)
      setTickets(result.tickets)
      setPagination(result.pagination)
    } catch (error) {
      console.error('Error loading tickets:', error)
      toast.error('Error al cargar los tickets')
    } finally {
      setLoading(false)
    }
  }

  const loadStats = async () => {
    try {
      const statsData = await ticketService.getTicketStats()
      setStats(statsData)
    } catch (error) {
      console.error('Error loading stats:', error)
    }
  }

  const handleFilterChange = (key: string, value: any) => {
    setFilters(prev => ({
      ...prev,
      [key]: value,
      page: 1 // Reset to first page when filtering
    }))
  }

  const handlePageChange = (page: number) => {
    setFilters(prev => ({ ...prev, page }))
  }

  const handleDeleteTicket = async (ticketId: string) => {
    if (!confirm('¿Estás seguro de que quieres eliminar este ticket?')) return

    try {
      await ticketService.deleteTicket(ticketId)
      toast.success('Ticket eliminado correctamente')
      loadTickets()
      loadStats()
    } catch (error) {
      console.error('Error deleting ticket:', error)
      toast.error('Error al eliminar el ticket')
    }
  }

  const handleProcessTicket = async (ticketId: string) => {
    try {
      await ticketService.processTicket(ticketId)
      toast.success('Procesamiento iniciado')
      loadTickets()
    } catch (error) {
      console.error('Error processing ticket:', error)
      toast.error('Error al procesar el ticket')
    }
  }

  const handleDownloadFile = async (ticket: Ticket) => {
    try {
      await ticketService.downloadTicketFile(ticket)
    } catch (error) {
      console.error('Error downloading file:', error)
      toast.error('Error al descargar el archivo')
    }
  }

  const handleExport = async (format: 'json' | 'csv') => {
    try {
      const data = await ticketService.exportTickets(format, filters)
      
      if (format === 'csv') {
        const blob = new Blob([data], { type: 'text/csv' })
        const url = window.URL.createObjectURL(blob)
        const link = document.createElement('a')
        link.href = url
        link.download = 'tickets.csv'
        link.click()
        window.URL.revokeObjectURL(url)
      } else {
        const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' })
        const url = window.URL.createObjectURL(blob)
        const link = document.createElement('a')
        link.href = url
        link.download = 'tickets.json'
        link.click()
        window.URL.revokeObjectURL(url)
      }
      
      toast.success(`Datos exportados en formato ${format.toUpperCase()}`)
    } catch (error) {
      console.error('Error exporting data:', error)
      toast.error('Error al exportar los datos')
    }
  }

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'uploaded': return <Clock className="h-4 w-4" />
      case 'processing': return <RefreshCw className="h-4 w-4" />
      case 'processed': return <CheckCircle className="h-4 w-4" />
      case 'failed': return <XCircle className="h-4 w-4" />
      case 'archived': return <FileText className="h-4 w-4" />
      default: return <AlertCircle className="h-4 w-4" />
    }
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Historial de Tickets</h1>
          <p className="text-gray-600">Gestiona y revisa todos tus tickets de facturación</p>
        </div>
        <div className="flex gap-2">
          <Button onClick={() => handleExport('csv')} variant="outline">
            <Download className="h-4 w-4 mr-2" />
            Exportar CSV
          </Button>
          <Button onClick={() => handleExport('json')} variant="outline">
            <Download className="h-4 w-4 mr-2" />
            Exportar JSON
          </Button>
          <Button onClick={onUploadClick}>
            <Upload className="h-4 w-4 mr-2" />
            Subir Ticket
          </Button>
        </div>
      </div>

      {/* Stats Cards */}
      {stats && (
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Tickets</CardTitle>
              <FileText className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.total}</div>
              <p className="text-xs text-muted-foreground">
                {stats.thisMonth} este mes
              </p>
            </CardContent>
          </Card>
          
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Procesados</CardTitle>
              <CheckCircle className="h-4 w-4 text-green-600" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-green-600">
                {stats.byStatus.processed || 0}
              </div>
              <p className="text-xs text-muted-foreground">
                {stats.byProcessingStatus.completed || 0} completados
              </p>
            </CardContent>
          </Card>
          
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">En Proceso</CardTitle>
              <RefreshCw className="h-4 w-4 text-yellow-600" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-yellow-600">
                {stats.byStatus.processing || 0}
              </div>
              <p className="text-xs text-muted-foreground">
                {stats.byProcessingStatus.ocr_processing || 0} en OCR
              </p>
            </CardContent>
          </Card>
          
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Fallidos</CardTitle>
              <XCircle className="h-4 w-4 text-red-600" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-red-600">
                {stats.byStatus.failed || 0}
              </div>
              <p className="text-xs text-muted-foreground">
                Requieren atención
              </p>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Filters */}
      <Card>
        <CardHeader>
          <CardTitle>Filtros</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div>
              <label className="text-sm font-medium">Buscar</label>
              <Input
                placeholder="Buscar por nombre, número..."
                value={filters.search || ''}
                onChange={(e) => handleFilterChange('search', e.target.value)}
              />
            </div>
            
            <div>
              <label className="text-sm font-medium">Estado</label>
              <Select
                value={filters.status || ''}
                onValueChange={(value) => handleFilterChange('status', value || null)}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Todos los estados" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="">Todos los estados</SelectItem>
                  <SelectItem value="uploaded">Subido</SelectItem>
                  <SelectItem value="processing">Procesando</SelectItem>
                  <SelectItem value="processed">Procesado</SelectItem>
                  <SelectItem value="failed">Fallido</SelectItem>
                  <SelectItem value="archived">Archivado</SelectItem>
                </SelectContent>
              </Select>
            </div>
            
            <div>
              <label className="text-sm font-medium">Estado de Procesamiento</label>
              <Select
                value={filters.processing_status || ''}
                onValueChange={(value) => handleFilterChange('processing_status', value || null)}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Todos los estados" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="">Todos los estados</SelectItem>
                  <SelectItem value="pending">Pendiente</SelectItem>
                  <SelectItem value="ocr_processing">Procesando OCR</SelectItem>
                  <SelectItem value="data_extraction">Extrayendo Datos</SelectItem>
                  <SelectItem value="validation">Validando</SelectItem>
                  <SelectItem value="completed">Completado</SelectItem>
                  <SelectItem value="error">Error</SelectItem>
                </SelectContent>
              </Select>
            </div>
            
            <div>
              <label className="text-sm font-medium">Ordenar por</label>
              <Select
                value={`${filters.sortBy}-${filters.sortOrder}`}
                onValueChange={(value) => {
                  const [sortBy, sortOrder] = value.split('-')
                  handleFilterChange('sortBy', sortBy)
                  handleFilterChange('sortOrder', sortOrder)
                }}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Ordenar por" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="created_at-desc">Más recientes</SelectItem>
                  <SelectItem value="created_at-asc">Más antiguos</SelectItem>
                  <SelectItem value="file_name-asc">Nombre A-Z</SelectItem>
                  <SelectItem value="file_name-desc">Nombre Z-A</SelectItem>
                  <SelectItem value="total_amount-desc">Mayor monto</SelectItem>
                  <SelectItem value="total_amount-asc">Menor monto</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Tickets Table */}
      <Card>
        <CardHeader>
          <CardTitle>Tickets ({pagination.total})</CardTitle>
          <CardDescription>
            Mostrando {tickets.length} de {pagination.total} tickets
          </CardDescription>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="flex items-center justify-center py-8">
              <RefreshCw className="h-6 w-6 animate-spin" />
              <span className="ml-2">Cargando tickets...</span>
            </div>
          ) : tickets.length === 0 ? (
            <div className="text-center py-8">
              <FileText className="h-12 w-12 text-gray-400 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-gray-900 mb-2">No hay tickets</h3>
              <p className="text-gray-500 mb-4">Comienza subiendo tu primer ticket</p>
              <Button onClick={onUploadClick}>
                <Upload className="h-4 w-4 mr-2" />
                Subir Ticket
              </Button>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Archivo</TableHead>
                    <TableHead>Número de Ticket</TableHead>
                    <TableHead>Proveedor</TableHead>
                    <TableHead>Monto</TableHead>
                    <TableHead>Estado</TableHead>
                    <TableHead>Procesamiento</TableHead>
                    <TableHead>Fecha</TableHead>
                    <TableHead>Acciones</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {tickets.map((ticket) => (
                    <TableRow key={ticket.id}>
                      <TableCell>
                        <div className="flex items-center space-x-2">
                          {ticket.file_type.startsWith('image/') ? (
                            <ImageIcon className="h-4 w-4 text-blue-600" />
                          ) : (
                            <FileText className="h-4 w-4 text-gray-600" />
                          )}
                          <div>
                            <div className="font-medium">{ticket.file_name}</div>
                            <div className="text-sm text-gray-500">
                              {ticketService.formatFileSize(ticket.file_size)}
                            </div>
                          </div>
                        </div>
                      </TableCell>
                      
                      <TableCell>
                        {ticket.ticket_number ? (
                          <span className="font-mono text-sm">{ticket.ticket_number}</span>
                        ) : (
                          <span className="text-gray-400">-</span>
                        )}
                      </TableCell>
                      
                      <TableCell>
                        <div>
                          {ticket.vendor_name && (
                            <div className="font-medium">{ticket.vendor_name}</div>
                          )}
                          {ticket.vendor_rfc && (
                            <div className="text-sm text-gray-500">{ticket.vendor_rfc}</div>
                          )}
                          {!ticket.vendor_name && !ticket.vendor_rfc && (
                            <span className="text-gray-400">-</span>
                          )}
                        </div>
                      </TableCell>
                      
                      <TableCell>
                        {ticket.total_amount ? (
                          <div className="font-medium">
                            {ticketService.formatCurrency(ticket.total_amount, ticket.currency)}
                          </div>
                        ) : (
                          <span className="text-gray-400">-</span>
                        )}
                      </TableCell>
                      
                      <TableCell>
                        <Badge className={ticketService.getStatusColor(ticket.status)}>
                          {getStatusIcon(ticket.status)}
                          <span className="ml-1 capitalize">{ticket.status}</span>
                        </Badge>
                      </TableCell>
                      
                      <TableCell>
                        <Badge className={ticketService.getProcessingStatusColor(ticket.processing_status)}>
                          <span className="capitalize">{ticket.processing_status.replace('_', ' ')}</span>
                        </Badge>
                      </TableCell>
                      
                      <TableCell>
                        <div className="text-sm">
                          <div>{ticketService.formatDate(ticket.created_at)}</div>
                          {ticket.processed_at && (
                            <div className="text-gray-500">
                              Procesado: {ticketService.formatDate(ticket.processed_at)}
                            </div>
                          )}
                        </div>
                      </TableCell>
                      
                      <TableCell>
                        <div className="flex items-center space-x-1">
                          <Dialog>
                            <DialogTrigger asChild>
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => setSelectedTicket(ticket)}
                              >
                                <Eye className="h-4 w-4" />
                              </Button>
                            </DialogTrigger>
                            <DialogContent className="max-w-2xl">
                              <DialogHeader>
                                <DialogTitle>Detalles del Ticket</DialogTitle>
                                <DialogDescription>
                                  Información completa del ticket seleccionado
                                </DialogDescription>
                              </DialogHeader>
                              {selectedTicket && (
                                <Tabs defaultValue="details" className="w-full">
                                  <TabsList>
                                    <TabsTrigger value="details">Detalles</TabsTrigger>
                                    <TabsTrigger value="extracted">Datos Extraídos</TabsTrigger>
                                    <TabsTrigger value="ocr">Resultados OCR</TabsTrigger>
                                  </TabsList>
                                  
                                  <TabsContent value="details" className="space-y-4">
                                    <div className="grid grid-cols-2 gap-4">
                                      <div>
                                        <label className="text-sm font-medium">Archivo</label>
                                        <p className="text-sm text-gray-600">{selectedTicket.file_name}</p>
                                      </div>
                                      <div>
                                        <label className="text-sm font-medium">Tamaño</label>
                                        <p className="text-sm text-gray-600">
                                          {ticketService.formatFileSize(selectedTicket.file_size)}
                                        </p>
                                      </div>
                                      <div>
                                        <label className="text-sm font-medium">Número de Ticket</label>
                                        <p className="text-sm text-gray-600">
                                          {selectedTicket.ticket_number || '-'}
                                        </p>
                                      </div>
                                      <div>
                                        <label className="text-sm font-medium">Proveedor</label>
                                        <p className="text-sm text-gray-600">
                                          {selectedTicket.vendor_name || '-'}
                                        </p>
                                      </div>
                                      <div>
                                        <label className="text-sm font-medium">RFC</label>
                                        <p className="text-sm text-gray-600">
                                          {selectedTicket.vendor_rfc || '-'}
                                        </p>
                                      </div>
                                      <div>
                                        <label className="text-sm font-medium">Monto</label>
                                        <p className="text-sm text-gray-600">
                                          {selectedTicket.total_amount 
                                            ? ticketService.formatCurrency(selectedTicket.total_amount, selectedTicket.currency)
                                            : '-'
                                          }
                                        </p>
                                      </div>
                                    </div>
                                  </TabsContent>
                                  
                                  <TabsContent value="extracted">
                                    <pre className="bg-gray-100 p-4 rounded text-sm overflow-auto max-h-64">
                                      {JSON.stringify(selectedTicket.extracted_data, null, 2)}
                                    </pre>
                                  </TabsContent>
                                  
                                  <TabsContent value="ocr">
                                    <pre className="bg-gray-100 p-4 rounded text-sm overflow-auto max-h-64">
                                      {JSON.stringify(selectedTicket.ocr_results, null, 2)}
                                    </pre>
                                  </TabsContent>
                                </Tabs>
                              )}
                            </DialogContent>
                          </Dialog>
                          
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleDownloadFile(ticket)}
                          >
                            <Download className="h-4 w-4" />
                          </Button>
                          
                          {ticket.status === 'uploaded' && (
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => handleProcessTicket(ticket.id)}
                            >
                              <RefreshCw className="h-4 w-4" />
                            </Button>
                          )}
                          
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleDeleteTicket(ticket.id)}
                            className="text-red-600 hover:text-red-700"
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Pagination */}
      {pagination.totalPages > 1 && (
        <div className="flex items-center justify-between">
          <div className="text-sm text-gray-700">
            Mostrando {((pagination.page - 1) * pagination.limit) + 1} a{' '}
            {Math.min(pagination.page * pagination.limit, pagination.total)} de{' '}
            {pagination.total} resultados
          </div>
          
          <div className="flex items-center space-x-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => handlePageChange(pagination.page - 1)}
              disabled={pagination.page <= 1}
            >
              Anterior
            </Button>
            
            <div className="flex items-center space-x-1">
              {Array.from({ length: Math.min(5, pagination.totalPages) }, (_, i) => {
                const page = i + 1
                return (
                  <Button
                    key={page}
                    variant={pagination.page === page ? "default" : "outline"}
                    size="sm"
                    onClick={() => handlePageChange(page)}
                  >
                    {page}
                  </Button>
                )
              })}
            </div>
            
            <Button
              variant="outline"
              size="sm"
              onClick={() => handlePageChange(pagination.page + 1)}
              disabled={pagination.page >= pagination.totalPages}
            >
              Siguiente
            </Button>
          </div>
        </div>
      )}
    </div>
  )
}

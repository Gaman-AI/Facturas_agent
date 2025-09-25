'use client'

import React, { useState, useRef } from 'react'
import { ticketService, TicketUploadData } from '../services/ticketService'
import { Button } from './ui/button'
import { Input } from './ui/input'
import { Label } from './ui/label'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from './ui/card'
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from './ui/dialog'
import { Progress } from './ui/progress'
import { 
  Upload, 
  FileText, 
  Image as ImageIcon, 
  X, 
  CheckCircle,
  AlertCircle,
  Calendar,
  DollarSign,
  Building2,
  Hash
} from 'lucide-react'
import { toast } from 'react-hot-toast'

interface TicketUploadProps {
  isOpen: boolean
  onClose: () => void
  onSuccess?: (ticket: any) => void
  taskId?: string
}

export default function TicketUpload({ isOpen, onClose, onSuccess, taskId }: TicketUploadProps) {
  const [file, setFile] = useState<File | null>(null)
  const [uploading, setUploading] = useState(false)
  const [uploadProgress, setUploadProgress] = useState(0)
  const [formData, setFormData] = useState({
    // Only the specified fields
    mesaFolio: '',
    idTicket: '',
    storeBranchPlaza: '',
    paymentType: '',
    tcNumber: '',
    ticketId: '',
    fecha: '',
    total: '',
    registerStationTerminal: '',
    cardLast4Digits: '',
    trNumber: '',
    folVta: '',
    comercio: ''
  })
  const [dragActive, setDragActive] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)

  const handleDrag = (e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
    if (e.type === 'dragenter' || e.type === 'dragover') {
      setDragActive(true)
    } else if (e.type === 'dragleave') {
      setDragActive(false)
    }
  }

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
    setDragActive(false)
    
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      handleFileSelect(e.dataTransfer.files[0])
    }
  }

  const handleFileSelect = (selectedFile: File) => {
    // Validate file type
    const allowedTypes = ['image/jpeg', 'image/png', 'image/jpg', 'application/pdf', 'image/webp']
    if (!allowedTypes.includes(selectedFile.type)) {
      toast.error('Tipo de archivo no válido. Solo se permiten JPEG, PNG, PDF y WebP')
      return
    }

    // Validate file size (50MB limit)
    if (selectedFile.size > 50 * 1024 * 1024) {
      toast.error('El archivo es demasiado grande. El límite es 50MB')
      return
    }

    setFile(selectedFile)
  }

  const handleFileInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      handleFileSelect(e.target.files[0])
    }
  }

  const handleInputChange = (field: string, value: string) => {
    setFormData(prev => ({
      ...prev,
      [field]: value
    }))
  }

  const handleUpload = async () => {
    if (!file) {
      toast.error('Por favor selecciona un archivo')
      return
    }

    try {
      setUploading(true)
      setUploadProgress(0)

      // Simulate upload progress
      const progressInterval = setInterval(() => {
        setUploadProgress(prev => {
          if (prev >= 90) {
            clearInterval(progressInterval)
            return prev
          }
          return prev + 10
        })
      }, 200)

      const uploadData: TicketUploadData = {
        file,
        taskId,
        // Only the specified fields
        mesaFolio: formData.mesaFolio || undefined,
        idTicket: formData.idTicket || undefined,
        storeBranchPlaza: formData.storeBranchPlaza || undefined,
        paymentType: formData.paymentType || undefined,
        tcNumber: formData.tcNumber || undefined,
        ticketId: formData.ticketId || undefined,
        fecha: formData.fecha || undefined,
        total: formData.total ? parseFloat(formData.total) : undefined,
        registerStationTerminal: formData.registerStationTerminal || undefined,
        cardLast4Digits: formData.cardLast4Digits || undefined,
        trNumber: formData.trNumber || undefined,
        folVta: formData.folVta || undefined,
        comercio: formData.comercio || undefined
      }

      const result = await ticketService.uploadTicket(uploadData)
      
      clearInterval(progressInterval)
      setUploadProgress(100)

      toast.success('Ticket subido correctamente')
      
      if (onSuccess) {
        onSuccess(result.ticket)
      }
      
      // Reset form
      setFile(null)
      setFormData({
        // Only the specified fields
        mesaFolio: '',
        idTicket: '',
        storeBranchPlaza: '',
        paymentType: '',
        tcNumber: '',
        ticketId: '',
        fecha: '',
        total: '',
        registerStationTerminal: '',
        cardLast4Digits: '',
        trNumber: '',
        folVta: '',
        comercio: ''
      })
      
      onClose()
    } catch (error) {
      console.error('Error uploading ticket:', error)
      toast.error('Error al subir el ticket')
    } finally {
      setUploading(false)
      setUploadProgress(0)
    }
  }

  const handleClose = () => {
    if (!uploading) {
      setFile(null)
      setFormData({
        // Only the specified fields
        mesaFolio: '',
        idTicket: '',
        storeBranchPlaza: '',
        paymentType: '',
        tcNumber: '',
        ticketId: '',
        fecha: '',
        total: '',
        registerStationTerminal: '',
        cardLast4Digits: '',
        trNumber: '',
        folVta: '',
        comercio: ''
      })
      onClose()
    }
  }

  const getFileIcon = (file: File) => {
    if (file.type.startsWith('image/')) {
      return <ImageIcon className="h-8 w-8 text-blue-600" />
    }
    return <FileText className="h-8 w-8 text-gray-600" />
  }

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>Subir Nuevo Ticket</DialogTitle>
          <DialogDescription>
            Sube un archivo de factura o ticket para procesamiento automático
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6">
          {/* File Upload Area */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Archivo</CardTitle>
              <CardDescription>
                Arrastra y suelta un archivo aquí o haz clic para seleccionar
              </CardDescription>
            </CardHeader>
            <CardContent>
              {!file ? (
                <div
                  className={`border-2 border-dashed rounded-lg p-8 text-center transition-colors ${
                    dragActive
                      ? 'border-blue-500 bg-blue-50'
                      : 'border-gray-300 hover:border-gray-400'
                  }`}
                  onDragEnter={handleDrag}
                  onDragLeave={handleDrag}
                  onDragOver={handleDrag}
                  onDrop={handleDrop}
                  onClick={() => fileInputRef.current?.click()}
                >
                  <Upload className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                  <p className="text-lg font-medium text-gray-900 mb-2">
                    Selecciona un archivo
                  </p>
                  <p className="text-sm text-gray-500 mb-4">
                    JPEG, PNG, PDF, WebP hasta 50MB
                  </p>
                  <Button variant="outline">
                    Seleccionar Archivo
                  </Button>
                </div>
              ) : (
                <div className="flex items-center justify-between p-4 border rounded-lg bg-gray-50">
                  <div className="flex items-center space-x-3">
                    {getFileIcon(file)}
                    <div>
                      <p className="font-medium">{file.name}</p>
                      <p className="text-sm text-gray-500">
                        {ticketService.formatFileSize(file.size)}
                      </p>
                    </div>
                  </div>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => setFile(null)}
                    disabled={uploading}
                  >
                    <X className="h-4 w-4" />
                  </Button>
                </div>
              )}
              
              <input
                ref={fileInputRef}
                type="file"
                className="hidden"
                accept=".jpg,.jpeg,.png,.pdf,.webp"
                onChange={handleFileInputChange}
              />
            </CardContent>
          </Card>

          {/* Form Fields */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Información del Ticket</CardTitle>
              <CardDescription>
                Completa la información del ticket (opcional)
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="mesaFolio">Mesa/Folio</Label>
                  <Input
                    id="mesaFolio"
                    placeholder="Enter Mesa/Folio"
                    value={formData.mesaFolio}
                    onChange={(e) => handleInputChange('mesaFolio', e.target.value)}
                  />
                </div>

                <div>
                  <Label htmlFor="idTicket">ID Ticket</Label>
                  <Input
                    id="idTicket"
                    placeholder="Enter ID Ticket"
                    value={formData.idTicket}
                    onChange={(e) => handleInputChange('idTicket', e.target.value)}
                  />
                </div>

                <div>
                  <Label htmlFor="storeBranchPlaza">Store/Branch/Plaza</Label>
                  <Input
                    id="storeBranchPlaza"
                    placeholder="Enter Store/Branch/Plaza"
                    value={formData.storeBranchPlaza}
                    onChange={(e) => handleInputChange('storeBranchPlaza', e.target.value)}
                  />
                </div>

                <div>
                  <Label htmlFor="paymentType">Payment Type</Label>
                  <Input
                    id="paymentType"
                    placeholder="Enter Payment Type"
                    value={formData.paymentType}
                    onChange={(e) => handleInputChange('paymentType', e.target.value)}
                  />
                </div>

                <div>
                  <Label htmlFor="tcNumber">TC#</Label>
                  <Input
                    id="tcNumber"
                    placeholder="Enter TC#"
                    value={formData.tcNumber}
                    onChange={(e) => handleInputChange('tcNumber', e.target.value)}
                  />
                </div>

                <div>
                  <Label htmlFor="ticketId">ID</Label>
                  <Input
                    id="ticketId"
                    placeholder="Enter ID"
                    value={formData.ticketId}
                    onChange={(e) => handleInputChange('ticketId', e.target.value)}
                  />
                </div>

                <div>
                  <Label htmlFor="fecha">Fecha</Label>
                  <Input
                    id="fecha"
                    type="date"
                    value={formData.fecha}
                    onChange={(e) => handleInputChange('fecha', e.target.value)}
                  />
                </div>

                <div>
                  <Label htmlFor="total">Total</Label>
                  <Input
                    id="total"
                    type="number"
                    step="0.01"
                    placeholder="Enter Total"
                    value={formData.total}
                    onChange={(e) => handleInputChange('total', e.target.value)}
                  />
                </div>

                <div>
                  <Label htmlFor="registerStationTerminal">Register/Station/Terminal</Label>
                  <Input
                    id="registerStationTerminal"
                    placeholder="Enter Register/Station/Terminal"
                    value={formData.registerStationTerminal}
                    onChange={(e) => handleInputChange('registerStationTerminal', e.target.value)}
                  />
                </div>

                <div>
                  <Label htmlFor="cardLast4Digits">Card Last 4 Digits</Label>
                  <Input
                    id="cardLast4Digits"
                    placeholder="Enter Card Last 4 Digits"
                    value={formData.cardLast4Digits}
                    onChange={(e) => handleInputChange('cardLast4Digits', e.target.value)}
                    maxLength={4}
                  />
                </div>

                <div>
                  <Label htmlFor="trNumber">TR#</Label>
                  <Input
                    id="trNumber"
                    placeholder="Enter TR#"
                    value={formData.trNumber}
                    onChange={(e) => handleInputChange('trNumber', e.target.value)}
                  />
                </div>

                <div>
                  <Label htmlFor="folVta">Fol_Vta</Label>
                  <Input
                    id="folVta"
                    placeholder="Enter Fol Vta"
                    value={formData.folVta}
                    onChange={(e) => handleInputChange('folVta', e.target.value)}
                  />
                </div>

                <div>
                  <Label htmlFor="comercio">Comercio</Label>
                  <Input
                    id="comercio"
                    placeholder="Enter Comercio"
                    value={formData.comercio}
                    onChange={(e) => handleInputChange('comercio', e.target.value)}
                  />
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Upload Progress */}
          {uploading && (
            <Card>
              <CardContent className="pt-6">
                <div className="space-y-2">
                  <div className="flex items-center justify-between text-sm">
                    <span>Subiendo archivo...</span>
                    <span>{uploadProgress}%</span>
                  </div>
                  <Progress value={uploadProgress} className="w-full" />
                </div>
              </CardContent>
            </Card>
          )}

          {/* Actions */}
          <div className="flex justify-end space-x-2">
            <Button
              variant="outline"
              onClick={handleClose}
              disabled={uploading}
            >
              Cancelar
            </Button>
            <Button
              onClick={handleUpload}
              disabled={!file || uploading}
              className="min-w-[120px]"
            >
              {uploading ? (
                <>
                  <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                  Subiendo...
                </>
              ) : (
                <>
                  <Upload className="h-4 w-4 mr-2" />
                  Subir Ticket
                </>
              )}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}

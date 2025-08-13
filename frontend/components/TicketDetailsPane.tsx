'use client'

import React, { useState, useEffect } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Separator } from '@/components/ui/separator'
import { Download, Receipt, RefreshCw, CheckCircle, Clock, AlertCircle } from 'lucide-react'
import { cn } from '@/lib/utils'
import { Label } from '@/components/ui/label'
import { useDemoMode } from '@/contexts/DemoModeContext'

interface TicketDetailsPaneProps {
  taskId?: string
  status?: string
  onReset?: () => void
  className?: string
}

interface TicketItem {
  id: string
  description: string
  quantity: number
  unit_price: number
  total: number
}

interface TicketDetails {
  id: string
  date: string
  vendor: string
  vendor_url?: string
  payment_method: string
  subtotal: number
  tax: number
  total: number
  items: TicketItem[]
  status: 'extracting' | 'completed' | 'error'
  extraction_progress: number
}

export const TicketDetailsPane: React.FC<TicketDetailsPaneProps> = ({
  taskId,
  status,
  onReset,
  className
}) => {
  const [ticketDetails, setTicketDetails] = useState<TicketDetails | null>(null)
  const { isDemoMode } = useDemoMode()

  // Check if this is a demo task
  useEffect(() => {
    if (taskId?.startsWith('demo_')) {
      // setIsDemoMode(true) // This line is removed as per the new_code
    }
  }, [taskId])

  useEffect(() => {
    if (!status || !taskId) return

    // Simulate data extraction process
    if (status === 'running' || status === 'pending') {
      setTicketDetails({
        id: taskId,
        date: new Date().toLocaleDateString('es-MX'),
        vendor: 'Walmart México',
        vendor_url: 'https://facturacion.walmartmexico.com.mx/',
        payment_method: 'Tarjeta de Crédito',
        subtotal: 0,
        tax: 0,
        total: 0,
        items: [],
        status: 'extracting',
        extraction_progress: 0
      })

      // Simulate extraction progress
      const progressInterval = setInterval(() => {
        setTicketDetails(prev => {
          if (!prev) return prev
          const newProgress = Math.min(prev.extraction_progress + 25, 100)
          
          if (newProgress === 100) {
            // Extraction completed, populate with demo data
            return {
              ...prev,
              status: 'completed',
              extraction_progress: 100,
              subtotal: 1250.00,
              tax: 200.00,
              total: 1450.00,
              items: [
                {
                  id: '1',
                  description: 'Laptop HP Pavilion 15" Core i7',
                  quantity: 1,
                  unit_price: 1250.00,
                  total: 1250.00
                }
              ]
            }
          }
          
          return {
            ...prev,
            extraction_progress: newProgress
          }
        })
      }, 800)

      return () => clearInterval(progressInterval)
    }
  }, [status, taskId])

  const handleExport = () => {
    if (!ticketDetails) return
    
    const dataStr = JSON.stringify(ticketDetails, null, 2)
    const dataBlob = new Blob([dataStr], { type: 'application/json' })
    const url = URL.createObjectURL(dataBlob)
    const link = document.createElement('a')
    link.href = url
    link.download = `ticket_${ticketDetails.id}.json`
    link.click()
    URL.revokeObjectURL(url)
  }

  const handleReset = () => {
    setTicketDetails(null)
    if (onReset) {
      onReset()
    }
  }

  if (!ticketDetails) {
    return (
      <div className={cn("h-full flex items-center justify-center", className)}>
        <div className="text-center text-slate-500">
          <Receipt className="w-16 h-16 mx-auto mb-4 text-slate-300" />
          <p className="text-lg font-medium">No Receipt Selected</p>
          <p className="text-sm">Upload a receipt to see extracted details</p>
        </div>
      </div>
    )
  }

  return (
    <div className={cn("h-full flex flex-col", className)}>
      {/* Header */}
      <CardHeader className="pb-4">
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="text-xl font-semibold flex items-center space-x-2">
              <Receipt className="w-5 h-5 text-blue-600" />
              <span>Receipt Details</span>
              {isDemoMode && (
                <Badge variant="secondary" className="ml-2 text-xs">
                  Demo Mode
                </Badge>
              )}
            </CardTitle>
            <CardDescription>
              {ticketDetails.status === 'extracting' 
                ? 'Extracting information from receipt...' 
                : 'Extracted ticket information'
              }
            </CardDescription>
          </div>
          <div className="flex space-x-2">
            <Button
              variant="outline"
              size="sm"
              onClick={handleExport}
              disabled={ticketDetails.status !== 'completed'}
            >
              <Download className="w-4 h-4 mr-2" />
              Export
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={handleReset}
            >
              <RefreshCw className="w-4 h-4 mr-2" />
              New Receipt
            </Button>
          </div>
        </div>
      </CardHeader>

      {/* Content */}
      <CardContent className="flex-1 overflow-y-auto">
        {ticketDetails.status === 'extracting' ? (
          <div className="space-y-4">
            <div className="text-center py-8">
              <div className="relative w-16 h-16 mx-auto mb-4">
                <div className="absolute inset-0 border-4 border-blue-200 rounded-full"></div>
                <div 
                  className="absolute inset-0 border-4 border-blue-600 rounded-full"
                  style={{
                    clipPath: `polygon(0 0, ${ticketDetails.extraction_progress}% 0, ${ticketDetails.extraction_progress}% 100%, 0 100%)`
                  }}
                ></div>
                <div className="absolute inset-0 flex items-center justify-center">
                  <span className="text-sm font-medium text-blue-600">
                    {ticketDetails.extraction_progress}%
                  </span>
                </div>
              </div>
              <p className="text-lg font-medium text-slate-700">
                Extracting ticket details...
              </p>
              <p className="text-sm text-slate-500">
                Analyzing receipt content and extracting structured data
              </p>
            </div>
          </div>
        ) : (
          <div className="space-y-6">
            {/* Basic Info */}
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-lg">Basic Information</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label className="text-sm font-medium text-slate-600">Ticket ID</Label>
                    <p className="text-sm text-slate-900">{ticketDetails.id}</p>
                  </div>
                  <div>
                    <Label className="text-sm font-medium text-slate-600">Date</Label>
                    <p className="text-sm text-slate-900">{ticketDetails.date}</p>
                  </div>
                  <div>
                    <Label className="text-sm font-medium text-slate-600">Vendor</Label>
                    <p className="text-sm text-slate-900">{ticketDetails.vendor}</p>
                  </div>
                  <div>
                    <Label className="text-sm font-medium text-slate-600">Payment Method</Label>
                    <p className="text-sm text-slate-900">{ticketDetails.payment_method}</p>
                  </div>
                </div>
                {ticketDetails.vendor_url && (
                  <div>
                    <Label className="text-sm font-medium text-slate-600">Vendor URL</Label>
                    <a 
                      href={ticketDetails.vendor_url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-sm text-blue-600 hover:text-blue-800 underline"
                    >
                      {ticketDetails.vendor_url}
                    </a>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Financial Summary */}
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-lg">Financial Summary</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="flex justify-between">
                  <span className="text-slate-600">Subtotal:</span>
                  <span className="font-medium">${ticketDetails.subtotal.toFixed(2)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-600">Tax:</span>
                  <span className="font-medium">${ticketDetails.tax.toFixed(2)}</span>
                </div>
                <Separator />
                <div className="flex justify-between text-lg font-semibold">
                  <span>Total:</span>
                  <span className="text-green-600">${ticketDetails.total.toFixed(2)}</span>
                </div>
              </CardContent>
            </Card>

            {/* Items */}
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-lg">Items</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {ticketDetails.items.map((item) => (
                    <div key={item.id} className="flex justify-between items-center p-3 bg-slate-50 rounded-lg">
                      <div className="flex-1">
                        <p className="font-medium text-slate-900">{item.description}</p>
                        <p className="text-sm text-slate-600">
                          {item.quantity} × ${item.unit_price.toFixed(2)}
                        </p>
                      </div>
                      <span className="font-semibold text-slate-900">
                        ${item.total.toFixed(2)}
                      </span>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>

            {/* Status */}
            <div className="flex items-center justify-center p-4 bg-green-50 border border-green-200 rounded-lg">
              <CheckCircle className="w-5 h-5 text-green-600 mr-2" />
              <span className="text-green-800 font-medium">Extraction completed successfully</span>
            </div>
          </div>
        )}
      </CardContent>
    </div>
  )
}

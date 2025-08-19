'use client'

import React, { useState, useEffect } from 'react'
import { ResizablePanelGroup, ResizablePanel, ResizableHandle } from '@/components/ui/resizable'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { Zap, Monitor, Activity, ExternalLink, RefreshCw } from 'lucide-react'
import { useLanguage } from '@/contexts/LanguageContext'
import { websocketService } from '@/services/websocket'
import ApiService from '@/services/api'
import { LiveViewPane } from './LiveViewPane'
import { tokenManager } from '@/utils/tokenManager'

export interface DashboardDualPaneProps {
  onTaskSubmit?: (taskId: string) => void
  className?: string
  initialTicketData?: any
}

interface TaskState {
  taskId: string | null
  sessionId: string | null
  liveViewUrl: string | null
  status: 'idle' | 'pending' | 'running' | 'paused' | 'completed' | 'failed' | 'connecting'
}

// Add interface for ticket data
interface TicketData {
  Comercio: string
  Fecha: string
  Total: string
  'TC#': string
  'TR#': string
  'ID': string
  'Fol_Vta': string
  'ID_Ticket': string
  'Mesa_Folio': string
  // Additional fields for vendor facturacion
  'Store_Branch_Plaza': string
  'Register_Station_Terminal': string
  'Payment_Type': string
  'Card_Last_4_Digits': string
}

export function DashboardDualPane({
  onTaskSubmit,
  className = '',
  initialTicketData
}: DashboardDualPaneProps) {
  const { t } = useLanguage()
  const [isMobile, setIsMobile] = useState(false)
  const [taskState, setTaskState] = useState<TaskState>({
    taskId: null,
    sessionId: null,
    liveViewUrl: null,
    status: 'idle'
  })
  const [currentLiveViewUrl, setCurrentLiveViewUrl] = useState<string | null>(null)
  const [selectedFile, setSelectedFile] = useState<File | null>(null)
  const [isUploading, setIsUploading] = useState(false)
  const [uploadError, setUploadError] = useState<string | null>(null)
  const [uploadedTicketId, setUploadedTicketId] = useState<string | null>(null)
  const [vendorUrl, setVendorUrl] = useState<string>('')
  
  // Add new state for ticket data and raw text
  const [ticketData, setTicketData] = useState<TicketData>({
    Comercio: '',
    Fecha: '',
    Total: '',
    'TC#': '',
    'TR#': '',
    'ID': '',
    'Fol_Vta': '',
    'ID_Ticket': '',
    'Mesa_Folio': '',
    'Store_Branch_Plaza': '',
    'Register_Station_Terminal': '',
    'Payment_Type': '',
    'Card_Last_4_Digits': ''
  })
  const [rawText, setRawText] = useState<string>('')
  const [isProcessing, setIsProcessing] = useState(false)
  const [ocrSuccess, setOcrSuccess] = useState(false)
  const [ocrStatus, setOcrStatus] = useState<string>('')

  const API_BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL || 'http://localhost:8000'

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0] || null
    setSelectedFile(file)
    setUploadError(null)
    setUploadedTicketId(null)
  }

  const handleImageUpload = async () => {
    if (!selectedFile) return
    setIsUploading(true)
    setUploadError(null)
    setUploadedTicketId(null)
    setIsProcessing(true)
    setOcrSuccess(false)
    setOcrStatus('Processing image with OCR...')
    
    try {
      const token = await tokenManager.getValidToken()
      const formData = new FormData()
      formData.append('file', selectedFile)
      if (vendorUrl) {
        formData.append('vendor_url', vendorUrl)
      }

      const response = await fetch(`${API_BASE_URL}/api/v1/tickets/upload`, {
        method: 'POST',
        headers: {
          ...(token ? { Authorization: `Bearer ${token}` } : {})
        },
        body: formData
      })

      if (!response.ok) {
        const text = await response.text()
        throw new Error(text || `Upload failed with status ${response.status}`)
      }

      const data = await response.json()
      const ticketId = data?.data?.ticket_id || data?.ticket_id
      setUploadedTicketId(ticketId || 'unknown')
      
      // Extract ticket data from the OCR API response
      if (data?.data?.extracted_data) {
        const ocrData = data.data.extracted_data
        console.log('✅ OCR data received:', ocrData)
        
        // Set raw text for debugging - check multiple possible field names
        const rawTextData = ocrData.raw_text || 
                           ocrData.Full_Raw_Text || 
                           ocrData.full_text || 
                           ocrData.text || ''
        
        if (rawTextData) {
          setRawText(rawTextData)
          console.log('✅ Raw text set from OCR, length:', rawTextData.length)
        }
        
        // Map OCR data to TicketData interface
        const extractedData: TicketData = {
          Comercio: ocrData.comercio || ocrData.Comercio || '',
          Fecha: ocrData.fecha || ocrData.Fecha || '',
          Total: ocrData.total || ocrData.Total || '',
          'TC#': ocrData.tc_number || ocrData['TC#'] || '',
          'TR#': ocrData.tr_number || ocrData['TR#'] || '',
          'ID': ocrData.id || ocrData.ID || '',
          'Fol_Vta': ocrData.folio_venta || ocrData['Fol_Vta'] || '',
          'ID_Ticket': ocrData.id_ticket || ocrData.ID_Ticket || '',
          'Mesa_Folio': ocrData.mesa_folio || ocrData.Mesa_Folio || '',
          'Store_Branch_Plaza': ocrData.store_branch_plaza || ocrData['Store_Branch_Plaza'] || '',
          'Register_Station_Terminal': ocrData.register_station_terminal || ocrData['Register_Station_Terminal'] || '',
          'Payment_Type': ocrData.payment_type || ocrData['Payment_Type'] || '',
          'Card_Last_4_Digits': ocrData.card_last_4_digits || ocrData['Card_Last_4_Digits'] || ''
        }
        
        setTicketData(extractedData)
        setOcrSuccess(true)
        setOcrStatus('OCR completed successfully!')
        console.log('✅ Ticket data mapped from OCR:', extractedData)
        
        // Show success message
        console.log('✅ OCR processing completed successfully')
        console.log('📊 Extracted fields:')
        console.log('  - Mesa/Folio:', extractedData['Mesa_Folio'])
        console.log('  - Fecha:', extractedData['Fecha'])
        console.log('  - ID Ticket:', extractedData['ID_Ticket'])
        console.log('  - Total:', extractedData['Total'])
        console.log('  - Comercio:', extractedData['Comercio'])
        console.log('  - Store/Branch/Plaza:', extractedData['Store_Branch_Plaza'])
        console.log('  - Register/Station/Terminal:', extractedData['Register_Station_Terminal'])
        console.log('  - Payment Type:', extractedData['Payment_Type'])
        console.log('  - Card Last 4 Digits:', extractedData['Card_Last_4_Digits'])
        console.log('📝 Raw text length:', rawTextData.length)
        
      } else {
        console.warn('⚠️ No extracted_data found in API response')
        console.log('📋 Full API response:', data)
        setOcrStatus('OCR completed but no data extracted')
      }
      
      console.log('✅ Upload success:', data)
    } catch (err: any) {
      console.error('❌ Upload error:', err)
      setUploadError(err?.message || 'Upload failed')
      setOcrStatus('OCR processing failed')
    } finally {
      setIsUploading(false)
      setIsProcessing(false)
    }
  }

  // Initialize ticket data from props if provided
  useEffect(() => {
    if (initialTicketData) {
      console.log('🎯 Initializing ticket data from props:', initialTicketData)
      
      // Map the initial data to our TicketData interface
      // Handle both the normalized fields and the original OCR fields
      const mappedData: TicketData = {
        Comercio: initialTicketData.comercio || initialTicketData.Comercio || '',
        Fecha: initialTicketData.fecha || initialTicketData.Fecha || '',
        Total: initialTicketData.total || initialTicketData.Total || '',
        'TC#': initialTicketData.tc_number || initialTicketData['TC#'] || '',
        'TR#': initialTicketData.tr_number || initialTicketData['TR#'] || '',
        'ID': initialTicketData.id || initialTicketData.ID || '',
        'Fol_Vta': initialTicketData.folio_venta || initialTicketData['Fol_Vta'] || '',
        'ID_Ticket': initialTicketData.id_ticket || initialTicketData.ID_Ticket || '',
        'Mesa_Folio': initialTicketData.mesa_folio || initialTicketData.Mesa_Folio || '',
        'Store_Branch_Plaza': initialTicketData.store_branch_plaza || initialTicketData['Store_Branch_Plaza'] || '',
        'Register_Station_Terminal': initialTicketData.register_station_terminal || initialTicketData['Register_Station_Terminal'] || '',
        'Payment_Type': initialTicketData.payment_type || initialTicketData['Payment_Type'] || '',
        'Card_Last_4_Digits': initialTicketData.card_last_4_digits || initialTicketData['Card_Last_4_Digits'] || ''
      }
      
      setTicketData(mappedData)
      
      // Set raw text if available - check multiple possible field names
      const rawTextData = initialTicketData.raw_text || 
                         initialTicketData.Full_Raw_Text || 
                         initialTicketData.full_text || 
                         initialTicketData.text || ''
      
      if (rawTextData) {
        setRawText(rawTextData)
        console.log('✅ Raw text set from initial data, length:', rawTextData.length)
      }
      
      // Set OCR success state
      setOcrSuccess(true)
      setOcrStatus('OCR completed successfully!')
      
      console.log('✅ Ticket data initialized:', mappedData)
      console.log('✅ Raw text length:', rawTextData.length)
    }
  }, [initialTicketData])

  // Check if mobile on mount and resize
  useEffect(() => {
    const checkMobile = () => {
      setIsMobile(window.innerWidth < 1024) // lg breakpoint
    }
    
    checkMobile()
    window.addEventListener('resize', checkMobile)
    return () => window.removeEventListener('resize', checkMobile)
  }, [])

  // Update live view URL when taskState changes
  useEffect(() => {
    if (taskState.liveViewUrl !== currentLiveViewUrl) {
      console.log('🔄 Live view URL updated:', {
        from: currentLiveViewUrl,
        to: taskState.liveViewUrl,
        taskId: taskState.taskId
      })
      setCurrentLiveViewUrl(taskState.liveViewUrl)
    }
  }, [taskState.liveViewUrl, currentLiveViewUrl, taskState.taskId])

  // Log when currentLiveViewUrl changes for debugging
  useEffect(() => {
    if (currentLiveViewUrl) {
      console.log('🎯 Setting live view URL in iframe:', currentLiveViewUrl)
      console.log('🔍 URL validation:', {
        isHttps: currentLiveViewUrl.startsWith('https://'),
        isBrowserbase: currentLiveViewUrl.includes('browserbase.com'),
        isDevTools: currentLiveViewUrl.includes('/devtools/inspector.html'),
        hasWebSocket: currentLiveViewUrl.includes('wss='),
        hasDebugFlag: currentLiveViewUrl.includes('debug=true')
      })
    }
  }, [currentLiveViewUrl])

  // WebSocket connection for real-time updates
  useEffect(() => {
    if (taskState.taskId && taskState.status !== 'idle') {
      // Connect to WebSocket for this specific task
      const connectWebSocket = async () => {
        try {
          await websocketService.startPolling(taskState.taskId!)
          console.log(`📡 WebSocket connected for task: ${taskState.taskId}`)
        } catch (error) {
          console.error(`❌ Failed to connect WebSocket for task ${taskState.taskId}:`, error)
        }
      }
      
      connectWebSocket()
      
      const handleTaskUpdate = (data: any) => {
        if (data.taskId === taskState.taskId) {
          console.log('📡 Received WebSocket task update:', data)
          
          // Extract session information from the update
          const sessionId = data.sessionId || data.session_id || taskState.sessionId
          const liveViewUrl = data.liveViewUrl || data.live_view_url || taskState.liveViewUrl
          const status = data.status || taskState.status
          
          console.log('🔗 Processing WebSocket update:', { sessionId, liveViewUrl, status })
          
          // Update task state with new information
          setTaskState(prev => ({
            ...prev,
            status: status as TaskState['status'],
            sessionId: sessionId || prev.sessionId,
            liveViewUrl: liveViewUrl || prev.liveViewUrl
          }))
          
          // If we got the live view URL, update the current URL
          if (liveViewUrl && liveViewUrl !== currentLiveViewUrl) {
            console.log('🎯 Live view URL received via WebSocket:', liveViewUrl)
            setCurrentLiveViewUrl(liveViewUrl)
          }
        }
      }
      
      // Listen for task updates using the correct event name
      websocketService.on('taskUpdate', handleTaskUpdate)
      
      // Cleanup function
      return () => {
        websocketService.off('taskUpdate', handleTaskUpdate)
        websocketService.stopPolling(taskState.taskId!)
      }
    }
  }, [taskState.taskId])

  const handleTaskCreated = async (taskId: string) => {
    try {
      // Set initial state
      setTaskState({
        taskId,
        sessionId: null,
        liveViewUrl: null,
        status: 'connecting'
      })

      console.log('🚀 Task created, waiting for WebSocket session updates...')
      console.log('📡 Task ID:', taskId)
      console.log('⏳ Status: connecting - waiting for backend to create session and generate live view URL')

      // Callback for parent component
      if (onTaskSubmit) {
        onTaskSubmit(taskId)
      }
    } catch (error) {
      console.error('❌ Error handling task creation:', error)
      setTaskState(prev => ({ ...prev, status: 'failed' }))
    }
  }

  const handleTakeoverRequest = () => {
    console.log('Takeover requested for task:', taskState.taskId)
    // Handle takeover logic here
  }

  const handleRefreshView = () => {
    console.log('Refreshing view for task:', taskState.taskId)
    // Handle refresh logic here
  }

  const resetTaskState = () => {
    setTaskState({
      taskId: null,
      sessionId: null,
      liveViewUrl: null,
      status: 'idle'
    })
    setCurrentLiveViewUrl(null)
  }

  const handleUpdateLiveViewUrl = () => {
    if (currentLiveViewUrl) {
      console.log('Live view URL updated:', currentLiveViewUrl)
      // Force re-render of iframe
      setCurrentLiveViewUrl('')
      setTimeout(() => setCurrentLiveViewUrl(currentLiveViewUrl), 100)
    }
  }

  const handleRefreshLiveView = () => {
    if (currentLiveViewUrl) {
      console.log('Refreshing live view...')
      // Force iframe refresh by temporarily clearing and restoring URL
      const tempUrl = currentLiveViewUrl
      setCurrentLiveViewUrl('')
      setTimeout(() => setCurrentLiveViewUrl(tempUrl), 100)
    }
  }

  // Render live view iframe when URL is available
  const renderLiveView = () => {
    if (!currentLiveViewUrl) {
      return (
        <div className="h-full flex items-center justify-center bg-gray-50 rounded-xl border-2 border-dashed border-gray-300 p-1">
          <div className="text-center text-gray-500">
            <Monitor className="w-20 h-20 mx-auto mb-4 text-gray-400" />
            <h3 className="text-xl font-medium mb-3">No Live View Available</h3>
            <p className="text-base">Waiting for task to start and generate live view URL...</p>
          </div>
        </div>
      )
    }

    // Validate URL format
    const isValidBrowserbaseUrl = currentLiveViewUrl.includes('browserbase.com/devtools/inspector.html')
    
    if (!isValidBrowserbaseUrl) {
      return (
        <div className="h-full flex items-center justify-center bg-yellow-50 rounded-xl border-2 border-dashed border-yellow-300 p-1">
          <div className="text-center text-yellow-600">
            <Monitor className="w-20 h-20 mx-auto mb-4 text-yellow-400" />
            <h3 className="text-xl font-medium mb-3">Invalid Live View URL Format</h3>
            <p className="text-base">Expected Browserbase devtools URL format</p>
          </div>
        </div>
      )
    }

    return (
      <div className="h-full bg-white rounded-xl border border-gray-200 overflow-hidden">
        <div className="p-2 bg-gray-50 border-b border-gray-200 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Monitor className="w-3 h-3 text-gray-600" />
            <span className="text-xs font-medium text-gray-700">Live Browser View</span>
          </div>
          <div className="flex items-center gap-2">
            <Badge variant="outline" className="text-xs px-1 py-0">
              {taskState.status}
            </Badge>
            <Button size="sm" variant="outline" onClick={handleRefreshView} className="h-6 px-2 text-xs">
              🔄 Refresh
            </Button>
          </div>
        </div>
        
        <div className="h-full relative">
          <iframe
            src={currentLiveViewUrl}
            sandbox="allow-same-origin allow-scripts"
            allow="clipboard-read; clipboard-write"
            style={{ pointerEvents: 'none' }}
            className="w-full h-full border-0"
            title="Live Browser View"
            onLoad={() => console.log('✅ Live view iframe loaded successfully')}
            onError={(e) => console.error('❌ Live view iframe error:', e)}
          />
        </div>
      </div>
    )
  }

  // Mobile layout - stacked vertically
  if (isMobile) {
    return (
      <div className={`h-full min-h-[800px] w-full ${className}`}>
        <div className="flex flex-col h-full gap-6">
          {/* Ticket Data Form Section */}
          <Card className="border-2 border-slate-200/60 shadow-lg bg-white/90 backdrop-blur-sm rounded-xl overflow-hidden">
            <CardHeader className="pb-4 bg-gradient-to-r from-red-50 to-rose-50 border-b border-slate-200/40">
              <CardTitle className="flex items-center space-x-2 text-xl">
                <div className="w-8 h-8 bg-red-500 rounded-lg flex items-center justify-center">
                  <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                  </svg>
                </div>
                <span>Ticket Data</span>
              </CardTitle>
              <CardDescription className="text-slate-600">
                Enter the ticket data in the corresponding fields.
              </CardDescription>
            </CardHeader>
            <CardContent className="p-4">
              {/* File Upload Section for Mobile */}
              <div className="mb-4 p-4 border border-slate-200 rounded-lg bg-slate-50">
                <div className="space-y-3">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Upload Ticket Image
                    </label>
                    <input
                      type="file"
                      accept="image/*,.pdf"
                      onChange={handleFileChange}
                      className="block w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-red-50 file:text-red-700 hover:file:bg-red-100"
                    />
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Vendor URL (Optional)
                    </label>
                    <input
                      type="url"
                      placeholder="https://facturacion.walmartmexico.com.mx/"
                      value={vendorUrl}
                      onChange={(e) => setVendorUrl(e.target.value)}
                      className="block w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-red-500 focus:border-transparent"
                    />
                  </div>
                  
                  {selectedFile && (
                    <div className="text-sm text-gray-600">
                      Selected: {selectedFile.name}
                    </div>
                  )}
                  
                  <Button
                    onClick={handleImageUpload}
                    disabled={!selectedFile || isUploading}
                    className="w-full bg-red-600 hover:bg-red-700 text-white"
                  >
                    {isUploading ? (
                      <>
                        <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                        Processing...
                      </>
                    ) : (
                      'Process Ticket with OCR'
                    )}
                  </Button>
                  
                  {uploadError && (
                    <div className="text-sm text-red-600 bg-red-50 p-2 rounded border border-red-200">
                      {uploadError}
                    </div>
                  )}
                </div>
              </div>
              
              {/* OCR Status for Mobile */}
              {ocrStatus && (
                <div className="mb-4">
                  <div className={`flex items-center gap-3 p-3 rounded-lg ${
                    ocrSuccess 
                      ? 'bg-green-50 border border-green-200 text-green-700' 
                      : isProcessing 
                        ? 'bg-blue-50 border border-blue-200 text-blue-700'
                        : 'bg-yellow-50 border border-yellow-200 text-yellow-700'
                  }`}>
                    <div className={`w-4 h-4 rounded-full ${
                      ocrSuccess 
                        ? 'bg-green-500' 
                        : isProcessing 
                          ? 'bg-blue-500 animate-pulse'
                          : 'bg-yellow-500'
                    }`}></div>
                    <span className="text-sm font-medium">{ocrStatus}</span>
                  </div>
                </div>
              )}
              
              <div className="grid grid-cols-3 gap-3">
                {/* Mesa/Folio */}
                <div className="bg-gray-50 border border-red-200 rounded-lg p-3">
                  <label className="block text-sm font-medium text-gray-700 mb-2">Mesa/Folio</label>
                  <div className="min-h-[40px] px-3 py-2 bg-white border border-red-200 rounded text-sm text-gray-800">
                    {ticketData['Mesa_Folio'] || 'No disponible'}
                  </div>
                </div>
                
                {/* Fecha */}
                <div className="bg-gray-50 border border-red-200 rounded-lg p-3">
                  <label className="block text-sm font-medium text-gray-700 mb-2">Fecha</label>
                  <div className="min-h-[40px] px-3 py-2 bg-white border border-red-200 rounded text-sm text-gray-800">
                    {ticketData['Fecha'] || 'No disponible'}
                  </div>
                </div>
                
                {/* ID Ticket */}
                <div className="bg-gray-50 border border-red-200 rounded-lg p-3">
                  <label className="block text-sm font-medium text-gray-700 mb-2">ID Ticket</label>
                  <div className="min-h-[40px] px-3 py-2 bg-white border border-red-200 rounded text-sm text-gray-800">
                    {ticketData['ID_Ticket'] || 'No disponible'}
                  </div>
                </div>
                
                {/* Total */}
                <div className="bg-gray-50 border border-red-200 rounded-lg p-3">
                  <label className="block text-sm font-medium text-gray-700 mb-2">Total</label>
                  <div className="min-h-[40px] px-3 py-2 bg-white border border-red-200 rounded text-sm text-gray-800">
                    {ticketData['Total'] || 'No disponible'}
                  </div>
                </div>
                
                {/* Store/Branch/Plaza */}
                <div className="bg-gray-50 border border-red-200 rounded-lg p-3">
                  <label className="block text-sm font-medium text-gray-700 mb-2">Store/Branch/Plaza</label>
                  <div className="min-h-[40px] px-3 py-2 bg-white border border-red-200 rounded text-sm text-gray-800">
                    {ticketData['Store_Branch_Plaza'] || 'No disponible'}
                  </div>
                </div>
                
                {/* Register/Station/Terminal */}
                <div className="bg-gray-50 border border-red-200 rounded-lg p-3">
                  <label className="block text-sm font-medium text-gray-700 mb-2">Register/Station/Terminal</label>
                  <div className="min-h-[40px] px-3 py-2 bg-white border border-red-200 rounded text-sm text-gray-800">
                    {ticketData['Register_Station_Terminal'] || 'No disponible'}
                  </div>
                </div>
                
                {/* Payment Type */}
                <div className="bg-gray-50 border border-red-200 rounded-lg p-3">
                  <label className="block text-sm font-medium text-gray-700 mb-2">Payment Type</label>
                  <div className="min-h-[40px] px-3 py-2 bg-white border border-red-200 rounded text-sm text-gray-800">
                    {ticketData['Payment_Type'] || 'No disponible'}
                  </div>
                </div>
                
                {/* Last 4 digits of card */}
                <div className="bg-gray-50 border border-red-200 rounded-lg p-3">
                  <label className="block text-sm font-medium text-gray-700 mb-2">Card Last 4 Digits</label>
                  <div className="min-h-[40px] px-3 py-2 bg-white border border-red-200 rounded text-sm text-gray-800">
                    {ticketData['Card_Last_4_Digits'] || 'No disponible'}
                  </div>
                </div>
              </div>
              
              {/* Full Raw Text Display - New Component */}
              <div className="mt-4">
                <div className="bg-gray-50 border border-red-200 rounded-lg p-3">
                  <label className="block text-sm font-medium text-gray-700 mb-2">Full Raw Text</label>
                  <div className="min-h-[120px] px-3 py-2 bg-white border border-red-200 rounded text-sm text-gray-800 overflow-y-auto">
                    {rawText ? (
                      <pre className="whitespace-pre-wrap text-xs leading-relaxed">
                        {rawText}
                      </pre>
                    ) : (
                      <span className="text-gray-500 italic">No raw text available</span>
                    )}
                  </div>
                </div>
              </div>
              
              {/* Raw Text Display for Debugging - Mobile */}
              {rawText && (
                <div className="mt-4 p-4 border border-slate-200 rounded-lg bg-slate-50">
                  <h4 className="text-sm font-medium text-gray-700 mb-2">Raw OCR Text</h4>
                  <div className="max-h-32 overflow-y-auto">
                    <pre className="text-xs text-gray-600 whitespace-pre-wrap bg-white p-2 rounded border">
                      {rawText}
                    </pre>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>



          {/* Live View URL Input */}
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-semibold flex items-center gap-2">
                  <ExternalLink className="w-5 h-5" />
                  Live View URL
                </h3>
                <Button 
                  size="sm" 
                  variant="outline" 
                  onClick={handleRefreshLiveView}
                  disabled={!currentLiveViewUrl}
                >
                  <RefreshCw className="w-4 h-4 mr-1" />
                  Refresh
                </Button>
              </div>
              <div className="space-y-3">
                <div className="flex gap-2">
                  <Input
                    type="url"
                    placeholder="Enter live view URL (e.g., https://browserbase.com/devtools/inspector.html?wss=...)"
                    value={currentLiveViewUrl || ''}
                    onChange={(e) => setCurrentLiveViewUrl(e.target.value)}
                    className="flex-1"
                  />
                  <Button 
                    size="sm" 
                    variant="default"
                    onClick={handleUpdateLiveViewUrl}
                    disabled={!currentLiveViewUrl}
                  >
                    Update
                  </Button>
                  <Button 
                    size="sm" 
                    variant="outline"
                    onClick={() => {
                      setCurrentLiveViewUrl('')
                      console.log('Live view URL cleared')
                    }}
                  >
                    Clear
                  </Button>
                </div>
                
                {/* URL Validation and Help */}
                {currentLiveViewUrl && (
                  <div className="space-y-2">
                    <div className="text-xs text-gray-600 bg-gray-50 p-2 rounded">
                      <strong>Current URL:</strong> 
                      <span className="ml-2 break-all">{currentLiveViewUrl}</span>
                    </div>
                    
                    {/* URL Format Validation */}
                    <div className="p-2 rounded border text-xs">
                      {currentLiveViewUrl.startsWith('https://www.browserbase.com/devtools/inspector.html') ? (
                        <div className="text-green-700 bg-green-50 border-green-200">
                          ✅ Valid Browserbase DevTools URL format detected
                        </div>
                      ) : currentLiveViewUrl.startsWith('https://') ? (
                        <div className="text-yellow-700 bg-yellow-50 border-yellow-200">
                          ⚠️ HTTPS URL detected but not in expected Browserbase DevTools format
                        </div>
                      ) : (
                        <div className="text-red-700 bg-red-50 border-red-200">
                          ❌ Invalid URL format - must start with https://
                        </div>
                      )}
                    </div>
                  </div>
                )}
                
                <div className="text-xs text-gray-500 bg-blue-50 p-2 rounded border border-blue-200">
                  <strong>Expected Format:</strong> The live view URL should be automatically generated by the backend when a task starts. 
                  It should look like: <code className="bg-white px-1 rounded">https://www.browserbase.com/devtools/inspector.html?wss=connect.browserbase.com/debug/{'{session_id}'}/devtools/page/{'{page_id}'}?debug=true</code>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Browser View Section - Only show when task is active */}
          {taskState.status !== 'idle' && (
            <Card className="flex-1 min-h-[500px] border-2 border-slate-200/60 shadow-lg bg-white/90 backdrop-blur-sm rounded-xl overflow-hidden">
              <CardHeader className="pb-3 bg-gradient-to-r from-pink-50 to-rose-50 border-b border-slate-200/40">
                <CardTitle className="flex items-center space-x-2 text-lg">
                  <div className="w-7 h-7 bg-gradient-to-r from-pink-500 to-rose-500 rounded-lg flex items-center justify-center">
                    <Monitor className="w-4 h-4 text-white" />
                  </div>
                  <span>Live Browser View</span>
                </CardTitle>
              </CardHeader>
              <CardContent className="p-4 h-full">
                {/* Status Indicators for Mobile */}
                {taskState.status === 'connecting' && (
                  <div className="mb-4 p-3 bg-blue-50 rounded-lg border border-blue-200">
                    <div className="flex items-center gap-2 text-blue-700">
                      <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-700"></div>
                      <span className="text-sm font-medium">Connecting to Browserbase...</span>
                    </div>
                    <p className="text-xs text-blue-600 mt-1">
                      Creating session and generating live view URL. Waiting for WebSocket updates...
                    </p>
                  </div>
                )}
                
                {taskState.status === 'running' && !currentLiveViewUrl && (
                  <div className="mb-4 p-3 bg-yellow-50 rounded-lg border border-yellow-200">
                    <div className="flex items-center gap-2 text-yellow-700">
                      <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-yellow-700"></div>
                      <span className="text-sm font-medium">Task Running - Waiting for Live View URL</span>
                    </div>
                    <p className="text-xs text-yellow-600 mt-1">
                      The task is executing. Live view URL will be received via WebSocket shortly...
                    </p>
                  </div>
                )}
                

                
                {renderLiveView()}
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    )
  }

  // Desktop layout - dual pane
  return (
    <div className={`h-full min-h-[800px] w-full ${className}`}>
      <Card className="border-2 border-slate-200/60 shadow-xl bg-white/90 backdrop-blur-sm h-full w-full rounded-xl overflow-hidden">
        <CardHeader className="pb-4 flex-shrink-0 bg-gradient-to-r from-pink-50 to-rose-50 border-b-2 border-slate-200/40">
          <CardTitle className="flex items-center justify-between">
            <div className="flex items-center space-x-3 text-xl">
              <div className="w-8 h-8 bg-gradient-to-r from-pink-500 to-rose-500 rounded-lg flex items-center justify-center">
                <Activity className="w-5 h-5 text-white" />
              </div>
              <span>Dual Pane Task Monitor</span>
            </div>
            {taskState.status !== 'idle' && (
              <div className="flex items-center gap-3">
                <Badge variant="outline" className="flex items-center gap-1 border-pink-300 text-pink-700 bg-pink-50">
                  <Monitor className="w-3 h-3" />
                  Task: {taskState.taskId?.slice(0, 8)}...
                </Badge>
                <Button 
                  size="sm" 
                  variant="outline" 
                  onClick={resetTaskState}
                  className="border-pink-300 text-pink-700 hover:bg-pink-50"
                >
                  New Task
                </Button>
              </div>
            )}
          </CardTitle>
          <CardDescription className="text-slate-600 text-base">
            {taskState.status === 'idle' 
              ? 'Create and monitor browser automation tasks in real-time with dual pane interface'
              : 'Monitor your browser automation task in real-time'
            }
          </CardDescription>
        </CardHeader>
        
        <CardContent className="p-0 flex-1 h-full overflow-hidden min-h-0">
          <ResizablePanelGroup direction="horizontal" className="h-full w-full">
            {/* Left Pane - Ticket Data Form (35% default) */}
            <ResizablePanel defaultSize={35} minSize={25} maxSize={50}>
              <div className="h-full p-3 border-r-2 border-slate-200/40 bg-gradient-to-b from-white to-slate-50/30 min-h-0">
                <div className="h-full bg-white rounded-lg border border-slate-200/50 shadow-sm overflow-hidden flex flex-col">
                  {/* Header with icon and title - Fixed height */}
                  <div className="flex-shrink-0 p-4 border-b border-slate-200/50 bg-gradient-to-r from-red-50 to-red-100">
                    <div className="flex items-center space-x-3">
                      <div className="w-8 h-8 bg-red-500 rounded-lg flex items-center justify-center">
                        <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                        </svg>
                      </div>
                      <h3 className="text-lg font-semibold text-gray-800">Ticket Data</h3>
                    </div>
                  </div>
                  
                  {/* Scrollable Content Area - Takes remaining height */}
                  <div className="flex-1 overflow-y-auto p-6 pb-12 space-y-6 min-h-0 min-h-[600px]">
                    {/* OCR Status and Success Indicator */}
                    {ocrStatus && (
                      <div className="p-3 rounded-lg border border-slate-200/50 mb-6">
                        <div className={`flex items-center gap-3 p-3 rounded-lg ${
                          ocrSuccess 
                            ? 'bg-green-50 border border-green-200 text-green-700' 
                            : isProcessing 
                              ? 'bg-blue-50 border border-blue-200 text-blue-700'
                              : 'bg-yellow-50 border border-yellow-200 text-yellow-700'
                        }`}>
                          <div className={`w-4 h-4 rounded-full ${
                            ocrSuccess 
                              ? 'bg-green-500' 
                              : isProcessing 
                                ? 'bg-blue-500 animate-pulse'
                                : 'bg-yellow-500'
                          }`}></div>
                          <span className="text-sm font-medium">{ocrStatus}</span>
                        </div>
                      </div>
                    )}
                    
                    {/* File Upload Section */}
                    <div className="p-5 border border-slate-200 rounded-lg bg-slate-50 mb-6">
                      <div className="space-y-3">
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-2">
                            Upload Ticket Image
                          </label>
                          <input
                            type="file"
                            accept="image/*,.pdf"
                            onChange={handleFileChange}
                            className="block w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-red-50 file:text-red-700 hover:file:bg-red-100"
                          />
                        </div>
                        
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-2">
                            Vendor URL (Optional)
                          </label>
                          <input
                            type="url"
                            placeholder="https://facturacion.walmartmexico.com.mx/"
                            value={vendorUrl}
                            onChange={(e) => setVendorUrl(e.target.value)}
                            className="block w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-red-500 focus:border-transparent"
                          />
                        </div>
                        
                        {selectedFile && (
                          <div className="text-sm text-gray-600">
                            Selected: {selectedFile.name}
                          </div>
                        )}
                        
                        <Button
                          onClick={handleImageUpload}
                          disabled={!selectedFile || isUploading}
                          className="w-full bg-red-600 hover:bg-red-700 text-white"
                        >
                          {isUploading ? (
                            <>
                              <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                              Processing...
                            </>
                          ) : (
                            'Process Ticket with OCR'
                          )}
                        </Button>
                        
                        {uploadError && (
                          <div className="text-sm text-red-600 bg-red-50 p-2 rounded border border-red-200">
                            {uploadError}
                          </div>
                        )}
                      </div>
                    </div>
                    
                    {/* User Details Section (40-50% of content) */}
                    <div className="bg-blue-50 border border-blue-200 rounded-lg p-5 mb-6">
                      <h4 className="text-sm font-semibold text-blue-800 mb-3 flex items-center gap-2">
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                        </svg>
                        User Details
                      </h4>
                      <div className="grid grid-cols-2 gap-3">
                        {/* Mesa/Folio */}
                        <div className="bg-white border border-blue-200 rounded-lg p-3">
                          <label className="block text-xs font-medium text-blue-700 mb-1">Mesa/Folio</label>
                          <div className="min-h-[32px] px-3 py-2 bg-white border border-blue-200 rounded text-sm text-gray-800 break-all">
                            {ticketData['Mesa_Folio'] || 'No disponible'}
                          </div>
                        </div>
                        
                        {/* Fecha */}
                        <div className="bg-white border border-blue-200 rounded-lg p-3">
                          <label className="block text-xs font-medium text-blue-700 mb-1">Fecha</label>
                          <div className="min-h-[32px] px-3 py-2 bg-white border border-blue-200 rounded text-sm text-gray-800 break-all">
                            {ticketData['Fecha'] || 'No disponible'}
                          </div>
                        </div>
                        
                        {/* ID Ticket */}
                        <div className="bg-white border border-blue-200 rounded-lg p-3">
                          <label className="block text-xs font-medium text-blue-700 mb-1">ID Ticket</label>
                          <div className="min-h-[32px] px-3 py-2 bg-white border border-blue-200 rounded text-sm text-gray-800 break-all">
                            {ticketData['ID_Ticket'] || 'No disponible'}
                          </div>
                        </div>
                        
                        {/* Total */}
                        <div className="bg-white border border-blue-200 rounded-lg p-3">
                          <label className="block text-xs font-medium text-blue-700 mb-1">Total</label>
                          <div className="min-h-[32px] px-3 py-2 bg-white border border-blue-200 rounded text-sm text-gray-800 break-all">
                            {ticketData['Total'] || 'No disponible'}
                          </div>
                        </div>
                        
                        {/* Store/Branch/Plaza */}
                        <div className="bg-white border border-blue-200 rounded-lg p-3">
                          <label className="block text-xs font-medium text-blue-700 mb-1">Store/Branch/Plaza</label>
                          <div className="min-h-[32px] px-3 py-2 bg-white border border-blue-200 rounded text-sm text-gray-800 break-all">
                            {ticketData['Store_Branch_Plaza'] || 'No disponible'}
                          </div>
                        </div>
                        
                        {/* Register/Station/Terminal */}
                        <div className="bg-white border border-blue-200 rounded-lg p-3">
                          <label className="block text-xs font-medium text-blue-700 mb-1">Register/Station/Terminal</label>
                          <div className="min-h-[32px] px-3 py-2 bg-white border border-blue-200 rounded text-sm text-gray-800 break-all">
                            {ticketData['Register_Station_Terminal'] || 'No disponible'}
                          </div>
                        </div>
                        
                        {/* Payment Type */}
                        <div className="bg-white border border-blue-200 rounded-lg p-3">
                          <label className="block text-xs font-medium text-blue-700 mb-1">Payment Type</label>
                          <div className="min-h-[32px] px-3 py-2 bg-white border border-blue-200 rounded text-sm text-gray-800 break-all">
                            {ticketData['Payment_Type'] || 'No disponible'}
                          </div>
                        </div>
                        
                        {/* Last 4 digits of card */}
                        <div className="bg-white border border-blue-200 rounded-lg p-3">
                          <label className="block text-xs font-medium text-blue-700 mb-1">Card Last 4 Digits</label>
                          <div className="min-h-[32px] px-3 py-2 bg-white border border-blue-200 rounded text-sm text-gray-800 break-all">
                            {ticketData['Card_Last_4_Digits'] || 'No disponible'}
                          </div>
                        </div>
                      </div>
                    </div>
                    
                    {/* Raw OCR Text Section (30-35% of content) */}
                    <div className="bg-green-50 border border-green-200 rounded-xl p-5 mb-4">
                      <h4 className="text-sm font-semibold text-green-800 mb-3 flex items-center gap-2">
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                        </svg>
                        Raw OCR Text
                      </h4>
                      <div className="bg-white border border-green-200 rounded-xl p-4">
                        <div className="max-h-[200px] overflow-y-auto pr-2 pb-2 scrollbar-thin scrollbar-thumb-gray-300 scrollbar-track-gray-100">
                          {rawText ? (
                            <pre className="whitespace-pre-wrap text-xs leading-relaxed text-gray-800 break-all">
                              {rawText}
                            </pre>
                          ) : (
                            <span className="text-gray-500 italic">No raw text available</span>
                          )}
                        </div>
                      </div>
                    </div>
                    
                    {/* Bottom Spacer - Reduced for better spacing */}
                    <div className="h-8"></div>
                  </div>
                </div>
              </div>
            </ResizablePanel>

            <ResizableHandle withHandle className="w-2 bg-gradient-to-b from-pink-100 to-rose-100 hover:bg-gradient-to-b hover:from-pink-200 hover:to-rose-200 transition-all duration-200" />

            {/* Right Pane - Live Browser View (65% default) */}
            <ResizablePanel defaultSize={65} minSize={50} maxSize={75}>
              <div className="h-full p-3 bg-gradient-to-b from-white to-slate-50/30 min-h-0">
                <div className="h-full bg-white rounded-xl border border-slate-200/50 shadow-sm overflow-hidden">
                  <div className="h-full flex flex-col">
                    {/* Live View URL Input Header - Ultra Compact */}
                    <div className="flex-shrink-0 p-2 border-b border-gray-200 bg-gray-50 mb-1">
                      <div className="flex items-center justify-between mb-1">
                        <h3 className="text-sm font-semibold flex items-center gap-2">
                          <ExternalLink className="w-4 h-4" />
                          Live Browser View
                        </h3>
                        <Button 
                          size="sm" 
                          variant="outline" 
                          onClick={handleRefreshLiveView}
                          disabled={!currentLiveViewUrl}
                          className="h-6 px-2 text-xs"
                        >
                          <RefreshCw className="w-3 h-3 mr-1" />
                          Refresh
                        </Button>
                      </div>
                      <div className="flex gap-2 mb-1">
                        <Input
                          type="url"
                          placeholder="Enter live view URL..."
                          value={currentLiveViewUrl || ''}
                          onChange={(e) => setCurrentLiveViewUrl(e.target.value)}
                          className="flex-1 h-7 text-xs"
                        />
                        <Button 
                          size="sm" 
                          variant="default"
                          onClick={handleUpdateLiveViewUrl}
                          disabled={!currentLiveViewUrl}
                          className="h-7 px-2 text-xs"
                        >
                          Update
                        </Button>
                        <Button 
                          size="sm" 
                          variant="outline"
                          onClick={() => {
                            setCurrentLiveViewUrl('')
                            console.log('Live view URL cleared')
                          }}
                          className="h-7 px-2 text-xs"
                        >
                          Clear
                        </Button>
                      </div>
                      {currentLiveViewUrl && (
                        <div className="text-xs text-gray-600 bg-gray-50 p-1 rounded border border-gray-200">
                          <strong>Current URL:</strong> {currentLiveViewUrl}
                        </div>
                      )}
                    </div>
                    
                    {/* Live View Content - Takes maximum height with minimal padding */}
                    <div className="flex-1 p-1 overflow-hidden min-h-0">
                      {/* Status Indicators - Ultra Compact */}
                      {taskState.status === 'connecting' && (
                        <div className="mb-2 p-2 bg-blue-50 rounded border border-blue-200">
                          <div className="flex items-center gap-2 text-blue-700 mb-1">
                            <div className="animate-spin rounded-full h-3 w-3 border-b-2 border-blue-700"></div>
                            <span className="text-xs font-medium">Connecting to Browserbase...</span>
                          </div>
                          <p className="text-xs text-blue-600">
                            Creating session and generating live view URL...
                          </p>
                        </div>
                      )}
                      
                      {taskState.status === 'running' && !currentLiveViewUrl && (
                        <div className="mb-2 p-2 bg-yellow-50 rounded border border-yellow-200">
                          <div className="flex items-center gap-2 text-yellow-700 mb-1">
                            <div className="animate-spin rounded-full h-3 w-3 border-b-2 border-yellow-700"></div>
                            <span className="text-xs font-medium">Task Running - Waiting for Live View URL</span>
                          </div>
                          <p className="text-xs text-blue-600">
                            The task is executing. Live view URL will be received shortly...
                          </p>
                        </div>
                      )}
                      
                      {/* Live View Iframe - Takes maximum available height */}
                      <div className="flex-1 min-h-0">
                        {renderLiveView()}
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </ResizablePanel>
          </ResizablePanelGroup>
        </CardContent>
      </Card>
    </div>
  )
}

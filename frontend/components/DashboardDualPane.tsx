'use client'

import React, { useState, useEffect } from 'react'
import { ResizablePanelGroup, ResizablePanel, ResizableHandle } from '@/components/ui/resizable'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { CopyField, CopyTextArea, CopyAllButton } from '@/components/ui/copy-field'
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
  Address: string
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
    Address: '',
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

  // Check if mobile on mount and resize
  useEffect(() => {
    const checkMobile = () => {
      setIsMobile(window.innerWidth < 1024)
    }
    
    checkMobile()
    window.addEventListener('resize', checkMobile)
    return () => window.removeEventListener('resize', checkMobile)
  }, [])

  // Initialize with provided ticket data
  useEffect(() => {
    if (initialTicketData) {
      setTicketData(initialTicketData)
      setRawText(initialTicketData.raw_text || initialTicketData.Full_Raw_Text || '')
      setOcrSuccess(true)
      setOcrStatus('OCR completed successfully!')
    }
  }, [initialTicketData])

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
    setIsProcessing(true)
    setOcrStatus('Processing image with Azure Document Intelligence...')

    try {
      const formData = new FormData()
      formData.append('file', selectedFile)
      if (vendorUrl) {
        formData.append('vendor_url', vendorUrl)
      }

      const response = await fetch(`${API_BASE_URL}/api/v1/tickets/upload`, {
        method: 'POST',
        body: formData,
      })

      if (!response.ok) {
        throw new Error(`Upload failed: ${response.statusText}`)
      }

      const result = await response.json()
      console.log('Upload result:', result)

      if (result.success) {
        setUploadedTicketId(result.ticket_id)
        setTicketData(result.extracted_data || {})
        setRawText(result.raw_text || '')
        setOcrSuccess(true)
        setOcrStatus('OCR completed successfully!')
        
        // Auto-switch to dual pane if we have extracted data
        if (result.extracted_data && Object.keys(result.extracted_data).length > 0) {
          console.log('Auto-switching to dual pane with extracted data')
        }
      } else {
        throw new Error(result.error || 'Upload failed')
      }
    } catch (error) {
      console.error('Upload error:', error)
      setUploadError(error instanceof Error ? error.message : 'Upload failed')
      setOcrSuccess(false)
      setOcrStatus('OCR processing failed')
    } finally {
      setIsUploading(false)
      setIsProcessing(false)
    }
  }

  const handleUpdateLiveViewUrl = () => {
    if (currentLiveViewUrl) {
      console.log('Updating live view URL:', currentLiveViewUrl)
      // Additional logic for updating live view
    }
  }

  const handleRefreshLiveView = () => {
    console.log('Refreshing live view')
    // Additional logic for refreshing live view
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

  const renderLiveView = () => {
    if (!currentLiveViewUrl) {
      return (
        <div className="h-full flex items-center justify-center bg-gray-50 rounded-lg border-2 border-dashed border-gray-300">
          <div className="text-center text-gray-500">
            <Monitor className="w-16 h-16 mx-auto mb-4 text-gray-400" />
            <h3 className="text-lg font-medium mb-2">No Live View Available</h3>
            <p className="text-sm">Waiting for task to start and generate live view URL...</p>
            <div className="mt-4 p-3 bg-blue-50 rounded border border-blue-200">
              <p className="text-xs text-blue-700 font-medium">Debug Info:</p>
              <p className="text-xs text-blue-600">Task ID: {taskState.taskId || 'None'}</p>
              <p className="text-xs text-blue-600">Status: {taskState.status}</p>
              <p className="text-xs text-blue-600">Session ID: {taskState.sessionId || 'None'}</p>
              <p className="text-xs text-blue-600">Live View URL: {currentLiveViewUrl || 'Not set'}</p>
            </div>
          </div>
        </div>
      )
    }

    // Validate URL format
    const isValidBrowserbaseUrl = currentLiveViewUrl.includes('browserbase.com/devtools/inspector.html')
    
    if (!isValidBrowserbaseUrl) {
      return (
        <div className="h-full flex items-center justify-center bg-yellow-50 rounded-lg border-2 border-dashed border-yellow-300">
          <div className="text-center text-yellow-600">
            <Monitor className="w-16 h-16 mx-auto mb-4 text-yellow-400" />
            <h3 className="text-lg font-medium mb-2">Invalid Live View URL Format</h3>
            <p className="text-sm">Expected Browserbase devtools URL format</p>
            <div className="mt-4 p-3 bg-yellow-100 rounded border border-yellow-200">
              <p className="text-xs text-yellow-700 font-medium">Received URL:</p>
              <p className="text-xs text-yellow-600 break-all">{currentLiveViewUrl}</p>
              <p className="text-xs text-yellow-600 mt-2">Expected format: https://www.browserbase.com/devtools/inspector.html?wss=...</p>
            </div>
          </div>
        </div>
      )
    }

    return (
      <div className="h-full bg-white rounded-lg border border-gray-200 overflow-hidden">
        <div className="p-3 bg-gray-50 border-b border-gray-200 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Monitor className="w-4 h-4 text-gray-600" />
            <span className="text-sm font-medium text-gray-700">Live Browser View</span>
          </div>
          <div className="flex items-center gap-2">
            <Badge variant="outline" className="text-xs">
              {taskState.status}
            </Badge>
            <Button size="sm" variant="outline" onClick={handleRefreshLiveView}>
              🔄 Refresh
            </Button>
          </div>
        </div>
        
        {/* URL Debug Info */}
        <div className="p-2 bg-blue-50 border-b border-blue-200">
          <div className="text-xs text-blue-700">
            <strong>Live View URL:</strong> 
            <span className="ml-2 break-all">{currentLiveViewUrl}</span>
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

  // Main component return
  return (
    <div className={`h-full min-h-[600px] w-full ${className}`}>
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
              <div className="h-full p-4 border-r-2 border-slate-200/40 bg-gradient-to-b from-white to-slate-50/30 min-h-0">
                <div className="h-full bg-white rounded-lg border border-slate-200/50 shadow-sm overflow-hidden">
                  {/* Header with icon and title */}
                  <div className="p-4 border-b border-slate-200/50 bg-gradient-to-r from-red-50 to-red-100">
                    <div className="flex items-center space-x-3">
                      <div className="w-8 h-8 bg-red-500 rounded-lg flex items-center justify-center">
                        <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                        </svg>
                      </div>
                      <h3 className="text-lg font-semibold text-gray-800">Datos del Ticket</h3>
                    </div>
                  </div>
                  
                  {/* OCR Status and Success Indicator */}
                  {ocrStatus && (
                    <div className="p-4 border-b border-slate-200/50">
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
                  
                  {/* Extracted Ticket Information Display */}
                  <div className="p-4">
                    <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center mb-4 gap-2">
                      <h3 className="text-lg font-semibold text-gray-800">Extracted Data Fields</h3>
                      <CopyAllButton ticketData={ticketData} />
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-3">
                      {/* Mesa/Folio */}
                      <div className="bg-gray-50 border border-red-200 rounded-lg p-3">
                        <CopyField 
                          value={ticketData['Mesa_Folio'] || ''}
                          label="Mesa/Folio"
                        />
                      </div>
                      
                      {/* Fecha */}
                      <div className="bg-gray-50 border border-red-200 rounded-lg p-3">
                        <CopyField 
                          value={ticketData['Fecha'] || ''}
                          label="Fecha"
                        />
                      </div>
                      
                      {/* ID Ticket */}
                      <div className="bg-gray-50 border border-red-200 rounded-lg p-3">
                        <CopyField 
                          value={ticketData['ID_Ticket'] || ''}
                          label="ID Ticket"
                        />
                      </div>
                      
                      {/* Total */}
                      <div className="bg-gray-50 border border-red-200 rounded-lg p-3">
                        <CopyField 
                          value={ticketData['Total'] || ''}
                          label="Total"
                        />
                      </div>
                      
                      {/* Address */}
                      <div className="bg-gray-50 border border-red-200 rounded-lg p-3 min-w-0">
                        <CopyField 
                          value={ticketData['Address'] || ''}
                          label="Address"
                        />
                      </div>
                      {/* Register/Station/Terminal */}
                      <div className="bg-gray-50 border border-red-200 rounded-lg p-3 min-w-0">
                        <CopyField 
                          value={ticketData['Register_Station_Terminal'] || ''}
                          label="Register/Station/Terminal"
                        />
                      </div>
                      
                      {/* Payment Type */}
                      <div className="bg-gray-50 border border-red-200 rounded-lg p-3 min-w-0">
                        <CopyField 
                          value={ticketData['Payment_Type'] || ''}
                          label="Payment Type"
                        />
                      </div>
                      
                      {/* Last 4 digits of card */}
                      <div className="bg-gray-50 border border-red-200 rounded-lg p-3 min-w-0">
                        <CopyField 
                          value={ticketData['Card_Last_4_Digits'] || ''}
                          label="Card Last 4 Digits"
                        />
                      </div>
                    </div>
                    
                    {/* Raw OCR Text Display */}
                    <div className="mt-4">
                      <div className="bg-gray-50 border border-red-200 rounded-lg p-3">
                        <CopyTextArea 
                          value={rawText}
                          label="Raw OCR Text"
                          height="h-[200px] sm:h-[300px]"
                          placeholder="No raw text available"
                        />
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </ResizablePanel>
   
            <ResizableHandle withHandle className="w-2 bg-gradient-to-b from-pink-100 to-rose-100 hover:bg-gradient-to-b hover:from-pink-200 hover:to-rose-200 transition-all duration-200" />
   
            {/* Right Pane - Live View with URL Input (65% default) */}
            <ResizablePanel defaultSize={65} minSize={50} maxSize={75}>
              <div className="h-full p-4 bg-gradient-to-b from-white to-slate-50/30 min-h-0">
                <div className="h-full bg-white rounded-lg border border-slate-200/50 shadow-sm overflow-hidden">
                  <div className="h-full flex flex-col">
                    {/* Live View URL Input Header */}
                    <div className="p-4 border-b border-gray-200 bg-gray-50">
                      <div className="flex items-center justify-between mb-3">
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
                      <div className="flex flex-col sm:flex-row gap-2">
                        <Input
                          type="url"
                          placeholder="Enter live view URL (e.g., https://browserbase.com/devtools/inspector.html?wss=...)"
                          value={currentLiveViewUrl || ''}
                          onChange={(e) => setCurrentLiveViewUrl(e.target.value)}
                          className="flex-1"
                        />
                        <div className="flex gap-2">
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
                      </div>
                      {currentLiveViewUrl && (
                        <div className="text-xs text-gray-600 bg-gray-50 p-2 rounded mt-2">
                          <strong>Current URL:</strong> {currentLiveViewUrl}
                        </div>
                      )}
                    </div>
                    
                    {/* Live View Iframe */}
                    <div className="flex-1 p-4">
                       {/* Status Indicator */}
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
                      
                      {/* Debug Panel */}
                      <div className="mb-4 p-3 bg-gray-50 rounded-lg border border-gray-200">
                        <h4 className="text-sm font-medium text-gray-700 mb-2 flex items-center gap-2">
                          <Activity className="w-4 h-4" />
                          Live View Debug Information
                        </h4>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                          <div>
                            <span className="font-medium text-gray-600">Task ID:</span>
                            <span className="ml-2 text-gray-800 font-mono">{taskState.taskId || 'None'}</span>
                          </div>
                          <div>
                            <span className="font-medium text-gray-600">Status:</span>
                            <span className="ml-2 text-gray-800">{taskState.status}</span>
                          </div>
                          <div>
                            <span className="font-medium text-gray-600">Session ID:</span>
                            <span className="ml-2 text-gray-800 font-mono">{taskState.sessionId || 'None'}</span>
                          </div>
                          <div>
                            <span className="font-medium text-gray-600">Live View URL:</span>
                            <span className="ml-2 text-gray-800 font-mono break-all">
                              {currentLiveViewUrl || 'Not set'}
                            </span>
                          </div>
                        </div>
                        
                        {/* WebSocket Status */}
                        <div className="mt-3 p-2 bg-green-50 rounded border border-green-200">
                          <div className="text-xs text-green-700">
                            <strong>WebSocket Status:</strong>
                            <div className="mt-1">
                              <div>✅ Connection: Active for task {taskState.taskId || 'None'}</div>
                              <div>✅ Updates: Listening for live view URL</div>
                              <div>✅ Fallback: API fetch after 30s if needed</div>
                            </div>
                          </div>
                        </div>
                        
                        {currentLiveViewUrl && (
                          <div className="mt-2 p-2 bg-blue-50 rounded border border-blue-200">
                            <div className="text-xs text-blue-700">
                              <strong>URL Analysis:</strong>
                              <div className="mt-1">
                                <div>✅ Protocol: {currentLiveViewUrl.startsWith('https://') ? 'HTTPS' : 'Other'}</div>
                                <div>✅ Domain: {currentLiveViewUrl.includes('browserbase.com') ? 'Browserbase' : 'Other'}</div>
                                <div>✅ Path: {currentLiveViewUrl.includes('/devtools/inspector.html') ? 'DevTools Inspector' : 'Other'}</div>
                                <div>✅ WebSocket: {currentLiveViewUrl.includes('wss=') ? 'Present' : 'Missing'}</div>
                                <div>✅ Debug Flag: {currentLiveViewUrl.includes('debug=true') ? 'Present' : 'Missing'}</div>
                              </div>
                            </div>
                          </div>
                        )}
                      </div>
                      
                      {renderLiveView()}
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

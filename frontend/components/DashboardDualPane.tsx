import React, { useState, useEffect, useRef } from 'react'
import { ResizablePanelGroup, ResizablePanel, ResizableHandle } from '@/components/ui/resizable'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { Activity, Monitor, ExternalLink, RefreshCw, User, ChevronDown, BarChart3, LogOut, Zap } from 'lucide-react'

export interface DashboardDualPaneProps {
  onTaskSubmit?: (taskId: string) => void
  className?: string
  initialTicketData?: any
  vendorUrl?: string
  userProfile?: any
  showBackButton?: boolean
  onBackToUpload?: () => void
}

export function DashboardDualPane({
  onTaskSubmit,
  className = '',
  initialTicketData,
  vendorUrl = '',
  userProfile,
  showBackButton = false,
  onBackToUpload
}: DashboardDualPaneProps) {
  // State for file upload and OCR
  const [selectedFile, setSelectedFile] = useState<File | null>(null)
  const [isUploading, setIsUploading] = useState(false)
  const [uploadError, setUploadError] = useState<string | null>(null)
  const [ocrStatus, setOcrStatus] = useState<string | null>(null)
  const [ocrSuccess, setOcrSuccess] = useState(false)
  const [isProcessing, setIsProcessing] = useState(false)
  const [rawText, setRawText] = useState<string>('')

  // State for ticket data
  const [ticketData, setTicketData] = useState<any>({})
  const [vendorUrlState, setVendorUrlState] = useState(vendorUrl)

  // State for task management
  const [taskState, setTaskState] = useState({
    status: 'idle' as 'idle' | 'connecting' | 'running' | 'completed' | 'error',
    taskId: null as string | null,
    message: null as string | null
  })

  // State for live view
  const [currentLiveViewUrl, setCurrentLiveViewUrl] = useState<string | null>(null)
  const [profileDropdownOpen, setProfileDropdownOpen] = useState(false)
  const dropdownRef = useRef<HTMLDivElement>(null)

  // Initialize with props data
  useEffect(() => {
    if (initialTicketData) {
      setTicketData(initialTicketData)
    }
    if (vendorUrl) {
      setVendorUrlState(vendorUrl)
    }
  }, [initialTicketData, vendorUrl])

  // Handle file selection
  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (file) {
      setSelectedFile(file)
      setUploadError(null)
    }
  }

  // Handle image upload and OCR processing
  const handleImageUpload = async () => {
    if (!selectedFile) return

    setIsUploading(true)
    setUploadError(null)
    setOcrStatus('Processing image...')
    setIsProcessing(true)

    try {
      // Simulate OCR processing
      await new Promise(resolve => setTimeout(resolve, 2000))
      
      // Simulate successful OCR
      setOcrSuccess(true)
      setOcrStatus('OCR completed successfully!')
      setIsProcessing(false)
      
      // Simulate extracted data
      const mockData = {
        'Mesa_Folio': 'Mesa 1',
        'Fecha': '2024-01-15',
        'ID_Ticket': 'TKT-001',
        'Total': '$150.00',
        'Store_Branch_Plaza': 'Walmart Centro',
        'Register_Station_Terminal': 'Terminal 3',
        'Payment_Type': 'Credit Card',
        'Card_Last_4_Digits': '1234',
        'TC#': 'TC123456',
        'TR#': 'TR789012',
        'ID': 'ID001',
        'Fol_Vta': 'FV001',
        'Comercio': 'Walmart Mexico'
      }
      
      setTicketData(mockData)
      setRawText('Sample raw text extracted from the ticket image...')
      
    } catch (error) {
      setUploadError('Failed to process image. Please try again.')
      setOcrStatus('OCR failed')
      setIsProcessing(false)
    } finally {
      setIsUploading(false)
    }
  }

  // Handle start agent task
  const handleStartAgentTask = async () => {
    if (!vendorUrlState) {
      alert('Please enter the vendor website URL first')
      return
    }

    if (!ocrSuccess) {
      alert('Please complete OCR processing first')
      return
    }

    setTaskState({
      status: 'connecting',
      taskId: null,
      message: null
    })

    try {
      // Simulate task creation
      await new Promise(resolve => setTimeout(resolve, 3000))
      
      const taskId = 'task_' + Math.random().toString(36).substr(2, 9)
      
      setTaskState({
        status: 'running',
        taskId,
        message: 'Task created successfully and is now running'
      })

      // Simulate receiving live view URL
      setTimeout(() => {
        setCurrentLiveViewUrl('https://example.com/live-view')
      }, 2000)

    } catch (error) {
      setTaskState({
        status: 'error',
        taskId: null,
        message: 'Failed to create task'
      })
    }
  }

  // Reset task state
  const resetTaskState = () => {
    setTaskState({
      status: 'idle',
      taskId: null,
      message: null
    })
    setCurrentLiveViewUrl(null)
  }

  // Handle live view URL update
  const handleUpdateLiveViewUrl = () => {
    if (currentLiveViewUrl) {
      console.log('Live view URL updated:', currentLiveViewUrl)
    }
  }

  // Handle refresh live view
  const handleRefreshLiveView = () => {
    if (currentLiveViewUrl) {
      console.log('Refreshing live view:', currentLiveViewUrl)
    }
  }

  // Render live view
  const renderLiveView = () => {
    if (!currentLiveViewUrl) {
      return (
        <div className="flex items-center justify-center h-full bg-gray-50 text-gray-500">
          <div className="text-center">
            <ExternalLink className="w-12 h-12 mx-auto mb-2 text-gray-300" />
            <p className="text-sm">Enter a live view URL to start monitoring</p>
          </div>
        </div>
      )
    }

    return (
      <iframe
        src={currentLiveViewUrl}
        className="w-full h-full border-0"
        title="Live View"
        sandbox="allow-scripts allow-same-origin allow-forms"
      />
    )
  }

  // Handle click outside dropdown
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setProfileDropdownOpen(false)
      }
    }

    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  // Mobile layout - single pane
  if (typeof window !== 'undefined' && window.innerWidth < 768) {
    return (
      <div className={`h-full w-full overflow-hidden ${className}`}>
        <Card className="border-2 border-slate-200/60 shadow-xl bg-white/90 backdrop-blur-sm h-full w-full rounded-xl overflow-hidden hover:shadow-2xl transition-all duration-300">
          <CardHeader className="pb-3 flex-shrink-0 bg-gradient-to-r from-pink-50 to-rose-50 border-b-2 border-slate-200/40">
            <CardTitle className="flex items-center justify-between">
              <div className="flex items-center space-x-3 text-lg">
                <div className="w-7 h-7 bg-gradient-to-r from-pink-500 to-rose-500 rounded-lg flex items-center justify-center">
                  <Activity className="w-4 h-4 text-white" />
                </div>
                <span>Task Monitor</span>
              </div>
              {taskState.status !== 'idle' && (
                <Button
                  size="sm"
                  variant="outline"
                  onClick={resetTaskState}
                  className="border-pink-300 text-pink-700 hover:bg-pink-50"
                >
                  New Task
                </Button>
              )}
              {showBackButton && onBackToUpload && (
                <Button
                  size="sm"
                  variant="outline"
                  onClick={onBackToUpload}
                  className="border-pink-300 text-pink-700 hover:bg-pink-50 font-semibold"
                >
                  ← Back to Upload
                </Button>
              )}
            </CardTitle>
            <CardDescription className="text-slate-600 text-sm">
              {taskState.status === 'idle' 
                ? 'Create and monitor browser automation tasks'
                : 'Monitor your browser automation task in real-time'
              }
            </CardDescription>
          </CardHeader>
          
          <CardContent className="p-3">
            <div className="space-y-4">
              {/* File Upload Section */}
              <div className="p-4 border border-slate-200 rounded-lg bg-slate-50">
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
                      value={vendorUrlState}
                      onChange={(e) => setVendorUrlState(e.target.value)}
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
              
              {/* Start Agent Button */}
              <div className="p-4 border border-slate-200 rounded-lg bg-slate-50">
                <Button
                  onClick={handleStartAgentTask}
                  disabled={!vendorUrlState || !ocrSuccess || taskState.status === 'running' || taskState.status === 'connecting'}
                  className="w-full bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white font-semibold py-2 px-4 rounded-lg shadow-lg hover:shadow-xl transition-all duration-200 text-sm"
                >
                  {taskState.status === 'connecting' ? (
                    <>
                      <div className="animate-spin rounded-full h-3 w-3 border-b-2 border-white mr-2"></div>
                      Creating Task...
                    </>
                  ) : taskState.status === 'running' ? (
                    <>
                      <div className="animate-spin rounded-full h-3 w-3 border-b-2 border-white mr-2"></div>
                      Agent Running...
                    </>
                  ) : (
                    <>
                      <Zap className="w-4 h-4 mr-2" />
                      Start Agent Task
                    </>
                  )}
                </Button>
                
                {/* Status Messages */}
                {!vendorUrlState && (
                  <p className="text-xs text-red-600 mt-2">Please enter the vendor website URL first</p>
                )}
                {!ocrSuccess && vendorUrlState && (
                  <p className="text-xs text-red-600 mt-2">Please complete OCR processing first</p>
                )}
                {taskState.status === 'running' && (
                  <div className="mt-2 p-2 bg-blue-50 rounded border border-blue-200">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-xs text-blue-700">
                          <strong>Task Status:</strong> {taskState.status}
                          {taskState.taskId && (
                            <span className="block mt-1">Task ID: {taskState.taskId}</span>
                          )}
                        </p>
                      </div>
                      <Button
                        onClick={resetTaskState}
                        variant="outline"
                        size="sm"
                        className="text-xs h-6 px-2"
                      >
                        Reset
                      </Button>
                    </div>
                  </div>
                )}
                
                {/* Task Message Display */}
                {taskState.message && (
                  <div className={`mt-2 p-3 rounded border ${
                    taskState.status === 'success' 
                      ? 'bg-green-50 border-green-200 text-green-700' 
                      : taskState.status === 'error'
                      ? 'bg-red-50 border-red-200 text-red-700'
                      : 'bg-blue-50 border-blue-200 text-blue-700'
                  }`}>
                    <p className="text-sm font-medium">
                      {taskState.status === 'success' && '✅ '}
                      {taskState.status === 'error' && '❌ '}
                      {taskState.status === 'info' && 'ℹ️ '}
                      {taskState.message}
                    </p>
                  </div>
                )}
              </div>
              
              {renderLiveView()}
            </div>
          </CardContent>
        </Card>
      </div>
    )
  }

  // Desktop layout - dual pane
  return (
    <div className={`h-full w-full overflow-hidden ${className}`}>
      <Card className="border-2 border-slate-200/60 shadow-xl bg-white/90 backdrop-blur-sm h-full w-full rounded-xl overflow-hidden hover:shadow-2xl transition-all duration-300">
        <CardHeader className="pb-3 flex-shrink-0 bg-gradient-to-r from-pink-50 to-rose-50 border-b-2 border-slate-200/40">
          <CardTitle className="flex items-center justify-between">
            <div className="flex items-center space-x-3 text-lg">
              <div className="w-7 h-7 bg-gradient-to-r from-pink-500 to-rose-500 rounded-lg flex items-center justify-center">
                <Activity className="w-4 h-4 text-white" />
              </div>
              <span>Dual Pane Task Monitor</span>
            </div>
            <div className="flex items-center gap-3">
              {taskState.status !== 'idle' && (
                <>
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
                </>
              )}
              {showBackButton && onBackToUpload && (
                <Button 
                  size="sm" 
                  variant="outline" 
                  onClick={onBackToUpload}
                  className="border-pink-300 text-pink-700 hover:bg-pink-50 font-semibold"
                >
                  ← Back to Upload
                </Button>
              )}
            </div>
          </CardTitle>
          <CardDescription className="text-slate-600 text-sm">
            {taskState.status === 'idle' 
              ? 'Create and monitor browser automation tasks in real-time with dual pane interface'
              : 'Monitor your browser automation task in real-time'
            }
          </CardDescription>
        </CardHeader>
        
        <CardContent className="p-0 flex-1 overflow-hidden" style={{ height: 'calc(100% - 90px)' }}>
          <ResizablePanelGroup direction="horizontal" className="h-full w-full overflow-hidden">
            {/* Left Pane - Ticket Data Form (35% default) */}
            <ResizablePanel defaultSize={35} minSize={25} maxSize={50} className="overflow-hidden">
              <div className="h-full p-3 border-r-2 border-slate-200/40 bg-gradient-to-b from-white to-slate-50/30 overflow-hidden">
                <div className="h-full bg-white rounded-lg border border-slate-200/50 shadow-sm overflow-hidden flex flex-col">
                  {/* Scrollable content container */}
                  <div className="flex-1 overflow-y-auto scrollbar-thin scrollbar-thumb-gray-300 scrollbar-track-gray-100">
                    {/* Header with icon and title */}
                    <div className="p-3 border-b border-slate-200/50 bg-gradient-to-r from-red-50 to-red-100 flex-shrink-0">
                      <div className="flex items-center space-x-3">
                        <div className="w-7 h-7 bg-red-500 rounded-lg flex items-center justify-center">
                          <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                          </svg>
                        </div>
                        <h3 className="text-base font-semibold text-gray-800">Datos del Ticket</h3>
                      </div>
                    </div>
                    
                    {/* OCR Status and Success Indicator */}
                    {ocrStatus && (
                      <div className="p-3 border-b border-slate-200/50 flex-shrink-0">
                        <div className={`flex items-center gap-3 p-2 rounded-lg ${
                          ocrSuccess 
                            ? 'bg-green-50 border border-green-200 text-green-700' 
                            : isProcessing 
                              ? 'bg-blue-50 border border-blue-200 text-blue-700'
                              : 'bg-yellow-50 border border-yellow-200 text-yellow-700'
                        }`}>
                          <div className={`w-3 h-3 rounded-full ${
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
                            value={vendorUrlState}
                            onChange={(e) => setVendorUrlState(e.target.value)}
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
                    
                    {/* Start Agent Button */}
                    <div className="p-5 border border-slate-200 rounded-lg bg-slate-50 mb-6">
                      <Button
                        onClick={handleStartAgentTask}
                        disabled={!vendorUrlState || !ocrSuccess || taskState.status === 'running' || taskState.status === 'connecting'}
                        className="w-full bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white font-semibold py-2 px-4 rounded-lg shadow-lg hover:shadow-xl transition-all duration-200 text-sm"
                      >
                        {taskState.status === 'connecting' ? (
                          <>
                            <div className="animate-spin rounded-full h-3 w-3 border-b-2 border-white mr-2"></div>
                            Creating Task...
                          </>
                        ) : taskState.status === 'running' ? (
                          <>
                            <div className="animate-spin rounded-full h-3 w-3 border-b-2 border-white mr-2"></div>
                            Agent Running...
                          </>
                        ) : (
                          <>
                            <Zap className="w-4 h-4 mr-2" />
                            Start Agent Task
                          </>
                        )}
                      </Button>
                      
                      {/* Status Messages */}
                      {!vendorUrlState && (
                        <p className="text-xs text-red-600 mt-2">Please enter the vendor website URL first</p>
                      )}
                      {!ocrSuccess && vendorUrlState && (
                        <p className="text-xs text-red-600 mt-2">Please complete OCR processing first</p>
                      )}
                      {taskState.status === 'running' && (
                        <div className="mt-2 p-2 bg-blue-50 rounded border border-blue-200">
                          <div className="flex items-center justify-between">
                            <div>
                              <p className="text-xs text-blue-700">
                                <strong>Task Status:</strong> {taskState.status}
                                {taskState.taskId && (
                                  <span className="block mt-1">Task ID: {taskState.taskId}</span>
                                )}
                              </p>
                            </div>
                            <Button
                              onClick={resetTaskState}
                              variant="outline"
                              size="sm"
                              className="text-xs h-6 px-2"
                            >
                              Reset
                            </Button>
                          </div>
                        </div>
                      )}
                      
                      {/* Task Message Display */}
                      {taskState.message && (
                        <div className={`mt-2 p-3 rounded border ${
                          taskState.status === 'success' 
                            ? 'bg-green-50 border-green-200 text-green-700' 
                            : taskState.status === 'error'
                            ? 'bg-red-50 border-red-200 text-red-700'
                            : 'bg-blue-50 border-blue-200 text-blue-700'
                        }`}>
                          <p className="text-sm font-medium">
                            {taskState.status === 'success' && '✅ '}
                            {taskState.status === 'error' && '❌ '}
                            {taskState.status === 'info' && 'ℹ️ '}
                            {taskState.message}
                          </p>
                        </div>
                      )}
                    </div>
                    
                    {/* Extracted Ticket Information Display - 2x2 Grid - EDITABLE */}
                    <div className="p-3 flex flex-col h-full" style={{ minHeight: '400px' }}>
                      {/* Editable Fields Notice */}
                      <div className="mb-3 p-2 bg-blue-50 rounded-lg border border-blue-200">
                        <div className="flex items-center gap-2 text-blue-700">
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                          </svg>
                          <span className="text-xs font-medium">All fields are editable. Edit any values before starting the agent task.</span>
                        </div>
                      </div>
                      
                      <div className="grid grid-cols-2 gap-2 flex-shrink-0 mb-4">
                        {/* Mesa/Folio */}
                        <div className="bg-gray-50 border border-red-200 rounded-lg p-2">
                          <label className="block text-xs font-medium text-gray-700 mb-1">Mesa/Folio</label>
                          <input
                            type="text"
                            value={ticketData['Mesa_Folio'] || ''}
                            onChange={(e) => setTicketData(prev => ({ ...prev, 'Mesa_Folio': e.target.value }))}
                            className="h-8 px-2 py-1 bg-white border border-red-200 rounded text-xs text-gray-800 w-full focus:outline-none focus:ring-2 focus:ring-red-500 focus:border-transparent"
                            placeholder="Enter Mesa/Folio"
                          />
                        </div>
                        
                        {/* Fecha */}
                        <div className="bg-gray-50 border border-red-200 rounded-lg p-2">
                          <label className="block text-xs font-medium text-gray-700 mb-1">Fecha</label>
                          <input
                            type="text"
                            value={ticketData['Fecha'] || ''}
                            onChange={(e) => setTicketData(prev => ({ ...prev, 'Fecha': e.target.value }))}
                            className="h-8 px-2 py-1 bg-white border border-red-200 rounded text-xs text-gray-800 w-full focus:outline-none focus:ring-2 focus:ring-red-500 focus:border-transparent"
                            placeholder="Enter Fecha"
                          />
                        </div>
                        
                        {/* ID Ticket */}
                        <div className="bg-gray-50 border border-red-200 rounded-lg p-2">
                          <label className="block text-xs font-medium text-gray-700 mb-1">ID Ticket</label>
                          <input
                            type="text"
                            value={ticketData['ID_Ticket'] || ''}
                            onChange={(e) => setTicketData(prev => ({ ...prev, 'ID_Ticket': e.target.value }))}
                            className="h-8 px-2 py-1 bg-white border border-red-200 rounded text-xs text-gray-800 w-full focus:outline-none focus:ring-2 focus:ring-red-500 focus:border-transparent"
                            placeholder="Enter ID Ticket"
                          />
                        </div>
                        
                        {/* Total */}
                        <div className="bg-gray-50 border border-red-200 rounded-lg p-2">
                          <label className="block text-xs font-medium text-gray-700 mb-1">Total</label>
                          <input
                            type="text"
                            value={ticketData['Total'] || ''}
                            onChange={(e) => setTicketData(prev => ({ ...prev, 'Total': e.target.value }))}
                            className="h-8 px-2 py-1 bg-white border border-red-200 rounded text-xs text-gray-800 w-full focus:outline-none focus:ring-2 focus:ring-red-500 focus:border-transparent"
                            placeholder="Enter Total"
                          />
                        </div>
                        
                        {/* Store/Branch/Plaza */}
                        <div className="bg-gray-50 border border-red-200 rounded-lg p-2">
                          <label className="block text-xs font-medium text-gray-700 mb-1">Store/Branch/Plaza</label>
                          <input
                            type="text"
                            value={ticketData['Store_Branch_Plaza'] || ''}
                            onChange={(e) => setTicketData(prev => ({ ...prev, 'Store_Branch_Plaza': e.target.value }))}
                            className="h-8 px-2 py-1 bg-white border border-red-200 rounded text-xs text-gray-800 w-full focus:outline-none focus:ring-2 focus:ring-red-500 focus:border-transparent"
                            placeholder="Enter Store/Branch/Plaza"
                          />
                        </div>
                        
                        {/* Register/Station/Terminal */}
                        <div className="bg-gray-50 border border-red-200 rounded-lg p-2">
                          <label className="block text-xs font-medium text-gray-700 mb-1">Register/Station/Terminal</label>
                          <input
                            type="text"
                            value={ticketData['Register_Station_Terminal'] || ''}
                            onChange={(e) => setTicketData(prev => ({ ...prev, 'Register_Station_Terminal': e.target.value }))}
                            className="h-8 px-2 py-1 bg-white border border-red-200 rounded text-xs text-gray-800 w-full focus:outline-none focus:ring-2 focus:ring-red-500 focus:border-transparent"
                            placeholder="Enter Register/Station/Terminal"
                          />
                        </div>
                        
                        {/* Payment Type */}
                        <div className="bg-gray-50 border border-red-200 rounded-lg p-2">
                          <label className="block text-xs font-medium text-gray-700 mb-1">Payment Type</label>
                          <input
                            type="text"
                            value={ticketData['Payment_Type'] || ''}
                            onChange={(e) => setTicketData(prev => ({ ...prev, 'Payment_Type': e.target.value }))}
                            className="h-8 px-2 py-1 bg-white border border-red-200 rounded text-xs text-gray-800 w-full focus:outline-none focus:ring-2 focus:ring-red-500 focus:border-transparent"
                            placeholder="Enter Payment Type"
                          />
                        </div>
                        
                        {/* Last 4 digits of card */}
                        <div className="bg-gray-50 border border-red-200 rounded-lg p-2">
                          <label className="block text-xs font-medium text-gray-700 mb-1">Card Last 4 Digits</label>
                          <input
                            type="text"
                            value={ticketData['Card_Last_4_Digits'] || ''}
                            onChange={(e) => setTicketData(prev => ({ ...prev, 'Card_Last_4_Digits': e.target.value }))}
                            className="h-8 px-2 py-1 bg-white border border-red-200 rounded text-xs text-gray-800 w-full focus:outline-none focus:ring-2 focus:ring-red-500 focus:border-transparent"
                            placeholder="Enter Card Last 4 Digits"
                          />
                        </div>
                        
                        {/* TC# */}
                        <div className="bg-gray-50 border border-red-200 rounded-lg p-2">
                          <label className="block text-xs font-medium text-gray-700 mb-1">TC#</label>
                          <input
                            type="text"
                            value={ticketData['TC#'] || ''}
                            onChange={(e) => setTicketData(prev => ({ ...prev, 'TC#': e.target.value }))}
                            className="h-8 px-2 py-1 bg-white border border-red-200 rounded text-xs text-gray-800 w-full focus:outline-none focus:ring-2 focus:ring-red-500 focus:border-transparent"
                            placeholder="Enter TC#"
                          />
                        </div>
                        
                        {/* TR# */}
                        <div className="bg-gray-50 border border-red-200 rounded-lg p-2">
                          <label className="block text-xs font-medium text-gray-700 mb-1">TR#</label>
                          <input
                            type="text"
                            value={ticketData['TR#'] || ''}
                            onChange={(e) => setTicketData(prev => ({ ...prev, 'TR#': e.target.value }))}
                            className="h-8 px-2 py-1 bg-white border border-red-200 rounded text-xs text-gray-800 w-full focus:outline-none focus:ring-2 focus:ring-red-500 focus:border-transparent"
                            placeholder="Enter TR#"
                          />
                        </div>
                        
                        {/* ID */}
                        <div className="bg-gray-50 border border-red-200 rounded-lg p-2">
                          <label className="block text-xs font-medium text-gray-700 mb-1">ID</label>
                          <input
                            type="text"
                            value={ticketData['ID'] || ''}
                            onChange={(e) => setTicketData(prev => ({ ...prev, 'ID': e.target.value }))}
                            className="h-8 px-2 py-1 bg-white border border-red-200 rounded text-xs text-gray-800 w-full focus:outline-none focus:ring-2 focus:ring-red-500 focus:border-transparent"
                            placeholder="Enter ID"
                          />
                        </div>
                        
                        {/* Fol_Vta */}
                        <div className="bg-gray-50 border border-red-200 rounded-lg p-2">
                          <label className="block text-xs font-medium text-gray-700 mb-1">Fol_Vta</label>
                          <input
                            type="text"
                            value={ticketData['Fol_Vta'] || ''}
                            onChange={(e) => setTicketData(prev => ({ ...prev, 'Fol_Vta': e.target.value }))}
                            className="h-8 px-2 py-1 bg-white border border-red-200 rounded text-xs text-gray-800 w-full focus:outline-none focus:ring-2 focus:ring-red-500 focus:border-transparent"
                            placeholder="Enter Fol_Vta"
                          />
                        </div>
                        
                        {/* Comercio - Full width */}
                        <div className="bg-gray-50 border border-red-200 rounded-lg p-2 col-span-2">
                          <label className="block text-xs font-medium text-gray-700 mb-1">Comercio</label>
                          <input
                            type="text"
                            value={ticketData['Comercio'] || ''}
                            onChange={(e) => setTicketData(prev => ({ ...prev, 'Comercio': e.target.value }))}
                            className="h-8 px-2 py-1 bg-white border border-red-200 rounded text-xs text-gray-800 w-full focus:outline-none focus:ring-2 focus:ring-red-500 focus:border-transparent"
                            placeholder="Enter Comercio"
                          />
                        </div>
                      </div>
                      
                      {/* Full Raw Text Display */}
                      <div className="flex-1 min-h-0 flex flex-col">
                        <div className="bg-gray-50 border border-red-200 rounded-lg p-2 flex-1 flex flex-col">
                          <label className="block text-xs font-medium text-gray-700 mb-1 flex-shrink-0">Full Raw Text</label>
                          <div className="flex-1 px-2 py-1 bg-white border border-red-200 rounded text-xs text-gray-800 overflow-y-auto scrollbar-thin scrollbar-thumb-gray-300 scrollbar-track-gray-100 min-h-0">
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
                    </div>
                  </div>
                </div>
              </div>
            </ResizablePanel>

            <ResizableHandle withHandle className="w-2 bg-gradient-to-b from-pink-100 to-rose-100 hover:bg-gradient-to-b hover:from-pink-200 hover:to-rose-200 transition-all duration-200" />

            {/* Right Pane - Live View with URL Input (65% default) */}
            <ResizablePanel defaultSize={65} minSize={50} maxSize={75} className="overflow-hidden">
              <div className="h-full p-3 bg-gradient-to-b from-white to-slate-50/30 overflow-hidden">
                <div className="h-full bg-white rounded-lg border border-slate-200/50 shadow-sm overflow-hidden">
                  <div className="h-full flex flex-col">
                    {/* Live View URL Input Header */}
                    <div className="p-3 border-b border-gray-200 bg-gray-50 flex-shrink-0">
                      <div className="flex items-center justify-between mb-2">
                        <h3 className="text-base font-semibold flex items-center gap-2">
                          <ExternalLink className="w-4 h-4" />
                          Live View URL
                        </h3>
                        <Button 
                          size="sm" 
                          variant="outline" 
                          onClick={handleRefreshLiveView}
                          disabled={!currentLiveViewUrl}
                          className="h-7 px-2 text-xs"
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
                          className="flex-1 text-xs h-8"
                        />
                        <Button 
                          size="sm" 
                          variant="default"
                          onClick={handleUpdateLiveViewUrl}
                          disabled={!currentLiveViewUrl}
                          className="h-8 px-2 text-xs"
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
                          className="h-8 px-2 text-xs"
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
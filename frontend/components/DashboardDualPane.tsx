'use client'

import React, { useState, useEffect } from 'react'
import { ResizablePanelGroup, ResizablePanel, ResizableHandle } from '@/components/ui/resizable'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { Zap, Monitor, Activity, ExternalLink, RefreshCw, Copy, Check, X, Cloud } from 'lucide-react'
import { useLanguage } from '@/contexts/LanguageContext'
import { websocketService } from '@/services/websocket'
import ApiService from '@/services/api'
import { AVAILABLE_MODELS, getModelsByProvider, getDefaultModel, getModelLabel } from '@/constants/models'
import { LiveViewPane } from './LiveViewPane'
import { BrowserModeSwitch } from '@/components/ui/browser-mode-switch'
import { tokenManager } from '@/utils/tokenManager'
import { toast } from 'react-toastify'

// Fullscreen Modal Component
interface FullscreenModalProps {
  isOpen: boolean
  onClose: () => void
  url: string
  title?: string
}

function FullscreenModal({ isOpen, onClose, url, title = 'Live Browser View' }: FullscreenModalProps) {
  if (!isOpen) return null

  return (
    <div className="fixed inset-0 z-50 bg-black bg-opacity-75 flex items-center justify-center">
      <div className="relative w-full h-full max-w-full max-h-full bg-white rounded-lg overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between p-4 bg-gray-50 border-b">
          <h2 className="text-lg font-semibold text-gray-900">{title}</h2>
          <div className="flex items-center gap-2">
            <span className="text-sm text-gray-600">
              Press ESC to exit fullscreen
            </span>
            <Button size="sm" variant="outline" onClick={onClose}>
              ✕ Close
            </Button>
          </div>
        </div>

        {/* Iframe Content */}
        <div className="w-full h-full" style={{ height: 'calc(100vh - 80px)' }}>
          <iframe
            src={url}
            sandbox="allow-same-origin allow-scripts"
            allow="clipboard-read; clipboard-write"
            className="w-full h-full border-0"
            title={title}
          />
        </div>
      </div>
    </div>
  )
}

export interface DashboardDualPaneProps {
  onTaskSubmit?: (taskId: string) => void
  className?: string
  initialTicketData?: any
  vendorUrl?: string
  userProfile?: any
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

// Copy Button Component
interface CopyButtonProps {
  value: string
  className?: string
  size?: 'sm' | 'default'
}

function CopyButton({ value, className = '', size = 'sm' }: CopyButtonProps) {
  const [copied, setCopied] = useState(false)

  const handleCopy = async () => {
    if (!value) return
    
    try {
      await navigator.clipboard.writeText(value)
      setCopied(true)
      toast.success('Copied to clipboard!')
      
      // Reset copied state after 2 seconds
      setTimeout(() => setCopied(false), 2000)
    } catch (err) {
      console.error('Failed to copy:', err)
      toast.error('Failed to copy to clipboard')
    }
  }

  return (
    <Button
      type="button"
      variant="ghost"
      size={size}
      onClick={handleCopy}
      disabled={!value}
      className={`h-6 w-6 p-0 hover:bg-gray-100 ${className}`}
      title="Copy to clipboard"
    >
      {copied ? (
        <Check className="h-3 w-3 text-green-600" />
      ) : (
        <Copy className="h-3 w-3 text-gray-500 hover:text-gray-700" />
      )}
    </Button>
  )
}

// Field with Copy Button Component
interface FieldWithCopyProps {
  label: string
  value: string
  onChange: (value: string) => void
  placeholder: string
  className?: string
  fullWidth?: boolean
}

function FieldWithCopy({ label, value, onChange, placeholder, className = '', fullWidth = false }: FieldWithCopyProps) {
  return (
    <div className={`bg-gray-50 border border-red-200 rounded-lg p-2 ${fullWidth ? 'col-span-2' : ''} ${className}`}>
      <label className="block text-xs font-medium text-gray-700 mb-1">{label}</label>
      <div className="flex items-center gap-2">
        <input
          type="text"
          value={value || ''}
          onChange={(e) => onChange(e.target.value)}
          className="flex-1 h-8 px-2 py-1 bg-white border border-red-200 rounded text-xs text-gray-800 focus:outline-none focus:ring-2 focus:ring-red-500 focus:border-transparent"
          placeholder={placeholder}
        />
        <CopyButton value={value} />
      </div>
    </div>
  )
}

export function DashboardDualPane({
  onTaskSubmit,
  className = '',
  initialTicketData,
  vendorUrl = '',
  userProfile
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
  const [isStartingAgent, setIsStartingAgent] = useState(false)
  const [ocrSuccess, setOcrSuccess] = useState(false)
  const [ocrStatus, setOcrStatus] = useState<string>('')
  
  // Add new state for task feedback
  const [taskMessage, setTaskMessage] = useState<{ type: 'success' | 'error' | 'info'; message: string } | null>(null)

  // Add browser mode state
  const [browserMode, setBrowserMode] = useState<'browserbase' | 'local'>('browserbase')

  // Add viewport resize state
  const [isResizing, setIsResizing] = useState(false)
  const [viewportSize, setViewportSize] = useState({ width: 0, height: 0 })

  // Add fullscreen modal state
  const [isFullscreenModal, setIsFullscreenModal] = useState(false)
  
  // Function to clear task message after delay
  const clearTaskMessage = (delay: number = 5000) => {
    setTimeout(() => {
      setTaskMessage(null)
    }, delay)
  }
  
  // Function to reset task state
  const resetTaskState = () => {
    setTaskState({
      taskId: null,
      sessionId: null,
      liveViewUrl: null,
      status: 'idle'
    })
    setTaskMessage(null)
  }

  const handleStopTask = async () => {
    if (!taskState.taskId) {
      console.warn('No task ID to stop')
      return
    }

    const originalStatus = taskState.status

    try {
      console.log(`🛑 Stopping task: ${taskState.taskId} (current status: ${taskState.status})`)
      console.log(`🛑 Session ID: ${taskState.sessionId}`)
      
      // Update status to show stopping
      setTaskState(prev => ({
        ...prev,
        status: 'idle'
      }))

      // Stop the task using proper cleanup methods
      try {
        // 1. Call our API to stop the task (handles backend termination)
        console.log(`🛑 Calling backend to stop task: ${taskState.taskId}`)
        await ApiService.stopTask(taskState.taskId)
        console.log(`✅ Backend task stop successful`)
        
        // 2. Disconnect WebSocket connection
        if (taskState.taskId) {
          websocketService.disconnect()
          console.log(`🔌 WebSocket disconnected for task: ${taskState.taskId}`)
        }
        
        // 3. Note: Session termination is handled by backend emergency cleanup
        // The backend will call _emergency_cleanup() with keep_alive=False
        if (taskState.sessionId) {
          console.log(`🔗 Session ${taskState.sessionId} will be terminated by backend emergency cleanup`)
        }
        
      } catch (error) {
        console.error('❌ Error stopping task via API:', error)
        // Continue with cleanup even if API call fails
      }
      
      // Clear all task-related state
      setTaskState({
        taskId: null,
        sessionId: null,
        liveViewUrl: null,
        status: 'idle'
      })
      setCurrentLiveViewUrl(null)
      
      // Show success message
      setTaskMessage({
        type: 'info',
        message: `Task ${taskState.taskId.slice(0, 8)}... and browser session have been terminated successfully`
      })

      // Clear task message after 5 seconds
      setTimeout(() => {
        setTaskMessage(null)
      }, 5000)

      console.log(`✅ Task and session stopped successfully: ${taskState.taskId}`)
      
    } catch (error) {
      console.error('❌ Error stopping task:', error)
      
      // Set back to original status if stop failed
      setTaskState(prev => ({
        ...prev,
        status: originalStatus
      }))
      
      setTaskMessage({
        type: 'error',
        message: `Failed to stop task: ${error instanceof Error ? error.message : 'Unknown error'}`
      })

      // Clear error message after 8 seconds
      setTimeout(() => {
        setTaskMessage(null)
      }, 8000)
    }
  }
  


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
    console.log('🎯 useEffect triggered for initialTicketData:', initialTicketData)
    
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
      console.log('✅ OCR success set to true')
    } else {
      console.log('⚠️ No initialTicketData provided')
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

  // Update live view URL when taskState changes - only when there's a new URL from task
  useEffect(() => {
    // Only update if there's a new live view URL from the task (not null)
    if (taskState.liveViewUrl && taskState.liveViewUrl !== currentLiveViewUrl) {
      console.log('🔄 Live view URL updated from task:', {
        from: currentLiveViewUrl,
        to: taskState.liveViewUrl,
        taskId: taskState.taskId
      })
      setCurrentLiveViewUrl(taskState.liveViewUrl)
    }
  }, [taskState.liveViewUrl, taskState.taskId])

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

  // Handle viewport resize events for better responsiveness
  useEffect(() => {
    const handleResizeStart = () => {
      setIsResizing(true)
    }

    const handleResizeEnd = () => {
      setIsResizing(false)
      // Update viewport size after resize
      const updateViewportSize = () => {
        const viewport = document.querySelector('[data-viewport="live-view"]')
        if (viewport) {
          const rect = viewport.getBoundingClientRect()
          setViewportSize({ width: rect.width, height: rect.height })
        }
      }
      // Use setTimeout to ensure DOM has updated
      setTimeout(updateViewportSize, 100)
    }

    // Add resize event listeners to the resizable panels
    const resizeObserver = new ResizeObserver((entries) => {
      for (let entry of entries) {
        if (entry.target.closest('[data-panel="live-view"]')) {
          const { width, height } = entry.contentRect
          setViewportSize({ width, height })
        }
      }
    })

    // Observe the live view container
    const liveViewContainer = document.querySelector('[data-panel="live-view"]')
    if (liveViewContainer) {
      resizeObserver.observe(liveViewContainer)
    }

    // Add panel resize event listeners
    const panels = document.querySelectorAll('[data-panel-resize-handle]')
    panels.forEach(panel => {
      panel.addEventListener('mousedown', handleResizeStart)
      panel.addEventListener('touchstart', handleResizeStart)
      panel.addEventListener('mouseup', handleResizeEnd)
      panel.addEventListener('touchend', handleResizeEnd)
    })

    return () => {
      resizeObserver.disconnect()
      panels.forEach(panel => {
        panel.removeEventListener('mousedown', handleResizeStart)
        panel.removeEventListener('touchstart', handleResizeStart)
        panel.removeEventListener('mouseup', handleResizeEnd)
        panel.removeEventListener('touchend', handleResizeEnd)
      })
    }
  }, [currentLiveViewUrl])

  // Handle keyboard events for fullscreen modal
  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape' && isFullscreenModal) {
        setIsFullscreenModal(false)
      }
    }

    if (isFullscreenModal) {
      document.addEventListener('keydown', handleKeyDown)
      document.body.style.overflow = 'hidden' // Prevent body scroll
    } else {
      document.body.style.overflow = 'auto'
    }

    return () => {
      document.removeEventListener('keydown', handleKeyDown)
      document.body.style.overflow = 'auto'
    }
  }, [isFullscreenModal])

  // Real-time WebSocket connection for immediate URL delivery
  useEffect(() => {
    if (taskState.taskId && taskState.status !== 'idle') {
      // Connect to real WebSocket for this specific task
      const connectWebSocket = async () => {
        try {
          console.log(`🔗 DashboardDualPane: Connecting to WebSocket for task: ${taskState.taskId}`)
          const connected = await websocketService.connect(taskState.taskId!)
          if (connected) {
            websocketService.subscribeToTask(taskState.taskId!)
            console.log(`✅ DashboardDualPane: WebSocket connected and subscribed to task: ${taskState.taskId}`)
          }
        } catch (error) {
          console.error(`❌ DashboardDualPane: Failed to connect WebSocket for task ${taskState.taskId}:`, error)
        }
      }
      
      connectWebSocket()
      
      // Enhanced event handlers for real-time URL delivery
      const handleSessionCreated = (data: any) => {
        console.log('📡 DashboardDualPane: Session created event:', data)
        if (data.taskId === taskState.taskId) {
          const sessionId = data.sessionId || data.session_id
          if (sessionId) {
            setTaskState(prev => ({
              ...prev,
              sessionId: sessionId
            }))
            console.log('🔗 DashboardDualPane: Session ID updated:', sessionId)
          }
        }
      }
      
      const handleLiveViewReady = (data: any) => {
        console.log('📡 DashboardDualPane: Live view ready event:', data)
        if (data.taskId === taskState.taskId) {
          const liveViewUrl = data.liveViewUrl || data.live_view_url
          if (liveViewUrl) {
            setTaskState(prev => ({
              ...prev,
              liveViewUrl: liveViewUrl,
              status: 'running'
            }))
            setCurrentLiveViewUrl(liveViewUrl)
            console.log('🎯 DashboardDualPane: Live view URL updated via WebSocket:', liveViewUrl)
            console.log(`🔄 Task state updated to 'running' for task: ${taskState.taskId}`)
          }
        }
      }
      
      const handleUrlGenerated = (data: any) => {
        console.log('📡 DashboardDualPane: URL generated event:', data)
        if (data.taskId === taskState.taskId) {
          const url = data.url || data.liveViewUrl || data.live_view_url
          if (url && url !== currentLiveViewUrl) {
            setCurrentLiveViewUrl(url)
            console.log('🌐 DashboardDualPane: URL updated from URL generated event:', url)
          }
        }
      }
      
      const handleAutomationProgress = (data: any) => {
        console.log('📡 DashboardDualPane: Automation progress event:', data)
        if (data.taskId === taskState.taskId) {
          // Update status to running if we receive progress
          setTaskState(prev => ({
            ...prev,
            status: 'running'
          }))
        }
      }
      
      // Set up real-time WebSocket event listeners
      websocketService.on('session_created', handleSessionCreated)
      websocketService.on('live_view_ready', handleLiveViewReady)
      websocketService.on('url_generated', handleUrlGenerated)
      websocketService.on('automation_progress', handleAutomationProgress)
      
      // Cleanup function
      return () => {
        websocketService.off('session_created', handleSessionCreated)
        websocketService.off('live_view_ready', handleLiveViewReady)
        websocketService.off('url_generated', handleUrlGenerated)
        websocketService.off('automation_progress', handleAutomationProgress)
        websocketService.stopPolling(taskState.taskId!)
      }
    }
  }, [taskState.taskId])

  // handleTaskCreated method removed - now handled directly in handleStartAgentTask with real-time WebSocket events

  const handleTakeoverRequest = () => {
    console.log('Takeover requested for task:', taskState.taskId)
    // Handle takeover logic here
  }

  const handleRefreshView = () => {
    console.log('Refreshing view for task:', taskState.taskId)
    // Handle refresh logic here
  }

  const handleUpdateLiveViewUrl = () => {
    if (currentLiveViewUrl) {
      console.log('Live view URL updated:', currentLiveViewUrl)
      // Force re-render of iframe
      const tempUrl = currentLiveViewUrl
      setCurrentLiveViewUrl('')
      setTimeout(() => setCurrentLiveViewUrl(tempUrl), 100)
    }
  }

  const handleStartAgentTask = async () => {
    if (!vendorUrl) {
      toast.error('Please provide a vendor website URL in the main dashboard first');
      return;
    }

    if (!ticketData || Object.keys(ticketData).length === 0) {
      toast.error('Please complete OCR processing first');
      return;
    }

    try {
      setIsStartingAgent(true);
      
      // Send ONLY the corrected, structured data - NO duplicate text prompt
              const response = await ApiService.createDashboardTask({
        vendor_url: vendorUrl,
        browser_mode: browserMode,
        user_profile: userProfile,        // Send user profile directly
        ocr_ticket_data: ticketData,     // Send corrected OCR data directly
        raw_text: rawText,               // Send raw text directly
        model: 'gpt-4o-mini',           // Default model
        max_steps: 30,                   // Default max steps
        temperature: 0.7                 // Default temperature
      });

      console.log('✅ Browser agent task created successfully:', response);

      if (response.success && response.data?.task_id) {
        toast.success('Browser agent task started successfully!');
        
        console.log('🚀 DashboardDualPane: Task created, WebSocket will deliver URLs in real-time');
        console.log('📡 DashboardDualPane: Waiting for WebSocket events for task:', response.data.task_id);
        
        // Set initial task state - WebSocket will update with URLs
        setTaskState({
          taskId: response.data.task_id,
          sessionId: null,
          liveViewUrl: null,
          status: 'connecting'
        });
        
        console.log(`🔄 Task state updated to 'connecting' for task: ${response.data.task_id}`);
        
        // Call the parent callback if provided
        if (onTaskSubmit) {
          onTaskSubmit(response.data.task_id)
        }
      } else {
        throw new Error('Failed to create browser agent task');
      }

    } catch (error) {
      console.error('❌ Error starting browser agent task:', error);
      toast.error('Failed to start browser agent task. Please try again.');
    } finally {
      setIsStartingAgent(false);
    }
  };

  // Render live view iframe when URL is available
  const renderLiveView = () => {
    if (!currentLiveViewUrl) {
      return (
        <div className="h-full flex items-center justify-center bg-gray-50 rounded-lg border-2 border-dashed border-gray-300">
                      <div className="text-center text-gray-500">
              <Monitor className="w-12 h-12 mx-auto mb-3 text-gray-400" />
              <h3 className="text-lg font-medium mb-2">No Live View Available</h3>
              <p className="text-sm mb-3">
                {browserMode === 'local' 
                  ? 'Local browser mode - no live view available' 
                  : 'Waiting for task to start and generate live view URL...'
                }
              </p>
            </div>
        </div>
      )
    }

    // For local mode, show a different message since there's no live view
    if (browserMode === 'local') {
      return (
        <div className="h-full flex items-center justify-center bg-green-50 rounded-lg border-2 border-dashed border-green-300">
          <div className="text-center text-green-600">
            <Monitor className="w-16 h-16 mx-auto mb-4 text-green-400" />
            <h3 className="text-lg font-medium mb-2">Local Browser Mode Active</h3>
            <p className="text-sm mb-3">Task is running in your local browser</p>
            <div className="mt-4 p-3 bg-green-100 rounded border border-green-200">
              <p className="text-xs text-green-700 font-medium">Local Mode Info:</p>
              <p className="text-xs text-green-600">No live view available for local browser</p>
              <p className="text-xs text-green-600">Check your local browser for automation progress</p>
            </div>
          </div>
        </div>
      )
    }

    // Validate URL format for Browserbase mode
    const isValidBrowserbaseUrl = currentLiveViewUrl.includes('browserbase.com/devtools/inspector.html')
    
    if (!isValidBrowserbaseUrl) {
      return (
        <div className="h-full flex items-center justify-center bg-yellow-50 rounded-lg border-2 border-dashed border-yellow-300">
          <div className="text-center text-yellow-600">
            <Monitor className="w-16 h-16 mx-auto mb-4 text-yellow-400" />
            <h3 className="text-lg font-medium mb-2">Invalid Live View URL Format</h3>
            <p className="text-sm">Expected Browserbase devtools URL format</p>
            <div className="mt-4 p-3 bg-yellow-100 rounded border border-yellow-200">
              <p className="text-xs text-yellow-700 font-medium">Invalid URL Format</p>
              <p className="text-xs text-yellow-600 mt-2">Expected Browserbase devtools URL format</p>
            </div>
          </div>
        </div>
      )
    }

    return (
      <div className="h-full bg-white rounded-lg border border-gray-200 overflow-hidden flex flex-col">
        <div className="p-3 bg-gray-50 border-b border-gray-200 flex items-center justify-between flex-shrink-0">
          <div className="flex items-center gap-2">
            <Monitor className="w-4 h-4 text-gray-600" />
            <span className="text-sm font-medium text-gray-700">Live Browser View</span>
          </div>
          <div className="flex items-center gap-2">
            <Badge variant="outline" className="text-xs">
              {taskState.status}
            </Badge>
            <Button size="sm" variant="outline" onClick={handleRefreshView}>
              🔄 Refresh
            </Button>
            <Button size="sm" variant="outline" onClick={() => setIsFullscreenModal(true)} disabled={!currentLiveViewUrl}>
              ⛶ Fullscreen
            </Button>
            {viewportSize.width > 0 && viewportSize.height > 0 && (
              <Badge variant="secondary" className="text-xs">
                {Math.round(viewportSize.width)}×{Math.round(viewportSize.height)}
              </Badge>
            )}
          </div>
        </div>
        

        
        <div className="flex-1 relative overflow-hidden flex flex-col" style={{ minHeight: '500px' }}>
          {isResizing && (
            <div className="absolute top-2 right-2 z-10 bg-blue-500 text-white text-xs px-2 py-1 rounded shadow-lg">
              Resizing...
            </div>
          )}
          <iframe
            src={currentLiveViewUrl}
            sandbox="allow-same-origin allow-scripts"
            allow="clipboard-read; clipboard-write"
            className={`w-full h-full border-0 flex-1 transition-opacity duration-200 ${isResizing ? 'opacity-70' : 'opacity-100'}`}
            title="Live Browser View"
            onLoad={() => console.log('✅ Live view iframe loaded successfully:', currentLiveViewUrl)}
            onError={(e) => console.error('❌ Live view iframe error:', e)}
            style={{
              minHeight: '400px',
              maxHeight: '100%',
              width: '100%'
            }}
          />
        </div>
      </div>
    )
  }

  // Mobile layout - stacked vertically
  if (isMobile) {
    return (
      <div className={`h-full w-full overflow-hidden ${className}`}>
        <div className="flex flex-col h-full gap-6 overflow-y-auto scrollbar-thin scrollbar-thumb-gray-300 scrollbar-track-gray-100" style={{ minHeight: '1000px' }}>
          {/* Ticket Data Form Section */}
          <Card className="border-2 border-slate-200/60 shadow-lg bg-white/90 backdrop-blur-sm rounded-xl overflow-hidden flex-shrink-0">
            <CardHeader className="pb-3 bg-gradient-to-r from-red-50 to-rose-50 border-b border-slate-200/40 flex-shrink-0">
              <CardTitle className="flex items-center space-x-2 text-lg">
                <div className="w-7 h-7 bg-red-500 rounded-lg flex items-center justify-center">
                  <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                  </svg>
                </div>
                <span>Ticket Data</span>
              </CardTitle>
              <CardDescription className="text-slate-600 text-sm">
                Ingrese los datos del ticket en los campos correspondientes.
              </CardDescription>
            </CardHeader>
            <CardContent className="p-3 flex flex-col h-full overflow-y-auto scrollbar-thin scrollbar-thumb-gray-300 scrollbar-track-gray-100">
              {/* File Upload Section for Mobile */}
              <div className="mb-3 p-3 border border-slate-200 rounded-lg bg-slate-50">
                <div className="space-y-2">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
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
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Vendor URL
                    </label>
                    <div className="block w-full px-3 py-2 border border-gray-200 rounded-md text-sm bg-gray-50 text-gray-700">
                      {vendorUrl || 'No vendor URL provided'}
                    </div>
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
                <div className="mb-3">
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
              
              {/* Start Agent Button Section - Mobile - Top of Extracted Details */}
              {ocrSuccess && (
                <div className="mb-3 p-3 border border-slate-200 rounded-lg bg-gradient-to-r from-blue-50 to-indigo-50">
                  <div className="text-center">
                    <h4 className="text-base font-semibold text-gray-800 mb-2 flex items-center justify-center gap-2">
                      <Zap className="w-4 h-4 text-blue-600" />
                      Start Agent Task
                    </h4>
                    
                    {/* Agent Configuration */}
                    <div className="grid grid-cols-2 gap-2 mb-3">
                      <div>
                        <label className="block text-xs font-medium text-gray-700 mb-1 text-left">
                          Model
                        </label>
                        <select 
                          className="block w-full px-2 py-1 border border-gray-300 rounded-md text-xs focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                          defaultValue="gpt-4o-mini"
                        >
                          <option value="gpt-4o-mini">GPT-4o Mini</option>
                          <option value="gpt-4o">GPT-4o</option>
                          <option value="claude-3-5-sonnet">Claude 3.5 Sonnet</option>
                        </select>
                      </div>
                      <div>
                        <label className="block text-xs font-medium text-gray-700 mb-1 text-left">
                          Max Steps
                        </label>
                        <select 
                          className="block w-full px-2 py-1 border border-gray-300 rounded-md text-xs focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                          defaultValue="30"
                        >
                          <option value="20">20</option>
                          <option value="30">30</option>
                          <option value="50">50</option>
                        </select>
                      </div>
                    </div>
                    
                    {/* Start Agent Button */}
                    <Button
                      onClick={handleStartAgentTask}
                      disabled={!vendorUrl || !ocrSuccess || isStartingAgent}
                      className="w-full bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white font-semibold py-2 px-4 rounded-lg shadow-lg hover:shadow-xl transition-all duration-200 text-sm"
                    >
                      {isStartingAgent ? (
                        <>
                          <div className="animate-spin rounded-full h-3 w-3 border-b-2 border-white mr-2"></div>
                          Starting Agent...
                        </>
                      ) : (
                        <>
                          <Zap className="w-4 h-4 mr-2" />
                          Start Agent Task
                        </>
                      )}
                    </Button>
                    
                    {/* Status Messages */}
                    {!vendorUrl && (
                      <p className="text-xs text-red-600 mt-2">Please enter the vendor website URL first</p>
                    )}
                    {!ocrSuccess && vendorUrl && (
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
                    {taskMessage && (
                      <div className={`mt-2 p-2 rounded border ${
                        taskMessage.type === 'success' 
                          ? 'bg-green-50 border-green-200 text-green-700' 
                          : taskMessage.type === 'error'
                          ? 'bg-red-50 border-red-200 text-red-700'
                          : 'bg-blue-50 border-blue-200 text-blue-700'
                      }`}>
                        <p className="text-xs font-medium">
                          {taskMessage.type === 'success' && '✅ '}
                          {taskMessage.type === 'error' && '❌ '}
                          {taskMessage.type === 'info' && 'ℹ️ '}
                          {taskMessage.message}
                        </p>
                      </div>
                    )}
                  </div>
                </div>
              )}
              
              {/* Extracted Ticket Information Display - Mobile Layout - EDITABLE */}
              {/* Editable Fields Notice - Mobile */}
              <div className="mb-3 p-2 bg-blue-50 rounded-lg border border-blue-200">
                <div className="flex items-center gap-2 text-blue-700">
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                  <span className="text-xs font-medium">Verify and validate extracted details, update if neccessary</span>
                </div>
              </div>
              
              <div className="grid grid-cols-3 gap-2">
                {/* Mesa/Folio */}
                <FieldWithCopy
                  label="Mesa/Folio"
                  value={ticketData['Mesa_Folio'] || ''}
                  onChange={(value) => setTicketData(prev => ({ ...prev, 'Mesa_Folio': value }))}
                  placeholder="Enter Mesa/Folio"
                />
                
                {/* Fecha */}
                <FieldWithCopy
                  label="Fecha"
                  value={ticketData['Fecha'] || ''}
                  onChange={(value) => setTicketData(prev => ({ ...prev, 'Fecha': value }))}
                  placeholder="Enter Fecha"
                />
                
                {/* ID Ticket */}
                <FieldWithCopy
                  label="ID Ticket"
                  value={ticketData['ID_Ticket'] || ''}
                  onChange={(value) => setTicketData(prev => ({ ...prev, 'ID_Ticket': value }))}
                  placeholder="Enter ID Ticket"
                />
                
                {/* Total */}
                <FieldWithCopy
                  label="Total"
                  value={ticketData['Total'] || ''}
                  onChange={(value) => setTicketData(prev => ({ ...prev, 'Total': value }))}
                  placeholder="Enter Total"
                />
                
                {/* Store/Branch/Plaza */}
                <FieldWithCopy
                  label="Store/Branch/Plaza"
                  value={ticketData['Store_Branch_Plaza'] || ''}
                  onChange={(value) => setTicketData(prev => ({ ...prev, 'Store_Branch_Plaza': value }))}
                  placeholder="Enter Store/Branch/Plaza"
                />
                
                {/* Register/Station/Terminal */}
                <FieldWithCopy
                  label="Register/Station/Terminal"
                  value={ticketData['Register_Station_Terminal'] || ''}
                  onChange={(value) => setTicketData(prev => ({ ...prev, 'Register_Station_Terminal': value }))}
                  placeholder="Enter Register/Station/Terminal"
                />
                
                {/* Payment Type */}
                <FieldWithCopy
                  label="Payment Type"
                  value={ticketData['Payment_Type'] || ''}
                  onChange={(value) => setTicketData(prev => ({ ...prev, 'Payment_Type': value }))}
                  placeholder="Enter Payment Type"
                />
                
                {/* Last 4 digits of card */}
                <FieldWithCopy
                  label="Card Last 4 Digits"
                  value={ticketData['Card_Last_4_Digits'] || ''}
                  onChange={(value) => setTicketData(prev => ({ ...prev, 'Card_Last_4_Digits': value }))}
                  placeholder="Enter Card Last 4 Digits"
                />
                
                {/* TC# */}
                <FieldWithCopy
                  label="TC#"
                  value={ticketData['TC#'] || ''}
                  onChange={(value) => setTicketData(prev => ({ ...prev, 'TC#': value }))}
                  placeholder="Enter TC#"
                />
                
                {/* TR# */}
                <FieldWithCopy
                  label="TR#"
                  value={ticketData['TR#'] || ''}
                  onChange={(value) => setTicketData(prev => ({ ...prev, 'TR#': value }))}
                  placeholder="Enter TR#"
                />
                
                {/* ID */}
                <FieldWithCopy
                  label="ID"
                  value={ticketData['ID'] || ''}
                  onChange={(value) => setTicketData(prev => ({ ...prev, 'ID': value }))}
                  placeholder="Enter ID"
                />
                
                {/* Fol_Vta */}
                <FieldWithCopy
                  label="Fol_Vta"
                  value={ticketData['Fol_Vta'] || ''}
                  onChange={(value) => setTicketData(prev => ({ ...prev, 'Fol_Vta': value }))}
                  placeholder="Enter Fol_Vta"
                />
                
                {/* Comercio - Full width */}
                <FieldWithCopy
                  label="Comercio"
                  value={ticketData['Comercio'] || ''}
                  onChange={(value) => setTicketData(prev => ({ ...prev, 'Comercio': value }))}
                  placeholder="Enter Comercio"
                  fullWidth={true}
                />
              </div>
              
              {/* Full Raw Text Display - New Component */}
              <div className="flex-1 min-h-0 flex flex-col">
                <div className="bg-gray-50 border border-red-200 rounded-lg p-2 flex-1 flex flex-col">
                  <label className="block text-xs font-medium text-gray-700 mb-1 flex-shrink-0">Full Raw Text</label>
                  <div className="flex items-start gap-2">
                    <div className="flex-1 px-2 py-1 bg-white border border-red-200 rounded text-xs text-gray-800 overflow-y-auto scrollbar-thin scrollbar-thumb-gray-300 scrollbar-track-gray-100 min-h-0">
                      {rawText ? (
                        <pre className="whitespace-pre-wrap text-xs leading-relaxed">
                          {rawText}
                        </pre>
                      ) : (
                        <span className="text-gray-300 italic">No raw text available</span>
                      )}
                    </div>
                    <CopyButton value={rawText} />
                  </div>
                </div>
              </div>
              
              {/* Raw OCR Text component removed - duplicate of Full Raw Text */}
            </CardContent>
          </Card>



          {/* Browser View Section - Show when task is active OR manual URL is present */}
          {(taskState.status !== 'idle' || currentLiveViewUrl) && (
            <Card className="flex-1 min-h-0 border-2 border-slate-200/60 shadow-lg bg-white/90 backdrop-blur-sm rounded-xl overflow-hidden">
              <CardHeader className="pb-2 bg-gradient-to-r from-pink-50 to-rose-50 border-b border-slate-200/40 flex-shrink-0">
                <CardTitle className="flex items-center space-x-2 text-base">
                  <div className="w-6 h-6 bg-gradient-to-r from-pink-500 to-rose-500 rounded-lg flex items-center justify-center">
                    <Monitor className="w-3 h-3 text-white" />
                  </div>
                  <span>Live Browser View</span>
                </CardTitle>
              </CardHeader>
              <CardContent className="p-3 overflow-y-auto scrollbar-thin scrollbar-thumb-gray-300 scrollbar-track-gray-100">

                

                
                {renderLiveView()}
              </CardContent>
            </Card>
          )}

          {/* Fullscreen Modal */}
          <FullscreenModal
            isOpen={isFullscreenModal}
            onClose={() => setIsFullscreenModal(false)}
            url={currentLiveViewUrl}
            title="Live Browser View - Fullscreen"
          />
        </div>
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
                      <h3 className="text-base font-semibold text-gray-800">Ticket Data</h3>
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
                  
                  {/* Start Agent Button Section - Top of Extracted Details */}
                  {ocrSuccess && (
                    <div className="p-3 border-b border-slate-200/50 flex-shrink-0">
                      <div className="bg-gradient-to-r from-blue-50 to-indigo-50 rounded-lg p-3 border border-blue-200">
                        <div className="text-center">
                          <h4 className="text-base font-semibold text-gray-800 mb-2 flex items-center justify-center gap-2">
                            <Zap className="w-4 h-4 text-blue-600" />
                            Start Agent Task
                          </h4>
                          
                          {/* Vendor URL Display - Desktop */}
                          <div className="mb-3">
                            <label className="block text-xs font-medium text-gray-700 mb-1 text-left">
                              Vendor Website URL
                            </label>
                            <div className="block w-full px-2 py-1 border border-gray-200 rounded-md text-xs bg-gray-50 text-gray-700">
                              {vendorUrl || 'No vendor URL provided'}
                            </div>
                          </div>
                          
                          {/* Agent Configuration */}
                          <div className="grid grid-cols-2 gap-2 mb-3">
                            <div>
                              <label className="block text-xs font-medium text-gray-700 mb-1 text-left">
                                Model
                              </label>
                              <select 
                                className="w-full px-2 py-1 border border-gray-300 rounded-md text-xs focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                                defaultValue="gpt-5-nano-2025-08-07"
                              >
                                {getModelsByProvider('openai').filter(m => m.category === 'latest' || m.category === 'standard').map(model => (
                                  <option key={model.value} value={model.value}>
                                    {model.label}
                                    {model.isRecommended ? ' (Recomendado)' : ''}
                                  </option>
                                ))}
                                {getModelsByProvider('anthropic').filter(m => m.category === 'latest' || m.category === 'standard').slice(0, 2).map(model => (
                                  <option key={model.value} value={model.value}>
                                    {model.label}
                                  </option>
                                ))}
                              </select>
                            </div>
                            <div>
                              <label className="block text-xs font-medium text-gray-700 mb-1 text-left">
                                Max Steps
                              </label>
                              <select 
                                className="w-full px-2 py-1 border border-gray-300 rounded-md text-xs focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                                defaultValue="100"
                              >
                                <option value="20">20</option>
                                <option value="50">50</option>
                                <option value="100">100</option>
                                <option value="150">150</option>
                              </select>
                            </div>
                          </div>
                          
                          {/* Start Agent Button */}
                          <Button
                            onClick={handleStartAgentTask}
                            disabled={!vendorUrl || !ocrSuccess || taskState.status === 'running' || taskState.status === 'connecting'}
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
                          {!vendorUrl && (
                            <p className="text-xs text-red-600 mt-2">Please enter the vendor website URL first</p>
                          )}
                          {!ocrSuccess && vendorUrl && (
                            <p className="text-xs text-red-600 mt-2">Please complete OCR processing first</p>
                          )}
                          {/* Task Status and Control Buttons */}
                          {(taskState.status === 'running' || taskState.status === 'connecting') && (
                            <div className="mt-2 p-3 bg-blue-50 rounded border border-blue-200">
                              <div className="flex items-center justify-between">
                                <div>
                                  <p className="text-xs text-blue-700">
                                    <strong>Task Status:</strong> {taskState.status}
                                    {taskState.taskId && (
                                      <span className="block mt-1">Task ID: {taskState.taskId.slice(0, 8)}...</span>
                                    )}
                                  </p>
                                </div>
                                <div className="flex gap-2">
                                  <button
                                    onClick={handleStopTask}
                                    className="bg-red-600 hover:bg-red-700 text-white text-xs font-semibold py-2 px-3 rounded border"
                                    type="button"
                                  >
                                    🛑 Stop
                                  </button>
                                  <button
                                    onClick={resetTaskState}
                                    className="bg-gray-200 hover:bg-gray-300 text-gray-800 text-xs font-semibold py-2 px-3 rounded border"
                                    type="button"
                                  >
                                    Reset
                                  </button>
                                </div>
                              </div>
                            </div>
                          )}
                          
                          {/* Task Message Display */}
                          {taskMessage && (
                            <div className={`mt-2 p-3 rounded border ${
                              taskMessage.type === 'success' 
                                ? 'bg-green-50 border-green-200 text-green-700' 
                                : taskMessage.type === 'error'
                                ? 'bg-red-50 border-red-200 text-red-700'
                                : 'bg-blue-50 border-blue-200 text-blue-700'
                            }`}>
                              <p className="text-sm font-medium">
                                {taskMessage.type === 'success' && '✅ '}
                                {taskMessage.type === 'error' && '❌ '}
                                {taskMessage.type === 'info' && 'ℹ️ '}
                                {taskMessage.message}
                              </p>
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  )}
                  
                  {/* Extracted Ticket Information Display - 2x2 Grid - EDITABLE */}
                  <div className="p-3 flex flex-col h-full" style={{ minHeight: '400px' }}>
                    {/* Editable Fields Notice */}
                    <div className="mb-3 p-2 bg-blue-50 rounded-lg border border-blue-200">
                      <div className="flex items-center gap-2 text-blue-700">
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                        </svg>
                        <span className="text-xs font-medium">Verify and validate extracted details, update if neccessary</span>
                      </div>
                    </div>
                    
                    <div className="grid grid-cols-2 gap-2 flex-shrink-0 mb-4">
                      {/* Mesa/Folio */}
                      <FieldWithCopy
                        label="Mesa/Folio"
                        value={ticketData['Mesa_Folio'] || ''}
                        onChange={(value) => setTicketData(prev => ({ ...prev, 'Mesa_Folio': value }))}
                        placeholder="Enter Mesa/Folio"
                      />
                      
                      {/* Fecha */}
                      <FieldWithCopy
                        label="Fecha"
                        value={ticketData['Fecha'] || ''}
                        onChange={(value) => setTicketData(prev => ({ ...prev, 'Fecha': value }))}
                        placeholder="Enter Fecha"
                      />
                      
                      {/* ID Ticket */}
                      <FieldWithCopy
                        label="ID Ticket"
                        value={ticketData['ID_Ticket'] || ''}
                        onChange={(value) => setTicketData(prev => ({ ...prev, 'ID_Ticket': value }))}
                        placeholder="Enter ID Ticket"
                      />
                      
                      {/* Total */}
                      <FieldWithCopy
                        label="Total"
                        value={ticketData['Total'] || ''}
                        onChange={(value) => setTicketData(prev => ({ ...prev, 'Total': value }))}
                        placeholder="Enter Total"
                      />
                      
                      {/* Store/Branch/Plaza */}
                      <FieldWithCopy
                        label="Store/Branch/Plaza"
                        value={ticketData['Store_Branch_Plaza'] || ''}
                        onChange={(value) => setTicketData(prev => ({ ...prev, 'Store_Branch_Plaza': value }))}
                        placeholder="Enter Store/Branch/Plaza"
                      />
                      
                      {/* Register/Station/Terminal */}
                      <FieldWithCopy
                        label="Register/Station/Terminal"
                        value={ticketData['Register_Station_Terminal'] || ''}
                        onChange={(value) => setTicketData(prev => ({ ...prev, 'Register_Station_Terminal': value }))}
                        placeholder="Enter Register/Station/Terminal"
                      />
                      
                      {/* Payment Type */}
                      <FieldWithCopy
                        label="Payment Type"
                        value={ticketData['Payment_Type'] || ''}
                        onChange={(value) => setTicketData(prev => ({ ...prev, 'Payment_Type': value }))}
                        placeholder="Enter Payment Type"
                      />
                      
                      {/* Last 4 digits of card */}
                      <FieldWithCopy
                        label="Card Last 4 Digits"
                        value={ticketData['Card_Last_4_Digits'] || ''}
                        onChange={(value) => setTicketData(prev => ({ ...prev, 'Card_Last_4_Digits': value }))}
                        placeholder="Enter Card Last 4 Digits"
                      />
                      
                      {/* TC# */}
                      <FieldWithCopy
                        label="TC#"
                        value={ticketData['TC#'] || ''}
                        onChange={(value) => setTicketData(prev => ({ ...prev, 'TC#': value }))}
                        placeholder="Enter TC#"
                      />
                      
                      {/* TR# */}
                      <FieldWithCopy
                        label="TR#"
                        value={ticketData['TR#'] || ''}
                        onChange={(value) => setTicketData(prev => ({ ...prev, 'TR#': value }))}
                        placeholder="Enter TR#"
                      />
                      
                      {/* ID */}
                      <FieldWithCopy
                        label="ID"
                        value={ticketData['ID'] || ''}
                        onChange={(value) => setTicketData(prev => ({ ...prev, 'ID': value }))}
                        placeholder="Enter ID"
                      />
                      
                      {/* Fol_Vta */}
                      <FieldWithCopy
                        label="Fol_Vta"
                        value={ticketData['Fol_Vta'] || ''}
                        onChange={(value) => setTicketData(prev => ({ ...prev, 'Fol_Vta': value }))}
                        placeholder="Enter Fol_Vta"
                      />
                      
                      {/* Comercio - Full width */}
                      <FieldWithCopy
                        label="Comercio"
                        value={ticketData['Comercio'] || ''}
                        onChange={(value) => setTicketData(prev => ({ ...prev, 'Comercio': value }))}
                        placeholder="Enter Comercio"
                        fullWidth={true}
                      />
                    </div>
                    
                    {/* Full Raw Text Display - New Component */}
                    <div className="flex-1 min-h-0 flex flex-col">
                      <div className="bg-gray-50 border border-red-200 rounded-lg p-2 flex-1 flex flex-col">
                        <label className="block text-xs font-medium text-gray-700 mb-1 flex-shrink-0">Full Raw Text</label>
                        <div className="flex items-start gap-2">
                          <div className="flex-1 px-2 py-1 bg-white border border-red-200 rounded text-xs text-gray-800 overflow-y-auto scrollbar-thin scrollbar-thumb-gray-300 scrollbar-track-gray-100 min-h-0">
                            {rawText ? (
                              <pre className="whitespace-pre-wrap text-xs leading-relaxed">
                                {rawText}
                              </pre>
                            ) : (
                              <span className="text-gray-500 italic">No raw text available</span>
                            )}
                          </div>
                          <CopyButton value={rawText} />
                        </div>
                      </div>
                    </div>
                    
                    {/* Raw OCR Text component removed - duplicate of Full Raw Text */}
                  </div>
                  </div>
                </div>
              </div>
            </ResizablePanel>

            <ResizableHandle withHandle className="w-2 bg-gradient-to-b from-pink-100 to-rose-100 hover:bg-gradient-to-b hover:from-pink-200 hover:to-rose-200 transition-all duration-200" data-panel-resize-handle />

            {/* Right Pane - Live View with URL Input (65% default) */}
            <ResizablePanel defaultSize={65} minSize={50} maxSize={75} className="overflow-hidden" data-panel="live-view">
              <div className="h-full p-3 bg-gradient-to-b from-white to-slate-50/30 overflow-hidden">
                <div className="h-full bg-white rounded-lg border border-slate-200/50 shadow-sm overflow-hidden">
                  <div className="h-full flex flex-col" data-viewport="live-view">
                    {/* Browser Mode Switch Header */}
                    <div className="p-3 border-b border-gray-200 bg-gray-50 flex-shrink-0">
                      <div className="flex items-center justify-between mb-3">
                        <h3 className="text-base font-semibold">Browser Mode</h3>
                        <BrowserModeSwitch 
                          value={browserMode}
                          onChange={setBrowserMode}
                          disabled={taskState.status === 'running' || taskState.status === 'connecting'}
                        />
                      </div>
                      

                      

                    </div>
                    

                    
                    {/* Live View Content */}
                    <div className="flex-1 p-3 overflow-hidden">
                      {browserMode === 'browserbase' ? (
                        <>
                          {renderLiveView()}
                        </>
                      ) : (
                        /* Local Browser Mode Content */
                        <div className="h-full flex items-center justify-center">
                          <div className="text-center max-w-md">
                            <Monitor className="mx-auto h-16 w-16 text-green-600 mb-4" />
                            <h3 className="text-lg font-semibold text-gray-900 mb-2">
                              Local Browser Mode
                            </h3>
                            <p className="text-sm text-gray-600 mb-4">
                              Task will run on your local machine using your system browser. 
                              No live view available, but execution is typically faster.
                            </p>
                            

                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            </ResizablePanel>
          </ResizablePanelGroup>
        </CardContent>
      </Card>

      {/* Fullscreen Modal */}
      <FullscreenModal
        isOpen={isFullscreenModal}
        onClose={() => setIsFullscreenModal(false)}
        url={currentLiveViewUrl}
        title="Live Browser View - Fullscreen"
      />
    </div>
  )
}

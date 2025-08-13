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
}

interface TaskState {
  taskId: string | null
  sessionId: string | null
  liveViewUrl: string | null
  status: 'idle' | 'pending' | 'running' | 'paused' | 'completed' | 'failed' | 'connecting'
}

export function DashboardDualPane({
  onTaskSubmit,
  className = ''
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
      console.log('✅ Upload success:', data)
    } catch (err: any) {
      console.error('❌ Upload error:', err)
      setUploadError(err?.message || 'Upload failed')
    } finally {
      setIsUploading(false)
    }
  }

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
            <Button size="sm" variant="outline" onClick={handleRefreshView}>
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

  // Mobile layout - stacked vertically
  if (isMobile) {
    return (
      <div className={`h-full min-h-[800px] w-full ${className}`}>
        <div className="flex flex-col h-full gap-6">
          {/* Image Upload Section */}
          <Card className="border-2 border-slate-200/60 shadow-lg bg-white/90 backdrop-blur-sm rounded-xl overflow-hidden">
            <CardHeader className="pb-4 bg-gradient-to-r from-pink-50 to-rose-50 border-b border-slate-200/40">
              <CardTitle className="flex items-center space-x-2 text-xl">
                <div className="w-8 h-8 bg-gradient-to-r from-pink-500 to-rose-500 rounded-lg flex items-center justify-center">
                  <Zap className="w-5 h-5 text-white" />
                </div>
                <span>Upload Ticket Image</span>
              </CardTitle>
              <CardDescription className="text-slate-600">
                Select a receipt image to extract ticket details and optionally provide the vendor URL.
              </CardDescription>
            </CardHeader>
            <CardContent className="p-4">
              <div className="flex flex-col gap-3">
                <Input
                  type="url"
                  placeholder="Vendor URL (e.g., https://facturacion.walmartmexico.com.mx/)"
                  value={vendorUrl}
                  onChange={(e) => setVendorUrl(e.target.value)}
                />
                <Input type="file" accept="image/*,.pdf" onChange={handleFileChange} />
                <div className="flex items-center gap-2">
                  <Button onClick={handleImageUpload} disabled={!selectedFile || isUploading} variant="default">
                    {isUploading ? 'Uploading…' : 'Upload'}
                  </Button>
                  {selectedFile && (
                    <span className="text-xs text-slate-600">Selected: {selectedFile.name}</span>
                  )}
                </div>
                {uploadError && (
                  <div className="text-xs text-red-600">{uploadError}</div>
                )}
                {uploadedTicketId && (
                  <div className="text-xs text-green-700">Ticket created: {uploadedTicketId}</div>
                )}
              </div>
            </CardContent>
          </Card>

          {/* Task Submission Section */}
          <Card className="border-2 border-slate-200/60 shadow-lg bg-white/90 backdrop-blur-sm rounded-xl overflow-hidden">
            <CardHeader className="pb-4 bg-gradient-to-r from-pink-50 to-rose-50 border-b border-slate-200/40">
              <CardTitle className="flex items-center space-x-2 text-xl">
                <div className="w-8 h-8 bg-gradient-to-r from-pink-500 to-rose-500 rounded-lg flex items-center justify-center">
                  <Zap className="w-5 h-5 text-white" />
                </div>
                <span>{t('tasks.simple.title')}</span>
              </CardTitle>
              <CardDescription className="text-slate-600">
                {t('tasks.simple.description')}
              </CardDescription>
            </CardHeader>
            <CardContent className="p-4">
              <LiveViewPane
                sessionId="dashboard"
                taskId={taskState.taskId || undefined}
                status={taskState.status === 'idle' ? 'pending' : taskState.status}
                onTakeoverRequest={handleTakeoverRequest}
                onRefresh={handleRefreshView}
                className="h-[400px]"
                viewType="taskSubmission"
                onTaskSubmit={handleTaskCreated}
                onResetTask={resetTaskState}
              />
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
                
                {/* Debug Panel for Mobile */}
                <div className="mb-4 p-3 bg-gray-50 rounded-lg border border-gray-200">
                  <h4 className="text-sm font-medium text-gray-700 mb-2 flex items-center gap-2">
                    <Activity className="w-4 h-4" />
                    Debug Info
                  </h4>
                  <div className="space-y-2 text-xs">
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
                  {currentLiveViewUrl && (
                    <div className="mt-2 p-2 bg-blue-50 rounded border border-blue-200">
                      <div className="text-xs text-blue-700">
                        <strong>URL Analysis:</strong>
                        <div className="mt-1 space-y-1">
                          <div>✅ Protocol: {currentLiveViewUrl.startsWith('https://') ? 'HTTPS' : 'Other'}</div>
                          <div>✅ Domain: {currentLiveViewUrl.includes('browserbase.com') ? 'Browserbase' : 'Other'}</div>
                          <div>✅ Path: {currentLiveViewUrl.includes('/devtools/inspector.html') ? 'DevTools Inspector' : 'Other'}</div>
                          <div>✅ WebSocket: {currentLiveViewUrl.includes('wss=') ? 'Present' : 'Missing'}</div>
                          <div>✅ Debug Flag: {currentLiveViewUrl.includes('debug=true') ? 'Present' : 'Missing'}</div>
                        </div>
                      </div>
                    </div>
                  )}
                  
                  {/* WebSocket Status for Mobile */}
                  <div className="mt-3 p-2 bg-green-50 rounded border border-green-200">
                    <div className="text-xs text-green-700">
                      <strong>WebSocket Status:</strong>
                      <div className="mt-1 space-y-1">
                        <div>✅ Connection: Active for task {taskState.taskId || 'None'}</div>
                        <div>✅ Updates: Listening for live view URL</div>
                        <div>✅ Fallback: API fetch after 30s if needed</div>
                      </div>
                    </div>
                  </div>
                </div>
                
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
            {/* Left Pane - Task Submission (35% default) */}
            <ResizablePanel defaultSize={35} minSize={25} maxSize={50}>
              <div className="h-full p-4 border-r-2 border-slate-200/40 bg-gradient-to-b from-white to-slate-50/30 min-h-0">
                <div className="h-full bg-white rounded-lg border border-slate-200/50 shadow-sm overflow-hidden">
                  <div className="p-4 border-b border-slate-200/50">
                    <h3 className="text-sm font-semibold mb-2">Upload Ticket Image</h3>
                    <div className="flex flex-col gap-2">
                      <Input
                        type="url"
                        placeholder="Vendor URL (e.g., https://facturacion.walmartmexico.com.mx/)"
                        value={vendorUrl}
                        onChange={(e) => setVendorUrl(e.target.value)}
                        className="flex-1"
                      />
                      <div className="flex items-center gap-2">
                      <Input type="file" accept="image/*,.pdf" onChange={handleFileChange} className="flex-1" />
                      <Button onClick={handleImageUpload} disabled={!selectedFile || isUploading} variant="outline">
                        {isUploading ? 'Uploading…' : 'Upload'}
                      </Button>
                      </div>
                    </div>
                    {selectedFile && (
                      <div className="mt-2 text-xs text-slate-600">Selected: {selectedFile.name}</div>
                    )}
                    {uploadError && (
                      <div className="mt-2 text-xs text-red-600">{uploadError}</div>
                    )}
                    {uploadedTicketId && (
                      <div className="mt-2 text-xs text-green-700">Ticket created: {uploadedTicketId}</div>
                    )}
                  </div>
                  <div className="h-[calc(100%-120px)]">
                    <LiveViewPane
                      sessionId="dashboard"
                      taskId={taskState.taskId || undefined}
                      status={taskState.status}
                      onTakeoverRequest={handleTakeoverRequest}
                      onRefresh={handleRefreshView}
                      className="h-full"
                      viewType="taskSubmission"
                      onTaskSubmit={handleTaskCreated}
                      onResetTask={resetTaskState}
                    />
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
                        <div className="grid grid-cols-2 gap-3 text-xs">
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

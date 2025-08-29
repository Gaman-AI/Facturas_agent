'use client'

import React, { useState, useRef, useEffect } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Separator } from '@/components/ui/separator'
import { 
  Loader2, 
  Monitor, 
  RefreshCw, 
  ExternalLink, 
  Hand, 
  Play, 
  AlertCircle, 
  Maximize2, 
  Minimize2,
  Send,
  MessageCircle,
  Globe,
  Settings,
  Fullscreen,
  Minimize,
  Zap
} from 'lucide-react'
import { useLanguage } from '@/contexts/LanguageContext'
import { SimpleTaskSubmissionPane } from './SimpleTaskSubmissionPane'
import { websocketService } from '@/services/websocket'

export interface LiveViewPaneProps {
  sessionId: string
  liveViewUrl?: string
  taskId?: string
  status?: 'idle' | 'pending' | 'running' | 'paused' | 'completed' | 'failed' | 'connecting'
  onTakeoverRequest?: () => void
  onRefresh?: () => void
  className?: string
  viewType?: 'chat' | 'browser' | 'taskSubmission' // New prop to determine which view to show
  onTaskSubmit?: (taskId: string) => void // Callback for task submission
  onResetTask?: () => void // Callback to reset task state
}

interface ChatMessage {
  id: string
  type: 'user' | 'agent' | 'system'
  content: string
  timestamp: Date
  status?: 'sending' | 'sent' | 'error'
}

export function LiveViewPane({
  sessionId,
  liveViewUrl,
  taskId,
  status = 'connecting',
  onTakeoverRequest,
  onRefresh,
  className = '',
  viewType = 'browser', // Default to browser view
  onTaskSubmit,
  onResetTask
}: LiveViewPaneProps) {
  const { t } = useLanguage()
  const [isFullscreen, setIsFullscreen] = useState(false)
  const [takeoverMode, setTakeoverMode] = useState(false)
  const [hasError, setHasError] = useState(false)
  const [isLoading, setIsLoading] = useState(true)
  const [chatMessages, setChatMessages] = useState<ChatMessage[]>([
    {
      id: '1',
      type: 'system',
      content: 'Browser automation session started. You can interact with the agent here.',
      timestamp: new Date()
    }
  ])
  const [newMessage, setNewMessage] = useState('')
  const [browserViewUrl, setBrowserViewUrl] = useState(liveViewUrl || null)
  const [realTimeSessionId, setRealTimeSessionId] = useState<string | null>(null)
  const [realTimeLiveViewUrl, setRealTimeLiveViewUrl] = useState<string | null>(null)
  const [automationProgress, setAutomationProgress] = useState<{step: string, message: string, progress: number} | null>(null)
  const iframeRef = useRef<HTMLIFrameElement>(null)
  const chatScrollRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    setIsLoading(true)
    setHasError(false)
    
    // Connect to WebSocket when component mounts or sessionId changes
    const connectAndSetup = async () => {
      try {
        console.log('LiveViewPane: Connecting to WebSocket for session:', sessionId)
        const connected = await websocketService.connect(sessionId)
        if (connected) {
          console.log('LiveViewPane: WebSocket connected successfully')
          // Subscribe to task updates if taskId is available
          if (taskId) {
            websocketService.subscribeToTask(taskId)
            console.log('LiveViewPane: Subscribed to task updates:', taskId)
          }
        } else {
          console.warn('LiveViewPane: Failed to connect to WebSocket')
        }
      } catch (error) {
        console.error('LiveViewPane: WebSocket connection error:', error)
      }
    }
    
    connectAndSetup()
    
    // Automatically set the browser view URL when liveViewUrl is provided
    if (liveViewUrl) {
      console.log('LiveViewPane: liveViewUrl updated:', liveViewUrl)
      setBrowserViewUrl(liveViewUrl)
    } else {
      console.log('LiveViewPane: liveViewUrl is null/undefined')
    }
  }, [sessionId, liveViewUrl, taskId])

  // Listen for real-time URL updates
  useEffect(() => {
    const handleSessionCreated = (data: any) => {
      console.log('LiveViewPane: Session created event received:', data)
      // Check if this event is for our task or session
      if (data.taskId === taskId || data.sessionId === sessionId || data.session_id === sessionId || data.sessionId === sessionId) {
        const sessionIdValue = data.sessionId || data.session_id
        setRealTimeSessionId(sessionIdValue);
        addLog(`🔗 Browser session created: ${sessionIdValue}`, 'system');
      }
    };

    const handleLiveViewReady = (data: any) => {
      console.log('LiveViewPane: Live view ready event received:', data)
      // Check if this event is for our task or session
      if (data.taskId === taskId || data.sessionId === sessionId || data.session_id === sessionId) {
        const liveViewUrlValue = data.liveViewUrl || data.live_view_url
        if (liveViewUrlValue) {
          setRealTimeLiveViewUrl(liveViewUrlValue);
          setBrowserViewUrl(liveViewUrlValue);
          setIsLoading(false);
          addLog(`👀 Live view ready: ${liveViewUrlValue}`, 'system');
          console.log('LiveViewPane: Browser view URL updated to:', liveViewUrlValue)
        }
      }
    };

    const handleUrlGenerated = (data: any) => {
      console.log('LiveViewPane: URL generated event received:', data)
      // Check if this event is for our task
      if (data.taskId === taskId) {
        const urlValue = data.url || data.liveViewUrl || data.live_view_url
        if (urlValue) {
          setBrowserViewUrl(urlValue);
          setIsLoading(false);
          addLog(`🌐 URL generated: ${urlValue}`, 'system');
          console.log('LiveViewPane: Browser view URL updated from URL generated event:', urlValue)
        }
      }
    };

    const handleAutomationProgress = (data: any) => {
      console.log('LiveViewPane: Automation progress event received:', data)
      if (data.taskId === taskId || data.task_id === taskId) {
        setAutomationProgress({
          step: data.step || 'processing',
          message: data.message || 'Processing...',
          progress: data.progress || 0
        });
        addLog(`📊 ${data.message || 'Processing...'} (${data.progress || 0}%)`, 'system');
      }
    };

    // Set up WebSocket service listeners
    websocketService.on('session_created', handleSessionCreated);
    websocketService.on('live_view_ready', handleLiveViewReady);
    websocketService.on('url_generated', handleUrlGenerated);
    websocketService.on('automation_progress', handleAutomationProgress);

    // Clean up listeners on unmount
    return () => {
      websocketService.off('session_created', handleSessionCreated);
      websocketService.off('live_view_ready', handleLiveViewReady);
      websocketService.off('url_generated', handleUrlGenerated);
      websocketService.off('automation_progress', handleAutomationProgress);
    };

  }, [sessionId, taskId]);

  useEffect(() => {
    console.log('LiveViewPane: browserViewUrl updated:', browserViewUrl)
  }, [browserViewUrl])

  useEffect(() => {
    // Auto-scroll chat to bottom
    if (chatScrollRef.current) {
      chatScrollRef.current.scrollTop = chatScrollRef.current.scrollHeight
    }
  }, [chatMessages])

  const handleIframeLoad = () => {
    setIsLoading(false)
    setHasError(false)
  }

  const handleIframeError = () => {
    setIsLoading(false)
    setHasError(true)
  }

  const handleRefresh = () => {
    if (iframeRef.current) {
      setIsLoading(true)
      setHasError(false)
      iframeRef.current.src = iframeRef.current.src
    }
    onRefresh?.()
  }

  const handleTakeover = () => {
    setTakeoverMode(!takeoverMode)
    onTakeoverRequest?.()
  }

  const toggleFullscreen = () => {
    setIsFullscreen(!isFullscreen)
  }

  const handleSendMessage = () => {
    if (!newMessage.trim()) return

    const userMessage: ChatMessage = {
      id: Date.now().toString(),
      type: 'user',
      content: newMessage,
      timestamp: new Date(),
      status: 'sending'
    }

    setChatMessages(prev => [...prev, userMessage])
    setNewMessage('')

    // Simulate agent response
    setTimeout(() => {
      const agentMessage: ChatMessage = {
        id: (Date.now() + 1).toString(),
        type: 'agent',
        content: `I understand you want me to: "${newMessage}". I'm working on this task in the browser.`,
        timestamp: new Date(),
        status: 'sent'
      }
      setChatMessages(prev => [...prev, agentMessage])
    }, 1000)
  }

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      handleSendMessage()
    }
  }

  const getStatusColor = () => {
    switch (status) {
      case 'running': return 'bg-green-500'
      case 'paused': return 'bg-yellow-500'
      case 'completed': return 'bg-blue-500'
      case 'failed': return 'bg-red-500'
      case 'connecting': return 'bg-orange-500'
      default: return 'bg-slate-500'
    }
  }

  const getStatusText = () => {
    switch (status) {
      case 'running': return t('monitor.status.running', 'Running')
      case 'paused': return t('monitor.status.paused', 'Paused')
      case 'completed': return t('monitor.status.completed', 'Completed')
      case 'failed': return t('monitor.status.failed', 'Failed')
      case 'connecting': return t('monitor.status.connecting', 'Connecting')
      default: return t('monitor.status.pending', 'Pending')
    }
  }

  const getMessageIcon = (type: ChatMessage['type']) => {
    switch (type) {
      case 'user': return <div className="w-6 h-6 bg-blue-500 rounded-full flex items-center justify-center text-white text-xs font-bold">U</div>
      case 'agent': return <div className="w-6 h-6 bg-green-500 rounded-full flex items-center justify-center text-white text-xs font-bold">A</div>
      case 'system': return <div className="w-6 h-6 bg-slate-500 rounded-full flex items-center justify-center text-white text-xs font-bold">S</div>
    }
  }

  const addLog = (message: string, type: ChatMessage['type'] = 'system') => {
    const newLog: ChatMessage = {
      id: Date.now().toString(),
      type,
      content: message,
      timestamp: new Date()
    };
    setChatMessages(prev => [...prev, newLog]);
  };

  if (hasError) {
    return (
      <Card className={`h-full flex flex-col ${className}`}>
        <CardHeader className="flex-shrink-0">
          <CardTitle className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Monitor className="w-5 h-5" />
              {t('monitor.liveView.title', 'Live Browser View')}
            </div>
            <div className="flex items-center gap-2">
              <div className={`w-2 h-2 rounded-full ${getStatusColor()}`}></div>
              <Badge variant="outline">{getStatusText()}</Badge>
            </div>
          </CardTitle>
          <CardDescription>
            {t('monitor.liveView.sessionId', 'Session')}: {sessionId}
          </CardDescription>
        </CardHeader>
        
        <CardContent className="flex-1 flex flex-col items-center justify-center">
          <Alert variant="destructive" className="max-w-md">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>
              Browser automation failed to start. Please check the task logs for more details.
            </AlertDescription>
          </Alert>
          
          <div className="flex gap-2 mt-4">
            <Button onClick={handleRefresh} variant="outline">
              <RefreshCw className="w-4 h-4 mr-2" />
              Refresh Status
            </Button>
          </div>
        </CardContent>
      </Card>
    )
  }

  // Render different content based on viewType
  if (viewType === 'taskSubmission') {
    return (
      <Card className={`h-full flex flex-col ${className}`}>
        <CardHeader className="flex-shrink-0 border-b">
          <CardTitle className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Zap className="w-5 h-5 text-teal-600" />
              <span>Create Task</span>
            </div>
            <div className="flex items-center gap-2">
              <div className={`w-2 h-2 rounded-full ${getStatusColor()}`}></div>
              <Badge variant="outline" className="text-xs">{getStatusText()}</Badge>
            </div>
          </CardTitle>
          <CardDescription>
            Describe your automation task in plain language
          </CardDescription>
        </CardHeader>
        
        <CardContent className="flex-1 p-4">
          <SimpleTaskSubmissionPane 
            onTaskSubmit={onTaskSubmit}
            onResetTask={onResetTask}
            taskId={taskId}
            status={status}
            className="h-full"
          />
        </CardContent>
      </Card>
    )
  }

  if (viewType === 'chat') {
    return (
      <Card className={`h-full flex flex-col ${className}`}>
        <CardHeader className="flex-shrink-0 border-b">
          <CardTitle className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <MessageCircle className="w-5 h-5 text-teal-600" />
              <span>Agent Chat</span>
            </div>
            <div className="flex items-center gap-2">
              <div className={`
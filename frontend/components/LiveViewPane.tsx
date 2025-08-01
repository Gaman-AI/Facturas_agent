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
  FullscreenExit
} from 'lucide-react'
import { useLanguage } from '@/contexts/LanguageContext'

export interface LiveViewPaneProps {
  sessionId: string
  liveViewUrl?: string
  taskId?: string
  status?: 'pending' | 'running' | 'paused' | 'completed' | 'failed' | 'connecting'
  onTakeoverRequest?: () => void
  onRefresh?: () => void
  className?: string
  viewType?: 'chat' | 'browser' // New prop to determine which view to show
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
  viewType = 'browser' // Default to browser view
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
  const [useLocalBrowser, setUseLocalBrowser] = useState(!liveViewUrl)
  const iframeRef = useRef<HTMLIFrameElement>(null)
  const chatScrollRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    setIsLoading(true)
    setHasError(false)
  }, [sessionId, liveViewUrl])

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
  if (viewType === 'chat') {
    return (
      <Card className={`h-full flex flex-col ${className}`}>
        <CardHeader className="flex-shrink-0 border-b">
          <CardTitle className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <MessageCircle className="w-5 h-5 text-pink-600" />
              <span>Agent Chat</span>
            </div>
            <div className="flex items-center gap-2">
              <div className={`w-2 h-2 rounded-full ${getStatusColor()}`}></div>
              <Badge variant="outline" className="text-xs">{getStatusText()}</Badge>
            </div>
          </CardTitle>
          <CardDescription>
            Task ID: {taskId?.slice(0, 8)}... • Session: {sessionId.slice(0, 8)}...
          </CardDescription>
        </CardHeader>
        
        <CardContent className="flex-1 flex flex-col p-0">
          {/* Chat Messages */}
          <ScrollArea className="flex-1 p-4" ref={chatScrollRef}>
            <div className="space-y-4">
              {chatMessages.map((message) => (
                <div key={message.id} className={`flex gap-3 ${message.type === 'user' ? 'justify-end' : 'justify-start'}`}>
                  {message.type !== 'user' && getMessageIcon(message.type)}
                  <div className={`max-w-[80%] ${message.type === 'user' ? 'order-first' : ''}`}>
                    <div className={`rounded-lg px-3 py-2 ${
                      message.type === 'user' 
                        ? 'bg-pink-600 text-white' 
                        : message.type === 'agent'
                        ? 'bg-pink-100 text-pink-900'
                        : 'bg-slate-100 text-slate-700'
                    }`}>
                      <p className="text-sm">{message.content}</p>
                    </div>
                    <p className="text-xs text-slate-500 mt-1">
                      {message.timestamp.toLocaleTimeString()}
                    </p>
                  </div>
                  {message.type === 'user' && getMessageIcon(message.type)}
                </div>
              ))}
            </div>
          </ScrollArea>
          
          <Separator />
          
          {/* Chat Input */}
          <div className="p-4">
            <div className="flex gap-2">
              <Input
                value={newMessage}
                onChange={(e) => setNewMessage(e.target.value)}
                onKeyPress={handleKeyPress}
                placeholder="Type your message to the agent..."
                className="flex-1"
              />
              <Button onClick={handleSendMessage} size="sm" className="bg-pink-500 hover:bg-pink-600">
                <Send className="w-4 h-4" />
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>
    )
  }

  // Browser View
  return (
    <Card className={`h-full flex flex-col ${isFullscreen ? 'fixed inset-0 z-50' : ''} ${className}`}>
      <CardHeader className="flex-shrink-0 border-b">
        <CardTitle className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Globe className="w-5 h-5 text-pink-600" />
            <span>Live Browser View</span>
          </div>
          <div className="flex items-center gap-2">
            <div className={`w-2 h-2 rounded-full ${getStatusColor()}`}></div>
            <Badge variant="outline">{getStatusText()}</Badge>
            <Button size="sm" variant="ghost" onClick={toggleFullscreen}>
              {isFullscreen ? <FullscreenExit className="w-4 h-4" /> : <Fullscreen className="w-4 h-4" />}
            </Button>
            <Button size="sm" variant="ghost" onClick={handleRefresh}>
              <RefreshCw className="w-4 h-4" />
            </Button>
            <Button size="sm" variant="ghost" onClick={() => window.open(browserViewUrl || '', '_blank')}>
              <ExternalLink className="w-4 h-4" />
            </Button>
          </div>
        </CardTitle>
        <CardDescription className="flex items-center justify-between">
          <span>
            {useLocalBrowser ? 'Local Browser Automation' : `Browserbase Session: ${sessionId}`}
          </span>
          <div className="flex items-center gap-2">
            {!useLocalBrowser && (
              <>
                <Input
                  value={browserViewUrl || ''}
                  onChange={(e) => setBrowserViewUrl(e.target.value)}
                  placeholder="Browserbase URL"
                  className="w-64 text-xs"
                />
                <Button size="sm" variant="outline" onClick={() => setBrowserViewUrl(`https://www.browserbase.com/sessions/${sessionId}`)}>
                  Reset
                </Button>
              </>
            )}
            <Button 
              size="sm" 
              variant="outline" 
              onClick={() => setUseLocalBrowser(!useLocalBrowser)}
            >
              {useLocalBrowser ? 'Use Browserbase' : 'Use Local Browser'}
            </Button>
          </div>
        </CardDescription>
      </CardHeader>
      
      <CardContent className="flex-1 p-0 relative">
        {isLoading && (
          <div className="absolute inset-0 flex items-center justify-center bg-slate-50 rounded-lg z-10">
            <div className="text-center">
              <Loader2 className="w-8 h-8 animate-spin mx-auto mb-4 text-primary" />
              <p className="text-slate-600">
                {t('monitor.liveView.loading', 'Loading browser view...')}
              </p>
            </div>
          </div>
        )}
        
        {useLocalBrowser ? (
          // Local Browser Automation Status Display
          <div className="h-full flex flex-col items-center justify-center bg-slate-50 rounded-lg p-8">
            <div className="text-center max-w-md">
              {/* Status Icon */}
              <div className="mb-6">
                {status === 'running' && (
                  <div className="w-16 h-16 mx-auto mb-4 bg-pink-100 rounded-full flex items-center justify-center">
                    <Monitor className="w-8 h-8 text-pink-600" />
                  </div>
                )}
                {status === 'completed' && (
                  <div className="w-16 h-16 mx-auto mb-4 bg-pink-100 rounded-full flex items-center justify-center">
                    <Monitor className="w-8 h-8 text-pink-600" />
                  </div>
                )}
                {status === 'failed' && (
                  <div className="w-16 h-16 mx-auto mb-4 bg-red-100 rounded-full flex items-center justify-center">
                    <AlertCircle className="w-8 h-8 text-red-600" />
                  </div>
                )}
                {(status === 'pending' || status === 'connecting') && (
                  <div className="w-16 h-16 mx-auto mb-4 bg-orange-100 rounded-full flex items-center justify-center">
                    <Loader2 className="w-8 h-8 text-orange-600 animate-spin" />
                  </div>
                )}
              </div>

              {/* Status Message */}
              <h3 className="text-lg font-semibold mb-2">
                {status === 'running' && 'Browser Automation Active'}
                {status === 'completed' && 'Task Completed Successfully'}
                {status === 'failed' && 'Task Failed'}
                {(status === 'pending' || status === 'connecting') && 'Initializing Browser Automation'}
              </h3>

              <p className="text-slate-600 mb-6">
                {status === 'running' && 'A browser window should be visible on your screen showing the automation in progress.'}
                {status === 'completed' && 'The browser automation task has been completed successfully.'}
                {status === 'failed' && 'The browser automation task encountered an error and could not complete.'}
                {(status === 'pending' || status === 'connecting') && 'Setting up the browser automation environment...'}
              </p>

              {/* Task Information */}
              {taskId && (
                <div className="bg-white rounded-lg p-4 mb-4 border">
                  <h4 className="font-medium mb-2">Task Information</h4>
                  <div className="text-sm text-slate-600 space-y-1">
                    <div>Task ID: {taskId.slice(0, 8)}...</div>
                    <div>Session: {sessionId}</div>
                    <div>Status: {getStatusText()}</div>
                  </div>
                </div>
              )}

              {/* Action Buttons */}
              <div className="flex gap-2 justify-center">
                <Button onClick={handleRefresh} variant="outline">
                  <RefreshCw className="w-4 h-4 mr-2" />
                  Refresh Status
                </Button>
                
                {status === 'running' && (
                  <Button onClick={handleTakeover} variant="outline">
                    <Hand className="w-4 h-4 mr-2" />
                    Take Control
                  </Button>
                )}
              </div>
            </div>
          </div>
        ) : (
          // Browserbase iframe
          <iframe
            ref={iframeRef}
            src={browserViewUrl}
            className="w-full h-full border-0 rounded-lg"
            sandbox="allow-same-origin allow-scripts allow-popups allow-forms allow-downloads"
            allow="clipboard-read; clipboard-write; camera; microphone; geolocation"
            style={{ 
              pointerEvents: takeoverMode ? 'none' : 'auto',
              minHeight: '400px'
            }}
            onLoad={handleIframeLoad}
            onError={handleIframeError}
          />
        )}
        
        {/* Takeover Controls Overlay */}
        {status === 'paused' || takeoverMode ? (
          <div className="absolute top-4 right-4 z-20">
            <Button 
              size="sm"
              variant={takeoverMode ? "default" : "secondary"}
              onClick={handleTakeover}
            >
              {takeoverMode ? (
                <>
                  <Play className="w-4 h-4 mr-2" />
                  {t('monitor.liveView.resumeAgent', 'Resume Agent')}
                </>
              ) : (
                <>
                  <Hand className="w-4 h-4 mr-2" />
                  {t('monitor.liveView.takeControl', 'Take Control')}
                </>
              )}
            </Button>
          </div>
        ) : null}
        
        {/* Status Overlay */}
        <div className="absolute bottom-4 left-4 z-20">
          <Badge variant="secondary" className="flex items-center gap-2">
            <div className={`w-2 h-2 rounded-full ${getStatusColor()}`}></div>
            {getStatusText()}
            {taskId && (
              <span className="text-xs opacity-70">
                • {t('monitor.liveView.taskId', 'Task')}: {taskId.slice(0, 8)}...
              </span>
            )}
          </Badge>
        </div>
      </CardContent>
    </Card>
  )
}
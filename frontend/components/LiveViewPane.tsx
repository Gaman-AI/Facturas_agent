'use client'

import React, { useState, useRef, useEffect } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Badge } from '@/components/ui/badge'
import { Loader2, Monitor, RefreshCw, ExternalLink, Hand, Play, AlertCircle, Maximize2, Minimize2 } from 'lucide-react'
import { useLanguage } from '@/contexts/LanguageContext'

export interface LiveViewPaneProps {
  sessionId: string
  liveViewUrl?: string
  taskId?: string
  status?: 'pending' | 'running' | 'paused' | 'completed' | 'failed' | 'connecting'
  onTakeoverRequest?: () => void
  onRefresh?: () => void
  className?: string
}

export function LiveViewPane({
  sessionId,
  liveViewUrl,
  taskId,
  status = 'connecting',
  onTakeoverRequest,
  onRefresh,
  className = ''
}: LiveViewPaneProps) {
  const { t } = useLanguage()
  const iframeRef = useRef<HTMLIFrameElement>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [hasError, setHasError] = useState(false)
  const [isFullscreen, setIsFullscreen] = useState(false)
  const [takeoverMode, setTakeoverMode] = useState(false)

  // Generate live view URL if not provided
  const viewUrl = liveViewUrl || `https://www.browserbase.com/sessions/${sessionId}`

  useEffect(() => {
    setIsLoading(true)
    setHasError(false)
  }, [sessionId, liveViewUrl])

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

  const handleOpenExternal = () => {
    window.open(viewUrl, '_blank', 'noopener,noreferrer')
  }

  const toggleFullscreen = () => {
    setIsFullscreen(!isFullscreen)
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
              {t('monitor.liveView.error', 'Failed to load browser view. This might be due to network restrictions or session unavailability.')}
            </AlertDescription>
          </Alert>
          
          <div className="flex gap-2 mt-4">
            <Button onClick={handleRefresh} variant="outline">
              <RefreshCw className="w-4 h-4 mr-2" />
              {t('common.retry', 'Retry')}
            </Button>
            
            <Button onClick={handleOpenExternal} variant="outline">
              <ExternalLink className="w-4 h-4 mr-2" />
              {t('monitor.liveView.openExternal', 'Open in New Tab')}
            </Button>
          </div>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card className={`h-full flex flex-col ${isFullscreen ? 'fixed inset-0 z-50' : ''} ${className}`}>
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
        <CardDescription className="flex items-center justify-between">
          <span>
            {t('monitor.liveView.sessionId', 'Session')}: {sessionId}
          </span>
          <div className="flex items-center gap-1">
            <Button size="sm" variant="ghost" onClick={toggleFullscreen}>
              {isFullscreen ? (
                <Minimize2 className="w-4 h-4" />
              ) : (
                <Maximize2 className="w-4 h-4" />
              )}
            </Button>
            <Button size="sm" variant="ghost" onClick={handleRefresh}>
              <RefreshCw className="w-4 h-4" />
            </Button>
            <Button size="sm" variant="ghost" onClick={handleOpenExternal}>
              <ExternalLink className="w-4 h-4" />
            </Button>
          </div>
        </CardDescription>
      </CardHeader>
      
      <CardContent className="flex-1 p-4 relative">
        {isLoading && (
          <div className="absolute inset-0 flex items-center justify-center bg-slate-50 rounded-lg">
            <div className="text-center">
              <Loader2 className="w-8 h-8 animate-spin mx-auto mb-4 text-primary" />
              <p className="text-slate-600">
                {t('monitor.liveView.loading', 'Loading browser view...')}
              </p>
            </div>
          </div>
        )}
        
        <iframe
          ref={iframeRef}
          src={viewUrl}
          className="w-full h-full border-0 rounded-lg"
          sandbox="allow-same-origin allow-scripts allow-popups allow-forms"
          allow="clipboard-read; clipboard-write; camera; microphone"
          style={{ 
            pointerEvents: takeoverMode ? 'auto' : 'none',
            minHeight: '400px'
          }}
          onLoad={handleIframeLoad}
          onError={handleIframeError}
          title={t('monitor.liveView.iframeTitle', 'Browser automation view')}
        />
        
        {/* Takeover Controls Overlay */}
        {status === 'paused' || takeoverMode ? (
          <div className="absolute top-4 right-4 z-10">
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
        {!isLoading && (
          <div className="absolute bottom-4 left-4">
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
        )}
      </CardContent>
    </Card>
  )
}
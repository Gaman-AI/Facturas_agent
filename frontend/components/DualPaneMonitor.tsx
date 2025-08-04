'use client'

import React, { useState, useEffect } from 'react'
import { ResizablePanelGroup, ResizablePanel, ResizableHandle } from '@/components/ui/resizable'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Monitor, Activity, Smartphone, BarChart3 } from 'lucide-react'
import { useLanguage } from '@/contexts/LanguageContext'
import { websocketService } from '@/services/websocket'
import ApiService from '@/services/api'
import { LiveViewPane } from './LiveViewPane'
import { StatusSidebar, LogEntry, SessionControls } from './StatusSidebar'
import { TaskAnalytics } from './TaskAnalytics'
import { VirtualLogList } from './VirtualLogList'

export interface DualPaneMonitorProps {
  taskId: string
  sessionId?: string
  liveViewUrl?: string
  initialStatus?: 'pending' | 'running' | 'paused' | 'completed' | 'failed' | 'connecting'
  className?: string
}

export function DualPaneMonitor({
  taskId,
  sessionId,
  liveViewUrl,
  initialStatus = 'connecting',
  className = ''
}: DualPaneMonitorProps) {
  const { t } = useLanguage()
  const [status, setStatus] = useState(initialStatus)
  const [progress, setProgress] = useState(0)
  const [logs, setLogs] = useState<LogEntry[]>([])
  const [isConnected, setIsConnected] = useState(false)
  const [currentSessionId, setCurrentSessionId] = useState(sessionId)
  const [taskStartTime, setTaskStartTime] = useState<string>()
  const [isMobile, setIsMobile] = useState(false)
  const [rightPaneView, setRightPaneView] = useState<'status' | 'analytics'>('status')

  // Check if mobile on mount and resize
  useEffect(() => {
    const checkMobile = () => {
      setIsMobile(window.innerWidth < 1024) // lg breakpoint
    }
    
    checkMobile()
    window.addEventListener('resize', checkMobile)
    return () => window.removeEventListener('resize', checkMobile)
  }, [])

  // Periodic log fetching for real-time updates
  useEffect(() => {
    const fetchLogs = async () => {
      try {
        // Skip if taskId is invalid
        if (!taskId || taskId === 'undefined') {
          console.debug('Skipping log fetch - invalid taskId:', taskId)
          return
        }

        const logsResponse = await ApiService.getTaskLogs(taskId, { limit: 50 })
        if (logsResponse.success) {
          const apiLogs = logsResponse.data.logs.map(log => ({
            timestamp: log.timestamp,
            message: log.message,
            type: log.level as LogEntry['type'],
            details: log.details
          }))
          
          // Only update if we have new logs (avoid infinite re-renders)
          setLogs(prev => {
            const lastApiLogTime = apiLogs[apiLogs.length - 1]?.timestamp
            const lastLocalLogTime = prev[prev.length - 1]?.timestamp
            
            if (lastApiLogTime && lastApiLogTime !== lastLocalLogTime) {
              return apiLogs
            }
            return prev
          })
        }
      } catch (error) {
        // Silently handle log fetch errors to avoid spam
        console.debug('Failed to fetch logs:', error)
      }
    }

    // Fetch logs immediately, then every 5 seconds
    fetchLogs()
    const logInterval = setInterval(fetchLogs, 5000)

    return () => clearInterval(logInterval)
  }, [taskId])

  // WebSocket connection management
  useEffect(() => {
    const handleConnectionStatus = (data: any) => {
      setIsConnected(data.connected)
      if (data.connected && data.sessionId) {
        setCurrentSessionId(data.sessionId)
        addLog('Connected to browser session', 'success')
      } else if (!data.connected) {
        addLog('Connection lost', 'error')
      }
    }

    const handleTaskStart = (data: any) => {
      setStatus('running')
      setTaskStartTime(new Date().toISOString())
      addLog(`Task started: ${data.task || data.message}`, 'info')
    }

    const handleTaskComplete = (data: any) => {
      setStatus('completed')
      setProgress(100)
      addLog('Task completed successfully!', 'success')
    }

    const handleTaskError = (data: any) => {
      setStatus('failed')
      addLog(`Task failed: ${data.error || data.message}`, 'error')
    }

    const handleLogUpdate = (data: any) => {
      // Handle different types of log updates
      if (data.data) {
        if (data.data.step_type === 'thinking') {
          addLog('Agent is thinking...', 'thinking', data.data.content)
        } else if (data.data.step_type === 'action') {
          addLog(`Performing action: ${data.data.content?.action || 'Unknown action'}`, 'action', data.data.content)
        } else if (data.data.step_type === 'observation') {
          addLog('Observing page state...', 'info', data.data.content)
        }
      } else {
        addLog(data.message || 'Agent activity detected', 'info')
      }
    }

    const handleStatusChange = (data: any) => {
      if (data.data?.status) {
        setStatus(data.data.status)
        addLog(`Status changed to: ${data.data.status}`, 'info')
      }
    }

    // Set up event listeners
    websocketService.on('connection_status', handleConnectionStatus)
    websocketService.on('task_start', handleTaskStart)
    websocketService.on('task_completed', handleTaskComplete)
    websocketService.on('task_error', handleTaskError)
    websocketService.on('log_update', handleLogUpdate)
    websocketService.on('step_update', handleLogUpdate)
    websocketService.on('status_change', handleStatusChange)

    // Connect to WebSocket if sessionId is provided and valid
    if (currentSessionId && currentSessionId !== 'unknown' && !currentSessionId.includes('undefined')) {
      console.log('🔌 Connecting to WebSocket for session:', currentSessionId)
      websocketService.connectBrowserAgent(currentSessionId)
    } else {
      console.log('⚠️ Skipping WebSocket connection - invalid sessionId:', currentSessionId)
    }

    // Cleanup
    return () => {
      websocketService.off('connection_status', handleConnectionStatus)
      websocketService.off('task_start', handleTaskStart)
      websocketService.off('task_completed', handleTaskComplete)
      websocketService.off('task_error', handleTaskError)
      websocketService.off('log_update', handleLogUpdate)
      websocketService.off('step_update', handleLogUpdate)
      websocketService.off('status_change', handleStatusChange)
    }
  }, [currentSessionId])

  const addLog = (message: string, type: LogEntry['type'], details?: any) => {
    const newLog: LogEntry = {
      timestamp: new Date().toISOString(),
      message,
      type,
      details
    }
    setLogs(prev => [...prev, newLog])
  }

  const sessionControls: SessionControls = {
    onPause: async () => {
      try {
        addLog('Pausing task...', 'info')
        const response = await ApiService.pauseTask(taskId)
        if (response.success) {
          setStatus('paused')
          addLog('Task paused successfully', 'warning')
        } else {
          addLog('Failed to pause task', 'error')
        }
      } catch (error) {
        addLog(`Error pausing task: ${error instanceof Error ? error.message : 'Unknown error'}`, 'error')
      }
    },
    onResume: async () => {
      try {
        addLog('Resuming task...', 'info')
        const response = await ApiService.resumeTask(taskId)
        if (response.success) {
          setStatus('running')
          addLog('Task resumed successfully', 'info')
        } else {
          addLog('Failed to resume task', 'error')
        }
      } catch (error) {
        addLog(`Error resuming task: ${error instanceof Error ? error.message : 'Unknown error'}`, 'error')
      }
    },
    onStop: async () => {
      try {
        addLog('Stopping task...', 'warning')
        const response = await ApiService.stopTask(taskId)
        if (response.success) {
          setStatus('failed')
          addLog('Task stopped by user', 'warning')
          websocketService.disconnect()
        } else {
          addLog('Failed to stop task', 'error')
        }
      } catch (error) {
        addLog(`Error stopping task: ${error instanceof Error ? error.message : 'Unknown error'}`, 'error')
      }
    },
    onRestart: async () => {
      try {
        setStatus('connecting')
        setProgress(0)
        setLogs([])
        setTaskStartTime(new Date().toISOString())
        addLog('Restarting task...', 'info')
        
        const response = await ApiService.restartTask(taskId)
        if (response.success) {
          addLog('Task restarted successfully', 'success')
          setStatus('running')
          // Reconnect WebSocket if needed
          if (currentSessionId) {
            websocketService.connectBrowserAgent(currentSessionId)
          }
        } else {
          addLog('Failed to restart task', 'error')
          setStatus('failed')
        }
      } catch (error) {
        addLog(`Error restarting task: ${error instanceof Error ? error.message : 'Unknown error'}`, 'error')
        setStatus('failed')
      }
    }
  }

  const handleTakeoverRequest = () => {
    addLog('User requested control of browser session', 'warning')
    // TODO: Implement takeover logic
  }

  const handleRefreshView = () => {
    addLog('Browser view refreshed', 'info')
  }

  // Simplified Dual Pane Layout (Chat + Browser View Only)
  return (
    <div className={`h-full ${className}`}>
      <ResizablePanelGroup direction="horizontal" className="h-full">
        {/* Left Pane - Chat View (40% default) */}
        <ResizablePanel defaultSize={40} minSize={30} maxSize={60}>
          <div className="h-full p-4">
            <LiveViewPane
              sessionId={currentSessionId || 'unknown'}
              liveViewUrl={liveViewUrl}
              taskId={taskId}
              status={status}
              onTakeoverRequest={handleTakeoverRequest}
              onRefresh={handleRefreshView}
              className="h-full"
              viewType="chat"
            />
          </div>
        </ResizablePanel>

        <ResizableHandle withHandle />

        {/* Right Pane - Browser View (60% default) */}
        <ResizablePanel defaultSize={60} minSize={40} maxSize={70}>
          <div className="h-full p-4">
            <LiveViewPane
              sessionId={currentSessionId || 'unknown'}
              liveViewUrl={liveViewUrl}
              taskId={taskId}
              status={status}
              onTakeoverRequest={handleTakeoverRequest}
              onRefresh={handleRefreshView}
              className="h-full"
              viewType="browser"
            />
          </div>
        </ResizablePanel>
      </ResizablePanelGroup>

      {/* Connection Status Indicator */}
      <div className="absolute top-4 right-4 z-10">
        <Card className="shadow-lg">
          <CardContent className="p-2">
            <div className="flex items-center gap-2 text-sm">
              <div className={`w-2 h-2 rounded-full ${isConnected ? 'bg-pink-500' : 'bg-red-500'}`}></div>
              <span className="text-slate-600">
                {isConnected ? t('common.connected', 'Connected') : t('common.disconnected', 'Disconnected')}
              </span>
              {taskId && (
                <Badge variant="outline" className="text-xs">
                  {taskId.slice(0, 8)}...
                </Badge>
              )}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
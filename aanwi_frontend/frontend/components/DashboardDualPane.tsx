'use client'

import React, { useState, useEffect } from 'react'
import { ResizablePanelGroup, ResizablePanel, ResizableHandle } from '@/components/ui/resizable'
import { Button, buttonVariants } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge, badgeVariants } from '@/components/ui/badge'
import { Zap, Monitor, Activity } from 'lucide-react'
import { useLanguage } from '@/contexts/LanguageContext'
import { cn } from '@/lib/utils'
import { websocketService } from '@/services/websocket'
import ApiService from '@/services/api'
import { LiveViewPane } from './LiveViewPane'
import { TicketDetailsPane } from './TicketDetailsPane'

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
  // Normalize various backend/WS status strings to the local TaskState union
  const normalizeStatus = (value: unknown): TaskState['status'] => {
    if (typeof value !== 'string') return 'running'
    const v = value.toUpperCase()
    switch (v) {
      case 'IDLE':
        return 'idle'
      case 'PENDING':
        return 'pending'
      case 'RUNNING':
      case 'PROCESSING':
      case 'ACTIVE':
      case 'INITIALIZING':
        return v === 'INITIALIZING' ? 'connecting' : 'running'
      case 'PAUSED':
        return 'paused'
      case 'COMPLETED':
        return 'completed'
      case 'FAILED':
      case 'ERROR':
      case 'CANCELLED':
      case 'CANCELED':
        return 'failed'
      case 'CONNECTING':
        return 'connecting'
      default:
        return 'running'
    }
  }
  const [isMobile, setIsMobile] = useState(false)
  const [taskState, setTaskState] = useState<TaskState>({
    taskId: null,
    sessionId: null,
    liveViewUrl: null,
    status: 'idle'
  })

  // Check if mobile on mount and resize
  useEffect(() => {
    const checkMobile = () => {
      setIsMobile(window.innerWidth < 1024) // lg breakpoint
    }
    
    checkMobile()
    window.addEventListener('resize', checkMobile)
    return () => window.removeEventListener('resize', checkMobile)
  }, [])

  // WebSocket connection for real-time updates
  useEffect(() => {
    if (taskState.taskId && taskState.status !== 'idle') {
      const handleTaskUpdate = (data: any) => {
        if (data.taskId === taskState.taskId) {
          setTaskState(prev => ({
            ...prev,
            status: normalizeStatus(data.status),
            sessionId: data.sessionId || prev.sessionId,
            liveViewUrl: data.liveViewUrl || prev.liveViewUrl
          }))
        }
      }

      websocketService.on('taskUpdate', handleTaskUpdate)
      return () => {
        websocketService.off('taskUpdate', handleTaskUpdate)
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

      // Fetch task details to get session info with retries
      const fetchTaskDetails = async (attempt = 1) => {
        try {
          console.log(`Fetching task details for ${taskId}, attempt ${attempt}`)
          const taskDetails = await ApiService.getBrowserUseTask(taskId)
          console.log('Task details received:', taskDetails)
          
          // Extract session information from the response
          const sessionId = taskDetails.data.session_id || 
                           taskDetails.data.browser_session_id ||
                           `session_${taskId}`
                           
          const liveViewUrl = taskDetails.data.live_view_url || 
                             `https://www.browserbase.com/sessions/${sessionId}`
          
          const status = normalizeStatus(taskDetails.data.status)
          
          console.log('Extracted session info:', { sessionId, liveViewUrl, status })
          
          setTaskState(prev => ({
            ...prev,
            sessionId,
            liveViewUrl,
            status
          }))
        } catch (error) {
          console.error(`Error fetching task details (attempt ${attempt}):`, error)
          
          // Retry up to 3 times with increasing delays
          if (attempt < 3) {
            setTimeout(() => fetchTaskDetails(attempt + 1), attempt * 2000)
          } else {
            setTaskState(prev => ({ ...prev, status: 'failed' }))
          }
        }
      }
      
      // Start fetching after a short delay to allow task to initialize
      setTimeout(() => fetchTaskDetails(), 2000)

      // Callback for parent component
      if (onTaskSubmit) {
        onTaskSubmit(taskId)
      }
    } catch (error) {
      console.error('Error handling task creation:', error)
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
  }

  // Mobile layout - stacked vertically
  if (isMobile) {
    return (
      <div className={`h-full min-h-[800px] w-full ${className}`}>
        <div className="flex flex-col h-full gap-6">
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

          {/* Browser View Section - Only show when task is active */}
          {taskState.status !== 'idle' && (
            <Card className="flex-1 min-h-[500px] border-2 border-slate-200/60 shadow-lg bg-white/90 backdrop-blur-sm rounded-xl overflow-hidden">
              <CardHeader className="pb-3 bg-gradient-to-r from-pink-50 to-rose-50 border-b border-slate-200/40">
                <CardTitle className="flex items-center space-x-2 text-lg">
                  <div className="w-7 h-7 bg-gradient-to-r from-pink-500 to-rose-500 rounded-lg flex items-center justify-center">
                    <Monitor className="w-4 h-4 text-white" />
                  </div>
                  <span>Browser View</span>
                </CardTitle>
              </CardHeader>
              <CardContent className="p-4 h-full">
                <LiveViewPane
                  sessionId={taskState.sessionId || 'unknown'}
                  liveViewUrl={taskState.liveViewUrl || undefined}
                  taskId={taskState.taskId || undefined}
                  status={taskState.status}
                  onTakeoverRequest={handleTakeoverRequest}
                  onRefresh={handleRefreshView}
                  className="h-full"
                  viewType="browser"
                />
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
                <Badge className={cn(badgeVariants({ variant: 'outline' }), 'flex items-center gap-1 border-pink-300 text-pink-700 bg-pink-50')}>
                  <Monitor className="w-3 h-3" />
                  Task: {taskState.taskId?.slice(0, 8)}...
                </Badge>
                <Button 
                  className={cn(buttonVariants({ variant: 'outline', size: 'sm' }), 'border-pink-300 text-pink-700 hover:bg-pink-50')} 
                  onClick={resetTaskState}
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
            {/* Left Pane - Ticket Details (35% default) */}
            <ResizablePanel defaultSize={35} minSize={25} maxSize={50}>
              <div className="h-full p-4 border-r-2 border-slate-200/40 bg-gradient-to-b from-white to-slate-50/30 min-h-0">
                <div className="h-full bg-white rounded-lg border border-slate-200/50 shadow-sm overflow-hidden">
                  <TicketDetailsPane
                    taskId={taskState.taskId || undefined}
                    status={taskState.status}
                    onReset={resetTaskState}
                    className="h-full"
                  />
                </div>
              </div>
            </ResizablePanel>

            <ResizableHandle withHandle className="w-2 bg-gradient-to-b from-pink-100 to-rose-100 hover:bg-gradient-to-b hover:from-pink-200 hover:to-rose-200 transition-all duration-200" />

            {/* Right Pane - Browser View (65% default) */}
            <ResizablePanel defaultSize={65} minSize={50} maxSize={75}>
              <div className="h-full p-4 bg-gradient-to-b from-white to-slate-50/30 min-h-0">
                <div className="h-full bg-white rounded-lg border border-slate-200/50 shadow-sm overflow-hidden">
                  <LiveViewPane
                    sessionId={taskState.sessionId || 'unknown'}
                    liveViewUrl={taskState.liveViewUrl || undefined}
                    taskId={taskState.taskId || undefined}
                    status={taskState.status}
                    onTakeoverRequest={handleTakeoverRequest}
                    onRefresh={handleRefreshView}
                    className="h-full"
                    viewType="browser"
                  />
                </div>
              </div>
            </ResizablePanel>
          </ResizablePanelGroup>
        </CardContent>
      </Card>
    </div>
  )
}

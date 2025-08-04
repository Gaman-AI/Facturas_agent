'use client'

import React, { useState, useEffect, useRef } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { ScrollArea } from '@/components/ui/scroll-area'
import { 
  Brain, 
  Eye, 
  Activity, 
  CheckCircle, 
  XCircle, 
  Clock,
  Monitor,
  Maximize2,
  Minimize2,
  Settings
} from 'lucide-react'
import { useAgentWebSocket } from '@/hooks/useAgentWebSocket'

interface ThinkingEntry {
  id: string
  timestamp: string
  type: 'thinking' | 'action' | 'observation' | 'goal' | 'memory' | 'evaluation'
  content: string
  metadata?: {
    step_number?: number
    action_type?: string
    success?: boolean
    memory_update?: string
    goal_status?: 'active' | 'completed' | 'failed'
  }
}

interface AgentThinkingMonitorProps {
  taskId?: string
  isConnected?: boolean
  onToggleFullscreen?: () => void
  isFullscreen?: boolean
}

export default function AgentThinkingMonitor({
  taskId,
  isConnected = false,
  onToggleFullscreen,
  isFullscreen = false
}: AgentThinkingMonitorProps) {
  const {
    isConnected: wsConnected,
    connectionStatus,
    thinkingEntries,
    agentStatus,
    subscribe,
    unsubscribe,
    clearEntries,
    error: wsError
  } = useAgentWebSocket()
  
  const [isMonitoring, setIsMonitoring] = useState(false)
  const [currentStep, setCurrentStep] = useState(0)
  const [currentGoal, setCurrentGoal] = useState<string>('')
  const [agentMemory, setAgentMemory] = useState<string[]>([])
  const scrollAreaRef = useRef<HTMLDivElement>(null)

  // Auto-scroll to bottom when new entries are added
  useEffect(() => {
    if (scrollAreaRef.current) {
      scrollAreaRef.current.scrollTop = scrollAreaRef.current.scrollHeight
    }
  }, [thinkingEntries])

  // WebSocket subscription management
  useEffect(() => {
    if (isMonitoring && taskId) {
      subscribe(taskId)
    } else {
      unsubscribe()
    }

    return () => {
      unsubscribe()
    }
  }, [isMonitoring, taskId, subscribe, unsubscribe])

  // Update local state based on WebSocket data
  useEffect(() => {
    if (thinkingEntries.length > 0) {
      const latestEntry = thinkingEntries[thinkingEntries.length - 1]
      
      // Update current step
      if (latestEntry.metadata?.step_number) {
        setCurrentStep(latestEntry.metadata.step_number)
      }
      
      // Update current goal
      if (latestEntry.type === 'goal') {
        setCurrentGoal(latestEntry.content)
      }
      
      // Update memory
      if (latestEntry.type === 'memory') {
        setAgentMemory(prev => [...prev, latestEntry.content])
      }
    }
  }, [thinkingEntries])

  const startMonitoring = () => {
    setIsMonitoring(true)
    clearEntries()
    setCurrentStep(0)
    setCurrentGoal('')
    setAgentMemory([])
  }

  const stopMonitoring = () => {
    setIsMonitoring(false)
    unsubscribe()
  }

  const getEntryIcon = (type: ThinkingEntry['type']) => {
    switch (type) {
      case 'thinking': return <Brain className="h-4 w-4 text-purple-500" />
      case 'action': return <Activity className="h-4 w-4 text-blue-500" />
      case 'observation': return <Eye className="h-4 w-4 text-green-500" />
      case 'goal': return <CheckCircle className="h-4 w-4 text-orange-500" />
      case 'memory': return <Clock className="h-4 w-4 text-indigo-500" />
      case 'evaluation': return <Settings className="h-4 w-4 text-gray-500" />
      default: return <Activity className="h-4 w-4 text-gray-400" />
    }
  }

  const getEntryBadgeColor = (type: ThinkingEntry['type']) => {
    switch (type) {
      case 'thinking': return 'bg-purple-100 text-purple-800'
      case 'action': return 'bg-blue-100 text-blue-800'
      case 'observation': return 'bg-green-100 text-green-800'
      case 'goal': return 'bg-orange-100 text-orange-800'
      case 'memory': return 'bg-indigo-100 text-indigo-800'
      case 'evaluation': return 'bg-gray-100 text-gray-800'
      default: return 'bg-gray-100 text-gray-800'
    }
  }

  return (
    <div className={`h-full flex flex-col ${isFullscreen ? 'fixed inset-0 z-50 bg-background' : ''}`}>
      <Card className="flex-1 flex flex-col h-full">
        <CardHeader className="flex-shrink-0 pb-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-2">
              <Monitor className="h-5 w-5" />
              <CardTitle>Agent Thinking Monitor</CardTitle>
              <Badge variant={wsConnected ? 'default' : 'secondary'}>
                {wsConnected ? '🟢 Connected' : 
                 connectionStatus === 'connecting' ? '🟡 Connecting' : 
                 connectionStatus === 'error' ? '🔴 Error' : '⚪ Offline'}
              </Badge>
              {wsError && (
                <Badge variant="destructive" className="text-xs">
                  Error: {wsError}
                </Badge>
              )}
            </div>
            <div className="flex items-center space-x-2">
              {onToggleFullscreen && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={onToggleFullscreen}
                >
                  {isFullscreen ? <Minimize2 className="h-4 w-4" /> : <Maximize2 className="h-4 w-4" />}
                </Button>
              )}
              {!isMonitoring ? (
                <Button onClick={startMonitoring} size="sm">
                  Start Monitoring
                </Button>
              ) : (
                <Button onClick={stopMonitoring} variant="outline" size="sm">
                  Stop Monitoring
                </Button>
              )}
            </div>
          </div>
          
          {/* Status Bar */}
          {(isMonitoring || agentStatus) && (
            <div className="flex items-center space-x-4 text-sm text-muted-foreground mt-2">
              <div className="flex items-center space-x-1">
                <Activity className="h-3 w-3" />
                <span>Step: {currentStep}</span>
              </div>
              {agentStatus && (
                <div className="flex items-center space-x-1">
                  <Badge variant="outline" className="text-xs">
                    {agentStatus.status.toUpperCase()}
                  </Badge>
                  {agentStatus.model && (
                    <span className="text-xs">Model: {agentStatus.model}</span>
                  )}
                </div>
              )}
              {currentGoal && (
                <div className="flex items-center space-x-1">
                  <CheckCircle className="h-3 w-3" />
                  <span className="truncate max-w-xs">Goal: {currentGoal}</span>
                </div>
              )}
              <div className="flex items-center space-x-1">
                <Clock className="h-3 w-3" />
                <span>Entries: {thinkingEntries.length}</span>
              </div>
            </div>
          )}
        </CardHeader>

        <CardContent className="flex-1 flex flex-col min-h-0">
          {!isMonitoring ? (
            <div className="flex-1 flex items-center justify-center text-center">
              <div className="space-y-4">
                <Brain className="h-16 w-16 text-muted-foreground mx-auto" />
                <div>
                  <h3 className="text-lg font-semibold">Agent Thinking Monitor</h3>
                  <p className="text-muted-foreground">
                    Start monitoring to see real-time agent thinking process
                  </p>
                </div>
              </div>
            </div>
          ) : (
            <ScrollArea className="flex-1" ref={scrollAreaRef}>
              <div className="space-y-3">
                {thinkingEntries.map((entry) => (
                  <div key={entry.id} className="flex items-start space-x-3 p-3 rounded-lg border">
                    <div className="flex-shrink-0 mt-0.5">
                      {getEntryIcon(entry.type)}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center space-x-2 mb-2">
                        <Badge variant="secondary" className={getEntryBadgeColor(entry.type)}>
                          {entry.type.toUpperCase()}
                        </Badge>
                        {entry.metadata?.step_number && (
                          <Badge variant="outline">
                            Step {entry.metadata.step_number}
                          </Badge>
                        )}
                        <span className="text-xs text-muted-foreground">
                          {new Date(entry.timestamp).toLocaleTimeString()}
                        </span>
                      </div>
                      <p className="text-sm leading-relaxed">
                        {entry.content}
                      </p>
                      {entry.metadata?.action_type && (
                        <div className="mt-2">
                          <Badge variant="outline" className="text-xs">
                            Action: {entry.metadata.action_type}
                          </Badge>
                        </div>
                      )}
                    </div>
                  </div>
                ))}
                
                {thinkingEntries.length === 0 && isMonitoring && (
                  <div className="text-center py-8 text-muted-foreground">
                    <Brain className="h-8 w-8 mx-auto mb-2 animate-pulse" />
                    <p>Waiting for agent thinking data...</p>
                  </div>
                )}
              </div>
            </ScrollArea>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
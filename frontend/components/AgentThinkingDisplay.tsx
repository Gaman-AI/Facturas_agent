'use client'

import { useState, useEffect, useRef } from 'react'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Brain, Clock, AlertCircle, CheckCircle, Loader2 } from 'lucide-react'
import { formatDistanceToNow } from 'date-fns'

interface ThinkingStep {
  id: number
  step_number: number
  thinking: string
  action: string
  status: string
  timestamp: string
  memory?: string
  next_goal?: string
  evaluation?: string
  browser_state?: {
    url?: string
    title?: string
    screenshot_available?: boolean
  }
  planned_actions?: Array<{
    index: number
    action_type: string
    action_data: any
  }>
  error?: string
  result?: any
}

interface AgentThinkingDisplayProps {
  taskId: string
  initialSteps?: ThinkingStep[]
  autoRefresh?: boolean
  refreshInterval?: number
}

export function AgentThinkingDisplay({ 
  taskId, 
  initialSteps = [], 
  autoRefresh = true,
  refreshInterval = 2000 
}: AgentThinkingDisplayProps) {
  const [thinkingSteps, setThinkingSteps] = useState<ThinkingStep[]>(initialSteps)
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const scrollRef = useRef<HTMLDivElement>(null)
  const lastStepCountRef = useRef(initialSteps.length)
  const mountedRef = useRef(true)

  // Auto-scroll to bottom when new steps are added
  const scrollToBottom = () => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight
    }
  }

  // Fetch thinking steps from API
  const fetchThinkingSteps = async () => {
    try {
      setIsLoading(true)
      setError(null)
      
      const response = await fetch(`/api/v1/tasks/browser-use/${taskId}/thinking`)
      if (!response.ok) {
        throw new Error(`Failed to fetch thinking steps: ${response.statusText}`)
      }
      
      const data = await response.json()
      if (data.success) {
        const newSteps = data.data.thinking_steps || []
        
        // Only update state if component is still mounted
        if (mountedRef.current) {
          setThinkingSteps(newSteps)
          
          // Auto-scroll if new steps were added
          if (newSteps.length > lastStepCountRef.current) {
            setTimeout(scrollToBottom, 100)
            lastStepCountRef.current = newSteps.length
          }
        }
      } else {
        throw new Error(data.error?.message || 'Failed to fetch thinking steps')
      }
    } catch (err) {
      console.error('Error fetching thinking steps:', err)
      setError(err instanceof Error ? err.message : 'Unknown error')
    } finally {
      setIsLoading(false)
    }
  }

  // Auto-refresh effect
  useEffect(() => {
    if (!autoRefresh) return

    const interval = setInterval(fetchThinkingSteps, refreshInterval)
    
    // Initial fetch if no initial steps
    if (initialSteps.length === 0) {
      fetchThinkingSteps()
    }

    return () => clearInterval(interval)
  }, [taskId, autoRefresh, refreshInterval])

  // Cleanup effect
  useEffect(() => {
    return () => {
      mountedRef.current = false
    }
  }, [])

  // Get status icon and color
  const getStatusDisplay = (status: string) => {
    switch (status.toLowerCase()) {
      case 'completed':
      case 'success':
        return { icon: CheckCircle, color: 'text-green-600', bg: 'bg-green-50' }
      case 'error':
      case 'failed':
        return { icon: AlertCircle, color: 'text-red-600', bg: 'bg-red-50' }
      case 'processing':
      case 'running':
      case 'started':
        return { icon: Loader2, color: 'text-blue-600', bg: 'bg-blue-50' }
      default:
        return { icon: Brain, color: 'text-gray-600', bg: 'bg-gray-50' }
    }
  }

  // Get action badge variant
  const getActionVariant = (action: string) => {
    switch (action.toLowerCase()) {
      case 'initialization':
      case 'start':
        return 'secondary'
      case 'completion':
      case 'success':
        return 'default'
      case 'error':
        return 'destructive'
      case 'agent_step':
        return 'outline'
      default:
        return 'secondary'
    }
  }

  if (error && thinkingSteps.length === 0) {
    return (
      <Card className="h-full">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <AlertCircle className="h-5 w-5 text-red-500" />
            Agent Thinking - Error
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-red-600">Error loading thinking steps: {error}</p>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card className="h-full flex flex-col">
      <CardHeader className="flex-shrink-0">
        <CardTitle className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Brain className="h-5 w-5" />
            Agent Thinking
            {isLoading && <Loader2 className="h-4 w-4 animate-spin" />}
          </div>
          <Badge variant="outline">
            {thinkingSteps.length} steps
          </Badge>
        </CardTitle>
      </CardHeader>
      
      <CardContent className="flex-1 p-0">
        <ScrollArea className="h-full px-6 pb-6" ref={scrollRef}>
          <div className="min-h-32">
            {thinkingSteps.length === 0 ? (
              <div className="flex items-center justify-center h-32 text-gray-500">
                {isLoading ? (
                  <div className="flex items-center gap-2">
                    <Loader2 className="h-4 w-4 animate-spin" />
                    Loading thinking steps...
                  </div>
                ) : (
                  'No thinking steps available yet'
                )}
              </div>
            ) : (
            <div className="space-y-4">
              {thinkingSteps.map((step) => {
                const statusDisplay = getStatusDisplay(step.status)
                const StatusIcon = statusDisplay.icon
                
                return (
                  <div key={step.id} className="border-l-2 border-gray-200 pl-4 pb-4 last:pb-0">
                    <div className="flex items-start gap-3">
                      <div className={`p-1.5 rounded-full ${statusDisplay.bg}`}>
                        <StatusIcon className={`h-4 w-4 ${statusDisplay.color} ${step.status === 'processing' || step.status === 'running' ? 'animate-spin' : ''}`} />
                      </div>
                      
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-2">
                          <Badge variant={getActionVariant(step.action)}>
                            {step.action}
                          </Badge>
                          <div className="flex items-center gap-1 text-xs text-gray-500">
                            <Clock className="h-3 w-3" />
                            {formatDistanceToNow(new Date(step.timestamp), { addSuffix: true })}
                          </div>
                        </div>
                        
                        <div className="prose prose-sm max-w-none">
                          <p className="text-gray-700 whitespace-pre-wrap">
                            {step.thinking}
                          </p>
                        </div>
                        
                        {step.memory && (
                          <div className="mt-2 p-2 bg-purple-50 rounded text-sm">
                            <strong className="text-purple-700">Memory:</strong> {step.memory}
                          </div>
                        )}
                        
                        {step.next_goal && (
                          <div className="mt-2 p-2 bg-blue-50 rounded text-sm">
                            <strong className="text-blue-700">Next Goal:</strong> {step.next_goal}
                          </div>
                        )}
                        
                        {step.evaluation && (
                          <div className="mt-2 p-2 bg-yellow-50 rounded text-sm">
                            <strong className="text-yellow-700">Evaluation:</strong> {step.evaluation}
                          </div>
                        )}
                        
                        {step.browser_state && (
                          <div className="mt-2 p-2 bg-green-50 rounded text-sm">
                            <strong className="text-green-700">Browser:</strong>
                            {step.browser_state.title && (
                              <span className="ml-1">{step.browser_state.title}</span>
                            )}
                            {step.browser_state.url && (
                              <div className="text-xs text-green-600 truncate mt-1">
                                {step.browser_state.url}
                              </div>
                            )}
                          </div>
                        )}
                        
                        {step.planned_actions && step.planned_actions.length > 0 && (
                          <div className="mt-2 p-2 bg-orange-50 rounded text-sm">
                            <strong className="text-orange-700">Planned Actions:</strong>
                            <ul className="mt-1 text-xs space-y-1">
                              {step.planned_actions.map((action) => (
                                <li key={`planned-action-${step.id}-${action.index}`} className="flex items-center gap-2">
                                  <Badge variant="outline" className="text-xs">
                                    {action.action_type}
                                  </Badge>
                                  <span className="text-gray-600">
                                    {JSON.stringify(action.action_data).substring(0, 100)}
                                    {JSON.stringify(action.action_data).length > 100 && '...'}
                                  </span>
                                </li>
                              ))}
                            </ul>
                          </div>
                        )}
                        
                        {step.error && (
                          <div className="mt-2 p-2 bg-red-50 rounded text-sm">
                            <strong className="text-red-700">Error:</strong> {step.error}
                          </div>
                        )}
                        
                        {step.result && (
                          <div className="mt-2 p-2 bg-green-50 rounded text-sm">
                            <strong className="text-green-700">Result:</strong>
                            <pre className="text-xs mt-1 whitespace-pre-wrap">
                              {typeof step.result === 'string' ? step.result : JSON.stringify(step.result, null, 2)}
                            </pre>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                )
              })}
            </div>
          )}
          </div>
        </ScrollArea>
      </CardContent>
    </Card>
  )
}
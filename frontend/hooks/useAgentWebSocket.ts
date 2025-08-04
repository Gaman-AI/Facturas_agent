'use client'

import { useEffect, useRef, useState } from 'react'

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

interface AgentStatus {
  status: 'starting' | 'running' | 'completed' | 'failed' | 'timeout'
  task_description?: string
  model?: string
  max_steps?: number
  started_at?: string
  completed_at?: string
  execution_time?: number
  current_step?: number
}

interface UseAgentWebSocketReturn {
  isConnected: boolean
  connectionStatus: 'connecting' | 'connected' | 'disconnected' | 'error'
  thinkingEntries: ThinkingEntry[]
  agentStatus: AgentStatus | null
  subscribe: (taskId: string) => void
  unsubscribe: () => void
  clearEntries: () => void
  error: string | null
}

export function useAgentWebSocket(): UseAgentWebSocketReturn {
  const wsRef = useRef<WebSocket | null>(null)
  const [isConnected, setIsConnected] = useState(false)
  const [connectionStatus, setConnectionStatus] = useState<'connecting' | 'connected' | 'disconnected' | 'error'>('disconnected')
  const [thinkingEntries, setThinkingEntries] = useState<ThinkingEntry[]>([])
  const [agentStatus, setAgentStatus] = useState<AgentStatus | null>(null)
  const [currentTaskId, setCurrentTaskId] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const reconnectTimeoutRef = useRef<NodeJS.Timeout | null>(null)
  const reconnectAttempts = useRef(0)
  const maxReconnectAttempts = 5

  const connect = () => {
    if (wsRef.current?.readyState === WebSocket.OPEN) {
      return
    }

    setConnectionStatus('connecting')
    setError(null)

    try {
      // Use the same host as the current page, but with WebSocket protocol
      const wsProtocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:'
      const wsHost = window.location.hostname
      const wsPort = process.env.NODE_ENV === 'development' ? '8000' : window.location.port
      const wsUrl = `${wsProtocol}//${wsHost}:${wsPort}/ws/agent-thinking`

      console.log('🔌 Connecting to WebSocket:', wsUrl)
      
      wsRef.current = new WebSocket(wsUrl)

      wsRef.current.onopen = () => {
        console.log('🔌 WebSocket connected successfully')
        setIsConnected(true)
        setConnectionStatus('connected')
        setError(null)
        reconnectAttempts.current = 0

        // Re-subscribe to current task if any
        if (currentTaskId) {
          subscribe(currentTaskId)
        }
      }

      wsRef.current.onmessage = (event) => {
        try {
          const message = JSON.parse(event.data)
          handleWebSocketMessage(message)
        } catch (error) {
          console.error('❌ Failed to parse WebSocket message:', error)
          setError('Failed to parse message from server')
        }
      }

      wsRef.current.onclose = (event) => {
        console.log('🔌 WebSocket connection closed:', event.code, event.reason)
        setIsConnected(false)
        setConnectionStatus('disconnected')
        wsRef.current = null

        // Attempt to reconnect if not a clean close
        if (event.code !== 1000 && reconnectAttempts.current < maxReconnectAttempts) {
          reconnectAttempts.current++
          const delay = Math.min(1000 * Math.pow(2, reconnectAttempts.current), 30000)
          
          console.log(`🔄 Attempting to reconnect in ${delay}ms (attempt ${reconnectAttempts.current}/${maxReconnectAttempts})`)
          
          reconnectTimeoutRef.current = setTimeout(() => {
            connect()
          }, delay)
        } else if (reconnectAttempts.current >= maxReconnectAttempts) {
          setError('Maximum reconnection attempts reached')
          setConnectionStatus('error')
        }
      }

      wsRef.current.onerror = (error) => {
        console.error('❌ WebSocket error:', error)
        setError('WebSocket connection error')
        setConnectionStatus('error')
      }

    } catch (error) {
      console.error('❌ Failed to create WebSocket connection:', error)
      setError('Failed to create WebSocket connection')
      setConnectionStatus('error')
    }
  }

  const disconnect = () => {
    if (reconnectTimeoutRef.current) {
      clearTimeout(reconnectTimeoutRef.current)
      reconnectTimeoutRef.current = null
    }

    if (wsRef.current) {
      wsRef.current.close(1000, 'User disconnect')
      wsRef.current = null
    }

    setIsConnected(false)
    setConnectionStatus('disconnected')
    setCurrentTaskId(null)
  }

  const handleWebSocketMessage = (message: any) => {
    console.log('📨 WebSocket message received:', message.type)

    switch (message.type) {
      case 'connection':
        console.log('✅ WebSocket connection confirmed')
        break

      case 'subscribed':
        console.log('🔔 Subscribed to task:', message.task_id)
        break

      case 'unsubscribed':
        console.log('🔕 Unsubscribed from task:', message.task_id)
        break

      case 'agent_thinking':
      case 'agent_action':
      case 'agent_observation':
      case 'agent_goal':
      case 'agent_memory':
      case 'agent_evaluation':
        const thinkingEntry: ThinkingEntry = {
          id: `${message.data.type}_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
          timestamp: message.timestamp || new Date().toISOString(),
          type: message.data.type,
          content: message.data.content,
          metadata: message.data.metadata
        }
        
        setThinkingEntries(prev => [...prev, thinkingEntry])
        console.log(`💭 ${thinkingEntry.type.toUpperCase()}: ${thinkingEntry.content.substring(0, 100)}...`)
        break

      case 'agent_status':
        setAgentStatus(message.data)
        console.log('📊 Agent status updated:', message.data.status)
        break

      case 'agent_completed':
        console.log('✅ Agent task completed:', message.task_id)
        setAgentStatus(prev => prev ? { ...prev, status: 'completed' } : null)
        break

      case 'error':
        console.error('❌ WebSocket error message:', message.message)
        setError(message.message)
        break

      case 'pong':
        // Heartbeat response
        break

      default:
        console.warn('⚠️ Unknown WebSocket message type:', message.type)
    }
  }

  const subscribe = (taskId: string) => {
    if (!wsRef.current || wsRef.current.readyState !== WebSocket.OPEN) {
      console.warn('⚠️ WebSocket not connected, cannot subscribe')
      setCurrentTaskId(taskId) // Store for later subscription
      connect() // Try to connect
      return
    }

    setCurrentTaskId(taskId)
    
    const subscribeMessage = {
      type: 'subscribe',
      task_id: taskId
    }

    wsRef.current.send(JSON.stringify(subscribeMessage))
    console.log('🔔 Subscribing to task:', taskId)
  }

  const unsubscribe = () => {
    if (currentTaskId && wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
      const unsubscribeMessage = {
        type: 'unsubscribe',
        task_id: currentTaskId
      }

      wsRef.current.send(JSON.stringify(unsubscribeMessage))
      console.log('🔕 Unsubscribing from task:', currentTaskId)
    }

    setCurrentTaskId(null)
  }

  const clearEntries = () => {
    setThinkingEntries([])
    setAgentStatus(null)
    setError(null)
  }

  // Auto-connect on mount
  useEffect(() => {
    connect()

    // Heartbeat to keep connection alive
    const heartbeatInterval = setInterval(() => {
      if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
        wsRef.current.send(JSON.stringify({ type: 'ping' }))
      }
    }, 30000) // Every 30 seconds

    return () => {
      clearInterval(heartbeatInterval)
      disconnect()
    }
  }, [])

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      disconnect()
    }
  }, [])

  return {
    isConnected,
    connectionStatus,
    thinkingEntries,
    agentStatus,
    subscribe,
    unsubscribe,
    clearEntries,
    error
  }
}
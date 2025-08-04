import { WebSocketServer } from 'ws'
import { createServer } from 'http'

/**
 * WebSocket Service for Real-time Agent Thinking Updates
 * Handles real-time communication between the agent and the frontend
 */
class WebSocketService {
  constructor() {
    this.wss = null
    this.clients = new Map() // Map of task_id -> Set of WebSocket connections
    this.activeAgents = new Map() // Map of task_id -> agent monitoring data
  }

  /**
   * Initialize WebSocket server
   * @param {http.Server} server - HTTP server instance
   */
  initialize(server) {
    this.wss = new WebSocketServer({ 
      server,
      path: '/ws/agent-thinking'
    })

    this.wss.on('connection', (ws, request) => {
      console.log('🔌 New WebSocket connection established')
      
      ws.on('message', (message) => {
        try {
          const data = JSON.parse(message.toString())
          this.handleClientMessage(ws, data)
        } catch (error) {
          console.error('❌ Invalid WebSocket message:', error)
          ws.send(JSON.stringify({
            type: 'error',
            message: 'Invalid message format'
          }))
        }
      })

      ws.on('close', () => {
        console.log('🔌 WebSocket connection closed')
        this.removeClient(ws)
      })

      ws.on('error', (error) => {
        console.error('❌ WebSocket error:', error)
        this.removeClient(ws)
      })

      // Send initial connection confirmation
      ws.send(JSON.stringify({
        type: 'connection',
        status: 'connected',
        timestamp: new Date().toISOString()
      }))
    })

    console.log('🔌 WebSocket server initialized on /ws/agent-thinking')
  }

  /**
   * Handle incoming client messages
   * @param {WebSocket} ws - WebSocket connection
   * @param {Object} data - Message data
   */
  handleClientMessage(ws, data) {
    switch (data.type) {
      case 'subscribe':
        this.subscribeToTask(ws, data.task_id)
        break
      
      case 'unsubscribe':
        this.unsubscribeFromTask(ws, data.task_id)
        break
      
      case 'ping':
        ws.send(JSON.stringify({ type: 'pong', timestamp: new Date().toISOString() }))
        break
      
      default:
        console.warn('⚠️ Unknown WebSocket message type:', data.type)
    }
  }

  /**
   * Subscribe client to task updates
   * @param {WebSocket} ws - WebSocket connection
   * @param {string} taskId - Task ID to subscribe to
   */
  subscribeToTask(ws, taskId) {
    if (!taskId) {
      ws.send(JSON.stringify({
        type: 'error',
        message: 'Task ID is required for subscription'
      }))
      return
    }

    if (!this.clients.has(taskId)) {
      this.clients.set(taskId, new Set())
    }

    this.clients.get(taskId).add(ws)
    ws.taskId = taskId

    ws.send(JSON.stringify({
      type: 'subscribed',
      task_id: taskId,
      timestamp: new Date().toISOString()
    }))

    console.log(`🔔 Client subscribed to task: ${taskId}`)

    // Send existing agent data if available
    if (this.activeAgents.has(taskId)) {
      const agentData = this.activeAgents.get(taskId)
      ws.send(JSON.stringify({
        type: 'agent_status',
        task_id: taskId,
        data: agentData,
        timestamp: new Date().toISOString()
      }))
    }
  }

  /**
   * Unsubscribe client from task updates
   * @param {WebSocket} ws - WebSocket connection
   * @param {string} taskId - Task ID to unsubscribe from
   */
  unsubscribeFromTask(ws, taskId) {
    if (this.clients.has(taskId)) {
      this.clients.get(taskId).delete(ws)
      
      if (this.clients.get(taskId).size === 0) {
        this.clients.delete(taskId)
      }
    }

    delete ws.taskId

    ws.send(JSON.stringify({
      type: 'unsubscribed',
      task_id: taskId,
      timestamp: new Date().toISOString()
    }))

    console.log(`🔕 Client unsubscribed from task: ${taskId}`)
  }

  /**
   * Remove client from all subscriptions
   * @param {WebSocket} ws - WebSocket connection
   */
  removeClient(ws) {
    if (ws.taskId) {
      this.unsubscribeFromTask(ws, ws.taskId)
    }

    // Remove from all task subscriptions
    for (const [taskId, clientSet] of this.clients.entries()) {
      clientSet.delete(ws)
      if (clientSet.size === 0) {
        this.clients.delete(taskId)
      }
    }
  }

  /**
   * Broadcast agent thinking update to subscribed clients
   * @param {string} taskId - Task ID
   * @param {Object} thinkingData - Agent thinking data
   */
  broadcastAgentThinking(taskId, thinkingData) {
    if (!this.clients.has(taskId)) {
      return // No subscribers
    }

    const message = JSON.stringify({
      type: 'agent_thinking',
      task_id: taskId,
      data: thinkingData,
      timestamp: new Date().toISOString()
    })

    const clients = this.clients.get(taskId)
    const disconnectedClients = new Set()

    for (const client of clients) {
      try {
        if (client.readyState === client.OPEN) {
          client.send(message)
        } else {
          disconnectedClients.add(client)
        }
      } catch (error) {
        console.error('❌ Error sending WebSocket message:', error)
        disconnectedClients.add(client)
      }
    }

    // Clean up disconnected clients
    for (const client of disconnectedClients) {
      clients.delete(client)
    }

    if (clients.size === 0) {
      this.clients.delete(taskId)
    }
  }

  /**
   * Broadcast agent action update
   * @param {string} taskId - Task ID
   * @param {Object} actionData - Agent action data
   */
  broadcastAgentAction(taskId, actionData) {
    if (!this.clients.has(taskId)) {
      return
    }

    const message = JSON.stringify({
      type: 'agent_action',
      task_id: taskId,
      data: actionData,
      timestamp: new Date().toISOString()
    })

    this.sendToTaskClients(taskId, message)
  }

  /**
   * Broadcast agent observation update
   * @param {string} taskId - Task ID
   * @param {Object} observationData - Agent observation data
   */
  broadcastAgentObservation(taskId, observationData) {
    if (!this.clients.has(taskId)) {
      return
    }

    const message = JSON.stringify({
      type: 'agent_observation',
      task_id: taskId,
      data: observationData,
      timestamp: new Date().toISOString()
    })

    this.sendToTaskClients(taskId, message)
  }

  /**
   * Broadcast agent goal update
   * @param {string} taskId - Task ID
   * @param {Object} goalData - Agent goal data
   */
  broadcastAgentGoal(taskId, goalData) {
    if (!this.clients.has(taskId)) {
      return
    }

    const message = JSON.stringify({
      type: 'agent_goal',
      task_id: taskId,
      data: goalData,
      timestamp: new Date().toISOString()
    })

    this.sendToTaskClients(taskId, message)
  }

  /**
   * Broadcast agent memory update
   * @param {string} taskId - Task ID
   * @param {Object} memoryData - Agent memory data
   */
  broadcastAgentMemory(taskId, memoryData) {
    if (!this.clients.has(taskId)) {
      return
    }

    const message = JSON.stringify({
      type: 'agent_memory',
      task_id: taskId,
      data: memoryData,
      timestamp: new Date().toISOString()
    })

    this.sendToTaskClients(taskId, message)
  }

  /**
   * Broadcast agent evaluation update
   * @param {string} taskId - Task ID
   * @param {Object} evaluationData - Agent evaluation data
   */
  broadcastAgentEvaluation(taskId, evaluationData) {
    if (!this.clients.has(taskId)) {
      return
    }

    const message = JSON.stringify({
      type: 'agent_evaluation',
      task_id: taskId,
      data: evaluationData,
      timestamp: new Date().toISOString()
    })

    this.sendToTaskClients(taskId, message)
  }

  /**
   * Send message to all clients subscribed to a task
   * @param {string} taskId - Task ID
   * @param {string} message - JSON message to send
   */
  sendToTaskClients(taskId, message) {
    if (!this.clients.has(taskId)) {
      return
    }

    const clients = this.clients.get(taskId)
    const disconnectedClients = new Set()

    for (const client of clients) {
      try {
        if (client.readyState === client.OPEN) {
          client.send(message)
        } else {
          disconnectedClients.add(client)
        }
      } catch (error) {
        console.error('❌ Error sending WebSocket message:', error)
        disconnectedClients.add(client)
      }
    }

    // Clean up disconnected clients
    for (const client of disconnectedClients) {
      clients.delete(client)
    }

    if (clients.size === 0) {
      this.clients.delete(taskId)
    }
  }

  /**
   * Update agent status for a task
   * @param {string} taskId - Task ID
   * @param {Object} agentData - Agent status data
   */
  updateAgentStatus(taskId, agentData) {
    this.activeAgents.set(taskId, {
      ...this.activeAgents.get(taskId),
      ...agentData,
      last_updated: new Date().toISOString()
    })

    // Broadcast to subscribers
    const message = JSON.stringify({
      type: 'agent_status',
      task_id: taskId,
      data: this.activeAgents.get(taskId),
      timestamp: new Date().toISOString()
    })

    this.sendToTaskClients(taskId, message)
  }

  /**
   * Remove agent status when task completes
   * @param {string} taskId - Task ID
   */
  removeAgentStatus(taskId) {
    this.activeAgents.delete(taskId)

    // Notify subscribers that agent is no longer active
    const message = JSON.stringify({
      type: 'agent_completed',
      task_id: taskId,
      timestamp: new Date().toISOString()
    })

    this.sendToTaskClients(taskId, message)
  }

  /**
   * Get current connection statistics
   * @returns {Object} Connection statistics
   */
  getStats() {
    return {
      total_connections: this.wss ? this.wss.clients.size : 0,
      active_tasks: this.clients.size,
      active_agents: this.activeAgents.size,
      tasks_with_subscribers: Array.from(this.clients.keys())
    }
  }
}

export default new WebSocketService()
/**
 * WebSocket Service for Browser Automation
 * 
 * This service handles real-time communication between the frontend and backend
 * for browser automation tasks, providing live updates on task progress, logs, and status changes.
 * 
 * @file purpose: Real-time communication for browser automation monitoring
 */

import { WebSocketServer } from 'ws'

class WebSocketService {
  constructor() {
    this.wss = null
    this.clients = new Map() // Map of sessionId -> WebSocket
    this.taskSubscriptions = new Map() // Map of taskId -> Set of WebSocket clients
  }

  /**
   * Initialize WebSocket server
   * @param {import('http').Server} server - HTTP server instance
   */
  initialize(server) {
    this.wss = new WebSocketServer({ 
      server,
      path: '/api/v1/browser-agent/ws'
    })

    console.log('🔌 WebSocket server initialized on /api/v1/browser-agent/ws')

    this.wss.on('connection', (ws, req) => {
      this.handleConnection(ws, req)
    })

    this.wss.on('error', (error) => {
      console.error('❌ WebSocket server error:', error)
    })
  }

  /**
   * Handle new WebSocket connection
   * @param {WebSocket} ws - WebSocket instance
   * @param {import('http').IncomingMessage} req - HTTP request
   */
  handleConnection(ws, req) {
    const url = new URL(req.url, `http://${req.headers.host}`)
    const sessionId = url.searchParams.get('sessionId') || 'unknown'
    
    console.log(`🔗 WebSocket connection established for session: ${sessionId}`)

    // Store client connection
    this.clients.set(sessionId, ws)

    // Send initial connection status
    this.sendToClient(ws, {
      type: 'connection_status',
      data: {
        connected: true,
        sessionId: sessionId,
        timestamp: new Date().toISOString()
      }
    })

    // Handle incoming messages
    ws.on('message', (data) => {
      try {
        const message = JSON.parse(data.toString())
        this.handleMessage(ws, sessionId, message)
      } catch (error) {
        console.error('❌ Failed to parse WebSocket message:', error)
        this.sendToClient(ws, {
          type: 'error',
          data: {
            message: 'Invalid message format',
            timestamp: new Date().toISOString()
          }
        })
      }
    })

    // Handle client disconnect
    ws.on('close', () => {
      console.log(`🔌 WebSocket connection closed for session: ${sessionId}`)
      this.clients.delete(sessionId)
      
      // Remove from task subscriptions
      for (const [taskId, clients] of this.taskSubscriptions.entries()) {
        clients.delete(ws)
        if (clients.size === 0) {
          this.taskSubscriptions.delete(taskId)
        }
      }
    })

    // Handle connection errors
    ws.on('error', (error) => {
      console.error(`❌ WebSocket error for session ${sessionId}:`, error)
      this.clients.delete(sessionId)
    })
  }

  /**
   * Handle incoming WebSocket messages
   * @param {WebSocket} ws - WebSocket instance
   * @param {string} sessionId - Session ID
   * @param {Object} message - Parsed message object
   */
  handleMessage(ws, sessionId, message) {
    console.log(`📨 WebSocket message from ${sessionId}:`, message.type)

    switch (message.type) {
      case 'subscribe_task':
        this.subscribeToTask(ws, message.data.taskId)
        break
      
      case 'unsubscribe_task':
        this.unsubscribeFromTask(ws, message.data.taskId)
        break
      
      case 'ping':
        this.sendToClient(ws, { type: 'pong', data: { timestamp: new Date().toISOString() } })
        break
      
      default:
        console.warn(`⚠️ Unknown WebSocket message type: ${message.type}`)
        this.sendToClient(ws, {
          type: 'error',
          data: {
            message: `Unknown message type: ${message.type}`,
            timestamp: new Date().toISOString()
          }
        })
    }
  }

  /**
   * Subscribe a client to task updates
   * @param {WebSocket} ws - WebSocket instance
   * @param {string} taskId - Task ID to subscribe to
   */
  subscribeToTask(ws, taskId) {
    if (!this.taskSubscriptions.has(taskId)) {
      this.taskSubscriptions.set(taskId, new Set())
    }
    
    this.taskSubscriptions.get(taskId).add(ws)
    console.log(`📋 Client subscribed to task: ${taskId}`)
    
    this.sendToClient(ws, {
      type: 'subscription_confirmed',
      data: {
        taskId: taskId,
        timestamp: new Date().toISOString()
      }
    })
  }

  /**
   * Unsubscribe a client from task updates
   * @param {WebSocket} ws - WebSocket instance
   * @param {string} taskId - Task ID to unsubscribe from
   */
  unsubscribeFromTask(ws, taskId) {
    const clients = this.taskSubscriptions.get(taskId)
    if (clients) {
      clients.delete(ws)
      if (clients.size === 0) {
        this.taskSubscriptions.delete(taskId)
      }
      console.log(`📋 Client unsubscribed from task: ${taskId}`)
    }
  }

  /**
   * Send message to specific client
   * @param {WebSocket} ws - WebSocket instance
   * @param {Object} message - Message to send
   */
  sendToClient(ws, message) {
    if (ws.readyState === ws.OPEN) {
      try {
        ws.send(JSON.stringify(message))
      } catch (error) {
        console.error('❌ Failed to send WebSocket message:', error)
      }
    }
  }

  /**
   * Broadcast message to all clients subscribed to a task
   * @param {string} taskId - Task ID
   * @param {Object} message - Message to broadcast
   */
  broadcastToTask(taskId, message) {
    const clients = this.taskSubscriptions.get(taskId)
    if (clients) {
      clients.forEach(ws => {
        this.sendToClient(ws, message)
      })
      console.log(`📡 Broadcasted to ${clients.size} clients for task: ${taskId}`)
    }
  }

  /**
   * Broadcast message to all connected clients
   * @param {Object} message - Message to broadcast
   */
  broadcastToAll(message) {
    this.clients.forEach((ws, sessionId) => {
      this.sendToClient(ws, message)
    })
    console.log(`📡 Broadcasted to ${this.clients.size} clients`)
  }

  /**
   * Send task status update
   * @param {string} taskId - Task ID
   * @param {string} status - New status
   * @param {Object} data - Additional data
   */
  sendTaskStatusUpdate(taskId, status, data = {}) {
    this.broadcastToTask(taskId, {
      type: 'status_change',
      data: {
        taskId: taskId,
        status: status,
        timestamp: new Date().toISOString(),
        ...data
      }
    })
  }

  /**
   * Send task log update
   * @param {string} taskId - Task ID
   * @param {Object} logEntry - Log entry
   */
  sendTaskLogUpdate(taskId, logEntry) {
    this.broadcastToTask(taskId, {
      type: 'log_update',
      data: {
        taskId: taskId,
        log: logEntry,
        timestamp: new Date().toISOString()
      }
    })
  }

  /**
   * Send task start notification
   * @param {string} taskId - Task ID
   * @param {Object} data - Task data
   */
  sendTaskStart(taskId, data = {}) {
    this.broadcastToTask(taskId, {
      type: 'task_start',
      data: {
        taskId: taskId,
        timestamp: new Date().toISOString(),
        ...data
      }
    })
  }

  /**
   * Send task completion notification
   * @param {string} taskId - Task ID
   * @param {Object} data - Task result data
   */
  sendTaskComplete(taskId, data = {}) {
    this.broadcastToTask(taskId, {
      type: 'task_completed',
      data: {
        taskId: taskId,
        timestamp: new Date().toISOString(),
        ...data
      }
    })
  }

  /**
   * Send task error notification
   * @param {string} taskId - Task ID
   * @param {string} error - Error message
   * @param {Object} data - Additional error data
   */
  sendTaskError(taskId, error, data = {}) {
    this.broadcastToTask(taskId, {
      type: 'task_error',
      data: {
        taskId: taskId,
        error: error,
        timestamp: new Date().toISOString(),
        ...data
      }
    })
  }

  /**
   * Get connection statistics
   * @returns {Object} Connection stats
   */
  getStats() {
    return {
      totalConnections: this.clients.size,
      activeSubscriptions: this.taskSubscriptions.size,
      subscribedTasks: Array.from(this.taskSubscriptions.keys()),
      connectedSessions: Array.from(this.clients.keys())
    }
  }

  /**
   * Close all connections and cleanup
   */
  close() {
    if (this.wss) {
      this.wss.close()
      this.clients.clear()
      this.taskSubscriptions.clear()
      console.log('🔌 WebSocket server closed')
    }
  }
}

// Export singleton instance
export default new WebSocketService() 
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
      path: '/ws/browser-automation'
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

    console.log('🔌 WebSocket server initialized on /ws/browser-automation')
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
   * Remove client from all subscriptions
   * @param {WebSocket} ws - WebSocket connection
   */
  removeClient(ws) {
    if (ws.taskId) {
      this.unsubscribeFromTask(ws, ws.taskId)
    }

    // Remove from all task subscriptions
    for (const [taskId, clientSet] of this.taskSubscriptions.entries()) {
      clientSet.delete(ws)
      if (clientSet.size === 0) {
        this.taskSubscriptions.delete(taskId)
      }
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

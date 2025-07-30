/**
 * Browser Agent Service
 * 
 * This service manages browser automation tasks using the local browser-use implementation.
 * It handles task creation, execution, status tracking, and result storage.
 * 
 * @file purpose: Defines browser-use task orchestration and management
 */

import { v4 as uuidv4 } from 'uuid'
import pythonBridge from './pythonBridge.js'

class BrowserAgentService {
  constructor() {
    // In-memory task storage (in production, this would be a database)
    this.tasks = new Map()
    this.runningTasks = new Set()
  }

  /**
   * Create a new browser automation task
   * 
   * @param {string} userId - User ID who created the task
   * @param {Object} taskData - Task configuration
   * @param {string} [taskData.prompt] - Direct task prompt
   * @param {string} [taskData.vendor_url] - Vendor URL for CFDI
   * @param {Object} [taskData.customer_details] - Customer information
   * @param {Object} [taskData.invoice_details] - Invoice information
   * @param {string} [taskData.model] - LLM model to use
   * @param {number} [taskData.temperature] - LLM temperature
   * @param {number} [taskData.max_steps] - Maximum agent steps
   * @param {number} [taskData.timeout_minutes] - Task timeout in minutes
   * @returns {Promise<Object>} Created task object
   */
  async createTask(userId, taskData) {
    const taskId = uuidv4()
    const now = new Date().toISOString()
    
    const task = {
      id: taskId,
      userId,
      status: 'pending',
      createdAt: now,
      updatedAt: now,
      
      // Task configuration
      prompt: taskData.prompt || null,
      vendorUrl: taskData.vendor_url || null,
      customerDetails: taskData.customer_details || null,
      invoiceDetails: taskData.invoice_details || null,
      
      // LLM settings
      model: taskData.model || 'gpt-4.1-mini',
      temperature: taskData.temperature || 1.0,
      maxSteps: taskData.max_steps || 50,
      
      // Execution tracking
      startedAt: null,
      completedAt: null,
      executionTimeMs: null,
      
      // Results
      result: null,
      error: null,
      errorType: null,
      
      // Metadata
      metadata: {
        userAgent: taskData.user_agent || null,
        ipAddress: taskData.ip_address || null,
        requestId: taskData.request_id || null
      }
    }
    
    // Store the task
    this.tasks.set(taskId, task)
    
    // Execute task asynchronously (fire and forget)
    this.executeTaskAsync(taskId).catch(error => {
      console.error(`❌ Async task execution failed for ${taskId}:`, error)
      this.updateTaskStatus(taskId, 'failed', { error: error.message })
    })
    
    return task
  }

  /**
   * Get a task by ID
   * 
   * @param {string} taskId - Task ID
   * @param {string} [userId] - User ID (for authorization)
   * @returns {Object|null} Task object or null if not found/unauthorized
   */
  getTask(taskId, userId = null) {
    const task = this.tasks.get(taskId)
    
    if (!task) {
      return null
    }
    
    // If userId provided, check authorization
    if (userId && task.userId !== userId) {
      return null
    }
    
    return task
  }

  /**
   * Get all tasks for a user
   * 
   * @param {string} userId - User ID
   * @param {Object} [options] - Query options
   * @param {number} [options.limit] - Maximum number of tasks to return
   * @param {number} [options.offset] - Number of tasks to skip
   * @param {string} [options.status] - Filter by status
   * @param {string} [options.sortBy] - Sort field (createdAt, updatedAt)
   * @param {string} [options.sortOrder] - Sort order (asc, desc)
   * @returns {Object} Tasks array and metadata
   */
  getUserTasks(userId, options = {}) {
    const {
      limit = 50,
      offset = 0,
      status = null,
      sortBy = 'createdAt',
      sortOrder = 'desc'
    } = options

    let userTasks = Array.from(this.tasks.values())
      .filter(task => task.userId === userId)

    // Filter by status if provided
    if (status) {
      userTasks = userTasks.filter(task => task.status === status)
    }

    // Sort tasks
    userTasks.sort((a, b) => {
      const aValue = a[sortBy]
      const bValue = b[sortBy]
      
      if (sortOrder === 'desc') {
        return bValue > aValue ? 1 : bValue < aValue ? -1 : 0
      } else {
        return aValue > bValue ? 1 : aValue < bValue ? -1 : 0
      }
    })

    // Apply pagination
    const totalCount = userTasks.length
    const paginatedTasks = userTasks.slice(offset, offset + limit)

    return {
      tasks: paginatedTasks,
      totalCount,
      hasMore: offset + limit < totalCount
    }
  }

  /**
   * Cancel a running task
   * 
   * @param {string} taskId - Task ID
   * @param {string} userId - User ID (for authorization)
   * @returns {boolean} True if task was cancelled, false otherwise
   */
  async cancelTask(taskId, userId) {
    const task = this.getTask(taskId, userId)
    
    if (!task) {
      return false
    }
    
    if (task.status !== 'running') {
      return false
    }
    
    // Update task status
    this.updateTaskStatus(taskId, 'cancelled', {
      error: 'Task cancelled by user'
    })
    
    // Remove from running tasks
    this.runningTasks.delete(taskId)
    
    return true
  }

  /**
   * Delete a task
   * 
   * @param {string} taskId - Task ID
   * @param {string} userId - User ID (for authorization)
   * @returns {boolean} True if task was deleted, false otherwise
   */
  deleteTask(taskId, userId) {
    const task = this.getTask(taskId, userId)
    
    if (!task) {
      return false
    }
    
    // Can't delete running tasks
    if (task.status === 'running') {
      return false
    }
    
    // Remove from storage
    this.tasks.delete(taskId)
    this.runningTasks.delete(taskId)
    
    return true
  }

  /**
   * Get service statistics
   * 
   * @param {string} [userId] - User ID to filter stats
   * @returns {Object} Service statistics
   */
  getStats(userId = null) {
    let tasks = Array.from(this.tasks.values())
    
    if (userId) {
      tasks = tasks.filter(task => task.userId === userId)
    }
    
    const stats = {
      totalTasks: tasks.length,
      runningTasks: this.runningTasks.size,
      statusCounts: {
        pending: 0,
        running: 0,
        completed: 0,
        failed: 0,
        cancelled: 0
      },
      averageExecutionTime: 0,
      successRate: 0
    }
    
    let totalExecutionTime = 0
    let completedTasks = 0
    let successfulTasks = 0
    
    tasks.forEach(task => {
      stats.statusCounts[task.status]++
      
      if (task.executionTimeMs) {
        totalExecutionTime += task.executionTimeMs
        completedTasks++
        
        if (task.status === 'completed') {
          successfulTasks++
        }
      }
    })
    
    if (completedTasks > 0) {
      stats.averageExecutionTime = Math.round(totalExecutionTime / completedTasks)
      stats.successRate = Math.round((successfulTasks / completedTasks) * 100)
    }
    
    return stats
  }

  /**
   * Execute a task asynchronously
   * 
   * @private
   * @param {string} taskId - Task ID to execute
   */
  async executeTaskAsync(taskId) {
    const task = this.tasks.get(taskId)
    
    if (!task) {
      throw new Error(`Task ${taskId} not found`)
    }
    
    try {
      // Mark task as running
      this.updateTaskStatus(taskId, 'running')
      this.runningTasks.add(taskId)
      
      const startTime = Date.now()
      
      // Prepare task data for Python bridge
      const pythonTaskData = {
        prompt: task.prompt,
        vendor_url: task.vendorUrl,
        customer_details: task.customerDetails,
        invoice_details: task.invoiceDetails,
        model: task.model,
        temperature: task.temperature,
        max_steps: task.maxSteps
      }
      
      // Execute task using Python bridge
      const result = await pythonBridge.executeBrowserTask(pythonTaskData)
      
      const executionTime = Date.now() - startTime
      
      // Update task with results
      if (result.success) {
        this.updateTaskStatus(taskId, 'completed', {
          result: result.result,
          executionTimeMs: executionTime,
          modelUsed: result.model_used,
          stepsTaken: result.steps_taken
        })
      } else {
        this.updateTaskStatus(taskId, 'failed', {
          error: result.error,
          errorType: result.error_type,
          executionTimeMs: executionTime
        })
      }
      
    } catch (error) {
      console.error(`❌ Task execution error for ${taskId}:`, error)
      
      this.updateTaskStatus(taskId, 'failed', {
        error: error.message,
        errorType: error.constructor.name,
        executionTimeMs: Date.now() - (task.startedAt ? new Date(task.startedAt).getTime() : Date.now())
      })
    } finally {
      // Remove from running tasks
      this.runningTasks.delete(taskId)
    }
  }

  /**
   * Update task status and related fields
   * 
   * @private
   * @param {string} taskId - Task ID
   * @param {string} status - New status
   * @param {Object} [updates] - Additional fields to update
   */
  updateTaskStatus(taskId, status, updates = {}) {
    const task = this.tasks.get(taskId)
    
    if (!task) {
      return
    }
    
    const now = new Date().toISOString()
    
    // Update basic fields
    task.status = status
    task.updatedAt = now
    
    // Set started/completed timestamps
    if (status === 'running' && !task.startedAt) {
      task.startedAt = now
    }
    
    if (['completed', 'failed', 'cancelled'].includes(status) && !task.completedAt) {
      task.completedAt = now
    }
    
    // Apply additional updates
    Object.assign(task, updates)
    
    // Store updated task
    this.tasks.set(taskId, task)
  }

  /**
   * Health check for the browser agent service
   * 
   * @returns {Promise<Object>} Health status
   */
  async healthCheck() {
    try {
      const pythonHealth = await pythonBridge.healthCheck()
      
      return {
        status: pythonHealth.status === 'healthy' ? 'healthy' : 'unhealthy',
        service: 'browser-agent',
        totalTasks: this.tasks.size,
        runningTasks: this.runningTasks.size,
        pythonBridge: pythonHealth
      }
    } catch (error) {
      return {
        status: 'unhealthy',
        service: 'browser-agent',
        error: error.message,
        totalTasks: this.tasks.size,
        runningTasks: this.runningTasks.size
      }
    }
  }
}

export default new BrowserAgentService()
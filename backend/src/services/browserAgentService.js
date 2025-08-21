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
import websocketService from './websocketService.js'
import config from '../config/index.js'

class BrowserAgentService {
  constructor() {
    // In-memory task storage (in production, this would be a database)
    this.tasks = new Map()
    this.runningTasks = new Set()
  }

  /**
   * Generate a natural language task description from structured data
   * This eliminates the need to send duplicate data as text
   * 
   * @param {Object} taskData - Structured task data
   * @returns {string} Natural language task description
   */
  generateTaskDescription(taskData) {
    const userProfile = taskData.user_profile || {}
    const ocrData = taskData.ocr_ticket_data || {}
    
    let description = `Navigate to ${taskData.vendor_url} and process the invoice/receipt with the following details:\n\n`
    
    // Add COMPLETE user profile information - all available fields
    if (Object.keys(userProfile).length > 0) {
      description += `COMPLETE BUSINESS PROFILE:\n`
      if (userProfile.company_name) description += `- Company/Name: ${userProfile.company_name}\n`
      if (userProfile.rfc) description += `- RFC: ${userProfile.rfc}\n`
      if (userProfile.country) description += `- Country: ${userProfile.country}\n`
      if (userProfile.street) description += `- Street: ${userProfile.street}\n`
      if (userProfile.exterior_number) description += `- Exterior Number: ${userProfile.exterior_number}\n`
      if (userProfile.interior_number) description += `- Interior Number: ${userProfile.interior_number}\n`
      if (userProfile.colony) description += `- Colony/Neighborhood: ${userProfile.colony}\n`
      if (userProfile.municipality) description += `- Municipality: ${userProfile.municipality}\n`
      if (userProfile.zip_code) description += `- ZIP Code: ${userProfile.zip_code}\n`
      if (userProfile.state) description += `- State: ${userProfile.state}\n`
      if (userProfile.tax_regime) description += `- Tax Regime: ${userProfile.tax_regime}\n`
      if (userProfile.cfdi_use) description += `- CFDI Use: ${userProfile.cfdi_use}\n`
      if (userProfile.email) description += `- Email: ${userProfile.email}\n`
      if (userProfile.phone_number) description += `- Phone Number: ${userProfile.phone_number}\n`
      description += `\n`
    }
    
    // Add OCR ticket details
    if (Object.keys(ocrData).length > 0) {
      description += `Receipt Details:\n`
      if (ocrData.Comercio) description += `- Store: ${ocrData.Comercio}\n`
      if (ocrData.Fecha) description += `- Date: ${ocrData.Fecha}\n`
      if (ocrData.Total) description += `- Total: ${ocrData.Total}\n`
      if (ocrData['ID_Ticket']) description += `- Ticket ID: ${ocrData['ID_Ticket']}\n`
      if (ocrData['Mesa_Folio']) description += `- Mesa/Folio: ${ocrData['Mesa_Folio']}\n`
      if (ocrData['Payment_Type']) description += `- Payment: ${ocrData['Payment_Type']}\n`
      description += `\n`
    }
    
                      return description
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
   * @param {string} [taskData.browser_mode] - Browser mode ('browserbase' or 'local')
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
      prompt: this.generateTaskDescription(taskData), // Generate description from structured data
      vendorUrl: taskData.vendor_url || null,
      userProfile: taskData.user_profile || null,
      ocrTicketData: taskData.ocr_ticket_data || null,
      rawText: taskData.raw_text || null,
      
      // LLM settings
      model: taskData.model || 'gpt-4.1-mini',
      temperature: taskData.temperature || 1.0,
      maxSteps: taskData.max_steps || config.tasks.maxSteps || 100,
      
      // Browser configuration
      browserMode: taskData.browser_mode || 'browserbase',
      
      // Execution tracking
      startedAt: null,
      completedAt: null,
      executionTimeMs: null,
      
      // Results
      result: null,
      error: null,
      errorType: null,
      
      // Browser session information
      sessionId: null,
      liveViewUrl: null,
      browserSessionId: null,
      
      // Metadata
      metadata: {
        userAgent: taskData.user_agent || null,
        ipAddress: taskData.ip_address || null,
        requestId: taskData.request_id || null
      }
    }
    
    // Store the task
    this.tasks.set(taskId, task)
    
    // Send immediate task creation event via WebSocket
    websocketService.sendTaskStart(taskId, {
      task: task.prompt,
      vendorUrl: task.vendorUrl,
      browserMode: task.browserMode,
      model: task.model,
      timestamp: now
    })
    
    console.log(`🔗 WebSocket task start event sent for task ${taskId}`)
    
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
      console.error(`❌ Task not found: ${taskId}`)
      return
    }
    
    // Add to running tasks
    this.runningTasks.add(taskId)
    
    const startTime = Date.now()
    
    try {
      // Update status to running
      this.updateTaskStatus(taskId, 'running')
      
      // Send automation progress event
      websocketService.sendAutomationProgress(taskId, {
        step: 'initializing',
        message: 'Starting browser automation task',
        progress: 10,
        timestamp: new Date().toISOString()
      })
      
      // TWO-PHASE EXECUTION IMPLEMENTATION
      let sessionResult, automationResult
      
      if (task.browserMode === 'browserbase') {
        // PHASE 1: Create session immediately
        console.log(`🔄 PHASE 1: Creating Browserbase session for task ${taskId}`)
        
        const sessionTaskData = {
          execution_mode: 'create_session',
          vendor_url: task.vendorUrl,
          user_profile: task.userProfile,
          ocr_ticket_data: task.ocrTicketData,
          raw_text: task.rawText,
          model: task.model,
          temperature: task.temperature,
          max_steps: task.maxSteps,
          browser_mode: task.browserMode,
          request_id: taskId
        }
        
        // Send progress event for session creation
        websocketService.sendAutomationProgress(taskId, {
          step: 'creating_session',
          message: 'Creating browser session',
          progress: 25,
          timestamp: new Date().toISOString()
        })
        
        // Execute Phase 1: Create session
        sessionResult = await pythonBridge.executeBrowserTask(sessionTaskData)
        
        if (!sessionResult.success) {
          throw new Error(`Session creation failed: ${sessionResult.error}`)
        }
        
        console.log(`✅ PHASE 1 Complete: Session created for task ${taskId}`, {
          sessionId: sessionResult.session_id,
          liveViewUrl: sessionResult.live_view_url ? 'Available' : 'Missing'
        })
        
        // Send progress event for session ready
        websocketService.sendAutomationProgress(taskId, {
          step: 'session_ready',
          message: 'Browser session created successfully',
          progress: 50,
          timestamp: new Date().toISOString()
        })
        
        // PHASE 2: Run agent automation on existing session
        console.log(`🔄 PHASE 2: Starting agent automation for task ${taskId}`)
        
        const automationTaskData = {
          execution_mode: 'execute_on_session',
          session_connect_url: sessionResult.connect_url,
          vendor_url: task.vendorUrl,
          user_profile: task.userProfile,
          ocr_ticket_data: task.ocrTicketData,
          raw_text: task.rawText,
          model: task.model,
          temperature: task.temperature,
          max_steps: task.maxSteps,
          browser_mode: task.browserMode,
          request_id: taskId
        }
        
        // Send progress event for agent execution
        websocketService.sendAutomationProgress(taskId, {
          step: 'agent_execution',
          message: 'Running AI agent automation',
          progress: 75,
          timestamp: new Date().toISOString()
        })
        
        // Execute Phase 2: Run agent automation (this will take longer)
        automationResult = await pythonBridge.executeBrowserTask(automationTaskData)
        
        if (!automationResult.success) {
          console.warn(`⚠️ Agent automation failed for task ${taskId}: ${automationResult.error}`)
          // Continue with session info even if automation fails
        }
        
        console.log(`✅ PHASE 2 Complete: Agent automation finished for task ${taskId}`)
        
        // Combine results for final response
        const result = {
          success: true,
          result: automationResult?.success ? automationResult.result : 'Session created, agent execution had issues',
          session_id: sessionResult.session_id,
          live_view_url: sessionResult.live_view_url,
          browser_session_id: sessionResult.browser_session_id,
          browserbase_session: sessionResult.browserbase_session,
          automation_completed: automationResult?.success || false,
          automation_error: automationResult?.success ? null : automationResult?.error
        }
        
        // Use the combined result for further processing
        sessionResult = result
        
      } else {
        // LOCAL MODE: Single execution (no two-phase needed)
        const pythonTaskData = {
          execution_mode: 'create_session', // Local mode handles everything in one phase
          vendor_url: task.vendorUrl,
          user_profile: task.userProfile,
          ocr_ticket_data: task.ocrTicketData,
          raw_text: task.rawText,
          model: task.model,
          temperature: task.temperature,
          max_steps: task.maxSteps,
          browser_mode: task.browserMode,
          request_id: taskId
        }
        
        // Send progress event for Python execution
        websocketService.sendAutomationProgress(taskId, {
          step: 'python_execution',
          message: 'Executing Python browser automation',
          progress: 25,
          timestamp: new Date().toISOString()
        })
        
        // Execute single-phase local task
        sessionResult = await pythonBridge.executeBrowserTask(pythonTaskData)
        
        if (!sessionResult.success) {
          throw new Error(`Local browser task failed: ${sessionResult.error}`)
        }
      }
      
      // Final progress update
      websocketService.sendAutomationProgress(taskId, {
        step: 'completed',
        message: 'Task completed successfully',
        progress: 100,
        timestamp: new Date().toISOString()
      })
      
      // Update task with results
      task.result = sessionResult.result
      task.sessionId = sessionResult.session_id || task.sessionId
      task.liveViewUrl = sessionResult.live_view_url || task.liveViewUrl
      task.browserSessionId = sessionResult.browser_session_id || task.browserSessionId
      
      // Send session info update for Browserbase mode
      if (task.browserMode === 'browserbase' && sessionResult.session_id && sessionResult.live_view_url) {
        const sessionUpdate = {
          taskId: taskId,
          status: 'running',
          sessionId: sessionResult.session_id,
          liveViewUrl: sessionResult.live_view_url,
          browserSessionId: sessionResult.session_id,
          browserMode: 'browserbase'
        }
        
        websocketService.sendTaskUpdate(taskId, sessionUpdate)
        console.log(`🔗 WebSocket session update sent for task ${taskId}:`, sessionUpdate)
      }
      
      const executionTime = Date.now() - startTime
      
      // Send final progress event
      websocketService.sendAutomationProgress(taskId, {
        step: 'completed',
        message: 'Task completed successfully',
        progress: 100,
        timestamp: new Date().toISOString()
      })
      
      // Update task with final results (common for both modes)
      this.updateTaskStatus(taskId, 'completed', {
        result: task.result,
        executionTimeMs: executionTime,
        modelUsed: task.model,
        stepsTaken: task.maxSteps,
        sessionId: task.sessionId,
        liveViewUrl: task.liveViewUrl,
        browserSessionId: task.browserSessionId,
        browserMode: task.browserMode
      })
      
    } catch (error) {
      console.error(`❌ Task execution error for ${taskId}:`, error)
      
      // Send error progress event
      websocketService.sendAutomationProgress(taskId, {
        step: 'error',
        message: `Task failed: ${error.message}`,
        progress: 0,
        error: error.message,
        timestamp: new Date().toISOString()
      })
      
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
    
    // Send immediate URL updates via WebSocket for real-time delivery
    if (updates.sessionId || updates.liveViewUrl) {
      // Send session creation event immediately when session is available
      if (updates.sessionId && !task.sessionId) {
        websocketService.sendSessionCreated(taskId, {
          sessionId: updates.sessionId,
          browserMode: task.browserMode,
          timestamp: now
        })
        console.log(`🔗 WebSocket session created event sent for task ${taskId}:`, updates.sessionId)
      }
      
      // Send live view ready event immediately when URL is available
      if (updates.liveViewUrl && !task.liveViewUrl) {
        websocketService.sendLiveViewReady(taskId, {
          liveViewUrl: updates.liveViewUrl,
          sessionId: updates.sessionId || task.sessionId,
          browserMode: task.browserMode,
          timestamp: now
        })
        console.log(`🔗 WebSocket live view ready event sent for task ${taskId}:`, updates.liveViewUrl)
      }
      
      // Send comprehensive task update (existing functionality)
      const updateData = {
        taskId: taskId,
        status: status,
        sessionId: updates.sessionId || task.sessionId,
        liveViewUrl: updates.liveViewUrl || task.liveViewUrl,
        browserSessionId: updates.browserSessionId || task.browserSessionId
      }
      
      websocketService.sendTaskUpdate(taskId, updateData)
      console.log(`🔗 WebSocket status update sent for task ${taskId}:`, updateData)
    }
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
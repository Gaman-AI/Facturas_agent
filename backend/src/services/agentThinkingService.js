/**
 * Agent Thinking Service
 * 
 * This service captures and stores agent thinking processes without disrupting
 * the existing browser agent functionality. It provides real-time monitoring
 * capabilities for the task monitor page.
 * 
 * @file purpose: Agent thinking capture and storage for monitoring
 */

class AgentThinkingService {
  constructor() {
    // In-memory storage for agent thinking data
    this.thinkingStorage = new Map()
    this.activeCallbacks = new Map()
  }

  /**
   * Register a thinking callback for a task
   * 
   * @param {string} taskId - Task ID
   * @param {Function} callback - Callback function to receive thinking data
   */
  registerThinkingCallback(taskId, callback) {
    if (!this.activeCallbacks.has(taskId)) {
      this.activeCallbacks.set(taskId, [])
    }
    this.activeCallbacks.get(taskId).push(callback)
    
    console.log(`📡 Registered thinking callback for task ${taskId}`)
  }

  /**
   * Remove thinking callbacks for a task
   * 
   * @param {string} taskId - Task ID
   */
  unregisterThinkingCallback(taskId) {
    this.activeCallbacks.delete(taskId)
    console.log(`📡 Unregistered thinking callbacks for task ${taskId}`)
  }

  /**
   * Store agent thinking step
   * 
   * @param {string} taskId - Task ID
   * @param {Object} stepData - Step data from agent
   * @param {number} stepData.step_number - Step number
   * @param {string} stepData.thinking - Agent's thinking process
   * @param {string} stepData.action - Action being taken
   * @param {string} stepData.status - Step status
   * @param {Object} [stepData.additional] - Additional data
   */
  storeThinking(taskId, stepData) {
    if (!this.thinkingStorage.has(taskId)) {
      this.thinkingStorage.set(taskId, [])
    }
    
    const steps = this.thinkingStorage.get(taskId)
    const enrichedStep = {
      ...stepData,
      timestamp: new Date().toISOString(),
      id: steps.length + 1
    }
    
    steps.push(enrichedStep)
    
    // Keep only last 200 steps to prevent memory issues
    if (steps.length > 200) {
      steps.shift()
    }
    
    // Notify any registered callbacks
    const callbacks = this.activeCallbacks.get(taskId) || []
    callbacks.forEach(callback => {
      try {
        callback(enrichedStep)
      } catch (error) {
        console.error(`❌ Error in thinking callback for ${taskId}:`, error)
      }
    })
    
    console.log(`💭 Stored thinking step ${enrichedStep.id} for task ${taskId}`)
  }

  /**
   * Get thinking steps for a task
   * 
   * @param {string} taskId - Task ID
   * @param {Object} options - Query options
   * @param {number} [options.limit] - Maximum number of steps to return
   * @param {number} [options.offset] - Offset for pagination
   * @param {string} [options.since] - Return steps since this timestamp
   * @returns {Array} Array of thinking steps
   */
  getThinkingSteps(taskId, options = {}) {
    const steps = this.thinkingStorage.get(taskId) || []
    let filteredSteps = steps
    
    // Filter by timestamp if specified
    if (options.since) {
      const sinceTime = new Date(options.since).getTime()
      filteredSteps = steps.filter(step => 
        new Date(step.timestamp).getTime() > sinceTime
      )
    }
    
    // Apply pagination
    const offset = options.offset || 0
    const limit = options.limit || filteredSteps.length
    
    return filteredSteps.slice(offset, offset + limit)
  }

  /**
   * Get all thinking data for a task
   * 
   * @param {string} taskId - Task ID
   * @returns {Object} Complete thinking data
   */
  getTaskThinking(taskId) {
    const steps = this.thinkingStorage.get(taskId) || []
    
    return {
      task_id: taskId,
      thinking_steps: steps,
      total_steps: steps.length,
      last_updated: steps.length > 0 ? steps[steps.length - 1].timestamp : null,
      first_step: steps.length > 0 ? steps[0].timestamp : null
    }
  }

  /**
   * Clear thinking data for a task
   * 
   * @param {string} taskId - Task ID
   */
  clearTaskThinking(taskId) {
    this.thinkingStorage.delete(taskId)
    this.unregisterThinkingCallback(taskId)
    console.log(`🗑️ Cleared thinking data for task ${taskId}`)
  }

  /**
   * Get service statistics
   * 
   * @returns {Object} Service statistics
   */
  getStats() {
    const totalTasks = this.thinkingStorage.size
    const activeCallbacks = this.activeCallbacks.size
    let totalSteps = 0
    
    for (const steps of this.thinkingStorage.values()) {
      totalSteps += steps.length
    }
    
    return {
      total_tasks: totalTasks,
      active_callbacks: activeCallbacks,
      total_steps: totalSteps,
      average_steps_per_task: totalTasks > 0 ? Math.round(totalSteps / totalTasks) : 0
    }
  }

  /**
   * Create a browser agent step callback function
   * This function can be passed to browser-use agent to capture thinking
   * 
   * @param {string} taskId - Task ID
   * @returns {Function} Step callback function
   */
  createAgentCallback(taskId) {
    return async (browserState, modelOutput, stepNumber) => {
      try {
        // Extract thinking data from model output
        const thinkingData = {
          step_number: stepNumber,
          thinking: modelOutput.thinking || 'No thinking data available',
          memory: modelOutput.memory || null,
          next_goal: modelOutput.next_goal || null,
          evaluation: modelOutput.evaluation_previous_goal || null,
          action: 'agent_step',
          status: 'processing'
        }
        
        // Add browser state information if available
        if (browserState) {
          thinkingData.browser_state = {
            url: browserState.url || null,
            title: browserState.title || null,
            screenshot_available: !!browserState.screenshot
          }
        }
        
        // Add planned actions if available
        if (modelOutput.action && Array.isArray(modelOutput.action)) {
          thinkingData.planned_actions = modelOutput.action.map((action, index) => {
            const actionData = action.model_dump ? action.model_dump(exclude_unset=true) : action
            const actionName = Object.keys(actionData)[0]
            return {
              index: index + 1,
              action_type: actionName,
              action_data: actionData[actionName]
            }
          })
        }
        
        // Store the thinking data
        this.storeThinking(taskId, thinkingData)
        
      } catch (error) {
        console.error(`❌ Error in agent callback for ${taskId}:`, error)
        
        // Store error as thinking step
        this.storeThinking(taskId, {
          step_number: stepNumber,
          thinking: `Error capturing thinking data: ${error.message}`,
          action: 'error',
          status: 'error',
          error: error.message
        })
      }
    }
  }

  /**
   * Create a simple thinking logger for non-browser-use tasks
   * 
   * @param {string} taskId - Task ID
   * @returns {Object} Logger with methods for different types of thinking
   */
  createSimpleLogger(taskId) {
    return {
      log: (thinking, action = 'log', status = 'info') => {
        this.storeThinking(taskId, {
          step_number: Date.now(),
          thinking,
          action,
          status
        })
      },
      
      error: (error, thinking = null) => {
        this.storeThinking(taskId, {
          step_number: Date.now(),
          thinking: thinking || `Error: ${error}`,
          action: 'error',
          status: 'error',
          error: error
        })
      },
      
      success: (result, thinking = null) => {
        this.storeThinking(taskId, {
          step_number: Date.now(),
          thinking: thinking || 'Operation completed successfully',
          action: 'success',
          status: 'completed',
          result: result
        })
      }
    }
  }
}

export default new AgentThinkingService()
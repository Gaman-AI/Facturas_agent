import taskService from './taskService.js'
import config from '../config/index.js'

/**
 * In-Memory Queue Service for Task Management
 * Handles task queuing, processing, and monitoring without Redis dependency
 */
class QueueService {
  constructor() {
    this.tasks = new Map() // In-memory task storage
    this.isInitialized = false
    this.isProcessing = false
    this.processingInterval = null
    
    // Queue configuration
    this.queueConfig = {
      maxConcurrent: config.tasks.maxConcurrent || 5,
      maxRetries: 3,
      retryDelay: 2000, // 2 seconds
      processingInterval: 1000, // Check for tasks every 1 second
    }
    
    // Task counters for stats
    this.stats = {
      waiting: 0,
      active: 0,
      completed: 0,
      failed: 0
    }
  }

  /**
   * Initialize the queue service
   * @returns {Promise<boolean>}
   */
  async initialize() {
    try {
      if (this.isInitialized) {
        console.log('✅ Queue service already initialized')
        return true
      }

      this.isInitialized = true
      console.log('✅ Queue service initialized successfully (in-memory mode)')
      return true
    } catch (error) {
      console.error('❌ Failed to initialize queue service:', error)
      this.isInitialized = false
      return false
    }
  }

  /**
   * Initialize task worker (start processing tasks)
   * @returns {Promise<boolean>}
   */
  async initializeWorker() {
    try {
      if (this.isProcessing) {
        console.log('✅ Task worker already running')
        return true
      }

      this.isProcessing = true
      this.startProcessing()

      console.log('✅ Task worker started successfully (in-memory mode)')
      return true
    } catch (error) {
      console.error('❌ Failed to initialize task worker:', error)
      return false
    }
  }

  /**
   * Start processing tasks
   */
  startProcessing() {
    this.processingInterval = setInterval(async () => {
      await this.processQueuedTasks()
    }, this.queueConfig.processingInterval)
  }

  /**
   * Stop processing tasks
   */
  stopProcessing() {
    if (this.processingInterval) {
      clearInterval(this.processingInterval)
      this.processingInterval = null
    }
    this.isProcessing = false
  }

  /**
   * Add a task to the queue
   * @param {string} taskType - Type of task
   * @param {object} taskData - Task data
   * @param {object} options - Task options
   * @returns {Promise<object>}
   */
  async addTask(taskType, taskData, options = {}) {
    try {
      const taskId = this.generateTaskId()
      const task = {
        id: taskId,
        type: taskType,
        data: taskData,
        status: 'waiting',
        attempts: 0,
        maxAttempts: options.attempts || this.queueConfig.maxRetries,
        createdAt: new Date().toISOString(),
        startedAt: null,
        completedAt: null,
        error: null,
        result: null
      }

      this.tasks.set(taskId, task)
      this.stats.waiting++

      console.log(`✅ Task ${taskId} added to queue`)
      return { success: true, taskId, task }
    } catch (error) {
      console.error('❌ Failed to add task to queue:', error)
      return { success: false, error: error.message }
    }
  }

  /**
   * Process queued tasks
   */
  async processQueuedTasks() {
    const waitingTasks = Array.from(this.tasks.values())
      .filter(task => task.status === 'waiting')
      .sort((a, b) => new Date(a.createdAt) - new Date(b.createdAt))

    const activeTasks = Array.from(this.tasks.values())
      .filter(task => task.status === 'active').length

    const availableSlots = this.queueConfig.maxConcurrent - activeTasks

    if (availableSlots <= 0 || waitingTasks.length === 0) {
      return
    }

    const tasksToProcess = waitingTasks.slice(0, availableSlots)

    for (const task of tasksToProcess) {
      this.processTask(task)
    }
  }

  /**
   * Process a single task
   * @param {object} task - Task to process
   */
  async processTask(task) {
    try {
      // Update task status
      task.status = 'active'
      task.startedAt = new Date().toISOString()
      task.attempts++
      
      this.stats.waiting--
      this.stats.active++

      console.log(`🚀 Processing task ${task.id} (attempt ${task.attempts})`)

      // Process the task based on its type
      let result
      switch (task.type) {
        case 'browser-automation':
          result = await this.processBrowserAutomationTask(task.data)
          break
        case 'invoice-processing':
          result = await this.processInvoiceTask(task.data)
          break
        default:
          throw new Error(`Unknown task type: ${task.type}`)
      }

      // Task completed successfully
      task.status = 'completed'
      task.completedAt = new Date().toISOString()
      task.result = result

      this.stats.active--
      this.stats.completed++

      console.log(`✅ Task ${task.id} completed successfully`)

    } catch (error) {
      console.error(`❌ Task ${task.id} failed:`, error.message)

      // Update task with error
      task.error = error.message
      this.stats.active--

      // Retry logic
      if (task.attempts < task.maxAttempts) {
        console.log(`🔄 Retrying task ${task.id} (attempt ${task.attempts + 1}/${task.maxAttempts})`)
        
        // Add delay before retry
        setTimeout(() => {
          task.status = 'waiting'
          this.stats.waiting++
        }, this.queueConfig.retryDelay * task.attempts)
      } else {
        // Max attempts reached, mark as failed
        task.status = 'failed'
        task.completedAt = new Date().toISOString()
        this.stats.failed++
        console.error(`💀 Task ${task.id} failed permanently after ${task.attempts} attempts`)
      }
    }
  }

  /**
   * Process browser automation task
   * @param {object} taskData - Task data
   * @returns {Promise<object>}
   */
  async processBrowserAutomationTask(taskData) {
    // This would integrate with your browser automation service
    // For now, we'll delegate to the existing task service
    return await taskService.executeTask(taskData)
  }

  /**
   * Process invoice task
   * @param {object} taskData - Task data
   * @returns {Promise<object>}
   */
  async processInvoiceTask(taskData) {
    // Custom invoice processing logic here
    return await taskService.processInvoice(taskData)
  }

  /**
   * Get task by ID
   * @param {string} taskId - Task ID
   * @returns {object|null}
   */
  getTask(taskId) {
    return this.tasks.get(taskId) || null
  }

  /**
   * Get tasks by status
   * @param {string} status - Task status
   * @returns {array}
   */
  getTasksByStatus(status) {
    return Array.from(this.tasks.values())
      .filter(task => task.status === status)
  }

  /**
   * Get queue statistics
   * @returns {Promise<object>}
   */
  async getQueueStats() {
    try {
      // Update stats by counting current tasks
      const tasks = Array.from(this.tasks.values())
      this.stats.waiting = tasks.filter(t => t.status === 'waiting').length
      this.stats.active = tasks.filter(t => t.status === 'active').length
      this.stats.completed = tasks.filter(t => t.status === 'completed').length
      this.stats.failed = tasks.filter(t => t.status === 'failed').length

      const stats = {
        ...this.stats,
        total: this.tasks.size,
        processing: this.isProcessing,
        initialized: this.isInitialized
      }

      return { success: true, stats }
    } catch (error) {
      return { success: false, error: error.message }
    }
  }

  /**
   * Health check
   * @returns {Promise<object>}
   */
  async healthCheck() {
    try {
      const isHealthy = this.isInitialized
      
      return {
        status: isHealthy ? 'healthy' : 'unhealthy',
        initialized: this.isInitialized,
        processing: this.isProcessing,
        totalTasks: this.tasks.size,
        stats: this.stats
      }
    } catch (error) {
      return {
        status: 'unhealthy',
        error: error.message
      }
    }
  }

  /**
   * Clear completed tasks (cleanup)
   * @param {number} maxAge - Maximum age in milliseconds
   */
  clearCompletedTasks(maxAge = 24 * 60 * 60 * 1000) { // 24 hours default
    const now = new Date()
    
    for (const [taskId, task] of this.tasks.entries()) {
      if (task.status === 'completed' && task.completedAt) {
        const completedAt = new Date(task.completedAt)
        if (now - completedAt > maxAge) {
          this.tasks.delete(taskId)
        }
      }
    }
  }

  /**
   * Generate unique task ID
   * @returns {string}
   */
  generateTaskId() {
    return `task_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
  }

  /**
   * Shutdown queue service
   */
  async shutdown() {
    console.log('🔌 Shutting down queue service...')
    this.stopProcessing()
    this.isInitialized = false
    console.log('✅ Queue service shutdown complete')
  }
}

// Export singleton instance
export default new QueueService()
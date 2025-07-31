import { Queue, Worker, QueueEvents } from 'bullmq'
import redisService from './redisService.js'
import taskService from './taskService.js'
import config from '../config/index.js'

/**
 * Queue Service for Task Management using BullMQ
 * Handles task queuing, processing, and monitoring with retry logic
 */
class QueueService {
  constructor() {
    this.taskQueue = null
    this.taskWorker = null
    this.queueEvents = null
    this.isInitialized = false
    
    // Queue configuration
    this.queueConfig = {
      connection: null, // Will be set from Redis service
      defaultJobOptions: {
        removeOnComplete: 50, // Keep last 50 completed jobs
        removeOnFail: 100,    // Keep last 100 failed jobs
        attempts: 3,          // Retry failed jobs 3 times
        backoff: {
          type: 'exponential',
          delay: 2000,        // Start with 2 second delay
        },
        delay: 1000,          // Default delay before processing
      }
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

      // Ensure Redis is connected
      if (!redisService.isConnected) {
        const connected = await redisService.connect()
        if (!connected) {
          throw new Error('Failed to connect to Redis')
        }
      }

      // Set Redis connection for BullMQ
      this.queueConfig.connection = redisService.getClient()

      // Initialize task queue
      this.taskQueue = new Queue('cfdi-automation-tasks', this.queueConfig)

      // Initialize queue events for monitoring
      this.queueEvents = new QueueEvents('cfdi-automation-tasks', {
        connection: redisService.getClient()
      })

      // Set up event listeners
      this.setupEventListeners()

      this.isInitialized = true
      console.log('✅ Queue service initialized successfully')
      return true
    } catch (error) {
      console.error('❌ Failed to initialize queue service:', error)
      this.isInitialized = false
      return false
    }
  }

  /**
   * Initialize task worker
   * @returns {Promise<boolean>}
   */
  async initializeWorker() {
    try {
      if (this.taskWorker) {
        console.log('✅ Task worker already initialized')
        return true
      }

      // Create worker
      this.taskWorker = new Worker(
        'cfdi-automation-tasks',
        this.processTask.bind(this),
        {
          connection: redisService.getClient(),
          concurrency: config.tasks.maxConcurrent || 5,
          maxStalledCount: 1,
          stalledInterval: 30000, // 30 seconds
        }
      )

      // Set up worker event listeners
      this.setupWorkerListeners()

      console.log('✅ Task worker initialized successfully')
      return true
    } catch (error) {
      console.error('❌ Failed to initialize task worker:', error)
      return false
    }
  }

  /**
   * Set up queue event listeners
   */
  setupEventListeners() {
    this.queueEvents.on('completed', (jobId, result) => {
      console.log(`✅ Job ${jobId} completed:`, result)
    })

    this.queueEvents.on('failed', (jobId, failedReason) => {
      console.error(`❌ Job ${jobId} failed:`, failedReason)
    })

    this.queueEvents.on('progress', (jobId, progress) => {
      console.log(`⏳ Job ${jobId} progress:`, progress)
    })

    this.queueEvents.on('stalled', (jobId) => {
      console.warn(`⚠️ Job ${jobId} stalled`)
    })

    this.queueEvents.on('waiting', (jobId) => {
      console.log(`⌛ Job ${jobId} waiting`)
    })

    this.queueEvents.on('active', (jobId) => {
      console.log(`🚀 Job ${jobId} started`)
    })
  }

  /**
   * Set up worker event listeners
   */
  setupWorkerListeners() {
    this.taskWorker.on('completed', (job, result) => {
      console.log(`✅ Worker completed job ${job.id}:`, result)
    })

    this.taskWorker.on('failed', (job, error) => {
      console.error(`❌ Worker failed job ${job.id}:`, error.message)
    })

    this.taskWorker.on('progress', (job, progress) => {
      console.log(`⏳ Worker progress for job ${job.id}:`, progress)
    })

    this.taskWorker.on('error', (error) => {
      console.error('❌ Worker error:', error)
    })

    this.taskWorker.on('stalled', (jobId) => {
      console.warn(`⚠️ Worker detected stalled job ${jobId}`)
    })
  }

  /**
   * Add a task to the queue
   * @param {string} taskId - Task ID from database
   * @param {Object} taskData - Task data
   * @param {Object} options - Job options
   * @returns {Promise<{job: Object, error: string}>}
   */
  async addTask(taskId, taskData, options = {}) {
    try {
      if (!this.isInitialized) {
        await this.initialize()
      }

      const jobOptions = {
        ...this.queueConfig.defaultJobOptions,
        ...options,
        jobId: taskId, // Use task ID as job ID for easy tracking
      }

      const job = await this.taskQueue.add(
        'process-cfdi-task',
        {
          taskId,
          taskData,
          timestamp: new Date().toISOString()
        },
        jobOptions
      )

      console.log(`✅ Task ${taskId} added to queue as job ${job.id}`)
      return { job, error: null }
    } catch (error) {
      console.error(`❌ Failed to add task ${taskId} to queue:`, error)
      return { job: null, error: error.message }
    }
  }

  /**
   * Process a task (worker callback)
   * @param {Object} job - BullMQ job object
   * @returns {Promise<Object>}
   */
  async processTask(job) {
    const { taskId, taskData } = job.data
    console.log(`🚀 Processing task ${taskId}`)

    try {
      // Update task status to RUNNING
      await taskService.updateTaskStatus(taskId, taskData.userId, 'RUNNING')

      // Log task start step
      await taskService.addTaskStep(
        taskId,
        'thinking',
        { 
          action: 'task_started', 
          message: 'Iniciando automatización CFDI...',
          queue_job_id: job.id 
        }
      )

      // Update progress
      await job.updateProgress(10)

      // TODO: Implement actual CFDI automation logic here
      // For now, simulate processing
      await this.simulateTaskProcessing(job, taskId)

      // Update progress
      await job.updateProgress(90)

      // Log completion step
      await taskService.addTaskStep(
        taskId,
        'completed',
        { 
          action: 'task_completed', 
          message: 'Automatización CFDI completada exitosamente',
          execution_time: Date.now() - job.processedOn 
        }
      )

      // Update task status to COMPLETED
      await taskService.updateTaskStatus(taskId, taskData.userId, 'COMPLETED', {
        completed_at: new Date().toISOString()
      })

      await job.updateProgress(100)

      console.log(`✅ Task ${taskId} completed successfully`)
      return { 
        success: true, 
        taskId, 
        message: 'Task completed successfully',
        execution_time: Date.now() - job.processedOn 
      }
    } catch (error) {
      console.error(`❌ Task ${taskId} processing failed:`, error)

      // Log error step
      await taskService.addTaskStep(
        taskId,
        'error',
        { 
          action: 'task_failed', 
          message: `Error en automatización: ${error.message}`,
          error_details: error.stack 
        }
      )

      // Update task status to FAILED
      await taskService.updateTaskStatus(taskId, taskData.userId, 'FAILED', {
        failure_reason: error.message,
        completed_at: new Date().toISOString()
      })

      // Increment retry count
      await taskService.incrementRetryCount(taskId, taskData.userId)

      throw error
    }
  }

  /**
   * Simulate task processing (to be replaced with real automation)
   * @param {Object} job - BullMQ job
   * @param {string} taskId - Task ID
   */
  async simulateTaskProcessing(job, taskId) {
    const steps = [
      { type: 'navigate', message: 'Navegando al portal del proveedor...', progress: 20 },
      { type: 'input', message: 'Completando datos del cliente...', progress: 40 },
      { type: 'input', message: 'Ingresando detalles de la factura...', progress: 60 },
      { type: 'click', message: 'Enviando formulario...', progress: 80 },
    ]

    for (const step of steps) {
      await new Promise(resolve => setTimeout(resolve, 2000)) // Simulate work
      
      await taskService.addTaskStep(
        taskId,
        step.type,
        { 
          action: step.type,
          message: step.message,
          timestamp: new Date().toISOString()
        }
      )

      await job.updateProgress(step.progress)
    }
  }

  /**
   * Pause a task
   * @param {string} taskId - Task ID
   * @returns {Promise<{success: boolean, error: string}>}
   */
  async pauseTask(taskId) {
    try {
      const job = await this.taskQueue.getJob(taskId)
      if (!job) {
        return { success: false, error: 'Job not found in queue' }
      }

      // Pause the job
      await job.remove()
      console.log(`⏸️ Task ${taskId} paused (removed from queue)`)
      return { success: true, error: null }
    } catch (error) {
      console.error(`❌ Failed to pause task ${taskId}:`, error)
      return { success: false, error: error.message }
    }
  }

  /**
   * Resume a task
   * @param {string} taskId - Task ID
   * @param {Object} taskData - Task data
   * @returns {Promise<{success: boolean, error: string}>}
   */
  async resumeTask(taskId, taskData) {
    try {
      // Re-add the task to the queue
      const { job, error } = await this.addTask(taskId, taskData, { delay: 0 })
      
      if (error) {
        return { success: false, error }
      }

      console.log(`▶️ Task ${taskId} resumed (re-added to queue)`)
      return { success: true, error: null }
    } catch (error) {
      console.error(`❌ Failed to resume task ${taskId}:`, error)
      return { success: false, error: error.message }
    }
  }

  /**
   * Cancel a task
   * @param {string} taskId - Task ID
   * @returns {Promise<{success: boolean, error: string}>}
   */
  async cancelTask(taskId) {
    try {
      const job = await this.taskQueue.getJob(taskId)
      if (job) {
        await job.remove()
        console.log(`❌ Task ${taskId} cancelled (removed from queue)`)
      }
      return { success: true, error: null }
    } catch (error) {
      console.error(`❌ Failed to cancel task ${taskId}:`, error)
      return { success: false, error: error.message }
    }
  }

  /**
   * Get queue statistics
   * @returns {Promise<{stats: Object, error: string}>}
   */
  async getQueueStats() {
    try {
      if (!this.taskQueue) {
        return { stats: null, error: 'Queue not initialized' }
      }

      const [
        waiting,
        active,
        completed,
        failed,
        delayed
      ] = await Promise.all([
        this.taskQueue.getWaiting(),
        this.taskQueue.getActive(),
        this.taskQueue.getCompleted(),
        this.taskQueue.getFailed(),
        this.taskQueue.getDelayed()
      ])

      const stats = {
        waiting: waiting.length,
        active: active.length,
        completed: completed.length,
        failed: failed.length,
        delayed: delayed.length,
        total: waiting.length + active.length + completed.length + failed.length + delayed.length
      }

      return { stats, error: null }
    } catch (error) {
      console.error('❌ Failed to get queue stats:', error)
      return { stats: null, error: error.message }
    }
  }

  /**
   * Health check for queue service
   * @returns {Promise<{status: string, error: string}>}
   */
  async healthCheck() {
    try {
      if (!this.isInitialized) {
        return { status: 'not_initialized', error: 'Queue service not initialized' }
      }

      // Check Redis connection
      const redisHealth = await redisService.healthCheck()
      if (redisHealth.status !== 'healthy') {
        return { status: 'redis_unhealthy', error: redisHealth.error }
      }

      // Test queue operations
      const testJob = await this.taskQueue.add('health-check', { test: true }, { 
        removeOnComplete: 1,
        removeOnFail: 1
      })
      await testJob.remove()

      return { status: 'healthy', error: null }
    } catch (error) {
      console.error('❌ Queue health check failed:', error)
      return { status: 'unhealthy', error: error.message }
    }
  }

  /**
   * Cleanup and shutdown
   * @returns {Promise<void>}
   */
  async shutdown() {
    try {
      if (this.taskWorker) {
        await this.taskWorker.close()
        this.taskWorker = null
      }

      if (this.queueEvents) {
        await this.queueEvents.close()
        this.queueEvents = null
      }

      if (this.taskQueue) {
        await this.taskQueue.close()
        this.taskQueue = null
      }

      this.isInitialized = false
      console.log('✅ Queue service shutdown complete')
    } catch (error) {
      console.error('❌ Error during queue service shutdown:', error)
    }
  }
}

// Export singleton instance
export default new QueueService() 
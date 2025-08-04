import { describe, test, expect, beforeAll, afterAll, beforeEach, afterEach } from '@jest/globals'
import { QueueService } from '../src/services/queueService.js'
import { RedisService } from '../src/services/redisService.js'
import { TaskService } from '../src/services/taskService.js'
import { randomUUID } from 'crypto'

describe('QueueService Integration Tests', () => {
  let queueService
  let redisService
  let taskService
  let testUserId
  let createdTaskIds = []

  beforeAll(async () => {
    // Initialize services
    redisService = new RedisService()
    await redisService.connect()
    
    queueService = new QueueService()
    await queueService.initialize()
    
    taskService = new TaskService()
    testUserId = randomUUID()
    
    console.log('🧪 QueueService tests starting...')
  })

  afterAll(async () => {
    // Cleanup tasks
    try {
      for (const taskId of createdTaskIds) {
        await taskService.deleteTask(taskId)
      }
    } catch (error) {
      console.warn('Task cleanup warning:', error.message)
    }

    // Shutdown services
    await queueService.shutdown()
    await redisService.disconnect()
  })

  beforeEach(() => {
    createdTaskIds = []
  })

  describe('Queue Operations', () => {
    test('should initialize queue service', async () => {
      expect(queueService.queue).toBeDefined()
      expect(queueService.worker).toBeDefined()
    })

    test('should add task to queue', async () => {
      // Create test task
      const taskData = {
        user_id: testUserId,
        prompt: 'Queue test task',
        vendor_url: 'https://facturacion.example.com',
        ticket_details: { test: 'queue' }
      }

      const task = await taskService.createTask(taskData)
      createdTaskIds.push(task.id)

      // Add to queue
      const job = await queueService.addTask(task.id, {
        priority: 10,
        delay: 0
      })

      expect(job).toBeDefined()
      expect(job.id).toBeDefined()
      expect(job.data.taskId).toBe(task.id)
    })

    test('should process task through queue', async () => {
      // Create test task
      const taskData = {
        user_id: testUserId,
        prompt: 'Process test task',
        vendor_url: 'https://facturacion.example.com',
        ticket_details: { test: 'process' }
      }

      const task = await taskService.createTask(taskData)
      createdTaskIds.push(task.id)

      // Add to queue with immediate processing
      const job = await queueService.addTask(task.id, {
        priority: 10,
        delay: 0
      })

      // Wait for processing (since we have a real worker)
      await new Promise(resolve => setTimeout(resolve, 2000))

      // Check if task status changed
      const processedTask = await taskService.getTask(task.id)
      
      // Task should be in running or completed state (depending on processing speed)
      expect(['running', 'completed', 'failed'].includes(processedTask.status)).toBe(true)
    }, 10000) // Extended timeout for processing

    test('should handle queue priorities', async () => {
      const tasks = []
      
      // Create high priority task
      const highPriorityTask = await taskService.createTask({
        user_id: testUserId,
        prompt: 'High priority task',
        vendor_url: 'https://facturacion.example.com',
        ticket_details: { priority: 'high' }
      })
      createdTaskIds.push(highPriorityTask.id)
      tasks.push(highPriorityTask)

      // Create low priority task
      const lowPriorityTask = await taskService.createTask({
        user_id: testUserId,
        prompt: 'Low priority task',
        vendor_url: 'https://facturacion.example.com',
        ticket_details: { priority: 'low' }
      })
      createdTaskIds.push(lowPriorityTask.id)
      tasks.push(lowPriorityTask)

      // Add to queue with different priorities
      await queueService.addTask(lowPriorityTask.id, { priority: 1 })
      await queueService.addTask(highPriorityTask.id, { priority: 10 })

      // Get queue stats
      const stats = await queueService.getQueueStats()
      expect(stats.waiting).toBeGreaterThanOrEqual(2)
    })
  })

  describe('Task Control Operations', () => {
    test('should pause and resume task', async () => {
      const taskData = {
        user_id: testUserId,
        prompt: 'Pause/Resume test task',
        vendor_url: 'https://facturacion.example.com',
        ticket_details: { test: 'pause_resume' }
      }

      const task = await taskService.createTask(taskData)
      createdTaskIds.push(task.id)

      // Add to queue
      const job = await queueService.addTask(task.id)
      
      // Pause task
      const pauseResult = await queueService.pauseTask(task.id)
      expect(pauseResult.success).toBe(true)

      // Check task status
      const pausedTask = await taskService.getTask(task.id)
      expect(pausedTask.status).toBe('paused')

      // Resume task
      const resumeResult = await queueService.resumeTask(task.id)
      expect(resumeResult.success).toBe(true)

      // Check task status
      const resumedTask = await taskService.getTask(task.id)
      expect(['pending', 'running'].includes(resumedTask.status)).toBe(true)
    })

    test('should cancel task', async () => {
      const taskData = {
        user_id: testUserId,
        prompt: 'Cancel test task',
        vendor_url: 'https://facturacion.example.com',
        ticket_details: { test: 'cancel' }
      }

      const task = await taskService.createTask(taskData)
      createdTaskIds.push(task.id)

      // Add to queue
      await queueService.addTask(task.id)
      
      // Cancel task
      const cancelResult = await queueService.cancelTask(task.id)
      expect(cancelResult.success).toBe(true)

      // Check task status
      const cancelledTask = await taskService.getTask(task.id)
      expect(cancelledTask.status).toBe('cancelled')
    })
  })

  describe('Queue Statistics', () => {
    test('should get queue statistics', async () => {
      const stats = await queueService.getQueueStats()

      expect(stats).toBeDefined()
      expect(typeof stats.waiting).toBe('number')
      expect(typeof stats.active).toBe('number')
      expect(typeof stats.completed).toBe('number')
      expect(typeof stats.failed).toBe('number')
      expect(typeof stats.delayed).toBe('number')
      expect(typeof stats.paused).toBe('number')
      expect(stats.waiting).toBeGreaterThanOrEqual(0)
      expect(stats.active).toBeGreaterThanOrEqual(0)
    })

    test('should get queue health status', async () => {
      const health = await queueService.healthCheck()

      expect(health).toBeDefined()
      expect(health.queue).toBe('healthy')
      expect(health.worker).toBe('healthy')
      expect(health.redis).toBe('healthy')
      expect(typeof health.stats).toBe('object')
      expect(typeof health.timestamp).toBe('string')
    })
  })

  describe('Error Handling', () => {
    test('should handle invalid task ID', async () => {
      const invalidTaskId = randomUUID()
      
      await expect(queueService.addTask(invalidTaskId)).rejects.toThrow()
    })

    test('should handle pause on non-existent task', async () => {
      const invalidTaskId = randomUUID()
      
      const result = await queueService.pauseTask(invalidTaskId)
      expect(result.success).toBe(false)
      expect(result.error).toBeDefined()
    })

    test('should handle cancel on non-existent task', async () => {
      const invalidTaskId = randomUUID()
      
      const result = await queueService.cancelTask(invalidTaskId)
      expect(result.success).toBe(false)
      expect(result.error).toBeDefined()
    })
  })

  describe('Performance Tests', () => {
    test('should handle multiple concurrent tasks', async () => {
      const concurrentTasks = 5
      const taskPromises = []

      // Create multiple tasks
      for (let i = 0; i < concurrentTasks; i++) {
        taskPromises.push(taskService.createTask({
          user_id: testUserId,
          prompt: `Concurrent task ${i + 1}`,
          vendor_url: 'https://facturacion.example.com',
          ticket_details: { test: 'concurrent', index: i }
        }))
      }

      const tasks = await Promise.all(taskPromises)
      createdTaskIds.push(...tasks.map(t => t.id))

      // Add all to queue simultaneously
      const queuePromises = tasks.map(task => 
        queueService.addTask(task.id, { priority: Math.floor(Math.random() * 10) + 1 })
      )

      const jobs = await Promise.all(queuePromises)
      
      expect(jobs).toHaveLength(concurrentTasks)
      jobs.forEach(job => {
        expect(job).toBeDefined()
        expect(job.id).toBeDefined()
      })

      // Check queue stats
      const stats = await queueService.getQueueStats()
      expect(stats.waiting + stats.active + stats.completed).toBeGreaterThanOrEqual(concurrentTasks)
    }, 15000) // Extended timeout
  })
})

describe('RedisService Integration Tests', () => {
  let redisService

  beforeAll(async () => {
    redisService = new RedisService()
    await redisService.connect()
  })

  afterAll(async () => {
    await redisService.disconnect()
  })

  describe('Redis Operations', () => {
    test('should connect to Redis', async () => {
      const client = redisService.getClient()
      expect(client).toBeDefined()
      expect(client.isOpen).toBe(true)
    })

    test('should perform basic Redis operations', async () => {
      const client = redisService.getClient()
      
      // Set and get
      await client.set('test-key', 'test-value')
      const value = await client.get('test-key')
      expect(value).toBe('test-value')

      // Delete
      await client.del('test-key')
      const deletedValue = await client.get('test-key')
      expect(deletedValue).toBeNull()
    })

    test('should test Redis operations', async () => {
      const testResults = await redisService.testOperations()
      
      expect(testResults).toBeDefined()
      expect(testResults.basicOperations).toBe('success')
      expect(testResults.listOperations).toBe('success')
      expect(testResults.hashOperations).toBe('success')
      expect(typeof testResults.performance.setGet).toBe('number')
      expect(testResults.performance.setGet).toBeLessThan(100) // Should be fast
    })

    test('should get Redis health check', async () => {
      const health = await redisService.healthCheck()
      
      expect(health).toBeDefined()
      expect(health.status).toBe('healthy')
      expect(health.connection).toBe('open')
      expect(typeof health.memory).toBe('object')
      expect(typeof health.performance).toBe('object')
      expect(typeof health.timestamp).toBe('string')
    })

    test('should get connection info', async () => {
      const info = redisService.getConnectionInfo()
      
      expect(info).toBeDefined()
      expect(info.host).toBeDefined()
      expect(info.port).toBeDefined()
      expect(info.database).toBeDefined()
      expect(typeof info.connected).toBe('boolean')
    })

    test('should get memory stats', async () => {
      const memoryStats = await redisService.getMemoryStats()
      
      expect(memoryStats).toBeDefined()
      expect(typeof memoryStats.used_memory).toBe('string')
      expect(typeof memoryStats.used_memory_human).toBe('string')
      expect(typeof memoryStats.used_memory_peak).toBe('string')
    })
  })
}) 
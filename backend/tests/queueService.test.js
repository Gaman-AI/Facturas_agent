import { describe, test, expect, beforeAll, afterAll } from '@jest/globals'
import queueService from '../src/services/queueService.js'

describe('Queue Service Tests (In-Memory)', () => {
  
  beforeAll(async () => {
    // Initialize queue service
    await queueService.initialize()
  })

  afterAll(async () => {
    // Cleanup
    await queueService.shutdown()
  })

  describe('Queue Service Initialization', () => {
    test('should initialize successfully', async () => {
      const result = await queueService.initialize()
      expect(result).toBe(true)
    })

    test('should provide health check', async () => {
      const health = await queueService.healthCheck()
      expect(health.status).toBe('healthy')
      expect(health.initialized).toBe(true)
    })

    test('should provide queue statistics', async () => {
      const { stats } = await queueService.getQueueStats()
      expect(stats).toBeDefined()
      expect(typeof stats.total).toBe('number')
      expect(typeof stats.waiting).toBe('number')
      expect(typeof stats.active).toBe('number')
      expect(typeof stats.completed).toBe('number')
      expect(typeof stats.failed).toBe('number')
    })
  })

  describe('Task Management', () => {
    test('should add task to queue', async () => {
      const result = await queueService.addTask('test-task', { data: 'test' })
      expect(result.success).toBe(true)
      expect(result.taskId).toBeDefined()
      expect(result.task.status).toBe('waiting')
    })

    test('should get task by ID', async () => {
      const { taskId } = await queueService.addTask('test-task', { data: 'test' })
      const task = queueService.getTask(taskId)
      expect(task).toBeDefined()
      expect(task.id).toBe(taskId)
    })

    test('should get tasks by status', async () => {
      await queueService.addTask('test-task', { data: 'test' })
      const waitingTasks = queueService.getTasksByStatus('waiting')
      expect(Array.isArray(waitingTasks)).toBe(true)
      expect(waitingTasks.length).toBeGreaterThan(0)
    })

    test('should handle task with retry options', async () => {
      const result = await queueService.addTask('test-task', { data: 'test' }, { attempts: 5 })
      expect(result.success).toBe(true)
      expect(result.task.maxAttempts).toBe(5)
    })
  })

  describe('Queue Worker', () => {
    test('should initialize worker', async () => {
      const result = await queueService.initializeWorker()
      expect(result).toBe(true)
    })

    test('should process tasks automatically when worker is running', async () => {
      // Add a task
      const { taskId } = await queueService.addTask('browser-automation', {
        url: 'https://example.com',
        instructions: 'Test automation'
      })

      // Wait a bit for processing (since it's async)
      await new Promise(resolve => setTimeout(resolve, 2000))

      // Check if task was processed (might be completed or failed depending on implementation)
      const task = queueService.getTask(taskId)
      expect(task.status).not.toBe('waiting') // Should have been processed
    }, 10000)
  })

  describe('Queue Statistics', () => {
    test('should track queue metrics', async () => {
      const { stats: initialStats } = await queueService.getQueueStats()
      
      // Add some tasks
      await queueService.addTask('test-task', { data: 'test1' })
      await queueService.addTask('test-task', { data: 'test2' })
      
      const { stats: newStats } = await queueService.getQueueStats()
      expect(newStats.total).toBeGreaterThanOrEqual(initialStats.total)
    })

    test('should provide processing status', async () => {
      const { stats } = await queueService.getQueueStats()
      expect(typeof stats.processing).toBe('boolean')
      expect(typeof stats.initialized).toBe('boolean')
    })
  })

  describe('Task Cleanup', () => {
    test('should clear completed tasks', async () => {
      // This is a unit test for the cleanup method
      expect(() => queueService.clearCompletedTasks()).not.toThrow()
    })

    test('should generate unique task IDs', () => {
      const id1 = queueService.generateTaskId()
      const id2 = queueService.generateTaskId()
      expect(id1).not.toBe(id2)
      expect(id1).toContain('task_')
      expect(id2).toContain('task_')
    })
  })

  describe('Error Handling', () => {
    test('should handle invalid task types gracefully', async () => {
      const result = await queueService.addTask('invalid-type', { data: 'test' })
      expect(result.success).toBe(true) // Adding should succeed
      
      // The task will fail when processed, but adding it should not fail
      const task = queueService.getTask(result.taskId)
      expect(task.type).toBe('invalid-type')
    })

    test('should handle queue shutdown gracefully', async () => {
      await expect(queueService.shutdown()).resolves.not.toThrow()
    })
  })
})

// Mock tests for queue functionality (since we don't have full task processing implemented)
describe('Queue Service Integration (Mocked)', () => {
  test('should handle browser automation tasks', async () => {
    const mockTaskData = {
      url: 'https://example.com',
      instructions: 'Navigate and extract data',
      timeout: 30000
    }

    const result = await queueService.addTask('browser-automation', mockTaskData)
    expect(result.success).toBe(true)
    expect(result.task.data).toEqual(mockTaskData)
  })

  test('should handle invoice processing tasks', async () => {
    const mockTaskData = {
      invoiceData: { rfc: 'TEST123', amount: 100 },
      vendorUrl: 'https://vendor.example.com'
    }

    const result = await queueService.addTask('invoice-processing', mockTaskData)
    expect(result.success).toBe(true)
    expect(result.task.data).toEqual(mockTaskData)
  })
})
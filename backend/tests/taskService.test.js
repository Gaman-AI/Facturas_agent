import { describe, test, expect, beforeAll, afterAll, beforeEach, afterEach } from '@jest/globals'
import taskService from '../src/services/taskService.js'
import supabaseService from '../src/services/supabase.js'
import config from '../src/config/index.js'
import { randomUUID } from 'crypto'

describe('TaskService Integration Tests', () => {
  let testUserId
  let createdTaskIds = []

  beforeAll(async () => {
    // Create test user ID (mock user for testing)
    testUserId = randomUUID()
    
    console.log('🧪 TaskService tests starting with test user:', testUserId)
  })

  afterAll(async () => {
    // Cleanup: Delete all test tasks
    try {
      for (const taskId of createdTaskIds) {
        await taskService.deleteTask(taskId)
      }
      console.log('🧹 Cleaned up', createdTaskIds.length, 'test tasks')
    } catch (error) {
      console.warn('Cleanup warning:', error.message)
    }
  })

  beforeEach(() => {
    // Reset tracking
    createdTaskIds = []
  })

  describe('Task CRUD Operations', () => {
    test('should create a new task', async () => {
      const taskData = {
        vendor_url: 'https://facturacion.example.com',
        ticket_details: {
          amount: 1000.50,
          currency: 'MXN',
          description: 'Test transaction'
        }
      }

      const result = await taskService.createTask(testUserId, taskData)
      
      expect(result.error).toBeNull()
      expect(result.task).toBeDefined()
      
      const task = result.task
      createdTaskIds.push(task.id)

      expect(task.id).toMatch(/^[0-9a-f-]{36}$/) // UUID format
      expect(task.user_id).toBe(testUserId)
      expect(task.vendor_url).toBe(taskData.vendor_url)
      expect(task.status).toBe('PENDING')
      expect(task.retry_count).toBe(0)
      expect(task.created_at).toBeDefined()
      expect(task.updated_at).toBeDefined()
      expect(typeof task.ticket_details).toBe('object')
    })

    test('should retrieve task by ID', async () => {
      // Create test task
      const taskData = {
        vendor_url: 'https://facturacion.example.com',
        ticket_details: { test: 'retrieve' }
      }

      const createResult = await taskService.createTask(testUserId, taskData)
      expect(createResult.error).toBeNull()
      
      const createdTask = createResult.task
      createdTaskIds.push(createdTask.id)

      // Retrieve task
      const getResult = await taskService.getTask(createdTask.id, testUserId)
      
      expect(getResult.error).toBeNull()
      expect(getResult.task).toBeDefined()
      
      const retrievedTask = getResult.task
      expect(retrievedTask.id).toBe(createdTask.id)
      expect(retrievedTask.vendor_url).toBe(taskData.vendor_url)
      expect(retrievedTask.status).toBe('PENDING')
    })

    test('should return error for non-existent task', async () => {
      const fakeTaskId = randomUUID()
      const result = await taskService.getTask(fakeTaskId, testUserId)
      
      expect(result.task).toBeNull()
      expect(result.error).toBeDefined()
    })

    test('should update task status', async () => {
      // Create test task
      const taskData = {
        vendor_url: 'https://facturacion.example.com',
        ticket_details: { test: 'status' }
      }

      const createResult = await taskService.createTask(testUserId, taskData)
      const task = createResult.task
      createdTaskIds.push(task.id)

      // Update status to running
      const updateResult = await taskService.updateTaskStatus(
        task.id, 
        'RUNNING', 
        null, 
        { browser_session: 'test-session' }
      )

      expect(updateResult.error).toBeNull()
      expect(updateResult.task).toBeDefined()
      
      const updatedTask = updateResult.task
      expect(updatedTask.status).toBe('RUNNING')
      expect(updatedTask.result).toEqual({ browser_session: 'test-session' })
      expect(new Date(updatedTask.updated_at)).toBeInstanceOf(Date)

      // Update status to completed
      const completeResult = await taskService.updateTaskStatus(
        task.id, 
        'COMPLETED', 
        null, 
        { success: true, cfdi_url: 'https://example.com/cfdi.xml' }
      )

      expect(completeResult.error).toBeNull()
      const completedTask = completeResult.task
      expect(completedTask.status).toBe('COMPLETED')
      expect(completedTask.completed_at).toBeDefined()
      expect(completedTask.result.success).toBe(true)
    })

    test('should handle task failure with error message', async () => {
      const taskData = {
        vendor_url: 'https://facturacion.example.com',
        ticket_details: { test: 'failure' }
      }

      const createResult = await taskService.createTask(testUserId, taskData)
      const task = createResult.task
      createdTaskIds.push(task.id)

      const errorMessage = 'Test error: Unable to process CFDI'
      const failResult = await taskService.updateTaskStatus(
        task.id, 
        'FAILED', 
        errorMessage
      )

      expect(failResult.error).toBeNull()
      const failedTask = failResult.task
      expect(failedTask.status).toBe('FAILED')
      expect(failedTask.failure_reason).toBe(errorMessage)
      expect(failedTask.completed_at).toBeDefined()
    })

    test('should delete task', async () => {
      const taskData = {
        vendor_url: 'https://facturacion.example.com',
        ticket_details: { test: 'delete' }
      }

      const createResult = await taskService.createTask(testUserId, taskData)
      const task = createResult.task

      // Delete task
      const deleteResult = await taskService.deleteTask(task.id)
      expect(deleteResult.success).toBe(true)

      // Verify task is deleted
      const getResult = await taskService.getTask(task.id, testUserId)
      expect(getResult.task).toBeNull()
      expect(getResult.error).toBeDefined()
    })
  })

  describe('Task Step Logging', () => {
    test('should add task steps', async () => {
      const taskData = {
        vendor_url: 'https://facturacion.example.com',
        ticket_details: { test: 'steps' }
      }

      const createResult = await taskService.createTask(testUserId, taskData)
      const task = createResult.task
      createdTaskIds.push(task.id)

      // Add first step
      const step1Result = await taskService.addTaskStep(
        task.id, 
        'navigation',
        'Navigated to vendor portal',
        { duration_ms: 1500 }
      )
      expect(step1Result.error).toBeNull()

      // Add second step
      const step2Result = await taskService.addTaskStep(
        task.id,
        'form_fill',
        'Filled invoice form',
        { duration_ms: 3000 }
      )
      expect(step2Result.error).toBeNull()

      // Retrieve task with steps
      const taskWithStepsResult = await taskService.getTaskWithSteps(task.id)
      expect(taskWithStepsResult.error).toBeNull()
      
      const taskWithSteps = taskWithStepsResult.task
      expect(taskWithSteps).toBeDefined()
      expect(taskWithSteps.steps).toHaveLength(2)
      expect(taskWithSteps.steps[0].step_type).toBe('navigation')
      expect(taskWithSteps.steps[1].step_type).toBe('form_fill')
      expect(taskWithSteps.steps[0].content).toBe('Navigated to vendor portal')
    })
  })

  describe('User Tasks Management', () => {
    test('should get user tasks with pagination', async () => {
      // Create multiple test tasks
      const taskPromises = []
      for (let i = 0; i < 5; i++) {
        taskPromises.push(taskService.createTask(testUserId, {
          vendor_url: 'https://facturacion.example.com',
          ticket_details: { test: 'pagination', index: i }
        }))
      }

      const taskResults = await Promise.all(taskPromises)
      createdTaskIds.push(...taskResults.map(r => r.task.id))

      // Get first page
      const page1Result = await taskService.getUserTasks(testUserId, 0, 3)
      expect(page1Result.error).toBeNull()
      expect(page1Result.tasks).toHaveLength(3)

      // Get second page
      const page2Result = await taskService.getUserTasks(testUserId, 3, 3)
      expect(page2Result.error).toBeNull()
      expect(page2Result.tasks.length).toBeGreaterThanOrEqual(2)

      // Verify tasks belong to user
      page1Result.tasks.forEach(task => {
        expect(task.user_id).toBe(testUserId)
      })
    })

    test('should get user task statistics', async () => {
      // Create tasks with different statuses
      const completedTaskResult = await taskService.createTask(testUserId, {
        vendor_url: 'https://facturacion.example.com',
        ticket_details: { test: 'stats' }
      })
      
      await taskService.updateTaskStatus(completedTaskResult.task.id, 'COMPLETED')
      createdTaskIds.push(completedTaskResult.task.id)

      const failedTaskResult = await taskService.createTask(testUserId, {
        vendor_url: 'https://facturacion.example.com',
        ticket_details: { test: 'stats' }
      })
      
      await taskService.updateTaskStatus(failedTaskResult.task.id, 'FAILED', 'Test failure')
      createdTaskIds.push(failedTaskResult.task.id)

      // Get stats
      const statsResult = await taskService.getUserTaskStats(testUserId)
      expect(statsResult.error).toBeNull()
      
      const stats = statsResult.stats
      expect(stats).toBeDefined()
      expect(typeof stats.total).toBe('number')
      expect(typeof stats.pending).toBe('number')
      expect(typeof stats.running).toBe('number')
      expect(typeof stats.completed).toBe('number')
      expect(typeof stats.failed).toBe('number')
      expect(typeof stats.paused).toBe('number')
      expect(typeof stats.cancelled).toBe('number')

      expect(stats.total).toBeGreaterThanOrEqual(2)
      expect(stats.completed).toBeGreaterThanOrEqual(1)
      expect(stats.failed).toBeGreaterThanOrEqual(1)
    })
  })

  describe('Retry Count Management', () => {
    test('should increment retry count', async () => {
      const taskData = {
        vendor_url: 'https://facturacion.example.com',
        ticket_details: { test: 'retry' }
      }

      const createResult = await taskService.createTask(testUserId, taskData)
      const task = createResult.task
      createdTaskIds.push(task.id)

      // Initial retry count should be 0
      expect(task.retry_count).toBe(0)

      // Increment retry count
      const retryResult1 = await taskService.incrementTaskRetryCount(task.id)
      expect(retryResult1.success).toBe(true)

      // Get updated task to verify
      const getResult1 = await taskService.getTask(task.id, testUserId)
      expect(getResult1.task.retry_count).toBe(1)

      // Increment again
      const retryResult2 = await taskService.incrementTaskRetryCount(task.id)
      expect(retryResult2.success).toBe(true)

      const getResult2 = await taskService.getTask(task.id, testUserId)
      expect(getResult2.task.retry_count).toBe(2)
    })
  })

  describe('Health Check', () => {
    test('should perform health check', async () => {
      const health = await taskService.healthCheck()

      expect(health).toBeDefined()
      expect(health.database).toBe('healthy')
      expect(health.tables).toBeDefined()
      expect(health.tables.tasks).toBe(true)
      expect(health.tables.task_steps).toBe(true)
      expect(typeof health.timestamp).toBe('string')
    })
  })

  describe('Error Handling', () => {
    test('should handle invalid user ID gracefully', async () => {
      const invalidUserId = 'invalid-uuid'
      
      const result = await taskService.createTask(invalidUserId, {
        vendor_url: 'https://facturacion.example.com',
        ticket_details: {}
      })
      
      expect(result.task).toBeNull()
      expect(result.error).toBeDefined()
    })

    test('should handle invalid task ID gracefully', async () => {
      const invalidTaskId = 'invalid-uuid'
      
      const result = await taskService.getTask(invalidTaskId, testUserId)
      expect(result.task).toBeNull()
      expect(result.error).toBeDefined()
    })

    test('should handle missing required fields', async () => {
      const result = await taskService.createTask(testUserId, {
        // Missing vendor_url
        ticket_details: {}
      })
      
      expect(result.task).toBeNull()
      expect(result.error).toBeDefined()
    })
  })
}) 
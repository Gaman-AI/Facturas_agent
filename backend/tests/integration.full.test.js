import { describe, test, expect, beforeAll, afterAll, beforeEach } from '@jest/globals'
import request from 'supertest'
import { randomUUID } from 'crypto'
import { createApp, initializeServices, gracefulShutdown } from '../src/app.js'
import { TaskService } from '../src/services/taskService.js'
import { QueueService } from '../src/services/queueService.js'
import { RedisService } from '../src/services/redisService.js'

describe('End-to-End Integration Tests', () => {
  let app
  let server
  let taskService
  let queueService
  let redisService
  let testUserId
  let createdTaskIds = []

  beforeAll(async () => {
    // Initialize app and services
    app = createApp()
    await initializeServices()
    
    // Initialize service instances for testing
    taskService = new TaskService()
    queueService = new QueueService()
    redisService = new RedisService()
    
    // Start test server
    server = app.listen(0)
    const port = server.address().port
    
    testUserId = randomUUID()
    console.log(`🧪 Integration tests starting on port ${port}`)
  }, 30000)

  afterAll(async () => {
    // Cleanup tasks
    try {
      for (const taskId of createdTaskIds) {
        await taskService.deleteTask(taskId)
      }
    } catch (error) {
      console.warn('Cleanup warning:', error.message)
    }

    // Shutdown services and server
    if (server) {
      server.close()
    }
    await gracefulShutdown()
  }, 30000)

  beforeEach(() => {
    createdTaskIds = []
  })

  describe('Complete Task Lifecycle', () => {
    test('should handle complete task creation → queue → processing workflow', async () => {
      // Step 1: Create task via API
      const taskData = {
        user_id: testUserId,
        prompt: 'Complete lifecycle test task',
        vendor_url: 'https://facturacion.example.com',
        ticket_details: {
          amount: 2500.00,
          currency: 'MXN',
          description: 'E2E integration test',
          rfc: 'XAXX010101000'
        }
      }

      const createResponse = await request(app)
        .post('/api/v1/tasks')
        .send(taskData)
        .expect(201)

      const taskId = createResponse.body.data.id
      createdTaskIds.push(taskId)

      expect(createResponse.body.data).toMatchObject({
        id: expect.stringMatching(/^[0-9a-f-]{36}$/),
        status: 'pending',
        user_id: testUserId,
        prompt: taskData.prompt
      })

      // Step 2: Verify task is in database
      const dbTask = await taskService.getTask(taskId)
      expect(dbTask).toBeDefined()
      expect(dbTask.status).toBe('pending')

      // Step 3: Check task is queued
      await new Promise(resolve => setTimeout(resolve, 1000)) // Wait for queue processing
      
      const queueStats = await queueService.getQueueStats()
      expect(queueStats.waiting + queueStats.active + queueStats.completed).toBeGreaterThan(0)

      // Step 4: Verify task status progression
      const updatedTask = await taskService.getTask(taskId)
      expect(['pending', 'running', 'completed', 'failed'].includes(updatedTask.status)).toBe(true)

      // Step 5: Add task steps simulation
      await taskService.addTaskStep(taskId, {
        step_type: 'navigation',
        content: 'Navigated to vendor portal',
        timestamp: new Date().toISOString(),
        metadata: { url: taskData.vendor_url }
      })

      await taskService.addTaskStep(taskId, {
        step_type: 'authentication',
        content: 'Authenticated with vendor system',
        timestamp: new Date().toISOString(),
        metadata: { method: 'form_login' }
      })

      // Step 6: Retrieve task with steps via API
      const taskWithStepsResponse = await request(app)
        .get(`/api/v1/tasks/${taskId}`)
        .expect(200)

      expect(taskWithStepsResponse.body.data.steps).toBeDefined()

      // Step 7: Update task to completed
      const updateResponse = await request(app)
        .put(`/api/v1/tasks/${taskId}/status`)
        .send({
          status: 'completed',
          result: {
            cfdi_url: 'https://example.com/cfdi/test-123.xml',
            success: true,
            execution_time: 45000
          }
        })
        .expect(200)

      expect(updateResponse.body.data.status).toBe('completed')
      expect(updateResponse.body.data.result.success).toBe(true)
    }, 20000)

    test('should handle task failure and retry workflow', async () => {
      // Create task
      const taskData = {
        user_id: testUserId,
        prompt: 'Failure retry test task',
        vendor_url: 'https://facturacion.example.com',
        ticket_details: { test: 'failure_retry' }
      }

      const createResponse = await request(app)
        .post('/api/v1/tasks')
        .send(taskData)

      const taskId = createResponse.body.data.id
      createdTaskIds.push(taskId)

      // Simulate failure
      await request(app)
        .put(`/api/v1/tasks/${taskId}/status`)
        .send({
          status: 'failed',
          error_message: 'Network timeout during CFDI submission'
        })
        .expect(200)

      // Check retry count increment
      const failedTask = await taskService.getTask(taskId)
      expect(failedTask.status).toBe('failed')

      // Increment retry count
      await taskService.incrementTaskRetryCount(taskId)
      const retriedTask = await taskService.getTask(taskId)
      expect(retriedTask.retry_count).toBe(1)

      // Reset to pending for retry
      await request(app)
        .put(`/api/v1/tasks/${taskId}/status`)
        .send({ status: 'pending' })

      const resetTask = await taskService.getTask(taskId)
      expect(resetTask.status).toBe('pending')
    })
  })

  describe('Task Control Operations', () => {
    test('should handle pause → resume → complete workflow', async () => {
      // Create task
      const createResponse = await request(app)
        .post('/api/v1/tasks')
        .send({
          user_id: testUserId,
          prompt: 'Control operations test',
          vendor_url: 'https://facturacion.example.com',
          ticket_details: { test: 'control' }
        })

      const taskId = createResponse.body.data.id
      createdTaskIds.push(taskId)

      // Start task (simulate running)
      await request(app)
        .put(`/api/v1/tasks/${taskId}/status`)
        .send({ status: 'running' })

      // Pause task
      const pauseResponse = await request(app)
        .put(`/api/v1/tasks/${taskId}/pause`)
        .expect(200)

      expect(pauseResponse.body.success).toBe(true)

      // Verify paused status
      const pausedTask = await taskService.getTask(taskId)
      expect(pausedTask.status).toBe('paused')

      // Resume task
      const resumeResponse = await request(app)
        .put(`/api/v1/tasks/${taskId}/resume`)
        .expect(200)

      expect(resumeResponse.body.success).toBe(true)

      // Complete task
      await request(app)
        .put(`/api/v1/tasks/${taskId}/status`)
        .send({
          status: 'completed',
          result: { success: true }
        })

      const completedTask = await taskService.getTask(taskId)
      expect(completedTask.status).toBe('completed')
      expect(completedTask.completed_at).toBeDefined()
    })

    test('should handle task cancellation', async () => {
      // Create task
      const createResponse = await request(app)
        .post('/api/v1/tasks')
        .send({
          user_id: testUserId,
          prompt: 'Cancellation test',
          vendor_url: 'https://facturacion.example.com',
          ticket_details: { test: 'cancel' }
        })

      const taskId = createResponse.body.data.id
      createdTaskIds.push(taskId)

      // Cancel task
      const cancelResponse = await request(app)
        .put(`/api/v1/tasks/${taskId}/cancel`)
        .expect(200)

      expect(cancelResponse.body.success).toBe(true)

      // Verify cancelled status
      const cancelledTask = await taskService.getTask(taskId)
      expect(cancelledTask.status).toBe('cancelled')
    })
  })

  describe('System Health and Monitoring', () => {
    test('should verify system health across all components', async () => {
      // Check overall health
      const healthResponse = await request(app)
        .get('/health')
        .expect(200)

      expect(healthResponse.body).toMatchObject({
        status: 'healthy',
        services: {
          database: 'healthy',
          redis: 'healthy',
          queue: 'healthy'
        }
      })

      // Check database health via TaskService
      const dbHealth = await taskService.healthCheck()
      expect(dbHealth.database).toBe('healthy')

      // Check Redis health
      const redisHealth = await redisService.healthCheck()
      expect(redisHealth.status).toBe('healthy')

      // Check queue health
      const queueHealth = await queueService.healthCheck()
      expect(queueHealth.queue).toBe('healthy')
      expect(queueHealth.worker).toBe('healthy')
    })

    test('should provide comprehensive statistics', async () => {
      // Create test tasks for statistics
      const taskPromises = []
      for (let i = 0; i < 3; i++) {
        taskPromises.push(
          request(app)
            .post('/api/v1/tasks')
            .send({
              user_id: testUserId,
              prompt: `Stats test task ${i + 1}`,
              vendor_url: 'https://facturacion.example.com',
              ticket_details: { test: 'stats', index: i }
            })
        )
      }

      const taskResponses = await Promise.all(taskPromises)
      const taskIds = taskResponses.map(r => r.body.data.id)
      createdTaskIds.push(...taskIds)

      // Update one to completed
      await request(app)
        .put(`/api/v1/tasks/${taskIds[0]}/status`)
        .send({ status: 'completed' })

      // Update one to failed
      await request(app)
        .put(`/api/v1/tasks/${taskIds[1]}/status`)
        .send({ status: 'failed', error_message: 'Test failure' })

      // Get task statistics
      const statsResponse = await request(app)
        .get('/api/v1/tasks/stats')
        .expect(200)

      expect(statsResponse.body.data).toMatchObject({
        total: expect.any(Number),
        pending: expect.any(Number),
        completed: expect.any(Number),
        failed: expect.any(Number)
      })

      expect(statsResponse.body.data.total).toBeGreaterThanOrEqual(3)
      expect(statsResponse.body.data.completed).toBeGreaterThanOrEqual(1)
      expect(statsResponse.body.data.failed).toBeGreaterThanOrEqual(1)

      // Get queue statistics
      const queueStatsResponse = await request(app)
        .get('/api/v1/tasks/queue/stats')
        .expect(200)

      expect(queueStatsResponse.body.data).toMatchObject({
        waiting: expect.any(Number),
        active: expect.any(Number),
        completed: expect.any(Number),
        failed: expect.any(Number)
      })
    })
  })

  describe('Error Scenarios and Recovery', () => {
    test('should handle database connectivity issues gracefully', async () => {
      // This test would simulate database connectivity issues
      // For now, we'll test error handling for invalid data
      
      const response = await request(app)
        .post('/api/v1/tasks')
        .send({
          user_id: 'invalid-uuid-format',
          prompt: 'Database error test',
          vendor_url: 'https://facturacion.example.com'
        })
        .expect(400)

      expect(response.body.success).toBe(false)
      expect(response.body.error).toBeDefined()
    })

    test('should handle queue overload scenarios', async () => {
      // Create multiple tasks to test queue handling
      const concurrentTasks = 10
      const taskPromises = []

      for (let i = 0; i < concurrentTasks; i++) {
        taskPromises.push(
          request(app)
            .post('/api/v1/tasks')
            .send({
              user_id: testUserId,
              prompt: `Concurrent task ${i + 1}`,
              vendor_url: 'https://facturacion.example.com',
              ticket_details: { test: 'concurrent', index: i }
            })
        )
      }

      const taskResponses = await Promise.all(taskPromises)
      const taskIds = taskResponses.map(r => r.body.data.id)
      createdTaskIds.push(...taskIds)

      // All tasks should be created successfully
      expect(taskResponses).toHaveLength(concurrentTasks)
      taskResponses.forEach(response => {
        expect(response.status).toBe(201)
        expect(response.body.success).toBe(true)
      })

      // Check queue can handle the load
      const queueStats = await queueService.getQueueStats()
      expect(queueStats.waiting + queueStats.active + queueStats.completed).toBeGreaterThanOrEqual(concurrentTasks)
    }, 15000)
  })

  describe('Data Consistency and Integrity', () => {
    test('should maintain data consistency across services', async () => {
      // Create task via API
      const createResponse = await request(app)
        .post('/api/v1/tasks')
        .send({
          user_id: testUserId,
          prompt: 'Data consistency test',
          vendor_url: 'https://facturacion.example.com',
          ticket_details: { test: 'consistency' }
        })

      const taskId = createResponse.body.data.id
      createdTaskIds.push(taskId)

      // Verify task exists in database
      const dbTask = await taskService.getTask(taskId)
      expect(dbTask).toBeDefined()
      expect(dbTask.id).toBe(taskId)

      // Add steps via TaskService
      await taskService.addTaskStep(taskId, {
        step_type: 'test_step',
        content: 'Consistency test step',
        timestamp: new Date().toISOString()
      })

      // Retrieve via API and verify step is included
      const apiResponse = await request(app)
        .get(`/api/v1/tasks/${taskId}`)
        .expect(200)

      expect(apiResponse.body.data.steps).toBeDefined()
      expect(apiResponse.body.data.steps).toHaveLength(1)
      expect(apiResponse.body.data.steps[0].content).toBe('Consistency test step')

      // Update status via API
      await request(app)
        .put(`/api/v1/tasks/${taskId}/status`)
        .send({ status: 'completed' })

      // Verify update in database
      const updatedDbTask = await taskService.getTask(taskId)
      expect(updatedDbTask.status).toBe('completed')
      expect(updatedDbTask.completed_at).toBeDefined()
    })

    test('should handle concurrent updates safely', async () => {
      // Create task
      const createResponse = await request(app)
        .post('/api/v1/tasks')
        .send({
          user_id: testUserId,
          prompt: 'Concurrent updates test',
          vendor_url: 'https://facturacion.example.com',
          ticket_details: { test: 'concurrent_updates' }
        })

      const taskId = createResponse.body.data.id
      createdTaskIds.push(taskId)

      // Perform concurrent updates
      const updatePromises = [
        request(app)
          .put(`/api/v1/tasks/${taskId}/status`)
          .send({ status: 'running' }),
        
        taskService.addTaskStep(taskId, {
          step_type: 'concurrent_step_1',
          content: 'First concurrent step',
          timestamp: new Date().toISOString()
        }),
        
        taskService.addTaskStep(taskId, {
          step_type: 'concurrent_step_2',
          content: 'Second concurrent step',
          timestamp: new Date().toISOString()
        })
      ]

      // All operations should complete without error
      await Promise.all(updatePromises)

      // Verify final state
      const finalTask = await taskService.getTaskWithSteps(taskId)
      expect(finalTask.status).toBe('running')
      expect(finalTask.steps).toHaveLength(2)
    })
  })

  describe('Performance and Load Testing', () => {
    test('should handle API load efficiently', async () => {
      const startTime = Date.now()
      const concurrentRequests = 20
      const requests = []

      // Create concurrent health check requests
      for (let i = 0; i < concurrentRequests; i++) {
        requests.push(
          request(app)
            .get('/health')
            .expect(200)
        )
      }

      const responses = await Promise.all(requests)
      const endTime = Date.now()
      const totalTime = endTime - startTime

      // All requests should succeed
      expect(responses).toHaveLength(concurrentRequests)
      responses.forEach(response => {
        expect(response.body.status).toBe('healthy')
      })

      // Should complete within reasonable time (5 seconds)
      expect(totalTime).toBeLessThan(5000)
      
      // Average response time should be reasonable
      const avgResponseTime = totalTime / concurrentRequests
      expect(avgResponseTime).toBeLessThan(250) // 250ms average
    }, 10000)
  })
}) 
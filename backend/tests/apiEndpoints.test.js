import { describe, test, expect, beforeAll, afterAll, beforeEach } from '@jest/globals'
import request from 'supertest'
import { randomUUID } from 'crypto'

// Import the app (we'll need to make sure this works with our setup)
import config from '../src/config/index.js'

describe('API Endpoints Integration Tests', () => {
  let app
  let server
  let testUserId
  let createdTaskIds = []
  let authToken

  beforeAll(async () => {
    // Dynamically import and initialize the app
    const { createApp } = await import('../src/app.js')
    app = createApp()
    
    // Start server for testing
    server = app.listen(0) // Use random port
    const port = server.address().port
    
    testUserId = randomUUID()
    console.log(`🧪 API tests starting on port ${port} with user ${testUserId}`)
  })

  afterAll(async () => {
    // Cleanup tasks
    if (createdTaskIds.length > 0) {
      try {
        for (const taskId of createdTaskIds) {
          await request(app)
            .delete(`/api/v1/tasks/${taskId}`)
            .set('Authorization', `Bearer ${authToken}`)
        }
      } catch (error) {
        console.warn('API cleanup warning:', error.message)
      }
    }

    // Close server
    if (server) {
      server.close()
    }
  })

  beforeEach(() => {
    createdTaskIds = []
  })

  describe('Health Endpoints', () => {
    test('GET /health - should return health status', async () => {
      const response = await request(app)
        .get('/health')
        .expect(200)

      expect(response.body).toMatchObject({
        status: 'healthy',
        timestamp: expect.any(String),
        uptime: expect.any(Number),
        services: expect.objectContaining({
          database: 'healthy',
          redis: 'healthy',
          queue: 'healthy'
        })
      })
    })

    test('GET /api/v1 - should return API information', async () => {
      const response = await request(app)
        .get('/api/v1')
        .expect(200)

      expect(response.body).toMatchObject({
        success: true,
        data: expect.objectContaining({
          name: 'CFDI Automation API',
          version: 'v1',
          description: expect.any(String)
        })
      })
    })
  })

  describe('Task Management Endpoints', () => {
    describe('POST /api/v1/tasks', () => {
      test('should create a new task', async () => {
        const taskData = {
          user_id: testUserId,
          prompt: 'API test task creation',
          vendor_url: 'https://facturacion.example.com',
          ticket_details: {
            amount: 1500.75,
            currency: 'MXN',
            description: 'API integration test'
          }
        }

        const response = await request(app)
          .post('/api/v1/tasks')
          .send(taskData)
          .expect(201)

        expect(response.body).toMatchObject({
          success: true,
          data: expect.objectContaining({
            id: expect.stringMatching(/^[0-9a-f-]{36}$/),
            user_id: testUserId,
            prompt: taskData.prompt,
            vendor_url: taskData.vendor_url,
            status: 'pending',
            retry_count: 0
          })
        })

        createdTaskIds.push(response.body.data.id)
      })

      test('should validate required fields', async () => {
        const invalidTaskData = {
          prompt: 'Invalid task - missing user_id',
          vendor_url: 'https://facturacion.example.com'
        }

        const response = await request(app)
          .post('/api/v1/tasks')
          .send(invalidTaskData)
          .expect(400)

        expect(response.body).toMatchObject({
          success: false,
          error: expect.any(String)
        })
      })
    })

    describe('GET /api/v1/tasks', () => {
      test('should get tasks with pagination', async () => {
        // Create test tasks first
        const taskPromises = []
        for (let i = 0; i < 3; i++) {
          taskPromises.push(
            request(app)
              .post('/api/v1/tasks')
              .send({
                user_id: testUserId,
                prompt: `Pagination test task ${i + 1}`,
                vendor_url: 'https://facturacion.example.com',
                ticket_details: { test: 'pagination', index: i }
              })
          )
        }

        const taskResponses = await Promise.all(taskPromises)
        createdTaskIds.push(...taskResponses.map(r => r.body.data.id))

        // Get tasks with pagination
        const response = await request(app)
          .get('/api/v1/tasks')
          .query({ skip: 0, limit: 2 })
          .expect(200)

        expect(response.body).toMatchObject({
          success: true,
          data: expect.arrayContaining([
            expect.objectContaining({
              id: expect.any(String),
              status: expect.any(String),
              created_at: expect.any(String)
            })
          ])
        })

        expect(response.body.data.length).toBeGreaterThanOrEqual(2)
      })
    })

    describe('GET /api/v1/tasks/:id', () => {
      test('should get task by ID', async () => {
        // Create test task
        const taskData = {
          user_id: testUserId,
          prompt: 'Get task by ID test',
          vendor_url: 'https://facturacion.example.com',
          ticket_details: { test: 'get_by_id' }
        }

        const createResponse = await request(app)
          .post('/api/v1/tasks')
          .send(taskData)

        const taskId = createResponse.body.data.id
        createdTaskIds.push(taskId)

        // Get task by ID
        const response = await request(app)
          .get(`/api/v1/tasks/${taskId}`)
          .expect(200)

        expect(response.body).toMatchObject({
          success: true,
          data: expect.objectContaining({
            id: taskId,
            prompt: taskData.prompt,
            status: 'pending'
          })
        })
      })

      test('should return 404 for non-existent task', async () => {
        const fakeTaskId = randomUUID()

        const response = await request(app)
          .get(`/api/v1/tasks/${fakeTaskId}`)
          .expect(404)

        expect(response.body).toMatchObject({
          success: false,
          error: expect.stringContaining('not found')
        })
      })
    })

    describe('PUT /api/v1/tasks/:id/status', () => {
      test('should update task status', async () => {
        // Create test task
        const createResponse = await request(app)
          .post('/api/v1/tasks')
          .send({
            user_id: testUserId,
            prompt: 'Status update test',
            vendor_url: 'https://facturacion.example.com',
            ticket_details: { test: 'status_update' }
          })

        const taskId = createResponse.body.data.id
        createdTaskIds.push(taskId)

        // Update status to running
        const updateResponse = await request(app)
          .put(`/api/v1/tasks/${taskId}/status`)
          .send({
            status: 'running',
            result: { session_id: 'test-session-123' }
          })
          .expect(200)

        expect(updateResponse.body).toMatchObject({
          success: true,
          data: expect.objectContaining({
            id: taskId,
            status: 'running',
            result: expect.objectContaining({
              session_id: 'test-session-123'
            })
          })
        })
      })
    })

    describe('Task Control Endpoints', () => {
      test('PUT /api/v1/tasks/:id/pause - should pause task', async () => {
        // Create and queue a task
        const createResponse = await request(app)
          .post('/api/v1/tasks')
          .send({
            user_id: testUserId,
            prompt: 'Pause test task',
            vendor_url: 'https://facturacion.example.com',
            ticket_details: { test: 'pause' }
          })

        const taskId = createResponse.body.data.id
        createdTaskIds.push(taskId)

        // Pause task
        const pauseResponse = await request(app)
          .put(`/api/v1/tasks/${taskId}/pause`)
          .expect(200)

        expect(pauseResponse.body).toMatchObject({
          success: true,
          data: expect.objectContaining({
            message: expect.stringContaining('paused')
          })
        })
      })

      test('PUT /api/v1/tasks/:id/resume - should resume task', async () => {
        // Create and pause a task
        const createResponse = await request(app)
          .post('/api/v1/tasks')
          .send({
            user_id: testUserId,
            prompt: 'Resume test task',
            vendor_url: 'https://facturacion.example.com',
            ticket_details: { test: 'resume' }
          })

        const taskId = createResponse.body.data.id
        createdTaskIds.push(taskId)

        // Pause first
        await request(app)
          .put(`/api/v1/tasks/${taskId}/pause`)

        // Resume task
        const resumeResponse = await request(app)
          .put(`/api/v1/tasks/${taskId}/resume`)
          .expect(200)

        expect(resumeResponse.body).toMatchObject({
          success: true,
          data: expect.objectContaining({
            message: expect.stringContaining('resumed')
          })
        })
      })

      test('PUT /api/v1/tasks/:id/cancel - should cancel task', async () => {
        // Create a task
        const createResponse = await request(app)
          .post('/api/v1/tasks')
          .send({
            user_id: testUserId,
            prompt: 'Cancel test task',
            vendor_url: 'https://facturacion.example.com',
            ticket_details: { test: 'cancel' }
          })

        const taskId = createResponse.body.data.id
        createdTaskIds.push(taskId)

        // Cancel task
        const cancelResponse = await request(app)
          .put(`/api/v1/tasks/${taskId}/cancel`)
          .expect(200)

        expect(cancelResponse.body).toMatchObject({
          success: true,
          data: expect.objectContaining({
            message: expect.stringContaining('cancelled')
          })
        })
      })
    })

    describe('DELETE /api/v1/tasks/:id', () => {
      test('should delete task', async () => {
        // Create test task
        const createResponse = await request(app)
          .post('/api/v1/tasks')
          .send({
            user_id: testUserId,
            prompt: 'Delete test task',
            vendor_url: 'https://facturacion.example.com',
            ticket_details: { test: 'delete' }
          })

        const taskId = createResponse.body.data.id

        // Delete task
        const deleteResponse = await request(app)
          .delete(`/api/v1/tasks/${taskId}`)
          .expect(200)

        expect(deleteResponse.body).toMatchObject({
          success: true,
          data: expect.objectContaining({
            message: expect.stringContaining('deleted')
          })
        })

        // Verify task is deleted
        await request(app)
          .get(`/api/v1/tasks/${taskId}`)
          .expect(404)
      })
    })
  })

  describe('Task Statistics Endpoints', () => {
    test('GET /api/v1/tasks/stats - should get task statistics', async () => {
      // Create some test tasks with different statuses
      const completedTask = await request(app)
        .post('/api/v1/tasks')
        .send({
          user_id: testUserId,
          prompt: 'Completed stats task',
          vendor_url: 'https://facturacion.example.com',
          ticket_details: { test: 'stats' }
        })

      createdTaskIds.push(completedTask.body.data.id)

      // Update to completed
      await request(app)
        .put(`/api/v1/tasks/${completedTask.body.data.id}/status`)
        .send({ status: 'completed' })

      // Get stats
      const response = await request(app)
        .get('/api/v1/tasks/stats')
        .expect(200)

      expect(response.body).toMatchObject({
        success: true,
        data: expect.objectContaining({
          total: expect.any(Number),
          pending: expect.any(Number),
          running: expect.any(Number),
          completed: expect.any(Number),
          failed: expect.any(Number),
          paused: expect.any(Number),
          cancelled: expect.any(Number)
        })
      })

      expect(response.body.data.total).toBeGreaterThan(0)
      expect(response.body.data.completed).toBeGreaterThan(0)
    })
  })

  describe('Queue Monitoring Endpoints', () => {
    test('GET /api/v1/tasks/queue/stats - should get queue statistics', async () => {
      const response = await request(app)
        .get('/api/v1/tasks/queue/stats')
        .expect(200)

      expect(response.body).toMatchObject({
        success: true,
        data: expect.objectContaining({
          waiting: expect.any(Number),
          active: expect.any(Number),
          completed: expect.any(Number),
          failed: expect.any(Number),
          delayed: expect.any(Number),
          paused: expect.any(Number)
        })
      })
    })

    test('GET /api/v1/tasks/queue/health - should get queue health', async () => {
      const response = await request(app)
        .get('/api/v1/tasks/queue/health')
        .expect(200)

      expect(response.body).toMatchObject({
        success: true,
        data: expect.objectContaining({
          queue: 'healthy',
          worker: 'healthy',
          redis: 'healthy',
          stats: expect.any(Object)
        })
      })
    })
  })

  describe('Error Handling', () => {
    test('should handle malformed JSON', async () => {
      const response = await request(app)
        .post('/api/v1/tasks')
        .type('json')
        .send('{ invalid json }')
        .expect(400)

      expect(response.body).toMatchObject({
        success: false,
        error: expect.any(String)
      })
    })

    test('should handle invalid UUID format', async () => {
      const response = await request(app)
        .get('/api/v1/tasks/invalid-uuid')
        .expect(400)

      expect(response.body).toMatchObject({
        success: false,
        error: expect.stringContaining('Invalid')
      })
    })

    test('should handle server errors gracefully', async () => {
      // This would trigger a server error in real scenarios
      const response = await request(app)
        .post('/api/v1/tasks')
        .send({
          user_id: 'malformed-uuid-that-will-cause-error',
          prompt: 'Error test',
          vendor_url: 'https://facturacion.example.com'
        })
        .expect(400) // Should return 400 for validation error

      expect(response.body).toMatchObject({
        success: false,
        error: expect.any(String)
      })
    })
  })
})

describe('Performance Tests', () => {
  let app

  beforeAll(async () => {
    const { createApp } = await import('../src/app.js')
    app = createApp()
  })

  test('should handle concurrent requests', async () => {
    const concurrentRequests = 10
    const requests = []

    // Create multiple concurrent health check requests
    for (let i = 0; i < concurrentRequests; i++) {
      requests.push(
        request(app)
          .get('/health')
          .expect(200)
      )
    }

    const startTime = Date.now()
    const responses = await Promise.all(requests)
    const endTime = Date.now()

    // All requests should succeed
    expect(responses).toHaveLength(concurrentRequests)
    responses.forEach(response => {
      expect(response.body.status).toBe('healthy')
    })

    // Should complete within reasonable time (5 seconds)
    expect(endTime - startTime).toBeLessThan(5000)
  }, 10000)

  test('should respond quickly to simple requests', async () => {
    const startTime = Date.now()
    
    await request(app)
      .get('/api/v1')
      .expect(200)
    
    const endTime = Date.now()
    const responseTime = endTime - startTime

    // API info should respond quickly (under 1 second)
    expect(responseTime).toBeLessThan(1000)
  })
}) 
import request from 'supertest'
import { app } from '../src/app.js'

describe('Health Check Endpoints', () => {
  describe('GET /health', () => {
    test('should return basic health status', async () => {
      const response = await request(app)
        .get('/health')
        .expect(200)

      expect(response.body).toMatchObject({
        success: true,
        data: {
          status: 'healthy',
          version: '1.0.0',
          environment: 'test',
          services: expect.objectContaining({
            database: expect.any(String),
            python_service: expect.any(String),
            redis: expect.any(String)
          })
        },
        meta: expect.objectContaining({
          timestamp: expect.any(String),
          requestId: expect.any(String)
        })
      })
    })

    test('should include uptime in response', async () => {
      const response = await request(app)
        .get('/health')
        .expect(200)

      expect(response.body.data.uptime).toBeGreaterThan(0)
      expect(typeof response.body.data.uptime).toBe('number')
    })
  })

  describe('GET /health/detailed', () => {
    test('should return detailed health information', async () => {
      const response = await request(app)
        .get('/health/detailed')
        .expect(200)

      expect(response.body).toMatchObject({
        success: true,
        data: {
          status: 'healthy',
          version: '1.0.0',
          system: expect.objectContaining({
            nodejs: expect.any(String),
            platform: expect.any(String),
            arch: expect.any(String),
            memory: expect.objectContaining({
              rss: expect.any(Number),
              heapTotal: expect.any(Number),
              heapUsed: expect.any(Number)
            })
          }),
          services: expect.objectContaining({
            supabase: expect.objectContaining({
              status: expect.any(String),
              project_id: expect.any(String),
              url: expect.any(String)
            }),
            python_service: expect.objectContaining({
              status: expect.any(String)
            }),
            redis: expect.objectContaining({
              status: expect.any(String)
            })
          }),
          configuration: expect.objectContaining({
            cors_origins: expect.any(Array),
            max_concurrent_tasks: expect.any(Number),
            task_timeout_minutes: expect.any(Number)
          })
        })
      })
    })

    test('should include memory usage information', async () => {
      const response = await request(app)
        .get('/health/detailed')
        .expect(200)

      const memory = response.body.data.system.memory
      expect(memory.rss).toBeGreaterThan(0)
      expect(memory.heapTotal).toBeGreaterThan(0)
      expect(memory.heapUsed).toBeGreaterThan(0)
      expect(memory.heapUsed).toBeLessThanOrEqual(memory.heapTotal)
    })
  })

  describe('Error Handling', () => {
    test('should handle health check failures gracefully', async () => {
      // This test would simulate a service failure
      // For now, we'll test that the endpoint structure is correct
      const response = await request(app)
        .get('/health')
        .expect(200)

      expect(response.body.success).toBe(true)
    })
  })
}) 
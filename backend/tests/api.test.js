import request from 'supertest'
import { app } from '../src/app.js'

describe('API Endpoints', () => {
  describe('GET /api/v1', () => {
    test('should return API information', async () => {
      const response = await request(app)
        .get('/api/v1')
        .expect(200)

      expect(response.body).toMatchObject({
        success: true,
        data: {
          name: 'CFDI Automation API',
          version: 'v1',
          description: 'Mexican CFDI 4.0 Invoice Automation System',
          endpoints: expect.objectContaining({
            auth: '/api/v1/auth',
            tasks: '/api/v1/tasks',
            health: '/health'
          })
        },
        meta: expect.objectContaining({
          timestamp: expect.any(String),
          requestId: expect.any(String)
        })
      })
    })
  })

  describe('Authentication Module', () => {
    describe('GET /api/v1/auth', () => {
      test('should return auth module information', async () => {
        const response = await request(app)
          .get('/api/v1/auth')
          .expect(200)

        expect(response.body).toMatchObject({
          success: true,
          data: {
            module: 'Authentication',
            version: '1.0.0',
            description: 'CFDI user authentication and profile management',
            endpoints: expect.objectContaining({
              register: 'POST /api/v1/auth/register',
              login: 'POST /api/v1/auth/login',
              profile: 'GET /api/v1/auth/profile'
            }),
            features: expect.arrayContaining([
              'JWT authentication',
              'CFDI profile management',
              'RFC validation'
            ])
          })
        })
      })
    })

    describe('POST /api/v1/auth/register', () => {
      test('should reject registration without required fields', async () => {
        const response = await request(app)
          .post('/api/v1/auth/register')
          .send({})
          .expect(400)

        expect(response.body.success).toBe(false)
        expect(response.body.error.code).toBe('VALIDATION_ERROR')
      })

      test('should reject invalid email format', async () => {
        const testUser = global.testUtils.generateTestUser()
        testUser.email = 'invalid-email'

        const response = await request(app)
          .post('/api/v1/auth/register')
          .send(testUser)
          .expect(400)

        expect(response.body.success).toBe(false)
        expect(response.body.error.code).toBe('VALIDATION_ERROR')
      })

      test('should reject weak password', async () => {
        const testUser = global.testUtils.generateTestUser()
        testUser.password = '123'

        const response = await request(app)
          .post('/api/v1/auth/register')
          .send(testUser)
          .expect(400)

        expect(response.body.success).toBe(false)
        expect(response.body.error.code).toBe('VALIDATION_ERROR')
      })

      test('should reject invalid RFC format', async () => {
        const testUser = global.testUtils.generateTestUser()
        testUser.rfc = 'INVALID'

        const response = await request(app)
          .post('/api/v1/auth/register')
          .send(testUser)
          .expect(400)

        expect(response.body.success).toBe(false)
        expect(response.body.error.code).toBe('VALIDATION_ERROR')
      })
    })

    describe('POST /api/v1/auth/login', () => {
      test('should reject login without credentials', async () => {
        const response = await request(app)
          .post('/api/v1/auth/login')
          .send({})
          .expect(400)

        expect(response.body.success).toBe(false)
        expect(response.body.error.code).toBe('VALIDATION_ERROR')
      })

      test('should reject invalid email format', async () => {
        const response = await request(app)
          .post('/api/v1/auth/login')
          .send({
            email: 'invalid-email',
            password: 'password123'
          })
          .expect(400)

        expect(response.body.success).toBe(false)
        expect(response.body.error.code).toBe('VALIDATION_ERROR')
      })
    })
  })

  describe('Task Management Module', () => {
    describe('GET /api/v1/tasks (without auth)', () => {
      test('should require authentication', async () => {
        const response = await request(app)
          .get('/api/v1/tasks')
          .expect(401)

        expect(response.body.success).toBe(false)
        expect(response.body.error.code).toBe('AUTHENTICATION_ERROR')
      })
    })

    describe('POST /api/v1/tasks (without auth)', () => {
      test('should require authentication for task creation', async () => {
        const testTask = global.testUtils.generateTestTask()

        const response = await request(app)
          .post('/api/v1/tasks')
          .send(testTask)
          .expect(401)

        expect(response.body.success).toBe(false)
        expect(response.body.error.code).toBe('AUTHENTICATION_ERROR')
      })
    })
  })

  describe('Error Handling', () => {
    test('should return 404 for non-existent routes', async () => {
      const response = await request(app)
        .get('/api/v1/nonexistent')
        .expect(404)

      expect(response.body.success).toBe(false)
      expect(response.body.error.code).toBe('ROUTE_NOT_FOUND')
    })

    test('should handle malformed JSON', async () => {
      const response = await request(app)
        .post('/api/v1/auth/register')
        .set('Content-Type', 'application/json')
        .send('{"invalid": json}')
        .expect(400)

      expect(response.body.success).toBe(false)
    })

    test('should include request ID in all responses', async () => {
      const response = await request(app)
        .get('/api/v1')
        .expect(200)

      expect(response.body.meta.requestId).toMatch(/^req_/)
      expect(response.headers['x-request-id']).toBeDefined()
    })
  })

  describe('CORS Headers', () => {
    test('should include proper CORS headers', async () => {
      const response = await request(app)
        .get('/api/v1')
        .expect(200)

      expect(response.headers['access-control-allow-origin']).toBeDefined()
    })

    test('should handle OPTIONS requests', async () => {
      await request(app)
        .options('/api/v1/auth/register')
        .expect(204)
    })
  })
}) 
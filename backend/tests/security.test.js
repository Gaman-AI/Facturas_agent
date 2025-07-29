import request from 'supertest'
import jwt from 'jsonwebtoken'
import { app } from '../src/app.js'

describe('Security Tests', () => {
  describe('JWT Authentication', () => {
    const validUser = {
      id: 'user-123',
      email: 'test@example.com',
      role: 'authenticated'
    }

    test('should generate valid JWT tokens', () => {
      const token = jwt.sign(validUser, process.env.JWT_SECRET, { expiresIn: '1h' })
      
      expect(token).toBeDefined()
      expect(typeof token).toBe('string')
      expect(token.split('.')).toHaveLength(3)
    })

    test('should verify valid JWT tokens', () => {
      const token = jwt.sign(validUser, process.env.JWT_SECRET, { expiresIn: '1h' })
      const decoded = jwt.verify(token, process.env.JWT_SECRET)
      
      expect(decoded.id).toBe(validUser.id)
      expect(decoded.email).toBe(validUser.email)
      expect(decoded.role).toBe(validUser.role)
    })

    test('should reject invalid JWT tokens', () => {
      const invalidToken = 'invalid.jwt.token'
      
      expect(() => {
        jwt.verify(invalidToken, process.env.JWT_SECRET)
      }).toThrow()
    })

    test('should reject expired JWT tokens', () => {
      const expiredToken = jwt.sign(validUser, process.env.JWT_SECRET, { expiresIn: '-1h' })
      
      expect(() => {
        jwt.verify(expiredToken, process.env.JWT_SECRET)
      }).toThrow('jwt expired')
    })

    test('should reject tokens with wrong secret', () => {
      const token = jwt.sign(validUser, 'wrong-secret', { expiresIn: '1h' })
      
      expect(() => {
        jwt.verify(token, process.env.JWT_SECRET)
      }).toThrow('invalid signature')
    })
  })

  describe('Authentication Middleware', () => {
    test('should reject requests without Authorization header', async () => {
      const response = await request(app)
        .get('/api/v1/tasks')
        .expect(401)

      expect(response.body.success).toBe(false)
      expect(response.body.error.code).toBe('AUTHENTICATION_ERROR')
      expect(response.body.error.message).toContain('No token provided')
    })

    test('should reject requests with invalid Authorization format', async () => {
      const response = await request(app)
        .get('/api/v1/tasks')
        .set('Authorization', 'InvalidFormat token123')
        .expect(401)

      expect(response.body.success).toBe(false)
      expect(response.body.error.code).toBe('AUTHENTICATION_ERROR')
    })

    test('should reject requests with malformed JWT', async () => {
      const response = await request(app)
        .get('/api/v1/tasks')
        .set('Authorization', 'Bearer invalid.jwt.token')
        .expect(401)

      expect(response.body.success).toBe(false)
      expect(response.body.error.code).toBe('AUTHENTICATION_ERROR')
    })

    test('should reject expired tokens', async () => {
      const expiredToken = jwt.sign(validUser, process.env.JWT_SECRET, { expiresIn: '-1h' })
      
      const response = await request(app)
        .get('/api/v1/tasks')
        .set('Authorization', `Bearer ${expiredToken}`)
        .expect(401)

      expect(response.body.success).toBe(false)
      expect(response.body.error.code).toBe('AUTHENTICATION_ERROR')
      expect(response.body.error.message).toContain('expired')
    })
  })

  describe('Input Validation', () => {
    describe('Registration Validation', () => {
      test('should reject SQL injection attempts in email', async () => {
        const maliciousData = {
          email: "test'; DROP TABLE users; --",
          password: 'ValidPassword123!',
          rfc: 'XAXX010101000',
          fiscal_regime: '601',
          postal_code: '01000'
        }

        const response = await request(app)
          .post('/api/v1/auth/register')
          .send(maliciousData)
          .expect(400)

        expect(response.body.success).toBe(false)
        expect(response.body.error.code).toBe('VALIDATION_ERROR')
      })

      test('should reject XSS attempts in company name', async () => {
        const maliciousData = {
          email: 'test@example.com',
          password: 'ValidPassword123!',
          rfc: 'XAXX010101000',
          fiscal_regime: '601',
          postal_code: '01000',
          company_name: '<script>alert("xss")</script>'
        }

        const response = await request(app)
          .post('/api/v1/auth/register')
          .send(maliciousData)
          .expect(400)

        expect(response.body.success).toBe(false)
        expect(response.body.error.code).toBe('VALIDATION_ERROR')
      })

      test('should sanitize and validate RFC format', async () => {
        const testCases = [
          { rfc: 'XAXX010101000', valid: true },
          { rfc: 'xaxx010101000', valid: false }, // lowercase
          { rfc: 'XAXX01010100A', valid: false }, // invalid format
          { rfc: 'XAXX0101010001', valid: false }, // too long
          { rfc: 'XAXX01010100', valid: false }, // too short
          { rfc: 'XXXX010101000', valid: false }, // invalid characters
        ]

        for (const testCase of testCases) {
          const userData = {
            email: 'test@example.com',
            password: 'ValidPassword123!',
            rfc: testCase.rfc,
            fiscal_regime: '601',
            postal_code: '01000'
          }

          const response = await request(app)
            .post('/api/v1/auth/register')
            .send(userData)

          if (testCase.valid) {
            // Valid RFC should pass validation (though may fail for other reasons in test)
            expect(response.status).not.toBe(400)
          } else {
            // Invalid RFC should fail validation
            expect(response.status).toBe(400)
            expect(response.body.error.code).toBe('VALIDATION_ERROR')
          }
        }
      })
    })

    describe('Task Creation Validation', () => {
      const validToken = jwt.sign(validUser, process.env.JWT_SECRET, { expiresIn: '1h' })

      test('should reject invalid URLs', async () => {
        const invalidTask = {
          vendor_url: 'not-a-valid-url',
          ticket_id: 'TEST123',
          cfdi_data: {
            rfc: 'XAXX010101000',
            email: 'test@example.com'
          }
        }

        const response = await request(app)
          .post('/api/v1/tasks')
          .set('Authorization', `Bearer ${validToken}`)
          .send(invalidTask)
          .expect(400)

        expect(response.body.success).toBe(false)
        expect(response.body.error.code).toBe('VALIDATION_ERROR')
      })

      test('should reject malicious script injection in task data', async () => {
        const maliciousTask = {
          vendor_url: 'https://example.com',
          ticket_id: '<script>alert("xss")</script>',
          cfdi_data: {
            rfc: 'XAXX010101000',
            email: 'test@example.com',
            company_name: '<img src="x" onerror="alert(1)">'
          }
        }

        const response = await request(app)
          .post('/api/v1/tasks')
          .set('Authorization', `Bearer ${validToken}`)
          .send(maliciousTask)
          .expect(400)

        expect(response.body.success).toBe(false)
        expect(response.body.error.code).toBe('VALIDATION_ERROR')
      })
    })
  })

  describe('Security Headers', () => {
    test('should include security headers', async () => {
      const response = await request(app)
        .get('/health')
        .expect(200)

      // Check for security headers set by helmet
      expect(response.headers['x-content-type-options']).toBe('nosniff')
      expect(response.headers['x-frame-options']).toBe('DENY')
      expect(response.headers['x-xss-protection']).toBeDefined()
    })

    test('should have proper Content Security Policy', async () => {
      const response = await request(app)
        .get('/health')
        .expect(200)

      expect(response.headers['content-security-policy']).toContain("default-src 'self'")
    })

    test('should include CORS headers', async () => {
      const response = await request(app)
        .get('/api/v1')
        .expect(200)

      expect(response.headers['access-control-allow-origin']).toBeDefined()
      expect(response.headers['access-control-allow-methods']).toBeDefined()
      expect(response.headers['access-control-allow-headers']).toBeDefined()
    })
  })

  describe('Rate Limiting', () => {
    test('should handle request body size limits', async () => {
      // Create a large payload (> 10MB)
      const largePayload = {
        data: 'x'.repeat(11 * 1024 * 1024) // 11MB
      }

      const response = await request(app)
        .post('/api/v1/auth/register')
        .send(largePayload)
        .expect(413) // Payload Too Large

      expect(response.status).toBe(413)
    })

    test('should validate JSON structure', async () => {
      const response = await request(app)
        .post('/api/v1/auth/register')
        .set('Content-Type', 'application/json')
        .send('{"invalid": json}')
        .expect(400)

      expect(response.body.success).toBe(false)
    })
  })

  describe('Error Information Disclosure', () => {
    test('should not expose sensitive information in errors', async () => {
      const response = await request(app)
        .get('/api/v1/nonexistent')
        .expect(404)

      // Should not expose internal paths or sensitive info
      expect(response.body.error.message).not.toContain('src/')
      expect(response.body.error.message).not.toContain('node_modules')
      expect(response.body.error.message).not.toContain(process.env.JWT_SECRET)
    })

    test('should not expose stack traces in production mode', async () => {
      // Temporarily set production mode
      const originalEnv = process.env.NODE_ENV
      process.env.NODE_ENV = 'production'

      const response = await request(app)
        .get('/api/v1/nonexistent')
        .expect(404)

      expect(response.body.error.stack).toBeUndefined()

      // Restore original environment
      process.env.NODE_ENV = originalEnv
    })
  })

  describe('Session Security', () => {
    test('should generate unique request IDs', async () => {
      const responses = await Promise.all([
        request(app).get('/health'),
        request(app).get('/health'),
        request(app).get('/health')
      ])

      const requestIds = responses.map(r => r.body.meta.requestId)
      
      // All request IDs should be unique
      const uniqueIds = new Set(requestIds)
      expect(uniqueIds.size).toBe(requestIds.length)
      
      // Should follow expected format
      requestIds.forEach(id => {
        expect(id).toMatch(/^req_\d+_[a-z0-9]+$/)
      })
    })

    test('should handle concurrent requests safely', async () => {
      const concurrentRequests = Array(10).fill().map(() => 
        request(app).get('/health')
      )

      const responses = await Promise.all(concurrentRequests)
      
      // All requests should succeed
      responses.forEach(response => {
        expect(response.status).toBe(200)
        expect(response.body.success).toBe(true)
      })

      // All should have unique request IDs
      const requestIds = responses.map(r => r.body.meta.requestId)
      const uniqueIds = new Set(requestIds)
      expect(uniqueIds.size).toBe(requestIds.length)
    })
  })
}) 
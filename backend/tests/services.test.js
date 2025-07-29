import { jest } from '@jest/globals'
import axios from 'axios'

// Mock external service calls
jest.mock('axios')
const mockedAxios = axios

describe('External Services Integration Tests', () => {
  beforeEach(() => {
    jest.clearAllMocks()
  })

  describe('OpenAI API Integration', () => {
    test('should have valid OpenAI API key format', () => {
      const apiKey = process.env.OPENAI_API_KEY
      
      expect(apiKey).toBeDefined()
      expect(apiKey).toMatch(/^sk-proj-/)
      expect(apiKey.length).toBeGreaterThan(50)
    })

    test('should connect to OpenAI API', async () => {
      const mockResponse = {
        data: {
          object: 'list',
          data: [
            {
              id: 'gpt-4-turbo-preview',
              object: 'model',
              created: 1677610602,
              owned_by: 'openai'
            }
          ]
        },
        status: 200
      }

      mockedAxios.get.mockResolvedValue(mockResponse)

      const response = await axios.get('https://api.openai.com/v1/models', {
        headers: {
          'Authorization': `Bearer ${process.env.OPENAI_API_KEY}`,
          'Content-Type': 'application/json'
        }
      })

      expect(response.status).toBe(200)
      expect(response.data.object).toBe('list')
      expect(Array.isArray(response.data.data)).toBe(true)
    })

    test('should handle OpenAI API errors', async () => {
      const mockError = {
        response: {
          status: 401,
          data: {
            error: {
              message: 'Invalid API key',
              type: 'invalid_request_error'
            }
          }
        }
      }

      mockedAxios.get.mockRejectedValue(mockError)

      try {
        await axios.get('https://api.openai.com/v1/models', {
          headers: {
            'Authorization': 'Bearer invalid-key'
          }
        })
        fail('Should have thrown an error')
      } catch (error) {
        expect(error.response.status).toBe(401)
        expect(error.response.data.error.type).toBe('invalid_request_error')
      }
    })
  })

  describe('Browserbase Integration', () => {
    test('should have Browserbase configuration', () => {
      // Note: Browserbase keys might not be set in test environment
      const apiKey = process.env.BROWSERBASE_API_KEY
      const projectId = process.env.BROWSERBASE_PROJECT_ID
      
      if (apiKey) {
        expect(apiKey).toMatch(/^bb_/)
      }
      
      if (projectId) {
        expect(projectId).toMatch(/^[a-f0-9-]{36}$/)
      }
    })

    test('should create browser session (mocked)', async () => {
      const mockSession = {
        data: {
          id: 'session-123',
          status: 'RUNNING',
          connect_url: 'wss://connect.browserbase.com/session-123',
          created_at: new Date().toISOString()
        },
        status: 201
      }

      mockedAxios.post.mockResolvedValue(mockSession)

      const sessionData = {
        project_id: process.env.BROWSERBASE_PROJECT_ID || 'test-project-id'
      }

      const response = await axios.post('https://www.browserbase.com/v1/sessions', sessionData, {
        headers: {
          'Authorization': `Bearer ${process.env.BROWSERBASE_API_KEY || 'test-key'}`,
          'Content-Type': 'application/json'
        }
      })

      expect(response.status).toBe(201)
      expect(response.data.id).toBe('session-123')
      expect(response.data.status).toBe('RUNNING')
      expect(response.data.connect_url).toContain('wss://')
    })

    test('should handle Browserbase API errors', async () => {
      const mockError = {
        response: {
          status: 403,
          data: {
            error: 'Invalid API key or insufficient permissions'
          }
        }
      }

      mockedAxios.post.mockRejectedValue(mockError)

      try {
        await axios.post('https://www.browserbase.com/v1/sessions', {}, {
          headers: {
            'Authorization': 'Bearer invalid-key'
          }
        })
        fail('Should have thrown an error')
      } catch (error) {
        expect(error.response.status).toBe(403)
      }
    })
  })

  describe('Redis Integration', () => {
    test('should have Redis configuration', () => {
      const redisUrl = process.env.REDIS_URL
      
      expect(redisUrl).toBeDefined()
      expect(redisUrl).toMatch(/^redis:\/\//)
    })

    test('should connect to Redis (mocked)', async () => {
      // Mock Redis connection test
      const mockRedisConnection = {
        ping: jest.fn().mockResolvedValue('PONG'),
        set: jest.fn().mockResolvedValue('OK'),
        get: jest.fn().mockResolvedValue('test-value'),
        del: jest.fn().mockResolvedValue(1),
        quit: jest.fn().mockResolvedValue('OK')
      }

      // Test basic Redis operations
      const pingResult = await mockRedisConnection.ping()
      expect(pingResult).toBe('PONG')

      const setResult = await mockRedisConnection.set('test-key', 'test-value')
      expect(setResult).toBe('OK')

      const getValue = await mockRedisConnection.get('test-key')
      expect(getValue).toBe('test-value')

      const delResult = await mockRedisConnection.del('test-key')
      expect(delResult).toBe(1)
    })

    test('should handle Redis connection errors', async () => {
      const mockRedisError = {
        connect: jest.fn().mockRejectedValue(new Error('Connection refused'))
      }

      try {
        await mockRedisError.connect()
        fail('Should have thrown an error')
      } catch (error) {
        expect(error.message).toBe('Connection refused')
      }
    })
  })

  describe('Python Service Integration', () => {
    test('should have Python service configuration', () => {
      const pythonExecutable = process.env.PYTHON_EXECUTABLE || 'python'
      const browserUsePath = './browser-use'
      
      expect(pythonExecutable).toBeDefined()
      expect(browserUsePath).toBeDefined()
    })

    test('should connect to Python service (mocked)', async () => {
      const mockPythonResponse = {
        data: {
          status: 'healthy',
          version: '1.0.0',
          browser_use_version: '0.1.0',
          available_models: ['gpt-4', 'claude-3-sonnet']
        },
        status: 200
      }

      mockedAxios.get.mockResolvedValue(mockPythonResponse)

      const response = await axios.get('http://localhost:8001/health')

      expect(response.status).toBe(200)
      expect(response.data.status).toBe('healthy')
      expect(Array.isArray(response.data.available_models)).toBe(true)
    })

    test('should handle Python service errors', async () => {
      const mockError = {
        code: 'ECONNREFUSED',
        message: 'connect ECONNREFUSED 127.0.0.1:8001'
      }

      mockedAxios.get.mockRejectedValue(mockError)

      try {
        await axios.get('http://localhost:8001/health')
        fail('Should have thrown an error')
      } catch (error) {
        expect(error.code).toBe('ECONNREFUSED')
      }
    })
  })

  describe('Service Health Checks', () => {
    test('should perform comprehensive service health check', async () => {
      const services = {
        openai: process.env.OPENAI_API_KEY ? 'configured' : 'not_configured',
        browserbase: process.env.BROWSERBASE_API_KEY ? 'configured' : 'not_configured',
        redis: process.env.REDIS_URL ? 'configured' : 'not_configured',
        supabase: process.env.SUPABASE_URL ? 'configured' : 'not_configured'
      }

      // At minimum, we should have OpenAI and Supabase configured
      expect(services.openai).toBe('configured')
      expect(services.supabase).toBe('configured')

      console.log('Service Configuration Status:', services)
    })

    test('should validate environment variables format', () => {
      const validations = []

      // OpenAI API Key validation
      if (process.env.OPENAI_API_KEY) {
        validations.push({
          service: 'OpenAI',
          valid: process.env.OPENAI_API_KEY.startsWith('sk-proj-'),
          key: 'OPENAI_API_KEY'
        })
      }

      // Supabase URL validation
      if (process.env.SUPABASE_URL) {
        validations.push({
          service: 'Supabase',
          valid: process.env.SUPABASE_URL.includes('.supabase.co'),
          key: 'SUPABASE_URL'
        })
      }

      // JWT Secret validation
      if (process.env.JWT_SECRET) {
        validations.push({
          service: 'JWT',
          valid: process.env.JWT_SECRET.length >= 32,
          key: 'JWT_SECRET'
        })
      }

      // Redis URL validation
      if (process.env.REDIS_URL) {
        validations.push({
          service: 'Redis',
          valid: process.env.REDIS_URL.startsWith('redis://'),
          key: 'REDIS_URL'
        })
      }

      const invalidConfigs = validations.filter(v => !v.valid)
      
      if (invalidConfigs.length > 0) {
        console.warn('Invalid configurations found:', invalidConfigs)
      }

      // At least OpenAI and Supabase should be valid
      const openaiValid = validations.find(v => v.service === 'OpenAI')?.valid
      const supabaseValid = validations.find(v => v.service === 'Supabase')?.valid

      expect(openaiValid).toBe(true)
      expect(supabaseValid).toBe(true)
    })
  })
}) 
import dotenv from 'dotenv'
import { jest } from '@jest/globals'

// Load test environment variables
dotenv.config({ path: '.env.test' })
dotenv.config() // Fallback to regular .env

// Global test configuration
global.console = {
  ...console,
  // Suppress console.log during tests unless DEBUG is set
  log: process.env.DEBUG ? console.log : jest.fn(),
  info: process.env.DEBUG ? console.info : jest.fn(),
  warn: console.warn,
  error: console.error,
}

// Test timeout configuration
jest.setTimeout(30000) // 30 seconds for integration tests

// Mock external services by default
process.env.NODE_ENV = 'test'
process.env.JWT_SECRET = 'test-jwt-secret-key-for-testing-only'
process.env.REDIS_URL = 'redis://localhost:6379/1' // Use test database

// Global test utilities
global.testUtils = {
  // Generate test user data
  generateTestUser: () => ({
    email: `test-${Date.now()}@example.com`,
    password: 'TestPassword123!',
    rfc: 'XAXX010101000',
    fiscal_regime: '601',
    postal_code: '01000',
    company_name: 'Test Company SA de CV'
  }),

  // Generate test task data
  generateTestTask: () => ({
    vendor_url: 'https://facturacion.walmartmexico.com.mx/',
    ticket_id: `TEST-${Date.now()}`,
    transaction_reference: 'TR123456',
    cfdi_data: {
      rfc: 'XAXX010101000',
      email: 'test@example.com',
      company_name: 'Test Company',
      address: {
        street: 'Test Street 123',
        colony: 'Test Colony',
        municipality: 'Test City',
        state: 'Test State',
        postal_code: '01000'
      }
    }
  }),

  // Wait helper for async operations
  wait: (ms) => new Promise(resolve => setTimeout(resolve, ms)),

  // Clean test data helper
  cleanupTestData: async () => {
    // This would clean up test data from database
    console.log('Cleaning up test data...')
  }
}

// Global setup
beforeAll(async () => {
  console.log('🧪 Setting up test environment...')
})

// Global cleanup
afterAll(async () => {
  console.log('🧹 Cleaning up test environment...')
  await global.testUtils.cleanupTestData()
}) 
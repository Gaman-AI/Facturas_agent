export default {
  // Test environment
  testEnvironment: 'node',
  
  // Use ES modules
  preset: 'es-modules',
  extensionsToTreatAsEsm: ['.js'],
  
  // Transform configuration for ES modules
  transform: {},
  
  // Module file extensions
  moduleFileExtensions: ['js', 'json'],
  
  // Test file patterns
  testMatch: [
    '**/tests/**/*.test.js',
    '**/tests/**/*.spec.js'
  ],
  
  // Setup files
  setupFilesAfterEnv: ['<rootDir>/tests/setup.js'],
  
  // Coverage configuration
  collectCoverage: false, // Controlled by test runner
  coverageDirectory: 'coverage',
  coverageReporters: ['text', 'lcov', 'html', 'json'],
  
  // Coverage thresholds
  coverageThreshold: {
    global: {
      branches: 70,
      functions: 70,
      lines: 70,
      statements: 70
    }
  },
  
  // Files to collect coverage from
  collectCoverageFrom: [
    'src/**/*.js',
    '!src/**/*.test.js',
    '!src/**/*.spec.js',
    '!src/index.js', // Entry point
    '!**/node_modules/**'
  ],
  
  // Test timeout
  testTimeout: 30000,
  
  // Verbose output
  verbose: true,
  
  // Clear mocks between tests
  clearMocks: true,
  
  // Restore mocks after each test
  restoreMocks: true,
  
  // Error handling
  errorOnDeprecated: true,
  
  // Globals
  globals: {
    'ts-jest': {
      useESM: true
    }
  },
  
  // Module name mapping for absolute imports
  moduleNameMapping: {
    '^@/(.*)$': '<rootDir>/src/$1'
  },
  
  // Ignore patterns
  testPathIgnorePatterns: [
    '/node_modules/',
    '/coverage/',
    '/dist/',
    '/build/'
  ],
  
  // Watch mode ignore patterns
  watchPathIgnorePatterns: [
    '/node_modules/',
    '/coverage/',
    '/dist/',
    '/build/',
    'test-results.json'
  ],
  
  // Force exit after tests complete
  forceExit: true,
  
  // Detect open handles
  detectOpenHandles: true,
  
  // Maximum worker processes
  maxWorkers: 1, // Single worker to avoid conflicts
  
  // Bail after first test failure (set to false for full test run)
  bail: false,
  
  // Silent mode for cleaner output
  silent: false,
  
  // Reporter configuration
  reporters: [
    'default',
    ['jest-junit', {
      outputDirectory: 'coverage',
      outputName: 'junit.xml'
    }]
  ],
  
  // Mock configuration
  automock: false,
  unmockedModulePathPatterns: [
    'node_modules'
  ]
} 
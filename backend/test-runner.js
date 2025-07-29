#!/usr/bin/env node

import { spawn } from 'child_process'
import { existsSync, writeFileSync } from 'fs'
import { join, dirname } from 'path'
import { fileURLToPath } from 'url'

const __filename = fileURLToPath(import.meta.url)
const __dirname = dirname(__filename)

// Test configuration
const TEST_CONFIG = {
  timeout: 30000,
  verbose: true,
  coverage: true,
  parallel: false, // Set to true for faster execution
  maxWorkers: 1,
  testEnvironment: 'node'
}

// Color codes for console output
const colors = {
  reset: '\x1b[0m',
  bright: '\x1b[1m',
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  magenta: '\x1b[35m',
  cyan: '\x1b[36m'
}

class TestRunner {
  constructor() {
    this.results = {
      startTime: Date.now(),
      endTime: null,
      totalTests: 0,
      passedTests: 0,
      failedTests: 0,
      skippedTests: 0,
      suites: []
    }
  }

  log(message, color = 'reset') {
    console.log(`${colors[color]}${message}${colors.reset}`)
  }

  async checkEnvironment() {
    this.log('\n🔍 Checking Test Environment...', 'cyan')
    
    const requiredEnvVars = [
      'SUPABASE_URL',
      'SUPABASE_ANON_KEY',
      'JWT_SECRET',
      'OPENAI_API_KEY'
    ]

    const missing = requiredEnvVars.filter(key => !process.env[key])
    
    if (missing.length > 0) {
      this.log(`⚠️  Missing environment variables: ${missing.join(', ')}`, 'yellow')
      this.log('   Some tests may be skipped or use mock data', 'yellow')
    } else {
      this.log('✅ All required environment variables found', 'green')
    }

    // Check for test dependencies
    const testFiles = [
      'tests/setup.js',
      'tests/health.test.js',
      'tests/api.test.js',
      'tests/supabase.test.js',
      'tests/services.test.js',
      'tests/security.test.js',
      'tests/integration.test.js'
    ]

    const missingFiles = testFiles.filter(file => !existsSync(join(__dirname, file)))
    
    if (missingFiles.length > 0) {
      this.log(`❌ Missing test files: ${missingFiles.join(', ')}`, 'red')
      return false
    }

    this.log('✅ All test files found', 'green')
    return true
  }

  async runTestSuite(suiteName, testFile) {
    return new Promise((resolve) => {
      this.log(`\n🧪 Running ${suiteName}...`, 'blue')
      
      const startTime = Date.now()
      const jestArgs = [
        '--testPathPattern', testFile,
        '--verbose',
        '--no-cache',
        '--forceExit',
        '--detectOpenHandles',
        '--testTimeout', TEST_CONFIG.timeout.toString()
      ]

      if (TEST_CONFIG.coverage) {
        jestArgs.push('--coverage', '--coverageDirectory', 'coverage')
      }

      const jest = spawn('npx', ['jest', ...jestArgs], {
        stdio: 'pipe',
        cwd: __dirname
      })

      let output = ''
      let errorOutput = ''

      jest.stdout.on('data', (data) => {
        const text = data.toString()
        output += text
        if (TEST_CONFIG.verbose) {
          process.stdout.write(text)
        }
      })

      jest.stderr.on('data', (data) => {
        const text = data.toString()
        errorOutput += text
        if (TEST_CONFIG.verbose) {
          process.stderr.write(text)
        }
      })

      jest.on('close', (code) => {
        const endTime = Date.now()
        const duration = endTime - startTime

        const suiteResult = {
          name: suiteName,
          file: testFile,
          duration,
          exitCode: code,
          passed: code === 0,
          output,
          errorOutput
        }

        this.results.suites.push(suiteResult)

        if (code === 0) {
          this.log(`✅ ${suiteName} completed successfully (${duration}ms)`, 'green')
        } else {
          this.log(`❌ ${suiteName} failed with exit code ${code} (${duration}ms)`, 'red')
        }

        resolve(suiteResult)
      })

      jest.on('error', (error) => {
        this.log(`💥 Error running ${suiteName}: ${error.message}`, 'red')
        resolve({
          name: suiteName,
          file: testFile,
          duration: Date.now() - startTime,
          exitCode: 1,
          passed: false,
          error: error.message
        })
      })
    })
  }

  async runAllTests() {
    this.log('🚀 Starting CFDI Automation Backend Test Suite', 'bright')
    this.log('=' .repeat(60), 'cyan')

    // Check environment first
    const envOk = await this.checkEnvironment()
    if (!envOk) {
      this.log('\n❌ Environment check failed. Aborting tests.', 'red')
      return false
    }

    // Define test suites in order of execution
    const testSuites = [
      { name: 'Health Checks', file: 'tests/health.test.js' },
      { name: 'API Endpoints', file: 'tests/api.test.js' },
      { name: 'Supabase Integration', file: 'tests/supabase.test.js' },
      { name: 'External Services', file: 'tests/services.test.js' },
      { name: 'Security Tests', file: 'tests/security.test.js' },
      { name: 'Integration Tests', file: 'tests/integration.test.js' }
    ]

    // Run test suites
    for (const suite of testSuites) {
      try {
        await this.runTestSuite(suite.name, suite.file)
        
        // Small delay between suites to prevent resource conflicts
        await new Promise(resolve => setTimeout(resolve, 1000))
      } catch (error) {
        this.log(`💥 Failed to run ${suite.name}: ${error.message}`, 'red')
      }
    }

    this.results.endTime = Date.now()
    return this.generateReport()
  }

  generateReport() {
    const totalDuration = this.results.endTime - this.results.startTime
    const passedSuites = this.results.suites.filter(s => s.passed).length
    const failedSuites = this.results.suites.filter(s => !s.passed).length

    this.log('\n' + '='.repeat(60), 'cyan')
    this.log('📊 TEST EXECUTION SUMMARY', 'bright')
    this.log('='.repeat(60), 'cyan')

    this.log(`⏱️  Total Duration: ${totalDuration}ms`, 'blue')
    this.log(`📦 Test Suites: ${this.results.suites.length}`, 'blue')
    this.log(`✅ Passed: ${passedSuites}`, 'green')
    this.log(`❌ Failed: ${failedSuites}`, failedSuites > 0 ? 'red' : 'green')

    // Detailed suite results
    this.log('\n📋 Suite Details:', 'cyan')
    this.results.suites.forEach(suite => {
      const status = suite.passed ? '✅' : '❌'
      const color = suite.passed ? 'green' : 'red'
      this.log(`${status} ${suite.name} (${suite.duration}ms)`, color)
      
      if (!suite.passed && suite.errorOutput) {
        // Show first few lines of error for quick debugging
        const errorLines = suite.errorOutput.split('\n').slice(0, 3)
        errorLines.forEach(line => {
          if (line.trim()) {
            this.log(`   ${line.trim()}`, 'red')
          }
        })
      }
    })

    // Environment info
    this.log('\n🔧 Environment Information:', 'cyan')
    this.log(`Node.js: ${process.version}`, 'blue')
    this.log(`Platform: ${process.platform}`, 'blue')
    this.log(`Architecture: ${process.arch}`, 'blue')
    this.log(`Environment: ${process.env.NODE_ENV || 'development'}`, 'blue')

    // Service status
    this.log('\n🌐 Service Configuration:', 'cyan')
    const services = {
      'Supabase': process.env.SUPABASE_URL ? '✅ Configured' : '❌ Missing',
      'OpenAI': process.env.OPENAI_API_KEY ? '✅ Configured' : '❌ Missing',
      'Browserbase': process.env.BROWSERBASE_API_KEY ? '✅ Configured' : '⚠️  Optional',
      'Redis': process.env.REDIS_URL ? '✅ Configured' : '⚠️  Using default',
      'JWT': process.env.JWT_SECRET ? '✅ Configured' : '❌ Missing'
    }

    Object.entries(services).forEach(([service, status]) => {
      const color = status.includes('✅') ? 'green' : status.includes('⚠️') ? 'yellow' : 'red'
      this.log(`${service}: ${status}`, color)
    })

    // Generate JSON report
    const reportData = {
      ...this.results,
      environment: {
        nodeVersion: process.version,
        platform: process.platform,
        arch: process.arch,
        nodeEnv: process.env.NODE_ENV || 'development'
      },
      services,
      summary: {
        totalDuration,
        passedSuites,
        failedSuites,
        successRate: Math.round((passedSuites / this.results.suites.length) * 100)
      }
    }

    try {
      writeFileSync(
        join(__dirname, 'test-results.json'),
        JSON.stringify(reportData, null, 2)
      )
      this.log('\n📄 Detailed report saved to test-results.json', 'blue')
    } catch (error) {
      this.log(`⚠️  Could not save report: ${error.message}`, 'yellow')
    }

    // Final status
    this.log('\n' + '='.repeat(60), 'cyan')
    if (failedSuites === 0) {
      this.log('🎉 ALL TESTS PASSED! Backend is ready for development.', 'green')
      this.log('✨ You can now proceed with confidence.', 'green')
    } else {
      this.log(`⚠️  ${failedSuites} test suite(s) failed. Review the output above.`, 'yellow')
      this.log('🔧 Fix the issues and run tests again.', 'yellow')
    }
    this.log('='.repeat(60), 'cyan')

    return failedSuites === 0
  }
}

// Main execution
async function main() {
  const runner = new TestRunner()
  
  try {
    const success = await runner.runAllTests()
    process.exit(success ? 0 : 1)
  } catch (error) {
    console.error('💥 Test runner failed:', error)
    process.exit(1)
  }
}

// Handle process signals
process.on('SIGINT', () => {
  console.log('\n⏹️  Test execution interrupted by user')
  process.exit(1)
})

process.on('SIGTERM', () => {
  console.log('\n⏹️  Test execution terminated')
  process.exit(1)
})

// Run if called directly
if (import.meta.url === `file://${process.argv[1]}`) {
  main()
}

export default TestRunner 
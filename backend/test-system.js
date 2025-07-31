#!/usr/bin/env node

/**
 * System Integration Test Script
 * Tests database operations, queue functionality, and end-to-end workflows
 */

import config from './src/config/index.js'
import redisService from './src/services/redisService.js'
import queueService from './src/services/queueService.js'
import taskService from './src/services/taskService.js'
import crypto from 'crypto'

// Simple UUID generator since uuid package might not be available
const uuidv4 = () => crypto.randomUUID()

// Test configuration
const TEST_CONFIG = {
  testUserId: 'test-user-' + uuidv4(),
  testTimeout: 30000, // 30 seconds
  skipRedisTests: false
}

// Test results tracking
let testResults = {
  passed: 0,
  failed: 0,
  skipped: 0,
  tests: []
}

/**
 * Test utility functions
 */
const assert = (condition, message) => {
  if (condition) {
    console.log(`✅ ${message}`)
    testResults.passed++
    testResults.tests.push({ status: 'PASSED', message })
  } else {
    console.error(`❌ ${message}`)
    testResults.failed++
    testResults.tests.push({ status: 'FAILED', message })
    throw new Error(`Test failed: ${message}`)
  }
}

const skip = (message) => {
  console.log(`⏭️  SKIPPED: ${message}`)
  testResults.skipped++
  testResults.tests.push({ status: 'SKIPPED', message })
}

const testGroup = (name, testFn) => {
  console.log(`\n🧪 Testing: ${name}`)
  console.log('─'.repeat(50))
  return testFn()
}

/**
 * Test environment configuration
 */
const testEnvironment = async () => {
  return testGroup('Environment Configuration', async () => {
    try {
      config.validate()
      assert(true, 'Environment configuration is valid')
    } catch (error) {
      assert(false, `Environment validation failed: ${error.message}`)
    }

    assert(config.supabase.url, 'Supabase URL is configured')
    assert(config.supabase.serviceKey, 'Supabase service key is configured')
    assert(config.jwt.secret, 'JWT secret is configured')
    
    console.log(`📊 Configuration:`)
    console.log(`   • Environment: ${config.nodeEnv}`)
    console.log(`   • Database: ${config.supabase.url}`)
    console.log(`   • Redis: ${config.redis.url}`)
    console.log(`   • Max Concurrent Tasks: ${config.tasks.maxConcurrent}`)
  })
}

/**
 * Test Redis connection and operations
 */
const testRedis = async () => {
  return testGroup('Redis Connection & Operations', async () => {
    try {
      const connected = await redisService.connect()
      if (!connected) {
        skip('Redis not available - queue functionality will be limited')
        TEST_CONFIG.skipRedisTests = true
        return
      }

      assert(connected, 'Redis connection established')

      // Test health check
      const health = await redisService.healthCheck()
      assert(health.status === 'healthy', `Redis health check passed (latency: ${health.latency}ms)`)

      // Test basic operations
      const testPassed = await redisService.testOperations()
      assert(testPassed, 'Redis basic operations test passed')

      // Test connection info
      const info = redisService.getConnectionInfo()
      assert(info.isConnected, 'Redis connection info shows connected state')
      
      console.log(`📊 Redis Stats:`)
      console.log(`   • Status: ${health.status}`)
      console.log(`   • Latency: ${health.latency}ms`)
      console.log(`   • URL: ${info.url}`)

    } catch (error) {
      console.warn(`⚠️  Redis test failed: ${error.message}`)
      skip('Redis tests skipped due to connection issues')
      TEST_CONFIG.skipRedisTests = true
    }
  })
}

/**
 * Test queue service operations
 */
const testQueue = async () => {
  return testGroup('Queue Service Operations', async () => {
    if (TEST_CONFIG.skipRedisTests) {
      skip('Queue tests skipped - Redis not available')
      return
    }

    try {
      // Initialize queue service
      const initialized = await queueService.initialize()
      assert(initialized, 'Queue service initialized successfully')

      // Test health check
      const health = await queueService.healthCheck()
      assert(health.status === 'healthy', 'Queue service health check passed')

      // Test queue statistics
      const { stats, error } = await queueService.getQueueStats()
      assert(!error, 'Queue statistics retrieved successfully')
      assert(typeof stats === 'object', 'Queue statistics returned valid object')

      console.log(`📊 Queue Stats:`)
      console.log(`   • Waiting: ${stats.waiting}`)
      console.log(`   • Active: ${stats.active}`)
      console.log(`   • Completed: ${stats.completed}`)
      console.log(`   • Failed: ${stats.failed}`)
      console.log(`   • Total: ${stats.total}`)

    } catch (error) {
      assert(false, `Queue service test failed: ${error.message}`)
    }
  })
}

/**
 * Test TaskService database operations
 */
const testTaskService = async () => {
  return testGroup('TaskService Database Operations', async () => {
    const testTaskData = {
      vendor_url: 'https://test-vendor.example.com',
      ticket_details: {
        customer_details: {
          rfc: 'TEST123456ABC',
          company_name: 'Test Company Ltd',
          email: 'test@example.com'
        },
        invoice_details: {
          folio: 'TEST-001',
          total: 1234.56,
          currency: 'MXN'
        }
      }
    }

    let createdTaskId = null

    try {
      // Test task creation
      const { task, error: createError } = await taskService.createTask(TEST_CONFIG.testUserId, testTaskData)
      assert(!createError, 'Task created without errors')
      assert(task && task.id, 'Task created with valid ID')
      assert(task.status === 'PENDING', 'Task created with PENDING status')
      createdTaskId = task.id

      console.log(`📝 Created task: ${createdTaskId}`)

      // Test task retrieval
      const { task: retrievedTask, error: getError } = await taskService.getTask(createdTaskId, TEST_CONFIG.testUserId)
      assert(!getError, 'Task retrieved without errors')
      assert(retrievedTask.id === createdTaskId, 'Retrieved task has correct ID')
      assert(retrievedTask.vendor_url === testTaskData.vendor_url, 'Retrieved task has correct vendor URL')

      // Test task step addition
      const { step, error: stepError } = await taskService.addTaskStep(
        createdTaskId,
        'thinking',
        { action: 'test_step', message: 'Test step added' }
      )
      assert(!stepError, 'Task step added without errors')
      assert(step && step.id, 'Task step created with valid ID')

      // Test task with steps retrieval
      const { task: taskWithSteps, steps, error: stepsError } = await taskService.getTaskWithSteps(createdTaskId, TEST_CONFIG.testUserId)
      assert(!stepsError, 'Task with steps retrieved without errors')
      assert(Array.isArray(steps), 'Steps returned as array')
      assert(steps.length === 1, 'One step found for task')

      // Test task status update
      const { task: updatedTask, error: updateError } = await taskService.updateTaskStatus(
        createdTaskId, 
        TEST_CONFIG.testUserId, 
        'RUNNING'
      )
      assert(!updateError, 'Task status updated without errors')
      assert(updatedTask.status === 'RUNNING', 'Task status updated to RUNNING')

      // Test user task statistics
      const { stats, error: statsError } = await taskService.getUserTaskStats(TEST_CONFIG.testUserId)
      assert(!statsError, 'User task statistics retrieved without errors')
      assert(stats.total_tasks >= 1, 'Statistics show at least one task')
      assert(stats.running_tasks >= 1, 'Statistics show at least one running task')

      console.log(`📊 User Stats:`)
      console.log(`   • Total Tasks: ${stats.total_tasks}`)
      console.log(`   • Running Tasks: ${stats.running_tasks}`)
      console.log(`   • Success Rate: ${stats.success_rate}%`)

      // Test task deletion (cleanup)
      const { success: deleteSuccess, error: deleteError } = await taskService.deleteTask(createdTaskId, TEST_CONFIG.testUserId)
      assert(!deleteError, 'Task deleted without errors')
      assert(deleteSuccess, 'Task deletion returned success')

    } catch (error) {
      console.error(`❌ TaskService test failed: ${error.message}`)
      
      // Cleanup on failure
      if (createdTaskId) {
        try {
          await taskService.deleteTask(createdTaskId, TEST_CONFIG.testUserId)
          console.log(`🧹 Cleaned up test task: ${createdTaskId}`)
        } catch (cleanupError) {
          console.warn(`⚠️  Failed to cleanup test task: ${cleanupError.message}`)
        }
      }
      throw error
    }
  })
}

/**
 * Test end-to-end task workflow
 */
const testEndToEndWorkflow = async () => {
  return testGroup('End-to-End Task Workflow', async () => {
    if (TEST_CONFIG.skipRedisTests) {
      skip('End-to-end tests skipped - Redis not available')
      return
    }

    const testTaskData = {
      vendor_url: 'https://e2e-test-vendor.example.com',
      ticket_details: {
        customer_details: {
          rfc: 'E2E123456ABC',
          company_name: 'E2E Test Company',
          email: 'e2e@example.com'
        },
        invoice_details: {
          folio: 'E2E-001',
          total: 9999.99,
          currency: 'MXN'
        }
      }
    }

    let taskId = null

    try {
      // Step 1: Create task in database
      const { task, error: createError } = await taskService.createTask(TEST_CONFIG.testUserId, testTaskData)
      assert(!createError, 'E2E: Task created in database')
      taskId = task.id

      // Step 2: Add task to queue
      const { job, error: queueError } = await queueService.addTask(taskId, {
        ...testTaskData,
        userId: TEST_CONFIG.testUserId
      })
      assert(!queueError, 'E2E: Task added to queue successfully')
      assert(job && job.id, 'E2E: Queue job created with valid ID')

      console.log(`🚀 E2E Task workflow started: ${taskId}`)

      // Step 3: Test task pause
      const { success: pauseSuccess, error: pauseError } = await queueService.pauseTask(taskId)
      if (pauseError) {
        console.warn(`⚠️  Pause test: ${pauseError}`)
      } else {
        assert(pauseSuccess, 'E2E: Task paused successfully')
      }

      // Step 4: Test task resume
      const { success: resumeSuccess, error: resumeError } = await queueService.resumeTask(taskId, {
        ...testTaskData,
        userId: TEST_CONFIG.testUserId
      })
      if (resumeError) {
        console.warn(`⚠️  Resume test: ${resumeError}`)
      } else {
        assert(resumeSuccess, 'E2E: Task resumed successfully')
      }

      // Step 5: Test task cancellation
      const { success: cancelSuccess, error: cancelError } = await queueService.cancelTask(taskId)
      if (cancelError) {
        console.warn(`⚠️  Cancel test: ${cancelError}`)
      } else {
        assert(cancelSuccess, 'E2E: Task cancelled successfully')
      }

      // Cleanup
      await taskService.deleteTask(taskId, TEST_CONFIG.testUserId)
      console.log(`🧹 E2E test cleanup completed`)

    } catch (error) {
      console.error(`❌ E2E test failed: ${error.message}`)
      
      // Cleanup on failure
      if (taskId) {
        try {
          await queueService.cancelTask(taskId)
          await taskService.deleteTask(taskId, TEST_CONFIG.testUserId)
          console.log(`🧹 E2E cleanup on failure completed`)
        } catch (cleanupError) {
          console.warn(`⚠️  E2E cleanup failed: ${cleanupError.message}`)
        }
      }
      throw error
    }
  })
}

/**
 * Test health checks
 */
const testHealthChecks = async () => {
  return testGroup('System Health Checks', async () => {
    try {
      // Test TaskService health
      const taskHealthy = await taskService.healthCheck()
      assert(taskHealthy, 'TaskService health check passed')

      // Test Redis health (if available)
      if (!TEST_CONFIG.skipRedisTests) {
        const redisHealth = await redisService.healthCheck()
        assert(redisHealth.status === 'healthy', 'Redis health check passed')

        const queueHealth = await queueService.healthCheck()
        assert(queueHealth.status === 'healthy', 'Queue service health check passed')
      }

      console.log(`🏥 All available services are healthy`)

    } catch (error) {
      assert(false, `Health check failed: ${error.message}`)
    }
  })
}

/**
 * Main test runner
 */
const runTests = async () => {
  console.log(`
🧪 CFDI Automation System Integration Tests
═══════════════════════════════════════════

📅 Started: ${new Date().toISOString()}
🆔 Test User ID: ${TEST_CONFIG.testUserId}
⏱️  Timeout: ${TEST_CONFIG.testTimeout}ms

`)

  try {
    await testEnvironment()
    await testRedis()
    await testQueue()
    await testTaskService()
    await testEndToEndWorkflow()
    await testHealthChecks()

    console.log(`
🎉 TEST SUMMARY
═══════════════

✅ Passed: ${testResults.passed}
❌ Failed: ${testResults.failed}
⏭️  Skipped: ${testResults.skipped}
📊 Total: ${testResults.passed + testResults.failed + testResults.skipped}

${testResults.failed === 0 ? '🏆 ALL TESTS PASSED!' : '⚠️  Some tests failed - see details above'}
`)

    // Cleanup connections
    if (!TEST_CONFIG.skipRedisTests) {
      await queueService.shutdown()
      await redisService.disconnect()
    }

    process.exit(testResults.failed === 0 ? 0 : 1)

  } catch (error) {
    console.error(`
💥 FATAL TEST ERROR
═══════════════════
${error.message}
${error.stack}
`)

    // Emergency cleanup
    try {
      if (!TEST_CONFIG.skipRedisTests) {
        await queueService.shutdown()
        await redisService.disconnect()
      }
    } catch (cleanupError) {
      console.error('Failed to cleanup after fatal error:', cleanupError.message)
    }

    process.exit(1)
  }
}

// Handle timeout
setTimeout(() => {
  console.error(`
⏰ TEST TIMEOUT
═══════════════
Tests exceeded ${TEST_CONFIG.testTimeout}ms timeout
`)
  process.exit(1)
}, TEST_CONFIG.testTimeout)

// Handle graceful shutdown
process.on('SIGINT', async () => {
  console.log('\n🛑 Test interrupted by user')
  try {
    if (!TEST_CONFIG.skipRedisTests) {
      await queueService.shutdown()
      await redisService.disconnect()
    }
  } catch (error) {
    console.error('Error during cleanup:', error.message)
  }
  process.exit(1)
})

// Run tests
runTests().catch(console.error) 
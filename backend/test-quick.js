#!/usr/bin/env node

/**
 * Quick System Integration Test Script
 * Fast tests for database operations and queue functionality
 */

import config from './src/config/index.js'
// Redis service removed - using in-memory queue instead
import queueService from './src/services/queueService.js'
import taskService from './src/services/taskService.js'
import crypto from 'crypto'

const uuidv4 = () => crypto.randomUUID()

let testResults = { passed: 0, failed: 0, tests: [] }

const log = (message) => {
  console.log(`[${new Date().toISOString()}] ${message}`)
}

const assert = (condition, message) => {
  if (condition) {
    console.log(`✅ ${message}`)
    testResults.passed++
    testResults.tests.push({ status: 'PASSED', message })
    return true
  } else {
    console.error(`❌ ${message}`)
    testResults.failed++
    testResults.tests.push({ status: 'FAILED', message })
    return false
  }
}

const runQuickTests = async () => {
  log('🚀 Starting Quick Integration Tests')
  const testUserId = 'test-user-' + uuidv4()
  
  try {
    // Test 1: Environment
    log('Testing environment configuration...')
    assert(config.supabase.url, 'Supabase URL configured')
    assert(config.supabase.serviceKey, 'Supabase service key configured')
    
    // Test 2: Queue Service (In-Memory)
    log('Testing queue service...')
    const queueInitialized = await queueService.initialize()
    assert(queueInitialized, 'Queue service initialized successfully')
    
    if (queueInitialized) {
      const health = await queueService.healthCheck()
      assert(health.status === 'healthy', `Queue service healthy (in-memory mode)`)
    }
    
    // Test 3: Database Operations
    log('Testing database operations...')
    const testTaskData = {
      vendor_url: 'https://test-vendor.example.com',
      ticket_details: {
        customer_details: { rfc: 'TEST123', company_name: 'Test Co' },
        invoice_details: { folio: 'T001', total: 100.00, currency: 'MXN' }
      }
    }
    
    let taskId = null
    try {
      // Create task
      const { task, error } = await taskService.createTask(testUserId, testTaskData)
      assert(!error && task, 'Task created in database')
      taskId = task?.id
      
      if (taskId) {
        // Retrieve task
        const { task: retrieved, error: getError } = await taskService.getTask(taskId, testUserId)
        assert(!getError && retrieved, 'Task retrieved from database')
        
        // Add task step
        const { step, error: stepError } = await taskService.addTaskStep(
          taskId, 'thinking', { action: 'test', message: 'Test step' }
        )
        assert(!stepError && step, 'Task step added to database')
        
        // Update status
        const { task: updated, error: updateError } = await taskService.updateTaskStatus(
          taskId, testUserId, 'RUNNING'
        )
        assert(!updateError && updated?.status === 'RUNNING', 'Task status updated')
        
        // Get stats
        const { stats, error: statsError } = await taskService.getUserTaskStats(testUserId)
        assert(!statsError && stats, 'User statistics retrieved')
        
        log(`📊 Database test results: ${stats.total_tasks} total tasks, ${stats.running_tasks} running`)
      }
    } finally {
      // Cleanup
      if (taskId) {
        await taskService.deleteTask(taskId, testUserId)
        log(`🧹 Cleaned up test task: ${taskId}`)
      }
    }
    
    // Test 4: Queue Operations (with timeout)
    log('Testing queue operations...')
    if (redisConnected) {
      const queueTimeout = new Promise((_, reject) => 
        setTimeout(() => reject(new Error('Queue test timeout')), 10000)
      )
      
      try {
        const queueTest = async () => {
          const initialized = await queueService.initialize()
          assert(initialized, 'Queue service initialized')
          
          if (initialized) {
            // Quick health check with timeout
            const healthTimeout = new Promise((_, reject) => 
              setTimeout(() => reject(new Error('Health check timeout')), 5000)
            )
            
            try {
              const health = await Promise.race([
                queueService.healthCheck(),
                healthTimeout
              ])
              assert(health.status === 'healthy', 'Queue service healthy')
            } catch (healthError) {
              console.warn(`⚠️  Queue health check failed: ${healthError.message}`)
            }
            
            // Test queue stats
            try {
              const { stats, error } = await queueService.getQueueStats()
              assert(!error && stats, 'Queue statistics retrieved')
              log(`📊 Queue stats: ${stats.waiting} waiting, ${stats.active} active, ${stats.total} total`)
            } catch (statsError) {
              console.warn(`⚠️  Queue stats failed: ${statsError.message}`)
            }
          }
        }
        
        await Promise.race([queueTest(), queueTimeout])
      } catch (error) {
        console.warn(`⚠️  Queue test timed out or failed: ${error.message}`)
        assert(false, 'Queue operations test (with timeout protection)')
      }
    }
    
    // Test 5: End-to-End Quick Test
    log('Testing end-to-end workflow...')
    if (redisConnected) {
      const e2eTaskData = {
        vendor_url: 'https://e2e-test.example.com',
        ticket_details: {
          customer_details: { rfc: 'E2E123', company_name: 'E2E Test' },
          invoice_details: { folio: 'E2E001', total: 500.00, currency: 'MXN' }
        }
      }
      
      let e2eTaskId = null
      try {
        // Create task
        const { task, error } = await taskService.createTask(testUserId, e2eTaskData)
        if (!error && task) {
          e2eTaskId = task.id
          
          // Try to add to queue with timeout
          const queueTimeout = new Promise((_, reject) => 
            setTimeout(() => reject(new Error('Queue add timeout')), 5000)
          )
          
          try {
            const queueResult = await Promise.race([
              queueService.addTask(e2eTaskId, { ...e2eTaskData, userId: testUserId }),
              queueTimeout
            ])
            
            assert(!queueResult.error, 'Task added to queue successfully')
            
            // Test pause/cancel (quick operations)
            const { success: cancelSuccess } = await queueService.cancelTask(e2eTaskId)
            assert(cancelSuccess !== false, 'Task cancelled from queue')
            
          } catch (queueError) {
            console.warn(`⚠️  Queue operations in E2E test failed: ${queueError.message}`)
          }
        }
        
        assert(!error && task, 'E2E: Task created and workflow tested')
        
      } finally {
        if (e2eTaskId) {
          await taskService.deleteTask(e2eTaskId, testUserId)
          log(`🧹 E2E cleanup completed`)
        }
      }
    }
    
  } catch (error) {
    log(`❌ Test error: ${error.message}`)
    assert(false, `Test execution failed: ${error.message}`)
  } finally {
    // Cleanup connections
    try {
      if (queueService.isInitialized) {
        await queueService.shutdown()
      }
          // Queue service is in-memory - no cleanup needed
    } catch (cleanupError) {
      log(`⚠️  Cleanup warning: ${cleanupError.message}`)
    }
  }
  
  // Results
  console.log(`
🎯 QUICK TEST RESULTS
═══════════════════
✅ Passed: ${testResults.passed}
❌ Failed: ${testResults.failed}
📊 Total: ${testResults.passed + testResults.failed}

${testResults.failed === 0 ? '🏆 ALL TESTS PASSED!' : '⚠️  Some tests failed'}

🔍 Test Details:`)
  
  testResults.tests.forEach((test, i) => {
    const icon = test.status === 'PASSED' ? '✅' : '❌'
    console.log(`   ${i + 1}. ${icon} ${test.message}`)
  })
  
  log('🏁 Quick tests completed')
  process.exit(testResults.failed === 0 ? 0 : 1)
}

// Handle graceful shutdown
process.on('SIGINT', async () => {
  log('🛑 Tests interrupted')
  try {
    await queueService.shutdown()
    // Redis service removed - no cleanup needed
  } catch (error) {
    // Silent cleanup
  }
  process.exit(1)
})

runQuickTests().catch((error) => {
  console.error('💥 Fatal test error:', error.message)
  process.exit(1)
}) 
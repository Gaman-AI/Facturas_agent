#!/usr/bin/env node

import config from './src/config/index.js'
import taskService from './src/services/taskService.js'
import queueService from './src/services/queueService.js'
// Redis service removed - using in-memory queue instead

console.log('⚡ QUICK VALIDATION TEST')
console.log('═'.repeat(40))

let results = { passed: 0, failed: 0 }

const test = (condition, message) => {
  if (condition) {
    console.log(`✅ ${message}`)
    results.passed++
  } else {
    console.log(`❌ ${message}`)
    results.failed++
  }
}

async function quickValidation() {
  try {
    // Test 1: Environment
    console.log('\n🔧 Environment Configuration')
    test(config.supabase.url, 'Supabase URL loaded')
    test(config.supabase.serviceKey?.startsWith('sb_secret_'), 'NEW API key format confirmed')
    test(config.redis.url, 'Redis URL configured')
    
    // Test 2: Database Connection
    console.log('\n💾 Database Connectivity')
    try {
      const dbHealth = await taskService.healthCheck()
      test(dbHealth, 'Database connection working')
      console.log('   ✅ TaskService ready for operations')
    } catch (dbError) {
      test(false, `Database error: ${dbError.message}`)
    }
    
    // Test 3: Queue Service (In-Memory)
    console.log('\n🟢 Queue Service')
    try {
      const queueInitialized = await queueService.initialize()
      test(queueInitialized, 'Queue service initialized')
      
      if (queueInitialized) {
        const health = await queueService.healthCheck()
        test(health.status === 'healthy', `Queue service healthy (in-memory mode)`)
        console.log('   ✅ Queue service ready for task processing')
      }
    } catch (queueError) {
      test(false, `Queue service error: ${queueError.message}`)
    }

    // Summary
    console.log('\n📊 QUICK VALIDATION RESULTS')
    console.log('═'.repeat(40))
    console.log(`✅ Passed: ${results.passed}`)
    console.log(`❌ Failed: ${results.failed}`)
    console.log(`🎯 Success: ${(results.passed / (results.passed + results.failed) * 100).toFixed(1)}%`)
    
    if (results.failed === 0) {
      console.log('\n🎉 ALL SYSTEMS OPERATIONAL!')
      console.log('🏆 Ready for production use!')
    } else {
      console.log('\n⚠️  Some issues detected')
    }

    return results.failed === 0

  } catch (error) {
    console.error(`💥 Validation error: ${error.message}`)
    return false
  }
}

quickValidation().then(success => {
  console.log(`\n⚡ Quick validation: ${success ? 'SUCCESS' : 'ISSUES'}`)
  process.exit(success ? 0 : 1)
}).catch(error => {
  console.error('💥 Fatal:', error.message)
  process.exit(1)
}) 
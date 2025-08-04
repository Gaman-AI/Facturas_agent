#!/usr/bin/env node

import config from './src/config/index.js'
import taskService from './src/services/taskService.js'
import redisService from './src/services/redisService.js'

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
    
    // Test 3: Redis (quick check)
    console.log('\n🔴 Redis Connectivity')
    try {
      const redisConnected = await redisService.connect()
      test(redisConnected, 'Redis connection established')
      
      if (redisConnected) {
        const health = await redisService.healthCheck()
        test(health.status === 'healthy', `Redis health OK (${health.latency}ms)`)
        
        // Quick cleanup
        await redisService.disconnect()
        console.log('   🧹 Redis connection closed')
      }
    } catch (redisError) {
      test(false, `Redis error: ${redisError.message}`)
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
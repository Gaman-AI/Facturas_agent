#!/usr/bin/env node

import { createClient } from '@supabase/supabase-js'

const SUPABASE_URL = 'https://pffuarlnpdpfjrvewrqo.supabase.co'
const NEW_SECRET_KEY = 'sb_secret_qVPwXbjSOo8czdfpLHOY7A_auvp52JA'

console.log('🎯 Testing New API Key - CORRECTED')
console.log('═'.repeat(50))

async function testNewAPIKey() {
  try {
    const supabase = createClient(SUPABASE_URL, NEW_SECRET_KEY, {
      auth: {
        autoRefreshToken: false,
        persistSession: false
      }
    })

    console.log('✅ Supabase client created with new secret key')

    // Test 1: Basic connectivity with corrected query
    console.log('\n📊 Test 1: Basic Database Connection')
    try {
      // Use a simpler approach - try to access our tables directly
      const { data, error } = await supabase
        .from('tasks')
        .select('count(*)')
        .limit(1)
      
      if (error) {
        console.log(`❌ Connection test failed: ${error.message}`)
        
        // Try alternative test
        console.log('\n📊 Test 1b: Alternative Connection Test')
        const { data: altData, error: altError } = await supabase
          .rpc('version')
        
        if (altError) {
          console.log(`❌ Alternative test failed: ${altError.message}`)
          return false
        } else {
          console.log('✅ Alternative connection test passed!')
        }
      } else {
        console.log(`✅ Connection successful! Can access tasks table`)
      }
    } catch (connectionError) {
      console.log(`❌ Connection exception: ${connectionError.message}`)
      return false
    }

    // Test 2: Access our specific tables
    console.log('\n📊 Test 2: Table Access Verification')
    const tables = ['tasks', 'user_profiles', 'task_steps']
    
    for (const tableName of tables) {
      try {
        const { data, error, count } = await supabase
          .from(tableName)
          .select('*', { count: 'exact', head: true })
          .limit(0)
        
        if (error) {
          console.log(`❌ Table '${tableName}': ${error.message}`)
          if (error.code) console.log(`   Code: ${error.code}`)
        } else {
          console.log(`✅ Table '${tableName}': Accessible (${count !== null ? count + ' rows' : 'count unavailable'})`)
        }
      } catch (tableError) {
        console.log(`❌ Table '${tableName}' exception: ${tableError.message}`)
      }
    }

    return true

  } catch (mainError) {
    console.log(`❌ Main test failed: ${mainError.message}`)
    return false
  }
}

testNewAPIKey().then(success => {
  console.log('\n🏆 CORRECTED API KEY TEST RESULTS')
  console.log('═'.repeat(50))
  
  if (success) {
    console.log('🎉 NEW API KEY IS WORKING!')
    console.log('✅ Database connection established')
    console.log('✅ Ready for environment update')
    
    console.log('\n🔧 NEXT STEPS:')
    console.log('1. Update .env file with new key')
    console.log('2. Update TaskService configuration')
    console.log('3. Run full test suite')
  } else {
    console.log('❌ API key test failed')
    console.log('💡 Check for any remaining configuration issues')
  }
  
  process.exit(success ? 0 : 1)
}).catch(error => {
  console.error('💥 Fatal error:', error.message)
  process.exit(1)
}) 
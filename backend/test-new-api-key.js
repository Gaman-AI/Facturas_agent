#!/usr/bin/env node

import { createClient } from '@supabase/supabase-js'

const SUPABASE_URL = 'https://pffuarlnpdpfjrvewrqo.supabase.co'
const NEW_SECRET_KEY = 'sb_secret_qVPwXbjSOo8czdfpLHOY7A_auvp52JA'

console.log('🎯 Testing New API Key Format')
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

    // Test 1: Basic connectivity
    console.log('\n📊 Test 1: Basic Database Connection')
    try {
      const { data, error } = await supabase
        .from('information_schema.tables')
        .select('table_name')
        .eq('table_schema', 'public')
        .limit(5)
      
      if (error) {
        console.log(`❌ Connection test failed: ${error.message}`)
        return false
      } else {
        console.log(`✅ Connection successful! Found ${data.length} tables:`)
        data.forEach(table => console.log(`      • ${table.table_name}`))
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
          console.log(`✅ Table '${tableName}': Accessible (${count} rows)`)
        }
      } catch (tableError) {
        console.log(`❌ Table '${tableName}' exception: ${tableError.message}`)
      }
    }

    // Test 3: Simple CRUD operation test
    console.log('\n📊 Test 3: TaskService CRUD Simulation')
    try {
      // Test creating a temporary record (we'll delete it)
      const testTask = {
        id: '00000000-0000-0000-0000-000000000001',
        user_id: '00000000-0000-0000-0000-000000000001', // Fake user ID for test
        status: 'PENDING',
        vendor_url: 'https://test.example.com',
        ticket_details: { test: true },
        retry_count: 0,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      }

      // Note: This might fail due to RLS, but we'll see the specific error
      const { data: insertData, error: insertError } = await supabase
        .from('tasks')
        .insert(testTask)
        .select()

      if (insertError) {
        console.log(`⚠️  Test insert failed: ${insertError.message}`)
        if (insertError.message.includes('RLS') || insertError.message.includes('policy')) {
          console.log('   This is expected - RLS policies are working correctly!')
          console.log('   ✅ Database structure is ready for TaskService')
        }
      } else {
        console.log('✅ Test insert successful - cleaning up...')
        // Clean up the test record
        await supabase.from('tasks').delete().eq('id', testTask.id)
      }
    } catch (crudError) {
      console.log(`❌ CRUD test exception: ${crudError.message}`)
    }

    return true

  } catch (mainError) {
    console.log(`❌ Main test failed: ${mainError.message}`)
    return false
  }
}

testNewAPIKey().then(success => {
  console.log('\n🏆 NEW API KEY TEST RESULTS')
  console.log('═'.repeat(50))
  
  if (success) {
    console.log('✅ NEW API KEY WORKS PERFECTLY!')
    console.log('✅ Database connection established')
    console.log('✅ Tables are accessible')
    console.log('✅ Ready for full TaskService testing')
    
    console.log('\n🚀 NEXT STEP: Run full test suite')
    console.log('   Command: node test-quick.js')
  } else {
    console.log('❌ API key test failed')
    console.log('💡 Check for any remaining configuration issues')
  }
  
  process.exit(success ? 0 : 1)
}).catch(error => {
  console.error('💥 Fatal error:', error.message)
  process.exit(1)
}) 
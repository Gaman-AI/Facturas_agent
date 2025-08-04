#!/usr/bin/env node

import { createClient } from '@supabase/supabase-js'

const SUPABASE_URL = 'https://pffuarlnpdpfjrvewrqo.supabase.co'
const SERVICE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InBmZnVhcmxucGRwZmpydmV3cnFvIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc0NzA4NTA2MywiZXhwIjoyMDYyNjYxMDYzfQ.swxnvpow1NH5mmy-QZ6YBbCjVA1VzGkhyTrXxh3JCl3I'

console.log('🔍 RLS Bypass Test - Using Raw SQL')
console.log('═'.repeat(50))

async function testRLSBypass() {
  try {
    const supabase = createClient(SUPABASE_URL, SERVICE_KEY, {
      auth: {
        autoRefreshToken: false,
        persistSession: false
      }
    })

    console.log('✅ Supabase client created')

    // Test 1: Bypass RLS with raw SQL
    console.log('\n📊 Test 1: Raw SQL Query (bypasses RLS)')
    try {
      const { data, error } = await supabase
        .rpc('custom_query', {
          query_text: 'SELECT COUNT(*) as table_count FROM information_schema.tables WHERE table_schema = \'public\''
        })
      
      if (error) {
        console.log(`❌ Custom RPC failed: ${error.message}`)
        
        // Try alternative: Direct SQL execution
        console.log('\n📊 Test 1b: Alternative SQL approach')
        const { data: sqlData, error: sqlError } = await supabase
          .from('information_schema.tables')
          .select('count(*)')
          .eq('table_schema', 'public')
        
        if (sqlError) {
          console.log(`❌ SQL query failed: ${sqlError.message}`)
        } else {
          console.log('✅ SQL query successful via information_schema')
        }
        
      } else {
        console.log(`✅ Custom RPC successful: ${JSON.stringify(data)}`)
      }
    } catch (rpcError) {
      console.log(`❌ RPC exception: ${rpcError.message}`)
    }

    // Test 2: Try to create a simple function to test permissions
    console.log('\n📊 Test 2: Function Creation Test')
    try {
      const { data, error } = await supabase.rpc('test_connection')
      
      if (error) {
        if (error.message.includes('function test_connection() does not exist')) {
          console.log('✅ Good! Function error means we have basic connection')
          console.log('   (The function doesn\'t exist, but we can reach the database)')
        } else {
          console.log(`❌ Function test failed: ${error.message}`)
        }
      } else {
        console.log('✅ Function test passed (unexpected but good)')
      }
    } catch (funcError) {
      console.log(`❌ Function test exception: ${funcError.message}`)
    }

    // Test 3: Try direct table access with explicit schema
    console.log('\n📊 Test 3: Direct Table Access')
    const tables = ['public.tasks', 'public.user_profiles', 'public.task_steps']
    
    for (const tableName of tables) {
      try {
        const { data, error, count } = await supabase
          .schema('public')
          .from(tableName.replace('public.', ''))
          .select('*', { count: 'exact', head: true })
          .limit(0)
        
        if (error) {
          console.log(`❌ Table '${tableName}': ${error.message}`)
          if (error.code) console.log(`   Code: ${error.code}`)
          if (error.details) console.log(`   Details: ${error.details}`)
        } else {
          console.log(`✅ Table '${tableName}': Accessible (${count} rows)`)
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

// Run the test
testRLSBypass().then(success => {
  console.log('\n🎯 RLS Bypass Test Results:')
  
  if (success) {
    console.log('✅ Basic connection works')
    console.log('💡 Next steps:')
    console.log('   1. Check "API Keys" tab (not Legacy)')
    console.log('   2. Verify RLS policies allow service_role access')
    console.log('   3. Check if project has special security settings')
  } else {
    console.log('❌ Connection still failing')
    console.log('💡 This suggests API key or project configuration issue')
  }
  
  console.log('\n🔧 Actions:')
  console.log('1. Switch to "API Keys" tab in dashboard')
  console.log('2. Check for any security restrictions')
  console.log('3. Consider regenerating API keys')
  
  process.exit(success ? 0 : 1)
}).catch(error => {
  console.error('💥 Fatal test error:', error.message)
  process.exit(1)
}) 
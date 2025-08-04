#!/usr/bin/env node

import { createClient } from '@supabase/supabase-js'

const SUPABASE_URL = 'https://pffuarlnpdpfjrvewrqo.supabase.co'
const SERVICE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InBmZnVhcmxucGRwZmpydmV3cnFvIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc0NzA4NTA2MywiZXhwIjoyMDYyNjYxMDYzfQ.swxnvpow1NH5mmy-QZ6YBbCjVA1VzGkhyTrXxh3JCl3I'

console.log('🔍 Basic Supabase Connection Test')
console.log('═'.repeat(50))

async function testConnection() {
  try {
    // Create client with service key
    const supabase = createClient(SUPABASE_URL, SERVICE_KEY, {
      auth: {
        autoRefreshToken: false,
        persistSession: false
      },
      db: {
        schema: 'public'
      }
    })

    console.log('✅ Supabase client created')

    // Test 1: Try to query system tables (should always work)
    console.log('\n📊 Test 1: System Tables Query')
    try {
      const { data, error } = await supabase
        .from('information_schema.tables')
        .select('table_name')
        .eq('table_schema', 'public')
        .limit(3)
      
      if (error) {
        console.log(`❌ System query failed: ${error.message}`)
        console.log(`   Code: ${error.code}`)
        console.log(`   Details: ${error.details}`)
        
        // If this fails with "Invalid API key", it's definitely an auth issue
        if (error.message.includes('Invalid API key')) {
          console.log('\n🔍 DIAGNOSIS: Authentication Issue')
          console.log('   This suggests:')
          console.log('   • API key might be wrong/expired')
          console.log('   • Project might be paused/suspended') 
          console.log('   • API access might be restricted')
          return false
        }
      } else {
        console.log(`✅ System query successful - found ${data.length} tables`)
        data.forEach(table => console.log(`      • ${table.table_name}`))
      }
    } catch (systemError) {
      console.log(`❌ System query exception: ${systemError.message}`)
      return false
    }

    // Test 2: Try simple PostgreSQL query
    console.log('\n📊 Test 2: PostgreSQL Version Query')
    try {
      const { data, error } = await supabase.rpc('version')
      if (error) {
        console.log(`❌ PostgreSQL version query failed: ${error.message}`)
      } else {
        console.log(`✅ PostgreSQL version query successful`)
      }
    } catch (versionError) {
      console.log(`❌ Version query exception: ${versionError.message}`)
    }

    // Test 3: Try to access our tables (might fail due to RLS)
    console.log('\n📊 Test 3: Table Access Test')
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

    return true

  } catch (mainError) {
    console.log(`❌ Main test failed: ${mainError.message}`)
    return false
  }
}

// Run the test
testConnection().then(success => {
  console.log('\n🎯 Test Results:')
  if (success) {
    console.log('✅ Basic connection appears to work')
    console.log('💡 If table access failed, check RLS policies')
  } else {
    console.log('❌ Basic connection failed')
    console.log('💡 Check API key and project status')
  }
  
  console.log('\n🔧 Troubleshooting Steps:')
  console.log('1. Verify project is not paused in dashboard')
  console.log('2. Check API settings in Supabase dashboard')
  console.log('3. Regenerate service key if needed')
  console.log('4. Check RLS policies on tables')
  
  process.exit(success ? 0 : 1)
}).catch(error => {
  console.error('💥 Fatal test error:', error.message)
  process.exit(1)
}) 
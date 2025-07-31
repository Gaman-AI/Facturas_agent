#!/usr/bin/env node

import { createClient } from '@supabase/supabase-js'

const SUPABASE_URL = 'https://pffuarlnpdpfjrvewrqo.supabase.co'
const SERVICE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InBmZnVhcmxucGRwZmpydmV3cnFvIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc0NzA4NTA2MywiZXhwIjoyMDYyNjYxMDYzfQ.swxnvpow1NH5mmy-QZ6YBbCjVA1VzGkhyTrXxh3JCl3I'

console.log('🔍 Comprehensive Supabase Debug Analysis')
console.log('═'.repeat(50))

// Test 1: Basic connection
console.log('\n📊 Step 1: Testing Basic Connection')
try {
  const supabase = createClient(SUPABASE_URL, SERVICE_KEY, {
    auth: { autoRefreshToken: false, persistSession: false }
  })
  console.log('✅ Supabase client created successfully')
  
  // Test 2: Check if we can reach the database at all
  console.log('\n📊 Step 2: Testing Database Connectivity')
  try {
    const { data, error } = await supabase.rpc('version')
    if (error) {
      console.log(`❌ Database RPC call failed: ${error.message}`)
      console.log(`   Code: ${error.code}`)
      console.log(`   Details: ${error.details}`)
      console.log(`   Hint: ${error.hint}`)
    } else {
      console.log('✅ Database RPC call successful')
      console.log(`   PostgreSQL version info available: ${!!data}`)
    }
  } catch (rpcError) {
    console.log(`❌ RPC call exception: ${rpcError.message}`)
  }

  // Test 3: Check if tables exist
  console.log('\n📊 Step 3: Checking Table Existence')
  
  const tables = ['user_profiles', 'tasks', 'task_steps']
  
  for (const table of tables) {
    try {
      const { data, error, count } = await supabase
        .from(table)
        .select('*', { count: 'exact', head: true })
        .limit(0)
      
      if (error) {
        console.log(`❌ Table '${table}': ${error.message}`)
        console.log(`   Code: ${error.code}`)
        if (error.details) console.log(`   Details: ${error.details}`)
        if (error.hint) console.log(`   Hint: ${error.hint}`)
      } else {
        console.log(`✅ Table '${table}': Accessible (${count !== null ? count + ' rows' : 'count unknown'})`)
      }
    } catch (tableError) {
      console.log(`❌ Table '${table}' exception: ${tableError.message}`)
    }
  }

  // Test 4: Test with a simple, safe query
  console.log('\n📊 Step 4: Testing Simple Query')
  try {
    const { data, error } = await supabase
      .from('information_schema.tables')
      .select('table_name')
      .eq('table_schema', 'public')
      .limit(5)
    
    if (error) {
      console.log(`❌ Schema query failed: ${error.message}`)
    } else {
      console.log('✅ Schema query successful')
      console.log(`   Found ${data.length} public tables:`)
      data.forEach(table => console.log(`      • ${table.table_name}`))
    }
  } catch (schemaError) {
    console.log(`❌ Schema query exception: ${schemaError.message}`)
  }

  // Test 5: Test auth/user access
  console.log('\n📊 Step 5: Testing Auth Context')
  try {
    const { data: { user }, error } = await supabase.auth.getUser()
    if (error) {
      console.log(`⚠️  Auth getUser: ${error.message} (expected for service key)`)
    } else {
      console.log(`✅ Auth user: ${user ? 'Available' : 'None (expected for service key)'}`)
    }
  } catch (authError) {
    console.log(`⚠️  Auth exception: ${authError.message} (may be expected)`)
  }

} catch (mainError) {
  console.log(`❌ Main execution failed: ${mainError.message}`)
  console.log(`   Stack: ${mainError.stack}`)
}

console.log('\n💡 Debug Analysis Complete')
console.log('═'.repeat(50))
console.log('\nNext steps based on results:')
console.log('• If tables don\'t exist → Need to run database schema')
console.log('• If RLS errors → Need to configure Row Level Security') 
console.log('• If connection fails → Check project URL/key validity')
console.log('• If schema query works → Tables may need creation') 
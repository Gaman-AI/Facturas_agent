#!/usr/bin/env node

import config from './src/config/index.js'
import { createClient } from '@supabase/supabase-js'

console.log('🔍 Supabase Credential Check')
console.log('═'.repeat(40))

console.log('📊 Configuration:')
console.log(`   • URL: ${config.supabase.url}`)
console.log(`   • Service Key exists: ${!!config.supabase.serviceKey}`)
console.log(`   • Service Key length: ${config.supabase.serviceKey?.length || 0}`)
console.log(`   • Anon Key exists: ${!!config.supabase.anonKey}`)
console.log(`   • Anon Key length: ${config.supabase.anonKey?.length || 0}`)

console.log('\n🔌 Testing Connection...')

try {
  const supabase = createClient(
    config.supabase.url,
    config.supabase.serviceKey,
    {
      auth: {
        autoRefreshToken: false,
        persistSession: false
      }
    }
  )

  // Test a simple query
  const { data, error } = await supabase
    .from('tasks')
    .select('count', { count: 'exact' })
    .limit(1)

  if (error) {
    console.log(`❌ Connection failed: ${error.message}`)
    console.log(`   Error code: ${error.code}`)
    console.log(`   Error details: ${error.details}`)
    console.log(`   Error hint: ${error.hint}`)
  } else {
    console.log('✅ Connection successful!')
    console.log(`   • Test query returned data type: ${typeof data}`)
  }

} catch (error) {
  console.log(`❌ Unexpected error: ${error.message}`)
}

console.log('\n💡 If connection failed, check:')
console.log('   1. Supabase project URL is correct')
console.log('   2. Service role key is valid (not anon key)')
console.log('   3. Database tables exist (user_profiles, automation_tasks)')
console.log('   4. RLS policies are properly configured') 
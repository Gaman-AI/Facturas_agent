#!/usr/bin/env node

import { createClient } from '@supabase/supabase-js'

const SUPABASE_URL = 'https://pffuarlnpdpfjrvewrqo.supabase.co'
const NEW_SECRET_KEY = 'sb_secret_qVPwXbjSOo8czdfpLHOY7A_auvp52JA'

console.log('🔍 TABLE STRUCTURE ANALYSIS')
console.log('═'.repeat(50))

async function checkTableStructure() {
  const supabase = createClient(SUPABASE_URL, NEW_SECRET_KEY)
  
  console.log('📋 Checking actual table columns vs TaskService expectations...\n')

  // Get actual table structure
  const tables = ['tasks', 'user_profiles', 'task_steps']
  
  for (const tableName of tables) {
    console.log(`📊 Table: ${tableName}`)
    console.log('─'.repeat(30))
    
    try {
      // Get table info using information_schema if possible
      const { data, error } = await supabase
        .from(tableName)
        .select('*')
        .limit(1)
      
      if (error) {
        console.log(`❌ Error accessing ${tableName}: ${error.message}`)
      } else {
        console.log(`✅ ${tableName} accessible`)
        if (data && data.length > 0) {
          console.log('   Columns found in sample data:')
          Object.keys(data[0]).forEach(col => console.log(`      • ${col}`))
        } else {
          console.log('   Table is empty - will check structure differently')
          
          // Try insert with minimal data to see what's required
          const testInsert = async (testData) => {
            const { data: insertData, error: insertError } = await supabase
              .from(tableName)
              .insert(testData)
              .select()
            
            if (insertError) {
              console.log(`   Column info from insert error: ${insertError.message}`)
              return false
            } else {
              console.log('   Insert successful - cleaning up...')
              if (insertData && insertData[0]) {
                await supabase.from(tableName).delete().eq('id', insertData[0].id)
              }
              return true
            }
          }
          
          if (tableName === 'tasks') {
            await testInsert({
              user_id: '00000000-0000-0000-0000-000000000000',
              status: 'PENDING',
              vendor_url: 'https://test.com',
              ticket_details: {}
            })
          }
        }
      }
    } catch (tableError) {
      console.log(`❌ Exception for ${tableName}: ${tableError.message}`)
    }
    
    console.log('') // Empty line between tables
  }

  // Show what TaskService expects
  console.log('🎯 TASKSERVICE EXPECTATIONS:')
  console.log('─'.repeat(50))
  
  console.log('📋 tasks table should have:')
  console.log('   • id (UUID)')
  console.log('   • user_id (UUID)')
  console.log('   • status (VARCHAR)')
  console.log('   • vendor_url (TEXT)')
  console.log('   • ticket_details (JSONB)')
  console.log('   • current_live_url (TEXT)')
  console.log('   • failure_reason (TEXT)')
  console.log('   • retry_count (INTEGER) ← This might be missing')
  console.log('   • created_at (TIMESTAMPTZ)')
  console.log('   • updated_at (TIMESTAMPTZ)')
  console.log('   • completed_at (TIMESTAMPTZ)')

  console.log('\n📋 task_steps table should have:')
  console.log('   • id (UUID)')
  console.log('   • task_id (UUID)')
  console.log('   • step_type (VARCHAR)')
  console.log('   • content (JSONB)')
  console.log('   • screenshot_url (TEXT)')
  console.log('   • timestamp (TIMESTAMPTZ)')
  console.log('   • duration_ms (INTEGER)')

  console.log('\n📋 user_profiles table should have:')
  console.log('   • id (UUID)')
  console.log('   • user_id (UUID)')
  console.log('   • full_name (TEXT)')
  console.log('   • rfc (VARCHAR)')
  console.log('   • fiscal_regime (VARCHAR)')
  console.log('   • postal_code (VARCHAR)')
  console.log('   • company_details (JSONB)')

  return true
}

checkTableStructure().then(() => {
  console.log('\n🔧 NEXT ACTIONS:')
  console.log('1. Update .env file with new API key')
  console.log('2. Check if table structure matches TaskService')
  console.log('3. Add missing columns if needed')
  console.log('4. Run full test suite')
  
  process.exit(0)
}).catch(error => {
  console.error('💥 Error:', error.message)
  process.exit(1)
}) 
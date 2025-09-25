#!/usr/bin/env node
/**
 * Script to check if the tickets table has the file_url column
 */

import { createClient } from '@supabase/supabase-js'
import dotenv from 'dotenv'

// Load environment variables
dotenv.config()

const supabaseUrl = process.env.SUPABASE_URL
const supabaseKey = process.env.SUPABASE_ANON_KEY

if (!supabaseUrl || !supabaseKey) {
  console.error('❌ Missing Supabase credentials in environment variables')
  process.exit(1)
}

const supabase = createClient(supabaseUrl, supabaseKey)

async function checkDatabaseSchema() {
  try {
    console.log('🔍 Checking database schema...')
    
    // Try to get a sample ticket to see what columns exist
    const { data: tickets, error } = await supabase
      .from('tickets')
      .select('*')
      .limit(1)
    
    if (error) {
      console.error('❌ Error fetching tickets:', error.message)
      return
    }
    
    if (tickets.length === 0) {
      console.log('📊 No tickets found in database')
      return
    }
    
    const ticket = tickets[0]
    console.log('📊 Sample ticket columns:')
    console.log(JSON.stringify(Object.keys(ticket), null, 2))
    
    console.log('\n🔍 Checking for file_url:')
    if ('file_url' in ticket) {
      console.log('✅ file_url column exists')
      console.log('📄 file_url value:', ticket.file_url)
    } else {
      console.log('❌ file_url column does NOT exist')
    }
    
    console.log('\n🔍 Checking for other important columns:')
    const importantColumns = ['id', 'file_name', 'comercio', 'total', 'fecha', 'created_at']
    importantColumns.forEach(col => {
      if (col in ticket) {
        console.log(`✅ ${col}: ${ticket[col]}`)
      } else {
        console.log(`❌ ${col}: missing`)
      }
    })
    
  } catch (error) {
    console.error('❌ Error checking database schema:', error.message)
    process.exit(1)
  }
}

// Run the script
checkDatabaseSchema()

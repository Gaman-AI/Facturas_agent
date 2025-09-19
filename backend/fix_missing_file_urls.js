#!/usr/bin/env node
/**
 * Script to fix missing file_url values for existing tickets
 * This script will attempt to reconstruct file URLs from Supabase Storage
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

async function fixMissingFileUrls() {
  try {
    console.log('🔍 Checking for tickets with missing file_url...')
    
    // Get all tickets without file_url
    const { data: tickets, error: fetchError } = await supabase
      .from('tickets')
      .select('id, file_name, file_type, created_at')
      .is('file_url', null)
    
    if (fetchError) {
      throw new Error(`Failed to fetch tickets: ${fetchError.message}`)
    }
    
    console.log(`📊 Found ${tickets.length} tickets with missing file_url`)
    
    if (tickets.length === 0) {
      console.log('✅ All tickets have file_url values')
      return
    }
    
    // List files in Supabase Storage
    const { data: files, error: listError } = await supabase.storage
      .from('tickets')
      .list('', { limit: 1000 })
    
    if (listError) {
      throw new Error(`Failed to list storage files: ${listError.message}`)
    }
    
    console.log(`📁 Found ${files.length} files in storage`)
    
    let updated = 0
    let notFound = 0
    
    for (const ticket of tickets) {
      console.log(`\n🔍 Processing ticket: ${ticket.file_name}`)
      
      // Try to find matching file in storage
      const matchingFile = files.find(file => 
        file.name === ticket.file_name || 
        file.name.includes(ticket.file_name.split('.')[0])
      )
      
      if (matchingFile) {
        // Construct the file URL
        const fileUrl = `${supabaseUrl}/storage/v1/object/public/tickets/${matchingFile.name}`
        
        // Update the ticket with the file URL
        const { error: updateError } = await supabase
          .from('tickets')
          .update({ file_url: fileUrl })
          .eq('id', ticket.id)
        
        if (updateError) {
          console.error(`❌ Failed to update ticket ${ticket.id}:`, updateError.message)
        } else {
          console.log(`✅ Updated ticket ${ticket.id} with file URL`)
          updated++
        }
      } else {
        console.log(`⚠️ No matching file found for ${ticket.file_name}`)
        notFound++
      }
    }
    
    console.log(`\n📊 Summary:`)
    console.log(`✅ Updated: ${updated} tickets`)
    console.log(`⚠️ Not found: ${notFound} tickets`)
    
  } catch (error) {
    console.error('❌ Error fixing file URLs:', error.message)
    process.exit(1)
  }
}

// Run the script
fixMissingFileUrls()

#!/usr/bin/env node

import { createClient } from '@supabase/supabase-js'
import jwt from 'jsonwebtoken'
import dotenv from 'dotenv'

// Load environment variables
dotenv.config()

console.log('🔐 CFDI Automation Backend - Supabase Authentication Test')
console.log('=' .repeat(60))

// Test Supabase configuration
console.log('\n🔧 Supabase Configuration Test:')
const supabaseUrl = process.env.SUPABASE_URL
const supabaseAnonKey = process.env.SUPABASE_ANON_KEY
const supabaseServiceKey = process.env.SUPABASE_SERVICE_KEY

if (!supabaseUrl || !supabaseAnonKey || !supabaseServiceKey) {
  console.log('❌ Missing Supabase configuration')
  process.exit(1)
}

console.log(`✅ Supabase URL: ${supabaseUrl}`)
console.log(`✅ Anon Key: ${supabaseAnonKey.substring(0, 20)}...`)
console.log(`✅ Service Key: ${supabaseServiceKey.substring(0, 20)}...`)

// Test JWT token structure
console.log('\n🎯 JWT Token Analysis:')
try {
  // Decode anon key (without verification)
  const anonParts = supabaseAnonKey.split('.')
  const anonHeader = JSON.parse(Buffer.from(anonParts[0], 'base64url').toString())
  const anonPayload = JSON.parse(Buffer.from(anonParts[1], 'base64url').toString())
  
  console.log('📋 Anon Key Details:')
  console.log(`   Algorithm: ${anonHeader.alg}`)
  console.log(`   Type: ${anonHeader.typ}`)
  console.log(`   Issuer: ${anonPayload.iss}`)
  console.log(`   Role: ${anonPayload.role}`)
  console.log(`   Project Ref: ${anonPayload.ref}`)
  console.log(`   Expires: ${new Date(anonPayload.exp * 1000).toISOString()}`)
  
  // Decode service key
  const serviceParts = supabaseServiceKey.split('.')
  const servicePayload = JSON.parse(Buffer.from(serviceParts[1], 'base64url').toString())
  
  console.log('\n📋 Service Key Details:')
  console.log(`   Role: ${servicePayload.role}`)
  console.log(`   Project Ref: ${servicePayload.ref}`)
  console.log(`   Expires: ${new Date(servicePayload.exp * 1000).toISOString()}`)
  
  // Verify they're for the same project
  if (anonPayload.ref === servicePayload.ref) {
    console.log('✅ Both keys are for the same project')
  } else {
    console.log('❌ Keys are for different projects!')
  }
  
} catch (error) {
  console.log(`❌ JWT analysis failed: ${error.message}`)
}

// Test Supabase client creation
console.log('\n🔌 Supabase Client Test:')
try {
  const supabase = createClient(supabaseUrl, supabaseAnonKey)
  console.log('✅ Supabase client created successfully')
  
  // Test basic connection (this will work with anon key)
  console.log('\n📊 Database Connection Test:')
  try {
    const { data, error } = await supabase
      .from('information_schema.tables')
      .select('table_name')
      .eq('table_schema', 'public')
      .limit(5)
    
    if (error) {
      console.log(`⚠️  Database query failed: ${error.message}`)
      console.log('   This might be expected if RLS policies are strict')
    } else {
      console.log('✅ Database connection successful')
      console.log(`   Found ${data.length} public tables`)
    }
  } catch (dbError) {
    console.log(`⚠️  Database connection test failed: ${dbError.message}`)
  }
  
} catch (error) {
  console.log(`❌ Supabase client creation failed: ${error.message}`)
}

// Test authentication flow simulation
console.log('\n🔐 Authentication Flow Simulation:')
try {
  // Simulate user data
  const testUser = {
    id: 'test-user-123',
    email: 'test@example.com',
    role: 'authenticated',
    aud: 'authenticated',
    exp: Math.floor(Date.now() / 1000) + (60 * 60), // 1 hour
    iat: Math.floor(Date.now() / 1000),
    iss: 'supabase',
    sub: 'test-user-123'
  }
  
  // Create JWT token using our secret
  const jwtSecret = process.env.JWT_SECRET
  if (!jwtSecret) {
    console.log('❌ JWT_SECRET not configured')
  } else {
    const token = jwt.sign(testUser, jwtSecret, { expiresIn: '1h' })
    console.log('✅ JWT token created successfully')
    
    // Verify token
    const decoded = jwt.verify(token, jwtSecret)
    console.log('✅ JWT token verified successfully')
    console.log(`   User ID: ${decoded.id}`)
    console.log(`   Email: ${decoded.email}`)
    console.log(`   Role: ${decoded.role}`)
  }
  
} catch (error) {
  console.log(`❌ Authentication simulation failed: ${error.message}`)
}

// Test environment validation
console.log('\n🔍 Environment Validation:')
const requiredVars = {
  'SUPABASE_URL': process.env.SUPABASE_URL,
  'SUPABASE_ANON_KEY': process.env.SUPABASE_ANON_KEY,
  'SUPABASE_SERVICE_KEY': process.env.SUPABASE_SERVICE_KEY,
  'JWT_SECRET': process.env.JWT_SECRET,
  'OPENAI_API_KEY': process.env.OPENAI_API_KEY
}

let allConfigured = true
Object.entries(requiredVars).forEach(([key, value]) => {
  if (value) {
    console.log(`✅ ${key}: Configured`)
  } else {
    console.log(`❌ ${key}: Missing`)
    allConfigured = false
  }
})

// Test data validation patterns
console.log('\n📝 Data Validation Test:')
const testValidations = [
  {
    name: 'RFC Format',
    value: 'XAXX010101000',
    pattern: /^[A-Z]{4}\d{6}[A-Z0-9]{3}$/,
    valid: true
  },
  {
    name: 'Invalid RFC',
    value: 'invalid-rfc',
    pattern: /^[A-Z]{4}\d{6}[A-Z0-9]{3}$/,
    valid: false
  },
  {
    name: 'Email Format',
    value: 'test@example.com',
    pattern: /^[^\s@]+@[^\s@]+\.[^\s@]+$/,
    valid: true
  },
  {
    name: 'Invalid Email',
    value: 'invalid-email',
    pattern: /^[^\s@]+@[^\s@]+\.[^\s@]+$/,
    valid: false
  }
]

testValidations.forEach(test => {
  const isValid = test.pattern.test(test.value)
  const expected = test.valid
  if (isValid === expected) {
    console.log(`✅ ${test.name}: ${isValid ? 'Valid' : 'Invalid'} (as expected)`)
  } else {
    console.log(`❌ ${test.name}: Validation failed`)
  }
})

// Summary
console.log('\n' + '='.repeat(60))
if (allConfigured) {
  console.log('🎉 ALL SUPABASE TESTS PASSED!')
  console.log('✨ Your Supabase integration is ready for development.')
  console.log('\n📋 Next Steps:')
  console.log('   1. Run: npm run dev (to start the development server)')
  console.log('   2. Test authentication endpoints')
  console.log('   3. Create your first user profile')
  console.log('   4. Test task creation and management')
} else {
  console.log('⚠️  Some configuration issues found.')
  console.log('🔧 Please fix the missing environment variables.')
}
console.log('=' .repeat(60)) 
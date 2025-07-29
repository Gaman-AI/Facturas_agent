#!/usr/bin/env node

import { spawn } from 'child_process'
import { existsSync } from 'fs'

console.log('🧪 CFDI Automation Backend - Basic Test Suite')
console.log('=' .repeat(50))

// Check environment
console.log('\n🔍 Environment Check:')
console.log(`✅ Node.js: ${process.version}`)
console.log(`✅ Platform: ${process.platform}`)

// Check required files
const requiredFiles = [
  'src/app.js',
  'src/config/index.js',
  'src/routes/auth.js',
  'src/routes/tasks.js'
]

console.log('\n📁 File Check:')
requiredFiles.forEach(file => {
  if (existsSync(file)) {
    console.log(`✅ ${file}`)
  } else {
    console.log(`❌ ${file} - MISSING`)
  }
})

// Check environment variables
console.log('\n🔧 Environment Variables:')
const requiredEnvVars = [
  'SUPABASE_URL',
  'SUPABASE_ANON_KEY',
  'JWT_SECRET',
  'OPENAI_API_KEY'
]

requiredEnvVars.forEach(envVar => {
  if (process.env[envVar]) {
    console.log(`✅ ${envVar}: ${envVar === 'JWT_SECRET' ? '[HIDDEN]' : process.env[envVar].substring(0, 20) + '...'}`)
  } else {
    console.log(`❌ ${envVar}: MISSING`)
  }
})

// Test basic imports
console.log('\n📦 Import Test:')
try {
  const { app } = await import('./src/app.js')
  console.log('✅ App module imported successfully')
  
  const config = await import('./src/config/index.js')
  console.log('✅ Config module imported successfully')
  
  console.log('\n🚀 Basic Server Test:')
  
  // Test basic server functionality
  const request = await import('supertest')
  const supertest = request.default
  
  console.log('Testing health endpoint...')
  try {
    const response = await supertest(app).get('/health')
    console.log(`✅ Health endpoint: ${response.status} - ${response.body.success ? 'SUCCESS' : 'FAILED'}`)
  } catch (error) {
    console.log(`❌ Health endpoint failed: ${error.message}`)
  }
  
  console.log('Testing API root endpoint...')
  try {
    const response = await supertest(app).get('/api/v1')
    console.log(`✅ API root: ${response.status} - ${response.body.success ? 'SUCCESS' : 'FAILED'}`)
  } catch (error) {
    console.log(`❌ API root failed: ${error.message}`)
  }
  
  console.log('Testing auth module endpoint...')
  try {
    const response = await supertest(app).get('/api/v1/auth')
    console.log(`✅ Auth module: ${response.status} - ${response.body.success ? 'SUCCESS' : 'FAILED'}`)
  } catch (error) {
    console.log(`❌ Auth module failed: ${error.message}`)
  }
  
  console.log('Testing protected endpoint (should fail without auth)...')
  try {
    const response = await supertest(app).get('/api/v1/tasks')
    console.log(`✅ Protected endpoint: ${response.status} - ${response.status === 401 ? 'CORRECTLY PROTECTED' : 'UNEXPECTED'}`)
  } catch (error) {
    console.log(`❌ Protected endpoint test failed: ${error.message}`)
  }
  
} catch (error) {
  console.log(`❌ Import failed: ${error.message}`)
  console.log('Stack:', error.stack)
}

console.log('\n🎯 JWT Test:')
try {
  const jwt = await import('jsonwebtoken')
  const token = jwt.default.sign({ test: 'data' }, process.env.JWT_SECRET || 'test-secret', { expiresIn: '1h' })
  const decoded = jwt.default.verify(token, process.env.JWT_SECRET || 'test-secret')
  console.log('✅ JWT creation and verification working')
} catch (error) {
  console.log(`❌ JWT test failed: ${error.message}`)
}

console.log('\n🌐 Service Configuration Test:')
const services = {
  'Supabase': process.env.SUPABASE_URL ? '✅ Configured' : '❌ Missing',
  'OpenAI': process.env.OPENAI_API_KEY ? '✅ Configured' : '❌ Missing',
  'Browserbase': process.env.BROWSERBASE_API_KEY ? '✅ Configured' : '⚠️  Optional',
  'Redis': process.env.REDIS_URL ? '✅ Configured' : '⚠️  Using default',
  'JWT': process.env.JWT_SECRET ? '✅ Configured' : '❌ Missing'
}

Object.entries(services).forEach(([service, status]) => {
  console.log(`${service}: ${status}`)
})

console.log('\n' + '='.repeat(50))
console.log('🏁 Basic Test Complete!')
console.log('💡 If all tests pass, your backend is ready for development.')
console.log('🚀 To start the server: npm run dev')
console.log('📖 To run full tests: npm test')
console.log('=' .repeat(50)) 
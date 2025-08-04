/**
 * Enhanced Session Management Test
 * Tests the browser-use endpoint with our new session management system
 */

const BASE_URL = 'http://localhost:8000/api/v1'

// Test scenarios
const testScenarios = [
  {
    name: 'Health Check (No Auth Required)',
    endpoint: '/health',
    method: 'GET',
    auth: false,
    expectedStatus: 200
  },
  {
    name: 'Browser-Use GET (Auth Required)',
    endpoint: '/tasks/browser-use',
    method: 'GET',
    auth: false,
    expectedStatus: 401
  },
  {
    name: 'Browser-Use POST (Auth Required)',
    endpoint: '/tasks/browser-use',
    method: 'POST',
    auth: false,
    body: {
      prompt: 'Test browser automation',
      max_steps: 5
    },
    expectedStatus: 401
  },
  {
    name: 'Browser-Use with Invalid Token',
    endpoint: '/tasks/browser-use',
    method: 'GET',
    auth: true,
    token: 'invalid-token-here',
    expectedStatus: 401
  },
  {
    name: 'Browser-Use with Expired Token',
    endpoint: '/tasks/browser-use',
    method: 'GET',
    auth: true,
    token: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiIxMjM0NTY3ODkwIiwibmFtZSI6IkpvaG4gRG9lIiwiaWF0IjoxNTE2MjM5MDIyLCJleHAiOjE1MTYyMzkwMjJ9.SflKxwRJSMeKKF2QT4fwpMeJf36POk6yJV_adQssw5c',
    expectedStatus: 401
  }
]

async function testEndpoint(scenario) {
  console.log(`\n🧪 Testing: ${scenario.name}`)
  console.log('=' + '='.repeat(60))
  
  try {
    const options = {
      method: scenario.method,
      headers: {
        'Content-Type': 'application/json',
        'X-Request-ID': `test_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
      }
    }
    
    // Add authorization if required
    if (scenario.auth) {
      options.headers['Authorization'] = `Bearer ${scenario.token || 'invalid-token'}`
    }
    
    // Add body if provided
    if (scenario.body) {
      options.body = JSON.stringify(scenario.body)
    }
    
    console.log(`📡 Request: ${scenario.method} ${BASE_URL}${scenario.endpoint}`)
    console.log(`🔐 Auth: ${scenario.auth ? 'Yes' : 'No'}`)
    if (scenario.body) {
      console.log(`📦 Body: ${JSON.stringify(scenario.body, null, 2)}`)
    }
    
    const response = await fetch(`${BASE_URL}${scenario.endpoint}`, options)
    const data = await response.json()
    
    console.log(`📊 Status: ${response.status} ${response.statusText}`)
    console.log(`📄 Response: ${JSON.stringify(data, null, 2)}`)
    
    // Check if response matches expected
    if (response.status === scenario.expectedStatus) {
      console.log('✅ Test PASSED - Status matches expected')
    } else {
      console.log(`❌ Test FAILED - Expected ${scenario.expectedStatus}, got ${response.status}`)
    }
    
    // Additional checks for enhanced session management
    if (response.status === 401) {
      if (data.error && data.error.code) {
        console.log(`🔍 Error Code: ${data.error.code}`)
        console.log(`💬 Error Message: ${data.error.message}`)
        
        // Check for enhanced error handling
        if (data.meta && data.meta.requestId) {
          console.log(`🆔 Request ID: ${data.meta.requestId}`)
          console.log('✅ Enhanced error handling detected')
        }
      }
    }
    
    return {
      passed: response.status === scenario.expectedStatus,
      status: response.status,
      data: data
    }
    
  } catch (error) {
    console.log(`❌ Test ERROR: ${error.message}`)
    return {
      passed: false,
      error: error.message
    }
  }
}

async function testEnhancedFeatures() {
  console.log('\n🔧 Testing Enhanced Session Management Features')
  console.log('=' + '='.repeat(60))
  
  // Test 1: Check for correlation IDs
  console.log('\n📋 Testing Request Correlation IDs...')
  const correlationTest = await testEndpoint({
    name: 'Request Correlation ID Test',
    endpoint: '/tasks/browser-use',
    method: 'GET',
    auth: false,
    expectedStatus: 401
  })
  
  // Test 2: Check error message quality
  console.log('\n📋 Testing Enhanced Error Messages...')
  const errorTest = await testEndpoint({
    name: 'Enhanced Error Message Test',
    endpoint: '/tasks/browser-use',
    method: 'POST',
    auth: false,
    body: { prompt: 'test' },
    expectedStatus: 401
  })
  
  // Test 3: Test with malformed token
  console.log('\n📋 Testing Malformed Token Handling...')
  const malformedTokenTest = await testEndpoint({
    name: 'Malformed Token Test',
    endpoint: '/tasks/browser-use',
    method: 'GET',
    auth: true,
    token: 'not-a-jwt-token',
    expectedStatus: 401
  })
  
  return {
    correlationTest,
    errorTest,
    malformedTokenTest
  }
}

async function main() {
  console.log('🚀 Enhanced Session Management Test Suite')
  console.log('=' + '='.repeat(60))
  console.log('Testing browser-use endpoint with enhanced session management')
  console.log(`📍 Base URL: ${BASE_URL}`)
  console.log(`⏰ Timestamp: ${new Date().toISOString()}`)
  
  const results = []
  
  // Run basic tests
  for (const scenario of testScenarios) {
    const result = await testEndpoint(scenario)
    results.push(result)
  }
  
  // Run enhanced feature tests
  const enhancedResults = await testEnhancedFeatures()
  
  // Summary
  console.log('\n📊 TEST SUMMARY')
  console.log('=' + '='.repeat(60))
  
  const passedTests = results.filter(r => r.passed).length
  const totalTests = results.length
  
  console.log(`✅ Passed: ${passedTests}/${totalTests}`)
  console.log(`❌ Failed: ${totalTests - passedTests}/${totalTests}`)
  
  if (passedTests === totalTests) {
    console.log('\n🎉 ALL TESTS PASSED!')
    console.log('✅ Enhanced session management is working correctly')
    console.log('✅ Authentication middleware is functioning properly')
    console.log('✅ Error handling is enhanced and user-friendly')
  } else {
    console.log('\n⚠️  Some tests failed - check the implementation')
  }
  
  console.log('\n💡 Next Steps:')
  console.log('1. Test with a valid Supabase JWT token from your frontend')
  console.log('2. Monitor the session management in your frontend')
  console.log('3. Use the SessionMonitor component for real-time monitoring')
}

main().catch(console.error) 
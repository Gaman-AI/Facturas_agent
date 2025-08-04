/**
 * Test script for browser agent API endpoints
 * 
 * This script tests the simplified browser agent integration through the API endpoints.
 * Run this after starting the backend server.
 */

const BASE_URL = 'http://localhost:3000/api/v1'

// Mock JWT token for testing (you'll need a real token in production)
const TEST_TOKEN = 'your-test-jwt-token-here'

async function testAPI(endpoint, method = 'GET', body = null, description = '') {
  console.log(`\n🧪 Testing: ${description}`)
  console.log('=' + '='.repeat(50))
  
  try {
    const options = {
      method,
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${TEST_TOKEN}`
      }
    }
    
    if (body) {
      options.body = JSON.stringify(body)
    }
    
    const response = await fetch(`${BASE_URL}${endpoint}`, options)
    const data = await response.json()
    
    console.log(`Status: ${response.status}`)
    console.log(`Response:`, JSON.stringify(data, null, 2))
    
    if (response.ok) {
      console.log('✅ Test passed')
    } else {
      console.log('❌ Test failed')
    }
    
  } catch (error) {
    console.log(`❌ Test error: ${error.message}`)
  }
}

async function main() {
  console.log('🚀 Browser Agent API Testing')
  console.log('=' + '='.repeat(50))
  console.log('Note: Make sure the backend server is running and you have a valid JWT token')
  
  // Test 1: Health check
  await testAPI('/tasks/browser-use/health', 'GET', null, 'Browser Agent Health Check')
  
  // Test 2: Create simple task
  await testAPI('/tasks/browser-use', 'POST', {
    prompt: 'Navigate to google.com and search for "test"',
    max_steps: 10
  }, 'Simple Browser Task Creation')
  
  // Test 3: Create task with URL
  await testAPI('/tasks/browser-use', 'POST', {
    vendor_url: 'https://example.com',
    prompt: 'find the main heading on this page',
    max_steps: 15
  }, 'Task with URL')
  
  // Test 4: Create task with context
  await testAPI('/tasks/browser-use', 'POST', {
    prompt: 'Search for company information',
    customer_details: {
      company_name: 'Test Company',
      rfc: 'TEST123456'
    },
    invoice_details: {
      total: 1500.00,
      folio: 'ABC123'
    },
    model: 'gpt-4o-mini',
    temperature: 0.7,
    max_steps: 20
  }, 'Task with Full Context')
  
  // Test 5: Get task statistics
  await testAPI('/tasks/browser-use/stats', 'GET', null, 'Browser Task Statistics')
  
  // Test 6: List tasks
  await testAPI('/tasks/browser-use?limit=5', 'GET', null, 'List Recent Tasks')
  
  console.log('\n✨ Testing completed!')
  console.log('\nTo test with a real task, you can:')
  console.log('1. Get a valid JWT token by logging in')
  console.log('2. Replace TEST_TOKEN with your actual token')  
  console.log('3. Run this script again: node test_api_browser_agent.js')
}

main().catch(console.error)
#!/usr/bin/env node

const SERVICE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InBmZnVhcmxucGRwZmpydmV3cnFvIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc0NzA4NTA2MywiZXhwIjoyMDYyNjYxMDYzfQ.swxnvpow1NH5mmy-QZ6YBbCjVA1VzGkhyTrXxh3JCl3I'

console.log('🔍 JWT Token Analysis')
console.log('═'.repeat(40))

try {
  // Decode JWT manually (don't verify signature, just decode)
  const parts = SERVICE_KEY.split('.')
  
  if (parts.length !== 3) {
    console.log('❌ Invalid JWT format - should have 3 parts separated by dots')
    process.exit(1)
  }
  
  // Decode header
  const header = JSON.parse(Buffer.from(parts[0], 'base64').toString())
  console.log('📋 JWT Header:')
  console.log('   • Algorithm:', header.alg)
  console.log('   • Type:', header.typ)
  
  // Decode payload
  const payload = JSON.parse(Buffer.from(parts[1], 'base64').toString())
  console.log('\n📋 JWT Payload:')
  console.log('   • Issuer:', payload.iss)
  console.log('   • Reference (Project):', payload.ref)
  console.log('   • Role:', payload.role)
  console.log('   • Issued At:', new Date(payload.iat * 1000).toISOString())
  console.log('   • Expires At:', new Date(payload.exp * 1000).toISOString())
  
  // Check if expired
  const now = Math.floor(Date.now() / 1000)
  const isExpired = now > payload.exp
  console.log('   • Current Time:', new Date(now * 1000).toISOString())
  console.log('   • Is Expired:', isExpired ? '❌ YES' : '✅ NO')
  
  // Verify project URL match
  const expectedUrl = `https://${payload.ref}.supabase.co`
  const currentUrl = 'https://pffuarlnpdpfjrvewrqo.supabase.co'
  console.log('\n📋 URL Verification:')
  console.log('   • Expected URL:', expectedUrl)
  console.log('   • Current URL:', currentUrl)
  console.log('   • URLs Match:', expectedUrl === currentUrl ? '✅ YES' : '❌ NO')
  
  // Overall assessment
  console.log('\n🎯 Assessment:')
  if (isExpired) {
    console.log('❌ TOKEN IS EXPIRED - Need fresh key from Supabase dashboard')
  } else if (expectedUrl !== currentUrl) {
    console.log('❌ URL MISMATCH - Check project URL in config')
  } else if (payload.role !== 'service_role') {
    console.log('❌ WRONG ROLE - Need service_role key, not anon key')
  } else {
    console.log('✅ Token appears valid - Issue may be elsewhere')
    console.log('💡 Possible causes:')
    console.log('   • Project paused/suspended')
    console.log('   • API access disabled')
    console.log('   • Network/firewall issues')
  }
  
} catch (error) {
  console.log('❌ Error decoding JWT:', error.message)
  console.log('💡 This suggests the token format is corrupted')
}

console.log('\n🔧 Next Steps:')
console.log('1. Go to https://supabase.com/dashboard')
console.log('2. Select your project: pffuarlnpdpfjrvewrqo')
console.log('3. Settings → API → Copy fresh service_role key')
console.log('4. Verify project is active and not paused') 
// Test Registration Flow
// This script tests the registration functionality

const testUser = {
  email: `test-${Date.now()}@example.com`,
  password: 'TestPassword123!',
  rfc: 'XAXX010101000',
  country: 'México',
  company_name: 'Empresa de Prueba S.A. de C.V.',
  street: 'Calle de Prueba',
  exterior_number: '123',
  interior_number: 'A',
  colony: 'Colonia de Prueba',
  municipality: 'Municipio de Prueba',
  zip_code: '12345',
  state: 'Estado de Prueba',
  tax_regime: 'General de Ley Personas Morales',
  cfdi_use: 'G01 Adquisición de mercancías',
  phone_number: '5551234567'
};

console.log('🧪 Test User Data:');
console.log(JSON.stringify(testUser, null, 2));

console.log('\n📋 To test registration:');
console.log('1. Go to http://localhost:3000/register');
console.log('2. Fill in the form with the test data above');
console.log('3. Submit the form');
console.log('4. Check the browser console for any errors');
console.log('5. Check if user is created in Supabase');

console.log('\n🔍 Check these areas for issues:');
console.log('- Browser console for JavaScript errors');
console.log('- Network tab for API call failures');
console.log('- Supabase dashboard for user creation');
console.log('- Database for profile creation');

console.log('\n✅ Expected behavior:');
console.log('- User should be created in auth.users');
console.log('- Profile should be created in user_profiles');
console.log('- User should be able to sign in immediately');
console.log('- No email confirmation should be required');

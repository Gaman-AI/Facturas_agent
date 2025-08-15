# Test registration script for new users table structure
# This tests the complete registration flow with our new schema

$apiUrl = "http://localhost:8000/api/v1/auth/register"

$testUser = @{
    email = "test.user@example.com"
    password = "TestPassword123!"
    rfc = "XAXX010101000"
    country = "México"
    company_name = "Test Company S.A. de C.V."
    street = "Av. Reforma 123"
    exterior_number = "123"
    interior_number = "A"
    colony = "Centro"
    municipality = "Miguel Hidalgo"
    zip_code = "11560"
    state = "Ciudad de México"
    tax_regime = "601 - General de Ley Personas Morales"
    cfdi_use = "G01 - Adquisición de mercancías"
    phone_number = "+52 55 1234 5678"
}

Write-Host "🧪 Testing User Registration with New Schema..." -ForegroundColor Yellow
Write-Host "📧 Email: $($testUser.email)"
Write-Host "🏢 Company: $($testUser.company_name)"
Write-Host "📱 RFC: $($testUser.rfc)"
Write-Host "📍 Address: $($testUser.street) $($testUser.exterior_number), $($testUser.colony)"
Write-Host ""

try {
    Write-Host "🚀 Sending registration request..." -ForegroundColor Blue
    
    $jsonBody = $testUser | ConvertTo-Json -Depth 3
    Write-Host "📤 Request body:" -ForegroundColor Gray
    Write-Host $jsonBody -ForegroundColor Gray
    Write-Host ""
    
    $response = Invoke-RestMethod -Uri $apiUrl -Method POST -ContentType "application/json" -Body $jsonBody
    
    Write-Host "✅ Registration successful!" -ForegroundColor Green
    Write-Host "📋 Response details:" -ForegroundColor Green
    Write-Host ($response | ConvertTo-Json -Depth 3)
    
    Write-Host ""
    Write-Host "🎉 Test completed successfully! The new users table structure is working correctly." -ForegroundColor Green
    
} catch {
    $errorMessage = $_.Exception.Message
    Write-Host "❌ Registration failed: $errorMessage" -ForegroundColor Red
    
    if ($_.Exception.Response) {
        $reader = [System.IO.StreamReader]::new($_.Exception.Response.GetResponseStream())
        $responseBody = $reader.ReadToEnd()
        Write-Host "📋 Error response body:" -ForegroundColor Red
        Write-Host $responseBody -ForegroundColor Red
    }
    
    Write-Host ""
    Write-Host "🔧 Please check:" -ForegroundColor Yellow
    Write-Host "   - Backend server is running on http://localhost:8000" -ForegroundColor Yellow
    Write-Host "   - Supabase database is accessible" -ForegroundColor Yellow
    Write-Host "   - Environment variables are configured" -ForegroundColor Yellow
}

Write-Host ""
Write-Host "📊 Test Summary:" -ForegroundColor Cyan
Write-Host "   - Testing new users table with exact column names" -ForegroundColor Cyan
Write-Host "   - RFC: $($testUser.rfc) (length: $($testUser.rfc.Length) chars)" -ForegroundColor Cyan
Write-Host "   - Tax Regime stored as text: $($testUser.tax_regime)" -ForegroundColor Cyan
Write-Host "   - CFDI Use stored as text: $($testUser.cfdi_use)" -ForegroundColor Cyan
Write-Host "   - Phone number included: $($testUser.phone_number)" -ForegroundColor Cyan

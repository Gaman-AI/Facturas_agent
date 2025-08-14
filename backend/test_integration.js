const { execSync } = require('child_process');
const path = require('path');

// Test the OCR integration
async function testOCRIntegration() {
  try {
    console.log('🧪 Testing OCR Integration...');
    
    // Use the same logic as the backend
    const pythonExec = process.env.PYTHON_EXECUTABLE || 'python';
    const ocrScriptPath = path.resolve(__dirname, 'src', 'services', 'run_ocr.py');
    const backendDir = __dirname;
    const testImagePath = path.resolve(__dirname, 'tmp', 'uploads', '1755186764423_oxxo_trial.jpg');
    
    console.log(`📁 Script path: ${ocrScriptPath}`);
    console.log(`📁 Backend directory: ${backendDir}`);
    console.log(`📁 Test image path: ${testImagePath}`);
    console.log(`📁 Current working directory: ${process.cwd()}`);
    
    // Check if files exist
    const fs = require('fs');
    if (!fs.existsSync(ocrScriptPath)) {
      console.error('❌ OCR script not found:', ocrScriptPath);
      return;
    }
    if (!fs.existsSync(testImagePath)) {
      console.error('❌ Test image not found:', testImagePath);
      return;
    }
    
    console.log('✅ All files found, executing OCR...');
    
    // Execute the standalone Python script
    const result = execSync(`${pythonExec} "${ocrScriptPath}" "${testImagePath}"`, { 
      encoding: 'utf8',
      stdio: ['pipe', 'pipe', 'pipe'],
      shell: true,
      cwd: backendDir,
      env: process.env
    });
    
    console.log('✅ OCR execution successful');
    console.log(`📊 Python output length: ${result.length}`);
    console.log(`📊 Python output preview: ${result.substring(0, 200)}...`);
    
    // Parse the JSON result
    let ocrResult;
    try {
      ocrResult = JSON.parse(result.trim());
      console.log('✅ JSON parsing successful');
      console.log('📊 Extracted fields:');
      console.log(`  - Mesa_Folio: ${ocrResult.Mesa_Folio}`);
      console.log(`  - Fecha: ${ocrResult.Fecha}`);
      console.log(`  - ID_Ticket: ${ocrResult.ID_Ticket}`);
      console.log(`  - Total: ${ocrResult.Total}`);
      console.log(`  - Comercio: ${ocrResult.Comercio}`);
      console.log(`  - Raw text length: ${ocrResult.Full_Raw_Text?.length || 'N/A'}`);
      
      // Test the normalization logic
      const normalized = {
        mesa_folio: ocrResult?.Mesa_Folio || ocrResult?.mesa_folio || null,
        fecha: ocrResult?.Fecha || ocrResult?.fecha || null,
        id_ticket: ocrResult?.ID_Ticket || ocrResult?.id_ticket || null,
        total: ocrResult?.Total || ocrResult?.total || null,
        comercio: ocrResult?.Comercio || ocrResult?.comercio || null,
        raw_text: ocrResult?.Full_Raw_Text || ocrResult?.raw_text || ocrResult?.full_text || null,
        vendor_type: ocrResult?.vendor_type || null,
        extraction_method: ocrResult?.extraction_method || null,
        text_length: ocrResult?.text_length || null
      };
      
      console.log('✅ Normalization successful');
      console.log('📊 Normalized fields:');
      console.log(`  - mesa_folio: ${normalized.mesa_folio}`);
      console.log(`  - fecha: ${normalized.fecha}`);
      console.log(`  - id_ticket: ${normalized.id_ticket}`);
      console.log(`  - total: ${normalized.total}`);
      console.log(`  - comercio: ${normalized.comercio}`);
      console.log(`  - raw_text length: ${normalized.raw_text?.length || 'N/A'}`);
      console.log(`  - vendor_type: ${normalized.vendor_type}`);
      
      console.log('🎉 Integration test completed successfully!');
      
    } catch (parseError) {
      console.error('❌ JSON parse error:', parseError.message);
      console.error('📋 Raw output:', result);
    }
    
  } catch (error) {
    console.error('❌ Integration test failed:', error.message);
    console.error('📋 Error details:', error);
  }
}

// Run the test
testOCRIntegration();

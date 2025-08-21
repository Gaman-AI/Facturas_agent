/**
 * Test script for Python Bridge URL streaming
 * 
 * This script tests the enhanced Python bridge that streams URL generation events
 * in real-time without affecting the main system.
 */

import { fileURLToPath } from 'url';
import path from 'path';
import { spawn } from 'child_process';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function testPythonBridgeUrlStreaming() {
  console.log('🧪 Testing Python Bridge URL streaming...');
  
  const testScriptPath = path.join(__dirname, 'test_realtime_urls.py');
  const pythonExecutable = 'python'; // Adjust if needed
  
  return new Promise((resolve, reject) => {
    const pythonProcess = spawn(pythonExecutable, [testScriptPath], {
      stdio: ['pipe', 'pipe', 'pipe'],
      env: {
        ...process.env,
        PYTHONPATH: path.join(__dirname, 'browser-use')
      }
    });

    let stdout = '';
    let stderr = '';
    let urlEvents = [];

    // Collect stdout data and detect URL events
    pythonProcess.stdout.on('data', (data) => {
      const chunk = data.toString();
      stdout += chunk;
      
      console.log('📥 Received chunk:', chunk.trim());
      
      // Detect URL generation events
      if (chunk.includes('"success":true')) {
        try {
          const lines = chunk.split('\n');
          for (const line of lines) {
            if (line.trim() && line.includes('"success":true')) {
              try {
                const result = JSON.parse(line.trim());
                
                if (result.session_id && result.live_view_url) {
                  urlEvents.push({
                    type: 'url_generated',
                    sessionId: result.session_id,
                    liveViewUrl: result.live_view_url,
                    timestamp: new Date().toISOString()
                  });
                  
                  console.log('🔗 URL Event Detected:', {
                    sessionId: result.session_id,
                    liveViewUrl: result.live_view_url
                  });
                }
              } catch (parseError) {
                // Continue if this line isn't valid JSON
                continue;
              }
            }
          }
        } catch (error) {
          console.log('⚠️ URL parsing error (non-critical):', error.message);
        }
      }
    });

    // Collect stderr data
    pythonProcess.stderr.on('data', (data) => {
      stderr += data.toString();
      console.log('⚠️ stderr:', data.toString().trim());
    });

    // Handle process completion
    pythonProcess.on('close', (code) => {
      if (code === 0) {
        console.log('✅ Python process completed successfully');
        console.log('📊 Total URL events detected:', urlEvents.length);
        console.log('🔗 URL Events:', urlEvents);
        resolve({ success: true, urlEvents, stdout, stderr });
      } else {
        console.log('❌ Python process failed with code:', code);
        reject(new Error(`Python process failed with code ${code}`));
      }
    });

    // Handle process errors
    pythonProcess.on('error', (error) => {
      console.error('❌ Python process error:', error);
      reject(error);
    });

    // Set timeout
    setTimeout(() => {
      pythonProcess.kill('SIGTERM');
      reject(new Error('Test timed out after 30 seconds'));
    }, 30000);
  });
}

// Run the test
if (import.meta.url === `file://${process.argv[1]}`) {
  testPythonBridgeUrlStreaming()
    .then(result => {
      console.log('🎉 Test completed successfully!');
      console.log('📊 Results:', result);
      process.exit(0);
    })
    .catch(error => {
      console.error('💥 Test failed:', error);
      process.exit(1);
    });
}

export { testPythonBridgeUrlStreaming };

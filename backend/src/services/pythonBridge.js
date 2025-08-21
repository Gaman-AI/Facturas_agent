/**
 * Python Bridge Service
 * 
 * This service handles communication between the Node.js backend and the Python browser-use agent.
 * It spawns Python processes to execute browser automation tasks and handles the results.
 * 
 * @file purpose: Defines the Node.js ↔ Python communication bridge
 */

import { spawn } from 'child_process'
import path from 'path'
import fs from 'fs/promises'
import process from 'process'
import { fileURLToPath } from 'url'
import config from '../config/index.js'
import websocketService from './websocketService.js'

// Get __dirname equivalent for ES modules
const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

class PythonBridge {
  constructor() {
    // Use Python executable from configuration, with fallbacks
    this.pythonExecutables = [
      config.python.executable || 'python',
      'python',
      'python3',
      'venv\\Scripts\\python.exe'
    ]
    this.scriptPath = path.join(__dirname, '..', '..', 'browser_agent.py')
    this.timeout = config.python.timeout || 300000 // 5 minutes default
    this.sessionTimeout = config.python.sessionTimeout || 300000 // 5 minutes default
  }

  /**
   * Find a working Python executable
   * 
   * @returns {Promise<string>} Path to working Python executable
   */
  async findWorkingPython() {
    for (const pythonExec of this.pythonExecutables) {
      try {
        const result = await this.testPythonExecutable(pythonExec)
        if (result.working) {
          console.log(`✅ Found working Python executable: ${pythonExec}`)
          return pythonExec
        }
      } catch (error) {
        console.log(`❌ Python executable ${pythonExec} failed: ${error.message}`)
      }
    }
    throw new Error('No working Python executable found')
  }

  /**
   * Test if a Python executable works
   * 
   * @param {string} pythonExec - Python executable path
   * @returns {Promise<Object>} Test result
   */
  async testPythonExecutable(pythonExec) {
    return new Promise((resolve, reject) => {
      const process = spawn(pythonExec, ['--version'], {
        stdio: ['pipe', 'pipe', 'pipe']
      })

      let stdout = ''
      let stderr = ''
      let isResolved = false

      const timeoutId = setTimeout(() => {
        if (!isResolved) {
          isResolved = true
          process.kill('SIGTERM')
          reject(new Error('Timeout testing Python executable'))
        }
      }, 5000)

      process.stdout.on('data', (data) => {
        stdout += data.toString()
      })

      process.stderr.on('data', (data) => {
        stderr += data.toString()
      })

      process.on('close', (code) => {
        clearTimeout(timeoutId)
        if (isResolved) return
        isResolved = true

        if (code === 0) {
          resolve({
            working: true,
            version: stdout.trim() || stderr.trim(),
            executable: pythonExec
          })
        } else {
          resolve({
            working: false,
            error: stderr || stdout,
            executable: pythonExec
          })
        }
      })

      process.on('error', (error) => {
        clearTimeout(timeoutId)
        if (isResolved) return
        isResolved = true
        resolve({
          working: false,
          error: error.message,
          executable: pythonExec
        })
      })
    })
  }

  /**
   * Create a Browserbase session only and return live view URL immediately
   * 
   * @param {Object} taskData - Task configuration object
   * @param {string} taskData.vendor_url - Vendor URL for CFDI
   * @param {Object} [taskData.user_profile] - Complete user profile data
   * @param {Object} [taskData.ocr_ticket_data] - OCR extracted ticket data (formatted + raw)
   * @returns {Promise<Object>} Session creation result with live view URL
   */
  async createBrowserSession(taskData) {
    // Validate task data
    if (!taskData || typeof taskData !== 'object') {
      throw new Error('Task data must be a valid object')
    }

    if (!taskData.vendor_url) {
      throw new Error('vendor_url is required')
    }

    // Check if Python script exists
    try {
      await fs.access(this.scriptPath)
    } catch (error) {
      throw new Error(`Python script not found at ${this.scriptPath}`)
    }

    // Find a working Python executable
    const pythonExecutable = await this.findWorkingPython()

    return new Promise((resolve, reject) => {
      const taskJson = JSON.stringify(taskData)
      
      // Our refactored browser_agent.py only accepts JSON argument
      // The mode is determined from the JSON data itself
      const pythonProcess = spawn(pythonExecutable, [this.scriptPath, taskJson], {
        stdio: ['pipe', 'pipe', 'pipe'],
        env: {
          ...process.env,
          PYTHONPATH: path.join(__dirname, '..', '..', 'browser-use'),
          BROWSER_USE_SETUP_LOGGING: 'true',
          BROWSER_USE_DEBUG: 'false'  // Disable debug output to stdout for clean JSON parsing
        }
      })

      let stdout = ''
      let stderr = ''
      let isResolved = false

      // Set up timeout for session creation (shorter than full execution)
      const timeoutId = setTimeout(() => {
        if (!isResolved) {
          isResolved = true
          pythonProcess.kill('SIGTERM')
          reject(new Error(`Session creation timed out after ${this.sessionTimeout}ms`))
        }
      }, this.sessionTimeout) // configurable session creation timeout

      // Collect stdout data
      pythonProcess.stdout.on('data', (data) => {
        stdout += data.toString()
      })

      // Collect stderr data
      pythonProcess.stderr.on('data', (data) => {
        stderr += data.toString()
      })

      // Handle process completion
      pythonProcess.on('close', (code) => {
        clearTimeout(timeoutId)
        
        if (isResolved) {
          return // Already handled by timeout
        }
        isResolved = true

        if (code === 0) {
          try {
            // Try to parse the last JSON object from stdout
            const lines = stdout.trim().split('\n')
            let result = null
            
            // First, try to find any valid JSON in the output
            // Look for lines that start with { and end with }
            for (let i = lines.length - 1; i >= 0; i--) {
              const line = lines[i].trim()
              // Skip empty lines and debug messages
              if (!line || line.startsWith('[DEBUG]') || line.startsWith('[INFO]') || line.startsWith('[WARNING]') || line.startsWith('[ERROR]')) {
                continue
              }
              
              // Check if line looks like JSON (starts with { and ends with })
              if (line.startsWith('{') && line.endsWith('}')) {
                try {
                  result = JSON.parse(line)
                  console.log('✅ Successfully parsed JSON from line:', i, 'Content:', line.substring(0, 100) + '...')
                  break
                } catch (e) {
                  // Continue looking for valid JSON
                  continue
                }
              }
            }
            
            // If no single-line JSON found, try to find JSON across multiple lines
            if (!result) {
              // Look for JSON that might span multiple lines
              const jsonMatch = stdout.match(/\{[\s\S]*\}/)
              if (jsonMatch) {
                try {
                  result = JSON.parse(jsonMatch[0])
                  console.log('✅ Successfully parsed multi-line JSON')
                } catch (e) {
                  console.warn('⚠️ Failed to parse multi-line JSON:', e.message)
                }
              }
            }

            if (!result) {
              // Log the full output for debugging
              console.error('❌ No valid JSON found in Python output')
              console.error('Full stdout:', stdout)
              console.error('Full stderr:', stderr)
              throw new Error('No valid JSON found in Python output')
            }

            resolve(result)
          } catch (parseError) {
            console.error('❌ JSON parsing failed:', parseError.message)
            console.error('Full stdout:', stdout)
            console.error('Full stderr:', stderr)
            reject(new Error(`Failed to parse Python output: ${parseError.message}\nOutput: ${stdout}\nError: ${stderr}`))
          }
        } else {
          const errorMsg = stderr || stdout || `Python process exited with code ${code}`
          console.error('❌ Python process failed with code:', code)
          console.error('Error message:', errorMsg)
          reject(new Error(`Session creation failed: ${errorMsg}`))
        }
      })

      // Handle process errors
      pythonProcess.on('error', (error) => {
        clearTimeout(timeoutId)
        
        if (isResolved) {
          return
        }
        isResolved = true

        if (error.code === 'ENOENT') {
          reject(new Error(`Python executable not found: ${pythonExecutable}. Please install Python or update the configuration.`))
        } else {
          reject(new Error(`Failed to spawn Python process: ${error.message}`))
        }
      })
    })
  }

  /**
   * Execute a browser automation task using Python
   * 
   * @param {Object} taskData - Task configuration object
   * @returns {Promise<Object>} Execution result
   */
  async executeBrowserTask(taskData) {
    // Validate task data
    if (!taskData || typeof taskData !== 'object') {
      throw new Error('Task data must be a valid object')
    }

    if (!taskData.vendor_url) {
      throw new Error('vendor_url is required')
    }

    // Check if Python script exists
    try {
      await fs.access(this.scriptPath)
    } catch (error) {
      throw new Error(`Python script not found at ${this.scriptPath}`)
    }

    // Find a working Python executable
    const pythonExecutable = await this.findWorkingPython()

    return new Promise((resolve, reject) => {
      const taskJson = JSON.stringify(taskData)
      
      // Debug: Log the JSON being sent to Python
      console.log('🔍 JSON being sent to Python browser_agent.py:', {
        length: taskJson.length,
        user_profile_rfc: taskData.user_profile?.rfc,
        user_profile_company: taskData.user_profile?.company_name,
        vendor_url: taskData.vendor_url,
        browser_mode: taskData.browser_mode
      })
      
      // Our refactored browser_agent.py only accepts JSON argument
      // The mode is determined from the JSON data itself
      const pythonProcess = spawn(pythonExecutable, [this.scriptPath, taskJson], {
        stdio: ['pipe', 'pipe', 'pipe'],
        env: {
          ...process.env,
          PYTHONPATH: path.join(__dirname, '..', '..', 'browser-use'),
          BROWSER_USE_SETUP_LOGGING: 'true',
          BROWSER_USE_DEBUG: 'false'  // Disable debug output to stdout for clean JSON parsing
        }
      })

      let stdout = ''
      let stderr = ''
      let isResolved = false
      let taskId = null

      // Extract taskId from taskData if available for WebSocket events
      if (taskData.request_id) {
        taskId = taskData.request_id
      }

      // Set up timeout
      const timeoutId = setTimeout(() => {
        if (!isResolved) {
          isResolved = true
          pythonProcess.kill('SIGTERM')
          reject(new Error(`Python process timed out after ${this.timeout}ms`))
        }
      }, this.timeout)

      // Collect stdout data and stream URL events
      let jsonBuffer = ''
      let braceCount = 0
      let inJsonBlock = false
      
      pythonProcess.stdout.on('data', (data) => {
        const chunk = data.toString()
        stdout += chunk
        
        // Parse JSON responses for immediate URL delivery
        if (taskId) {
          try {
            // Process each character to find complete JSON blocks
            for (let i = 0; i < chunk.length; i++) {
              const char = chunk[i]
              
              if (char === '{') {
                if (braceCount === 0) {
                  inJsonBlock = true
                  jsonBuffer = '{'
                } else {
                  jsonBuffer += char
                }
                braceCount++
              } else if (char === '}') {
                jsonBuffer += char
                braceCount--
                
                if (braceCount === 0 && inJsonBlock) {
                  // We have a complete JSON block
                  try {
                    const result = JSON.parse(jsonBuffer)
                    
                    // Send immediate session creation event if available
                    if (result.success && result.session_id && result.live_view_url) {
                      websocketService.sendSessionCreated(taskId, {
                        sessionId: result.session_id,
                        browserMode: taskData.browser_mode || 'browserbase',
                        timestamp: new Date().toISOString()
                      })
                      
                      websocketService.sendLiveViewReady(taskId, {
                        liveViewUrl: result.live_view_url,
                        sessionId: result.session_id,
                        browserMode: taskData.browser_mode || 'browserbase',
                        timestamp: new Date().toISOString()
                      })
                      
                      console.log(`🔗 Real-time URL events sent for task ${taskId}:`, {
                        sessionId: result.session_id,
                        liveViewUrl: result.live_view_url
                      })
                    }
                    
                    // Send URL update event for any successful response
                    if (result.success) {
                      websocketService.sendUrlUpdate(taskId, {
                        type: 'task_progress',
                        url: result.live_view_url || result.session_id,
                        data: result,
                        timestamp: new Date().toISOString()
                      })
                    }
                  } catch (parseError) {
                    console.warn(`⚠️ Failed to parse JSON block for task ${taskId}:`, parseError.message)
                  }
                  
                  // Reset for next JSON block
                  jsonBuffer = ''
                  inJsonBlock = false
                }
              } else if (inJsonBlock) {
                jsonBuffer += char
              }
            }
          } catch (error) {
            console.warn(`⚠️ Error processing real-time output for task ${taskId}:`, error.message)
          }
        }
      })

      // Collect stderr data
      pythonProcess.stderr.on('data', (data) => {
        stderr += data.toString()
      })

      // Process completed
      pythonProcess.on('close', (code) => {
        clearTimeout(timeoutId)
        
        if (isResolved) {
          return
        }
        
        if (code === 0) {
          try {
            // Parse the final result using multi-line JSON parsing
            let finalResult = null
            let jsonBuffer = ''
            let braceCount = 0
            let inJsonBlock = false
            const foundResults = []
            
            // Process the entire stdout to find all JSON blocks
            for (let i = 0; i < stdout.length; i++) {
              const char = stdout[i]
              
              if (char === '{') {
                if (braceCount === 0) {
                  inJsonBlock = true
                  jsonBuffer = '{'
                } else {
                  jsonBuffer += char
                }
                braceCount++
              } else if (char === '}') {
                jsonBuffer += char
                braceCount--
                
                if (braceCount === 0 && inJsonBlock) {
                  // We have a complete JSON block
                  try {
                    const parsed = JSON.parse(jsonBuffer)
                    if (parsed.success) {
                      foundResults.push(parsed)
                    }
                  } catch (parseError) {
                    // Continue processing other JSON blocks
                  }
                  
                  // Reset for next JSON block
                  jsonBuffer = ''
                  inJsonBlock = false
                }
              } else if (inJsonBlock) {
                jsonBuffer += char
              }
            }
            
            // Use the last successful result as the final result
            if (foundResults.length > 0) {
              finalResult = foundResults[foundResults.length - 1]
              
              console.log(`✅ Python process completed successfully for task ${taskId}`)
              console.log(`🔗 Session ID: ${finalResult.session_id}`)
              console.log(`👀 Live View URL: ${finalResult.live_view_url}`)
              console.log(`📊 Found ${foundResults.length} successful JSON response(s)`)
              
              isResolved = true
              resolve(finalResult)
            } else {
              throw new Error('No successful JSON response found in Python output')
            }
          } catch (parseError) {
            console.error(`❌ Failed to parse Python output for task ${taskId}:`, parseError.message)
            console.error('Raw output:', stdout)
            
            isResolved = true
            reject(new Error(`Failed to parse Python output: ${parseError.message}`))
          }
        } else {
          console.error(`❌ Python process failed with code ${code} for task ${taskId}`)
          console.error('Error output:', stderr)
          
          isResolved = true
          reject(new Error(`Python process failed with exit code ${code}`))
        }
      })

      // Handle process errors
      pythonProcess.on('error', (error) => {
        clearTimeout(timeoutId)
        
        if (isResolved) {
          return
        }
        isResolved = true

        if (error.code === 'ENOENT') {
          reject(new Error(`Python executable not found: ${pythonExecutable}. Please install Python or update the configuration.`))
        } else {
          reject(new Error(`Failed to spawn Python process: ${error.message}`))
        }
      })
    })
  }

  /**
   * Test the Python bridge connection
   * 
   * @returns {Promise<Object>} Health check result
   */
  async healthCheck() {
    try {
      const pythonExecutable = await this.findWorkingPython()
      
      const testTask = {
        prompt: 'Test connection - just return success without doing anything',
        model: 'gpt-4.1-mini',
        max_steps: 1
      }

      const result = await this.executeBrowserTask(testTask)
      
      return {
        status: 'healthy',
        python_executable: pythonExecutable,
        script_path: this.scriptPath,
        test_result: result
      }
    } catch (error) {
      return {
        status: 'unhealthy',
        python_executable: 'none found',
        script_path: this.scriptPath,
        error: error.message
      }
    }
  }

  /**
   * Get Python environment info
   * 
   * @returns {Promise<Object>} Environment information
   */
  async getEnvironmentInfo() {
    try {
      const pythonExecutable = await this.findWorkingPython()
      
      return new Promise((resolve, reject) => {
        const process = spawn(pythonExecutable, ['--version'], {
          stdio: ['pipe', 'pipe', 'pipe']
        })

        let stdout = ''
        let stderr = ''

        process.stdout.on('data', (data) => {
          stdout += data.toString()
        })

        process.stderr.on('data', (data) => {
          stderr += data.toString()
        })

        process.on('close', (code) => {
          if (code === 0) {
            resolve({
              python_version: stdout.trim() || stderr.trim(),
              executable: pythonExecutable,
              script_exists: fs.access(this.scriptPath).then(() => true).catch(() => false)
            })
          } else {
            reject(new Error(`Failed to get Python version: ${stderr || stdout}`))
          }
        })

        process.on('error', (error) => {
          reject(new Error(`Python executable not found: ${error.message}`))
        })
      })
    } catch (error) {
      throw new Error(`No working Python executable found: ${error.message}`)
    }
  }
}

export default new PythonBridge()
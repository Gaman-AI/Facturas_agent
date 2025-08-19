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
    this.sessionTimeout = config.python.sessionTimeout || 120000 // 2 minutes default
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
      // Use session_only mode to create session only
      const pythonProcess = spawn(pythonExecutable, [this.scriptPath, taskJson, 'session_only'], {
        stdio: ['pipe', 'pipe', 'pipe'],
        env: {
          ...process.env,
          PYTHONPATH: path.join(__dirname, '..', '..', 'browser-use'),
          BROWSER_USE_SETUP_LOGGING: 'true'
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
            const jsonLines = stdout.trim().split('\n')
            let result = null
            
            // Find the last valid JSON line (in case there are log messages)
            for (let i = jsonLines.length - 1; i >= 0; i--) {
              try {
                result = JSON.parse(jsonLines[i])
                break
              } catch (e) {
                // Continue looking for valid JSON
                continue
              }
            }

            if (!result) {
              throw new Error('No valid JSON found in Python output')
            }

            resolve(result)
          } catch (parseError) {
            reject(new Error(`Failed to parse Python output: ${parseError.message}\nOutput: ${stdout}\nError: ${stderr}`))
          }
        } else {
          const errorMsg = stderr || stdout || `Python process exited with code ${code}`
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
   * Execute a browser automation task using the Python browser-use agent
   * 
   * @param {Object} taskData - Task configuration object
   * @param {string} [taskData.prompt] - The task description/prompt
   * @param {string} [taskData.model] - LLM model to use
   * @param {number} [taskData.temperature] - LLM temperature
   * @param {number} [taskData.max_steps] - Maximum steps for the agent
   * @param {string} taskData.vendor_url - Vendor URL for CFDI
   * @param {Object} [taskData.user_profile] - Complete user profile data
   * @param {Object} [taskData.ocr_ticket_data] - OCR extracted ticket data (formatted + raw)
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
      // Use execute_task mode (default) for full task execution
      const pythonProcess = spawn(pythonExecutable, [this.scriptPath, taskJson, 'execute_task'], {
        stdio: ['pipe', 'pipe', 'pipe'],
        env: {
          ...process.env,
          PYTHONPATH: path.join(__dirname, '..', '..', 'browser-use'),
          BROWSER_USE_SETUP_LOGGING: 'true'
        }
      })

      let stdout = ''
      let stderr = ''
      let isResolved = false

      // Set up timeout
      const timeoutId = setTimeout(() => {
        if (!isResolved) {
          isResolved = true
          pythonProcess.kill('SIGTERM')
          reject(new Error(`Python process timed out after ${this.timeout}ms`))
        }
      }, this.timeout)

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
            const jsonLines = stdout.trim().split('\n')
            let result = null
            
            // Find the last valid JSON line (in case there are log messages)
            for (let i = jsonLines.length - 1; i >= 0; i--) {
              try {
                result = JSON.parse(jsonLines[i])
                break
              } catch (e) {
                // Continue looking for valid JSON
                continue
              }
            }

            if (!result) {
              throw new Error('No valid JSON found in Python output')
            }

            resolve(result)
          } catch (parseError) {
            reject(new Error(`Failed to parse Python output: ${parseError.message}\nOutput: ${stdout}\nError: ${stderr}`))
          }
        } else {
          const errorMsg = stderr || stdout || `Python process exited with code ${code}`
          reject(new Error(`Python execution failed: ${errorMsg}`))
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
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
import config from '../config/index.js'

class PythonBridge {
  constructor() {
    this.pythonExecutable = config.python.executable || 'python3'
    this.scriptPath = path.join(process.cwd(), 'browser_agent.py')
    this.timeout = config.python.timeout || 300000 // 5 minutes default
  }

  /**
   * Execute a browser automation task using the Python browser-use agent
   * 
   * @param {Object} taskData - Task configuration object
   * @param {string} taskData.prompt - The task description/prompt
   * @param {string} [taskData.model] - LLM model to use
   * @param {number} [taskData.temperature] - LLM temperature
   * @param {number} [taskData.max_steps] - Maximum steps for the agent
   * @param {string} [taskData.vendor_url] - Vendor URL for CFDI
   * @param {Object} [taskData.customer_details] - Customer information
   * @param {Object} [taskData.invoice_details] - Invoice information
   * @returns {Promise<Object>} Execution result
   */
  async executeBrowserTask(taskData) {
    // Validate task data
    if (!taskData || typeof taskData !== 'object') {
      throw new Error('Task data must be a valid object')
    }

    if (!taskData.prompt && !taskData.vendor_url) {
      throw new Error('Either prompt or vendor_url must be provided')
    }

    // Check if Python script exists
    try {
      await fs.access(this.scriptPath)
    } catch (error) {
      throw new Error(`Python script not found at ${this.scriptPath}`)
    }

    return new Promise((resolve, reject) => {
      const taskJson = JSON.stringify(taskData)
      const process = spawn(this.pythonExecutable, [this.scriptPath, taskJson], {
        stdio: ['pipe', 'pipe', 'pipe'],
        env: {
          ...process.env,
          PYTHONPATH: path.join(process.cwd(), 'browser-use'),
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
          process.kill('SIGTERM')
          reject(new Error(`Python process timed out after ${this.timeout}ms`))
        }
      }, this.timeout)

      // Collect stdout data
      process.stdout.on('data', (data) => {
        stdout += data.toString()
      })

      // Collect stderr data
      process.stderr.on('data', (data) => {
        stderr += data.toString()
      })

      // Handle process completion
      process.on('close', (code) => {
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
      process.on('error', (error) => {
        clearTimeout(timeoutId)
        
        if (isResolved) {
          return
        }
        isResolved = true

        if (error.code === 'ENOENT') {
          reject(new Error(`Python executable not found: ${this.pythonExecutable}. Please install Python or update the configuration.`))
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
      const testTask = {
        prompt: 'Test connection - just return success without doing anything',
        model: 'gpt-4.1-mini',
        max_steps: 1
      }

      const result = await this.executeBrowserTask(testTask)
      
      return {
        status: 'healthy',
        python_executable: this.pythonExecutable,
        script_path: this.scriptPath,
        test_result: result
      }
    } catch (error) {
      return {
        status: 'unhealthy',
        python_executable: this.pythonExecutable,
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
    return new Promise((resolve, reject) => {
      const process = spawn(this.pythonExecutable, ['--version'], {
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
            executable: this.pythonExecutable,
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
  }
}

export default new PythonBridge()
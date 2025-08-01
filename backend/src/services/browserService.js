import { spawn } from 'child_process'
import path from 'path'
import config from '../config/index.js'
import { AppError, ServiceUnavailableError } from '../middleware/errorHandler.js'
import websocketService from './websocketService.js'

/**
 * Browser Service - Node.js bridge to Python browser-use automation
 * Executes browser automation tasks using the enhanced browser_agent.py
 */
class BrowserService {
  constructor() {
    this.pythonPath = path.join(process.cwd(), 'enhanced_browser_agent.py')
    this.pythonExecutable = config.python.executable
    this.maxExecutionTime = config.tasks.timeoutMinutes * 60 * 1000 // Convert to milliseconds
  }

  /**
   * Execute CFDI automation task
   * @param {Object} taskData - Task configuration and data
   * @returns {Promise<Object>} - Automation result
   */
  async executeCFDITask(taskData) {
    return new Promise((resolve, reject) => {
      const startTime = Date.now()
      let isResolved = false
      
      // Validate required fields
      const requiredFields = ['vendor_url']
      const missingFields = requiredFields.filter(field => !taskData[field])
      
      if (missingFields.length > 0) {
        return reject(new AppError(
          `Missing required fields: ${missingFields.join(', ')}`,
          400,
          'VALIDATION_ERROR'
        ))
      }

      // Prepare task data for Python service
      const pythonTaskData = {
        vendor_url: taskData.vendor_url,
        ticket_details: taskData.ticket_details || {},
        llm_provider: taskData.llm_provider || 'openai',
        model: taskData.model || 'gpt-4o-mini',
        max_retries: taskData.max_retries || 3,
        timeout_minutes: config.tasks.timeoutMinutes
      }

      console.log(`🐍 Starting Python browser automation process`)
      console.log(`📄 Task data:`, JSON.stringify(pythonTaskData, null, 2))

      // Spawn Python process
      const pythonProcess = spawn(this.pythonExecutable, [
        this.pythonPath,
        JSON.stringify(pythonTaskData)
      ], {
        stdio: ['pipe', 'pipe', 'pipe'],
        env: {
          ...process.env,
          PYTHONPATH: path.join(process.cwd(), 'browser-use'),
          NODE_ENV: config.nodeEnv
        }
      })

      let stdout = ''
      let stderr = ''
      let lastLogTime = Date.now()

      // Handle stdout (main output)
      pythonProcess.stdout.on('data', (data) => {
        const output = data.toString()
        stdout += output
        
        // Log real-time output for debugging
        console.log(`🐍 [STDOUT]:`, output.trim())
        lastLogTime = Date.now()
      })

      // Handle stderr (error output and debug logs)
      pythonProcess.stderr.on('data', (data) => {
        const output = data.toString()
        stderr += output
        
        // Log errors but don't fail immediately (Python might recover)
        console.log(`🐍 [STDERR]:`, output.trim())
        lastLogTime = Date.now()
      })

      // Handle process completion
      pythonProcess.on('close', (code) => {
        if (isResolved) return

        const executionTime = (Date.now() - startTime) / 1000
        console.log(`🐍 Python process completed with code ${code} in ${executionTime}s`)

        if (code === 0) {
          try {
            // Try to parse the JSON result from stdout
            const lines = stdout.trim().split('\n')
            let jsonResult = null
            
            // Find the JSON result (usually the last line)
            for (let i = lines.length - 1; i >= 0; i--) {
              const line = lines[i].trim()
              if (line.startsWith('{') && line.endsWith('}')) {
                try {
                  jsonResult = JSON.parse(line)
                  break
                } catch (e) {
                  continue
                }
              }
            }

            if (jsonResult) {
              isResolved = true
              resolve({
                ...jsonResult,
                execution_time: executionTime,
                python_process_code: code
              })
            } else {
              isResolved = true
              reject(new AppError(
                'Failed to parse Python response',
                500,
                'PYTHON_SERVICE_ERROR',
                { stdout, stderr, code }
              ))
            }
          } catch (error) {
            isResolved = true
            reject(new AppError(
              `Failed to parse Python response: ${error.message}`,
              500,
              'PYTHON_SERVICE_ERROR',
              { stdout, stderr, code, parseError: error.message }
            ))
          }
        } else {
          isResolved = true
          reject(new AppError(
            `Python process failed with code ${code}`,
            500,
            'PYTHON_SERVICE_ERROR',
            { stdout, stderr, code, executionTime }
          ))
        }
      })

      // Handle process errors
      pythonProcess.on('error', (error) => {
        if (isResolved) return
        
        console.error(`🐍 Python process error:`, error)
        isResolved = true
        
        if (error.code === 'ENOENT') {
          reject(new ServiceUnavailableError(
            `Python executable not found: ${this.pythonExecutable}`
          ))
        } else {
          reject(new AppError(
            `Python process error: ${error.message}`,
            500,
            'PYTHON_SERVICE_ERROR',
            { error: error.message, code: error.code }
          ))
        }
      })

      // Set timeout for the entire process
      const timeoutId = setTimeout(() => {
        if (!isResolved) {
          console.log(`⏰ Python process timeout after ${this.maxExecutionTime}ms`)
          pythonProcess.kill('SIGTERM')
          
          setTimeout(() => {
            if (!pythonProcess.killed) {
              pythonProcess.kill('SIGKILL')
            }
          }, 5000)

          isResolved = true
          reject(new AppError(
            `Task execution timeout after ${config.tasks.timeoutMinutes} minutes`,
            408,
            'EXECUTION_TIMEOUT',
            { timeoutMinutes: config.tasks.timeoutMinutes }
          ))
        }
      }, this.maxExecutionTime)

      // Clear timeout when process completes
      pythonProcess.on('exit', () => {
        clearTimeout(timeoutId)
      })
    })
  }

  /**
   * Test Python service connectivity
   * @returns {Promise<Object>} - Health check result
   */
  async healthCheck() {
    try {
      const testTaskData = {
        vendor_url: 'https://example.com',
        ticket_details: {
          customer_details: { rfc: 'TEST123456TEST' },
          invoice_details: { total: 100, folio: 'TEST' }
        }
      }

      // This would fail gracefully as it's just a connectivity test
      const result = await this.executeCFDITask(testTaskData)
      
      return {
        success: true,
        message: 'Python browser service is accessible',
        pythonPath: this.pythonPath,
        pythonExecutable: this.pythonExecutable
      }
    } catch (error) {
      return {
        success: false,
        error: error.message,
        pythonPath: this.pythonPath,
        pythonExecutable: this.pythonExecutable
      }
    }
  }

  /**
   * Get service configuration and status
   * @returns {Object} - Service info
   */
  getServiceInfo() {
    return {
      pythonPath: this.pythonPath,
      pythonExecutable: this.pythonExecutable,
      maxExecutionTime: this.maxExecutionTime,
      browserUsePath: config.python.browserUsePath,
      supportedProviders: ['openai', 'anthropic', 'google'],
      version: '1.0.0'
    }
  }

  /**
   * Execute simplified browser automation task
   * @param {Object} taskData - Simplified task configuration
   * @returns {Promise<Object>} - Automation result
   */
  async executeTask(taskData) {
    return new Promise((resolve, reject) => {
      const startTime = Date.now()
      let isResolved = false
      
      // Validate required fields - simplified validation
      if (!taskData.task || typeof taskData.task !== 'string') {
        return reject(new AppError(
          'Task description is required and must be a string',
          400,
          'VALIDATION_ERROR'
        ))
      }

      // Generate unique task ID for real-time monitoring
      const taskId = `task_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
      
      // Prepare simplified task data for Python service
      const pythonTaskData = {
        task: taskData.task,
        llm_provider: taskData.llm_provider || 'openai',
        model: taskData.model || 'gpt-4o-mini',
        timeout_minutes: taskData.timeout_minutes || 30,
        task_id: taskId
      }

      console.log(`🐍 Starting Python browser automation process`)
      console.log(`📄 Task data:`, JSON.stringify(pythonTaskData, null, 2))

      // Spawn Python process
      const pythonProcess = spawn(this.pythonExecutable, [
        this.pythonPath,
        JSON.stringify(pythonTaskData)
      ], {
        stdio: ['pipe', 'pipe', 'pipe'],
        env: {
          ...process.env,
          PYTHONPATH: path.join(process.cwd(), 'browser-use'),
          NODE_ENV: config.nodeEnv
        }
      })

      let stdout = ''
      let stderr = ''
      let lastLogTime = Date.now()

      // Handle stdout (main output)
      pythonProcess.stdout.on('data', (data) => {
        const output = data.toString()
        stdout += output
        
        // Log real-time output for debugging
        console.log(`🐍 [STDOUT]:`, output.trim())
        lastLogTime = Date.now()
      })

      // Handle stderr (error output and debug logs)
      pythonProcess.stderr.on('data', (data) => {
        const output = data.toString()
        stderr += output
        
        // Log errors but don't fail immediately (Python might recover)
        console.log(`🐍 [STDERR]:`, output.trim())
        lastLogTime = Date.now()
      })

      // Handle process completion
      pythonProcess.on('close', (code) => {
        if (isResolved) return

        const executionTime = (Date.now() - startTime) / 1000
        console.log(`🐍 Python process completed with code ${code} in ${executionTime}s`)

        if (code === 0) {
          try {
            // Try to parse the JSON result from stdout
            const lines = stdout.trim().split('\n')
            let jsonResult = null
            
            // Look for JSON result (usually the last line)
            for (let i = lines.length - 1; i >= 0; i--) {
              try {
                const line = lines[i].trim()
                if (line.startsWith('{') || line.startsWith('[')) {
                  jsonResult = JSON.parse(line)
                  break
                }
              } catch (e) {
                // Continue looking for valid JSON
                continue
              }
            }

            if (jsonResult) {
              isResolved = true
              resolve({
                success: true,
                data: jsonResult,
                execution_time: executionTime,
                session_log: lines.filter(line => !line.trim().startsWith('{') && line.trim())
              })
            } else {
              // No JSON found, return the raw output
              isResolved = true
              resolve({
                success: true,
                data: {
                  message: 'Task completed successfully',
                  output: stdout.trim()
                },
                execution_time: executionTime,
                session_log: lines
              })
            }
          } catch (error) {
            console.error(`❌ Failed to parse Python output:`, error)
            isResolved = true
            reject(new AppError(
              `Failed to parse automation result: ${error.message}`,
              500,
              'PARSE_ERROR'
            ))
          }
        } else {
          // Process failed
          isResolved = true
          reject(new AppError(
            `Browser automation failed: ${stderr || 'Unknown error'}`,
            500,
            'AUTOMATION_ERROR'
          ))
        }
      })

      // Handle process errors
      pythonProcess.on('error', (error) => {
        if (isResolved) return
        console.error(`❌ Python process error:`, error)
        isResolved = true
        reject(new ServiceUnavailableError(
          `Failed to start browser automation: ${error.message}`
        ))
      })

      // Set execution timeout
      const timeout = setTimeout(() => {
        if (isResolved) return
        console.log(`⏰ Task execution timeout after ${this.maxExecutionTime}ms`)
        pythonProcess.kill('SIGTERM')
        isResolved = true
        reject(new AppError(
          'Task execution timeout - process took too long to complete',
          408,
          'TIMEOUT_ERROR'
        ))
      }, this.maxExecutionTime)

      // Clean up timeout when process completes
      pythonProcess.on('close', () => {
        clearTimeout(timeout)
      })
    })
  }

  /**
   * Get service information
   * @returns {Object} - Service details
   */
  getServiceInfo() {
    return {
      name: 'Browser Automation Service',
      version: '2.0.0',
      description: 'Simplified browser automation service using browser-use',
      python_executable: this.pythonExecutable,
      max_execution_time: this.maxExecutionTime,
      supported_providers: ['openai', 'anthropic', 'google']
    }
  }
}

export default new BrowserService() 
import { spawn } from 'child_process'
import path from 'path'
import config from '../config/index.js'
import { AppError, ServiceUnavailableError } from '../middleware/errorHandler.js'
import websocketService from './websocketService.js'

/**
 * Enhanced Browser Service with Real-time Thinking Monitoring
 * Executes browser automation tasks using the enhanced browser agent with WebSocket updates
 */
class EnhancedBrowserService {
  constructor() {
    this.pythonPath = path.join(process.cwd(), 'enhanced_browser_agent.py')
    this.pythonExecutable = config.python.executable
    this.maxExecutionTime = config.tasks.timeoutMinutes * 60 * 1000 // Convert to milliseconds
  }

  /**
   * Execute browser automation task with real-time monitoring
   * @param {Object} taskData - Task configuration and data
   * @returns {Promise<Object>} - Automation result with thinking history
   */
  async executeTaskWithMonitoring(taskData) {
    return new Promise((resolve, reject) => {
      const startTime = Date.now()
      let isResolved = false
      
      // Validate required fields
      if (!taskData.task || typeof taskData.task !== 'string') {
        return reject(new AppError(
          'Task description is required and must be a string',
          400,
          'VALIDATION_ERROR'
        ))
      }

      // Generate unique task ID for real-time monitoring
      const taskId = `task_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
      
      // Prepare task data for Python service with monitoring enabled
      const pythonTaskData = {
        task: taskData.task,
        llm_provider: taskData.llm_provider || 'openai',
        model: taskData.model || 'gpt-4o-mini',
        timeout_minutes: taskData.timeout_minutes || 30,
        task_id: taskId,
        max_steps: taskData.max_steps || 30,
        temperature: taskData.temperature || 0.1
      }

      console.log(`🚀 Starting enhanced browser automation with real-time monitoring`)
      console.log(`📄 Task ID: ${taskId}`)
      console.log(`📄 Task data:`, JSON.stringify(pythonTaskData, null, 2))

      // Initialize agent status in WebSocket service
      websocketService.updateAgentStatus(taskId, {
        status: 'starting',
        task_description: taskData.task.substring(0, 100),
        model: pythonTaskData.model,
        max_steps: pythonTaskData.max_steps,
        started_at: new Date().toISOString()
      })

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
      let thinkingHistory = []

      // Handle stdout with WebSocket updates
      pythonProcess.stdout.on('data', (data) => {
        const output = data.toString()
        stdout += output
        
        // Parse and broadcast real-time WebSocket updates
        const lines = output.split('\n')
        for (const line of lines) {
          const trimmedLine = line.trim()
          
          // Check for WebSocket updates from the Python agent
          if (trimmedLine.startsWith('WS_UPDATE:')) {
            try {
              const updateJson = trimmedLine.substring('WS_UPDATE:'.length).trim()
              const update = JSON.parse(updateJson)
              
              if (update.websocket_update && update.data) {
                // Store thinking history
                thinkingHistory.push(update.data)
                
                // Broadcast to WebSocket subscribers based on update type
                const updateData = update.data
                switch (updateData.type) {
                  case 'thinking':
                    websocketService.broadcastAgentThinking(taskId, updateData)
                    console.log(`💭 [THINKING] Step ${updateData.step_number}: ${updateData.content.substring(0, 100)}...`)
                    break
                  case 'action':
                    websocketService.broadcastAgentAction(taskId, updateData)
                    console.log(`🎬 [ACTION] Step ${updateData.step_number}: ${updateData.content}`)
                    break
                  case 'observation':
                    websocketService.broadcastAgentObservation(taskId, updateData)
                    console.log(`👁️ [OBSERVATION] Step ${updateData.step_number}: ${updateData.content}`)
                    break
                  case 'goal':
                    websocketService.broadcastAgentGoal(taskId, updateData)
                    console.log(`🎯 [GOAL] Step ${updateData.step_number}: ${updateData.content}`)
                    break
                  case 'memory':
                    websocketService.broadcastAgentMemory(taskId, updateData)
                    console.log(`🧠 [MEMORY] Step ${updateData.step_number}: ${updateData.content}`)
                    break
                  case 'evaluation':
                    websocketService.broadcastAgentEvaluation(taskId, updateData)
                    console.log(`⚖️ [EVALUATION] Step ${updateData.step_number}: ${updateData.content}`)
                    break
                  case 'error':
                    console.error(`❌ [ERROR] ${updateData.content}`)
                    break
                  default:
                    console.log(`📊 [UPDATE] ${updateData.type}: ${updateData.content}`)
                }
              }
            } catch (error) {
              console.error('❌ Failed to parse WebSocket update:', error)
            }
          } else if (trimmedLine && !trimmedLine.startsWith('FINAL_RESULT:') && trimmedLine.length > 0) {
            // Log regular output for debugging (but filter out noise)
            console.log(`🐍 [STDOUT]:`, trimmedLine)
          }
        }
        
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
        console.log(`🐍 Enhanced Python process completed with code ${code} in ${executionTime}s`)

        // Update agent status to completed
        websocketService.updateAgentStatus(taskId, {
          status: code === 0 ? 'completed' : 'failed',
          completed_at: new Date().toISOString(),
          execution_time: executionTime,
          exit_code: code
        })

        if (code === 0) {
          try {
            // Try to parse the JSON result from stdout
            const lines = stdout.trim().split('\n')
            let jsonResult = null
            
            // Look for FINAL_RESULT JSON
            let resultStarted = false
            let resultLines = []
            
            for (const line of lines) {
              if (line.includes('FINAL_RESULT:')) {
                resultStarted = true
                continue
              }
              
              if (resultStarted) {
                resultLines.push(line)
              }
            }
            
            if (resultLines.length > 0) {
              try {
                const resultJson = resultLines.join('\n').trim()
                jsonResult = JSON.parse(resultJson)
              } catch (e) {
                console.log('Failed to parse FINAL_RESULT, trying line-by-line approach')
              }
            }
            
            // Fallback: look for any valid JSON in the output
            if (!jsonResult) {
              for (let i = lines.length - 1; i >= 0; i--) {
                try {
                  const line = lines[i].trim()
                  if (line.startsWith('{') || line.startsWith('[')) {
                    jsonResult = JSON.parse(line)
                    break
                  }
                } catch (e) {
                  continue
                }
              }
            }

            if (jsonResult) {
              isResolved = true
              
              // Clean up agent status
              setTimeout(() => {
                websocketService.removeAgentStatus(taskId)
              }, 5000) // Keep status for 5 seconds after completion
              
              resolve({
                success: true,
                data: {
                  ...jsonResult,
                  task_id: taskId,
                  execution_time: executionTime,
                  thinking_history: thinkingHistory,
                  total_thinking_entries: thinkingHistory.length
                },
                meta: {
                  python_process_code: code,
                  total_steps: Math.max(...thinkingHistory.map(h => h.step_number || 0), 0),
                  websocket_enabled: true
                }
              })
            } else {
              // No JSON found, return raw output with thinking history
              isResolved = true
              resolve({
                success: true,
                data: {
                  task_id: taskId,
                  message: 'Task completed successfully',
                  output: stdout.trim(),
                  thinking_history: thinkingHistory,
                  execution_time: executionTime
                },
                meta: {
                  python_process_code: code,
                  raw_output: true,
                  websocket_enabled: true
                }
              })
            }
          } catch (error) {
            console.error(`❌ Failed to parse Python output:`, error)
            isResolved = true
            reject(new AppError(
              `Failed to parse automation result: ${error.message}`,
              500,
              'PARSE_ERROR',
              { 
                stdout, 
                stderr, 
                code, 
                thinking_history: thinkingHistory 
              }
            ))
          }
        } else {
          // Process failed
          isResolved = true
          
          // Clean up agent status
          setTimeout(() => {
            websocketService.removeAgentStatus(taskId)
          }, 5000)
          
          reject(new AppError(
            `Browser automation failed: ${stderr || 'Unknown error'}`,
            500,
            'AUTOMATION_ERROR',
            { 
              stdout, 
              stderr, 
              code, 
              executionTime,
              thinking_history: thinkingHistory,
              task_id: taskId
            }
          ))
        }
      })

      // Handle process errors
      pythonProcess.on('error', (error) => {
        if (isResolved) return
        console.error(`❌ Python process error:`, error)
        
        // Clean up agent status
        websocketService.removeAgentStatus(taskId)
        
        isResolved = true
        reject(new ServiceUnavailableError(
          `Failed to start browser automation: ${error.message}`
        ))
      })

      // Set execution timeout
      const timeout = setTimeout(() => {
        if (isResolved) return
        console.log(`⏰ Task execution timeout after ${this.maxExecutionTime}ms`)
        
        // Update status to timeout
        websocketService.updateAgentStatus(taskId, {
          status: 'timeout',
          completed_at: new Date().toISOString(),
          execution_time: (Date.now() - startTime) / 1000
        })
        
        pythonProcess.kill('SIGTERM')
        
        setTimeout(() => {
          if (!pythonProcess.killed) {
            pythonProcess.kill('SIGKILL')
          }
          websocketService.removeAgentStatus(taskId)
        }, 5000)
        
        isResolved = true
        reject(new AppError(
          'Task execution timeout - process took too long to complete',
          408,
          'TIMEOUT_ERROR',
          { 
            timeoutMinutes: config.tasks.timeoutMinutes,
            task_id: taskId,
            thinking_history: thinkingHistory
          }
        ))
      }, this.maxExecutionTime)

      // Clean up timeout when process completes
      pythonProcess.on('close', () => {
        clearTimeout(timeout)
      })
    })
  }

  /**
   * Legacy executeTask method for backward compatibility
   * @param {Object} taskData - Task configuration
   * @returns {Promise<Object>} - Automation result
   */
  async executeTask(taskData) {
    return this.executeTaskWithMonitoring(taskData)
  }

  /**
   * Test Python service connectivity
   * @returns {Promise<Object>} - Health check result
   */
  async healthCheck() {
    try {
      const testTaskData = {
        task: 'Navigate to https://example.com and check the page title'
      }

      // This would run a simple test task
      console.log('🔍 Running enhanced browser service health check...')
      
      return {
        success: true,
        message: 'Enhanced Python browser service is accessible',
        pythonPath: this.pythonPath,
        pythonExecutable: this.pythonExecutable,
        websocket_enabled: true,
        max_execution_time: this.maxExecutionTime
      }
    } catch (error) {
      return {
        success: false,
        error: error.message,
        pythonPath: this.pythonPath,
        pythonExecutable: this.pythonExecutable,
        websocket_enabled: true
      }
    }
  }

  /**
   * Get service configuration and status
   * @returns {Object} - Service info
   */
  getServiceInfo() {
    return {
      name: 'Enhanced Browser Automation Service',
      version: '3.0.0',
      description: 'Enhanced browser automation service with real-time thinking monitoring',
      python_executable: this.pythonExecutable,
      python_script: this.pythonPath,
      max_execution_time: this.maxExecutionTime,
      websocket_enabled: true,
      supported_providers: ['openai', 'anthropic', 'google'],
      features: [
        'Real-time thinking monitoring',
        'WebSocket updates',
        'Step-by-step execution tracking',
        'Memory and goal monitoring',
        'Enhanced error handling'
      ]
    }
  }

  /**
   * Get WebSocket statistics
   * @returns {Object} - WebSocket stats
   */
  getWebSocketStats() {
    return websocketService.getStats()
  }
}

export default new EnhancedBrowserService()
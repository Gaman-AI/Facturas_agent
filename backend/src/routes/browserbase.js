import express from 'express'
import { asyncHandler } from '../middleware/errorHandler.js'
import { authenticate } from '../middleware/auth.js'
import browserAgentService from '../services/browserAgentService.js'

const router = express.Router()

/**
 * @route   POST /api/v1/browserbase/sessions
 * @desc    Create a new Browserbase session for live viewing
 * @access  Private
 */
router.post('/sessions', asyncHandler(async (req, res) => {
  const { context_name, keep_alive = true } = req.body
  
  if (!context_name) {
    return res.status(400).json({
      success: false,
      error: {
        code: 'MISSING_CONTEXT_NAME',
        message: 'context_name is required for session creation'
      }
    })
  }

  try {
    // Create a new browser session using the browser agent service
    const session = await browserAgentService.createSession({
      contextName: context_name,
      keepAlive: keep_alive,
      userId: 'anonymous' // For now, using anonymous user
    })

    res.status(201).json({
      success: true,
      session_id: session.id,
      live_view_url: `https://www.browserbase.com/sessions/${session.id}`,
      connect_url: session.connectUrl,
      status: 'created',
      context_name: context_name,
      keep_alive: keep_alive,
      created_at: new Date().toISOString()
    })

  } catch (error) {
    console.error('❌ Failed to create Browserbase session:', error)
    
    res.status(500).json({
      success: false,
      error: {
        code: 'SESSION_CREATION_FAILED',
        message: 'Failed to create browser session',
        details: error.message
      }
    })
  }
}))

/**
 * @route   POST /api/v1/browserbase/execute
 * @desc    Execute a task in a Browserbase session
 * @access  Private
 */
router.post('/execute', asyncHandler(async (req, res) => {
  const {
    session_id,
    task,
    llm_provider = 'openai',
    model = 'gpt-4o-mini-2024-07-18',
    max_steps = 30,
    vendor_url
  } = req.body

  if (!session_id || !task) {
    return res.status(400).json({
      success: false,
      error: {
        code: 'MISSING_REQUIRED_FIELDS',
        message: 'session_id and task are required'
      }
    })
  }

  try {
    // Create and execute the task using the browser agent service
    const taskResult = await browserAgentService.createTask('anonymous', {
      prompt: task,
      vendor_url,
      model,
      llm_provider,
      max_steps,
      session_id,
      request_id: req.headers['x-request-id'] || `exec_${Date.now()}`
    })

    res.status(200).json({
      success: true,
      result: {
        task_id: taskResult.id,
        status: taskResult.status,
        session_id: session_id,
        execution_started: true,
        model: model,
        max_steps: max_steps,
        vendor_url: vendor_url
      },
      message: 'Task execution started successfully'
    })

  } catch (error) {
    console.error('❌ Failed to execute task in Browserbase session:', error)
    
    res.status(500).json({
      success: false,
      error: {
        code: 'TASK_EXECUTION_FAILED',
        message: 'Failed to execute task in browser session',
        details: error.message
      }
    })
  }
}))

/**
 * @route   GET /api/v1/browserbase/sessions/:sessionId
 * @desc    Get session status and details
 * @access  Private
 */
router.get('/sessions/:sessionId', asyncHandler(async (req, res) => {
  const { sessionId } = req.params

  try {
    // Get session details from browser agent service
    const session = await browserAgentService.getSession(sessionId, 'anonymous')

    if (!session) {
      return res.status(404).json({
        success: false,
        error: {
          code: 'SESSION_NOT_FOUND',
          message: 'Browser session not found'
        }
      })
    }

    res.json({
      success: true,
      session_id: session.id,
      status: session.status,
      live_view_url: `https://www.browserbase.com/sessions/${session.id}`,
      connect_url: session.connectUrl,
      context_name: session.contextName,
      keep_alive: session.keepAlive,
      created_at: session.createdAt,
      last_activity: session.lastActivity
    })

  } catch (error) {
    console.error('❌ Failed to get Browserbase session:', error)
    
    res.status(500).json({
      success: false,
      error: {
        code: 'SESSION_FETCH_FAILED',
        message: 'Failed to retrieve browser session',
        details: error.message
      }
    })
  }
}))

/**
 * @route   DELETE /api/v1/browserbase/sessions/:sessionId
 * @desc    Close a Browserbase session
 * @access  Private
 */
router.delete('/sessions/:sessionId', asyncHandler(async (req, res) => {
  const { sessionId } = req.params

  try {
    // Close the session using browser agent service
    const closed = await browserAgentService.closeSession(sessionId, 'anonymous')

    if (!closed) {
      return res.status(404).json({
        success: false,
        error: {
          code: 'SESSION_NOT_FOUND',
          message: 'Browser session not found or already closed'
        }
      })
    }

    res.json({
      success: true,
      session_id: sessionId,
      message: 'Session closed successfully'
    })

  } catch (error) {
    console.error('❌ Failed to close Browserbase session:', error)
    
    res.status(500).json({
      success: false,
      error: {
        code: 'SESSION_CLOSE_FAILED',
        message: 'Failed to close browser session',
        details: error.message
      }
    })
  }
}))

/**
 * @route   GET /api/v1/browserbase/health
 * @desc    Check Browserbase service health
 * @access  Public
 */
router.get('/health', asyncHandler(async (req, res) => {
  try {
    const health = await browserAgentService.healthCheck()

    res.json({
      success: true,
      service: 'browserbase',
      status: health.status,
      timestamp: new Date().toISOString(),
      details: health
    })

  } catch (error) {
    console.error('❌ Browserbase health check failed:', error)
    
    res.status(503).json({
      success: false,
      service: 'browserbase',
      status: 'unhealthy',
      error: error.message,
      timestamp: new Date().toISOString()
    })
  }
}))

export default router

import express from 'express'
import { authenticate } from '../middleware/auth.js'
import { validateCreateTask, validateTaskQuery, validateTaskParams, validateCFDIData } from '../middleware/validation.js'
import { asyncHandler } from '../middleware/errorHandler.js'
import browserService from '../services/browserService.js'
import browserAgentService from '../services/browserAgentService.js'
import taskService from '../services/taskService.js'
import queueService from '../services/queueService.js'

const router = express.Router()

/**
 * @route   GET /api/v1/tasks (without query params)
 * @desc    Get tasks module information
 * @access  Public
 */
router.get('/', authenticate, validateTaskQuery, asyncHandler(async (req, res) => {
  // If no query parameters, show module info instead of tasks
  if (Object.keys(req.query).length === 0) {
    return res.json({
      success: true,
      data: {
        module: 'Task Management',
        version: '1.0.0',
        description: 'CFDI automation task management and execution',
        endpoints: {
          listTasks: 'GET /api/v1/tasks?page=1&limit=10',
          createTask: 'POST /api/v1/tasks',
          getTask: 'GET /api/v1/tasks/:taskId',
          executeTask: 'POST /api/v1/tasks/execute',
          pauseTask: 'PUT /api/v1/tasks/:taskId/pause',
          resumeTask: 'PUT /api/v1/tasks/:taskId/resume',
          deleteTask: 'DELETE /api/v1/tasks/:taskId',
          getStats: 'GET /api/v1/tasks/stats',
          browserHealth: 'GET /api/v1/tasks/browser/health'
        },
        features: [
          'CFDI automation execution',
          'Task queue management',
          'Real-time status updates',
          'Browser session management',
          'Multi-vendor support'
        ],
        user: {
          id: req.user.id,
          email: req.user.email
        }
      },
      meta: {
        timestamp: new Date().toISOString(),
        requestId: req.id
      }
    })
  }

  // Get tasks from database using TaskService
  const { page = 1, limit = 10, status } = req.query
  const userId = req.user.id

  // Query database for user tasks
  const { tasks, total, error } = await taskService.getUserTasks(userId, { 
    page: parseInt(page), 
    limit: parseInt(limit), 
    status 
  })

  if (error) {
    return res.status(500).json({
      success: false,
      error: {
        code: 'TASK_FETCH_FAILED',
        message: 'Failed to retrieve tasks',
        details: error
      },
      meta: {
        timestamp: new Date().toISOString(),
        requestId: req.id
      }
    })
  }

  res.json({
    success: true,
    data: tasks,
    meta: {
      timestamp: new Date().toISOString(),
      requestId: req.id,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total,
        totalPages: Math.ceil(total / parseInt(limit))
      }
    }
  })
}))

/**
 * @route   POST /api/v1/tasks
 * @desc    Create a new CFDI automation task
 * @access  Private
 */
router.post('/', authenticate, validateCreateTask, asyncHandler(async (req, res) => {
  const userId = req.user.id
  const taskData = req.body

  // Validate task data using browser service
  const validation = browserService.validateTaskData(taskData)
  if (!validation.isValid) {
    return res.status(400).json({
      success: false,
      error: {
        code: 'TASK_VALIDATION_FAILED',
        message: 'Task data validation failed',
        details: validation.errors
      },
      meta: {
        timestamp: new Date().toISOString(),
        requestId: req.id
      }
    })
  }

  // Create task in database using TaskService
  const { task, error } = await taskService.createTask(userId, taskData)

  if (error) {
    return res.status(500).json({
      success: false,
      error: {
        code: 'TASK_CREATION_FAILED',
        message: 'Failed to create task in database',
        details: error
      },
      meta: {
        timestamp: new Date().toISOString(),
        requestId: req.id
      }
    })
  }

  // Add task to Redis queue for processing
  const { job, error: queueError } = await queueService.addTask(task.id, {
    ...taskData,
    userId: userId
  })

  if (queueError) {
    // Update task status to failed if queuing fails
    await taskService.updateTaskStatus(task.id, userId, 'FAILED', {
      failure_reason: `Queue error: ${queueError}`
    })

    return res.status(500).json({
      success: false,
      error: {
        code: 'TASK_QUEUE_FAILED',
        message: 'Task created but failed to queue for processing',
        details: queueError
      },
      meta: {
        timestamp: new Date().toISOString(),
        requestId: req.id
      }
    })
  }
  
  res.status(201).json({
    success: true,
    data: {
      task: task,
      message: 'Task created and queued for processing'
    },
    meta: {
      timestamp: new Date().toISOString(),
      requestId: req.id
    }
  })
}))

/**
 * @route   GET /api/v1/tasks/:taskId
 * @desc    Get specific task details with steps
 * @access  Private
 */
router.get('/:taskId', authenticate, validateTaskParams, asyncHandler(async (req, res) => {
  const { taskId } = req.params
  const userId = req.user.id

  // Get task with steps from database using TaskService
  const { task, steps, error } = await taskService.getTaskWithSteps(taskId, userId)

  if (error) {
    const statusCode = error.includes('not found') ? 404 : 500
    return res.status(statusCode).json({
      success: false,
      error: {
        code: statusCode === 404 ? 'TASK_NOT_FOUND' : 'TASK_FETCH_FAILED',
        message: error,
        details: { task_id: taskId }
      },
      meta: {
        timestamp: new Date().toISOString(),
        requestId: req.id
      }
    })
  }

  // Combine task and steps in response
  const taskWithSteps = {
    ...task,
    steps: steps
  }

  res.json({
    success: true,
    data: taskWithSteps,
    meta: {
      timestamp: new Date().toISOString(),
      requestId: req.id
    }
  })
}))

/**
 * @route   POST /api/v1/tasks/execute
 * @desc    Execute a CFDI automation task immediately (for testing/demo)
 * @access  Private
 */
router.post('/execute', authenticate, validateCFDIData, asyncHandler(async (req, res) => {
  const taskData = req.body

  try {
    console.log('🚀 Executing CFDI automation task directly')
    
    // Execute the task using browser service
    const result = await browserService.executeCFDITask(taskData)

    if (result.success) {
      res.json({
        success: true,
        data: {
          task_id: `exec_${Date.now()}`,
          status: 'COMPLETED',
          result: result,
          execution_time: result.execution_time,
          logs: result.session_log || []
        },
        meta: {
          timestamp: new Date().toISOString(),
          requestId: req.id,
          message: 'Task executed successfully'
        }
      })
    } else {
      res.status(500).json({
        success: false,
        error: {
          code: 'TASK_EXECUTION_FAILED',
          message: result.error || 'Task execution failed',
          details: {
            error_type: result.error_type,
            execution_time: result.execution_time,
            logs: result.session_log || []
          }
        },
        meta: {
          timestamp: new Date().toISOString(),
          requestId: req.id
        }
      })
    }
  } catch (error) {
    console.error('❌ Task execution error:', error)
    
    res.status(500).json({
      success: false,
      error: {
        code: 'TASK_EXECUTION_ERROR',
        message: error.message || 'Unexpected task execution error',
        details: error.details || null
      },
      meta: {
        timestamp: new Date().toISOString(),
        requestId: req.id
      }
    })
  }
}))

/**
 * @route   PUT /api/v1/tasks/:taskId/pause
 * @desc    Pause a running task
 * @access  Private
 */
router.put('/:taskId/pause', authenticate, validateTaskParams, asyncHandler(async (req, res) => {
  const { taskId } = req.params
  const userId = req.user.id

  // Update task status to PAUSED in database
  const { task, error } = await taskService.updateTaskStatus(taskId, userId, 'PAUSED')

  if (error) {
    const statusCode = error.includes('not found') ? 404 : 500
    return res.status(statusCode).json({
      success: false,
      error: {
        code: statusCode === 404 ? 'TASK_NOT_FOUND' : 'TASK_UPDATE_FAILED',
        message: error,
        details: { task_id: taskId }
      },
      meta: {
        timestamp: new Date().toISOString(),
        requestId: req.id
      }
    })
  }

  // Remove task from queue (pause implementation)
  const { success: pauseSuccess, error: pauseError } = await queueService.pauseTask(taskId)
  
  if (pauseError) {
    console.warn(`⚠️ Failed to pause task in queue: ${pauseError}`)
    // Don't fail the request - task is paused in DB
  }

  res.json({
    success: true,
    data: {
      task_id: taskId,
      status: task.status,
      message: 'Task paused successfully'
    },
    meta: {
      timestamp: new Date().toISOString(),
      requestId: req.id
    }
  })
}))

/**
 * @route   PUT /api/v1/tasks/:taskId/resume
 * @desc    Resume a paused task
 * @access  Private
 */
router.put('/:taskId/resume', authenticate, validateTaskParams, asyncHandler(async (req, res) => {
  const { taskId } = req.params
  const userId = req.user.id

  // Get task details for re-queuing
  const { task: taskDetails, error: fetchError } = await taskService.getTask(taskId, userId)
  
  if (fetchError) {
    const statusCode = fetchError.includes('not found') ? 404 : 500
    return res.status(statusCode).json({
      success: false,
      error: {
        code: statusCode === 404 ? 'TASK_NOT_FOUND' : 'TASK_FETCH_FAILED',
        message: fetchError,
        details: { task_id: taskId }
      },
      meta: {
        timestamp: new Date().toISOString(),
        requestId: req.id
      }
    })
  }

  // Update task status to RUNNING in database
  const { task, error } = await taskService.updateTaskStatus(taskId, userId, 'RUNNING')

  if (error) {
    return res.status(500).json({
      success: false,
      error: {
        code: 'TASK_UPDATE_FAILED',
        message: error,
        details: { task_id: taskId }
      },
      meta: {
        timestamp: new Date().toISOString(),
        requestId: req.id
      }
    })
  }

  // Re-queue task for processing
  const { success: resumeSuccess, error: resumeError } = await queueService.resumeTask(taskId, {
    vendor_url: taskDetails.vendor_url,
    ticket_details: taskDetails.ticket_details,
    userId: userId
  })

  if (resumeError) {
    console.warn(`⚠️ Failed to resume task in queue: ${resumeError}`)
    // Update status back to PAUSED
    await taskService.updateTaskStatus(taskId, userId, 'PAUSED')
    
    return res.status(500).json({
      success: false,
      error: {
        code: 'TASK_RESUME_FAILED',
        message: 'Failed to resume task in queue',
        details: resumeError
      },
      meta: {
        timestamp: new Date().toISOString(),
        requestId: req.id
      }
    })
  }

  res.json({
    success: true,
    data: {
      task_id: taskId,
      status: task.status,
      message: 'Task resumed successfully'
    },
    meta: {
      timestamp: new Date().toISOString(),
      requestId: req.id
    }
  })
}))

/**
 * @route   DELETE /api/v1/tasks/:taskId
 * @desc    Cancel/delete a task
 * @access  Private
 */
router.delete('/:taskId', authenticate, validateTaskParams, asyncHandler(async (req, res) => {
  const { taskId } = req.params
  const userId = req.user.id

  // Cancel task in queue first
  const { success: cancelSuccess, error: cancelError } = await queueService.cancelTask(taskId)
  
  if (cancelError) {
    console.warn(`⚠️ Failed to cancel task in queue: ${cancelError}`)
    // Continue with deletion anyway
  }

  // Delete task from database using TaskService
  const { success, error } = await taskService.deleteTask(taskId, userId)

  if (error) {
    const statusCode = error.includes('not found') ? 404 : 500
    return res.status(statusCode).json({
      success: false,
      error: {
        code: statusCode === 404 ? 'TASK_NOT_FOUND' : 'TASK_DELETE_FAILED',
        message: error,
        details: { task_id: taskId }
      },
      meta: {
        timestamp: new Date().toISOString(),
        requestId: req.id
      }
    })
  }

  res.json({
    success: true,
    data: {
      task_id: taskId,
      message: 'Task cancelled and removed successfully'
    },
    meta: {
      timestamp: new Date().toISOString(),
      requestId: req.id
    }
  })
}))

/**
 * @route   GET /api/v1/tasks/stats
 * @desc    Get user's task statistics
 * @access  Private
 */
router.get('/stats', authenticate, asyncHandler(async (req, res) => {
  const userId = req.user.id

  // Get real statistics from database using TaskService
  const { stats, error } = await taskService.getUserTaskStats(userId)

  if (error) {
    return res.status(500).json({
      success: false,
      error: {
        code: 'STATS_FETCH_FAILED',
        message: 'Failed to retrieve task statistics',
        details: error
      },
      meta: {
        timestamp: new Date().toISOString(),
        requestId: req.id
      }
    })
  }

  res.json({
    success: true,
    data: stats,
    meta: {
      timestamp: new Date().toISOString(),
      requestId: req.id
    }
  })
}))

/**
 * @route   GET /api/v1/tasks/queue/stats
 * @desc    Get task queue statistics
 * @access  Private
 */
router.get('/queue/stats', authenticate, asyncHandler(async (req, res) => {
  try {
    const { stats, error } = await queueService.getQueueStats()

    if (error) {
      return res.status(500).json({
        success: false,
        error: {
          code: 'QUEUE_STATS_FAILED',
          message: 'Failed to retrieve queue statistics',
          details: error
        },
        meta: {
          timestamp: new Date().toISOString(),
          requestId: req.id
        }
      })
    }

    res.json({
      success: true,
      data: stats,
      meta: {
        timestamp: new Date().toISOString(),
        requestId: req.id
      }
    })

  } catch (error) {
    console.error('❌ Queue stats endpoint error:', error)
    
    res.status(500).json({
      success: false,
      error: {
        code: 'QUEUE_STATS_ERROR',
        message: 'Unexpected error retrieving queue statistics',
        details: error.message
      },
      meta: {
        timestamp: new Date().toISOString(),
        requestId: req.id
      }
    })
  }
}))

/**
 * @route   GET /api/v1/tasks/queue/health
 * @desc    Check queue service health
 * @access  Private
 */
router.get('/queue/health', authenticate, asyncHandler(async (req, res) => {
  try {
    const { status, error } = await queueService.healthCheck()

    const statusCode = status === 'healthy' ? 200 : 503

    res.status(statusCode).json({
      success: status === 'healthy',
      data: {
        status,
        error,
        timestamp: new Date().toISOString()
      },
      meta: {
        timestamp: new Date().toISOString(),
        requestId: req.id
      }
    })

  } catch (error) {
    console.error('❌ Queue health check endpoint error:', error)
    
    res.status(503).json({
      success: false,
      error: {
        code: 'QUEUE_HEALTH_ERROR',
        message: 'Queue service health check failed',
        details: error.message
      },
      meta: {
        timestamp: new Date().toISOString(),
        requestId: req.id
      }
    })
  }
}))

/**
 * @route   GET /api/v1/tasks/browser/health
 * @desc    Check browser service health
 * @access  Private
 */
router.get('/browser/health', authenticate, asyncHandler(async (req, res) => {
  try {
    const healthCheck = await browserService.healthCheck()
    const serviceInfo = browserService.getServiceInfo()

    res.json({
      success: true,
      data: {
        health: healthCheck,
        service: serviceInfo
      },
      meta: {
        timestamp: new Date().toISOString(),
        requestId: req.id
      }
    })
  } catch (error) {
    res.status(503).json({
      success: false,
      error: {
        code: 'BROWSER_SERVICE_UNAVAILABLE',
        message: 'Browser service health check failed',
        details: error.message
      },
      meta: {
        timestamp: new Date().toISOString(),
        requestId: req.id
      }
    })
  }
}))

/**
 * ==========================================================================
 * BROWSER-USE INTEGRATION ENDPOINTS
 * ==========================================================================
 */

/**
 * @route   POST /api/v1/tasks/browser-use
 * @desc    Create and execute a browser automation task using local browser-use
 * @access  Private
 */
router.post('/browser-use', authenticate, asyncHandler(async (req, res) => {
  const userId = req.user.id
  const {
    prompt,
    vendor_url,
    customer_details,
    invoice_details,
    model,
    temperature,
    max_steps,
    timeout_minutes
  } = req.body

  // Validate required fields
  if (!prompt && !vendor_url) {
    return res.status(400).json({
      success: false,
      error: {
        code: 'VALIDATION_ERROR',
        message: 'Either prompt or vendor_url must be provided',
        details: { fields: ['prompt', 'vendor_url'] }
      },
      meta: {
        timestamp: new Date().toISOString(),
        requestId: req.id
      }
    })
  }

  try {
    // Create the browser task
    const task = await browserAgentService.createTask(userId, {
      prompt,
      vendor_url,
      customer_details,
      invoice_details,
      model,
      temperature,
      max_steps,
      timeout_minutes,
      request_id: req.id,
      user_agent: req.headers['user-agent'],
      ip_address: req.ip
    })

    res.status(201).json({
      success: true,
      data: {
        task_id: task.id,
        status: task.status,
        created_at: task.createdAt,
        prompt: task.prompt ? task.prompt.substring(0, 100) + '...' : null,
        vendor_url: task.vendorUrl,
        model: task.model,
        max_steps: task.maxSteps
      },
      meta: {
        timestamp: new Date().toISOString(),
        requestId: req.id
      }
    })

  } catch (error) {
    console.error('❌ Browser task creation failed:', error)
    
    res.status(500).json({
      success: false,
      error: {
        code: 'BROWSER_TASK_CREATION_FAILED',
        message: 'Failed to create browser automation task',
        details: error.message
      },
      meta: {
        timestamp: new Date().toISOString(),
        requestId: req.id
      }
    })
  }
}))

/**
 * @route   GET /api/v1/tasks/browser-use/:taskId
 * @desc    Get browser task status and result
 * @access  Private
 */
router.get('/browser-use/:taskId', authenticate, validateTaskParams, asyncHandler(async (req, res) => {
  const { taskId } = req.params
  const userId = req.user.id

  try {
    const task = browserAgentService.getTask(taskId, userId)

    if (!task) {
      return res.status(404).json({
        success: false,
        error: {
          code: 'TASK_NOT_FOUND',
          message: 'Browser task not found or access denied',
          details: { task_id: taskId }
        },
        meta: {
          timestamp: new Date().toISOString(),
          requestId: req.id
        }
      })
    }

    res.json({
      success: true,
      data: {
        task_id: task.id,
        status: task.status,
        created_at: task.createdAt,
        started_at: task.startedAt,
        completed_at: task.completedAt,
        execution_time_ms: task.executionTimeMs,
        model: task.model,
        max_steps: task.maxSteps,
        result: task.result,
        error: task.error,
        error_type: task.errorType,
        prompt: task.prompt
      },
      meta: {
        timestamp: new Date().toISOString(),
        requestId: req.id
      }
    })

  } catch (error) {
    console.error('❌ Failed to get browser task:', error)
    
    res.status(500).json({
      success: false,
      error: {
        code: 'BROWSER_TASK_FETCH_FAILED',
        message: 'Failed to retrieve browser task',
        details: error.message
      },
      meta: {
        timestamp: new Date().toISOString(),
        requestId: req.id
      }
    })
  }
}))

/**
 * @route   GET /api/v1/tasks/browser-use
 * @desc    Get all browser tasks for the authenticated user
 * @access  Private
 */
router.get('/browser-use', authenticate, asyncHandler(async (req, res) => {
  const userId = req.user.id
  const { 
    limit = 20, 
    offset = 0, 
    status = null,
    sort_by = 'createdAt',
    sort_order = 'desc'
  } = req.query

  try {
    const result = browserAgentService.getUserTasks(userId, {
      limit: parseInt(limit),
      offset: parseInt(offset),
      status,
      sortBy: sort_by,
      sortOrder: sort_order
    })

    res.json({
      success: true,
      data: {
        tasks: result.tasks.map(task => ({
          task_id: task.id,
          status: task.status,
          created_at: task.createdAt,
          started_at: task.startedAt,
          completed_at: task.completedAt,
          execution_time_ms: task.executionTimeMs,
          model: task.model,
          vendor_url: task.vendorUrl,
          result: task.status === 'completed' ? task.result : null,
          error: task.error,
          prompt_preview: task.prompt ? task.prompt.substring(0, 100) + '...' : null
        })),
        total_count: result.totalCount,
        has_more: result.hasMore,
        limit: parseInt(limit),
        offset: parseInt(offset)
      },
      meta: {
        timestamp: new Date().toISOString(),
        requestId: req.id
      }
    })

  } catch (error) {
    console.error('❌ Failed to get browser tasks:', error)
    
    res.status(500).json({
      success: false,
      error: {
        code: 'BROWSER_TASKS_FETCH_FAILED',
        message: 'Failed to retrieve browser tasks',
        details: error.message
      },
      meta: {
        timestamp: new Date().toISOString(),
        requestId: req.id
      }
    })
  }
}))

/**
 * @route   POST /api/v1/tasks/browser-use/:taskId/cancel
 * @desc    Cancel a running browser task
 * @access  Private
 */
router.post('/browser-use/:taskId/cancel', authenticate, validateTaskParams, asyncHandler(async (req, res) => {
  const { taskId } = req.params
  const userId = req.user.id

  try {
    const cancelled = await browserAgentService.cancelTask(taskId, userId)

    if (!cancelled) {
      return res.status(400).json({
        success: false,
        error: {
          code: 'TASK_NOT_CANCELLABLE',
          message: 'Task not found, not running, or access denied',
          details: { task_id: taskId }
        },
        meta: {
          timestamp: new Date().toISOString(),
          requestId: req.id
        }
      })
    }

    res.json({
      success: true,
      data: {
        task_id: taskId,
        status: 'cancelled',
        message: 'Task cancelled successfully'
      },
      meta: {
        timestamp: new Date().toISOString(),
        requestId: req.id
      }
    })

  } catch (error) {
    console.error('❌ Failed to cancel browser task:', error)
    
    res.status(500).json({
      success: false,
      error: {
        code: 'BROWSER_TASK_CANCEL_FAILED',
        message: 'Failed to cancel browser task',
        details: error.message
      },
      meta: {
        timestamp: new Date().toISOString(),
        requestId: req.id
      }
    })
  }
}))

/**
 * @route   DELETE /api/v1/tasks/browser-use/:taskId
 * @desc    Delete a browser task
 * @access  Private
 */
router.delete('/browser-use/:taskId', authenticate, validateTaskParams, asyncHandler(async (req, res) => {
  const { taskId } = req.params
  const userId = req.user.id

  try {
    const deleted = browserAgentService.deleteTask(taskId, userId)

    if (!deleted) {
      return res.status(400).json({
        success: false,
        error: {
          code: 'TASK_NOT_DELETABLE',
          message: 'Task not found, still running, or access denied',
          details: { task_id: taskId }
        },
        meta: {
          timestamp: new Date().toISOString(),
          requestId: req.id
        }
      })
    }

    res.json({
      success: true,
      data: {
        task_id: taskId,
        message: 'Task deleted successfully'
      },
      meta: {
        timestamp: new Date().toISOString(),
        requestId: req.id
      }
    })

  } catch (error) {
    console.error('❌ Failed to delete browser task:', error)
    
    res.status(500).json({
      success: false,
      error: {
        code: 'BROWSER_TASK_DELETE_FAILED',
        message: 'Failed to delete browser task',
        details: error.message
      },
      meta: {
        timestamp: new Date().toISOString(),
        requestId: req.id
      }
    })
  }
}))

/**
 * @route   GET /api/v1/tasks/browser-use/stats
 * @desc    Get browser task statistics
 * @access  Private
 */
router.get('/browser-use/stats', authenticate, asyncHandler(async (req, res) => {
  const userId = req.user.id

  try {
    const stats = browserAgentService.getStats(userId)

    res.json({
      success: true,
      data: stats,
      meta: {
        timestamp: new Date().toISOString(),
        requestId: req.id
      }
    })

  } catch (error) {
    console.error('❌ Failed to get browser task stats:', error)
    
    res.status(500).json({
      success: false,
      error: {
        code: 'BROWSER_STATS_FAILED',
        message: 'Failed to retrieve browser task statistics',
        details: error.message
      },
      meta: {
        timestamp: new Date().toISOString(),
        requestId: req.id
      }
    })
  }
}))

/**
 * @route   GET /api/v1/tasks/browser-use/health
 * @desc    Check browser-use service health
 * @access  Private
 */
router.get('/browser-use/health', authenticate, asyncHandler(async (req, res) => {
  try {
    const health = await browserAgentService.healthCheck()

    const statusCode = health.status === 'healthy' ? 200 : 503

    res.status(statusCode).json({
      success: health.status === 'healthy',
      data: health,
      meta: {
        timestamp: new Date().toISOString(),
        requestId: req.id
      }
    })

  } catch (error) {
    console.error('❌ Browser service health check failed:', error)
    
    res.status(503).json({
      success: false,
      error: {
        code: 'BROWSER_SERVICE_UNAVAILABLE',
        message: 'Browser service health check failed',
        details: error.message
      },
      meta: {
        timestamp: new Date().toISOString(),
        requestId: req.id
      }
    })
  }
}))

export default router 
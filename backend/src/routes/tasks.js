import express from 'express'
import { validateCreateTask, validateTaskQuery, validateTaskParams } from '../middleware/validation.js'
import { asyncHandler } from '../middleware/errorHandler.js'
import browserService from '../services/browserService.js'
import browserAgentService from '../services/browserAgentService.js'

const router = express.Router()

/**
 * @route   GET /api/v1/tasks (without query params)
 * @desc    Get tasks module information
 * @access  Public
 */
router.get('/', validateTaskQuery, asyncHandler(async (req, res) => {
  // If no query parameters, show module info instead of tasks
  if (Object.keys(req.query).length === 0) {
    return res.json({
      success: true,
      data: {
        module: 'Task Management',
        version: '1.0.0',
        description: 'Browser automation task management and execution',
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
          'Browser automation execution',
          'Task queue management', 
          'Real-time status updates',
          'Browser session management',
          'Flexible task instructions'
        ],
        user: 'anonymous'
      },
      meta: {
        timestamp: new Date().toISOString(),
        requestId: req.id
      }
    })
  }

  // Original task listing logic
  const { page, limit, status } = req.query
  const userId = 'anonymous'

  // For now, return mock data since we haven't implemented the full task service yet
  // In a real implementation, this would query the Supabase database using MCP
  const mockTasks = [
    {
      id: '123e4567-e89b-12d3-a456-426614174000',
      user_id: userId,
          task_description: 'Go to https://facturacion.example.com and process invoice for RFC XAXX010101000',
      status: 'COMPLETED',
      created_at: new Date().toISOString(),
      completed_at: new Date().toISOString(),
      result: {
        success: true,
        execution_time: 45.2
      }
    }
  ]

  // Filter by status if provided
  const filteredTasks = status 
    ? mockTasks.filter(task => task.status === status)
    : mockTasks

  // Apply pagination
  const startIndex = (page - 1) * limit
  const paginatedTasks = filteredTasks.slice(startIndex, startIndex + limit)

  res.json({
    success: true,
    data: paginatedTasks,
    meta: {
      timestamp: new Date().toISOString(),
      requestId: req.id,
      pagination: {
        page,
        limit,
        total: filteredTasks.length,
        totalPages: Math.ceil(filteredTasks.length / limit)
      }
    }
  })
}))

/**
 * @route   POST /api/v1/tasks
 * @desc    Create a new browser automation task
 * @access  Private
 */
router.post('/', validateCreateTask, asyncHandler(async (req, res) => {
  const userId = 'anonymous'
  const { task, model, llm_provider, timeout_minutes } = req.body

  // Create task record (would use Supabase MCP in real implementation)
  const taskId = `task_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
  
  const newTask = {
    id: taskId,
    user_id: userId,
    task_description: task,
    model: model || 'gpt-4o-mini',
    llm_provider: llm_provider || 'openai',
    timeout_minutes: timeout_minutes || 30,
    status: 'PENDING',
    created_at: new Date().toISOString(),
    started_at: null,
    completed_at: null,
    result: null,
    error_message: null
  }

  // Here we would:
  // 1. Insert task into Supabase using MCP
  // 2. Add task to Redis queue for processing
  // 3. Return task details

  res.status(201).json({
    success: true,
    data: {
      task: newTask,
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
router.get('/:taskId', validateTaskParams, asyncHandler(async (req, res) => {
  const { taskId } = req.params
  const userId = 'anonymous'

  // Mock task details (would query Supabase using MCP in real implementation)
  const mockTask = {
    id: taskId,
    user_id: userId,
    task_description: 'Go to https://facturacion.example.com and process invoice for RFC XAXX010101000',
    status: 'COMPLETED',
    created_at: new Date().toISOString(),
    started_at: new Date().toISOString(),
    completed_at: new Date().toISOString(),
    result: {
      success: true,
      execution_time: 45.2,
              task_description: 'Go to https://facturacion.example.com and process invoice for RFC XAXX010101000'
    },
    steps: [
      {
        id: 1,
        step_type: 'navigation',
        content: { url: 'https://facturacion.example.com', action: 'navigate' },
        status: 'completed',
        timestamp: new Date().toISOString()
      },
      {
        id: 2,
        step_type: 'form_fill',
        content: { field: 'rfc', value: 'XAXX010101000' },
        status: 'completed',
        timestamp: new Date().toISOString()
      },
      {
        id: 3,
        step_type: 'submission',
        content: { action: 'submit_form', success: true },
        status: 'completed',
        timestamp: new Date().toISOString()
      }
    ]
  }

  res.json({
    success: true,
    data: mockTask,
    meta: {
      timestamp: new Date().toISOString(),
      requestId: req.id
    }
  })
}))

/**
 * @route   POST /api/v1/tasks/execute
 * @desc    Execute a browser automation task immediately (for testing/demo)
 * @access  Private
 */
router.post('/execute', validateCreateTask, asyncHandler(async (req, res) => {
  const { task, model, llm_provider, timeout_minutes } = req.body

  try {
    console.log('🚀 Executing browser automation task directly')
    
    // Prepare simplified task data
    const taskData = {
      task,
      model: model || 'gpt-4o-mini',
      llm_provider: llm_provider || 'openai',
      timeout_minutes: timeout_minutes || 30
    }
    
    // Execute the task using browser service
    const result = await browserService.executeTask(taskData)

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
router.put('/:taskId/pause', validateTaskParams, asyncHandler(async (req, res) => {
  const { taskId } = req.params
  const userId = 'anonymous'

  // In real implementation, this would:
  // 1. Check if task belongs to user
  // 2. Check if task is running
  // 3. Send pause signal to queue/worker
  // 4. Update task status in database

  res.json({
    success: true,
    data: {
      task_id: taskId,
      status: 'PAUSED',
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
router.put('/:taskId/resume', validateTaskParams, asyncHandler(async (req, res) => {
  const { taskId } = req.params
  const userId = 'anonymous'

  // In real implementation, this would:
  // 1. Check if task belongs to user
  // 2. Check if task is paused
  // 3. Re-queue task for processing
  // 4. Update task status in database

  res.json({
    success: true,
    data: {
      task_id: taskId,
      status: 'RUNNING',
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
router.delete('/:taskId', validateTaskParams, asyncHandler(async (req, res) => {
  const { taskId } = req.params
  const userId = 'anonymous'

  // In real implementation, this would:
  // 1. Check if task belongs to user
  // 2. Stop task if running
  // 3. Remove from queue
  // 4. Delete from database

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
router.get('/stats', asyncHandler(async (req, res) => {
  const userId = 'anonymous'

  // Mock statistics (would query Supabase using MCP in real implementation)
  const stats = {
    total_tasks: 15,
    completed_tasks: 12,
    failed_tasks: 2,
    pending_tasks: 1,
    success_rate: 80.0,
    avg_execution_time: 42.5,
    total_automation_time_saved: 1800, // seconds
    most_used_vendor: 'facturacion.example.com',
    last_task_date: new Date().toISOString()
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
 * @route   GET /api/v1/tasks/browser/health
 * @desc    Check browser service health
 * @access  Private
 */
router.get('/browser/health', asyncHandler(async (req, res) => {
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
router.post('/browser-use', asyncHandler(async (req, res) => {
  const userId = 'anonymous'
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
router.get('/browser-use/:taskId', validateTaskParams, asyncHandler(async (req, res) => {
  const { taskId } = req.params
  const userId = 'anonymous'

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
router.get('/browser-use', asyncHandler(async (req, res) => {
  const userId = 'anonymous'
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
router.post('/browser-use/:taskId/cancel', validateTaskParams, asyncHandler(async (req, res) => {
  const { taskId } = req.params
  const userId = 'anonymous'

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
router.delete('/browser-use/:taskId', validateTaskParams, asyncHandler(async (req, res) => {
  const { taskId } = req.params
  const userId = 'anonymous'

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
router.get('/browser-use/stats', asyncHandler(async (req, res) => {
  const userId = 'anonymous'

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
router.get('/browser-use/health', asyncHandler(async (req, res) => {
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
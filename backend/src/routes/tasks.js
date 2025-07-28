import express from 'express'
import { authenticate } from '../middleware/auth.js'
import { validateCreateTask, validateTaskQuery, validateTaskParams, validateCFDIData } from '../middleware/validation.js'
import { asyncHandler } from '../middleware/errorHandler.js'
import browserService from '../services/browserService.js'

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

  // Original task listing logic
  const { page, limit, status } = req.query
  const userId = req.user.id

  // For now, return mock data since we haven't implemented the full task service yet
  // In a real implementation, this would query the Supabase database using MCP
  const mockTasks = [
    {
      id: '123e4567-e89b-12d3-a456-426614174000',
      user_id: userId,
      vendor_url: 'https://facturacion.example.com',
      ticket_details: {
        customer_details: {
          rfc: 'XAXX010101000',
          company_name: 'Test Company',
          email: 'test@example.com'
        },
        invoice_details: {
          folio: 'ABC123',
          total: 1500.00,
          currency: 'MXN'
        }
      },
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

  // Create task record (would use Supabase MCP in real implementation)
  const taskId = `task_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
  
  const newTask = {
    id: taskId,
    user_id: userId,
    vendor_url: taskData.vendor_url,
    ticket_details: taskData.ticket_details,
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
router.get('/:taskId', authenticate, validateTaskParams, asyncHandler(async (req, res) => {
  const { taskId } = req.params
  const userId = req.user.id

  // Mock task details (would query Supabase using MCP in real implementation)
  const mockTask = {
    id: taskId,
    user_id: userId,
    vendor_url: 'https://facturacion.example.com',
    ticket_details: {
      customer_details: {
        rfc: 'XAXX010101000',
        company_name: 'Test Company',
        email: 'test@example.com'
      },
      invoice_details: {
        folio: 'ABC123',
        total: 1500.00,
        currency: 'MXN'
      }
    },
    status: 'COMPLETED',
    created_at: new Date().toISOString(),
    started_at: new Date().toISOString(),
    completed_at: new Date().toISOString(),
    result: {
      success: true,
      execution_time: 45.2,
      vendor_url: 'https://facturacion.example.com',
      customer_rfc: 'XAXX010101000'
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
router.put('/:taskId/resume', authenticate, validateTaskParams, asyncHandler(async (req, res) => {
  const { taskId } = req.params
  const userId = req.user.id

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
router.delete('/:taskId', authenticate, validateTaskParams, asyncHandler(async (req, res) => {
  const { taskId } = req.params
  const userId = req.user.id

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
router.get('/stats', authenticate, asyncHandler(async (req, res) => {
  const userId = req.user.id

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

export default router 
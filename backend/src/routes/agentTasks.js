import express from 'express'
import { authenticate } from '../middleware/auth.js'
import browserAgentService from '../services/browserAgentService.js'

const router = express.Router()

// POST /api/v1/agent-tasks/:taskId/control
router.post('/:taskId/control', authenticate, async (req, res) => {
  const { action } = req.body || {}
  const { taskId } = req.params
  const task = browserAgentService.getTask(taskId, req.user.id)
  if (!task) return res.status(404).json({ success: false, error: 'Task not found' })

  // For now, simulate control changes by updating status
  let status = task.status
  if (action === 'pause') status = 'paused'
  if (action === 'resume') status = 'running'
  if (action === 'stop') status = 'cancelled'
  if (action === 'take_control') status = 'USER_CONTROL'

  browserAgentService.updateTaskStatus(taskId, status)

  return res.json({
    success: true,
    data: {
      task_id: taskId,
      action,
      status,
      browserbase_session: {
        session_id: task.browserSessionId || task.sessionId || null,
        live_view_url: task.liveViewUrl || null,
        user_control_enabled: action === 'take_control',
        takeover_url: task.liveViewUrl ? `${task.liveViewUrl}/takeover` : null
      },
      message: `Agent ${action} successful.`,
      timestamp: new Date().toISOString()
    }
  })
})

// GET /api/v1/agent-tasks/:taskId/status
router.get('/:taskId/status', authenticate, async (req, res) => {
  const { taskId } = req.params
  const task = browserAgentService.getTask(taskId, req.user.id)
  if (!task) return res.status(404).json({ success: false, error: 'Task not found' })

  return res.json({
    success: true,
    data: {
      task_id: taskId,
      ticket_id: null,
      status: (task.status || 'pending').toUpperCase(),
      progress: {
        current_step: task.result?.current_step || null,
        steps_completed: task.result?.steps_taken || 0,
        total_steps: task.maxSteps,
        percentage: Math.min(100, Math.round(((task.result?.steps_taken || 0) / task.maxSteps) * 100))
      },
      browserbase_session: {
        session_id: task.browserSessionId || task.sessionId || null,
        live_view_url: task.liveViewUrl || null,
        status: task.status === 'paused' ? 'PAUSED' : (task.status === 'running' ? 'ACTIVE' : task.status?.toUpperCase() || 'PENDING'),
        user_control_enabled: task.status === 'USER_CONTROL',
        current_url: task.result?.current_url || null,
        screenshot_url: task.result?.screenshot_url || null
      },
      execution_log: task.result?.execution_log || [],
      performance_metrics: {
        execution_time_seconds: task.executionTimeMs ? Math.round(task.executionTimeMs / 1000) : null,
        estimated_completion_seconds: 45,
        success_probability: 0.9
      },
      updated_at: new Date().toISOString()
    }
  })
})

export default router 
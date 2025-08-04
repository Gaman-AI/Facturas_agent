import express from 'express'
import { TaskService } from '../services/taskService.js'
import { RedisService } from '../services/redisService.js'
import { QueueService } from '../services/queueService.js'

const router = express.Router()

// Basic health check
router.get('/', async (req, res) => {
  try {
    // Initialize services for health check
    const taskService = new TaskService()
    const redisService = new RedisService()
    const queueService = new QueueService()

    // Check each service
    const [dbHealth, redisHealth, queueHealth] = await Promise.allSettled([
      taskService.healthCheck(),
      redisService.healthCheck(),
      queueService.healthCheck()
    ])

    const services = {
      database: dbHealth.status === 'fulfilled' ? 'healthy' : 'unhealthy',
      redis: redisHealth.status === 'fulfilled' ? 'healthy' : 'unhealthy', 
      queue: queueHealth.status === 'fulfilled' ? 'healthy' : 'unhealthy'
    }

    const overallStatus = Object.values(services).every(status => status === 'healthy') 
      ? 'healthy' 
      : 'unhealthy'

    res.status(overallStatus === 'healthy' ? 200 : 503).json({
      status: overallStatus,
      timestamp: new Date().toISOString(),
      uptime: process.uptime(),
      version: '1.0.0',
      environment: process.env.NODE_ENV || 'development',
      services
    })
  } catch (error) {
    res.status(503).json({
      status: 'unhealthy',
      timestamp: new Date().toISOString(),
      error: error.message,
      services: {
        database: 'unknown',
        redis: 'unknown',
        queue: 'unknown'
      }
    })
  }
})

// Detailed health check
router.get('/detailed', async (req, res) => {
  try {
    const taskService = new TaskService()
    const redisService = new RedisService()
    const queueService = new QueueService()

    const [dbHealth, redisHealth, queueHealth] = await Promise.allSettled([
      taskService.healthCheck(),
      redisService.healthCheck(),
      queueService.healthCheck()
    ])

    const detailed = {
      status: 'healthy',
      timestamp: new Date().toISOString(),
      version: '1.0.0',
      environment: process.env.NODE_ENV || 'development',
      system: {
        nodejs: process.version,
        platform: process.platform,
        arch: process.arch,
        memory: process.memoryUsage(),
        uptime: process.uptime()
      },
      services: {
        database: {
          status: dbHealth.status === 'fulfilled' ? 'healthy' : 'unhealthy',
          details: dbHealth.status === 'fulfilled' ? dbHealth.value : dbHealth.reason?.message
        },
        redis: {
          status: redisHealth.status === 'fulfilled' ? 'healthy' : 'unhealthy',
          details: redisHealth.status === 'fulfilled' ? redisHealth.value : redisHealth.reason?.message
        },
        queue: {
          status: queueHealth.status === 'fulfilled' ? 'healthy' : 'unhealthy',
          details: queueHealth.status === 'fulfilled' ? queueHealth.value : queueHealth.reason?.message
        }
      }
    }

    const overallHealthy = Object.values(detailed.services)
      .every(service => service.status === 'healthy')
    
    detailed.status = overallHealthy ? 'healthy' : 'unhealthy'

    res.status(overallHealthy ? 200 : 503).json(detailed)
  } catch (error) {
    res.status(503).json({
      status: 'unhealthy',
      timestamp: new Date().toISOString(),
      error: error.message
    })
  }
})

// Readiness check (for Kubernetes)
router.get('/ready', async (req, res) => {
  try {
    const taskService = new TaskService()
    const redisService = new RedisService()

    // Quick readiness checks
    await Promise.all([
      taskService.healthCheck(),
      redisService.healthCheck()
    ])

    res.json({
      status: 'ready',
      timestamp: new Date().toISOString()
    })
  } catch (error) {
    res.status(503).json({
      status: 'not ready',
      timestamp: new Date().toISOString(),
      error: error.message
    })
  }
})

// Liveness check (for Kubernetes)
router.get('/live', (req, res) => {
  res.json({
    status: 'alive',
    timestamp: new Date().toISOString(),
    uptime: process.uptime()
  })
})

export default router 
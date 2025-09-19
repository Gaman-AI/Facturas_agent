import express from 'express'
import taskService from '../services/taskService.js'
import queueService from '../services/queueService.js'
import { authenticate } from '../middleware/auth.js'

const router = express.Router()

/**
 * Performance Metrics API Routes
 * Provides comprehensive performance data for the CFDI Automation System
 */

/**
 * Get overall performance metrics
 * GET /api/performance/metrics
 */
router.get('/metrics', authenticate, async (req, res) => {
  try {
    const userId = req.user.id
    const timeRange = req.query.range || '24h'
    
    // Calculate time range
    const now = new Date()
    let startTime
    switch (timeRange) {
      case '1h':
        startTime = new Date(now.getTime() - 60 * 60 * 1000)
        break
      case '24h':
        startTime = new Date(now.getTime() - 24 * 60 * 60 * 1000)
        break
      case '7d':
        startTime = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000)
        break
      case '30d':
        startTime = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000)
        break
      default:
        startTime = new Date(now.getTime() - 24 * 60 * 60 * 1000)
    }

    // Get tasks for the time range
    const { tasks, error: tasksError } = await taskService.getUserTasks(userId, 0, 1000, {
      created_after: startTime.toISOString()
    })

    if (tasksError) {
      return res.status(500).json({
        success: false,
        error: 'Failed to fetch tasks for performance analysis'
      })
    }

    // Calculate processing time metrics
    const completedTasks = tasks.filter(task => 
      task.status === 'COMPLETED' && 
      task.created_at && 
      task.completed_at
    )

    const processingTimes = completedTasks.map(task => {
      const start = new Date(task.created_at).getTime()
      const end = new Date(task.completed_at).getTime()
      return end - start
    }).sort((a, b) => a - b)

    const averageProcessingTime = processingTimes.length > 0 
      ? processingTimes.reduce((sum, time) => sum + time, 0) / processingTimes.length 
      : 0

    const medianProcessingTime = processingTimes.length > 0
      ? processingTimes[Math.floor(processingTimes.length / 2)]
      : 0

    const p95ProcessingTime = processingTimes.length > 0
      ? processingTimes[Math.floor(processingTimes.length * 0.95)]
      : 0

    const p99ProcessingTime = processingTimes.length > 0
      ? processingTimes[Math.floor(processingTimes.length * 0.99)]
      : 0

    // Calculate success rates
    const totalTasks = tasks.length
    const completedCount = tasks.filter(t => t.status === 'COMPLETED').length
    const failedCount = tasks.filter(t => t.status === 'FAILED').length
    const successRate = totalTasks > 0 ? (completedCount / totalTasks) * 100 : 0
    const errorRate = totalTasks > 0 ? (failedCount / totalTasks) * 100 : 0

    // Calculate throughput
    const timeRangeMs = now.getTime() - startTime.getTime()
    const timeRangeHours = timeRangeMs / (1000 * 60 * 60)
    const invoicesPerHour = timeRangeHours > 0 ? completedCount / timeRangeHours : 0
    const invoicesPerDay = invoicesPerHour * 24

    // Get queue statistics
    const queueStats = await queueService.getQueueStats()

    // Mock OCR accuracy data (in production, this would come from OCR service)
    const ocrAccuracy = {
      overall: 92.1,
      byVendor: {
        'OXXO': 94.2,
        'Walmart': 91.8,
        'Costco': 89.5,
        'Generic': 87.3
      },
      byField: {
        'Total Amount': 95.4,
        'Transaction Date': 94.2,
        'Merchant Name': 96.5,
        'Ticket ID': 89.3,
        'Folio Number': 90.2,
        'Store/Branch': 78.8,
        'Register/Terminal': 85.9,
        'Payment Type': 73.7,
        'Card Last 4': 69.3
      }
    }

    // System health metrics (mock data - in production, get from system monitoring)
    const systemHealth = {
      cpuUsage: Math.random() * 30 + 40, // 40-70%
      memoryUsage: Math.random() * 20 + 50, // 50-70%
      queueSize: queueStats.stats?.waiting || 0,
      activeConnections: Math.floor(Math.random() * 10) + 10 // 10-20
    }

    const metrics = {
      // Processing Times
      averageProcessingTime,
      medianProcessingTime,
      p95ProcessingTime,
      p99ProcessingTime,
      
      // OCR Accuracy
      overallOcrAccuracy: ocrAccuracy.overall,
      vendorOcrAccuracy: ocrAccuracy.byVendor,
      fieldAccuracy: ocrAccuracy.byField,
      
      // Throughput
      invoicesPerHour: Math.round(invoicesPerHour),
      invoicesPerDay: Math.round(invoicesPerDay),
      peakThroughput: Math.round(invoicesPerHour * 1.5), // Assume 50% peak capacity
      
      // Success Rates
      overallSuccessRate: successRate,
      errorRate: errorRate,
      retryRate: 12.3, // Mock data
      
      // System Health
      cpuUsage: systemHealth.cpuUsage,
      memoryUsage: systemHealth.memoryUsage,
      queueSize: systemHealth.queueSize,
      activeConnections: systemHealth.activeConnections,
      
      // Metadata
      timeRange,
      totalTasks,
      completedTasks: completedCount,
      failedTasks: failedCount,
      timestamp: now.toISOString()
    }

    res.json({
      success: true,
      data: metrics
    })

  } catch (error) {
    console.error('Error fetching performance metrics:', error)
    res.status(500).json({
      success: false,
      error: 'Internal server error while fetching performance metrics'
    })
  }
})

/**
 * Get error analysis metrics
 * GET /api/performance/errors
 */
router.get('/errors', authenticate, async (req, res) => {
  try {
    const userId = req.user.id
    const timeRange = req.query.range || '24h'
    
    // Calculate time range
    const now = new Date()
    let startTime
    switch (timeRange) {
      case '1h':
        startTime = new Date(now.getTime() - 60 * 60 * 1000)
        break
      case '24h':
        startTime = new Date(now.getTime() - 24 * 60 * 60 * 1000)
        break
      case '7d':
        startTime = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000)
        break
      case '30d':
        startTime = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000)
        break
      default:
        startTime = new Date(now.getTime() - 24 * 60 * 60 * 1000)
    }

    // Get failed tasks for error analysis
    const { tasks, error: tasksError } = await taskService.getUserTasks(userId, 0, 1000, {
      status: 'FAILED',
      created_after: startTime.toISOString()
    })

    if (tasksError) {
      return res.status(500).json({
        success: false,
        error: 'Failed to fetch error data'
      })
    }

    // Analyze error types (mock data - in production, analyze actual error messages)
    const errorTypes = {
      'OCR Processing': Math.floor(Math.random() * 20) + 15,
      'Form Validation': Math.floor(Math.random() * 25) + 20,
      'Vendor Detection': Math.floor(Math.random() * 15) + 10,
      'Data Extraction': Math.floor(Math.random() * 30) + 25,
      'System Timeout': Math.floor(Math.random() * 10) + 5,
      'Network Error': Math.floor(Math.random() * 8) + 3
    }

    const totalErrors = Object.values(errorTypes).reduce((sum, count) => sum + count, 0)

    // Error resolution times (mock data)
    const errorResolutionTimes = {
      'OCR Processing': 10000,
      'Form Validation': 5000,
      'Vendor Detection': 8000,
      'Data Extraction': 12000,
      'System Timeout': 30000,
      'Network Error': 15000
    }

    const errorMetrics = {
      totalErrors,
      errorTypes,
      errorResolutionTimes,
      errorPreventionRate: 89.3, // Mock data
      timestamp: now.toISOString()
    }

    res.json({
      success: true,
      data: errorMetrics
    })

  } catch (error) {
    console.error('Error fetching error metrics:', error)
    res.status(500).json({
      success: false,
      error: 'Internal server error while fetching error metrics'
    })
  }
})

/**
 * Get vendor-specific performance metrics
 * GET /api/performance/vendors
 */
router.get('/vendors', authenticate, async (req, res) => {
  try {
    const userId = req.user.id
    const timeRange = req.query.range || '24h'
    
    // Calculate time range
    const now = new Date()
    let startTime
    switch (timeRange) {
      case '1h':
        startTime = new Date(now.getTime() - 60 * 60 * 1000)
        break
      case '24h':
        startTime = new Date(now.getTime() - 24 * 60 * 60 * 1000)
        break
      case '7d':
        startTime = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000)
        break
      case '30d':
        startTime = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000)
        break
      default:
        startTime = new Date(now.getTime() - 24 * 60 * 60 * 1000)
    }

    // Get tasks for vendor analysis
    const { tasks, error: tasksError } = await taskService.getUserTasks(userId, 0, 1000, {
      created_after: startTime.toISOString()
    })

    if (tasksError) {
      return res.status(500).json({
        success: false,
        error: 'Failed to fetch vendor performance data'
      })
    }

    // Analyze vendor performance (mock data - in production, analyze actual vendor URLs)
    const vendorPerformance = [
      {
        name: 'OXXO',
        accuracy: 94.2,
        avgProcessingTime: 75000,
        successRate: 96.8,
        errorRate: 3.2,
        throughput: 12,
        totalTasks: Math.floor(Math.random() * 50) + 100
      },
      {
        name: 'Walmart',
        accuracy: 91.8,
        avgProcessingTime: 82000,
        successRate: 94.5,
        errorRate: 5.5,
        throughput: 10,
        totalTasks: Math.floor(Math.random() * 40) + 80
      },
      {
        name: 'Costco',
        accuracy: 89.5,
        avgProcessingTime: 95000,
        successRate: 92.1,
        errorRate: 7.9,
        throughput: 8,
        totalTasks: Math.floor(Math.random() * 30) + 60
      },
      {
        name: 'Generic',
        accuracy: 87.3,
        avgProcessingTime: 105000,
        successRate: 89.7,
        errorRate: 10.3,
        throughput: 6,
        totalTasks: Math.floor(Math.random() * 20) + 40
      }
    ]

    res.json({
      success: true,
      data: vendorPerformance
    })

  } catch (error) {
    console.error('Error fetching vendor performance:', error)
    res.status(500).json({
      success: false,
      error: 'Internal server error while fetching vendor performance'
    })
  }
})

/**
 * Get system health metrics
 * GET /api/performance/health
 */
router.get('/health', authenticate, async (req, res) => {
  try {
    // Get system health from various services
    const [dbHealth, queueHealth] = await Promise.allSettled([
      taskService.healthCheck(),
      queueService.healthCheck()
    ])

    const systemHealth = {
      database: {
        status: dbHealth.status === 'fulfilled' ? 'healthy' : 'unhealthy',
        details: dbHealth.status === 'fulfilled' ? dbHealth.value : dbHealth.reason?.message
      },
      queue: {
        status: queueHealth.status === 'fulfilled' ? 'healthy' : 'unhealthy',
        details: queueHealth.status === 'fulfilled' ? queueHealth.value : queueHealth.reason?.message
      },
      ocr: {
        status: 'healthy', // Mock - in production, check OCR service health
        details: 'OCR service operational'
      },
      browserbase: {
        status: 'healthy', // Mock - in production, check Browserbase health
        details: 'Browserbase service operational'
      },
      websocket: {
        status: 'healthy', // Mock - in production, check WebSocket health
        details: 'WebSocket service operational'
      },
      timestamp: new Date().toISOString()
    }

    const overallHealthy = Object.values(systemHealth)
      .filter(service => typeof service === 'object' && service.status)
      .every(service => service.status === 'healthy')

    res.json({
      success: true,
      data: {
        ...systemHealth,
        overall: overallHealthy ? 'healthy' : 'unhealthy'
      }
    })

  } catch (error) {
    console.error('Error fetching system health:', error)
    res.status(500).json({
      success: false,
      error: 'Internal server error while fetching system health'
    })
  }
})

/**
 * Get performance trends over time
 * GET /api/performance/trends
 */
router.get('/trends', authenticate, async (req, res) => {
  try {
    const userId = req.user.id
    const timeRange = req.query.range || '7d'
    const granularity = req.query.granularity || 'day' // hour, day, week
    
    // Calculate time range
    const now = new Date()
    let startTime
    switch (timeRange) {
      case '1d':
        startTime = new Date(now.getTime() - 24 * 60 * 60 * 1000)
        break
      case '7d':
        startTime = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000)
        break
      case '30d':
        startTime = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000)
        break
      default:
        startTime = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000)
    }

    // Generate trend data (mock data - in production, query historical data)
    const trends = []
    const intervalMs = granularity === 'hour' ? 60 * 60 * 1000 : 24 * 60 * 60 * 1000
    
    for (let time = startTime.getTime(); time < now.getTime(); time += intervalMs) {
      const date = new Date(time)
      trends.push({
        timestamp: date.toISOString(),
        processingTime: Math.floor(Math.random() * 20000) + 60000, // 60-80 seconds
        successRate: Math.floor(Math.random() * 10) + 90, // 90-100%
        throughput: Math.floor(Math.random() * 20) + 20, // 20-40 per hour
        ocrAccuracy: Math.floor(Math.random() * 5) + 90, // 90-95%
        errorRate: Math.floor(Math.random() * 5) + 2 // 2-7%
      })
    }

    res.json({
      success: true,
      data: {
        trends,
        granularity,
        timeRange,
        timestamp: now.toISOString()
      }
    })

  } catch (error) {
    console.error('Error fetching performance trends:', error)
    res.status(500).json({
      success: false,
      error: 'Internal server error while fetching performance trends'
    })
  }
})

export default router

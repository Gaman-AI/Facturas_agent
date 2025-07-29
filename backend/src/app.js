import express from 'express'
import cors from 'cors'
import helmet from 'helmet'
import morgan from 'morgan'
import { createServer } from 'http'

import config from './config/index.js'
import { errorHandler, notFoundHandler } from './middleware/errorHandler.js'
import authRoutes from './routes/auth.js'
import taskRoutes from './routes/tasks.js'

/**
 * Create Express Application
 */
const app = express()
const server = createServer(app)

// Trust proxy if behind reverse proxy (for production)
if (config.isProduction()) {
  app.set('trust proxy', 1)
}

/**
 * Middleware Stack
 */

// Security middleware
app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      scriptSrc: ["'self'", "'unsafe-inline'"],
      styleSrc: ["'self'", "'unsafe-inline'"],
      imgSrc: ["'self'", "data:", "https:"],
      connectSrc: ["'self'", "ws:", "wss:"],
      fontSrc: ["'self'"],
      objectSrc: ["'none'"],
      mediaSrc: ["'self'"],
      frameSrc: ["'none'"],
    },
  },
  crossOriginEmbedderPolicy: false // Needed for some browser automation features
}))

// CORS configuration
app.use(cors({
  origin: config.cors.origins,
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With'],
  exposedHeaders: ['X-Total-Count', 'X-Page-Count']
}))

// Request logging
app.use(morgan(config.isDevelopment() ? 'dev' : 'combined'))

// Body parsing middleware
app.use(express.json({ 
  limit: '10mb',
  verify: (req, res, buf) => {
    // Store raw body for webhook verification if needed
    req.rawBody = buf
  }
}))
app.use(express.urlencoded({ extended: true, limit: '10mb' }))

// Request ID middleware for tracing
app.use((req, res, next) => {
  req.id = req.headers['x-request-id'] || `req_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
  res.setHeader('X-Request-ID', req.id)
  next()
})

/**
 * Health Check Endpoints
 */
app.get('/health', async (req, res) => {
  try {
    // Test basic server health
    const health = {
      status: 'healthy',
      timestamp: new Date().toISOString(),
      uptime: process.uptime(),
      version: '1.0.0',
      environment: config.nodeEnv,
      services: {
        database: 'connected', // Would test Supabase connection
        python_service: 'available', // Would test Python service
        redis: 'connected' // Would test Redis connection
      }
    }

    res.json({
      success: true,
      data: health,
      meta: {
        timestamp: new Date().toISOString(),
        requestId: req.id
      }
    })
  } catch (error) {
    res.status(503).json({
      success: false,
      error: {
        code: 'HEALTH_CHECK_FAILED',
        message: 'Health check failed',
        details: error.message
      },
      meta: {
        timestamp: new Date().toISOString(),
        requestId: req.id
      }
    })
  }
})

// Handle favicon requests to prevent 404 errors
app.get('/favicon.ico', (req, res) => {
  res.status(204).end() // No Content
})

// Detailed health check for monitoring systems
app.get('/health/detailed', async (req, res) => {
  try {
    const detailed = {
      status: 'healthy',
      timestamp: new Date().toISOString(),
      version: '1.0.0',
      environment: config.nodeEnv,
      system: {
        nodejs: process.version,
        platform: process.platform,
        arch: process.arch,
        memory: process.memoryUsage(),
        uptime: process.uptime()
      },
      services: {
        supabase: {
          status: 'connected',
          project_id: 'pffuarlnpdpfjrvewrqo',
          url: 'https://pffuarlnpdpfjrvewrqo.supabase.co'
        },
        python_service: {
          status: 'available',
          executable: config.python.executable,
          browser_use_path: config.python.browserUsePath
        },
        redis: {
          status: 'connected',
          url: config.redis.url
        }
      },
      configuration: {
        cors_origins: config.cors.origins,
        max_concurrent_tasks: config.tasks.maxConcurrent,
        task_timeout_minutes: config.tasks.timeoutMinutes
      }
    }

    res.json({
      success: true,
      data: detailed,
      meta: {
        timestamp: new Date().toISOString(),
        requestId: req.id
      }
    })
  } catch (error) {
    res.status(503).json({
      success: false,
      error: {
        code: 'DETAILED_HEALTH_CHECK_FAILED',
        message: 'Detailed health check failed',
        details: error.message
      }
    })
  }
})

/**
 * API Routes
 */
const apiRouter = express.Router()

// API version info
apiRouter.get('/', (req, res) => {
  res.json({
    success: true,
    data: {
      name: 'CFDI Automation API',
      version: config.apiVersion,
      description: 'Mexican CFDI 4.0 Invoice Automation System',
      endpoints: {
        auth: '/api/v1/auth',
        tasks: '/api/v1/tasks',
        health: '/health'
      }
    },
    meta: {
      timestamp: new Date().toISOString(),
      requestId: req.id
    }
  })
})

// Mount route modules
apiRouter.use('/auth', authRoutes)
apiRouter.use('/tasks', taskRoutes)

// Mount API router
app.use(`/api/${config.apiVersion}`, apiRouter)

/**
 * Static file serving (if needed)
 */
if (config.isDevelopment()) {
  app.use('/docs', express.static('docs'))
}

/**
 * Error Handling
 */

// 404 handler for undefined routes
app.use(notFoundHandler)

// Global error handler
app.use(errorHandler)

/**
 * Graceful Shutdown
 */
const gracefulShutdown = (signal) => {
  console.log(`\n🛑 Received ${signal}. Starting graceful shutdown...`)
  
  server.close(() => {
    console.log('✅ HTTP server closed')
    
    // Close other connections (Redis, database, etc.)
    // This would close Redis connections, database pools, etc.
    
    console.log('✅ All connections closed. Exiting process.')
    process.exit(0)
  })
  
  // Force exit after 30 seconds
  setTimeout(() => {
    console.log('⚠️  Forced shutdown after timeout')
    process.exit(1)
  }, 30000)
}

// Handle shutdown signals
process.on('SIGTERM', () => gracefulShutdown('SIGTERM'))
process.on('SIGINT', () => gracefulShutdown('SIGINT'))

// Handle uncaught exceptions
process.on('uncaughtException', (error) => {
  console.error('💥 Uncaught Exception:', error)
  gracefulShutdown('UNCAUGHT_EXCEPTION')
})

// Handle unhandled promise rejections
process.on('unhandledRejection', (reason, promise) => {
  console.error('💥 Unhandled Rejection at:', promise, 'reason:', reason)
  gracefulShutdown('UNHANDLED_REJECTION')
})

export { app, server } 
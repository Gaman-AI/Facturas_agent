import express from 'express'
import cors from 'cors'
import helmet from 'helmet'
import morgan from 'morgan'
import config from './config/index.js'

// Import routes
import healthRoutes from './routes/health.js'
import authRoutes from './routes/auth.js'
import taskRoutes from './routes/tasks.js'
import ticketRoutes from './routes/tickets.js'
import performanceRoutes from './routes/performance.js'
import websocketService from './services/websocketService.js'
import { errorHandler, notFoundHandler } from './middleware/errorHandler.js'

import { createServer } from 'http'

const app = express()
const server = createServer(app)

  // Security middleware
  app.use(helmet({
    contentSecurityPolicy: {
      directives: {
        defaultSrc: ["'self'"],
        styleSrc: ["'self'", "'unsafe-inline'"],
        scriptSrc: ["'self'"],
        imgSrc: ["'self'", "data:", "https:"],
        connectSrc: ["'self'"],
        fontSrc: ["'self'"],
        objectSrc: ["'none'"],
        mediaSrc: ["'self'"],
        frameSrc: ["'none'"],
      },
    },
    crossOriginEmbedderPolicy: false,
  }))

// CORS configuration
app.use(cors({
  origin: config.cors.origins,
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With', 'X-Request-ID'],
  exposedHeaders: ['X-Total-Count', 'X-Page-Count', 'X-Request-ID']
}))

  // Request parsing middleware
  app.use(express.json({ limit: '10mb' }))
  app.use(express.urlencoded({ extended: true, limit: '10mb' }))

  // Logging middleware (only in non-test environment)
  if (process.env.NODE_ENV !== 'test') {
    app.use(morgan('combined'))
  }

  // API routes
  app.use('/health', healthRoutes)
  app.use('/api/v1/auth', authRoutes)
  app.use('/api/v1/tasks', taskRoutes)
  app.use('/api/v1/tickets', ticketRoutes)
  app.use('/api/v1/performance', performanceRoutes)

  // API root endpoint
  app.get('/api/v1', (req, res) => {
    res.json({
      success: true,
      data: {
        name: 'CFDI Automation API',
        version: 'v1',
        description: 'Mexican CFDI 4.0 Invoice Automation System',
        status: 'operational',
        endpoints: {
          health: '/health',
          auth: '/api/v1/auth',
          tasks: '/api/v1/tasks',
          tickets: '/api/v1/tickets',
          performance: '/api/v1/performance'
        },
        documentation: {
          swagger: '/api/v1/docs',
          postman: '/api/v1/postman'
        }
      },
      meta: {
        timestamp: new Date().toISOString(),
        requestId: req.headers['x-request-id'] || 'unknown',
        environment: process.env.NODE_ENV || 'development'
      }
    })
  })

  // Root endpoint
  app.get('/', (req, res) => {
    res.json({
      message: 'CFDI 4.0 Invoice Automation API',
      version: '1.0.0',
      status: 'online',
      timestamp: new Date().toISOString()
    })
  })

  // 404 handler
  app.use('*', notFoundHandler)

  // Global error handler
  app.use(errorHandler)

// Initialize WebSocket Server
websocketService.initialize(server)

/**
 * Graceful Shutdown
 */
const gracefulShutdown = (signal) => {
  console.log(`\n🛑 Received ${signal}. Starting graceful shutdown...`)
  
  // Close WebSocket server first
  websocketService.close()
  
  server.close(() => {
    console.log('✅ HTTP server closed')
    process.exit(0)
  })
}

// Graceful shutdown handlers
process.on('SIGTERM', () => gracefulShutdown('SIGTERM'))
process.on('SIGINT', () => gracefulShutdown('SIGINT'))

export { app, server } 
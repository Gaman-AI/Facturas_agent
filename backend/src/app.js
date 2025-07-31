import express from 'express'
import cors from 'cors'
import helmet from 'helmet'
import morgan from 'morgan'
import config from './config/index.js'

// Import routes
import healthRoutes from './routes/health.js'
import taskRoutes from './routes/tasks.js'
import authRoutes from './routes/auth.js'

// Import services for initialization
import { redisService } from './services/redisService.js'
import { queueService } from './services/queueService.js'

export function createApp() {
  const app = express()

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
    origin: process.env.NODE_ENV === 'production' 
      ? [config.frontend.url] 
      : ['http://localhost:3000', 'http://localhost:3001', 'http://127.0.0.1:3000'],
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With']
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
          tasks: '/api/v1/tasks'
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
  app.use('*', (req, res) => {
    res.status(404).json({
      success: false,
      error: `Route ${req.method} ${req.originalUrl} not found`,
      meta: {
        timestamp: new Date().toISOString(),
        requestId: req.headers['x-request-id'] || 'unknown'
      }
    })
  })

  // Global error handler
  app.use((error, req, res, next) => {
    console.error('Global error handler:', error)
    
    // Don't leak error details in production
    const isDevelopment = process.env.NODE_ENV === 'development' || process.env.NODE_ENV === 'test'
    
    res.status(error.status || 500).json({
      success: false,
      error: isDevelopment 
        ? error.message || 'Internal Server Error'
        : 'Internal Server Error',
      ...(isDevelopment && { stack: error.stack }),
      meta: {
        timestamp: new Date().toISOString(),
        requestId: req.headers['x-request-id'] || 'unknown'
      }
    })
  })

  return app
}

// Initialize services function
export async function initializeServices() {
  try {
    console.log('🚀 Initializing services...')
    
    // Connect to Redis
    await redisService.connect()
    console.log('✅ Redis connected')
    
    // Initialize queue service
    await queueService.initialize()
    console.log('✅ Queue service initialized')
    
    console.log('🎉 All services initialized successfully')
    return true
  } catch (error) {
    console.error('❌ Service initialization failed:', error.message)
    throw error
  }
}

// Graceful shutdown
export async function gracefulShutdown() {
  try {
    console.log('🛑 Shutting down gracefully...')
    
    await queueService.shutdown()
    console.log('✅ Queue service shutdown')
    
    await redisService.disconnect()
    console.log('✅ Redis disconnected')
    
    console.log('👋 Graceful shutdown complete')
  } catch (error) {
    console.error('❌ Shutdown error:', error.message)
    throw error
  }
}

export default createApp 
#!/usr/bin/env node

/**
 * CFDI Automation Backend Server
 * Node.js + Express backend for CFDI 4.0 invoice automation
 */

import process from 'process'
import { app, server } from './app.js'
import config from './config/index.js'
import redisService from './services/redisService.js'
import queueService from './services/queueService.js'

/**
 * Validate Environment Configuration
 */
try {
  config.validate()
  console.log('✅ Environment configuration validated')
} catch (error) {
  console.error('❌ Environment validation failed:', error.message)
  console.error('💡 Please check your .env file and ensure all required variables are set')
  process.exit(1)
}

/**
 * Initialize Services
 */
const initializeServices = async () => {
  console.log('🔧 Initializing services...')
  
  try {
    // Initialize Redis connection
    console.log('🔌 Connecting to Redis...')
    const redisConnected = await redisService.connect()
    if (!redisConnected) {
      console.warn('⚠️  Redis connection failed - queue functionality will be disabled')
      return false
    }
    console.log('✅ Redis connected successfully')

    // Initialize Queue Service
    console.log('🚀 Initializing queue service...')
    const queueInitialized = await queueService.initialize()
    if (!queueInitialized) {
      console.warn('⚠️  Queue service initialization failed - tasks will not be processed')
      return false
    }
    console.log('✅ Queue service initialized successfully')

    // Initialize Queue Worker (optional - can be run separately)
    if (config.isDevelopment() || process.env.START_WORKER === 'true') {
      console.log('👷 Starting queue worker...')
      const workerStarted = await queueService.initializeWorker()
      if (workerStarted) {
        console.log('✅ Queue worker started successfully')
      } else {
        console.warn('⚠️  Queue worker failed to start')
      }
    } else {
      console.log('ℹ️  Queue worker not started (use START_WORKER=true to enable)')
    }

    return true
  } catch (error) {
    console.error('❌ Service initialization failed:', error)
    return false
  }
}

/**
 * Start HTTP Server
 */
const startServer = async () => {
  try {
    // Initialize services first
    const servicesReady = await initializeServices()
    if (!servicesReady) {
      console.warn('⚠️  Some services failed to initialize - continuing with limited functionality')
    }

    // Start the server
    server.listen(config.port, config.host || '0.0.0.0', () => {
      console.log(`
🚀 CFDI Automation Backend Server Started!

📍 Server Details:
   • Environment: ${config.nodeEnv}
   • Port: ${config.port}
   • API Version: ${config.apiVersion}
   • Process ID: ${process.pid}

🔗 Available Endpoints:
   • Health Check: http://localhost:${config.port}/health
   • API Root: http://localhost:${config.port}/api/${config.apiVersion}
   • Authentication: http://localhost:${config.port}/api/${config.apiVersion}/auth
   • Tasks: http://localhost:${config.port}/api/${config.apiVersion}/tasks

🌐 CORS Origins:
   ${config.cors.origins.map(origin => `• ${origin}`).join('\n   ')}

🐍 Python Service:
   • Browser-Use Path: ${config.python.browserUsePath}
   • Python Executable: ${config.python.executable}

📊 Task Configuration:
   • Max Concurrent: ${config.tasks.maxConcurrent}
   • Timeout: ${config.tasks.timeoutMinutes} minutes

📦 Database:
   • Supabase URL: ${config.supabase.url}
   • Project ID: pffuarlnpdpfjrvewrqo

🔴 Redis:
   • URL: ${config.redis.url}

${config.isDevelopment() ? '🛠️  Development Mode - Detailed logging enabled' : '🏭 Production Mode'}
      `)
    })

    // Log memory usage in development
    if (config.isDevelopment()) {
      setInterval(() => {
        const used = process.memoryUsage()
        console.log(`📊 Memory Usage: RSS=${Math.round(used.rss / 1024 / 1024 * 100) / 100}MB, Heap=${Math.round(used.heapUsed / 1024 / 1024 * 100) / 100}MB`)
      }, 30000) // Every 30 seconds
    }

  } catch (error) {
    console.error('❌ Failed to start server:', error)
    process.exit(1)
  }
}

/**
 * Handle Server Startup Errors
 */
server.on('error', (error) => {
  if (error.syscall !== 'listen') {
    throw error
  }

  const bind = typeof config.port === 'string'
    ? 'Pipe ' + config.port
    : 'Port ' + config.port

  switch (error.code) {
    case 'EACCES':
      console.error(`❌ ${bind} requires elevated privileges`)
      process.exit(1)
      break
    case 'EADDRINUSE':
      console.error(`❌ ${bind} is already in use`)
      console.log('💡 Try using a different port or kill the process using this port')
      process.exit(1)
      break
    default:
      throw error
  }
})

/**
 * Log Server Started Event
 */
server.on('listening', () => {
  const addr = server.address()
  const bind = typeof addr === 'string'
    ? 'pipe ' + addr
    : 'port ' + addr.port
  
  console.log(`🎯 Server listening on ${bind}`)
  
  // Additional startup checks
  console.log('🔍 Running startup checks...')
  
  // Check if Python is available
  import('child_process').then(({ spawn }) => {
    const pythonCheck = spawn(config.python.executable, ['--version'])
    
    pythonCheck.on('close', (code) => {
      if (code === 0) {
        console.log('✅ Python executable found and working')
      } else {
        console.log('⚠️  Python executable not found - browser automation may not work')
      }
    })

    pythonCheck.on('error', () => {
      console.log('⚠️  Python not available - browser automation will not work')
    })
  })
})

/**
 * Start the application
 */
console.log('🚀 Starting CFDI Automation Backend...')
console.log(`📝 Node.js version: ${process.version}`)
console.log(`🖥️  Platform: ${process.platform} (${process.arch})`)

startServer().catch((error) => {
  console.error('💥 Fatal error during startup:', error)
  process.exit(1)
}) 
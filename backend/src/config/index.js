import dotenv from 'dotenv'

// Load environment variables
dotenv.config()

const config = {
  // Server Configuration
  port: process.env.PORT || 3000,
  nodeEnv: process.env.NODE_ENV || 'development',
  apiVersion: process.env.API_VERSION || 'v1',

  // Supabase Configuration (using MCP server)
  supabase: {
    url: process.env.SUPABASE_URL,
    anonKey: process.env.SUPABASE_ANON_KEY,
    serviceKey: process.env.SUPABASE_SERVICE_KEY,
  },

  // Redis Configuration
  redis: {
    url: process.env.REDIS_URL || 'redis://localhost:6379',
  },

  // JWT Configuration
  jwt: {
    secret: process.env.JWT_SECRET,
    expiresIn: process.env.JWT_EXPIRES_IN || '7d',
  },

  // CORS Configuration
  cors: {
    origins: process.env.CORS_ORIGINS?.split(',') || [
      'http://localhost:3000',
      'http://localhost:5173',
      'http://localhost:8000'
    ],
  },

  // Browser-Use Configuration
  browserUse: {
    openaiApiKey: process.env.OPENAI_API_KEY,
    anthropicApiKey: process.env.ANTHROPIC_API_KEY,
    googleApiKey: process.env.GOOGLE_API_KEY,
    browserbaseApiKey: process.env.BROWSERBASE_API_KEY,
    browserbaseProjectId: process.env.BROWSERBASE_PROJECT_ID,
  },

  // Task Configuration
  tasks: {
    maxConcurrent: parseInt(process.env.MAX_CONCURRENT_TASKS) || 5,
    timeoutMinutes: parseInt(process.env.TASK_TIMEOUT_MINUTES) || 30,
  },

  // Python Service Configuration
  python: {
    servicePort: parseInt(process.env.PYTHON_SERVICE_PORT) || 8001,
    executable: process.env.PYTHON_EXECUTABLE || './.venv/Scripts/python.exe',
    browserUsePath: './browser-use',
    timeout: parseInt(process.env.PYTHON_TASK_TIMEOUT) || 300000, // 5 minutes default
    maxRetries: parseInt(process.env.PYTHON_MAX_RETRIES) || 3,
  },

  // Validation
  isDevelopment: () => config.nodeEnv === 'development',
  isProduction: () => config.nodeEnv === 'production',
  
  // Validate required environment variables - OPTIMIZED FOR FASTER STARTUP
  validate() {
    // Only validate absolutely critical vars on startup for faster boot time
    const critical = [
      'SUPABASE_URL',
      'SUPABASE_ANON_KEY'
    ]

    const missing = critical.filter(key => !process.env[key])
    
    if (missing.length > 0) {
      throw new Error(`Missing critical environment variables: ${missing.join(', ')}`)
    }

    // Log warnings for optional but recommended variables
    const recommended = [
      'SUPABASE_SERVICE_KEY',
      'JWT_SECRET',
      'OPENAI_API_KEY'
    ]

    const missingRecommended = recommended.filter(key => !process.env[key])
    if (missingRecommended.length > 0) {
      console.warn(`⚠️  Missing recommended environment variables: ${missingRecommended.join(', ')}`)
      console.warn('   Some features may not work correctly without these variables')
    }
  }
}

export default config 
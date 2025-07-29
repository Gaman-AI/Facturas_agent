import config from '../config/index.js'

/**
 * Standard Error Response Format
 */
class AppError extends Error {
  constructor(message, statusCode = 500, code = 'INTERNAL_ERROR', details = null) {
    super(message)
    this.statusCode = statusCode
    this.code = code
    this.details = details
    this.isOperational = true
    
    Error.captureStackTrace(this, this.constructor)
  }
}

/**
 * Centralized Error Handler Middleware
 * Handles all errors and sends standardized responses
 */
export const errorHandler = (err, req, res, next) => {
  let error = { ...err }
  error.message = err.message

  // Log error details (exclude passwords and sensitive data)
  const logData = {
    timestamp: new Date().toISOString(),
    method: req.method,
    url: req.originalUrl,
    userAgent: req.get('User-Agent'),
    ip: req.ip,
    userId: req.user?.id || 'anonymous',
    error: {
      name: err.name,
      message: err.message,
      code: error.code || 'UNKNOWN_ERROR',
      stack: config.isDevelopment() ? err.stack : undefined
    }
  }

  console.error('API Error:', JSON.stringify(logData, null, 2))

  // Handle specific error types
  
  // MongoDB/Database errors
  if (err.name === 'CastError') {
    const message = 'Invalid resource ID format'
    error = new AppError(message, 400, 'INVALID_ID')
  }

  // Duplicate key error
  if (err.code === 11000) {
    const field = Object.keys(err.keyValue)[0]
    const message = `${field} already exists`
    error = new AppError(message, 400, 'DUPLICATE_FIELD')
  }

  // JWT errors (handled by auth middleware, but just in case)
  if (err.name === 'JsonWebTokenError') {
    const message = 'Invalid token'
    error = new AppError(message, 401, 'INVALID_TOKEN')
  }

  if (err.name === 'TokenExpiredError') {
    const message = 'Token expired'
    error = new AppError(message, 401, 'TOKEN_EXPIRED')
  }

  // Validation errors (Zod errors are handled by validation middleware)
  if (err.name === 'ValidationError') {
    const errors = Object.values(err.errors).map(val => val.message)
    error = new AppError('Validation failed', 400, 'VALIDATION_ERROR', errors)
  }

  // Rate limiting errors
  if (err.name === 'TooManyRequestsError') {
    const message = 'Too many requests, please try again later'
    error = new AppError(message, 429, 'RATE_LIMIT_EXCEEDED')
  }

  // File upload errors
  if (err.code === 'LIMIT_FILE_SIZE') {
    const message = 'File size too large'
    error = new AppError(message, 400, 'FILE_TOO_LARGE')
  }

  // Redis/Queue errors
  if (err.name === 'RedisError' || err.name === 'ConnectionError') {
    const message = 'Service temporarily unavailable'
    error = new AppError(message, 503, 'SERVICE_UNAVAILABLE')
  }

  // Python service communication errors
  if (err.code === 'PYTHON_SERVICE_ERROR') {
    const message = 'Browser automation service error'
    error = new AppError(message, 500, 'AUTOMATION_ERROR', err.details)
  }

  // Supabase errors
  if (err.code && err.code.startsWith('PGRST')) {
    const message = 'Database operation failed'
    error = new AppError(message, 500, 'DATABASE_ERROR')
  }

  // Default to AppError if not already
  if (!error.isOperational) {
    error = new AppError(
      error.message || 'Internal server error',
      error.statusCode || 500,
      error.code || 'INTERNAL_ERROR',
      error.details
    )
  }

  // Send error response
  const response = {
    success: false,
    error: {
      code: error.code,
      message: error.message,
      ...(error.details && { details: error.details }),
      ...(config.isDevelopment() && { stack: err.stack })
    },
    meta: {
      timestamp: new Date().toISOString(),
      requestId: req.id || 'unknown'
    }
  }

  res.status(error.statusCode).json(response)
}

/**
 * Not Found Handler
 * Handles 404 errors for undefined routes
 */
export const notFoundHandler = (req, res, next) => {
  const message = `Route ${req.originalUrl} not found`
  const error = new AppError(message, 404, 'ROUTE_NOT_FOUND')
  next(error)
}

/**
 * Async Error Handler Wrapper
 * Wraps async route handlers to catch errors
 */
export const asyncHandler = (fn) => {
  return (req, res, next) => {
    Promise.resolve(fn(req, res, next)).catch(next)
  }
}

/**
 * Custom Error Classes for specific use cases
 */
export class ValidationError extends AppError {
  constructor(message, details = null) {
    super(message, 400, 'VALIDATION_ERROR', details)
  }
}

export class AuthenticationError extends AppError {
  constructor(message = 'Authentication failed') {
    super(message, 401, 'AUTHENTICATION_ERROR')
  }
}

export class AuthorizationError extends AppError {
  constructor(message = 'Insufficient permissions') {
    super(message, 403, 'AUTHORIZATION_ERROR')
  }
}

export class NotFoundError extends AppError {
  constructor(resource = 'Resource') {
    super(`${resource} not found`, 404, 'NOT_FOUND')
  }
}

export class ConflictError extends AppError {
  constructor(message = 'Resource conflict') {
    super(message, 409, 'CONFLICT')
  }
}

export class RateLimitError extends AppError {
  constructor(message = 'Rate limit exceeded') {
    super(message, 429, 'RATE_LIMIT_EXCEEDED')
  }
}

export class ServiceUnavailableError extends AppError {
  constructor(message = 'Service temporarily unavailable') {
    super(message, 503, 'SERVICE_UNAVAILABLE')
  }
}

export { AppError } 
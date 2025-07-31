import jwt from 'jsonwebtoken'
import config from '../config/index.js'
import supabaseService from '../services/supabase.js'

/**
 * Supabase JWT Authentication Middleware
 * Verifies Supabase JWT tokens and adds user info to request
 */
export const authenticate = async (req, res, next) => {
  try {
    const authHeader = req.headers.authorization
    
    if (!authHeader) {
      return res.status(401).json({
        success: false,
        error: {
          code: 'MISSING_TOKEN',
          message: 'No authorization header provided'
        }
      })
    }

    // Extract token from "Bearer <token>" format
    const token = authHeader.startsWith('Bearer ') 
      ? authHeader.slice(7) 
      : authHeader

    if (!token) {
      return res.status(401).json({
        success: false,
        error: {
          code: 'INVALID_TOKEN_FORMAT',
          message: 'Invalid authorization header format. Expected: Bearer <token>'
        }
      })
    }

    // Generate request correlation ID for debugging
    const requestId = req.headers['x-request-id'] || `req_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
    req.requestId = requestId

    // Verify Supabase JWT token with enhanced error handling
    const verificationResult = await supabaseService.verifyToken(token)
    const { user, error, errorCode, details } = verificationResult
    
    if (error || !user) {
      // Enhanced error logging with request correlation
      console.error(`❌ Authentication failed [${requestId}]:`, {
        errorCode: errorCode || 'UNKNOWN_ERROR',
        error: error || 'No user found',
        details: details || 'No additional details',
        url: req.originalUrl,
        method: req.method,
        userAgent: req.headers['user-agent'],
        ip: req.ip || req.connection.remoteAddress
      })

      // Map internal error codes to user-friendly messages
      let userMessage = 'Authentication failed'
      let httpStatus = 401
      
      switch (errorCode) {
        case 'TOKEN_EXPIRED':
          userMessage = 'Your session has expired. Please refresh the page or log in again.'
          break
        case 'INVALID_TOKEN':
        case 'INVALID_SIGNATURE':
          userMessage = 'Invalid authentication token. Please log in again.'
          break
        case 'EMAIL_NOT_CONFIRMED':
          userMessage = 'Please confirm your email address before accessing this resource.'
          httpStatus = 403
          break
        case 'NETWORK_ERROR':
        case 'AUTH_SERVICE_UNREACHABLE':
          userMessage = 'Authentication service temporarily unavailable. Please try again.'
          httpStatus = 503
          break
        case 'VERIFICATION_TIMEOUT':
          userMessage = 'Authentication verification timed out. Please try again.'
          httpStatus = 408
          break
        case 'RATE_LIMIT_EXCEEDED':
          userMessage = 'Too many authentication attempts. Please wait a moment and try again.'
          httpStatus = 429
          break
        default:
          userMessage = error || 'Authentication failed'
      }
      
      return res.status(httpStatus).json({
        success: false,
        error: {
          code: errorCode || 'AUTHENTICATION_FAILED',
          message: userMessage
        },
        meta: {
          requestId,
          timestamp: new Date().toISOString()
        }
      })
    }
    
    // Add user info to request (compatible with existing backend code)
    req.user = {
      id: user.id,
      email: user.email,
      role: user.role || 'authenticated',
      // Keep these for compatibility with existing code
      iat: Math.floor(Date.now() / 1000),
      exp: Math.floor(Date.now() / 1000) + (7 * 24 * 60 * 60) // 7 days from now
    }

    // Log successful authentication
    console.log(`✅ Authentication successful [${requestId}]:`, {
      userId: user.id,
      email: user.email,
      url: req.originalUrl,
      method: req.method
    })

    next()
  } catch (error) {
    console.error('Authentication error:', error)
    return res.status(500).json({
      success: false,
      error: {
        code: 'AUTH_ERROR',
        message: 'Internal authentication error'
      }
    })
  }
}

/**
 * Optional Authentication Middleware for Supabase
 * Adds user info if token is present, but doesn't require it
 */
export const optionalAuth = async (req, res, next) => {
  try {
    const authHeader = req.headers.authorization
    
    if (authHeader) {
      const token = authHeader.startsWith('Bearer ') 
        ? authHeader.slice(7) 
        : authHeader

      if (token) {
        const { user, error } = await supabaseService.verifyToken(token)
        
        if (!error && user) {
          req.user = {
            id: user.id,
            email: user.email,
            role: user.role || 'authenticated',
            iat: Math.floor(Date.now() / 1000),
            exp: Math.floor(Date.now() / 1000) + (7 * 24 * 60 * 60)
          }
        }
      }
    }

    next()
  } catch (error) {
    // In optional auth, we don't fail on invalid tokens
    // Just continue without user info
    console.warn('Optional auth warning:', error.message)
    next()
  }
}

/**
 * Role-based Authorization Middleware
 * Requires specific roles after authentication
 */
export const requireRole = (allowedRoles) => {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({
        success: false,
        error: {
          code: 'NOT_AUTHENTICATED',
          message: 'Authentication required'
        }
      })
    }

    const userRole = req.user.role
    const roles = Array.isArray(allowedRoles) ? allowedRoles : [allowedRoles]

    if (!roles.includes(userRole)) {
      return res.status(403).json({
        success: false,
        error: {
          code: 'INSUFFICIENT_PERMISSIONS',
          message: `Required role: ${roles.join(' or ')}, but user has: ${userRole}`
        }
      })
    }

    next()
  }
} 
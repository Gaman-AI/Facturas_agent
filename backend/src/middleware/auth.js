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
          message: 'Invalid authorization header format'
        }
      })
    }

    // Verify Supabase JWT token
    const { user, error } = await supabaseService.verifyToken(token)
    
    if (error || !user) {
      return res.status(401).json({
        success: false,
        error: {
          code: 'INVALID_TOKEN',
          message: error || 'Invalid or expired token'
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

    next()
  } catch (error) {
    console.error('Authentication error:', error)
    return res.status(500).json({
      success: false,
      error: {
        code: 'AUTH_ERROR',
        message: 'Authentication failed'
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
import jwt from 'jsonwebtoken'
import config from '../config/index.js'

/**
 * JWT Authentication Middleware
 * Verifies JWT tokens and adds user info to request
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

    // Verify JWT token
    const decoded = jwt.verify(token, config.jwt.secret)
    
    // Add user info to request
    req.user = {
      id: decoded.sub,
      email: decoded.email,
      role: decoded.role || 'authenticated',
      iat: decoded.iat,
      exp: decoded.exp
    }

    next()
  } catch (error) {
    if (error.name === 'JsonWebTokenError') {
      return res.status(401).json({
        success: false,
        error: {
          code: 'INVALID_TOKEN',
          message: 'Invalid or malformed token'
        }
      })
    }

    if (error.name === 'TokenExpiredError') {
      return res.status(401).json({
        success: false,
        error: {
          code: 'TOKEN_EXPIRED',
          message: 'Token has expired'
        }
      })
    }

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
 * Optional Authentication Middleware
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
        const decoded = jwt.verify(token, config.jwt.secret)
        req.user = {
          id: decoded.sub,
          email: decoded.email,
          role: decoded.role || 'authenticated',
          iat: decoded.iat,
          exp: decoded.exp
        }
      }
    }

    next()
  } catch (error) {
    // In optional auth, we don't fail on invalid tokens
    // Just continue without user info
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
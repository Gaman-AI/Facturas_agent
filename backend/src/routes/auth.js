import express from 'express'
import { validateRegister, validateLogin } from '../middleware/validation.js'
import { authenticate, optionalAuth } from '../middleware/auth.js'
import { asyncHandler } from '../middleware/errorHandler.js'
import authService from '../services/authService.js'

const router = express.Router()

/**
 * @route   GET /api/v1/auth
 * @desc    Get authentication module information
 * @access  Public
 */
router.get('/', asyncHandler(async (req, res) => {
  res.json({
    success: true,
    data: {
      module: 'Authentication',
      version: '1.0.0',
      description: 'CFDI user authentication and profile management',
      endpoints: {
        register: 'POST /api/v1/auth/register',
        login: 'POST /api/v1/auth/login',
        profile: 'GET /api/v1/auth/profile',
        updateProfile: 'PUT /api/v1/auth/profile',
        verify: 'POST /api/v1/auth/verify',
        logout: 'POST /api/v1/auth/logout',
        me: 'GET /api/v1/auth/me',
        status: 'GET /api/v1/auth/status'
      },
      features: [
        'JWT authentication',
        'CFDI profile management',
        'RFC validation',
        'Fiscal regime validation'
      ]
    },
    meta: {
      timestamp: new Date().toISOString(),
      requestId: req.id
    }
  })
}))

/**
 * @route   POST /api/v1/auth/register
 * @desc    Register a new user with CFDI profile
 * @access  Public
 */
router.post('/register', validateRegister, asyncHandler(async (req, res) => {
  const result = await authService.register(req.body)

  if (result.success) {
    res.status(201).json({
      success: true,
      data: {
        user: result.user,
        token: result.token,
        expiresIn: result.expiresIn
      },
      meta: {
        timestamp: new Date().toISOString(),
        requestId: req.id,
        message: 'User registered successfully'
      }
    })
  } else {
    res.status(400).json({
      success: false,
      error: {
        code: 'REGISTRATION_FAILED',
        message: result.error || 'Registration failed'
      },
      meta: {
        timestamp: new Date().toISOString(),
        requestId: req.id
      }
    })
  }
}))

/**
 * @route   POST /api/v1/auth/login
 * @desc    Login user and return JWT token
 * @access  Public
 */
router.post('/login', validateLogin, asyncHandler(async (req, res) => {
  const { email, password } = req.body
  
  const result = await authService.login(email, password)

  if (result.success) {
    res.json({
      success: true,
      data: {
        user: result.user,
        token: result.token,
        expiresIn: result.expiresIn
      },
      meta: {
        timestamp: new Date().toISOString(),
        requestId: req.id,
        message: 'Login successful'
      }
    })
  } else {
    res.status(401).json({
      success: false,
      error: {
        code: 'LOGIN_FAILED',
        message: result.error || 'Invalid credentials'
      },
      meta: {
        timestamp: new Date().toISOString(),
        requestId: req.id
      }
    })
  }
}))

/**
 * @route   GET /api/v1/auth/profile
 * @desc    Get current user profile
 * @access  Private
 */
router.get('/profile', authenticate, asyncHandler(async (req, res) => {
  const profile = await authService.getUserProfile(req.user.id)

  res.json({
    success: true,
    data: {
      user: {
        id: req.user.id,
        email: req.user.email,
        profile
      }
    },
    meta: {
      timestamp: new Date().toISOString(),
      requestId: req.id
    }
  })
}))

/**
 * @route   PUT /api/v1/auth/profile
 * @desc    Update user profile
 * @access  Private
 */
router.put('/profile', authenticate, asyncHandler(async (req, res) => {
  const allowedFields = ['rfc', 'fiscal_regime', 'postal_code', 'company_name', 'phone', 'address']
  const updateData = {}

  // Filter only allowed fields
  Object.keys(req.body).forEach(key => {
    if (allowedFields.includes(key)) {
      updateData[key] = req.body[key]
    }
  })

  if (Object.keys(updateData).length === 0) {
    return res.status(400).json({
      success: false,
      error: {
        code: 'NO_UPDATE_DATA',
        message: 'No valid fields provided for update',
        allowedFields
      },
      meta: {
        timestamp: new Date().toISOString(),
        requestId: req.id
      }
    })
  }

  // Validate RFC if provided
  if (updateData.rfc && !authService.validateRFC(updateData.rfc)) {
    return res.status(400).json({
      success: false,
      error: {
        code: 'INVALID_RFC',
        message: 'Invalid RFC format'
      },
      meta: {
        timestamp: new Date().toISOString(),
        requestId: req.id
      }
    })
  }

  // Validate fiscal regime if provided
  if (updateData.fiscal_regime && !authService.validateFiscalRegime(updateData.fiscal_regime)) {
    return res.status(400).json({
      success: false,
      error: {
        code: 'INVALID_FISCAL_REGIME',
        message: 'Invalid fiscal regime'
      },
      meta: {
        timestamp: new Date().toISOString(),
        requestId: req.id
      }
    })
  }

  const result = await authService.updateProfile(req.user.id, updateData)

  if (result.success) {
    res.json({
      success: true,
      data: {
        profile: result.profile
      },
      meta: {
        timestamp: new Date().toISOString(),
        requestId: req.id,
        message: 'Profile updated successfully'
      }
    })
  } else {
    res.status(400).json({
      success: false,
      error: {
        code: 'PROFILE_UPDATE_FAILED',
        message: result.error || 'Failed to update profile'
      },
      meta: {
        timestamp: new Date().toISOString(),
        requestId: req.id
      }
    })
  }
}))

/**
 * @route   POST /api/v1/auth/verify
 * @desc    Verify JWT token and return user info
 * @access  Private
 */
router.post('/verify', authenticate, asyncHandler(async (req, res) => {
  // Token is already verified by authenticate middleware
  const profile = await authService.getUserProfile(req.user.id)

  res.json({
    success: true,
    data: {
      user: {
        id: req.user.id,
        email: req.user.email,
        role: req.user.role,
        profile
      },
      tokenData: {
        iat: req.user.iat,
        exp: req.user.exp
      }
    },
    meta: {
      timestamp: new Date().toISOString(),
      requestId: req.id,
      message: 'Token is valid'
    }
  })
}))

/**
 * @route   POST /api/v1/auth/logout
 * @desc    Logout user (client-side token removal)
 * @access  Private
 */
router.post('/logout', authenticate, asyncHandler(async (req, res) => {
  // Since we're using stateless JWT, logout is handled client-side
  // This endpoint confirms logout action
  res.json({
    success: true,
    data: {
      message: 'Logout successful'
    },
    meta: {
      timestamp: new Date().toISOString(),
      requestId: req.id,
      message: 'Please remove the token from client storage'
    }
  })
}))

/**
 * @route   GET /api/v1/auth/me
 * @desc    Get minimal user info (alternative to /profile)
 * @access  Private
 */
router.get('/me', authenticate, asyncHandler(async (req, res) => {
  res.json({
    success: true,
    data: {
      id: req.user.id,
      email: req.user.email,
      role: req.user.role
    },
    meta: {
      timestamp: new Date().toISOString(),
      requestId: req.id
    }
  })
}))

/**
 * @route   GET /api/v1/auth/status
 * @desc    Check authentication status (works with or without token)
 * @access  Public
 */
router.get('/status', optionalAuth, asyncHandler(async (req, res) => {
  const isAuthenticated = !!req.user

  res.json({
    success: true,
    data: {
      authenticated: isAuthenticated,
      user: isAuthenticated ? {
        id: req.user.id,
        email: req.user.email,
        role: req.user.role
      } : null
    },
    meta: {
      timestamp: new Date().toISOString(),
      requestId: req.id
    }
  })
}))

export default router 
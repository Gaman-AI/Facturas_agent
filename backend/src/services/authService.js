import jwt from 'jsonwebtoken'
import bcrypt from 'bcryptjs'
import config from '../config/index.js'
import { AuthenticationError, ValidationError, ConflictError } from '../middleware/errorHandler.js'

/**
 * Authentication Service using Supabase MCP Server
 * Handles user registration, login, and profile management
 */
class AuthService {
  constructor() {
    this.supabaseProjectId = 'pffuarlnpdpfjrvewrqo'
  }

  /**
   * Register a new user with CFDI profile
   */
  async register(userData) {
    const { email, password, rfc, fiscal_regime, postal_code, company_name } = userData

    try {
      // Hash password
      const saltRounds = 12
      const hashedPassword = await bcrypt.hash(password, saltRounds)

      // Create user in Supabase Auth using MCP
      // Note: This would typically use Supabase Auth service, but we'll simulate for now
      const userId = this.generateUserId()
      
      // Create user profile with CFDI data using MCP
      const insertQuery = `
        INSERT INTO user_profiles (user_id, rfc, fiscal_regime, postal_code, company_name)
        VALUES ('${userId}', '${rfc}', '${fiscal_regime}', '${postal_code}', '${company_name || ''}')
        RETURNING *
      `

      // For now, we'll simulate the user creation
      // In a real implementation, this would use the Supabase MCP tools
      const userProfile = {
        id: this.generateUserId(),
        user_id: userId,
        rfc,
        fiscal_regime,
        postal_code,
        company_name,
        created_at: new Date().toISOString()
      }

      // Generate JWT token
      const token = this.generateToken({
        sub: userId,
        email,
        role: 'authenticated'
      })

      return {
        success: true,
        user: {
          id: userId,
          email,
          profile: userProfile
        },
        token,
        expiresIn: config.jwt.expiresIn
      }

    } catch (error) {
      // Handle duplicate RFC error
      if (error.code === '23505' && error.constraint === 'user_profiles_rfc_key') {
        throw new ConflictError('RFC already registered')
      }

      // Handle duplicate email error  
      if (error.code === '23505' && error.constraint === 'users_email_key') {
        throw new ConflictError('Email already registered')
      }

      throw new ValidationError(`Registration failed: ${error.message}`)
    }
  }

  /**
   * Login user with email and password
   */
  async login(email, password) {
    try {
      // In a real implementation, this would verify against Supabase Auth
      // For now, we'll simulate the login process
      
      // This would typically query the user from Supabase
      const user = await this.findUserByEmail(email)
      
      if (!user) {
        throw new AuthenticationError('Invalid email or password')
      }

      // Verify password (in real implementation, Supabase handles this)
      const isValidPassword = await bcrypt.compare(password, user.hashedPassword || '')
      
      if (!isValidPassword) {
        throw new AuthenticationError('Invalid email or password')
      }

      // Get user profile
      const profile = await this.getUserProfile(user.id)

      // Generate JWT token
      const token = this.generateToken({
        sub: user.id,
        email: user.email,
        role: 'authenticated'
      })

      return {
        success: true,
        user: {
          id: user.id,
          email: user.email,
          profile
        },
        token,
        expiresIn: config.jwt.expiresIn
      }

    } catch (error) {
      if (error instanceof AuthenticationError) {
        throw error
      }
      throw new AuthenticationError(`Login failed: ${error.message}`)
    }
  }

  /**
   * Get user profile by user ID
   */
  async getUserProfile(userId) {
    try {
      // In real implementation, this would use Supabase MCP
      // const query = `SELECT * FROM user_profiles WHERE user_id = '${userId}'`
      
      // Simulated profile for now
      return {
        id: this.generateUserId(),
        user_id: userId,
        rfc: 'XAXX010101000',
        fiscal_regime: '601',
        postal_code: '01000',
        company_name: 'Test Company',
        created_at: new Date().toISOString()
      }
    } catch (error) {
      throw new ValidationError(`Failed to get user profile: ${error.message}`)
    }
  }

  /**
   * Update user profile
   */
  async updateProfile(userId, profileData) {
    try {
      const { rfc, fiscal_regime, postal_code, company_name, phone, address } = profileData

      // In real implementation, this would use Supabase MCP
      const updateQuery = `
        UPDATE user_profiles 
        SET 
          rfc = COALESCE('${rfc}', rfc),
          fiscal_regime = COALESCE('${fiscal_regime}', fiscal_regime),
          postal_code = COALESCE('${postal_code}', postal_code),
          company_name = COALESCE('${company_name}', company_name),
          phone = COALESCE('${phone}', phone),
          address = COALESCE('${JSON.stringify(address)}', address),
          updated_at = NOW()
        WHERE user_id = '${userId}'
        RETURNING *
      `

      // Simulated update for now
      const updatedProfile = {
        id: this.generateUserId(),
        user_id: userId,
        rfc: rfc || 'XAXX010101000',
        fiscal_regime: fiscal_regime || '601',
        postal_code: postal_code || '01000',
        company_name: company_name || 'Test Company',
        phone: phone || null,
        address: address || {},
        updated_at: new Date().toISOString()
      }

      return {
        success: true,
        profile: updatedProfile
      }

    } catch (error) {
      throw new ValidationError(`Failed to update profile: ${error.message}`)
    }
  }

  /**
   * Verify JWT token
   */
  async verifyToken(token) {
    try {
      const decoded = jwt.verify(token, config.jwt.secret)
      
      // Get fresh user data
      const user = await this.findUserById(decoded.sub)
      const profile = await this.getUserProfile(decoded.sub)

      return {
        success: true,
        user: {
          id: user.id,
          email: user.email,
          profile
        },
        tokenData: decoded
      }

    } catch (error) {
      throw new AuthenticationError('Invalid or expired token')
    }
  }

  /**
   * Generate JWT token
   */
  generateToken(payload) {
    return jwt.sign(payload, config.jwt.secret, {
      expiresIn: config.jwt.expiresIn,
      issuer: 'cfdi-automation',
      audience: 'cfdi-users'
    })
  }

  /**
   * Generate UUID (helper method)
   */
  generateUserId() {
    return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
      const r = Math.random() * 16 | 0
      const v = c == 'x' ? r : (r & 0x3 | 0x8)
      return v.toString(16)
    })
  }

  /**
   * Simulate finding user by email (would use Supabase in real implementation)
   */
  async findUserByEmail(email) {
    // This would be replaced with actual Supabase query
    // For demo purposes, return a test user
    if (email === 'test@example.com') {
      return {
        id: this.generateUserId(),
        email,
        hashedPassword: await bcrypt.hash('password123', 12)
      }
    }
    return null
  }

  /**
   * Simulate finding user by ID (would use Supabase in real implementation)  
   */
  async findUserById(userId) {
    // This would be replaced with actual Supabase query
    return {
      id: userId,
      email: 'test@example.com'
    }
  }

  /**
   * Validate RFC format
   */
  validateRFC(rfc) {
    const rfcPattern = /^[A-ZÑ&]{3,4}[0-9]{2}(0[1-9]|1[0-2])(0[1-9]|[12][0-9]|3[01])[A-Z0-9]{2}[0-9A]$/
    return rfcPattern.test(rfc)
  }

  /**
   * Validate fiscal regime
   */
  validateFiscalRegime(regime) {
    const validRegimes = ['601', '603', '605', '606', '608', '610', '611', '612', '614', '616', '620', '621', '622', '623', '624', '625', '626']
    return validRegimes.includes(regime)
  }
}

export default new AuthService() 
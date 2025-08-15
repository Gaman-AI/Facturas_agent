import jwt from 'jsonwebtoken'
import bcrypt from 'bcryptjs'
import config from '../config/index.js'
import { AuthenticationError, ValidationError, ConflictError } from '../middleware/errorHandler.js'
import supabaseService from './supabase.js'

/**
 * Authentication Service using real Supabase integration
 * Handles user registration, login, and profile management
 */
class AuthService {
  constructor() {
    this.supabaseProjectId = 'pffuarlnpdpfjrvewrqo'
  }

  /**
   * Register a new user with CFDI profile using real Supabase integration
   */
  async register(userData) {
    const { 
      email, 
      password, 
      rfc, 
      country, 
      company_name, 
      street, 
      exterior_number, 
      interior_number, 
      colony, 
      municipality, 
      zip_code, 
      state, 
      tax_regime, 
      cfdi_use, 
      phone_number 
    } = userData

    try {
      // Step 1: Create user in Supabase Auth
      const { data: authData, error: authError } = await supabaseService.adminClient.auth.signUp({
        email: email,
        password: password,
      })

      if (authError) {
        throw new AuthenticationError(`Authentication failed: ${authError.message}`)
      }

      if (!authData.user) {
        throw new AuthenticationError('No user data returned from authentication')
      }

      // Step 2: Create user profile using our database function
      const { data: profileResult, error: profileError } = await supabaseService.adminClient
        .rpc('create_user_profile', {
          p_user_id: authData.user.id,
          p_rfc: rfc.toUpperCase(),
          p_country: country || 'México',
          p_company_name: company_name,
          p_street: street,
          p_exterior_number: exterior_number,
          p_interior_number: interior_number || null,
          p_colony: colony,
          p_municipality: municipality,
          p_zip_code: zip_code,
          p_state: state,
          p_tax_regime: tax_regime,
          p_cfdi_use: cfdi_use,
          p_email: email,
          p_phone_number: phone_number || null,
        })

      if (profileError) {
        console.error('Profile creation error:', profileError)
        throw new ValidationError(`Profile creation failed: ${profileError.message}`)
      }

      if (!profileResult || profileResult.length === 0) {
        throw new ValidationError('No profile data returned from creation')
      }

      // Get the created profile
      const profile = Array.isArray(profileResult) ? profileResult[0] : profileResult

      // Generate JWT token
      const token = this.generateToken({
        sub: authData.user.id,
        email: authData.user.email,
        role: 'authenticated'
      })

      return {
        success: true,
        user: {
          id: authData.user.id,
          email: authData.user.email,
          profile: profile
        },
        token,
        expiresIn: config.jwt.expiresIn
      }

    } catch (error) {
      // Handle duplicate RFC error
      if (error.message && error.message.includes('RFC') && error.message.includes('already exists')) {
        throw new ConflictError('RFC already registered')
      }

      // Handle duplicate email error
      if (error.message && error.message.includes('User') && error.message.includes('already has a profile')) {
        throw new ConflictError('User already has a profile')
      }

      if (error instanceof AuthenticationError || error instanceof ValidationError || error instanceof ConflictError) {
        throw error
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
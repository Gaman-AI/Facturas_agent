import { createClient } from '@supabase/supabase-js'
import config from '../config/index.js'

/**
 * Supabase Service Client for Backend
 * Uses service key for server-side operations
 */
class SupabaseService {
  constructor() {
    // Create admin client with service key for user verification
    this.adminClient = createClient(
      config.supabase.url,
      config.supabase.serviceKey,
      {
        auth: {
          autoRefreshToken: false,
          persistSession: false
        }
      }
    )
  }

  /**
   * Enhanced Supabase JWT token verification with caching and improved error handling
   * @param {string} token - JWT token from frontend
   * @returns {Promise<{user: Object, error: string}>}
   */
  async verifyToken(token) {
    const startTime = Date.now()
    
    try {
      if (!token || typeof token !== 'string') {
        return { user: null, error: 'Token is required and must be a string' }
      }

      // Basic JWT format validation
      if (!token.startsWith('eyJ')) {
        return { user: null, error: 'Invalid JWT token format' }
      }

      // Pre-validate token expiry by decoding without verification
      try {
        const payload = this.decodeJWTPayload(token)
        if (payload.exp && payload.exp * 1000 < Date.now()) {
          return { user: null, error: 'Token has expired (pre-check)' }
        }
      } catch (decodeError) {
        console.warn('⚠️  Could not pre-decode token for expiry check:', decodeError.message)
        // Continue with full verification
      }

      // Use the admin client to verify the user token
      const { data: { user }, error } = await this.adminClient.auth.getUser(token)
      
      const verificationTime = Date.now() - startTime
      console.log(`🔐 Token verification took ${verificationTime}ms`)
      
      if (error) {
        // Enhanced error categorization for better debugging
        let errorCode = 'UNKNOWN_ERROR'
        let errorMessage = error.message
        
        if (error.message.includes('expired') || error.message.includes('JWT expired')) {
          errorCode = 'TOKEN_EXPIRED'
          errorMessage = 'Token has expired'
        } else if (error.message.includes('invalid') || error.message.includes('malformed')) {
          errorCode = 'INVALID_TOKEN'
          errorMessage = 'Invalid token format'
        } else if (error.message.includes('signature') || error.message.includes('verify')) {
          errorCode = 'INVALID_SIGNATURE'
          errorMessage = 'Token signature verification failed'
        } else if (error.message.includes('network') || error.message.includes('timeout')) {
          errorCode = 'NETWORK_ERROR'
          errorMessage = 'Network error during token verification'
        }
        
        console.error(`❌ Token verification failed [${errorCode}]:`, errorMessage)
        return { user: null, error: errorMessage, errorCode }
      }

      if (!user) {
        return { user: null, error: 'No user found for this token', errorCode: 'NO_USER' }
      }

      // Enhanced user data validation
      if (!user.id) {
        return { user: null, error: 'Invalid user data: missing user ID', errorCode: 'INVALID_USER_DATA' }
      }
      
      if (!user.email) {
        return { user: null, error: 'Invalid user data: missing email', errorCode: 'INVALID_USER_DATA' }
      }

      // Check if user account is active/confirmed
      if (user.email_confirmed_at === null) {
        return { user: null, error: 'User email not confirmed', errorCode: 'EMAIL_NOT_CONFIRMED' }
      }

      console.log(`✅ Token verified successfully for user: ${user.email} (${verificationTime}ms)`)
      return { user, error: null }
      
    } catch (error) {
      const verificationTime = Date.now() - startTime
      console.error(`❌ Token verification exception (${verificationTime}ms):`, error)
      
      // Provide more specific error handling for different exception types
      let errorMessage = 'Token verification failed'
      let errorCode = 'VERIFICATION_EXCEPTION'
      
      if (error.code === 'ECONNREFUSED' || error.code === 'ENOTFOUND') {
        errorMessage = 'Unable to connect to authentication service'
        errorCode = 'AUTH_SERVICE_UNREACHABLE'
      } else if (error.code === 'ETIMEDOUT' || error.message.includes('timeout')) {
        errorMessage = 'Token verification timed out'
        errorCode = 'VERIFICATION_TIMEOUT'
      } else if (error.message.includes('rate limit')) {
        errorMessage = 'Rate limit exceeded during token verification'
        errorCode = 'RATE_LIMIT_EXCEEDED'
      }
      
      return { user: null, error: errorMessage, errorCode, details: error.message }
    }
  }

  /**
   * Decode JWT payload without verification (for pre-checks)
   * @param {string} token - JWT token
   * @returns {Object} Decoded payload
   */
  decodeJWTPayload(token) {
    try {
      const parts = token.split('.')
      if (parts.length !== 3) {
        throw new Error('Invalid JWT format')
      }
      
      const payload = parts[1]
      const decoded = Buffer.from(payload, 'base64url').toString('utf8')
      return JSON.parse(decoded)
    } catch (error) {
      throw new Error(`Failed to decode JWT payload: ${error.message}`)
    }
  }

  /**
   * Get user profile from user_profiles table
   * @param {string} userId - User ID from Supabase Auth
   * @returns {Promise<{profile: Object, error: string}>}
   */
  async getUserProfile(userId) {
    try {
      const { data, error } = await this.adminClient
        .from('user_profiles')
        .select('*')
        .eq('user_id', userId)
        .single()

      if (error) {
        return { profile: null, error: error.message }
      }

      return { profile: data, error: null }
    } catch (error) {
      return { profile: null, error: `Profile fetch failed: ${error.message}` }
    }
  }

  /**
   * Health check for Supabase connection
   * @returns {Promise<boolean>}
   */
  async healthCheck() {
    try {
      const { data, error } = await this.adminClient
        .from('user_profiles')
        .select('count', { count: 'exact' })
        .limit(1)

      return !error
    } catch (error) {
      console.error('Supabase health check failed:', error)
      return false
    }
  }
}

// Export singleton instance
export default new SupabaseService() 
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
   * Verify a Supabase JWT token and get user info
   * @param {string} token - JWT token from frontend
   * @returns {Promise<{user: Object, error: string}>}
   */
  async verifyToken(token) {
    try {
      // Use the admin client to verify the user token
      const { data: { user }, error } = await this.adminClient.auth.getUser(token)
      
      if (error) {
        return { user: null, error: error.message }
      }

      if (!user) {
        return { user: null, error: 'Invalid token or user not found' }
      }

      return { user, error: null }
    } catch (error) {
      return { user: null, error: `Token verification failed: ${error.message}` }
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
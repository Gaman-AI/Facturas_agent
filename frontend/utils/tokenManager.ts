/**
 * Centralized Token Manager
 * Handles all token refresh operations to prevent race conditions
 * and ensures synchronized token state across the application
 */

import { supabase } from '@/lib/supabase'
import type { Session } from '@supabase/supabase-js'

interface TokenState {
  isRefreshing: boolean
  lastRefresh: number
  refreshPromise: Promise<Session | null> | null
  pendingRequests: Array<{
    resolve: (token: string | null) => void
    reject: (error: Error) => void
  }>
}

class TokenManager {
  private state: TokenState = {
    isRefreshing: false,
    lastRefresh: 0,
    refreshPromise: null,
    pendingRequests: []
  }

  private readonly REFRESH_BUFFER = 10 * 60 * 1000 // 10 minutes buffer
  private readonly MIN_REFRESH_INTERVAL = 30 * 1000 // 30 seconds minimum between refreshes

  /**
   * Get valid token, refreshing if necessary
   * This is the main method that should be used by all components
   */
  async getValidToken(): Promise<string | null> {
    try {
      // Get current session
      const { data: { session } } = await supabase.auth.getSession()
      
      if (!session?.access_token) {
        console.warn('🚫 No active session found')
        return null
      }

      // Check if token needs refresh
      if (this.shouldRefreshToken(session)) {
        console.log('🔄 Token needs refresh, getting refreshed token...')
        const refreshedSession = await this.getOrAwaitRefresh()
        return refreshedSession?.access_token || null
      }

      return session.access_token
    } catch (error) {
      console.error('❌ Error getting valid token:', error)
      return null
    }
  }

  /**
   * Check if token should be refreshed based on expiry time
   */
  private shouldRefreshToken(session: Session): boolean {
    if (!session.expires_at) return false
    
    const expiresAt = session.expires_at * 1000
    const now = Date.now()
    
    // Refresh if token expires within buffer time
    return (expiresAt - now) < this.REFRESH_BUFFER
  }

  /**
   * Get refreshed token or await ongoing refresh
   * Prevents multiple simultaneous refresh attempts
   */
  private async getOrAwaitRefresh(): Promise<Session | null> {
    // If already refreshing, queue this request
    if (this.state.isRefreshing && this.state.refreshPromise) {
      console.log('🔄 Token refresh in progress, waiting...')
      return this.state.refreshPromise
    }

    // Check minimum refresh interval
    const timeSinceLastRefresh = Date.now() - this.state.lastRefresh
    if (timeSinceLastRefresh < this.MIN_REFRESH_INTERVAL) {
      console.log('🔄 Too soon since last refresh, skipping...')
      const { data: { session } } = await supabase.auth.getSession()
      return session
    }

    // Start new refresh
    return this.startTokenRefresh()
  }

  /**
   * Start token refresh process
   */
  private async startTokenRefresh(): Promise<Session | null> {
    this.state.isRefreshing = true
    this.state.lastRefresh = Date.now()
    
    console.log('🔄 Starting token refresh...')

    this.state.refreshPromise = this.performTokenRefresh()
    
    try {
      const session = await this.state.refreshPromise
      console.log('✅ Token refresh completed successfully')
      return session
    } catch (error) {
      console.error('❌ Token refresh failed:', error)
      throw error
    } finally {
      this.state.isRefreshing = false
      this.state.refreshPromise = null
    }
  }

  /**
   * Perform the actual token refresh
   */
  private async performTokenRefresh(): Promise<Session | null> {
    try {
      const { data, error } = await supabase.auth.refreshSession()
      
      if (error) {
        console.error('❌ Supabase refresh error:', error)
        throw new Error(`Token refresh failed: ${error.message}`)
      }

      if (!data.session?.access_token) {
        console.error('❌ No session received after refresh')
        throw new Error('No session received after refresh')
      }

      console.log('✅ Token refreshed successfully', {
        expires_at: data.session.expires_at,
        user_id: data.session.user?.id
      })

      return data.session
    } catch (error) {
      console.error('❌ Token refresh exception:', error)
      throw error
    }
  }

  /**
   * Force token refresh (for manual refresh requests)
   */
  async forceRefresh(): Promise<Session | null> {
    // Reset last refresh time to allow immediate refresh
    this.state.lastRefresh = 0
    return this.startTokenRefresh()
  }

  /**
   * Check if token is currently being refreshed
   */
  isRefreshing(): boolean {
    return this.state.isRefreshing
  }

  /**
   * Get token info for debugging
   */
  async getTokenInfo(): Promise<{
    hasToken: boolean
    expiresAt: number | null
    expiresIn: number | null
    needsRefresh: boolean
    isRefreshing: boolean
  }> {
    try {
      const { data: { session } } = await supabase.auth.getSession()
      
      if (!session?.access_token) {
        return {
          hasToken: false,
          expiresAt: null,
          expiresIn: null,
          needsRefresh: false,
          isRefreshing: this.state.isRefreshing
        }
      }

      const expiresAt = session.expires_at ? session.expires_at * 1000 : null
      const expiresIn = expiresAt ? expiresAt - Date.now() : null
      const needsRefresh = this.shouldRefreshToken(session)

      return {
        hasToken: true,
        expiresAt,
        expiresIn,
        needsRefresh,
        isRefreshing: this.state.isRefreshing
      }
    } catch (error) {
      console.error('❌ Error getting token info:', error)
      return {
        hasToken: false,
        expiresAt: null,
        expiresIn: null,
        needsRefresh: false,
        isRefreshing: this.state.isRefreshing
      }
    }
  }

  /**
   * Clear all token state (for logout)
   */
  clearState(): void {
    this.state = {
      isRefreshing: false,
      lastRefresh: 0,
      refreshPromise: null,
      pendingRequests: []
    }
  }
}

// Export singleton instance
export const tokenManager = new TokenManager()

// Export the class for testing
export { TokenManager }
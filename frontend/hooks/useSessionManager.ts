/**
 * Enhanced Session Management Hook
 * Handles session refresh and authentication state management using centralized token manager
 */

import { useCallback, useEffect, useState } from 'react'
import { useAuth } from './useAuth'
import { tokenManager } from '@/utils/tokenManager'

interface SessionManagerState {
  isRefreshing: boolean
  lastRefresh: Date | null
  error: string | null
  tokenInfo: {
    hasToken: boolean
    expiresAt: number | null
    expiresIn: number | null
    needsRefresh: boolean
    isRefreshing: boolean
  } | null
}

export function useSessionManager() {
  const { user, refreshSession } = useAuth()
  const [state, setState] = useState<SessionManagerState>({
    isRefreshing: false,
    lastRefresh: null,
    error: null,
    tokenInfo: null
  })

  // Auto-refresh session using centralized token manager
  useEffect(() => {
    if (!user) return

    const checkAndRefreshSession = async () => {
      try {
        // Get token info from centralized manager
        const tokenInfo = await tokenManager.getTokenInfo()
        
        setState(prev => ({ ...prev, tokenInfo }))
        
        if (tokenInfo.hasToken && tokenInfo.needsRefresh && !tokenInfo.isRefreshing) {
          console.log('🔄 Token needs refresh, auto-refreshing...')
          await handleRefreshSession()
        }
      } catch (error) {
        console.error('❌ Auto-refresh check failed:', error)
        setState(prev => ({ 
          ...prev, 
          error: error instanceof Error ? error.message : 'Auto-refresh check failed'
        }))
      }
    }

    // Check every 1 minute for better responsiveness
    const interval = setInterval(checkAndRefreshSession, 1 * 60 * 1000)
    
    // Initial check
    checkAndRefreshSession()

    // Listen for token refresh events
    const handleTokenRefreshFailed = (event: CustomEvent) => {
      console.error('🚨 Token refresh failed globally:', event.detail)
      setState(prev => ({ 
        ...prev, 
        error: 'Authentication session expired. Please log in again.',
        isRefreshing: false
      }))
    }

    window.addEventListener('auth:token-refresh-failed', handleTokenRefreshFailed as EventListener)

    return () => {
      clearInterval(interval)
      window.removeEventListener('auth:token-refresh-failed', handleTokenRefreshFailed as EventListener)
    }
  }, [user])

  const handleRefreshSession = useCallback(async () => {
    if (state.isRefreshing || tokenManager.isRefreshing()) {
      console.log('🔄 Session refresh already in progress, skipping...')
      return
    }

    setState(prev => ({ ...prev, isRefreshing: true, error: null }))

    try {
      await refreshSession()
      const tokenInfo = await tokenManager.getTokenInfo()
      
      setState(prev => ({ 
        ...prev, 
        isRefreshing: false, 
        lastRefresh: new Date(),
        error: null,
        tokenInfo
      }))
      console.log('✅ Session refreshed successfully via enhanced session manager')
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Session refresh failed'
      setState(prev => ({ 
        ...prev, 
        isRefreshing: false,
        error: message
      }))
      console.error('❌ Session refresh failed:', message)
      throw error
    }
  }, [refreshSession, state.isRefreshing])

  const ensureValidSession = useCallback(async () => {
    try {
      // Use centralized token manager to ensure valid token
      const token = await tokenManager.getValidToken()
      
      if (!token) {
        throw new Error('No valid token available')
      }

      // Update token info after ensuring validity
      const tokenInfo = await tokenManager.getTokenInfo()
      setState(prev => ({ ...prev, tokenInfo }))
      
      console.log('✅ Valid session ensured via token manager')
    } catch (error) {
      console.error('❌ Failed to ensure valid session:', error)
      setState(prev => ({ 
        ...prev, 
        error: error instanceof Error ? error.message : 'Failed to ensure valid session'
      }))
      throw error
    }
  }, [])

  const getTokenInfo = useCallback(async () => {
    try {
      const tokenInfo = await tokenManager.getTokenInfo()
      setState(prev => ({ ...prev, tokenInfo }))
      return tokenInfo
    } catch (error) {
      console.error('❌ Failed to get token info:', error)
      return null
    }
  }, [])

  const forceRefresh = useCallback(async () => {
    try {
      setState(prev => ({ ...prev, isRefreshing: true, error: null }))
      
      const refreshedSession = await tokenManager.forceRefresh()
      
      if (!refreshedSession) {
        throw new Error('Force refresh returned no session')
      }

      const tokenInfo = await tokenManager.getTokenInfo()
      
      setState(prev => ({ 
        ...prev, 
        isRefreshing: false, 
        lastRefresh: new Date(),
        error: null,
        tokenInfo
      }))
      
      console.log('✅ Force refresh completed successfully')
      return refreshedSession
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Force refresh failed'
      setState(prev => ({ 
        ...prev, 
        isRefreshing: false,
        error: message
      }))
      console.error('❌ Force refresh failed:', message)
      throw error
    }
  }, [])

  return {
    isRefreshing: state.isRefreshing,
    lastRefresh: state.lastRefresh,
    error: state.error,
    tokenInfo: state.tokenInfo,
    refreshSession: handleRefreshSession,
    ensureValidSession,
    getTokenInfo,
    forceRefresh,
    // Helper computed properties
    isTokenValid: state.tokenInfo?.hasToken && !state.tokenInfo?.needsRefresh,
    tokenExpiresIn: state.tokenInfo?.expiresIn,
    tokenExpiresAt: state.tokenInfo?.expiresAt
  }
}
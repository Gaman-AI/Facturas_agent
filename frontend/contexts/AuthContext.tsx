'use client'

import React, { createContext, useContext, useEffect, useState, useCallback, useRef } from 'react'
import { User } from '@supabase/supabase-js'
import { supabase } from '@/lib/supabase'
import { authService } from '@/services/auth'
import { RegisterData } from '@/types/auth'

interface UserProfile {
  id?: string
  user_id?: string
  rfc: string
  country: string
  company_name: string
  street: string
  exterior_number: string
  interior_number?: string
  colony: string
  municipality: string
  zip_code: string
  state: string
  tax_regime: string
  cfdi_use: string
  created_at?: string
  updated_at?: string
}

export interface AuthContextType {
  user: User | null
  profile: UserProfile | null
  loading: boolean
  isAuthenticated: boolean
  isInitialized: boolean
  error: string | null
  login: (email: string, password: string) => Promise<void>
  register: (registerData: RegisterData) => Promise<void>
  logout: () => Promise<void>
  updateProfile: (profile: Partial<UserProfile>) => Promise<void>
  refreshSession: () => Promise<void>
  clearError: () => void
}

export const AuthContext = createContext<AuthContextType | undefined>(undefined)

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null)
  const [profile, setProfile] = useState<UserProfile | null>(null)
  const [loading, setLoading] = useState(true)
  const [isInitialized, setIsInitialized] = useState(false)
  const [error, setError] = useState<string | null>(null)
  
  // Use ref to prevent multiple initializations
  const initRef = useRef(false)

  const loadUserProfile = useCallback(async (userId: string) => {
    if (!supabase) {
      console.warn('Supabase client not initialized - skipping profile load')
      return
    }
    
    try {
      const { data, error } = await supabase
        .from('user_profiles')
        .select('*')
        .eq('user_id', userId)
        .single()

      if (error && error.code !== 'PGRST116') {
        throw error
      }

      setProfile(data || null)
    } catch (err) {
      console.error('Error loading user profile:', err)
    }
  }, [])

  // Initialize auth only once - OPTIMIZED FOR PERFORMANCE
  useEffect(() => {
    if (initRef.current) return
    initRef.current = true

    const initializeAuth = async () => {
      if (!supabase) {
        console.warn('Supabase client not initialized - skipping auth initialization')
        setIsInitialized(true)
        setLoading(false)
        return
      }
      
      try {
        // Get session and handle profile loading in parallel if user exists
        const { data: { session } } = await supabase.auth.getSession()
        
        if (session?.user) {
          setUser(session.user)
          // Load profile in background - don't block UI
          loadUserProfile(session.user.id).catch(console.error)
        }
        
        // Mark as initialized immediately after session check
        setIsInitialized(true)
        setLoading(false)
      } catch (err) {
        console.error('Error initializing auth:', err)
        setError(err instanceof Error ? err.message : 'Authentication error')
        setIsInitialized(true)
        setLoading(false)
      }
    }

    initializeAuth()

    // Auth state listener - only if supabase is available
    if (supabase) {
      const { data: { subscription } } = supabase.auth.onAuthStateChange(
        async (event, session) => {
          if (event === 'SIGNED_IN' && session?.user) {
            setUser(session.user)
            setError(null)
            // Load profile in background - don't block UI
            loadUserProfile(session.user.id).catch(console.error)
          } else if (event === 'SIGNED_OUT') {
            setUser(null)
            setProfile(null)
            setError(null)
          }
        }
      )

      return () => {
        subscription.unsubscribe()
      }
    }
  }, [loadUserProfile])

  const login = useCallback(async (email: string, password: string) => {
    if (!supabase) {
      const error = new Error('Supabase client not initialized. Please check your environment variables.')
      setError(error.message)
      throw error
    }
    
    try {
      setError(null)
      setLoading(true)
      const { error } = await supabase.auth.signInWithPassword({
        email,
        password,
      })
      if (error) throw error
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Login failed'
      setError(message)
      throw err
    } finally {
      setLoading(false)
    }
  }, [])

  const register = useCallback(async (registerData: RegisterData) => {
    try {
      setError(null)
      setLoading(true)
      
      // Use authService singleton to create user AND profile in one transaction
      const { user: newUser, profile: newProfile } = await authService.register(registerData)
      
      // Update local state
      setUser(newUser)
      setProfile(newProfile)
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Registration failed'
      setError(message)
      throw err
    } finally {
      setLoading(false)
    }
  }, [])

  const logout = useCallback(async () => {
    if (!supabase) {
      const error = new Error('Supabase client not initialized. Please check your environment variables.')
      setError(error.message)
      throw error
    }
    
    try {
      setError(null)
      const { error } = await supabase.auth.signOut()
      if (error) throw error
      
      // Clear token manager state on logout
      tokenManager.clearState()
      console.log('✅ Logged out and cleared token manager state')
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Logout failed'
      setError(message)
      // Clear token state even if logout fails
      tokenManager.clearState()
      throw err
    }
  }, [])

  const updateProfile = useCallback(async (profileData: Partial<UserProfile>) => {
    if (!supabase) {
      const error = new Error('Supabase client not initialized. Please check your environment variables.')
      setError(error.message)
      throw error
    }
    
    if (!user) throw new Error('No authenticated user')

    try {
      setError(null)
      setLoading(true)

      const { data, error } = await supabase
        .from('user_profiles')
        .upsert({ 
          user_id: user.id, 
          ...profileData,
          updated_at: new Date().toISOString()
        })
        .select()
        .single()

      if (error) throw error
      setProfile(data)
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Profile update failed'
      setError(message)
      throw err
    } finally {
      setLoading(false)
    }
  }, [user])

  const refreshSession = useCallback(async () => {
    if (!supabase) {
      const error = new Error('Supabase client not initialized. Please check your environment variables.')
      setError(error.message)
      throw error
    }
    
    try {
      setError(null)
      console.log('🔄 Refreshing session via token manager...')
      
      // Use centralized token manager for session refresh
      const refreshedSession = await tokenManager.forceRefresh()
      
      if (!refreshedSession) {
        throw new Error('Failed to get refreshed session')
      }
      
      if (refreshedSession.user) {
        console.log('✅ Session refreshed successfully via token manager')
        setUser(refreshedSession.user)
        await loadUserProfile(refreshedSession.user.id)
      } else {
        console.warn('⚠️  No user in refreshed session')
        setUser(null)
        setProfile(null)
      }
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Session refresh failed'
      console.error('❌ Session refresh error:', message)
      setError(message)
      // Clear user state and token manager state on refresh failure
      setUser(null)
      setProfile(null)
      tokenManager.clearState()
      throw err
    }
  }, [loadUserProfile])

  const clearError = useCallback(() => {
    setError(null)
  }, [])

  const value: AuthContextType = {
    user,
    profile,
    loading,
    isAuthenticated: !!user,
    isInitialized,
    error,
    login,
    register,
    logout,
    updateProfile,
    refreshSession,
    clearError,
  }

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  )
}
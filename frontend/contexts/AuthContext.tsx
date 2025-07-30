'use client'

import React, { createContext, useContext, useEffect, useState, useCallback, useRef } from 'react'
import { User } from '@supabase/supabase-js'
import { supabase } from '@/lib/supabase'
import { authService } from '@/services/auth'
import { RegisterData, UserProfile } from '@/types/auth'

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
  const [error, setError] = useState<string | null>(null)
  const [isInitialized, setIsInitialized] = useState(false)
  const mountedRef = useRef(true) // Add ref to track if component is mounted

  // Safe state setters that check if component is mounted
  const safeSetUser = useCallback((newUser: User | null) => {
    if (mountedRef.current) {
      setUser(newUser)
    }
  }, [])

  const safeSetProfile = useCallback((newProfile: UserProfile | null) => {
    if (mountedRef.current) {
      setProfile(newProfile)
    }
  }, [])

  const safeSetLoading = useCallback((newLoading: boolean) => {
    if (mountedRef.current) {
      setLoading(newLoading)
    }
  }, [])

  const safeSetError = useCallback((newError: string | null) => {
    if (mountedRef.current) {
      setError(newError)
    }
  }, [])

  const safeSetIsInitialized = useCallback((newInitialized: boolean) => {
    if (mountedRef.current) {
      setIsInitialized(newInitialized)
    }
  }, [])

  const loadUserProfile = useCallback(async (userId: string) => {
    try {
      const { data, error } = await supabase
        .from('user_profiles')
        .select('*')
        .eq('user_id', userId)
        .single()

      if (error && error.code !== 'PGRST116') {
        console.error('Profile fetch error:', error)
        return
      }

      if (data) {
        safeSetProfile(data)
      }
    } catch (err) {
      console.error('Profile loading error:', err)
    }
  }, [safeSetProfile])

  useEffect(() => {
    mountedRef.current = true

    const initializeAuth = async () => {
      try {
        const { data: { session } } = await supabase.auth.getSession()
        
        if (session?.user) {
          safeSetUser(session.user)
          await loadUserProfile(session.user.id)
        }
      } catch (err) {
        console.error('Auth initialization error:', err)
        safeSetError('Failed to initialize authentication')
      } finally {
        safeSetLoading(false)
        safeSetIsInitialized(true)
      }
    }

    initializeAuth()

    // Auth state listener
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        if (!mountedRef.current) return // Don't update if unmounted
        
        if (event === 'SIGNED_IN' && session?.user) {
          safeSetUser(session.user)
          safeSetError(null)
          // Load profile in background - don't block UI
          loadUserProfile(session.user.id).catch(console.error)
        } else if (event === 'SIGNED_OUT') {
          safeSetUser(null)
          safeSetProfile(null)
          safeSetError(null)
        }
      }
    )

    return () => {
      mountedRef.current = false
      subscription.unsubscribe()
    }
  }, [loadUserProfile, safeSetUser, safeSetProfile, safeSetError, safeSetLoading, safeSetIsInitialized])

  const login = useCallback(async (email: string, password: string) => {
    try {
      safeSetError(null)
      safeSetLoading(true)
      const { error } = await supabase.auth.signInWithPassword({
        email,
        password,
      })
      if (error) throw error
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Login failed'
      safeSetError(message)
      throw err
    } finally {
      safeSetLoading(false)
    }
  }, [safeSetError, safeSetLoading])

  const register = useCallback(async (registerData: RegisterData) => {
    try {
      safeSetError(null)
      safeSetLoading(true)
      
      // Use authService singleton to create user AND profile in one transaction
      const { user: newUser, profile: newProfile } = await authService.register(registerData)
      
      // Update local state only if still mounted
      if (mountedRef.current) {
        safeSetUser(newUser)
        safeSetProfile(newProfile)
      }
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Registration failed'
      safeSetError(message)
      throw err
    } finally {
      safeSetLoading(false)
    }
  }, [safeSetError, safeSetLoading, safeSetUser, safeSetProfile])

  const logout = useCallback(async () => {
    try {
      safeSetError(null)
      const { error } = await supabase.auth.signOut()
      if (error) throw error
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Logout failed'
      safeSetError(message)
      throw err
    }
  }, [safeSetError])

  const updateProfile = useCallback(async (profileData: Partial<UserProfile>) => {
    if (!user) throw new Error('No authenticated user')

    try {
      safeSetError(null)
      safeSetLoading(true)

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
      safeSetProfile(data)
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Profile update failed'
      safeSetError(message)
      throw err
    } finally {
      safeSetLoading(false)
    }
  }, [user, safeSetError, safeSetLoading, safeSetProfile])

  const refreshSession = useCallback(async () => {
    try {
      const { data, error } = await supabase.auth.refreshSession()
      if (error) throw error
      
      if (data.session?.user) {
        safeSetUser(data.session.user)
        await loadUserProfile(data.session.user.id)
      }
    } catch (err) {
      console.error('Session refresh error:', err)
      throw err
    }
  }, [safeSetUser, loadUserProfile])

  const clearError = useCallback(() => {
    safeSetError(null)
  }, [safeSetError])

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
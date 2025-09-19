'use client'

import React, { createContext, useContext, useEffect, useState, useCallback, useRef } from 'react'
import { User } from '@supabase/supabase-js'
import { supabase } from '@/lib/supabase'
import { authService } from '@/services/auth'
import { RegisterData, UserProfile } from '@/types/auth'
import { tokenManager } from '@/utils/tokenManager'

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
  refreshProfile: () => Promise<void>
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
      if (!supabase) {
        console.warn('Supabase client not initialized - skipping auth initialization')
        safeSetIsInitialized(true)
        safeSetLoading(false)
        return
      }
      
      try {
        // Get session and handle profile loading in parallel if user exists
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

    // Auth state listener - only if supabase is available
    if (supabase) {
      const { data: { subscription } } = supabase.auth.onAuthStateChange(
        async (event, session) => {
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
        subscription.unsubscribe()
      }
    }
  }, [loadUserProfile, safeSetUser, safeSetProfile, safeSetError, safeSetLoading, safeSetIsInitialized])

  const login = useCallback(async (email: string, password: string) => {
    if (!supabase) {
      const error = new Error('Supabase client not initialized. Please check your environment variables.')
      safeSetError(error.message)
      throw error
    }
    
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
    if (!supabase) {
      const error = new Error('Supabase client not initialized. Please check your environment variables.')
      safeSetError(error.message)
      throw error
    }
    
    try {
      safeSetError(null)
      const { error } = await supabase.auth.signOut()
      if (error) throw error
      
      // Clear token manager state on logout
      tokenManager.clearState()
      console.log('✅ Logged out and cleared token manager state')
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Logout failed'
      safeSetError(message)
      // Clear token state even if logout fails
      tokenManager.clearState()
      throw err
    }
  }, [safeSetError])

  const updateProfile = useCallback(async (profileData: Partial<UserProfile>) => {
    if (!supabase) {
      const error = new Error('Supabase client not initialized. Please check your environment variables.')
      setError(error.message)
      throw error
    }
    
    if (!user) throw new Error('No authenticated user')

    try {
      safeSetError(null)
      safeSetLoading(true)

      // Prepare update payload (remove user_id for updates, only needed for inserts)
      const basePayload = {
        ...profileData,
        // Ensure email is always included (required field)
        email: profileData.email || user.email,
        updated_at: new Date().toISOString()
      }
      
      const updatePayload = profile?.id 
        ? basePayload // For updates, don't include user_id
        : { user_id: user.id, ...basePayload } // For inserts, include user_id

      console.log('🔄 Attempting profile update with payload:', updatePayload)
      console.log('🔍 profileData:', profileData)
      console.log('🔍 profileData.rfc:', profileData.rfc)
      console.log('🔍 typeof profileData.rfc:', typeof profileData.rfc)

      // Check if RFC exists in the payload and if it already exists for another user
      const rfcToCheck = basePayload.rfc || profileData.rfc;
      if (rfcToCheck && rfcToCheck.trim() !== '') {
        console.log('🔍 Checking RFC conflict for:', rfcToCheck)
        console.log('🔍 Current profile RFC:', profile?.rfc)
        console.log('🔍 RFC changed?', rfcToCheck !== profile?.rfc)
        
        // Only check for conflicts if the RFC is actually being changed
        if (rfcToCheck !== profile?.rfc) {
          console.log('🔍 RFC is being changed, checking for conflicts...')
          
          const { data: existingProfile, error: checkError } = await supabase
            .from('user_profiles')
            .select('user_id, rfc')
            .eq('rfc', rfcToCheck)
            .neq('user_id', user.id)

          console.log('🔍 RFC check result:', { existingProfile, checkError })

          if (checkError) {
            console.error('❌ Error checking RFC:', checkError)
            throw checkError
          }

          if (existingProfile && existingProfile.length > 0) {
            const error = new Error(`El RFC ${rfcToCheck} ya está registrado por otro usuario. Por favor, usa un RFC diferente.`)
            console.error('❌ RFC conflict detected:', existingProfile)
            throw error
          }
        } else {
          console.log('🔍 RFC unchanged, skipping conflict check')
        }
      }

      // Use update instead of upsert for existing profiles
      let data, error;
      if (profile?.id) {
        // Update existing profile
        console.log('🔄 Updating existing profile with ID:', profile.id)
        const result = await supabase
          .from('user_profiles')
          .update(updatePayload)
          .eq('id', profile.id)
          .select()
          .single()
        data = result.data;
        error = result.error;
      } else {
        // Insert new profile
        console.log('🔄 Creating new profile')
        const result = await supabase
          .from('user_profiles')
          .insert(updatePayload)
          .select()
          .single()
        data = result.data;
        error = result.error;
      }

      if (error) {
        console.error('❌ Profile update error:', error)
        console.error('Error code:', error.code)
        console.error('Error message:', error.message)
        console.error('Error details:', error.details)
        console.error('Error hint:', error.hint)
        
        // Handle specific error cases
        if (error.code === '23505') {
          if (error.message.includes('user_profiles_rfc_key')) {
            const rfcValue = basePayload.rfc || 'desconocido';
            throw new Error(`El RFC ${rfcValue} ya está registrado por otro usuario. Por favor, usa un RFC diferente.`)
          }
          throw new Error('Este valor ya está siendo usado por otro usuario. Por favor, cambia el valor e intenta de nuevo.')
        }
        throw error
      }
      
      console.log('✅ Profile update successful:', data)
      safeSetProfile(data)
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Profile update failed'
      console.error('❌ Profile update failed:', err)
      safeSetError(message)
      throw err
    } finally {
      safeSetLoading(false)
    }
  }, [user, profile, safeSetError, safeSetLoading, safeSetProfile])

  const refreshProfile = useCallback(async () => {
    if (!supabase) {
      const error = new Error('Supabase client not initialized. Please check your environment variables.')
      setError(error.message)
      throw error
    }
    
    if (!user) throw new Error('No authenticated user')

    try {
      const { data, error } = await supabase
        .from('user_profiles')
        .select('*')
        .eq('user_id', user.id)
        .single()

      if (error && error.code !== 'PGRST116') {
        throw error
      }

      if (data) {
        safeSetProfile(data)
      }
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to refresh profile'
      safeSetError(message)
      throw err
    }
  }, [user, safeSetError, safeSetProfile])

  const refreshSession = useCallback(async () => {
    if (!supabase) {
      const error = new Error('Supabase client not initialized. Please check your environment variables.')
      safeSetError(error.message)
      throw error
    }
    
    try {
      safeSetError(null)
      console.log('🔄 Refreshing session via token manager...')
      
      // Use centralized token manager for session refresh
      const refreshedSession = await tokenManager.forceRefresh()
      
      if (!refreshedSession) {
        throw new Error('Failed to get refreshed session')
      }
      
      if (refreshedSession.user) {
        console.log('✅ Session refreshed successfully via token manager')
        safeSetUser(refreshedSession.user)
        await loadUserProfile(refreshedSession.user.id)
      } else {
        console.warn('⚠️  No user in refreshed session')
        safeSetUser(null)
        safeSetProfile(null)
      }
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Session refresh failed'
      console.error('❌ Session refresh error:', message)
      safeSetError(message)
      // Clear user state and token manager state on refresh failure
      safeSetUser(null)
      safeSetProfile(null)
      tokenManager.clearState()
      throw err
    }
  }, [safeSetUser, safeSetProfile, safeSetError, loadUserProfile])

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
    refreshProfile,
    refreshSession,
    clearError,
  }

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  const context = useContext(AuthContext)
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider')
  }
  return context
}
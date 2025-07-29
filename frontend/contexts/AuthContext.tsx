'use client'

import React, { createContext, useContext, useEffect, useState, useCallback, useRef } from 'react'
import { User } from '@supabase/supabase-js'
import { supabase } from '@/lib/supabase'

interface UserProfile {
  id?: string
  user_id?: string
  rfc: string
  razon_social: string
  calle: string
  numero_ext: string
  numero_int?: string
  colonia: string
  delegacion_municipio: string
  codigo_postal: string
  estado: string
  regimen_fiscal: string
  uso_cfdi: string
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
  register: (email: string, password: string) => Promise<void>
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

  // Initialize auth only once
  useEffect(() => {
    if (initRef.current) return
    initRef.current = true

    const initializeAuth = async () => {
      try {
        const { data: { session } } = await supabase.auth.getSession()
        
        if (session?.user) {
          setUser(session.user)
          await loadUserProfile(session.user.id)
        }
      } catch (err) {
        console.error('Error initializing auth:', err)
        setError(err instanceof Error ? err.message : 'Authentication error')
      } finally {
        setLoading(false)
        setIsInitialized(true)
      }
    }

    initializeAuth()

    // Auth state listener
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        if (event === 'SIGNED_IN' && session?.user) {
          setUser(session.user)
          setError(null)
          await loadUserProfile(session.user.id)
        } else if (event === 'SIGNED_OUT') {
          setUser(null)
          setProfile(null)
          setError(null)
        }
        setLoading(false)
      }
    )

    return () => {
      subscription.unsubscribe()
    }
  }, [loadUserProfile])

  const login = useCallback(async (email: string, password: string) => {
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

  const register = useCallback(async (email: string, password: string) => {
    try {
      setError(null)
      setLoading(true)
      const { error } = await supabase.auth.signUp({
        email,
        password,
      })
      if (error) throw error
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Registration failed'
      setError(message)
      throw err
    } finally {
      setLoading(false)
    }
  }, [])

  const logout = useCallback(async () => {
    try {
      setError(null)
      const { error } = await supabase.auth.signOut()
      if (error) throw error
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Logout failed'
      setError(message)
      throw err
    }
  }, [])

  const updateProfile = useCallback(async (profileData: Partial<UserProfile>) => {
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
    try {
      setError(null)
      const { data, error } = await supabase.auth.refreshSession()
      if (error) throw error
      
      if (data.user) {
        setUser(data.user)
        await loadUserProfile(data.user.id)
      }
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Session refresh failed'
      setError(message)
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
'use client';

import React, { createContext, useContext, useEffect, useReducer, ReactNode } from 'react';
import { mcpSupabaseClient } from '@/lib/supabase';
import { 
  AuthState, 
  LoginCredentials, 
  RegisterData, 
  UserProfile,
  User,
  AuthError 
} from '@/types/auth';

// AuthContextType interface
export interface AuthContextType {
  user: User | null;
  profile: UserProfile | null;
  loading: boolean;
  error: string | null;
  isAuthenticated: boolean;
  isInitialized: boolean;
  login: (credentials: LoginCredentials) => Promise<void>;
  register: (data: RegisterData) => Promise<void>;
  logout: () => Promise<void>;
  updateProfile: (updates: Partial<UserProfile>) => Promise<void>;
  refreshSession: () => Promise<void>;
  clearError: () => void;
}

// Initial state
const initialState: AuthState = {
  user: null,
  profile: null,
  loading: true,
  error: null,
};

// Action types
type AuthAction =
  | { type: 'SET_LOADING'; payload: boolean }
  | { type: 'SET_USER'; payload: { user: User | null; profile: UserProfile | null } }
  | { type: 'SET_ERROR'; payload: string | null }
  | { type: 'CLEAR_ERROR' }
  | { type: 'SET_INITIALIZED'; payload: boolean }
  | { type: 'UPDATE_PROFILE'; payload: UserProfile };

// Reducer
const authReducer = (state: AuthState, action: AuthAction): AuthState => {
  switch (action.type) {
    case 'SET_LOADING':
      return { ...state, loading: action.payload };
    
    case 'SET_USER':
      return {
        ...state,
        user: action.payload.user,
        profile: action.payload.profile,
        loading: false,
        error: null,
      };
    
    case 'SET_ERROR':
      return { ...state, error: action.payload, loading: false };
    
    case 'CLEAR_ERROR':
      return { ...state, error: null };
    
    case 'SET_INITIALIZED':
      return { ...state, isInitialized: action.payload };
    
    case 'UPDATE_PROFILE':
      return { ...state, profile: action.payload };
    
    default:
      return state;
  }
};

// Create context
const AuthContext = createContext<AuthContextType | undefined>(undefined);

// Provider component
interface AuthProviderProps {
  children: ReactNode;
}

export const AuthProvider: React.FC<AuthProviderProps> = ({ children }) => {
  const [state, dispatch] = useReducer(authReducer, initialState);

  // Computed values
  const isAuthenticated = !!state.user;
  const isInitialized = true; // For now, we'll consider it always initialized

  // Initialize authentication state
  useEffect(() => {
    const initializeAuth = async () => {
      try {
        dispatch({ type: 'SET_LOADING', payload: true });
        
        const session = await mcpSupabaseClient.getSession();
        
        if (session.user && session.profile) {
          dispatch({ 
            type: 'SET_USER', 
            payload: { user: session.user, profile: session.profile } 
          });
        } else {
          dispatch({ 
            type: 'SET_USER', 
            payload: { user: null, profile: null } 
          });
        }
      } catch (error) {
        console.error('Auth initialization error:', error);
        dispatch({ 
          type: 'SET_ERROR', 
          payload: error instanceof Error ? error.message : 'Error de inicialización' 
        });
        dispatch({ 
          type: 'SET_USER', 
          payload: { user: null, profile: null } 
        });
      } finally {
        dispatch({ type: 'SET_INITIALIZED', payload: true });
        dispatch({ type: 'SET_LOADING', payload: false });
      }
    };

    initializeAuth();
  }, []);

  // Login function
  const login = async (credentials: LoginCredentials): Promise<void> => {
    try {
      dispatch({ type: 'SET_LOADING', payload: true });
      dispatch({ type: 'CLEAR_ERROR' });
      
      const response = await mcpSupabaseClient.signIn(credentials.email, credentials.password);
      
      if (response.user && response.profile) {
        dispatch({ 
          type: 'SET_USER', 
          payload: { user: response.user, profile: response.profile } 
        });
      } else {
        throw new Error('Invalid response from login');
      }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Error de inicio de sesión';
      dispatch({ type: 'SET_ERROR', payload: errorMessage });
      throw error;
    } finally {
      dispatch({ type: 'SET_LOADING', payload: false });
    }
  };

  // Register function - updated for full CFDI schema
  const register = async (registerData: RegisterData): Promise<void> => {
    try {
      dispatch({ type: 'SET_LOADING', payload: true });
      dispatch({ type: 'CLEAR_ERROR' });
      
      const response = await mcpSupabaseClient.signUp(registerData.email, registerData.password);
      
      // Create user profile with all CFDI fields
      const profileData = {
        user_id: response.user.id,
        rfc: registerData.rfc,
        razon_social: registerData.razon_social,
        calle: registerData.calle,
        numero_ext: registerData.numero_ext,
        numero_int: registerData.numero_int || null,
        colonia: registerData.colonia,
        delegacion_municipio: registerData.delegacion_municipio,
        codigo_postal: registerData.codigo_postal,
        estado: registerData.estado,
        regimen_fiscal: registerData.regimen_fiscal,
        uso_cfdi: registerData.uso_cfdi,
      };
      
      const profile = await mcpSupabaseClient.insert('user_profiles', profileData);
      
      dispatch({ 
        type: 'SET_USER', 
        payload: { user: response.user, profile } 
      });
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Error de registro';
      dispatch({ type: 'SET_ERROR', payload: errorMessage });
      throw error;
    } finally {
      dispatch({ type: 'SET_LOADING', payload: false });
    }
  };

  // Logout function
  const logout = async (): Promise<void> => {
    try {
      dispatch({ type: 'SET_LOADING', payload: true });
      
      await mcpSupabaseClient.signOut();
      
      dispatch({ 
        type: 'SET_USER', 
        payload: { user: null, profile: null } 
      });
    } catch (error) {
      console.error('Logout error:', error);
      const errorMessage = error instanceof Error ? error.message : 'Error al cerrar sesión';
      dispatch({ type: 'SET_ERROR', payload: errorMessage });
    } finally {
      dispatch({ type: 'SET_LOADING', payload: false });
    }
  };

  // Update profile function
  const updateProfile = async (updates: Partial<UserProfile>): Promise<void> => {
    if (!state.user?.id) {
      throw new Error('No hay usuario autenticado');
    }

    try {
      dispatch({ type: 'SET_LOADING', payload: true });
      dispatch({ type: 'CLEAR_ERROR' });
      
      const updatedProfile = await mcpSupabaseClient.update('user_profiles', state.profile!.id, updates);
      
      dispatch({ type: 'UPDATE_PROFILE', payload: updatedProfile });
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Error al actualizar perfil';
      dispatch({ type: 'SET_ERROR', payload: errorMessage });
      throw error;
    } finally {
      dispatch({ type: 'SET_LOADING', payload: false });
    }
  };

  // Refresh session function
  const refreshSession = async (): Promise<void> => {
    try {
      dispatch({ type: 'SET_LOADING', payload: true });
      
      const session = await mcpSupabaseClient.getSession();
      
      if (session.user && session.profile) {
        dispatch({ 
          type: 'SET_USER', 
          payload: { user: session.user, profile: session.profile } 
        });
      } else {
        dispatch({ 
          type: 'SET_USER', 
          payload: { user: null, profile: null } 
        });
      }
    } catch (error) {
      console.error('Session refresh error:', error);
      const errorMessage = error instanceof Error ? error.message : 'Error al refrescar sesión';
      dispatch({ type: 'SET_ERROR', payload: errorMessage });
    } finally {
      dispatch({ type: 'SET_LOADING', payload: false });
    }
  };

  // Clear error function
  const clearError = (): void => {
    dispatch({ type: 'CLEAR_ERROR' });
  };

  // Context value
  const value: AuthContextType = {
    user: state.user,
    profile: state.profile,
    loading: state.loading,
    error: state.error,
    isAuthenticated,
    isInitialized,
    login,
    register,
    logout,
    updateProfile,
    refreshSession,
    clearError,
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
};

// Export the context for use in useAuth hook
export { AuthContext }; 
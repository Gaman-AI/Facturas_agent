import { AuthError, AuthResponse, User } from '@supabase/supabase-js';
import { createSupabaseClient, TABLES } from '@/lib/supabase';
import { 
  LoginCredentials, 
  RegisterData, 
  UserProfile, 
  AuthError as CustomAuthError,
  AUTH_ERROR_MESSAGES 
} from '@/types/auth';

class AuthService {
  private supabase = createSupabaseClient();

  /**
   * Login user with email and password
   */
  async login(credentials: LoginCredentials): Promise<{ user: User; profile: UserProfile }> {
    try {
      const { data, error } = await this.supabase.auth.signInWithPassword({
        email: credentials.email,
        password: credentials.password,
      });

      if (error) {
        throw this.formatAuthError(error);
      }

      if (!data.user) {
        throw new Error('No user data returned');
      }

      // Fetch user profile
      const profile = await this.getUserProfile(data.user.id);

      return { user: data.user, profile };
    } catch (error) {
      console.error('Login error:', error);
      throw this.formatAuthError(error);
    }
  }

  /**
   * Register new user with CFDI profile data
   */
  async register(registerData: RegisterData): Promise<{ user: User; profile: UserProfile }> {
    try {
      // Step 1: Create user account
      const { data: authData, error: authError } = await this.supabase.auth.signUp({
        email: registerData.email,
        password: registerData.password,
      });

      if (authError) {
        throw this.formatAuthError(authError);
      }

      if (!authData.user) {
        throw new Error('No user data returned from registration');
      }

      // Step 2: Create user profile with CFDI data
      const profileData = {
        user_id: authData.user.id,
        email: registerData.email,
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

      const { data: profileResult, error: profileError } = await this.supabase
        .from(TABLES.USER_PROFILES)
        .insert(profileData)
        .select()
        .single();

      if (profileError) {
        // Clean up user account if profile creation fails
        await this.supabase.auth.admin.deleteUser(authData.user.id);
        throw this.formatAuthError(profileError);
      }

      return { user: authData.user, profile: profileResult };
    } catch (error) {
      console.error('Registration error:', error);
      throw this.formatAuthError(error);
    }
  }

  /**
   * Logout current user
   */
  async logout(): Promise<void> {
    try {
      const { error } = await this.supabase.auth.signOut();
      if (error) {
        throw this.formatAuthError(error);
      }
    } catch (error) {
      console.error('Logout error:', error);
      throw this.formatAuthError(error);
    }
  }

  /**
   * Get current user session
   */
  async getCurrentSession() {
    try {
      const { data: { session }, error } = await this.supabase.auth.getSession();
      
      if (error) {
        throw this.formatAuthError(error);
      }

      if (!session?.user) {
        return { user: null, profile: null };
      }

      const profile = await this.getUserProfile(session.user.id);
      
      return { user: session.user, profile };
    } catch (error) {
      console.error('Session fetch error:', error);
      throw this.formatAuthError(error);
    }
  }

  /**
   * Refresh current session
   */
  async refreshSession(): Promise<{ user: User; profile: UserProfile } | null> {
    try {
      const { data, error } = await this.supabase.auth.refreshSession();
      
      if (error) {
        throw this.formatAuthError(error);
      }

      if (!data.session?.user) {
        return null;
      }

      const profile = await this.getUserProfile(data.session.user.id);
      
      return { user: data.session.user, profile };
    } catch (error) {
      console.error('Session refresh error:', error);
      throw this.formatAuthError(error);
    }
  }

  /**
   * Get user profile by user ID
   */
  async getUserProfile(userId: string): Promise<UserProfile> {
    try {
      const { data, error } = await this.supabase
        .from(TABLES.USER_PROFILES)
        .select('*')
        .eq('user_id', userId)
        .single();

      if (error) {
        throw this.formatAuthError(error);
      }

      if (!data) {
        throw new Error('User profile not found');
      }

      return data;
    } catch (error) {
      console.error('Profile fetch error:', error);
      throw this.formatAuthError(error);
    }
  }

  /**
   * Update user profile
   */
  async updateProfile(userId: string, updates: Partial<UserProfile>): Promise<UserProfile> {
    try {
      const { data, error } = await this.supabase
        .from(TABLES.USER_PROFILES)
        .update({
          ...updates,
          updated_at: new Date().toISOString(),
        })
        .eq('user_id', userId)
        .select()
        .single();

      if (error) {
        throw this.formatAuthError(error);
      }

      return data;
    } catch (error) {
      console.error('Profile update error:', error);
      throw this.formatAuthError(error);
    }
  }

  /**
   * Check if RFC is already registered
   */
  async isRFCRegistered(rfc: string): Promise<boolean> {
    try {
      const { data, error } = await this.supabase
        .from(TABLES.USER_PROFILES)
        .select('id')
        .eq('rfc', rfc.toUpperCase())
        .single();

      if (error && error.code !== 'PGRST116') { // PGRST116 = no rows returned
        throw this.formatAuthError(error);
      }

      return !!data;
    } catch (error) {
      console.error('RFC check error:', error);
      return false;
    }
  }

  /**
   * Check if email is already registered
   */
  async isEmailRegistered(email: string): Promise<boolean> {
    try {
      const { data, error } = await this.supabase
        .from(TABLES.USER_PROFILES)
        .select('id')
        .eq('email', email.toLowerCase())
        .single();

      if (error && error.code !== 'PGRST116') { // PGRST116 = no rows returned
        throw this.formatAuthError(error);
      }

      return !!data;
    } catch (error) {
      console.error('Email check error:', error);
      return false;
    }
  }

  /**
   * Subscribe to authentication state changes
   */
  onAuthStateChange(callback: (user: User | null) => void) {
    return this.supabase.auth.onAuthStateChange((event, session) => {
      callback(session?.user || null);
    });
  }

  /**
   * Format and localize authentication errors
   */
  private formatAuthError(error: any): CustomAuthError {
    let message = 'Ha ocurrido un error inesperado';
    let code = 'unknown_error';

    if (error instanceof Error) {
      message = AUTH_ERROR_MESSAGES[error.message] || error.message;
      code = error.message;
    } else if (error?.message) {
      message = AUTH_ERROR_MESSAGES[error.message] || error.message;
      code = error.code || error.message;
    }

    return {
      message,
      code,
      details: error,
    };
  }
}

// Export singleton instance
export const authService = new AuthService(); 
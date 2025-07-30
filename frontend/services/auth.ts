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
   * Register new user with your required CFDI profile data
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

      // Step 2: Create user profile using the safe database function
      // This handles validation, RFC uniqueness, and atomic operations
      const { data: profileResult, error: profileError } = await this.supabase
        .rpc('create_user_profile', {
          p_user_id: authData.user.id,
          p_rfc: registerData.rfc.toUpperCase(),
          p_country: registerData.country || 'México',
          p_company_name: registerData.company_name,
          p_street: registerData.street,
          p_exterior_number: registerData.exterior_number,
          p_interior_number: registerData.interior_number || null,
          p_colony: registerData.colony,
          p_municipality: registerData.municipality,
          p_zip_code: registerData.zip_code,
          p_state: registerData.state,
          p_tax_regime: registerData.tax_regime,
          p_cfdi_use: registerData.cfdi_use,
        });

      if (profileError) {
        console.error('Profile creation error:', profileError);
        throw this.formatAuthError(profileError);
      }

      if (!profileResult || profileResult.length === 0) {
        throw new Error('No profile data returned from creation');
      }

      // Return the first result from the function
      const profile = Array.isArray(profileResult) ? profileResult[0] : profileResult;
      
      return { user: authData.user, profile };
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
   * Check if email is already registered in auth.users
   */
  async isEmailRegistered(email: string): Promise<boolean> {
    try {
      // Check if email exists in auth system by attempting a password reset
      // This is a safe way to check email existence without exposing user data
      const { error } = await this.supabase.auth.resetPasswordForEmail(
        email.toLowerCase(),
        { redirectTo: 'http://localhost:3000/auth/callback' }
      );

      // If no error, email exists; if error code is 'user_not_found', email doesn't exist
      if (error && error.message.includes('user_not_found')) {
        return false;
      }

      return true;
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
      // Handle specific database function errors
      if (error.message.includes('RFC') && error.message.includes('already registered')) {
        message = 'Este RFC ya está registrado por otro usuario';
        code = 'rfc_already_exists';
      } else if (error.message.includes('User profile already exists')) {
        message = 'El usuario ya tiene un perfil creado';
        code = 'profile_already_exists';
      } else if (error.message.includes('Invalid RFC format')) {
        message = 'Formato de RFC inválido';
        code = 'invalid_rfc_format';
      } else {
        message = AUTH_ERROR_MESSAGES[error.message] || error.message;
        code = error.message;
      }
    } else if (error?.message) {
      // Handle Supabase specific errors
      if (error.message.includes('duplicate key value violates unique constraint')) {
        if (error.message.includes('rfc')) {
          message = 'Este RFC ya está registrado';
          code = 'rfc_already_exists';
        } else if (error.message.includes('email')) {
          message = 'Este email ya está registrado';
          code = 'email_already_exists';
        } else {
          message = 'Ya existe un registro con estos datos';
          code = 'duplicate_record';
        }
      } else if (error.code === '23505') { // PostgreSQL unique violation
        message = 'Ya existe un registro con estos datos';
        code = 'duplicate_record';
      } else {
        message = AUTH_ERROR_MESSAGES[error.message] || error.message;
        code = error.code || error.message;
      }
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
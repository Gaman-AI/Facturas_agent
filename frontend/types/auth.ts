// Authentication types for MCP Supabase integration

// Login credentials interface
export interface LoginCredentials {
  email: string;
  password: string;
}

// Registration data interface - updated to match new database schema
export interface RegisterData {
  email: string;
  password: string;
  rfc: string; // RFC
  country: string; // Country
  company_name: string; // Company_Name
  street: string; // Street
  exterior_number: string; // Exterior_Number
  interior_number?: string; // Interior_Number
  colony: string; // Colony
  municipality: string; // Municipality
  zip_code: string; // Zip_Code
  state: string; // State
  tax_regime: string; // Tax_Regime
  cfdi_use: string; // CFDI_Use
  phone_number: string; // phone_number
}

// User profile interface - matches new database schema (lowercase column names)
export interface UserProfile {
  id: string;
  user_id: string;
  rfc: string;
  country: string;
  company_name: string;
  street: string;
  exterior_number: string;
  interior_number?: string;
  colony: string;
  municipality: string;
  zip_code: string;
  state: string;
  tax_regime: string;
  cfdi_use: string;
  email: string;
  phone_number: string;
  created_at: string;
  updated_at: string;
}

// User interface from Supabase auth
export interface User {
  id: string;
  email: string;
  full_name: string | null;
  avatar_url: string | null;
  created_at: string | null;
  updated_at: string | null;
}

// Authentication error interface
export interface AuthError {
  message: string;
  code: string;
  details?: any;
}

// Authentication state interface
export interface AuthState {
  user: User | null;
  profile: UserProfile | null;
  loading: boolean;
  error: string | null;
}

// Error messages for localization
export const AUTH_ERROR_MESSAGES: Record<string, string> = {
  'Invalid login credentials': 'Credenciales de acceso inválidas',
  'Email not confirmed': 'Email no confirmado',
  'User already exists': 'El usuario ya existe',
  'Weak password': 'Contraseña muy débil',
  'Invalid email': 'Email inválido',
  'Email already in use': 'Email ya está en uso',
  'RFC already registered': 'RFC ya está registrado',
  'User not found': 'Usuario no encontrado',
  'Invalid session': 'Sesión inválida',
  'Session expired': 'Sesión expirada',
  'Network error': 'Error de conexión',
  'Database error': 'Error de base de datos',
  'Validation error': 'Error de validación',
  'Unknown error': 'Error desconocido',
};

// Session interface
export interface AuthSession {
  access_token: string;
  refresh_token: string;
  expires_in: number;
  expires_at: number;
  token_type: string;
  user: User;
}

// Auth response interface
export interface AuthResponse {
  user: User | null;
  profile: UserProfile | null;
  session: AuthSession | null;
  error: AuthError | null;
} 
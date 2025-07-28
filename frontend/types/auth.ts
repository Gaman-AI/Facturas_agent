// Authentication types for MCP Supabase integration

// Login credentials interface
export interface LoginCredentials {
  email: string;
  password: string;
}

// Registration data interface - updated to match full CFDI schema
export interface RegisterData {
  email: string;
  password: string;
  rfc: string;
  razon_social: string;
  calle: string;
  numero_ext: string;
  numero_int?: string;
  colonia: string;
  delegacion_municipio: string;
  codigo_postal: string;
  estado: string;
  regimen_fiscal: string;
  uso_cfdi: string;
}

// User profile interface - matches full CFDI database schema
export interface UserProfile {
  id: string;
  user_id: string | null;
  rfc: string;
  razon_social: string;
  calle: string;
  numero_ext: string;
  numero_int: string | null;
  colonia: string;
  delegacion_municipio: string;
  codigo_postal: string;
  estado: string;
  regimen_fiscal: string;
  uso_cfdi: string;
  created_at: string | null;
  updated_at: string | null;
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
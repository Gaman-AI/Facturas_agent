import { useContext } from 'react';
import { AuthContext, AuthContextType } from '@/contexts/AuthContext';

/**
 * Custom hook to access authentication context
 */
export const useAuth = (): AuthContextType => {
  const context = useContext(AuthContext);
  
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  
  return context;
};

/**
 * Hook for checking specific authentication states
 */
export const useAuthState = () => {
  const auth = useAuth();
  
  return {
    isLoggedIn: auth.isAuthenticated,
    isLoading: auth.loading,
    hasProfile: !!auth.profile,
    isInitialized: auth.isInitialized,
    user: auth.user,
    profile: auth.profile,
    error: auth.error,
  };
};

/**
 * Hook for authentication actions
 */
export const useAuthActions = () => {
  const auth = useAuth();
  
  return {
    login: auth.login,
    register: auth.register,
    logout: auth.logout,
    updateProfile: auth.updateProfile,
    refreshSession: auth.refreshSession,
    clearError: auth.clearError,
  };
};

/**
 * Hook for user profile utilities - updated for full CFDI schema
 */
export const useUserProfile = () => {
  const { profile } = useAuth();
  
  const getDisplayName = () => {
    if (!profile) return '';
    return profile.razon_social || profile.rfc || '';
  };
  
  const getRFCMasked = () => {
    if (!profile?.rfc) return '';
    const rfc = profile.rfc;
    // Show first 3 and last 3 characters, mask the middle
    if (rfc.length <= 6) return rfc;
    return `${rfc.slice(0, 3)}${'*'.repeat(rfc.length - 6)}${rfc.slice(-3)}`;
  };
  
  const getFullAddress = () => {
    if (!profile) return '';
    
    const addressParts = [
      profile.calle,
      profile.numero_ext,
      profile.numero_int ? `Int. ${profile.numero_int}` : '',
      profile.colonia,
      profile.delegacion_municipio,
      profile.estado,
      profile.codigo_postal
    ].filter(Boolean);
    
    return addressParts.join(', ');
  };
  
  const isPersonaFisica = () => {
    if (!profile?.rfc) return false;
    return profile.rfc.length === 13; // Persona Física has 13 characters
  };
  
  const isPersonaMoral = () => {
    if (!profile?.rfc) return false;
    return profile.rfc.length === 12; // Persona Moral has 12 characters
  };
  
  const getCFDIInfo = () => {
    if (!profile) return null;
    
    return {
      rfc: profile.rfc,
      razonSocial: profile.razon_social,
      regimenFiscal: profile.regimen_fiscal,
      usoCFDI: profile.uso_cfdi,
      codigoPostal: profile.codigo_postal,
    };
  };
  
  return {
    profile,
    getDisplayName,
    getRFCMasked,
    getFullAddress,
    getCFDIInfo,
    isPersonaFisica,
    isPersonaMoral,
  };
}; 
'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/hooks/useAuth';
import { LoadingSpinner } from '@/components/ui/loading-spinner';

interface ProtectedRouteProps {
  children: React.ReactNode;
  redirectTo?: string;
  requiredProfile?: boolean;
}

export const ProtectedRoute: React.FC<ProtectedRouteProps> = ({ 
  children, 
  redirectTo = '/login',
  requiredProfile = true 
}) => {
  const { isAuthenticated, loading, isInitialized, profile } = useAuth();
  const router = useRouter();

  useEffect(() => {
    // Wait for auth to initialize
    if (!isInitialized) return;

    // Redirect if not authenticated
    if (!isAuthenticated) {
      router.push(redirectTo);
      return;
    }

    // Redirect if profile is required but missing
    if (requiredProfile && !profile) {
      router.push('/setup-profile');
      return;
    }
  }, [isAuthenticated, loading, isInitialized, profile, router, redirectTo, requiredProfile]);

  // Show loading while initializing or redirecting
  if (!isInitialized || loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-50 to-slate-100">
        <div className="text-center">
          <LoadingSpinner size="lg" />
          <p className="mt-4 text-slate-600">Verificando autenticación...</p>
        </div>
      </div>
    );
  }

  // Show loading if not authenticated (while redirecting)
  if (!isAuthenticated) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-50 to-slate-100">
        <div className="text-center">
          <LoadingSpinner size="lg" />
          <p className="mt-4 text-slate-600">Redirigiendo...</p>
        </div>
      </div>
    );
  }

  // Show loading if profile is required but missing (while redirecting)
  if (requiredProfile && !profile) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-50 to-slate-100">
        <div className="text-center">
          <LoadingSpinner size="lg" />
          <p className="mt-4 text-slate-600">Configurando perfil...</p>
        </div>
      </div>
    );
  }

  return <>{children}</>;
};

// HOC version for class components or additional functionality
export const withProtectedRoute = <P extends object>(
  Component: React.ComponentType<P>,
  options?: {
    redirectTo?: string;
    requiredProfile?: boolean;
  }
) => {
  return function ProtectedComponent(props: P) {
    return (
      <ProtectedRoute 
        redirectTo={options?.redirectTo}
        requiredProfile={options?.requiredProfile}
      >
        <Component {...props} />
      </ProtectedRoute>
    );
  };
}; 
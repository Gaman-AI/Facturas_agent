'use client'
import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { useAuth } from '@/hooks/useAuth'
import { LoadingSpinner } from '@/components/ui/loading-spinner'
import { useLanguage } from '@/contexts/LanguageContext'

export const ProtectedRoute = ({ children, redirectTo = '/login', requiredProfile = false }: { children: React.ReactNode, redirectTo?: string, requiredProfile?: boolean }) => {
  const { isAuthenticated, loading, isInitialized, profile } = useAuth()
  const { t } = useLanguage()
  const router = useRouter()
  const [hydrated, setHydrated] = useState(false)

  // Wait for hydration to complete
  useEffect(() => {
    setHydrated(true)
  }, [])

  useEffect(() => {
    if (!hydrated || !isInitialized) return

    if (!isAuthenticated) {
      router.push(redirectTo)
      return
    }

    if (requiredProfile && !profile) {
      router.push('/setup-profile')
      return
    }
  }, [hydrated, isAuthenticated, isInitialized, profile, redirectTo, requiredProfile, router])

  if (!hydrated || !isInitialized || loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-50 to-slate-100">
        <div className="text-center">
          <LoadingSpinner size="lg" />
          {/* Avoid SSR mismatch by only rendering translated string on client */}
          {hydrated ? (
            <p className="mt-4 text-slate-600">{t('app.loading')}</p>
          ) : (
            <p className="mt-4 text-slate-600">Loading...</p>
          )}
        </div>
      </div>
    )
  }

  return <>{children}</>
}


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

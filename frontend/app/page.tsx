'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { LogIn, UserPlus, FileText, Zap, Shield, Globe } from 'lucide-react';

import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { LoadingSpinner } from '@/components/ui/loading-spinner';
import { useAuth } from '@/hooks/useAuth';
import { useLanguage } from '@/contexts/LanguageContext';

export default function HomePage() {
  const { isAuthenticated, loading, isInitialized } = useAuth();
  const { t } = useLanguage();
  const router = useRouter();

  useEffect(() => {
    if (isInitialized && isAuthenticated) {
      router.push('/dashboard');
    }
  }, [isAuthenticated, isInitialized, router]);

  // OPTIMIZED: Only block for auth initialization, not language loading
  // Language can load progressively while showing the page
  if (!isInitialized || loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-theme-50 to-theme-100">
        <div className="text-center">
          <LoadingSpinner size="lg" />
          <p className="mt-4 text-theme-600">
            {t('home.loadingApp')}
          </p>
        </div>
      </div>
    );
  }

  if (isAuthenticated) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-theme-50 to-theme-100">
        <div className="text-center">
          <LoadingSpinner size="lg" />
          <p className="mt-4 text-theme-600">
            {t('home.redirectingToDashboard')}
          </p>
        </div>
      </div>
    );
  }

  // OPTIMIZED: Show content even if language is still loading with fallback text
  const getText = (key: string, fallback: string) => {
    return t(key) || fallback;
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-theme-50 via-theme-100 to-theme-200">

      
      {/* Hero Section */}
      <section className="relative overflow-hidden">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-20">
          <div className="text-center">
            <div className="mx-auto w-20 h-20 bg-gradient-to-r from-theme-500 to-theme-600 rounded-full flex items-center justify-center mb-8 shadow-lg">
              <FileText className="w-10 h-10 text-white" />
            </div>
            
            <h1 className="text-4xl md:text-6xl font-bold text-theme-800 mb-6">
              {getText('home.title', 'CFDI 4.0 Automation System')}
            </h1>
            
            {/* Removed subtitle for cleaner hero per brand guidance */}

            <div className="flex flex-col sm:flex-row gap-4 justify-center mb-12">
              <Button asChild size="lg" className="px-8 bg-theme-500 hover:bg-theme-600 text-white">
                <Link href="/register">
                  <UserPlus className="w-5 h-5 mr-2" />
                  Register
                </Link>
              </Button>
              
              <Button asChild variant="outline" size="lg" className="px-8 border-theme-300 text-theme-700 hover:bg-theme-50">
                <Link href="/login">
                  <LogIn className="w-5 h-5 mr-2" />
                  Login
                </Link>
              </Button>
            </div>
            
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section className="py-20 bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          {/* Removed section heading and subtitle; cards below provide concise messaging */}

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            <Card className="text-center border-theme-200">
              <CardHeader>
                <div className="mx-auto w-12 h-12 bg-theme-100 rounded-lg flex items-center justify-center mb-4">
                  <Shield className="w-6 h-6 text-theme-600" />
                </div>
                <CardTitle className="text-xl text-theme-800">Secure and Reliable</CardTitle>
              </CardHeader>
              <CardContent>
                <CardDescription className="text-theme-600">
                  Enterprise-grade security, always on.
                </CardDescription>
              </CardContent>
            </Card>

            <Card className="text-center border-theme-200">
              <CardHeader>
                <div className="mx-auto w-12 h-12 bg-theme-100 rounded-lg flex items-center justify-center mb-4">
                  <Zap className="w-6 h-6 text-theme-600" />
                </div>
                <CardTitle className="text-xl text-theme-800">Intelligent Automation</CardTitle>
              </CardHeader>
              <CardContent>
                <CardDescription className="text-theme-600">
                  AI agents streamline tasks fast.
                </CardDescription>
              </CardContent>
            </Card>

            <Card className="text-center border-theme-200">
              <CardHeader>
                <div className="mx-auto w-12 h-12 bg-theme-100 rounded-lg flex items-center justify-center mb-4">
                  <Globe className="w-6 h-6 text-theme-600" />
                </div>
                <CardTitle className="text-xl text-theme-800">Full Compatibility</CardTitle>
              </CardHeader>
              <CardContent>
                <CardDescription className="text-theme-600">
                  Works across popular platforms.
                </CardDescription>
              </CardContent>
            </Card>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="bg-theme-50 border-t border-theme-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <div className="text-center text-sm text-theme-600">
            <p>
              Developed by{' '}
              <a href="https://gaman.ai" target="_blank" rel="noopener noreferrer" className="font-medium text-theme-600 hover:text-theme-700 hover:underline">Gaman.ai</a> © 2025. All rights reserved.
            </p>
          </div>
        </div>
      </footer>
    </div>
  );
}

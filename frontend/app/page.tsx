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
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-teal-50 via-teal-100 to-teal-200">
        <div className="text-center">
          <LoadingSpinner size="lg" />
          <p className="mt-4 text-teal-600">
            {t('home.loadingApp')}
          </p>
        </div>
      </div>
    );
  }

  if (isAuthenticated) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-teal-50 via-teal-100 to-teal-200">
        <div className="text-center">
          <LoadingSpinner size="lg" />
          <p className="mt-4 text-teal-600">
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
    <div className="min-h-screen bg-gradient-to-br from-teal-50 via-teal-100 to-teal-200">

      
      {/* Hero Section */}
      <section className="relative overflow-hidden">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-20">
          <div className="text-center">
            <div className="mx-auto w-20 h-20 bg-teal-500 rounded-full flex items-center justify-center mb-8 shadow-lg">
              <FileText className="w-10 h-10 text-white" />
            </div>
            
            <h1 className="text-4xl md:text-6xl font-bold text-teal-800 mb-6">
              {getText('home.title', 'CFDI 4.0 Automation System')}
            </h1>
            
            <p className="text-xl text-teal-700 mb-8 max-w-3xl mx-auto">
              {getText('home.subtitle', 'Automate CFDI form filling with artificial intelligence')}
            </p>

            <div className="flex flex-col sm:flex-row gap-4 justify-center mb-12">
              <Button asChild size="lg" className="px-8 bg-teal-500 hover:bg-teal-600 text-white">
                <Link href="/register">
                  <UserPlus className="w-5 h-5 mr-2" />
                  Register
                </Link>
              </Button>
              
              <Button asChild variant="outline" size="lg" className="px-8 border-teal-500 text-teal-700 hover:bg-teal-50">
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
          <div className="text-center mb-16">
            <h2 className="text-3xl font-bold text-teal-800 mb-4">
              {getText('home.featuresTitle', 'Why Choose Our Platform?')}
            </h2>
            <p className="text-lg text-teal-700 max-w-2xl mx-auto">
              {getText('home.subtitle', 'Automate CFDI form filling with artificial intelligence')}
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            <Card className="text-center">
              <CardHeader>
                <div className="mx-auto w-12 h-12 bg-primary/10 rounded-lg flex items-center justify-center mb-4">
                  <Shield className="w-6 h-6 text-primary" />
                </div>
                <CardTitle className="text-xl">Secure and Reliable</CardTitle>
              </CardHeader>
              <CardContent>
                <CardDescription>
                  Enterprise-grade security and reliability
                </CardDescription>
              </CardContent>
            </Card>

            <Card className="text-center">
              <CardHeader>
                <div className="mx-auto w-12 h-12 bg-primary/10 rounded-lg flex items-center justify-center mb-4">
                  <Zap className="w-6 h-6 text-primary" />
                </div>
                <CardTitle className="text-xl">Intelligent Automation</CardTitle>
              </CardHeader>
              <CardContent>
                <CardDescription>
                  AI-powered automation for efficiency
                </CardDescription>
              </CardContent>
            </Card>

            <Card className="text-center">
              <CardHeader>
                <div className="mx-auto w-12 h-12 bg-primary/10 rounded-lg flex items-center justify-center mb-4">
                  <Globe className="w-6 h-6 text-primary" />
                </div>
                <CardTitle className="text-xl">Full Compatibility</CardTitle>
              </CardHeader>
              <CardContent>
                <CardDescription>
                  Works with all major platforms
                </CardDescription>
              </CardContent>
            </Card>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="bg-teal-50 border-t border-teal-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <div className="text-center text-sm text-teal-600">
                         <p>
               {getText('footer.developedBy', 'Developed by')}{' '}
               <a
                 href="https://gaman.ai"
                 target="_blank"
                 rel="noopener noreferrer"
                 className="font-medium text-primary hover:underline"
               >
                 Gaman.ai
               </a>{' '}
               © 2025. All rights reserved.
             </p>
          </div>
        </div>
      </footer>
    </div>
  );
}

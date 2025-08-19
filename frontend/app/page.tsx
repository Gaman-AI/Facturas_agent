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
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-50 to-slate-100">
        <div className="text-center">
          <LoadingSpinner size="lg" />
          <p className="mt-4 text-slate-600">
            {t('home.loadingApp')}
          </p>
        </div>
      </div>
    );
  }

  if (isAuthenticated) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-50 to-slate-100">
        <div className="text-center">
          <LoadingSpinner size="lg" />
          <p className="mt-4 text-slate-600">
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
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100">
      
      {/* Hero Section - Simplified for testing */}
      <section className="py-20 px-6 text-center">
        <div className="max-w-4xl mx-auto p-12 bg-white rounded-lg shadow-lg border border-blue-200">
          <div className="text-center">
            <div className="mx-auto w-20 h-20 bg-blue-500 rounded-full flex items-center justify-center mb-8">
              <FileText className="w-10 h-10 text-white" />
            </div>
            
            <h1 className="text-4xl md:text-6xl font-bold text-gray-900 mb-6">
              {getText('home.title', 'CFDI 4.0 Automation System')}
            </h1>
            
            <p className="text-xl text-gray-700 mb-8 max-w-3xl mx-auto">
              {getText('home.subtitle', 'Automate CFDI form filling with artificial intelligence')}
            </p>

            <div className="flex flex-col sm:flex-row gap-4 justify-center mb-12">
              <Button
                className="px-8 py-3 text-lg font-semibold bg-blue-600 hover:bg-blue-700"
                onClick={() => router.push('/register')}
              >
                <UserPlus className="w-5 h-5 mr-2" />
                {getText('home.getStarted', 'Get Started')}
              </Button>
              
              <Button
                variant="outline"
                className="px-8 py-3 text-lg font-semibold border-blue-600 text-blue-600 hover:bg-blue-50"
                onClick={() => router.push('/login')}
              >
                <LogIn className="w-5 h-5 mr-2" />
                {getText('home.login', 'Login')}
              </Button>
              
              <Button
                className="px-8 py-3 text-lg font-semibold bg-green-600 hover:bg-green-700"
                onClick={() => router.push('/task/monitor/demo_task_123')}
              >
                <Zap className="w-5 h-5 mr-2" />
                {getText('home.tryDemo', 'Try Demo')}
              </Button>
            </div>

            <div className="flex items-center justify-center space-x-6 text-sm text-gray-600">
              <div className="flex items-center">
                <Shield className="w-4 h-4 mr-1" />
                {getText('features.secure', 'Secure')}
              </div>
              <div className="flex items-center">
                <Zap className="w-4 w-4 mr-1" />
                {getText('features.intelligent', 'Intelligent')}
              </div>
              <div className="flex items-center">
                <Globe className="w-4 h-4 mr-1" />
                {getText('features.compatible', 'Compatible')}
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section className="py-20 bg-gradient-to-br from-slate-50 to-slate-100">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <h2 className="text-3xl font-bold text-slate-900 mb-4">
              {getText('features.intelligent', 'Intelligent Features')}
            </h2>
            <p className="text-lg text-slate-600 max-w-2xl mx-auto">
              {getText('home.subtitle', 'Automate CFDI form filling with artificial intelligence')}
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            <Card className="text-center">
              <CardHeader>
                <div className="mx-auto w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center mb-4">
                  <Shield className="w-6 h-6 text-blue-600" />
                </div>
                <CardTitle className="text-xl">{getText('features.secure', 'Secure')}</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-slate-600">
                  {getText('features.secure', 'Enterprise data protection')}
                </p>
              </CardContent>
            </Card>

            <Card className="text-center">
              <CardHeader>
                <div className="mx-auto w-12 h-12 bg-green-100 rounded-lg flex items-center justify-center mb-4">
                  <Zap className="w-6 h-6 text-green-600" />
                </div>
                <CardTitle className="text-xl">{getText('features.intelligent', 'Intelligent')}</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-slate-600">
                  {getText('features.intelligent', 'Advanced AI automation')}
                </p>
              </CardContent>
            </Card>

            <Card className="text-center">
              <CardHeader>
                <div className="mx-auto w-12 h-12 bg-purple-100 rounded-lg flex items-center justify-center mb-4">
                  <Globe className="w-6 h-6 text-purple-600" />
                </div>
                <CardTitle className="text-xl">{getText('features.compatible', 'Compatible')}</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-slate-600">
                  {getText('features.compatible', 'Compatible with multiple platforms')}
                </p>
              </CardContent>
            </Card>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="py-8">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <Card className="text-center">
            <CardContent className="pt-6">
              <div className="text-sm text-slate-600">
                <p>
                  {getText('footer.developedBy', 'Developed by')}{' '}
                  <a
                    href="https://gaman.ai"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="font-medium text-blue-600 hover:underline"
                  >
                    Gaman.ai
                  </a>{' '}
                  {getText('footer.copyright', `© ${new Date().getFullYear()} All rights reserved.`)}
                </p>
              </div>
            </CardContent>
          </Card>
        </div>
      </footer>
    </div>
  );
}

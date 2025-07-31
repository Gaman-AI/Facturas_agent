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
  const { t, isLoading: languageLoading } = useLanguage();
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
            {languageLoading ? 'Cargando aplicación...' : t('home.loadingApp')}
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
            {languageLoading ? 'Redirigiendo al dashboard...' : t('home.redirectingToDashboard')}
          </p>
        </div>
      </div>
    );
  }

  // OPTIMIZED: Show content even if language is still loading with fallback text
  const getText = (key: string, fallback: string) => {
    return languageLoading ? fallback : t(key);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100">
      {/* Hero Section */}
      <section className="relative overflow-hidden">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-20">
          <div className="text-center">
            <div className="mx-auto w-20 h-20 bg-primary rounded-full flex items-center justify-center mb-8">
              <FileText className="w-10 h-10 text-white" />
            </div>
            
            <h1 className="text-4xl md:text-6xl font-bold text-slate-900 mb-6">
              {getText('home.title', 'Sistema de Automatización CFDI 4.0')}
            </h1>
            
            <p className="text-xl text-slate-600 mb-8 max-w-3xl mx-auto">
              {getText('home.subtitle', 'Automatiza el llenado de formularios CFDI con inteligencia artificial')}
            </p>

            <div className="flex flex-col sm:flex-row gap-4 justify-center mb-12">
              <Button asChild size="lg" className="px-8">
                <Link href="/register">
                  <UserPlus className="w-5 h-5 mr-2" />
                  {getText('home.getStarted', 'Comenzar')}
                </Link>
              </Button>
              
              <Button asChild variant="outline" size="lg" className="px-8">
                <Link href="/login">
                  <LogIn className="w-5 h-5 mr-2" />
                  {getText('home.login', 'Iniciar Sesión')}
                </Link>
              </Button>
              
              <Button 
                variant="secondary" 
                size="lg" 
                className="px-8"
                onClick={() => router.push('/task/monitor/demo_task_123')}
              >
                <Zap className="w-5 h-5 mr-2" />
                {getText('home.tryDemo', 'Probar Demo')}
              </Button>
            </div>

            <div className="flex items-center justify-center space-x-6 text-sm text-slate-500">
              <div className="flex items-center">
                <Shield className="w-4 h-4 mr-1" />
                {getText('features.secure', 'Seguro')}
              </div>
              <div className="flex items-center">
                <Zap className="w-4 w-4 mr-1" />
                {getText('features.intelligent', 'Inteligente')}
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
      <section className="py-20 bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <h2 className="text-3xl font-bold text-slate-900 mb-4">
              {getText('features.intelligent', 'Características Inteligentes')}
            </h2>
            <p className="text-lg text-slate-600 max-w-2xl mx-auto">
              {getText('home.subtitle', 'Automatiza el llenado de formularios CFDI con inteligencia artificial')}
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            <Card className="text-center">
              <CardHeader>
                <div className="mx-auto w-12 h-12 bg-primary/10 rounded-lg flex items-center justify-center mb-4">
                  <Shield className="w-6 h-6 text-primary" />
                </div>
                <CardTitle className="text-xl">{getText('features.secure', 'Seguro')}</CardTitle>
              </CardHeader>
              <CardContent>
                <CardDescription>
                  {getText('features.secure', 'Protección de datos empresariales')}
                </CardDescription>
              </CardContent>
            </Card>

            <Card className="text-center">
              <CardHeader>
                <div className="mx-auto w-12 h-12 bg-primary/10 rounded-lg flex items-center justify-center mb-4">
                  <Zap className="w-6 h-6 text-primary" />
                </div>
                <CardTitle className="text-xl">{getText('features.intelligent', 'Inteligente')}</CardTitle>
              </CardHeader>
              <CardContent>
                <CardDescription>
                  {getText('features.intelligent', 'Automatización con IA avanzada')}
                </CardDescription>
              </CardContent>
            </Card>

            <Card className="text-center">
              <CardHeader>
                <div className="mx-auto w-12 h-12 bg-primary/10 rounded-lg flex items-center justify-center mb-4">
                  <Globe className="w-6 h-6 text-primary" />
                </div>
                <CardTitle className="text-xl">{getText('features.compatible', 'Compatible')}</CardTitle>
              </CardHeader>
              <CardContent>
                <CardDescription>
                  {getText('features.compatible', 'Compatible con múltiples plataformas')}
                </CardDescription>
              </CardContent>
            </Card>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="bg-slate-50 border-t">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <div className="text-center text-sm text-slate-600">
            <p>
              {getText('footer.developedBy', 'Desarrollado por')}{' '}
              <a
                href="https://gaman.ai"
                target="_blank"
                rel="noopener noreferrer"
                className="font-medium text-primary hover:underline"
              >
                Gaman.ai
              </a>{' '}
              {getText('footer.copyright', `© ${new Date().getFullYear()} Todos los derechos reservados.`)}
            </p>
          </div>
        </div>
      </footer>
    </div>
  );
}

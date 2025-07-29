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

export default function HomePage() {
  const { isAuthenticated, loading, isInitialized } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (isInitialized && isAuthenticated) {
      router.push('/dashboard');
    }
  }, [isAuthenticated, isInitialized, router]);

  if (!isInitialized || loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-50 to-slate-100">
        <div className="text-center">
          <LoadingSpinner size="lg" />
          <p className="mt-4 text-slate-600">Cargando aplicación...</p>
        </div>
      </div>
    );
  }

  if (isAuthenticated) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-50 to-slate-100">
        <div className="text-center">
          <LoadingSpinner size="lg" />
          <p className="mt-4 text-slate-600">Redirigiendo al dashboard...</p>
        </div>
      </div>
    );
  }

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
              Sistema de Automatización
              <span className="text-primary"> CFDI 4.0</span>
            </h1>
            
            <p className="text-xl text-slate-600 mb-8 max-w-3xl mx-auto">
              Automatiza el llenado de formularios CFDI 4.0 en portales de proveedores 
              con nuestro agente de navegador potenciado por IA
            </p>

            <div className="flex flex-col sm:flex-row gap-4 justify-center mb-12">
              <Button asChild size="lg" className="px-8">
                <Link href="/register">
                  <UserPlus className="w-5 h-5 mr-2" />
                  Comenzar Gratis
                </Link>
              </Button>
              
              <Button asChild variant="outline" size="lg" className="px-8">
                <Link href="/login">
                  <LogIn className="w-5 h-5 mr-2" />
                  Iniciar Sesión
                </Link>
              </Button>
            </div>

            <div className="flex items-center justify-center space-x-6 text-sm text-slate-500">
              <div className="flex items-center">
                <Shield className="w-4 h-4 mr-1" />
                Seguro y Confiable
              </div>
              <div className="flex items-center">
                <Zap className="w-4 h-4 mr-1" />
                Automatización Inteligente
              </div>
              <div className="flex items-center">
                <Globe className="w-4 h-4 mr-1" />
                Compatibilidad Total
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
              ¿Por qué elegir nuestro sistema?
            </h2>
            <p className="text-lg text-slate-600 max-w-2xl mx-auto">
              Simplifica tu proceso de facturación con tecnología de vanguardia
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            <Card className="text-center">
              <CardHeader>
                <div className="mx-auto w-12 h-12 bg-primary/10 rounded-lg flex items-center justify-center mb-4">
                  <Zap className="w-6 h-6 text-primary" />
                </div>
                <CardTitle>Automatización Completa</CardTitle>
                <CardDescription>
                  Rellena formularios CFDI automáticamente en cualquier portal de proveedor
                </CardDescription>
              </CardHeader>
            </Card>

            <Card className="text-center">
              <CardHeader>
                <div className="mx-auto w-12 h-12 bg-primary/10 rounded-lg flex items-center justify-center mb-4">
                  <Shield className="w-6 h-6 text-primary" />
                </div>
                <CardTitle>Seguridad Garantizada</CardTitle>
                <CardDescription>
                  Tus datos fiscales están protegidos con encriptación de grado empresarial
                </CardDescription>
              </CardHeader>
            </Card>

            <Card className="text-center">
              <CardHeader>
                <div className="mx-auto w-12 h-12 bg-primary/10 rounded-lg flex items-center justify-center mb-4">
                  <Globe className="w-6 h-6 text-primary" />
                </div>
                <CardTitle>Compatibilidad Universal</CardTitle>
                <CardDescription>
                  Funciona con todos los portales de proveedores más populares de México
                </CardDescription>
              </CardHeader>
            </Card>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-20 bg-primary">
        <div className="max-w-4xl mx-auto text-center px-4 sm:px-6 lg:px-8">
          <h2 className="text-3xl font-bold text-white mb-4">
            ¿Listo para automatizar tu facturación?
          </h2>
          <p className="text-xl text-primary-foreground/80 mb-8">
            Únete a cientos de empresas que ya confían en nuestro sistema
          </p>
          <Button asChild size="lg" variant="secondary" className="px-8">
            <Link href="/register">
              Comenzar Ahora
            </Link>
          </Button>
        </div>
      </section>

      {/* Footer */}
      <footer className="bg-slate-900 text-white py-12">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <div className="flex items-center justify-center space-x-2 mb-4">
            <FileText className="w-6 h-6" />
            <span className="text-xl font-semibold">Sistema CFDI 4.0</span>
          </div>
          <p className="text-slate-400 mb-4">
            Desarrollado por{' '}
            <a
              href="https://gaman.ai"
              target="_blank"
              rel="noopener noreferrer"
              className="text-primary hover:underline"
            >
              Gaman.ai
            </a>{' '}
            © 2025
          </p>
          <p className="text-sm text-slate-500">
            Automatización inteligente para la nueva era de facturación digital
          </p>
        </div>
      </footer>
    </div>
  );
}

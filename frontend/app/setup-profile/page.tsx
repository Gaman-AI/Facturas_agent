'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/hooks/useAuth';
import { LoadingSpinner } from '@/components/ui/loading-spinner';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { UserPlus } from 'lucide-react';

export default function SetupProfilePage() {
  const { user } = useAuth();
  const router = useRouter();

  useEffect(() => {
    // For now, skip profile setup and go directly to dashboard
    // This can be implemented later when profile management is needed
    const timer = setTimeout(() => {
      router.push('/dashboard');
    }, 1500);

    return () => clearTimeout(timer);
  }, [router]);

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-50 to-slate-100 px-4">
      <Card className="w-full max-w-md shadow-lg">
        <CardHeader className="text-center space-y-4">
          <div className="mx-auto w-16 h-16 bg-primary rounded-full flex items-center justify-center">
            <UserPlus className="w-8 h-8 text-primary-foreground" />
          </div>
          <div>
            <CardTitle className="text-2xl font-bold text-slate-900">
              Configurando Perfil
            </CardTitle>
            <CardDescription className="text-slate-600">
              Preparando tu cuenta del Sistema CFDI 4.0
            </CardDescription>
          </div>
        </CardHeader>
        
        <CardContent className="text-center space-y-6">
          <LoadingSpinner size="lg" />
          <p className="text-slate-600">
            Redirigiendo al panel de control...
          </p>
          <p className="text-sm text-slate-500">
            ¡Bienvenido, {user?.email}!
          </p>
        </CardContent>
      </Card>
    </div>
  );
} 
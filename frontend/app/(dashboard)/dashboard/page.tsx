'use client';

import { LogOut, User, Building2, FileText, BarChart3 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { ProtectedRoute } from '@/components/auth/ProtectedRoute';
import { useAuth, useUserProfile } from '@/hooks/useAuth';
import { useRouter } from 'next/navigation';

export default function DashboardPage() {
  return (
    <ProtectedRoute>
      <DashboardContent />
    </ProtectedRoute>
  );
}

function DashboardContent() {
  const { logout, loading } = useAuth();
  const { profile, getDisplayName, getRFCMasked, getFullAddress, isPersonaFisica } = useUserProfile();
  const router = useRouter();

  const handleLogout = async () => {
    try {
      await logout();
    } catch (error) {
      console.error('Logout error:', error);
    }
  };

  const handleNewTask = () => {
    router.push('/browser-agent-realtime');
  };

  const handleViewHistory = () => {
    // TODO: Implement task history page
    console.log('Navigate to task history');
  };

  const handleUpdateProfile = () => {
    // TODO: Implement profile update page
    console.log('Navigate to profile update');
  };

  // Show dashboard even without profile (profile is optional now)
  const displayName = profile ? getDisplayName() : 'Usuario'
  const hasProfile = !!profile

  return (
    <div className="min-h-screen bg-slate-50">
      {/* Header */}
      <header className="bg-white shadow-sm border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center space-x-4">
              <div className="w-8 h-8 bg-primary rounded flex items-center justify-center">
                <FileText className="w-5 h-5 text-white" />
              </div>
              <h1 className="text-xl font-semibold text-slate-900">
                Sistema CFDI 4.0
              </h1>
            </div>
            
            <div className="flex items-center space-x-4">
              <span className="text-sm text-slate-600">
                {displayName}
              </span>
              <Button
                variant="outline"
                size="sm"
                onClick={handleLogout}
                disabled={loading}
              >
                <LogOut className="w-4 h-4 mr-2" />
                Cerrar Sesión
              </Button>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="mb-8">
          <h2 className="text-2xl font-bold text-slate-900 mb-2">
            Bienvenido al Dashboard
          </h2>
          <p className="text-slate-600">
            Gestiona tus tareas de automatización CFDI desde aquí
          </p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* User Profile Card */}
          <Card className="lg:col-span-2">
            <CardHeader>
              <CardTitle className="flex items-center space-x-2">
                <User className="w-5 h-5" />
                <span>Información del Usuario</span>
              </CardTitle>
              <CardDescription>
                {hasProfile ? 'Información fiscal y de contacto' : 'Complete su perfil para acceder a todas las funciones'}
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {hasProfile ? (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="text-sm font-medium text-slate-700">Email</label>
                    <p className="text-slate-900">{profile.email}</p>
                  </div>
                  <div>
                    <label className="text-sm font-medium text-slate-700">RFC</label>
                    <div className="flex items-center space-x-2">
                      <p className="text-slate-900">{getRFCMasked()}</p>
                      <Badge variant={isPersonaFisica() ? "default" : "secondary"}>
                        {isPersonaFisica() ? "Persona Física" : "Persona Moral"}
                      </Badge>
                    </div>
                  </div>
                  <div className="md:col-span-2">
                    <label className="text-sm font-medium text-slate-700">Razón Social</label>
                    <p className="text-slate-900">{profile.company_name || profile.razon_social}</p>
                  </div>
                  <div className="md:col-span-2">
                    <label className="text-sm font-medium text-slate-700">Dirección Fiscal</label>
                    <p className="text-slate-900">{getFullAddress()}</p>
                  </div>
                  <div>
                    <label className="text-sm font-medium text-slate-700">Régimen Fiscal</label>
                    <p className="text-slate-900">{profile.tax_regime || profile.regimen_fiscal}</p>
                  </div>
                  <div>
                    <label className="text-sm font-medium text-slate-700">Uso de CFDI</label>
                    <p className="text-slate-900">{profile.cfdi_use || profile.uso_cfdi}</p>
                  </div>
                </div>
              ) : (
                <div className="text-center py-8">
                  <User className="w-12 h-12 text-slate-400 mx-auto mb-4" />
                  <p className="text-slate-600 mb-4">No se ha encontrado información de perfil</p>
                  <p className="text-sm text-slate-500">Puede usar las funciones básicas del sistema sin completar su perfil</p>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Quick Actions */}
          <div className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center space-x-2">
                  <Building2 className="w-5 h-5" />
                  <span>Acciones Rápidas</span>
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <Button className="w-full" variant="outline" onClick={handleNewTask}>
                  <FileText className="w-4 h-4 mr-2" />
                  Nueva Tarea CFDI
                </Button>
                <Button className="w-full" variant="outline" onClick={handleViewHistory}>
                  <BarChart3 className="w-4 h-4 mr-2" />
                  Ver Historial
                </Button>
                <Button className="w-full" variant="outline" onClick={handleUpdateProfile}>
                  <User className="w-4 h-4 mr-2" />
                  Actualizar Perfil
                </Button>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Estado del Sistema</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex items-center space-x-2">
                  <div className="w-3 h-3 bg-green-500 rounded-full"></div>
                  <span className="text-sm text-slate-600">Sistema Operativo</span>
                </div>
                <p className="text-xs text-slate-500 mt-2">
                  Todos los servicios funcionando correctamente
                </p>
              </CardContent>
            </Card>
          </div>
        </div>
      </main>
    </div>
  );
} 
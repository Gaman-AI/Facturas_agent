'use client';

import { LogOut, User, Building2, FileText, BarChart3, Zap, Plus } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { ProtectedRoute } from '@/components/auth/ProtectedRoute';
import { useAuth, useUserProfile } from '@/hooks/useAuth';
import { useLanguage } from '@/contexts/LanguageContext';
import { useRouter } from 'next/navigation';
import { SimpleTaskSubmission } from '@/components/SimpleTaskSubmission';

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
  const { t } = useLanguage();
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

  const handleSimpleTask = () => {
    router.push('/task/submit');
  };

  const handleTaskSubmit = (taskId: string) => {
    // Redirect to monitoring page when task is submitted from dashboard
    router.push(`/task/monitor/${taskId}`);
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
                {t('home.title')}
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
                {t('auth.logout')}
              </Button>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="mb-8">
          <h2 className="text-2xl font-bold text-slate-900 mb-2">
            {t('dashboard.welcome')}
          </h2>
          <p className="text-slate-600">
            {t('dashboard.title')}
          </p>
        </div>

        {/* Quick Task Submission */}
        <div className="mb-8">
          <SimpleTaskSubmission 
            onTaskSubmit={handleTaskSubmit}
            showRedirect={false}
            className="mb-6"
          />
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* User Profile Card */}
          <Card className="lg:col-span-2">
            <CardHeader>
              <CardTitle className="flex items-center space-x-2">
                <User className="w-5 h-5" />
                <span>{t('profile.title')}</span>
              </CardTitle>
              <CardDescription>
                {hasProfile ? t('profile.companyInfo') : t('profile.edit')}
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {hasProfile ? (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="text-sm font-medium text-slate-700">{t('auth.email')}</label>
                    <p className="text-slate-900">{profile.email}</p>
                  </div>
                  <div>
                    <label className="text-sm font-medium text-slate-700">{t('register.rfc.label')}</label>
                    <div className="flex items-center space-x-2">
                      <p className="text-slate-900">{getRFCMasked()}</p>
                      <Badge variant={isPersonaFisica() ? "default" : "secondary"}>
                        {isPersonaFisica() ? t('common.personaFisica', 'Persona Física') : t('common.personaMoral', 'Persona Moral')}
                      </Badge>
                    </div>
                  </div>
                  <div className="md:col-span-2">
                    <label className="text-sm font-medium text-slate-700">{t('register.companyName.label')}</label>
                    <p className="text-slate-900">{profile.company_name || profile.razon_social}</p>
                  </div>
                  <div className="md:col-span-2">
                    <label className="text-sm font-medium text-slate-700">{t('register.addressInfo')}</label>
                    <p className="text-slate-900">{getFullAddress()}</p>
                  </div>
                  <div>
                    <label className="text-sm font-medium text-slate-700">{t('register.taxRegime.label')}</label>
                    <p className="text-slate-900">{profile.tax_regime || profile.regimen_fiscal}</p>
                  </div>
                  <div>
                    <label className="text-sm font-medium text-slate-700">{t('register.cfdiUse.label')}</label>
                    <p className="text-slate-900">{profile.cfdi_use || profile.uso_cfdi}</p>
                  </div>
                </div>
              ) : (
                <div className="text-center py-8">
                  <User className="w-12 h-12 text-slate-400 mx-auto mb-4" />
                  <p className="text-slate-600 mb-4">{t('profile.noProfile', 'No se ha encontrado información de perfil')}</p>
                  <p className="text-sm text-slate-500">{t('profile.basicFunctions', 'Puede usar las funciones básicas del sistema sin completar su perfil')}</p>
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
                  <span>{t('dashboard.quickActions', 'Acciones Rápidas')}</span>
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <Button className="w-full" onClick={handleSimpleTask}>
                  <Zap className="w-4 h-4 mr-2" />
                  {t('tasks.simple.quickCreate', 'Quick Task')}
                </Button>
                <Button className="w-full" variant="outline" onClick={handleNewTask}>
                  <FileText className="w-4 h-4 mr-2" />
                  {t('tasks.create')}
                </Button>
                <Button className="w-full" variant="outline" onClick={handleViewHistory}>
                  <BarChart3 className="w-4 h-4 mr-2" />
                  {t('dashboard.viewHistory', 'Ver Historial')}
                </Button>
                <Button className="w-full" variant="outline" onClick={handleUpdateProfile}>
                  <User className="w-4 h-4 mr-2" />
                  {t('profile.edit')}
                </Button>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>{t('dashboard.systemStatus', 'Estado del Sistema')}</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex items-center space-x-2">
                  <div className="w-3 h-3 bg-green-500 rounded-full"></div>
                  <span className="text-sm text-slate-600">{t('dashboard.systemOperational', 'Sistema Operativo')}</span>
                </div>
                <p className="text-xs text-slate-500 mt-2">
                  {t('dashboard.allServicesWorking', 'Todos los servicios funcionando correctamente')}
                </p>
              </CardContent>
            </Card>
          </div>
        </div>
      </main>
    </div>
  );
} 
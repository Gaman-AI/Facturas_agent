'use client';

import { LogOut, User, Building2, FileText, BarChart3 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { ProtectedRoute } from '@/components/auth/ProtectedRoute';
import { useAuth, useUserProfile } from '@/hooks/useAuth';
import { useLanguage } from '@/contexts/LanguageContext';
import { useRouter } from 'next/navigation';
import { TaskList } from '@/components/TaskList';
import { TaskStats } from '@/components/TaskStats';
import { TaskProgressList } from '@/components/TaskProgressIndicator';
import { ButtonLoading } from '@/components/ui/enhanced-loading';
import { useState, useEffect } from 'react';
import { ApiService } from '@/services/api';

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
  const [refreshTrigger, setRefreshTrigger] = useState(0);
  const [tasks, setTasks] = useState<any[]>([]);
  const [loadingTasks, setLoadingTasks] = useState(false);

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
    // TODO: Implement dedicated task history page
    console.log('Navigate to task history');
  };

  const handleUpdateProfile = () => {
    // TODO: Implement profile update page
    console.log('Navigate to profile update');
  };

  const handleRefreshData = () => {
    setRefreshTrigger(prev => prev + 1);
    fetchActiveTasks();
  };

  // Fetch active tasks for progress display
  const fetchActiveTasks = async () => {
    try {
      setLoadingTasks(true);
      const fetchedTasks = await ApiService.getTasks(0, 20);
      setTasks(fetchedTasks);
    } catch (error) {
      console.error('Error fetching tasks:', error);
    } finally {
      setLoadingTasks(false);
    }
  };

  useEffect(() => {
    fetchActiveTasks();
  }, []);

  // Show dashboard even without profile (profile is optional now)
  const displayName = profile ? getDisplayName() : 'Usuario'
  const hasProfile = !!profile

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-7xl mx-auto p-4 sm:p-6 space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl sm:text-3xl font-bold text-gray-900">
              Bienvenido, {displayName}
            </h1>
            <p className="text-gray-600 mt-1 text-sm sm:text-base">
              Panel de control de automatización CFDI
            </p>
          </div>
          <div className="flex items-center space-x-2 sm:space-x-4">
            <ButtonLoading 
              variant="outline" 
              onClick={handleRefreshData}
              className="hidden sm:flex"
              size="sm"
            >
              <BarChart3 className="w-4 h-4 mr-2" />
              Actualizar
            </ButtonLoading>
            <ButtonLoading variant="outline" onClick={handleLogout} size="sm">
              <LogOut className="w-4 h-4 mr-2" />
              <span className="hidden sm:inline">Cerrar Sesión</span>
              <span className="sm:hidden">Salir</span>
            </ButtonLoading>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 lg:gap-6">
          {/* Left Column - Profile & Quick Actions */}
          <div className="lg:col-span-1 space-y-4 lg:space-y-6">
            {/* User Profile Card */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center space-x-2 text-base sm:text-lg">
                  <User className="w-4 h-4 sm:w-5 sm:h-5" />
                  <span>Perfil de Usuario</span>
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3 sm:space-y-4">
                {hasProfile ? (
                  <div className="space-y-3 sm:space-y-4">
                    <div>
                      <h3 className="font-medium text-gray-900 text-sm sm:text-base">{getDisplayName()}</h3>
                      <p className="text-xs sm:text-sm text-gray-600">RFC: {getRFCMasked()}</p>
                    </div>
                    
                    <div className="space-y-2">
                      <div>
                        <p className="text-xs font-medium text-gray-500 uppercase tracking-wide">
                          Dirección
                        </p>
                        <p className="text-xs sm:text-sm text-gray-900">{getFullAddress()}</p>
                      </div>
                      
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 sm:gap-4">
                        <div>
                          <p className="text-xs font-medium text-gray-500 uppercase tracking-wide">
                            Régimen Fiscal
                          </p>
                          <p className="text-xs sm:text-sm text-gray-900">{profile.tax_regime}</p>
                        </div>
                        <div>
                          <p className="text-xs font-medium text-gray-500 uppercase tracking-wide">
                            Uso CFDI
                          </p>
                          <p className="text-xs sm:text-sm text-gray-900">{profile.cfdi_use}</p>
                        </div>
                      </div>
                    </div>
                  </div>
                ) : (
                  <div className="text-center py-6 sm:py-8">
                    <User className="w-10 h-10 sm:w-12 sm:h-12 text-slate-400 mx-auto mb-3 sm:mb-4" />
                    <p className="text-slate-600 mb-3 sm:mb-4 text-sm">No se ha encontrado información de perfil</p>
                    <p className="text-xs sm:text-sm text-slate-500">Puede usar las funciones básicas del sistema sin completar su perfil</p>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Quick Actions */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center space-x-2 text-base sm:text-lg">
                  <Building2 className="w-4 h-4 sm:w-5 sm:h-5" />
                  <span>Acciones Rápidas</span>
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-2 sm:space-y-3">
                <Button className="w-full text-sm" variant="outline" onClick={handleNewTask}>
                  <FileText className="w-4 h-4 mr-2" />
                  Crear Tarea
                </Button>
                <Button className="w-full text-sm" variant="outline" onClick={handleViewHistory}>
                  <BarChart3 className="w-4 h-4 mr-2" />
                  Ver Historial
                </Button>
                <Button className="w-full text-sm" variant="outline" onClick={handleUpdateProfile}>
                  <User className="w-4 h-4 mr-2" />
                  Editar Perfil
                </Button>
              </CardContent>
            </Card>

            {/* System Status */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center space-x-2 text-base sm:text-lg">
                  <BarChart3 className="w-4 h-4 sm:w-5 sm:h-5" />
                  <span>Estado del Sistema</span>
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex items-center space-x-2">
                  <Badge variant="default" className="bg-green-500 text-xs sm:text-sm">
                    Sistema Operativo
                  </Badge>
                </div>
                <p className="text-xs sm:text-sm text-gray-600 mt-2">
                  Todos los servicios funcionan correctamente
                </p>
              </CardContent>
            </Card>

            {/* Active Tasks Progress - Mobile Only */}
            <div className="lg:hidden">
              <Card>
                <CardHeader>
                  <CardTitle className="text-base">Tareas Activas</CardTitle>
                </CardHeader>
                <CardContent>
                  {!loadingTasks && tasks.length > 0 ? (
                    <TaskProgressList 
                      tasks={tasks}
                      maxTasks={3}
                      variant="compact"
                    />
                  ) : (
                    <p className="text-sm text-gray-600">No hay tareas activas</p>
                  )}
                </CardContent>
              </Card>
            </div>
          </div>

          {/* Right Column - Task Management */}
          <div className="lg:col-span-2 space-y-4 lg:space-y-6">
            {/* Task Statistics */}
            <TaskStats refreshTrigger={refreshTrigger} />

            {/* Active Tasks Progress - Desktop Only */}
            <div className="hidden lg:block">
              {!loadingTasks && tasks.length > 0 && (
                <Card>
                  <CardHeader>
                    <CardTitle>Tareas en Progreso</CardTitle>
                    <CardDescription>
                      Monitoreo en tiempo real de tareas activas
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <TaskProgressList 
                      tasks={tasks}
                      maxTasks={5}
                      variant="compact"
                    />
                  </CardContent>
                </Card>
              )}
            </div>

            {/* Recent Tasks */}
            <TaskList 
              maxTasks={6}
              showHeader={true}
              showFilters={true}
              showPagination={false}
              showProgress={true}
            />
          </div>
        </div>
      </div>
    </div>
  );
} 
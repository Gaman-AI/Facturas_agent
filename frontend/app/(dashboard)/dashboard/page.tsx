'use client';

import React, { useState, useEffect } from 'react';
import { LogOut, User, Building2, FileText, BarChart3, Zap, Plus, Monitor, Globe, Activity, TrendingUp, CheckCircle, Clock, AlertCircle } from 'lucide-react';

import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { ProtectedRoute } from '@/components/auth/ProtectedRoute';
import { useAuth, useUserProfile } from '@/hooks/useAuth';
import { useLanguage } from '@/contexts/LanguageContext';
import { useRouter } from 'next/navigation';
import { SimpleTaskSubmission } from '@/components/SimpleTaskSubmission';
import { DashboardDualPane } from '@/components/DashboardDualPane';
import { EnhancedTaskSubmission } from '@/components/EnhancedTaskSubmission';
import { TaskStats } from '@/components/TaskStats';
import { TaskList } from '@/components/TaskList';
import { TaskProgressList } from '@/components/TaskProgressIndicator';
import { ApiService } from '@/services/api';
import { useDemoMode } from '@/contexts/DemoModeContext';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Info } from 'lucide-react';

export default function DashboardPage() {
  return (
    <ProtectedRoute>
      <DashboardContent />
    </ProtectedRoute>
  );
}

function DashboardContent() {
  const { logout, loading, user } = useAuth();
  const { profile, getDisplayName, getRFCMasked, getFullAddress, isPersonaFisica } = useUserProfile();
  const { t } = useLanguage();
  const router = useRouter();
  const [refreshTrigger, setRefreshTrigger] = useState(0);
  const [tasks, setTasks] = useState<any[]>([]);
  const [loadingTasks, setLoadingTasks] = useState(false);
  const [useDualPane, setUseDualPane] = useState(false);
  const { isDemoMode } = useDemoMode();

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
    // For dual pane mode, stay in dashboard and let DashboardDualPane handle the task
    if (useDualPane) {
      console.log('Task submitted in dual pane mode:', taskId);
      // Don't redirect - let the dual pane handle the task display
      return;
    }
    
    // For simple mode, redirect to monitoring page
    router.push(`/task/monitor/${taskId}`);
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
      // Set empty tasks instead of leaving undefined
      setTasks([]);
    } finally {
      setLoadingTasks(false);
    }
  };

  useEffect(() => {
    fetchActiveTasks();
  }, []);

  // Show dashboard even without profile (profile is optional now)
  const displayName = profile ? getDisplayName() : 'User'
  const hasProfile = !!profile

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-slate-100">
      {/* Demo Mode Alert */}
      {isDemoMode && (
        <div className="w-full bg-blue-50 border-b border-blue-200 p-4">
          <div className="max-w-7xl mx-auto">
            <Alert className="border-blue-200 bg-blue-50">
              <Info className="h-4 w-4 text-blue-600" />
              <AlertDescription className="text-blue-800">
                <strong>Demo Mode Active</strong> - All API calls are bypassed for UI testing. 
                You can test the complete user flow without backend dependencies.
              </AlertDescription>
            </Alert>
          </div>
        </div>
      )}

      {/* Header */}
      <header className="bg-white shadow-sm border-b border-slate-200">
        <div className="w-full mx-auto px-2 sm:px-4 lg:px-6">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center space-x-4">
              <div className="w-10 h-10 bg-gradient-to-r from-pink-500 to-rose-500 rounded-xl flex items-center justify-center shadow-lg">
                <FileText className="w-6 h-6 text-white" />
              </div>
              <div>
                <h1 className="text-xl font-bold text-slate-900">
                  {t('dashboard.title')}
                </h1>
                <p className="text-sm text-slate-500">AI-Powered Task Management</p>
              </div>
            </div>
            
            <div className="flex items-center space-x-4">
              <div className="flex items-center space-x-2 bg-white/60 backdrop-blur-sm rounded-lg px-3 py-2 border border-slate-200/50">
                <div className="w-8 h-8 bg-gradient-to-r from-pink-400 to-rose-400 rounded-full flex items-center justify-center">
                  <User className="w-4 h-4 text-white" />
                </div>
                <span className="text-sm font-medium text-slate-700">
                  {displayName}
                </span>
              </div>
              <Button
                variant="outline"
                size="sm"
                onClick={handleLogout}
                disabled={loading}
                className="border-slate-200 hover:bg-slate-50"
              >
                <LogOut className="w-4 h-4 mr-2" />
                {t('auth.logout')}
              </Button>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="w-full mx-auto px-2 sm:px-4 lg:px-6 py-8">
        {/* Welcome Section */}
        <div className="mb-6">
          <div className="bg-gradient-to-r from-pink-400 to-rose-400 rounded-xl p-6 text-white shadow-lg">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-2xl font-bold mb-2">
                  {t('dashboard.welcome')}, {displayName}! 👋
                </h2>
                <p className="text-pink-100 text-base">
                  {t('dashboard.subtitle')}
                </p>
              </div>
              <div className="hidden md:block">
                <div className="w-20 h-20 bg-white/20 rounded-full flex items-center justify-center">
                  <Zap className="w-10 h-10 text-white" />
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Task Submission Section */}
        <div className="mb-12">
          {/* Toggle Button */}
          <div className="flex justify-between items-center mb-6">
            <div>
              <h3 className="text-lg font-semibold text-slate-900">
                {useDualPane ? 'Dual Pane Task Monitor' : 'Quick Task Submission'}
              </h3>
              <p className="text-sm text-slate-600">
                {useDualPane 
                  ? 'Create and monitor browser automation tasks in real-time' 
                  : 'Simple task submission with redirect to monitoring page'
                }
              </p>
            </div>
            <Button 
              variant="outline" 
              onClick={() => setUseDualPane(!useDualPane)}
              className="flex items-center gap-2"
            >
              <Monitor className="w-4 h-4" />
              {useDualPane ? 'Use Simple View' : 'Use Dual Pane'}
            </Button>
          </div>

          {/* Conditional Rendering */}
          {useDualPane ? (
            <div className="h-[900px] mb-8 relative z-10 w-full">
              <DashboardDualPane 
                onTaskSubmit={handleTaskSubmit}
                className="h-full w-full"
              />
            </div>
          ) : (
            <Card className="border-0 shadow-xl bg-white/80 backdrop-blur-sm mb-6">
              <CardHeader className="pb-4">
                <CardTitle className="flex items-center space-x-2 text-xl">
                  <Zap className="w-6 h-6 text-yellow-500" />
                  <span>Submit New Task</span>
                </CardTitle>
                <CardDescription className="text-slate-600">
                  Upload receipts and describe what to automate
                </CardDescription>
              </CardHeader>
              <CardContent>
                <EnhancedTaskSubmission 
                  onTaskSubmit={handleTaskSubmit}
                  onRedirectToDualPane={() => setUseDualPane(true)}
                  className="mb-0"
                />
              </CardContent>
            </Card>
          )}
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 mt-4">
          {/* User Profile Card */}
          <Card className="lg:col-span-2 border-0 shadow-xl bg-white/80 backdrop-blur-sm">
            <CardHeader className="pb-4">
                              <CardTitle className="flex items-center space-x-2">
                  <div className="w-8 h-8 bg-gradient-to-r from-pink-500 to-rose-500 rounded-lg flex items-center justify-center">
                    <User className="w-5 h-5 text-white" />
                  </div>
                  <span>{t('profile.title')}</span>
                </CardTitle>
                <CardDescription>
                  {hasProfile ? t('profile.companyInfo') : 'Complete your profile to unlock advanced features'}
                </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              {hasProfile ? (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="space-y-4">
                                        <div className="bg-gradient-to-r from-pink-50 to-rose-50 rounded-lg p-4">
                      <label className="text-sm font-semibold text-slate-700 mb-1 block">{t('auth.email')}</label>
                      <p className="text-slate-900 font-medium">{user?.email || 'Not provided'}</p>
                    </div>
                    <div className="bg-gradient-to-r from-pink-50 to-rose-50 rounded-lg p-4">
                      <label className="text-sm font-semibold text-slate-700 mb-1 block">RFC</label>
                      <div className="flex items-center space-x-2">
                        <p className="text-slate-900 font-medium">{getRFCMasked()}</p>
                        <Badge variant={isPersonaFisica() ? "default" : "secondary"} className="bg-gradient-to-r from-pink-500 to-rose-500">
                          {isPersonaFisica() ? t('common.personaFisica') : t('common.personaMoral')}
                        </Badge>
                      </div>
                    </div>
                  </div>
                  <div className="space-y-4">
                                        <div className="bg-gradient-to-r from-pink-50 to-rose-50 rounded-lg p-4">
                      <label className="text-sm font-semibold text-slate-700 mb-1 block">{t('register.companyName.label')}</label>
                      <p className="text-slate-900 font-medium">{profile.company_name}</p>
                    </div>
                    <div className="bg-gradient-to-r from-pink-50 to-rose-50 rounded-lg p-4">
                      <label className="text-sm font-semibold text-slate-700 mb-1 block">{t('register.addressInfo')}</label>
                      <p className="text-slate-900 font-medium">{getFullAddress()}</p>
                    </div>
                  </div>
                  <div className="md:col-span-2 grid grid-cols-1 md:grid-cols-2 gap-4">
                                        <div className="bg-gradient-to-r from-pink-50 to-rose-50 rounded-lg p-4">
                      <label className="text-sm font-semibold text-slate-700 mb-1 block">{t('register.taxRegime.label')}</label>
                      <p className="text-slate-900 font-medium">{profile.tax_regime}</p>
                    </div>
                    <div className="bg-gradient-to-r from-pink-50 to-rose-50 rounded-lg p-4">
                      <label className="text-sm font-semibold text-slate-700 mb-1 block">{t('register.cfdiUse.label')}</label>
                      <p className="text-slate-900 font-medium">{profile.cfdi_use}</p>
                    </div>
                  </div>
                </div>
              ) : (
                <div className="text-center py-12">
                  <div className="w-20 h-20 bg-gradient-to-r from-slate-200 to-slate-300 rounded-full flex items-center justify-center mx-auto mb-6">
                    <User className="w-10 h-10 text-slate-400" />
                  </div>
                                    <h3 className="text-lg font-semibold text-slate-900 mb-2">{t('profile.noProfile')}</h3>
                  <p className="text-slate-600 mb-6 max-w-md mx-auto">
                    {t('profile.basicFunctions')}
                  </p>
                  <Button onClick={handleUpdateProfile} className="bg-gradient-to-r from-pink-500 to-rose-500 hover:from-pink-600 hover:to-rose-600">
                    <User className="w-4 h-4 mr-2" />
                    {t('profile.edit')}
                  </Button>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Quick Actions & Stats */}
          <div className="space-y-6">
            {/* Quick Actions */}
            <Card className="border-0 shadow-xl bg-white/80 backdrop-blur-sm">
              <CardHeader className="pb-4">
                                                 <CardTitle className="flex items-center space-x-2">
                  <div className="w-8 h-8 bg-gradient-to-r from-pink-500 to-rose-500 rounded-lg flex items-center justify-center">
                    <Zap className="w-5 h-5 text-white" />
                  </div>
                  <span>{t('dashboard.quickActions')}</span>
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                                                 <Button 
                  className="w-full bg-gradient-to-r from-pink-500 to-rose-500 hover:from-pink-600 hover:to-rose-600 shadow-lg" 
                  onClick={handleSimpleTask}
                >
                  <Zap className="w-4 h-4 mr-2" />
                  {t('tasks.create')}
                </Button>
                <Button 
                  className="w-full bg-gradient-to-r from-pink-500 to-rose-500 hover:from-pink-600 hover:to-rose-600 shadow-lg" 
                  onClick={handleNewTask}
                >
                  <Monitor className="w-4 h-4 mr-2" />
                  Advanced Task
                </Button>
                <Button 
                  className="w-full bg-gradient-to-r from-pink-500 to-rose-500 hover:from-pink-600 hover:to-rose-600 shadow-lg" 
                  onClick={handleViewHistory}
                >
                  <BarChart3 className="w-4 h-4 mr-2" />
                  {t('dashboard.viewHistory')}
                </Button>
                <Button 
                  variant="outline" 
                  className="w-full border-slate-200 hover:bg-slate-50" 
                  onClick={handleUpdateProfile}
                >
                  <User className="w-4 h-4 mr-2" />
                  {t('profile.edit')}
                </Button>
              </CardContent>
            </Card>

            {/* System Status */}
            <Card className="border-0 shadow-xl bg-white/80 backdrop-blur-sm">
              <CardHeader className="pb-4">
                                                 <CardTitle className="flex items-center space-x-2">
                  <div className="w-8 h-8 bg-gradient-to-r from-pink-500 to-rose-500 rounded-lg flex items-center justify-center">
                    <CheckCircle className="w-5 h-5 text-white" />
                  </div>
                  <span>{t('dashboard.systemStatus')}</span>
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                                 <div className="flex items-center justify-between p-3 bg-gradient-to-r from-pink-50 to-rose-50 rounded-lg">
                   <div className="flex items-center space-x-3">
                     <div className="w-3 h-3 bg-pink-500 rounded-full animate-pulse"></div>
                     <span className="text-sm font-medium text-slate-700">AI Agent</span>
                   </div>
                   <Badge variant="default" className="bg-pink-500">Online</Badge>
                 </div>
                 <div className="flex items-center justify-between p-3 bg-gradient-to-r from-pink-50 to-rose-50 rounded-lg">
                   <div className="flex items-center space-x-3">
                     <div className="w-3 h-3 bg-pink-500 rounded-full animate-pulse"></div>
                     <span className="text-sm font-medium text-slate-700">Browser Automation</span>
                   </div>
                   <Badge variant="default" className="bg-pink-500">Ready</Badge>
                 </div>
                 <div className="flex items-center justify-between p-3 bg-gradient-to-r from-pink-50 to-rose-50 rounded-lg">
                   <div className="flex items-center space-x-3">
                     <div className="w-3 h-3 bg-pink-500 rounded-full animate-pulse"></div>
                     <span className="text-sm font-medium text-slate-700">WebSocket</span>
                   </div>
                   <Badge variant="default" className="bg-pink-500">Connected</Badge>
                </div>
              </CardContent>
            </Card>

            {/* Recent Activity */}
            <Card className="border-0 shadow-xl bg-white/80 backdrop-blur-sm">
              <CardHeader className="pb-4">
                                 <CardTitle className="flex items-center space-x-2">
                   <div className="w-8 h-8 bg-gradient-to-r from-pink-500 to-rose-500 rounded-lg flex items-center justify-center">
                     <Activity className="w-5 h-5 text-white" />
                   </div>
                   <span>Recent Activity</span>
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                                 <div className="flex items-center space-x-3 p-3 bg-gradient-to-r from-pink-50 to-rose-50 rounded-lg">
                   <div className="w-8 h-8 bg-pink-500 rounded-full flex items-center justify-center">
                     <CheckCircle className="w-4 h-4 text-white" />
                   </div>
                   <div className="flex-1">
                     <p className="text-sm font-medium text-slate-900">Task completed</p>
                     <p className="text-xs text-slate-500">Google search automation</p>
                   </div>
                   <span className="text-xs text-slate-400">2m ago</span>
                 </div>
                 <div className="flex items-center space-x-3 p-3 bg-gradient-to-r from-pink-50 to-rose-50 rounded-lg">
                   <div className="w-8 h-8 bg-pink-500 rounded-full flex items-center justify-center">
                     <Clock className="w-4 h-4 text-white" />
                   </div>
                   <div className="flex-1">
                     <p className="text-sm font-medium text-slate-900">Task started</p>
                     <p className="text-xs text-slate-500">Weather check automation</p>
                   </div>
                   <span className="text-xs text-slate-400">5m ago</span>
                 </div>
                 <div className="flex items-center space-x-3 p-3 bg-gradient-to-r from-pink-50 to-rose-50 rounded-lg">
                   <div className="w-8 h-8 bg-pink-500 rounded-full flex items-center justify-center">
                     <TrendingUp className="w-4 h-4 text-white" />
                   </div>
                   <div className="flex-1">
                     <p className="text-sm font-medium text-slate-900">System updated</p>
                     <p className="text-xs text-slate-500">New features available</p>
                   </div>
                   <span className="text-xs text-slate-400">1h ago</span>
                </div>
              </CardContent>
            </Card>

            {/* Active Tasks Progress - Mobile Only */}
            <div className="lg:hidden">
              <Card>
                <CardHeader>
                  <CardTitle className="text-base">Active Tasks</CardTitle>
                </CardHeader>
                <CardContent>
                  {!loadingTasks && tasks.length > 0 ? (
                    <TaskProgressList 
                      tasks={tasks}
                      maxTasks={3}
                      variant="compact"
                    />
                  ) : (
                    <p className="text-sm text-gray-600">No active tasks</p>
                  )}
                </CardContent>
              </Card>
            </div>
          </div>

          {/* Right Column - Task Management */}
          <div className="lg:col-span-2 space-y-6">
            {/* Task Statistics */}
            <TaskStats refreshTrigger={refreshTrigger} />

            {/* Active Tasks Progress - Desktop Only */}
            <div className="hidden lg:block">
              {!loadingTasks && tasks.length > 0 && (
                <Card>
                  <CardHeader>
                    <CardTitle>Tasks in Progress</CardTitle>
                    <CardDescription>
                      Real-time monitoring of active tasks
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
      </main>
    </div>
  );
} 
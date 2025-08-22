'use client';

import React, { useState, useEffect, useRef } from 'react';
import { LogOut, User, Building2, FileText, CloudUpload, Link as LinkIcon } from 'lucide-react';

import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { ProtectedRoute } from '@/components/auth/ProtectedRoute';
import { useAuth, useUserProfile } from '@/hooks/useAuth';
import { useLanguage } from '@/contexts/LanguageContext';
import { useRouter } from 'next/navigation';
import { DashboardDualPane } from '@/components/DashboardDualPane';
import { TaskStats } from '@/components/TaskStats';
import { TaskProgressList } from '@/components/TaskProgressIndicator';
import { ApiService } from '@/services/api';
import { Input } from '@/components/ui/input';
import { tokenManager } from '@/utils/tokenManager';
import { Alert, AlertDescription } from '@/components/ui/alert';

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
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [vendorUrl, setVendorUrl] = useState<string>('');
  const [isUploading, setIsUploading] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [uploadedTicketId, setUploadedTicketId] = useState<string | null>(null);
  const [extractedTicketData, setExtractedTicketData] = useState<any>(null);

  const API_BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL || 'http://localhost:8000';

  const fileInputRef = useRef<HTMLInputElement | null>(null);

  const handleLogout = async () => {
    try {
      await logout();
    } catch (error) {
      console.error('Logout error:', error);
    }
  };

  const handleResetToUpload = () => {
    setUseDualPane(false);
    setExtractedTicketData(null);
    setUploadedTicketId(null);
    setSelectedFile(null);
    setVendorUrl('');
    setUploadError(null);
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0] || null;
    setSelectedFile(file);
    setUploadError(null);
    setUploadedTicketId(null);
  };

  const handleUploadTicket = async () => {
    if (!selectedFile) return;
    setIsUploading(true);
    setUploadError(null);
    setUploadedTicketId(null);
    try {
      const token = await tokenManager.getValidToken();
      const formData = new FormData();
      formData.append('file', selectedFile);
      if (vendorUrl) formData.append('vendor_url', vendorUrl);

      const response = await fetch(`${API_BASE_URL}/api/v1/tickets/upload`, {
        method: 'POST',
        headers: {
          ...(token ? { Authorization: `Bearer ${token}` } : {})
        },
        body: formData
      });

      if (!response.ok) {
        const text = await response.text();
        throw new Error(text || `Upload failed with status ${response.status}`);
      }

      const data = await response.json();
      const ticketId = data?.data?.ticket_id || data?.ticket_id || null;
      setUploadedTicketId(ticketId);
      
      // Extract and store the ticket data from OCR response
      if (data?.data?.extracted_data) {
        const ocrData = data.data.extracted_data;
        console.log('✅ OCR data received in dashboard:', ocrData);
        console.log('📊 OCR data keys:', Object.keys(ocrData));
        console.log('📝 Raw text available:', !!ocrData.raw_text || !!ocrData.Full_Raw_Text);
        setExtractedTicketData(ocrData);
      } else {
        console.warn('⚠️ No extracted_data found in dashboard response');
        console.log('📋 Full dashboard response:', data);
      }
      
      // Automatically switch to Dual Pane view after successful upload
      setUseDualPane(true);
    } catch (err: any) {
      console.error('Upload error:', err);
      setUploadError(err?.message || 'Upload failed');
    } finally {
      setIsUploading(false);
    }
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

  const handleUpdateProfile = () => {
    router.push('/profile/edit');
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
    <div className="min-h-screen bg-gradient-to-br from-pink-50 via-rose-50 to-pink-100">
      {/* Header */}
      <header className="bg-white/80 backdrop-blur-sm shadow-sm border-b border-slate-200/50">
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
                  <CloudUpload className="w-10 h-10 text-white" />
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Ticket Upload / Dual Pane Section */}
        <div className="mb-12">
          {useDualPane ? (
            <div className="h-[750px] mb-4 relative z-10 w-full">
              {/* Reset Button */}
              <div className="mb-4 flex justify-end">
                <Button 
                  onClick={handleResetToUpload}
                  variant="outline"
                  className="border-pink-300 text-pink-700 hover:bg-pink-50"
                >
                  ← Back to Upload
                </Button>
              </div>
              
              <DashboardDualPane 
                onTaskSubmit={handleTaskSubmit}
                className="h-full w-full"
                initialTicketData={extractedTicketData}
                vendorUrl={vendorUrl}
                userProfile={profile}
              />
            </div>
          ) : (
              <Card className="border-0 shadow-xl bg-white/80 backdrop-blur-sm mb-6">
                <CardHeader className="pb-4">
                  <CardTitle className="flex items-center space-x-2 text-xl">
                    <CloudUpload className="w-6 h-6 text-pink-500" />
                    <span>Upload Ticket for OCR</span>
                  </CardTitle>
                  <CardDescription className="text-slate-600">
                    Choose a receipt image or PDF and optionally provide the vendor URL. We’ll extract details and open the dual pane.
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    {/* Vendor URL */}
                    <div className="space-y-1">
                      <label className="text-sm font-medium text-slate-700 flex items-center gap-2">
                        <LinkIcon className="w-4 h-4 text-slate-500" /> Vendor URL (optional)
                      </label>
                      <Input
                        type="url"
                        placeholder="https://facturacion.walmartmexico.com.mx/"
                        value={vendorUrl}
                        onChange={(e) => setVendorUrl(e.target.value)}
                      />
                    </div>

                    {/* Dropzone-like uploader */}
                    <div className="rounded-lg border-2 border-dashed border-slate-200 bg-slate-50/50 p-6 text-center">
                      <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-xl bg-pink-100">
                        <CloudUpload className="h-6 w-6 text-pink-600" />
                      </div>
                      <p className="text-sm text-slate-700 font-medium">Select or drag-and-drop your receipt</p>
                      <p className="text-xs text-slate-500 mt-1">Supported types: JPG, PNG, PDF</p>
                      <input
                        id="ticket-file"
                        type="file"
                        accept="image/*,.pdf"
                        className="hidden"
                        ref={fileInputRef}
                        onChange={handleFileChange}
                      />
                      <div className="mt-4 flex items-center justify-center gap-3">
                        <Button
                          variant="outline"
                          className="cursor-pointer"
                          onClick={() => fileInputRef.current?.click()}
                        >
                          Choose File
                        </Button>
                        <Button onClick={handleUploadTicket} disabled={!selectedFile || isUploading} className="bg-pink-600 hover:bg-pink-700">
                          {isUploading ? (
                            <span className="inline-flex items-center gap-2">
                              <span className="inline-block h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent" />
                              Uploading…
                            </span>
                          ) : (
                            'Upload & Open Dual Pane'
                          )}
                        </Button>
                      </div>

                      {selectedFile && (
                        <div className="mt-3 text-xs text-slate-600">Selected: {selectedFile.name}</div>
                      )}
                    </div>

                    {/* Messages */}
                    {uploadError && (
                      <Alert className="border-red-200 bg-red-50 text-red-800">
                        <AlertDescription>{uploadError}</AlertDescription>
                      </Alert>
                    )}
                    {uploadedTicketId && (
                      <Alert className="border-green-200 bg-green-50 text-green-800">
                        <AlertDescription>Ticket created: {uploadedTicketId}</AlertDescription>
                      </Alert>
                    )}
                  </div>
                </CardContent>
              </Card>
          )}
        </div>

        {/* Visual Separator */}
        {useDualPane && (
          <div className="mb-4">
            <div className="h-px bg-gradient-to-r from-transparent via-pink-200 to-transparent"></div>
            <div className="text-center mt-4">
              <div className="inline-flex items-center px-4 py-2 bg-white/60 backdrop-blur-sm rounded-full border border-pink-200/50">
                <div className="w-2 h-2 bg-pink-400 rounded-full mr-2"></div>
                <span className="text-sm font-medium text-pink-700">Dashboard Overview</span>
                <div className="w-2 h-2 bg-pink-400 rounded-full ml-2"></div>
              </div>
            </div>
          </div>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 mt-8">
          {/* User Profile Card */}
          <Card className="lg:col-span-2 border-0 shadow-xl bg-white/80 backdrop-blur-sm hover:shadow-2xl transition-all duration-300">
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
            {/* Edit Profile Only */}
            <Card className="border-0 shadow-xl bg-white/80 backdrop-blur-sm hover:shadow-2xl transition-all duration-300">
              <CardHeader className="pb-4">
                <CardTitle className="flex items-center space-x-2">
                  <div className="w-8 h-8 bg-gradient-to-r from-pink-500 to-rose-500 rounded-lg flex items-center justify-center">
                    <User className="w-5 h-5 text-white" />
                  </div>
                  <span>Profile Management</span>
                </CardTitle>
              </CardHeader>
              <CardContent>
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
          </div>
        </div>
      </main>
    </div>
  );
} 
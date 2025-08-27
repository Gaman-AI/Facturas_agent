'use client';

import React, { useState, useEffect, useRef } from 'react';
import { User, Building2, FileText, CloudUpload, Link as LinkIcon } from 'lucide-react';

import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { ProtectedRoute } from '@/components/auth/ProtectedRoute';
import { useAuth, useUserProfile } from '@/hooks/useAuth';
import { useLanguage } from '@/contexts/LanguageContext';
import { useRouter } from 'next/navigation';
import { DashboardDualPane } from '@/components/DashboardDualPane';
import { Input } from '@/components/ui/input';
import { tokenManager } from '@/utils/tokenManager';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { ProfileDropdown } from '@/components/ProfileDropdown';

export default function DashboardPage() {
  return (
    <ProtectedRoute>
      <DashboardContent />
    </ProtectedRoute>
  );
}

function DashboardContent() {
  const { user } = useAuth();
  const { profile, getDisplayName, getRFCMasked, getFullAddress, isPersonaFisica } = useUserProfile();
  const { t } = useLanguage();
  const router = useRouter();

  const [useDualPane, setUseDualPane] = useState(false);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [vendorUrl, setVendorUrl] = useState<string>('');
  const [isUploading, setIsUploading] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [uploadedTicketId, setUploadedTicketId] = useState<string | null>(null);
  const [extractedTicketData, setExtractedTicketData] = useState<any>(null);

  const API_BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL || 'http://localhost:8000';

  const fileInputRef = useRef<HTMLInputElement | null>(null);



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



  // Show dashboard even without profile (profile is optional now)
  const displayName = profile ? getDisplayName() : 'User'
  const hasProfile = !!profile

  return (
    <div className="min-h-screen bg-gradient-to-br from-theme-50 via-theme-100 to-theme-200">
      {/* Header */}
      <header className="bg-white/80 backdrop-blur-sm shadow-sm border-b border-theme-200/50 relative z-[9998]">
        <div className="w-full mx-auto px-4 sm:px-8 lg:px-12">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center space-x-4">
              <div className="w-10 h-10 bg-gradient-to-r from-theme-500 to-theme-600 rounded-xl flex items-center justify-center shadow-lg">
                <FileText className="w-6 h-6 text-white" />
              </div>
              <div>
                <h1 className="text-xl font-bold text-theme-800">
                  {t('dashboard.title')}
                </h1>
                <p className="text-sm text-theme-600">AI-Powered Task Management</p>
              </div>
            </div>
            
            <div className="flex items-center space-x-4">
              <ProfileDropdown />
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="w-full mx-auto px-4 sm:px-8 lg:px-12 py-10">
        {/* Welcome Section */}
        <div className="mb-8">
          <div className="bg-gradient-to-r from-theme-400 to-theme-500 rounded-xl p-6 text-white shadow-lg">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-2xl font-bold mb-2">
                  {t('dashboard.welcome')}, {displayName}! 👋
                </h2>
                <p className="text-theme-100 text-base">
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
            <div className="h-[1000px] mb-6 relative z-10 w-full">
              <DashboardDualPane 
                onTaskSubmit={handleTaskSubmit}
                onResetToUpload={handleResetToUpload}
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
                    <CloudUpload className="w-6 h-6 text-theme-500" />
                    <span>Upload Ticket for OCR</span>
                  </CardTitle>
                  <CardDescription className="text-theme-600">
                    Choose a receipt image or PDF and optionally provide the vendor URL. We'll extract details and open the dual pane.
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    {/* Vendor URL */}
                    <div className="space-y-1">
                      <label className="text-sm font-medium text-theme-700 flex items-center gap-2">
                        <LinkIcon className="w-4 h-4 text-theme-500" /> Vendor URL (optional)
                      </label>
                      <Input
                        type="url"
                        placeholder="https://facturacion.walmartmexico.com.mx/"
                        value={vendorUrl}
                        onChange={(e) => setVendorUrl(e.target.value)}
                      />
                    </div>

                    {/* Dropzone-like uploader */}
                    <div className="rounded-lg border-2 border-dashed border-theme-200 bg-theme-50/50 p-6 text-center">
                      <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-xl bg-theme-100">
                        <CloudUpload className="h-6 w-6 text-theme-600" />
                      </div>
                      <p className="text-sm text-theme-700 font-medium">Select or drag-and-drop your receipt</p>
                      <p className="text-xs text-theme-500 mt-1">Supported types: JPG, PNG, PDF</p>
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
                          className="cursor-pointer border-theme-300 text-theme-700 hover:bg-theme-50"
                          onClick={() => fileInputRef.current?.click()}
                        >
                          Choose File
                        </Button>
                        <Button onClick={handleUploadTicket} disabled={!selectedFile || isUploading} className="bg-theme-600 hover:bg-theme-700">
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
                        <div className="mt-3 text-xs text-theme-600">Selected: {selectedFile.name}</div>
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

        
      </main>
    </div>
  );
} 
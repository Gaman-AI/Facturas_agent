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
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { tokenManager } from '@/utils/tokenManager';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { ProfileDropdown } from '@/components/ProfileDropdown';
import { LanguageToggle } from '@/components/LanguageToggle';

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
  const [selectedVendor, setSelectedVendor] = useState<string>('');
  const [isUploading, setIsUploading] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [uploadedTicketId, setUploadedTicketId] = useState<string | null>(null);
  const [extractedTicketData, setExtractedTicketData] = useState<any>(null);

  const API_BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL || 'http://localhost:8000';

  const fileInputRef = useRef<HTMLInputElement | null>(null);

  // Predefined vendor URLs
  const vendorUrls = {
    walmart: 'https://facturacion.walmartmexico.com.mx/',
    oxxo: 'https://www4.oxxo.com:9443/facturacionElectronica-web/views/layout/inicio.do',
    others: ''
  };

  const handleVendorChange = (vendor: string) => {
    setSelectedVendor(vendor);
    if (vendor === 'walmart' || vendor === 'oxxo') {
      setVendorUrl(vendorUrls[vendor as keyof typeof vendorUrls]);
    } else if (vendor === 'others') {
      setVendorUrl('');
    }
  };

  const handleResetToUpload = () => {
    setUseDualPane(false);
    setExtractedTicketData(null);
    setUploadedTicketId(null);
    setSelectedFile(null);
    setVendorUrl('');
    setSelectedVendor('');
    setUploadError(null);
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0] || null;
    setSelectedFile(file);
    setUploadError(null);
    setUploadedTicketId(null);
  };

  const handleUploadTicket = async () => {
    if (!selectedFile) {
      setUploadError('Please select a file');
      return;
    }

    if (!selectedVendor) {
      setUploadError('Please select a vendor');
      return;
    }

    if (selectedVendor === 'others' && (!vendorUrl || vendorUrl.trim() === '')) {
      setUploadError('Vendor URL is required for custom vendors');
      return;
    }

    if (!vendorUrl || vendorUrl.trim() === '') {
      setUploadError('Vendor URL is required');
      return;
    }
    setIsUploading(true);
    setUploadError(null);
    setUploadedTicketId(null);
    try {
      const token = await tokenManager.getValidToken();
      const formData = new FormData();
      formData.append('file', selectedFile);
      formData.append('vendor_url', vendorUrl.trim());

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



  // Custom display name function for welcome message
  const getWelcomeDisplayName = () => {
    // Try to get firstname from user's full_name
    if (user?.full_name) {
      const firstName = user.full_name.split(' ')[0];
      return firstName.charAt(0).toUpperCase() + firstName.slice(1).toLowerCase();
    }
    
    // Fallback to email username (first part before @)
    if (user?.email) {
      const emailName = user.email.split('@')[0];
      return emailName.charAt(0).toUpperCase() + emailName.slice(1).toLowerCase();
    }
    
    // Final fallback
    return 'User';
  };

  // Show dashboard even without profile (profile is optional now)
  const displayName = getWelcomeDisplayName()
  const hasProfile = !!profile

  return (
    <div className="h-screen bg-gradient-to-br from-secondary via-muted to-border flex flex-col">


      {/* Main Content */}
      <main className="w-full mx-auto px-2 sm:px-4 lg:px-6 py-4 flex-1 flex flex-col min-h-0">
        {/* Welcome Section - Only show when NOT in dual pane mode */}
        {!useDualPane && (
          <div className="mb-4">
            <div className="rounded-lg p-4 text-white shadow-md" style={{ backgroundColor: '#208692' }}>
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="text-lg font-semibold mb-1">
                    {t('dashboard.welcome', 'Welcome back')}, {displayName}! 👋
                  </h2>
                  <p className="text-sm opacity-90">
                    {t('dashboard.subtitle')}
                  </p>
                </div>
                <div className="flex items-center space-x-4">
                  <LanguageToggle />
                  <ProfileDropdown />
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Profile Management Card - Only show when NOT in dual pane mode */}
        {hasProfile && !useDualPane && (
          <div className="mb-6">
                          <Card className="border-0 shadow-xl bg-white/80 backdrop-blur-sm border-l-4 border-l-primary">
              <CardHeader className="pb-4">
                <CardTitle className="flex items-center space-x-2 text-xl">
                  <User className="w-6 h-6 text-[#208692]" />
                  <span>Profile Management</span>
                </CardTitle>
              </CardHeader>
              <CardContent>
                <Button 
                  onClick={handleUpdateProfile}
                  variant="outline"
                  className="border-[#208692] text-[#527779] hover:bg-[#E5EADF] hover:border-[#164F5B]"
                >
                  Edit Profile
                </Button>
              </CardContent>
            </Card>
          </div>
        )}

        {/* Main Content Area */}
        <div className="flex-1 min-h-0">
          {useDualPane ? (
            <div className="h-full">
              <DashboardDualPane
                onTaskSubmit={handleTaskSubmit}
                className="h-full w-full"
                initialTicketData={extractedTicketData}
                vendorUrl={vendorUrl}
                userProfile={profile}
                onBackToUpload={() => setUseDualPane(false)}
                profileDropdown={<ProfileDropdown />}
              />
            </div>
          ) : (
              <Card className="border-0 shadow-xl bg-white/80 backdrop-blur-sm mb-6 border-l-4 border-l-primary">
                <CardHeader className="pb-4">
                  <CardTitle className="flex items-center space-x-2 text-xl">
                    <CloudUpload className="w-6 h-6 text-[#208692]" />
                    <span>{t('upload.title', 'Upload Ticket for OCR')}</span>
                  </CardTitle>
                  <CardDescription className="text-[#527779]">
                    {t('upload.description', 'Choose a receipt image or PDF and provide the vendor URL. We\'ll extract details and open the dual pane.')}
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    {/* Vendor Selection */}
                    <div className="space-y-3">
                      <label className="text-sm font-medium text-[#527779] flex items-center gap-2">
                        <LinkIcon className="w-4 h-4 text-[#208692]" /> 
                        {t('upload.vendorSelection', 'Vendor Selection')} <span className="text-red-500 font-semibold">*</span>
                      </label>
                      
                      {/* Vendor Dropdown */}
                      <Select value={selectedVendor} onValueChange={handleVendorChange}>
                        <SelectTrigger className={!selectedVendor ? "border-red-300 focus:border-red-500" : "focus:border-[#208692] focus:ring-[#208692]"}>
                          <SelectValue placeholder={t('upload.selectVendor', 'Select a vendor')} />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="walmart">Walmart México</SelectItem>
                          <SelectItem value="oxxo">OXXO</SelectItem>
                          <SelectItem value="others">{t('upload.otherVendor', 'Others')}</SelectItem>
                        </SelectContent>
                      </Select>

                      {/* Conditional URL Input for Others */}
                      {selectedVendor === 'others' && (
                        <div className="space-y-1">
                          <label className="text-sm font-medium text-[#527779] flex items-center gap-2">
                            <LinkIcon className="w-4 h-4 text-[#208692]" />
                            {t('upload.customVendorUrl', 'Custom Vendor URL')} <span className="text-red-500 font-semibold">*</span>
                          </label>
                          <Input
                            type="url"
                            placeholder="https://facturacion.proveedor.com/"
                            value={vendorUrl}
                            onChange={(e) => setVendorUrl(e.target.value)}
                            className={!vendorUrl ? "border-red-300 focus:border-red-500" : "focus:border-[#208692] focus:ring-[#208692]"}
                            required
                          />
                        </div>
                      )}

                      {/* Display selected URL for predefined vendors */}
                      {selectedVendor && selectedVendor !== 'others' && vendorUrl && (
                        <div className="p-2 bg-[#E5EADF]/30 border border-[#C7D8D0] rounded-lg">
                          <p className="text-xs text-[#527779] font-medium">{t('upload.selectedUrl', 'Selected URL:')}</p>
                          <p className="text-xs text-[#208692] break-all">{vendorUrl}</p>
                        </div>
                      )}

                      {!selectedVendor && (
                        <p className="text-xs text-red-500">{t('upload.vendorSelectionRequired', 'Please select a vendor')}</p>
                      )}
                      {selectedVendor === 'others' && !vendorUrl && (
                        <p className="text-xs text-red-500">{t('upload.vendorUrlRequired', 'Vendor URL is required')}</p>
                      )}
                    </div>

                    {/* Dropzone-like uploader */}
                    <div className="rounded-lg border-2 border-dashed border-[#C7D8D0] bg-[#E5EADF]/30 p-6 text-center">
                      <p className="text-sm text-[#527779] font-medium">{t('upload.selectFile', 'Select or drag-and-drop your receipt')}</p>
                      <p className="text-xs text-[#527779] mt-1">{t('upload.supportedTypes', 'Supported types: JPG, PNG, PDF')}</p>
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
                          className="cursor-pointer border-[#A8C5C0] text-[#527779] hover:bg-[#E5EADF] hover:border-[#208692]"
                          onClick={() => fileInputRef.current?.click()}
                        >
                          {t('upload.chooseFile', 'Choose File')}
                        </Button>
                        <Button onClick={handleUploadTicket} disabled={!selectedFile || !selectedVendor || (selectedVendor === 'others' && !vendorUrl) || (selectedVendor !== 'others' && !vendorUrl) || isUploading} className="bg-[#208692] hover:bg-[#164F5B] text-white">
                          {isUploading ? (
                            <span className="inline-flex items-center gap-2">
                              <span className="inline-block h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent" />
                              {t('upload.uploading', 'Uploading…')}
                            </span>
                          ) : (
                            t('upload.uploadAndOpen', 'Upload & Open Dual Pane')
                          )}
                        </Button>
                      </div>

                      {selectedFile && (
                        <div className="mt-3 text-xs text-[#527779]">{t('upload.selected', 'Selected')}: {selectedFile.name}</div>
                      )}
                    </div>

                    {/* Messages */}
                    {uploadError && (
                      <Alert className="border-red-200 bg-red-50 text-red-800">
                        <AlertDescription>{uploadError}</AlertDescription>
                      </Alert>
                    )}
                                          {uploadedTicketId && (
                        <Alert className="border-[#C7D8D0] bg-[#E5EADF] text-[#164F5B]">
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
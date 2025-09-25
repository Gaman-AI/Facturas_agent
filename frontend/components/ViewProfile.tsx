'use client';

import { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { User, Building2, MapPin, FileText, Edit, ArrowLeft, AlertCircle, Phone, Mail } from 'lucide-react';

import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';

import { useAuth, useUserProfile } from '@/hooks/useAuth';
import { useLanguage } from '@/contexts/LanguageContext';
import { REGIMENES_FISCALES, USOS_CFDI, ESTADOS_MEXICANOS } from '@/types/cfdi';
import { LanguageToggle } from '@/components/LanguageToggle';

export function ViewProfile() {
  const [mounted, setMounted] = useState(false);
  const mountedRef = useRef(true);
  
  const router = useRouter();
  const { user } = useAuth();
  const { profile, getDisplayName } = useUserProfile();
  const { t } = useLanguage();

  // Prevent hydration mismatch
  useEffect(() => {
    setMounted(true);
    mountedRef.current = true;
    
    return () => {
      mountedRef.current = false;
    };
  }, []);

  const handleEditProfile = () => {
    router.push('/profile/edit');
  };

  const handleBackToDashboard = () => {
    router.push('/dashboard');
  };

  const getTaxRegimeDescription = (code: string) => {
    const regime = REGIMENES_FISCALES.find(r => r.code === code);
    return regime ? regime.description : code;
  };

  const getCfdiUseDescription = (code: string) => {
    const uso = USOS_CFDI.find(u => u.code === code);
    return uso ? uso.description : code;
  };

  const getStateName = (code: string) => {
    const estado = ESTADOS_MEXICANOS.find(e => e.code === code);
    return estado ? estado.name : code;
  };

  if (!mounted) {
    return null;
  }

  if (!profile) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-teal-50 via-teal-100 to-teal-200 flex items-center justify-center">
        <Card className="w-full max-w-md">
          <CardContent className="pt-6">
            <div className="text-center">
              <AlertCircle className="w-12 h-12 text-amber-500 mx-auto mb-4" />
              <h3 className="text-lg font-semibold text-slate-900 mb-2">No Profile Found</h3>
              <p className="text-slate-600 mb-4">
                You need to complete your profile first. Click the button below to create your profile.
              </p>
              <Button onClick={handleEditProfile} className="bg-gradient-to-r from-teal-500 to-teal-600 hover:from-teal-600 hover:to-teal-700">
                <Edit className="w-4 h-4 mr-2" />
                Create Profile
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  const displayName = getDisplayName();
  const userEmail = user?.email || '';

  return (
    <div className="min-h-screen bg-gradient-to-br from-teal-50 via-teal-100 to-teal-200">
      {/* Header */}
      <header className="bg-white/80 backdrop-blur-sm shadow-sm border-b border-slate-200/50">
        <div className="w-full mx-auto px-2 sm:px-4 lg:px-6">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center space-x-4">
              <div className="w-10 h-10 bg-gradient-to-r from-teal-500 to-teal-600 rounded-xl flex items-center justify-center shadow-lg">
                <User className="w-6 h-6 text-white" />
              </div>
              <div>
                <h1 className="text-xl font-bold text-slate-900">{t('profile.title', 'My Profile')}</h1>
                <p className="text-sm text-slate-500">{t('profile.subtitle', 'View your company and tax information')}</p>
              </div>
            </div>
            
            <div className="flex items-center space-x-3">
              <LanguageToggle />
              <Button
                variant="outline"
                size="sm"
                onClick={handleBackToDashboard}
                className="border-slate-200 hover:bg-slate-50"
              >
                <ArrowLeft className="w-4 h-4 mr-2" />
                {t('common.back', 'Back')} {t('nav.dashboard', 'to Dashboard')}
              </Button>
              
              <Button
                onClick={handleEditProfile}
                className="bg-gradient-to-r from-teal-500 to-teal-600 hover:from-teal-600 hover:to-teal-700"
              >
                <Edit className="w-4 h-4 mr-2" />
                {t('profile.edit', 'Edit Profile')}
              </Button>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="w-full mx-auto px-2 sm:px-4 lg:px-6 py-8">
        <div className="max-w-4xl mx-auto space-y-6">
          {/* User Info Card */}
          <Card className="border-0 shadow-xl bg-white/80 backdrop-blur-sm">
            <CardHeader>
              <CardTitle className="flex items-center space-x-2">
                <User className="w-5 h-5 text-teal-500" />
                <span>{t('profile.personalInfo', 'Personal Information')}</span>
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center space-x-4">
                <div className="w-16 h-16 bg-gradient-to-r from-teal-400 to-teal-400 rounded-full flex items-center justify-center">
                  <User className="w-8 h-8 text-white" />
                </div>
                <div>
                  <h3 className="text-xl font-semibold text-slate-900">{displayName}</h3>
                  <div className="flex items-center space-x-2 text-slate-600">
                    <Mail className="w-4 h-4" />
                    <span>{userEmail}</span>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Company Information */}
          <Card className="border-0 shadow-xl bg-white/80 backdrop-blur-sm">
            <CardHeader>
              <CardTitle className="flex items-center space-x-2">
                <Building2 className="w-5 h-5 text-teal-500" />
                <span>{t('profile.companyInfo', 'Company Information')}</span>
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="text-sm font-medium text-slate-600">{t('register.rfc.label', 'RFC')}</label>
                  <p className="text-lg font-semibold text-slate-900">{profile.rfc || t('common.notProvided', 'Not provided')}</p>
                </div>
                
                <div>
                  <label className="text-sm font-medium text-slate-600">{t('register.companyName.label', 'Company Name')}</label>
                  <p className="text-lg font-semibold text-slate-900">{profile.company_name || t('common.notProvided', 'Not provided')}</p>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="text-sm font-medium text-slate-600">{t('register.country.label', 'Country')}</label>
                  <p className="text-lg font-semibold text-slate-900">{profile.country || t('common.notProvided', 'Not provided')}</p>
                </div>
                
                <div>
                  <label className="text-sm font-medium text-slate-600">{t('register.phoneNumber.label', 'Phone Number')}</label>
                  <div className="flex items-center space-x-2">
                    <Phone className="w-4 h-4 text-slate-500" />
                    <p className="text-lg font-semibold text-slate-900">{profile.phone_number || t('common.notProvided', 'Not provided')}</p>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Address Information */}
          <Card className="border-0 shadow-xl bg-white/80 backdrop-blur-sm">
            <CardHeader>
              <CardTitle className="flex items-center space-x-2">
                <MapPin className="w-5 h-5 text-teal-500" />
                <span>{t('profile.addressInfo', 'Address Information')}</span>
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="text-sm font-medium text-slate-600">{t('register.street.label', 'Street')}</label>
                  <p className="text-lg font-semibold text-slate-900">{profile.street || t('common.notProvided', 'Not provided')}</p>
                </div>
                
                <div>
                  <label className="text-sm font-medium text-slate-600">{t('profile.buildingNumbers', 'Building Numbers')}</label>
                  <div className="flex items-center space-x-2">
                    <span className="text-lg font-semibold text-slate-900">
                      {profile.exterior_number || t('common.notProvided', 'Not provided')}
                    </span>
                    {profile.interior_number && (
                      <>
                        <span className="text-slate-400">/</span>
                        <span className="text-lg font-semibold text-slate-900">{profile.interior_number}</span>
                      </>
                    )}
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <label className="text-sm font-medium text-slate-600">{t('register.colony.label', 'Colony')}</label>
                  <p className="text-lg font-semibold text-slate-900">{profile.colony || t('common.notProvided', 'Not provided')}</p>
                </div>
                
                <div>
                  <label className="text-sm font-medium text-slate-600">{t('register.municipality.label', 'Municipality')}</label>
                  <p className="text-lg font-semibold text-slate-900">{profile.municipality || t('common.notProvided', 'Not provided')}</p>
                </div>
                
                <div>
                  <label className="text-sm font-medium text-slate-600">{t('register.zipCode.label', 'Zip Code')}</label>
                  <p className="text-lg font-semibold text-slate-900">{profile.zip_code || t('common.notProvided', 'Not provided')}</p>
                </div>
              </div>

              <div>
                <label className="text-sm font-medium text-slate-600">{t('register.state.label', 'State')}</label>
                <p className="text-lg font-semibold text-slate-900">
                  {profile.state ? getStateName(profile.state) : t('common.notProvided', 'Not provided')}
                </p>
              </div>
            </CardContent>
          </Card>

          {/* Tax Information */}
          <Card className="border-0 shadow-xl bg-white/80 backdrop-blur-sm">
            <CardHeader>
              <CardTitle className="flex items-center space-x-2">
                <FileText className="w-5 h-5 text-teal-500" />
                <span>{t('profile.taxInfo', 'Tax Information')}</span>
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="text-sm font-medium text-slate-600">{t('register.taxRegime.label', 'Tax Regime')}</label>
                  <div className="mt-1">
                    <Badge variant="secondary" className="text-sm">
                      {profile.tax_regime ? getTaxRegimeDescription(profile.tax_regime) : t('common.notProvided', 'Not provided')}
                    </Badge>
                  </div>
                </div>
                
                <div>
                  <label className="text-sm font-medium text-slate-600">{t('register.cfdiUse.label', 'CFDI Use')}</label>
                  <div className="mt-1">
                    <Badge variant="secondary" className="text-sm">
                      {profile.cfdi_use ? getCfdiUseDescription(profile.cfdi_use) : t('common.notProvided', 'Not provided')}
                    </Badge>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Action Buttons */}
          <div className="flex justify-center pt-6">
            <Button
              onClick={handleEditProfile}
              size="lg"
              className="bg-gradient-to-r from-teal-500 to-teal-600 hover:from-teal-600 hover:to-teal-700 px-8"
            >
              <Edit className="w-5 h-5 mr-2" />
              {t('profile.edit', 'Edit Profile')}
            </Button>
          </div>
        </div>
      </main>
    </div>
  );
}

'use client';

import { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { User, Building2, MapPin, FileText, Save, ArrowLeft, AlertCircle, CheckCircle } from 'lucide-react';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';

import { useAuth, useUserProfile } from '@/hooks/useAuth';
import { useLanguage } from '@/contexts/LanguageContext';
import { REGIMENES_FISCALES, USOS_CFDI, ESTADOS_MEXICANOS } from '@/types/cfdi';
import { UserProfile } from '@/types/auth';

export function EditProfile() {
  const [mounted, setMounted] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const mountedRef = useRef(true);
  
  const router = useRouter();
  const { updateProfile } = useAuth();
  const { profile, refreshProfile } = useUserProfile();
  const { t } = useLanguage();

  // Dynamic validation schema using translations (same as register but without password)
  const editProfileSchema = z.object({
    rfc: z
      .string()
      .min(12, t('validation.rfc.length', { min: 12, max: 13 }))
      .max(13, t('validation.rfc.length', { min: 12, max: 13 }))
      .regex(/^[A-Z&Ñ]{3,4}[0-9]{6}[A-Z0-9]{3}$/, t('validation.rfc.invalid')),
    country: z.string().min(1, t('validation.country.required')),
    company_name: z.string().min(2, t('validation.companyName.minLength', { min: 2 })),
    street: z.string().min(2, t('validation.street.minLength', { min: 2 })),
    exterior_number: z.string().min(1, t('validation.exteriorNumber.required')),
    interior_number: z.string().optional(),
    colony: z.string().min(2, t('validation.colony.minLength', { min: 2 })),
    municipality: z.string().min(2, t('validation.municipality.minLength', { min: 2 })),
    zip_code: z
      .string()
      .min(5, t('validation.zipCode.length', { length: 5 }))
      .max(5, t('validation.zipCode.length', { length: 5 }))
      .regex(/^[0-9]{5}$/, t('validation.zipCode.invalid')),
    state: z.string().min(2, t('validation.state.minLength', { min: 2 })),
    tax_regime: z.string().min(1, t('validation.taxRegime.required')),
    cfdi_use: z.string().min(1, t('validation.cfdiUse.required')),
    phone_number: z.string().min(1, t('validation.phoneNumber.required')),
  });

  type EditProfileFormData = z.infer<typeof editProfileSchema>;

  // Prevent hydration mismatch
  useEffect(() => {
    setMounted(true);
    mountedRef.current = true;
    
    return () => {
      mountedRef.current = false;
    };
  }, []);

  const {
    register,
    handleSubmit,
    formState: { errors, isDirty },
    watch,
    setValue,
    reset,
  } = useForm<EditProfileFormData>({
    resolver: zodResolver(editProfileSchema),
    defaultValues: {
      rfc: '',
      country: 'México',
      company_name: '',
      street: '',
      exterior_number: '',
      interior_number: '',
      colony: '',
      municipality: '',
      zip_code: '',
      state: '',
      tax_regime: '',
      cfdi_use: '',
      phone_number: '',
    },
  });

  // Populate form with existing profile data when available
  useEffect(() => {
    if (profile && mounted) {
      const formData = {
        rfc: profile.rfc || '',
        country: profile.country || 'México',
        company_name: profile.company_name || '',
        street: profile.street || '',
        exterior_number: profile.exterior_number || '',
        interior_number: profile.interior_number || '',
        colony: profile.colony || '',
        municipality: profile.municipality || '',
        zip_code: profile.zip_code || '',
        state: profile.state || '',
        tax_regime: profile.tax_regime || '',
        cfdi_use: profile.cfdi_use || '',
        phone_number: profile.phone_number || '',
      };

      // Set form values
      Object.entries(formData).forEach(([key, value]) => {
        setValue(key as keyof EditProfileFormData, value);
      });

      // Reset form state to consider this as "clean"
      reset(formData);
    }
  }, [profile, mounted, setValue, reset]);

  const onSubmit = async (data: EditProfileFormData) => {
    if (!mountedRef.current) return;
    
    try {
      setIsLoading(true);
      setError(null);
      setSuccess(null);

      // Convert form data to match UserProfile interface
      const profileUpdates: Partial<UserProfile> = {
        rfc: data.rfc,
        country: data.country,
        company_name: data.company_name,
        street: data.street,
        exterior_number: data.exterior_number,
        interior_number: data.interior_number,
        colony: data.colony,
        municipality: data.municipality,
        zip_code: data.zip_code,
        state: data.state,
        tax_regime: data.tax_regime,
        cfdi_use: data.cfdi_use,
        phone_number: data.phone_number,
      };

      await updateProfile(profileUpdates);
      
      // Refresh profile data
      await refreshProfile();
      
      setSuccess('Profile updated successfully!');
      
      // Reset form to consider it clean
      reset(data);
      
      // Redirect back to dashboard after a short delay
      setTimeout(() => {
        router.push('/dashboard');
      }, 2000);
      
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to update profile';
      setError(message);
    } finally {
      if (mountedRef.current) {
        setIsLoading(false);
      }
    }
  };

  const handleCancel = () => {
    router.push('/dashboard');
  };

  if (!mounted) {
    return null;
  }

  if (!profile) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-theme-50 via-theme-100 to-theme-200 flex items-center justify-center">
        <Card className="w-full max-w-md">
          <CardContent className="pt-6">
            <div className="text-center">
              <AlertCircle className="w-12 h-12 text-amber-500 mx-auto mb-4" />
              <h3 className="text-lg font-semibold text-slate-900 mb-2">No Profile Found</h3>
              <p className="text-slate-600 mb-4">
                You need to complete your profile first before you can edit it.
              </p>
              <Button onClick={handleCancel} variant="outline">
                <ArrowLeft className="w-4 h-4 mr-2" />
                Back to Dashboard
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-theme-50 via-theme-100 to-theme-200 flex items-center justify-center">
      <div className="w-full max-w-4xl mx-auto p-4">
        <div className="bg-white rounded-2xl shadow-xl border border-theme-200/50 overflow-hidden">
          {/* Header */}
          <div className="bg-gradient-to-r from-theme-400 to-theme-500 px-8 py-6 text-white">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-4">
                <div className="w-10 h-10 bg-gradient-to-r from-theme-500 to-theme-600 rounded-xl flex items-center justify-center shadow-lg">
                  <User className="w-6 h-6 text-white" />
                </div>
                <div>
                  <h1 className="text-2xl font-bold">Edit Profile</h1>
                  <p className="text-theme-100">Update your company and tax information</p>
                </div>
              </div>
              
              <Button
                variant="outline"
                size="sm"
                onClick={handleCancel}
                className="border-white/20 text-white hover:bg-white/10"
              >
                <ArrowLeft className="w-4 h-4 mr-2" />
                Back to Profile
              </Button>
            </div>
          </div>

          {/* Main Content */}
          <div className="p-8">
            {/* Success/Error Messages */}
            {success && (
              <Alert className="mb-6 border-green-200 bg-green-50">
                <CheckCircle className="h-4 w-4 text-green-600" />
                <AlertDescription className="text-green-800">{success}</AlertDescription>
              </Alert>
            )}
            
            {error && (
              <Alert className="mb-6 border-red-200 bg-red-50">
                <AlertCircle className="h-4 w-4 text-red-600" />
                <AlertDescription className="text-red-800">{error}</AlertDescription>
              </Alert>
            )}

            <form onSubmit={handleSubmit(onSubmit)} className="space-y-8">
              {/* Company Information */}
              <Card className="border-0 shadow-xl bg-white/80 backdrop-blur-sm">
                <CardHeader>
                  <CardTitle className="flex items-center space-x-2">
                                         <Building2 className="w-5 h-5 text-theme-500" />
                    <span>{t('profile.companyInfo')}</span>
                  </CardTitle>
                  <CardDescription>
                    Update your company details and contact information
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <Label htmlFor="rfc">RFC *</Label>
                      <Input
                        id="rfc"
                        {...register('rfc')}
                        placeholder="XAXX010101000"
                        className={errors.rfc ? 'border-red-500' : ''}
                      />
                      {errors.rfc && (
                        <p className="text-sm text-red-600 mt-1">{errors.rfc.message}</p>
                      )}
                    </div>
                    
                    <div>
                      <Label htmlFor="company_name">Company Name *</Label>
                      <Input
                        id="company_name"
                        {...register('company_name')}
                        placeholder="Your Company Name"
                        className={errors.company_name ? 'border-red-500' : ''}
                      />
                      {errors.company_name && (
                        <p className="text-sm text-red-600 mt-1">{errors.company_name.message}</p>
                      )}
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <Label htmlFor="country">Country *</Label>
                      <Select
                        value={watch('country')}
                        onValueChange={(value) => setValue('country', value)}
                      >
                        <SelectTrigger className={errors.country ? 'border-red-500' : ''}>
                          <SelectValue placeholder="Select country" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="México">México</SelectItem>
                          <SelectItem value="United States">United States</SelectItem>
                          <SelectItem value="Canada">Canada</SelectItem>
                        </SelectContent>
                      </Select>
                      {errors.country && (
                        <p className="text-sm text-red-600 mt-1">{errors.country.message}</p>
                      )}
                    </div>
                    
                    <div>
                      <Label htmlFor="phone_number">Phone Number *</Label>
                      <Input
                        id="phone_number"
                        {...register('phone_number')}
                        placeholder="+52-55-1234-5678"
                        className={errors.phone_number ? 'border-red-500' : ''}
                      />
                      {errors.phone_number && (
                        <p className="text-sm text-red-600 mt-1">{errors.phone_number.message}</p>
                      )}
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Address Information */}
              <Card className="border-0 shadow-xl bg-white/80 backdrop-blur-sm">
                <CardHeader>
                  <CardTitle className="flex items-center space-x-2">
                                         <MapPin className="w-5 h-5 text-theme-500" />
                    <span>{t('profile.addressInfo')}</span>
                  </CardTitle>
                  <CardDescription>
                    Update your business address information
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <Label htmlFor="street">Street *</Label>
                      <Input
                        id="street"
                        {...register('street')}
                        placeholder="Street name"
                        className={errors.street ? 'border-red-500' : ''}
                      />
                      {errors.street && (
                        <p className="text-sm text-red-600 mt-1">{errors.street.message}</p>
                      )}
                    </div>
                    
                    <div className="grid grid-cols-2 gap-2">
                      <div>
                        <Label htmlFor="exterior_number">Exterior # *</Label>
                        <Input
                          id="exterior_number"
                          {...register('exterior_number')}
                          placeholder="123"
                          className={errors.exterior_number ? 'border-red-500' : ''}
                        />
                        {errors.exterior_number && (
                          <p className="text-sm text-red-600 mt-1">{errors.exterior_number.message}</p>
                        )}
                      </div>
                      
                      <div>
                        <Label htmlFor="interior_number">Interior #</Label>
                        <Input
                          id="interior_number"
                          {...register('interior_number')}
                          placeholder="A"
                        />
                      </div>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div>
                      <Label htmlFor="colony">Colony *</Label>
                      <Input
                        id="colony"
                        {...register('colony')}
                        placeholder="Colony name"
                        className={errors.colony ? 'border-red-500' : ''}
                      />
                      {errors.colony && (
                        <p className="text-sm text-red-600 mt-1">{errors.colony.message}</p>
                      )}
                    </div>
                    
                    <div>
                      <Label htmlFor="municipality">Municipality *</Label>
                      <Input
                        id="municipality"
                        {...register('municipality')}
                        placeholder="Municipality name"
                        className={errors.municipality ? 'border-red-500' : ''}
                      />
                      {errors.municipality && (
                        <p className="text-sm text-red-600 mt-1">{errors.municipality.message}</p>
                      )}
                    </div>
                    
                    <div>
                      <Label htmlFor="zip_code">Zip Code *</Label>
                      <Input
                        id="zip_code"
                        {...register('zip_code')}
                        placeholder="12345"
                        maxLength={5}
                        className={errors.zip_code ? 'border-red-500' : ''}
                      />
                      {errors.zip_code && (
                        <p className="text-sm text-red-600 mt-1">{errors.zip_code.message}</p>
                      )}
                    </div>
                  </div>

                  <div>
                    <Label htmlFor="state">State *</Label>
                    <Select
                      value={watch('state')}
                      onValueChange={(value) => setValue('state', value)}
                    >
                      <SelectTrigger className={errors.state ? 'border-red-500' : ''}>
                        <SelectValue placeholder="Select state" />
                      </SelectTrigger>
                                           <SelectContent>
                         {ESTADOS_MEXICANOS.map((estado) => (
                           <SelectItem key={estado.code} value={estado.code}>
                             {estado.name}
                           </SelectItem>
                         ))}
                       </SelectContent>
                    </Select>
                    {errors.state && (
                      <p className="text-sm text-red-600 mt-1">{errors.state.message}</p>
                    )}
                  </div>
                </CardContent>
              </Card>

              {/* Tax Information */}
              <Card className="border-0 shadow-xl bg-white/80 backdrop-blur-sm">
                <CardHeader>
                  <CardTitle className="flex items-center space-x-2">
                                         <FileText className="w-5 h-5 text-theme-500" />
                    <span>{t('profile.taxInfo')}</span>
                  </CardTitle>
                  <CardDescription>
                    Update your tax regime and CFDI usage information
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <Label htmlFor="tax_regime">Tax Regime *</Label>
                      <Select
                        value={watch('tax_regime')}
                        onValueChange={(value) => setValue('tax_regime', value)}
                      >
                        <SelectTrigger className={errors.tax_regime ? 'border-red-500' : ''}>
                          <SelectValue placeholder="Select tax regime" />
                        </SelectTrigger>
                                             <SelectContent>
                         {REGIMENES_FISCALES.map((regimen) => (
                           <SelectItem key={regimen.code} value={regimen.code}>
                             {regimen.description}
                           </SelectItem>
                         ))}
                       </SelectContent>
                      </Select>
                      {errors.tax_regime && (
                        <p className="text-sm text-red-600 mt-1">{errors.tax_regime.message}</p>
                      )}
                    </div>
                    
                    <div>
                      <Label htmlFor="cfdi_use">CFDI Use *</Label>
                      <Select
                        value={watch('cfdi_use')}
                        onValueChange={(value) => setValue('cfdi_use', value)}
                      >
                        <SelectTrigger className={errors.cfdi_use ? 'border-red-500' : ''}>
                          <SelectValue placeholder="Select CFDI use" />
                        </SelectTrigger>
                                             <SelectContent>
                         {USOS_CFDI.map((uso) => (
                           <SelectItem key={uso.code} value={uso.code}>
                             {uso.description}
                           </SelectItem>
                         ))}
                       </SelectContent>
                      </Select>
                      {errors.cfdi_use && (
                        <p className="text-sm text-red-600 mt-1">{errors.cfdi_use.message}</p>
                      )}
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Action Buttons */}
              <div className="flex justify-end space-x-4">
                <Button
                  type="button"
                  variant="outline"
                  onClick={handleCancel}
                  disabled={isLoading}
                  className="border-slate-200 hover:bg-slate-50"
                >
                  Cancel
                </Button>
                <Button
                  type="submit"
                  disabled={isLoading || !isDirty}
                  className="bg-gradient-to-r from-theme-500 to-theme-600 hover:from-theme-600 hover:to-theme-700"
                >
                  {isLoading ? (
                    <>
                      <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin mr-2" />
                      Updating...
                    </>
                  ) : (
                    <>
                      <Save className="w-4 h-4 mr-2" />
                      {t('profile.save')}
                    </>
                  )}
                </Button>
              </div>
            </form>
          </div>
        </div>
      </div>
    </div>
  );
}

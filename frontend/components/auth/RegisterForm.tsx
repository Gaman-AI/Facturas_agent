'use client';

import { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Eye, EyeOff, UserPlus, AlertCircle, Building2, MapPin, FileText } from 'lucide-react';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Alert, AlertDescription } from '@/components/ui/alert';

import { useAuth } from '@/hooks/useAuth';
import { useLanguage } from '@/contexts/LanguageContext';
import { REGIMENES_FISCALES, USOS_CFDI, ESTADOS_MEXICANOS } from '@/types/cfdi';

export function RegisterForm() {
  const [showPassword, setShowPassword] = useState(false)
  const [mounted, setMounted] = useState(false)
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const mountedRef = useRef(true) // Add ref to track if component is mounted
  
  const router = useRouter()
  const { register: registerUser } = useAuth()
  const { t } = useLanguage()

  // Dynamic validation schema using translations
  const registerSchema = z.object({
    email: z
      .string()
      .min(1, t('validation.email.required'))
      .email(t('validation.email.invalid')),
    password: z
      .string()
      .min(8, t('validation.password.minLength', { min: 8 }))
      .regex(/[A-Z]/, t('validation.password.uppercase'))
      .regex(/[a-z]/, t('validation.password.lowercase'))
      .regex(/[0-9]/, t('validation.password.number')),
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
  })

  type RegisterFormData = z.infer<typeof registerSchema>

  // Prevent hydration mismatch
  useEffect(() => {
    setMounted(true)
    mountedRef.current = true
    
    // Cleanup function to prevent state updates after unmount
    return () => {
      mountedRef.current = false
    }
  }, [])

  const {
    register,
    handleSubmit,
    formState: { errors },
    watch,
    setValue,
  } = useForm<RegisterFormData>({
    resolver: zodResolver(registerSchema),
    defaultValues: {
      email: '',
      password: '',
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
    },
  })

  const onSubmit = async (data: RegisterFormData) => {
    // Prevent multiple submissions
    if (isLoading) return
    
    try {
      // Check if component is still mounted before setting state
      if (!mountedRef.current) return
      
      setIsLoading(true)
      setError(null)
      
      // Pass all the collected form data to registration
      await registerUser(data)
      
      // Check if component is still mounted before navigation
      if (!mountedRef.current) return
      
      // Navigate to dashboard
      router.push('/dashboard')
    } catch (err) {
      // Only update state if component is still mounted
      if (mountedRef.current) {
        console.error('Registration error:', err)
        setError(err instanceof Error ? err.message : t('error.registrationFailed'))
      }
    } finally {
      // Only update state if component is still mounted
      if (mountedRef.current) {
        setIsLoading(false)
      }
    }
  }

  if (!mounted) {
    return <div>{t('common.loading')}</div>
  }

  return (
    <div className="space-y-6">
      {error && (
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
        {/* Email and Password Section */}
        <div className="space-y-4">
          <div className="flex items-center gap-2 text-lg font-semibold text-slate-900">
            <UserPlus className="w-5 h-5" />
            {t('register.accessInfo')}
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="email">{t('register.email.label')} *</Label>
              <Input
                id="email"
                type="email"
                placeholder={t('register.email.placeholder')}
                {...register('email')}
                className={errors.email ? 'border-red-500' : ''}
              />
              {errors.email && (
                <p className="text-sm text-red-500">{errors.email.message}</p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="password">{t('register.password.label')} *</Label>
              <div className="relative">
                <Input
                  id="password"
                  type={showPassword ? 'text' : 'password'}
                  placeholder={t('register.password.placeholder')}
                  {...register('password')}
                  className={errors.password ? 'border-red-500 pr-10' : 'pr-10'}
                />
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  className="absolute right-0 top-0 h-full px-3 py-2 hover:bg-transparent"
                  onClick={() => setShowPassword(!showPassword)}
                >
                  {showPassword ? (
                    <EyeOff className="h-4 w-4 text-slate-500" />
                  ) : (
                    <Eye className="h-4 w-4 text-slate-500" />
                  )}
                </Button>
              </div>
              {errors.password && (
                <p className="text-sm text-red-500">{errors.password.message}</p>
              )}
            </div>
          </div>
        </div>

        {/* Company Information Section */}
        <div className="space-y-4">
          <div className="flex items-center gap-2 text-lg font-semibold text-slate-900">
            <Building2 className="w-5 h-5" />
            {t('register.companyInfo')}
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="rfc">{t('register.rfc.label')} *</Label>
              <Input
                id="rfc"
                placeholder={t('register.rfc.placeholder')}
                {...register('rfc')}
                className={errors.rfc ? 'border-red-500' : ''}
                style={{ textTransform: 'uppercase' }}
              />
              {errors.rfc && (
                <p className="text-sm text-red-500">{errors.rfc.message}</p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="company_name">{t('register.companyName.label')} *</Label>
              <Input
                id="company_name"
                placeholder={t('register.companyName.placeholder')}
                {...register('company_name')}
                className={errors.company_name ? 'border-red-500' : ''}
              />
              {errors.company_name && (
                <p className="text-sm text-red-500">{errors.company_name.message}</p>
              )}
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="country">{t('register.country.label')} *</Label>
            <Input
              id="country"
              {...register('country')}
              className={errors.country ? 'border-red-500' : ''}
            />
            {errors.country && (
              <p className="text-sm text-red-500">{errors.country.message}</p>
            )}
          </div>
        </div>

        {/* Address Section */}
        <div className="space-y-4">
          <div className="flex items-center gap-2 text-lg font-semibold text-slate-900">
            <MapPin className="w-5 h-5" />
            {t('register.addressInfo')}
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="md:col-span-2 space-y-2">
              <Label htmlFor="street">{t('register.street.label')} *</Label>
              <Input
                id="street"
                placeholder={t('register.street.placeholder')}
                {...register('street')}
                className={errors.street ? 'border-red-500' : ''}
              />
              {errors.street && (
                <p className="text-sm text-red-500">{errors.street.message}</p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="exterior_number">{t('register.exteriorNumber.label')} *</Label>
              <Input
                id="exterior_number"
                placeholder={t('register.exteriorNumber.placeholder')}
                {...register('exterior_number')}
                className={errors.exterior_number ? 'border-red-500' : ''}
              />
              {errors.exterior_number && (
                <p className="text-sm text-red-500">{errors.exterior_number.message}</p>
              )}
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div className="space-y-2">
              <Label htmlFor="interior_number">{t('register.interiorNumber.label')}</Label>
              <Input
                id="interior_number"
                placeholder={t('register.interiorNumber.placeholder')}
                {...register('interior_number')}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="colony">{t('register.colony.label')} *</Label>
              <Input
                id="colony"
                placeholder={t('register.colony.placeholder')}
                {...register('colony')}
                className={errors.colony ? 'border-red-500' : ''}
              />
              {errors.colony && (
                <p className="text-sm text-red-500">{errors.colony.message}</p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="municipality">{t('register.municipality.label')} *</Label>
              <Input
                id="municipality"
                placeholder={t('register.municipality.placeholder')}
                {...register('municipality')}
                className={errors.municipality ? 'border-red-500' : ''}
              />
              {errors.municipality && (
                <p className="text-sm text-red-500">{errors.municipality.message}</p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="zip_code">{t('register.zipCode.label')} *</Label>
              <Input
                id="zip_code"
                placeholder={t('register.zipCode.placeholder')}
                {...register('zip_code')}
                className={errors.zip_code ? 'border-red-500' : ''}
                maxLength={5}
              />
              {errors.zip_code && (
                <p className="text-sm text-red-500">{errors.zip_code.message}</p>
              )}
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="state">{t('register.state.label')} *</Label>
            <Select onValueChange={(value) => setValue('state', value)}>
              <SelectTrigger className={errors.state ? 'border-red-500' : ''}>
                <SelectValue placeholder={t('register.state.placeholder')} />
              </SelectTrigger>
              <SelectContent>
                {ESTADOS_MEXICANOS.map((estado) => (
                  <SelectItem key={estado.code} value={estado.name}>
                    {estado.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {errors.state && (
              <p className="text-sm text-red-500">{errors.state.message}</p>
            )}
          </div>
        </div>

        {/* Tax Information Section */}
        <div className="space-y-4">
          <div className="flex items-center gap-2 text-lg font-semibold text-slate-900">
            <FileText className="w-5 h-5" />
            {t('register.taxInfo')}
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="tax_regime">{t('register.taxRegime.label')} *</Label>
              <Select onValueChange={(value) => setValue('tax_regime', value)}>
                <SelectTrigger className={errors.tax_regime ? 'border-red-500' : ''}>
                  <SelectValue placeholder={t('register.taxRegime.placeholder')} />
                </SelectTrigger>
                <SelectContent>
                  {REGIMENES_FISCALES.map((regimen) => (
                    <SelectItem key={regimen.code} value={regimen.code}>
                      {regimen.code} - {regimen.description}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {errors.tax_regime && (
                <p className="text-sm text-red-500">{errors.tax_regime.message}</p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="cfdi_use">{t('register.cfdiUse.label')} *</Label>
              <Select onValueChange={(value) => setValue('cfdi_use', value)}>
                <SelectTrigger className={errors.cfdi_use ? 'border-red-500' : ''}>
                  <SelectValue placeholder={t('register.cfdiUse.placeholder')} />
                </SelectTrigger>
                <SelectContent>
                  {USOS_CFDI.map((uso) => (
                    <SelectItem key={uso.code} value={uso.code}>
                      {uso.code} - {uso.description}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {errors.cfdi_use && (
                <p className="text-sm text-red-500">{errors.cfdi_use.message}</p>
              )}
            </div>
          </div>
        </div>

        <Button
          type="submit"
          className="w-full"
          disabled={isLoading}
        >
          {isLoading ? (
            <>
              <div className="mr-2 h-4 w-4 animate-spin rounded-full border-2 border-current border-t-transparent" />
              {t('auth.creatingAccount')}
            </>
          ) : (
            t('register.createAccountButton')
          )}
        </Button>
      </form>
    </div>
  )
} 




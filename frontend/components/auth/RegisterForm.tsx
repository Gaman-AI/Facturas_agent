'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { Eye, EyeOff, UserPlus, AlertCircle, Building2, MapPin, FileText } from 'lucide-react';
import Link from 'next/link';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { LoadingSpinner } from '@/components/ui/loading-spinner';

import { useAuth } from '@/hooks/useAuth';
import { registerSchema, RegisterFormData, validateRFC } from '@/lib/validation';
import { REGIMENES_FISCALES, USOS_CFDI } from '@/types/cfdi';

export const RegisterForm: React.FC = () => {
  const [showPassword, setShowPassword] = useState(false);
  const [mounted, setMounted] = useState(false);
  const [rfcValidation, setRfcValidation] = useState<{ isValid: boolean; type: 'fisica' | 'moral' | 'unknown' }>({ 
    isValid: false, 
    type: 'unknown' 
  });
  const { register: registerUser, loading, error, clearError } = useAuth();
  const router = useRouter();

  // Prevent hydration mismatch
  useEffect(() => {
    setMounted(true);
  }, []);

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
    watch,
    setValue,
  } = useForm<RegisterFormData>({
    resolver: zodResolver(registerSchema),
    defaultValues: {
      email: '',
      password: '',
      rfc: '',
      razon_social: '',
      calle: '',
      numero_ext: '',
      numero_int: '',
      colonia: '',
      delegacion_municipio: '',
      codigo_postal: '',
      estado: '',
      regimen_fiscal: '',
      uso_cfdi: '',
    },
  });

  const watchedRFC = watch('rfc');

  // Validate RFC on change
  const handleRFCChange = (value: string) => {
    const validation = validateRFC(value);
    setRfcValidation(validation);
    setValue('rfc', value.toUpperCase());
  };

  const onSubmit = async (data: RegisterFormData) => {
    try {
      clearError();
      await registerUser(data.email, data.password);
      router.push('/dashboard');
    } catch (error) {
      console.error('Registration error:', error);
      // Error is already handled by the auth context
    }
  };

  const togglePasswordVisibility = () => {
    setShowPassword(!showPassword);
  };

  // Filter regimens based on RFC type
  const availableRegimens = REGIMENES_FISCALES.filter(regimen => 
    regimen.type === rfcValidation.type || regimen.type === 'both'
  );

  // Filter CFDI uses based on RFC type
  const availableUsosCFDI = USOS_CFDI.filter(uso => 
    uso.applicable_to === rfcValidation.type || uso.applicable_to === 'both'
  );

  if (!mounted) {
    return null; // Prevent hydration mismatch
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-50 to-slate-100 px-4 py-8">
      <Card className="w-full max-w-5xl shadow-lg">
        <CardHeader className="text-center space-y-4">
          <div className="mx-auto w-16 h-16 bg-primary rounded-full flex items-center justify-center">
            <UserPlus className="w-8 h-8 text-primary-foreground" />
          </div>
          <div>
            <CardTitle className="text-2xl font-bold text-slate-900">
              Registro
            </CardTitle>
            <CardDescription className="text-slate-600">
              Completa tus datos para comenzar a usar el sistema
            </CardDescription>
          </div>
        </CardHeader>

        <CardContent className="space-y-6">
          {/* Error Alert */}
          {error && (
            <Alert variant="destructive">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}

          <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
            {/* Authentication Section */}
            <div className="space-y-4">
              <div className="flex items-center space-x-2">
                <UserPlus className="w-5 h-5 text-primary" />
                <h3 className="text-lg font-semibold text-slate-900">Datos de Acceso</h3>
              </div>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="email">Email</Label>
                  <Input
                    id="email"
                    type="email"
                    placeholder="tu@email.com"
                    {...register('email')}
                    disabled={loading || isSubmitting}
                    className={errors.email ? 'border-red-500' : ''}
                  />
                  {errors.email && (
                    <p className="text-sm text-red-600">{errors.email.message}</p>
                  )}
                </div>

                <div className="space-y-2">
                  <Label htmlFor="password">ContraseÃ±a</Label>
                  <div className="relative">
                    <Input
                      id="password"
                      type={showPassword ? 'text' : 'password'}
                      placeholder="Tu contraseÃ±a"
                      {...register('password')}
                      disabled={loading || isSubmitting}
                      className={errors.password ? 'border-red-500 pr-10' : 'pr-10'}
                    />
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      className="absolute right-0 top-0 h-full px-3 py-2 hover:bg-transparent"
                      onClick={togglePasswordVisibility}
                      disabled={loading || isSubmitting}
                    >
                      {showPassword ? (
                        <EyeOff className="h-4 w-4 text-slate-400" />
                      ) : (
                        <Eye className="h-4 w-4 text-slate-400" />
                      )}
                    </Button>
                  </div>
                  {errors.password && (
                    <p className="text-sm text-red-600">{errors.password.message}</p>
                  )}
                </div>
              </div>
            </div>

            {/* CFDI Information Section */}
            <div className="space-y-4">
              <div className="flex items-center space-x-2">
                <Building2 className="w-5 h-5 text-primary" />
                <h3 className="text-lg font-semibold text-slate-900">InformaciÃ³n Fiscal</h3>
              </div>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="rfc">RFC</Label>
                  <Input
                    id="rfc"
                    placeholder="XAXX010101000"
                    {...register('rfc')}
                    onChange={(e) => handleRFCChange(e.target.value)}
                    disabled={loading || isSubmitting}
                    className={errors.rfc ? 'border-red-500' : rfcValidation.isValid ? 'border-green-500' : ''}
                  />
                  {errors.rfc && (
                    <p className="text-sm text-red-600">{errors.rfc.message}</p>
                  )}
                  {rfcValidation.isValid && (
                    <p className="text-sm text-green-600">
                      RFC vÃ¡lido - {rfcValidation.type === 'fisica' ? 'Persona FÃ­sica' : 'Persona Moral'}
                    </p>
                  )}
                </div>

                <div className="space-y-2">
                  <Label htmlFor="razon_social">RazÃ³n Social</Label>
                  <Input
                    id="razon_social"
                    placeholder="Nombre de la empresa"
                    {...register('razon_social')}
                    disabled={loading || isSubmitting}
                    className={errors.razon_social ? 'border-red-500' : ''}
                  />
                  {errors.razon_social && (
                    <p className="text-sm text-red-600">{errors.razon_social.message}</p>
                  )}
                </div>
              </div>
            </div>

            {/* Address Section */}
            <div className="space-y-4">
              <div className="flex items-center space-x-2">
                <MapPin className="w-5 h-5 text-primary" />
                <h3 className="text-lg font-semibold text-slate-900">DirecciÃ³n Fiscal</h3>
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="calle">Calle</Label>
                <Input
                  id="calle"
                  placeholder="Av. Insurgentes Sur"
                  {...register('calle')}
                  disabled={loading || isSubmitting}
                  className={errors.calle ? 'border-red-500' : ''}
                />
                {errors.calle && (
                  <p className="text-sm text-red-600">{errors.calle.message}</p>
                )}
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="numero_ext">NÃºmero Exterior</Label>
                  <Input
                    id="numero_ext"
                    placeholder="123"
                    {...register('numero_ext')}
                    disabled={loading || isSubmitting}
                    className={errors.numero_ext ? 'border-red-500' : ''}
                  />
                  {errors.numero_ext && (
                    <p className="text-sm text-red-600">{errors.numero_ext.message}</p>
                  )}
                </div>

                <div className="space-y-2">
                  <Label htmlFor="numero_int">NÃºmero Interior</Label>
                  <Input
                    id="numero_int"
                    placeholder="4B (opcional)"
                    {...register('numero_int')}
                    disabled={loading || isSubmitting}
                    className={errors.numero_int ? 'border-red-500' : ''}
                  />
                  {errors.numero_int && (
                    <p className="text-sm text-red-600">{errors.numero_int.message}</p>
                  )}
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="colonia">Colonia</Label>
                  <Input
                    id="colonia"
                    placeholder="Del Valle"
                    {...register('colonia')}
                    disabled={loading || isSubmitting}
                    className={errors.colonia ? 'border-red-500' : ''}
                  />
                  {errors.colonia && (
                    <p className="text-sm text-red-600">{errors.colonia.message}</p>
                  )}
                </div>

                <div className="space-y-2">
                  <Label htmlFor="delegacion_municipio">DelegaciÃ³n/Municipio</Label>
                  <Input
                    id="delegacion_municipio"
                    placeholder="Benito JuÃ¡rez"
                    {...register('delegacion_municipio')}
                    disabled={loading || isSubmitting}
                    className={errors.delegacion_municipio ? 'border-red-500' : ''}
                  />
                  {errors.delegacion_municipio && (
                    <p className="text-sm text-red-600">{errors.delegacion_municipio.message}</p>
                  )}
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="codigo_postal">CÃ³digo Postal</Label>
                  <Input
                    id="codigo_postal"
                    placeholder="03100"
                    {...register('codigo_postal')}
                    disabled={loading || isSubmitting}
                    className={errors.codigo_postal ? 'border-red-500' : ''}
                  />
                  {errors.codigo_postal && (
                    <p className="text-sm text-red-600">{errors.codigo_postal.message}</p>
                  )}
                </div>

                <div className="space-y-2">
                  <Label htmlFor="estado">Estado</Label>
                  <Input
                    id="estado"
                    type="text"
                    placeholder="Ingresa el estado (ej: Ciudad de México, Jalisco)"
                    {...register('estado', { 
                      required: 'El estado es requerido',
                      minLength: { value: 2, message: 'El estado debe tener al menos 2 caracteres' }
                    })}
                    className={errors.estado ? 'border-red-500' : ''}
                    disabled={loading || isSubmitting}
                  />
                  {errors.estado && (
                    <p className="text-sm text-red-600">{errors.estado.message}</p>
                  )}
                </div>
              </div>
            </div>

            {/* CFDI Configuration Section */}
            <div className="space-y-4">
              <div className="flex items-center space-x-2">
                <FileText className="w-5 h-5 text-primary" />
                <h3 className="text-lg font-semibold text-slate-900">ConfiguraciÃ³n CFDI</h3>
              </div>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="regimen_fiscal">RÃ©gimen Fiscal</Label>
                  <Select
                    onValueChange={(value) => setValue('regimen_fiscal', value)}
                    disabled={loading || isSubmitting || !rfcValidation.isValid}
                  >
                    <SelectTrigger className={errors.regimen_fiscal ? 'border-red-500' : ''}>
                      <SelectValue placeholder="Selecciona un rÃ©gimen fiscal" />
                    </SelectTrigger>
                    <SelectContent>
                      {availableRegimens.map((regimen) => (
                        <SelectItem key={regimen.code} value={regimen.code}>
                          {regimen.code} - {regimen.description}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  {errors.regimen_fiscal && (
                    <p className="text-sm text-red-600">{errors.regimen_fiscal.message}</p>
                  )}
                </div>

                <div className="space-y-2">
                  <Label htmlFor="uso_cfdi">Uso de CFDI</Label>
                  <Select
                    onValueChange={(value) => setValue('uso_cfdi', value)}
                    disabled={loading || isSubmitting || !rfcValidation.isValid}
                  >
                    <SelectTrigger className={errors.uso_cfdi ? 'border-red-500' : ''}>
                      <SelectValue placeholder="Selecciona un uso de CFDI" />
                    </SelectTrigger>
                    <SelectContent>
                      {availableUsosCFDI.map((uso) => (
                        <SelectItem key={uso.code} value={uso.code}>
                          {uso.code} - {uso.description}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  {errors.uso_cfdi && (
                    <p className="text-sm text-red-600">{errors.uso_cfdi.message}</p>
                  )}
                </div>
              </div>
            </div>

            {/* Submit Button */}
            <Button
              type="submit"
              className="w-full"
              disabled={loading || isSubmitting}
            >
              {loading || isSubmitting ? (
                <>
                  <LoadingSpinner size="sm" className="mr-2" />
                  Registrando...
                </>
              ) : (
                'Registrarse'
              )}
            </Button>
          </form>

          {/* Login Link */}
          <div className="text-center">
            <p className="text-sm text-slate-600">
              Â¿Ya tienes cuenta?{' '}
              <Link
                href="/login"
                className="font-medium text-primary hover:underline"
              >
                Inicia sesiÃ³n
              </Link>
            </p>
          </div>
        </CardContent>
      </Card>

      {/* Footer */}
      <div className="fixed bottom-0 left-0 right-0 p-4 text-center bg-white/90 backdrop-blur-sm border-t">
        <p className="text-sm text-slate-600">
          Desarrollado por{' '}
          <a
            href="https://gaman.ai"
            target="_blank"
            rel="noopener noreferrer"
            className="font-medium text-primary hover:underline"
          >
            Gaman.ai
          </a>{' '}
          Â© 2025
        </p>
      </div>
    </div>
  );
}; 




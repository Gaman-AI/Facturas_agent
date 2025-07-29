'use client'

import { RegisterForm } from '@/components/auth/RegisterForm'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import Link from 'next/link'
import { useLanguage } from '@/contexts/LanguageContext'

export default function RegisterPage() {
  const { t } = useLanguage()

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-50 to-slate-100 p-4">
      <Card className="w-full max-w-2xl">
        <CardHeader className="text-center">
          <CardTitle className="text-2xl font-bold">{t('register.title')}</CardTitle>
          <CardDescription>
            {t('register.subtitle')}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <RegisterForm />
          <div className="mt-6 text-center">
            <p className="text-sm text-slate-600">
              {t('auth.hasAccount')}{' '}
              <Link 
                href="/login" 
                className="font-medium text-primary hover:underline"
              >
                {t('auth.loginHere')}
              </Link>
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  )
} 
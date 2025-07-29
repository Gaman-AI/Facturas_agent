'use client'

import { LoginForm } from '@/components/auth/LoginForm'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import Link from 'next/link'
import { useLanguage } from '@/contexts/LanguageContext'

export default function LoginPage() {
  const { t } = useLanguage()

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-50 to-slate-100 p-4">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <CardTitle className="text-2xl font-bold">{t('login.title')}</CardTitle>
          <CardDescription>
            {t('login.subtitle')}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <LoginForm />
          <div className="mt-6 text-center">
            <p className="text-sm text-slate-600">
              {t('auth.noAccount')}{' '}
              <Link 
                href="/register" 
                className="font-medium text-primary hover:underline"
              >
                {t('auth.registerHere')}
              </Link>
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  )
} 
'use client'

import { RegisterForm } from '@/components/auth/RegisterForm'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import Link from 'next/link'
import { useLanguage } from '@/contexts/LanguageContext'
import { UserPlus } from 'lucide-react'

export default function RegisterPage() {
  const { t } = useLanguage();

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-teal-50 via-teal-100 to-teal-200 p-4">
      <Card className="w-full max-w-4xl border-0 shadow-xl bg-white/80 backdrop-blur-sm">
        <CardHeader className="text-center pb-6">
          <div className="w-16 h-16 bg-teal-500 rounded-xl flex items-center justify-center mx-auto mb-4 shadow-lg">
            <UserPlus className="w-8 h-8 text-white" />
          </div>
          <CardTitle className="text-2xl font-bold text-teal-800">{t('register.title')}</CardTitle>
          <CardDescription className="text-teal-600">
            {t('register.description')}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <RegisterForm />
          <div className="pt-4 border-t border-border">
            <p className="text-sm text-muted-foreground text-center">
              {t('register.alreadyHaveAccount')}{' '}
              <Link 
                href="/login" 
                className="font-medium text-[#164F5B] hover:text-[#0f3a42] hover:underline transition-colors"
              >
                {t('register.loginHere')}
              </Link>
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
} 
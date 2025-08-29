'use client'

import { LoginForm } from '@/components/auth/LoginForm'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import Link from 'next/link'
import { useLanguage } from '@/contexts/LanguageContext'
import { Lock } from 'lucide-react'
import { useRouter } from 'next/navigation'

export default function LoginPage() {
  const { t } = useLanguage();
  const router = useRouter();

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-teal-50 via-teal-100 to-teal-200 p-4">
      <Card className="w-full max-w-md border-0 shadow-xl bg-white/80 backdrop-blur-sm">
        <CardHeader className="text-center pb-6">
          <div className="w-16 h-16 bg-teal-500 rounded-xl flex items-center justify-center mx-auto mb-4 shadow-lg">
            <Lock className="w-8 h-8 text-white" />
          </div>
          <CardTitle className="text-2xl font-bold text-teal-800">{t('login.title')}</CardTitle>
          <CardDescription className="text-teal-600">
            {t('login.description')}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <LoginForm />
          <div className="pt-4 border-t border-teal-200">
            <p className="text-sm text-teal-600 text-center">
              {t('login.noAccount')}{' '}
              <Link 
                href="/register" 
                className="font-medium text-[#164F5B] hover:text-[#0f3a42] hover:underline transition-colors"
              >
                {t('login.registerHere')}
              </Link>
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
} 
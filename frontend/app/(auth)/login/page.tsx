'use client'

import { LoginForm } from '@/components/auth/LoginForm'
import Link from 'next/link'
import { useLanguage } from '@/contexts/LanguageContext'

export default function LoginPage() {
  const { t } = useLanguage()

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-50 via-blue-50 to-slate-100 p-4">
      <div className="w-full max-w-md text-center bg-white rounded-lg shadow-lg border border-blue-200 p-8">
        <div className="pb-6">
          <div className="w-16 h-16 bg-gradient-to-r from-blue-500 to-indigo-500 rounded-full flex items-center justify-center mx-auto mb-4">
            <svg className="w-8 h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
            </svg>
          </div>
          <h1 className="text-2xl font-bold text-slate-900 mb-2">{t('login.title')}</h1>
          <p className="text-slate-600">
            {t('login.subtitle')}
          </p>
        </div>
        <div className="space-y-6">
          <LoginForm />
          <div className="pt-4 border-t border-slate-200">
            <p className="text-sm text-slate-600 text-center">
              {t('auth.noAccount')}{' '}
              <Link 
                href="/register" 
                className="font-medium text-blue-600 hover:text-blue-700 hover:underline transition-colors"
              >
                {t('auth.registerHere')}
              </Link>
            </p>
          </div>
        </div>
      </div>
    </div>
  )
} 
'use client'

import { RegisterForm } from '@/components/auth/RegisterForm'
import Link from 'next/link'
import { useLanguage } from '@/contexts/LanguageContext'

export default function RegisterPage() {
  const { t } = useLanguage()

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-50 to-slate-100 p-4">
      <div className="w-full max-w-2xl text-center bg-white rounded-lg shadow-lg border border-blue-200 p-8">
        <div className="mb-6">
          <div className="w-16 h-16 bg-gradient-to-r from-blue-500 to-purple-500 rounded-full flex items-center justify-center mx-auto mb-4">
            <svg className="w-8 h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M18 9v3m0 0v3m0-3h3m-3 0h-3m-2-5a4 4 0 11-8 0 4 4 0 018 0zM3 20a6 6 0 0112 0v1H3v-1z" />
            </svg>
          </div>
          <h1 className="text-2xl font-bold text-slate-900 mb-2">{t('register.title')}</h1>
          <p className="text-slate-600">
            {t('register.subtitle')}
          </p>
        </div>
        <div>
          <RegisterForm />
          <div className="mt-6 text-center">
            <p className="text-sm text-slate-600">
              {t('auth.hasAccount')}{' '}
              <Link 
                href="/login" 
                className="font-medium text-blue-600 hover:text-blue-700 hover:underline transition-colors"
              >
                {t('auth.loginHere')}
              </Link>
            </p>
          </div>
        </div>
      </div>
    </div>
  )
} 
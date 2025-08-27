'use client'

import { LoginForm } from '@/components/auth/LoginForm'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import Link from 'next/link'
import { useLanguage } from '@/contexts/LanguageContext'
import { Lock } from 'lucide-react'

export default function LoginPage() {
  const { t } = useLanguage()

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-theme-50 via-theme-100 to-theme-200 p-4">
      <div className="w-full max-w-md">
        <div className="w-16 h-16 bg-gradient-to-r from-theme-500 to-theme-600 rounded-xl flex items-center justify-center mx-auto mb-4 shadow-lg">
          <Lock className="w-8 h-8 text-white" />
        </div>
        
        <div className="bg-white rounded-2xl shadow-xl p-8 border border-theme-200/50">
          <div className="text-center mb-8">
            <h1 className="text-2xl font-bold text-theme-800 mb-2">Login</h1>
            <p className="text-theme-600">Access your CFDI 4.0 System account</p>
          </div>

          <LoginForm />

          <div className="text-center mt-6">
            <p className="text-theme-600">
              Don't have an account?{' '}
              <Link 
                href="/register" 
                className="font-medium text-theme-600 hover:text-theme-700 hover:underline transition-colors"
              >
                Register here
              </Link>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
} 
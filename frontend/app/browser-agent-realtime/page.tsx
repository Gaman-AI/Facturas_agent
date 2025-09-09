'use client'

import { SimpleTaskSubmissionPane } from '@/components/SimpleTaskSubmissionPane';
import { ProtectedRoute } from '@/components/auth/ProtectedRoute';
import { useLanguage } from '@/contexts/LanguageContext';
import { LanguageToggle } from '@/components/LanguageToggle';

export default function CFDITaskPage() {
  const { t } = useLanguage();
  
  return (
    <ProtectedRoute>
      <div className="min-h-screen bg-gray-50 p-6">
        {/* Language Toggle */}
        <div className="absolute top-4 right-4 z-10">
          <LanguageToggle />
        </div>
        
        <div className="max-w-6xl mx-auto">
          <div className="mb-8">
            <h1 className="text-3xl font-bold text-gray-900">{t('tasks.title')}</h1>
            <p className="text-gray-600 mt-2">
              {t('tasks.automationDescription', 'Automatice la solicitud de facturas CFDI en portales de proveedores de manera inteligente')}
            </p>
          </div>
          
          <SimpleTaskSubmissionPane />
        </div>
      </div>
    </ProtectedRoute>
  );
} 
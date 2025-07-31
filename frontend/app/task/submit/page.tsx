'use client'

import { SimpleTaskSubmission } from '@/components/SimpleTaskSubmission'
import { ProtectedRoute } from '@/components/auth/ProtectedRoute'
import { useLanguage } from '@/contexts/LanguageContext'
import { ArrowLeft } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { useRouter } from 'next/navigation'

export default function TaskSubmitPage() {
  const { t } = useLanguage()
  const router = useRouter()

  return (
    <ProtectedRoute>
      <div className="min-h-screen bg-slate-50">
        {/* Header */}
        <header className="bg-white shadow-sm border-b">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="flex items-center h-16">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => router.back()}
                className="mr-4"
              >
                <ArrowLeft className="w-4 h-4 mr-2" />
                {t('common.back', 'Back')}
              </Button>
              <h1 className="text-xl font-semibold text-slate-900">
                {t('tasks.simple.pageTitle', 'Create New Task')}
              </h1>
            </div>
          </div>
        </header>

        {/* Main Content */}
        <main className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <div className="mb-6">
            <h2 className="text-2xl font-bold text-slate-900 mb-2">
              {t('tasks.simple.welcomeTitle', 'What would you like to automate?')}
            </h2>
            <p className="text-slate-600">
              {t('tasks.simple.welcomeDescription', 'Describe your task in plain language and let our AI browser agent handle the rest.')}
            </p>
          </div>

          <SimpleTaskSubmission showRedirect={true} />

          {/* Help Section */}
          <div className="mt-8 bg-white rounded-lg p-6 shadow-sm border">
            <h3 className="text-lg font-semibold mb-4">
              {t('tasks.simple.helpTitle', 'How it works')}
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="text-center">
                <div className="w-12 h-12 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-3">
                  <span className="text-blue-600 font-semibold">1</span>
                </div>
                <h4 className="font-medium mb-2">
                  {t('tasks.simple.step1Title', 'Describe Your Task')}
                </h4>
                <p className="text-sm text-slate-600">
                  {t('tasks.simple.step1Description', 'Tell us what you want to accomplish in natural language')}
                </p>
              </div>
              <div className="text-center">
                <div className="w-12 h-12 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-3">
                  <span className="text-green-600 font-semibold">2</span>
                </div>
                <h4 className="font-medium mb-2">
                  {t('tasks.simple.step2Title', 'AI Agent Executes')}
                </h4>
                <p className="text-sm text-slate-600">
                  {t('tasks.simple.step2Description', 'Our browser agent navigates and performs actions automatically')}
                </p>
              </div>
              <div className="text-center">
                <div className="w-12 h-12 bg-purple-100 rounded-full flex items-center justify-center mx-auto mb-3">
                  <span className="text-purple-600 font-semibold">3</span>
                </div>
                <h4 className="font-medium mb-2">
                  {t('tasks.simple.step3Title', 'Get Results')}
                </h4>
                <p className="text-sm text-slate-600">
                  {t('tasks.simple.step3Description', 'Monitor progress in real-time and receive your results')}
                </p>
              </div>
            </div>
          </div>

          {/* Example Tasks */}
          <div className="mt-8 bg-gradient-to-r from-blue-50 to-indigo-50 rounded-lg p-6 border border-blue-200">
            <h3 className="text-lg font-semibold mb-4 text-blue-900">
              {t('tasks.simple.examplesTitle', 'Example Tasks')}
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <div className="flex items-start space-x-3">
                <div className="w-2 h-2 bg-blue-500 rounded-full mt-2"></div>
                <p className="text-sm text-blue-800">
                  {t('tasks.simple.example1', 'Search for product reviews and compare prices across e-commerce sites')}
                </p>
              </div>
              <div className="flex items-start space-x-3">
                <div className="w-2 h-2 bg-blue-500 rounded-full mt-2"></div>
                <p className="text-sm text-blue-800">
                  {t('tasks.simple.example2', 'Gather contact information from business directories')}
                </p>
              </div>
              <div className="flex items-start space-x-3">
                <div className="w-2 h-2 bg-blue-500 rounded-full mt-2"></div>
                <p className="text-sm text-blue-800">
                  {t('tasks.simple.example3', 'Fill out forms and submit applications automatically')}
                </p>
              </div>
              <div className="flex items-start space-x-3">
                <div className="w-2 h-2 bg-blue-500 rounded-full mt-2"></div>
                <p className="text-sm text-blue-800">
                  {t('tasks.simple.example4', 'Monitor websites for changes and updates')}
                </p>
              </div>
            </div>
          </div>
        </main>
      </div>
    </ProtectedRoute>
  )
}
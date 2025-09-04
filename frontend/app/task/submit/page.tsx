'use client'

import { SimpleTaskSubmissionPane } from '@/components/SimpleTaskSubmissionPane'
import { ProtectedRoute } from '@/components/auth/ProtectedRoute'
import { useLanguage } from '@/contexts/LanguageContext'
import { ArrowLeft } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { useRouter } from 'next/navigation'
import { Card, CardContent, CardHeader } from '@/components/ui/card'
import { LanguageToggle } from '@/components/LanguageToggle'

export default function TaskSubmitPage() {
  const { t } = useLanguage();

  return (
    <div className="min-h-screen bg-gradient-to-br from-teal-50 via-teal-100 to-teal-200">
      {/* Language Toggle */}
      <div className="absolute top-4 right-4 z-10">
        <LanguageToggle />
      </div>
      
      <div className="max-w-4xl mx-auto p-6">
        <div className="mb-8">
          <h1 className="text-xl font-semibold text-teal-800">
            {t('tasks.submit.title', 'Submit New Task')}
          </h1>
        </div>

        <div className="space-y-6">
          <Card className="border-0 shadow-xl bg-white/80 backdrop-blur-sm">
            <CardHeader>
              <h2 className="text-2xl font-bold text-teal-800 mb-2">
                {t('tasks.submit.createTask', 'Create New Task')}
              </h2>
              <p className="text-teal-600">
                {t('tasks.submit.description', 'Submit a new automation task to the system.')}
              </p>
            </CardHeader>
            <CardContent>
              <SimpleTaskSubmissionPane />
            </CardContent>
          </Card>

          <Card className="border-0 shadow-xl bg-white/80 backdrop-blur-sm">
            <CardHeader>
              <h2 className="text-lg font-medium text-teal-700 mb-2">
                {t('tasks.submit.instructions', 'Instructions')}
              </h2>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <h3 className="font-medium text-teal-700 mb-2">
                  {t('tasks.submit.howToUse', 'How to Use')}
                </h3>
                <p className="text-sm text-teal-600">
                  {t('tasks.submit.howToUseDesc', 'Describe your task in detail. Be specific about what you want the AI to accomplish.')}
                </p>
              </div>
              
              <div>
                <h3 className="font-medium text-teal-700 mb-2">
                  {t('tasks.submit.examples', 'Examples')}
                </h3>
                <p className="text-sm text-teal-600">
                  {t('tasks.submit.examplesDesc', 'Good examples include: "Fill out the CFDI form with company details", "Navigate to the vendor website and extract invoice information"')}
                </p>
              </div>
              
              <div>
                <h3 className="font-medium text-teal-700 mb-2">
                  {t('tasks.submit.tips', 'Tips')}
                </h3>
                <p className="text-sm text-teal-600">
                  {t('tasks.submit.tipsDesc', 'Provide context, specify URLs if needed, and mention any specific requirements or constraints.')}
                </p>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
'use client'

import { useState, useEffect } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { ProtectedRoute } from '@/components/auth/ProtectedRoute'
import { useLanguage } from '@/contexts/LanguageContext'
import { Button } from '@/components/ui/button'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { ArrowLeft, ExternalLink, Loader2, AlertCircle } from 'lucide-react'
import { DualPaneMonitor } from '@/components/DualPaneMonitor'
import ApiService from '@/services/api'

export default function TaskMonitorPage() {
  const { t } = useLanguage()
  const router = useRouter()
  const params = useParams()
  const taskId = params.id as string

  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [sessionId, setSessionId] = useState<string>()
  const [liveViewUrl, setLiveViewUrl] = useState<string>()
  const [taskStatus, setTaskStatus] = useState<'pending' | 'running' | 'paused' | 'completed' | 'failed' | 'connecting'>('connecting')

  useEffect(() => {
    const loadTaskData = async () => {
      try {
        setIsLoading(true)
        setError(null)

        // Check if this is a demo task
        if (taskId.startsWith('demo_')) {
          // Demo mode - create mock data
          setTaskStatus('running')
          setSessionId(`demo_session_${taskId}`)
          setLiveViewUrl('https://www.browserbase.com/sessions/demo')
          setIsLoading(false)
          return
        }

        // Fetch real task data from API
        const taskResponse = await ApiService.getBrowserUseTask(taskId).catch(error => {
          console.warn('Task endpoint error:', error)
          return { success: false, error: error.message }
        })

        // Note: Session management is not implemented yet, using task data only
        const sessionResponse = null

        // Handle task data
        if (taskResponse && taskResponse.success) {
          const task = taskResponse.data
          setTaskStatus(task.status as any)
          
          // Session management not implemented - use local execution mode
          // For local browser execution, we don't need live view URLs
          setSessionId(`local_session_${taskId}`)
          setLiveViewUrl(null) // No live view for local browser execution
        } else {
          // If task fetch failed, show error
          const errorMessage = taskResponse?.error || 'Task not found or API unavailable'
          throw new Error(errorMessage)
        }
        
        setIsLoading(false)
      } catch (error) {
        console.error('Failed to load task data:', error)
        setError(error instanceof Error ? error.message : 'Failed to load task data')
        setIsLoading(false)
      }
    }

    if (taskId) {
      loadTaskData()
    }
  }, [taskId])

  const handleBackToDashboard = () => {
    router.push('/dashboard')
  }

  const handleGoToLegacyMonitor = () => {
    router.push('/browser-agent-realtime')
  }

  if (isLoading) {
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
                  onClick={handleBackToDashboard}
                  className="mr-4"
                >
                  <ArrowLeft className="w-4 h-4 mr-2" />
                  {t('common.back', 'Back')}
                </Button>
                <h1 className="text-xl font-semibold text-slate-900">
                  {t('tasks.monitor.title', 'Task Monitor')}
                </h1>
              </div>
            </div>
          </header>

          {/* Loading State */}
          <main className="flex items-center justify-center py-20">
            <div className="text-center">
              <Loader2 className="w-8 h-8 animate-spin mx-auto mb-4 text-primary" />
              <p className="text-slate-600">
                {t('tasks.monitor.loading', 'Loading task monitoring interface...')}
              </p>
            </div>
          </main>
        </div>
      </ProtectedRoute>
    )
  }

  if (error) {
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
                  onClick={handleBackToDashboard}
                  className="mr-4"
                >
                  <ArrowLeft className="w-4 h-4 mr-2" />
                  {t('common.back', 'Back')}
                </Button>
                <h1 className="text-xl font-semibold text-slate-900">
                  {t('tasks.monitor.title', 'Task Monitor')}
                </h1>
              </div>
            </div>
          </header>

          {/* Error State */}
          <main className="max-w-2xl mx-auto px-4 sm:px-6 lg:px-8 py-20">
            <Alert variant="destructive">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>
                {t('tasks.monitor.error', 'Failed to load task monitoring interface')}: {error}
              </AlertDescription>
            </Alert>
            
            <div className="mt-6 space-y-3">
              <Button onClick={handleBackToDashboard} className="w-full">
                {t('common.backToDashboard', 'Back to Dashboard')}
              </Button>
              
              <Button onClick={handleGoToLegacyMonitor} variant="outline" className="w-full">
                <ExternalLink className="w-4 h-4 mr-2" />
                {t('tasks.monitor.useLegacy', 'Use Legacy Monitor')}
              </Button>
            </div>
          </main>
        </div>
      </ProtectedRoute>
    )
  }

  return (
    <ProtectedRoute>
      <div className="min-h-screen bg-slate-50 flex flex-col">
        {/* Header */}
        <header className="bg-white shadow-sm border-b flex-shrink-0">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="flex items-center justify-between h-16">
              <div className="flex items-center">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={handleBackToDashboard}
                  className="mr-4"
                >
                  <ArrowLeft className="w-4 h-4 mr-2" />
                  {t('common.back', 'Back')}
                </Button>
                <h1 className="text-xl font-semibold text-slate-900">
                  {t('tasks.monitor.title', 'Task Monitor')}
                </h1>
              </div>
              
              <div className="flex items-center gap-2">
                <Button 
                  size="sm" 
                  variant="outline" 
                  onClick={handleGoToLegacyMonitor}
                  className="hidden sm:flex"
                >
                  <ExternalLink className="w-4 h-4 mr-2" />
                  {t('tasks.monitor.legacyView', 'Legacy View')}
                </Button>
              </div>
            </div>
          </div>
        </header>

        {/* Dual Pane Monitor */}
        <main className="flex-1 relative">
          <DualPaneMonitor
            taskId={taskId}
            sessionId={sessionId}
            liveViewUrl={liveViewUrl}
            initialStatus={taskStatus}
            className="h-full"
          />
        </main>
      </div>
    </ProtectedRoute>
  )
}
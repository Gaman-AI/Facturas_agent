'use client'

import { useState, useEffect } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { ProtectedRoute } from '@/components/auth/ProtectedRoute'
import { useLanguage } from '@/contexts/LanguageContext'
import { Button } from '@/components/ui/button'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { ArrowLeft, ExternalLink, Loader2, AlertCircle } from 'lucide-react'
import ApiService from '@/services/api'
import { Card, CardHeader } from '@/components/ui/card'

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
  const [task, setTask] = useState<any>(null)

  useEffect(() => {
    const loadTaskData = async () => {
      try {
        // Ensure taskId is valid before proceeding
        if (!taskId || taskId === 'undefined') {
          throw new Error('Invalid task ID')
        }

        setIsLoading(true)
        setError(null)

        // Check if this is a demo task
        if (taskId.startsWith('demo_')) {
          // Demo mode - create mock data
          setTaskStatus('running')
          setSessionId(`demo_session_${taskId}`)
          setLiveViewUrl(undefined) // Use local browser automation for demo
          setIsLoading(false)
          return
        }

        console.log('🔍 Loading task data for:', taskId)

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
          console.log('✅ Task data loaded:', task)
          setTask(task)
          setTaskStatus(task.status as any)
          
          // Set up local browser automation session
          setSessionId(`local_session_${taskId}`)
          setLiveViewUrl(undefined) // No live view URL for local browser automation
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

    if (taskId && taskId !== 'undefined') {
      loadTaskData()
    } else {
      console.warn('⚠️ Invalid taskId:', taskId)
      setError('Invalid task ID')
      setIsLoading(false)
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
        <div className="min-h-screen bg-gradient-to-br from-teal-50 via-teal-100 to-teal-200">
          <div className="max-w-4xl mx-auto p-6">
            <div className="text-center">
              <Loader2 className="w-8 h-8 animate-spin mx-auto mb-4 text-teal-500" />
              <h1 className="text-xl font-semibold text-teal-800">
                Loading Task...
              </h1>
              <p className="text-teal-600">
                Please wait while we fetch the task details.
              </p>
            </div>
          </div>
        </div>
      </ProtectedRoute>
    )
  }

  if (error) {
    return (
      <ProtectedRoute>
        <div className="min-h-screen bg-gradient-to-br from-teal-50 via-teal-100 to-teal-200">
          <div className="max-w-4xl mx-auto p-6">
            <div className="text-center">
              <h1 className="text-xl font-semibold text-teal-800">
                Error Loading Task
              </h1>
              <p className="text-teal-600">
                {error}
              </p>
            </div>
          </div>
        </div>
      </ProtectedRoute>
    )
  }

  if (!task) {
    return (
      <ProtectedRoute>
        <div className="min-h-screen bg-gradient-to-br from-teal-50 via-teal-100 to-teal-200 flex flex-col">
          <div className="max-w-4xl mx-auto p-6 flex-1">
            <div className="text-center">
              <h1 className="text-xl font-semibold text-teal-800">
                Task Not Found
              </h1>
              <p className="text-teal-600">
                The task you're looking for doesn't exist or has been removed.
              </p>
            </div>
          </div>
        </div>
      </ProtectedRoute>
    )
  }

  return (
    <ProtectedRoute>
      <div className="min-h-screen bg-gradient-to-br from-teal-50 via-teal-100 to-teal-200">
        <div className="max-w-4xl mx-auto p-6">
          <div className="mb-6">
            <h1 className="text-xl font-semibold text-teal-800">
              Task Monitor
            </h1>
            <p className="text-teal-600">
              Monitor the progress of your automation task.
            </p>
          </div>

          <div className="space-y-6">
            <Card className="border-0 shadow-xl bg-white/80 backdrop-blur-sm">
              <CardHeader>
                <h2 className="text-lg font-medium text-teal-700 mb-2">Task Monitoring</h2>
                <p className="text-teal-500">Task ID: {taskId}</p>
                <p className="text-teal-500">Status: {taskStatus}</p>
              </CardHeader>
            </Card>
          </div>
        </div>
      </div>
    </ProtectedRoute>
  )
}
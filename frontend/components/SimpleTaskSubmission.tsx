'use client'

import React, { useState, useRef, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Textarea } from '@/components/ui/textarea'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Badge } from '@/components/ui/badge'
import { Loader2, Send, Zap, AlertCircle, Play } from 'lucide-react'
import { useAuth } from '@/hooks/useAuth'
import { useLanguage } from '@/contexts/LanguageContext'
import ApiService from '@/services/api'

interface SimpleTaskSubmissionProps {
  onTaskSubmit?: (taskId: string) => void
  showRedirect?: boolean
  className?: string
}

export function SimpleTaskSubmission({ 
  onTaskSubmit, 
  showRedirect = true,
  className = '' 
}: SimpleTaskSubmissionProps) {
  const { t } = useLanguage()
  const { user } = useAuth()
  const router = useRouter()
  
  const [task, setTask] = useState('')
  const [llmProvider, setLlmProvider] = useState<'openai' | 'anthropic' | 'google'>('openai')
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState<string | null>(null)
  const [isDemoMode, setIsDemoMode] = useState(false)
  const mountedRef = useRef(true)

  const characterLimit = 500
  const remainingChars = characterLimit - task.length

  // Cleanup effect to prevent state updates on unmounted component
  useEffect(() => {
    return () => {
      mountedRef.current = false
    }
  }, [])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    if (!task.trim()) {
      if (mountedRef.current) {
        setError(t('tasks.validation.taskRequired'))
      }
      return
    }

    if (task.length > characterLimit) {
      if (mountedRef.current) {
        setError(t('tasks.validation.taskTooLong'))
      }
      return
    }

    if (mountedRef.current) {
      setIsSubmitting(true)
      setError(null)
      setSuccess(null)
    }

    try {
      // Create a simple browser automation task
      const response = await ApiService.createBrowserUseTask({
        task: task,
        llm_provider: llmProvider,
        model: llmProvider === 'openai' ? 'gpt-4o' : 
               llmProvider === 'anthropic' ? 'claude-3-5-sonnet-20241022' : 
               'gemini-pro'
      })

      const taskId = response.data.task_id
      
      // Only update state if component is still mounted
      if (mountedRef.current) {
        setSuccess(t('tasks.success.created'))
        
        // Clear form
        setTask('')
        
        // Callback for parent component
        if (onTaskSubmit) {
          onTaskSubmit(taskId)
        }
        
        // Redirect to monitoring page
        if (showRedirect) {
          setTimeout(() => {
            if (mountedRef.current) {
              router.push(`/task/monitor/${taskId}`)
            }
          }, 1500)
        }
      }

    } catch (error: any) {
      console.error('Error creating task:', error)
      
      // Extract detailed error information
      let errorMessage = 'Unknown error occurred'
      
      if (error?.response?.data?.message) {
        errorMessage = error.response.data.message
      } else if (error?.response?.data?.error?.message) {
        errorMessage = error.response.data.error.message
      } else if (error?.message) {
        errorMessage = error.message
      }
      
      // Set error state with detailed message (only if mounted)
      if (mountedRef.current) {
        setError(errorMessage)
      }
      
      // Don't redirect on error to prevent React reconciliation issues
      console.log('Task creation failed, not redirecting')
    } finally {
      if (mountedRef.current) {
        setIsSubmitting(false)
      }
    }
  }

  const handleQuickFill = (quickTask: string) => {
    setTask(quickTask)
  }

  const quickTasks = [
    t('tasks.quick.searchGoogle'),
    t('tasks.quick.checkWeather'),
    t('tasks.quick.findProduct'),
    t('tasks.quick.socialMedia')
  ]

  return (
    <Card className={`w-full max-w-2xl mx-auto ${className}`}>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Zap className="w-5 h-5 text-primary" />
          {t('tasks.simple.title')}
        </CardTitle>
        <CardDescription>
          {t('tasks.simple.description')}
        </CardDescription>
      </CardHeader>
      
      <CardContent>
        {/* Demo Mode Toggle */}
        <div className="mb-4 p-3 bg-blue-50 border border-blue-200 rounded-lg">
          <div className="flex items-center justify-between">
            <div>
              <h4 className="font-medium text-blue-900">Demo Mode</h4>
              <p className="text-sm text-blue-700">Test the dual-pane interface without API setup</p>
            </div>
            <Button
              type="button"
              variant={isDemoMode ? "default" : "outline"}
              size="sm"
              onClick={() => {
                setIsDemoMode(!isDemoMode)
              }}
              className="flex items-center gap-2"
            >
              <Play className="w-4 h-4" />
              {isDemoMode ? 'Demo Active' : 'Enable Demo'}
            </Button>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Task Description */}
          <div className="space-y-2">
            <label className="text-sm font-medium">
              {t('tasks.simple.taskLabel')}
            </label>
            <Textarea
              value={task}
              onChange={(e) => {
                setTask(e.target.value)
              }}
              placeholder={t('tasks.simple.placeholder')}
              className="min-h-[100px] resize-none"
              disabled={isSubmitting}
              maxLength={characterLimit}
            />
            <div className="flex justify-between items-center text-xs text-muted-foreground">
              <span>{t('tasks.simple.hint')}</span>
              <span className={remainingChars < 50 ? 'text-red-500' : ''}>
                {remainingChars} characters remaining
              </span>
            </div>
          </div>

          {/* Quick Tasks */}
          <div className="space-y-2">
            <label className="text-sm font-medium">
              {t('tasks.simple.quickTasks')}
            </label>
            <div className="flex flex-wrap gap-2">
              {quickTasks.map((quickTask, index) => (
                <Button
                  key={`quick-task-${index}`}
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => handleQuickFill(quickTask)}
                  disabled={isSubmitting}
                  className="text-xs h-8"
                >
                  {quickTask.slice(0, 30)}...
                </Button>
              ))}
            </div>
          </div>

          {/* LLM Selector */}
          <div className="space-y-2">
            <label className="text-sm font-medium">{t('tasks.simple.aiModel')}</label>
            <Select 
              value={llmProvider} 
              onValueChange={(value: any) => {
                setLlmProvider(value)
              }}
            >
              <SelectTrigger disabled={isSubmitting}>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="openai">
                  <div className="flex items-center gap-2">
                    <Badge variant="default">OpenAI</Badge>
                    <span>GPT-4O (Recommended)</span>
                  </div>
                </SelectItem>
                <SelectItem value="anthropic">
                  <div className="flex items-center gap-2">
                    <Badge variant="secondary">Anthropic</Badge>
                    <span>Claude 3.5 Sonnet</span>
                  </div>
                </SelectItem>
                <SelectItem value="google">
                  <div className="flex items-center gap-2">
                    <Badge variant="outline">Google</Badge>
                    <span>Gemini Pro</span>
                  </div>
                </SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Alerts - FIXED: Single stable container with proper conditional logic */}
          <div className="space-y-2">
            {error && (
              <Alert variant="destructive">
                <AlertCircle className="h-4 w-4" />
                <AlertDescription>{error}</AlertDescription>
              </Alert>
            )}
            {!error && success && (
              <Alert className="border-green-200 bg-green-50">
                <AlertDescription className="text-green-800">{success}</AlertDescription>
              </Alert>
            )}
          </div>

          {/* Actions */}
          <div className="flex gap-2">
            <Button
              type="submit"
              className="flex-1"
              disabled={isSubmitting || !task.trim() || task.length > characterLimit}
            >
              <div className="flex items-center gap-2">
                {isSubmitting ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <Send className="w-4 h-4" />
                )}
                <span>
                  {isSubmitting
                    ? isDemoMode
                      ? 'Creating Demo Task...'
                      : t('tasks.simple.creating')
                    : isDemoMode
                    ? 'Start Demo Task'
                    : t('tasks.simple.submit')}
                </span>
              </div>
            </Button>

            <Button
              type="button"
              variant="outline"
              onClick={() => router.push('/task/monitor/demo_task_456')}
              className="px-4"
              disabled={isSubmitting}
            >
              <Zap className="w-4 h-4" />
            </Button>
          </div>

          {/* User Note - FIXED: Stable container with conditional content */}
          <div className="text-xs text-muted-foreground text-center pt-2">
            {user && !isDemoMode ? (
              <span>{t('tasks.simple.userNote')}: {user.email}</span>
            ) : (
              <span>&nbsp;</span>
            )}
          </div>
        </form>
      </CardContent>
    </Card>
  )
}

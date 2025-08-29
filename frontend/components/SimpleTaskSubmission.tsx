'use client'

import React, { useState, useRef, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Badge } from '@/components/ui/badge'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Loader2, Send, RotateCcw, CheckCircle, AlertCircle, Zap, Brain, Target, Rocket } from 'lucide-react'
import { useLanguage } from '@/contexts/LanguageContext'
import { ApiService } from '@/services/api'

interface SimpleTaskSubmissionProps {
  onTaskSubmit?: (taskId: string) => void
  onResetTask?: () => void
  taskId?: string
  status?: 'idle' | 'pending' | 'running' | 'paused' | 'completed' | 'failed' | 'connecting'
  className?: string
  showRedirect?: boolean
}

export function SimpleTaskSubmission({
  onTaskSubmit,
  onResetTask,
  taskId,
  status = 'idle',
  className = '',
  showRedirect = false
}: SimpleTaskSubmissionProps) {
  const { t } = useLanguage()
  const [task, setTask] = useState('')
  const [llmProvider, setLlmProvider] = useState<'openai' | 'anthropic' | 'google'>('openai')
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState<string | null>(null)
  const mountedRef = useRef(true)
  const characterLimit = 2000

  useEffect(() => {
    mountedRef.current = true
    return () => {
      mountedRef.current = false
    }
  }, [])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    if (!task.trim()) {
      if (mountedRef.current) {
        setError(t('tasks.validation.taskRequired', 'Please describe what you want to automate'))
      }
      return
    }

    if (task.length > characterLimit) {
      if (mountedRef.current) {
        setError(t('tasks.validation.taskTooLong', 'Task description is too long'))
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
        setSuccess(t('tasks.success.created', 'Task created successfully!'))
        
        // Callback for parent component
        if (onTaskSubmit) {
          onTaskSubmit(taskId)
        }
      }

    } catch (error: any) {
      console.error('Error creating task:', error)
      
      if (mountedRef.current) {
        const errorMessage = error.response?.data?.error?.message || 
                           error.message || 
                           t('tasks.error.generic', 'Failed to create task')
        setError(errorMessage)
      }
    } finally {
      if (mountedRef.current) {
        setIsSubmitting(false)
      }
    }
  }

  const handleReset = () => {
    setTask('')
    setError(null)
    setSuccess(null)
    
    if (onResetTask) {
      onResetTask()
    }
  }

  const isFormValid = task.trim().length > 0 && task.length <= characterLimit

  return (
    <div className={`space-y-6 ${className}`}>
      {/* Header */}
      <div className="text-center">
        <div className="flex items-center justify-center mb-4">
          <div className="w-12 h-12 bg-gradient-to-r from-blue-500 to-purple-600 rounded-full flex items-center justify-center">
            <Brain className="w-6 h-6 text-white" />
          </div>
        </div>
        <h2 className="text-2xl font-bold text-gray-900 mb-2">
          {t('tasks.simple.title', 'AI Browser Automation')}
        </h2>
        <p className="text-gray-600 max-w-2xl mx-auto">
          {t('tasks.simple.description', 'Describe any web task in plain language and let our AI browser agent handle the rest automatically')}
        </p>
      </div>

      {/* Task Form */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Target className="w-5 h-5 text-blue-600" />
            {t('tasks.simple.formTitle', 'Create New Task')}
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          <form onSubmit={handleSubmit} className="space-y-6">
            {/* Task Description */}
            <div className="space-y-2">
              <Label htmlFor="task">
                {t('tasks.simple.taskDescription', 'What would you like to automate?')}
                <Badge variant="secondary" className="ml-2">
                  {task.length}/{characterLimit}
                </Badge>
              </Label>
              <Textarea
                id="task"
                value={task}
                onChange={(e) => setTask(e.target.value)}
                placeholder={t('tasks.simple.taskPlaceholder', 'Describe your task in detail. For example: "Go to example.com, fill out the contact form with my information, and submit it" or "Navigate to my bank website, login, download the last 3 months of statements, and save them to my downloads folder"')}
                className="min-h-[120px] resize-none"
                maxLength={characterLimit}
              />
            </div>

            {/* AI Model Selection */}
            <div className="space-y-2">
              <Label htmlFor="llmProvider">
                {t('tasks.simple.aiModel', 'AI Model')}
              </Label>
              <Select value={llmProvider} onValueChange={(value: any) => setLlmProvider(value)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="openai">OpenAI GPT-4o (Recommended)</SelectItem>
                  <SelectItem value="anthropic">Anthropic Claude 3.5 Sonnet</SelectItem>
                  <SelectItem value="google">Google Gemini Pro</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Error/Success Messages */}
            {error && (
              <Alert variant="destructive">
                <AlertCircle className="h-4 w-4" />
                <AlertDescription>{error}</AlertDescription>
              </Alert>
            )}

            {success && (
              <Alert>
                <CheckCircle className="h-4 w-4" />
                <AlertDescription>{success}</AlertDescription>
              </Alert>
            )}

            {/* Action Buttons */}
            <div className="flex flex-col sm:flex-row gap-3">
              <Button
                type="submit"
                disabled={!isFormValid || isSubmitting}
                className="flex-1"
                size="lg"
              >
                {isSubmitting ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    {t('tasks.simple.creating', 'Creating Task...')}
                  </>
                ) : (
                  <>
                    <Rocket className="w-4 h-4 mr-2" />
                    {t('tasks.simple.createTask', 'Start Automation')}
                  </>
                )}
              </Button>

              <Button
                type="button"
                variant="outline"
                onClick={handleReset}
                disabled={isSubmitting}
                className="flex-1 sm:flex-none"
              >
                <RotateCcw className="w-4 h-4 mr-2" />
                {t('tasks.simple.reset', 'Reset')}
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>

      {/* Help Section */}
      <Card className="bg-gradient-to-r from-blue-50 to-indigo-50 border-blue-200">
        <CardContent className="pt-6">
          <h3 className="text-lg font-semibold mb-4 text-blue-900">
            {t('tasks.simple.helpTitle', 'How It Works')}
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm text-blue-800">
            <div className="text-center">
              <div className="w-10 h-10 bg-blue-200 rounded-full flex items-center justify-center mx-auto mb-2">
                <span className="text-blue-700 font-semibold">1</span>
              </div>
              <p>{t('tasks.simple.step1', 'Describe your task in natural language')}</p>
            </div>
            <div className="text-center">
              <div className="w-10 h-10 bg-blue-200 rounded-full flex items-center justify-center mx-auto mb-2">
                <span className="text-blue-700 font-semibold">2</span>
              </div>
              <p>{t('tasks.simple.step2', 'AI agent executes actions automatically')}</p>
            </div>
            <div className="text-center">
              <div className="w-10 h-10 bg-blue-200 rounded-full flex items-center justify-center mx-auto mb-2">
                <span className="text-blue-700 font-semibold">3</span>
              </div>
              <p>{t('tasks.simple.step3', 'Monitor progress and get results')}</p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Example Tasks */}
      <Card className="bg-gradient-to-r from-green-50 to-emerald-50 border-green-200">
        <CardContent className="pt-6">
          <h3 className="text-lg font-semibold mb-4 text-green-900">
            {t('tasks.simple.examplesTitle', 'Example Tasks')}
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <div className="flex items-start space-x-3">
              <div className="w-2 h-2 bg-green-500 rounded-full mt-2"></div>
              <p className="text-sm text-green-800">
                {t('tasks.simple.example1', 'Fill out and submit web forms automatically')}
              </p>
            </div>
            <div className="flex items-start space-x-3">
              <div className="w-2 h-2 bg-green-500 rounded-full mt-2"></div>
              <p className="text-sm text-green-800">
                {t('tasks.simple.example2', 'Download files from password-protected sites')}
              </p>
            </div>
            <div className="flex items-start space-x-3">
              <div className="w-2 h-2 bg-green-500 rounded-full mt-2"></div>
              <p className="text-sm text-green-800">
                {t('tasks.simple.example3', 'Scrape data from multiple web pages')}
              </p>
            </div>
            <div className="flex items-start space-x-3">
              <div className="w-2 h-2 bg-green-500 rounded-full mt-2"></div>
              <p className="text-sm text-green-800">
                {t('tasks.simple.example4', 'Navigate complex multi-step workflows')}
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}

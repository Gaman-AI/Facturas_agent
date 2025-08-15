'use client'

import React, { useState, useRef, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Badge } from '@/components/ui/badge'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Card, CardContent } from '@/components/ui/card'
import { Loader2, Send, RotateCcw, CheckCircle, AlertCircle, Zap } from 'lucide-react'
import { useLanguage } from '@/contexts/LanguageContext'
import { ApiService } from '@/services/api'

interface SimpleTaskSubmissionPaneProps {
  onTaskSubmit?: (taskId: string) => void
  onResetTask?: () => void
  taskId?: string
  status?: 'idle' | 'pending' | 'running' | 'paused' | 'completed' | 'failed' | 'connecting'
  className?: string
}

export function SimpleTaskSubmissionPane({
  onTaskSubmit,
  onResetTask,
  taskId,
  status = 'pending',
  className = ''
}: SimpleTaskSubmissionPaneProps) {
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
    setIsSubmitting(false)
    if (onResetTask) {
      onResetTask()
    }
  }

  const getStatusColor = () => {
    switch (status) {
      case 'running': return 'bg-green-500'
      case 'paused': return 'bg-yellow-500'
      case 'completed': return 'bg-blue-500'
      case 'failed': return 'bg-red-500'
      case 'connecting': return 'bg-orange-500'
      default: return 'bg-slate-500'
    }
  }

  const getStatusText = () => {
    switch (status) {
      case 'running': return 'Task Running'
      case 'paused': return 'Task Paused'
      case 'completed': return 'Task Completed'
      case 'failed': return 'Task Failed'
      case 'connecting': return 'Connecting...'
      default: return 'Ready'
    }
  }

  // If task is active, show status view
  if (taskId && (status === 'running' || status === 'paused' || status === 'completed' || status === 'failed')) {
    return (
      <div className={`h-full flex flex-col ${className}`}>
        <div className="flex-1 flex flex-col items-center justify-center p-6">
          {/* Status Icon */}
          <div className="mb-6">
            {status === 'running' && (
              <div className="w-16 h-16 mx-auto mb-4 bg-green-100 rounded-full flex items-center justify-center">
                <Loader2 className="w-8 h-8 text-green-600 animate-spin" />
              </div>
            )}
            {status === 'completed' && (
              <div className="w-16 h-16 mx-auto mb-4 bg-blue-100 rounded-full flex items-center justify-center">
                <CheckCircle className="w-8 h-8 text-blue-600" />
              </div>
            )}
            {status === 'failed' && (
              <div className="w-16 h-16 mx-auto mb-4 bg-red-100 rounded-full flex items-center justify-center">
                <AlertCircle className="w-8 h-8 text-red-600" />
              </div>
            )}
            {status === 'paused' && (
              <div className="w-16 h-16 mx-auto mb-4 bg-yellow-100 rounded-full flex items-center justify-center">
                <AlertCircle className="w-8 h-8 text-yellow-600" />
              </div>
            )}
          </div>

          {/* Status Message */}
          <h3 className="text-lg font-semibold mb-2 text-center">
            {getStatusText()}
          </h3>

          <p className="text-slate-600 mb-6 text-center text-sm">
            {status === 'running' && 'Your browser automation task is running. Watch the progress in the browser view.'}
            {status === 'completed' && 'Your task has been completed successfully!'}
            {status === 'failed' && 'Your task encountered an error and could not complete.'}
            {status === 'paused' && 'Your task is paused. You can resume it from the browser view.'}
          </p>

          {/* Task Information */}
          <Card className="w-full mb-6">
            <CardContent className="p-4">
              <div className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-slate-600">Task ID:</span>
                  <span className="font-mono">{taskId.slice(0, 8)}...</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-600">Status:</span>
                  <Badge variant="outline" className={`text-xs ${getStatusColor()}`}>
                    {getStatusText()}
                  </Badge>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-600">Provider:</span>
                  <span className="capitalize">{llmProvider}</span>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Action Button */}
          <Button onClick={handleReset} variant="outline" className="w-full">
            <RotateCcw className="w-4 h-4 mr-2" />
            Create New Task
          </Button>
        </div>
      </div>
    )
  }

  // Task submission form
  return (
    <div className={`h-full flex flex-col ${className}`}>
      <form onSubmit={handleSubmit} className="flex-1 flex flex-col space-y-4">
        {/* Task Description */}
        <div className="space-y-2">
          <Label htmlFor="task" className="text-sm font-medium">
            {t('tasks.form.description', 'What would you like to automate?')}
          </Label>
          <Textarea
            id="task"
            value={task}
            onChange={(e) => setTask(e.target.value)}
            placeholder={t('tasks.form.placeholder', 'e.g., "Fill out a contact form on example.com with my details" or "Search for red sneakers on Amazon and add the first result to cart"')}
            className="min-h-[120px] resize-none"
            disabled={isSubmitting}
          />
          <div className="flex justify-between text-xs text-slate-500">
            <span>
              {t('tasks.form.hint', 'Be specific about what you want the AI to do')}
            </span>
            <span className={task.length > characterLimit * 0.9 ? 'text-red-500' : ''}>
              {task.length}/{characterLimit}
            </span>
          </div>
        </div>

        {/* LLM Provider Selection */}
        <div className="space-y-2">
          <Label htmlFor="llm-provider" className="text-sm font-medium">
            {t('tasks.form.provider', 'AI Provider')}
          </Label>
          <Select value={llmProvider} onValueChange={(value: 'openai' | 'anthropic' | 'google') => setLlmProvider(value)}>
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="openai">
                <div className="flex items-center gap-2">
                  <div className="w-4 h-4 bg-green-500 rounded"></div>
                  OpenAI GPT-4o
                </div>
              </SelectItem>
              <SelectItem value="anthropic">
                <div className="flex items-center gap-2">
                  <div className="w-4 h-4 bg-orange-500 rounded"></div>
                  Anthropic Claude
                </div>
              </SelectItem>
              <SelectItem value="google">
                <div className="flex items-center gap-2">
                  <div className="w-4 h-4 bg-blue-500 rounded"></div>
                  Google Gemini
                </div>
              </SelectItem>
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
            <AlertDescription className="text-green-700">{success}</AlertDescription>
          </Alert>
        )}

        {/* Submit Button */}
        <div className="pt-4">
          <Button 
            type="submit" 
            disabled={isSubmitting || !task.trim() || task.length > characterLimit}
            className="w-full bg-gradient-to-r from-pink-500 to-rose-500 hover:from-pink-600 hover:to-rose-600"
          >
            {isSubmitting ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                {t('tasks.form.creating', 'Creating Task...')}
              </>
            ) : (
              <>
                <Zap className="w-4 h-4 mr-2" />
                {t('tasks.form.submit', 'Start Automation')}
              </>
            )}
          </Button>
        </div>

        {/* Help Text */}
        <div className="text-xs text-slate-500 text-center">
          {t('tasks.form.help', 'Your task will be executed in a secure browser environment')}
        </div>
      </form>
    </div>
  )
}

'use client'

import React, { useState } from 'react'
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

  const characterLimit = 500
  const remainingChars = characterLimit - task.length

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    if (!task.trim()) {
      setError(t('tasks.validation.taskRequired', 'Task description is required'))
      return
    }

    if (task.length > characterLimit) {
      setError(t('tasks.validation.taskTooLong', 'Task description is too long'))
      return
    }

    setIsSubmitting(true)
    setError(null)
    setSuccess(null)

    try {
      // Create a simple browser automation task
      const response = await ApiService.createBrowserTask({
        task_description: task,
        llm_provider: llmProvider,
        model: llmProvider === 'openai' ? 'gpt-4o' : 
               llmProvider === 'anthropic' ? 'claude-3-5-sonnet-20241022' : 
               'gemini-pro'
      })

      const taskId = response.data.task_id
      setSuccess(t('tasks.success.created', 'Task created successfully!'))
      
      // Clear form
      setTask('')
      
      // Callback for parent component
      if (onTaskSubmit) {
        onTaskSubmit(taskId)
      }
      
      // Redirect to monitoring page
      if (showRedirect) {
        setTimeout(() => {
          router.push(`/task/monitor/${taskId}`)
        }, 1500)
      }

    } catch (error: any) {
      console.error('Error creating task:', error)
      const errorMessage = error?.response?.data?.message || error?.message || 'Unknown error occurred'
      setError(t('tasks.error.creation', `Failed to create task: ${errorMessage}`))
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleQuickFill = (quickTask: string) => {
    setTask(quickTask)
  }

  const quickTasks = [
    t('tasks.quick.searchGoogle', 'Search for recent news about artificial intelligence on Google'),
    t('tasks.quick.checkWeather', 'Check the weather forecast for Mexico City'),
    t('tasks.quick.findProduct', 'Find laptop prices on MercadoLibre'),
    t('tasks.quick.socialMedia', 'Check latest posts on Twitter about technology')
  ]

  return (
    <Card className={`w-full max-w-2xl mx-auto ${className}`}>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Zap className="w-5 h-5 text-primary" />
          {t('tasks.simple.title', 'Quick Task Submission')}
        </CardTitle>
        <CardDescription>
          {t('tasks.simple.description', 'Describe what you want the browser agent to do in plain language')}
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
              onClick={() => setIsDemoMode(!isDemoMode)}
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
              {t('tasks.simple.taskLabel', 'What would you like the agent to do?')}
            </label>
            <Textarea
              value={task}
              onChange={(e) => setTask(e.target.value)}
              placeholder={t('tasks.simple.placeholder', 'Example: Search for OpenAI latest updates on Google and summarize the findings')}
              className="min-h-[100px] resize-none"
              disabled={isSubmitting}
              maxLength={characterLimit}
            />
            <div className="flex justify-between items-center text-xs text-muted-foreground">
              <span>{t('tasks.simple.hint', 'Be specific about what you want to accomplish')}</span>
              <span className={remainingChars < 50 ? 'text-orange-500' : remainingChars < 10 ? 'text-red-500' : ''}>
                {remainingChars} {t('common.charactersRemaining', 'characters remaining')}
              </span>
            </div>
          </div>

          {/* Quick Task Examples */}
          <div className="space-y-2">
            <label className="text-sm font-medium">
              {t('tasks.simple.quickExamples', 'Quick Examples')}
            </label>
            <div className="flex flex-wrap gap-2">
              {quickTasks.map((quickTask, index) => (
                <Button
                  key={index}
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

          {/* LLM Provider Selection */}
          <div className="space-y-2">
            <label className="text-sm font-medium">
              {t('tasks.simple.aiModel', 'AI Model')}
            </label>
            <Select value={llmProvider} onValueChange={(value: 'openai' | 'anthropic' | 'google') => setLlmProvider(value)}>
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

          {/* Error Display */}
          {error && (
            <Alert variant="destructive">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}

          {/* Success Display */}
          {success && (
            <Alert className="border-green-200 bg-green-50">
              <AlertDescription className="text-green-800">{success}</AlertDescription>
            </Alert>
          )}

          {/* Submit Button */}
          <div className="flex gap-2">
            <Button 
              type="submit" 
              className="flex-1" 
              disabled={isSubmitting || !task.trim() || task.length > characterLimit}
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  {isDemoMode ? 'Creating Demo Task...' : t('tasks.simple.creating', 'Creating Task...')}
                </>
              ) : (
                <>
                  <Send className="w-4 h-4 mr-2" />
                  {isDemoMode ? 'Start Demo Task' : t('tasks.simple.submit', 'Start Task')}
                </>
              )}
            </Button>
            
            <Button 
              type="button"
              variant="outline"
              onClick={() => router.push('/task/monitor/demo_task_456')}
              className="px-4"
              title="Try demo without API credentials"
            >
              <Zap className="w-4 h-4" />
            </Button>
          </div>

          {/* User Info */}
          {user && !isDemoMode && (
            <div className="text-xs text-muted-foreground text-center pt-2">
              {t('tasks.simple.userNote', 'Task will be executed as')}: {user.email}
            </div>
          )}
        </form>
      </CardContent>
    </Card>
  )
}
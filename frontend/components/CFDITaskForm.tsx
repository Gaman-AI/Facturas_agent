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
import { Loader2, Send, RotateCcw, CheckCircle, AlertCircle, Zap, FileText, Building2, Calendar } from 'lucide-react'
import { useLanguage } from '@/contexts/LanguageContext'
import { ApiService } from '@/services/api'

interface CFDITaskFormProps {
  onTaskSubmit?: (taskId: string) => void
  onResetTask?: () => void
  taskId?: string
  status?: 'idle' | 'pending' | 'running' | 'paused' | 'completed' | 'failed' | 'connecting'
  className?: string
}

export function CFDITaskForm({
  onTaskSubmit,
  onResetTask,
  taskId,
  status = 'idle',
  className = ''
}: CFDITaskFormProps) {
  const { t } = useLanguage()
  const [task, setTask] = useState('')
  const [supplierName, setSupplierName] = useState('')
  const [invoicePeriod, setInvoicePeriod] = useState('')
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
      // Create a CFDI-specific browser automation task
      const response = await ApiService.createBrowserUseTask({
        task: task,
        llm_provider: llmProvider,
        model: llmProvider === 'openai' ? 'gpt-4o' : 
               llmProvider === 'anthropic' ? 'claude-3-5-sonnet-20241022' : 
               'gemini-pro',
        metadata: {
          type: 'cfdi_invoice_request',
          supplier_name: supplierName,
          invoice_period: invoicePeriod
        }
      })

      const taskId = response.data.task_id
      
      // Only update state if component is still mounted
      if (mountedRef.current) {
        setSuccess(t('tasks.success.created', 'CFDI task created successfully!'))
        
        // Callback for parent component
        if (onTaskSubmit) {
          onTaskSubmit(taskId)
        }
      }

    } catch (error: any) {
      console.error('Error creating CFDI task:', error)
      
      if (mountedRef.current) {
        const errorMessage = error.response?.data?.error?.message || 
                           error.message || 
                           t('tasks.error.generic', 'Failed to create CFDI task')
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
    setSupplierName('')
    setInvoicePeriod('')
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
          <div className="w-12 h-12 bg-blue-100 rounded-full flex items-center justify-center">
            <FileText className="w-6 h-6 text-blue-600" />
          </div>
        </div>
        <h2 className="text-2xl font-bold text-gray-900 mb-2">
          {t('tasks.cfdi.title', 'CFDI Invoice Automation')}
        </h2>
        <p className="text-gray-600 max-w-2xl mx-auto">
          {t('tasks.cfdi.description', 'Automate CFDI invoice requests from supplier portals using AI-powered browser automation')}
        </p>
      </div>

      {/* Task Form */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Zap className="w-5 h-5 text-blue-600" />
            {t('tasks.cfdi.formTitle', 'Create CFDI Task')}
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          <form onSubmit={handleSubmit} className="space-y-6">
            {/* Supplier Information */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="supplierName">
                  <Building2 className="w-4 h-4 inline mr-2" />
                  {t('tasks.cfdi.supplierName', 'Supplier Name')}
                </Label>
                <Input
                  id="supplierName"
                  value={supplierName}
                  onChange={(e) => setSupplierName(e.target.value)}
                  placeholder={t('tasks.cfdi.supplierNamePlaceholder', 'e.g., CFE, Telmex, etc.')}
                  className="w-full"
                />
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="invoicePeriod">
                  <Calendar className="w-4 h-4 inline mr-2" />
                  {t('tasks.cfdi.invoicePeriod', 'Invoice Period')}
                </Label>
                <Input
                  id="invoicePeriod"
                  value={invoicePeriod}
                  onChange={(e) => setInvoicePeriod(e.target.value)}
                  placeholder={t('tasks.cfdi.invoicePeriodPlaceholder', 'e.g., January 2024')}
                  className="w-full"
                />
              </div>
            </div>

            {/* Task Description */}
            <div className="space-y-2">
              <Label htmlFor="task">
                {t('tasks.cfdi.taskDescription', 'Task Description')}
                <Badge variant="secondary" className="ml-2">
                  {task.length}/{characterLimit}
                </Badge>
              </Label>
              <Textarea
                id="task"
                value={task}
                onChange={(e) => setTask(e.target.value)}
                placeholder={t('tasks.cfdi.taskPlaceholder', 'Describe what you want to automate. For example: "Navigate to CFE portal, login with credentials, download CFDI invoices for January 2024, and save them to the downloads folder"')}
                className="min-h-[120px] resize-none"
                maxLength={characterLimit}
              />
            </div>

            {/* AI Model Selection */}
            <div className="space-y-2">
              <Label htmlFor="llmProvider">
                {t('tasks.cfdi.aiModel', 'AI Model')}
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
                    {t('tasks.cfdi.creating', 'Creating Task...')}
                  </>
                ) : (
                  <>
                    <Send className="w-4 h-4 mr-2" />
                    {t('tasks.cfdi.createTask', 'Create CFDI Task')}
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
                {t('tasks.cfdi.reset', 'Reset')}
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>

      {/* Help Section */}
      <Card className="bg-blue-50 border-blue-200">
        <CardContent className="pt-6">
          <h3 className="text-lg font-semibold mb-4 text-blue-900">
            {t('tasks.cfdi.helpTitle', 'How CFDI Automation Works')}
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm text-blue-800">
            <div className="text-center">
              <div className="w-10 h-10 bg-blue-200 rounded-full flex items-center justify-center mx-auto mb-2">
                <span className="text-blue-700 font-semibold">1</span>
              </div>
              <p>{t('tasks.cfdi.step1', 'Describe your CFDI task in detail')}</p>
            </div>
            <div className="text-center">
              <div className="w-10 h-10 bg-blue-200 rounded-full flex items-center justify-center mx-auto mb-2">
                <span className="text-blue-700 font-semibold">2</span>
              </div>
              <p>{t('tasks.cfdi.step2', 'AI navigates supplier portals automatically')}</p>
            </div>
            <div className="text-center">
              <div className="w-10 h-10 bg-blue-200 rounded-full flex items-center justify-center mx-auto mb-2">
                <span className="text-blue-700 font-semibold">3</span>
              </div>
              <p>{t('tasks.cfdi.step3', 'Download and organize your CFDI invoices')}</p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}

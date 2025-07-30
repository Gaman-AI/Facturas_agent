'use client'

import React, { useState } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Loader2, FileText, AlertCircle, CheckCircle, Play } from 'lucide-react'
import { useAuth, useUserProfile } from '@/hooks/useAuth'
import { useLanguage } from '@/contexts/LanguageContext'
import ApiService, { type BrowserUseTaskRequest, type BrowserUseTaskResponse } from '@/services/api'

// Form validation schema
const cfdiTaskSchema = z.object({
  vendor_url: z.string().url('Debe ser una URL válida'),
  ticket_id: z.string().min(1, 'El ID del ticket es requerido'),
  folio: z.string().optional(),
  transaction_date: z.string().optional(),
  subtotal: z.number().positive().optional(),
  iva: z.number().min(0).optional(),
  total: z.number().positive('El total debe ser mayor a 0'),
  currency: z.string().default('MXN'),
  llm_provider: z.enum(['openai', 'anthropic', 'google']).default('openai'),
  model: z.string().optional(),
  max_retries: z.number().int().min(1).max(5).default(3),
  timeout_minutes: z.number().int().min(5).max(60).default(30)
})

type CFDITaskFormData = z.infer<typeof cfdiTaskSchema>

interface TaskResult {
  success: boolean
  data?: {
    task_id: string
    status: string
    result: any
    execution_time: number
    logs: any[]
  }
  error?: {
    code: string
    message: string
    details?: any
  }
}

export function CFDITaskForm() {
  const [isExecuting, setIsExecuting] = useState(false)
  const [taskResult, setTaskResult] = useState<TaskResult | null>(null)
  const [connectionError, setConnectionError] = useState<string | null>(null)
  
  const { user } = useAuth()
  const { profile } = useUserProfile()
  const { t } = useLanguage()

  const {
    register,
    handleSubmit,
    setValue,
    watch,
    formState: { errors }
  } = useForm<CFDITaskFormData>({
    resolver: zodResolver(cfdiTaskSchema),
    defaultValues: {
      currency: 'MXN',
      llm_provider: 'openai',
      max_retries: 3,
      timeout_minutes: 30
    }
  })

  const llmProvider = watch('llm_provider')

  // Test backend connection on mount
  React.useEffect(() => {
    const testConnection = async () => {
      try {
        const isConnected = await ApiService.testConnection()
        if (!isConnected) {
          setConnectionError('No se puede conectar al backend. Verifique que esté ejecutándose en el puerto 8000.')
        }
      } catch (error) {
        setConnectionError('Error al probar la conexión del backend.')
      }
    }
    
    testConnection()
  }, [])

  // Poll task status function
  const pollTaskStatus = (taskId: string) => {
    const interval = setInterval(async () => {
      try {
        const taskResponse = await ApiService.getBrowserUseTask(taskId)
        
        if (taskResponse.success) {
          const task = taskResponse.data
          
          // Update task result with current status
          setTaskResult({
            success: true,
            data: {
              task_id: task.task_id,
              status: task.status,
              result: task.result || null,
              execution_time: task.execution_time_ms || 0,
              logs: [] // Browser-use doesn't provide logs in this format
            }
          })
          
          // Stop polling if task is completed or failed
          if (task.status === 'completed' || task.status === 'failed' || task.status === 'cancelled') {
            clearInterval(interval)
            setIsExecuting(false)
            
            if (task.status === 'failed') {
              setTaskResult({
                success: false,
                error: {
                  code: 'TASK_EXECUTION_FAILED',
                  message: task.error || 'La tarea falló durante la ejecución',
                  details: task.error_type
                }
              })
            }
            
            console.log(`🏁 Tarea ${task.status}: ${task.task_id}`)
          }
        }
      } catch (error) {
        console.error('❌ Error polling task status:', error)
        clearInterval(interval)
        setIsExecuting(false)
        setTaskResult({
          success: false,
          error: {
            code: 'POLLING_ERROR',
            message: 'Error al verificar el estado de la tarea'
          }
        })
      }
    }, 2000) // Poll every 2 seconds

    // Set a maximum polling time of 10 minutes
    setTimeout(() => {
      clearInterval(interval)
      if (isExecuting) {
        setIsExecuting(false)
        setTaskResult({
          success: false,
          error: {
            code: 'TIMEOUT_ERROR',
            message: 'La tarea ha excedido el tiempo máximo de ejecución'
          }
        })
      }
    }, 600000) // 10 minutes
  }

  const onSubmit = async (formData: CFDITaskFormData) => {
    if (!profile || !user) {
      setTaskResult({
        success: false,
        error: {
          code: 'USER_NOT_AUTHENTICATED',
          message: 'Usuario no autenticado o perfil no disponible'
        }
      })
      return
    }

    setIsExecuting(true)
    setTaskResult(null)
    setConnectionError(null)

    try {
      // Prepare browser-use task data using user profile and form data
      const taskData: BrowserUseTaskRequest = {
        vendor_url: formData.vendor_url,
        customer_details: {
          rfc: profile.rfc,
          email: user.email || profile.email,
          company_name: profile.company_name || profile.razon_social,
          address: {
            street: profile.street || profile.calle,
            exterior_number: profile.exterior_number || profile.numero_ext,
            interior_number: profile.interior_number || profile.numero_int || undefined,
            colony: profile.colony || profile.colonia,
            municipality: profile.municipality || profile.delegacion_municipio,
            state: profile.state || profile.estado,
            zip_code: profile.zip_code || profile.codigo_postal,
            country: 'Mexico'
          }
        },
        invoice_details: {
          ticket_id: formData.ticket_id,
          folio: formData.folio || undefined,
          transaction_date: formData.transaction_date || undefined,
          subtotal: formData.subtotal,
          iva: formData.iva,
          total: formData.total,
          currency: formData.currency
        },
        model: formData.model || 'gpt-4.1-mini',
        temperature: 1.0,
        max_steps: 50,
        timeout_minutes: formData.timeout_minutes
      }

      console.log('🚀 Enviando tarea Browser-Use:', taskData)
      
      const result = await ApiService.createBrowserUseTask(taskData)
      
      if (result.success) {
        console.log('✅ Tarea creada exitosamente:', result.data.task_id)
        
        // Start polling for task status
        pollTaskStatus(result.data.task_id)
        
        // Set initial result
        setTaskResult({
          success: true,
          data: {
            task_id: result.data.task_id,
            status: result.data.status,
            result: null,
            execution_time: 0,
            logs: []
          }
        })
      } else {
        console.error('❌ Error creando la tarea:', result)
        setTaskResult({
          success: false,
          error: {
            code: 'TASK_CREATION_ERROR',
            message: 'Error al crear la tarea de automatización'
          }
        })
        setIsExecuting(false)
      }

    } catch (error) {
      console.error('❌ Error ejecutando tarea Browser-Use:', error)
      
      const errorMessage = error instanceof Error ? error.message : 'Error desconocido'
      setTaskResult({
        success: false,
        error: {
          code: 'EXECUTION_ERROR',
          message: errorMessage
        }
      })
      setIsExecuting(false)

      // Check for connection errors
      if (errorMessage.includes('ECONNREFUSED') || errorMessage.includes('Network Error')) {
        setConnectionError('No se puede conectar al backend. Verifique que esté ejecutándose en el puerto 8000.')
      }
    }
  }

  const getModelOptions = () => {
    switch (llmProvider) {
      case 'openai':
        return [
          { value: 'gpt-4o', label: 'GPT-4o' },
          { value: 'gpt-4o-mini', label: 'GPT-4o Mini' },
          { value: 'gpt-4', label: 'GPT-4' }
        ]
      case 'anthropic':
        return [
          { value: 'claude-3-sonnet-20240229', label: 'Claude 3 Sonnet' },
          { value: 'claude-3-haiku-20240307', label: 'Claude 3 Haiku' }
        ]
      case 'google':
        return [
          { value: 'gemini-pro', label: 'Gemini Pro' },
          { value: 'gemini-1.5-pro', label: 'Gemini 1.5 Pro' }
        ]
      default:
        return []
    }
  }

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      {/* Connection Error Alert */}
      {connectionError && (
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>{connectionError}</AlertDescription>
        </Alert>
      )}

      {/* Main Form */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <FileText className="w-5 h-5" />
            <span>{t('tasks.createNewTask', 'Nueva Tarea de Automatización CFDI')}</span>
          </CardTitle>
          <CardDescription>
            {t('tasks.formDescription', 'Complete los datos para automatizar la solicitud de facturación en el portal del proveedor')}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
            {/* Vendor Information */}
            <div className="space-y-4">
              <h3 className="text-lg font-medium">{t('tasks.vendorInfo', 'Información del Proveedor')}</h3>
              <div className="grid grid-cols-1 gap-4">
                <div>
                  <Label htmlFor="vendor_url">{t('tasks.vendorUrl', 'URL del Portal de Facturación')} *</Label>
                  <Input
                    {...register('vendor_url')}
                    placeholder={t('tasks.vendorUrlPlaceholder', 'https://facturacion.proveedor.com')}
                    error={errors.vendor_url?.message}
                  />
                </div>
              </div>
            </div>

            {/* Invoice Details */}
            <div className="space-y-4">
              <h3 className="text-lg font-medium">{t('tasks.invoiceDetails', 'Detalles de la Factura')}</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="ticket_id">{t('tasks.ticketId')} *</Label>
                  <Input
                    {...register('ticket_id')}
                    placeholder={t('tasks.ticketIdPlaceholder')}
                    error={errors.ticket_id?.message}
                  />
                </div>
                <div>
                  <Label htmlFor="folio">{t('tasks.folio')} ({t('common.optional')})</Label>
                  <Input
                    {...register('folio')}
                    placeholder={t('tasks.folioPlaceholder')}
                  />
                </div>
                <div>
                  <Label htmlFor="transaction_date">{t('tasks.transactionDate')} ({t('common.optional')})</Label>
                  <Input
                    type="date"
                    {...register('transaction_date')}
                  />
                </div>
                <div>
                  <Label htmlFor="currency">{t('tasks.currency')}</Label>
                  <Select value={watch('currency')} onValueChange={(value) => setValue('currency', value)}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="MXN">MXN - {t('common.mexicanPeso', 'Peso Mexicano')}</SelectItem>
                      <SelectItem value="USD">USD - {t('common.usDollar', 'Dólar Americano')}</SelectItem>
                      <SelectItem value="EUR">EUR - {t('common.euro', 'Euro')}</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label htmlFor="subtotal">{t('tasks.subtotal')} ({t('common.optional')})</Label>
                  <Input
                    type="number"
                    step="0.01"
                    {...register('subtotal', { valueAsNumber: true })}
                    placeholder={t('tasks.subtotalPlaceholder')}
                  />
                </div>
                <div>
                  <Label htmlFor="iva">{t('tasks.iva')} ({t('common.optional')})</Label>
                  <Input
                    type="number"
                    step="0.01"
                    {...register('iva', { valueAsNumber: true })}
                    placeholder={t('tasks.ivaPlaceholder')}
                  />
                </div>
                <div>
                  <Label htmlFor="total">{t('tasks.total')} *</Label>
                  <Input
                    type="number"
                    step="0.01"
                    {...register('total', { valueAsNumber: true })}
                    placeholder={t('tasks.totalPlaceholder')}
                    error={errors.total?.message}
                  />
                </div>
              </div>
            </div>

            {/* Automation Configuration */}
            <div className="space-y-4">
              <h3 className="text-lg font-medium">Configuración de Automatización</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="llm_provider">Proveedor de IA</Label>
                  <Select value={llmProvider} onValueChange={(value: any) => setValue('llm_provider', value)}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="openai">OpenAI</SelectItem>
                      <SelectItem value="anthropic">Anthropic</SelectItem>
                      <SelectItem value="google">Google</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label htmlFor="model">Modelo (Opcional)</Label>
                  <Select value={watch('model') || ''} onValueChange={(value) => setValue('model', value)}>
                    <SelectTrigger>
                      <SelectValue placeholder="Seleccionar modelo" />
                    </SelectTrigger>
                    <SelectContent>
                      {getModelOptions().map((option) => (
                        <SelectItem key={option.value} value={option.value}>
                          {option.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label htmlFor="max_retries">Reintentos Máximos</Label>
                  <Input
                    type="number"
                    min="1"
                    max="5"
                    {...register('max_retries', { valueAsNumber: true })}
                  />
                </div>
                <div>
                  <Label htmlFor="timeout_minutes">Timeout (minutos)</Label>
                  <Input
                    type="number"
                    min="5"
                    max="60"
                    {...register('timeout_minutes', { valueAsNumber: true })}
                  />
                </div>
              </div>
            </div>

            {/* Submit Button */}
            <div className="flex justify-end">
              <Button
                type="submit"
                disabled={isExecuting || !!connectionError}
                className="min-w-[200px]"
              >
                {isExecuting ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Ejecutando Tarea...
                  </>
                ) : (
                  <>
                    <Play className="w-4 h-4 mr-2" />
                    Ejecutar Automatización
                  </>
                )}
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>

      {/* Task Result */}
      {taskResult && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center space-x-2">
              {taskResult.success ? (
                <CheckCircle className="w-5 h-5 text-green-500" />
              ) : (
                <AlertCircle className="w-5 h-5 text-red-500" />
              )}
              <span>
                {taskResult.success ? 'Tarea Completada' : 'Error en la Ejecución'}
              </span>
            </CardTitle>
          </CardHeader>
          <CardContent>
            {taskResult.success && taskResult.data ? (
              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div>
                    <strong>ID de Tarea:</strong> {taskResult.data.task_id}
                  </div>
                  <div>
                    <strong>Estado:</strong> {taskResult.data.status}
                  </div>
                  <div>
                    <strong>Tiempo de Ejecución:</strong> {taskResult.data.execution_time}ms
                  </div>
                  <div>
                    <strong>Logs:</strong> {taskResult.data.logs.length} entradas
                  </div>
                </div>
                
                {taskResult.data.result && (
                  <div>
                    <strong>Resultado:</strong>
                    <pre className="bg-gray-100 p-4 rounded-md text-xs overflow-auto mt-2">
                      {JSON.stringify(taskResult.data.result, null, 2)}
                    </pre>
                  </div>
                )}
              </div>
            ) : (
              <Alert variant="destructive">
                <AlertCircle className="h-4 w-4" />
                <AlertDescription>
                  <strong>Error:</strong> {taskResult.error?.message || 'Error desconocido'}
                  {taskResult.error?.details && (
                    <pre className="mt-2 text-xs">
                      {JSON.stringify(taskResult.error.details, null, 2)}
                    </pre>
                  )}
                </AlertDescription>
              </Alert>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  )
} 
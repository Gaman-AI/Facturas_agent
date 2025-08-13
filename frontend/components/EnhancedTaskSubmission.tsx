'use client'

import React, { useState, useRef, useEffect, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Loader2, Zap, AlertCircle, Upload, FileText, Image, X, Globe } from 'lucide-react'
import { useAuth } from '@/hooks/useAuth'
import { useLanguage } from '@/contexts/LanguageContext'
import { useDemoMode } from '@/contexts/DemoModeContext'
import ApiService from '@/services/api'

interface EnhancedTaskSubmissionProps {
  onTaskSubmit?: (taskId: string) => void
  onRedirectToDualPane?: () => void
  className?: string
}

interface UploadedFile {
  id: string
  name: string
  type: string
  size: number
  file: File
  preview?: string
}

export function EnhancedTaskSubmission({ 
  onTaskSubmit, 
  onRedirectToDualPane,
  className = '' 
}: EnhancedTaskSubmissionProps) {
  const { t } = useLanguage()
  const { user } = useAuth()
  const router = useRouter()
  
  const [task, setTask] = useState('')
  const [vendorUrl, setVendorUrl] = useState('')
  const [llmProvider, setLlmProvider] = useState<'openai' | 'anthropic' | 'google'>('openai')
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState<string | null>(null)
  const [uploadedFiles, setUploadedFiles] = useState<UploadedFile[]>([])
  const [isUploading, setIsUploading] = useState(false)
  const [isDragOver, setIsDragOver] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const mountedRef = useRef(true)
  const { isDemoMode, setDemoMode } = useDemoMode()

  // Removed text task input; task state remains to support file-only task generation

  // Cleanup effect to prevent state updates on unmounted component
  useEffect(() => {
    return () => {
      mountedRef.current = false
    }
  }, [])

  const handleFileUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = event.target.files
    if (!files) return

    setIsUploading(true)
    setError(null)
    const maxSize = 10 * 1024 * 1024 // 10MB

    Array.from(files).forEach((file) => {
      // Validate file type
      const isValidType = file.type.startsWith('image/') || file.type === 'application/pdf'
      if (!isValidType) {
        setError(`File type not supported: ${file.name}. Only images and PDFs are allowed.`)
        return
      }

      // Validate file size
      if (file.size > maxSize) {
        setError(`File too large: ${file.name}. Maximum size is 10MB.`)
        return
      }

      const fileId = Math.random().toString(36).substr(2, 9)
      const uploadedFile: UploadedFile = {
        id: fileId,
        name: file.name,
        type: file.type,
        size: file.size,
        file: file
      }

      // Create preview for images
      if (file.type.startsWith('image/')) {
        const reader = new FileReader()
        reader.onload = (e) => {
          uploadedFile.preview = e.target?.result as string
          setUploadedFiles(prev => [...prev, uploadedFile])
        }
        reader.readAsDataURL(file)
      } else {
        setUploadedFiles(prev => [...prev, uploadedFile])
      }
    })

    setIsUploading(false)
    // Clear the input
    if (fileInputRef.current) {
      fileInputRef.current.value = ''
    }
  }

  const removeFile = (fileId: string) => {
    setUploadedFiles(prev => prev.filter(file => file.id !== fileId))
  }

  const generateTaskFromFiles = () => {
    if (uploadedFiles.length === 0) return ''

    const imageFiles = uploadedFiles.filter(file => file.type.startsWith('image/'))
    const pdfFiles = uploadedFiles.filter(file => file.type === 'application/pdf')
    
    let taskDescription = 'Process the following uploaded files and automate the task based on their content:\n\n'
    
    if (imageFiles.length > 0) {
      taskDescription += `📷 Images (${imageFiles.length}): ${imageFiles.map(f => f.name).join(', ')}\n`
    }
    
    if (pdfFiles.length > 0) {
      taskDescription += `📄 PDFs (${pdfFiles.length}): ${pdfFiles.map(f => f.name).join(', ')}\n`
    }
    
    taskDescription += '\nInstructions:\n'
    taskDescription += '1. Analyze the content of all uploaded files\n'
    taskDescription += '2. Extract relevant information (text, data, forms, etc.)\n'
    taskDescription += '3. Automate the appropriate web-based task based on the extracted content\n'
    taskDescription += '4. Handle any forms, navigation, or data entry required\n'
    taskDescription += '5. Provide clear status updates throughout the process\n'
    
    return taskDescription
  }

  const generateFinalTask = () => {
    const fileTask = generateTaskFromFiles()
    const userTask = task.trim()
    
    if (userTask && fileTask) {
      // Combine user instructions with file processing
      return `${userTask}\n\n${fileTask}`
    } else if (userTask) {
      // Only user text
      return userTask
    } else if (fileTask) {
      // Only files
      return fileTask
    }
    
    return ''
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)
    setIsSubmitting(true)

    try {
      if (isDemoMode) {
        // Demo mode: bypass API call and immediately redirect
        console.log('🎭 Demo mode: Bypassing API call for UI testing')
        
        // Simulate a small delay to show the loading state
        await new Promise(resolve => setTimeout(resolve, 1000))
        
        // Trigger the redirect callback
        if (onRedirectToDualPane) {
          onRedirectToDualPane()
        }
        
        // Also call onTaskSubmit if provided
        if (onTaskSubmit) {
          onTaskSubmit(`demo_${Date.now()}`)
        }
        
        return
      }

      // Normal mode: proceed with API call
      const finalTask = generateFinalTask()
      
      console.log('🚀 Submitting task to API:', finalTask)
      
      const response = await ApiService.createBrowserbaseTask({
        task: finalTask,
        vendor_url: vendorUrl.trim() || undefined,
        model: 'gpt-4o-mini-2024-07-18',
        llm_provider: 'openai',
        max_steps: 30
      })

      console.log('✅ Task created successfully:', response)

      if (onTaskSubmit) {
        onTaskSubmit(response.data.task_id)
      }

      if (onRedirectToDualPane) {
        onRedirectToDualPane()
      }

    } catch (error: any) {
      console.error('❌ Task submission failed:', error)
      
      let errorMessage = 'Failed to create task. Please try again.'
      
      if (error.response?.status === 404) {
        errorMessage = 'API endpoint not found. Please check backend configuration.'
      } else if (error.response?.data?.error?.message) {
        errorMessage = error.response.data.error.message
      } else if (error.message) {
        errorMessage = error.message
      }
      
      setError(errorMessage)
    } finally {
      setIsSubmitting(false)
    }
  }

  const getFileTypeName = (mimeType: string) => {
    if (mimeType.startsWith('image/')) {
      const format = mimeType.split('/')[1].toUpperCase()
      return `Image (${format})`
    } else if (mimeType === 'application/pdf') {
      return 'PDF Document'
    }
    return 'Unknown File'
  }

  return (
    <Card className={`w-full max-w-4xl mx-auto ${className}`}>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Zap className="w-5 h-5 text-primary" />
          Submit New Task
        </CardTitle>
        <CardDescription>
          Upload receipts and optionally provide a vendor URL to automate
        </CardDescription>
      </CardHeader>
      
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Removed "Describe ticket details" section by request */}

          {/* Vendor URL */}
          <div className="space-y-2">
            <Label htmlFor="vendor-url" className="text-sm font-medium">
              Vendor URL:
              <span className="text-xs text-slate-500 ml-2">
                (Optional) Website where the AI should perform the task
              </span>
            </Label>
            <div className="relative">
              <Globe className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-slate-400" />
              <Input
                id="vendor-url"
                type="url"
                value={vendorUrl}
                onChange={(e) => setVendorUrl(e.target.value)}
                placeholder="https://example.com or leave blank for general automation"
                className="pl-10"
                disabled={isSubmitting}
              />
            </div>
          </div>

          {/* File Upload */}
          <div className="space-y-2">
            <Label htmlFor="file-upload" className="text-sm font-medium">
              Upload receipt:
              <span className="text-xs text-slate-500 ml-2">
                Upload an image or PDF of the receipt to process
              </span>
            </Label>
          
            {/* Drag and Drop Area */}
            <div 
              className={`border-2 border-dashed rounded-lg p-6 text-center transition-all duration-200 cursor-pointer ${
                isDragOver 
                  ? 'border-blue-400 bg-blue-50 scale-105' 
                  : 'border-slate-300 hover:border-slate-400 hover:bg-slate-50'
              }`}
              onDragOver={(e) => {
                e.preventDefault()
                setIsDragOver(true)
              }}
              onDragLeave={(e) => {
                e.preventDefault()
                setIsDragOver(false)
              }}
              onDrop={(e) => {
                e.preventDefault()
                setIsDragOver(false)
                const files = e.dataTransfer.files
                if (files.length > 0) {
                  const event = { target: { files } } as React.ChangeEvent<HTMLInputElement>
                  handleFileUpload(event)
                }
              }}
              onClick={() => fileInputRef.current?.click()}
            >
              <Upload className={`w-8 h-8 mx-auto mb-2 transition-colors ${
                isDragOver ? 'text-blue-500' : 'text-slate-400'
              }`} />
              <p className={`text-sm font-medium ${isDragOver ? 'text-blue-600' : 'text-slate-600'}`}>
                {isDragOver 
                  ? 'Drop receipt here!' 
                  : 'Drag and drop receipt here, or click to browse'
                }
              </p>
              <p className="text-xs text-slate-500">
                Supported formats: Receipt images (JPG, PNG, GIF) and PDFs
              </p>
            </div>
            
            <Input
              ref={fileInputRef}
              type="file"
              id="file-upload"
              accept="image/*,application/pdf"
              onChange={handleFileUpload}
              multiple
              disabled={isSubmitting || isUploading}
              className="hidden"
            />
            
            {isUploading && (
              <div className="flex items-center text-sm text-blue-700">
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                Processing files...
              </div>
            )}
            
            {uploadedFiles.length > 0 && (
              <div className="mt-4 space-y-3">
                <h4 className="text-sm font-medium text-slate-700">
                  Uploaded Receipts ({uploadedFiles.length})
                </h4>
                <div className="grid grid-cols-1 gap-3">
                  {uploadedFiles.map(file => (
                    <div 
                      key={file.id} 
                      className="flex items-center p-3 rounded-lg border bg-slate-50 border-slate-200 hover:bg-slate-100"
                    >
                      {file.preview ? (
                        <img src={file.preview} alt={file.name} className="w-12 h-12 object-cover rounded mr-3" />
                      ) : (
                        <div className="w-12 h-12 bg-blue-100 rounded flex items-center justify-center mr-3">
                          {file.type === 'application/pdf' ? (
                            <FileText className="w-6 h-6 text-red-600" />
                          ) : file.type.startsWith('image/') ? (
                            <Image className="w-6 h-6 text-green-600" />
                          ) : (
                            <FileText className="w-6 h-6 text-blue-600" />
                          )}
                        </div>
                      )}
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-slate-900 truncate">{file.name}</p>
                        <p className="text-xs text-slate-500">
                          {(file.size / 1024 / 1024).toFixed(2)} MB • {getFileTypeName(file.type)}
                        </p>
                      </div>
                      <button
                        type="button"
                        onClick={() => removeFile(file.id)}
                        className="ml-2 p-1 text-slate-400 hover:text-slate-600 hover:bg-slate-200 rounded"
                        title="Remove file"
                      >
                        <X className="w-4 h-4" />
                      </button>
                    </div>
                  ))}
                </div>
                
                <div className="mt-3 pt-3 border-t border-slate-200">
                  <div className="flex justify-between items-center text-xs">
                    <span className="text-slate-600">
                      Total receipts: {uploadedFiles.length}
                    </span>
                    <span className={`font-medium ${
                      uploadedFiles.reduce((total, file) => total + file.size, 0) > 5 * 1024 * 1024 
                        ? 'text-orange-600' 
                        : 'text-slate-600'
                    }`}>
                      Total size: {(uploadedFiles.reduce((total, file) => total + file.size, 0) / 1024 / 1024).toFixed(2)} MB
                    </span>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* LLM Provider Selection */}
          <div className="space-y-2">
            <Label htmlFor="llm-provider" className="text-sm font-medium">
              AI Provider
            </Label>
            <Select value={llmProvider} onValueChange={(value: 'openai' | 'anthropic' | 'google') => setLlmProvider(value)}>
              <SelectTrigger disabled={isSubmitting}>
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

          {/* Alerts */}
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
          {/* Demo section removed by request */}

          {/* Submit Button */}
          <Button
            type="submit"
            disabled={isSubmitting || uploadedFiles.length === 0}
            className="w-full bg-blue-600 hover:bg-blue-700 text-white font-semibold py-3 px-6 rounded-lg transition-colors duration-200"
          >
            {isSubmitting ? (
              <div className="flex items-center space-x-2">
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                <span>Starting Task...</span>
              </div>
            ) : (
              <span>Start Task</span>
            )}
          </Button>

          {/* Help Text */}
          <div className="text-xs text-slate-500 text-center">
            Your receipt will be processed and you'll be redirected to the dual pane view where you can monitor the browser automation in real-time.
          </div>
        </form>
      </CardContent>
    </Card>
  )
}

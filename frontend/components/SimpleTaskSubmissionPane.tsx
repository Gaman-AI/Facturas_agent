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
import { Loader2, Send, RotateCcw, CheckCircle, AlertCircle, Zap, Upload, FileText, Image, X } from 'lucide-react'
import { useLanguage } from '@/contexts/LanguageContext'
import { ApiService } from '@/services/api'

interface SimpleTaskSubmissionPaneProps {
  onTaskSubmit?: (taskId: string) => void
  onResetTask?: () => void
  taskId?: string
  status?: 'pending' | 'running' | 'paused' | 'completed' | 'failed' | 'connecting'
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
  const [uploadedFiles, setUploadedFiles] = useState<UploadedFile[]>([])
  const [isUploading, setIsUploading] = useState(false)
  const [isDragOver, setIsDragOver] = useState(false)
  const [draggedFileId, setDraggedFileId] = useState<string | null>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const mountedRef = useRef(true)
  const characterLimit = 2000

  useEffect(() => {
    mountedRef.current = true
    return () => {
      mountedRef.current = false
    }
  }, [])

  const handleFileUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = event.target.files
    if (!files) return

    setIsUploading(true)
    setError(null) // Clear previous errors
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

  const handleFileDragStart = (fileId: string) => {
    setDraggedFileId(fileId)
  }

  const handleFileDragOver = (e: React.DragEvent, fileId: string) => {
    e.preventDefault()
    if (draggedFileId && draggedFileId !== fileId) {
      e.currentTarget.classList.add('border-blue-400', 'bg-blue-50')
    }
  }

  const handleFileDragLeave = (e: React.DragEvent) => {
    e.currentTarget.classList.remove('border-blue-400', 'bg-blue-50')
  }

  const handleFileDrop = (e: React.DragEvent, targetFileId: string) => {
    e.preventDefault()
    e.currentTarget.classList.remove('border-blue-400', 'bg-blue-50')
    
    if (draggedFileId && draggedFileId !== targetFileId) {
      setUploadedFiles(prev => {
        const files = [...prev]
        const draggedIndex = files.findIndex(f => f.id === draggedFileId)
        const targetIndex = files.findIndex(f => f.id === targetFileId)
        
        if (draggedIndex !== -1 && targetIndex !== -1) {
          const [draggedFile] = files.splice(draggedIndex, 1)
          files.splice(targetIndex, 0, draggedFile)
        }
        
        return files
      })
    }
    
    setDraggedFileId(null)
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
      return `${userTask}${fileTask}`
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
    
    // Check if we have either text or files
    if (!task.trim() && uploadedFiles.length === 0) {
      if (mountedRef.current) {
        setError('Please describe what you want to automate or upload a file')
      }
      return
    }

    if (task.length > characterLimit) {
      if (mountedRef.current) {
        setError('Task description is too long')
      }
      return
    }

    if (mountedRef.current) {
      setIsSubmitting(true)
      setError(null)
      setSuccess(null)
    }

    try {
      // Generate task description from files if no text provided
      const finalTask = generateFinalTask()
      
      // Create a Browserbase task for live browser view
      const response = await ApiService.createBrowserbaseTask({
        task: finalTask,
        llm_provider: llmProvider,
        model: llmProvider === 'openai' ? 'gpt-4o-mini-2024-07-18' : 
               llmProvider === 'anthropic' ? 'claude-3-5-sonnet-20241022' : 
               'gemini-pro',
        max_steps: 30
      })

      const taskId = response.data.task_id
      
      // Only update state if component is still mounted
      if (mountedRef.current) {
        setSuccess('Task created successfully!')
        
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
                           'Failed to create task'
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
    setUploadedFiles([]) // Clear uploaded files on reset
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
    <div className="h-full flex flex-col min-h-0">
      <div className="flex-shrink-0 p-6 border-b border-slate-200">
        <h2 className="text-xl font-semibold text-slate-900">Submit New Task</h2>
        <p className="text-sm text-slate-600 mt-1">Upload receipts and describe what to automate</p>
      </div>
      
      <div 
        className="flex-1 min-h-0 overflow-y-auto border border-red-200" 
        style={{ 
          scrollbarWidth: 'thin', 
          scrollbarColor: '#cbd5e1 #f1f5f9',
          maxHeight: 'calc(100vh - 200px)',
          // Force scrollbar to be visible
          overflowY: 'scroll'
        }}
      >
        <form onSubmit={handleSubmit} className="p-6 space-y-6">
          {/* Task Description */}
          <div className="space-y-2">
            <Label htmlFor="task" className="text-sm font-medium">
              Describe ticket details:
              <span className="text-xs text-slate-500 ml-2">
                What should the AI do with the uploaded receipt?
              </span>
            </Label>
            <Textarea
              id="task"
              value={task}
              onChange={(e) => setTask(e.target.value)}
              placeholder="e.g., 'Extract invoice details and fill out the Walmart form' or 'Process this receipt to create an invoice' or leave blank if uploading files"
              className="min-h-[120px] resize-none"
              disabled={isSubmitting}
            />
            <div className="flex justify-between text-xs text-slate-500">
              <span>
                Be specific about what you want the AI to do with the receipt
              </span>
              <span className={task.length > characterLimit * 0.9 ? 'text-red-500' : ''}>
                {task.length}/{characterLimit}
              </span>
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
                <span className="text-xs text-slate-500 ml-2 font-normal">
                  Drag to reorder
                </span>
              </h4>
              <div className="grid grid-cols-1 gap-3">
                {uploadedFiles.map(file => (
                  <div 
                    key={file.id} 
                    className={`flex items-center p-3 rounded-lg border transition-all duration-200 ${
                      draggedFileId === file.id 
                        ? 'bg-blue-100 border-blue-300 shadow-lg scale-105 opacity-75' 
                        : 'bg-slate-50 border-slate-200 hover:bg-slate-100'
                    }`}
                    draggable={true}
                    onDragStart={() => handleFileDragStart(file.id)}
                    onDragOver={(e) => handleFileDragOver(e, file.id)}
                    onDragLeave={handleFileDragLeave}
                    onDrop={(e) => handleFileDrop(e, file.id)}
                    onDragEnd={() => setDraggedFileId(null)}
                  >
                    <div className="flex items-center mr-2 text-slate-400 cursor-move">
                      <div className="w-2 h-2 bg-slate-300 rounded-full mr-1"></div>
                      <div className="w-2 h-2 bg-slate-300 rounded-full mr-1"></div>
                      <div className="w-2 h-2 bg-slate-300 rounded-full"></div>
                    </div>
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
              
              {/* File Size Info - Keep this but make it more compact */}
              <div className="mt-3 pt-3 border-t border-blue-200">
                <div className="flex justify-between items-center text-xs">
                  <span className="text-blue-600">
                    Total receipts: {uploadedFiles.length}
                  </span>
                  <span className={`font-medium ${
                    uploadedFiles.reduce((total, file) => total + file.size, 0) > 5 * 1024 * 1024 
                      ? 'text-orange-600' 
                      : 'text-blue-600'
                  }`}>
                    Total size: {(uploadedFiles.reduce((total, file) => total + file.size, 0) / 1024 / 1024).toFixed(2)} MB
                  </span>
                </div>
                {uploadedFiles.reduce((total, file) => total + file.size, 0) > 5 * 1024 * 1024 && (
                  <p className="text-xs text-orange-600 mt-1">
                    ⚠️ Large files may take longer to process
                  </p>
                )}
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
            disabled={isSubmitting || (!task.trim() && uploadedFiles.length === 0) || task.length > characterLimit}
            className="w-full bg-gradient-to-r from-pink-500 to-rose-500 hover:from-pink-600 hover:to-rose-600"
          >
            {isSubmitting ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                Processing Receipt...
              </>
            ) : (
              <>
                <Zap className="w-4 h-4 mr-2" />
                Process Receipt
              </>
            )}
          </Button>
        </div>

        {/* Help Text */}
        <div className="text-xs text-slate-500 text-center">
          Your receipt will be processed in Browserbase cloud browser for live viewing. Upload a receipt image/PDF and describe what you want the AI to do with it.
        </div>
        
        {/* Additional spacing to ensure scrolling */}
        <div className="h-20"></div>
      </form>
      </div>
    </div>
  )
}

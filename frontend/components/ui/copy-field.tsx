"use client"

import React, { useState } from 'react'
import { Copy, Check, Copy as CopyAllIcon } from 'lucide-react'
import { Button } from './button'
import { cn } from '@/lib/utils'

interface CopyFieldProps {
  value: string
  label?: string
  className?: string
  showCopyButton?: boolean
  placeholder?: string
}

export function CopyField({ 
  value, 
  label, 
  className = "",
  showCopyButton = true,
  placeholder = "No disponible"
}: CopyFieldProps) {
  const [copied, setCopied] = useState(false)

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(value || '')
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    } catch (err) {
      console.error('Failed to copy text: ', err)
      // Fallback for older browsers
      const textArea = document.createElement('textarea')
      textArea.value = value || ''
      document.body.appendChild(textArea)
      textArea.select()
      document.execCommand('copy')
      document.body.removeChild(textArea)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    }
  }

  const displayValue = value || placeholder

  return (
    <div className={cn("relative", className)}>
      {label && (
        <label className="block text-xs sm:text-sm font-medium text-gray-700 mb-2 break-words">
          {label}
        </label>
      )}
      <div className="relative group">
        <div className="min-h-[40px] px-3 py-2 bg-white border border-red-200 rounded text-sm text-gray-800 pr-12 break-words">
          {displayValue}
        </div>
        {showCopyButton && (
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={handleCopy}
            className="absolute right-1 top-1/2 transform -translate-y-1/2 h-8 w-8 p-0 hover:bg-gray-100 transition-all duration-200"
            title="Copy to clipboard"
          >
            {copied ? (
              <Check className="h-4 w-4 text-green-600" />
            ) : (
              <Copy className="h-4 w-4 text-gray-500 hover:text-gray-700" />
            )}
          </Button>
        )}
      </div>
    </div>
  )
}

// Special component for raw text areas with copy functionality
export function CopyTextArea({ 
  value, 
  label, 
  className = "",
  height = "h-[300px]",
  placeholder = "No raw text available"
}: CopyFieldProps & { height?: string }) {
  const [copied, setCopied] = useState(false)

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(value || '')
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    } catch (err) {
      console.error('Failed to copy text: ', err)
      // Fallback for older browsers
      const textArea = document.createElement('textarea')
      textArea.value = value || ''
      document.body.appendChild(textArea)
      textArea.select()
      document.execCommand('copy')
      document.body.removeChild(textArea)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    }
  }

  return (
    <div className={cn("relative", className)}>
      {label && (
        <label className="block text-xs sm:text-sm font-medium text-gray-700 mb-2 break-words">
          {label}
        </label>
      )}
      <div className="relative group">
        <div className={cn(
          "px-3 py-2 bg-white border border-red-200 rounded text-sm text-gray-800 overflow-y-auto custom-scrollbar pr-12 break-words",
          height
        )}>
          {value ? (
            <pre className="whitespace-pre-wrap text-xs leading-relaxed font-mono">
              {value}
            </pre>
          ) : (
            <span className="text-gray-500 italic">{placeholder}</span>
          )}
        </div>
        <Button
          type="button"
          variant="ghost"
          size="sm"
          onClick={handleCopy}
          className="absolute right-2 top-2 h-8 w-8 p-0 hover:bg-gray-100 transition-all duration-200 bg-white/80 backdrop-blur-sm border border-gray-200"
          title="Copy to clipboard"
        >
          {copied ? (
            <Check className="h-4 w-4 text-green-600" />
          ) : (
            <Copy className="h-4 w-4 text-gray-500 hover:text-gray-700" />
          )}
        </Button>
      </div>
    </div>
  )
}

// Component to copy all ticket data at once
export function CopyAllButton({ ticketData }: { ticketData: any }) {
  const [copied, setCopied] = useState(false)

  const handleCopyAll = async () => {
    const formattedData = Object.entries(ticketData)
      .filter(([key, value]) => value && value !== 'No disponible')
      .map(([key, value]) => `${key}: ${value}`)
      .join('\n')

    try {
      await navigator.clipboard.writeText(formattedData)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    } catch (err) {
      console.error('Failed to copy all data: ', err)
      // Fallback for older browsers
      const textArea = document.createElement('textarea')
      textArea.value = formattedData
      document.body.appendChild(textArea)
      textArea.select()
      document.execCommand('copy')
      document.body.removeChild(textArea)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    }
  }

  return (
    <Button
      type="button"
      variant="outline"
      size="sm"
      onClick={handleCopyAll}
      className="flex items-center gap-2 border-pink-300 text-pink-700 hover:bg-pink-50 text-xs sm:text-sm"
      title="Copy all extracted data"
    >
      {copied ? (
        <Check className="h-3 w-3 sm:h-4 sm:w-4 text-green-600" />
      ) : (
        <CopyAllIcon className="h-3 w-3 sm:h-4 sm:w-4" />
      )}
      <span className="hidden sm:inline">{copied ? 'Copied!' : 'Copy All Data'}</span>
      <span className="sm:hidden">{copied ? '✓' : 'Copy'}</span>
    </Button>
  )
} 
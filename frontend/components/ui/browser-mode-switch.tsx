'use client'

import React from 'react'
import { Switch } from '@/components/ui/switch'
import { Label } from '@/components/ui/label'
import { Monitor, Cloud, Info } from 'lucide-react'
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip'
import { useLanguage } from '@/contexts/LanguageContext'

export interface BrowserModeSwitchProps {
  value: 'browserbase' | 'local'
  onChange: (mode: 'browserbase' | 'local') => void
  disabled?: boolean
  className?: string
}

export function BrowserModeSwitch({ 
  value, 
  onChange, 
  disabled = false,
  className = ''
}: BrowserModeSwitchProps) {
  const { t } = useLanguage()
  const isLocal = value === 'local'

  return (
    <div className={`flex items-center space-x-3 ${className}`}>
      <div className="flex items-center space-x-2">
        <Cloud className={`w-4 h-4 ${!isLocal ? 'text-blue-600' : 'text-gray-400'}`} />
        <Label 
          htmlFor="browser-mode-switch" 
          className={`text-sm font-medium cursor-pointer ${!isLocal ? 'text-gray-900' : 'text-gray-500'}`}
        >
          {t('browser.cloud', 'Cloud')}
        </Label>
      </div>
      
      <Switch
        id="browser-mode-switch"
        checked={isLocal}
        onCheckedChange={(checked) => onChange(checked ? 'local' : 'browserbase')}
        disabled={disabled}
        className="data-[state=checked]:bg-green-600"
      />
      
      <div className="flex items-center space-x-2">
        <Monitor className={`w-4 h-4 ${isLocal ? 'text-green-600' : 'text-gray-400'}`} />
        <Label 
          htmlFor="browser-mode-switch" 
          className={`text-sm font-medium cursor-pointer ${isLocal ? 'text-gray-900' : 'text-gray-500'}`}
        >
          {t('browser.local', 'Local')}
        </Label>
        
        <TooltipProvider>
          <Tooltip>
            <TooltipTrigger asChild>
              <Info className="w-3 h-3 text-gray-400 hover:text-gray-600 cursor-help" />
            </TooltipTrigger>
            <TooltipContent side="bottom" className="max-w-xs">
              <div className="text-xs">
                <p className="font-medium mb-1">{t('browser.modes', 'Browser Modes')}:</p>
                <p><strong>{t('browser.cloud', 'Cloud')}:</strong> {t('browser.cloudDescription', 'Uses Browserbase remote browser with live view')}</p>
                <p><strong>{t('browser.local', 'Local')}:</strong> {t('browser.localDescription', 'Uses your local browser (faster, no live view)')}</p>
              </div>
            </TooltipContent>
          </Tooltip>
        </TooltipProvider>
      </div>
    </div>
  )
}

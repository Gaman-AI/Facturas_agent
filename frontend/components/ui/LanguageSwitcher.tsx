'use client'

import { useState, useEffect } from 'react'
import { Globe, Check, ChevronDown } from 'lucide-react'
import { Button } from '@/components/ui/button'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { useLanguage, type Language } from '@/contexts/LanguageContext'

interface LanguageOption {
  code: Language
  name: string
  nativeName: string
  flag: string
}

const languages: LanguageOption[] = [
  {
    code: 'es',
    name: 'Spanish',
    nativeName: 'Español',
    flag: '🇪🇸'
  },
  {
    code: 'en',
    name: 'English',
    nativeName: 'English',
    flag: '🇺🇸'
  }
]

interface LanguageSwitcherProps {
  variant?: 'default' | 'compact' | 'minimal'
  showLabel?: boolean
  className?: string
}

export function LanguageSwitcher({ 
  variant = 'default', 
  showLabel = true,
  className = '' 
}: LanguageSwitcherProps) {
  const { language, setLanguage, t, isLoading } = useLanguage()
  const [isChanging, setIsChanging] = useState(false)

  const currentLanguage = languages.find(lang => lang.code === language)

  const handleLanguageChange = async (newLanguage: Language) => {
    if (newLanguage === language) return
    
    try {
      setIsChanging(true)
      await setLanguage(newLanguage)
    } catch (error) {
      console.error('Failed to change language:', error)
    } finally {
      setIsChanging(false)
    }
  }

  if (variant === 'minimal') {
    return (
      <div className={`flex items-center gap-1 ${className}`}>
        {languages.map((lang) => (
          <Button
            key={lang.code}
            variant={language === lang.code ? 'default' : 'ghost'}
            size="sm"
            onClick={() => handleLanguageChange(lang.code)}
            disabled={isLoading || isChanging}
            className="px-2 py-1 h-8 text-xs"
            title={t('language.switch')}
          >
            {lang.flag} {lang.code.toUpperCase()}
          </Button>
        ))}
      </div>
    )
  }

  if (variant === 'compact') {
    return (
      <Button
        variant="ghost"
        size="sm"
        onClick={() => handleLanguageChange(language === 'es' ? 'en' : 'es')}
        disabled={isLoading || isChanging}
        className={`flex items-center gap-2 ${className}`}
        title={t('language.switch')}
      >
        <Globe className="h-4 w-4" />
        {currentLanguage?.flag} {currentLanguage?.code.toUpperCase()}
      </Button>
    )
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          variant="ghost"
          size="sm"
          disabled={isLoading || isChanging}
          className={`flex items-center gap-2 ${className}`}
          title={t('language.switch')}
        >
          <Globe className="h-4 w-4" />
          {showLabel && (
            <span className="hidden sm:inline">
              {currentLanguage?.nativeName}
            </span>
          )}
          <span className="sm:hidden">
            {currentLanguage?.flag} {currentLanguage?.code.toUpperCase()}
          </span>
          <ChevronDown className="h-3 w-3 opacity-50" />
        </Button>
      </DropdownMenuTrigger>
      
      <DropdownMenuContent align="end" className="min-w-[180px]">
        {languages.map((lang) => (
          <DropdownMenuItem
            key={lang.code}
            onClick={() => handleLanguageChange(lang.code)}
            disabled={isChanging}
            className="flex items-center justify-between cursor-pointer"
          >
            <div className="flex items-center gap-3">
              <span className="text-lg">{lang.flag}</span>
              <div className="flex flex-col">
                <span className="text-sm font-medium">{lang.nativeName}</span>
                <span className="text-xs text-slate-500">{lang.name}</span>
              </div>
            </div>
            {language === lang.code && (
              <Check className="h-4 w-4 text-primary" />
            )}
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  )
}

// Alternative simple toggle button for header/navbar use
export function LanguageToggle({ className = '' }: { className?: string }) {
  const { language, setLanguage, isLoading } = useLanguage()
  const [isChanging, setIsChanging] = useState(false)
  const [isMounted, setIsMounted] = useState(false)

  // Track mounted state to avoid hydration mismatch
  useEffect(() => {
    setIsMounted(true)
  }, [])

  const toggleLanguage = async () => {
    const newLanguage = language === 'es' ? 'en' : 'es'
    try {
      setIsChanging(true)
      await setLanguage(newLanguage)
    } catch (error) {
      console.error('Failed to toggle language:', error)
    } finally {
      setIsChanging(false)
    }
  }

  // Render consistent content during hydration
  if (!isMounted) {
    return (
      <Button
        variant="ghost"
        size="sm"
        disabled={true}
        className={`flex items-center gap-1 h-8 px-2 ${className}`}
        title="Toggle language / Cambiar idioma"
      >
        <Globe className="h-4 w-4" />
        <span className="text-xs font-medium">ES</span>
      </Button>
    )
  }

  return (
    <Button
      variant="ghost"
      size="sm"
      onClick={toggleLanguage}
      disabled={isLoading || isChanging}
      className={`flex items-center gap-1 h-8 px-2 ${className}`}
      title="Toggle language / Cambiar idioma"
      suppressHydrationWarning={true}
    >
      <Globe className="h-4 w-4" />
      <span className="text-xs font-medium" suppressHydrationWarning={true}>
        {language === 'es' ? 'ES' : 'EN'}
      </span>
    </Button>
  )
} 
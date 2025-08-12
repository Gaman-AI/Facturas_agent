'use client'

import React, { createContext, useContext, useState, useEffect } from 'react'
import { Translations } from '@/types/translations'
import enTranslations from '@/lib/translations/en'

export type Language = 'en'

interface LanguageContextType {
  language: Language
  setLanguage: (lang: Language) => void
  t: (key: string, params?: Record<string, string | number>) => string
  isLoading: boolean
}

const LanguageContext = createContext<LanguageContextType | undefined>(undefined)

// Storage key for language preference
const LANGUAGE_STORAGE_KEY = 'cfdi-app-language'

// Preload translations to avoid dynamic import delays
const preloadedTranslations: Partial<Record<Language, Translations>> = {}

interface LanguageProviderProps {
  children: React.ReactNode
}

export function LanguageProvider({ children }: LanguageProviderProps) {
  const [language, setLanguageState] = useState<Language>('en')
  const [translations, setTranslations] = useState<Translations>(enTranslations)
  const [isLoading, setIsLoading] = useState(false)
  const [isMounted, setIsMounted] = useState(false)

  // Load translations with static imports
  const loadTranslations = (lang: Language) => {
    try {
      // Check if already cached
      if (preloadedTranslations[lang]) {
        setTranslations(preloadedTranslations[lang]!)
        setIsLoading(false)
        return
      }

      setIsLoading(true)
      
      // Use static imports instead of dynamic
      const translationMap = {
        'en': enTranslations
      }
      
      const loadedTranslations = translationMap[lang]
      
      if (!loadedTranslations || typeof loadedTranslations !== 'object') {
        throw new Error(`Invalid translation module for ${lang}`)
      }
      
      // Cache the translations
      preloadedTranslations[lang] = loadedTranslations
      setTranslations(loadedTranslations)
    } catch (error) {
      console.error(`Failed to load translations for ${lang}:`, error)
      setTranslations({})
    } finally {
      setIsLoading(false)
    }
  }

  // Initialize language - HYDRATION SAFE APPROACH
  useEffect(() => {
    const initializeLanguage = () => {
      // Always use English for consistent server-client rendering
      setLanguageState('en')
      setTranslations(enTranslations)
    }

    initializeLanguage()
    setIsMounted(true)
  }, [])



  // Set language function - only supports English
  const setLanguage = (lang: Language) => {
    // Only English is supported
    if (lang !== 'en') {
      console.warn('Only English language is supported')
      return
    }
    
    try {
      setIsLoading(true)
      setLanguageState(lang)
      setTranslations(enTranslations)
    } catch (error) {
      console.error('Failed to set language:', error)
      setIsLoading(false)
      throw error
    }
  }

  // Translation function - HYDRATION SAFE
  const t = (key: string, params?: Record<string, string | number>): string => {
    // During SSR and initial hydration, always return English fallbacks
    if (!isMounted || !translations || Object.keys(translations).length === 0) {
      const loadingFallbacks: Record<string, string> = {
        'language.switch': 'Switch language',
        'common.loading': 'Loading...',
        'common.error': 'Error',
        'home.loadingApp': 'Loading application...',
        'home.redirectingToDashboard': 'Redirecting to dashboard...',
        'home.title': 'CFDI 4.0 Automation System',
        'home.subtitle': 'Automate CFDI form filling with artificial intelligence',
        'home.getStarted': 'Get Started',
        'home.login': 'Login',
        'home.tryDemo': 'Try Demo',
        'features.secure': 'Secure',
        'features.intelligent': 'Intelligent',
        'features.compatible': 'Compatible',
        // SimpleTaskSubmission component translations
        'tasks.validation.taskRequired': 'Task description is required',
        'tasks.validation.taskTooLong': 'Task description is too long',
        'tasks.success.created': 'Task created successfully',
        'tasks.quick.searchGoogle': 'Search for recent news about a specific topic on Google',
        'tasks.quick.checkWeather': 'Check weather forecast for a city',
        'tasks.quick.findProduct': 'Find laptop prices on MercadoLibre',
        'tasks.quick.socialMedia': 'Check latest posts on Twitter',
        'tasks.simple.title': 'Quick Task Submission',
        'tasks.simple.description': 'Describe what you want the AI agent to do in simple language',
        'tasks.simple.taskLabel': 'What would you like the agent to do?',
        'tasks.simple.placeholder': 'Example: Search for OpenAI latest updates on Google and summarize the findings',
        'tasks.simple.hint': 'Be specific about what you want to accomplish',
        'tasks.simple.quickTasks': 'Quick Tasks',
        'tasks.simple.aiModel': 'AI Model',
        'tasks.simple.creating': 'Creating Task...',
        'tasks.simple.submit': 'Start Task',
        'tasks.simple.userNote': 'Task will be executed as'
      }
      return loadingFallbacks[key] || key
    }

    let translation = translations[key] || key

    if (params) {
      Object.entries(params).forEach(([paramKey, paramValue]) => {
        translation = translation.replace(new RegExp(`\\{${paramKey}\\}`, 'g'), String(paramValue))
      })
    }

    return translation
  }

  return (
    <LanguageContext.Provider value={{ language, setLanguage, t, isLoading }}>
      {children}
    </LanguageContext.Provider>
  )
}

export function useLanguage() {
  const context = useContext(LanguageContext)
  if (context === undefined) {
    throw new Error('useLanguage must be used within a LanguageProvider')
  }
  return context
}
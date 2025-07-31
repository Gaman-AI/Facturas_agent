'use client'

import React, { createContext, useContext, useState, useEffect } from 'react'
import { Translations } from '@/types/translations'
import enTranslations from '@/lib/translations/en'
import esTranslations from '@/lib/translations/es'

export type Language = 'es' | 'en'

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
  const [language, setLanguageState] = useState<Language>('es')
  const [translations, setTranslations] = useState<Translations>({})
  const [isLoading, setIsLoading] = useState(true)

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
        'en': enTranslations,
        'es': esTranslations
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

  // Initialize language
  useEffect(() => {
    const initializeLanguage = () => {
      let savedLanguage: Language = 'es'
      
      if (typeof window !== 'undefined') {
        const saved = localStorage.getItem(LANGUAGE_STORAGE_KEY) as Language
        if (saved === 'es' || saved === 'en') {
          savedLanguage = saved
        } else {
          savedLanguage = navigator.language.toLowerCase().startsWith('en') ? 'en' : 'es'
        }
      }
      
      setLanguageState(savedLanguage)
      loadTranslations(savedLanguage)
      
      // Preload the other language
      const otherLang = savedLanguage === 'es' ? 'en' : 'es'
      setTimeout(() => {
        loadTranslations(otherLang)
      }, 1000)
    }

    initializeLanguage()
  }, [])

  // Set language function
  const setLanguage = (lang: Language) => {
    try {
      setIsLoading(true)
      setLanguageState(lang)
      
      if (typeof window !== 'undefined') {
        localStorage.setItem(LANGUAGE_STORAGE_KEY, lang)
      }
      
      loadTranslations(lang)
    } catch (error) {
      console.error('Failed to set language:', error)
      setIsLoading(false)
      throw error
    }
  }

  // Translation function
  const t = (key: string, params?: Record<string, string | number>): string => {
    if (!translations || Object.keys(translations).length === 0) {
      const loadingFallbacks: Record<string, string> = {
        'language.switch': language === 'es' ? 'Cambiar idioma' : 'Switch language',
        'common.loading': language === 'es' ? 'Cargando...' : 'Loading...',
        'common.error': language === 'es' ? 'Error' : 'Error'
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
'use client'

import React, { createContext, useContext, useState, useEffect } from 'react'

export type Language = 'es' | 'en'

interface LanguageContextType {
  language: Language
  setLanguage: (lang: Language) => void
  t: (key: string, params?: Record<string, string | number>) => string
  isLoading: boolean
}

const LanguageContext = createContext<LanguageContextType | undefined>(undefined)

// Translation type
export type Translations = Record<string, string>

// Storage key for language preference
const LANGUAGE_STORAGE_KEY = 'cfdi-app-language'

// Preload translations to avoid dynamic import delays
const preloadedTranslations: Record<Language, Translations | null> = {
  es: null,
  en: null
}

interface LanguageProviderProps {
  children: React.ReactNode
}

export function LanguageProvider({ children }: LanguageProviderProps) {
  const [language, setLanguageState] = useState<Language>('es')
  const [translations, setTranslations] = useState<Translations>({})
  const [isLoading, setIsLoading] = useState(true)

  // Load translations with caching to avoid repeated imports
  const loadTranslations = async (lang: Language) => {
    try {
      // Check if already cached
      if (preloadedTranslations[lang]) {
        setTranslations(preloadedTranslations[lang]!)
        setIsLoading(false)
        return
      }

      setIsLoading(true)
      const translationModule = await import(`@/lib/translations/${lang}`)
      const loadedTranslations = translationModule.default
      
      // Cache the translations
      preloadedTranslations[lang] = loadedTranslations
      setTranslations(loadedTranslations)
    } catch (error) {
      console.error(`Failed to load translations for ${lang}:`, error)
      // Fallback to Spanish if English fails to load
      if (lang === 'en') {
        try {
          const fallbackModule = await import(`@/lib/translations/es`)
          const fallbackTranslations = fallbackModule.default
          preloadedTranslations['es'] = fallbackTranslations
          setTranslations(fallbackTranslations)
        } catch (fallbackError) {
          console.error('Failed to load fallback translations:', fallbackError)
        }
      }
    } finally {
      setIsLoading(false)
    }
  }

  // Initialize language with faster detection and loading
  useEffect(() => {
    const initializeLanguage = async () => {
      let savedLanguage: Language = 'es'
      
      // Quick language detection
      if (typeof window !== 'undefined') {
        const saved = localStorage.getItem(LANGUAGE_STORAGE_KEY) as Language
        if (saved === 'es' || saved === 'en') {
          savedLanguage = saved
        } else {
          // Simple browser language detection
          savedLanguage = navigator.language.toLowerCase().startsWith('en') ? 'en' : 'es'
        }
      }
      
      setLanguageState(savedLanguage)
      await loadTranslations(savedLanguage)
      
      // Preload the other language in background for faster switching
      const otherLang = savedLanguage === 'es' ? 'en' : 'es'
      setTimeout(() => {
        loadTranslations(otherLang).catch(console.error)
      }, 1000)
    }

    initializeLanguage()
  }, [])

  // Set language with caching
  const setLanguage = async (lang: Language) => {
    setLanguageState(lang)
    if (typeof window !== 'undefined') {
      localStorage.setItem(LANGUAGE_STORAGE_KEY, lang)
    }
    await loadTranslations(lang)
  }

  // Translation function with parameter substitution
  const t = (key: string, params?: Record<string, string | number>): string => {
    let translation = translations[key] || key
    
    // Replace parameters in translation
    if (params) {
      Object.entries(params).forEach(([param, value]) => {
        translation = translation.replace(new RegExp(`{{${param}}}`, 'g'), String(value))
      })
    }
    
    return translation
  }

  const value: LanguageContextType = {
    language,
    setLanguage,
    t,
    isLoading
  }

  return (
    <LanguageContext.Provider value={value}>
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
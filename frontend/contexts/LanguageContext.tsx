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
  const [isMounted, setIsMounted] = useState(false)

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
      
      // Validate that translations were loaded
      if (!loadedTranslations || typeof loadedTranslations !== 'object') {
        throw new Error(`Invalid translation module for ${lang}`)
      }
      
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
          if (fallbackTranslations && typeof fallbackTranslations === 'object') {
            preloadedTranslations['es'] = fallbackTranslations
            setTranslations(fallbackTranslations)
          }
        } catch (fallbackError) {
          console.error('Failed to load fallback translations:', fallbackError)
          // Set empty translations as last resort
          setTranslations({})
        }
      } else {
        // For Spanish, set empty translations if failed
        setTranslations({})
      }
    } finally {
      setIsLoading(false)
    }
  }

  // Initialize component mount state
  useEffect(() => {
    setIsMounted(true)
  }, [])

  // Initialize language ONLY after component mounts to avoid hydration mismatch
  useEffect(() => {
    if (!isMounted) return

    const initializeLanguage = async () => {
      let savedLanguage: Language = 'es'
      
      // Only detect language after mounting (client-side only)
      const saved = localStorage.getItem(LANGUAGE_STORAGE_KEY) as Language
      if (saved === 'es' || saved === 'en') {
        savedLanguage = saved
      } else {
        // Simple browser language detection
        savedLanguage = navigator.language.toLowerCase().startsWith('en') ? 'en' : 'es'
      }
      
      // Only update if different from current language
      if (savedLanguage !== language) {
        setLanguageState(savedLanguage)
      }
      
      await loadTranslations(savedLanguage)
      
      // Preload the other language in background for faster switching
      const otherLang = savedLanguage === 'es' ? 'en' : 'es'
      setTimeout(() => {
        loadTranslations(otherLang).catch(console.error)
      }, 1000)
    }

    initializeLanguage()
  }, [isMounted, language])

  // Load initial Spanish translations immediately to avoid hydration issues
  useEffect(() => {
    loadTranslations('es')
  }, [])

  // Set language with caching and proper state synchronization
  const setLanguage = async (lang: Language) => {
    try {
      // Set loading state before changing language
      setIsLoading(true)
      setLanguageState(lang)
      
      if (typeof window !== 'undefined') {
        localStorage.setItem(LANGUAGE_STORAGE_KEY, lang)
      }
      
      await loadTranslations(lang)
    } catch (error) {
      console.error('Failed to set language:', error)
      // Reset to previous language on error
      setIsLoading(false)
      throw error
    }
  }

  // Translation function with parameter substitution and better fallbacks
  const t = (key: string, params?: Record<string, string | number>): string => {
    // If translations are empty (still loading), return a loading placeholder or the key
    if (!translations || Object.keys(translations).length === 0) {
      // During loading, return a more user-friendly placeholder for common keys
      const loadingFallbacks: Record<string, string> = {
        'language.switch': language === 'es' ? 'Cambiar idioma' : 'Switch language',
        'language.current': language === 'es' ? 'Idioma actual: {{language}}' : 'Current language: {{language}}',
        'common.loading': language === 'es' ? 'Cargando...' : 'Loading...',
        'common.success': language === 'es' ? 'Éxito' : 'Success',
        'auth.login': language === 'es' ? 'Iniciar Sesión' : 'Login',
        'auth.register': language === 'es' ? 'Registrarse' : 'Register',
        'login.title': language === 'es' ? 'Iniciar Sesión' : 'Login',
        'register.title': language === 'es' ? 'Crear Cuenta' : 'Create Account',
        'home.loadingApp': language === 'es' ? 'Cargando aplicación...' : 'Loading application...',
        'features.secure': language === 'es' ? 'Seguro y Confiable' : 'Secure and Reliable',
        'features.intelligent': language === 'es' ? 'Automatización Inteligente' : 'Intelligent Automation'
      }
      
      let translation = loadingFallbacks[key] || key
      
      // Replace parameters in fallback translation
      if (params) {
        Object.entries(params).forEach(([param, value]) => {
          translation = translation.replace(new RegExp(`{{${param}}}`, 'g'), String(value))
        })
      }
      
      return translation
    }
    
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
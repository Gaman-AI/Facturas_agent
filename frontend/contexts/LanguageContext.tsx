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

  // Initialize language - HYDRATION SAFE APPROACH
  useEffect(() => {
    const initializeLanguage = () => {
      // Always start with 'es' for consistent server-client rendering
      let savedLanguage: Language = 'es'
      
      // Only check localStorage after component is mounted (client-side only)
      if (typeof window !== 'undefined') {
        const saved = localStorage.getItem(LANGUAGE_STORAGE_KEY) as Language
        if (saved === 'es' || saved === 'en') {
          savedLanguage = saved
        } else {
          // Default to browser language, but fallback to 'es'
          savedLanguage = navigator.language.toLowerCase().startsWith('en') ? 'en' : 'es'
        }
        
        // Only switch language after hydration is complete to avoid mismatch
        if (savedLanguage !== 'es') {
          // Delay the language switch to ensure hydration is complete
          setTimeout(() => {
            setLanguageState(savedLanguage)
            loadTranslations(savedLanguage)
          }, 100)
        }
      }
      
      // Always load Spanish translations first (consistent with server)
      loadTranslations('es')
      
      // Preload the other language
      const otherLang = savedLanguage === 'es' ? 'en' : 'es'
      setTimeout(() => {
        loadTranslations(otherLang)
      }, 1000)
    }

    initializeLanguage()
    setIsMounted(true)
  }, [])

  // Load initial Spanish translations immediately to avoid hydration issues
  useEffect(() => {
    loadTranslations('es')
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

  // Translation function - HYDRATION SAFE
  const t = (key: string, params?: Record<string, string | number>): string => {
    // During SSR and initial hydration, always return Spanish fallbacks
    if (!isMounted || !translations || Object.keys(translations).length === 0) {
      const loadingFallbacks: Record<string, string> = {
        'language.switch': 'Cambiar idioma',
        'common.loading': 'Cargando...',
        'common.error': 'Error',
        'home.loadingApp': 'Cargando aplicación...',
        'home.redirectingToDashboard': 'Redirigiendo al dashboard...',
        'home.title': 'Sistema de Automatización CFDI 4.0',
        'home.subtitle': 'Automatiza el llenado de formularios CFDI con inteligencia artificial',
        'home.getStarted': 'Comenzar',
        'home.login': 'Iniciar Sesión',
        'home.tryDemo': 'Probar Demo',
        'features.secure': 'Seguro',
        'features.intelligent': 'Inteligente',
        'features.compatible': 'Compatible',
        // SimpleTaskSubmission component translations
        'tasks.validation.taskRequired': 'La descripción de la tarea es requerida',
        'tasks.validation.taskTooLong': 'La descripción de la tarea es demasiado larga',
        'tasks.success.created': 'Tarea creada exitosamente',
        'tasks.quick.searchGoogle': 'Buscar noticias recientes sobre un tema específico en Google',
        'tasks.quick.checkWeather': 'Verificar el pronóstico del tiempo para una ciudad',
        'tasks.quick.findProduct': 'Encontrar precios de laptops en MercadoLibre',
        'tasks.quick.socialMedia': 'Revisar las últimas publicaciones en Twitter',
        'tasks.simple.title': 'Envío Rápido de Tareas',
        'tasks.simple.description': 'Describe lo que quieres que el agente de IA haga en lenguaje simple',
        'tasks.simple.taskLabel': '¿Qué te gustaría que haga el agente?',
        'tasks.simple.placeholder': 'Ejemplo: Busca las últimas actualizaciones de OpenAI en Google y resume los hallazgos',
        'tasks.simple.hint': 'Sé específico sobre lo que quieres lograr',
        'tasks.simple.quickTasks': 'Tareas Rápidas',
        'tasks.simple.aiModel': 'Modelo de IA',
        'tasks.simple.creating': 'Creando Tarea...',
        'tasks.simple.submit': 'Iniciar Tarea',
        'tasks.simple.userNote': 'La tarea se ejecutará como'
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
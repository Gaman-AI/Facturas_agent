'use client'

import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react'

interface DemoModeContextType {
  isDemoMode: boolean
  setDemoMode: (enabled: boolean) => void
  enableDemoMode: () => void
  disableDemoMode: () => void
}

const DemoModeContext = createContext<DemoModeContextType | undefined>(undefined)

export const useDemoMode = () => {
  const context = useContext(DemoModeContext)
  if (context === undefined) {
    throw new Error('useDemoMode must be used within a DemoModeProvider')
  }
  return context
}

interface DemoModeProviderProps {
  children: ReactNode
}

export const DemoModeProvider: React.FC<DemoModeProviderProps> = ({ children }) => {
  const [isDemoMode, setIsDemoMode] = useState(false)

  // Check localStorage on mount
  useEffect(() => {
    const savedDemoMode = localStorage.getItem('demoMode') === 'true'
    setIsDemoMode(savedDemoMode)
  }, [])

  // Save to localStorage when demo mode changes
  useEffect(() => {
    localStorage.setItem('demoMode', isDemoMode.toString())
    
    // Also set a global flag for components that don't use the context
    if (typeof window !== 'undefined') {
      (window as any).__DEMO_MODE__ = isDemoMode
    }
  }, [isDemoMode])

  const setDemoMode = (enabled: boolean) => {
    setIsDemoMode(enabled)
  }

  const enableDemoMode = () => {
    setIsDemoMode(true)
  }

  const disableDemoMode = () => {
    setIsDemoMode(false)
  }

  return (
    <DemoModeContext.Provider value={{
      isDemoMode,
      setDemoMode,
      enableDemoMode,
      disableDemoMode
    }}>
      {children}
    </DemoModeContext.Provider>
  )
}

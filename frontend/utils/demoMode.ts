/**
 * Utility functions for checking demo mode status
 * This provides a fallback for components that don't use the DemoModeContext
 */

export const isDemoModeEnabled = (): boolean => {
  // Check localStorage
  if (typeof window !== 'undefined') {
    const localStorageDemoMode = localStorage.getItem('demoMode') === 'true'
    if (localStorageDemoMode) return true
    
    // Check global window flag
    const globalDemoMode = (window as any).__DEMO_MODE__
    if (globalDemoMode) return true
  }
  
  return false
}

export const setDemoModeGlobal = (enabled: boolean): void => {
  if (typeof window !== 'undefined') {
    localStorage.setItem('demoMode', enabled.toString())
    ;(window as any).__DEMO_MODE__ = enabled
  }
}

export const getDemoModeStatus = (): {
  isEnabled: boolean
  source: 'localStorage' | 'global' | 'none'
} => {
  if (typeof window === 'undefined') {
    return { isEnabled: false, source: 'none' }
  }
  
  const localStorageDemoMode = localStorage.getItem('demoMode') === 'true'
  if (localStorageDemoMode) {
    return { isEnabled: true, source: 'localStorage' }
  }
  
  const globalDemoMode = (window as any).__DEMO_MODE__
  if (globalDemoMode) {
    return { isEnabled: true, source: 'global' }
  }
  
  return { isEnabled: false, source: 'none' }
}

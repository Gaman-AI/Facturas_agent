'use client'

import React, { useState, useEffect } from 'react'
import { useSessionManager } from '@/hooks/useSessionManager'
import { useAuth } from '@/contexts/AuthContext'

interface SessionMonitorProps {
  showDetails?: boolean
  position?: 'top-right' | 'top-left' | 'bottom-right' | 'bottom-left'
  className?: string
}

export function SessionMonitor({ 
  showDetails = false, 
  position = 'top-right',
  className = '' 
}: SessionMonitorProps) {
  const { user } = useAuth()
  const { 
    isRefreshing, 
    error, 
    tokenInfo, 
    lastRefresh,
    isTokenValid,
    tokenExpiresIn,
    forceRefresh,
    getTokenInfo
  } = useSessionManager()
  
  const [isExpanded, setIsExpanded] = useState(false)
  const [lastUpdate, setLastUpdate] = useState<Date>(new Date())

  // Update token info periodically
  useEffect(() => {
    if (!user) return

    const interval = setInterval(() => {
      getTokenInfo()
      setLastUpdate(new Date())
    }, 30 * 1000) // Every 30 seconds

    return () => clearInterval(interval)
  }, [user, getTokenInfo])

  if (!user) {
    return null
  }

  const getStatusColor = () => {
    if (error) return 'bg-red-500'
    if (isRefreshing) return 'bg-yellow-500'
    if (!isTokenValid) return 'bg-orange-500'
    return 'bg-green-500'
  }

  const getStatusText = () => {
    if (error) return 'Error'
    if (isRefreshing) return 'Refreshing'
    if (!isTokenValid) return 'Expired'
    return 'Active'
  }

  const formatTimeRemaining = (milliseconds: number | null) => {
    if (!milliseconds || milliseconds <= 0) return 'Expired'
    
    const minutes = Math.floor(milliseconds / (1000 * 60))
    const hours = Math.floor(minutes / 60)
    
    if (hours > 0) {
      return `${hours}h ${minutes % 60}m`
    }
    return `${minutes}m`
  }

  const positionClasses = {
    'top-right': 'top-4 right-4',
    'top-left': 'top-4 left-4',
    'bottom-right': 'bottom-4 right-4',
    'bottom-left': 'bottom-4 left-4'
  }

  return (
    <div className={`fixed ${positionClasses[position]} z-50 ${className}`}>
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-lg border border-gray-200 dark:border-gray-700 overflow-hidden">
        {/* Status Indicator */}
        <div 
          className="flex items-center gap-2 p-3 cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-700"
          onClick={() => setIsExpanded(!isExpanded)}
        >
          <div className={`w-3 h-3 rounded-full ${getStatusColor()}`} />
          <span className="text-sm font-medium text-gray-900 dark:text-gray-100">
            Session: {getStatusText()}
          </span>
          {showDetails && (
            <svg
              className={`w-4 h-4 text-gray-500 transform transition-transform ${
                isExpanded ? 'rotate-180' : ''
              }`}
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
            </svg>
          )}
        </div>

        {/* Expanded Details */}
        {isExpanded && showDetails && (
          <div className="border-t border-gray-200 dark:border-gray-700 p-3 space-y-2">
            <div className="text-xs text-gray-600 dark:text-gray-400 space-y-1">
              <div className="flex justify-between">
                <span>Token Valid:</span>
                <span className={isTokenValid ? 'text-green-600' : 'text-red-600'}>
                  {isTokenValid ? 'Yes' : 'No'}
                </span>
              </div>
              
              {tokenExpiresIn && (
                <div className="flex justify-between">
                  <span>Expires In:</span>
                  <span className={tokenExpiresIn < 5 * 60 * 1000 ? 'text-orange-600' : 'text-gray-600'}>
                    {formatTimeRemaining(tokenExpiresIn)}
                  </span>
                </div>
              )}
              
              {lastRefresh && (
                <div className="flex justify-between">
                  <span>Last Refresh:</span>
                  <span>{lastRefresh.toLocaleTimeString()}</span>
                </div>
              )}
              
              <div className="flex justify-between">
                <span>Last Check:</span>
                <span>{lastUpdate.toLocaleTimeString()}</span>
              </div>
              
              {tokenInfo && (
                <div className="flex justify-between">
                  <span>Manager Status:</span>
                  <span className={tokenInfo.isRefreshing ? 'text-yellow-600' : 'text-gray-600'}>
                    {tokenInfo.isRefreshing ? 'Refreshing' : 'Idle'}
                  </span>
                </div>
              )}
            </div>

            {error && (
              <div className="text-xs text-red-600 dark:text-red-400 bg-red-50 dark:bg-red-900/20 p-2 rounded">
                <div className="font-medium">Error:</div>
                <div className="mt-1">{error}</div>
              </div>
            )}

            <div className="flex gap-2 pt-2">
              <button
                onClick={() => getTokenInfo()}
                className="flex-1 px-2 py-1 text-xs bg-blue-100 dark:bg-blue-900 text-blue-700 dark:text-blue-300 rounded hover:bg-blue-200 dark:hover:bg-blue-800"
              >
                Check Status
              </button>
              
              <button
                onClick={() => forceRefresh()}
                disabled={isRefreshing}
                className="flex-1 px-2 py-1 text-xs bg-green-100 dark:bg-green-900 text-green-700 dark:text-green-300 rounded hover:bg-green-200 dark:hover:bg-green-800 disabled:opacity-50"
              >
                {isRefreshing ? 'Refreshing...' : 'Force Refresh'}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

// Lightweight version for production use
export function SessionStatusIndicator() {
  const { user } = useAuth()
  const { error, isTokenValid, isRefreshing } = useSessionManager()

  if (!user) return null

  const getStatusColor = () => {
    if (error) return 'bg-red-500'
    if (isRefreshing) return 'bg-yellow-500'
    if (!isTokenValid) return 'bg-orange-500'
    return 'bg-green-500'
  }

  return (
    <div className="flex items-center gap-2">
      <div className={`w-2 h-2 rounded-full ${getStatusColor()}`} />
      <span className="text-xs text-gray-500">
        {error ? 'Session Error' : isRefreshing ? 'Refreshing' : isTokenValid ? 'Active' : 'Expired'}
      </span>
    </div>
  )
}
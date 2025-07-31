'use client'

import React, { useState, useRef, useEffect, useMemo } from 'react'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { 
  MessageSquare,
  CheckCircle,
  XCircle,
  AlertCircle,
  Zap,
  Bot,
  ChevronUp,
  ChevronDown,
  Search,
  Filter
} from 'lucide-react'
import { LogEntry } from './StatusSidebar'

interface VirtualLogListProps {
  logs: LogEntry[]
  searchQuery?: string
  filterType?: LogEntry['type'] | 'all'
  maxHeight?: number
  itemHeight?: number
  onSearchChange?: (query: string) => void
  onFilterChange?: (filter: LogEntry['type'] | 'all') => void
  highlightSearch?: boolean
  className?: string
}

interface VirtualizedItem {
  index: number
  log: LogEntry
  isVisible: boolean
  top: number
}

export function VirtualLogList({
  logs,
  searchQuery = '',
  filterType = 'all',
  maxHeight = 400,
  itemHeight = 80,
  onSearchChange,
  onFilterChange,
  highlightSearch = true,
  className = ''
}: VirtualLogListProps) {
  const containerRef = useRef<HTMLDivElement>(null)
  const [scrollTop, setScrollTop] = useState(0)
  const [containerHeight, setContainerHeight] = useState(maxHeight)

  // Filter logs based on search and type
  const filteredLogs = useMemo(() => {
    let filtered = logs

    // Apply type filter
    if (filterType !== 'all') {
      filtered = filtered.filter(log => log.type === filterType)
    }

    // Apply search filter
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase()
      filtered = filtered.filter(log => 
        log.message.toLowerCase().includes(query) ||
        (log.details && JSON.stringify(log.details).toLowerCase().includes(query))
      )
    }

    return filtered
  }, [logs, filterType, searchQuery])

  // Calculate which items should be visible
  const visibleItems = useMemo((): VirtualizedItem[] => {
    const startIndex = Math.floor(scrollTop / itemHeight)
    const endIndex = Math.min(
      startIndex + Math.ceil(containerHeight / itemHeight) + 1,
      filteredLogs.length
    )

    return filteredLogs.slice(startIndex, endIndex).map((log, i) => ({
      index: startIndex + i,
      log,
      isVisible: true,
      top: (startIndex + i) * itemHeight
    }))
  }, [filteredLogs, scrollTop, containerHeight, itemHeight])

  const totalHeight = filteredLogs.length * itemHeight

  // Handle scroll events
  const handleScroll = (e: React.UIEvent<HTMLDivElement>) => {
    const target = e.target as HTMLDivElement
    setScrollTop(target.scrollTop)
  }

  // Update container height on resize
  useEffect(() => {
    const updateHeight = () => {
      if (containerRef.current) {
        const rect = containerRef.current.getBoundingClientRect()
        setContainerHeight(Math.min(rect.height, maxHeight))
      }
    }

    updateHeight()
    window.addEventListener('resize', updateHeight)
    return () => window.removeEventListener('resize', updateHeight)
  }, [maxHeight])

  // Auto-scroll to bottom when new logs arrive
  useEffect(() => {
    if (containerRef.current) {
      const container = containerRef.current
      const isNearBottom = container.scrollTop + container.clientHeight >= container.scrollHeight - 100
      
      if (isNearBottom) {
        container.scrollTop = container.scrollHeight
      }
    }
  }, [logs.length])

  const getLogIcon = (type: LogEntry['type']) => {
    switch (type) {
      case 'success': return <CheckCircle className="w-4 h-4 text-green-600" />
      case 'error': return <XCircle className="w-4 h-4 text-red-600" />
      case 'warning': return <AlertCircle className="w-4 h-4 text-yellow-600" />
      case 'thinking': return <Bot className="w-4 h-4 text-purple-600" />
      case 'action': return <Zap className="w-4 h-4 text-blue-600" />
      default: return <MessageSquare className="w-4 h-4 text-slate-600" />
    }
  }

  const formatTime = (timestamp: string) => {
    try {
      return new Date(timestamp).toLocaleTimeString()
    } catch {
      return timestamp
    }
  }

  const highlightText = (text: string, query: string) => {
    if (!query || !highlightSearch) return text
    
    const regex = new RegExp(`(${query})`, 'gi')
    return text.replace(regex, '<mark class="bg-yellow-200 px-1 rounded">$1</mark>')
  }

  const scrollToTop = () => {
    if (containerRef.current) {
      containerRef.current.scrollTo({ top: 0, behavior: 'smooth' })
    }
  }

  const scrollToBottom = () => {
    if (containerRef.current) {
      containerRef.current.scrollTo({ top: containerRef.current.scrollHeight, behavior: 'smooth' })
    }
  }

  return (
    <div className={`flex flex-col h-full ${className}`}>
      {/* Virtual scroll controls */}
      <div className="flex items-center justify-between p-2 border-b bg-slate-50">
        <div className="text-sm text-slate-600">
          {filteredLogs.length !== logs.length 
            ? `${filteredLogs.length} of ${logs.length} logs`
            : `${logs.length} total logs`
          }
        </div>
        <div className="flex items-center gap-1">
          <Button
            variant="ghost"
            size="sm"
            onClick={scrollToTop}
            className="h-7 w-7 p-0"
            disabled={scrollTop === 0}
          >
            <ChevronUp className="w-3 h-3" />
          </Button>
          <Button
            variant="ghost"
            size="sm"
            onClick={scrollToBottom}
            className="h-7 w-7 p-0"
          >
            <ChevronDown className="w-3 h-3" />
          </Button>
        </div>
      </div>

      {/* Virtual scrolling container */}
      <div
        ref={containerRef}
        className="flex-1 overflow-auto"
        style={{ maxHeight }}
        onScroll={handleScroll}
      >
        <div style={{ height: totalHeight, position: 'relative' }}>
          {visibleItems.map(({ index, log, top }) => (
            <div
              key={`${index}-${log.timestamp}`}
              className="absolute left-0 right-0 px-4 py-2 flex items-start space-x-3 text-sm border-b border-slate-100 hover:bg-slate-50"
              style={{ 
                top,
                height: itemHeight,
                minHeight: itemHeight
              }}
            >
              <div className="mt-1 flex-shrink-0">
                {getLogIcon(log.type)}
              </div>
              <div className="flex-1 min-w-0 overflow-hidden">
                <div className="flex items-center justify-between mb-1">
                  <span className="text-xs text-slate-500">
                    {formatTime(log.timestamp)}
                  </span>
                  <Badge variant="outline" className="text-xs">
                    {log.type}
                  </Badge>
                </div>
                <p className="text-slate-900 break-words line-clamp-2">
                  {highlightSearch && searchQuery ? (
                    <span
                      dangerouslySetInnerHTML={{
                        __html: highlightText(log.message, searchQuery)
                      }}
                    />
                  ) : (
                    log.message
                  )}
                </p>
                {log.details && (
                  <div className="text-xs text-slate-600 mt-1 bg-slate-50 p-1 rounded truncate">
                    {typeof log.details === 'object' 
                      ? JSON.stringify(log.details).slice(0, 100) + '...'
                      : String(log.details).slice(0, 100) + '...'
                    }
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Performance indicator */}
      {logs.length > 100 && (
        <div className="p-2 text-xs text-center text-slate-500 bg-slate-50 border-t">
          <div className="flex items-center justify-center gap-2">
            <Filter className="w-3 h-3" />
            Virtual scrolling enabled for {logs.length} logs
          </div>
        </div>
      )}
    </div>
  )
}
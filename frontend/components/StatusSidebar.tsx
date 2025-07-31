'use client'

import React, { useEffect, useRef, useState, useMemo } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Progress } from '@/components/ui/progress'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Separator } from '@/components/ui/separator'
import { Input } from '@/components/ui/input'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { 
  Activity, 
  Play, 
  Pause, 
  Square, 
  RotateCcw, 
  Clock, 
  CheckCircle, 
  XCircle, 
  AlertCircle, 
  Zap,
  Bot,
  MessageSquare,
  Search,
  Filter,
  Download,
  X,
  Settings,
  Eye,
  EyeOff
} from 'lucide-react'
import { useLanguage } from '@/contexts/LanguageContext'

export interface LogEntry {
  timestamp: string
  message: string
  type: 'info' | 'success' | 'error' | 'warning' | 'thinking' | 'action'
  details?: any
}

export interface SessionControls {
  onPause?: () => void | Promise<void>
  onResume?: () => void | Promise<void>
  onStop?: () => void | Promise<void>
  onRestart?: () => void | Promise<void>
}

export interface StatusSidebarProps {
  taskId?: string
  sessionId?: string
  status?: 'pending' | 'running' | 'paused' | 'completed' | 'failed' | 'connecting'
  progress?: number
  logs?: LogEntry[]
  isConnected?: boolean
  sessionControls?: SessionControls
  taskStartTime?: string
  className?: string
}

export function StatusSidebar({
  taskId,
  sessionId,
  status = 'connecting',
  progress = 0,
  logs = [],
  isConnected = false,
  sessionControls,
  taskStartTime,
  className = ''
}: StatusSidebarProps) {
  const { t } = useLanguage()
  const logsEndRef = useRef<HTMLDivElement>(null)
  
  // Enhanced log management state
  const [searchQuery, setSearchQuery] = useState('')
  const [logTypeFilter, setLogTypeFilter] = useState<LogEntry['type'] | 'all'>('all')
  const [showLogControls, setShowLogControls] = useState(false)
  const [autoScroll, setAutoScroll] = useState(true)
  
  // Filtered and searched logs
  const filteredLogs = useMemo(() => {
    let filtered = logs
    
    // Apply type filter
    if (logTypeFilter !== 'all') {
      filtered = filtered.filter(log => log.type === logTypeFilter)
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
  }, [logs, logTypeFilter, searchQuery])

  // Auto-scroll to bottom when new logs are added (only if auto-scroll is enabled)
  useEffect(() => {
    if (autoScroll) {
      logsEndRef.current?.scrollIntoView({ behavior: 'smooth' })
    }
  }, [logs, autoScroll])

  const getStatusIcon = () => {
    switch (status) {
      case 'running': return <Play className="w-4 h-4 text-green-600" />
      case 'paused': return <Pause className="w-4 h-4 text-yellow-600" />
      case 'completed': return <CheckCircle className="w-4 h-4 text-blue-600" />
      case 'failed': return <XCircle className="w-4 h-4 text-red-600" />
      case 'connecting': return <AlertCircle className="w-4 h-4 text-orange-600" />
      default: return <Clock className="w-4 h-4 text-slate-600" />
    }
  }

  const getStatusColor = () => {
    switch (status) {
      case 'running': return 'text-green-600 bg-green-50 border-green-200'
      case 'paused': return 'text-yellow-600 bg-yellow-50 border-yellow-200'
      case 'completed': return 'text-blue-600 bg-blue-50 border-blue-200'
      case 'failed': return 'text-red-600 bg-red-50 border-red-200'
      case 'connecting': return 'text-orange-600 bg-orange-50 border-orange-200'
      default: return 'text-slate-600 bg-slate-50 border-slate-200'
    }
  }

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

  // Export functionality
  const exportLogs = (format: 'json' | 'csv' | 'txt') => {
    const logsToExport = filteredLogs.length > 0 ? filteredLogs : logs
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-')
    const filename = `task-${taskId || 'unknown'}-logs-${timestamp}`

    if (format === 'json') {
      const data = JSON.stringify(logsToExport, null, 2)
      downloadFile(data, `${filename}.json`, 'application/json')
    } else if (format === 'csv') {
      const headers = ['Timestamp', 'Type', 'Message', 'Details']
      const csvRows = [
        headers.join(','),
        ...logsToExport.map(log => [
          `"${log.timestamp}"`,
          `"${log.type}"`,
          `"${log.message.replace(/"/g, '""')}"`,
          `"${log.details ? JSON.stringify(log.details).replace(/"/g, '""') : ''}"`
        ].join(','))
      ]
      downloadFile(csvRows.join('\n'), `${filename}.csv`, 'text/csv')
    } else if (format === 'txt') {
      const txtContent = logsToExport.map(log => 
        `[${formatTime(log.timestamp)}] ${log.type.toUpperCase()}: ${log.message}${
          log.details ? '\nDetails: ' + JSON.stringify(log.details, null, 2) : ''
        }\n`
      ).join('\n')
      downloadFile(txtContent, `${filename}.txt`, 'text/plain')
    }
  }

  const downloadFile = (content: string, filename: string, mimeType: string) => {
    const blob = new Blob([content], { type: mimeType })
    const url = URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.href = url
    link.download = filename
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
    URL.revokeObjectURL(url)
  }

  const clearSearch = () => {
    setSearchQuery('')
    setLogTypeFilter('all')
  }

  const logTypeCounts = useMemo(() => {
    const counts: Record<LogEntry['type'], number> = {
      info: 0,
      success: 0,
      error: 0,
      warning: 0,
      thinking: 0,
      action: 0
    }
    logs.forEach(log => {
      counts[log.type] = (counts[log.type] || 0) + 1
    })
    return counts
  }, [logs])

  const getElapsedTime = () => {
    if (!taskStartTime) return null
    
    try {
      const start = new Date(taskStartTime)
      const now = new Date()
      const diff = now.getTime() - start.getTime()
      const minutes = Math.floor(diff / 60000)
      const seconds = Math.floor((diff % 60000) / 1000)
      return `${minutes}m ${seconds}s`
    } catch {
      return null
    }
  }

  const canPause = status === 'running'
  const canResume = status === 'paused'
  const canStop = status === 'running' || status === 'paused'
  const canRestart = status === 'completed' || status === 'failed'

  return (
    <div className={`h-full flex flex-col space-y-4 ${className}`}>
      {/* Status Card */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center justify-between text-lg">
            <div className="flex items-center gap-2">
              <Activity className="w-5 h-5" />
              {t('monitor.sidebar.title', 'Task Status')}
            </div>
            <div className={`px-2 py-1 rounded-full border ${getStatusColor()}`}>
              {getStatusIcon()}
            </div>
          </CardTitle>
          {taskId && (
            <CardDescription className="text-xs">
              {t('monitor.sidebar.taskId', 'Task ID')}: {taskId.slice(0, 12)}...
            </CardDescription>
          )}
        </CardHeader>
        
        <CardContent className="space-y-4">
          {/* Connection Status */}
          <div className="flex items-center justify-between text-sm">
            <span>{t('monitor.sidebar.connection', 'Connection')}</span>
            <Badge variant={isConnected ? 'default' : 'secondary'}>
              {isConnected ? t('common.connected', 'Connected') : t('common.disconnected', 'Disconnected')}
            </Badge>
          </div>

          {/* Progress */}
          {progress > 0 && (
            <div className="space-y-2">
              <div className="flex items-center justify-between text-sm">
                <span>{t('monitor.sidebar.progress', 'Progress')}</span>
                <span className="text-slate-600">{Math.round(progress)}%</span>
              </div>
              <Progress value={progress} className="h-2" />
            </div>
          )}

          {/* Elapsed Time */}
          {getElapsedTime() && (
            <div className="flex items-center justify-between text-sm">
              <span>{t('monitor.sidebar.elapsed', 'Elapsed Time')}</span>
              <span className="text-slate-600">{getElapsedTime()}</span>
            </div>
          )}

          {/* Session Controls */}
          {sessionControls && (
            <>
              <Separator />
              <div className="space-y-2">
                <h4 className="text-sm font-medium">{t('monitor.sidebar.controls', 'Controls')}</h4>
                <div className="grid grid-cols-2 gap-2">
                  {canPause && (
                    <Button 
                      size="sm" 
                      variant="outline" 
                      onClick={sessionControls.onPause}
                      className="w-full"
                    >
                      <Pause className="w-4 h-4 mr-1" />
                      {t('common.pause', 'Pause')}
                    </Button>
                  )}
                  
                  {canResume && (
                    <Button 
                      size="sm" 
                      onClick={sessionControls.onResume}
                      className="w-full"
                    >
                      <Play className="w-4 h-4 mr-1" />
                      {t('common.resume', 'Resume')}
                    </Button>
                  )}
                  
                  {canStop && (
                    <Button 
                      size="sm" 
                      variant="destructive" 
                      onClick={sessionControls.onStop}
                      className="w-full"
                    >
                      <Square className="w-4 h-4 mr-1" />
                      {t('common.stop', 'Stop')}
                    </Button>
                  )}
                  
                  {canRestart && (
                    <Button 
                      size="sm" 
                      variant="outline" 
                      onClick={sessionControls.onRestart}
                      className="w-full"
                    >
                      <RotateCcw className="w-4 h-4 mr-1" />
                      {t('common.restart', 'Restart')}
                    </Button>
                  )}
                </div>
              </div>
            </>
          )}
        </CardContent>
      </Card>

      {/* Enhanced Activity Logs */}
      <Card className="flex-1 flex flex-col">
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="text-lg">
                {t('monitor.sidebar.activityLog', 'Activity Log')}
              </CardTitle>
              <CardDescription>
                {filteredLogs.length !== logs.length 
                  ? `${filteredLogs.length} of ${logs.length} logs`
                  : `${logs.length} total logs`
                }
              </CardDescription>
            </div>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setShowLogControls(!showLogControls)}
            >
              <Settings className="w-4 h-4" />
            </Button>
          </div>

          {/* Enhanced Log Controls */}
          {showLogControls && (
            <div className="mt-4 space-y-3">
              {/* Search */}
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-slate-400" />
                <Input
                  placeholder={t('monitor.logs.searchPlaceholder', 'Search logs...')}
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-10 pr-10 h-8"
                />
                {searchQuery && (
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={clearSearch}
                    className="absolute right-1 top-1/2 transform -translate-y-1/2 h-6 w-6 p-0"
                  >
                    <X className="w-3 h-3" />
                  </Button>
                )}
              </div>

              {/* Filter and Controls Row */}
              <div className="flex items-center gap-2">
                <Select value={logTypeFilter} onValueChange={(value) => setLogTypeFilter(value as any)}>
                  <SelectTrigger className="h-8 text-xs">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">
                      All Types ({logs.length})
                    </SelectItem>
                    {Object.entries(logTypeCounts).map(([type, count]) => (
                      count > 0 && (
                        <SelectItem key={type} value={type}>
                          {type} ({count})
                        </SelectItem>
                      )
                    ))}
                  </SelectContent>
                </Select>

                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setAutoScroll(!autoScroll)}
                  className="h-8 px-2"
                >
                  {autoScroll ? <Eye className="w-3 h-3" /> : <EyeOff className="w-3 h-3" />}
                </Button>

                <Select onValueChange={(value) => exportLogs(value as any)}>
                  <SelectTrigger className="h-8 w-20">
                    <Download className="w-3 h-3" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="json">JSON</SelectItem>
                    <SelectItem value="csv">CSV</SelectItem>
                    <SelectItem value="txt">TXT</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {/* Active Filters Display */}
              {(searchQuery || logTypeFilter !== 'all') && (
                <div className="flex items-center gap-2 text-xs">
                  <Filter className="w-3 h-3 text-slate-500" />
                  <span className="text-slate-600">Active filters:</span>
                  {searchQuery && (
                    <Badge variant="secondary" className="text-xs">
                      Search: "{searchQuery}"
                    </Badge>
                  )}
                  {logTypeFilter !== 'all' && (
                    <Badge variant="secondary" className="text-xs">
                      Type: {logTypeFilter}
                    </Badge>
                  )}
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={clearSearch}
                    className="h-5 px-1 text-xs"
                  >
                    Clear
                  </Button>
                </div>
              )}
            </div>
          )}
        </CardHeader>
        
        <CardContent className="flex-1 p-0">
          <ScrollArea className="h-full">
            <div className="p-4 space-y-3">
              {filteredLogs.length === 0 ? (
                <div className="text-center py-8 text-slate-500">
                  <MessageSquare className="w-8 h-8 mx-auto mb-2 opacity-50" />
                  <p className="text-sm">
                    {logs.length === 0 
                      ? t('monitor.sidebar.noActivity', 'No activity yet')
                      : t('monitor.logs.noResults', 'No logs match your filters')
                    }
                  </p>
                  {logs.length > 0 && filteredLogs.length === 0 && (
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={clearSearch}
                      className="mt-2"
                    >
                      Clear Filters
                    </Button>
                  )}
                </div>
              ) : (
                filteredLogs.map((log, index) => (
                  <div key={index} className="flex items-start space-x-3 text-sm">
                    <div className="mt-1">
                      {getLogIcon(log.type)}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between mb-1">
                        <span className="text-xs text-slate-500">
                          {formatTime(log.timestamp)}
                        </span>
                        <Badge variant="outline" className="text-xs">
                          {log.type}
                        </Badge>
                      </div>
                      <p className="text-slate-900 break-words">
                        {/* Highlight search terms */}
                        {searchQuery ? (
                          <span
                            dangerouslySetInnerHTML={{
                              __html: log.message.replace(
                                new RegExp(`(${searchQuery})`, 'gi'),
                                '<mark class="bg-yellow-200 px-1 rounded">$1</mark>'
                              )
                            }}
                          />
                        ) : (
                          log.message
                        )}
                      </p>
                      {log.details && (
                        <pre className="text-xs text-slate-600 mt-1 bg-slate-50 p-2 rounded overflow-x-auto">
                          {JSON.stringify(log.details, null, 2)}
                        </pre>
                      )}
                    </div>
                  </div>
                ))
              )}
              <div ref={logsEndRef} />
            </div>
          </ScrollArea>
        </CardContent>
      </Card>
    </div>
  )
}
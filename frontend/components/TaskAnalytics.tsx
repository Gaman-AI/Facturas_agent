'use client'

import React, { useState, useMemo, useEffect } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Progress } from '@/components/ui/progress'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { 
  BarChart3, 
  Clock, 
  TrendingUp, 
  Activity, 
  AlertTriangle, 
  CheckCircle, 
  Zap,
  Bot,
  Target,
  Timer,
  Gauge,
  PieChart,
  Download,
  RefreshCw
} from 'lucide-react'
import { useLanguage } from '@/contexts/LanguageContext'
import { LogEntry } from './StatusSidebar'

interface TaskMetrics {
  totalExecutionTime: number
  stepsCompleted: number
  errorsEncountered: number
  averageStepTime: number
  successRate: number
  performanceScore: number
}

interface TaskAnalyticsProps {
  taskId: string
  status: 'pending' | 'running' | 'paused' | 'completed' | 'failed' | 'connecting'
  logs: LogEntry[]
  startTime?: string
  endTime?: string
  className?: string
}

export function TaskAnalytics({
  taskId,
  status,
  logs,
  startTime,
  endTime,
  className = ''
}: TaskAnalyticsProps) {
  const { t } = useLanguage()
  const [refreshing, setRefreshing] = useState(false)

  // Calculate comprehensive task metrics
  const metrics = useMemo((): TaskMetrics => {
    const startTimestamp = startTime ? new Date(startTime).getTime() : Date.now()
    const endTimestamp = endTime ? new Date(endTime).getTime() : Date.now()
    const totalExecutionTime = Math.max(0, endTimestamp - startTimestamp)

    const actionLogs = logs.filter(log => log.type === 'action')
    const errorLogs = logs.filter(log => log.type === 'error')
    const successLogs = logs.filter(log => log.type === 'success')

    const stepsCompleted = actionLogs.length
    const errorsEncountered = errorLogs.length
    const successfulActions = successLogs.length

    const averageStepTime = stepsCompleted > 0 
      ? totalExecutionTime / stepsCompleted 
      : 0

    const successRate = stepsCompleted > 0 
      ? (successfulActions / stepsCompleted) * 100 
      : 0

    // Performance score based on execution time, success rate, and error count
    const timeEfficiencyScore = Math.max(0, 100 - (averageStepTime / 1000)) // Penalty for slow steps
    const reliabilityScore = successRate
    const errorPenalty = Math.min(50, errorsEncountered * 10) // Max 50 point penalty
    const performanceScore = Math.max(0, Math.min(100, 
      (timeEfficiencyScore * 0.3 + reliabilityScore * 0.5 + (100 - errorPenalty) * 0.2)
    ))

    return {
      totalExecutionTime,
      stepsCompleted,
      errorsEncountered,
      averageStepTime,
      successRate,
      performanceScore
    }
  }, [logs, startTime, endTime])

  // Log distribution analysis
  const logDistribution = useMemo(() => {
    const distribution: Record<LogEntry['type'], number> = {
      info: 0,
      success: 0,
      error: 0,
      warning: 0,
      thinking: 0,
      action: 0
    }

    logs.forEach(log => {
      distribution[log.type] = (distribution[log.type] || 0) + 1
    })

    return distribution
  }, [logs])

  // Performance timeline
  const timeline = useMemo(() => {
    if (logs.length === 0) return []

    const timelineData = logs.map((log, index) => {
      const timestamp = new Date(log.timestamp).getTime()
      const relativeTime = startTime 
        ? timestamp - new Date(startTime).getTime()
        : index * 1000 // Fallback for missing start time

      return {
        time: relativeTime,
        type: log.type,
        message: log.message,
        index
      }
    })

    return timelineData.sort((a, b) => a.time - b.time)
  }, [logs, startTime])

  const formatDuration = (ms: number) => {
    if (ms < 1000) return `${Math.round(ms)}ms`
    if (ms < 60000) return `${(ms / 1000).toFixed(1)}s`
    if (ms < 3600000) return `${Math.floor(ms / 60000)}m ${Math.floor((ms % 60000) / 1000)}s`
    return `${Math.floor(ms / 3600000)}h ${Math.floor((ms % 3600000) / 60000)}m`
  }

  const getPerformanceLevel = (score: number) => {
    if (score >= 80) return { level: 'Excellent', color: 'text-green-600', bg: 'bg-green-100' }
    if (score >= 60) return { level: 'Good', color: 'text-blue-600', bg: 'bg-blue-100' }
    if (score >= 40) return { level: 'Fair', color: 'text-yellow-600', bg: 'bg-yellow-100' }
    return { level: 'Poor', color: 'text-red-600', bg: 'bg-red-100' }
  }

  const performanceLevel = getPerformanceLevel(metrics.performanceScore)

  const handleRefresh = async () => {
    setRefreshing(true)
    // Simulate refresh delay
    await new Promise(resolve => setTimeout(resolve, 1000))
    setRefreshing(false)
  }

  const exportAnalytics = () => {
    const data = {
      taskId,
      status,
      metrics,
      logDistribution,
      timeline: timeline.slice(0, 100), // Limit timeline for export size
      generatedAt: new Date().toISOString()
    }

    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' })
    const url = URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.href = url
    link.download = `task-${taskId}-analytics-${new Date().toISOString().slice(0, 10)}.json`
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
    URL.revokeObjectURL(url)
  }

  return (
    <div className={`space-y-6 ${className}`}>
      {/* Header */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                <BarChart3 className="w-5 h-5" />
                {t('analytics.title', 'Task Analytics')}
              </CardTitle>
              <CardDescription>
                {t('analytics.subtitle', 'Performance insights and metrics for task')} {taskId.slice(0, 8)}...
              </CardDescription>
            </div>
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={handleRefresh}
                disabled={refreshing}
              >
                <RefreshCw className={`w-4 h-4 ${refreshing ? 'animate-spin' : ''}`} />
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={exportAnalytics}
              >
                <Download className="w-4 h-4" />
              </Button>
            </div>
          </div>
        </CardHeader>
        
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {/* Key Metrics */}
            <div className="text-center">
              <div className="text-2xl font-bold text-slate-900">{formatDuration(metrics.totalExecutionTime)}</div>
              <div className="text-xs text-slate-600 flex items-center justify-center gap-1">
                <Clock className="w-3 h-3" />
                Total Time
              </div>
            </div>
            
            <div className="text-center">
              <div className="text-2xl font-bold text-slate-900">{metrics.stepsCompleted}</div>
              <div className="text-xs text-slate-600 flex items-center justify-center gap-1">
                <Target className="w-3 h-3" />
                Steps Done
              </div>
            </div>
            
            <div className="text-center">
              <div className="text-2xl font-bold text-slate-900">{metrics.successRate.toFixed(1)}%</div>
              <div className="text-xs text-slate-600 flex items-center justify-center gap-1">
                <CheckCircle className="w-3 h-3" />
                Success Rate
              </div>
            </div>
            
            <div className="text-center">
              <div className={`text-2xl font-bold ${performanceLevel.color}`}>
                {metrics.performanceScore.toFixed(0)}
              </div>
              <div className="text-xs text-slate-600 flex items-center justify-center gap-1">
                <Gauge className="w-3 h-3" />
                Performance
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Detailed Analytics Tabs */}
      <Tabs defaultValue="overview" className="space-y-4">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="performance">Performance</TabsTrigger>
          <TabsTrigger value="logs">Log Analysis</TabsTrigger>
          <TabsTrigger value="timeline">Timeline</TabsTrigger>
        </TabsList>

        {/* Overview Tab */}
        <TabsContent value="overview" className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Card>
              <CardHeader>
                <CardTitle className="text-lg flex items-center gap-2">
                  <Gauge className="w-4 h-4" />
                  Performance Score
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-slate-600">Overall Score</span>
                    <Badge className={`${performanceLevel.bg} ${performanceLevel.color} border-0`}>
                      {performanceLevel.level}
                    </Badge>
                  </div>
                  <Progress value={metrics.performanceScore} className="h-3" />
                  <div className="text-center text-2xl font-bold">
                    {metrics.performanceScore.toFixed(1)}/100
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="text-lg flex items-center gap-2">
                  <Activity className="w-4 h-4" />
                  Activity Summary
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  <div className="flex justify-between">
                    <span className="text-sm">Total Logs</span>
                    <span className="font-medium">{logs.length}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-sm">Actions</span>
                    <span className="font-medium">{logDistribution.action}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-sm">Errors</span>
                    <span className="font-medium text-red-600">{logDistribution.error}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-sm">Avg Step Time</span>
                    <span className="font-medium">{formatDuration(metrics.averageStepTime)}</span>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* Performance Tab */}
        <TabsContent value="performance" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Performance Breakdown</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div>
                  <div className="flex justify-between mb-2">
                    <span className="text-sm">Time Efficiency</span>
                    <span className="text-sm">70%</span>
                  </div>
                  <Progress value={70} className="h-2" />
                </div>
                <div>
                  <div className="flex justify-between mb-2">
                    <span className="text-sm">Reliability</span>
                    <span className="text-sm">{metrics.successRate.toFixed(1)}%</span>
                  </div>
                  <Progress value={metrics.successRate} className="h-2" />
                </div>
                <div>
                  <div className="flex justify-between mb-2">
                    <span className="text-sm">Error Rate</span>
                    <span className="text-sm">{((metrics.errorsEncountered / logs.length) * 100).toFixed(1)}%</span>
                  </div>
                  <Progress value={(metrics.errorsEncountered / logs.length) * 100} className="h-2 [&>div]:bg-red-500" />
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Log Analysis Tab */}
        <TabsContent value="logs" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Log Distribution</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                {Object.entries(logDistribution).map(([type, count]) => {
                  const percentage = logs.length > 0 ? (count / logs.length) * 100 : 0
                  return (
                    <div key={type} className="text-center">
                      <div className="text-lg font-bold">{count}</div>
                      <div className="text-sm text-slate-600 capitalize">{type}</div>
                      <div className="text-xs text-slate-500">{percentage.toFixed(1)}%</div>
                    </div>
                  )
                })}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Timeline Tab */}
        <TabsContent value="timeline" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Execution Timeline</CardTitle>
              <CardDescription>
                Activity flow over time ({timeline.length} events)
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-2 max-h-96 overflow-y-auto">
                {timeline.slice(0, 20).map((event, index) => (
                  <div key={index} className="flex items-center space-x-3 p-2 rounded hover:bg-slate-50">
                    <div className="text-xs text-slate-500 w-16">
                      +{formatDuration(event.time)}
                    </div>
                    <Badge variant="outline" className="text-xs">
                      {event.type}
                    </Badge>
                    <div className="text-sm flex-1 truncate">
                      {event.message}
                    </div>
                  </div>
                ))}
                {timeline.length > 20 && (
                  <div className="text-center text-sm text-slate-500 py-2">
                    + {timeline.length - 20} more events
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  )
}
'use client'

import React, { useState, useEffect, useMemo } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Progress } from '@/components/ui/progress'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Button } from '@/components/ui/button'
import { 
  BarChart3, 
  Clock, 
  TrendingUp, 
  Activity, 
  AlertTriangle, 
  CheckCircle, 
  Zap,
  Target,
  Timer,
  Gauge,
  PieChart,
  Download,
  RefreshCw,
  Eye,
  AlertCircle,
  CheckCircle2,
  XCircle,
  Play,
  Pause,
  RotateCcw
} from 'lucide-react'
import { useLanguage } from '@/contexts/LanguageContext'

interface PerformanceMetrics {
  // Processing Times
  averageProcessingTime: number
  medianProcessingTime: number
  p95ProcessingTime: number
  p99ProcessingTime: number
  
  // OCR Accuracy
  overallOcrAccuracy: number
  vendorOcrAccuracy: Record<string, number>
  fieldAccuracy: Record<string, number>
  
  // Throughput
  invoicesPerHour: number
  invoicesPerDay: number
  peakThroughput: number
  
  // Success Rates
  overallSuccessRate: number
  errorRate: number
  retryRate: number
  
  // System Health
  cpuUsage: number
  memoryUsage: number
  queueSize: number
  activeConnections: number
}

interface ErrorMetrics {
  totalErrors: number
  errorTypes: Record<string, number>
  errorResolutionTimes: Record<string, number>
  errorPreventionRate: number
}

interface VendorPerformance {
  name: string
  accuracy: number
  avgProcessingTime: number
  successRate: number
  errorRate: number
  throughput: number
}

interface PerformanceMatrixProps {
  className?: string
}

export function PerformanceMatrix({ className = '' }: PerformanceMatrixProps) {
  const { t } = useLanguage()
  const [metrics, setMetrics] = useState<PerformanceMetrics | null>(null)
  const [errorMetrics, setErrorMetrics] = useState<ErrorMetrics | null>(null)
  const [vendorPerformance, setVendorPerformance] = useState<VendorPerformance[]>([])
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [selectedTimeRange, setSelectedTimeRange] = useState('24h')

  // Mock data - in production, this would come from API
  const mockMetrics: PerformanceMetrics = {
    averageProcessingTime: 78000, // 78 seconds
    medianProcessingTime: 72000, // 72 seconds
    p95ProcessingTime: 120000, // 120 seconds
    p99ProcessingTime: 180000, // 180 seconds
    overallOcrAccuracy: 92.1,
    vendorOcrAccuracy: {
      'OXXO': 94.2,
      'Walmart': 91.8,
      'Costco': 89.5,
      'Generic': 87.3
    },
    fieldAccuracy: {
      'Total Amount': 95.4,
      'Transaction Date': 94.2,
      'Merchant Name': 96.5,
      'Ticket ID': 89.3,
      'Folio Number': 90.2,
      'Store/Branch': 78.8,
      'Register/Terminal': 85.9,
      'Payment Type': 73.7,
      'Card Last 4': 69.3
    },
    invoicesPerHour: 30,
    invoicesPerDay: 720,
    peakThroughput: 45,
    overallSuccessRate: 95.2,
    errorRate: 4.8,
    retryRate: 12.3,
    cpuUsage: 45,
    memoryUsage: 65,
    queueSize: 8,
    activeConnections: 15
  }

  const mockErrorMetrics: ErrorMetrics = {
    totalErrors: 156,
    errorTypes: {
      'OCR Processing': 35,
      'Form Validation': 48,
      'Vendor Detection': 18,
      'Data Extraction': 42,
      'System Timeout': 8,
      'Network Error': 5
    },
    errorResolutionTimes: {
      'OCR Processing': 10000,
      'Form Validation': 5000,
      'Vendor Detection': 8000,
      'Data Extraction': 12000,
      'System Timeout': 30000,
      'Network Error': 15000
    },
    errorPreventionRate: 89.3
  }

  const mockVendorPerformance: VendorPerformance[] = [
    {
      name: 'OXXO',
      accuracy: 94.2,
      avgProcessingTime: 75000,
      successRate: 96.8,
      errorRate: 3.2,
      throughput: 12
    },
    {
      name: 'Walmart',
      accuracy: 91.8,
      avgProcessingTime: 82000,
      successRate: 94.5,
      errorRate: 5.5,
      throughput: 10
    },
    {
      name: 'Costco',
      accuracy: 89.5,
      avgProcessingTime: 95000,
      successRate: 92.1,
      errorRate: 7.9,
      throughput: 8
    },
    {
      name: 'Generic',
      accuracy: 87.3,
      avgProcessingTime: 105000,
      successRate: 89.7,
      errorRate: 10.3,
      throughput: 6
    }
  ]

  useEffect(() => {
    fetchMetrics()
  }, [selectedTimeRange])

  const fetchMetrics = async () => {
    setLoading(true)
    try {
      // Simulate API call
      await new Promise(resolve => setTimeout(resolve, 1000))
      
      setMetrics(mockMetrics)
      setErrorMetrics(mockErrorMetrics)
      setVendorPerformance(mockVendorPerformance)
    } catch (error) {
      console.error('Failed to fetch performance metrics:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleRefresh = async () => {
    setRefreshing(true)
    await fetchMetrics()
    setRefreshing(false)
  }

  const formatDuration = (ms: number) => {
    if (ms < 1000) return `${Math.round(ms)}ms`
    if (ms < 60000) return `${(ms / 1000).toFixed(1)}s`
    if (ms < 3600000) return `${Math.floor(ms / 60000)}m ${Math.floor((ms % 60000) / 1000)}s`
    return `${Math.floor(ms / 3600000)}h ${Math.floor((ms % 3600000) / 60000)}m`
  }

  const formatBytes = (bytes: number) => {
    if (bytes === 0) return '0 Bytes'
    const k = 1024
    const sizes = ['Bytes', 'KB', 'MB', 'GB']
    const i = Math.floor(Math.log(bytes) / Math.log(k))
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i]
  }

  const getPerformanceLevel = (value: number, thresholds: { good: number; warning: number }) => {
    if (value >= thresholds.good) return { level: 'Excellent', color: 'text-green-600', bg: 'bg-green-100' }
    if (value >= thresholds.warning) return { level: 'Good', color: 'text-blue-600', bg: 'bg-blue-100' }
    return { level: 'Needs Attention', color: 'text-red-600', bg: 'bg-red-100' }
  }

  const exportMetrics = () => {
    const data = {
      timestamp: new Date().toISOString(),
      timeRange: selectedTimeRange,
      metrics,
      errorMetrics,
      vendorPerformance
    }

    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' })
    const url = URL.createObjectURL(blob)
    
    const downloadLink = document.createElement('a')
    downloadLink.href = url
    downloadLink.download = `performance-metrics-${new Date().toISOString().slice(0, 10)}.json`
    downloadLink.style.display = 'none'
    
    document.body.appendChild(downloadLink)
    downloadLink.click()
    
    setTimeout(() => {
      if (document.body.contains(downloadLink)) {
        document.body.removeChild(downloadLink)
      }
      URL.revokeObjectURL(url)
    }, 100)
  }

  if (loading) {
    return (
      <div className={`space-y-6 ${className}`}>
        <Card>
          <CardContent className="flex items-center justify-center py-8">
            <RefreshCw className="w-6 h-6 animate-spin mr-2" />
            <span>Loading performance metrics...</span>
          </CardContent>
        </Card>
      </div>
    )
  }

  if (!metrics || !errorMetrics) {
    return (
      <div className={`space-y-6 ${className}`}>
        <Card>
          <CardContent className="flex items-center justify-center py-8">
            <AlertCircle className="w-6 h-6 text-red-500 mr-2" />
            <span>Failed to load performance metrics</span>
          </CardContent>
        </Card>
      </div>
    )
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
                Performance Matrix Dashboard
              </CardTitle>
              <CardDescription>
                Comprehensive performance metrics for invoice processing and OCR accuracy
              </CardDescription>
            </div>
            <div className="flex items-center gap-2">
              <select
                value={selectedTimeRange}
                onChange={(e) => setSelectedTimeRange(e.target.value)}
                className="px-3 py-1 border rounded-md text-sm"
              >
                <option value="1h">Last Hour</option>
                <option value="24h">Last 24 Hours</option>
                <option value="7d">Last 7 Days</option>
                <option value="30d">Last 30 Days</option>
              </select>
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
                onClick={exportMetrics}
              >
                <Download className="w-4 h-4" />
              </Button>
            </div>
          </div>
        </CardHeader>
      </Card>

      {/* Key Performance Indicators */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Avg Processing Time</p>
                <p className="text-2xl font-bold">{formatDuration(metrics.averageProcessingTime)}</p>
              </div>
              <div className="p-2 rounded-lg bg-blue-100">
                <Timer className="w-5 h-5 text-blue-600" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">OCR Accuracy</p>
                <p className="text-2xl font-bold">{metrics.overallOcrAccuracy.toFixed(1)}%</p>
              </div>
              <div className="p-2 rounded-lg bg-green-100">
                <Target className="w-5 h-5 text-green-600" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Success Rate</p>
                <p className="text-2xl font-bold">{metrics.overallSuccessRate.toFixed(1)}%</p>
              </div>
              <div className="p-2 rounded-lg bg-green-100">
                <CheckCircle2 className="w-5 h-5 text-green-600" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Throughput/Hour</p>
                <p className="text-2xl font-bold">{metrics.invoicesPerHour}</p>
              </div>
              <div className="p-2 rounded-lg bg-blue-100">
                <TrendingUp className="w-5 h-5 text-blue-600" />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Detailed Analytics Tabs */}
      <Tabs defaultValue="processing" className="space-y-4">
        <TabsList className="grid w-full grid-cols-5">
          <TabsTrigger value="processing">Processing Times</TabsTrigger>
          <TabsTrigger value="ocr">OCR Accuracy</TabsTrigger>
          <TabsTrigger value="errors">Error Analysis</TabsTrigger>
          <TabsTrigger value="vendors">Vendor Performance</TabsTrigger>
          <TabsTrigger value="system">System Health</TabsTrigger>
        </TabsList>

        {/* Processing Times Tab */}
        <TabsContent value="processing" className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Processing Time Distribution</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className="flex justify-between">
                    <span className="text-sm">Average</span>
                    <span className="font-medium">{formatDuration(metrics.averageProcessingTime)}</span>
                  </div>
                  <Progress value={65} className="h-2" />
                  
                  <div className="flex justify-between">
                    <span className="text-sm">Median</span>
                    <span className="font-medium">{formatDuration(metrics.medianProcessingTime)}</span>
                  </div>
                  <Progress value={60} className="h-2" />
                  
                  <div className="flex justify-between">
                    <span className="text-sm">95th Percentile</span>
                    <span className="font-medium">{formatDuration(metrics.p95ProcessingTime)}</span>
                  </div>
                  <Progress value={80} className="h-2" />
                  
                  <div className="flex justify-between">
                    <span className="text-sm">99th Percentile</span>
                    <span className="font-medium">{formatDuration(metrics.p99ProcessingTime)}</span>
                  </div>
                  <Progress value={100} className="h-2" />
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Throughput Metrics</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className="flex justify-between">
                    <span className="text-sm">Current Hour</span>
                    <span className="font-medium">{metrics.invoicesPerHour} invoices</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-sm">Daily Average</span>
                    <span className="font-medium">{metrics.invoicesPerDay} invoices</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-sm">Peak Performance</span>
                    <span className="font-medium">{metrics.peakThroughput} invoices/hour</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-sm">Success Rate</span>
                    <span className="font-medium">{metrics.overallSuccessRate.toFixed(1)}%</span>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* OCR Accuracy Tab */}
        <TabsContent value="ocr" className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Vendor OCR Accuracy</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {Object.entries(metrics.vendorOcrAccuracy).map(([vendor, accuracy]) => {
                    const level = getPerformanceLevel(accuracy, { good: 90, warning: 85 })
                    return (
                      <div key={vendor}>
                        <div className="flex justify-between mb-2">
                          <span className="text-sm">{vendor}</span>
                          <Badge className={`${level.bg} ${level.color} border-0`}>
                            {accuracy.toFixed(1)}%
                          </Badge>
                        </div>
                        <Progress value={accuracy} className="h-2" />
                      </div>
                    )
                  })}
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Field Accuracy</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {Object.entries(metrics.fieldAccuracy).map(([field, accuracy]) => {
                    const level = getPerformanceLevel(accuracy, { good: 90, warning: 80 })
                    return (
                      <div key={field}>
                        <div className="flex justify-between mb-2">
                          <span className="text-sm">{field}</span>
                          <span className="text-sm font-medium">{accuracy.toFixed(1)}%</span>
                        </div>
                        <Progress value={accuracy} className="h-2" />
                      </div>
                    )
                  })}
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* Error Analysis Tab */}
        <TabsContent value="errors" className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Error Distribution</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {Object.entries(errorMetrics.errorTypes).map(([type, count]) => {
                    const percentage = (count / errorMetrics.totalErrors) * 100
                    return (
                      <div key={type}>
                        <div className="flex justify-between mb-2">
                          <span className="text-sm">{type}</span>
                          <span className="text-sm font-medium">{count} ({percentage.toFixed(1)}%)</span>
                        </div>
                        <Progress value={percentage} className="h-2" />
                      </div>
                    )
                  })}
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Error Resolution Times</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {Object.entries(errorMetrics.errorResolutionTimes).map(([type, time]) => (
                    <div key={type}>
                      <div className="flex justify-between mb-2">
                        <span className="text-sm">{type}</span>
                        <span className="text-sm font-medium">{formatDuration(time)}</span>
                      </div>
                      <Progress value={Math.min(100, (time / 30000) * 100)} className="h-2" />
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </div>

          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Error Prevention</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-center">
                <div className="text-3xl font-bold text-green-600 mb-2">
                  {errorMetrics.errorPreventionRate.toFixed(1)}%
                </div>
                <p className="text-sm text-muted-foreground">Error Prevention Rate</p>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Vendor Performance Tab */}
        <TabsContent value="vendors" className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            {vendorPerformance.map((vendor) => (
              <Card key={vendor.name}>
                <CardHeader>
                  <CardTitle className="text-lg">{vendor.name}</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    <div>
                      <div className="flex justify-between text-sm mb-1">
                        <span>Accuracy</span>
                        <span>{vendor.accuracy.toFixed(1)}%</span>
                      </div>
                      <Progress value={vendor.accuracy} className="h-2" />
                    </div>
                    
                    <div>
                      <div className="flex justify-between text-sm mb-1">
                        <span>Avg Time</span>
                        <span>{formatDuration(vendor.avgProcessingTime)}</span>
                      </div>
                      <Progress value={Math.min(100, (vendor.avgProcessingTime / 120000) * 100)} className="h-2" />
                    </div>
                    
                    <div>
                      <div className="flex justify-between text-sm mb-1">
                        <span>Success Rate</span>
                        <span>{vendor.successRate.toFixed(1)}%</span>
                      </div>
                      <Progress value={vendor.successRate} className="h-2" />
                    </div>
                    
                    <div>
                      <div className="flex justify-between text-sm mb-1">
                        <span>Throughput</span>
                        <span>{vendor.throughput}/hour</span>
                      </div>
                      <Progress value={(vendor.throughput / 15) * 100} className="h-2" />
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </TabsContent>

        {/* System Health Tab */}
        <TabsContent value="system" className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Resource Usage</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div>
                    <div className="flex justify-between mb-2">
                      <span className="text-sm">CPU Usage</span>
                      <span className="text-sm font-medium">{metrics.cpuUsage}%</span>
                    </div>
                    <Progress value={metrics.cpuUsage} className="h-2" />
                  </div>
                  
                  <div>
                    <div className="flex justify-between mb-2">
                      <span className="text-sm">Memory Usage</span>
                      <span className="text-sm font-medium">{metrics.memoryUsage}%</span>
                    </div>
                    <Progress value={metrics.memoryUsage} className="h-2" />
                  </div>
                  
                  <div>
                    <div className="flex justify-between mb-2">
                      <span className="text-sm">Queue Size</span>
                      <span className="text-sm font-medium">{metrics.queueSize}</span>
                    </div>
                    <Progress value={Math.min(100, (metrics.queueSize / 50) * 100)} className="h-2" />
                  </div>
                  
                  <div>
                    <div className="flex justify-between mb-2">
                      <span className="text-sm">Active Connections</span>
                      <span className="text-sm font-medium">{metrics.activeConnections}</span>
                    </div>
                    <Progress value={Math.min(100, (metrics.activeConnections / 100) * 100)} className="h-2" />
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="text-lg">System Status</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <span className="text-sm">Database</span>
                    <Badge className="bg-green-100 text-green-600 border-0">
                      <CheckCircle className="w-3 h-3 mr-1" />
                      Healthy
                    </Badge>
                  </div>
                  
                  <div className="flex items-center justify-between">
                    <span className="text-sm">Queue System</span>
                    <Badge className="bg-green-100 text-green-600 border-0">
                      <CheckCircle className="w-3 h-3 mr-1" />
                      Healthy
                    </Badge>
                  </div>
                  
                  <div className="flex items-center justify-between">
                    <span className="text-sm">OCR Service</span>
                    <Badge className="bg-green-100 text-green-600 border-0">
                      <CheckCircle className="w-3 h-3 mr-1" />
                      Healthy
                    </Badge>
                  </div>
                  
                  <div className="flex items-center justify-between">
                    <span className="text-sm">Browserbase</span>
                    <Badge className="bg-green-100 text-green-600 border-0">
                      <CheckCircle className="w-3 h-3 mr-1" />
                      Healthy
                    </Badge>
                  </div>
                  
                  <div className="flex items-center justify-between">
                    <span className="text-sm">WebSocket</span>
                    <Badge className="bg-green-100 text-green-600 border-0">
                      <CheckCircle className="w-3 h-3 mr-1" />
                      Healthy
                    </Badge>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  )
}

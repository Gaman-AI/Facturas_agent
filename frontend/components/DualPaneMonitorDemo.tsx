'use client'

import React, { useState } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { Separator } from '@/components/ui/separator'
import { Play, Settings, TestTube, Monitor } from 'lucide-react'
import { useLanguage } from '@/contexts/LanguageContext'
import { DualPaneMonitor } from './DualPaneMonitor'

/**
 * Development Demo Component for testing Dual-Pane Monitor
 * This component provides a testing interface for the dual-pane monitoring system
 * during development. It should not be included in production builds.
 */
export function DualPaneMonitorDemo() {
  const { t } = useLanguage()
  const [demoTaskId, setDemoTaskId] = useState('demo_task_12345')
  const [demoSessionId, setDemoSessionId] = useState('session_demo_67890')
  const [demoLiveViewUrl, setDemoLiveViewUrl] = useState('https://www.browserbase.com/sessions/demo_67890')
  const [demoStatus, setDemoStatus] = useState<'pending' | 'running' | 'paused' | 'completed' | 'failed' | 'connecting'>('running')
  const [showDemo, setShowDemo] = useState(false)

  const statusOptions = [
    { value: 'pending', label: 'Pending', color: 'bg-slate-500' },
    { value: 'running', label: 'Running', color: 'bg-green-500' },
    { value: 'paused', label: 'Paused', color: 'bg-yellow-500' },
    { value: 'completed', label: 'Completed', color: 'bg-blue-500' },
    { value: 'failed', label: 'Failed', color: 'bg-red-500' },
    { value: 'connecting', label: 'Connecting', color: 'bg-orange-500' }
  ]

  const presetConfigs = [
    {
      name: 'Browserbase Demo',
      taskId: 'task_browserbase_demo',
      sessionId: 'session_bb_12345',
      liveViewUrl: 'https://www.browserbase.com/sessions/session_bb_12345',
      status: 'running' as const
    },
    {
      name: 'Local Development',
      taskId: 'task_local_dev',
      sessionId: 'session_local_67890',
      liveViewUrl: 'https://www.browserbase.com/sessions/session_local_67890',
      status: 'connecting' as const
    },
    {
      name: 'Error Testing',
      taskId: 'task_error_test',
      sessionId: 'session_error_99999',
      liveViewUrl: '',
      status: 'failed' as const
    }
  ]

  const handlePresetLoad = (preset: typeof presetConfigs[0]) => {
    setDemoTaskId(preset.taskId)
    setDemoSessionId(preset.sessionId)
    setDemoLiveViewUrl(preset.liveViewUrl)
    setDemoStatus(preset.status)
  }

  const handleStartDemo = () => {
    setShowDemo(true)
  }

  const handleStopDemo = () => {
    setShowDemo(false)
  }

  if (showDemo) {
    return (
      <div className="h-screen flex flex-col">
        {/* Demo Controls Header */}
        <div className="bg-yellow-50 border-b border-yellow-200 p-3">
          <div className="max-w-7xl mx-auto flex items-center justify-between">
            <div className="flex items-center gap-3">
              <TestTube className="w-5 h-5 text-yellow-600" />
              <span className="text-sm font-medium text-yellow-800">
                Development Demo Mode - Dual-Pane Monitor
              </span>
              <Badge variant="outline" className="text-yellow-700 border-yellow-300">
                Task: {demoTaskId}
              </Badge>
            </div>
            <Button size="sm" variant="outline" onClick={handleStopDemo}>
              Exit Demo
            </Button>
          </div>
        </div>

        {/* Demo Monitor */}
        <div className="flex-1">
          <DualPaneMonitor
            taskId={demoTaskId}
            sessionId={demoSessionId}
            liveViewUrl={demoLiveViewUrl}
            initialStatus={demoStatus}
          />
        </div>
      </div>
    )
  }

  return (
    <div className="max-w-4xl mx-auto p-6 space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <TestTube className="w-5 h-5 text-primary" />
            Dual-Pane Monitor Development Demo
          </CardTitle>
          <CardDescription>
            Test the dual-pane monitoring interface with configurable parameters.
            This tool is for development and testing purposes only.
          </CardDescription>
        </CardHeader>
        
        <CardContent className="space-y-6">
          {/* Preset Configurations */}
          <div className="space-y-3">
            <h3 className="text-sm font-medium">Quick Presets</h3>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
              {presetConfigs.map((preset, index) => (
                <Button
                  key={index}
                  variant="outline"
                  onClick={() => handlePresetLoad(preset)}
                  className="h-auto p-3 justify-start"
                >
                  <div className="text-left">
                    <div className="font-medium text-sm">{preset.name}</div>
                    <div className="text-xs text-muted-foreground">
                      Status: {preset.status}
                    </div>
                  </div>
                </Button>
              ))}
            </div>
          </div>

          <Separator />

          {/* Manual Configuration */}
          <div className="space-y-4">
            <h3 className="text-sm font-medium">Manual Configuration</h3>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <label className="text-sm font-medium">Task ID</label>
                <Input
                  value={demoTaskId}
                  onChange={(e) => setDemoTaskId(e.target.value)}
                  placeholder="Enter task ID"
                />
              </div>
              
              <div className="space-y-2">
                <label className="text-sm font-medium">Session ID</label>
                <Input
                  value={demoSessionId}
                  onChange={(e) => setDemoSessionId(e.target.value)}
                  placeholder="Enter session ID"
                />
              </div>
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium">Live View URL</label>
              <Input
                value={demoLiveViewUrl}
                onChange={(e) => setDemoLiveViewUrl(e.target.value)}
                placeholder="Enter Browserbase live view URL"
              />
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium">Initial Status</label>
              <div className="flex flex-wrap gap-2">
                {statusOptions.map((option) => (
                  <Button
                    key={option.value}
                    size="sm"
                    variant={demoStatus === option.value ? "default" : "outline"}
                    onClick={() => setDemoStatus(option.value as any)}
                    className="h-8"
                  >
                    <div className={`w-2 h-2 rounded-full ${option.color} mr-2`}></div>
                    {option.label}
                  </Button>
                ))}
              </div>
            </div>
          </div>

          <Separator />

          {/* Start Demo */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-sm font-medium">Demo Configuration</h3>
                <p className="text-xs text-muted-foreground">
                  Current setup will launch the dual-pane monitor with the above parameters
                </p>
              </div>
              <Button onClick={handleStartDemo} className="flex items-center gap-2">
                <Play className="w-4 h-4" />
                Start Demo
              </Button>
            </div>
            
            {/* Configuration Summary */}
            <div className="bg-slate-50 rounded-lg p-3 space-y-2">
              <div className="flex items-center justify-between text-xs">
                <span className="text-slate-600">Task ID:</span>
                <code className="bg-slate-200 px-1 rounded">{demoTaskId}</code>
              </div>
              <div className="flex items-center justify-between text-xs">
                <span className="text-slate-600">Session ID:</span>
                <code className="bg-slate-200 px-1 rounded">{demoSessionId}</code>
              </div>
              <div className="flex items-center justify-between text-xs">
                <span className="text-slate-600">Status:</span>
                <div className="flex items-center gap-1">
                  <div className={`w-2 h-2 rounded-full ${statusOptions.find(s => s.value === demoStatus)?.color}`}></div>
                  <span>{statusOptions.find(s => s.value === demoStatus)?.label}</span>
                </div>
              </div>
              <div className="flex items-center justify-between text-xs">
                <span className="text-slate-600">Live View:</span>
                <span className="text-slate-500 truncate max-w-[200px]">
                  {demoLiveViewUrl || 'Not set'}
                </span>
              </div>
            </div>
          </div>

          {/* Development Notes */}
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
            <div className="flex items-start gap-3">
              <Monitor className="w-5 h-5 text-blue-600 mt-0.5" />
              <div className="space-y-2">
                <h4 className="text-sm font-medium text-blue-900">Development Notes</h4>
                <ul className="text-xs text-blue-800 space-y-1">
                  <li>• The dual-pane monitor will attempt real API calls but gracefully fall back to mock data</li>
                  <li>• WebSocket connections will use the existing websocketService infrastructure</li>
                  <li>• Session controls will make real API calls (pause/resume/stop/restart)</li>
                  <li>• Live view URLs should point to valid Browserbase sessions for best results</li>
                  <li>• Mobile responsiveness switches to tab-based layout automatically</li>
                </ul>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
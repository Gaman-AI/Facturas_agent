"use client"

import { useState, useEffect, useCallback } from "react"
import { Play, Square, Monitor, Pause, RotateCcw } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { ApiService, Task, TaskStep } from "@/services/api"
import { websocketService, StepUpdateData, StatusChangeData } from "@/services/websocket"

interface ActivityLog {
  id: string
  type: 'info' | 'action' | 'thinking' | 'observation' | 'error' | 'success'
  message: string
  timestamp: string
}

export default function BrowserAgent() {
  const [task, setTask] = useState("")
  const [isRunning, setIsRunning] = useState(false)
  const [isPaused, setIsPaused] = useState(false)
  const [currentTaskId, setCurrentTaskId] = useState<string | null>(null)
  const [activityLogs, setActivityLogs] = useState<ActivityLog[]>([])
  const [wsConnected, setWsConnected] = useState(false)
  const [taskStatus, setTaskStatus] = useState<string>('')

  // Initialize activity log
  useEffect(() => {
    setActivityLogs([
      {
        id: '1',
        type: 'info',
        message: 'Browser Agent initialized and ready',
        timestamp: new Date().toLocaleTimeString()
      }
    ])
  }, [])

  // WebSocket event handlers
  const handleStepUpdate = useCallback((data: StepUpdateData) => {
    const logEntry: ActivityLog = {
      id: Date.now().toString(),
      type: data.step_type as ActivityLog['type'],
      message: data.content.message || JSON.stringify(data.content),
      timestamp: new Date().toLocaleTimeString()
    }
    
    setActivityLogs(prev => [...prev, logEntry])
  }, [])

  const handleStatusChange = useCallback((data: StatusChangeData) => {
    setTaskStatus(data.status)
    
    const statusMessages = {
      'pending': 'Task is pending...',
      'running': 'Agent is actively working...',
      'paused': 'Task has been paused',
      'completed': 'Task completed successfully!',
      'failed': `Task failed: ${data.error_message || 'Unknown error'}`
    }

    const logEntry: ActivityLog = {
      id: Date.now().toString(),
      type: data.status === 'completed' ? 'success' : data.status === 'failed' ? 'error' : 'info',
      message: statusMessages[data.status] || `Status changed to: ${data.status}`,
      timestamp: new Date().toLocaleTimeString()
    }
    
    setActivityLogs(prev => [...prev, logEntry])
    
    // Update UI state based on status
    setIsRunning(data.status === 'running')
    setIsPaused(data.status === 'paused')
  }, [])

  const handleConnectionStatus = useCallback((data: { connected: boolean, taskId: string }) => {
    setWsConnected(data.connected)
    
    const logEntry: ActivityLog = {
      id: Date.now().toString(),
      type: data.connected ? 'info' : 'error',
      message: data.connected ? 'Connected to real-time updates' : 'Lost connection to real-time updates',
      timestamp: new Date().toLocaleTimeString()
    }
    
    setActivityLogs(prev => [...prev, logEntry])
  }, [])

  const handleTaskCompleted = useCallback((data: any) => {
    const logEntry: ActivityLog = {
      id: Date.now().toString(),
      type: 'success',
      message: `Task completed! ${data.result ? `Result: ${JSON.stringify(data.result)}` : ''}`,
      timestamp: new Date().toLocaleTimeString()
    }
    
    setActivityLogs(prev => [...prev, logEntry])
    setIsRunning(false)
    setIsPaused(false)
  }, [])

  const handleError = useCallback((data: any) => {
    const logEntry: ActivityLog = {
      id: Date.now().toString(),
      type: 'error',
      message: `Error: ${data.message || JSON.stringify(data)}`,
      timestamp: new Date().toLocaleTimeString()
    }
    
    setActivityLogs(prev => [...prev, logEntry])
  }, [])

  // Set up WebSocket event listeners
  useEffect(() => {
    websocketService.on('step_update', handleStepUpdate)
    websocketService.on('status_change', handleStatusChange)
    websocketService.on('connection_status', handleConnectionStatus)
    websocketService.on('task_completed', handleTaskCompleted)
    websocketService.on('error', handleError)

    return () => {
      websocketService.off('step_update', handleStepUpdate)
      websocketService.off('status_change', handleStatusChange)
      websocketService.off('connection_status', handleConnectionStatus)
      websocketService.off('task_completed', handleTaskCompleted)
      websocketService.off('error', handleError)
    }
  }, [handleStepUpdate, handleStatusChange, handleConnectionStatus, handleTaskCompleted, handleError])

  const runTask = async () => {
    if (!task.trim()) return

    try {
      // Add initial log
      const startLog: ActivityLog = {
        id: Date.now().toString(),
        type: 'action',
        message: `Starting task: "${task}"`,
        timestamp: new Date().toLocaleTimeString()
      }
      setActivityLogs(prev => [...prev, startLog])

      // Create task via API
      const createdTask = await ApiService.createTask(task)
      setCurrentTaskId(createdTask.id)
      setIsRunning(true)
      setTaskStatus(createdTask.status)

      // Connect to WebSocket for real-time updates
      const connected = await websocketService.connect(createdTask.id)
      if (!connected) {
        throw new Error('Failed to establish real-time connection')
      }

      const successLog: ActivityLog = {
        id: Date.now().toString(),
        type: 'info',
        message: `Task created with ID: ${createdTask.id}`,
        timestamp: new Date().toLocaleTimeString()
      }
      setActivityLogs(prev => [...prev, successLog])

    } catch (error: any) {
      const errorLog: ActivityLog = {
        id: Date.now().toString(),
        type: 'error',
        message: `Failed to start task: ${error.message}`,
        timestamp: new Date().toLocaleTimeString()
      }
      setActivityLogs(prev => [...prev, errorLog])
      setIsRunning(false)
    }
  }

  const pauseTask = async () => {
    if (!currentTaskId) return

    try {
      await ApiService.pauseTask(currentTaskId)
      
      const pauseLog: ActivityLog = {
        id: Date.now().toString(),
        type: 'action',
        message: 'Task paused by user',
        timestamp: new Date().toLocaleTimeString()
      }
      setActivityLogs(prev => [...prev, pauseLog])
    } catch (error: any) {
      const errorLog: ActivityLog = {
        id: Date.now().toString(),
        type: 'error',
        message: `Failed to pause task: ${error.message}`,
        timestamp: new Date().toLocaleTimeString()
      }
      setActivityLogs(prev => [...prev, errorLog])
    }
  }

  const resumeTask = async () => {
    if (!currentTaskId) return

    try {
      await ApiService.resumeTask(currentTaskId)
      
      const resumeLog: ActivityLog = {
        id: Date.now().toString(),
        type: 'action',
        message: 'Task resumed by user',
        timestamp: new Date().toLocaleTimeString()
      }
      setActivityLogs(prev => [...prev, resumeLog])
    } catch (error: any) {
      const errorLog: ActivityLog = {
        id: Date.now().toString(),
        type: 'error',
        message: `Failed to resume task: ${error.message}`,
        timestamp: new Date().toLocaleTimeString()
      }
      setActivityLogs(prev => [...prev, errorLog])
    }
  }

  const stopTask = async () => {
    if (!currentTaskId) return

    try {
      await ApiService.stopTask(currentTaskId)
      websocketService.disconnect()
      
      const stopLog: ActivityLog = {
        id: Date.now().toString(),
        type: 'action',
        message: 'Task stopped by user',
        timestamp: new Date().toLocaleTimeString()
      }
      setActivityLogs(prev => [...prev, stopLog])
      
      setIsRunning(false)
      setIsPaused(false)
      setCurrentTaskId(null)
      setWsConnected(false)
    } catch (error: any) {
      const errorLog: ActivityLog = {
        id: Date.now().toString(),
        type: 'error',
        message: `Failed to stop task: ${error.message}`,
        timestamp: new Date().toLocaleTimeString()
      }
      setActivityLogs(prev => [...prev, errorLog])
    }
  }

  const resetInterface = () => {
    // Disconnect WebSocket if connected
    if (wsConnected) {
      websocketService.disconnect()
    }
    
    // Reset all state
    setTask("")
    setIsRunning(false)
    setIsPaused(false)
    setCurrentTaskId(null)
    setWsConnected(false)
    setTaskStatus("")
    setActivityLogs([
      {
        id: '1',
        type: 'info',
        message: 'Browser Agent initialized and ready',
        timestamp: new Date().toLocaleTimeString()
      }
    ])
  }

  const getLogColor = (type: ActivityLog['type']) => {
    switch (type) {
      case 'error': return 'text-red-600'
      case 'success': return 'text-green-600'
      case 'action': return 'text-blue-600'
      case 'thinking': return 'text-purple-600'
      case 'observation': return 'text-orange-600'
      default: return 'text-gray-600'
    }
  }

  const getLogPrefix = (type: ActivityLog['type']) => {
    switch (type) {
      case 'error': return '[ERROR]'
      case 'success': return '[SUCCESS]'
      case 'action': return '[ACTION]'
      case 'thinking': return '[THINKING]'
      case 'observation': return '[OBSERVATION]'
      default: return '[INFO]'
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 p-8">
      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <div className="text-center mb-8">
          <div className="w-16 h-16 bg-gradient-to-r from-blue-600 to-indigo-600 rounded-full flex items-center justify-center mx-auto mb-4">
            <Monitor className="w-8 h-8 text-white" />
          </div>
          <h1 className="text-4xl font-bold text-blue-900 mb-2">Browser Agent</h1>
          <p className="text-blue-600 text-lg">AI-Powered Web Automation</p>
          {wsConnected && (
            <div className="mt-2 flex items-center justify-center gap-2">
              <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
              <span className="text-sm text-green-600">Connected to real-time updates</span>
            </div>
          )}
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* Control Panel */}
          <div className="bg-white rounded-xl shadow-lg p-6 border border-blue-200">
            <h2 className="text-xl font-semibold text-blue-900 mb-4">Task Control</h2>

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-blue-700 mb-2">Enter your task:</label>
                <Input
                  value={task}
                  onChange={(e) => setTask(e.target.value)}
                  placeholder="e.g., Go to Google and search for 'web automation tools'"
                  className="w-full"
                  disabled={isRunning}
                />
              </div>

              <div className="flex gap-3">
                {!isRunning ? (
                  <Button
                    onClick={runTask}
                    disabled={!task.trim()}
                    className="flex-1 bg-gradient-to-r from-blue-600 to-indigo-600"
                  >
                    <Play className="w-4 h-4 mr-2" />
                    Run Task
                  </Button>
                ) : (
                  <>
                    {!isPaused ? (
                      <Button onClick={pauseTask} variant="outline" className="flex-1">
                        <Pause className="w-4 h-4 mr-2" />
                        Pause
                      </Button>
                    ) : (
                      <Button onClick={resumeTask} className="flex-1 bg-gradient-to-r from-green-600 to-green-700">
                        <Play className="w-4 h-4 mr-2" />
                        Resume
                      </Button>
                    )}
                    <Button onClick={stopTask} variant="destructive" className="flex-1">
                      <Square className="w-4 h-4 mr-2" />
                      Stop
                    </Button>
                  </>
                )}
                
                <Button onClick={resetInterface} variant="outline" size="icon">
                  <RotateCcw className="w-4 h-4" />
                </Button>
              </div>

              {taskStatus && (
                <div className="p-3 bg-blue-50 rounded-lg">
                  <p className="text-sm font-medium text-blue-700">
                    Status: <span className="capitalize">{taskStatus}</span>
                  </p>
                  {currentTaskId && (
                    <p className="text-xs text-blue-600 mt-1">
                      Task ID: {currentTaskId}
                    </p>
                  )}
                </div>
              )}
            </div>

            {/* Quick Tasks */}
            <div className="mt-6">
              <h3 className="text-lg font-medium text-blue-900 mb-3">Quick Tasks</h3>
              <div className="space-y-2">
                <button
                  onClick={() => setTask("Go to Google and search for 'AI automation tools'")}
                  className="w-full p-3 text-left bg-blue-50 hover:bg-blue-100 rounded-lg transition-colors"
                  disabled={isRunning}
                >
                  <div className="font-medium text-blue-900">Search Google</div>
                  <div className="text-sm text-blue-600">Navigate and perform search</div>
                </button>
                <button
                  onClick={() => setTask("Navigate to example.com and take a screenshot")}
                  className="w-full p-3 text-left bg-blue-50 hover:bg-blue-100 rounded-lg transition-colors"
                  disabled={isRunning}
                >
                  <div className="font-medium text-blue-900">Take Screenshot</div>
                  <div className="text-sm text-blue-600">Capture page content</div>
                </button>
                <button
                  onClick={() => setTask("Go to news.ycombinator.com and get the top 5 headlines")}
                  className="w-full p-3 text-left bg-blue-50 hover:bg-blue-100 rounded-lg transition-colors"
                  disabled={isRunning}
                >
                  <div className="font-medium text-blue-900">Get News Headlines</div>
                  <div className="text-sm text-blue-600">Extract structured data</div>
                </button>
              </div>
            </div>
          </div>

          {/* Browser Preview */}
          <div className="bg-white rounded-xl shadow-lg border border-blue-200 overflow-hidden">
            <div className="bg-gray-100 p-3 border-b flex items-center gap-2">
              <div className="flex gap-2">
                <div className="w-3 h-3 bg-red-500 rounded-full"></div>
                <div className="w-3 h-3 bg-yellow-500 rounded-full"></div>
                <div className="w-3 h-3 bg-green-500 rounded-full"></div>
              </div>
              <div className="flex-1 bg-white rounded px-3 py-1 text-sm text-gray-600">
                {isRunning ? "Agent controlling browser..." : "about:blank"}
              </div>
            </div>

            <div className="aspect-video bg-gradient-to-br from-gray-50 to-gray-100 flex items-center justify-center">
              <div className="text-center">
                {isRunning ? (
                  <>
                    <div className="w-12 h-12 border-4 border-blue-600 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
                    <p className="text-blue-700 font-medium">
                      {isPaused ? "Agent Paused" : "Agent Working"}
                    </p>
                    <p className="text-sm text-blue-600 mt-2">
                      {isPaused ? "Task execution is paused" : "AI agent is controlling the browser..."}
                    </p>
                  </>
                ) : (
                  <>
                    <Monitor className="w-16 h-16 text-gray-400 mx-auto mb-4" />
                    <h3 className="text-lg font-semibold text-gray-700 mb-2">Browser Preview</h3>
                    <p className="text-gray-500">Enter a task and click "Run Task" to start the AI agent</p>
                  </>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Activity Log */}
        <div className="mt-8 bg-white rounded-xl shadow-lg p-6 border border-blue-200">
          <h2 className="text-xl font-semibold text-blue-900 mb-4">Activity Log</h2>
          <div className="bg-gray-50 rounded-lg p-4 font-mono text-sm max-h-96 overflow-y-auto">
            {activityLogs.map((log) => (
              <div key={log.id} className="mb-1">
                <span className="text-gray-500">[{log.timestamp}]</span>{" "}
                <span className={getLogColor(log.type)}>{getLogPrefix(log.type)}</span>{" "}
                <span className="text-gray-800">{log.message}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}

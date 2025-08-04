'use client'

import React, { useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import { Separator } from '@/components/ui/separator'
import { 
  Monitor, 
  Play, 
  Square, 
  Maximize2, 
  Minimize2,
  Settings,
  Activity,
  Brain
} from 'lucide-react'
import AgentThinkingMonitor from '@/components/AgentThinkingMonitor'
import { ApiService } from '@/services/api'

export default function AgentMonitorPage() {
  const [taskDescription, setTaskDescription] = useState(`Go to https://facturacion.walmartmexico.com.mx/ and process facturación for this receipt:

Customer Details:
- RFC: DOGJ8603192W3
- Email: jji@gmail.com
- Company Name: JORGE DOMENZAIN GALINDO
- Country: Mexico
- Street: PRIV DEL MARQUEZ
- Exterior Number: 404  
- Interior Number: 4
- Colony: LOMAS 4A SECCION
- Municipality: San Luis Potosí
- Zip Code: 78216
- State: San Luis Potosí

Receipt Details:
- ID ticket: 957679964574563719968
- TR: 03621

Please use only the necessary details and complete the facturación process.`)

  const [isExecuting, setIsExecuting] = useState(false)
  const [currentTaskId, setCurrentTaskId] = useState<string | null>(null)
  const [executionResult, setExecutionResult] = useState<any>(null)
  const [isMonitorFullscreen, setIsMonitorFullscreen] = useState(false)
  const [executionError, setExecutionError] = useState<string | null>(null)

  const handleStartTask = async () => {
    if (!taskDescription.trim()) {
      alert('Please enter a task description')
      return
    }

    setIsExecuting(true)
    setExecutionError(null)
    setExecutionResult(null)
    
    try {
      console.log('🚀 Starting browser automation task with real-time monitoring...')
      
      const taskData = {
        task: taskDescription,
        model: 'gpt-4o-mini',
        llm_provider: 'openai',
        timeout_minutes: 15 // 15 minutes for complex facturación tasks
      }

      // Start the task execution
      const result = await ApiService.executeCFDITask({
        vendor_url: 'https://facturacion.walmartmexico.com.mx/',
        customer_details: {
          rfc: 'DOGJ8603192W3',
          email: 'jji@gmail.com',
          company_name: 'JORGE DOMENZAIN GALINDO'
        },
        invoice_details: {
          ticket_id: '957679964574563719968',
          total: 0 // Will be determined from the receipt
        },
        automation_config: {
          llm_provider: 'openai',
          model: 'gpt-4o-mini',
          timeout_minutes: 15
        }
      })

      console.log('✅ Task execution completed:', result)
      setExecutionResult(result)
      
      if (result.data?.task_id) {
        setCurrentTaskId(result.data.task_id)
      }
      
    } catch (error) {
      console.error('❌ Task execution failed:', error)
      setExecutionError(error.message || 'Task execution failed')
    } finally {
      setIsExecuting(false)
    }
  }

  const handleStopTask = () => {
    setIsExecuting(false)
    setCurrentTaskId(null)
    console.log('⏹️ Task execution stopped by user')
  }

  const toggleMonitorFullscreen = () => {
    setIsMonitorFullscreen(!isMonitorFullscreen)
  }

  return (
    <div className="min-h-screen bg-background">
      <div className="container mx-auto py-6 px-4">
        {/* Header */}
        <div className="mb-6">
          <div className="flex items-center space-x-3 mb-2">
            <Brain className="h-8 w-8 text-primary" />
            <h1 className="text-3xl font-bold">Agent Thinking Monitor</h1>
          </div>
          <p className="text-muted-foreground">
            Execute browser automation tasks and monitor the agent's thinking process in real-time
          </p>
        </div>

        {/* Main Content Grid */}
        <div className={`grid gap-6 ${isMonitorFullscreen ? 'grid-cols-1' : 'grid-cols-1 lg:grid-cols-2'}`}>
          
          {/* Task Configuration Panel */}
          {!isMonitorFullscreen && (
            <div className="space-y-6">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center space-x-2">
                    <Settings className="h-5 w-5" />
                    <span>Task Configuration</span>
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div>
                    <Label htmlFor="task-description">Task Description</Label>
                    <Textarea
                      id="task-description"
                      placeholder="Enter your browser automation task..."
                      value={taskDescription}
                      onChange={(e) => setTaskDescription(e.target.value)}
                      rows={12}
                      className="mt-2"
                    />
                  </div>

                  <div className="flex items-center space-x-3">
                    <Button
                      onClick={handleStartTask}
                      disabled={isExecuting || !taskDescription.trim()}
                      className="flex items-center space-x-2"
                    >
                      <Play className="h-4 w-4" />
                      <span>{isExecuting ? 'Executing...' : 'Start Task'}</span>
                    </Button>
                    
                    {isExecuting && (
                      <Button
                        onClick={handleStopTask}
                        variant="outline"
                        className="flex items-center space-x-2"
                      >
                        <Square className="h-4 w-4" />
                        <span>Stop</span>
                      </Button>
                    )}

                    <div className="flex items-center space-x-2">
                      <Badge variant={isExecuting ? 'default' : 'secondary'}>
                        {isExecuting ? '🟢 Running' : '⚪ Idle'}
                      </Badge>
                      {currentTaskId && (
                        <Badge variant="outline">
                          ID: {currentTaskId.substring(0, 8)}...
                        </Badge>
                      )}
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Execution Results */}
              {(executionResult || executionError) && (
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center space-x-2">
                      <Activity className="h-5 w-5" />
                      <span>Execution Result</span>
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    {executionError ? (
                      <div className="text-red-600 bg-red-50 p-4 rounded-lg">
                        <h4 className="font-semibold mb-2">Error</h4>
                        <p>{executionError}</p>
                      </div>
                    ) : executionResult ? (
                      <div className="space-y-3">
                        <div className="flex items-center space-x-2">
                          <Badge variant={executionResult.success ? 'default' : 'destructive'}>
                            {executionResult.success ? '✅ Success' : '❌ Failed'}
                          </Badge>
                          {executionResult.data?.execution_time && (
                            <Badge variant="outline">
                              {Math.round(executionResult.data.execution_time)}s
                            </Badge>
                          )}
                        </div>
                        
                        {executionResult.data?.thinking_history && (
                          <div>
                            <Label>Thinking Entries</Label>
                            <p className="text-sm text-muted-foreground">
                              Captured {executionResult.data.total_thinking_entries || 0} thinking updates
                            </p>
                          </div>
                        )}

                        {executionResult.data?.result && (
                          <div>
                            <Label>Result</Label>
                            <pre className="text-xs bg-muted p-3 rounded mt-2 max-h-32 overflow-auto">
                              {JSON.stringify(executionResult.data.result, null, 2)}
                            </pre>
                          </div>
                        )}
                      </div>
                    ) : null}
                  </CardContent>
                </Card>
              )}
            </div>
          )}

          {/* Agent Thinking Monitor Panel */}
          <div className={isMonitorFullscreen ? 'fixed inset-0 z-50' : ''}>
            <Card className={`h-full ${isMonitorFullscreen ? 'h-screen' : 'min-h-[600px]'}`}>
              <CardHeader className="flex-shrink-0">
                <div className="flex items-center justify-between">
                  <CardTitle className="flex items-center space-x-2">
                    <Monitor className="h-5 w-5" />
                    <span>Real-time Agent Thinking</span>
                  </CardTitle>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={toggleMonitorFullscreen}
                  >
                    {isMonitorFullscreen ? (
                      <Minimize2 className="h-4 w-4" />
                    ) : (
                      <Maximize2 className="h-4 w-4" />
                    )}
                  </Button>
                </div>
              </CardHeader>
              <CardContent className={`flex-1 ${isMonitorFullscreen ? 'h-full' : ''}`}>
                <AgentThinkingMonitor
                  taskId={currentTaskId}
                  isConnected={isExecuting}
                  onToggleFullscreen={toggleMonitorFullscreen}
                  isFullscreen={isMonitorFullscreen}
                />
              </CardContent>
            </Card>
          </div>
        </div>

        {/* Instructions */}
        <Card className="mt-6">
          <CardHeader>
            <CardTitle>How to Use the Agent Monitor</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
              <div>
                <h4 className="font-semibold mb-2">1. Configure Task</h4>
                <p className="text-muted-foreground">
                  Enter your browser automation task description. The default example shows a facturación task.
                </p>
              </div>
              <div>
                <h4 className="font-semibold mb-2">2. Start Monitoring</h4>
                <p className="text-muted-foreground">
                  Click "Start Task" to begin execution. The agent thinking monitor will show real-time updates.
                </p>
              </div>
              <div>
                <h4 className="font-semibold mb-2">3. Monitor Progress</h4>
                <p className="text-muted-foreground">
                  Watch the agent's thinking process, actions, observations, and memory updates in real-time.
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
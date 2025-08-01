"use client";

import React, { useState, useEffect, useRef } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { ApiService } from '@/services/api';
import { websocketService } from '@/services/websocket';

interface LogEntry {
  timestamp: string;
  message: string;
  type: 'info' | 'success' | 'error' | 'warning';
}

interface BrowserAgentRealtimeProps {
  apiUrl?: string;
}

const BrowserAgentRealtime: React.FC<BrowserAgentRealtimeProps> = ({ 
  apiUrl = process.env.NEXT_PUBLIC_API_BASE_URL || "http://localhost:8000" 
}) => {
  const [task, setTask] = useState("Search for OpenAI latest updates on Google");
  const [llmProvider, setLlmProvider] = useState("openai");
  const [model, setModel] = useState("gpt-4o");
  const [isConnected, setIsConnected] = useState(false);
  const [isRunning, setIsRunning] = useState(false);
  const [logs, setLogs] = useState<LogEntry[]>([]);
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [currentResult, setCurrentResult] = useState<any>(null);
  const [connectionError, setConnectionError] = useState<string | null>(null);
  const [isConnecting, setIsConnecting] = useState(false);
  const [browserWindowOpened, setBrowserWindowOpened] = useState(false);
  
  const logsContainerRef = useRef<HTMLDivElement>(null);

  // Check backend connection on component mount
  useEffect(() => {
    const checkConnection = async () => {
      try {
        const isConnected = await ApiService.testConnection();
        if (!isConnected) {
          setConnectionError("Cannot connect to backend. Please ensure the backend is running on port 8000.");
        }
      } catch (error) {
        setConnectionError("Failed to test backend connection.");
      }
    };
    
    checkConnection();
  }, []);

  // Set up WebSocket event listeners
  useEffect(() => {
    const handleConnectionStatus = (data: any) => {
      setIsConnected(data.connected);
      setIsConnecting(false);
      
      if (data.connected) {
        setConnectionError(null);
        if (data.sessionId) {
          addLog(`✅ Connected to browser agent session: ${data.sessionId}`, 'success');
        }
      } else {
        if (data.error) {
          setConnectionError(data.error);
          addLog(`❌ Connection failed: ${data.error}`, 'error');
        }
      }
    };

    const handleConnectionMessage = (data: any) => {
      addLog(`✅ ${data.message}`, 'success');
    };

    const handleTaskStart = (data: any) => {
      addLog(`🚀 Task started: ${data.task || data.message}`, 'info');
    };

    const handleTaskComplete = (data: any) => {
      addLog(`✅ Task completed successfully!`, 'success');
      setCurrentResult(data.result);
      setIsRunning(false);
    };

    const handleTaskError = (data: any) => {
      addLog(`❌ Task failed: ${data.error || data.message}`, 'error');
      setIsRunning(false);
    };

    const handleLogUpdate = (data: any) => {
      addLog(`📝 Browser agent is thinking and acting...`, 'info');
    };

    const handlePong = (data: any) => {
      // Handle ping-pong silently
    };

    // Add event listeners
    websocketService.on('connection_status', handleConnectionStatus);
    websocketService.on('connection', handleConnectionMessage);
    websocketService.on('task_start', handleTaskStart);
    websocketService.on('task_complete', handleTaskComplete);
    websocketService.on('task_error', handleTaskError);
    websocketService.on('log_update', handleLogUpdate);
    websocketService.on('pong', handlePong);

    // Cleanup event listeners on unmount
    return () => {
      websocketService.off('connection_status', handleConnectionStatus);
      websocketService.off('connection', handleConnectionMessage);
      websocketService.off('task_start', handleTaskStart);
      websocketService.off('task_complete', handleTaskComplete);
      websocketService.off('task_error', handleTaskError);
      websocketService.off('log_update', handleLogUpdate);
      websocketService.off('pong', handlePong);
    };
  }, []);

  const addLog = (message: string, type: LogEntry['type'] = 'info') => {
    const newLog: LogEntry = {
      timestamp: new Date().toLocaleTimeString(),
      message,
      type
    };
    setLogs(prev => [...prev, newLog]);
    
    // Auto-scroll to bottom
    setTimeout(() => {
      if (logsContainerRef.current) {
        logsContainerRef.current.scrollTop = logsContainerRef.current.scrollHeight;
      }
    }, 100);
  };

  const connectWebSocket = async () => {
    const newSessionId = `session_${Date.now()}`;
    setSessionId(newSessionId);
    setIsConnecting(true);
    setConnectionError(null);
    
    try {
      const connected = await websocketService.connectBrowserAgent(newSessionId);
      if (!connected) {
        throw new Error('Failed to establish WebSocket connection');
      }
    } catch (error) {
      setIsConnecting(false);
      const errorMessage = error instanceof Error ? error.message : 'Unknown connection error';
      setConnectionError(errorMessage);
      addLog(`❌ WebSocket connection failed: ${errorMessage}`, 'error');
    }
  };

  const startTask = async () => {
    if (!task.trim()) {
      addLog('❌ Please enter a task description', 'error');
      return;
    }
    
    setIsRunning(true);
    setCurrentResult(null);
    setLogs([]);
    setBrowserWindowOpened(false);
    
    // Add prominent notification about browser window
    addLog('🚀 Starting browser agent...', 'info');
    addLog('👀 A browser window will open shortly - watch for the agent\'s actions!', 'info');
    addLog('⏱️ Actions are slowed down for better visibility', 'info');
    
    // Connect WebSocket first
    await connectWebSocket();
    
    // Wait a bit for connection to establish
    setTimeout(async () => {
      try {
        const response = await ApiService.createBrowserUseTask({
          prompt: task,
          model: model
        });
        
        addLog(`📋 Task submitted successfully: ${response.data.task_id}`, 'success');
        setBrowserWindowOpened(true);
        addLog('🌐 Browser window should now be visible - the agent is working!', 'success');
        
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : 'Unknown error';
        addLog(`❌ Error starting task: ${errorMessage}`, 'error');
        setIsRunning(false);
        
        // Check if it's a connection error
        if (errorMessage.includes('ECONNREFUSED') || errorMessage.includes('Network Error')) {
          setConnectionError("Cannot connect to backend. Please ensure the backend is running on port 8000.");
        }
      }
    }, 1000);
  };

  const stopTask = () => {
    websocketService.disconnect();
    setIsRunning(false);
    setIsConnected(false);
    setSessionId(null);
    addLog('🛑 Task stopped by user', 'info');
  };

  const clearLogs = () => {
    setLogs([]);
    setCurrentResult(null);
  };

  const reconnect = async () => {
    websocketService.disconnect();
    setIsConnected(false);
    setConnectionError(null);
    
    if (sessionId) {
      await connectWebSocket();
    }
  };

  const getLogBadgeColor = (type: LogEntry['type']) => {
    switch (type) {
      case 'success': return 'bg-green-100 text-green-800';
      case 'error': return 'bg-red-100 text-red-800';
      case 'warning': return 'bg-yellow-100 text-yellow-800';
      default: return 'bg-blue-100 text-blue-800';
    }
  };

  return (
    <div className="container mx-auto p-4 space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center justify-between">
            <span>🤖 Browser Agent Realtime</span>
            <div className="flex items-center gap-2">
              <Badge variant={isConnected ? "default" : "secondary"}>
                {isConnecting ? "Connecting..." : isConnected ? "Connected" : "Disconnected"}
              </Badge>
              {!isConnected && !isConnecting && (
                <Button size="sm" onClick={reconnect} variant="outline">
                  Reconnect
                </Button>
              )}
            </div>
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Connection Error Alert */}
          {connectionError && (
            <Alert className="border-red-200 bg-red-50">
              <AlertDescription className="text-red-800">
                <strong>Connection Error:</strong> {connectionError}
                <div className="mt-2 text-sm">
                  <p>Please ensure:</p>
                  <ul className="list-disc list-inside ml-4">
                    <li>Backend server is running on port 8000</li>
                    <li>Run: <code className="bg-gray-100 px-1 rounded">cd backend && python main.py</code></li>
                    <li>Check if port 8000 is available</li>
                  </ul>
                </div>
              </AlertDescription>
            </Alert>
          )}

          {/* Browser Window Information */}
          <Alert className="border-blue-200 bg-blue-50">
            <AlertDescription className="text-blue-800">
              <strong>👀 Browser Window Visibility:</strong> When you start a task, a separate browser window will open where you can see the agent interacting with web pages.
              <div className="mt-2 text-sm">
                <p>What to expect:</p>
                <ul className="list-disc list-inside ml-4">
                  <li>🌐 A new browser window will appear on your screen</li>
                  <li>⏱️ Actions are slowed down for better visibility (1-2 seconds between actions)</li>
                  <li>🤖 You'll see the agent clicking, typing, and navigating automatically</li>
                  <li>📊 Real-time logs will appear below while the browser runs</li>
                </ul>
              </div>
              {browserWindowOpened && (
                <div className="mt-2 p-2 bg-green-100 border border-green-200 rounded">
                  <p className="text-green-800 font-medium">✅ Browser window should now be visible - look for the agent's actions!</p>
                </div>
              )}
            </AlertDescription>
          </Alert>

          {/* Task Configuration */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <label className="text-sm font-medium">Task Description</label>
              <Textarea
                value={task}
                onChange={(e) => setTask(e.target.value)}
                placeholder="Enter your browser automation task..."
                className="min-h-[100px]"
              />
            </div>
            
            <div className="space-y-4">
              <div className="space-y-2">
                <label className="text-sm font-medium">LLM Provider</label>
                <Select value={llmProvider} onValueChange={setLlmProvider}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="openai">OpenAI</SelectItem>
                    <SelectItem value="anthropic">Anthropic</SelectItem>
                    <SelectItem value="google">Google</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              
              <div className="space-y-2">
                <label className="text-sm font-medium">Model</label>
                <Select value={model} onValueChange={setModel}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="gpt-4o">GPT-4o</SelectItem>
                    <SelectItem value="gpt-4o-mini">GPT-4o-mini</SelectItem>
                    <SelectItem value="claude-3-sonnet-20240229">Claude 3 Sonnet</SelectItem>
                    <SelectItem value="gemini-pro">Gemini Pro</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          </div>

          {/* Control Buttons */}
          <div className="flex gap-2">
            <Button
              onClick={startTask}
              disabled={isRunning || isConnecting}
              className="flex-1"
            >
              {isRunning ? "Running..." : "🚀 Start Browser Agent"}
            </Button>
            <Button
              onClick={stopTask}
              disabled={!isRunning}
              variant="outline"
            >
              ⏹️ Stop
            </Button>
            <Button
              onClick={clearLogs}
              variant="outline"
            >
              🗑️ Clear Logs
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Logs and Results */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Activity Log */}
        <Card>
          <CardHeader>
            <CardTitle>📋 Activity Log</CardTitle>
          </CardHeader>
          <CardContent>
            <div
              ref={logsContainerRef}
              className="h-96 overflow-y-auto space-y-2 p-2 bg-gray-50 rounded-md"
            >
              {logs.length === 0 ? (
                <p className="text-gray-500 text-center py-8">
                  No activity yet. Start a task to see logs appear here.
                </p>
              ) : (
                logs.map((log, index) => (
                  <div key={index} className="flex items-start gap-2 p-2 bg-white rounded shadow-sm">
                    <Badge className={getLogBadgeColor(log.type)}>
                      {log.timestamp}
                    </Badge>
                    <span className="text-sm flex-1">{log.message}</span>
                  </div>
                ))
              )}
            </div>
          </CardContent>
        </Card>

        {/* Task Result */}
        <Card>
          <CardHeader>
            <CardTitle>📊 Task Result</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-96 overflow-y-auto p-2 bg-gray-50 rounded-md">
              {currentResult ? (
                <pre className="text-sm text-gray-700 whitespace-pre-wrap">
                  {JSON.stringify(currentResult, null, 2)}
                </pre>
              ) : (
                <p className="text-gray-500 text-center py-8">
                  Task results will appear here when completed.
                </p>
              )}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Connection Status */}
      <Card>
        <CardHeader>
          <CardTitle>🔗 Connection Status</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="space-y-2">
              <label className="text-sm font-medium">Backend API</label>
              <Badge variant={connectionError ? "destructive" : "default"}>
                {connectionError ? "Disconnected" : "Connected"}
              </Badge>
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">WebSocket</label>
              <Badge variant={isConnected ? "default" : "secondary"}>
                {isConnected ? "Connected" : "Disconnected"}
              </Badge>
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">Session ID</label>
              <span className="text-sm text-gray-600">
                {sessionId || "Not connected"}
              </span>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default BrowserAgentRealtime; 
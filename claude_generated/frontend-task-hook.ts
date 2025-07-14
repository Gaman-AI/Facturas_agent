import { useState, useEffect, useCallback, useRef } from 'react';
import { ApiService, Task, TaskStep } from '../services/apiService';
import { webSocketService, WebSocketMessage, StepUpdateData, StatusChangeData } from '../services/webSocketService';

interface UseTaskResult {
  // Task data
  task: Task | null;
  steps: TaskStep[];
  isLoading: boolean;
  error: string | null;
  
  // Connection status
  isConnected: boolean;
  
  // Actions
  createTask: (prompt: string) => Promise<void>;
  pauseTask: () => Promise<void>;
  resumeTask: () => Promise<void>;
  stopTask: () => Promise<void>;
  
  // Cleanup
  disconnect: () => void;
}

export const useTask = (taskId?: string): UseTaskResult => {
  const [task, setTask] = useState<Task | null>(null);
  const [steps, setSteps] = useState<TaskStep[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isConnected, setIsConnected] = useState(false);
  
  // Use ref to store current taskId to avoid stale closures
  const currentTaskIdRef = useRef(taskId);
  currentTaskIdRef.current = taskId;

  // WebSocket message handler
  const handleWebSocketMessage = useCallback((message: WebSocketMessage) => {
    console.log('Received WebSocket message:', message);
    
    if (message.task_id !== currentTaskIdRef.current) return;
    
    switch (message.type) {
      case 'step_update':
        const stepData = message.data as StepUpdateData;
        const newStep: TaskStep = {
          id: Date.now(), // Temporary ID
          task_id: message.task_id,
          step_type: stepData.step_type,
          content: stepData.content,
          timestamp: stepData.timestamp || new Date().toISOString(),
        };
        
        setSteps(prevSteps => [...prevSteps, newStep]);
        break;
        
      case 'status_change':
        const statusData = message.data as StatusChangeData;
        setTask(prevTask => {
          if (!prevTask) return prevTask;
          return {
            ...prevTask,
            status: statusData.status as any,
            error_message: statusData.error_message,
            completed_at: ['completed', 'failed'].includes(statusData.status) 
              ? new Date().toISOString() 
              : prevTask.completed_at
          };
        });
        
        if (statusData.error_message) {
          setError(statusData.error_message);
        }
        break;
        
      case 'error':
        setError(message.data.message || 'An error occurred');
        break;
    }
  }, []);

  // Connect to WebSocket when taskId is provided
  useEffect(() => {
    if (!taskId) return;

    const connectWebSocket = async () => {
      try {
        setIsConnected(false);
        
        // Setup event handlers
        webSocketService.onMessage(handleWebSocketMessage);
        webSocketService.onConnect(() => {
          console.log('WebSocket connected');
          setIsConnected(true);
        });
        webSocketService.onDisconnect(() => {
          console.log('WebSocket disconnected');
          setIsConnected(false);
        });
        webSocketService.onError((error) => {
          console.error('WebSocket error:', error);
          setError('Connection error occurred');
          setIsConnected(false);
        });
        
        // Connect to WebSocket
        await webSocketService.connect(taskId);
        
      } catch (error) {
        console.error('Failed to connect to WebSocket:', error);
        setError('Failed to connect to real-time updates');
      }
    };

    connectWebSocket();

    // Cleanup function
    return () => {
      webSocketService.disconnect();
      setIsConnected(false);
    };
  }, [taskId, handleWebSocketMessage]);

  // Load task data when taskId changes
  useEffect(() => {
    if (!taskId) return;

    const loadTask = async () => {
      setIsLoading(true);
      setError(null);
      
      try {
        // Load task details
        const taskData = await ApiService.getTask(taskId);
        setTask(taskData);
        
        // Load existing steps
        const stepsData = await ApiService.getTaskSteps(taskId);
        setSteps(stepsData.steps);
        
      } catch (error: any) {
        console.error('Failed to load task:', error);
        setError(error.response?.data?.detail || 'Failed to load task');
      } finally {
        setIsLoading(false);
      }
    };

    loadTask();
  }, [taskId]);

  // Action functions
  const createTask = useCallback(async (prompt: string): Promise<void> => {
    setIsLoading(true);
    setError(null);
    
    try {
      const newTask = await ApiService.createTask(prompt);
      setTask(newTask);
      setSteps([]);
      
      // If we have a new task ID, the useEffect will handle WebSocket connection
      
    } catch (error: any) {
      console.error('Failed to create task:', error);
      setError(error.response?.data?.detail || 'Failed to create task');
      throw error;
    } finally {
      setIsLoading(false);
    }
  }, []);

  const pauseTask = useCallback(async (): Promise<void> => {
    if (!taskId) return;
    
    try {
      await ApiService.pauseTask(taskId);
      // Status will be updated via WebSocket
    } catch (error: any) {
      console.error('Failed to pause task:', error);
      setError(error.response?.data?.detail || 'Failed to pause task');
      throw error;
    }
  }, [taskId]);

  const resumeTask = useCallback(async (): Promise<void> => {
    if (!taskId) return;
    
    try {
      await ApiService.resumeTask(taskId);
      // Status will be updated via WebSocket
    } catch (error: any) {
      console.error('Failed to resume task:', error);
      setError(error.response?.data?.detail || 'Failed to resume task');
      throw error;
    }
  }, [taskId]);

  const stopTask = useCallback(async (): Promise<void> => {
    if (!taskId) return;
    
    try {
      await ApiService.stopTask(taskId);
      // Status will be updated via WebSocket
    } catch (error: any) {
      console.error('Failed to stop task:', error);
      setError(error.response?.data?.detail || 'Failed to stop task');
      throw error;
    }
  }, [taskId]);

  const disconnect = useCallback(() => {
    webSocketService.disconnect();
    setIsConnected(false);
  }, []);

  return {
    task,
    steps,
    isLoading,
    error,
    isConnected,
    createTask,
    pauseTask,
    resumeTask,
    stopTask,
    disconnect
  };
};

// Hook for managing multiple tasks (for dashboard)
export const useTasks = () => {
  const [tasks, setTasks] = useState<Task[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const loadTasks = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    
    try {
      const tasksData = await ApiService.getTasks();
      setTasks(tasksData);
    } catch (error: any) {
      console.error('Failed to load tasks:', error);
      setError(error.response?.data?.detail || 'Failed to load tasks');
    } finally {
      setIsLoading(false);
    }
  }, []);

  const deleteTask = useCallback(async (taskId: string): Promise<void> => {
    try {
      await ApiService.deleteTask(taskId);
      setTasks(prevTasks => prevTasks.filter(t => t.id !== taskId));
    } catch (error: any) {
      console.error('Failed to delete task:', error);
      setError(error.response?.data?.detail || 'Failed to delete task');
      throw error;
    }
  }, []);

  const refreshTasks = useCallback(() => {
    loadTasks();
  }, [loadTasks]);

  // Load tasks on mount
  useEffect(() => {
    loadTasks();
  }, [loadTasks]);

  return {
    tasks,
    isLoading,
    error,
    loadTasks,
    deleteTask,
    refreshTasks
  };
};
'use client';

import { ApiService, Task } from './api';

export interface TaskUpdate {
  taskId: string;
  task: Task;
  timestamp: Date;
}

export interface TaskMonitorOptions {
  pollingInterval?: number; // in milliseconds
  autoStart?: boolean;
}

export class TaskMonitorService {
  private static instance: TaskMonitorService | null = null;
  private subscribers: Map<string, Set<(update: TaskUpdate) => void>> = new Map();
  private globalSubscribers: Set<(update: TaskUpdate) => void> = new Set();
  private monitoredTasks: Set<string> = new Set();
  private pollingInterval: number;
  private isPolling: boolean = false;
  private pollingTimer: NodeJS.Timeout | null = null;
  private lastTaskStates: Map<string, Task> = new Map();

  private constructor(options: TaskMonitorOptions = {}) {
    this.pollingInterval = options.pollingInterval || 3000; // Default 3 seconds
    
    if (options.autoStart !== false) {
      this.startPolling();
    }
  }

  static getInstance(options?: TaskMonitorOptions): TaskMonitorService {
    if (!TaskMonitorService.instance) {
      TaskMonitorService.instance = new TaskMonitorService(options);
    }
    return TaskMonitorService.instance;
  }

  // Subscribe to updates for a specific task
  subscribeToTask(taskId: string, callback: (update: TaskUpdate) => void): () => void {
    if (!this.subscribers.has(taskId)) {
      this.subscribers.set(taskId, new Set());
    }
    this.subscribers.get(taskId)!.add(callback);
    this.monitoredTasks.add(taskId);

    // Return unsubscribe function
    return () => {
      const taskSubscribers = this.subscribers.get(taskId);
      if (taskSubscribers) {
        taskSubscribers.delete(callback);
        if (taskSubscribers.size === 0) {
          this.subscribers.delete(taskId);
          this.monitoredTasks.delete(taskId);
        }
      }
    };
  }

  // Subscribe to all task updates
  subscribeToAll(callback: (update: TaskUpdate) => void): () => void {
    this.globalSubscribers.add(callback);

    // Return unsubscribe function
    return () => {
      this.globalSubscribers.delete(callback);
    };
  }

  // Monitor a task (add to monitoring list)
  monitorTask(taskId: string): void {
    this.monitoredTasks.add(taskId);
  }

  // Stop monitoring a task
  stopMonitoringTask(taskId: string): void {
    this.monitoredTasks.delete(taskId);
    this.subscribers.delete(taskId);
    this.lastTaskStates.delete(taskId);
  }

  // Start the polling mechanism
  startPolling(): void {
    if (this.isPolling) {
      return;
    }

    this.isPolling = true;
    this.pollTasks();
  }

  // Stop the polling mechanism
  stopPolling(): void {
    this.isPolling = false;
    if (this.pollingTimer) {
      clearTimeout(this.pollingTimer);
      this.pollingTimer = null;
    }
  }

  // Update polling interval
  setPollingInterval(interval: number): void {
    this.pollingInterval = interval;
    if (this.isPolling) {
      this.stopPolling();
      this.startPolling();
    }
  }

  // Get current monitoring status
  getMonitoringStatus(): {
    isPolling: boolean;
    monitoredTaskCount: number;
    subscriberCount: number;
    pollingInterval: number;
  } {
    return {
      isPolling: this.isPolling,
      monitoredTaskCount: this.monitoredTasks.size,
      subscriberCount: this.subscribers.size + this.globalSubscribers.size,
      pollingInterval: this.pollingInterval
    };
  }

  // Force an immediate check
  async checkNow(): Promise<void> {
    if (this.monitoredTasks.size === 0) {
      return;
    }

    await this.fetchAndNotify();
  }

  // Clear all monitoring
  clearAll(): void {
    this.monitoredTasks.clear();
    this.subscribers.clear();
    this.globalSubscribers.clear();
    this.lastTaskStates.clear();
  }

  // Private methods
  private async pollTasks(): Promise<void> {
    if (!this.isPolling) {
      return;
    }

    try {
      await this.fetchAndNotify();
    } catch (error) {
      console.warn('Task monitoring poll failed:', error);
    }

    // Schedule next poll
    this.pollingTimer = setTimeout(() => {
      this.pollTasks();
    }, this.pollingInterval);
  }

  private async fetchAndNotify(): Promise<void> {
    if (this.monitoredTasks.size === 0) {
      return;
    }

    // Fetch current task states
    const taskPromises = Array.from(this.monitoredTasks).map(async (taskId) => {
      try {
        const task = await ApiService.getTask(taskId);
        return { taskId, task, success: true };
      } catch (error) {
        console.warn(`Failed to fetch task ${taskId}:`, error);
        return { taskId, task: null, success: false };
      }
    });

    const results = await Promise.all(taskPromises);

    // Process results and notify subscribers
    for (const result of results) {
      if (!result.success || !result.task) {
        continue;
      }

      const { taskId, task } = result;
      const lastState = this.lastTaskStates.get(taskId);
      
      // Check if task state has changed
      const hasChanged = !lastState || this.hasTaskChanged(lastState, task);
      
      if (hasChanged) {
        this.lastTaskStates.set(taskId, { ...task });
        
        const update: TaskUpdate = {
          taskId,
          task,
          timestamp: new Date()
        };

        // Notify task-specific subscribers
        const taskSubscribers = this.subscribers.get(taskId);
        if (taskSubscribers) {
          taskSubscribers.forEach(callback => {
            try {
              callback(update);
            } catch (error) {
              console.error('Error in task subscriber callback:', error);
            }
          });
        }

        // Notify global subscribers
        this.globalSubscribers.forEach(callback => {
          try {
            callback(update);
          } catch (error) {
            console.error('Error in global subscriber callback:', error);
          }
        });
      }
    }
  }

  private hasTaskChanged(oldTask: Task, newTask: Task): boolean {
    return (
      oldTask.status !== newTask.status ||
      oldTask.completed_at !== newTask.completed_at ||
      oldTask.error_message !== newTask.error_message ||
      JSON.stringify(oldTask.result) !== JSON.stringify(newTask.result) ||
      (oldTask.steps?.length || 0) !== (newTask.steps?.length || 0)
    );
  }

  // Cleanup method
  destroy(): void {
    this.stopPolling();
    this.clearAll();
    TaskMonitorService.instance = null;
  }
}

// React Hook for easy integration
import { useEffect, useState, useCallback } from 'react';

export function useTaskMonitor(
  taskId?: string, 
  options: TaskMonitorOptions = {}
): {
  task: Task | null;
  isMonitoring: boolean;
  lastUpdate: Date | null;
  refresh: () => Promise<void>;
} {
  const [task, setTask] = useState<Task | null>(null);
  const [lastUpdate, setLastUpdate] = useState<Date | null>(null);
  const [isMonitoring, setIsMonitoring] = useState(false);

  const monitor = TaskMonitorService.getInstance(options);

  const refresh = useCallback(async () => {
    await monitor.checkNow();
  }, [monitor]);

  useEffect(() => {
    if (!taskId) {
      setIsMonitoring(false);
      return;
    }

    setIsMonitoring(true);

    const unsubscribe = monitor.subscribeToTask(taskId, (update) => {
      setTask(update.task);
      setLastUpdate(update.timestamp);
    });

    // Initial fetch
    ApiService.getTask(taskId)
      .then(initialTask => {
        setTask(initialTask);
        setLastUpdate(new Date());
      })
      .catch(error => {
        console.error('Failed to fetch initial task:', error);
      });

    return () => {
      unsubscribe();
      setIsMonitoring(false);
    };
  }, [taskId, monitor]);

  return {
    task,
    isMonitoring,
    lastUpdate,
    refresh
  };
}

// React Hook for monitoring multiple tasks
export function useTaskListMonitor(
  options: TaskMonitorOptions = {}
): {
  updates: TaskUpdate[];
  isMonitoring: boolean;
  addTask: (taskId: string) => void;
  removeTask: (taskId: string) => void;
  refresh: () => Promise<void>;
  clearUpdates: () => void;
} {
  const [updates, setUpdates] = useState<TaskUpdate[]>([]);
  const [isMonitoring, setIsMonitoring] = useState(false);

  const monitor = TaskMonitorService.getInstance(options);

  const addTask = useCallback((taskId: string) => {
    monitor.monitorTask(taskId);
  }, [monitor]);

  const removeTask = useCallback((taskId: string) => {
    monitor.stopMonitoringTask(taskId);
  }, [monitor]);

  const refresh = useCallback(async () => {
    await monitor.checkNow();
  }, [monitor]);

  const clearUpdates = useCallback(() => {
    setUpdates([]);
  }, []);

  useEffect(() => {
    setIsMonitoring(true);

    const unsubscribe = monitor.subscribeToAll((update) => {
      setUpdates(prev => [update, ...prev.slice(0, 49)]); // Keep last 50 updates
    });

    return () => {
      unsubscribe();
      setIsMonitoring(false);
    };
  }, [monitor]);

  return {
    updates,
    isMonitoring,
    addTask,
    removeTask,
    refresh,
    clearUpdates
  };
}

export default TaskMonitorService; 
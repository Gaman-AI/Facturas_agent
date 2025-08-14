/**
 * Simple Polling Service for Task Updates
 * 
 * This service provides real-time-like updates by polling the API endpoints
 * instead of using WebSockets, eliminating connection complexity and failures.
 * 
 * @file purpose: Real-time task monitoring without WebSocket dependencies
 */

const API_BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL || 'http://localhost:8000';
const POLLING_INTERVAL = parseInt(process.env.NEXT_PUBLIC_POLLING_INTERVAL || '2000'); // 2 seconds

export interface TaskUpdate {
  type: 'step_update' | 'status_change' | 'error' | 'task_completed' | 'task_start' | 'task_error' | 'log_update';
  task_id?: string;
  session_id?: string;
  data?: any;
  message?: string;
  timestamp?: string;
}

export interface StepUpdateData {
  step_type: 'action' | 'observation' | 'error';
  content: Record<string, any>;
  timestamp?: string;
}

export interface StatusChangeData {
  status: 'pending' | 'running' | 'paused' | 'completed' | 'failed';
  error_message?: string;
}

export class PollingService {
  private pollingIntervals: Map<string, NodeJS.Timeout> = new Map();
  private listeners: Map<string, Function[]> = new Map();
  private isPolling = false;

  constructor() {
    this.setupEventListeners();
  }

  private setupEventListeners() {
    // Set up default event listeners
    this.listeners.set('step_update', []);
    this.listeners.set('status_change', []);
    this.listeners.set('error', []);
    this.listeners.set('task_completed', []);
    this.listeners.set('task_start', []);
    this.listeners.set('task_error', []);
    this.listeners.set('log_update', []);
  }

  /**
   * Start polling for task updates
   */
  async startPolling(taskId: string): Promise<boolean> {
    if (this.pollingIntervals.has(taskId)) {
      console.log(`Already polling for task ${taskId}`);
      return true;
    }

    console.log(`Starting polling for task ${taskId}`);
    
    // Start polling immediately
    await this.pollTaskStatus(taskId);
    
    // Set up interval for continuous polling
    const interval = setInterval(async () => {
      await this.pollTaskStatus(taskId);
    }, POLLING_INTERVAL);

    this.pollingIntervals.set(taskId, interval);
    this.isPolling = true;
    
    return true;
  }

  /**
   * Start polling for browser agent session updates
   */
  async startBrowserAgentPolling(sessionId: string): Promise<boolean> {
    if (this.pollingIntervals.has(sessionId)) {
      console.log(`Already polling for session ${sessionId}`);
      return true;
    }

    console.log(`Starting browser agent polling for session ${sessionId}`);
    
    // Start polling immediately
    await this.pollBrowserAgentStatus(sessionId);
    
    // Set up interval for continuous polling
    const interval = setInterval(async () => {
      await this.pollBrowserAgentStatus(sessionId);
    }, POLLING_INTERVAL);

    this.pollingIntervals.set(sessionId, interval);
    this.isPolling = true;
    
    return true;
  }

  /**
   * Poll task status from API
   */
  private async pollTaskStatus(taskId: string) {
    try {
      const response = await fetch(`${API_BASE_URL}/api/v1/tasks/browser-use/${taskId}`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${this.getAuthToken()}`
        }
      });

      if (response.ok) {
        const taskData = await response.json();
        this.processTaskUpdate(taskId, taskData);
      } else {
        console.warn(`Failed to fetch task ${taskId}: ${response.status}`);
      }
    } catch (error) {
      console.error(`Error polling task ${taskId}:`, error);
    }
  }

  /**
   * Poll browser agent status from API
   */
  private async pollBrowserAgentStatus(sessionId: string) {
    try {
      const response = await fetch(`${API_BASE_URL}/api/v1/browser-agent-realtime?sessionId=${sessionId}`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${this.getAuthToken()}`
        }
      });

      if (response.ok) {
        const sessionData = await response.json();
        this.processBrowserAgentUpdate(sessionId, sessionData);
      } else {
        console.warn(`Failed to fetch session ${sessionId}: ${response.status}`);
      }
    } catch (error) {
      console.error(`Error polling session ${sessionId}:`, error);
    }
  }

  /**
   * Process task update and emit events
   */
  private processTaskUpdate(taskId: string, taskData: any) {
    // Emit status change if status has changed
    if (taskData.status) {
      this.emit('status_change', {
        type: 'status_change',
        task_id: taskId,
        data: {
          status: taskData.status,
          error_message: taskData.error_message,
          timestamp: new Date().toISOString()
        }
      });
    }

    // Emit task completion if completed
    if (taskData.status === 'completed') {
      this.emit('task_completed', {
        type: 'task_completed',
        task_id: taskId,
        data: taskData.result,
        timestamp: new Date().toISOString()
      });
    }

    // Emit task error if failed
    if (taskData.status === 'failed') {
      this.emit('task_error', {
        type: 'task_error',
        task_id: taskId,
        data: {
          error: taskData.error_message || 'Task failed',
          timestamp: new Date().toISOString()
        }
      });
    }

    // Emit log updates if available
    if (taskData.logs && taskData.logs.length > 0) {
      this.emit('log_update', {
        type: 'log_update',
        task_id: taskId,
        data: {
          logs: taskData.logs,
          timestamp: new Date().toISOString()
        }
      });
    }
  }

  /**
   * Process browser agent update and emit events
   */
  private processBrowserAgentUpdate(sessionId: string, sessionData: any) {
    // Emit connection status
    this.emit('connection_status', {
      type: 'connection_status',
      session_id: sessionId,
      data: {
        connected: true,
        sessionId: sessionId,
        timestamp: new Date().toISOString()
      }
    });

    // Emit task updates if available
    if (sessionData.current_task) {
      this.emit('task_start', {
        type: 'task_start',
        session_id: sessionId,
        data: sessionData.current_task,
        timestamp: new Date().toISOString()
      });
    }

    // Emit log updates if available
    if (sessionData.logs && sessionData.logs.length > 0) {
      this.emit('log_update', {
        type: 'log_update',
        session_id: sessionId,
        data: {
          logs: sessionData.logs,
          timestamp: new Date().toISOString()
        }
      });
    }
  }

  /**
   * Get authentication token from localStorage
   */
  private getAuthToken(): string | null {
    if (typeof window !== 'undefined') {
      return localStorage.getItem('authToken') || sessionStorage.getItem('authToken');
    }
    return null;
  }

  /**
   * Stop polling for a specific task or session
   */
  stopPolling(identifier: string): void {
    const interval = this.pollingIntervals.get(identifier);
    if (interval) {
      clearInterval(interval);
      this.pollingIntervals.delete(identifier);
      console.log(`Stopped polling for ${identifier}`);
    }
  }

  /**
   * Stop all polling
   */
  stopAllPolling(): void {
    this.pollingIntervals.forEach((interval, identifier) => {
      clearInterval(interval);
      console.log(`Stopped polling for ${identifier}`);
    });
    this.pollingIntervals.clear();
    this.isPolling = false;
  }

  /**
   * Add event listener
   */
  on(event: string, callback: Function) {
    if (!this.listeners.has(event)) {
      this.listeners.set(event, []);
    }
    this.listeners.get(event)!.push(callback);
  }

  /**
   * Remove event listener
   */
  off(event: string, callback: Function) {
    const eventListeners = this.listeners.get(event);
    if (eventListeners) {
      const index = eventListeners.indexOf(callback);
      if (index > -1) {
        eventListeners.splice(index, 1);
      }
    }
  }

  /**
   * Emit event to all listeners
   */
  private emit(event: string, data: any) {
    const eventListeners = this.listeners.get(event);
    if (eventListeners) {
      eventListeners.forEach(callback => {
        try {
          callback(data);
        } catch (error) {
          console.error(`Error in ${event} listener:`, error);
        }
      });
    }
  }

  /**
   * Get polling status
   */
  get isActive(): boolean {
    return this.isPolling;
  }

  /**
   * Get active polling tasks/sessions
   */
  get activePolling(): string[] {
    return Array.from(this.pollingIntervals.keys());
  }
}

// Export singleton instance
export const pollingService = new PollingService();

// Legacy compatibility - export the same interface
export const websocketService = pollingService; 
/**
 * Real WebSocket Service for Task Updates
 * 
 * This service provides real-time updates using actual WebSocket connections
 * to the backend, enabling immediate URL delivery and real-time task monitoring.
 * 
 * @file purpose: Real-time task monitoring with WebSocket connections
 */

const WS_BASE_URL = process.env.NEXT_PUBLIC_WS_BASE_URL || 'ws://localhost:8000';

export interface TaskUpdate {
  type: 'step_update' | 'status_change' | 'error' | 'task_completed' | 'task_start' | 'task_error' | 'log_update' | 'url_generated' | 'session_created' | 'live_view_ready' | 'automation_progress';
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

export class WebSocketService {
  private ws: WebSocket | null = null;
  private listeners: Map<string, Function[]> = new Map();
  private reconnectAttempts = 0;
  private maxReconnectAttempts = 5;
  private reconnectDelay = 1000;
  private isConnecting = false;
  private isConnected = false;
  private connectionUrl: string = '';

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
    this.listeners.set('url_generated', []);
    this.listeners.set('session_created', []);
    this.listeners.set('live_view_ready', []);
    this.listeners.set('automation_progress', []);
    this.listeners.set('connection_status', []);
    this.listeners.set('connection', []);
    this.listeners.set('pong', []);
  }

  /**
   * Connect to WebSocket server
   */
  async connect(sessionId?: string): Promise<boolean> {
    if (this.isConnecting || this.isConnected) {
      return this.isConnected;
    }

    this.isConnecting = true;
    
    try {
      // Construct WebSocket URL with session ID if provided
      const wsUrl = sessionId 
        ? `${WS_BASE_URL}/api/v1/browser-agent/ws?sessionId=${sessionId}`
        : `${WS_BASE_URL}/api/v1/browser-agent/ws`;
      
      this.connectionUrl = wsUrl;
      
      return new Promise((resolve, reject) => {
        this.ws = new WebSocket(wsUrl);
        
        this.ws.onopen = () => {
          console.log('🔗 WebSocket connected successfully');
          this.isConnected = true;
          this.isConnecting = false;
          this.reconnectAttempts = 0;
          
          // Send initial ping
          this.ping();
          
          // Emit connection status
          this.emit('connection_status', {
            type: 'connection_status',
            data: {
              connected: true,
              sessionId: sessionId,
              timestamp: new Date().toISOString()
            }
          });
          
          resolve(true);
        };
        
        this.ws.onmessage = (event) => {
          try {
            const message = JSON.parse(event.data);
            this.handleMessage(message);
          } catch (error) {
            console.error('❌ Failed to parse WebSocket message:', error);
          }
        };
        
        this.ws.onclose = (event) => {
          console.log('🔌 WebSocket connection closed:', event.code, event.reason);
          this.isConnected = false;
          this.isConnecting = false;
          
          // Emit connection status
          this.emit('connection_status', {
            type: 'connection_status',
            data: {
              connected: false,
              sessionId: sessionId,
              timestamp: new Date().toISOString()
            }
          });
          
          // Attempt reconnection if not manually closed
          if (event.code !== 1000 && this.reconnectAttempts < this.maxReconnectAttempts) {
            this.attemptReconnect();
          }
        };
        
        this.ws.onerror = (error) => {
          console.error('❌ WebSocket error:', error);
          this.isConnecting = false;
          reject(error);
        };
        
        // Set connection timeout
        setTimeout(() => {
          if (!this.isConnected) {
            this.isConnecting = false;
            reject(new Error('WebSocket connection timeout'));
          }
        }, 10000);
      });
      
    } catch (error) {
      this.isConnecting = false;
      console.error('❌ Failed to create WebSocket connection:', error);
      throw error;
    }
  }

  /**
   * Attempt to reconnect to WebSocket server
   */
  private async attemptReconnect() {
    if (this.reconnectAttempts >= this.maxReconnectAttempts) {
      console.log('❌ Max reconnection attempts reached');
      return;
    }
    
    this.reconnectAttempts++;
    const delay = this.reconnectDelay * Math.pow(2, this.reconnectAttempts - 1);
    
    console.log(`🔄 Attempting to reconnect in ${delay}ms (attempt ${this.reconnectAttempts}/${this.maxReconnectAttempts})`);
    
    setTimeout(async () => {
      try {
        await this.connect();
      } catch (error) {
        console.error('❌ Reconnection failed:', error);
      }
    }, delay);
  }

  /**
   * Handle incoming WebSocket messages
   */
  private handleMessage(message: any) {
    console.log('📨 WebSocket message received:', message.type);
    
    // Emit the message to all listeners
    this.emit(message.type, message);
  }

  /**
   * Send message to WebSocket server
   */
  send(type: string, data: any = {}) {
    if (this.ws && this.ws.readyState === WebSocket.OPEN) {
      try {
        const message = {
          type,
          data,
          timestamp: new Date().toISOString()
        };
        this.ws.send(JSON.stringify(message));
      } catch (error) {
        console.error('❌ Failed to send WebSocket message:', error);
      }
    } else {
      console.warn('⚠️ WebSocket not connected, cannot send message');
    }
  }

  /**
   * Send ping to keep connection alive
   */
  ping() {
    this.send('ping', { timestamp: new Date().toISOString() });
  }

  /**
   * Subscribe to task updates
   */
  subscribeToTask(taskId: string) {
    this.send('subscribe_task', { taskId });
  }

  /**
   * Unsubscribe from task updates
   */
  unsubscribeFromTask(taskId: string) {
    this.send('unsubscribe_task', { taskId });
  }

  /**
   * Disconnect from WebSocket server
   */
  disconnect() {
    if (this.ws) {
      this.ws.close(1000, 'Client disconnect');
      this.ws = null;
      this.isConnected = false;
      this.isConnecting = false;
      console.log('🔌 WebSocket disconnected');
    }
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
   * Get connection status
   */
  get isActive(): boolean {
    return this.isConnected;
  }

  /**
   * Get connection details
   */
  get connectionInfo() {
    return {
      isConnected: this.isConnected,
      isConnecting: this.isConnecting,
      reconnectAttempts: this.reconnectAttempts,
      maxReconnectAttempts: this.maxReconnectAttempts,
      connectionUrl: this.connectionUrl
    };
  }

  /**
   * Legacy compatibility methods for existing code
   */
  async startPolling(taskId: string): Promise<boolean> {
    // For backward compatibility, subscribe to task updates
    this.subscribeToTask(taskId);
    return true;
  }

  async startBrowserAgentPolling(sessionId: string): Promise<boolean> {
    // For backward compatibility, connect to WebSocket
    return this.connect(sessionId);
  }

  stopPolling(identifier: string): void {
    // For backward compatibility, unsubscribe from task
    this.unsubscribeFromTask(identifier);
  }

  stopAllPolling(): void {
    // For backward compatibility, disconnect
    this.disconnect();
  }
}

// Export singleton instance
export const websocketService = new WebSocketService(); 
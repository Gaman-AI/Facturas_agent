const WS_BASE_URL = process.env.NEXT_PUBLIC_WS_BASE_URL || 'ws://localhost:8000';
const WS_TIMEOUT = parseInt(process.env.NEXT_PUBLIC_API_TIMEOUT || '30000');

export interface WebSocketMessage {
  type: 'step_update' | 'status_change' | 'error' | 'task_completed' | 'connection' | 'task_start' | 'task_error' | 'log_update' | 'pong';
  task_id?: string;
  session_id?: string;
  data?: any;
  message?: string;
  timestamp?: string;
}

export interface StepUpdateData {
  step_type: 'thinking' | 'action' | 'observation' | 'error';
  content: Record<string, any>;
  timestamp?: string;
}

export interface StatusChangeData {
  status: 'pending' | 'running' | 'paused' | 'completed' | 'failed';
  error_message?: string;
}

export class WebSocketService {
  private ws: WebSocket | null = null;
  private taskId: string | null = null;
  private sessionId: string | null = null;
  private reconnectAttempts = 0;
  private maxReconnectAttempts = 5;
  private reconnectDelay = 1000; // Start with 1 second
  private listeners: Map<string, Function[]> = new Map();
  private isConnecting = false;
  private shouldReconnect = true;
  private connectionTimeout: NodeJS.Timeout | null = null;
  private pingInterval: NodeJS.Timeout | null = null;

  constructor() {
    this.setupEventListeners();
  }

  private setupEventListeners() {
    // Set up default event listeners
    this.listeners.set('step_update', []);
    this.listeners.set('status_change', []);
    this.listeners.set('error', []);
    this.listeners.set('task_completed', []);
    this.listeners.set('connection_status', []);
    this.listeners.set('connection', []);
    this.listeners.set('task_start', []);
    this.listeners.set('task_error', []);
    this.listeners.set('log_update', []);
    this.listeners.set('pong', []);
  }

  /**
   * Connect to WebSocket for a specific task (legacy endpoint)
   */
  async connect(taskId: string): Promise<boolean> {
    if (this.isConnecting) {
      console.log('Already connecting to WebSocket');
      return false;
    }

    this.isConnecting = true;
    this.taskId = taskId;
    this.shouldReconnect = true;

    try {
      const wsUrl = `${WS_BASE_URL}/ws/${taskId}`;
      console.log('Connecting to WebSocket:', wsUrl);
      
      this.ws = new WebSocket(wsUrl);
      
      // Set connection timeout
      this.connectionTimeout = setTimeout(() => {
        if (this.ws && this.ws.readyState === WebSocket.CONNECTING) {
          console.error('WebSocket connection timeout');
          this.ws.close();
          this.isConnecting = false;
          this.emit('connection_status', { connected: false, taskId, error: 'Connection timeout' });
        }
      }, WS_TIMEOUT);

      this.ws.onopen = () => {
        console.log(`WebSocket connected for task ${taskId}`);
        this.clearConnectionTimeout();
        this.reconnectAttempts = 0;
        this.reconnectDelay = 1000;
        this.isConnecting = false;
        this.startPingInterval();
        this.emit('connection_status', { connected: true, taskId });
      };

      this.ws.onmessage = (event) => {
        try {
          const message: WebSocketMessage = JSON.parse(event.data);
          this.handleMessage(message);
        } catch (error) {
          console.error('Error parsing WebSocket message:', error);
        }
      };

      this.ws.onclose = (event) => {
        console.log(`WebSocket closed for task ${taskId}`, event);
        this.clearConnectionTimeout();
        this.clearPingInterval();
        this.isConnecting = false;
        this.emit('connection_status', { connected: false, taskId });
        
        if (this.shouldReconnect && this.reconnectAttempts < this.maxReconnectAttempts) {
          this.scheduleReconnect();
        }
      };

      this.ws.onerror = (error) => {
        console.error(`WebSocket error for task ${taskId}:`, error);
        this.clearConnectionTimeout();
        this.isConnecting = false;
        this.emit('connection_status', { connected: false, taskId, error });
      };

      return true;
    } catch (error) {
      console.error('Error connecting to WebSocket:', error);
      this.clearConnectionTimeout();
      this.isConnecting = false;
      return false;
    }
  }

  /**
   * Connect to WebSocket for browser agent realtime (new endpoint)
   */
  async connectBrowserAgent(sessionId: string): Promise<boolean> {
    if (this.isConnecting) {
      console.log('Already connecting to browser agent WebSocket');
      return false;
    }

    this.isConnecting = true;
    this.sessionId = sessionId;
    this.shouldReconnect = true;

    try {
      const wsUrl = `${WS_BASE_URL}/api/v1/browser-agent/ws?sessionId=${sessionId}`;
      console.log('Connecting to browser agent WebSocket:', wsUrl);
      
      this.ws = new WebSocket(wsUrl);
      
      // Set connection timeout
      this.connectionTimeout = setTimeout(() => {
        if (this.ws && this.ws.readyState === WebSocket.CONNECTING) {
          console.error('Browser agent WebSocket connection timeout');
          this.ws.close();
          this.isConnecting = false;
          this.emit('connection_status', { connected: false, sessionId, error: 'Connection timeout' });
        }
      }, WS_TIMEOUT);

      this.ws.onopen = () => {
        console.log(`Browser agent WebSocket connected for session ${sessionId}`);
        this.clearConnectionTimeout();
        this.reconnectAttempts = 0;
        this.reconnectDelay = 1000;
        this.isConnecting = false;
        this.startPingInterval();
        this.emit('connection_status', { connected: true, sessionId });
      };

      this.ws.onmessage = (event) => {
        try {
          const message: WebSocketMessage = JSON.parse(event.data);
          this.handleMessage(message);
        } catch (error) {
          console.error('Error parsing browser agent WebSocket message:', error);
        }
      };

      this.ws.onclose = (event) => {
        console.log(`Browser agent WebSocket closed for session ${sessionId}`, event);
        this.clearConnectionTimeout();
        this.clearPingInterval();
        this.isConnecting = false;
        this.emit('connection_status', { connected: false, sessionId });
        
        if (this.shouldReconnect && this.reconnectAttempts < this.maxReconnectAttempts) {
          this.scheduleReconnectBrowserAgent();
        }
      };

      this.ws.onerror = (error) => {
        console.error(`Browser agent WebSocket error for session ${sessionId}:`, error);
        this.clearConnectionTimeout();
        this.isConnecting = false;
        this.emit('connection_status', { connected: false, sessionId, error });
      };

      return true;
    } catch (error) {
      console.error('Error connecting to browser agent WebSocket:', error);
      this.clearConnectionTimeout();
      this.isConnecting = false;
      return false;
    }
  }

  private clearConnectionTimeout() {
    if (this.connectionTimeout) {
      clearTimeout(this.connectionTimeout);
      this.connectionTimeout = null;
    }
  }

  private startPingInterval() {
    this.pingInterval = setInterval(() => {
      if (this.ws && this.ws.readyState === WebSocket.OPEN) {
        this.send({ type: 'ping' });
      }
    }, 30000); // Send ping every 30 seconds
  }

  private clearPingInterval() {
    if (this.pingInterval) {
      clearInterval(this.pingInterval);
      this.pingInterval = null;
    }
  }

  /**
   * Schedule a reconnection attempt
   */
  private scheduleReconnect() {
    if (!this.shouldReconnect || !this.taskId) return;

    this.reconnectAttempts++;
    console.log(`Scheduling reconnection attempt ${this.reconnectAttempts}/${this.maxReconnectAttempts} in ${this.reconnectDelay}ms`);

    setTimeout(() => {
      if (this.shouldReconnect && this.taskId) {
        this.connect(this.taskId);
      }
    }, this.reconnectDelay);

    // Exponential backoff
    this.reconnectDelay = Math.min(this.reconnectDelay * 2, 30000); // Max 30 seconds
  }

  /**
   * Schedule a reconnection attempt for browser agent
   */
  private scheduleReconnectBrowserAgent() {
    if (!this.shouldReconnect || !this.sessionId) return;

    this.reconnectAttempts++;
    console.log(`Scheduling browser agent reconnection attempt ${this.reconnectAttempts}/${this.maxReconnectAttempts} in ${this.reconnectDelay}ms`);

    setTimeout(() => {
      if (this.shouldReconnect && this.sessionId) {
        this.connectBrowserAgent(this.sessionId);
      }
    }, this.reconnectDelay);

    // Exponential backoff
    this.reconnectDelay = Math.min(this.reconnectDelay * 2, 30000); // Max 30 seconds
  }

  /**
   * Handle incoming WebSocket messages
   */
  private handleMessage(message: WebSocketMessage) {
    if (process.env.NEXT_PUBLIC_DEBUG === 'true') {
      console.log('WebSocket message received:', message);
    }

    // Emit the message type as an event
    this.emit(message.type, message);
  }

  /**
   * Send a message to the WebSocket
   */
  send(message: any) {
    if (this.ws && this.ws.readyState === WebSocket.OPEN) {
      this.ws.send(JSON.stringify(message));
    } else {
      console.warn('WebSocket is not connected');
    }
  }

  /**
   * Disconnect from WebSocket
   */
  disconnect() {
    console.log('Disconnecting WebSocket');
    this.shouldReconnect = false;
    this.clearConnectionTimeout();
    this.clearPingInterval();
    
    if (this.ws) {
      this.ws.close();
      this.ws = null;
    }
    
    this.taskId = null;
    this.sessionId = null;
    this.reconnectAttempts = 0;
    this.isConnecting = false;
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
  get isConnected(): boolean {
    return this.ws?.readyState === WebSocket.OPEN;
  }

  /**
   * Get current task ID
   */
  get currentTaskId(): string | null {
    return this.taskId;
  }

  /**
   * Get current session ID
   */
  get currentSessionId(): string | null {
    return this.sessionId;
  }

  /**
   * Get reconnection status
   */
  get reconnectionStatus() {
    return {
      attempts: this.reconnectAttempts,
      maxAttempts: this.maxReconnectAttempts,
      delay: this.reconnectDelay,
      isConnecting: this.isConnecting
    };
  }
}

// Export singleton instance
export const websocketService = new WebSocketService(); 
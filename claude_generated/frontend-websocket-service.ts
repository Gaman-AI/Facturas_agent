const WS_BASE_URL = import.meta.env.VITE_WS_BASE_URL || 'ws://localhost:8000';

export interface WebSocketMessage {
  type: 'step_update' | 'status_change' | 'error';
  task_id: string;
  data: any;
}

export interface StepUpdateData {
  step_type: 'thinking' | 'action' | 'observation' | 'error';
  content: Record<string, any>;
  timestamp?: string;
}

export interface StatusChangeData {
  status: string;
  error_message?: string;
}

export class WebSocketService {
  private ws: WebSocket | null = null;
  private taskId: string | null = null;
  private reconnectAttempts = 0;
  private maxReconnectAttempts = 5;
  private reconnectDelay = 1000; // Start with 1 second
  private isManualClose = false;
  
  // Event handlers
  private onMessageHandler: ((message: WebSocketMessage) => void) | null = null;
  private onConnectHandler: (() => void) | null = null;
  private onDisconnectHandler: (() => void) | null = null;
  private onErrorHandler: ((error: Event) => void) | null = null;

  constructor() {
    this.handleMessage = this.handleMessage.bind(this);
    this.handleOpen = this.handleOpen.bind(this);
    this.handleClose = this.handleClose.bind(this);
    this.handleError = this.handleError.bind(this);
  }

  connect(taskId: string): Promise<void> {
    return new Promise((resolve, reject) => {
      try {
        this.taskId = taskId;
        this.isManualClose = false;
        
        const wsUrl = `${WS_BASE_URL}/ws/${taskId}`;
        console.log(`Connecting to WebSocket: ${wsUrl}`);
        
        this.ws = new WebSocket(wsUrl);
        
        this.ws.onopen = () => {
          this.handleOpen();
          resolve();
        };
        
        this.ws.onmessage = this.handleMessage;
        this.ws.onclose = this.handleClose;
        this.ws.onerror = (error) => {
          this.handleError(error);
          reject(error);
        };
        
      } catch (error) {
        console.error('Error creating WebSocket connection:', error);
        reject(error);
      }
    });
  }

  disconnect(): void {
    this.isManualClose = true;
    if (this.ws) {
      this.ws.close();
      this.ws = null;
    }
    this.taskId = null;
    this.reconnectAttempts = 0;
  }

  private handleOpen(): void {
    console.log(`WebSocket connected to task ${this.taskId}`);
    this.reconnectAttempts = 0;
    this.reconnectDelay = 1000;
    
    if (this.onConnectHandler) {
      this.onConnectHandler();
    }
  }

  private handleMessage(event: MessageEvent): void {
    try {
      const message: WebSocketMessage = JSON.parse(event.data);
      console.log('Received WebSocket message:', message);
      
      if (this.onMessageHandler) {
        this.onMessageHandler(message);
      }
    } catch (error) {
      console.error('Error parsing WebSocket message:', error);
    }
  }

  private handleClose(event: CloseEvent): void {
    console.log(`WebSocket disconnected from task ${this.taskId}:`, event.code, event.reason);
    
    if (this.onDisconnectHandler) {
      this.onDisconnectHandler();
    }

    // Attempt to reconnect if not manually closed and we have a task ID
    if (!this.isManualClose && this.taskId && this.reconnectAttempts < this.maxReconnectAttempts) {
      this.attemptReconnect();
    }
  }

  private handleError(error: Event): void {
    console.error('WebSocket error:', error);
    
    if (this.onErrorHandler) {
      this.onErrorHandler(error);
    }
  }

  private attemptReconnect(): void {
    this.reconnectAttempts++;
    
    console.log(`Attempting to reconnect (${this.reconnectAttempts}/${this.maxReconnectAttempts})...`);
    
    setTimeout(() => {
      if (this.taskId && !this.isManualClose) {
        this.connect(this.taskId).catch((error) => {
          console.error('Reconnection failed:', error);
        });
      }
    }, this.reconnectDelay);
    
    // Exponential backoff with max delay of 30 seconds
    this.reconnectDelay = Math.min(this.reconnectDelay * 2, 30000);
  }

  // Event handler setters
  onMessage(handler: (message: WebSocketMessage) => void): void {
    this.onMessageHandler = handler;
  }

  onConnect(handler: () => void): void {
    this.onConnectHandler = handler;
  }

  onDisconnect(handler: () => void): void {
    this.onDisconnectHandler = handler;
  }

  onError(handler: (error: Event) => void): void {
    this.onErrorHandler = handler;
  }

  // Send message (if needed for future features)
  send(message: any): void {
    if (this.ws && this.ws.readyState === WebSocket.OPEN) {
      this.ws.send(JSON.stringify(message));
    } else {
      console.warn('WebSocket is not connected');
    }
  }

  // Get connection status
  isConnected(): boolean {
    return this.ws !== null && this.ws.readyState === WebSocket.OPEN;
  }

  getReadyState(): number | null {
    return this.ws ? this.ws.readyState : null;
  }
}

// Create a singleton instance
export const webSocketService = new WebSocketService();
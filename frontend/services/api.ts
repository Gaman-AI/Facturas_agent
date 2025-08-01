import axios, { AxiosRequestConfig, AxiosResponse } from 'axios';
import { tokenManager } from '@/utils/tokenManager';

const API_BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL || 'http://localhost:8000';
const API_TIMEOUT = parseInt(process.env.NEXT_PUBLIC_API_TIMEOUT || '30000');

// Request queue for handling concurrent requests during token refresh
interface QueuedRequest {
  config: AxiosRequestConfig;
  resolve: (value: AxiosResponse) => void;
  reject: (error: any) => void;
}

class ApiClient {
  private client: ReturnType<typeof axios.create>;
  private requestQueue: QueuedRequest[] = [];
  private isProcessingQueue = false;

  constructor() {
    // Create axios instance with default config
    this.client = axios.create({
      baseURL: `${API_BASE_URL}/api/v1`,
      timeout: API_TIMEOUT,
      headers: {
        'Content-Type': 'application/json',
      },
    });

    this.setupInterceptors();
  }

  private setupInterceptors() {
    // Request interceptor - adds token using centralized token manager
    this.client.interceptors.request.use(
      async (config) => {
        try {
          // Use centralized token manager to get valid token
          const token = await tokenManager.getValidToken();
          
          if (token) {
            config.headers.Authorization = `Bearer ${token}`;
            console.log('🔐 Added token to request:', config.method?.toUpperCase(), config.url);
          } else {
            console.warn('⚠️  No valid token available for API request');
            // Don't throw error here, let the backend handle the missing token
          }
        } catch (error) {
          console.error('❌ Failed to get valid token:', error);
          // Continue with request without token - let backend handle it
        }

        // Add request correlation ID for debugging
        config.headers['X-Request-ID'] = this.generateRequestId();
        console.log('🚀 API Request:', config.method?.toUpperCase(), config.url, 
          `[${config.headers['X-Request-ID']}]`);
        
        return config;
      },
      (error) => {
        console.error('❌ API Request Error:', error);
        return Promise.reject(error);
      }
    );

    // Response interceptor with enhanced error handling and retry logic
    this.client.interceptors.response.use(
      (response) => {
        const requestId = response.config.headers['X-Request-ID'];
        console.log('✅ API Response:', response.status, response.config.url, 
          `[${requestId}]`);
        return response;
      },
      async (error) => {
        const originalRequest = error.config;
        const requestId = originalRequest?.headers['X-Request-ID'] || 'unknown';
        
        this.logError(error, requestId);
        
        // Handle 401 errors with centralized token refresh
        if (error.response?.status === 401 && !originalRequest._retry) {
          return this.handleUnauthorizedError(originalRequest, error, requestId);
        }
        
        return Promise.reject(error);
      }
    );
  }

  private async handleUnauthorizedError(originalRequest: any, error: any, requestId: string) {
    originalRequest._retry = true;
    
    console.log(`🔄 401 error detected, attempting token refresh... [${requestId}]`);
    
    try {
      // Use centralized token manager for refresh
      const refreshedSession = await tokenManager.forceRefresh();
      
      if (refreshedSession?.access_token) {
        console.log(`✅ Token refreshed, retrying request... [${requestId}]`);
        originalRequest.headers.Authorization = `Bearer ${refreshedSession.access_token}`;
        
        // Process any queued requests
        this.processRequestQueue();
        
        return this.client(originalRequest);
      } else {
        throw new Error('No access token in refreshed session');
      }
    } catch (refreshError) {
      console.error(`❌ Token refresh failed [${requestId}]:`, refreshError);
      
      // Clear token state and redirect to login if needed
      tokenManager.clearState();
      
      // Emit auth error event for global handling
      window.dispatchEvent(new CustomEvent('auth:token-refresh-failed', {
        detail: { error: refreshError, requestId }
      }));
      
      return Promise.reject(error);
    }
  }

  private logError(error: any, requestId: string) {
    console.error(`❌ API Error Details [${requestId}]:`);
    console.error('   - URL:', error.config?.url);
    console.error('   - Method:', error.config?.method);
    console.error('   - Status:', error.response?.status);
    console.error('   - Status Text:', error.response?.statusText);
    console.error('   - Data:', error.response?.data);
    console.error('   - Message:', error.message);
    console.error('   - Code:', error.code);

    // Log specific error types
    if (error.response?.status === 404) {
      console.error('🔍 API endpoint not found - check backend routes');
    } else if (error.response?.status === 500) {
      console.error('🔥 Backend server error');
    } else if (error.code === 'ECONNREFUSED') {
      console.error('🔌 Cannot connect to backend - is it running?');
    } else if (error.code === 'ECONNABORTED') {
      console.error('⏱️ Request timeout - server took too long to respond');
    }
  }

  private processRequestQueue() {
    if (this.isProcessingQueue || this.requestQueue.length === 0) {
      return;
    }

    this.isProcessingQueue = true;
    
    const queue = [...this.requestQueue];
    this.requestQueue = [];

    console.log(`🔄 Processing ${queue.length} queued requests...`);

    queue.forEach(({ config, resolve, reject }) => {
      this.client(config)
        .then(resolve)
        .catch(reject);
    });

    this.isProcessingQueue = false;
  }

  private generateRequestId(): string {
    return Math.random().toString(36).substr(2, 9);
  }

  // Expose axios methods
  async get<T = any>(url: string, config?: AxiosRequestConfig): Promise<AxiosResponse<T>> {
    return this.client.get(url, config);
  }

  async post<T = any>(url: string, data?: any, config?: AxiosRequestConfig): Promise<AxiosResponse<T>> {
    return this.client.post(url, data, config);
  }

  async put<T = any>(url: string, data?: any, config?: AxiosRequestConfig): Promise<AxiosResponse<T>> {
    return this.client.put(url, data, config);
  }

  async patch<T = any>(url: string, data?: any, config?: AxiosRequestConfig): Promise<AxiosResponse<T>> {
    return this.client.patch(url, data, config);
  }

  async delete<T = any>(url: string, config?: AxiosRequestConfig): Promise<AxiosResponse<T>> {
    return this.client.delete(url, config);
  }

  // Health check method
  async healthCheck(): Promise<{ status: string; tokenInfo: any }> {
    const tokenInfo = await tokenManager.getTokenInfo();
    return {
      status: tokenInfo.hasToken ? 'authenticated' : 'unauthenticated',
      tokenInfo
    };
  }
}

// Create singleton instance
const apiClient = new ApiClient();

// Types
export interface Task {
  id: string;
  prompt: string;
  status: 'pending' | 'running' | 'paused' | 'completed' | 'failed';
  created_at: string;
  completed_at?: string;
  error_message?: string;
  result?: any;
  steps?: TaskStep[];
}

export interface TaskStep {
  id: number;
  task_id: string;
  step_type: 'thinking' | 'action' | 'observation' | 'error';
  content: Record<string, any>;
  timestamp: string;
}

export interface CreateTaskRequest {
  prompt: string;
}

export interface HealthResponse {
  status: string;
  timestamp: string;
  version: string;
}

// Simplified Browser Task Integration Types
export interface BrowserTaskRequest {
  task: string;
  model?: string;
  llm_provider?: 'openai' | 'anthropic' | 'google';
  timeout_minutes?: number;
}

export interface BrowserTaskResponse {
  success: boolean;
  data: {
    task_id: string;
    status: string;
    created_at: string;
    prompt?: string;
    vendor_url?: string;
    model: string;
    max_steps: number;
  };
  meta: {
    timestamp: string;
    requestId: string;
  };
}

export interface BrowserUseTask {
  success: boolean;
  data: {
    task_id: string;
    status: 'pending' | 'running' | 'completed' | 'failed' | 'cancelled';
    created_at: string;
    started_at?: string;
    completed_at?: string;
    execution_time_ms?: number;
    model: string;
    max_steps: number;
    result?: string;
    error?: string;
    error_type?: string;
    prompt?: string;
  };
  meta: {
    timestamp: string;
    requestId: string;
  };
}

export interface BrowserUseTasksResponse {
  success: boolean;
  data: {
    tasks: Array<{
      task_id: string;
      status: string;
      created_at: string;
      started_at?: string;
      completed_at?: string;
      execution_time_ms?: number;
      model: string;
      vendor_url?: string;
      result?: string;
      error?: string;
      prompt_preview?: string;
    }>;
    total_count: number;
    has_more: boolean;
    limit: number;
    offset: number;
  };
  meta: {
    timestamp: string;
    requestId: string;
  };
}

export interface BrowserUseStats {
  success: boolean;
  data: {
    totalTasks: number;
    runningTasks: number;
    statusCounts: {
      pending: number;
      running: number;
      completed: number;
      failed: number;
      cancelled: number;
    };
    averageExecutionTime: number;
    successRate: number;
  };
  meta: {
    timestamp: string;
    requestId: string;
  };
}

export interface BrowserUseHealth {
  success: boolean;
  data: {
    status: 'healthy' | 'unhealthy';
    service: string;
    totalTasks: number;
    runningTasks: number;
    pythonBridge: {
      status: 'healthy' | 'unhealthy';
      python_executable: string;
      script_path: string;
      error?: string;
    };
  };
  meta: {
    timestamp: string;
    requestId: string;
  };
}

// Session Management Types for Real-time Monitoring
export interface TaskSession {
  success: boolean;
  data: {
    task_id: string;
    session_id?: string;
    live_view_url?: string;
    browser_type?: 'browserbase' | 'local' | 'embedded';
    status: 'pending' | 'running' | 'paused' | 'completed' | 'failed' | 'cancelled';
    created_at: string;
    connect_url?: string;
    capabilities?: {
      can_pause: boolean;
      can_resume: boolean;
      can_stop: boolean;
      can_restart: boolean;
      can_takeover: boolean;
    };
  };
  meta: {
    timestamp: string;
    requestId: string;
  };
}

export interface TaskLogEntry {
  id: string;
  task_id: string;
  timestamp: string;
  level: 'info' | 'warning' | 'error' | 'success' | 'thinking' | 'action';
  message: string;
  details?: any;
  source?: 'agent' | 'system' | 'user';
}

export interface TaskLogsResponse {
  success: boolean;
  data: {
    logs: TaskLogEntry[];
    total_count: number;
    has_more: boolean;
    limit: number;
    offset: number;
  };
  meta: {
    timestamp: string;
    requestId: string;
  };
}

export interface BrowserTaskRequest {
  task_description: string;
  llm_provider?: string;
  model?: string;
}

export interface BrowserTaskResponse {
  task_id: string;
  status: string;
  message: string;
}

// CFDI Task Types to match backend validation
export interface CFDITaskRequest {
  customer_details: {
    rfc: string;
    email: string;
    company_name: string;
    fiscal_regime?: string;
    address?: {
      street: string;
      exterior_number: string;
      interior_number?: string;
      colony: string;
      municipality: string;
      state: string;
      postal_code: string;
    };
  };
  invoice_details: {
    ticket_id: string;
    folio?: string;
    transaction_date?: string;
    subtotal?: number;
    iva?: number;
    total: number;
    currency?: string;
  };
  vendor_url: string;
  automation_config?: {
    llm_provider?: 'openai' | 'anthropic' | 'google';
    model?: string;
    max_retries?: number;
    timeout_minutes?: number;
  };
}

export interface CFDITaskResponse {
  success: boolean;
  data?: {
    task_id: string;
    status: string;
    result: any;
    execution_time: number;
    logs: any[];
  };
  error?: {
    code: string;
    message: string;
    details?: any;
  };
  meta: {
    timestamp: string;
    requestId: string;
    message?: string;
  };
}

// API Service Class
export class ApiService {
  // Connection Test
  static async testConnection(): Promise<boolean> {
    try {
      const response = await apiClient.get('/health');
      return response.status === 200;
    } catch (error) {
      console.error('Connection test failed:', error);
      return false;
    }
  }

  // Health Check
  static async healthCheck(): Promise<HealthResponse> {
    const response = await apiClient.get('/health');
    return response.data as HealthResponse;
  }

  // CFDI Task Execution - Main method for CFDI automation
  static async executeCFDITask(taskData: CFDITaskRequest): Promise<CFDITaskResponse> {
    const response = await apiClient.post('/tasks/execute', taskData);
    return response.data as CFDITaskResponse;
  }

  // Task Management
  static async createTask(prompt: string): Promise<Task> {
    const response = await apiClient.post('/tasks', { prompt });
    const data = response.data;
    
    // Ensure the response matches our Task interface
    return {
      id: data.id || data.task_id,
      prompt: data.prompt,
      status: data.status,
      created_at: data.created_at,
      completed_at: data.completed_at,
      error_message: data.error_message,
      result: data.result,
      steps: data.steps || []
    } as Task;
  }

  static async getTasks(skip: number = 0, limit: number = 100): Promise<Task[]> {
    const response = await apiClient.get('/tasks', {
      params: { skip, limit }
    });
    return response.data as Task[];
  }

  static async getTask(taskId: string): Promise<Task> {
    const response = await apiClient.get(`/tasks/${taskId}`);
    return response.data as Task;
  }

  static async getTaskSteps(taskId: string): Promise<{ task_id: string; steps: TaskStep[] }> {
    const response = await apiClient.get(`/tasks/${taskId}/steps`);
    return response.data as { task_id: string; steps: TaskStep[] };
  }

  // Task Control
  static async pauseTask(taskId: string): Promise<{ message: string; task_id: string }> {
    const response = await apiClient.post(`/tasks/${taskId}/pause`);
    return response.data as { message: string; task_id: string };
  }

  static async resumeTask(taskId: string): Promise<{ message: string; task_id: string }> {
    const response = await apiClient.post(`/tasks/${taskId}/resume`);
    return response.data as { message: string; task_id: string };
  }

  static async stopTask(taskId: string): Promise<{ message: string; task_id: string }> {
    const response = await apiClient.post(`/tasks/${taskId}/stop`);
    return response.data as { message: string; task_id: string };
  }

  static async deleteTask(taskId: string): Promise<{ message: string; task_id: string }> {
    const response = await apiClient.delete(`/tasks/${taskId}`);
    return response.data as { message: string; task_id: string };
  }

  // Browser Agent Realtime (Legacy - kept for compatibility)
  static async createBrowserTask(request: BrowserTaskRequest): Promise<BrowserTaskResponse> {
    const response = await apiClient.post('/browser-agent/realtime', request);
    return response.data as BrowserTaskResponse;
  }

  static async getBrowserTaskLogs(sessionId: string): Promise<any[]> {
    const response = await apiClient.get(`/browser-agent/logs/${sessionId}`);
    return response.data as any[];
  }

  // Simplified Browser Task Integration
  static async createBrowserTask(request: BrowserTaskRequest): Promise<BrowserTaskResponse> {
    const response = await apiClient.post('/tasks', request);
    return response.data as BrowserTaskResponse;
  }
  
  // Execute task immediately (for testing)
  static async executeBrowserTask(request: BrowserTaskRequest): Promise<BrowserTaskResponse> {
    const response = await apiClient.post('/tasks/execute', request);
    return response.data as BrowserTaskResponse;
  }

  static async getBrowserUseTask(taskId: string): Promise<BrowserUseTask> {
    const response = await apiClient.get(`/tasks/browser-use/${taskId}`);
    return response.data as BrowserUseTask;
  }

  static async getBrowserUseTasks(options?: {
    limit?: number;
    offset?: number;
    status?: string;
    sort_by?: string;
    sort_order?: 'asc' | 'desc';
  }): Promise<BrowserUseTasksResponse> {
    const params = new URLSearchParams();
    if (options?.limit) params.append('limit', options.limit.toString());
    if (options?.offset) params.append('offset', options.offset.toString());
    if (options?.status) params.append('status', options.status);
    if (options?.sort_by) params.append('sort_by', options.sort_by);
    if (options?.sort_order) params.append('sort_order', options.sort_order);

    const response = await apiClient.get(`/tasks/browser-use?${params.toString()}`);
    return response.data as BrowserUseTasksResponse;
  }

  static async cancelBrowserUseTask(taskId: string): Promise<{ message: string; task_id: string }> {
    const response = await apiClient.post(`/tasks/browser-use/${taskId}/cancel`);
    return response.data as { message: string; task_id: string };
  }

  static async deleteBrowserUseTask(taskId: string): Promise<{ message: string; task_id: string }> {
    const response = await apiClient.delete(`/tasks/browser-use/${taskId}`);
    return response.data as { message: string; task_id: string };
  }

  static async getBrowserUseStats(): Promise<BrowserUseStats> {
    const response = await apiClient.get('/tasks/browser-use/stats');
    return response.data as BrowserUseStats;
  }

  static async getBrowserUseHealth(): Promise<BrowserUseHealth> {
    const response = await apiClient.get('/tasks/browser-use/health');
    return response.data as BrowserUseHealth;
  }

  // Session Management for Task Monitoring
  static async getTaskSession(taskId: string): Promise<TaskSession> {
    // Session management not implemented - return mock data for local execution
    console.warn('Session management not implemented for local browser execution');
    return {
      success: true,
      data: {
        task_id: taskId,
        session_id: `local_session_${taskId}`,
        live_view_url: null, // No live view for local execution
        browser_type: 'local',
        status: 'running',
        capabilities: {
          live_view: false,
          session_control: false,
          real_time_logs: false
        }
      }
    } as TaskSession;
  }

  static async pauseTask(taskId: string): Promise<{ success: boolean; message: string }> {
    // Session control not implemented for local execution
    console.warn('Task pause not implemented for local browser execution');
    return { success: false, message: 'Session control not available for local execution' };
  }

  static async resumeTask(taskId: string): Promise<{ success: boolean; message: string }> {
    // Session control not implemented for local execution
    console.warn('Task resume not implemented for local browser execution');
    return { success: false, message: 'Session control not available for local execution' };
  }

  static async stopTask(taskId: string): Promise<{ success: boolean; message: string }> {
    // Session control not implemented for local execution
    console.warn('Task stop not implemented for local browser execution');
    return { success: false, message: 'Session control not available for local execution' };
  }

  static async restartTask(taskId: string): Promise<BrowserUseTaskResponse> {
    // Session control not implemented for local execution
    console.warn('Task restart not implemented for local browser execution');
    return { 
      success: false, 
      data: null,
      error: { message: 'Session control not available for local execution' }
    } as BrowserUseTaskResponse;
  }

  static async getTaskLogs(taskId: string, options?: {
    limit?: number;
    offset?: number;
    level?: 'info' | 'warning' | 'error' | 'all';
  }): Promise<TaskLogsResponse> {
    const params = new URLSearchParams();
    if (options?.limit) params.append('limit', options.limit.toString());
    if (options?.offset) params.append('offset', options.offset.toString());
    if (options?.level) params.append('level', options.level);

    const response = await apiClient.get(`/tasks/browser-use/${taskId}/logs?${params.toString()}`);
    return response.data as TaskLogsResponse;
  }

  // Authentication Health Check
  static async authHealthCheck(): Promise<{ status: string; tokenInfo: any }> {
    return apiClient.healthCheck();
  }
}

export default ApiService; 
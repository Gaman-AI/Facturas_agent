import axios from 'axios';

const API_BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL || 'http://localhost:8000';
const API_TIMEOUT = parseInt(process.env.NEXT_PUBLIC_API_TIMEOUT || '30000');

// Create axios instance with default config
const apiClient = axios.create({
  baseURL: `${API_BASE_URL}/api/v1`,
  timeout: API_TIMEOUT,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Request interceptor for debugging
apiClient.interceptors.request.use(
  (config) => {
    console.log('🚀 API Request:', config.method?.toUpperCase(), config.url, config.data);
    return config;
  },
  (error) => {
    console.error('❌ API Request Error:', error);
    return Promise.reject(error);
  }
);

// Response interceptor for error handling
apiClient.interceptors.response.use(
  (response) => {
    console.log('✅ API Response:', response.status, response.config.url, response.data);
    return response;
  },
  (error) => {
    console.error('❌ API Error Details:');
    console.error('   - URL:', error.config?.url);
    console.error('   - Method:', error.config?.method);
    console.error('   - Status:', error.response?.status);
    console.error('   - Status Text:', error.response?.statusText);
    console.error('   - Data:', error.response?.data);
    console.error('   - Message:', error.message);
    console.error('   - Code:', error.code);
    
    // Handle specific error cases
    if (error.response?.status === 404) {
      console.error('🔍 API endpoint not found - check backend routes');
    } else if (error.response?.status === 500) {
      console.error('🔥 Backend server error');
    } else if (error.code === 'ECONNREFUSED') {
      console.error('🔌 Cannot connect to backend - is it running?');
    }
    
    return Promise.reject(error);
  }
);

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

  // Task Management
  static async createTask(prompt: string): Promise<Task> {
    const response = await apiClient.post('/tasks', { prompt });
    return response.data as Task;
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

  // Browser Agent Realtime
  static async createBrowserTask(request: BrowserTaskRequest): Promise<BrowserTaskResponse> {
    const response = await apiClient.post('/browser-agent/realtime', request);
    return response.data as BrowserTaskResponse;
  }

  static async getBrowserTaskLogs(sessionId: string): Promise<any[]> {
    const response = await apiClient.get(`/browser-agent/logs/${sessionId}`);
    return response.data as any[];
  }
}

export default ApiService; 
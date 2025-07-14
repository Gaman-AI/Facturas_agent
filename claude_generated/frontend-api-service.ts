import axios, { AxiosResponse } from 'axios';

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8000';

// Create axios instance with default config
const apiClient = axios.create({
  baseURL: `${API_BASE_URL}/api/v1`,
  timeout: 30000,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Response interceptor for error handling
apiClient.interceptors.response.use(
  (response) => response,
  (error) => {
    console.error('API Error:', error.response?.data || error.message);
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

// API Service Class
export class ApiService {
  // Health Check
  static async healthCheck(): Promise<HealthResponse> {
    const response: AxiosResponse<HealthResponse> = await apiClient.get('/health');
    return response.data;
  }

  // Task Management
  static async createTask(prompt: string): Promise<Task> {
    const response: AxiosResponse<Task> = await apiClient.post('/tasks', { prompt });
    return response.data;
  }

  static async getTasks(skip: number = 0, limit: number = 100): Promise<Task[]> {
    const response: AxiosResponse<Task[]> = await apiClient.get('/tasks', {
      params: { skip, limit }
    });
    return response.data;
  }

  static async getTask(taskId: string): Promise<Task> {
    const response: AxiosResponse<Task> = await apiClient.get(`/tasks/${taskId}`);
    return response.data;
  }

  static async getTaskSteps(taskId: string): Promise<{ task_id: string; steps: TaskStep[] }> {
    const response = await apiClient.get(`/tasks/${taskId}/steps`);
    return response.data;
  }

  // Task Control
  static async pauseTask(taskId: string): Promise<{ message: string; task_id: string }> {
    const response = await apiClient.post(`/tasks/${taskId}/pause`);
    return response.data;
  }

  static async resumeTask(taskId: string): Promise<{ message: string; task_id: string }> {
    const response = await apiClient.post(`/tasks/${taskId}/resume`);
    return response.data;
  }

  static async stopTask(taskId: string): Promise<{ message: string; task_id: string }> {
    const response = await apiClient.post(`/tasks/${taskId}/stop`);
    return response.data;
  }

  static async deleteTask(taskId: string): Promise<{ message: string; task_id: string }> {
    const response = await apiClient.delete(`/tasks/${taskId}`);
    return response.data;
  }
}

export default ApiService;
# CFDI Automation API Contract

## Overview
The CFDI Automation API is a comprehensive system designed for Mexican CFDI 4.0 invoice automation using browser automation technology. The API provides authentication, task management, browser automation execution, and real-time monitoring capabilities.

**Base URL:** `http://localhost:8000` (configurable via environment)
**API Version:** `v1`
**Authentication:** JWT Bearer Token
**Content-Type:** `application/json`

---

## Table of Contents
1. [Authentication Endpoints](#authentication-endpoints)
2. [Task Management Endpoints](#task-management-endpoints)
3. [Browser Automation Endpoints](#browser-automation-endpoints)
4. [Health & Monitoring Endpoints](#health--monitoring-endpoints)
5. [WebSocket Endpoints](#websocket-endpoints)
6. [Error Handling](#error-handling)
7. [Data Models](#data-models)
8. [Rate Limiting & Security](#rate-limiting--security)

---

## Authentication Endpoints

### 1. Get Authentication Module Info
- **Endpoint:** `GET /api/v1/auth`
- **Purpose:** Retrieve information about the authentication module and available endpoints
- **Access:** Public
- **Input:** None
- **Response:**
```json
{
  "success": true,
  "data": {
    "module": "Authentication",
    "version": "1.0.0",
    "description": "CFDI user authentication and profile management",
    "endpoints": {
      "register": "POST /api/v1/auth/register",
      "login": "POST /api/v1/auth/login",
      "profile": "GET /api/v1/auth/profile",
      "updateProfile": "PUT /api/v1/auth/profile",
      "verify": "POST /api/v1/auth/verify",
      "logout": "POST /api/v1/auth/logout",
      "me": "GET /api/v1/auth/me",
      "status": "GET /api/v1/auth/status"
    },
    "features": [
      "JWT authentication",
      "CFDI profile management",
      "RFC validation",
      "Fiscal regime validation"
    ]
  }
}
```

### 2. User Registration
- **Endpoint:** `POST /api/v1/auth/register`
- **Purpose:** Register a new user with CFDI profile information
- **Access:** Public
- **Input:**
```json
{
  "email": "user@example.com",
  "password": "securePassword123",
  "rfc": "XAXX010101000",
  "fiscal_regime": "601",
  "postal_code": "12345",
  "company_name": "Example Company",
  "phone": "+52-55-1234-5678",
  "address": "123 Main St, Mexico City"
}
```
- **Response (Success - 201):**
```json
{
  "success": true,
  "data": {
    "user": {
      "id": "user-uuid",
      "email": "user@example.com",
      "profile": { /* user profile data */ }
    },
    "token": "jwt-token-here",
    "expiresIn": "7d"
  }
}
```

### 3. User Login
- **Endpoint:** `POST /api/v1/auth/login`
- **Purpose:** Authenticate user and return JWT token
- **Access:** Public
- **Input:**
```json
{
  "email": "user@example.com",
  "password": "securePassword123"
}
```
- **Response (Success - 200):**
```json
{
  "success": true,
  "data": {
    "user": { /* user data */ },
    "token": "jwt-token-here",
    "expiresIn": "7d"
  }
}
```

### 4. Get User Profile
- **Endpoint:** `GET /api/v1/auth/profile`
- **Purpose:** Retrieve current user's profile information
- **Access:** Private (requires JWT token)
- **Input:** None
- **Response:**
```json
{
  "success": true,
  "data": {
    "user": {
      "id": "user-uuid",
      "email": "user@example.com",
      "profile": { /* complete profile data */ }
    }
  }
}
```

### 5. Update User Profile
- **Endpoint:** `PUT /api/v1/auth/profile`
- **Purpose:** Update user's CFDI profile information
- **Access:** Private (requires JWT token)
- **Input:** (any combination of allowed fields)
```json
{
  "rfc": "XAXX010101000",
  "fiscal_regime": "601",
  "postal_code": "12345",
  "company_name": "Updated Company Name",
  "phone": "+52-55-1234-5678",
  "address": "456 New Address"
}
```
- **Response:**
```json
{
  "success": true,
  "data": {
    "profile": { /* updated profile data */ }
  }
}
```

### 6. Verify JWT Token
- **Endpoint:** `POST /api/v1/auth/verify`
- **Purpose:** Verify JWT token validity and return user info
- **Access:** Private (requires JWT token)
- **Input:** None
- **Response:**
```json
{
  "success": true,
  "data": {
    "user": {
      "id": "user-uuid",
      "email": "user@example.com",
      "role": "user",
      "profile": { /* profile data */ }
    },
    "tokenData": {
      "iat": 1234567890,
      "exp": 1234567890
    }
  }
}
```

### 7. User Logout
- **Endpoint:** `POST /api/v1/auth/logout`
- **Purpose:** Confirm logout action (client-side token removal)
- **Access:** Private (requires JWT token)
- **Input:** None
- **Response:**
```json
{
  "success": true,
  "data": {
    "message": "Logout successful"
  }
}
```

### 8. Get Minimal User Info
- **Endpoint:** `GET /api/v1/auth/me`
- **Purpose:** Get minimal user information (alternative to /profile)
- **Access:** Private (requires JWT token)
- **Input:** None
- **Response:**
```json
{
  "success": true,
  "data": {
    "id": "user-uuid",
    "email": "user@example.com",
    "role": "user"
  }
}
```

### 9. Check Authentication Status
- **Endpoint:** `GET /api/v1/auth/status`
- **Purpose:** Check authentication status (works with or without token)
- **Access:** Public
- **Input:** None
- **Response:**
```json
{
  "success": true,
  "data": {
    "authenticated": true,
    "user": {
      "id": "user-uuid",
      "email": "user@example.com",
      "role": "user"
    }
  }
}
```

---

## Task Management Endpoints

### 1. Get Tasks Module Info
- **Endpoint:** `GET /api/v1/tasks`
- **Purpose:** Retrieve information about the task management module
- **Access:** Public
- **Input:** None
- **Response:**
```json
{
  "success": true,
  "data": {
    "module": "Task Management",
    "version": "1.0.0",
    "description": "Browser automation task management and execution",
    "endpoints": {
      "listTasks": "GET /api/v1/tasks?page=1&limit=10",
      "createTask": "POST /api/v1/tasks",
      "getTask": "GET /api/v1/tasks/:taskId",
      "executeTask": "POST /api/v1/tasks/execute",
      "pauseTask": "PUT /api/v1/tasks/:taskId/pause",
      "resumeTask": "PUT /api/v1/tasks/:taskId/resume",
      "deleteTask": "DELETE /api/v1/tasks/:taskId",
      "getStats": "GET /api/v1/tasks/stats",
      "browserHealth": "GET /api/v1/tasks/browser/health"
    },
    "features": [
      "Browser automation execution",
      "Task queue management",
      "Real-time status updates",
      "Browser session management",
      "Flexible task instructions"
    ]
  }
}
```

### 2. List Tasks
- **Endpoint:** `GET /api/v1/tasks?page=1&limit=10&status=COMPLETED`
- **Purpose:** Retrieve paginated list of user's tasks
- **Access:** Public
- **Input:** Query Parameters
  - `page` (number): Page number (default: 1)
  - `limit` (number): Items per page (default: 10)
  - `status` (string, optional): Filter by task status
- **Response:**
```json
{
  "success": true,
  "data": [
    {
      "id": "task-uuid",
      "user_id": "user-uuid",
      "task_description": "Go to https://facturacion.example.com and process invoice for RFC XAXX010101000",
      "status": "COMPLETED",
      "created_at": "2024-01-01T00:00:00.000Z",
      "completed_at": "2024-01-01T00:00:45.200Z",
      "result": {
        "success": true,
        "execution_time": 45.2
      }
    }
  ],
  "meta": {
    "pagination": {
      "page": 1,
      "limit": 10,
      "total": 15,
      "totalPages": 2
    }
  }
}
```

### 3. Create Task
- **Endpoint:** `POST /api/v1/tasks`
- **Purpose:** Create a new browser automation task
- **Access:** Private (requires JWT token)
- **Input:**
```json
{
  "task": "Go to https://facturacion.example.com and process invoice for RFC XAXX010101000",
  "model": "gpt-4o-mini",
  "llm_provider": "openai",
  "timeout_minutes": 30
}
```
- **Response (Success - 201):**
```json
{
  "success": true,
  "data": {
    "task_id": "task-uuid",
    "status": "PENDING",
    "created_at": "2024-01-01T00:00:00.000Z",
    "model": "gpt-4o-mini",
    "max_steps": 50,
    "message": "Task created and queued for processing"
  }
}
```

### 4. Get Task Details
- **Endpoint:** `GET /api/v1/tasks/:taskId`
- **Purpose:** Retrieve detailed information about a specific task
- **Access:** Private (requires JWT token)
- **Input:** Path Parameter: `taskId` (UUID)
- **Response:**
```json
{
  "success": true,
  "data": {
    "id": "task-uuid",
    "user_id": "user-uuid",
    "task_description": "Go to https://facturacion.example.com and process invoice for RFC XAXX010101000",
    "status": "COMPLETED",
    "created_at": "2024-01-01T00:00:00.000Z",
    "started_at": "2024-01-01T00:00:05.000Z",
    "completed_at": "2024-01-01T00:00:45.200Z",
    "result": {
      "success": true,
      "execution_time": 45.2
    },
    "steps": [
      {
        "id": 1,
        "step_type": "navigation",
        "content": { "url": "https://facturacion.example.com", "action": "navigate" },
        "status": "completed",
        "timestamp": "2024-01-01T00:00:05.000Z"
      }
    ]
  }
}
```

### 5. Execute Task Immediately
- **Endpoint:** `POST /api/v1/tasks/execute`
- **Purpose:** Execute a browser automation task immediately (for testing/demo)
- **Access:** Private (requires JWT token)
- **Input:**
```json
{
  "task": "Go to https://facturacion.example.com and process invoice for RFC XAXX010101000",
  "model": "gpt-4o-mini",
  "llm_provider": "openai",
  "timeout_minutes": 30
}
```
- **Response (Success - 200):**
```json
{
  "success": true,
  "data": {
    "task_id": "exec_1234567890",
    "status": "COMPLETED",
    "result": { /* execution result */ },
    "execution_time": 45.2,
    "logs": [ /* session logs */ ],
    "thinking_available": true
  }
}
```

### 6. Pause Task
- **Endpoint:** `PUT /api/v1/tasks/:taskId/pause`
- **Purpose:** Pause a running task
- **Access:** Private (requires JWT token)
- **Input:** Path Parameter: `taskId` (UUID)
- **Response:**
```json
{
  "success": true,
  "data": {
    "task_id": "task-uuid",
    "status": "PAUSED",
    "message": "Task paused successfully"
  }
}
```

### 7. Resume Task
- **Endpoint:** `PUT /api/v1/tasks/:taskId/resume`
- **Purpose:** Resume a paused task
- **Access:** Private (requires JWT token)
- **Input:** Path Parameter: `taskId` (UUID)
- **Response:**
```json
{
  "success": true,
  "data": {
    "task_id": "task-uuid",
    "status": "RUNNING",
    "message": "Task resumed successfully"
  }
}
```

### 8. Delete Task
- **Endpoint:** `DELETE /api/v1/tasks/:taskId`
- **Purpose:** Cancel/delete a task
- **Access:** Private (requires JWT token)
- **Input:** Path Parameter: `taskId` (UUID)
- **Response:**
```json
{
  "success": true,
  "data": {
    "task_id": "task-uuid",
    "message": "Task cancelled and removed successfully"
  }
}
```

### 9. Get Task Statistics
- **Endpoint:** `GET /api/v1/tasks/stats`
- **Purpose:** Retrieve user's task statistics
- **Access:** Private (requires JWT token)
- **Input:** None
- **Response:**
```json
{
  "success": true,
  "data": {
    "total_tasks": 15,
    "completed_tasks": 12,
    "failed_tasks": 2,
    "pending_tasks": 1,
    "success_rate": 80.0,
    "avg_execution_time": 42.5,
    "total_automation_time_saved": 1800,
    "most_used_vendor": "facturacion.example.com",
    "last_task_date": "2024-01-01T00:00:00.000Z"
  }
}
```

---

## Browser Automation Endpoints

### 1. Create Browser-Use Task
- **Endpoint:** `POST /api/v1/tasks/browser-use`
- **Purpose:** Create and execute a browser automation task using local browser-use
- **Access:** Private (requires JWT token)
- **Input:**
```json
{
  "prompt": "Go to the website and process invoice for RFC XAXX010101000",
  "vendor_url": "https://facturacion.example.com",
  "customer_details": {
    "rfc": "XAXX010101000",
    "name": "Customer Name"
  },
  "invoice_details": {
    "amount": 1000.00,
    "currency": "MXN"
  },
  "model": "gpt-4o-mini",
  "temperature": 0.1,
  "max_steps": 50,
  "timeout_minutes": 30
}
```
- **Response (Success - 201):**
```json
{
  "success": true,
  "data": {
    "task_id": "task-uuid",
    "status": "PENDING",
    "created_at": "2024-01-01T00:00:00.000Z",
    "prompt": "Go to the website and process invoice for RFC XAXX010101000...",
    "vendor_url": "https://facturacion.example.com",
    "model": "gpt-4o-mini",
    "max_steps": 50
  }
}
```

### 2. Get Browser Task Status
- **Endpoint:** `GET /api/v1/tasks/browser-use/:taskId`
- **Purpose:** Get browser task status and result
- **Access:** Private (requires JWT token)
- **Input:** Path Parameter: `taskId` (UUID or exec_ format)
- **Response:**
```json
{
  "success": true,
  "data": {
    "task_id": "task-uuid",
    "status": "COMPLETED",
    "created_at": "2024-01-01T00:00:00.000Z",
    "started_at": "2024-01-01T00:00:05.000Z",
    "completed_at": "2024-01-01T00:00:45.200Z",
    "execution_time_ms": 45200,
    "model": "gpt-4o-mini",
    "max_steps": 50,
    "result": { /* execution result */ },
    "error": null,
    "error_type": null,
    "prompt": "Go to the website and process invoice...",
    "session_id": "session-uuid",
    "live_view_url": "https://browser.example.com/session/session-uuid",
    "browser_session_id": "browser-session-uuid"
  }
}
```

### 3. Cancel Browser Task
- **Endpoint:** `POST /api/v1/tasks/browser-use/:taskId/cancel`
- **Purpose:** Cancel a running browser task
- **Access:** Private (requires JWT token)
- **Input:** Path Parameter: `taskId` (UUID)
- **Response:**
```json
{
  "success": true,
  "data": {
    "task_id": "task-uuid",
    "status": "cancelled",
    "message": "Task cancelled successfully"
  }
}
```

### 4. Delete Browser Task
- **Endpoint:** `DELETE /api/v1/tasks/browser-use/:taskId`
- **Purpose:** Delete a browser task
- **Access:** Private (requires JWT token)
- **Input:** Path Parameter: `taskId` (UUID)
- **Response:**
```json
{
  "success": true,
  "data": {
    "task_id": "task-uuid",
    "message": "Task deleted successfully"
  }
}
```

### 5. Get Browser Task Statistics
- **Endpoint:** `GET /api/v1/tasks/browser-use/stats`
- **Purpose:** Get browser task statistics
- **Access:** Private (requires JWT token)
- **Input:** None
- **Response:**
```json
{
  "success": true,
  "data": {
    "total_tasks": 25,
    "completed_tasks": 20,
    "failed_tasks": 3,
    "pending_tasks": 2,
    "success_rate": 80.0,
    "avg_execution_time_ms": 45000,
    "total_automation_time_saved": 3600
  }
}
```

### 6. Get Browser Task Logs
- **Endpoint:** `GET /api/v1/tasks/browser-use/:taskId/logs?limit=50&offset=0&level=all`
- **Purpose:** Get logs for a specific browser task
- **Access:** Private (requires JWT token)
- **Input:** 
  - Path Parameter: `taskId` (UUID)
  - Query Parameters:
    - `limit` (number): Logs per page (default: 50)
    - `offset` (number): Offset for pagination (default: 0)
    - `level` (string): Log level filter (default: 'all')
- **Response:**
```json
{
  "success": true,
  "data": {
    "logs": [
      {
        "id": "log-uuid",
        "task_id": "task-uuid",
        "timestamp": "2024-01-01T00:00:05.000Z",
        "level": "info",
        "message": "Browser automation started",
        "details": { "step": "execution" },
        "source": "agent"
      }
    ],
    "total_count": 15,
    "has_more": false,
    "limit": 50,
    "offset": 0
  }
}
```

### 7. Get Browser-Use Tasks List
- **Endpoint:** `GET /api/v1/tasks/browser-use?limit=20&offset=0&status=COMPLETED&sort_by=createdAt&sort_order=desc`
- **Purpose:** Get all browser tasks for the authenticated user
- **Access:** Private (requires JWT token)
- **Input:** Query Parameters
  - `limit` (number): Items per page (default: 20)
  - `offset` (number): Offset for pagination (default: 0)
  - `status` (string, optional): Filter by task status
  - `sort_by` (string): Sort field (default: 'createdAt')
  - `sort_order` (string): Sort direction (default: 'desc')
- **Response:**
```json
{
  "success": true,
  "data": {
    "tasks": [
      {
        "task_id": "task-uuid",
        "status": "COMPLETED",
        "created_at": "2024-01-01T00:00:00.000Z",
        "started_at": "2024-01-01T00:00:05.000Z",
        "completed_at": "2024-01-01T00:00:45.200Z",
        "execution_time_ms": 45200,
        "model": "gpt-4o-mini",
        "vendor_url": "https://facturacion.example.com",
        "result": { /* execution result */ },
        "error": null,
        "prompt_preview": "Go to the website and process invoice..."
      }
    ],
    "total_count": 25,
    "has_more": true,
    "limit": 20,
    "offset": 0
  }
}
```

---

## Health & Monitoring Endpoints

### 1. Basic Health Check
- **Endpoint:** `GET /health`
- **Purpose:** Basic system health status
- **Access:** Public
- **Input:** None
- **Response:**
```json
{
  "status": "healthy",
  "timestamp": "2024-01-01T00:00:00.000Z",
  "uptime": 3600,
  "version": "1.0.0",
  "environment": "development",
  "services": {
    "database": "healthy",
    "queue": "healthy"
  }
}
```

### 2. Detailed Health Check
- **Endpoint:** `GET /health/detailed`
- **Purpose:** Comprehensive system health information
- **Access:** Public
- **Input:** None
- **Response:**
```json
{
  "status": "healthy",
  "timestamp": "2024-01-01T00:00:00.000Z",
  "version": "1.0.0",
  "environment": "development",
  "system": {
    "nodejs": "v18.17.0",
    "platform": "linux",
    "arch": "x64",
    "memory": { /* memory usage details */ },
    "uptime": 3600
  },
  "services": {
    "database": {
      "status": "healthy",
      "details": { /* database health details */ }
    },
    "queue": {
      "status": "healthy",
      "details": { /* queue health details */ }
    }
  }
}
```

### 3. Readiness Check (Kubernetes)
- **Endpoint:** `GET /health/ready`
- **Purpose:** Kubernetes readiness probe
- **Access:** Public
- **Input:** None
- **Response:**
```json
{
  "status": "ready",
  "timestamp": "2024-01-01T00:00:00.000Z"
}
```

### 4. Liveness Check (Kubernetes)
- **Endpoint:** `GET /health/live`
- **Purpose:** Kubernetes liveness probe
- **Access:** Public
- **Input:** None
- **Response:**
```json
{
  "status": "alive",
  "timestamp": "2024-01-01T00:00:00.000Z",
  "uptime": 3600
}
```

### 5. Queue Health Check
- **Endpoint:** `GET /api/v1/tasks/queue/health`
- **Purpose:** Check queue service health
- **Access:** Private (requires JWT token)
- **Input:** None
- **Response:**
```json
{
  "success": true,
  "data": {
    "status": "healthy",
    "error": null,
    "timestamp": "2024-01-01T00:00:00.000Z"
  }
}
```

### 6. Browser Service Health Check
- **Endpoint:** `GET /api/v1/tasks/browser/health`
- **Purpose:** Check browser service health
- **Access:** Private (requires JWT token)
- **Input:** None
- **Response:**
```json
{
  "success": true,
  "data": {
    "health": { /* health status */ },
    "service": { /* service information */ }
  }
}
```

### 7. Browser-Use Service Health Check
- **Endpoint:** `GET /api/v1/tasks/browser-use/health`
- **Purpose:** Check browser-use service health
- **Access:** Private (requires JWT token)
- **Input:** None
- **Response:**
```json
{
  "success": true,
  "data": {
    "status": "healthy",
    "timestamp": "2024-01-01T00:00:00.000Z",
    "services": { /* service health details */ }
  }
}
```

### 8. Queue Statistics
- **Endpoint:** `GET /api/v1/tasks/queue/stats`
- **Purpose:** Get task queue statistics
- **Access:** Private (requires JWT token)
- **Input:** None
- **Response:**
```json
{
  "success": true,
  "data": {
    "total_tasks": 15,
    "pending_tasks": 5,
    "running_tasks": 3,
    "completed_tasks": 7,
    "failed_tasks": 0,
    "queue_size": 5,
    "worker_count": 2
  }
}
```

---

## WebSocket Endpoints

### 1. Browser Agent WebSocket
- **Endpoint:** `ws://localhost:8000/api/v1/browser-agent/ws?sessionId={sessionId}`
- **Purpose:** Real-time communication for browser automation monitoring
- **Access:** Private (requires session ID)
- **Protocol:** WebSocket
- **Message Types:**
  - `connection_status`: Initial connection confirmation
  - `task_update`: Real-time task status updates
  - `log_entry`: Live log streaming
  - `error`: Error notifications
  - `thinking`: AI agent thinking process

**Connection Parameters:**
- `sessionId`: Unique session identifier for the user

**Message Format:**
```json
{
  "type": "task_update",
  "data": {
    "task_id": "task-uuid",
    "status": "RUNNING",
    "progress": 75,
    "current_step": "Processing form submission",
    "timestamp": "2024-01-01T00:00:30.000Z"
  }
}
```

---

## Error Handling

### Standard Error Response Format
```json
{
  "success": false,
  "error": {
    "code": "ERROR_CODE",
    "message": "Human-readable error message",
    "details": { /* additional error details */ }
  },
  "meta": {
    "timestamp": "2024-01-01T00:00:00.000Z",
    "requestId": "request-uuid"
  }
}
```

### Common Error Codes
- `VALIDATION_ERROR`: Input validation failed
- `AUTHENTICATION_FAILED`: JWT token invalid or expired
- `AUTHORIZATION_FAILED`: Insufficient permissions
- `TASK_NOT_FOUND`: Requested task doesn't exist
- `TASK_ALREADY_RUNNING`: Task is already in progress
- `BROWSER_SERVICE_UNAVAILABLE`: Browser automation service down
- `QUEUE_SERVICE_UNAVAILABLE`: Task queue service down
- `INTERNAL_SERVER_ERROR`: Unexpected server error

### HTTP Status Codes
- `200`: Success
- `201`: Created
- `400`: Bad Request (validation errors)
- `401`: Unauthorized (authentication required)
- `403`: Forbidden (insufficient permissions)
- `404`: Not Found
- `500`: Internal Server Error
- `503`: Service Unavailable

---

## Data Models

### User Profile
```json
{
  "id": "user-uuid",
  "email": "user@example.com",
  "role": "user",
  "profile": {
    "rfc": "XAXX010101000",
    "fiscal_regime": "601",
    "postal_code": "12345",
    "company_name": "Company Name",
    "phone": "+52-55-1234-5678",
    "address": "123 Main St, Mexico City",
    "created_at": "2024-01-01T00:00:00.000Z",
    "updated_at": "2024-01-01T00:00:00.000Z"
  }
}
```

### Task
```json
{
  "id": "task-uuid",
  "user_id": "user-uuid",
  "status": "COMPLETED",
  "prompt": "Task description",
  "model": "gpt-4o-mini",
  "llm_provider": "openai",
  "max_steps": 50,
  "timeout_minutes": 30,
  "vendor_url": "https://example.com",
  "customer_details": { /* customer information */ },
  "invoice_details": { /* invoice information */ },
  "created_at": "2024-01-01T00:00:00.000Z",
  "started_at": "2024-01-01T00:00:05.000Z",
  "completed_at": "2024-01-01T00:00:45.200Z",
  "execution_time_ms": 45200,
  "result": { /* execution result */ },
  "error": null,
  "error_type": null,
  "steps": [ /* execution steps */ ]
}
```

### Task Step
```json
{
  "id": 1,
  "step_type": "navigation",
  "content": {
    "url": "https://example.com",
    "action": "navigate"
  },
  "status": "completed",
  "timestamp": "2024-01-01T00:00:05.000Z",
  "details": { /* step-specific details */ }
}
```

---

## Rate Limiting & Security

### Rate Limiting
- **Authentication Endpoints:** 5 requests per minute per IP
- **Task Creation:** 10 requests per minute per user
- **Task Execution:** 3 requests per minute per user
- **Health Checks:** 60 requests per minute per IP

### Security Features
- **CORS:** Configurable origins with credentials support
- **Helmet:** Security headers (CSP, XSS protection, etc.)
- **JWT Authentication:** Stateless token-based authentication
- **Input Validation:** Comprehensive request validation
- **Error Sanitization:** Production error message sanitization
- **Request Logging:** Detailed request/response logging
- **Request Correlation:** Unique request IDs for tracing

### Environment Variables
```bash
# Required
SUPABASE_URL=your_supabase_url
SUPABASE_ANON_KEY=your_supabase_anon_key

# Recommended
SUPABASE_SERVICE_KEY=your_supabase_service_key
JWT_SECRET=your_jwt_secret
OPENAI_API_KEY=your_openai_api_key

# Optional
PORT=8000
NODE_ENV=development
CORS_ORIGINS=http://localhost:3000,http://localhost:5173
MAX_CONCURRENT_TASKS=5
TASK_TIMEOUT_MINUTES=30
```

---

## API Root Information

### Get API Information
- **Endpoint:** `GET /api/v1`
- **Purpose:** Get comprehensive API information
- **Access:** Public
- **Input:** None
- **Response:**
```json
{
  "success": true,
  "data": {
    "name": "CFDI Automation API",
    "version": "v1",
    "description": "Mexican CFDI 4.0 Invoice Automation System",
    "status": "operational",
    "endpoints": {
      "health": "/health",
      "auth": "/api/v1/auth",
      "tasks": "/api/v1/tasks"
    },
    "documentation": {
      "swagger": "/api/v1/docs",
      "postman": "/api/v1/postman"
    }
  },
  "meta": {
    "timestamp": "2024-01-01T00:00:00.000Z",
    "requestId": "request-uuid",
    "environment": "development"
  }
}
```

---

## Integration Examples

### Frontend Integration
```typescript
// Example API client usage
import { ApiClient } from './services/api';

const api = new ApiClient();

// Create a browser automation task
const task = await api.post('/tasks/browser-use', {
  prompt: 'Process invoice for RFC XAXX010101000',
  vendor_url: 'https://facturacion.example.com',
  model: 'gpt-4o-mini'
});

// Monitor task progress via WebSocket
const ws = new WebSocket(`ws://localhost:8000/api/v1/browser-agent/ws?sessionId=${sessionId}`);
ws.onmessage = (event) => {
  const data = JSON.parse(event.data);
  if (data.type === 'task_update') {
    console.log('Task progress:', data.data.progress);
  }
};
```

### Python Integration
```python
import requests

# Create task
response = requests.post(
    'http://localhost:8000/api/v1/tasks/browser-use',
    json={
        'prompt': 'Process invoice for RFC XAXX010101000',
        'vendor_url': 'https://facturacion.example.com',
        'model': 'gpt-4o-mini'
    },
    headers={'Authorization': f'Bearer {token}'}
)

task_id = response.json()['data']['task_id']

# Get task status
status = requests.get(
    f'http://localhost:8000/api/v1/tasks/browser-use/{task_id}',
    headers={'Authorization': f'Bearer {token}'}
)
```

---

## Notes

1. **Authentication:** All private endpoints require a valid JWT token in the Authorization header
2. **Task Execution:** Browser automation tasks are processed asynchronously with real-time updates
3. **WebSocket:** Real-time communication is available for monitoring task progress
4. **Error Handling:** Comprehensive error codes and messages for debugging
5. **Validation:** Input validation is performed on all endpoints
6. **Logging:** Detailed logging for debugging and monitoring
7. **Health Checks:** Multiple health check endpoints for different monitoring needs
8. **Rate Limiting:** Built-in rate limiting to prevent abuse
9. **Security:** Multiple security layers including CORS, Helmet, and JWT validation

This API contract represents the current state of the CFDI Automation API as implemented in the codebase. All endpoints are functional and ready for production use.

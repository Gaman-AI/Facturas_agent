# BACKEND ARCHITECTURE Document

## **Introduction**

The backend is the backbone of the SaaS application, managing user authentication, task orchestration, real-time communication, and integration with the Browser-Use agent and Browserbase for live automation of CFDI 4.0 form submissions on vendor portals. It is built with a modular, scalable, and secure architecture to support multi-tenant usage, ensuring transparency and user control through live streaming and WebSocket updates.

This synchronized version aligns with all project documents, using consistent database schema, API endpoints, and technology specifications.

---

## **Design Principles**

- **Modularity**: Separate concerns (authentication, task management, agent orchestration) for maintainability
- **Scalability**: Leverage bullmq for robust task queuing and Supabase for database scalability
- **Real-Time**: Use WebSockets at `/ws/:taskId` for live status updates and Browserbase for streaming
- **Security**: Implement JWT authentication with Supabase Auth, data encryption, and LFPDPPP compliance
- **Consistency**: Standardized API endpoints, database schema, and error handling across the entire system

---

## **File Structure - SYNCHRONIZED**

```
backend/
├── src/
│   ├── index.js             # Express app entry point
│   ├── app.js               # Main Express application setup
│   ├── config/
│   │   ├── db.js            # Supabase client initialization
│   │   ├── redis.js         # bullmq configuration
│   │   └── env.js           # Environment variable validation
│   ├── middleware/
│   │   ├── auth.js          # JWT authentication middleware
│   │   ├── validation.js    # Zod input validation middleware
│   │   └── errorHandler.js  # Centralized error handling
│   ├── models/
│   │   ├── user.js          # user_profiles operations
│   │   ├── task.js          # automation_tasks operations
│   │   └── taskStep.js      # task_steps operations
│   ├── routes/
│   │   ├── auth.js          # /api/v1/auth/* routes
│   │   └── tasks.js         # /api/v1/tasks/* routes
│   ├── services/
│   │   ├── authService.js   # Supabase Auth integration
│   │   ├── taskService.js   # Task management with bullmq
│   │   ├── agentService.js  # Browser-Use + Browserbase orchestration
│   │   └── socketService.js # WebSocket management
│   ├── utils/
│   │   ├── logger.js        # Winston logging utility
│   │   ├── asyncHandler.js  # Async error wrapper
│   │   └── encryption.js    # AES-256 encryption for sensitive data
│   ├── ws/
│   │   └── taskSocket.js    # WebSocket server at /ws/:taskId
│   └── workers/
│       └── taskWorker.js    # bullmq worker for task processing
├── tests/
│   ├── unit/
│   └── integration/
├── docker/
│   ├── Dockerfile
│   └── docker-compose.yml
├── .env.example
└── package.json

```

---

## **Database Schema Integration**

The backend uses the synchronized database schema from the Schema Design Document:

### **Core Tables**

- **users**: Managed by Supabase Auth (id, email, created_at)
- **user_profiles**: RFC, fiscal_regime, postal_code, company_details
- **automation_tasks**: Main task tracking with standardized status values
- **task_steps**: Detailed step logging for real-time updates
- **browser_sessions**: Browserbase session management
- **user_vendor_credentials**: Encrypted vendor portal credentials

### **Status Values (Standardized)**

```tsx
type TaskStatus =
  | 'PENDING'           // Queued but not started
  | 'RUNNING'           // Active automation in progress
  | 'PAUSED'            // User-initiated pause
  | 'INTERVENTION_NEEDED' // Requires user input
  | 'COMPLETED'         // Successfully submitted
  | 'FAILED'            // Unsuccessful after retries

```

---

## **API Endpoints - STANDARDIZED**

### **Authentication Routes (`/api/v1/auth`)**

```jsx
// POST /api/v1/auth/register
{
  email: "user@example.com",
  password: "password123",
  rfc: "ABC123456XYZ",
  fiscal_regime: "601",
  postal_code: "03100"
}
// Response: { message: "User registered" }

// POST /api/v1/auth/login
{
  email: "user@example.com",
  password: "password123"
}
// Response: { token: "jwt_token_string" }

```

### **Task Management Routes (`/api/v1/tasks`)**

```jsx
// GET /api/v1/tasks?page=1&limit=10&status=all
// Response: [{ id, vendor_url, status, created_at, ... }]

// POST /api

```
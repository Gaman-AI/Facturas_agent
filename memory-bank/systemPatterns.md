# System Patterns

## Architecture Overview

### **Microservices Architecture with Clear Separation**
The system follows a modern microservices pattern with clear boundaries between frontend, backend, automation, and external services.

```
Frontend (React 19) ↔ Backend (Node.js/Express) ↔ Database (Supabase)
                           ↓
                    Queue System (bullmq/Redis)
                           ↓
              Custom Browser-Use Agent ↔ Browserbase Infrastructure
```

### **Key Architectural Decisions**

#### 1. **Dual-Pane Interface Pattern**
- **70% Live View**: Embedded Browserbase Live View iFrame showing real browser session
- **30% Status Sidebar**: Real-time updates, controls, and step logging
- **Responsive Adaptation**: Stacks vertically on mobile devices

#### 2. **Real-Time Communication Pattern**
- **WebSocket at `/ws/:taskId`**: Bidirectional real-time updates
- **Event-Driven Updates**: Status changes broadcast instantly to connected clients
- **Connection Resilience**: Automatic reconnection with exponential backoff

#### 3. **Multi-Tenant Security Pattern**
- **Row-Level Security (RLS)**: Database-level tenant isolation via Supabase
- **JWT Authentication**: Stateless authentication with automatic refresh
- **Encrypted Sensitive Data**: AES-256 encryption for RFC, credentials, company details

## Core Design Patterns

### **1. Task Processing Pattern**
```
Task Submission → Queue (bullmq) → Worker Process → Browser Session → Completion
                    ↓
            Real-time Updates via WebSocket
```

**Key Components:**
- **Task Queue**: bullmq with Redis for robust job processing
- **Worker Isolation**: Each task runs in isolated browser session via Browserbase
- **Retry Logic**: Exponential backoff with max 3 attempts
- **Status Tracking**: Standardized status values (PENDING → RUNNING → COMPLETED/FAILED)

### **2. User Intervention Pattern**
```
Error Detected → Pause Agent → Update Status → Enable User Takeover → Resume Agent
```

**Implementation:**
- **Seamless Handoff**: User takes control via Browserbase Live View without losing context
- **State Preservation**: Browser session state maintained during intervention
- **Guided Resolution**: Contextual help for common issues (CAPTCHA, login)
- **Resume Capability**: Agent continues from where user left off

### **3. Browser Session Management Pattern**
```
Task Start → Create Browserbase Session → Generate Live View URL → Embed iFrame → Cleanup
```

**Session Lifecycle:**
- **Creation**: Isolated VM instance per task via Browserbase API
- **Monitoring**: Live View URL embedded in frontend for real-time visibility
- **Control**: User takeover URL for manual intervention
- **Cleanup**: Automatic termination after task completion/timeout

### **4. Data Encryption Pattern**
```
Sensitive Input → AES-256 Encryption → Database Storage → Decryption on Use
```

**Encryption Scope:**
- **User RFC**: Mexican tax identification number
- **Vendor Credentials**: Portal usernames/passwords
- **Company Details**: Business information in JSONB format
- **Session Data**: Browser session metadata

## Component Relationships

### **Frontend Components**
```
App Shell
├── AuthProvider (JWT + Supabase Auth)
├── Router (Protected Routes)
├── Dashboard (Task Summary + Quick Actions)
├── Task Creation (Form + Validation)
├── Dual-Pane Monitor
│   ├── Live View Container (Browserbase iFrame)
│   └── Status Sidebar (WebSocket Updates)
└── Task History (TanStack Table)
```

### **Backend Services**
```
Express App
├── Authentication Middleware (JWT validation)
├── API Routes
│   ├── /api/v1/auth/* (Supabase Auth integration)
│   └── /api/v1/tasks/* (Task CRUD operations)
├── WebSocket Server (/ws/:taskId)
├── Task Service (bullmq integration)
├── Agent Orchestration Service
└── Database Models (Supabase operations)
```

### **Automation Components**
```
Custom Browser-Use Agent
├── CFDI-Specific Prompts
├── Vendor Portal Adapters
├── Error Recovery Logic
├── Browserbase Integration
└── Step Logging System
```

## Database Design Patterns

### **Core Tables & Relationships**
```
users (Supabase Auth) ←→ user_profiles (CFDI data)
                            ↓
                     automation_tasks (main tracking)
                            ↓
                      task_steps (detailed logging)
                            ↓
                   browser_sessions (Browserbase management)
```

### **Key Schema Patterns**

#### 1. **Standardized Status Management**
```sql
-- Task status with CHECK constraint
status VARCHAR(20) CHECK (status IN (
  'PENDING', 'RUNNING', 'PAUSED', 
  'INTERVENTION_NEEDED', 'COMPLETED', 'FAILED'
))
```

#### 2. **JSONB for Flexible Data**
```sql
-- Ticket details stored as flexible JSON
ticket_details JSONB NOT NULL
-- Company information with encryption
company_details JSONB [ENCRYPTED]
```

#### 3. **Comprehensive Audit Trail**
```sql
-- Step-by-step logging with timestamps
task_steps (task_id, step_type, content, timestamp, duration_ms)
```

## Error Handling Patterns

### **Hierarchical Error Recovery**
```
1. Automatic Retry (bullmq) → 2. User Intervention → 3. Manual Fallback → 4. Task Failure
```

### **Error Classification System**
- **CAPTCHA Detection**: Pause automation, enable user takeover
- **Login Issues**: Try stored credentials, fallback to user intervention
- **Form Validation**: Automatic retry with corrected data format
- **Network Timeouts**: Exponential backoff retry via bullmq
- **Browser Errors**: Session recovery, fallback to new session
- **Unknown Errors**: Detailed logging, escalate to FAILED status

### **Error Recovery Mechanisms**
```javascript
// Error handling middleware pattern
const errorHandler = async (error, task) => {
  switch (error.type) {
    case 'CAPTCHA_DETECTED':
      return await pauseForIntervention(task);
    case 'LOGIN_FAILED':
      return await retryWithStoredCredentials(task);
    case 'NETWORK_TIMEOUT':
      return await scheduleRetry(task, exponentialDelay);
    default:
      return await logAndFail(task, error);
  }
};
```

## Performance Patterns

### **Caching Strategy**
```
Redis Cache Layers:
├── User Profiles (1 hour TTL)
├── Vendor Configurations (4 hours TTL)
├── Session State (session lifetime)
└── Task Metrics (5 minutes TTL)
```

### **Database Optimization**
```sql
-- Performance indexes
CREATE INDEX idx_automation_tasks_user_status ON automation_tasks (user_id, status);
CREATE INDEX idx_task_steps_task_id_timestamp ON task_steps (task_id, timestamp DESC);
CREATE INDEX idx_browser_sessions_status ON browser_sessions (status);
```

### **Connection Pooling**
- **Database**: Supabase built-in connection pooling
- **Redis**: Connection pool for bullmq operations
- **WebSocket**: Connection management with automatic cleanup

## Security Patterns

### **Authentication Flow**
```
1. User Login → 2. Supabase Auth → 3. JWT Token → 4. RLS Activation → 5. Secure Data Access
```

### **Data Access Control**
```sql
-- Row-Level Security policies
CREATE POLICY "user_data_isolation" ON automation_tasks 
FOR ALL USING (auth.uid() = user_id);
```

### **API Security Layers**
1. **Rate Limiting**: Per-user request limits
2. **Input Validation**: Zod schema validation
3. **CORS Configuration**: Restricted origins
4. **HTTPS Enforcement**: All communications encrypted

## Scalability Patterns

### **Horizontal Scaling Points**
- **Frontend**: CDN + multiple deployment regions
- **Backend**: Load-balanced Express instances
- **Database**: Supabase read replicas + connection pooling
- **Queue**: Redis clustering for high-throughput processing
- **Browser Sessions**: Browserbase auto-scaling infrastructure

### **Performance Monitoring**
```javascript
// Performance tracking pattern
const performanceMetrics = {
  apiResponseTime: '<200ms target',
  webSocketLatency: '<300ms target',
  taskProcessingTime: '3 minutes max',
  concurrentSessions: '50+ capacity',
  systemUptime: '99.9% target'
};
```

## Integration Patterns

### **External Service Integration**
```
Application Layer
├── Supabase SDK (Database + Auth)
├── Browserbase SDK (Browser Management)
├── Redis Client (Job Queue)
└── Custom Browser-Use Agent (AI Automation)
```

### **API Design Patterns**
- **RESTful Endpoints**: Standard HTTP methods and status codes
- **Consistent Response Format**: Standardized JSON structure
- **Error Response Schema**: Uniform error handling across endpoints
- **OpenAPI Documentation**: Complete API specification

### **Event-Driven Communication**
```javascript
// WebSocket event patterns
const eventTypes = {
  'task.started': 'Task processing began',
  'task.step': 'Individual step completed',
  'task.paused': 'User intervention needed',
  'task.resumed': 'Automation continued',
  'task.completed': 'Task finished successfully',
  'task.failed': 'Task encountered fatal error'
};
```

## Development Patterns

### **Code Organization**
```
/src
├── /frontend (React components + hooks)
├── /backend (Express routes + services)
├── /shared (Common types + utilities)
├── /automation (Browser-Use agent + prompts)
└── /tests (Unit + integration + e2e)
```

### **Testing Strategy**
- **Unit Tests**: Jest + React Testing Library (95%+ coverage)
- **Integration Tests**: API endpoint testing
- **E2E Tests**: Playwright for complete user workflows
- **Performance Tests**: Load testing with concurrent sessions

### **Deployment Patterns**
- **Frontend**: Static site deployment with CDN
- **Backend**: Containerized deployment with auto-scaling
- **Database**: Managed Supabase with automated backups
- **Monitoring**: Comprehensive logging + alerting system 
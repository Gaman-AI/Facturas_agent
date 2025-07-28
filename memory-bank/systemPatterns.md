# System Patterns: CFDI 4.0 Automation Architecture

## Architecture Overview

### Core Architecture Pattern
**Event-Driven Microservices** with real-time communication and AI agent orchestration.

```
Frontend (React) ↔ Backend (Express) ↔ Database (Supabase)
                        ↓
                 Queue System (Redis) ↔ AI Agent (Browser-Use)
                        ↓
                Live Streaming (Browserbase)
```

### Design Principles
1. **Modularity**: Separate concerns for independent development and scaling
2. **Real-Time First**: WebSocket-based communication for live updates
3. **Security by Design**: JWT authentication with row-level security
4. **Observability**: Comprehensive logging and monitoring
5. **Fault Tolerance**: Retry logic and graceful degradation

## Core Components

### 1. Authentication & Authorization Pattern
- **JWT-based Authentication** via Supabase Auth
- **Row-Level Security (RLS)** for multi-tenant data isolation
- **Middleware Chain**: Authentication → Authorization → Validation

```javascript
// Auth Middleware Pattern
const authMiddleware = async (req, res, next) => {
  const token = extractToken(req.headers.authorization);
  const user = await verifyJWT(token);
  req.user = user;
  next();
};
```

### 2. Task Orchestration Pattern
- **Producer-Consumer** with Redis queue
- **State Machine** for task lifecycle management
- **Event-Driven Updates** via WebSocket broadcasting

**Task States**: `PENDING → QUEUED → RUNNING → PAUSED → COMPLETED/FAILED`

### 3. Real-Time Communication Pattern
- **WebSocket Server** integrated with Express
- **Room-based Broadcasting** for task-specific updates
- **Event Publishing** from agent to connected clients

```javascript
// WebSocket Event Pattern
socketService.broadcastUpdate(taskId, {
  status: 'RUNNING',
  message: 'Navegando a portal del proveedor...',
  timestamp: new Date().toISOString()
});
```

### 4. AI Agent Integration Pattern
- **Async Task Processing** with Browser-Use agent
- **Session Management** via Browserbase API
- **Error Recovery** with retry logic and user intervention

## Data Patterns

### 1. Database Schema Pattern
**Normalized Relational Design** with JSONB for flexibility:

```sql
-- Core Tables
users (auth) → user_profiles (data) → automation_tasks → task_logs
                                   ↓
                              browser_sessions
```

### 2. Data Validation Pattern
- **Schema-First Validation** using Zod
- **Input Sanitization** at API boundary
- **Type Safety** across TypeScript frontend/backend

```typescript
// Validation Schema Pattern
const TaskSubmissionSchema = z.object({
  vendorUrl: z.string().url(),
  ticketData: z.object({
    amount: z.number().positive(),
    date: z.string().datetime(),
    concept: z.string().min(1)
  })
});
```

### 3. Encryption Pattern
- **AES-256 Encryption** for sensitive user data
- **Environment-based Key Management**
- **Transparent Encryption/Decryption** in data access layer

## Integration Patterns

### 1. External Service Integration
**Circuit Breaker Pattern** for external API calls:

```javascript
// Service Integration Pattern
class BrowserbaseService {
  async createSession(config) {
    return await this.circuitBreaker.execute(() => 
      axios.post('/browserbase/sessions', config)
    );
  }
}
```

### 2. Error Handling Pattern
**Centralized Error Management** with contextual recovery:

```javascript
// Error Handling Pattern
class TaskError extends Error {
  constructor(type, message, context) {
    super(message);
    this.type = type; // 'CAPTCHA', 'LOGIN_REQUIRED', 'NETWORK_ERROR'
    this.context = context;
    this.retryable = determineRetryability(type);
  }
}
```

### 3. Retry Logic Pattern
**Exponential Backoff** with maximum attempts:

```javascript
// Retry Pattern
const retryConfig = {
  attempts: 3,
  delay: (attempt) => Math.pow(2, attempt) * 1000,
  retryIf: (error) => error.retryable
};
```

## Security Patterns

### 1. Authentication Flow
```
User Login → JWT Token → Request → Middleware → RLS → Response
```

### 2. Data Protection Pattern
- **Encryption at Rest**: Sensitive fields encrypted in database
- **Encryption in Transit**: HTTPS/WSS for all communication
- **Data Isolation**: RLS policies prevent cross-tenant access

### 3. Input Validation Pattern
```
Raw Input → Zod Schema → Sanitization → Business Logic → Database
```

## Performance Patterns

### 1. Caching Strategy
- **Redis Caching** for frequently accessed user data
- **Session Caching** for active browser sessions
- **Query Optimization** with database indexes

### 2. Queue Management Pattern
- **Priority Queues** for different task types
- **Dead Letter Queue** for failed tasks
- **Worker Scaling** based on queue length

### 3. Real-Time Optimization
- **WebSocket Connection Pooling**
- **Event Debouncing** for high-frequency updates
- **Selective Broadcasting** to relevant clients only

## Monitoring & Observability Patterns

### 1. Logging Pattern
**Structured Logging** with correlation IDs:

```javascript
// Logging Pattern
logger.info('Task started', {
  correlationId: req.correlationId,
  taskId: task.id,
  userId: req.user.id,
  action: 'TASK_START'
});
```

### 2. Health Check Pattern
- **Service Health Endpoints** for all components
- **Dependency Health Checks** (Database, Redis, Browserbase)
- **Circuit Breaker Status** monitoring

### 3. Metrics Collection Pattern
- **Task Success/Failure Rates**
- **Response Time Monitoring**
- **Queue Length Tracking**
- **User Session Analytics**

## Scalability Patterns

### 1. Horizontal Scaling
- **Stateless Backend Services** for easy horizontal scaling
- **Worker Process Scaling** based on queue metrics
- **Database Connection Pooling** for concurrent requests

### 2. Resource Management
- **Task Timeout Management** (3-minute global, 10-second action)
- **Memory Management** for long-running agent processes
- **Session Cleanup** for terminated browser sessions

### 3. Load Distribution
- **Round-Robin Load Balancing** for API requests
- **Queue-Based Load Distribution** for agent tasks
- **Geographic Distribution** (future consideration)

## Development Patterns

### 1. Code Organization
```
src/
├── api/           # Route handlers
├── services/      # Business logic
├── models/        # Data access layer
├── middleware/    # Cross-cutting concerns
├── utils/         # Shared utilities
└── types/         # TypeScript definitions
```

### 2. Testing Patterns
- **Unit Tests** for individual functions/services
- **Integration Tests** for API endpoints
- **E2E Tests** for complete user workflows
- **Mock Services** for external dependencies

### 3. Deployment Patterns
- **Containerized Deployment** with Docker
- **Environment-based Configuration**
- **Blue-Green Deployment** for zero-downtime updates
- **Health Check Integration** with deployment pipeline 
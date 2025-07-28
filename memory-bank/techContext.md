# Technology Context

## Core Technology Stack

### **Frontend Technologies**
- **React 19**: Modern UI framework with concurrent features, Suspense, and automatic batching
- **TypeScript**: End-to-end type safety with strict configuration
- **shadcn/ui**: Production-ready component library with accessibility compliance
- **Tailwind CSS**: Utility-first CSS framework with custom design system
- **TanStack Table**: High-performance data grid for task history management
- **Zod**: TypeScript-first schema validation for forms and API responses
- **react-hook-form**: Performance-focused form library with built-in validation

### **Backend Technologies**
- **Node.js 20.x LTS**: JavaScript runtime with latest performance improvements
- **Express.js**: Web application framework with middleware ecosystem
- **TypeScript**: Server-side type safety and better development experience
- **JWT**: Stateless authentication tokens with automatic refresh
- **WebSocket**: Real-time bidirectional communication for live updates

### **Database & Storage**
- **Supabase PostgreSQL 15.x**: Primary database with ACID compliance
- **Supabase Auth**: Managed authentication service with JWT integration
- **Supabase Storage**: Secure file storage for documents and media
- **Row-Level Security (RLS)**: Database-level multi-tenant isolation
- **Redis 7.x**: In-memory data store for caching and job queuing

### **Automation & AI Stack**
- **Custom Browser-Use Agent**: Enhanced open-source library with CFDI-specific patterns
- **Browserbase**: Serverless headless browser infrastructure with Live View iFrames
- **Python 3.11+**: For Browser-Use agent development and AI model integration
- **Multiple LLM Support**: OpenAI, Anthropic, Google, Groq for agent intelligence

### **Queue & Task Management**
- **bullmq**: Robust Redis-based task queue with retry logic
- **Redis Clustering**: High-availability job processing infrastructure
- **Task Scheduling**: Delayed jobs and cron-like scheduling capabilities

## Development Environment Setup

### **Local Development Requirements**
```bash
# Core runtime versions
Node.js: 20.x LTS
Python: 3.11+
TypeScript: 5.x
npm/yarn: Latest stable

# Development databases
PostgreSQL: 15.x (via Supabase local)
Redis: 7.x (via Docker or local install)
```

### **Environment Configuration**
```bash
# Required environment variables
DATABASE_URL=postgresql://...
SUPABASE_URL=https://...
SUPABASE_ANON_KEY=...
REDIS_URL=redis://...
BROWSERBASE_API_KEY=...
JWT_SECRET=...
ENCRYPTION_KEY=...
```

### **Development Tools**
- **ESLint + Prettier**: Code quality and formatting standards
- **Husky**: Git hooks for pre-commit validation
- **Conventional Commits**: Standardized commit message format
- **Docker**: Containerization for local Redis and development consistency
- **VS Code**: Recommended IDE with TypeScript and React extensions

## External Service Dependencies

### **Critical External Services**

#### **Supabase Ecosystem**
- **Database**: PostgreSQL with auto-scaling and connection pooling
- **Authentication**: Supabase Auth with social login support
- **Storage**: File storage for user documents and session recordings
- **Edge Functions**: Serverless functions for complex operations
- **Real-time**: Database change subscriptions for live updates

**Constraints:**
- Connection limits based on pricing tier
- Row-Level Security configuration required
- Regional data residency considerations

#### **Browserbase Infrastructure**
- **Browser Sessions**: Isolated VM instances for each automation task
- **Live View API**: Real-time browser session embedding
- **Session Management**: Creation, control, and termination APIs
- **Recording Capabilities**: Optional session recording and playback

**Constraints:**
- Session duration limits (configurable)
- Concurrent session limits based on plan
- Regional availability for optimal performance
- Network latency considerations

#### **Redis Infrastructure**
- **Job Queue**: bullmq task processing and retry logic
- **Session Cache**: Temporary data storage with TTL
- **Rate Limiting**: API throttling and user limits
- **Real-time State**: WebSocket connection management

**Constraints:**
- Memory limits based on Redis plan
- Connection limits for concurrent operations
- Persistence configuration for job reliability

## Performance Requirements & Constraints

### **Response Time Targets**
```javascript
const performanceTargets = {
  // API Performance
  apiResponseTime: 200,        // ms - standard operations
  cachedResponseTime: 100,     // ms - cached data retrieval
  
  // Real-time Communication
  webSocketLatency: 300,       // ms - status updates
  liveViewLoadTime: 2000,      // ms - embedded browser iframe
  
  // Task Processing
  taskSubmissionTime: 1000,    // ms - from submit to queue
  globalTaskTimeout: 180000,   // ms - 3 minutes per task
  browserActionTimeout: 10000, // ms - individual browser action
  
  // System Capacity
  concurrentSessions: 50,      // simultaneous automation tasks
  concurrentUsers: 1000,       // active users
  databaseConnections: 100     // PostgreSQL connection pool
};
```

### **Scalability Constraints**
- **Database**: Supabase connection limits and query performance
- **Redis**: Memory limits and connection pool size
- **Browserbase**: Session limits and regional capacity
- **Network**: WebSocket connection limits and bandwidth usage

### **Browser Compatibility**
```javascript
// Supported browsers for Live View iFrame
const browserSupport = {
  chrome: '90+',
  firefox: '88+', 
  safari: '14+',
  edge: '90+'
};
```

## Security & Compliance

### **Data Protection Implementation**
- **Encryption at Rest**: AES-256 for sensitive fields (RFC, credentials)
- **Encryption in Transit**: HTTPS/WSS for all communications
- **Key Management**: Secure environment variable storage
- **Data Anonymization**: No personally identifiable information in logs

### **Authentication & Authorization**
```javascript
// JWT token structure
const jwtPayload = {
  sub: 'user_id',           // Supabase user ID
  iat: 1234567890,          // Issued at timestamp
  exp: 1234567890,          // Expiration timestamp
  role: 'authenticated',     // Supabase role
  email: 'user@example.com'  // User email
};
```

### **Compliance Requirements**
- **LFPDPPP**: Mexican data protection law compliance
- **Data Residency**: User data stored in appropriate regions
- **Audit Logging**: Comprehensive tracking of data access and modifications
- **Right to Deletion**: User data removal capabilities

## API Design Standards

### **RESTful Endpoint Patterns**
```javascript
// Standardized API structure
const apiEndpoints = {
  // Authentication
  'POST /api/v1/auth/register': 'User registration',
  'POST /api/v1/auth/login': 'User authentication',
  
  // Task Management
  'GET /api/v1/tasks': 'List user tasks with pagination',
  'POST /api/v1/tasks': 'Create new automation task',
  'GET /api/v1/tasks/:id': 'Get task details and step logs',
  'PUT /api/v1/tasks/:id/pause': 'Pause running task',
  'PUT /api/v1/tasks/:id/resume': 'Resume paused task',
  
  // WebSocket
  'WS /ws/:taskId': 'Real-time task updates'
};
```

### **Response Format Standards**
```typescript
// Standardized API response types
interface ApiResponse<T> {
  success: boolean;
  data?: T;
  error?: {
    code: string;
    message: string;
    details?: any;
  };
  meta?: {
    timestamp: string;
    requestId: string;
    pagination?: PaginationMeta;
  };
}
```

## Development Workflow

### **Code Quality Standards**
```json
// TypeScript configuration requirements
{
  "strict": true,
  "noImplicitReturns": true,
  "noUnusedLocals": true,
  "noUnusedParameters": true
}
```

### **Testing Requirements**
- **Unit Tests**: >95% code coverage with Jest
- **Integration Tests**: API endpoint testing with Supertest
- **E2E Tests**: Complete user workflows with Playwright
- **Performance Tests**: Load testing with k6 or Artillery

### **CI/CD Pipeline**
```yaml
# GitHub Actions workflow stages
stages:
  - lint_and_typecheck: ESLint + TypeScript validation
  - unit_tests: Jest test suite execution
  - integration_tests: API testing with test database
  - build: TypeScript compilation and bundling
  - deploy_staging: Automated staging deployment
  - e2e_tests: Playwright testing against staging
  - deploy_production: Manual production deployment
```

## Deployment Architecture

### **Hosting Infrastructure**
- **Frontend**: Static site hosting (Vercel/Netlify) with global CDN
- **Backend**: Containerized deployment (Railway/Render/Fly.io)
- **Database**: Managed Supabase with automatic scaling
- **Cache**: Redis Cloud with high availability
- **Browser Infrastructure**: Browserbase global infrastructure

### **Environment Separation**
```
Development → Staging → Production
     ↓           ↓         ↓
Local DB → Test DB → Production DB
Local Redis → Test Redis → Production Redis
```

### **Monitoring & Observability**
- **Application Performance**: Response times, error rates, throughput
- **Infrastructure Monitoring**: CPU, memory, database performance
- **Real-time Metrics**: Active sessions, queue lengths, user activity
- **Error Tracking**: Automated error detection and alerting

## Technical Constraints & Limitations

### **Browser Automation Constraints**
- **Session Duration**: Maximum 30 minutes per automation task
- **Concurrent Limits**: Based on Browserbase plan and user tier
- **Geographic Restrictions**: Regional availability affects performance
- **JavaScript Execution**: Complex SPAs may require additional handling

### **Database Constraints**
- **Connection Pooling**: Limited concurrent connections per plan
- **Query Performance**: Complex joins may require optimization
- **Storage Limits**: File storage quotas based on Supabase plan
- **Real-time Limits**: Subscription limits for live updates

### **Real-time Communication**
- **WebSocket Limits**: Maximum concurrent connections per server
- **Message Rate**: Throttling for high-frequency updates
- **Connection Stability**: Handling network interruptions and reconnection

## Integration Standards

### **Error Handling Patterns**
```typescript
// Standardized error types
enum ErrorType {
  VALIDATION_ERROR = 'VALIDATION_ERROR',
  AUTHENTICATION_ERROR = 'AUTHENTICATION_ERROR',
  AUTHORIZATION_ERROR = 'AUTHORIZATION_ERROR',
  RESOURCE_NOT_FOUND = 'RESOURCE_NOT_FOUND',
  RATE_LIMIT_EXCEEDED = 'RATE_LIMIT_EXCEEDED',
  INTERNAL_SERVER_ERROR = 'INTERNAL_SERVER_ERROR'
}
```

### **Logging Standards**
```typescript
// Structured logging format
interface LogEntry {
  timestamp: string;
  level: 'debug' | 'info' | 'warn' | 'error';
  message: string;
  context: {
    userId?: string;
    taskId?: string;
    requestId: string;
    sessionId?: string;
  };
  metadata?: Record<string, any>;
}
```

## Future Technology Considerations

### **Planned Upgrades**
- **React 19 Concurrent Features**: Enhanced performance with Suspense
- **Server Components**: Gradual adoption for better performance
- **Edge Functions**: Supabase Edge Functions for complex operations
- **Multi-region Deployment**: Geographic distribution for global users

### **Technology Evolution**
- **AI/ML Integration**: Enhanced form recognition and vendor adaptation
- **Mobile SDK**: Native mobile applications for iOS and Android
- **Microservices Migration**: Gradual service decomposition for scale
- **Advanced Analytics**: Machine learning for automation optimization

### **Performance Optimizations**
- **CDN Strategy**: Global content delivery for static assets
- **Database Sharding**: Horizontal scaling for high-volume users
- **Caching Layers**: Multi-level caching for optimal performance
- **Connection Optimization**: Advanced pooling and connection management 
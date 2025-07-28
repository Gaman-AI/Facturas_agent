# Technology Context: CFDI 4.0 Automation Stack

## Technology Stack Overview

### Core Architecture
**Modern SaaS Application** with AI automation, real-time streaming, and secure multi-tenant architecture.

### Technology Selection Rationale
- **Performance**: Sub-200ms API response requirements
- **Real-Time**: Live browser streaming and WebSocket updates
- **Scalability**: Support 1,000+ concurrent users
- **Security**: Mexican data protection compliance
- **Developer Experience**: Modern tooling and frameworks

## Frontend Technologies

### Primary Stack
- **React 19**: Latest React features for optimal performance and developer experience
- **shadcn/ui**: Consistent, accessible component library with Tailwind integration
- **Tailwind CSS**: Utility-first styling for responsive design and rapid development
- **TypeScript**: Type safety and improved developer experience

### Supporting Libraries
- **Zod**: Runtime schema validation for forms and API responses
- **react-hook-form**: Performance-focused form management
- **TanStack Table**: Advanced table functionality for task history
- **WebSocket Client**: Real-time communication with backend

### Frontend Architecture
```
React App
├── Components (shadcn/ui)
├── Pages (routing)
├── Hooks (custom logic)
├── Context (global state)
├── Services (API calls)
└── Utils (helpers)
```

### Build & Development Tools
- **Vite**: Fast development server and build tool
- **ESLint + Prettier**: Code quality and formatting
- **TypeScript**: Compile-time type checking

## Backend Technologies

### Primary Stack
- **Node.js**: JavaScript runtime for server-side development
- **Express.js**: Web framework for API development
- **TypeScript**: Type safety across the entire stack

### Key Dependencies
```json
{
  "express": "Web server framework",
  "@supabase/supabase-js": "Database and auth client",
  "bullmq": "Redis-based task queue management",
  "ws": "WebSocket server implementation",
  "zod": "Schema validation",
  "winston": "Structured logging",
  "helmet": "Security headers",
  "express-rate-limit": "API rate limiting"
}
```

### Backend Architecture
```
src/
├── api/           # Route handlers
├── services/      # Business logic
├── models/        # Data access layer
├── middleware/    # Authentication, validation
├── utils/         # Shared utilities
├── config/        # Environment configuration
└── websockets/    # Real-time communication
```

## Database Technologies

### Primary Database
- **Supabase PostgreSQL**: Managed PostgreSQL with built-in auth
- **Row-Level Security (RLS)**: Multi-tenant data isolation
- **Real-time Subscriptions**: Database change notifications

### Database Features
- **JSON/JSONB Support**: Flexible data storage for ticket details
- **Full-text Search**: Task and log searching capabilities
- **Automated Backups**: Point-in-time recovery
- **Connection Pooling**: Concurrent request handling

### Schema Design
```sql
-- Core Tables
users (Supabase Auth managed)
user_profiles (RFC, tax regime, address)
automation_tasks (task tracking)
task_logs (automation logs)
browser_sessions (live session management)
user_vendor_credentials (encrypted credentials)
```

## Queue & Caching

### Redis Implementation
- **BullMQ**: Robust job queue with Redis backend
- **Session Storage**: Browser session state caching
- **Real-time Publishing**: WebSocket event distribution

### Queue Architecture
```
Task Submission → Redis Queue → Worker Process → Browser-Use Agent
                             ↓
                    WebSocket Updates → Frontend
```

## AI & Automation Technologies

### Browser Automation
- **Browser-Use**: AI agent for intelligent browser automation
- **Browserbase**: Live browser streaming and session management

### Integration Pattern
```javascript
// Agent Service Pattern
class AgentService {
  async startAutomation(taskId, prompt, userData) {
    const session = await browserbase.createSession();
    const agent = new BrowserUseAgent(session, prompt);
    
    return agent.run(userData);
  }
}
```

### Automation Capabilities
- **Form Recognition**: AI-powered field identification
- **Error Handling**: Automatic retry with user intervention
- **Session Control**: Pause/resume/takeover functionality
- **Real-time Streaming**: Live browser view via Browserbase

## Development Environment

### Local Setup Requirements
```bash
# Required Software
Node.js 20+
Redis 7.2+
Git
Docker (optional)

# Environment Variables
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_ANON_KEY=your-anon-key
SUPABASE_SERVICE_ROLE_KEY=your-service-key
REDIS_URL=redis://localhost:6379
BROWSERBASE_API_KEY=your-browserbase-key
JWT_SECRET=your-jwt-secret
```

### Development Scripts
```json
{
  "scripts": {
    "dev": "concurrently \"npm run dev:frontend\" \"npm run dev:backend\"",
    "dev:frontend": "cd frontend && npm run dev",
    "dev:backend": "cd backend && npm run dev",
    "build": "npm run build:frontend && npm run build:backend",
    "test": "npm run test:frontend && npm run test:backend"
  }
}
```

### Code Quality Tools
- **ESLint**: Code linting with custom rules
- **Prettier**: Code formatting
- **TypeScript**: Compile-time type checking
- **Jest**: Unit and integration testing
- **Playwright**: End-to-end testing

## Security Technologies

### Authentication & Authorization
- **Supabase Auth**: Managed authentication service
- **JWT Tokens**: Stateless authentication
- **Row-Level Security**: Database-level access control

### Data Protection
```javascript
// Encryption Utilities
const encrypt = (data) => crypto.AES.encrypt(data, ENCRYPTION_KEY);
const decrypt = (encryptedData) => crypto.AES.decrypt(encryptedData, ENCRYPTION_KEY);
```

### Security Measures
- **HTTPS/WSS**: Encrypted communication
- **CORS Configuration**: Restricted to frontend domains
- **Rate Limiting**: API abuse prevention
- **Input Validation**: Zod schema validation
- **SQL Injection Protection**: Parameterized queries

## Monitoring & Observability

### Logging
```javascript
// Winston Logger Configuration
const logger = winston.createLogger({
  format: winston.format.combine(
    winston.format.timestamp(),
    winston.format.errors({ stack: true }),
    winston.format.json()
  ),
  transports: [
    new winston.transports.File({ filename: 'error.log', level: 'error' }),
    new winston.transports.File({ filename: 'combined.log' })
  ]
});
```

### Health Monitoring
- **Health Check Endpoints**: `/health`, `/health/db`, `/health/redis`
- **Error Tracking**: Centralized error logging and alerting
- **Performance Metrics**: Response times and queue lengths

## Deployment Technologies

### Containerization
```dockerfile
# Backend Dockerfile
FROM node:20-alpine
WORKDIR /app
COPY package*.json ./
RUN npm ci --only=production
COPY . .
EXPOSE 3000
CMD ["node", "src/index.js"]
```

### Deployment Configuration
```yaml
# docker-compose.yml
version: '3.8'
services:
  backend:
    build: ./backend
    environment:
      - NODE_ENV=production
    depends_on:
      - redis
  
  redis:
    image: redis:7.2.0-alpine
    command: redis-server --appendonly yes
```

### Infrastructure Requirements
- **CPU**: 2+ cores for concurrent task processing
- **Memory**: 4GB+ for Redis and application processes
- **Storage**: SSD for optimal database performance
- **Network**: High-speed internet for browser streaming

## Performance Considerations

### Optimization Strategies
- **Connection Pooling**: Database and Redis connections
- **Caching**: Frequently accessed user data and sessions
- **Asset Optimization**: Frontend bundle size optimization
- **CDN Integration**: Static asset delivery

### Monitoring Targets
- **API Response Time**: <200ms
- **Task Processing**: <3 minutes per task
- **Browser Actions**: <10 seconds per action
- **Concurrent Users**: 1,000+ simultaneous sessions

## Testing Strategy

### Test Pyramid
```
E2E Tests (Automation Workflows)
    ↑
Integration Tests (API Endpoints)
    ↑
Unit Tests (Business Logic)
```

### Testing Tools
- **Jest**: Unit and integration testing
- **Supertest**: API endpoint testing
- **Playwright**: Browser automation testing
- **Mock Services**: External dependency mocking

## Documentation Requirements

### Technical Documentation
- **API Documentation**: OpenAPI/Swagger specifications
- **Database Schema**: ER diagrams and table documentation
- **Deployment Guides**: Environment setup and configuration
- **Architecture Decisions**: Technical decision documentation

### Code Documentation
- **JSDoc Comments**: Function and class documentation
- **README Files**: Setup and usage instructions
- **Code Comments**: Complex logic explanation
- **Type Definitions**: TypeScript interface documentation 
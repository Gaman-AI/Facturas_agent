# External Service Integrations

## Quick Reference Guide

This document provides quick reference for integrating with the four critical external services in the CFDI automation system.

## Supabase Integration

### **Database Setup**
```bash
# Environment variables required
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_ANON_KEY=your-anon-key
SUPABASE_SERVICE_ROLE_KEY=your-service-key
```

### **Key Integration Points**
- **Authentication**: Supabase Auth with JWT tokens
- **Database**: PostgreSQL with Row-Level Security policies
- **Real-time**: Database change subscriptions
- **Storage**: File uploads for user documents

### **Critical Configuration**
- RLS policies must be enabled on all user tables
- Encryption functions for sensitive data (RFC, credentials)
- Connection pooling for performance
- Backup and recovery policies

## Browserbase Integration

### **API Setup**
```bash
# Environment variables required
BROWSERBASE_API_KEY=your-api-key
BROWSERBASE_PROJECT_ID=your-project-id
```

### **Key Integration Points**
- **Session Creation**: Isolated browser instances per task
- **Live View**: iFrame URLs for real-time browser visibility
- **User Takeover**: URLs for manual control handoff
- **Session Management**: Start, pause, resume, terminate

### **Critical Configuration**
- Session duration limits (default 30 minutes)
- Concurrent session limits based on plan
- Regional preferences for performance
- Recording and screenshot policies

## Redis/bullmq Integration

### **Queue Setup**
```bash
# Environment variables required
REDIS_URL=redis://localhost:6379
REDIS_PASSWORD=your-password (if required)
```

### **Key Integration Points**
- **Job Processing**: Task automation queue
- **Session Caching**: Temporary data storage with TTL
- **Rate Limiting**: API throttling per user
- **Real-time State**: WebSocket connection management

### **Critical Configuration**
- Job retry logic with exponential backoff
- Queue priorities for different user tiers
- Memory management and eviction policies
- Persistence configuration for reliability

## Browser-Use Agent Integration

### **Agent Setup**
```bash
# Custom library location
/automation/browser-use/
├── core/ (enhanced library)
├── prompts/ (CFDI-specific)
├── vendors/ (portal adapters)
└── utils/ (helper functions)
```

### **Key Integration Points**
- **Prompt Management**: CFDI-specific form recognition
- **Error Handling**: Intelligent retry and recovery
- **Session Control**: Integration with Browserbase
- **Step Logging**: Detailed action tracking

### **Critical Configuration**
- LLM provider configuration (OpenAI, Anthropic, etc.)
- Timeout settings for browser actions
- Error classification and response patterns
- Vendor-specific form recognition patterns

## Integration Testing Checklist

### **Supabase Tests**
- [ ] Database connection and schema validation
- [ ] Authentication flow with JWT tokens
- [ ] RLS policies working correctly
- [ ] Real-time subscriptions functional
- [ ] Encryption/decryption working

### **Browserbase Tests**
- [ ] Session creation and termination
- [ ] Live View iFrame embedding
- [ ] User takeover functionality
- [ ] Screenshot and recording capabilities
- [ ] Performance under concurrent sessions

### **Redis Tests**
- [ ] Job queue processing
- [ ] Retry logic with failed jobs
- [ ] Session data caching
- [ ] Connection pooling under load
- [ ] Memory usage optimization

### **Browser-Use Tests**
- [ ] CFDI form recognition accuracy
- [ ] Error handling and recovery
- [ ] Integration with task queue
- [ ] Step logging functionality
- [ ] Vendor portal compatibility

## Common Integration Issues

### **Supabase Issues**
- **Connection Limits**: Implement proper connection pooling
- **RLS Policy Errors**: Ensure policies match application logic
- **Auth Token Expiry**: Implement automatic refresh logic
- **Performance**: Optimize queries and use appropriate indexes

### **Browserbase Issues**
- **Session Limits**: Monitor and manage concurrent sessions
- **iFrame Security**: Handle CORS and CSP policies
- **Network Latency**: Choose appropriate regions
- **Timeout Handling**: Implement proper cleanup logic

### **Redis Issues**
- **Memory Limits**: Implement proper TTL and eviction policies
- **Connection Limits**: Use connection pooling
- **Job Failures**: Implement proper error handling and dead letter queues
- **Performance**: Monitor queue lengths and processing times

### **Browser-Use Issues**
- **Form Recognition**: Start with common portals, expand iteratively
- **Timeout Errors**: Implement appropriate action timeouts
- **Vendor Changes**: Monitor for portal layout changes
- **Error Recovery**: Implement intelligent retry patterns

## Development Environment Setup

### **Local Development**
```bash
# Start all services locally
docker-compose up -d  # Redis
supabase start       # Local Supabase
npm run dev          # Frontend
npm run server       # Backend
```

### **Integration Testing**
```bash
# Run integration tests
npm run test:integration  # API tests
npm run test:e2e         # End-to-end tests
npm run test:load        # Load testing
```

### **Monitoring & Debugging**
- **Supabase**: Dashboard for database monitoring
- **Browserbase**: Session logs and screenshots
- **Redis**: Queue monitoring with Bull Dashboard
- **Application**: Structured logging with correlation IDs 
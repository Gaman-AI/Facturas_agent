# CFDI Automation - Docker Deployment Guide

## Overview

This guide covers the Docker containerization setup for the CFDI Automation application, which includes:

- **Frontend**: Next.js application
- **Backend API**: Node.js/Express server
- **Python Browser Service**: Browser automation with Playwright
- **Nginx**: Reverse proxy and load balancer
- **Redis**: Session management and caching

## Architecture

```
┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐
│   Frontend      │    │   Backend API   │    │ Python Browser  │
│   (Next.js)     │    │   (Express)     │    │   (Playwright)  │
│   Port: 3000    │    │   Port: 8000    │    │   Port: 9000    │
└─────────────────┘    └─────────────────┘    └─────────────────┘
         │                       │                       │
         └───────────────────────┼───────────────────────┘
                                 │
                    ┌─────────────────┐
                    │     Nginx       │
                    │   (Port: 80)    │
                    └─────────────────┘
                                 │
                    ┌─────────────────┐
                    │     Redis       │
                    │   (Port: 6379)  │
                    └─────────────────┘
```

## Prerequisites

- Docker Desktop installed and running
- Git repository cloned
- Environment variables configured

## Quick Start

1. **Clone the repository**:
   ```bash
   git clone <repository-url>
   cd Facturas_agent
   ```

2. **Set up environment variables**:
   ```bash
   cp docker.env.example docker.env
   # Edit docker.env with your actual values
   ```

3. **Start the application**:
   ```bash
   docker compose --env-file docker.env up -d
   ```

4. **Access the application**:
   - Main application: http://localhost
   - Health check: http://localhost/health

## Services

### Frontend (Next.js)
- **Port**: 3000
- **Build**: Multi-stage Docker build
- **Features**: SSR, static optimization, TypeScript

### Backend API (Node.js/Express)
- **Port**: 8000
- **Features**: REST API, authentication, database integration

### Python Browser Service
- **Port**: 9000
- **Features**: Browser automation, Playwright, FastAPI wrapper

### Nginx (Reverse Proxy)
- **Port**: 80
- **Features**: Load balancing, SSL termination, caching

### Redis
- **Port**: 6379
- **Features**: Session storage, caching, queues

## Management Commands

### Using Docker Compose
```bash
# Start services
docker compose --env-file docker.env up -d

# Stop services
docker compose down

# View logs
docker compose logs -f

# Check status
docker compose ps

# Restart services
docker compose restart
```

### Using Scripts
```bash
# Make scripts executable
chmod +x scripts/*.sh

# Start services
./scripts/docker-run.sh up

# View logs
./scripts/docker-run.sh logs

# Check status
./scripts/docker-run.sh status

# Build and start
./scripts/docker-run.sh build
```

## Environment Variables

Key environment variables that need to be configured in `docker.env`:

```bash
# Supabase Configuration
SUPABASE_URL=your_supabase_url
SUPABASE_ANON_KEY=your_supabase_anon_key
SUPABASE_SERVICE_ROLE_KEY=your_supabase_service_role_key

# Frontend Configuration
NEXT_PUBLIC_SUPABASE_URL=your_supabase_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key

# Authentication
JWT_SECRET=your_jwt_secret
SESSION_SECRET=your_session_secret

# Browser Automation
BROWSERBASE_API_KEY=your_browserbase_api_key
BROWSERBASE_PROJECT_ID=your_browserbase_project_id

# AI Services
OPENAI_API_KEY=your_openai_api_key
ANTHROPIC_API_KEY=your_anthropic_api_key
```

## Production Deployment

### 1. Build Images
```bash
./scripts/docker-build.sh
```

### 2. Configure Production Environment
- Update `docker.env` with production values
- Set up SSL certificates
- Configure domain names

### 3. Deploy
```bash
docker compose --env-file docker.env -f docker-compose.prod.yml up -d
```

## Troubleshooting

### Common Issues

1. **Port conflicts**:
   ```bash
   # Check what's using port 80
   sudo lsof -i :80
   # Stop conflicting service
   sudo apachectl stop
   ```

2. **Environment variables not loading**:
   ```bash
   # Ensure docker.env exists
   ls -la docker.env
   # Check environment variables
   docker compose config
   ```

3. **Build failures**:
   ```bash
   # Clean Docker cache
   docker system prune -a
   # Rebuild without cache
   docker compose build --no-cache
   ```

### Health Checks

Check service health:
```bash
# Nginx
curl http://localhost/health

# Frontend
curl http://localhost:3000

# Backend API
curl http://localhost:8000/health

# Python Browser Service
curl http://localhost:9000/health
```

### Logs

View service logs:
```bash
# All services
docker compose logs

# Specific service
docker compose logs frontend
docker compose logs backend-api
docker compose logs python-browser
docker compose logs nginx
```

## Backup and Recovery

### Backup
```bash
# Backup volumes
docker run --rm -v facturas_agent_redis_data:/data -v $(pwd):/backup alpine tar czf /backup/redis-backup.tar.gz -C /data .

# Backup environment
cp docker.env docker.env.backup
```

### Recovery
```bash
# Restore volumes
docker run --rm -v facturas_agent_redis_data:/data -v $(pwd):/backup alpine tar xzf /backup/redis-backup.tar.gz -C /data

# Restore environment
cp docker.env.backup docker.env
```

## Security Considerations

1. **Environment Variables**: Never commit `docker.env` to version control
2. **Network Security**: Use Docker networks for service communication
3. **User Permissions**: Services run as non-root users
4. **SSL/TLS**: Configure SSL certificates for production
5. **Rate Limiting**: Nginx includes rate limiting for API endpoints

## Monitoring

### Health Monitoring
- All services include health checks
- Nginx provides `/health` endpoint
- Docker Compose monitors service health

### Logging
- Structured logging in JSON format
- Log rotation configured
- Centralized log collection possible

### Metrics
- Service metrics available via health endpoints
- Docker stats for resource monitoring
- Custom metrics can be added

## Support

For issues and questions:
1. Check the troubleshooting section
2. Review service logs
3. Verify environment configuration
4. Check Docker and system resources 
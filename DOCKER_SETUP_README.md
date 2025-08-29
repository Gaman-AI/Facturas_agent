# Docker Setup for CFDI Automation Platform

This document describes the proper Docker configuration for the CFDI Automation Platform backend services.

## 🏗️ Architecture Overview

The platform is now properly dockerized with separate, optimized containers for each service:

- **Frontend**: Next.js application
- **Backend API**: Node.js/Express server
- **Browser Automation**: Python service with Playwright
- **Database**: PostgreSQL for data persistence
- **Cache**: Redis for session management
- **Reverse Proxy**: Nginx for routing and SSL termination

## 📁 Docker Files Structure

```
├── backend/
│   ├── Dockerfile                    # Node.js backend service
│   ├── Dockerfile.python.optimized  # Python browser automation
│   ├── .dockerignore                # Build optimization
│   └── docker-compose.backend.yml   # Backend-only services
├── docker-compose.yml               # Legacy compose (deprecated)
├── docker-compose.production.yml    # Production deployment
├── docker-compose.dev.yml           # Development deployment
└── scripts/
    └── docker-deploy.ps1           # PowerShell deployment script
```

## 🚀 Quick Start

### Prerequisites

1. **Docker Desktop** installed and running
2. **Docker Compose** available
3. **PowerShell** (for Windows deployment script)

### Development Environment

```powershell
# Start development environment
.\scripts\docker-deploy.ps1 -Environment dev -Build

# View logs
.\scripts\docker-deploy.ps1 -Environment dev -Logs
```

### Production Environment

```powershell
# Deploy production environment
.\scripts\docker-deploy.ps1 -Environment production -Build -Clean

# Check service health
.\scripts\docker-deploy.ps1 -Environment production
```

## 🔧 Service Configuration

### Backend API Service (Node.js)

- **Port**: 8000
- **Health Check**: `/health` endpoint
- **Environment**: Production-optimized with security hardening
- **User**: Non-root (nodejs:1001)

**Features:**
- Multi-stage build for optimization
- Security hardening with non-root user
- Proper dependency caching
- Health checks and monitoring

### Browser Automation Service (Python)

- **Port**: 9000
- **Health Check**: `/health` endpoint
- **Environment**: Optimized for browser automation
- **User**: Non-root (appuser:1000)

**Features:**
- Playwright browser automation
- Virtual display support (Xvfb)
- Security isolation with proper capabilities
- Resource management and limits

### Database Services

#### PostgreSQL
- **Port**: 5432
- **Database**: cfdi_automation (prod) / cfdi_automation_dev (dev)
- **User**: cfdi_user
- **Password**: cfdi_password

#### Redis
- **Port**: 6379
- **Memory**: 256MB limit
- **Policy**: LRU eviction

## 🌐 Networking

### Production Network
- **Subnet**: 172.20.0.0/16
- **Gateway**: 172.20.0.1
- **Network Name**: cfdi_automation_network

### Development Network
- **Subnet**: 172.22.0.0/16
- **Gateway**: 172.22.0.1
- **Network Name**: cfdi_dev_network

## 📊 Resource Management

### Memory Limits
- **Frontend**: 1GB limit, 512MB reservation
- **Backend API**: 2GB limit, 512MB reservation
- **Browser Automation**: 4GB limit, 1GB reservation
- **PostgreSQL**: 1GB limit, 256MB reservation
- **Redis**: 512MB limit, 128MB reservation
- **Nginx**: 512MB limit, 128MB reservation

### CPU Limits
- **Frontend**: 0.5 CPU limit, 0.25 reservation
- **Backend API**: 1.0 CPU limit, 0.5 reservation
- **Browser Automation**: 2.0 CPU limit, 1.0 reservation
- **PostgreSQL**: 0.5 CPU limit, 0.25 reservation
- **Redis**: 0.5 CPU limit, 0.1 reservation
- **Nginx**: 0.5 CPU limit, 0.1 reservation

## 🔒 Security Features

### Container Security
- Non-root users for all services
- Minimal base images (Alpine Linux)
- Security-optimized browser automation
- Proper capability management

### Network Security
- Isolated network segments
- Health check endpoints
- Proper port exposure
- SSL termination at Nginx

## 📝 Environment Variables

Create a `docker.env` file in the project root:

```bash
# Database Configuration
POSTGRES_DB=cfdi_automation
POSTGRES_USER=cfdi_user
POSTGRES_PASSWORD=cfdi_password

# Redis Configuration
REDIS_URL=redis://redis:6379

# API Keys (add your actual keys)
OPENAI_API_KEY=your_openai_key
ANTHROPIC_API_KEY=your_anthropic_key
GROQ_API_KEY=your_groq_key

# Azure Configuration
AZURE_DOCUMENT_INTELLIGENCE_ENDPOINT=your_azure_endpoint
AZURE_DOCUMENT_INTELLIGENCE_KEY=your_azure_key

# Browser Configuration
BROWSERBASE_API_KEY=your_browserbase_key
```

## 🧹 Maintenance Commands

### View Service Status
```bash
# Production
docker-compose -f docker-compose.production.yml ps

# Development
docker-compose -f docker-compose.dev.yml ps
```

### View Logs
```bash
# All services
docker-compose -f docker-compose.production.yml logs -f

# Specific service
docker-compose -f docker-compose.production.yml logs -f backend-api
```

### Clean Up
```bash
# Stop and remove containers
docker-compose -f docker-compose.production.yml down

# Remove volumes (WARNING: Data loss)
docker-compose -f docker-compose.production.yml down -v

# Remove images
docker-compose -f docker-compose.production.yml down --rmi all
```

### Update Services
```bash
# Pull latest images and restart
docker-compose -f docker-compose.production.yml pull
docker-compose -f docker-compose.production.yml up -d
```

## 🐛 Troubleshooting

### Common Issues

#### Service Won't Start
1. Check Docker Desktop is running
2. Verify ports are not in use
3. Check container logs: `docker-compose logs <service-name>`
4. Ensure environment variables are set correctly

#### Browser Automation Issues
1. Check virtual display: `docker exec -it cfdi-browser-automation xdpyinfo`
2. Verify Playwright installation: `docker exec -it cfdi-browser-automation playwright --version`
3. Check shared memory: `docker exec -it cfdi-browser-automation df -h /dev/shm`

#### Database Connection Issues
1. Verify PostgreSQL is healthy: `docker exec -it cfdi-postgres pg_isready -U cfdi_user`
2. Check database exists: `docker exec -it cfdi-postgres psql -U cfdi_user -l`
3. Verify network connectivity between services

### Health Check Endpoints

- **Frontend**: `http://localhost:3000/api/health`
- **Backend API**: `http://localhost:8000/health`
- **Browser Automation**: `http://localhost:9000/health`
- **Nginx**: `http://localhost/health`

## 📈 Performance Optimization

### Build Optimization
- Multi-stage Dockerfiles
- Proper layer caching
- .dockerignore files
- Minimal base images

### Runtime Optimization
- Resource limits and reservations
- Health checks with appropriate intervals
- Log rotation and size limits
- Proper volume management

### Monitoring
- Container resource usage: `docker stats`
- Service health status
- Log aggregation
- Performance metrics

## 🔄 CI/CD Integration

### GitHub Actions Example
```yaml
name: Deploy to Production
on:
  push:
    branches: [main]

jobs:
  deploy:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - name: Deploy with Docker Compose
        run: |
          docker-compose -f docker-compose.production.yml pull
          docker-compose -f docker-compose.production.yml up -d
```

## 📚 Additional Resources

- [Docker Best Practices](https://docs.docker.com/develop/dev-best-practices/)
- [Docker Compose Reference](https://docs.docker.com/compose/compose-file/)
- [Playwright Docker Guide](https://playwright.dev/docker)
- [Node.js Docker Guide](https://nodejs.org/en/docs/guides/nodejs-docker-webapp/)

## 🤝 Contributing

When modifying Docker configurations:

1. Test changes in development environment first
2. Update documentation for any new environment variables
3. Ensure backward compatibility
4. Test resource limits and performance
5. Update health check endpoints if needed

## 📞 Support

For Docker-related issues:

1. Check this documentation
2. Review container logs
3. Verify environment configuration
4. Check Docker Desktop status
5. Review resource usage and limits

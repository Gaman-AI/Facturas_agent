#!/bin/bash

# CFDI Automation - Docker Run Script
# This script manages Docker Compose services

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Logging function
log() {
    echo -e "${BLUE}[$(date +'%Y-%m-%d %H:%M:%S')]${NC} $1"
}

error() {
    echo -e "${RED}[ERROR]${NC} $1" >&2
}

success() {
    echo -e "${GREEN}[SUCCESS]${NC} $1"
}

warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1"
}

# Check if docker.env exists
check_env_file() {
    if [ ! -f "docker.env" ]; then
        error "docker.env file not found!"
        log "Please copy docker.env.example to docker.env and configure your environment variables:"
        log "cp docker.env.example docker.env"
        exit 1
    fi
    success "Environment file found"
}

# Check service health
check_health() {
    log "Checking service health..."
    
    # Wait for services to be ready
    sleep 10
    
    # Check nginx health
    if curl -f http://localhost/health > /dev/null 2>&1; then
        success "Nginx is healthy"
    else
        warning "Nginx health check failed"
    fi
    
    # Check frontend
    if curl -f http://localhost:3000 > /dev/null 2>&1; then
        success "Frontend is running"
    else
        warning "Frontend health check failed"
    fi
    
    # Check backend API
    if curl -f http://localhost:8000/health > /dev/null 2>&1; then
        success "Backend API is running"
    else
        warning "Backend API health check failed"
    fi
    
    # Check Python browser service
    if curl -f http://localhost:9000/health > /dev/null 2>&1; then
        success "Python browser service is running"
    else
        warning "Python browser service health check failed"
    fi
}

# Main function
main() {
    case "${1:-help}" in
        "up")
            log "Starting CFDI Automation services..."
            check_env_file
            docker compose --env-file docker.env up -d
            success "Services started successfully!"
            check_health
            log "Application is available at: http://localhost"
            ;;
        "down")
            log "Stopping CFDI Automation services..."
            docker compose down
            success "Services stopped successfully!"
            ;;
        "restart")
            log "Restarting CFDI Automation services..."
            docker compose down
            docker compose --env-file docker.env up -d
            success "Services restarted successfully!"
            check_health
            ;;
        "logs")
            log "Showing service logs..."
            docker compose logs -f
            ;;
        "status")
            log "Checking service status..."
            docker compose ps
            ;;
        "clean")
            log "Cleaning up Docker resources..."
            docker compose down -v
            docker system prune -f
            success "Cleanup completed!"
            ;;
        "build")
            log "Building and starting services..."
            check_env_file
            docker compose --env-file docker.env up --build -d
            success "Services built and started successfully!"
            check_health
            ;;
        "help"|*)
            echo "CFDI Automation - Docker Management Script"
            echo ""
            echo "Usage: $0 [command]"
            echo ""
            echo "Commands:"
            echo "  up      - Start all services"
            echo "  down    - Stop all services"
            echo "  restart - Restart all services"
            echo "  logs    - Show service logs"
            echo "  status  - Show service status"
            echo "  clean   - Clean up Docker resources"
            echo "  build   - Build and start services"
            echo "  help    - Show this help message"
            echo ""
            echo "Examples:"
            echo "  $0 up      # Start services"
            echo "  $0 logs    # View logs"
            echo "  $0 down    # Stop services"
            ;;
    esac
}

# Run main function
main "$@" 
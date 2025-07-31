#!/bin/bash

# CFDI Automation - Docker Build Script
# This script builds all Docker images for the CFDI application

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

# Check if Docker is running
check_docker() {
    if ! docker info > /dev/null 2>&1; then
        error "Docker is not running. Please start Docker and try again."
        exit 1
    fi
    success "Docker is running"
}

# Build function
build_image() {
    local service=$1
    local context=$2
    local dockerfile=$3
    local target=${4:-""}
    
    log "Building $service image..."
    
    if [ -n "$target" ]; then
        docker build -f "$dockerfile" --target "$target" -t "facturas_agent-$service" "$context"
    else
        docker build -f "$dockerfile" -t "facturas_agent-$service" "$context"
    fi
    
    success "Built $service image"
}

# Main build process
main() {
    log "Starting Docker build process for CFDI Automation"
    
    # Check Docker
    check_docker
    
    # Build images
    build_image "frontend" "./frontend" "Dockerfile" "production"
    build_image "backend-api" "./backend" "Dockerfile.nodejs" "runner"
    build_image "python-browser" "./backend" "Dockerfile.python" "runner"
    build_image "nginx" "./nginx" "Dockerfile"
    
    # Tag images for production
    log "Tagging images for production..."
    docker tag facturas_agent-frontend facturas_agent-frontend:latest
    docker tag facturas_agent-backend-api facturas_agent-backend-api:latest
    docker tag facturas_agent-python-browser facturas_agent-python-browser:latest
    docker tag facturas_agent-nginx facturas_agent-nginx:latest
    
    # Clean up dangling images
    log "Cleaning up dangling images..."
    docker image prune -f
    
    success "All Docker images built successfully!"
    log "You can now run 'docker compose up' to start the application"
}

# Run main function
main "$@" 
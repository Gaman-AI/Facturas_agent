#!/bin/bash

# ===========================================
# CFDI Automation Platform - Deployment Script
# Production deployment with comprehensive checks
# ===========================================

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Configuration
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(dirname "$SCRIPT_DIR")"
ENV_FILE="${PROJECT_ROOT}/docker.env"
COMPOSE_FILE="${PROJECT_ROOT}/docker-compose.yml"
BACKUP_DIR="${PROJECT_ROOT}/backups"

# Functions
log_info() {
    echo -e "${BLUE}[INFO]${NC} $1"
}

log_success() {
    echo -e "${GREEN}[SUCCESS]${NC} $1"
}

log_warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1"
}

log_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

# Check prerequisites
check_prerequisites() {
    log_info "🔍 Checking prerequisites..."
    
    # Check Docker
    if ! command -v docker &> /dev/null; then
        log_error "Docker is not installed or not in PATH"
        exit 1
    fi
    
    # Check Docker Compose
    if ! command -v docker compose &> /dev/null; then
        log_error "Docker Compose is not installed or not in PATH"
        exit 1
    fi
    
    # Check if running as root (not recommended)
    if [[ $EUID -eq 0 ]]; then
        log_warning "Running as root is not recommended for security reasons"
    fi
    
    # Check Docker daemon
    if ! docker info &> /dev/null; then
        log_error "Docker daemon is not running"
        exit 1
    fi
    
    log_success "All prerequisites met"
}

# Validate environment file
validate_environment() {
    log_info "🔧 Validating environment configuration..."
    
    if [[ ! -f "$ENV_FILE" ]]; then
        log_warning "Environment file not found at $ENV_FILE"
        log_info "Creating from template..."
        
        if [[ -f "${PROJECT_ROOT}/docker.env.template" ]]; then
            cp "${PROJECT_ROOT}/docker.env.template" "$ENV_FILE"
            log_error "Please configure your environment variables in $ENV_FILE and run again"
            exit 1
        else
            log_error "No environment template found"
            exit 1
        fi
    fi
    
    # Check for required variables
    local required_vars=(
        "SUPABASE_URL"
        "SUPABASE_ANON_KEY"
        "JWT_SECRET"
        "OPENAI_API_KEY"
        "BROWSERBASE_API_KEY"
    )
    
    local missing_vars=()
    
    for var in "${required_vars[@]}"; do
        if ! grep -q "^${var}=" "$ENV_FILE" || grep -q "^${var}=your_" "$ENV_FILE"; then
            missing_vars+=("$var")
        fi
    done
    
    if [[ ${#missing_vars[@]} -gt 0 ]]; then
        log_error "Missing or unconfigured required environment variables:"
        for var in "${missing_vars[@]}"; do
            echo "  - $var"
        done
        log_error "Please configure these variables in $ENV_FILE"
        exit 1
    fi
    
    log_success "Environment configuration validated"
}

# Create backup directory
setup_backup() {
    log_info "📁 Setting up backup directory..."
    mkdir -p "$BACKUP_DIR"
    log_success "Backup directory ready at $BACKUP_DIR"
}

# Build and deploy
deploy_services() {
    log_info "🚀 Building and deploying services..."
    
    cd "$PROJECT_ROOT"
    
    # Build images
    log_info "Building Docker images..."
    docker compose build --no-cache
    
    # Start services
    log_info "Starting services..."
    docker compose up -d
    
    # Wait for services to be healthy
    log_info "Waiting for services to be healthy..."
    local max_wait=300  # 5 minutes
    local wait_time=0
    
    while [[ $wait_time -lt $max_wait ]]; do
        local healthy_count=$(docker compose ps --services | xargs -I {} docker compose ps --status=running {} | grep -c "healthy" || echo "0")
        local total_services=$(docker compose ps --services | wc -l)
        
        if [[ $healthy_count -eq $total_services ]]; then
            log_success "All services are healthy"
            break
        fi
        
        log_info "Services starting... ($healthy_count/$total_services healthy)"
        sleep 10
        wait_time=$((wait_time + 10))
    done
    
    if [[ $wait_time -ge $max_wait ]]; then
        log_warning "Services did not become healthy within expected time"
        log_info "You can check service status with: docker compose ps"
    fi
}

# Verify deployment
verify_deployment() {
    log_info "🔍 Verifying deployment..."
    
    # Check service status
    log_info "Service status:"
    docker compose ps
    
    # Check health endpoints
    local endpoints=(
        "http://localhost:80/health"
        "http://localhost:8000/health"
        "http://localhost:9000/health"
    )
    
    for endpoint in "${endpoints[@]}"; do
        log_info "Checking $endpoint..."
        if curl -f -s "$endpoint" > /dev/null; then
            log_success "✓ $endpoint is responding"
        else
            log_warning "✗ $endpoint is not responding"
        fi
    done
    
    # Show access URLs
    log_success "🌐 Deployment complete!"
    echo ""
    echo "Access URLs:"
    echo "  • Frontend:    http://localhost"
    echo "  • Backend API: http://localhost/api"
    echo "  • API Docs:    http://localhost:8000/docs"
    echo "  • Python API:  http://localhost:9000/docs"
    echo ""
    echo "Management commands:"
    echo "  • View logs:   docker compose logs -f"
    echo "  • Stop:        docker compose down"
    echo "  • Restart:     docker compose restart"
    echo "  • Status:      docker compose ps"
}

# Cleanup function
cleanup() {
    log_info "🧹 Cleaning up..."
    cd "$PROJECT_ROOT"
    
    # Remove unused images
    docker image prune -f
    
    # Remove unused volumes (careful with this in production)
    if [[ "$1" == "--clean-volumes" ]]; then
        log_warning "Removing unused volumes..."
        docker volume prune -f
    fi
}

# Print usage
usage() {
    echo "Usage: $0 [OPTIONS]"
    echo ""
    echo "Options:"
    echo "  --clean-volumes  Remove unused Docker volumes (WARNING: may remove data)"
    echo "  --help          Show this help message"
    echo ""
    echo "Examples:"
    echo "  $0                Deploy the application"
    echo "  $0 --clean-volumes   Deploy and clean unused volumes"
}

# Main execution
main() {
    echo ""
    echo "🚀 CFDI Automation Platform Deployment"
    echo "======================================="
    echo ""
    
    # Parse arguments
    while [[ $# -gt 0 ]]; do
        case $1 in
            --clean-volumes)
                CLEAN_VOLUMES=true
                shift
                ;;
            --help)
                usage
                exit 0
                ;;
            *)
                log_error "Unknown option: $1"
                usage
                exit 1
                ;;
        esac
    done
    
    # Run deployment steps
    check_prerequisites
    validate_environment
    setup_backup
    deploy_services
    verify_deployment
    
    # Cleanup if requested
    if [[ "$CLEAN_VOLUMES" == "true" ]]; then
        cleanup --clean-volumes
    fi
    
    log_success "🎉 Deployment completed successfully!"
    echo ""
}

# Handle script interruption
trap 'echo -e "\n${RED}[ERROR]${NC} Deployment interrupted"; exit 1' INT TERM

# Run main function
main "$@"

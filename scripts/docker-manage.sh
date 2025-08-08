#!/bin/bash

# Docker Management Script for CF Better Auth
# Provides easy management commands for Docker environment

set -e

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
MAGENTA='\033[0;35m'
CYAN='\033[0;36m'
NC='\033[0m' # No Color

# Configuration
COMPOSE_FILE="docker-compose.yml"
COMPOSE_PROD_FILE="docker-compose.prod.yml"
ENV_FILE=".env"
ENV_EXAMPLE=".env.docker.example"

# Functions
log() {
    echo -e "${GREEN}✓${NC} $1"
}

error() {
    echo -e "${RED}✗${NC} $1" >&2
}

warning() {
    echo -e "${YELLOW}⚠${NC} $1"
}

info() {
    echo -e "${BLUE}ℹ${NC} $1"
}

header() {
    echo -e "\n${CYAN}═══════════════════════════════════════════════════════${NC}"
    echo -e "${CYAN} $1${NC}"
    echo -e "${CYAN}═══════════════════════════════════════════════════════${NC}\n"
}

# Check prerequisites
check_prerequisites() {
    header "Checking Prerequisites"
    
    # Check Docker
    if command -v docker &> /dev/null; then
        log "Docker is installed: $(docker --version)"
    else
        error "Docker is not installed"
        exit 1
    fi
    
    # Check Docker Compose
    if command -v docker-compose &> /dev/null; then
        log "Docker Compose is installed: $(docker-compose --version)"
    elif docker compose version &> /dev/null; then
        log "Docker Compose is installed: $(docker compose version)"
        alias docker-compose="docker compose"
    else
        error "Docker Compose is not installed"
        exit 1
    fi
    
    # Check for .env file
    if [ ! -f "$ENV_FILE" ]; then
        warning ".env file not found"
        if [ -f "$ENV_EXAMPLE" ]; then
            info "Creating .env from example..."
            cp "$ENV_EXAMPLE" "$ENV_FILE"
            log ".env file created. Please edit it with your configuration."
        else
            error "No .env.docker.example file found"
            exit 1
        fi
    else
        log ".env file exists"
    fi
}

# Start services
start_services() {
    local env="${1:-dev}"
    header "Starting Services (${env})"
    
    if [ "$env" = "prod" ]; then
        docker-compose -f "$COMPOSE_PROD_FILE" up -d
    else
        docker-compose -f "$COMPOSE_FILE" up -d
    fi
    
    log "Services started. Waiting for health checks..."
    sleep 5
    show_status
}

# Stop services
stop_services() {
    header "Stopping Services"
    docker-compose down
    log "Services stopped"
}

# Restart services
restart_services() {
    header "Restarting Services"
    docker-compose restart
    log "Services restarted"
}

# Show status
show_status() {
    header "Service Status"
    docker-compose ps
    echo ""
    info "Health Check Status:"
    for service in postgres redis auth-server webapp nginx; do
        if docker-compose ps | grep -q "${service}.*Up.*healthy"; then
            log "$service: Healthy"
        elif docker-compose ps | grep -q "${service}.*Up"; then
            warning "$service: Running (health check pending)"
        else
            error "$service: Not running or unhealthy"
        fi
    done
}

# View logs
view_logs() {
    local service="${1:-}"
    header "Viewing Logs"
    
    if [ -z "$service" ]; then
        docker-compose logs -f --tail=100
    else
        docker-compose logs -f --tail=100 "$service"
    fi
}

# Database backup
backup_database() {
    header "Database Backup"
    docker-compose exec -T postgres /scripts/backup.sh
    log "Backup completed"
}

# Database restore
restore_database() {
    local backup_file="${1:-latest}"
    header "Database Restore"
    docker-compose exec -T postgres /scripts/restore.sh "$backup_file"
    log "Restore completed"
}

# Run migrations
run_migrations() {
    header "Running Database Migrations"
    docker-compose exec -T auth-server npm run migrate
    log "Migrations completed"
}

# Shell access
shell_access() {
    local service="${1:-auth-server}"
    header "Shell Access to $service"
    docker-compose exec "$service" /bin/sh
}

# Clean everything
clean_all() {
    header "Clean All Docker Resources"
    warning "This will remove all containers, volumes, and images!"
    read -p "Are you sure? (yes/no): " confirm
    if [ "$confirm" = "yes" ]; then
        docker-compose down -v --rmi all
        log "All Docker resources cleaned"
    else
        info "Clean cancelled"
    fi
}

# Build images
build_images() {
    header "Building Docker Images"
    docker-compose build --no-cache
    log "Images built successfully"
}

# Quick health check
health_check() {
    header "Health Check"
    
    echo "Checking services..."
    
    # Check PostgreSQL
    if docker-compose exec -T postgres pg_isready &> /dev/null; then
        log "PostgreSQL: Ready"
    else
        error "PostgreSQL: Not ready"
    fi
    
    # Check Redis
    if docker-compose exec -T redis redis-cli ping &> /dev/null; then
        log "Redis: Ready"
    else
        error "Redis: Not ready"
    fi
    
    # Check Auth Server
    if curl -f http://localhost:8787/health &> /dev/null; then
        log "Auth Server: Ready"
    else
        error "Auth Server: Not ready"
    fi
    
    # Check Web App
    if curl -f http://localhost:3000 &> /dev/null; then
        log "Web App: Ready"
    else
        error "Web App: Not ready"
    fi
    
    # Check Nginx
    if curl -f http://localhost/health &> /dev/null; then
        log "Nginx: Ready"
    else
        error "Nginx: Not ready"
    fi
}

# Update services
update_services() {
    header "Updating Services"
    git pull
    docker-compose pull
    docker-compose up -d --build
    log "Services updated"
}

# Show help
show_help() {
    header "CF Better Auth Docker Management"
    echo "Usage: $0 [command] [options]"
    echo ""
    echo "Commands:"
    echo "  ${CYAN}start [dev|prod]${NC}  - Start all services"
    echo "  ${CYAN}stop${NC}              - Stop all services"
    echo "  ${CYAN}restart${NC}           - Restart all services"
    echo "  ${CYAN}status${NC}            - Show service status"
    echo "  ${CYAN}logs [service]${NC}    - View logs (all or specific service)"
    echo "  ${CYAN}backup${NC}            - Backup database"
    echo "  ${CYAN}restore [file]${NC}    - Restore database"
    echo "  ${CYAN}migrate${NC}           - Run database migrations"
    echo "  ${CYAN}shell [service]${NC}   - Shell access to service"
    echo "  ${CYAN}build${NC}             - Build Docker images"
    echo "  ${CYAN}health${NC}            - Quick health check"
    echo "  ${CYAN}update${NC}            - Update and restart services"
    echo "  ${CYAN}clean${NC}             - Remove all Docker resources"
    echo "  ${CYAN}help${NC}              - Show this help"
    echo ""
    echo "Examples:"
    echo "  $0 start           # Start development environment"
    echo "  $0 start prod      # Start production environment"
    echo "  $0 logs auth-server # View auth-server logs"
    echo "  $0 shell postgres  # Access PostgreSQL shell"
    echo ""
}

# Main script
main() {
    case "${1:-}" in
        start)
            check_prerequisites
            start_services "${2:-dev}"
            ;;
        stop)
            stop_services
            ;;
        restart)
            restart_services
            ;;
        status)
            show_status
            ;;
        logs)
            view_logs "$2"
            ;;
        backup)
            backup_database
            ;;
        restore)
            restore_database "$2"
            ;;
        migrate)
            run_migrations
            ;;
        shell)
            shell_access "$2"
            ;;
        build)
            build_images
            ;;
        health)
            health_check
            ;;
        update)
            update_services
            ;;
        clean)
            clean_all
            ;;
        help|--help|-h)
            show_help
            ;;
        *)
            if [ -n "${1:-}" ]; then
                error "Unknown command: $1"
            fi
            show_help
            exit 1
            ;;
    esac
}

# Run main function
main "$@"
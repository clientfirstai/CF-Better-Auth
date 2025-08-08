# Docker Guide for CF Better Auth

## 🐳 Complete Docker Infrastructure Documentation

This guide provides comprehensive documentation for the Docker-based deployment of CF Better Auth, an enterprise authentication platform built on better-auth.

## Table of Contents

1. [Overview](#overview)
2. [Prerequisites](#prerequisites)
3. [Quick Start](#quick-start)
4. [Architecture](#architecture)
5. [Services](#services)
6. [Configuration](#configuration)
7. [Development Workflow](#development-workflow)
8. [Production Deployment](#production-deployment)
9. [Management Scripts](#management-scripts)
10. [Backup & Restore](#backup--restore)
11. [Monitoring & Health Checks](#monitoring--health-checks)
12. [Troubleshooting](#troubleshooting)
13. [Security Considerations](#security-considerations)

## Overview

CF Better Auth is fully containerized with Docker, providing:

- **Complete isolation** between services
- **Consistent environments** across development and production
- **Easy scaling** with Docker Compose or orchestration platforms
- **Automated backups** and health monitoring
- **One-command deployment** for the entire stack

### Services Architecture

```
┌─────────────────────────────────────────────┐
│              Nginx (Port 80/443)            │
│            (Reverse Proxy & LB)             │
└─────────────┬────────────────┬──────────────┘
              │                │
    ┌─────────▼──────┐ ┌──────▼──────┐
    │   Web App      │ │ Auth Server │
    │  (Port 3000)   │ │ (Port 8787) │
    └────────────────┘ └──────┬──────┘
                              │
                   ┌──────────┼──────────┐
                   │          │          │
           ┌───────▼────┐ ┌──▼───┐ ┌────▼────┐
           │ PostgreSQL │ │Redis │ │ Storage │
           │ (Port 5432)│ │(6379)│ │  (S3)   │
           └────────────┘ └──────┘ └─────────┘
```

## Prerequisites

### Required Software

- **Docker**: Version 20.10 or higher
- **Docker Compose**: Version 2.0 or higher (or Docker Desktop with Compose V2)
- **Git**: For cloning the repository
- **Make** (optional): For using Makefile commands

### System Requirements

- **RAM**: Minimum 4GB (8GB recommended for production)
- **Storage**: 10GB free space minimum
- **CPU**: 2 cores minimum (4+ recommended)
- **OS**: Linux, macOS, or Windows with WSL2

## Quick Start

### 1. Clone the Repository

```bash
git clone https://github.com/your-org/cf-better-auth.git
cd cf-better-auth
```

### 2. Set Up Environment

```bash
# Copy example environment file
cp .env.docker.example .env

# Edit configuration (required)
nano .env
```

### 3. Start Services

```bash
# Using docker-compose directly
docker-compose up -d

# Or using the management script
./scripts/docker-manage.sh start
```

### 4. Verify Installation

```bash
# Check service status
docker-compose ps

# Run health check
./scripts/docker-manage.sh health

# View logs
docker-compose logs -f
```

### 5. Access Applications

- **Web Application**: http://localhost:3000
- **Auth API**: http://localhost:8787
- **Admin Tools**:
  - Adminer (DB UI): http://localhost:8080
  - Redis Commander: http://localhost:8081

## Architecture

### Container Architecture

Each service runs in its own container with specific resource limits and health checks:

| Service | Base Image | Port | Purpose |
|---------|------------|------|---------|
| webapp | node:20-alpine | 3000 | Next.js frontend application |
| auth-server | node:20-alpine | 8787 | Authentication API server |
| postgres | postgres:16-alpine | 5432 | Primary database |
| redis | redis:7-alpine | 6379 | Session cache & rate limiting |
| nginx | nginx:alpine | 80/443 | Reverse proxy & load balancer |
| adminer | adminer:latest | 8080 | Database management UI |
| redis-commander | rediscommander/redis-commander | 8081 | Redis management UI |

### Network Architecture

All services communicate through a custom bridge network (`cf-auth-network`) with internal DNS resolution:

```yaml
networks:
  cf-auth-network:
    driver: bridge
    ipam:
      config:
        - subnet: 172.25.0.0/16
```

## Services

### Web Application (webapp)

Next.js frontend application with:
- Server-side rendering (SSR)
- Static optimization
- API routes proxy
- WebSocket support

**Environment Variables:**
```env
NEXT_PUBLIC_APP_NAME=CF Better Auth
NEXT_PUBLIC_APP_URL=http://localhost:3000
NEXT_PUBLIC_AUTH_SERVER_URL=http://localhost:8787
```

### Authentication Server (auth-server)

Core authentication service featuring:
- Multiple auth methods (email, OAuth, passkeys)
- Session management
- Rate limiting
- API key management

**Key Features:**
- Plugin-based architecture
- TypeScript support
- Comprehensive audit logging
- Multi-tenancy support

### PostgreSQL Database

Primary data store with:
- Connection pooling
- Automatic backups
- SSL support (production)
- Custom initialization scripts

**Database Schema:**
- Users and sessions
- Organizations and teams
- API keys and permissions
- Audit logs

### Redis Cache

High-performance cache for:
- Session storage
- Rate limiting
- Temporary data
- Real-time features

### Nginx Reverse Proxy

Load balancer and reverse proxy providing:
- SSL termination
- Request routing
- Static file serving
- WebSocket proxying
- Rate limiting

## Configuration

### Environment Variables

Create a `.env` file from the example:

```bash
cp .env.docker.example .env
```

**Critical Variables to Configure:**

```env
# Application
APP_NAME=Your Company Auth
APP_DOMAIN=yourdomain.com

# Database
DB_PASSWORD=secure_password_here
DB_NAME=your_db_name

# Redis
REDIS_PASSWORD=redis_secure_password

# Authentication
BETTER_AUTH_SECRET=minimum-32-character-secret-key

# OAuth (optional)
GOOGLE_CLIENT_ID=your_google_client_id
GOOGLE_CLIENT_SECRET=your_google_client_secret
```

### Docker Compose Configuration

#### Development (docker-compose.yml)

- Hot reload enabled
- Debug ports exposed
- Admin tools included
- Volume mounts for code

#### Production (docker-compose.prod.yml)

- Optimized images
- Resource limits
- Health checks
- No development tools

## Development Workflow

### Starting Development Environment

```bash
# Start all services
docker-compose up -d

# Start with logs
docker-compose up

# Start specific service
docker-compose up auth-server
```

### Code Hot Reload

Both frontend and backend support hot reload in development:

```yaml
volumes:
  - ./server:/app:delegated
  - ./apps/web:/app:delegated
  - /app/node_modules  # Prevent overwrite
```

### Running Commands in Containers

```bash
# Run migrations
docker-compose exec auth-server npm run migrate

# Access PostgreSQL
docker-compose exec postgres psql -U cf_auth_user -d cf_auth

# Access Redis CLI
docker-compose exec redis redis-cli

# Shell access
docker-compose exec auth-server sh
```

### Viewing Logs

```bash
# All services
docker-compose logs -f

# Specific service
docker-compose logs -f auth-server

# Last 100 lines
docker-compose logs --tail=100
```

## Production Deployment

### Building Production Images

```bash
# Build all images
docker-compose -f docker-compose.prod.yml build

# Build specific service
docker-compose -f docker-compose.prod.yml build auth-server
```

### Deploying to Production

```bash
# Start production stack
docker-compose -f docker-compose.prod.yml up -d

# Scale services
docker-compose -f docker-compose.prod.yml up -d --scale auth-server=3

# Update services
docker-compose -f docker-compose.prod.yml pull
docker-compose -f docker-compose.prod.yml up -d
```

### SSL Configuration

1. **Using Let's Encrypt:**
```bash
# Certbot is included in production compose
docker-compose -f docker-compose.prod.yml up certbot
```

2. **Using Custom Certificates:**
```bash
# Place certificates in
./docker/nginx/ssl/cert.pem
./docker/nginx/ssl/key.pem
```

### Environment-Specific Configurations

```bash
# Production
ENV=production docker-compose -f docker-compose.prod.yml up -d

# Staging
ENV=staging docker-compose -f docker-compose.staging.yml up -d
```

## Management Scripts

### Docker Management Script

The `scripts/docker-manage.sh` script provides easy management:

```bash
# Start services
./scripts/docker-manage.sh start [dev|prod]

# Stop services
./scripts/docker-manage.sh stop

# View status
./scripts/docker-manage.sh status

# View logs
./scripts/docker-manage.sh logs [service]

# Database backup
./scripts/docker-manage.sh backup

# Database restore
./scripts/docker-manage.sh restore [backup_file]

# Run migrations
./scripts/docker-manage.sh migrate

# Shell access
./scripts/docker-manage.sh shell [service]

# Health check
./scripts/docker-manage.sh health

# Update services
./scripts/docker-manage.sh update

# Clean everything
./scripts/docker-manage.sh clean
```

## Backup & Restore

### Automated Backups

Backups run automatically via cron or can be triggered manually:

```bash
# Manual backup
docker-compose exec postgres /scripts/backup.sh

# Or using management script
./scripts/docker-manage.sh backup
```

**Backup Location:** `./docker/postgres/backup/`

### Restore Process

```bash
# Restore from latest backup
./scripts/docker-manage.sh restore latest

# Restore from specific backup
./scripts/docker-manage.sh restore backup_cf_auth_20240101_120000.sql.gz

# Direct restore
docker-compose exec postgres /scripts/restore.sh backup_file.sql.gz
```

### Backup Strategy

- **Frequency**: Daily automated backups
- **Retention**: 30 days by default
- **Storage**: Local volumes + optional S3/cloud storage
- **Format**: Compressed SQL dumps (.sql.gz)

## Monitoring & Health Checks

### Health Check Endpoints

All services expose health endpoints:

| Service | Endpoint | Expected Response |
|---------|----------|-------------------|
| Auth Server | http://localhost:8787/health | 200 OK |
| Web App | http://localhost:3000/api/health | 200 OK |
| Nginx | http://localhost/health | 200 OK |

### Docker Health Checks

```yaml
healthcheck:
  test: ["CMD", "curl", "-f", "http://localhost:8787/health"]
  interval: 30s
  timeout: 10s
  retries: 3
  start_period: 60s
```

### Monitoring Commands

```bash
# Real-time resource usage
docker stats

# Service health status
docker-compose ps

# Detailed inspection
docker inspect cf-auth-postgres
```

## Troubleshooting

### Common Issues

#### 1. Services Won't Start

```bash
# Check logs
docker-compose logs [service]

# Check port conflicts
netstat -tulpn | grep -E '3000|8787|5432|6379'

# Reset everything
docker-compose down -v
docker-compose up -d
```

#### 2. Database Connection Issues

```bash
# Check PostgreSQL status
docker-compose exec postgres pg_isready

# View PostgreSQL logs
docker-compose logs postgres

# Test connection
docker-compose exec postgres psql -U cf_auth_user -d cf_auth -c "SELECT 1"
```

#### 3. Permission Issues

```bash
# Fix volume permissions
sudo chown -R $(whoami):$(whoami) ./

# Reset Docker permissions
sudo usermod -aG docker $USER
newgrp docker
```

#### 4. Memory Issues

```bash
# Check memory usage
docker system df

# Clean up unused resources
docker system prune -a --volumes

# Adjust memory limits in docker-compose.yml
```

### Debug Mode

Enable debug logging:

```env
# In .env file
NODE_ENV=development
DEBUG=*
LOG_LEVEL=debug
```

### Container Logs

```bash
# Follow logs in real-time
docker-compose logs -f --tail=100

# Save logs to file
docker-compose logs > docker-logs.txt

# Check specific time range
docker-compose logs --since="2024-01-01" --until="2024-01-02"
```

## Security Considerations

### Network Security

- All services communicate through internal Docker network
- Only Nginx exposed to host network
- Database not accessible from outside

### Secret Management

```bash
# Use Docker secrets (Swarm mode)
echo "my_secret_password" | docker secret create db_password -

# Or use environment files
echo "DB_PASSWORD=secret" > .env.production
chmod 600 .env.production
```

### Security Best Practices

1. **Never commit .env files** to version control
2. **Use strong passwords** for all services
3. **Enable SSL/TLS** in production
4. **Regularly update** base images
5. **Implement rate limiting** at Nginx level
6. **Use read-only** containers where possible
7. **Set resource limits** to prevent DoS
8. **Enable audit logging** for compliance

### Container Security Scanning

```bash
# Scan images for vulnerabilities
docker scan cfauth/auth-server:latest

# Use Trivy for comprehensive scanning
docker run --rm -v /var/run/docker.sock:/var/run/docker.sock \
  aquasec/trivy image cfauth/auth-server:latest
```

## Performance Optimization

### Resource Limits

Configure in docker-compose.yml:

```yaml
deploy:
  resources:
    limits:
      cpus: '2'
      memory: 1G
    reservations:
      cpus: '1'
      memory: 512M
```

### Caching Strategy

- **Redis**: Session and API response caching
- **Nginx**: Static file caching
- **Docker**: Layer caching for builds

### Scaling

```bash
# Scale horizontally
docker-compose up -d --scale auth-server=3 --scale webapp=2

# Or use Docker Swarm
docker swarm init
docker stack deploy -c docker-compose.prod.yml cf-auth
```

## CI/CD Integration

### GitHub Actions

Automated workflows included:
- `ci.yml`: Testing and linting
- `docker-build.yml`: Image building and pushing
- `release.yml`: Automated releases

### Deployment Pipeline

```yaml
# Example deployment step
- name: Deploy to Production
  run: |
    docker-compose -f docker-compose.prod.yml pull
    docker-compose -f docker-compose.prod.yml up -d
```

## Support & Resources

### Documentation

- [Main README](../README.md)
- [Setup Guide](../SETUP_GUIDE.md)
- [API Documentation](./api/README.md)
- [Architecture Docs](./architecture/README.md)

### Getting Help

- **Issues**: [GitHub Issues](https://github.com/your-org/cf-better-auth/issues)
- **Discussions**: [GitHub Discussions](https://github.com/your-org/cf-better-auth/discussions)
- **Documentation**: [Official Docs](https://docs.cfbetterauth.com)

### Contributing

See [CONTRIBUTING.md](../CONTRIBUTING.md) for guidelines on contributing to the project.

---

## Quick Reference

### Essential Commands

```bash
# Start everything
docker-compose up -d

# Stop everything
docker-compose down

# View logs
docker-compose logs -f

# Restart service
docker-compose restart auth-server

# Database backup
./scripts/docker-manage.sh backup

# Health check
./scripts/docker-manage.sh health

# Clean everything
docker-compose down -v --rmi all
```

### Service URLs

- **Application**: http://localhost:3000
- **API**: http://localhost:8787
- **Database UI**: http://localhost:8080
- **Redis UI**: http://localhost:8081

### Default Credentials

⚠️ **Change these in production!**

- **PostgreSQL**: `cf_auth_user` / `secure_password_change_in_production`
- **Redis**: Password: `redis_secure_password`
- **Adminer**: Use PostgreSQL credentials

---

**Last Updated**: December 2024  
**Version**: 1.0.0  
**License**: MIT
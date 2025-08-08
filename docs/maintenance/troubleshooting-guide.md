# Troubleshooting Guide

## Overview

This guide helps diagnose and resolve common issues with CF-Better-Auth, including configuration problems, compatibility issues, plugin failures, and performance problems.

## Common Issues

### 1. Adapter Initialization Failures

**Symptoms:**
- Application fails to start
- Error: "Failed to initialize BetterAuth"
- Connection timeout errors

**Diagnostics:**
```bash
# Enable debug logging
DEBUG=cf-auth:* pnpm dev

# Check adapter status
node -e "
const { BetterAuthAdapter } = require('@cf-auth/core');
const adapter = new BetterAuthAdapter({ debug: true });
adapter.initialize().catch(console.error);
"
```

**Common Causes & Solutions:**

1. **Database Connection Issues**
   ```typescript
   // Check database connectivity
   import { testConnection } from '@cf-auth/core';
   
   const result = await testConnection(process.env.DATABASE_URL);
   if (!result.success) {
     console.error('Database connection failed:', result.error);
   }
   ```

2. **Missing Environment Variables**
   ```bash
   # Check required environment variables
   echo "DATABASE_URL: $DATABASE_URL"
   echo "AUTH_SECRET: $AUTH_SECRET"
   echo "NEXT_PUBLIC_APP_URL: $NEXT_PUBLIC_APP_URL"
   ```

3. **Better-Auth Submodule Issues**
   ```bash
   # Update submodule
   git submodule update --init --recursive
   
   # Check submodule status
   git submodule status
   ```

### 2. Plugin Loading Failures

**Symptoms:**
- Plugin not found errors
- Plugin initialization timeouts
- Dependency resolution failures

**Diagnostics:**
```bash
# List registered plugins
node -e "
const { PluginManager } = require('@cf-auth/plugins');
const manager = new PluginManager();
console.log('Registered plugins:', manager.listPlugins());
"

# Test plugin loading
pnpm run plugins:test
```

**Solutions:**

1. **Plugin Not Found**
   ```typescript
   // Check plugin registration
   import { pluginManager } from '@cf-auth/plugins';
   
   const availablePlugins = pluginManager.listPlugins();
   console.log('Available plugins:', availablePlugins);
   
   if (!availablePlugins.includes('my-plugin')) {
     // Register plugin manually
     pluginManager.register(myPlugin);
   }
   ```

2. **Dependency Issues**
   ```typescript
   // Check plugin dependencies
   const plugin = pluginManager.getPlugin('my-plugin');
   const missingDeps = pluginManager.checkDependencies(plugin);
   
   if (missingDeps.length > 0) {
     console.log('Missing dependencies:', missingDeps);
     // Install missing dependencies
     for (const dep of missingDeps) {
       await pluginManager.loadPlugin(dep);
     }
   }
   ```

### 3. Configuration Issues

**Symptoms:**
- Configuration validation errors
- Unexpected behavior with settings
- Environment-specific issues

**Diagnostics:**
```bash
# Validate configuration
node -e "
const { ConfigLoader } = require('@cf-auth/config');
const loader = new ConfigLoader();
loader.load().then(config => {
  console.log('Loaded configuration:', JSON.stringify(config, null, 2));
}).catch(console.error);
"

# Check configuration sources
pnpm run config:debug
```

**Solutions:**

1. **Configuration Validation**
   ```typescript
   import { validateConfig } from '@cf-auth/config';
   
   const config = await loadConfig();
   const validation = validateConfig(config);
   
   if (!validation.valid) {
     console.error('Configuration errors:', validation.errors);
     // Fix configuration based on errors
   }
   ```

2. **Environment Variables**
   ```bash
   # Create .env.local with missing variables
   cat >> .env.local << EOF
   DATABASE_URL=postgresql://user:pass@localhost/db
   AUTH_SECRET=$(openssl rand -base64 32)
   NEXTAUTH_URL=http://localhost:3000
   EOF
   ```

### 4. Compatibility Issues

**Symptoms:**
- Type errors after better-auth updates
- Plugin API mismatches
- Deprecation warnings

**Diagnostics:**
```bash
# Check compatibility
pnpm run compatibility:check

# Run compatibility tests
pnpm run test:compatibility

# Check version matrix
node scripts/check-compatibility.js --verbose
```

**Solutions:**

1. **Version Conflicts**
   ```bash
   # Check versions
   cat compatibility-map.json | jq '.["better-auth-compatibility"]'
   
   # Downgrade if necessary
   cd vendor/better-auth
   git checkout tags/v1.0.0
   cd ../..
   pnpm install
   ```

2. **API Changes**
   ```typescript
   // Use compatibility layer
   import { getCompatibilityLayer } from '@cf-auth/core';
   
   const compatibility = getCompatibilityLayer();
   const transformedConfig = compatibility.transformConfig(config);
   ```

### 5. Performance Issues

**Symptoms:**
- Slow authentication responses
- High memory usage
- Database connection pool exhaustion

**Diagnostics:**
```bash
# Monitor performance
npm install -g clinic
clinic doctor -- node server.js

# Check database connections
psql $DATABASE_URL -c "SELECT count(*) FROM pg_stat_activity WHERE datname = 'your_db';"

# Memory usage
node --expose-gc -e "
setInterval(() => {
  console.log('Memory:', process.memoryUsage());
  global.gc();
}, 5000);
"
```

**Solutions:**

1. **Database Optimization**
   ```sql
   -- Add missing indexes
   CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_users_email ON users(email);
   CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_sessions_user_id ON sessions(user_id);
   CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_sessions_expires_at ON sessions(expires_at);
   ```

2. **Connection Pool Tuning**
   ```typescript
   // Optimize database config
   const dbConfig = {
     max: 20,              // Maximum connections
     min: 2,               // Minimum connections  
     idle: 10000,          // Close idle connections after 10s
     acquire: 60000,       // Maximum time to get connection
     evict: 1000           // Check for idle connections every 1s
   };
   ```

3. **Caching**
   ```typescript
   // Add Redis caching
   import { RedisCache } from '@cf-auth/core';
   
   const cache = new RedisCache({
     url: process.env.REDIS_URL,
     ttl: 3600 // 1 hour default TTL
   });
   
   // Cache user sessions
   const session = await cache.get(`session:${sessionId}`) ||
                   await loadSessionFromDB(sessionId);
   ```

## Debug Tools

### Debug Logging

Enable comprehensive logging:

```bash
# Environment variables
export DEBUG=cf-auth:*
export LOG_LEVEL=debug
export VERBOSE=true

# Or in .env
DEBUG=cf-auth:*
LOG_LEVEL=debug
VERBOSE=true
```

### Health Check Endpoint

```typescript
// Add health check route
app.get('/api/health', async (req, res) => {
  const health = {
    status: 'ok',
    timestamp: new Date().toISOString(),
    version: process.env.npm_package_version,
    checks: {}
  };
  
  // Database check
  try {
    await testDatabaseConnection();
    health.checks.database = 'ok';
  } catch (error) {
    health.checks.database = 'error';
    health.status = 'error';
  }
  
  // Redis check
  try {
    await testRedisConnection();
    health.checks.redis = 'ok';
  } catch (error) {
    health.checks.redis = 'error';
  }
  
  // Plugin check
  try {
    const plugins = pluginManager.getHealthStatus();
    health.checks.plugins = plugins;
  } catch (error) {
    health.checks.plugins = 'error';
  }
  
  res.status(health.status === 'ok' ? 200 : 500).json(health);
});
```

### Testing Tools

```bash
# Test authentication flow
curl -X POST http://localhost:3000/api/auth/signin \
  -H "Content-Type: application/json" \
  -d '{"email":"test@example.com","password":"password"}'

# Test plugin loading
node -e "
const { pluginManager } = require('@cf-auth/plugins');
pluginManager.testAllPlugins().then(results => {
  console.log('Plugin test results:', results);
});
"

# Load test
npx autocannon -c 10 -d 10 http://localhost:3000/api/auth/session
```

## Error Codes

### CF-Auth Error Codes

| Code | Description | Resolution |
|------|-------------|------------|
| CF001 | Adapter initialization failed | Check database connection and configuration |
| CF002 | Plugin loading failed | Verify plugin exists and dependencies are met |
| CF003 | Configuration validation failed | Review configuration against schema |
| CF004 | Compatibility check failed | Check better-auth version compatibility |
| CF005 | Database migration failed | Review and run migrations manually |
| CF006 | Session validation failed | Check session storage and configuration |
| CF007 | Authentication provider error | Verify provider configuration and credentials |

### Better-Auth Error Codes

Common better-auth errors and solutions:

| Error | Cause | Solution |
|-------|-------|----------|
| `INVALID_SESSION` | Session expired or invalid | Implement session refresh logic |
| `USER_NOT_FOUND` | User doesn't exist | Check user creation flow |
| `INVALID_CREDENTIALS` | Wrong password/credentials | Verify authentication logic |
| `RATE_LIMIT_EXCEEDED` | Too many requests | Implement proper rate limiting |
| `DATABASE_ERROR` | Database connectivity issues | Check database configuration |

## Recovery Procedures

### Service Recovery

```bash
# Emergency restart
pm2 restart all

# Or with Docker
docker-compose restart

# Check service status
pm2 status
# or
docker-compose ps
```

### Database Recovery

```bash
# Restore from backup
pg_restore -d your_database backup_file.sql

# Or restore specific tables
psql your_database < users_backup.sql
```

### Configuration Recovery

```bash
# Restore configuration from backup
cp .backups/config/cf-auth.config.js .
cp .backups/config/.env .env.local

# Validate restored configuration
pnpm run config:validate
```

## Monitoring & Alerting

### Key Metrics to Monitor

1. **Authentication Success Rate**
2. **Response Times**
3. **Error Rates**
4. **Database Connection Health**
5. **Memory Usage**
6. **Plugin Health Status**

### Alert Conditions

```typescript
// Example monitoring setup
const alerts = {
  authFailureRate: { threshold: 0.05, window: '5m' },
  responseTime: { threshold: 2000, window: '1m' },
  errorRate: { threshold: 0.01, window: '5m' },
  memoryUsage: { threshold: 0.9, window: '1m' }
};
```

## Getting Help

### Self-Help Resources

1. Check this troubleshooting guide
2. Review the adapter patterns documentation
3. Check the plugin development guide
4. Search GitHub issues

### Community Support

1. GitHub Discussions
2. Discord Community (if available)
3. Stack Overflow with `cf-better-auth` tag

### Professional Support

For production issues:
1. Check support agreement
2. Contact support team with:
   - Error logs
   - Configuration (sanitized)
   - Reproduction steps
   - Environment details

Remember to sanitize logs and configuration before sharing, removing any sensitive information like secrets, passwords, or personal data.
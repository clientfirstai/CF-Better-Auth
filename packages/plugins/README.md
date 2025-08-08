# @cf-auth/plugins

A comprehensive plugin system for CF-Better-Auth with built-in plugins and extensibility framework.

## Features

### Core Plugin System
- **Plugin Manager**: Registration, lifecycle management, and coordination
- **Plugin Registry**: Storage, retrieval, and status tracking
- **Plugin Loader**: Dynamic loading from various sources (file, npm, GitHub, URL)
- **Plugin Validator**: Dependency resolution and compatibility checking
- **Plugin Context**: Isolated execution environments with utilities
- **Plugin Builder**: Fluent API for creating plugins

### Plugin Infrastructure
- **Hook System**: Event-driven plugin communication
- **Middleware System**: Request/response processing pipeline
- **Event System**: Real-time event emission and subscription
- **Error Handling**: Comprehensive error management
- **Performance Monitoring**: Plugin health and metrics tracking
- **Hot Reloading**: Development-time plugin reloading

### Built-in Plugins

#### Session Manager Plugin
Advanced session management with:
- Redis support for distributed sessions
- Automatic cleanup and analytics
- Session fingerprinting and security
- Configurable session limits per user
- Real-time session monitoring

#### Rate Limiter Plugin
Sophisticated rate limiting with:
- Multiple strategies (fixed-window, sliding-window, token-bucket, leaky-bucket)
- Redis-backed storage for distributed rate limiting
- Rule-based configuration with priorities
- IP whitelisting and bypass rules
- Real-time analytics and monitoring

#### Audit Logger Plugin
Comprehensive audit logging with:
- Multiple storage backends (Redis, file, webhook, Elasticsearch)
- Real-time monitoring and alerting
- Configurable event filtering
- Risk score calculation
- Export capabilities (JSON, CSV)

#### Multi-Factor Authentication Plugin
Complete MFA implementation with:
- TOTP (Time-based One-Time Password) support
- SMS and Email verification
- Backup codes generation
- QR code generation for authenticator apps
- Configurable enforcement policies

## Installation

```bash
npm install @cf-auth/plugins
# or
pnpm add @cf-auth/plugins
```

## Quick Start

```typescript
import { createCFBetterAuthPluginSystem } from '@cf-auth/plugins';

// Create plugin system with default plugins
const pluginSystem = createCFBetterAuthPluginSystem({
  enableDefaultPlugins: true,
});

// Initialize the plugin manager
await pluginSystem.manager.initialize();

// Access individual components
const { manager, registry, hookSystem, middlewareSystem } = pluginSystem;
```

## Usage Examples

### Creating a Custom Plugin

```typescript
import { createServerPlugin } from '@cf-auth/plugins';

const customPlugin = createServerPlugin()
  .setId('my-custom-plugin')
  .setName('My Custom Plugin')
  .setVersion('1.0.0')
  .setDescription('A custom plugin for CF-Better-Auth')
  .addServerHook('afterLogin', async (user, session, context) => {
    context.logger.info(`User ${user.email} logged in`);
  })
  .addRoute({
    method: 'GET',
    path: '/api/custom',
    handler: async (req, res) => {
      res.json({ message: 'Hello from custom plugin!' });
    },
  })
  .build();

// Register the plugin
await manager.register(customPlugin);
```

### Using Built-in Plugins

```typescript
import { 
  createSessionManagerPlugin,
  createRateLimiterPlugin,
  createAuditLoggerPlugin,
  createMFAPlugin
} from '@cf-auth/plugins';

// Configure session manager with Redis
const sessionManager = createSessionManagerPlugin({
  redis: {
    host: 'localhost',
    port: 6379,
  },
  session: {
    maxAge: 7 * 24 * 60 * 60, // 7 days
    maxSessionsPerUser: 3,
  },
});

// Configure rate limiter with custom rules
const rateLimiter = createRateLimiterPlugin({
  redis: {
    host: 'localhost',
    port: 6379,
  },
  rules: [
    {
      id: 'auth-strict',
      path: '/api/auth/**',
      points: 5,
      duration: 60,
      blockDuration: 300,
    },
  ],
});

// Configure audit logger
const auditLogger = createAuditLoggerPlugin({
  storage: {
    primary: 'redis',
    config: {
      redis: {
        host: 'localhost',
        port: 6379,
      },
    },
  },
  monitoring: {
    enabled: true,
    alertWebhook: 'https://your-webhook-url.com/alerts',
  },
});

// Configure MFA
const mfa = createMFAPlugin({
  methods: {
    totp: {
      enabled: true,
      issuer: 'Your App Name',
    },
    backupCodes: {
      enabled: true,
      count: 10,
    },
  },
  enforcement: {
    required: true,
    requiredForRoles: ['admin'],
  },
});

// Register all plugins
await manager.register(sessionManager);
await manager.register(rateLimiter);
await manager.register(auditLogger);
await manager.register(mfa);
```

### Plugin Builder Patterns

```typescript
import { 
  createServerPlugin,
  createClientPlugin,
  createUniversalPlugin,
  createAuthProviderPlugin 
} from '@cf-auth/plugins';

// Server-only plugin
const serverPlugin = createServerPlugin()
  .setId('server-plugin')
  .addMiddleware({
    name: 'example-middleware',
    handler: async (req, res, next) => {
      // Middleware logic
      next();
    },
  })
  .build();

// Client-only plugin
const clientPlugin = createClientPlugin()
  .setId('client-plugin')
  .addComponent({
    name: 'LoginButton',
    component: MyLoginButton,
  })
  .build();

// Universal plugin (runs on both server and client)
const universalPlugin = createUniversalPlugin()
  .setId('universal-plugin')
  .addServerHook('afterLogin', serverHook)
  .addClientHook('afterSignIn', clientHook)
  .build();

// Auth provider plugin
const oauthPlugin = createAuthProviderPlugin()
  .setId('google-oauth')
  .setName('Google OAuth Provider')
  .addCategory('oauth')
  .addTag('google')
  .build();
```

### Hook System

```typescript
// Register hook listeners
hookSystem.registerHook('my-plugin', 'afterLogin', async (data, context) => {
  context.logger.info('User logged in:', data.user.email);
  
  // Transform data
  return {
    ...data,
    lastLoginAt: new Date(),
  };
});

// Execute hooks
const result = await hookSystem.executeHook('afterLogin', {
  user: { id: '1', email: 'user@example.com' },
  session: { id: 'session-1' },
});
```

### Event System

```typescript
// Subscribe to events
eventSystem.subscribe('my-plugin', 'user.created', (eventData) => {
  console.log('New user created:', eventData.data);
});

// Emit events
await eventSystem.emitEvent('user.created', {
  userId: '123',
  email: 'user@example.com',
});
```

### Middleware System

```typescript
// Get middleware for a route
const middleware = middlewareSystem.getMiddleware('/api/users', 'GET');

// Execute middleware chain
await middlewareSystem.executeMiddleware(middleware, req, res);
```

## Configuration

### Plugin Manager Configuration

```typescript
const manager = createPluginManager({
  registry: createPluginRegistry(),
  validator: createPluginValidator(),
  loader: createPluginLoader({
    enableHotReload: true,
    maxFileSize: 50 * 1024 * 1024, // 50MB
  }),
  contextFactory: createPluginContextFactory(),
  hookSystem: createHookSystem(),
});
```

### Plugin Context Configuration

```typescript
const contextFactory = createPluginContextFactory({
  auth: authInstance,
  database: databaseConnection,
  env: process.env,
});
```

## API Reference

### Plugin Manager

- `initialize()`: Initialize the plugin manager
- `register(plugin)`: Register a new plugin
- `unregister(pluginId)`: Unregister a plugin
- `enable(pluginId)`: Enable a plugin
- `disable(pluginId)`: Disable a plugin
- `getPlugin(pluginId)`: Get plugin by ID
- `listPlugins(filter?)`: List all plugins
- `executeHook(hookName, data)`: Execute plugin hooks

### Plugin Registry

- `register(plugin)`: Register a plugin
- `unregister(pluginId)`: Unregister a plugin
- `get(pluginId)`: Get plugin by ID
- `list(filter?)`: List plugins with optional filtering
- `has(pluginId)`: Check if plugin exists
- `getStatus(pluginId)`: Get plugin status

### Plugin Builder

- `setId(id)`: Set plugin ID
- `setName(name)`: Set plugin name
- `setVersion(version)`: Set plugin version
- `setType(type)`: Set plugin type
- `addDependency(dep)`: Add dependency
- `addHook(name, handler)`: Add hook handler
- `addMiddleware(middleware)`: Add middleware
- `addRoute(route)`: Add route
- `build()`: Build the plugin

## Development

### Hot Reloading

Enable hot reloading in development:

```typescript
const loader = createPluginLoader({
  enableHotReload: true,
});

// Watch for changes
const unwatch = loader.watchPlugin('my-plugin', (updatedPlugin) => {
  console.log('Plugin updated:', updatedPlugin.name);
});
```

### Testing Plugins

```typescript
import { createPluginBuilder, createPluginManager } from '@cf-auth/plugins';

describe('My Plugin', () => {
  let manager: PluginManager;
  
  beforeEach(async () => {
    manager = createPluginManager();
    await manager.initialize();
  });
  
  it('should register successfully', async () => {
    const plugin = createServerPlugin()
      .setId('test-plugin')
      .setName('Test Plugin')
      .setVersion('1.0.0')
      .build();
    
    await manager.register(plugin);
    expect(manager.getPlugin('test-plugin')).toBeDefined();
  });
});
```

### Custom Storage Backends

Implement custom storage for audit logging:

```typescript
class CustomStorage {
  async writeEvent(event: AuditEvent): Promise<void> {
    // Custom storage implementation
  }
}

const auditLogger = createAuditLoggerPlugin({
  storage: {
    primary: 'custom',
    config: {
      custom: new CustomStorage(),
    },
  },
});
```

## Security Considerations

### Plugin Isolation

Plugins run in isolated contexts with limited access:

```typescript
const contextFactory = createPluginContextFactory({
  // Restrict file system access
  enableFileSystem: false,
  
  // Restrict network access
  enableNetwork: false,
  
  // Custom security policy
  securityPolicy: {
    allowedModules: ['crypto', 'util'],
    blockedModules: ['fs', 'child_process'],
  },
});
```

### Plugin Validation

All plugins are validated before registration:

```typescript
const validator = createPluginValidator({
  strictValidation: true,
  allowExperimentalFeatures: false,
});
```

### Rate Limiting Best Practices

Configure rate limiting for different scenarios:

```typescript
const rateLimiter = createRateLimiterPlugin({
  rules: [
    // Strict limits for authentication
    {
      id: 'auth',
      path: '/api/auth/**',
      points: 5,
      duration: 60,
      blockDuration: 300,
    },
    // Moderate limits for API
    {
      id: 'api',
      path: '/api/**',
      points: 100,
      duration: 60,
      skipOnAuth: true,
    },
    // Generous limits for static content
    {
      id: 'static',
      path: '/static/**',
      points: 1000,
      duration: 60,
    },
  ],
});
```

## Contributing

1. Fork the repository
2. Create a feature branch
3. Add tests for new functionality
4. Ensure all tests pass
5. Submit a pull request

## License

MIT License - see LICENSE file for details.
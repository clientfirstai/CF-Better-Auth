# Plugin Development Guide

## Overview

CF-Better-Auth provides a powerful plugin system that allows you to extend authentication functionality while maintaining compatibility with better-auth plugins.

## Plugin Architecture

### Plugin Interface

All plugins must implement the Plugin interface:

```typescript
export interface Plugin {
  name: string;
  version?: string;
  init: (auth: BetterAuthInstance) => void | Promise<void>;
  dependencies?: string[];
  config?: any;
}
```

### Plugin Types

1. **Authentication Plugins** - Add new authentication methods
2. **Security Plugins** - Enhance security features
3. **Integration Plugins** - Connect with external services
4. **UI Plugins** - Extend frontend components

## Creating a Plugin

### Basic Plugin Structure

```typescript
// my-custom-plugin/src/index.ts
import type { Plugin } from '@cf-auth/plugins';

export const myCustomPlugin: Plugin = {
  name: 'my-custom-plugin',
  version: '1.0.0',
  dependencies: ['better-auth-core'],
  config: {
    // Plugin-specific configuration
    apiKey: process.env.CUSTOM_PLUGIN_API_KEY,
    endpoint: 'https://api.example.com'
  },
  async init(auth) {
    // Initialize plugin functionality
    auth.on('user:created', async (user) => {
      // Handle user creation event
      await this.notifyExternalService(user);
    });
    
    // Add custom routes
    auth.addRoute('/api/custom-auth', this.handleCustomAuth.bind(this));
  },
  
  async notifyExternalService(user) {
    // Custom plugin logic
    const response = await fetch(this.config.endpoint, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${this.config.apiKey}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ user })
    });
    
    if (!response.ok) {
      throw new Error('Failed to notify external service');
    }
  },
  
  async handleCustomAuth(req, res) {
    // Custom authentication endpoint logic
    const token = req.headers.authorization?.split(' ')[1];
    
    if (!token) {
      return res.status(401).json({ error: 'Missing token' });
    }
    
    // Validate token with external service
    const isValid = await this.validateToken(token);
    
    if (isValid) {
      res.json({ success: true });
    } else {
      res.status(401).json({ error: 'Invalid token' });
    }
  }
};
```

### Plugin Package Structure

```
my-custom-plugin/
├── src/
│   ├── index.ts          # Main plugin export
│   ├── types.ts          # Plugin-specific types
│   └── utils.ts          # Utility functions
├── tests/
│   └── plugin.test.ts    # Plugin tests
├── package.json
├── tsconfig.json
└── README.md
```

### Package.json Configuration

```json
{
  "name": "@my-org/cf-auth-plugin-custom",
  "version": "1.0.0",
  "main": "dist/index.js",
  "types": "dist/index.d.ts",
  "peerDependencies": {
    "@cf-auth/core": "^0.1.0",
    "@cf-auth/plugins": "^0.1.0"
  },
  "keywords": ["cf-auth", "plugin", "authentication"],
  "cf-auth": {
    "plugin": true,
    "category": "integration"
  }
}
```

## Plugin Adapters

### Creating a Plugin Adapter

For better-auth plugin compatibility:

```typescript
// plugin-adapter.ts
import type { PluginAdapter } from '@cf-auth/plugins';

export const myPluginAdapter: PluginAdapter = {
  name: 'my-custom-plugin',
  
  fromBetterAuth(betterAuthPlugin) {
    return {
      name: 'my-custom-plugin',
      version: betterAuthPlugin.version,
      init: async (auth) => {
        // Adapt better-auth plugin to our interface
        const adaptedAuth = this.adaptAuthInstance(auth);
        await betterAuthPlugin.init(adaptedAuth);
      },
      config: betterAuthPlugin.config
    };
  },
  
  toBetterAuth(plugin) {
    return {
      name: plugin.name,
      version: plugin.version,
      init: async (auth) => {
        // Adapt our plugin to better-auth interface
        const adaptedAuth = this.adaptToCore(auth);
        await plugin.init(adaptedAuth);
      },
      config: plugin.config
    };
  },
  
  adaptAuthInstance(auth) {
    // Add our extensions to auth instance
    return {
      ...auth,
      addRoute: (path, handler) => {
        // Implement route addition
      },
      on: (event, handler) => {
        // Implement event listening
      }
    };
  }
};
```

## Advanced Plugin Features

### Event System

```typescript
export const eventPlugin: Plugin = {
  name: 'event-plugin',
  async init(auth) {
    // Listen to authentication events
    auth.on('user:login', async (user, session) => {
      console.log(`User ${user.id} logged in`);
      await this.trackLogin(user);
    });
    
    auth.on('user:logout', async (user) => {
      console.log(`User ${user.id} logged out`);
      await this.trackLogout(user);
    });
    
    auth.on('session:expired', async (session) => {
      console.log(`Session ${session.id} expired`);
      await this.cleanupExpiredSession(session);
    });
  }
};
```

### Middleware Plugin

```typescript
export const middlewarePlugin: Plugin = {
  name: 'middleware-plugin',
  async init(auth) {
    // Add authentication middleware
    auth.use(async (req, res, next) => {
      const token = req.headers.authorization?.split(' ')[1];
      
      if (token) {
        try {
          const user = await auth.verifyToken(token);
          req.user = user;
        } catch (error) {
          // Token invalid, continue without user
        }
      }
      
      next();
    });
    
    // Add rate limiting middleware
    auth.use(this.rateLimitMiddleware);
  },
  
  rateLimitMiddleware(req, res, next) {
    // Implement rate limiting logic
    const clientId = req.ip || req.user?.id;
    
    if (this.isRateLimited(clientId)) {
      return res.status(429).json({ error: 'Too many requests' });
    }
    
    next();
  }
};
```

### Database Plugin

```typescript
export const databasePlugin: Plugin = {
  name: 'database-plugin',
  dependencies: ['database-adapter'],
  async init(auth) {
    // Extend database schema
    await auth.database.createTable('user_preferences', {
      user_id: 'varchar(255) PRIMARY KEY',
      preferences: 'jsonb',
      created_at: 'timestamp DEFAULT NOW()',
      updated_at: 'timestamp DEFAULT NOW()'
    });
    
    // Add database methods
    auth.getUserPreferences = async (userId) => {
      return await auth.database.query(
        'SELECT preferences FROM user_preferences WHERE user_id = $1',
        [userId]
      );
    };
    
    auth.updateUserPreferences = async (userId, preferences) => {
      return await auth.database.query(
        'INSERT INTO user_preferences (user_id, preferences) VALUES ($1, $2) ON CONFLICT (user_id) DO UPDATE SET preferences = $2, updated_at = NOW()',
        [userId, JSON.stringify(preferences)]
      );
    };
  }
};
```

## Testing Plugins

### Unit Testing

```typescript
// tests/plugin.test.ts
import { describe, test, expect, beforeEach } from 'vitest';
import { createMockAuth } from '@cf-auth/testing';
import { myCustomPlugin } from '../src';

describe('MyCustomPlugin', () => {
  let mockAuth;
  
  beforeEach(() => {
    mockAuth = createMockAuth();
  });
  
  test('should initialize correctly', async () => {
    await myCustomPlugin.init(mockAuth);
    
    expect(mockAuth.addRoute).toHaveBeenCalledWith(
      '/api/custom-auth',
      expect.any(Function)
    );
  });
  
  test('should handle user creation events', async () => {
    await myCustomPlugin.init(mockAuth);
    
    const user = { id: '123', email: 'test@example.com' };
    await mockAuth.emit('user:created', user);
    
    // Assert external service was called
    expect(fetch).toHaveBeenCalledWith(
      expect.stringContaining('api.example.com'),
      expect.objectContaining({
        method: 'POST',
        body: JSON.stringify({ user })
      })
    );
  });
});
```

### Integration Testing

```typescript
// tests/integration.test.ts
import { describe, test, expect } from 'vitest';
import { createTestAuth } from '@cf-auth/testing';
import { myCustomPlugin } from '../src';

describe('MyCustomPlugin Integration', () => {
  test('should work with real auth instance', async () => {
    const auth = await createTestAuth({
      plugins: [myCustomPlugin]
    });
    
    const response = await fetch(`${auth.baseUrl}/api/custom-auth`, {
      headers: {
        'Authorization': 'Bearer valid-token'
      }
    });
    
    expect(response.status).toBe(200);
    const data = await response.json();
    expect(data.success).toBe(true);
  });
});
```

## Plugin Registration

### Automatic Registration

```typescript
// plugins/index.ts
import { PluginManager } from '@cf-auth/plugins';
import { myCustomPlugin } from './my-custom-plugin';

const pluginManager = new PluginManager();

// Register plugin
pluginManager.register(myCustomPlugin);

export { pluginManager };
```

### Manual Registration

```typescript
// In your application
import { BetterAuthAdapter } from '@cf-auth/core';
import { myCustomPlugin } from '@my-org/cf-auth-plugin-custom';

const adapter = new BetterAuthAdapter({
  plugins: [myCustomPlugin],
  // other configuration
});
```

## Plugin Distribution

### NPM Package

1. Build your plugin: `npm run build`
2. Test thoroughly: `npm test`
3. Publish: `npm publish`

### Plugin Registry

Submit your plugin to the CF-Better-Auth plugin registry:

```bash
npx cf-auth-cli plugin submit
```

## Best Practices

1. **Follow Naming Conventions** - Use `cf-auth-plugin-*` prefix
2. **Declare Dependencies** - Always specify plugin dependencies
3. **Handle Errors Gracefully** - Don't crash the main application
4. **Write Tests** - Comprehensive test coverage is essential
5. **Document Thoroughly** - Clear documentation helps adoption
6. **Version Properly** - Follow semantic versioning
7. **Performance** - Avoid blocking the main thread
8. **Security** - Validate all inputs and handle secrets securely

## Plugin Lifecycle

1. **Registration** - Plugin is registered with the system
2. **Dependency Resolution** - Dependencies are resolved and loaded
3. **Initialization** - Plugin init method is called
4. **Runtime** - Plugin responds to events and requests
5. **Cleanup** - Plugin resources are cleaned up on shutdown

This guide provides the foundation for creating powerful, compatible plugins for the CF-Better-Auth platform.
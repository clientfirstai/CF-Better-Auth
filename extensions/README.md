# CF-Better-Auth Extensions

This directory contains all the custom extensions, plugins, and configurations that make CF-Better-Auth unique. These extensions build on top of the core better-auth functionality while maintaining complete separation and upgrade safety.

## Directory Structure

### [plugins/](./plugins/)
Custom authentication plugins specific to CF-Better-Auth.

**Purpose**: Extend authentication functionality with business-specific features
- **cf-multi-tenant/**: Multi-tenancy support with organization management
- **cf-analytics/**: Custom analytics and usage tracking
- **cf-compliance/**: Compliance features (GDPR, CCPA, SOX, HIPAA)

### [components/](./components/)
Custom UI components that enhance the authentication experience.

**Purpose**: Branded and enhanced UI components
- **branded-login/**: Custom login forms with CF branding
- **dashboard-widgets/**: Authentication dashboard components

### [config/](./config/)
Configuration files and overrides for customizing better-auth behavior.

**Purpose**: Centralized configuration management
- **base.config.ts**: Base configuration settings
- **plugins.config.ts**: Plugin-specific configurations  
- **overrides.config.ts**: Better-auth configuration overrides

### [middleware/](./middleware/)
Custom middleware for request processing and security enhancements.

**Purpose**: Request/response processing and security layers
- Authentication middleware
- Rate limiting middleware
- Audit logging middleware
- Security headers middleware

### [adapters/](./adapters/)
Adapter implementations that bridge better-auth with custom functionality.

**Purpose**: Integration layer between better-auth and CF-specific features
- Database adapters
- Email service adapters
- OAuth provider adapters
- Session storage adapters

## Architecture Philosophy

All extensions follow the core CF-Better-Auth principles:

### 1. Non-Invasive Integration
- Never modify better-auth core directly
- Use adapter patterns for all customizations
- Maintain clean separation of concerns
- Enable easy updates and rollbacks

### 2. Plugin-Driven Architecture
- Each feature is implemented as a discrete plugin
- Plugins can depend on other plugins
- Clear plugin interfaces and contracts
- Hot-pluggable functionality

### 3. Configuration-Based Customization
- Extensive configuration options
- Environment-specific configurations
- Runtime configuration updates
- Validation and type safety

## Extension Development

### Creating a Custom Plugin

1. **Create Plugin Directory**
```bash
mkdir extensions/plugins/my-custom-plugin
cd extensions/plugins/my-custom-plugin
```

2. **Implement Plugin Interface**
```typescript
// index.ts
import type { CFAuthPlugin } from '@cf-auth/plugin-interfaces';

export const myCustomPlugin: CFAuthPlugin = {
  id: 'my-custom-plugin',
  name: 'My Custom Plugin',
  version: '1.0.0',
  
  // Server-side implementation
  endpoints: {
    '/custom-endpoint': {
      method: 'POST',
      handler: async (context) => {
        // Custom logic here
        return Response.json({ success: true });
      }
    }
  },
  
  // Client-side implementation
  client: {
    getActions: (fetch) => ({
      customAction: async (data) => {
        return fetch('/api/auth/custom-endpoint', {
          method: 'POST',
          body: JSON.stringify(data)
        });
      }
    })
  },
  
  // Lifecycle hooks
  hooks: {
    afterSignIn: async (session) => {
      console.log('Custom plugin: user signed in', session.user.id);
    }
  }
};
```

3. **Register Plugin**
```typescript
// extensions/config/plugins.config.ts
import { myCustomPlugin } from '../plugins/my-custom-plugin';

export const customPlugins = [
  myCustomPlugin,
  // Other custom plugins...
];
```

### Creating Custom Components

1. **Create Component Directory**
```bash
mkdir extensions/components/my-custom-component
```

2. **Implement React Component**
```typescript
// extensions/components/my-custom-component/index.tsx
import React from 'react';
import { useAuth } from '@cf-auth/client';

export const MyCustomComponent: React.FC = () => {
  const { user, signOut } = useAuth();
  
  return (
    <div className="custom-component">
      <h2>Welcome, {user?.name}</h2>
      <button onClick={signOut}>Sign Out</button>
    </div>
  );
};
```

### Creating Custom Middleware

```typescript
// extensions/middleware/custom-middleware.ts
import type { Middleware } from '@cf-auth/plugin-interfaces';

export const customMiddleware: Middleware = async (context, next) => {
  // Pre-processing
  console.log('Request received:', context.request.url);
  
  // Continue to next middleware
  await next();
  
  // Post-processing
  console.log('Response sent:', context.response.status);
};
```

## Configuration Management

### Environment-Specific Configurations

```typescript
// extensions/config/base.config.ts
export const baseConfig = {
  // Development settings
  development: {
    debug: true,
    logLevel: 'debug',
    rateLimiting: {
      enabled: false
    }
  },
  
  // Production settings
  production: {
    debug: false,
    logLevel: 'error',
    rateLimiting: {
      enabled: true,
      windowMs: 15 * 60 * 1000, // 15 minutes
      max: 100 // limit each IP to 100 requests per windowMs
    }
  }
};
```

### Plugin Configuration

```typescript
// extensions/config/plugins.config.ts
export const pluginConfigs = {
  'cf-multi-tenant': {
    enabled: true,
    allowSelfRegistration: true,
    defaultRole: 'member',
    maxOrganizations: 10
  },
  
  'cf-analytics': {
    enabled: process.env.NODE_ENV === 'production',
    trackingEndpoint: process.env.ANALYTICS_ENDPOINT,
    events: ['signin', 'signup', 'password_reset']
  },
  
  'cf-compliance': {
    enabled: true,
    regions: ['US', 'EU'],
    retentionPeriod: '7 years',
    auditLog: true
  }
};
```

## Integration with Core Packages

Extensions integrate seamlessly with the core CF-Better-Auth packages:

```typescript
// app/lib/auth.ts
import { CFBetterAuth } from '@cf-auth/core';
import { customPlugins } from '../extensions/config/plugins.config';
import { customMiddleware } from '../extensions/middleware/custom-middleware';

export const auth = new CFBetterAuth({
  // Load custom plugins
  plugins: customPlugins,
  
  // Apply custom middleware
  middleware: [customMiddleware],
  
  // Use custom configurations
  ...baseConfig[process.env.NODE_ENV || 'development']
});
```

## Testing Extensions

### Unit Testing
```typescript
// extensions/plugins/my-plugin/__tests__/plugin.test.ts
import { myCustomPlugin } from '../index';
import { createMockContext } from '@cf-auth/testing-utils';

describe('My Custom Plugin', () => {
  it('should handle custom endpoint', async () => {
    const context = createMockContext({
      body: { test: 'data' }
    });
    
    const handler = myCustomPlugin.endpoints['/custom-endpoint'].handler;
    const response = await handler(context);
    
    expect(response.status).toBe(200);
  });
});
```

### Integration Testing
```typescript
// extensions/__tests__/integration.test.ts
import { createTestAuth } from '@cf-auth/testing-utils';
import { customPlugins } from '../config/plugins.config';

describe('Extensions Integration', () => {
  it('should load all custom plugins', async () => {
    const auth = createTestAuth({
      plugins: customPlugins
    });
    
    const loadedPlugins = auth.getLoadedPlugins();
    expect(loadedPlugins).toHaveLength(customPlugins.length);
  });
});
```

## Best Practices

### 1. Plugin Development
- Follow the plugin interface specifications strictly
- Implement comprehensive error handling
- Provide detailed configuration options
- Include thorough documentation

### 2. Component Development
- Use TypeScript for all components
- Follow React best practices and hooks patterns
- Implement proper loading and error states
- Ensure accessibility compliance

### 3. Configuration Management
- Use environment variables for sensitive data
- Provide sensible defaults for all options
- Validate configuration at startup
- Support hot-reloading in development

### 4. Security Considerations
- Validate all inputs thoroughly
- Implement proper rate limiting
- Use secure session management
- Follow OWASP security guidelines

## Deployment

Extensions are automatically included in the build process:

```bash
# Build all extensions with core packages
pnpm run build

# Test extensions
pnpm run test:extensions

# Deploy with extensions
pnpm run deploy
```

The modular architecture ensures that only the extensions you need are included in your final bundle, keeping your application lean and performant.
# CF-Better-Auth Core Packages

This directory contains the core packages that make up the CF-Better-Auth ecosystem. These packages provide the foundational layer that extends better-auth with sophisticated features while maintaining complete upgrade independence.

## Package Overview

### [@cf-auth/core](./core/)
The main adapter package that wraps better-auth core functionality.

- **Purpose**: Provides the primary interface between your application and better-auth
- **Key Features**: 
  - Configuration merging and management
  - Plugin system integration
  - Type-safe API wrappers
  - Upgrade compatibility layer

### [@cf-auth/plugin-interfaces](./plugin-interfaces/)
TypeScript interface definitions for plugin development.

- **Purpose**: Standardized interfaces for building CF-Better-Auth plugins
- **Key Features**: 
  - Server plugin interfaces with database schema extensions
  - Client plugin interfaces with state management
  - Comprehensive hook system definitions
  - Type-safe plugin development

### [@cf-auth/ui](./ui/)
UI component extensions and theme system.

- **Purpose**: Enhanced UI components built on top of better-auth's basic UI
- **Key Features**: 
  - Branded authentication components
  - Aceternity UI integration
  - Theme system with custom styling
  - Responsive design components

### [@cf-auth/plugins](./plugins/)
Extended plugin collection and utilities.

- **Purpose**: Additional plugins that extend better-auth functionality
- **Key Features**: 
  - Multi-tenant authentication
  - Advanced role-based access control
  - Custom analytics integration
  - Compliance and audit features

## Architecture Principles

All packages follow these core principles:

1. **Never Modify Core**: Better-auth remains untouched through adapter patterns
2. **Type Safety**: Full TypeScript support with comprehensive type definitions
3. **Plugin Architecture**: Extensible through standardized plugin interfaces
4. **Upgrade Independence**: Updates to better-auth don't break customizations
5. **Framework Agnostic**: Support for Next.js, React, Vue, and other frameworks

## Development Workflow

### Local Development
```bash
# Install dependencies
pnpm install

# Build all packages
pnpm run build

# Development mode (watch mode)
pnpm run dev

# Run tests
pnpm run test

# Type checking
pnpm run typecheck
```

### Package Management
Each package is independently versioned and can be published separately:

```bash
# Build specific package
pnpm --filter @cf-auth/core build

# Test specific package  
pnpm --filter @cf-auth/plugin-interfaces test

# Publish package (after build)
pnpm --filter @cf-auth/core publish
```

## Integration Example

Here's how these packages work together in a typical application:

```typescript
// app/lib/auth.ts
import { CFBetterAuth } from '@cf-auth/core';
import { multiTenantPlugin, analyticsPlugin } from '@cf-auth/plugins';
import { brandedTheme } from '@cf-auth/ui';

export const auth = new CFBetterAuth({
  database: process.env.DATABASE_URL,
  
  // Apply CF-specific plugins
  plugins: [
    multiTenantPlugin({
      allowSelfRegistration: true,
      defaultRole: 'member'
    }),
    analyticsPlugin({
      trackSignups: true,
      trackSessions: true
    })
  ],
  
  // Use custom UI theme
  ui: {
    theme: brandedTheme,
    customComponents: {
      loginForm: 'CustomLoginForm',
      dashboard: 'CustomDashboard'
    }
  }
});
```

## Contributing

Each package has its own contribution guidelines, but all follow these general rules:

1. **Type Safety**: All code must be fully typed with TypeScript
2. **Testing**: Comprehensive test coverage for all features
3. **Documentation**: Inline documentation and README updates
4. **Compatibility**: Maintain backward compatibility within major versions
5. **Plugin Standards**: Follow the plugin interface specifications

## Package Dependencies

```
@cf-auth/core
├── @cf-auth/plugin-interfaces (peer dependency)
└── better-auth (peer dependency)

@cf-auth/ui
├── @cf-auth/core (peer dependency)
├── @aceternity/ui (dependency)
└── react (peer dependency)

@cf-auth/plugins
├── @cf-auth/core (peer dependency)
├── @cf-auth/plugin-interfaces (peer dependency)
└── various plugin-specific dependencies
```

## License

All packages are licensed under MIT License. See individual package LICENSE files for details.
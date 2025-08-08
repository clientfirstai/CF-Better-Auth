# Modular Architecture

## Overview

CF-Better-Auth implements a sophisticated modular architecture that allows it to build on top of better-auth while maintaining complete upgrade independence. This architecture ensures that updates to the upstream better-auth repository never break your customizations, providing a future-proof authentication solution.

## Layer Separation Architecture

The modular architecture is built on three distinct layers that provide complete separation of concerns:

```
┌─────────────────────────────────────────────────────────┐
│          CF-Better-Auth Custom Layer                    │
│  (Your customizations, plugins, and configurations)     │
├─────────────────────────────────────────────────────────┤
│           Abstraction/Adapter Layer                     │
│  (Interfaces, wrappers, and compatibility layer)        │
├─────────────────────────────────────────────────────────┤
│         Better-Auth Core (Git Submodule)                │
│  (Original better-auth - never modified directly)       │
└─────────────────────────────────────────────────────────┘
```

### Custom Layer
**Purpose**: Houses all CF-Better-Auth specific features and customizations

**Components**:
- Custom plugins and extensions
- Branded UI components
- Business logic implementations
- Configuration overrides
- Custom middleware and hooks

**Key Characteristics**:
- Full control and customization
- Business-specific implementations
- Integration with external services
- Custom authentication flows

### Abstraction/Adapter Layer
**Purpose**: Provides interface compatibility and upgrade safety

**Components**:
- Type adapters and interfaces
- Configuration mergers
- Plugin compatibility wrappers
- Version compatibility handlers
- Migration utilities

**Key Characteristics**:
- Maintains API stability
- Handles version differences
- Provides backward compatibility
- Enables smooth upgrades

### Better-Auth Core Layer
**Purpose**: Provides the foundational authentication framework

**Components**:
- Core authentication logic
- Built-in providers and plugins
- Database adapters
- Session management
- Security implementations

**Key Characteristics**:
- Never modified directly
- Managed as Git submodule
- Version locked for stability
- Upgraded through controlled process

## Core Architecture Principles

### 1. Never Modify Core
The fundamental principle of CF-Better-Auth is to never modify the better-auth core directly. This ensures:

- **Upgrade Safety**: Core updates don't break customizations
- **Maintainability**: Clear separation between upstream and custom code
- **Debugging**: Issues can be isolated to specific layers
- **Compliance**: Maintains better-auth license and warranty

**Implementation**:
```bash
# Better-auth is managed as a Git submodule
git submodule add https://github.com/better-auth/better-auth.git better-auth
git submodule update --init --recursive

# Lock to specific version
cd better-auth
git checkout v1.0.0
cd ..
git add better-auth
git commit -m "Lock better-auth to v1.0.0"
```

### 2. Extend Through Adapters
All customizations and extensions are implemented through adapter interfaces:

- **Configuration Adapters**: Merge and override settings safely
- **Plugin Adapters**: Extend functionality without core modifications
- **Type Adapters**: Enhance TypeScript definitions
- **API Adapters**: Wrap and extend core APIs

**Benefits**:
- Clean separation of concerns
- Testable in isolation
- Reusable across projects
- Version-independent implementations

### 3. Version Independence
Each layer can evolve independently while maintaining compatibility:

- **Custom Layer**: Evolves with business requirements
- **Adapter Layer**: Updates to handle new better-auth versions
- **Core Layer**: Updated through controlled upgrade process

**Implementation Strategy**:
```typescript
// Version compatibility matrix
interface VersionCompatibility {
  'better-auth': {
    '0.x': AdapterV0;
    '1.x': AdapterV1;
    '2.x': AdapterV2;
  }
}
```

### 4. Backward Compatibility
The adapter layer maintains API stability across better-auth versions:

- **Interface Preservation**: Maintain consistent APIs
- **Migration Utilities**: Automatic data and config migration
- **Deprecation Handling**: Graceful handling of removed features
- **Feature Detection**: Runtime capability detection

## Adapter Pattern Implementation

### Core Authentication Adapter

```typescript
// packages/@cf-auth/core/src/auth-adapter.ts
import { betterAuth as CoreBetterAuth } from '../../../better-auth/src';
import type { BetterAuthOptions } from '../../../better-auth/src/types';
import { ConfigMerger } from './config-merger';
import { PluginManager } from './plugin-manager';
import { TypeAdapter } from './type-adapter';

export class CFBetterAuth {
  private core: ReturnType<typeof CoreBetterAuth>;
  private configMerger: ConfigMerger;
  private pluginManager: PluginManager;
  private typeAdapter: TypeAdapter;
  
  constructor(options: CFAuthOptions) {
    // Initialize adapters
    this.configMerger = new ConfigMerger();
    this.pluginManager = new PluginManager();
    this.typeAdapter = new TypeAdapter();
    
    // Merge configurations safely
    const mergedConfig = this.configMerger.merge(
      this.getDefaultConfig(),
      options,
      this.getCustomExtensions()
    );
    
    // Initialize core with merged config
    this.core = CoreBetterAuth(mergedConfig);
    
    // Apply custom middleware and hooks
    this.applyCustomizations();
  }
  
  // Wrap core methods with custom logic
  async signIn(...args: Parameters<typeof this.core.signIn>) {
    // Pre-processing hooks
    await this.pluginManager.executeHooks('beforeSignIn', args);
    
    // Call core method with type adaptation
    const adaptedArgs = this.typeAdapter.adaptSignInArgs(args);
    const result = await this.core.signIn(...adaptedArgs);
    
    // Post-processing hooks
    const adaptedResult = this.typeAdapter.adaptSignInResult(result);
    await this.pluginManager.executeHooks('afterSignIn', adaptedResult);
    
    return adaptedResult;
  }
  
  // CF-specific method extensions
  async customMethod() {
    // Implementation specific to CF-Better-Auth
    return this.pluginManager.execute('customMethod');
  }
  
  // Plugin management
  use(plugin: CFAuthPlugin) {
    return this.pluginManager.register(plugin);
  }
  
  // Configuration management
  updateConfig(config: Partial<CFAuthOptions>) {
    return this.configMerger.update(config);
  }
  
  private getDefaultConfig(): BetterAuthOptions {
    return {
      database: process.env.DATABASE_URL,
      session: {
        cookieCache: {
          enabled: true,
          maxAge: 5 * 60 * 1000, // 5 minutes
        }
      },
      plugins: [
        // Default CF-Better-Auth plugins
      ]
    };
  }
  
  private getCustomExtensions() {
    return {
      // CF-specific extensions
      branding: {
        enabled: true,
        theme: 'cf-dark'
      },
      analytics: {
        enabled: true,
        provider: 'custom'
      }
    };
  }
  
  private async applyCustomizations() {
    // Apply middleware stack
    await this.pluginManager.applyMiddleware(this.core);
    
    // Initialize custom features
    await this.pluginManager.initialize();
  }
}
```

### Configuration Merger

```typescript
// packages/@cf-auth/core/src/config-merger.ts
import type { BetterAuthOptions } from '../../../better-auth/src/types';
import type { CFAuthOptions } from './types';

export class ConfigMerger {
  merge(
    defaultConfig: BetterAuthOptions,
    userConfig: CFAuthOptions,
    customExtensions: Record<string, any>
  ): BetterAuthOptions {
    return {
      ...defaultConfig,
      ...this.adaptUserConfig(userConfig),
      ...this.processCustomExtensions(customExtensions),
      plugins: this.mergePlugins(
        defaultConfig.plugins || [],
        userConfig.plugins || [],
        customExtensions.plugins || []
      )
    };
  }
  
  private adaptUserConfig(config: CFAuthOptions): BetterAuthOptions {
    // Convert CF-specific config to better-auth format
    return {
      database: config.database,
      session: {
        ...config.session,
        cookieCache: {
          enabled: config.enableCookieCache ?? true,
          maxAge: config.cookieCacheMaxAge ?? 5 * 60 * 1000
        }
      },
      // Additional adaptations...
    };
  }
  
  private processCustomExtensions(extensions: Record<string, any>) {
    // Process CF-specific extensions
    const processed: Partial<BetterAuthOptions> = {};
    
    if (extensions.branding?.enabled) {
      processed.baseURL = extensions.branding.baseURL;
      // Additional branding configurations...
    }
    
    if (extensions.analytics?.enabled) {
      // Configure analytics plugin
    }
    
    return processed;
  }
  
  private mergePlugins(
    defaultPlugins: any[],
    userPlugins: any[],
    customPlugins: any[]
  ) {
    return [
      ...defaultPlugins,
      ...userPlugins,
      ...customPlugins
    ].filter((plugin, index, arr) => 
      arr.findIndex(p => p.id === plugin.id) === index
    );
  }
}
```

### Plugin Manager

```typescript
// packages/@cf-auth/core/src/plugin-manager.ts
import type { CFAuthPlugin } from './types';

export class PluginManager {
  private plugins: Map<string, CFAuthPlugin> = new Map();
  private hooks: Map<string, Function[]> = new Map();
  
  register(plugin: CFAuthPlugin) {
    this.plugins.set(plugin.id, plugin);
    this.registerHooks(plugin);
    return this;
  }
  
  async executeHooks(hookName: string, data: any) {
    const hooks = this.hooks.get(hookName) || [];
    
    for (const hook of hooks) {
      try {
        await hook(data);
      } catch (error) {
        console.error(`Error in ${hookName} hook:`, error);
        // Handle hook errors gracefully
      }
    }
  }
  
  async execute(method: string, ...args: any[]) {
    const results = [];
    
    for (const plugin of this.plugins.values()) {
      if (plugin[method] && typeof plugin[method] === 'function') {
        try {
          const result = await plugin[method](...args);
          results.push(result);
        } catch (error) {
          console.error(`Error in plugin ${plugin.id}.${method}:`, error);
        }
      }
    }
    
    return results;
  }
  
  private registerHooks(plugin: CFAuthPlugin) {
    if (plugin.hooks) {
      Object.entries(plugin.hooks).forEach(([hookName, hookFn]) => {
        if (!this.hooks.has(hookName)) {
          this.hooks.set(hookName, []);
        }
        this.hooks.get(hookName)!.push(hookFn);
      });
    }
  }
}
```

## Custom Plugin System

### Plugin Interface Definition

```typescript
// packages/@cf-auth/core/src/types.ts
export interface CFAuthPlugin {
  id: string;
  name: string;
  version?: string;
  
  // Better-auth plugin compatibility
  extends?: string;
  
  // Lifecycle hooks
  onInit?(auth: CFBetterAuth): Promise<void> | void;
  onDestroy?(): Promise<void> | void;
  
  // Custom hooks
  hooks?: {
    beforeSignIn?(data: SignInData): Promise<void> | void;
    afterSignIn?(session: Session): Promise<void> | void;
    beforeSignUp?(data: SignUpData): Promise<void> | void;
    afterSignUp?(user: User): Promise<void> | void;
    beforeSignOut?(session: Session): Promise<void> | void;
    afterSignOut?(): Promise<void> | void;
  };
  
  // Custom methods
  [key: string]: any;
}
```

### Example Custom Plugin

```typescript
// extensions/plugins/custom-plugin/index.ts
import type { CFAuthPlugin } from '@cf-auth/core';

export const customAnalyticsPlugin: CFAuthPlugin = {
  id: 'cf-analytics',
  name: 'CF Analytics Plugin',
  version: '1.0.0',
  
  // Extend better-auth plugin interface
  extends: 'better-auth-plugin-interface',
  
  // Plugin initialization
  async onInit(auth) {
    console.log('Analytics plugin initialized');
    // Setup analytics tracking
  },
  
  // Custom hooks implementation
  hooks: {
    async afterSignIn(session) {
      // Track sign-in event
      await this.trackEvent('user.signed_in', {
        userId: session.user.id,
        timestamp: new Date(),
        provider: session.provider
      });
    },
    
    async afterSignUp(user) {
      // Track sign-up event
      await this.trackEvent('user.signed_up', {
        userId: user.id,
        timestamp: new Date(),
        email: user.email
      });
    }
  },
  
  // Custom methods
  async trackEvent(event: string, data: any) {
    // Custom analytics implementation
    console.log(`Analytics Event: ${event}`, data);
    
    // Send to analytics service
    if (process.env.ANALYTICS_ENDPOINT) {
      await fetch(process.env.ANALYTICS_ENDPOINT, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ event, data, timestamp: new Date() })
      });
    }
  },
  
  async getAnalytics(userId?: string) {
    // Retrieve analytics data
    // Implementation depends on analytics service
  }
};
```

## Upgrade Strategy

### Automated Upgrade Process

```bash
#!/bin/bash
# scripts/upgrade-better-auth.sh

echo "🔄 Starting better-auth upgrade process..."

# 1. Create backup branch
git checkout -b "upgrade-better-auth-$(date +%Y%m%d)"

# 2. Update the Git submodule
cd better-auth
git fetch origin
LATEST_TAG=$(git describe --tags --abbrev=0 origin/main)
echo "📦 Upgrading to $LATEST_TAG"
git checkout $LATEST_TAG
cd ..

# 3. Run compatibility checks
echo "🔍 Running compatibility checks..."
npm run check:compatibility

if [ $? -ne 0 ]; then
    echo "❌ Compatibility check failed. Upgrade aborted."
    git checkout main
    git branch -D "upgrade-better-auth-$(date +%Y%m%d)"
    exit 1
fi

# 4. Update adapter interfaces if needed
echo "🔧 Updating adapter interfaces..."
npm run update:adapters

# 5. Run comprehensive test suite
echo "🧪 Running test suite..."
npm run test:all

if [ $? -ne 0 ]; then
    echo "❌ Tests failed. Please review and fix issues."
    exit 1
fi

# 6. Generate upgrade report
echo "📊 Generating upgrade report..."
npm run generate:upgrade-report

echo "✅ Upgrade completed successfully!"
echo "📋 Review the upgrade report and test thoroughly before merging."
```

### Compatibility Checking

```typescript
// scripts/check-compatibility.ts
import { readFileSync } from 'fs';
import { join } from 'path';

interface CompatibilityCheck {
  betterAuthVersion: string;
  adaptersCompatible: boolean;
  pluginsCompatible: boolean;
  typesCompatible: boolean;
  issues: string[];
}

export async function checkCompatibility(): Promise<CompatibilityCheck> {
  const result: CompatibilityCheck = {
    betterAuthVersion: getBetterAuthVersion(),
    adaptersCompatible: true,
    pluginsCompatible: true,
    typesCompatible: true,
    issues: []
  };
  
  // Check adapter compatibility
  const adapterCompatibility = await checkAdapterCompatibility(result.betterAuthVersion);
  if (!adapterCompatibility.compatible) {
    result.adaptersCompatible = false;
    result.issues.push(...adapterCompatibility.issues);
  }
  
  // Check plugin compatibility
  const pluginCompatibility = await checkPluginCompatibility(result.betterAuthVersion);
  if (!pluginCompatibility.compatible) {
    result.pluginsCompatible = false;
    result.issues.push(...pluginCompatibility.issues);
  }
  
  // Check type compatibility
  const typeCompatibility = await checkTypeCompatibility(result.betterAuthVersion);
  if (!typeCompatibility.compatible) {
    result.typesCompatible = false;
    result.issues.push(...typeCompatibility.issues);
  }
  
  return result;
}

function getBetterAuthVersion(): string {
  const packagePath = join(__dirname, '../better-auth/package.json');
  const packageJson = JSON.parse(readFileSync(packagePath, 'utf-8'));
  return packageJson.version;
}
```

This modular architecture ensures that CF-Better-Auth can evolve independently while leveraging the robust foundation of better-auth. The adapter pattern provides the flexibility to extend functionality while maintaining upgrade safety and backward compatibility.
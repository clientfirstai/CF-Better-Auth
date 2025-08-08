# Adapter Patterns Guide

## Overview

The CF-Better-Auth platform uses the Adapter pattern to provide a stable interface layer over the better-auth library, ensuring compatibility and extensibility as the underlying library evolves.

## Core Adapter Architecture

### BetterAuthAdapter (`@cf-auth/core`)

The main adapter class that wraps better-auth functionality:

```typescript
import { BetterAuthAdapter } from '@cf-auth/core';

const adapter = new BetterAuthAdapter({
  database: {
    provider: 'postgresql',
    connectionString: process.env.DATABASE_URL
  }
});

await adapter.initialize();
```

### Key Components

1. **Configuration Merger** - Combines default, environment, and custom configurations
2. **Compatibility Layer** - Transforms configurations for different better-auth versions
3. **Plugin Adapter** - Wraps better-auth plugins with our interface
4. **Extension Points** - Allows custom functionality injection

## Plugin Adapter Pattern

### Structure

```typescript
export interface Plugin {
  name: string;
  version?: string;
  init: (auth: BetterAuthInstance) => void | Promise<void>;
  dependencies?: string[];
  config?: any;
}

export interface PluginAdapter {
  name: string;
  fromBetterAuth: (plugin: any) => Plugin;
  toBetterAuth: (plugin: Plugin) => any;
}
```

### Usage Example

```typescript
import { PluginManager } from '@cf-auth/plugins';

const pluginManager = new PluginManager();

// Register a custom adapter
pluginManager.registerAdapter({
  name: 'custom-oauth',
  fromBetterAuth: (plugin) => ({
    name: 'custom-oauth',
    init: plugin.init,
    config: plugin.config
  }),
  toBetterAuth: (plugin) => ({
    init: plugin.init,
    config: plugin.config
  })
});

// Load and use plugin
const plugin = await pluginManager.loadPlugin('custom-oauth', config);
await pluginManager.initializePlugin(plugin, authInstance);
```

## Configuration Adapter Pattern

### Multi-Source Configuration

The configuration system loads from multiple sources with priority ordering:

1. Environment variables (highest priority)
2. cf-auth.config.js file
3. Package.json cf-auth section
4. Default configuration (lowest priority)

### Example Usage

```typescript
import { ConfigLoader } from '@cf-auth/config';

const loader = new ConfigLoader();

// Add custom configuration source
loader.addSource({
  name: 'database-config',
  priority: 50,
  loader: async () => ({
    database: await loadDatabaseConfig()
  })
});

const config = await loader.load();
```

## Compatibility Layer

### Version Management

The compatibility layer handles differences between better-auth versions:

```typescript
import { getCompatibilityLayer } from '@cf-auth/core';

const compatibility = getCompatibilityLayer();

// Transform config for current better-auth version
const transformedConfig = compatibility.transformConfig(userConfig);

// Wrap better-auth module with compatibility layer
const BetterAuth = compatibility.wrapModule(betterAuthModule);
```

### Breaking Changes Handling

The adapter automatically detects and handles breaking changes:

- Configuration schema changes
- API method signature changes
- Plugin interface modifications
- Event system updates

## Best Practices

### Adapter Development

1. **Interface Stability** - Always maintain backward compatibility
2. **Error Handling** - Wrap all better-auth calls with proper error handling
3. **Type Safety** - Maintain strict TypeScript types
4. **Testing** - Write comprehensive tests for all adapter functionality

### Configuration Management

1. **Environment Separation** - Use different configs for dev/staging/production
2. **Secret Management** - Never commit secrets to version control
3. **Validation** - Always validate configuration before use
4. **Documentation** - Document all configuration options

### Plugin Development

1. **Dependency Declaration** - Always declare plugin dependencies
2. **Graceful Degradation** - Handle missing dependencies gracefully
3. **Resource Cleanup** - Properly cleanup resources in plugin lifecycle
4. **Version Compatibility** - Test with multiple better-auth versions

## Migration Guide

When better-auth releases breaking changes:

1. **Update Compatibility Layer** - Modify compatibility transformations
2. **Test Thoroughly** - Run compatibility matrix tests
3. **Update Documentation** - Document any new requirements
4. **Gradual Rollout** - Use feature flags for gradual rollout

## Troubleshooting

### Common Issues

1. **Plugin Not Loading** - Check plugin name and registration
2. **Configuration Conflicts** - Verify source priorities
3. **Compatibility Issues** - Check better-auth version compatibility
4. **Type Errors** - Ensure all types are properly imported

### Debug Mode

Enable debug logging:

```typescript
const adapter = new BetterAuthAdapter({
  debug: true,
  logLevel: 'debug'
});
```

This will provide detailed information about adapter operations and help identify issues.
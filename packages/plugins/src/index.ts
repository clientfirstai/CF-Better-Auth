/**
 * CF-Better-Auth Plugins Package
 * Comprehensive plugin system with built-in plugins and extensibility framework
 */

// Core plugin system exports
export * from './types';
export * from './constants';
export * from './errors';
export * from './utils';

// Plugin system components
export * from './plugin-manager';
export * from './plugin-registry';
export * from './plugin-loader';
export * from './plugin-validator';
export * from './plugin-context';
export * from './plugin-builder';

// Plugin system infrastructure
export * from './hooks';
export * from './middleware';
export * from './events';

// Built-in plugins
export * from './plugins/session-manager';
export * from './plugins/rate-limiter';
export * from './plugins/audit-logger';
export * from './plugins/mfa';

// Plugin builder factory functions
export {
  createPluginBuilder,
  createServerPlugin,
  createClientPlugin,
  createUniversalPlugin,
  createAdapterPlugin,
  createMiddlewarePlugin,
  createAuthProviderPlugin,
  createDatabasePlugin,
  createUIComponentPlugin,
  createExtensionPlugin,
} from './plugin-builder';

// Plugin system factory functions
export { createPluginManager } from './plugin-manager';
export { createPluginRegistry } from './plugin-registry';
export { createPluginLoader } from './plugin-loader';
export { createPluginValidator } from './plugin-validator';
export { createPluginContextFactory } from './plugin-context';
export { createHookSystem } from './hooks';
export { createMiddlewareSystem } from './middleware';
export { createEventSystem } from './events';

// Built-in plugin factory functions
export { createSessionManagerPlugin } from './plugins/session-manager';
export { createRateLimiterPlugin } from './plugins/rate-limiter';
export { createAuditLoggerPlugin } from './plugins/audit-logger';
export { createMFAPlugin } from './plugins/mfa';

// Default plugin instances
import sessionManagerPlugin from './plugins/session-manager';
import rateLimiterPlugin from './plugins/rate-limiter';
import auditLoggerPlugin from './plugins/audit-logger';
import mfaPlugin from './plugins/mfa';

export const defaultPlugins = {
  sessionManager: sessionManagerPlugin,
  rateLimiter: rateLimiterPlugin,
  auditLogger: auditLoggerPlugin,
  mfa: mfaPlugin,
};

// Plugin collections
export const securityPlugins = [
  rateLimiterPlugin,
  auditLoggerPlugin,
  mfaPlugin,
];

export const managementPlugins = [
  sessionManagerPlugin,
  auditLoggerPlugin,
];

// Main plugin manager instance factory
export function createCFBetterAuthPluginSystem(options?: {
  enableDefaultPlugins?: boolean;
  pluginConfig?: Record<string, any>;
}) {
  const { createPluginManager } = require('./plugin-manager');
  const { createPluginRegistry } = require('./plugin-registry');
  const { createPluginContextFactory } = require('./plugin-context');
  const { createPluginValidator } = require('./plugin-validator');
  const { createPluginLoader } = require('./plugin-loader');
  const { createHookSystem } = require('./hooks');
  const { createMiddlewareSystem } = require('./middleware');
  const { createEventSystem } = require('./events');

  const registry = createPluginRegistry();
  const contextFactory = createPluginContextFactory();
  const validator = createPluginValidator();
  const loader = createPluginLoader();
  const hookSystem = createHookSystem();
  const middlewareSystem = createMiddlewareSystem();
  const eventSystem = createEventSystem();

  const manager = createPluginManager({
    registry,
    contextFactory,
    validator,
    loader,
    hookSystem,
  });

  // Register default plugins if enabled
  if (options?.enableDefaultPlugins !== false) {
    const pluginsToRegister = [
      sessionManagerPlugin,
      rateLimiterPlugin,
      auditLoggerPlugin,
      mfaPlugin,
    ];

    // Register plugins (this would typically be done after initialization)
    pluginsToRegister.forEach(async plugin => {
      try {
        await manager.register(plugin);
      } catch (error) {
        console.warn(`Failed to register default plugin ${plugin.id}:`, error);
      }
    });
  }

  return {
    manager,
    registry,
    contextFactory,
    validator,
    loader,
    hookSystem,
    middlewareSystem,
    eventSystem,
  };
}

// Re-export types from @cf-auth/types for convenience
export type {
  BasePlugin,
  ServerPlugin,
  ClientPlugin,
  PluginContext,
  PluginRegistry,
  PluginBuilder,
  PluginManifest,
  PluginType,
  PluginStatus,
  PluginPriority,
  PluginLifecycle,
  ServerPluginHooks,
  ClientPluginHooks,
  ServerPluginMiddleware,
  ServerPluginRoute,
  ClientPluginComponent,
  ValidationResult,
  PluginFilter,
} from '@cf-auth/types';
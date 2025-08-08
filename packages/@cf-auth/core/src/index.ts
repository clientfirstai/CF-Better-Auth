/**
 * @cf-auth/core
 * Core adapter layer for CF-Better-Auth
 * Provides compatibility and extensibility over better-auth
 */

export { BetterAuthAdapter } from './adapter';
export { AuthWrapper } from './auth-wrapper';
export { ConfigurationManager } from './config';
export { CompatibilityLayer } from './compatibility';
export { MiddlewareStack } from './middleware';
export { ExtensionManager } from './extensions';
export { PluginAdapter } from './plugin-adapter';

export type {
  AdapterConfig,
  AdapterOptions,
  AdapterInstance,
  CompatibilityConfig,
  ExtensionConfig,
  MiddlewareConfig,
  PluginConfig,
} from './types';

export {
  createAdapter,
  createAuthInstance,
  getCompatibilityLayer,
  mergeConfigurations,
} from './utils';

export { version } from './version';
/**
 * Plugin Context Factory for CF-Better-Auth
 * Creates and manages plugin execution contexts
 */

import { EventEmitter } from 'eventemitter3';
import { createLogger, Logger } from '@cf-auth/utils';
import type {
  BasePlugin,
  PluginContext,
  PluginLogger,
  PluginStorage,
  PluginEventEmitter,
  PluginUtils,
  AuthInstance,
  DatabaseConnection
} from '@cf-auth/types';

import type { PluginContextFactory as IPluginContextFactory } from './types';
import { PluginError } from './errors';
import { mergeConfig, generatePluginId } from './utils';

/**
 * Plugin Context Implementation
 */
class PluginContextImpl implements PluginContext {
  public readonly config: Record<string, any>;
  public readonly logger: PluginLogger;
  public readonly registry: any; // Will be injected
  public readonly storage: PluginStorage;
  public readonly events: PluginEventEmitter;
  public readonly utils: PluginUtils;
  public readonly auth: AuthInstance;
  public readonly database?: DatabaseConnection;
  public readonly env: Record<string, string>;
  public readonly metadata: Record<string, any>;

  constructor(
    plugin: BasePlugin,
    options: PluginContextOptions = {}
  ) {
    this.config = mergeConfig(plugin.defaultConfig || {}, options.config || {});
    this.logger = this.createLogger(plugin);
    this.registry = options.registry;
    this.storage = this.createStorage(plugin);
    this.events = this.createEventEmitter(plugin);
    this.utils = this.createUtils(plugin);
    this.auth = options.auth!;
    this.database = options.database;
    this.env = { ...process.env, ...options.env };
    this.metadata = { ...plugin.metadata, ...options.metadata };
  }

  /**
   * Create plugin logger
   */
  private createLogger(plugin: BasePlugin): PluginLogger {
    const baseLogger = createLogger(`plugin:${plugin.id}`);
    
    return {
      debug: (message: string, ...args: any[]) => baseLogger.debug(message, ...args),
      info: (message: string, ...args: any[]) => baseLogger.info(message, ...args),
      warn: (message: string, ...args: any[]) => baseLogger.warn(message, ...args),
      error: (message: string, ...args: any[]) => baseLogger.error(message, ...args),
      trace: (message: string, ...args: any[]) => baseLogger.trace?.(message, ...args),
      child: (metadata: Record<string, any>) => {
        const childLogger = baseLogger.child?.(metadata) || baseLogger;
        return {
          debug: (message: string, ...args: any[]) => childLogger.debug(message, ...args),
          info: (message: string, ...args: any[]) => childLogger.info(message, ...args),
          warn: (message: string, ...args: any[]) => childLogger.warn(message, ...args),
          error: (message: string, ...args: any[]) => childLogger.error(message, ...args),
          trace: (message: string, ...args: any[]) => childLogger.trace?.(message, ...args),
          child: (childMeta: Record<string, any>) => this.createLogger(plugin).child({ ...metadata, ...childMeta }),
        };
      },
    };
  }

  /**
   * Create plugin storage
   */
  private createStorage(plugin: BasePlugin): PluginStorage {
    const storageMap = new Map<string, any>();
    const ttlMap = new Map<string, number>();

    return {
      async get<T = any>(key: string): Promise<T | null> {
        const fullKey = `plugin:${plugin.id}:${key}`;
        
        // Check TTL
        const ttl = ttlMap.get(fullKey);
        if (ttl && Date.now() > ttl) {
          storageMap.delete(fullKey);
          ttlMap.delete(fullKey);
          return null;
        }
        
        return storageMap.get(fullKey) || null;
      },

      async set<T = any>(key: string, value: T, ttl?: number): Promise<void> {
        const fullKey = `plugin:${plugin.id}:${key}`;
        storageMap.set(fullKey, value);
        
        if (ttl) {
          ttlMap.set(fullKey, Date.now() + ttl);
        }
      },

      async delete(key: string): Promise<void> {
        const fullKey = `plugin:${plugin.id}:${key}`;
        storageMap.delete(fullKey);
        ttlMap.delete(fullKey);
      },

      async exists(key: string): Promise<boolean> {
        const fullKey = `plugin:${plugin.id}:${key}`;
        
        // Check TTL
        const ttl = ttlMap.get(fullKey);
        if (ttl && Date.now() > ttl) {
          storageMap.delete(fullKey);
          ttlMap.delete(fullKey);
          return false;
        }
        
        return storageMap.has(fullKey);
      },

      async keys(pattern?: string): Promise<string[]> {
        const prefix = `plugin:${plugin.id}:`;
        const keys = Array.from(storageMap.keys())
          .filter(key => key.startsWith(prefix))
          .map(key => key.substring(prefix.length));
        
        if (pattern) {
          const regex = new RegExp(pattern.replace(/\*/g, '.*'));
          return keys.filter(key => regex.test(key));
        }
        
        return keys;
      },

      async clear(): Promise<void> {
        const prefix = `plugin:${plugin.id}:`;
        const keysToDelete = Array.from(storageMap.keys()).filter(key => key.startsWith(prefix));
        
        keysToDelete.forEach(key => {
          storageMap.delete(key);
          ttlMap.delete(key);
        });
      },
    };
  }

  /**
   * Create plugin event emitter
   */
  private createEventEmitter(plugin: BasePlugin): PluginEventEmitter {
    const emitter = new EventEmitter();
    const namespace = `plugin:${plugin.id}`;

    return {
      on<T = any>(event: string, handler: (data: T) => void): void {
        emitter.on(`${namespace}:${event}`, handler);
      },

      off<T = any>(event: string, handler: (data: T) => void): void {
        emitter.off(`${namespace}:${event}`, handler);
      },

      once<T = any>(event: string, handler: (data: T) => void): void {
        emitter.once(`${namespace}:${event}`, handler);
      },

      async emit<T = any>(event: string, data?: T): Promise<void> {
        emitter.emit(`${namespace}:${event}`, data);
      },

      listenerCount(event: string): number {
        return emitter.listenerCount(`${namespace}:${event}`);
      },

      removeAllListeners(event?: string): void {
        if (event) {
          emitter.removeAllListeners(`${namespace}:${event}`);
        } else {
          // Remove all listeners for this plugin's namespace
          emitter.eventNames().forEach(eventName => {
            if (typeof eventName === 'string' && eventName.startsWith(`${namespace}:`)) {
              emitter.removeAllListeners(eventName);
            }
          });
        }
      },
    };
  }

  /**
   * Create plugin utilities
   */
  private createUtils(plugin: BasePlugin): PluginUtils {
    return {
      generateId: () => generatePluginId(),
      
      hash: (data: string | Buffer) => {
        // Implementation would use crypto module
        return Buffer.from(data).toString('base64');
      },
      
      encrypt: (data: string, key?: string) => {
        // Implementation would use encryption
        return Buffer.from(data).toString('base64');
      },
      
      decrypt: (data: string, key?: string) => {
        // Implementation would use decryption
        return Buffer.from(data, 'base64').toString();
      },
      
      validateConfig: (config: any, schema: any) => {
        // Implementation would use schema validation
        return { valid: true };
      },
      
      parseJWT: (token: string) => {
        // Implementation would use JWT library
        const [header, payload] = token.split('.');
        return JSON.parse(Buffer.from(payload, 'base64').toString());
      },
      
      generateJWT: (payload: any, options?: any) => {
        // Implementation would use JWT library
        const header = Buffer.from(JSON.stringify({ alg: 'HS256', typ: 'JWT' })).toString('base64');
        const encodedPayload = Buffer.from(JSON.stringify(payload)).toString('base64');
        return `${header}.${encodedPayload}.signature`;
      },
      
      http: this.createHttpClient(plugin),
      fs: this.createFileSystem(plugin),
      path: this.createPathUtils(),
    };
  }

  /**
   * Create HTTP client for plugin
   */
  private createHttpClient(plugin: BasePlugin): any {
    return {
      async get<T = any>(url: string, options?: any): Promise<any> {
        // Implementation would use HTTP client
        throw new PluginError('HTTP client not implemented');
      },
      
      async post<T = any>(url: string, data?: any, options?: any): Promise<any> {
        throw new PluginError('HTTP client not implemented');
      },
      
      async put<T = any>(url: string, data?: any, options?: any): Promise<any> {
        throw new PluginError('HTTP client not implemented');
      },
      
      async patch<T = any>(url: string, data?: any, options?: any): Promise<any> {
        throw new PluginError('HTTP client not implemented');
      },
      
      async delete<T = any>(url: string, options?: any): Promise<any> {
        throw new PluginError('HTTP client not implemented');
      },
      
      async request<T = any>(options: any): Promise<any> {
        throw new PluginError('HTTP client not implemented');
      },
    };
  }

  /**
   * Create file system utilities
   */
  private createFileSystem(plugin: BasePlugin): any {
    return {
      async readFile(path: string, encoding?: string): Promise<string | Buffer> {
        throw new PluginError('File system access not implemented');
      },
      
      async writeFile(path: string, data: string | Buffer): Promise<void> {
        throw new PluginError('File system access not implemented');
      },
      
      async exists(path: string): Promise<boolean> {
        throw new PluginError('File system access not implemented');
      },
      
      async mkdir(path: string, options?: any): Promise<void> {
        throw new PluginError('File system access not implemented');
      },
      
      async readdir(path: string): Promise<string[]> {
        throw new PluginError('File system access not implemented');
      },
      
      async stat(path: string): Promise<any> {
        throw new PluginError('File system access not implemented');
      },
      
      async unlink(path: string): Promise<void> {
        throw new PluginError('File system access not implemented');
      },
      
      async rmdir(path: string, options?: any): Promise<void> {
        throw new PluginError('File system access not implemented');
      },
    };
  }

  /**
   * Create path utilities
   */
  private createPathUtils(): any {
    // This would typically use Node.js path module
    return {
      join: (...paths: string[]) => paths.join('/'),
      resolve: (...paths: string[]) => paths.join('/'),
      relative: (from: string, to: string) => to,
      dirname: (path: string) => path.split('/').slice(0, -1).join('/'),
      basename: (path: string, ext?: string) => {
        const base = path.split('/').pop() || '';
        return ext && base.endsWith(ext) ? base.slice(0, -ext.length) : base;
      },
      extname: (path: string) => {
        const base = path.split('/').pop() || '';
        const lastDot = base.lastIndexOf('.');
        return lastDot > 0 ? base.slice(lastDot) : '';
      },
      isAbsolute: (path: string) => path.startsWith('/'),
      normalize: (path: string) => path,
    };
  }
}

/**
 * Plugin Context Factory Implementation
 */
export class PluginContextFactory implements IPluginContextFactory {
  private contexts = new Map<string, PluginContext>();
  private globalOptions: PluginContextOptions = {};

  /**
   * Initialize the context factory
   */
  async initialize(options: PluginContextOptions = {}): Promise<void> {
    this.globalOptions = { ...this.globalOptions, ...options };
  }

  /**
   * Create plugin context
   */
  createContext(plugin: BasePlugin, config?: Record<string, any>): PluginContext {
    if (this.contexts.has(plugin.id)) {
      throw new PluginError(`Context already exists for plugin: ${plugin.id}`);
    }

    const contextOptions: PluginContextOptions = {
      ...this.globalOptions,
      config: { ...this.globalOptions.config, ...config },
    };

    const context = new PluginContextImpl(plugin, contextOptions);
    this.contexts.set(plugin.id, context);
    
    return context;
  }

  /**
   * Update plugin context
   */
  updateContext(pluginId: string, updates: Partial<PluginContext>): void {
    const context = this.contexts.get(pluginId);
    if (!context) {
      throw new PluginError(`Context not found for plugin: ${pluginId}`);
    }

    // Update context properties (limited to what can be safely updated)
    Object.assign(context, updates);
  }

  /**
   * Get plugin context
   */
  getContext(pluginId: string): PluginContext | null {
    return this.contexts.get(pluginId) || null;
  }

  /**
   * Destroy plugin context
   */
  destroyContext(pluginId: string): void {
    const context = this.contexts.get(pluginId);
    if (context) {
      // Clean up context resources
      if (context.events) {
        context.events.removeAllListeners();
      }
      
      if (context.storage) {
        context.storage.clear();
      }
      
      this.contexts.delete(pluginId);
    }
  }

  /**
   * Set global context options
   */
  setGlobalOptions(options: PluginContextOptions): void {
    this.globalOptions = { ...this.globalOptions, ...options };
  }

  /**
   * Get all contexts
   */
  getAllContexts(): Map<string, PluginContext> {
    return new Map(this.contexts);
  }

  /**
   * Clear all contexts
   */
  clearAllContexts(): void {
    const pluginIds = Array.from(this.contexts.keys());
    pluginIds.forEach(pluginId => this.destroyContext(pluginId));
  }
}

/**
 * Plugin context options
 */
export interface PluginContextOptions {
  config?: Record<string, any>;
  registry?: any;
  auth?: AuthInstance;
  database?: DatabaseConnection;
  env?: Record<string, string>;
  metadata?: Record<string, any>;
}

/**
 * Create plugin context factory
 */
export function createPluginContextFactory(options?: PluginContextOptions): IPluginContextFactory {
  const factory = new PluginContextFactory();
  if (options) {
    factory.setGlobalOptions(options);
  }
  return factory;
}
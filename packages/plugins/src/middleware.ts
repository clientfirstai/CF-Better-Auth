/**
 * Plugin Middleware System for CF-Better-Auth
 * Manages plugin middleware registration and execution
 */

import { EventEmitter } from 'eventemitter3';
import type {
  BasePlugin,
  ServerPluginMiddleware,
  PluginContext,
  PluginRegistry,
  ApiRequest,
  ApiResponseBase
} from '@cf-auth/types';

import {
  PluginError,
  PluginHookError,
  createPluginError,
  PluginErrorHandler
} from './errors';

import {
  PLUGIN_EVENTS,
  PLUGIN_STATUS,
  PLUGIN_PRIORITY_VALUES
} from './constants';

import {
  sortPluginsByPriority,
  withTimeout
} from './utils';

/**
 * Middleware execution context
 */
export interface MiddlewareExecutionContext {
  pluginId: string;
  middlewareName: string;
  path: string;
  method: string;
  context: PluginContext;
  timestamp: Date;
  executionTime?: number;
}

/**
 * Middleware handler function
 */
export type MiddlewareHandler = (
  req: ApiRequest,
  res: ApiResponseBase,
  next: () => void
) => Promise<void> | void;

/**
 * Registered middleware info
 */
interface MiddlewareRegistration {
  pluginId: string;
  middleware: ServerPluginMiddleware;
  priority: number;
  enabled: boolean;
}

/**
 * Middleware execution result
 */
interface MiddlewareExecutionResult {
  success: boolean;
  error?: Error;
  executionTime: number;
  pluginId: string;
  middlewareName: string;
}

/**
 * Plugin Middleware System Implementation
 */
export class PluginMiddlewareSystem extends EventEmitter {
  private middleware = new Map<string, MiddlewareRegistration[]>();
  private globalMiddleware: MiddlewareRegistration[] = [];
  private middlewareStats = new Map<string, MiddlewareStats>();
  private errorHandler: PluginErrorHandler;
  private registry?: PluginRegistry;
  private contextGetter?: (pluginId: string) => PluginContext | null;

  constructor() {
    super();
    this.errorHandler = PluginErrorHandler.getInstance();
  }

  /**
   * Initialize the middleware system
   */
  async initialize(options: MiddlewareSystemOptions = {}): Promise<void> {
    this.registry = options.registry;
    this.contextGetter = options.contextGetter;

    this.emit('middleware:initialized');
  }

  /**
   * Register middleware for a plugin
   */
  registerMiddleware(pluginId: string, middleware: ServerPluginMiddleware[]): void {
    try {
      const plugin = this.registry?.get(pluginId);
      if (!plugin) {
        throw new PluginError(`Plugin ${pluginId} not found`);
      }

      const priority = PLUGIN_PRIORITY_VALUES[plugin.priority || 'normal'];

      middleware.forEach(mw => {
        const registration: MiddlewareRegistration = {
          pluginId,
          middleware: mw,
          priority: mw.priority ? PLUGIN_PRIORITY_VALUES[mw.priority] : priority,
          enabled: true,
        };

        this.addMiddlewareRegistration(registration);
        
        // Initialize stats
        this.initializeMiddlewareStats(mw.name, pluginId);

        this.emit(PLUGIN_EVENTS.MIDDLEWARE_REGISTERED, {
          pluginId,
          middlewareName: mw.name,
          path: mw.path,
        });
      });

    } catch (error) {
      const middlewareError = createPluginError(error, pluginId, 'registerMiddleware');
      this.errorHandler.handleError(middlewareError);
      throw middlewareError;
    }
  }

  /**
   * Unregister middleware for a plugin
   */
  unregisterMiddleware(pluginId: string, middlewareName?: string): void {
    try {
      if (middlewareName) {
        // Unregister specific middleware
        this.removeMiddlewareRegistration(pluginId, middlewareName);
      } else {
        // Unregister all middleware for plugin
        this.removeAllMiddlewareForPlugin(pluginId);
      }

      this.emit(PLUGIN_EVENTS.MIDDLEWARE_UNREGISTERED, {
        pluginId,
        middlewareName,
      });

    } catch (error) {
      const middlewareError = createPluginError(error, pluginId, 'unregisterMiddleware');
      this.errorHandler.handleError(middlewareError);
    }
  }

  /**
   * Get middleware for a specific path and method
   */
  getMiddleware(path: string, method: string): MiddlewareHandler[] {
    const matchingMiddleware: MiddlewareRegistration[] = [];

    // Add global middleware
    matchingMiddleware.push(...this.getActiveGlobalMiddleware());

    // Add path-specific middleware
    for (const [pattern, registrations] of this.middleware.entries()) {
      if (this.pathMatches(path, pattern)) {
        const activeMiddleware = registrations.filter(reg => 
          this.isMiddlewareActive(reg) &&
          this.methodMatches(method, reg.middleware.methods)
        );
        matchingMiddleware.push(...activeMiddleware);
      }
    }

    // Sort by priority (higher priority first)
    matchingMiddleware.sort((a, b) => b.priority - a.priority);

    // Convert to handler functions
    return matchingMiddleware.map(reg => this.wrapMiddlewareHandler(reg));
  }

  /**
   * Execute middleware chain
   */
  async executeMiddleware(
    middleware: MiddlewareHandler[],
    req: ApiRequest,
    res: ApiResponseBase
  ): Promise<void> {
    if (middleware.length === 0) {
      return;
    }

    let currentIndex = 0;

    const next = async (): Promise<void> => {
      if (currentIndex >= middleware.length) {
        return;
      }

      const handler = middleware[currentIndex++];
      await handler(req, res, next);
    };

    try {
      await next();
    } catch (error) {
      const middlewareError = createPluginError(error, undefined, 'executeMiddleware');
      this.errorHandler.handleError(middlewareError);
      throw middlewareError;
    }
  }

  /**
   * Get middleware statistics
   */
  getMiddlewareStats(middlewareName?: string): MiddlewareStats | Map<string, MiddlewareStats> {
    if (middlewareName) {
      return this.middlewareStats.get(middlewareName) || this.createEmptyStats(middlewareName);
    }
    return new Map(this.middlewareStats);
  }

  /**
   * Enable/disable middleware
   */
  setMiddlewareEnabled(pluginId: string, middlewareName: string, enabled: boolean): void {
    // Update global middleware
    const globalReg = this.globalMiddleware.find(reg => 
      reg.pluginId === pluginId && reg.middleware.name === middlewareName
    );
    if (globalReg) {
      globalReg.enabled = enabled;
    }

    // Update path-specific middleware
    for (const registrations of this.middleware.values()) {
      const reg = registrations.find(r => 
        r.pluginId === pluginId && r.middleware.name === middlewareName
      );
      if (reg) {
        reg.enabled = enabled;
      }
    }

    this.emit(enabled ? 'middleware:enabled' : 'middleware:disabled', {
      pluginId,
      middlewareName,
    });
  }

  /**
   * Clear all middleware
   */
  clearAllMiddleware(): void {
    this.middleware.clear();
    this.globalMiddleware.length = 0;
    this.middlewareStats.clear();
    this.emit('middleware:cleared');
  }

  /**
   * Register plugin middleware from plugin definition
   */
  registerPluginMiddleware(plugin: BasePlugin): void {
    if (!plugin.middleware || plugin.middleware.length === 0) {
      return;
    }

    this.registerMiddleware(plugin.id, plugin.middleware);
  }

  /**
   * Unregister all middleware for a plugin
   */
  unregisterPluginMiddleware(pluginId: string): void {
    this.unregisterMiddleware(pluginId);
  }

  /**
   * Add middleware registration
   */
  private addMiddlewareRegistration(registration: MiddlewareRegistration): void {
    const middleware = registration.middleware;

    if (!middleware.path) {
      // Global middleware
      this.globalMiddleware.push(registration);
      this.globalMiddleware.sort((a, b) => b.priority - a.priority);
    } else {
      // Path-specific middleware
      const pathPattern = this.normalizePathPattern(middleware.path);
      
      if (!this.middleware.has(pathPattern)) {
        this.middleware.set(pathPattern, []);
      }

      const pathMiddleware = this.middleware.get(pathPattern)!;
      pathMiddleware.push(registration);
      pathMiddleware.sort((a, b) => b.priority - a.priority);
    }
  }

  /**
   * Remove middleware registration
   */
  private removeMiddlewareRegistration(pluginId: string, middlewareName: string): void {
    // Remove from global middleware
    const globalIndex = this.globalMiddleware.findIndex(reg =>
      reg.pluginId === pluginId && reg.middleware.name === middlewareName
    );
    if (globalIndex >= 0) {
      this.globalMiddleware.splice(globalIndex, 1);
    }

    // Remove from path-specific middleware
    for (const [pattern, registrations] of this.middleware.entries()) {
      const index = registrations.findIndex(reg =>
        reg.pluginId === pluginId && reg.middleware.name === middlewareName
      );
      if (index >= 0) {
        registrations.splice(index, 1);
        if (registrations.length === 0) {
          this.middleware.delete(pattern);
        }
      }
    }
  }

  /**
   * Remove all middleware for a plugin
   */
  private removeAllMiddlewareForPlugin(pluginId: string): void {
    // Remove from global middleware
    for (let i = this.globalMiddleware.length - 1; i >= 0; i--) {
      if (this.globalMiddleware[i].pluginId === pluginId) {
        this.globalMiddleware.splice(i, 1);
      }
    }

    // Remove from path-specific middleware
    for (const [pattern, registrations] of this.middleware.entries()) {
      for (let i = registrations.length - 1; i >= 0; i--) {
        if (registrations[i].pluginId === pluginId) {
          registrations.splice(i, 1);
        }
      }
      if (registrations.length === 0) {
        this.middleware.delete(pattern);
      }
    }
  }

  /**
   * Get active global middleware
   */
  private getActiveGlobalMiddleware(): MiddlewareRegistration[] {
    return this.globalMiddleware.filter(reg => this.isMiddlewareActive(reg));
  }

  /**
   * Check if middleware is active
   */
  private isMiddlewareActive(registration: MiddlewareRegistration): boolean {
    if (!registration.enabled) {
      return false;
    }

    if (this.registry) {
      const plugin = this.registry.get(registration.pluginId);
      return plugin && this.registry.getStatus(registration.pluginId) === PLUGIN_STATUS.ACTIVE;
    }

    return true;
  }

  /**
   * Check if path matches pattern
   */
  private pathMatches(path: string, pattern: string | RegExp): boolean {
    if (typeof pattern === 'string') {
      // Simple string matching with wildcards
      const regexPattern = pattern
        .replace(/\*/g, '.*')
        .replace(/\?/g, '.');
      const regex = new RegExp(`^${regexPattern}$`);
      return regex.test(path);
    }

    if (pattern instanceof RegExp) {
      return pattern.test(path);
    }

    return false;
  }

  /**
   * Check if method matches allowed methods
   */
  private methodMatches(method: string, allowedMethods?: string[]): boolean {
    if (!allowedMethods || allowedMethods.length === 0) {
      return true; // Allow all methods if none specified
    }

    return allowedMethods.includes(method.toUpperCase());
  }

  /**
   * Normalize path pattern
   */
  private normalizePathPattern(pattern: string | RegExp): string {
    if (typeof pattern === 'string') {
      return pattern;
    }
    return pattern.toString();
  }

  /**
   * Wrap middleware handler with error handling and stats
   */
  private wrapMiddlewareHandler(registration: MiddlewareRegistration): MiddlewareHandler {
    return async (req: ApiRequest, res: ApiResponseBase, next: () => void): Promise<void> => {
      const startTime = Date.now();
      const context = this.getPluginContext(registration.pluginId);
      
      if (!context) {
        console.warn(`No context found for plugin ${registration.pluginId}, skipping middleware`);
        return next();
      }

      const executionContext: MiddlewareExecutionContext = {
        pluginId: registration.pluginId,
        middlewareName: registration.middleware.name,
        path: req.url || '/',
        method: req.method || 'GET',
        context,
        timestamp: new Date(),
      };

      try {
        this.emit('middleware:before-execute', executionContext);

        // Execute middleware with timeout if needed
        await registration.middleware.handler(req, res, next);

        const executionTime = Date.now() - startTime;
        executionContext.executionTime = executionTime;

        // Update stats
        this.updateMiddlewareStats(registration.middleware.name, {
          success: true,
          executionTime,
          pluginId: registration.pluginId,
          middlewareName: registration.middleware.name,
        });

        this.emit('middleware:after-execute', executionContext);

      } catch (error) {
        const executionTime = Date.now() - startTime;
        
        const middlewareError = new PluginHookError(
          `Middleware '${registration.middleware.name}' failed: ${error.message}`,
          registration.middleware.name,
          registration.pluginId
        );

        // Update stats
        this.updateMiddlewareStats(registration.middleware.name, {
          success: false,
          error: middlewareError,
          executionTime,
          pluginId: registration.pluginId,
          middlewareName: registration.middleware.name,
        });

        this.errorHandler.handleError(middlewareError);
        this.emit('middleware:error', { ...executionContext, error: middlewareError });

        // Re-throw error to halt middleware chain
        throw middlewareError;
      }
    };
  }

  /**
   * Get plugin context
   */
  private getPluginContext(pluginId: string): PluginContext | null {
    if (this.contextGetter) {
      return this.contextGetter(pluginId);
    }
    return null;
  }

  /**
   * Initialize middleware statistics
   */
  private initializeMiddlewareStats(middlewareName: string, pluginId: string): void {
    if (!this.middlewareStats.has(middlewareName)) {
      this.middlewareStats.set(middlewareName, this.createEmptyStats(middlewareName));
    }

    const stats = this.middlewareStats.get(middlewareName)!;
    stats.registeredPlugins.add(pluginId);
  }

  /**
   * Update middleware statistics
   */
  private updateMiddlewareStats(middlewareName: string, result: MiddlewareExecutionResult): void {
    const stats = this.middlewareStats.get(middlewareName);
    if (!stats) return;

    stats.totalExecutions++;
    stats.lastExecution = new Date();

    if (result.success) {
      stats.successfulExecutions++;
    } else {
      stats.failedExecutions++;
    }

    // Update average execution time
    const currentAverage = stats.averageExecutionTime;
    const totalExecutions = stats.totalExecutions;
    stats.averageExecutionTime = ((currentAverage * (totalExecutions - 1)) + result.executionTime) / totalExecutions;
  }

  /**
   * Create empty statistics object
   */
  private createEmptyStats(middlewareName: string): MiddlewareStats {
    return {
      middlewareName,
      totalExecutions: 0,
      successfulExecutions: 0,
      failedExecutions: 0,
      averageExecutionTime: 0,
      lastExecution: null,
      registeredPlugins: new Set(),
    };
  }
}

/**
 * Middleware statistics
 */
export interface MiddlewareStats {
  middlewareName: string;
  totalExecutions: number;
  successfulExecutions: number;
  failedExecutions: number;
  averageExecutionTime: number;
  lastExecution: Date | null;
  registeredPlugins: Set<string>;
}

/**
 * Middleware system options
 */
export interface MiddlewareSystemOptions {
  registry?: PluginRegistry;
  contextGetter?: (pluginId: string) => PluginContext | null;
  enableStats?: boolean;
  defaultTimeout?: number;
}

/**
 * Create middleware system instance
 */
export function createMiddlewareSystem(options?: MiddlewareSystemOptions): PluginMiddlewareSystem {
  return new PluginMiddlewareSystem();
}
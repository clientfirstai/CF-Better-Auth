/**
 * Hook System for CF-Better-Auth Plugins
 * Manages hook registration, execution, and lifecycle
 */

import { EventEmitter } from 'eventemitter3';
import type {
  BasePlugin,
  ServerPluginHooks,
  ClientPluginHooks,
  PluginContext,
  PluginRegistry
} from '@cf-auth/types';

import {
  PluginError,
  PluginHookError,
  createPluginError,
  PluginErrorHandler
} from './errors';

import {
  BUILT_IN_HOOKS,
  PLUGIN_EVENTS,
  PLUGIN_STATUS
} from './constants';

import {
  sortPluginsByPriority,
  withTimeout,
  debounce
} from './utils';

/**
 * Hook execution context
 */
export interface HookExecutionContext {
  pluginId: string;
  hookName: string;
  data: any;
  originalData: any;
  context: PluginContext;
  timestamp: Date;
  executionTime?: number;
}

/**
 * Hook handler function
 */
export type HookHandler<T = any> = (data: T, context: PluginContext) => Promise<T> | T;

/**
 * Hook registration info
 */
interface HookRegistration {
  pluginId: string;
  hookName: string;
  handler: HookHandler;
  priority: number;
  timeout?: number;
  retries?: number;
  enabled: boolean;
}

/**
 * Hook execution result
 */
interface HookExecutionResult<T = any> {
  data: T;
  success: boolean;
  error?: Error;
  executionTime: number;
  pluginId: string;
}

/**
 * Hook System Implementation
 */
export class HookSystem extends EventEmitter {
  private hooks = new Map<string, HookRegistration[]>();
  private hookStats = new Map<string, HookStats>();
  private errorHandler: PluginErrorHandler;
  private registry?: PluginRegistry;
  private contextGetter?: (pluginId: string) => PluginContext | null;

  constructor() {
    super();
    this.errorHandler = PluginErrorHandler.getInstance();
  }

  /**
   * Initialize the hook system
   */
  async initialize(options: HookSystemOptions = {}): Promise<void> {
    this.registry = options.registry;
    this.contextGetter = options.contextGetter;

    // Initialize built-in hooks
    this.initializeBuiltInHooks();

    this.emit('hooks:initialized');
  }

  /**
   * Register hook for a plugin
   */
  registerHook<T = any>(
    pluginId: string,
    hookName: string,
    handler: HookHandler<T>,
    options: HookRegistrationOptions = {}
  ): void {
    try {
      const registration: HookRegistration = {
        pluginId,
        hookName,
        handler,
        priority: options.priority || 50,
        timeout: options.timeout,
        retries: options.retries || 0,
        enabled: options.enabled !== false,
      };

      // Get or create hook array
      if (!this.hooks.has(hookName)) {
        this.hooks.set(hookName, []);
      }

      const hookRegistrations = this.hooks.get(hookName)!;
      
      // Check if plugin already has a handler for this hook
      const existingIndex = hookRegistrations.findIndex(reg => reg.pluginId === pluginId);
      if (existingIndex >= 0) {
        // Replace existing registration
        hookRegistrations[existingIndex] = registration;
      } else {
        // Add new registration
        hookRegistrations.push(registration);
      }

      // Sort by priority (higher priority first)
      hookRegistrations.sort((a, b) => b.priority - a.priority);

      // Initialize stats if not exists
      if (!this.hookStats.has(hookName)) {
        this.hookStats.set(hookName, {
          hookName,
          totalExecutions: 0,
          successfulExecutions: 0,
          failedExecutions: 0,
          averageExecutionTime: 0,
          lastExecution: null,
          registeredPlugins: new Set(),
        });
      }

      const stats = this.hookStats.get(hookName)!;
      stats.registeredPlugins.add(pluginId);

      this.emit(PLUGIN_EVENTS.HOOK_REGISTERED, {
        pluginId,
        hookName,
        priority: registration.priority,
      });

    } catch (error) {
      const hookError = new PluginHookError(
        `Failed to register hook '${hookName}' for plugin '${pluginId}': ${error.message}`,
        hookName,
        pluginId
      );
      this.errorHandler.handleError(hookError);
      throw hookError;
    }
  }

  /**
   * Unregister hook for a plugin
   */
  unregisterHook(pluginId: string, hookName?: string): void {
    try {
      if (hookName) {
        // Unregister specific hook
        const hookRegistrations = this.hooks.get(hookName);
        if (hookRegistrations) {
          const index = hookRegistrations.findIndex(reg => reg.pluginId === pluginId);
          if (index >= 0) {
            hookRegistrations.splice(index, 1);
            
            // Update stats
            const stats = this.hookStats.get(hookName);
            if (stats) {
              stats.registeredPlugins.delete(pluginId);
            }

            this.emit(PLUGIN_EVENTS.HOOK_UNREGISTERED, { pluginId, hookName });
          }
        }
      } else {
        // Unregister all hooks for plugin
        for (const [hookName, registrations] of this.hooks.entries()) {
          const index = registrations.findIndex(reg => reg.pluginId === pluginId);
          if (index >= 0) {
            registrations.splice(index, 1);
            
            // Update stats
            const stats = this.hookStats.get(hookName);
            if (stats) {
              stats.registeredPlugins.delete(pluginId);
            }

            this.emit(PLUGIN_EVENTS.HOOK_UNREGISTERED, { pluginId, hookName });
          }
        }
      }
    } catch (error) {
      const hookError = new PluginHookError(
        `Failed to unregister hook(s) for plugin '${pluginId}': ${error.message}`,
        hookName || 'all',
        pluginId
      );
      this.errorHandler.handleError(hookError);
    }
  }

  /**
   * Execute hook with data
   */
  async executeHook<T = any>(hookName: string, data: T, pluginId?: string): Promise<T> {
    const startTime = Date.now();
    let currentData = data;
    const originalData = JSON.parse(JSON.stringify(data));

    try {
      this.emit(PLUGIN_EVENTS.HOOK_BEFORE_EXECUTE, {
        hookName,
        data: originalData,
        pluginId,
      });

      // Get hook registrations
      const registrations = this.getActiveRegistrations(hookName, pluginId);

      if (registrations.length === 0) {
        return currentData; // No hooks registered
      }

      // Execute hooks in priority order
      const results: HookExecutionResult<T>[] = [];
      
      for (const registration of registrations) {
        const context = this.getPluginContext(registration.pluginId);
        if (!context) {
          console.warn(`No context found for plugin ${registration.pluginId}, skipping hook execution`);
          continue;
        }

        try {
          const result = await this.executeHookHandler(
            registration,
            currentData,
            context,
            originalData
          );

          results.push(result);

          if (result.success) {
            currentData = result.data;
          } else if (result.error) {
            // Log error but continue with other hooks
            console.error(`Hook '${hookName}' failed for plugin '${registration.pluginId}':`, result.error);
          }

        } catch (error) {
          const hookError = new PluginHookError(
            `Hook execution failed: ${error.message}`,
            hookName,
            registration.pluginId
          );
          this.errorHandler.handleError(hookError);
          
          results.push({
            data: currentData,
            success: false,
            error: hookError,
            executionTime: Date.now() - startTime,
            pluginId: registration.pluginId,
          });
        }
      }

      // Update statistics
      this.updateHookStats(hookName, results, Date.now() - startTime);

      this.emit(PLUGIN_EVENTS.HOOK_AFTER_EXECUTE, {
        hookName,
        originalData,
        finalData: currentData,
        results,
        executionTime: Date.now() - startTime,
      });

      return currentData;

    } catch (error) {
      const hookError = new PluginHookError(
        `Failed to execute hook '${hookName}': ${error.message}`,
        hookName,
        pluginId || 'unknown'
      );
      this.errorHandler.handleError(hookError);

      this.emit(PLUGIN_EVENTS.HOOK_ERROR, {
        hookName,
        error: hookError,
        data: originalData,
      });

      throw hookError;
    }
  }

  /**
   * Check if hook exists
   */
  hasHook(hookName: string): boolean {
    return this.hooks.has(hookName) && this.hooks.get(hookName)!.length > 0;
  }

  /**
   * Get hook registrations
   */
  getHookRegistrations(hookName: string): HookRegistration[] {
    return this.hooks.get(hookName) || [];
  }

  /**
   * Get all registered hooks
   */
  getAllHooks(): string[] {
    return Array.from(this.hooks.keys());
  }

  /**
   * Get hook statistics
   */
  getHookStats(hookName?: string): HookStats | Map<string, HookStats> {
    if (hookName) {
      return this.hookStats.get(hookName) || this.createEmptyStats(hookName);
    }
    return new Map(this.hookStats);
  }

  /**
   * Enable/disable hook for specific plugin
   */
  setHookEnabled(pluginId: string, hookName: string, enabled: boolean): void {
    const registrations = this.hooks.get(hookName);
    if (registrations) {
      const registration = registrations.find(reg => reg.pluginId === pluginId);
      if (registration) {
        registration.enabled = enabled;
        this.emit(enabled ? 'hook:enabled' : 'hook:disabled', {
          pluginId,
          hookName,
        });
      }
    }
  }

  /**
   * Clear all hook registrations
   */
  clearAllHooks(): void {
    this.hooks.clear();
    this.hookStats.clear();
    this.emit('hooks:cleared');
  }

  /**
   * Register plugin hooks from plugin definition
   */
  registerPluginHooks(plugin: BasePlugin, context: PluginContext): void {
    if (!plugin.hooks) {
      return;
    }

    const priority = this.getPluginPriority(plugin);

    // Register server hooks
    if (plugin.type === 'server' || plugin.type === 'universal') {
      const serverHooks = plugin.hooks as ServerPluginHooks;
      this.registerHooksFromObject(plugin.id, serverHooks, context, priority);
    }

    // Register client hooks
    if (plugin.type === 'client' || plugin.type === 'universal') {
      const clientHooks = plugin.hooks as ClientPluginHooks;
      this.registerHooksFromObject(plugin.id, clientHooks, context, priority);
    }
  }

  /**
   * Unregister all hooks for a plugin
   */
  unregisterPluginHooks(pluginId: string): void {
    this.unregisterHook(pluginId);
  }

  /**
   * Get active hook registrations
   */
  private getActiveRegistrations(hookName: string, pluginId?: string): HookRegistration[] {
    const allRegistrations = this.hooks.get(hookName) || [];
    
    let filteredRegistrations = allRegistrations.filter(reg => reg.enabled);

    // Filter by plugin if specified
    if (pluginId) {
      filteredRegistrations = filteredRegistrations.filter(reg => reg.pluginId === pluginId);
    }

    // Filter out registrations for inactive plugins
    if (this.registry) {
      filteredRegistrations = filteredRegistrations.filter(reg => {
        const plugin = this.registry!.get(reg.pluginId);
        return plugin && this.registry!.getStatus(reg.pluginId) === PLUGIN_STATUS.ACTIVE;
      });
    }

    return filteredRegistrations;
  }

  /**
   * Execute individual hook handler
   */
  private async executeHookHandler<T>(
    registration: HookRegistration,
    data: T,
    context: PluginContext,
    originalData: T
  ): Promise<HookExecutionResult<T>> {
    const startTime = Date.now();

    try {
      const executionContext: HookExecutionContext = {
        pluginId: registration.pluginId,
        hookName: registration.hookName,
        data,
        originalData,
        context,
        timestamp: new Date(),
      };

      let result: T;

      // Execute with timeout if specified
      if (registration.timeout) {
        result = await withTimeout(
          this.executeWithRetries(registration, data, context),
          registration.timeout,
          `Hook '${registration.hookName}' timed out for plugin '${registration.pluginId}'`
        );
      } else {
        result = await this.executeWithRetries(registration, data, context);
      }

      const executionTime = Date.now() - startTime;
      executionContext.executionTime = executionTime;

      return {
        data: result,
        success: true,
        executionTime,
        pluginId: registration.pluginId,
      };

    } catch (error) {
      return {
        data,
        success: false,
        error: error as Error,
        executionTime: Date.now() - startTime,
        pluginId: registration.pluginId,
      };
    }
  }

  /**
   * Execute hook handler with retries
   */
  private async executeWithRetries<T>(
    registration: HookRegistration,
    data: T,
    context: PluginContext
  ): Promise<T> {
    let lastError: Error;
    const maxRetries = registration.retries || 0;

    for (let attempt = 0; attempt <= maxRetries; attempt++) {
      try {
        const result = await registration.handler(data, context);
        return result;
      } catch (error) {
        lastError = error as Error;
        
        if (attempt < maxRetries) {
          // Wait before retry (exponential backoff)
          const delay = Math.min(1000 * Math.pow(2, attempt), 5000);
          await new Promise(resolve => setTimeout(resolve, delay));
        }
      }
    }

    throw lastError!;
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
   * Get plugin priority
   */
  private getPluginPriority(plugin: BasePlugin): number {
    const priorityValues = { lowest: 0, low: 25, normal: 50, high: 75, highest: 100 };
    return priorityValues[plugin.priority || 'normal'];
  }

  /**
   * Register hooks from object
   */
  private registerHooksFromObject(
    pluginId: string,
    hooks: Record<string, Function>,
    context: PluginContext,
    priority: number
  ): void {
    Object.entries(hooks).forEach(([hookName, handler]) => {
      if (typeof handler === 'function') {
        this.registerHook(pluginId, hookName, handler, { priority });
      }
    });
  }

  /**
   * Initialize built-in hooks
   */
  private initializeBuiltInHooks(): void {
    // Initialize stats for all built-in hooks
    Object.values(BUILT_IN_HOOKS).forEach(hookName => {
      if (!this.hookStats.has(hookName)) {
        this.hookStats.set(hookName, this.createEmptyStats(hookName));
      }
    });
  }

  /**
   * Update hook statistics
   */
  private updateHookStats(hookName: string, results: HookExecutionResult[], totalTime: number): void {
    const stats = this.hookStats.get(hookName);
    if (!stats) return;

    stats.totalExecutions++;
    stats.lastExecution = new Date();

    const successfulResults = results.filter(r => r.success);
    const failedResults = results.filter(r => !r.success);

    stats.successfulExecutions += successfulResults.length;
    stats.failedExecutions += failedResults.length;

    // Update average execution time
    const currentAverage = stats.averageExecutionTime;
    const totalExecutions = stats.totalExecutions;
    stats.averageExecutionTime = ((currentAverage * (totalExecutions - 1)) + totalTime) / totalExecutions;
  }

  /**
   * Create empty statistics object
   */
  private createEmptyStats(hookName: string): HookStats {
    return {
      hookName,
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
 * Hook statistics
 */
export interface HookStats {
  hookName: string;
  totalExecutions: number;
  successfulExecutions: number;
  failedExecutions: number;
  averageExecutionTime: number;
  lastExecution: Date | null;
  registeredPlugins: Set<string>;
}

/**
 * Hook registration options
 */
export interface HookRegistrationOptions {
  priority?: number;
  timeout?: number;
  retries?: number;
  enabled?: boolean;
}

/**
 * Hook system options
 */
export interface HookSystemOptions {
  registry?: PluginRegistry;
  contextGetter?: (pluginId: string) => PluginContext | null;
  enableStats?: boolean;
  defaultTimeout?: number;
  defaultRetries?: number;
}

/**
 * Create hook system instance
 */
export function createHookSystem(options?: HookSystemOptions): HookSystem {
  return new HookSystem();
}
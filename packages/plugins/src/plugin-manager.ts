/**
 * Plugin Manager for CF-Better-Auth
 * Handles plugin registration, lifecycle management, and coordination
 */

import { EventEmitter } from 'eventemitter3';
import type {
  BasePlugin,
  ServerPlugin,
  ClientPlugin,
  PluginContext,
  PluginRegistry,
  PluginLifecycle,
  PluginStatus,
  ValidationResult,
  PluginFilter
} from '@cf-auth/types';

import type { PluginManager as IPluginManager } from './types';
import { PluginRegistryImpl } from './plugin-registry';
import { PluginContextFactory } from './plugin-context';
import { PluginValidator } from './plugin-validator';
import { PluginLoader } from './plugin-loader';
import { HookSystem } from './hooks';

import {
  PluginError,
  PluginNotFoundError,
  PluginAlreadyRegisteredError,
  PluginInitError,
  createPluginError,
  PluginErrorHandler
} from './errors';

import {
  PLUGIN_EVENTS,
  PLUGIN_LIFECYCLE,
  PLUGIN_STATUS,
  PLUGIN_HEALTH_CHECK
} from './constants';

import {
  sortPluginsByPriority,
  createPerformanceSnapshot,
  createHealthStatus,
  debounce,
  isDevelopment
} from './utils';

/**
 * Plugin Manager Implementation
 */
export class PluginManagerImpl extends EventEmitter implements IPluginManager {
  private registry: PluginRegistry;
  private contextFactory: PluginContextFactory;
  private validator: PluginValidator;
  private loader: PluginLoader;
  private hookSystem: HookSystem;
  private errorHandler: PluginErrorHandler;
  
  private initialized = false;
  private pluginStates = new Map<string, PluginStatus>();
  private pluginContexts = new Map<string, PluginContext>();
  private performanceMetrics = new Map<string, any>();
  private healthCheckInterval?: NodeJS.Timeout;
  
  constructor(options: PluginManagerOptions = {}) {
    super();
    
    this.registry = options.registry || new PluginRegistryImpl();
    this.contextFactory = options.contextFactory || new PluginContextFactory();
    this.validator = options.validator || new PluginValidator();
    this.loader = options.loader || new PluginLoader();
    this.hookSystem = options.hookSystem || new HookSystem();
    this.errorHandler = PluginErrorHandler.getInstance();
    
    this.setupEventListeners();
    this.setupHealthChecks();
  }
  
  /**
   * Initialize the plugin manager
   */
  async initialize(): Promise<void> {
    if (this.initialized) {
      return;
    }
    
    try {
      await this.registry.initialize?.();
      await this.contextFactory.initialize?.();
      await this.validator.initialize?.();
      await this.loader.initialize?.();
      await this.hookSystem.initialize?.();
      
      this.initialized = true;
      this.emit(PLUGIN_EVENTS.PLUGIN_INITIALIZED);
      
    } catch (error) {
      const pluginError = createPluginError(error, undefined, 'initialize');
      this.errorHandler.handleError(pluginError);
      throw pluginError;
    }
  }
  
  /**
   * Register a plugin
   */
  async register(plugin: BasePlugin): Promise<void> {
    if (!this.initialized) {
      throw new PluginError('Plugin manager not initialized');
    }
    
    const startTime = Date.now();
    
    try {
      // Check if plugin is already registered
      if (this.registry.has(plugin.id)) {
        throw new PluginAlreadyRegisteredError(plugin.id);
      }
      
      // Validate plugin
      const validationResult = await this.validator.validatePlugin(plugin);
      if (!validationResult.valid) {
        throw new PluginError(
          `Plugin validation failed: ${validationResult.errors?.map(e => e.message).join(', ')}`,
          'INVALID_PLUGIN',
          plugin.id,
          { validationErrors: validationResult.errors }
        );
      }
      
      // Validate and resolve dependencies
      await this.validateAndResolveDependencies(plugin);
      
      // Execute before register lifecycle hook
      await this.executeLifecycleHook(PLUGIN_LIFECYCLE.BEFORE_REGISTER, plugin.id);
      
      // Set plugin status to loading
      this.setPluginStatus(plugin.id, PLUGIN_STATUS.LOADING);
      
      // Register in registry
      await this.registry.register(plugin);
      
      // Create plugin context
      const context = this.contextFactory.createContext(plugin);
      this.pluginContexts.set(plugin.id, context);
      
      // Initialize plugin if it has an initialize method
      if (plugin.initialize) {
        await plugin.initialize(context);
      }
      
      // Set plugin status to active
      this.setPluginStatus(plugin.id, PLUGIN_STATUS.ACTIVE);
      
      // Create performance metrics
      const loadTime = Date.now() - startTime;
      const metrics = createPerformanceSnapshot(plugin.id, loadTime);
      this.performanceMetrics.set(plugin.id, metrics);
      
      // Execute after register lifecycle hook
      await this.executeLifecycleHook(PLUGIN_LIFECYCLE.AFTER_REGISTER, plugin.id);
      
      // Emit events
      this.emit(PLUGIN_EVENTS.PLUGIN_REGISTERED, { pluginId: plugin.id, plugin });
      this.emit(PLUGIN_EVENTS.PLUGIN_LOADED, { pluginId: plugin.id, plugin });
      
    } catch (error) {
      this.setPluginStatus(plugin.id, PLUGIN_STATUS.ERROR);
      const pluginError = createPluginError(error, plugin.id, 'register');
      this.errorHandler.handleError(pluginError);
      this.emit(PLUGIN_EVENTS.PLUGIN_ERROR, { pluginId: plugin.id, error: pluginError });
      throw pluginError;
    }
  }
  
  /**
   * Unregister a plugin
   */
  async unregister(pluginId: string): Promise<void> {
    if (!this.registry.has(pluginId)) {
      throw new PluginNotFoundError(pluginId);
    }
    
    try {
      const plugin = this.registry.get(pluginId)!;
      
      // Execute before unregister lifecycle hook
      await this.executeLifecycleHook(PLUGIN_LIFECYCLE.BEFORE_UNREGISTER, pluginId);
      
      // Set plugin status to loading (unloading)
      this.setPluginStatus(pluginId, PLUGIN_STATUS.LOADING);
      
      // Call plugin destroy method if it exists
      const context = this.pluginContexts.get(pluginId);
      if (plugin.destroy && context) {
        await plugin.destroy(context);
      }
      
      // Clean up plugin context
      this.contextFactory.destroyContext(pluginId);
      this.pluginContexts.delete(pluginId);
      
      // Unregister from registry
      await this.registry.unregister(pluginId);
      
      // Clean up plugin state and metrics
      this.pluginStates.delete(pluginId);
      this.performanceMetrics.delete(pluginId);
      
      // Execute after unregister lifecycle hook
      await this.executeLifecycleHook(PLUGIN_LIFECYCLE.AFTER_UNREGISTER, pluginId);
      
      // Emit events
      this.emit(PLUGIN_EVENTS.PLUGIN_UNREGISTERED, { pluginId });
      this.emit(PLUGIN_EVENTS.PLUGIN_UNLOADED, { pluginId });
      
    } catch (error) {
      const pluginError = createPluginError(error, pluginId, 'unregister');
      this.errorHandler.handleError(pluginError);
      this.emit(PLUGIN_EVENTS.PLUGIN_ERROR, { pluginId, error: pluginError });
      throw pluginError;
    }
  }
  
  /**
   * Enable a plugin
   */
  async enable(pluginId: string): Promise<void> {
    if (!this.registry.has(pluginId)) {
      throw new PluginNotFoundError(pluginId);
    }
    
    try {
      await this.registry.enable(pluginId);
      this.setPluginStatus(pluginId, PLUGIN_STATUS.ACTIVE);
      this.emit(PLUGIN_EVENTS.PLUGIN_ENABLED, { pluginId });
    } catch (error) {
      const pluginError = createPluginError(error, pluginId, 'enable');
      this.errorHandler.handleError(pluginError);
      throw pluginError;
    }
  }
  
  /**
   * Disable a plugin
   */
  async disable(pluginId: string): Promise<void> {
    if (!this.registry.has(pluginId)) {
      throw new PluginNotFoundError(pluginId);
    }
    
    try {
      await this.registry.disable(pluginId);
      this.setPluginStatus(pluginId, PLUGIN_STATUS.DISABLED);
      this.emit(PLUGIN_EVENTS.PLUGIN_DISABLED, { pluginId });
    } catch (error) {
      const pluginError = createPluginError(error, pluginId, 'disable');
      this.errorHandler.handleError(pluginError);
      throw pluginError;
    }
  }
  
  /**
   * Get plugin by ID
   */
  getPlugin(pluginId: string): BasePlugin | null {
    return this.registry.get(pluginId);
  }
  
  /**
   * List all plugins
   */
  listPlugins(filter?: PluginFilter): BasePlugin[] {
    return this.registry.list(filter);
  }
  
  /**
   * Execute plugin lifecycle hook
   */
  async executeLifecycleHook(lifecycle: PluginLifecycle, pluginId?: string): Promise<void> {
    try {
      const plugins = pluginId 
        ? [this.getPlugin(pluginId)].filter(Boolean)
        : this.listPlugins({ status: PLUGIN_STATUS.ACTIVE });
      
      const sortedPlugins = sortPluginsByPriority(plugins as BasePlugin[]);
      
      for (const plugin of sortedPlugins) {
        if (plugin.hooks && typeof plugin.hooks[lifecycle] === 'function') {
          const context = this.pluginContexts.get(plugin.id);
          if (context) {
            await plugin.hooks[lifecycle]!(context);
          }
        }
      }
    } catch (error) {
      const pluginError = createPluginError(error, pluginId, `executeLifecycleHook:${lifecycle}`);
      this.errorHandler.handleError(pluginError);
      throw pluginError;
    }
  }
  
  /**
   * Execute plugin hook
   */
  async executeHook<T = any>(hookName: string, data: T, pluginId?: string): Promise<T> {
    return this.hookSystem.executeHook(hookName, data, pluginId);
  }
  
  /**
   * Get plugin registry
   */
  getRegistry(): PluginRegistry {
    return this.registry;
  }
  
  /**
   * Get plugin context
   */
  getContext(pluginId: string): PluginContext | null {
    return this.pluginContexts.get(pluginId) || null;
  }
  
  /**
   * Get plugin status
   */
  getPluginStatus(pluginId: string): PluginStatus {
    return this.pluginStates.get(pluginId) || PLUGIN_STATUS.INACTIVE;
  }
  
  /**
   * Get plugin performance metrics
   */
  getPerformanceMetrics(pluginId: string): any | null {
    return this.performanceMetrics.get(pluginId) || null;
  }
  
  /**
   * Get plugin health status
   */
  getHealthStatus(pluginId: string): any | null {
    const metrics = this.performanceMetrics.get(pluginId);
    if (!metrics) return null;
    
    return createHealthStatus(pluginId, metrics);
  }
  
  /**
   * Destroy the plugin manager
   */
  async destroy(): Promise<void> {
    try {
      // Stop health checks
      if (this.healthCheckInterval) {
        clearInterval(this.healthCheckInterval);
      }
      
      // Execute destroy lifecycle for all plugins
      await this.executeLifecycleHook(PLUGIN_LIFECYCLE.DESTROY);
      
      // Unregister all plugins
      const pluginIds = Array.from(this.pluginStates.keys());
      for (const pluginId of pluginIds) {
        try {
          await this.unregister(pluginId);
        } catch (error) {
          // Log error but continue cleanup
          console.error(`Error unregistering plugin ${pluginId}:`, error);
        }
      }
      
      // Clean up
      this.pluginStates.clear();
      this.pluginContexts.clear();
      this.performanceMetrics.clear();
      this.removeAllListeners();
      
      this.initialized = false;
      
    } catch (error) {
      const pluginError = createPluginError(error, undefined, 'destroy');
      this.errorHandler.handleError(pluginError);
      throw pluginError;
    }
  }
  
  /**
   * Set plugin status
   */
  private setPluginStatus(pluginId: string, status: PluginStatus): void {
    this.pluginStates.set(pluginId, status);
  }
  
  /**
   * Validate and resolve plugin dependencies
   */
  private async validateAndResolveDependencies(plugin: BasePlugin): Promise<void> {
    const dependencyValidation = this.validator.validateDependencies(plugin);
    if (!dependencyValidation.valid) {
      throw new PluginError(
        `Plugin dependency validation failed: ${dependencyValidation.errors?.map(e => e.message).join(', ')}`,
        'PLUGIN_DEPENDENCY_NOT_FOUND',
        plugin.id,
        { validationErrors: dependencyValidation.errors }
      );
    }
  }
  
  /**
   * Setup event listeners
   */
  private setupEventListeners(): void {
    // Registry events
    this.registry.on(PLUGIN_EVENTS.PLUGIN_REGISTERED, (data) => {
      this.emit(PLUGIN_EVENTS.PLUGIN_REGISTERED, data);
    });
    
    this.registry.on(PLUGIN_EVENTS.PLUGIN_UNREGISTERED, (data) => {
      this.emit(PLUGIN_EVENTS.PLUGIN_UNREGISTERED, data);
    });
    
    this.registry.on(PLUGIN_EVENTS.PLUGIN_ERROR, (data) => {
      this.emit(PLUGIN_EVENTS.PLUGIN_ERROR, data);
    });
  }
  
  /**
   * Setup health checks
   */
  private setupHealthChecks(): void {
    if (!isDevelopment()) {
      this.healthCheckInterval = setInterval(
        this.performHealthCheck.bind(this),
        PLUGIN_HEALTH_CHECK.DEFAULT_INTERVAL
      );
    }
  }
  
  /**
   * Perform health check on all plugins
   */
  private performHealthCheck = debounce(async (): Promise<void> => {
    try {
      const pluginIds = Array.from(this.pluginStates.keys());
      
      for (const pluginId of pluginIds) {
        try {
          const metrics = this.performanceMetrics.get(pluginId);
          if (metrics) {
            const healthStatus = createHealthStatus(pluginId, metrics);
            
            // Update performance metrics with health data
            metrics.healthStatus = healthStatus;
            
            // Emit health status events if there are issues
            if (healthStatus.status !== 'healthy') {
              this.emit('plugin:health-warning', {
                pluginId,
                healthStatus,
              });
            }
          }
        } catch (error) {
          console.error(`Error checking health for plugin ${pluginId}:`, error);
        }
      }
    } catch (error) {
      console.error('Error during health check:', error);
    }
  }, 1000);
}

/**
 * Plugin Manager options
 */
export interface PluginManagerOptions {
  registry?: PluginRegistry;
  contextFactory?: PluginContextFactory;
  validator?: PluginValidator;
  loader?: PluginLoader;
  hookSystem?: HookSystem;
  enableHealthChecks?: boolean;
  healthCheckInterval?: number;
}

/**
 * Create plugin manager instance
 */
export function createPluginManager(options?: PluginManagerOptions): IPluginManager {
  return new PluginManagerImpl(options);
}
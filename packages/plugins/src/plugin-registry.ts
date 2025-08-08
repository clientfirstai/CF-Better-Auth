/**
 * Plugin Registry Implementation for CF-Better-Auth
 * Manages plugin storage, retrieval, and status tracking
 */

import { EventEmitter } from 'eventemitter3';
import type {
  BasePlugin,
  PluginRegistry,
  PluginStatus,
  PluginFilter,
  ValidationResult,
  EventHandler
} from '@cf-auth/types';

import {
  PluginError,
  PluginNotFoundError,
  PluginAlreadyRegisteredError,
  createPluginError
} from './errors';

import {
  PLUGIN_EVENTS,
  PLUGIN_STATUS
} from './constants';

import {
  sortPluginsByPriority
} from './utils';

/**
 * Plugin Registry Implementation
 */
export class PluginRegistryImpl extends EventEmitter implements PluginRegistry {
  private plugins = new Map<string, BasePlugin>();
  private pluginStatus = new Map<string, PluginStatus>();
  private enabledPlugins = new Set<string>();
  
  /**
   * Initialize the registry
   */
  async initialize(): Promise<void> {
    // Registry initialization logic can be added here
    this.emit('registry:initialized');
  }
  
  /**
   * Register a plugin
   */
  async register(plugin: BasePlugin): Promise<void> {
    if (this.plugins.has(plugin.id)) {
      throw new PluginAlreadyRegisteredError(plugin.id);
    }
    
    try {
      // Store plugin
      this.plugins.set(plugin.id, plugin);
      this.pluginStatus.set(plugin.id, PLUGIN_STATUS.INACTIVE);
      
      // Enable if configured to be enabled by default
      if (plugin.enabledByDefault) {
        await this.enable(plugin.id);
      }
      
      this.emit(PLUGIN_EVENTS.PLUGIN_REGISTERED, { pluginId: plugin.id, plugin });
      
    } catch (error) {
      // Clean up on error
      this.plugins.delete(plugin.id);
      this.pluginStatus.delete(plugin.id);
      throw createPluginError(error, plugin.id, 'register');
    }
  }
  
  /**
   * Unregister a plugin
   */
  async unregister(pluginId: string): Promise<void> {
    if (!this.plugins.has(pluginId)) {
      throw new PluginNotFoundError(pluginId);
    }
    
    try {
      // Disable plugin first
      if (this.enabledPlugins.has(pluginId)) {
        await this.disable(pluginId);
      }
      
      // Remove plugin
      this.plugins.delete(pluginId);
      this.pluginStatus.delete(pluginId);
      
      this.emit(PLUGIN_EVENTS.PLUGIN_UNREGISTERED, { pluginId });
      
    } catch (error) {
      throw createPluginError(error, pluginId, 'unregister');
    }
  }
  
  /**
   * Get plugin by ID
   */
  get(pluginId: string): BasePlugin | null {
    return this.plugins.get(pluginId) || null;
  }
  
  /**
   * List all plugins
   */
  list(filter?: PluginFilter): BasePlugin[] {
    let plugins = Array.from(this.plugins.values());
    
    if (filter) {
      plugins = this.applyFilter(plugins, filter);
    }
    
    return sortPluginsByPriority(plugins);
  }
  
  /**
   * Check if plugin is registered
   */
  has(pluginId: string): boolean {
    return this.plugins.has(pluginId);
  }
  
  /**
   * Enable plugin
   */
  async enable(pluginId: string): Promise<void> {
    if (!this.plugins.has(pluginId)) {
      throw new PluginNotFoundError(pluginId);
    }
    
    if (this.enabledPlugins.has(pluginId)) {
      return; // Already enabled
    }
    
    try {
      this.enabledPlugins.add(pluginId);
      this.pluginStatus.set(pluginId, PLUGIN_STATUS.ACTIVE);
      
      this.emit(PLUGIN_EVENTS.PLUGIN_ENABLED, { pluginId });
      
    } catch (error) {
      this.enabledPlugins.delete(pluginId);
      this.pluginStatus.set(pluginId, PLUGIN_STATUS.ERROR);
      throw createPluginError(error, pluginId, 'enable');
    }
  }
  
  /**
   * Disable plugin
   */
  async disable(pluginId: string): Promise<void> {
    if (!this.plugins.has(pluginId)) {
      throw new PluginNotFoundError(pluginId);
    }
    
    try {
      this.enabledPlugins.delete(pluginId);
      this.pluginStatus.set(pluginId, PLUGIN_STATUS.DISABLED);
      
      this.emit(PLUGIN_EVENTS.PLUGIN_DISABLED, { pluginId });
      
    } catch (error) {
      throw createPluginError(error, pluginId, 'disable');
    }
  }
  
  /**
   * Get plugin status
   */
  getStatus(pluginId: string): PluginStatus {
    return this.pluginStatus.get(pluginId) || PLUGIN_STATUS.INACTIVE;
  }
  
  /**
   * Get plugin dependencies
   */
  getDependencies(pluginId: string): string[] {
    const plugin = this.plugins.get(pluginId);
    return plugin?.dependencies || [];
  }
  
  /**
   * Resolve plugin dependencies
   */
  resolveDependencies(pluginId: string): string[] {
    const resolved: string[] = [];
    const visited = new Set<string>();
    const visiting = new Set<string>();
    
    const resolve = (id: string): void => {
      if (visiting.has(id)) {
        throw new PluginError(`Circular dependency detected involving plugin: ${id}`);
      }
      
      if (visited.has(id)) {
        return;
      }
      
      visiting.add(id);
      
      const plugin = this.plugins.get(id);
      if (!plugin) {
        throw new PluginNotFoundError(id);
      }
      
      const dependencies = plugin.dependencies || [];
      for (const depId of dependencies) {
        resolve(depId);
      }
      
      visiting.delete(id);
      visited.add(id);
      
      if (!resolved.includes(id)) {
        resolved.push(id);
      }
    };
    
    resolve(pluginId);
    
    // Remove the original plugin ID from dependencies
    return resolved.filter(id => id !== pluginId);
  }
  
  /**
   * Validate plugin
   */
  validate(plugin: BasePlugin): ValidationResult {
    const errors: any[] = [];
    
    // Check required fields
    if (!plugin.id) {
      errors.push({
        path: 'id',
        message: 'Plugin ID is required',
        value: plugin.id,
      });
    }
    
    if (!plugin.name) {
      errors.push({
        path: 'name',
        message: 'Plugin name is required',
        value: plugin.name,
      });
    }
    
    if (!plugin.version) {
      errors.push({
        path: 'version',
        message: 'Plugin version is required',
        value: plugin.version,
      });
    }
    
    if (!plugin.type) {
      errors.push({
        path: 'type',
        message: 'Plugin type is required',
        value: plugin.type,
      });
    }
    
    // Check for duplicate ID
    if (plugin.id && this.plugins.has(plugin.id)) {
      errors.push({
        path: 'id',
        message: `Plugin with ID '${plugin.id}' already exists`,
        value: plugin.id,
      });
    }
    
    return {
      valid: errors.length === 0,
      errors: errors.length > 0 ? errors : undefined,
    };
  }
  
  /**
   * Load plugin from file/URL
   */
  async load(source: string): Promise<BasePlugin> {
    // This is a placeholder - actual implementation would handle
    // loading plugins from various sources (npm, github, file, etc.)
    throw new PluginError('Plugin loading not implemented in registry');
  }
  
  /**
   * Unload plugin
   */
  async unload(pluginId: string): Promise<void> {
    await this.unregister(pluginId);
  }
  
  /**
   * Plugin events
   */
  on(event: string, handler: EventHandler): void {
    super.on(event, handler);
  }
  
  off(event: string, handler: EventHandler): void {
    super.off(event, handler);
  }
  
  async emit(event: string, data?: any): Promise<void> {
    super.emit(event, data);
  }
  
  /**
   * Get enabled plugins
   */
  getEnabledPlugins(): BasePlugin[] {
    return this.list({ enabled: true });
  }
  
  /**
   * Get plugins by type
   */
  getPluginsByType(type: string): BasePlugin[] {
    return this.list({ type: type as any });
  }
  
  /**
   * Get plugins by status
   */
  getPluginsByStatus(status: PluginStatus): BasePlugin[] {
    return this.list({ status });
  }
  
  /**
   * Search plugins
   */
  search(query: string): BasePlugin[] {
    const searchTerm = query.toLowerCase();
    
    return Array.from(this.plugins.values()).filter(plugin => 
      plugin.name.toLowerCase().includes(searchTerm) ||
      plugin.description?.toLowerCase().includes(searchTerm) ||
      plugin.id.toLowerCase().includes(searchTerm) ||
      plugin.keywords?.some(keyword => keyword.toLowerCase().includes(searchTerm))
    );
  }
  
  /**
   * Get plugin statistics
   */
  getStats(): PluginRegistryStats {
    const plugins = Array.from(this.plugins.values());
    const statusCounts: Record<string, number> = {};
    const typeCounts: Record<string, number> = {};
    
    plugins.forEach(plugin => {
      const status = this.getStatus(plugin.id);
      statusCounts[status] = (statusCounts[status] || 0) + 1;
      typeCounts[plugin.type] = (typeCounts[plugin.type] || 0) + 1;
    });
    
    return {
      totalPlugins: plugins.length,
      enabledPlugins: this.enabledPlugins.size,
      disabledPlugins: plugins.length - this.enabledPlugins.size,
      statusCounts,
      typeCounts,
    };
  }
  
  /**
   * Clear all plugins
   */
  async clear(): Promise<void> {
    const pluginIds = Array.from(this.plugins.keys());
    
    for (const pluginId of pluginIds) {
      try {
        await this.unregister(pluginId);
      } catch (error) {
        console.error(`Error unregistering plugin ${pluginId}:`, error);
      }
    }
    
    this.plugins.clear();
    this.pluginStatus.clear();
    this.enabledPlugins.clear();
  }
  
  /**
   * Apply filter to plugins
   */
  private applyFilter(plugins: BasePlugin[], filter: PluginFilter): BasePlugin[] {
    return plugins.filter(plugin => {
      // Filter by type
      if (filter.type && plugin.type !== filter.type) {
        return false;
      }
      
      // Filter by status
      if (filter.status && this.getStatus(plugin.id) !== filter.status) {
        return false;
      }
      
      // Filter by enabled state
      if (filter.enabled !== undefined) {
        const isEnabled = this.enabledPlugins.has(plugin.id);
        if (filter.enabled !== isEnabled) {
          return false;
        }
      }
      
      // Filter by search term
      if (filter.search) {
        const searchTerm = filter.search.toLowerCase();
        const matches = 
          plugin.name.toLowerCase().includes(searchTerm) ||
          plugin.description?.toLowerCase().includes(searchTerm) ||
          plugin.id.toLowerCase().includes(searchTerm) ||
          plugin.keywords?.some(keyword => keyword.toLowerCase().includes(searchTerm));
        
        if (!matches) {
          return false;
        }
      }
      
      // Filter by tags
      if (filter.tags && filter.tags.length > 0) {
        const pluginTags = plugin.metadata?.tags || [];
        const hasMatchingTag = filter.tags.some(tag => 
          pluginTags.some(pluginTag => 
            pluginTag.toLowerCase().includes(tag.toLowerCase())
          )
        );
        
        if (!hasMatchingTag) {
          return false;
        }
      }
      
      // Filter by categories
      if (filter.categories && filter.categories.length > 0) {
        const pluginCategories = plugin.metadata?.categories || [];
        const hasMatchingCategory = filter.categories.some(category => 
          pluginCategories.some(pluginCategory => 
            pluginCategory.toLowerCase().includes(category.toLowerCase())
          )
        );
        
        if (!hasMatchingCategory) {
          return false;
        }
      }
      
      return true;
    });
  }
}

/**
 * Plugin registry statistics
 */
export interface PluginRegistryStats {
  totalPlugins: number;
  enabledPlugins: number;
  disabledPlugins: number;
  statusCounts: Record<string, number>;
  typeCounts: Record<string, number>;
}

/**
 * Create plugin registry instance
 */
export function createPluginRegistry(): PluginRegistry {
  return new PluginRegistryImpl();
}
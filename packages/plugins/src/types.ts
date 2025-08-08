/**
 * Plugin-specific types and interfaces for CF-Better-Auth plugins
 * These types extend the base types from @cf-auth/types
 */

import type {
  BasePlugin,
  ServerPlugin,
  ClientPlugin,
  PluginContext,
  PluginRegistry,
  PluginBuilder,
  PluginManifest,
  PluginStatus,
  PluginType,
  PluginPriority,
  PluginLifecycle,
  ServerPluginHooks,
  ClientPluginHooks,
  ValidationResult,
  PluginFilter
} from '@cf-auth/types';

/**
 * Plugin manager interface
 */
export interface PluginManager {
  /** Initialize the plugin manager */
  initialize(): Promise<void>;
  
  /** Register a plugin */
  register(plugin: BasePlugin): Promise<void>;
  
  /** Unregister a plugin */
  unregister(pluginId: string): Promise<void>;
  
  /** Enable a plugin */
  enable(pluginId: string): Promise<void>;
  
  /** Disable a plugin */
  disable(pluginId: string): Promise<void>;
  
  /** Get plugin by ID */
  getPlugin(pluginId: string): BasePlugin | null;
  
  /** List all plugins */
  listPlugins(filter?: PluginFilter): BasePlugin[];
  
  /** Execute plugin lifecycle hook */
  executeLifecycleHook(lifecycle: PluginLifecycle, pluginId?: string): Promise<void>;
  
  /** Execute plugin hook */
  executeHook<T = any>(hookName: string, data: T, pluginId?: string): Promise<T>;
  
  /** Get plugin registry */
  getRegistry(): PluginRegistry;
  
  /** Destroy the plugin manager */
  destroy(): Promise<void>;
}

/**
 * Plugin loader interface
 */
export interface PluginLoader {
  /** Load plugin from source */
  load(source: string, options?: PluginLoadOptions): Promise<BasePlugin>;
  
  /** Unload plugin */
  unload(pluginId: string): Promise<void>;
  
  /** Reload plugin */
  reload(pluginId: string): Promise<BasePlugin>;
  
  /** Check if plugin can be hot-reloaded */
  canHotReload(pluginId: string): boolean;
  
  /** Enable hot reloading for development */
  enableHotReload(enabled: boolean): void;
  
  /** Watch plugin for changes */
  watchPlugin(pluginId: string, callback: (plugin: BasePlugin) => void): () => void;
}

/**
 * Plugin load options
 */
export interface PluginLoadOptions {
  /** Plugin configuration */
  config?: Record<string, any>;
  
  /** Override plugin metadata */
  metadata?: Record<string, any>;
  
  /** Force reload if already loaded */
  force?: boolean;
  
  /** Enable in development mode */
  development?: boolean;
  
  /** Plugin isolation level */
  isolation?: 'none' | 'partial' | 'full';
}

/**
 * Plugin validator interface
 */
export interface PluginValidator {
  /** Validate plugin manifest */
  validateManifest(manifest: PluginManifest): ValidationResult;
  
  /** Validate plugin dependencies */
  validateDependencies(plugin: BasePlugin): ValidationResult;
  
  /** Resolve plugin dependencies */
  resolveDependencies(pluginId: string): string[];
  
  /** Check plugin compatibility */
  checkCompatibility(plugin: BasePlugin): ValidationResult;
  
  /** Validate plugin configuration */
  validateConfiguration(plugin: BasePlugin, config: any): ValidationResult;
  
  /** Check for circular dependencies */
  checkCircularDependencies(plugins: BasePlugin[]): ValidationResult;
}

/**
 * Plugin context factory interface
 */
export interface PluginContextFactory {
  /** Create plugin context */
  createContext(plugin: BasePlugin, config?: Record<string, any>): PluginContext;
  
  /** Update plugin context */
  updateContext(pluginId: string, updates: Partial<PluginContext>): void;
  
  /** Get plugin context */
  getContext(pluginId: string): PluginContext | null;
  
  /** Destroy plugin context */
  destroyContext(pluginId: string): void;
}

/**
 * Plugin sandbox interface
 */
export interface PluginSandbox {
  /** Create sandboxed environment */
  createSandbox(pluginId: string): PluginSandboxEnvironment;
  
  /** Execute code in sandbox */
  execute<T = any>(sandboxId: string, code: string, context?: any): Promise<T>;
  
  /** Destroy sandbox */
  destroySandbox(sandboxId: string): void;
  
  /** Check sandbox security */
  checkSecurity(sandboxId: string): SecurityCheckResult;
}

/**
 * Plugin sandbox environment
 */
export interface PluginSandboxEnvironment {
  /** Sandbox ID */
  id: string;
  
  /** Plugin ID */
  pluginId: string;
  
  /** Available globals */
  globals: Record<string, any>;
  
  /** Allowed modules */
  allowedModules: string[];
  
  /** Security policy */
  securityPolicy: SecurityPolicy;
}

/**
 * Security policy
 */
export interface SecurityPolicy {
  /** Allow file system access */
  allowFileSystem: boolean;
  
  /** Allow network access */
  allowNetwork: boolean;
  
  /** Allow process access */
  allowProcess: boolean;
  
  /** Allowed domains */
  allowedDomains: string[];
  
  /** Blocked modules */
  blockedModules: string[];
  
  /** Memory limit in MB */
  memoryLimit: number;
  
  /** CPU time limit in ms */
  cpuTimeLimit: number;
}

/**
 * Security check result
 */
export interface SecurityCheckResult {
  /** Security level */
  level: 'safe' | 'warning' | 'danger';
  
  /** Security issues */
  issues: SecurityIssue[];
  
  /** Recommendations */
  recommendations: string[];
}

/**
 * Security issue
 */
export interface SecurityIssue {
  /** Issue type */
  type: 'file-access' | 'network-access' | 'process-access' | 'memory-limit' | 'cpu-limit' | 'module-access';
  
  /** Issue severity */
  severity: 'low' | 'medium' | 'high' | 'critical';
  
  /** Issue description */
  description: string;
  
  /** Suggested fix */
  fix?: string;
}

/**
 * Plugin event data
 */
export interface PluginEventData {
  /** Event plugin ID */
  pluginId: string;
  
  /** Event type */
  type: string;
  
  /** Event data */
  data?: any;
  
  /** Event timestamp */
  timestamp: Date;
  
  /** Event source */
  source: 'plugin' | 'manager' | 'registry' | 'loader';
}

/**
 * Plugin performance metrics
 */
export interface PluginPerformanceMetrics {
  /** Plugin ID */
  pluginId: string;
  
  /** Load time in ms */
  loadTime: number;
  
  /** Memory usage in MB */
  memoryUsage: number;
  
  /** CPU usage percentage */
  cpuUsage: number;
  
  /** Hook execution times */
  hookExecutionTimes: Record<string, number>;
  
  /** Error count */
  errorCount: number;
  
  /** Last activity timestamp */
  lastActivity: Date;
}

/**
 * Plugin health status
 */
export interface PluginHealthStatus {
  /** Plugin ID */
  pluginId: string;
  
  /** Health status */
  status: 'healthy' | 'warning' | 'error' | 'unknown';
  
  /** Health score (0-100) */
  score: number;
  
  /** Health issues */
  issues: PluginHealthIssue[];
  
  /** Last check timestamp */
  lastCheck: Date;
}

/**
 * Plugin health issue
 */
export interface PluginHealthIssue {
  /** Issue type */
  type: 'memory' | 'cpu' | 'errors' | 'dependencies' | 'compatibility';
  
  /** Issue severity */
  severity: 'info' | 'warning' | 'error' | 'critical';
  
  /** Issue message */
  message: string;
  
  /** Suggested action */
  action?: string;
}

/**
 * Plugin store interface for managing installed plugins
 */
export interface PluginStore {
  /** Install plugin */
  install(source: string, options?: PluginInstallOptions): Promise<BasePlugin>;
  
  /** Uninstall plugin */
  uninstall(pluginId: string): Promise<void>;
  
  /** Update plugin */
  update(pluginId: string, version?: string): Promise<BasePlugin>;
  
  /** Search plugins */
  search(query: string, options?: PluginSearchOptions): Promise<PluginSearchResult[]>;
  
  /** Get plugin info */
  getInfo(pluginId: string): Promise<PluginInfo | null>;
  
  /** List installed plugins */
  listInstalled(): Promise<BasePlugin[]>;
  
  /** Check for updates */
  checkUpdates(): Promise<PluginUpdateInfo[]>;
}

/**
 * Plugin install options
 */
export interface PluginInstallOptions {
  /** Installation version */
  version?: string;
  
  /** Installation directory */
  directory?: string;
  
  /** Enable after installation */
  enable?: boolean;
  
  /** Plugin configuration */
  config?: Record<string, any>;
  
  /** Force installation */
  force?: boolean;
}

/**
 * Plugin search options
 */
export interface PluginSearchOptions {
  /** Plugin category filter */
  category?: string;
  
  /** Plugin type filter */
  type?: PluginType;
  
  /** Sort order */
  sort?: 'name' | 'downloads' | 'rating' | 'updated';
  
  /** Sort direction */
  direction?: 'asc' | 'desc';
  
  /** Results limit */
  limit?: number;
  
  /** Results offset */
  offset?: number;
}

/**
 * Plugin search result
 */
export interface PluginSearchResult {
  /** Plugin ID */
  id: string;
  
  /** Plugin name */
  name: string;
  
  /** Plugin description */
  description: string;
  
  /** Plugin version */
  version: string;
  
  /** Plugin author */
  author: string;
  
  /** Download count */
  downloads: number;
  
  /** Plugin rating */
  rating: number;
  
  /** Last updated */
  updated: Date;
  
  /** Plugin tags */
  tags: string[];
}

/**
 * Plugin info
 */
export interface PluginInfo {
  /** Plugin manifest */
  manifest: PluginManifest;
  
  /** Installation info */
  installation: PluginInstallation;
  
  /** Plugin statistics */
  stats: PluginStats;
}

/**
 * Plugin installation info
 */
export interface PluginInstallation {
  /** Installation date */
  installedAt: Date;
  
  /** Installation directory */
  directory: string;
  
  /** Installation source */
  source: string;
  
  /** Installed version */
  version: string;
  
  /** Installation method */
  method: 'npm' | 'github' | 'url' | 'file';
}

/**
 * Plugin statistics
 */
export interface PluginStats {
  /** Usage count */
  usageCount: number;
  
  /** Last used */
  lastUsed: Date;
  
  /** Performance metrics */
  performance: PluginPerformanceMetrics;
  
  /** Health status */
  health: PluginHealthStatus;
}

/**
 * Plugin update info
 */
export interface PluginUpdateInfo {
  /** Plugin ID */
  pluginId: string;
  
  /** Current version */
  currentVersion: string;
  
  /** Latest version */
  latestVersion: string;
  
  /** Update type */
  updateType: 'patch' | 'minor' | 'major';
  
  /** Changelog */
  changelog?: string;
  
  /** Breaking changes */
  breakingChanges?: string[];
}
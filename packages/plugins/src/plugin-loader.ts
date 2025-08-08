/**
 * Plugin Loader for CF-Better-Auth
 * Handles dynamic loading and unloading of plugins from various sources
 */

import * as path from 'path';
import { EventEmitter } from 'eventemitter3';
import type { BasePlugin, PluginManifest } from '@cf-auth/types';

import type { 
  PluginLoader as IPluginLoader,
  PluginLoadOptions,
  PluginSandbox,
  SecurityPolicy
} from './types';

import {
  PluginError,
  PluginLoadError,
  PluginSecurityError,
  createPluginError
} from './errors';

import {
  PLUGIN_EVENTS,
  PLUGIN_SECURITY,
  PLUGIN_FILES
} from './constants';

import {
  isDevelopment,
  withTimeout,
  safeJSONParse,
  formatFileSize
} from './utils';

/**
 * Plugin Loader Implementation
 */
export class PluginLoaderImpl extends EventEmitter implements IPluginLoader {
  private loadedPlugins = new Map<string, LoadedPluginInfo>();
  private watchedPlugins = new Map<string, PluginWatcher>();
  private sandbox?: PluginSandbox;
  private hotReloadEnabled = false;

  /**
   * Initialize the plugin loader
   */
  async initialize(options: PluginLoaderOptions = {}): Promise<void> {
    this.hotReloadEnabled = options.enableHotReload ?? isDevelopment();
    
    if (options.sandbox) {
      this.sandbox = options.sandbox;
    }
    
    this.emit('loader:initialized');
  }

  /**
   * Load plugin from source
   */
  async load(source: string, options: PluginLoadOptions = {}): Promise<BasePlugin> {
    try {
      // Determine source type and load plugin
      const sourceType = this.determineSourceType(source);
      let plugin: BasePlugin;

      switch (sourceType) {
        case 'file':
          plugin = await this.loadFromFile(source, options);
          break;
        case 'npm':
          plugin = await this.loadFromNpm(source, options);
          break;
        case 'github':
          plugin = await this.loadFromGitHub(source, options);
          break;
        case 'url':
          plugin = await this.loadFromUrl(source, options);
          break;
        default:
          throw new PluginLoadError(`Unsupported source type: ${sourceType}`, source);
      }

      // Validate loaded plugin
      await this.validateLoadedPlugin(plugin, source);

      // Store plugin info
      this.loadedPlugins.set(plugin.id, {
        plugin,
        source,
        sourceType,
        loadedAt: new Date(),
        options,
      });

      // Setup hot reload if enabled
      if (this.hotReloadEnabled && sourceType === 'file') {
        await this.setupHotReload(plugin.id, source);
      }

      this.emit(PLUGIN_EVENTS.PLUGIN_LOADED, { pluginId: plugin.id, source });
      return plugin;

    } catch (error) {
      const pluginError = createPluginError(error, undefined, `load:${source}`);
      this.emit(PLUGIN_EVENTS.PLUGIN_ERROR, { source, error: pluginError });
      throw pluginError;
    }
  }

  /**
   * Unload plugin
   */
  async unload(pluginId: string): Promise<void> {
    const loadedInfo = this.loadedPlugins.get(pluginId);
    if (!loadedInfo) {
      throw new PluginError(`Plugin ${pluginId} is not loaded`);
    }

    try {
      // Stop watching if hot reload is enabled
      if (this.watchedPlugins.has(pluginId)) {
        this.stopWatching(pluginId);
      }

      // Remove from loaded plugins
      this.loadedPlugins.delete(pluginId);

      this.emit(PLUGIN_EVENTS.PLUGIN_UNLOADED, { pluginId });

    } catch (error) {
      throw createPluginError(error, pluginId, 'unload');
    }
  }

  /**
   * Reload plugin
   */
  async reload(pluginId: string): Promise<BasePlugin> {
    const loadedInfo = this.loadedPlugins.get(pluginId);
    if (!loadedInfo) {
      throw new PluginError(`Plugin ${pluginId} is not loaded`);
    }

    try {
      // Unload current version
      await this.unload(pluginId);

      // Load new version
      return await this.load(loadedInfo.source, { 
        ...loadedInfo.options, 
        force: true 
      });

    } catch (error) {
      throw createPluginError(error, pluginId, 'reload');
    }
  }

  /**
   * Check if plugin can be hot-reloaded
   */
  canHotReload(pluginId: string): boolean {
    const loadedInfo = this.loadedPlugins.get(pluginId);
    return loadedInfo?.sourceType === 'file' && this.hotReloadEnabled;
  }

  /**
   * Enable hot reloading for development
   */
  enableHotReload(enabled: boolean): void {
    this.hotReloadEnabled = enabled;
  }

  /**
   * Watch plugin for changes
   */
  watchPlugin(pluginId: string, callback: (plugin: BasePlugin) => void): () => void {
    if (!this.canHotReload(pluginId)) {
      throw new PluginError(`Plugin ${pluginId} cannot be hot-reloaded`);
    }

    const loadedInfo = this.loadedPlugins.get(pluginId)!;
    
    // Setup file watcher if not already watching
    if (!this.watchedPlugins.has(pluginId)) {
      this.setupHotReload(pluginId, loadedInfo.source);
    }

    const watcher = this.watchedPlugins.get(pluginId)!;
    watcher.callbacks.add(callback);

    // Return unwatch function
    return () => {
      watcher.callbacks.delete(callback);
      if (watcher.callbacks.size === 0) {
        this.stopWatching(pluginId);
      }
    };
  }

  /**
   * Get loaded plugin info
   */
  getLoadedPluginInfo(pluginId: string): LoadedPluginInfo | null {
    return this.loadedPlugins.get(pluginId) || null;
  }

  /**
   * List all loaded plugins
   */
  getLoadedPlugins(): Map<string, LoadedPluginInfo> {
    return new Map(this.loadedPlugins);
  }

  /**
   * Determine source type from source string
   */
  private determineSourceType(source: string): PluginSourceType {
    if (source.startsWith('http://') || source.startsWith('https://')) {
      if (source.includes('github.com')) {
        return 'github';
      }
      return 'url';
    }

    if (source.includes('/') || source.includes('\\') || source.endsWith('.js') || source.endsWith('.json')) {
      return 'file';
    }

    return 'npm';
  }

  /**
   * Load plugin from file
   */
  private async loadFromFile(filePath: string, options: PluginLoadOptions): Promise<BasePlugin> {
    try {
      const fullPath = path.resolve(filePath);
      
      // Check file exists and is accessible
      await this.checkFileAccess(fullPath);
      
      // Check file size
      await this.checkFileSize(fullPath);

      // Determine if it's a manifest file or plugin file
      let plugin: BasePlugin;
      
      if (filePath.endsWith('.json') || filePath.endsWith(PLUGIN_FILES.MANIFEST)) {
        // Load from manifest
        plugin = await this.loadFromManifest(fullPath, options);
      } else {
        // Load from JavaScript/TypeScript file
        plugin = await this.loadFromJavaScriptFile(fullPath, options);
      }

      return plugin;

    } catch (error) {
      throw new PluginLoadError(
        `Failed to load plugin from file: ${error.message}`,
        filePath,
        undefined,
        { originalError: error }
      );
    }
  }

  /**
   * Load plugin from npm package
   */
  private async loadFromNpm(packageName: string, options: PluginLoadOptions): Promise<BasePlugin> {
    throw new PluginLoadError(
      'NPM package loading not implemented',
      packageName,
      undefined,
      { feature: 'npm-loading' }
    );
  }

  /**
   * Load plugin from GitHub
   */
  private async loadFromGitHub(repoUrl: string, options: PluginLoadOptions): Promise<BasePlugin> {
    throw new PluginLoadError(
      'GitHub repository loading not implemented',
      repoUrl,
      undefined,
      { feature: 'github-loading' }
    );
  }

  /**
   * Load plugin from URL
   */
  private async loadFromUrl(url: string, options: PluginLoadOptions): Promise<BasePlugin> {
    throw new PluginLoadError(
      'URL loading not implemented',
      url,
      undefined,
      { feature: 'url-loading' }
    );
  }

  /**
   * Load plugin from manifest file
   */
  private async loadFromManifest(manifestPath: string, options: PluginLoadOptions): Promise<BasePlugin> {
    try {
      const manifestContent = await this.readFile(manifestPath);
      const manifest: PluginManifest = JSON.parse(manifestContent);

      // Validate manifest
      this.validateManifest(manifest);

      // Determine plugin entry point
      const entryPoint = manifest.main || PLUGIN_FILES.INDEX;
      const pluginPath = path.resolve(path.dirname(manifestPath), entryPoint);

      // Load plugin code
      const plugin = await this.loadFromJavaScriptFile(pluginPath, options);

      // Merge manifest data with plugin
      return {
        ...manifest,
        ...plugin,
        id: manifest.id,
        name: manifest.name,
        version: manifest.version,
      };

    } catch (error) {
      throw new PluginLoadError(
        `Failed to load plugin from manifest: ${error.message}`,
        manifestPath,
        undefined,
        { originalError: error }
      );
    }
  }

  /**
   * Load plugin from JavaScript file
   */
  private async loadFromJavaScriptFile(filePath: string, options: PluginLoadOptions): Promise<BasePlugin> {
    try {
      // Check security constraints
      await this.checkSecurityConstraints(filePath, options);

      let plugin: BasePlugin;

      if (this.sandbox && options.isolation !== 'none') {
        // Load in sandbox
        plugin = await this.loadInSandbox(filePath, options);
      } else {
        // Load directly (less secure but faster)
        plugin = await this.loadDirectly(filePath, options);
      }

      return plugin;

    } catch (error) {
      throw new PluginLoadError(
        `Failed to load JavaScript plugin: ${error.message}`,
        filePath,
        undefined,
        { originalError: error }
      );
    }
  }

  /**
   * Load plugin directly (without sandbox)
   */
  private async loadDirectly(filePath: string, options: PluginLoadOptions): Promise<BasePlugin> {
    try {
      // Clear require cache if force reload
      if (options.force) {
        delete require.cache[require.resolve(filePath)];
      }

      // Use dynamic import for ES modules, require for CommonJS
      let pluginModule: any;
      
      try {
        pluginModule = await import(filePath);
      } catch (importError) {
        // Fallback to require for CommonJS
        pluginModule = require(filePath);
      }

      // Extract plugin from module
      const plugin = pluginModule.default || pluginModule;

      if (typeof plugin === 'function') {
        // Plugin is a factory function
        return plugin(options.config || {});
      }

      return plugin;

    } catch (error) {
      throw new PluginLoadError(
        `Failed to load plugin directly: ${error.message}`,
        filePath,
        undefined,
        { originalError: error }
      );
    }
  }

  /**
   * Load plugin in sandbox
   */
  private async loadInSandbox(filePath: string, options: PluginLoadOptions): Promise<BasePlugin> {
    if (!this.sandbox) {
      throw new PluginError('Sandbox not available');
    }

    try {
      const pluginCode = await this.readFile(filePath);
      const sandboxId = `plugin-${Date.now()}`;
      
      const sandboxEnv = this.sandbox.createSandbox(sandboxId);
      const plugin = await this.sandbox.execute(sandboxId, pluginCode, options.config);

      return plugin;

    } catch (error) {
      throw new PluginLoadError(
        `Failed to load plugin in sandbox: ${error.message}`,
        filePath,
        undefined,
        { originalError: error }
      );
    }
  }

  /**
   * Validate loaded plugin
   */
  private async validateLoadedPlugin(plugin: BasePlugin, source: string): Promise<void> {
    if (!plugin || typeof plugin !== 'object') {
      throw new PluginLoadError('Plugin must be an object', source);
    }

    if (!plugin.id) {
      throw new PluginLoadError('Plugin must have an id', source);
    }

    if (!plugin.name) {
      throw new PluginLoadError('Plugin must have a name', source);
    }

    if (!plugin.version) {
      throw new PluginLoadError('Plugin must have a version', source);
    }

    if (!plugin.type) {
      throw new PluginLoadError('Plugin must have a type', source);
    }
  }

  /**
   * Validate plugin manifest
   */
  private validateManifest(manifest: PluginManifest): void {
    if (!manifest.id) {
      throw new PluginError('Manifest must have an id');
    }

    if (!manifest.name) {
      throw new PluginError('Manifest must have a name');
    }

    if (!manifest.version) {
      throw new PluginError('Manifest must have a version');
    }
  }

  /**
   * Check file access
   */
  private async checkFileAccess(filePath: string): Promise<void> {
    try {
      // This would use fs.access in a real implementation
      // For now, we'll assume file is accessible
    } catch (error) {
      throw new PluginLoadError(`Cannot access file: ${filePath}`, filePath);
    }
  }

  /**
   * Check file size constraints
   */
  private async checkFileSize(filePath: string): Promise<void> {
    try {
      // This would use fs.stat in a real implementation
      const stats = { size: 0 }; // Placeholder
      
      if (stats.size > PLUGIN_SECURITY.MAX_PLUGIN_SIZE) {
        throw new PluginSecurityError(
          `Plugin file too large: ${formatFileSize(stats.size)} (max: ${formatFileSize(PLUGIN_SECURITY.MAX_PLUGIN_SIZE)})`,
          'file-size',
          '',
          { fileSize: stats.size, maxSize: PLUGIN_SECURITY.MAX_PLUGIN_SIZE }
        );
      }
    } catch (error) {
      if (error instanceof PluginSecurityError) {
        throw error;
      }
      throw new PluginLoadError(`Cannot check file size: ${filePath}`, filePath);
    }
  }

  /**
   * Check security constraints
   */
  private async checkSecurityConstraints(filePath: string, options: PluginLoadOptions): Promise<void> {
    // Check file extension
    const ext = path.extname(filePath);
    if (!PLUGIN_SECURITY.ALLOWED_FILE_EXTENSIONS.includes(ext)) {
      throw new PluginSecurityError(
        `File extension not allowed: ${ext}`,
        'file-extension',
        '',
        { extension: ext, allowedExtensions: PLUGIN_SECURITY.ALLOWED_FILE_EXTENSIONS }
      );
    }

    // Additional security checks would go here
  }

  /**
   * Setup hot reload for a plugin
   */
  private async setupHotReload(pluginId: string, source: string): Promise<void> {
    if (!this.hotReloadEnabled) {
      return;
    }

    try {
      // This would use fs.watch in a real implementation
      const watcher: PluginWatcher = {
        pluginId,
        source,
        callbacks: new Set(),
        watcher: null, // Would be the actual file watcher
      };

      this.watchedPlugins.set(pluginId, watcher);

    } catch (error) {
      console.warn(`Failed to setup hot reload for plugin ${pluginId}:`, error);
    }
  }

  /**
   * Stop watching a plugin
   */
  private stopWatching(pluginId: string): void {
    const watcher = this.watchedPlugins.get(pluginId);
    if (watcher) {
      if (watcher.watcher) {
        // watcher.watcher.close(); // Would close the file watcher
      }
      this.watchedPlugins.delete(pluginId);
    }
  }

  /**
   * Read file content
   */
  private async readFile(filePath: string): Promise<string> {
    // This would use fs.readFile in a real implementation
    return ''; // Placeholder
  }
}

/**
 * Plugin source types
 */
type PluginSourceType = 'file' | 'npm' | 'github' | 'url';

/**
 * Loaded plugin information
 */
interface LoadedPluginInfo {
  plugin: BasePlugin;
  source: string;
  sourceType: PluginSourceType;
  loadedAt: Date;
  options: PluginLoadOptions;
}

/**
 * Plugin watcher
 */
interface PluginWatcher {
  pluginId: string;
  source: string;
  callbacks: Set<(plugin: BasePlugin) => void>;
  watcher: any; // Would be fs.FSWatcher in real implementation
}

/**
 * Plugin loader options
 */
export interface PluginLoaderOptions {
  enableHotReload?: boolean;
  sandbox?: PluginSandbox;
  securityPolicy?: SecurityPolicy;
  maxFileSize?: number;
  allowedExtensions?: string[];
}

/**
 * Create plugin loader instance
 */
export function createPluginLoader(options?: PluginLoaderOptions): IPluginLoader {
  return new PluginLoaderImpl();
}
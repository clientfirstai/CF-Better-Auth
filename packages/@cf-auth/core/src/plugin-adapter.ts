/**
 * PluginAdapter - Adapts better-auth plugins for CF-Better-Auth
 */

export interface Plugin {
  name: string;
  version?: string;
  init: (auth: any) => Promise<void> | void;
  dependencies?: string[];
  config?: any;
}

export interface PluginAdapterInterface {
  name: string;
  fromBetterAuth: (plugin: any) => Plugin;
  toBetterAuth: (plugin: Plugin) => any;
}

export class PluginAdapter {
  private plugins: Map<string, Plugin> = new Map();
  private adapters: Map<string, PluginAdapterInterface> = new Map();
  private initialized: Map<string, boolean> = new Map();

  constructor() {
    this.registerBuiltInAdapters();
  }

  /**
   * Register built-in plugin adapters
   */
  private registerBuiltInAdapters(): void {
    // OAuth plugin adapter
    this.registerAdapter({
      name: 'oauth',
      fromBetterAuth: (plugin) => ({
        name: 'oauth',
        version: plugin.version || '1.0.0',
        init: plugin.init || plugin,
        config: plugin.config,
      }),
      toBetterAuth: (plugin) => plugin.init,
    });

    // MFA plugin adapter
    this.registerAdapter({
      name: 'mfa',
      fromBetterAuth: (plugin) => ({
        name: 'mfa',
        version: plugin.version || '1.0.0',
        init: plugin.init || plugin,
        config: plugin.config,
      }),
      toBetterAuth: (plugin) => plugin.init,
    });

    // RBAC plugin adapter
    this.registerAdapter({
      name: 'rbac',
      fromBetterAuth: (plugin) => ({
        name: 'rbac',
        version: plugin.version || '1.0.0',
        init: plugin.init || plugin,
        config: plugin.config,
      }),
      toBetterAuth: (plugin) => plugin.init,
    });

    // Session plugin adapter
    this.registerAdapter({
      name: 'session',
      fromBetterAuth: (plugin) => ({
        name: 'session',
        version: plugin.version || '1.0.0',
        init: plugin.init || plugin,
        config: plugin.config,
      }),
      toBetterAuth: (plugin) => plugin.init,
    });
  }

  /**
   * Register a custom adapter
   */
  registerAdapter(adapter: PluginAdapterInterface): void {
    this.adapters.set(adapter.name, adapter);
  }

  /**
   * Load plugins
   */
  async loadPlugins(plugins: any[]): Promise<void> {
    for (const plugin of plugins) {
      await this.loadPlugin(plugin);
    }
  }

  /**
   * Load a single plugin
   */
  async loadPlugin(plugin: any): Promise<void> {
    let adaptedPlugin: Plugin;

    // Check if plugin is already in our format
    if (this.isValidPlugin(plugin)) {
      adaptedPlugin = plugin;
    } else {
      // Try to adapt using registered adapters
      adaptedPlugin = this.adaptPlugin(plugin);
    }

    // Check dependencies
    if (adaptedPlugin.dependencies) {
      this.checkDependencies(adaptedPlugin.dependencies);
    }

    // Store the plugin
    this.plugins.set(adaptedPlugin.name, adaptedPlugin);
    console.log(`Plugin ${adaptedPlugin.name} loaded`);
  }

  /**
   * Check if a plugin is valid
   */
  private isValidPlugin(plugin: any): plugin is Plugin {
    return (
      typeof plugin === 'object' &&
      typeof plugin.name === 'string' &&
      typeof plugin.init === 'function'
    );
  }

  /**
   * Adapt a plugin using registered adapters
   */
  private adaptPlugin(plugin: any): Plugin {
    // Try to detect plugin type
    const pluginType = this.detectPluginType(plugin);
    const adapter = this.adapters.get(pluginType);

    if (adapter) {
      return adapter.fromBetterAuth(plugin);
    }

    // Default adaptation
    return {
      name: plugin.name || 'unknown-plugin',
      version: plugin.version,
      init: typeof plugin === 'function' ? plugin : plugin.init,
      config: plugin.config,
    };
  }

  /**
   * Detect plugin type
   */
  private detectPluginType(plugin: any): string {
    if (plugin.name) {
      return plugin.name.toLowerCase();
    }

    // Try to detect based on properties
    if (plugin.providers) return 'oauth';
    if (plugin.totpOptions) return 'mfa';
    if (plugin.roles || plugin.permissions) return 'rbac';
    if (plugin.sessionOptions) return 'session';

    return 'unknown';
  }

  /**
   * Check plugin dependencies
   */
  private checkDependencies(dependencies: string[]): void {
    for (const dep of dependencies) {
      if (!this.plugins.has(dep) && !this.initialized.has(dep)) {
        console.warn(`Plugin dependency ${dep} is not loaded`);
      }
    }
  }

  /**
   * Initialize all plugins
   */
  async initializePlugins(authInstance: any): Promise<void> {
    // Sort plugins by dependencies
    const sortedPlugins = this.sortByDependencies();

    for (const plugin of sortedPlugins) {
      await this.initializePlugin(plugin, authInstance);
    }
  }

  /**
   * Initialize a single plugin
   */
  async initializePlugin(plugin: Plugin, authInstance: any): Promise<void> {
    if (this.initialized.get(plugin.name)) {
      return;
    }

    try {
      // Convert plugin to better-auth format if needed
      const adapter = this.adapters.get(plugin.name);
      const betterAuthPlugin = adapter ? adapter.toBetterAuth(plugin) : plugin.init;

      // Initialize the plugin
      await Promise.resolve(betterAuthPlugin(authInstance));

      this.initialized.set(plugin.name, true);
      console.log(`✅ Plugin ${plugin.name} initialized`);
    } catch (error) {
      console.error(`Failed to initialize plugin ${plugin.name}:`, error);
      throw error;
    }
  }

  /**
   * Sort plugins by dependencies
   */
  private sortByDependencies(): Plugin[] {
    const sorted: Plugin[] = [];
    const visited = new Set<string>();
    const visiting = new Set<string>();

    const visit = (plugin: Plugin) => {
      if (visited.has(plugin.name)) return;
      if (visiting.has(plugin.name)) {
        throw new Error(`Circular dependency detected for plugin ${plugin.name}`);
      }

      visiting.add(plugin.name);

      if (plugin.dependencies) {
        for (const dep of plugin.dependencies) {
          const depPlugin = this.plugins.get(dep);
          if (depPlugin) {
            visit(depPlugin);
          }
        }
      }

      visiting.delete(plugin.name);
      visited.add(plugin.name);
      sorted.push(plugin);
    };

    for (const plugin of this.plugins.values()) {
      visit(plugin);
    }

    return sorted;
  }

  /**
   * Register a plugin at runtime
   */
  async registerPlugin(plugin: any, authInstance: any): Promise<void> {
    await this.loadPlugin(plugin);
    const adaptedPlugin = this.plugins.get(plugin.name || 'unknown-plugin');
    if (adaptedPlugin) {
      await this.initializePlugin(adaptedPlugin, authInstance);
    }
  }

  /**
   * Get a plugin by name
   */
  getPlugin(name: string): Plugin | undefined {
    return this.plugins.get(name);
  }

  /**
   * Get all plugins
   */
  getPlugins(): Plugin[] {
    return Array.from(this.plugins.values());
  }

  /**
   * Shutdown all plugins
   */
  async shutdown(): Promise<void> {
    // Shutdown in reverse order of initialization
    const sortedPlugins = this.sortByDependencies().reverse();

    for (const plugin of sortedPlugins) {
      try {
        // If plugin has a shutdown method, call it
        if (typeof (plugin as any).shutdown === 'function') {
          await (plugin as any).shutdown();
        }
      } catch (error) {
        console.error(`Error shutting down plugin ${plugin.name}:`, error);
      }
    }

    this.plugins.clear();
    this.initialized.clear();
  }
}
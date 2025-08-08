import type { BetterAuthInstance } from '@cf-auth/types';

export interface Plugin {
  name: string;
  version?: string;
  init: (auth: BetterAuthInstance) => void | Promise<void>;
  dependencies?: string[];
  config?: any;
}

export interface PluginAdapter {
  name: string;
  fromBetterAuth: (plugin: any) => Plugin;
  toBetterAuth: (plugin: Plugin) => any;
}

export class PluginManager {
  private plugins: Map<string, Plugin> = new Map();
  private adapters: Map<string, PluginAdapter> = new Map();
  private initialized: Set<string> = new Set();

  registerAdapter(adapter: PluginAdapter): void {
    this.adapters.set(adapter.name, adapter);
  }

  async loadPlugin(name: string, config?: any): Promise<Plugin> {
    try {
      const betterAuthPlugin = await this.loadBetterAuthPlugin(name);
      const adapter = this.adapters.get(name);
      
      if (adapter) {
        return adapter.fromBetterAuth(betterAuthPlugin);
      }
      
      return this.wrapBetterAuthPlugin(name, betterAuthPlugin, config);
    } catch (error) {
      throw new Error(`Failed to load plugin ${name}: ${error}`);
    }
  }

  private async loadBetterAuthPlugin(name: string): Promise<any> {
    try {
      const module = await import(`../../../vendor/better-auth/plugins/${name}`);
      return module.default || module;
    } catch {
      try {
        const module = await import(`better-auth/plugins/${name}`);
        return module.default || module;
      } catch (error) {
        throw new Error(`Plugin ${name} not found`);
      }
    }
  }

  private wrapBetterAuthPlugin(name: string, plugin: any, config?: any): Plugin {
    return {
      name,
      config,
      init: async (auth: BetterAuthInstance) => {
        if (typeof plugin === 'function') {
          const instance = plugin(config);
          if (instance && typeof instance.init === 'function') {
            await instance.init(auth);
          } else if (auth.use) {
            auth.use(instance);
          }
        } else if (plugin.init) {
          await plugin.init(auth, config);
        } else if (auth.use) {
          auth.use(plugin);
        }
      }
    };
  }

  register(plugin: Plugin): void {
    if (this.plugins.has(plugin.name)) {
      console.warn(`Plugin ${plugin.name} is already registered`);
      return;
    }
    
    this.validateDependencies(plugin);
    this.plugins.set(plugin.name, plugin);
  }

  private validateDependencies(plugin: Plugin): void {
    if (!plugin.dependencies) return;
    
    for (const dep of plugin.dependencies) {
      if (!this.plugins.has(dep)) {
        throw new Error(`Plugin ${plugin.name} depends on ${dep}, which is not registered`);
      }
    }
  }

  async initializeAll(auth: BetterAuthInstance): Promise<void> {
    const sorted = this.sortByDependencies();
    
    for (const plugin of sorted) {
      if (!this.initialized.has(plugin.name)) {
        try {
          await plugin.init(auth);
          this.initialized.add(plugin.name);
        } catch (error) {
          console.error(`Failed to initialize plugin ${plugin.name}:`, error);
          throw error;
        }
      }
    }
  }

  private sortByDependencies(): Plugin[] {
    const sorted: Plugin[] = [];
    const visited = new Set<string>();
    const visiting = new Set<string>();

    const visit = (name: string) => {
      if (visited.has(name)) return;
      if (visiting.has(name)) {
        throw new Error(`Circular dependency detected in plugin: ${name}`);
      }

      const plugin = this.plugins.get(name);
      if (!plugin) return;

      visiting.add(name);

      if (plugin.dependencies) {
        for (const dep of plugin.dependencies) {
          visit(dep);
        }
      }

      visiting.delete(name);
      visited.add(name);
      sorted.push(plugin);
    };

    for (const [name] of this.plugins) {
      visit(name);
    }

    return sorted;
  }

  getPlugin(name: string): Plugin | undefined {
    return this.plugins.get(name);
  }

  removePlugin(name: string): void {
    this.plugins.delete(name);
    this.initialized.delete(name);
    
    for (const [pluginName, plugin] of this.plugins) {
      if (plugin.dependencies?.includes(name)) {
        console.warn(`Plugin ${pluginName} depends on removed plugin ${name}`);
      }
    }
  }

  listPlugins(): string[] {
    return Array.from(this.plugins.keys());
  }

  isInitialized(name: string): boolean {
    return this.initialized.has(name);
  }

  clear(): void {
    this.plugins.clear();
    this.initialized.clear();
  }
}
/**
 * Plugin Builder for CF-Better-Auth
 * Provides a fluent API for building plugins
 */

import type {
  BasePlugin,
  ServerPlugin,
  ClientPlugin,
  PluginBuilder as IPluginBuilder,
  PluginType,
  PluginPriority,
  PluginMetadata,
  ServerPluginHooks,
  ClientPluginHooks,
  ServerPluginMiddleware,
  ServerPluginRoute,
  ClientPluginComponent,
  ConfigObject
} from '@cf-auth/types';

import { PluginError } from './errors';
import { PLUGIN_TYPE, PLUGIN_PRIORITY } from './constants';
import { generatePluginId, isValidPluginId, isValidVersion } from './utils';

/**
 * Plugin Builder Implementation
 */
export class PluginBuilderImpl implements IPluginBuilder {
  private plugin: Partial<BasePlugin> = {};
  private serverHooks: Partial<ServerPluginHooks> = {};
  private clientHooks: Partial<ClientPluginHooks> = {};
  private middleware: ServerPluginMiddleware[] = [];
  private routes: ServerPluginRoute[] = [];
  private components: ClientPluginComponent[] = [];

  constructor() {
    // Set default values
    this.plugin.priority = PLUGIN_PRIORITY.NORMAL;
    this.plugin.enabledByDefault = false;
    this.plugin.dependencies = [];
    this.plugin.peerDependencies = [];
    this.plugin.optionalDependencies = [];
  }

  /**
   * Set plugin ID
   */
  setId(id: string): PluginBuilderImpl {
    if (!isValidPluginId(id)) {
      throw new PluginError(`Invalid plugin ID: ${id}. Must contain only lowercase letters, numbers, hyphens, and underscores.`);
    }
    this.plugin.id = id;
    return this;
  }

  /**
   * Set plugin name
   */
  setName(name: string): PluginBuilderImpl {
    if (!name || name.trim().length === 0) {
      throw new PluginError('Plugin name cannot be empty');
    }
    this.plugin.name = name.trim();
    return this;
  }

  /**
   * Set plugin version
   */
  setVersion(version: string): PluginBuilderImpl {
    if (!isValidVersion(version)) {
      throw new PluginError(`Invalid version: ${version}. Must follow semantic versioning (e.g., 1.0.0)`);
    }
    this.plugin.version = version;
    return this;
  }

  /**
   * Set plugin description
   */
  setDescription(description: string): PluginBuilderImpl {
    this.plugin.description = description;
    return this;
  }

  /**
   * Set plugin author
   */
  setAuthor(author: string): PluginBuilderImpl {
    this.plugin.author = author;
    return this;
  }

  /**
   * Set plugin homepage
   */
  setHomepage(homepage: string): PluginBuilderImpl {
    this.plugin.homepage = homepage;
    return this;
  }

  /**
   * Set plugin repository
   */
  setRepository(repository: string): PluginBuilderImpl {
    this.plugin.repository = repository;
    return this;
  }

  /**
   * Set plugin license
   */
  setLicense(license: string): PluginBuilderImpl {
    this.plugin.license = license;
    return this;
  }

  /**
   * Set plugin keywords
   */
  setKeywords(keywords: string[]): PluginBuilderImpl {
    this.plugin.keywords = [...keywords];
    return this;
  }

  /**
   * Add a keyword
   */
  addKeyword(keyword: string): PluginBuilderImpl {
    if (!this.plugin.keywords) {
      this.plugin.keywords = [];
    }
    if (!this.plugin.keywords.includes(keyword)) {
      this.plugin.keywords.push(keyword);
    }
    return this;
  }

  /**
   * Set plugin type
   */
  setType(type: PluginType): PluginBuilderImpl {
    if (!Object.values(PLUGIN_TYPE).includes(type as any)) {
      throw new PluginError(`Invalid plugin type: ${type}`);
    }
    this.plugin.type = type;
    return this;
  }

  /**
   * Set plugin priority
   */
  setPriority(priority: PluginPriority): PluginBuilderImpl {
    if (!Object.values(PLUGIN_PRIORITY).includes(priority as any)) {
      throw new PluginError(`Invalid plugin priority: ${priority}`);
    }
    this.plugin.priority = priority;
    return this;
  }

  /**
   * Set enabled by default
   */
  setEnabledByDefault(enabled: boolean): PluginBuilderImpl {
    this.plugin.enabledByDefault = enabled;
    return this;
  }

  /**
   * Add plugin dependency
   */
  addDependency(dependency: string): PluginBuilderImpl {
    if (!this.plugin.dependencies) {
      this.plugin.dependencies = [];
    }
    if (!this.plugin.dependencies.includes(dependency)) {
      this.plugin.dependencies.push(dependency);
    }
    return this;
  }

  /**
   * Add multiple dependencies
   */
  addDependencies(dependencies: string[]): PluginBuilderImpl {
    dependencies.forEach(dep => this.addDependency(dep));
    return this;
  }

  /**
   * Add peer dependency
   */
  addPeerDependency(dependency: string): PluginBuilderImpl {
    if (!this.plugin.peerDependencies) {
      this.plugin.peerDependencies = [];
    }
    if (!this.plugin.peerDependencies.includes(dependency)) {
      this.plugin.peerDependencies.push(dependency);
    }
    return this;
  }

  /**
   * Add optional dependency
   */
  addOptionalDependency(dependency: string): PluginBuilderImpl {
    if (!this.plugin.optionalDependencies) {
      this.plugin.optionalDependencies = [];
    }
    if (!this.plugin.optionalDependencies.includes(dependency)) {
      this.plugin.optionalDependencies.push(dependency);
    }
    return this;
  }

  /**
   * Set engine requirements
   */
  setEngines(engines: { cfBetterAuth?: string; betterAuth?: string; node?: string }): PluginBuilderImpl {
    this.plugin.engines = engines;
    return this;
  }

  /**
   * Set plugin configuration
   */
  setConfig(config: ConfigObject): PluginBuilderImpl {
    this.plugin.defaultConfig = { ...config };
    return this;
  }

  /**
   * Set configuration schema
   */
  setConfigSchema(schema: any): PluginBuilderImpl {
    this.plugin.configSchema = schema;
    return this;
  }

  /**
   * Set plugin metadata
   */
  setMetadata(metadata: PluginMetadata): PluginBuilderImpl {
    this.plugin.metadata = { ...metadata };
    return this;
  }

  /**
   * Add metadata property
   */
  addMetadata(key: string, value: any): PluginBuilderImpl {
    if (!this.plugin.metadata) {
      this.plugin.metadata = {};
    }
    this.plugin.metadata.custom = this.plugin.metadata.custom || {};
    this.plugin.metadata.custom[key] = value;
    return this;
  }

  /**
   * Set plugin categories
   */
  setCategories(categories: string[]): PluginBuilderImpl {
    if (!this.plugin.metadata) {
      this.plugin.metadata = {};
    }
    this.plugin.metadata.categories = [...categories];
    return this;
  }

  /**
   * Add category
   */
  addCategory(category: string): PluginBuilderImpl {
    if (!this.plugin.metadata) {
      this.plugin.metadata = {};
    }
    if (!this.plugin.metadata.categories) {
      this.plugin.metadata.categories = [];
    }
    if (!this.plugin.metadata.categories.includes(category)) {
      this.plugin.metadata.categories.push(category);
    }
    return this;
  }

  /**
   * Set plugin tags
   */
  setTags(tags: string[]): PluginBuilderImpl {
    if (!this.plugin.metadata) {
      this.plugin.metadata = {};
    }
    this.plugin.metadata.tags = [...tags];
    return this;
  }

  /**
   * Add tag
   */
  addTag(tag: string): PluginBuilderImpl {
    if (!this.plugin.metadata) {
      this.plugin.metadata = {};
    }
    if (!this.plugin.metadata.tags) {
      this.plugin.metadata.tags = [];
    }
    if (!this.plugin.metadata.tags.includes(tag)) {
      this.plugin.metadata.tags.push(tag);
    }
    return this;
  }

  /**
   * Add plugin hook
   */
  addHook(name: string, handler: Function): PluginBuilderImpl {
    if (this.plugin.type === PLUGIN_TYPE.SERVER || this.plugin.type === PLUGIN_TYPE.UNIVERSAL) {
      this.serverHooks[name as keyof ServerPluginHooks] = handler as any;
    }
    if (this.plugin.type === PLUGIN_TYPE.CLIENT || this.plugin.type === PLUGIN_TYPE.UNIVERSAL) {
      this.clientHooks[name as keyof ClientPluginHooks] = handler as any;
    }
    return this;
  }

  /**
   * Add server hook
   */
  addServerHook<K extends keyof ServerPluginHooks>(
    name: K,
    handler: NonNullable<ServerPluginHooks[K]>
  ): PluginBuilderImpl {
    this.serverHooks[name] = handler;
    return this;
  }

  /**
   * Add client hook
   */
  addClientHook<K extends keyof ClientPluginHooks>(
    name: K,
    handler: NonNullable<ClientPluginHooks[K]>
  ): PluginBuilderImpl {
    this.clientHooks[name] = handler;
    return this;
  }

  /**
   * Add plugin middleware
   */
  addMiddleware(middleware: ServerPluginMiddleware): PluginBuilderImpl {
    this.middleware.push(middleware);
    return this;
  }

  /**
   * Add multiple middleware
   */
  addMiddlewares(middlewares: ServerPluginMiddleware[]): PluginBuilderImpl {
    this.middleware.push(...middlewares);
    return this;
  }

  /**
   * Add plugin route
   */
  addRoute(route: ServerPluginRoute): PluginBuilderImpl {
    this.routes.push(route);
    return this;
  }

  /**
   * Add multiple routes
   */
  addRoutes(routes: ServerPluginRoute[]): PluginBuilderImpl {
    this.routes.push(...routes);
    return this;
  }

  /**
   * Add GET route
   */
  addGetRoute(
    path: string,
    handler: ServerPluginRoute['handler'],
    options?: Partial<Omit<ServerPluginRoute, 'method' | 'path' | 'handler'>>
  ): PluginBuilderImpl {
    return this.addRoute({
      method: 'GET',
      path,
      handler,
      ...options,
    });
  }

  /**
   * Add POST route
   */
  addPostRoute(
    path: string,
    handler: ServerPluginRoute['handler'],
    options?: Partial<Omit<ServerPluginRoute, 'method' | 'path' | 'handler'>>
  ): PluginBuilderImpl {
    return this.addRoute({
      method: 'POST',
      path,
      handler,
      ...options,
    });
  }

  /**
   * Add PUT route
   */
  addPutRoute(
    path: string,
    handler: ServerPluginRoute['handler'],
    options?: Partial<Omit<ServerPluginRoute, 'method' | 'path' | 'handler'>>
  ): PluginBuilderImpl {
    return this.addRoute({
      method: 'PUT',
      path,
      handler,
      ...options,
    });
  }

  /**
   * Add PATCH route
   */
  addPatchRoute(
    path: string,
    handler: ServerPluginRoute['handler'],
    options?: Partial<Omit<ServerPluginRoute, 'method' | 'path' | 'handler'>>
  ): PluginBuilderImpl {
    return this.addRoute({
      method: 'PATCH',
      path,
      handler,
      ...options,
    });
  }

  /**
   * Add DELETE route
   */
  addDeleteRoute(
    path: string,
    handler: ServerPluginRoute['handler'],
    options?: Partial<Omit<ServerPluginRoute, 'method' | 'path' | 'handler'>>
  ): PluginBuilderImpl {
    return this.addRoute({
      method: 'DELETE',
      path,
      handler,
      ...options,
    });
  }

  /**
   * Add plugin component
   */
  addComponent(component: ClientPluginComponent): PluginBuilderImpl {
    this.components.push(component);
    return this;
  }

  /**
   * Add multiple components
   */
  addComponents(components: ClientPluginComponent[]): PluginBuilderImpl {
    this.components.push(...components);
    return this;
  }

  /**
   * Set initialize function
   */
  setInitialize(initFn: (context: any) => Promise<void> | void): PluginBuilderImpl {
    (this.plugin as any).initialize = initFn;
    return this;
  }

  /**
   * Set destroy function
   */
  setDestroy(destroyFn: (context: any) => Promise<void> | void): PluginBuilderImpl {
    (this.plugin as any).destroy = destroyFn;
    return this;
  }

  /**
   * Build the plugin
   */
  build(): BasePlugin {
    // Validate required fields
    this.validateRequiredFields();

    // Generate ID if not provided
    if (!this.plugin.id) {
      this.plugin.id = generatePluginId();
    }

    // Set default type if not provided
    if (!this.plugin.type) {
      this.plugin.type = PLUGIN_TYPE.UNIVERSAL;
    }

    // Build the final plugin object
    const builtPlugin: any = { ...this.plugin };

    // Add hooks if any
    if (Object.keys(this.serverHooks).length > 0 || Object.keys(this.clientHooks).length > 0) {
      builtPlugin.hooks = {
        ...this.serverHooks,
        ...this.clientHooks,
      };
    }

    // Add server-specific properties
    if (this.plugin.type === PLUGIN_TYPE.SERVER || this.plugin.type === PLUGIN_TYPE.UNIVERSAL) {
      if (this.middleware.length > 0) {
        builtPlugin.middleware = [...this.middleware];
      }
      if (this.routes.length > 0) {
        builtPlugin.routes = [...this.routes];
      }
    }

    // Add client-specific properties
    if (this.plugin.type === PLUGIN_TYPE.CLIENT || this.plugin.type === PLUGIN_TYPE.UNIVERSAL) {
      if (this.components.length > 0) {
        builtPlugin.components = [...this.components];
      }
    }

    return builtPlugin as BasePlugin;
  }

  /**
   * Reset the builder
   */
  reset(): PluginBuilderImpl {
    this.plugin = {};
    this.serverHooks = {};
    this.clientHooks = {};
    this.middleware = [];
    this.routes = [];
    this.components = [];

    // Set default values
    this.plugin.priority = PLUGIN_PRIORITY.NORMAL;
    this.plugin.enabledByDefault = false;
    this.plugin.dependencies = [];
    this.plugin.peerDependencies = [];
    this.plugin.optionalDependencies = [];

    return this;
  }

  /**
   * Clone the builder
   */
  clone(): PluginBuilderImpl {
    const clone = new PluginBuilderImpl();
    clone.plugin = JSON.parse(JSON.stringify(this.plugin));
    clone.serverHooks = { ...this.serverHooks };
    clone.clientHooks = { ...this.clientHooks };
    clone.middleware = [...this.middleware];
    clone.routes = [...this.routes];
    clone.components = [...this.components];
    return clone;
  }

  /**
   * Validate required fields
   */
  private validateRequiredFields(): void {
    const errors: string[] = [];

    if (!this.plugin.name) {
      errors.push('Plugin name is required');
    }

    if (!this.plugin.version) {
      errors.push('Plugin version is required');
    }

    if (errors.length > 0) {
      throw new PluginError(`Plugin validation failed: ${errors.join(', ')}`);
    }
  }
}

/**
 * Create a new plugin builder
 */
export function createPluginBuilder(): IPluginBuilder {
  return new PluginBuilderImpl();
}

/**
 * Plugin builder factory with preset configurations
 */
export class PluginBuilderFactory {
  /**
   * Create server plugin builder
   */
  static createServerPlugin(): PluginBuilderImpl {
    return new PluginBuilderImpl().setType(PLUGIN_TYPE.SERVER);
  }

  /**
   * Create client plugin builder
   */
  static createClientPlugin(): PluginBuilderImpl {
    return new PluginBuilderImpl().setType(PLUGIN_TYPE.CLIENT);
  }

  /**
   * Create universal plugin builder
   */
  static createUniversalPlugin(): PluginBuilderImpl {
    return new PluginBuilderImpl().setType(PLUGIN_TYPE.UNIVERSAL);
  }

  /**
   * Create adapter plugin builder
   */
  static createAdapterPlugin(): PluginBuilderImpl {
    return new PluginBuilderImpl().setType(PLUGIN_TYPE.ADAPTER);
  }

  /**
   * Create middleware plugin builder
   */
  static createMiddlewarePlugin(): PluginBuilderImpl {
    return new PluginBuilderImpl().setType(PLUGIN_TYPE.MIDDLEWARE);
  }

  /**
   * Create auth provider plugin builder
   */
  static createAuthProviderPlugin(): PluginBuilderImpl {
    return new PluginBuilderImpl()
      .setType(PLUGIN_TYPE.AUTH_PROVIDER)
      .addCategory('authentication')
      .addTag('auth')
      .addTag('provider');
  }

  /**
   * Create database plugin builder
   */
  static createDatabasePlugin(): PluginBuilderImpl {
    return new PluginBuilderImpl()
      .setType(PLUGIN_TYPE.DATABASE)
      .addCategory('database')
      .addTag('db')
      .addTag('storage');
  }

  /**
   * Create UI component plugin builder
   */
  static createUIComponentPlugin(): PluginBuilderImpl {
    return new PluginBuilderImpl()
      .setType(PLUGIN_TYPE.UI_COMPONENT)
      .addCategory('ui')
      .addTag('component')
      .addTag('ui');
  }

  /**
   * Create extension plugin builder
   */
  static createExtensionPlugin(): PluginBuilderImpl {
    return new PluginBuilderImpl()
      .setType(PLUGIN_TYPE.EXTENSION)
      .addCategory('extension')
      .addTag('extension');
  }
}

/**
 * Export factory methods
 */
export const {
  createServerPlugin,
  createClientPlugin,
  createUniversalPlugin,
  createAdapterPlugin,
  createMiddlewarePlugin,
  createAuthProviderPlugin,
  createDatabasePlugin,
  createUIComponentPlugin,
  createExtensionPlugin,
} = PluginBuilderFactory;
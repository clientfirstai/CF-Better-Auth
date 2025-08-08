/**
 * BetterAuthAdapter - Main adapter class for CF-Better-Auth
 * Wraps better-auth with compatibility and extensibility layers
 */

import type { BetterAuth } from 'better-auth';
import { AuthWrapper } from './auth-wrapper';
import { ConfigurationManager } from './config';
import { CompatibilityLayer } from './compatibility';
import { MiddlewareStack } from './middleware';
import { ExtensionManager } from './extensions';
import { PluginAdapter } from './plugin-adapter';
import type { AdapterConfig, AdapterOptions, AdapterInstance } from './types';

export class BetterAuthAdapter implements AdapterInstance {
  private authWrapper: AuthWrapper;
  private configManager: ConfigurationManager;
  private compatibilityLayer: CompatibilityLayer;
  private middlewareStack: MiddlewareStack;
  private extensionManager: ExtensionManager;
  private pluginAdapter: PluginAdapter;
  private initialized: boolean = false;

  constructor(config: AdapterConfig, options?: AdapterOptions) {
    this.configManager = new ConfigurationManager(config);
    this.compatibilityLayer = new CompatibilityLayer(options?.betterAuthVersion);
    this.middlewareStack = new MiddlewareStack();
    this.extensionManager = new ExtensionManager();
    this.pluginAdapter = new PluginAdapter();
    this.authWrapper = new AuthWrapper(
      this.configManager,
      this.compatibilityLayer,
      this.middlewareStack
    );

    if (options?.debug) {
      this.enableDebugMode();
    }
  }

  /**
   * Initialize the adapter and underlying better-auth instance
   */
  async initialize(): Promise<void> {
    if (this.initialized) {
      console.warn('BetterAuthAdapter already initialized');
      return;
    }

    try {
      // Load and merge configurations
      await this.configManager.loadConfiguration();

      // Apply compatibility transformations
      const transformedConfig = await this.compatibilityLayer.transformConfig(
        this.configManager.getConfig()
      );

      // Initialize auth wrapper with transformed config
      await this.authWrapper.initialize(transformedConfig);

      // Load and initialize plugins
      await this.pluginAdapter.loadPlugins(transformedConfig.plugins || []);
      await this.pluginAdapter.initializePlugins(this.authWrapper.getInstance());

      // Load extensions
      await this.extensionManager.loadExtensions(transformedConfig.extensions || []);

      // Initialize middleware stack
      await this.middlewareStack.initialize();

      this.initialized = true;
      console.log('✅ BetterAuthAdapter initialized successfully');
    } catch (error) {
      console.error('Failed to initialize BetterAuthAdapter:', error);
      throw error;
    }
  }

  /**
   * Get the underlying better-auth instance
   */
  getAuthInstance(): BetterAuth | null {
    return this.authWrapper.getInstance();
  }

  /**
   * Get the configuration manager
   */
  getConfigManager(): ConfigurationManager {
    return this.configManager;
  }

  /**
   * Get the compatibility layer
   */
  getCompatibilityLayer(): CompatibilityLayer {
    return this.compatibilityLayer;
  }

  /**
   * Get the middleware stack
   */
  getMiddlewareStack(): MiddlewareStack {
    return this.middlewareStack;
  }

  /**
   * Get the extension manager
   */
  getExtensionManager(): ExtensionManager {
    return this.extensionManager;
  }

  /**
   * Get the plugin adapter
   */
  getPluginAdapter(): PluginAdapter {
    return this.pluginAdapter;
  }

  /**
   * Register a custom plugin
   */
  async registerPlugin(plugin: any): Promise<void> {
    if (!this.initialized) {
      throw new Error('Adapter must be initialized before registering plugins');
    }
    await this.pluginAdapter.registerPlugin(plugin, this.authWrapper.getInstance());
  }

  /**
   * Register a custom extension
   */
  async registerExtension(extension: any): Promise<void> {
    if (!this.initialized) {
      throw new Error('Adapter must be initialized before registering extensions');
    }
    await this.extensionManager.registerExtension(extension);
  }

  /**
   * Add middleware to the stack
   */
  addMiddleware(middleware: any): void {
    this.middlewareStack.add(middleware);
  }

  /**
   * Enable debug mode
   */
  private enableDebugMode(): void {
    console.log('🔍 Debug mode enabled for BetterAuthAdapter');
    this.configManager.enableDebug();
    this.compatibilityLayer.enableDebug();
    this.authWrapper.enableDebug();
  }

  /**
   * Gracefully shutdown the adapter
   */
  async shutdown(): Promise<void> {
    console.log('Shutting down BetterAuthAdapter...');
    await this.authWrapper.shutdown();
    await this.pluginAdapter.shutdown();
    await this.extensionManager.shutdown();
    this.initialized = false;
    console.log('BetterAuthAdapter shutdown complete');
  }
}
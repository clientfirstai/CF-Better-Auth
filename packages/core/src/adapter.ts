import type { BetterAuthOptions, BetterAuthInstance, CFAuthError } from '@cf-auth/types';
import { getCompatibilityLayer } from './compatibility';
import { mergeConfigurations } from './config';
import { createError, retry, getErrorMessage } from '@cf-auth/utils';

export interface AdapterEvents {
  initialized: () => void;
  error: (error: Error) => void;
  upgrade: (fromVersion: string, toVersion: string) => void;
}

export class BetterAuthAdapter {
  private betterAuthInstance: BetterAuthInstance | null = null;
  private customConfig: Partial<BetterAuthOptions> = {};
  private compatibilityLayer: ReturnType<typeof getCompatibilityLayer>;
  private eventListeners: Map<keyof AdapterEvents, Function[]> = new Map();
  private isInitializing = false;

  constructor(config?: Partial<BetterAuthOptions>) {
    this.customConfig = config || {};
    this.compatibilityLayer = getCompatibilityLayer();
  }

  async initialize(): Promise<void> {
    if (this.isInitializing) {
      throw createError('Adapter is already initializing', 'ADAPTER_INITIALIZING');
    }

    if (this.betterAuthInstance) {
      return; // Already initialized
    }

    this.isInitializing = true;

    try {
      const BetterAuth = await this.loadBetterAuth();
      const mergedConfig = mergeConfigurations(
        this.getDefaultConfig(),
        this.customConfig
      );
      
      // Validate configuration
      this.validateConfig(mergedConfig);
      
      // Transform config for compatibility
      const transformedConfig = this.compatibilityLayer.transformConfig(mergedConfig);
      
      // Initialize with retry logic
      this.betterAuthInstance = await retry(
        () => this.createBetterAuthInstance(BetterAuth, transformedConfig),
        3,
        1000,
        2
      );

      this.emit('initialized');
    } catch (error) {
      const wrappedError = createError(
        `Failed to initialize BetterAuth: ${getErrorMessage(error)}`,
        'ADAPTER_INIT_FAILED'
      );
      this.emit('error', wrappedError);
      throw wrappedError;
    } finally {
      this.isInitializing = false;
    }
  }

  private async createBetterAuthInstance(BetterAuth: any, config: any): Promise<BetterAuthInstance> {
    if (typeof BetterAuth === 'function') {
      return new BetterAuth(config);
    } else if (BetterAuth && typeof BetterAuth.create === 'function') {
      return BetterAuth.create(config);
    } else if (BetterAuth && typeof BetterAuth.betterAuth === 'function') {
      return BetterAuth.betterAuth(config);
    } else {
      throw createError('Unable to create BetterAuth instance - invalid module format', 'INVALID_MODULE');
    }
  }

  private async loadBetterAuth() {
    const loadErrors: Error[] = [];

    // Try loading from vendor directory first
    try {
      const vendorPath = '../../../vendor/better-auth';
      const module = await import(vendorPath);
      const auth = this.compatibilityLayer.wrapModule(module.default || module.betterAuth || module);
      
      if (auth) {
        return auth;
      }
    } catch (error) {
      loadErrors.push(error as Error);
    }

    // Try loading from node_modules
    try {
      const module = await import('better-auth');
      const auth = this.compatibilityLayer.wrapModule(module.default || module.betterAuth || module);
      
      if (auth) {
        return auth;
      }
    } catch (error) {
      loadErrors.push(error as Error);
    }

    // Try alternative package names
    const alternativePackages = ['@better-auth/core', 'better-auth-core'];
    
    for (const pkg of alternativePackages) {
      try {
        const module = await import(pkg);
        const auth = this.compatibilityLayer.wrapModule(module.default || module.betterAuth || module);
        
        if (auth) {
          return auth;
        }
      } catch (error) {
        loadErrors.push(error as Error);
      }
    }

    throw createError(
      `Failed to load better-auth module. Tried multiple sources. Errors: ${loadErrors.map(e => e.message).join(', ')}`,
      'MODULE_LOAD_FAILED'
    );
  }

  private validateConfig(config: BetterAuthOptions): void {
    if (!config.database) {
      throw createError('Database configuration is required', 'CONFIG_INVALID');
    }

    if (!config.secret && process.env.NODE_ENV === 'production') {
      throw createError('Secret is required in production environment', 'CONFIG_INVALID');
    }

    if (config.emailAndPassword?.enabled && !config.secret) {
      throw createError('Secret is required when email/password authentication is enabled', 'CONFIG_INVALID');
    }
  }

  private getDefaultConfig(): BetterAuthOptions {
    return {
      appName: process.env.APP_NAME || 'CF Better Auth',
      baseURL: process.env.BETTER_AUTH_URL || process.env.AUTH_URL,
      secret: process.env.BETTER_AUTH_SECRET || process.env.AUTH_SECRET,
      database: {
        provider: (process.env.DATABASE_PROVIDER as any) || 'postgresql',
        connectionString: process.env.DATABASE_URL
      },
      emailAndPassword: {
        enabled: true,
        requireEmailVerification: process.env.NODE_ENV === 'production',
        minPasswordLength: 8,
        maxPasswordLength: 128
      },
      session: {
        expiresIn: 60 * 60 * 24 * 7, // 7 days
        updateAge: 60 * 60 * 24 // 1 day
      },
      rateLimit: {
        enabled: process.env.NODE_ENV === 'production',
        window: 60,
        max: 100
      },
      trustedOrigins: process.env.TRUSTED_ORIGINS?.split(',') || []
    };
  }

  getInstance(): BetterAuthInstance {
    if (!this.betterAuthInstance) {
      throw createError('BetterAuth not initialized. Call initialize() first.', 'NOT_INITIALIZED');
    }
    return this.betterAuthInstance;
  }

  async upgrade(newVersion?: string): Promise<void> {
    const oldVersion = this.getVersion();
    
    try {
      await this.compatibilityLayer.checkCompatibility(newVersion);
      this.betterAuthInstance = null; // Reset instance
      await this.initialize();
      
      this.emit('upgrade', oldVersion, this.getVersion());
    } catch (error) {
      const wrappedError = createError(
        `Failed to upgrade from ${oldVersion} to ${newVersion}: ${getErrorMessage(error)}`,
        'UPGRADE_FAILED'
      );
      this.emit('error', wrappedError);
      throw wrappedError;
    }
  }

  async reset(): Promise<void> {
    this.betterAuthInstance = null;
    this.isInitializing = false;
    await this.initialize();
  }

  getVersion(): string {
    return this.compatibilityLayer.getVersion();
  }

  getConfig(): Partial<BetterAuthOptions> {
    return { ...this.customConfig };
  }

  updateConfig(newConfig: Partial<BetterAuthOptions>): void {
    this.customConfig = { ...this.customConfig, ...newConfig };
    // Note: Config changes require reinitialization
  }

  isInitialized(): boolean {
    return !!this.betterAuthInstance && !this.isInitializing;
  }

  isCompatibleWith(version: string): boolean {
    try {
      return this.compatibilityLayer.checkCompatibility(version) !== false;
    } catch {
      return false;
    }
  }

  // Event system
  on<K extends keyof AdapterEvents>(event: K, listener: AdapterEvents[K]): void {
    const listeners = this.eventListeners.get(event) || [];
    listeners.push(listener);
    this.eventListeners.set(event, listeners);
  }

  off<K extends keyof AdapterEvents>(event: K, listener: AdapterEvents[K]): void {
    const listeners = this.eventListeners.get(event) || [];
    const index = listeners.indexOf(listener);
    if (index > -1) {
      listeners.splice(index, 1);
    }
  }

  private emit<K extends keyof AdapterEvents>(event: K, ...args: Parameters<AdapterEvents[K]>): void {
    const listeners = this.eventListeners.get(event) || [];
    listeners.forEach(listener => {
      try {
        (listener as any)(...args);
      } catch (error) {
        console.error(`Error in event listener for ${event}:`, error);
      }
    });
  }

  // Health check
  async healthCheck(): Promise<{ healthy: boolean; issues: string[] }> {
    const issues: string[] = [];

    if (!this.isInitialized()) {
      issues.push('Adapter not initialized');
    }

    try {
      await this.compatibilityLayer.checkCompatibility();
    } catch (error) {
      issues.push(`Compatibility issue: ${getErrorMessage(error)}`);
    }

    if (!this.customConfig.database) {
      issues.push('No database configuration');
    }

    return {
      healthy: issues.length === 0,
      issues
    };
  }

  // Cleanup
  destroy(): void {
    this.betterAuthInstance = null;
    this.eventListeners.clear();
    this.isInitializing = false;
  }
}
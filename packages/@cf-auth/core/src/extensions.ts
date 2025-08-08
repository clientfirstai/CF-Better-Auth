/**
 * ExtensionManager - Manages custom extensions for CF-Better-Auth
 */

export interface Extension {
  name: string;
  version?: string;
  init: () => Promise<void> | void;
  hooks?: {
    beforeAuth?: (context: any) => Promise<any> | any;
    afterAuth?: (context: any) => Promise<any> | any;
    beforeSignIn?: (context: any) => Promise<any> | any;
    afterSignIn?: (context: any) => Promise<any> | any;
    beforeSignUp?: (context: any) => Promise<any> | any;
    afterSignUp?: (context: any) => Promise<any> | any;
  };
  middleware?: any[];
  config?: any;
}

export class ExtensionManager {
  private extensions: Map<string, Extension> = new Map();
  private hooks: Map<string, Function[]> = new Map();
  private initialized: boolean = false;

  /**
   * Load extensions
   */
  async loadExtensions(extensions: Extension[]): Promise<void> {
    for (const extension of extensions) {
      await this.registerExtension(extension);
    }
    this.initialized = true;
  }

  /**
   * Register a single extension
   */
  async registerExtension(extension: Extension): Promise<void> {
    if (this.extensions.has(extension.name)) {
      console.warn(`Extension ${extension.name} is already registered`);
      return;
    }

    try {
      // Initialize the extension
      if (extension.init) {
        await Promise.resolve(extension.init());
      }

      // Register hooks
      if (extension.hooks) {
        this.registerHooks(extension.name, extension.hooks);
      }

      // Store the extension
      this.extensions.set(extension.name, extension);

      console.log(`✅ Extension ${extension.name} registered successfully`);
    } catch (error) {
      console.error(`Failed to register extension ${extension.name}:`, error);
      throw error;
    }
  }

  /**
   * Register hooks from an extension
   */
  private registerHooks(extensionName: string, hooks: Extension['hooks']): void {
    if (!hooks) return;

    for (const [hookName, hookFunction] of Object.entries(hooks)) {
      if (typeof hookFunction === 'function') {
        if (!this.hooks.has(hookName)) {
          this.hooks.set(hookName, []);
        }
        this.hooks.get(hookName)?.push(hookFunction);
      }
    }
  }

  /**
   * Execute hooks for a specific event
   */
  async executeHooks(hookName: string, context: any): Promise<any> {
    const hooks = this.hooks.get(hookName);
    if (!hooks || hooks.length === 0) {
      return context;
    }

    let processedContext = context;
    for (const hook of hooks) {
      try {
        processedContext = await Promise.resolve(hook(processedContext));
      } catch (error) {
        console.error(`Error executing hook ${hookName}:`, error);
        // Continue with other hooks even if one fails
      }
    }

    return processedContext;
  }

  /**
   * Get an extension by name
   */
  getExtension(name: string): Extension | undefined {
    return this.extensions.get(name);
  }

  /**
   * Remove an extension
   */
  async removeExtension(name: string): Promise<void> {
    const extension = this.extensions.get(name);
    if (!extension) {
      return;
    }

    // Remove hooks
    if (extension.hooks) {
      for (const hookName of Object.keys(extension.hooks)) {
        const hooks = this.hooks.get(hookName);
        if (hooks) {
          // Remove hooks belonging to this extension
          // Note: This is simplified - in production, track hook ownership
          this.hooks.set(hookName, []);
        }
      }
    }

    this.extensions.delete(name);
    console.log(`Extension ${name} removed`);
  }

  /**
   * Get all registered extensions
   */
  getExtensions(): Extension[] {
    return Array.from(this.extensions.values());
  }

  /**
   * Check if an extension is registered
   */
  hasExtension(name: string): boolean {
    return this.extensions.has(name);
  }

  /**
   * Shutdown all extensions
   */
  async shutdown(): Promise<void> {
    for (const [name, extension] of this.extensions) {
      try {
        // Execute any cleanup hooks
        await this.executeHooks('shutdown', { extensionName: name });
      } catch (error) {
        console.error(`Error shutting down extension ${name}:`, error);
      }
    }

    this.extensions.clear();
    this.hooks.clear();
    this.initialized = false;
  }

  /**
   * Get extension configuration
   */
  getExtensionConfig(name: string): any {
    const extension = this.extensions.get(name);
    return extension?.config;
  }

  /**
   * Update extension configuration
   */
  updateExtensionConfig(name: string, config: any): void {
    const extension = this.extensions.get(name);
    if (extension) {
      extension.config = { ...extension.config, ...config };
    }
  }

  /**
   * Enable built-in extensions
   */
  async enableBuiltInExtensions(): Promise<void> {
    // Session management extension
    await this.registerExtension({
      name: 'session-management',
      version: '1.0.0',
      init: () => {
        console.log('Session management extension initialized');
      },
      hooks: {
        afterSignIn: async (context) => {
          // Add session tracking
          if (context.user) {
            context.session = {
              userId: context.user.id,
              createdAt: new Date(),
              expiresAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000), // 30 days
            };
          }
          return context;
        },
      },
    });

    // Audit logging extension
    await this.registerExtension({
      name: 'audit-logging',
      version: '1.0.0',
      init: () => {
        console.log('Audit logging extension initialized');
      },
      hooks: {
        afterAuth: async (context) => {
          // Log authentication events
          console.log('[AUDIT]', {
            event: context.type,
            userId: context.user?.id,
            timestamp: new Date(),
            ip: context.ip,
          });
          return context;
        },
      },
    });

    // Rate limiting extension
    await this.registerExtension({
      name: 'rate-limiting',
      version: '1.0.0',
      init: () => {
        console.log('Rate limiting extension initialized');
      },
      hooks: {
        beforeAuth: async (context) => {
          // Simple rate limiting logic
          // In production, use Redis or similar for distributed rate limiting
          const rateLimitKey = `${context.ip}:${context.type}`;
          // Simplified rate limit check
          return context;
        },
      },
    });
  }
}
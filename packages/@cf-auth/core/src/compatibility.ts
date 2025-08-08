/**
 * CompatibilityLayer - Handles version compatibility and transformations
 */

import { version as cfAuthVersion } from './version';

interface VersionTransform {
  from: string;
  to: string;
  transform: (config: any) => any;
}

export class CompatibilityLayer {
  private betterAuthVersion: string;
  private debug: boolean = false;
  private transforms: VersionTransform[] = [];

  constructor(betterAuthVersion?: string) {
    this.betterAuthVersion = betterAuthVersion || this.detectBetterAuthVersion();
    this.loadTransforms();
  }

  /**
   * Detect the installed better-auth version
   */
  private detectBetterAuthVersion(): string {
    try {
      // Try to import better-auth package.json to get version
      const betterAuthPkg = require('better-auth/package.json');
      return betterAuthPkg.version;
    } catch (error) {
      console.warn('Could not detect better-auth version, assuming latest');
      return 'latest';
    }
  }

  /**
   * Load version-specific transformations
   */
  private loadTransforms(): void {
    // Example transformations for different better-auth versions
    this.transforms = [
      {
        from: '0.x',
        to: '1.0',
        transform: this.transformV0ToV1.bind(this),
      },
      {
        from: '1.0',
        to: '1.1',
        transform: this.transformV1_0ToV1_1.bind(this),
      },
      {
        from: '1.1',
        to: '2.0',
        transform: this.transformV1_1ToV2_0.bind(this),
      },
    ];
  }

  /**
   * Transform configuration for compatibility
   */
  async transformConfig(config: any): Promise<any> {
    let transformedConfig = { ...config };

    // Apply necessary transformations based on version
    for (const transform of this.transforms) {
      if (this.shouldApplyTransform(transform)) {
        if (this.debug) {
          console.log(`Applying transformation from ${transform.from} to ${transform.to}`);
        }
        transformedConfig = transform.transform(transformedConfig);
      }
    }

    return transformedConfig;
  }

  /**
   * Check if a transformation should be applied
   */
  private shouldApplyTransform(transform: VersionTransform): boolean {
    // Simplified version comparison logic
    // In production, use semver for proper version comparison
    const majorVersion = this.betterAuthVersion.split('.')[0];
    const transformMajor = transform.to.split('.')[0];
    return majorVersion >= transformMajor;
  }

  /**
   * Wrap configuration with compatibility shims
   */
  wrapConfig(config: any): any {
    const wrapped = { ...config };

    // Add compatibility shims
    wrapped.__cfAuthVersion = cfAuthVersion;
    wrapped.__betterAuthVersion = this.betterAuthVersion;

    // Add compatibility hooks
    if (!wrapped.hooks) {
      wrapped.hooks = {};
    }

    // Add compatibility middleware
    wrapped.hooks.before = [
      ...(wrapped.hooks.before || []),
      this.createCompatibilityHook(),
    ];

    return wrapped;
  }

  /**
   * Create a compatibility hook
   */
  private createCompatibilityHook() {
    return async (context: any) => {
      if (this.debug) {
        console.log('Compatibility hook triggered:', context.type);
      }

      // Add any necessary compatibility transformations
      if (context.type === 'signIn' && context.data) {
        // Handle any sign-in compatibility issues
        context.data = this.normalizeSignInData(context.data);
      }

      return context;
    };
  }

  /**
   * Normalize sign-in data for compatibility
   */
  private normalizeSignInData(data: any): any {
    // Handle different field names across versions
    if (data.username && !data.email) {
      data.email = data.username;
    }

    return data;
  }

  /**
   * Transform v0.x config to v1.0
   */
  private transformV0ToV1(config: any): any {
    const transformed = { ...config };

    // Handle renamed properties
    if (config.emailProvider && !config.email) {
      transformed.email = {
        provider: config.emailProvider,
        ...config.emailConfig,
      };
      delete transformed.emailProvider;
      delete transformed.emailConfig;
    }

    // Handle new required properties
    if (!transformed.session) {
      transformed.session = {
        maxAge: 30 * 24 * 60 * 60 * 1000, // 30 days
      };
    }

    return transformed;
  }

  /**
   * Transform v1.0 config to v1.1
   */
  private transformV1_0ToV1_1(config: any): any {
    const transformed = { ...config };

    // Handle plugin interface changes
    if (transformed.plugins && Array.isArray(transformed.plugins)) {
      transformed.plugins = transformed.plugins.map((plugin: any) => {
        if (typeof plugin === 'function') {
          // Wrap function plugins in object format
          return {
            init: plugin,
            name: plugin.name || 'unnamed-plugin',
          };
        }
        return plugin;
      });
    }

    return transformed;
  }

  /**
   * Transform v1.1 config to v2.0
   */
  private transformV1_1ToV2_0(config: any): any {
    const transformed = { ...config };

    // Handle async plugin initialization
    if (transformed.plugins && Array.isArray(transformed.plugins)) {
      transformed.plugins = transformed.plugins.map((plugin: any) => {
        if (plugin.init && plugin.init.constructor.name !== 'AsyncFunction') {
          // Wrap sync init in async
          const syncInit = plugin.init;
          plugin.init = async (...args: any[]) => syncInit(...args);
        }
        return plugin;
      });
    }

    // Handle new security requirements
    if (!transformed.advanced) {
      transformed.advanced = {};
    }

    if (transformed.advanced.disableCSRFCheck === undefined) {
      transformed.advanced.disableCSRFCheck = false;
    }

    return transformed;
  }

  /**
   * Check compatibility with current better-auth version
   */
  async checkCompatibility(): Promise<{
    compatible: boolean;
    warnings: string[];
    errors: string[];
  }> {
    const warnings: string[] = [];
    const errors: string[] = [];

    // Check version compatibility
    const majorVersion = this.betterAuthVersion.split('.')[0];
    if (majorVersion === '0') {
      warnings.push('Using beta version of better-auth, some features may be unstable');
    }

    // Check for breaking changes
    if (majorVersion >= '2') {
      warnings.push('Major version 2.0+ detected, ensure all plugins are compatible');
    }

    const compatible = errors.length === 0;

    return {
      compatible,
      warnings,
      errors,
    };
  }

  /**
   * Enable debug mode
   */
  enableDebug(): void {
    this.debug = true;
  }

  /**
   * Get version information
   */
  getVersionInfo() {
    return {
      cfAuthVersion,
      betterAuthVersion: this.betterAuthVersion,
      compatibilityLevel: this.getCompatibilityLevel(),
    };
  }

  /**
   * Get compatibility level
   */
  private getCompatibilityLevel(): string {
    const majorVersion = this.betterAuthVersion.split('.')[0];
    switch (majorVersion) {
      case '0':
        return 'experimental';
      case '1':
        return 'stable';
      case '2':
        return 'advanced';
      default:
        return 'unknown';
    }
  }
}
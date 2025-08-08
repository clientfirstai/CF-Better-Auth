/**
 * ConfigurationManager - Manages configuration loading and merging
 */

import { z } from 'zod';
import type { AdapterConfig } from './types';

const ConfigSchema = z.object({
  database: z.any().optional(),
  email: z.any().optional(),
  session: z.object({
    maxAge: z.number().optional(),
    updateAge: z.number().optional(),
  }).optional(),
  user: z.object({
    additionalFields: z.any().optional(),
  }).optional(),
  plugins: z.array(z.any()).optional(),
  extensions: z.array(z.any()).optional(),
  trustedOrigins: z.array(z.string()).optional(),
  baseURL: z.string().optional(),
  secret: z.string().optional(),
  rateLimit: z.any().optional(),
  advanced: z.object({
    disableCSRFCheck: z.boolean().optional(),
    generateId: z.function().optional(),
  }).optional(),
});

export class ConfigurationManager {
  private config: AdapterConfig;
  private mergedConfig: any = null;
  private debug: boolean = false;
  private configSources: Map<string, any> = new Map();

  constructor(initialConfig: AdapterConfig) {
    this.config = initialConfig;
  }

  /**
   * Load configuration from all sources
   */
  async loadConfiguration(): Promise<void> {
    try {
      // Load from environment variables
      this.loadEnvironmentVariables();

      // Load from configuration file if exists
      await this.loadConfigFile();

      // Load from package.json if exists
      await this.loadPackageJson();

      // Merge all configurations
      this.mergeConfigurations();

      // Validate final configuration
      this.validateConfiguration();

      if (this.debug) {
        console.log('Configuration loaded successfully');
      }
    } catch (error) {
      console.error('Failed to load configuration:', error);
      throw error;
    }
  }

  /**
   * Load environment variables
   */
  private loadEnvironmentVariables(): void {
    const envConfig: any = {};

    // Database configuration
    if (process.env.DATABASE_URL) {
      envConfig.database = {
        provider: 'postgresql',
        connectionString: process.env.DATABASE_URL,
      };
    }

    // Session configuration
    if (process.env.SESSION_MAX_AGE) {
      envConfig.session = {
        maxAge: parseInt(process.env.SESSION_MAX_AGE, 10),
      };
    }

    // Security configuration
    if (process.env.AUTH_SECRET) {
      envConfig.secret = process.env.AUTH_SECRET;
    }

    if (process.env.AUTH_BASE_URL) {
      envConfig.baseURL = process.env.AUTH_BASE_URL;
    }

    if (process.env.TRUSTED_ORIGINS) {
      envConfig.trustedOrigins = process.env.TRUSTED_ORIGINS.split(',');
    }

    // Email configuration
    if (process.env.SMTP_HOST) {
      envConfig.email = {
        provider: 'smtp',
        options: {
          host: process.env.SMTP_HOST,
          port: parseInt(process.env.SMTP_PORT || '587', 10),
          secure: process.env.SMTP_SECURE === 'true',
          auth: {
            user: process.env.SMTP_USER,
            pass: process.env.SMTP_PASS,
          },
        },
      };
    }

    if (Object.keys(envConfig).length > 0) {
      this.configSources.set('environment', envConfig);
    }
  }

  /**
   * Load configuration from cf-auth.config.js
   */
  private async loadConfigFile(): Promise<void> {
    try {
      const configPath = process.cwd() + '/cf-auth.config.js';
      const fileConfig = await import(configPath);
      if (fileConfig.default) {
        this.configSources.set('file', fileConfig.default);
      }
    } catch (error) {
      // Config file is optional
      if (this.debug) {
        console.log('No cf-auth.config.js found, skipping');
      }
    }
  }

  /**
   * Load configuration from package.json
   */
  private async loadPackageJson(): Promise<void> {
    try {
      const packagePath = process.cwd() + '/package.json';
      const packageJson = await import(packagePath);
      if (packageJson['cf-auth']) {
        this.configSources.set('package', packageJson['cf-auth']);
      }
    } catch (error) {
      // Package.json config is optional
      if (this.debug) {
        console.log('No cf-auth config in package.json, skipping');
      }
    }
  }

  /**
   * Merge configurations with priority
   * Priority: Environment > File > Package > Initial
   */
  private mergeConfigurations(): void {
    this.mergedConfig = { ...this.config };

    // Merge package.json config
    if (this.configSources.has('package')) {
      this.mergedConfig = this.deepMerge(this.mergedConfig, this.configSources.get('package'));
    }

    // Merge file config
    if (this.configSources.has('file')) {
      this.mergedConfig = this.deepMerge(this.mergedConfig, this.configSources.get('file'));
    }

    // Merge environment config (highest priority)
    if (this.configSources.has('environment')) {
      this.mergedConfig = this.deepMerge(this.mergedConfig, this.configSources.get('environment'));
    }
  }

  /**
   * Deep merge two objects
   */
  private deepMerge(target: any, source: any): any {
    const result = { ...target };

    for (const key in source) {
      if (source[key] instanceof Object && !Array.isArray(source[key])) {
        result[key] = this.deepMerge(result[key] || {}, source[key]);
      } else {
        result[key] = source[key];
      }
    }

    return result;
  }

  /**
   * Validate the merged configuration
   */
  private validateConfiguration(): void {
    try {
      ConfigSchema.parse(this.mergedConfig);
    } catch (error) {
      console.error('Configuration validation failed:', error);
      throw new Error('Invalid configuration');
    }
  }

  /**
   * Get the merged configuration
   */
  getConfig(): any {
    return this.mergedConfig || this.config;
  }

  /**
   * Update configuration
   */
  updateConfig(updates: Partial<AdapterConfig>): void {
    this.config = { ...this.config, ...updates };
    this.mergeConfigurations();
    this.validateConfiguration();
  }

  /**
   * Get a specific configuration value
   */
  get(path: string): any {
    const keys = path.split('.');
    let value = this.getConfig();

    for (const key of keys) {
      value = value?.[key];
      if (value === undefined) {
        return undefined;
      }
    }

    return value;
  }

  /**
   * Set a specific configuration value
   */
  set(path: string, value: any): void {
    const keys = path.split('.');
    const lastKey = keys.pop();
    let target = this.mergedConfig || this.config;

    for (const key of keys) {
      if (!target[key]) {
        target[key] = {};
      }
      target = target[key];
    }

    if (lastKey) {
      target[lastKey] = value;
    }

    this.validateConfiguration();
  }

  /**
   * Enable debug mode
   */
  enableDebug(): void {
    this.debug = true;
  }
}
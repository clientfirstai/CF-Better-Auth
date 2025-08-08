import { readFileSync, existsSync } from 'fs';
import { join } from 'path';
import type { BetterAuthOptions } from '@cf-auth/types';
import { isString, isBoolean } from '@cf-auth/utils';

export interface EnvironmentConfig {
  /** Environment name (development, production, test) */
  environment: string;
  /** Load .env files */
  loadEnvFiles: boolean;
  /** Environment file names to load in order */
  envFiles: string[];
  /** Prefix for CF-Auth environment variables */
  envPrefix: string;
  /** Transform environment variable names */
  transformKeys: boolean;
}

export interface LoadedEnvVar {
  key: string;
  value: string;
  source: string;
}

export class EnvironmentLoader {
  private loadedVars: LoadedEnvVar[] = [];
  private originalEnv: Record<string, string>;

  constructor(
    private projectRoot: string = process.cwd(),
    private config: Partial<EnvironmentConfig> = {}
  ) {
    this.originalEnv = { ...process.env } as Record<string, string>;
    
    // Set defaults
    this.config = {
      environment: process.env.NODE_ENV || 'development',
      loadEnvFiles: true,
      envFiles: ['.env.local', '.env'],
      envPrefix: 'CF_AUTH_',
      transformKeys: true,
      ...this.config
    };
  }

  async loadEnvironment(): Promise<BetterAuthOptions> {
    this.loadedVars = [];

    if (this.config.loadEnvFiles) {
      this.loadEnvFiles();
    }

    const authConfig = this.extractAuthConfig();
    return authConfig;
  }

  private loadEnvFiles(): void {
    const environment = this.config.environment!;
    
    // Load environment-specific files first (higher priority)
    const envFiles = [
      `.env.${environment}.local`,
      `.env.${environment}`,
      ...this.config.envFiles!
    ];

    for (const envFile of envFiles) {
      this.loadEnvFile(envFile);
    }
  }

  private loadEnvFile(filename: string): void {
    const filePath = join(this.projectRoot, filename);
    
    if (!existsSync(filePath)) {
      return;
    }

    try {
      const content = readFileSync(filePath, 'utf-8');
      const lines = content.split('\n');
      
      for (let i = 0; i < lines.length; i++) {
        const line = lines[i].trim();
        
        // Skip empty lines and comments
        if (!line || line.startsWith('#')) {
          continue;
        }

        // Handle multiline values
        let currentLine = line;
        if ((line.match(/"/g) || []).length === 1) {
          // Multiline string starting
          for (let j = i + 1; j < lines.length; j++) {
            currentLine += '\n' + lines[j];
            if ((lines[j].match(/"/g) || []).length === 1) {
              i = j; // Skip processed lines
              break;
            }
          }
        }

        this.parseEnvLine(currentLine, filename);
      }
    } catch (error) {
      console.warn(`Failed to load environment file ${filename}:`, error);
    }
  }

  private parseEnvLine(line: string, source: string): void {
    const equalIndex = line.indexOf('=');
    if (equalIndex === -1) return;

    const key = line.slice(0, equalIndex).trim();
    let value = line.slice(equalIndex + 1).trim();

    // Remove quotes if present
    if ((value.startsWith('"') && value.endsWith('"')) ||
        (value.startsWith("'") && value.endsWith("'"))) {
      value = value.slice(1, -1);
    }

    // Handle escaped characters
    value = value
      .replace(/\\n/g, '\n')
      .replace(/\\r/g, '\r')
      .replace(/\\t/g, '\t')
      .replace(/\\\\/g, '\\')
      .replace(/\\"/g, '"')
      .replace(/\\'/g, "'");

    // Only set if not already defined (process.env takes precedence)
    if (!(key in process.env)) {
      process.env[key] = value;
    }

    this.loadedVars.push({ key, value, source });
  }

  private extractAuthConfig(): BetterAuthOptions {
    const config: any = {};
    const prefix = this.config.envPrefix!;

    // Direct mapping of environment variables to config
    const envMappings: Record<string, (value: string) => any> = {
      // Basic config
      [`${prefix}SECRET`]: (v) => v,
      [`${prefix}BASE_URL`]: (v) => v,
      [`${prefix}BASE_PATH`]: (v) => v,
      [`${prefix}APP_NAME`]: (v) => v,

      // Alternative naming patterns
      'BETTER_AUTH_SECRET': (v) => v,
      'BETTER_AUTH_URL': (v) => v,
      'AUTH_SECRET': (v) => v,
      'AUTH_URL': (v) => v,
      'NEXTAUTH_SECRET': (v) => v,
      'NEXTAUTH_URL': (v) => v,

      // Database
      'DATABASE_URL': (v) => ({ 
        provider: this.detectDatabaseProvider(v), 
        connectionString: v 
      }),
      [`${prefix}DATABASE_PROVIDER`]: (v) => ({ provider: v }),
      [`${prefix}DATABASE_URL`]: (v) => ({ connectionString: v }),

      // Session
      [`${prefix}SESSION_EXPIRES_IN`]: (v) => ({ expiresIn: parseInt(v) || 604800 }),
      [`${prefix}SESSION_UPDATE_AGE`]: (v) => ({ updateAge: parseInt(v) || 86400 }),

      // Email & Password
      [`${prefix}EMAIL_PASSWORD_ENABLED`]: (v) => ({ enabled: this.parseBoolean(v) }),
      [`${prefix}EMAIL_VERIFICATION_REQUIRED`]: (v) => ({ requireEmailVerification: this.parseBoolean(v) }),
      [`${prefix}MIN_PASSWORD_LENGTH`]: (v) => ({ minPasswordLength: parseInt(v) || 8 }),
      [`${prefix}MAX_PASSWORD_LENGTH`]: (v) => ({ maxPasswordLength: parseInt(v) || 128 }),

      // Social Providers
      'GOOGLE_CLIENT_ID': (v) => ({ google: { clientId: v } }),
      'GOOGLE_CLIENT_SECRET': (v) => ({ google: { clientSecret: v } }),
      'GITHUB_CLIENT_ID': (v) => ({ github: { clientId: v } }),
      'GITHUB_CLIENT_SECRET': (v) => ({ github: { clientSecret: v } }),
      'FACEBOOK_CLIENT_ID': (v) => ({ facebook: { clientId: v } }),
      'FACEBOOK_CLIENT_SECRET': (v) => ({ facebook: { clientSecret: v } }),

      // Rate Limiting
      [`${prefix}RATE_LIMIT_ENABLED`]: (v) => ({ enabled: this.parseBoolean(v) }),
      [`${prefix}RATE_LIMIT_WINDOW`]: (v) => ({ window: parseInt(v) || 60 }),
      [`${prefix}RATE_LIMIT_MAX`]: (v) => ({ max: parseInt(v) || 100 }),

      // Advanced
      [`${prefix}USE_SECURE_COOKIES`]: (v) => ({ useSecureCookies: this.parseBoolean(v) }),
      [`${prefix}DISABLE_CSRF_CHECK`]: (v) => ({ disableCSRFCheck: this.parseBoolean(v) }),
      [`${prefix}COOKIE_PREFIX`]: (v) => ({ cookiePrefix: v })
    };

    // Process environment variables
    for (const [envKey, transformer] of Object.entries(envMappings)) {
      const value = process.env[envKey];
      if (value !== undefined) {
        const configValue = transformer(value);
        this.deepMergeConfig(config, this.getConfigPath(envKey), configValue);
      }
    }

    // Handle trusted origins (comma-separated list)
    const trustedOrigins = process.env[`${prefix}TRUSTED_ORIGINS`];
    if (trustedOrigins) {
      config.trustedOrigins = trustedOrigins.split(',').map(s => s.trim());
    }

    return config;
  }

  private detectDatabaseProvider(url: string): string {
    if (url.startsWith('postgres://') || url.startsWith('postgresql://')) {
      return 'postgresql';
    }
    if (url.startsWith('mysql://')) {
      return 'mysql';
    }
    if (url.startsWith('sqlite://') || url.endsWith('.db') || url.endsWith('.sqlite')) {
      return 'sqlite';
    }
    if (url.startsWith('mongodb://') || url.startsWith('mongodb+srv://')) {
      return 'mongodb';
    }
    return 'postgresql'; // Default
  }

  private parseBoolean(value: string): boolean {
    return ['true', '1', 'yes', 'on'].includes(value.toLowerCase());
  }

  private getConfigPath(envKey: string): string[] {
    const prefix = this.config.envPrefix!;
    
    // Map environment variable names to config paths
    const pathMappings: Record<string, string[]> = {
      [`${prefix}SECRET`]: ['secret'],
      [`${prefix}BASE_URL`]: ['baseURL'],
      [`${prefix}BASE_PATH`]: ['basePath'],
      [`${prefix}APP_NAME`]: ['appName'],
      [`${prefix}DATABASE_PROVIDER`]: ['database', 'provider'],
      [`${prefix}DATABASE_URL`]: ['database', 'connectionString'],
      'DATABASE_URL': ['database'],
      [`${prefix}SESSION_EXPIRES_IN`]: ['session'],
      [`${prefix}SESSION_UPDATE_AGE`]: ['session'],
      [`${prefix}EMAIL_PASSWORD_ENABLED`]: ['emailAndPassword'],
      [`${prefix}EMAIL_VERIFICATION_REQUIRED`]: ['emailAndPassword'],
      [`${prefix}MIN_PASSWORD_LENGTH`]: ['emailAndPassword'],
      [`${prefix}MAX_PASSWORD_LENGTH`]: ['emailAndPassword'],
      'GOOGLE_CLIENT_ID': ['socialProviders'],
      'GOOGLE_CLIENT_SECRET': ['socialProviders'],
      'GITHUB_CLIENT_ID': ['socialProviders'],
      'GITHUB_CLIENT_SECRET': ['socialProviders'],
      'FACEBOOK_CLIENT_ID': ['socialProviders'],
      'FACEBOOK_CLIENT_SECRET': ['socialProviders'],
      [`${prefix}RATE_LIMIT_ENABLED`]: ['rateLimit'],
      [`${prefix}RATE_LIMIT_WINDOW`]: ['rateLimit'],
      [`${prefix}RATE_LIMIT_MAX`]: ['rateLimit'],
      [`${prefix}USE_SECURE_COOKIES`]: ['advanced'],
      [`${prefix}DISABLE_CSRF_CHECK`]: ['advanced'],
      [`${prefix}COOKIE_PREFIX`]: ['advanced']
    };

    return pathMappings[envKey] || ['unknown'];
  }

  private deepMergeConfig(config: any, path: string[], value: any): void {
    let current = config;
    
    for (let i = 0; i < path.length - 1; i++) {
      const key = path[i];
      if (!(key in current)) {
        current[key] = {};
      }
      current = current[key];
    }

    const lastKey = path[path.length - 1];
    if (typeof value === 'object' && value !== null && !Array.isArray(value)) {
      if (!(lastKey in current)) {
        current[lastKey] = {};
      }
      Object.assign(current[lastKey], value);
    } else {
      current[lastKey] = value;
    }
  }

  getLoadedVars(): LoadedEnvVar[] {
    return [...this.loadedVars];
  }

  getVarsBySource(source: string): LoadedEnvVar[] {
    return this.loadedVars.filter(v => v.source === source);
  }

  restoreEnvironment(): void {
    // Restore original environment
    for (const key in process.env) {
      if (!(key in this.originalEnv)) {
        delete process.env[key];
      }
    }
    
    for (const [key, value] of Object.entries(this.originalEnv)) {
      process.env[key] = value;
    }
  }

  // Static convenience methods
  static async loadForEnvironment(environment: string, projectRoot?: string): Promise<BetterAuthOptions> {
    const loader = new EnvironmentLoader(projectRoot, { environment });
    return loader.loadEnvironment();
  }

  static async loadProduction(projectRoot?: string): Promise<BetterAuthOptions> {
    return this.loadForEnvironment('production', projectRoot);
  }

  static async loadDevelopment(projectRoot?: string): Promise<BetterAuthOptions> {
    return this.loadForEnvironment('development', projectRoot);
  }

  static async loadTest(projectRoot?: string): Promise<BetterAuthOptions> {
    return this.loadForEnvironment('test', projectRoot);
  }
}
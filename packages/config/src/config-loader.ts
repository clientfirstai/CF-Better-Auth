import { readFileSync, existsSync } from 'fs';
import { join } from 'path';
import type { BetterAuthOptions } from '@cf-auth/types';
import { deepMerge } from '@cf-auth/utils';

export interface ConfigSource {
  name: string;
  path?: string;
  priority: number;
  loader: () => Partial<BetterAuthOptions> | Promise<Partial<BetterAuthOptions>>;
}

export class ConfigLoader {
  private sources: ConfigSource[] = [];
  private cache: Map<string, Partial<BetterAuthOptions>> = new Map();
  private merged: BetterAuthOptions | null = null;

  constructor(private projectRoot: string = process.cwd()) {
    this.registerDefaultSources();
  }

  private registerDefaultSources(): void {
    // Environment variables (highest priority)
    this.addSource({
      name: 'environment',
      priority: 100,
      loader: () => this.loadFromEnvironment()
    });

    // cf-auth.config.js file
    this.addSource({
      name: 'cf-auth.config',
      path: join(this.projectRoot, 'cf-auth.config.js'),
      priority: 50,
      loader: () => this.loadFromFile('cf-auth.config.js')
    });

    // .env file
    this.addSource({
      name: '.env',
      path: join(this.projectRoot, '.env'),
      priority: 40,
      loader: () => this.loadFromDotEnv()
    });

    // Default configuration (lowest priority)
    this.addSource({
      name: 'defaults',
      priority: 0,
      loader: () => this.getDefaultConfig()
    });
  }

  addSource(source: ConfigSource): void {
    this.sources.push(source);
    this.sources.sort((a, b) => a.priority - b.priority);
    this.clearCache();
  }

  removeSource(name: string): void {
    this.sources = this.sources.filter(s => s.name !== name);
    this.clearCache();
  }

  private clearCache(): void {
    this.cache.clear();
    this.merged = null;
  }

  async load(): Promise<BetterAuthOptions> {
    if (this.merged) {
      return this.merged;
    }

    let merged: any = {};

    for (const source of this.sources) {
      try {
        let config = this.cache.get(source.name);
        
        if (!config) {
          config = await source.loader();
          this.cache.set(source.name, config);
        }

        merged = deepMerge(merged, config);
      } catch (error) {
        console.warn(`Failed to load config from ${source.name}:`, error);
      }
    }

    this.merged = merged as BetterAuthOptions;
    return this.merged;
  }

  private loadFromEnvironment(): Partial<BetterAuthOptions> {
    const config: Partial<BetterAuthOptions> = {};

    if (process.env.DATABASE_URL) {
      config.database = {
        provider: (process.env.DATABASE_PROVIDER as any) || 'postgresql',
        connectionString: process.env.DATABASE_URL
      };
    }

    if (process.env.AUTH_SECRET) {
      config.secret = process.env.AUTH_SECRET;
    }

    if (process.env.AUTH_URL) {
      config.baseURL = process.env.AUTH_URL;
    }

    if (process.env.AUTH_TRUST_HOST === 'true') {
      config.trustHost = true;
    }

    if (process.env.SESSION_EXPIRES_IN) {
      config.session = {
        expiresIn: parseInt(process.env.SESSION_EXPIRES_IN)
      };
    }

    return config;
  }

  private async loadFromFile(filename: string): Promise<Partial<BetterAuthOptions>> {
    const filePath = join(this.projectRoot, filename);
    
    if (!existsSync(filePath)) {
      return {};
    }

    try {
      const module = await import(filePath);
      return module.default || module;
    } catch (error) {
      console.error(`Failed to load config from ${filename}:`, error);
      return {};
    }
  }

  private loadFromDotEnv(): Partial<BetterAuthOptions> {
    const envPath = join(this.projectRoot, '.env');
    
    if (!existsSync(envPath)) {
      return {};
    }

    try {
      const content = readFileSync(envPath, 'utf-8');
      const lines = content.split('\n');
      
      for (const line of lines) {
        const trimmed = line.trim();
        if (!trimmed || trimmed.startsWith('#')) continue;
        
        const [key, ...valueParts] = trimmed.split('=');
        const value = valueParts.join('=').replace(/^["']|["']$/g, '');
        
        if (key && value) {
          process.env[key] = value;
        }
      }
    } catch (error) {
      console.error('Failed to load .env file:', error);
    }

    return this.loadFromEnvironment();
  }

  private getDefaultConfig(): Partial<BetterAuthOptions> {
    return {
      database: {
        provider: 'postgresql',
        connectionString: ''
      },
      session: {
        expiresIn: 60 * 60 * 24 * 7,
        updateAge: 60 * 60 * 24
      },
      emailAndPassword: {
        enabled: true,
        requireEmailVerification: false
      },
      rateLimit: {
        enabled: true,
        window: 60,
        max: 10
      }
    };
  }

  getConfig(path?: string): any {
    if (!this.merged) {
      throw new Error('Configuration not loaded. Call load() first.');
    }

    if (!path) {
      return this.merged;
    }

    const parts = path.split('.');
    let current: any = this.merged;

    for (const part of parts) {
      if (current && typeof current === 'object' && part in current) {
        current = current[part];
      } else {
        return undefined;
      }
    }

    return current;
  }

  validate(): { valid: boolean; errors: string[] } {
    const errors: string[] = [];

    if (!this.merged) {
      errors.push('Configuration not loaded');
      return { valid: false, errors };
    }

    if (!this.merged.database) {
      errors.push('Database configuration is required');
    } else if (!this.merged.database.connectionString && !this.merged.database.url) {
      errors.push('Database connection string or URL is required');
    }

    if (this.merged.emailAndPassword?.enabled && !this.merged.secret) {
      errors.push('Secret is required when email/password authentication is enabled');
    }

    return {
      valid: errors.length === 0,
      errors
    };
  }

  async reload(): Promise<BetterAuthOptions> {
    this.clearCache();
    return this.load();
  }
}
import type { BetterAuthOptions } from '@cf-auth/types';
import { deepMerge } from '@cf-auth/utils';

export function mergeConfigurations(
  base: BetterAuthOptions,
  custom: Partial<BetterAuthOptions>
): BetterAuthOptions {
  return deepMerge(base, custom) as BetterAuthOptions;
}

export function validateConfiguration(config: BetterAuthOptions): void {
  if (!config.database) {
    throw new Error('Database configuration is required');
  }

  if (!config.database.connectionString && !config.database.url) {
    throw new Error('Database connection string or URL is required');
  }
}

export function loadEnvironmentConfig(): Partial<BetterAuthOptions> {
  const config: Partial<BetterAuthOptions> = {};

  if (process.env.DATABASE_URL) {
    config.database = {
      provider: process.env.DATABASE_PROVIDER as any || 'postgresql',
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

  return config;
}

export function createConfig(
  userConfig?: Partial<BetterAuthOptions>
): BetterAuthOptions {
  const envConfig = loadEnvironmentConfig();
  const defaultConfig = getDefaultConfig();
  
  const merged = mergeConfigurations(
    mergeConfigurations(defaultConfig, envConfig),
    userConfig || {}
  );
  
  validateConfiguration(merged);
  return merged;
}

function getDefaultConfig(): BetterAuthOptions {
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
    socialProviders: {},
    rateLimit: {
      enabled: true,
      window: 60,
      max: 10
    }
  };
}
/**
 * CF-Auth Application Configuration Schema
 * 
 * @fileoverview Zod schema for application-level configuration including
 * server settings, URLs, CORS, rate limiting, and general app behavior.
 * 
 * @version 0.1.0
 * @license MIT
 */

import { z } from 'zod';
import type { Environment } from '@cf-auth/types';
import { DEFAULT_PORTS, COMMON_HOSTS } from '../constants';

// =============================================================================
// Server Configuration Schema
// =============================================================================

/**
 * Server configuration schema
 */
export const ServerConfigSchema = z.object({
  /** Server host */
  host: z.string()
    .default(COMMON_HOSTS.LOCALHOST)
    .describe('Server host address'),

  /** Server port */
  port: z.number()
    .int()
    .min(1)
    .max(65535)
    .default(DEFAULT_PORTS.APP)
    .describe('Server port number'),

  /** Base URL for the application */
  baseUrl: z.string()
    .url()
    .optional()
    .describe('Base URL for the application (auto-generated if not provided)'),

  /** Trust proxy settings */
  trustProxy: z.union([
    z.boolean(),
    z.string(),
    z.array(z.string()),
    z.number()
  ])
    .default(false)
    .describe('Express trust proxy setting for handling reverse proxies'),

  /** Keep alive timeout in milliseconds */
  keepAliveTimeout: z.number()
    .int()
    .min(0)
    .default(5000)
    .describe('Keep alive timeout for HTTP connections'),

  /** Headers timeout in milliseconds */
  headersTimeout: z.number()
    .int()
    .min(0)
    .default(60000)
    .describe('Headers timeout for HTTP connections'),

  /** Request timeout in milliseconds */
  requestTimeout: z.number()
    .int()
    .min(0)
    .default(30000)
    .describe('Request timeout for HTTP connections'),

  /** Maximum request size in bytes */
  maxRequestSize: z.string()
    .default('10mb')
    .describe('Maximum request body size (e.g., "10mb", "1gb")'),

  /** Enable compression */
  compression: z.object({
    enabled: z.boolean().default(true),
    level: z.number().int().min(1).max(9).default(6),
    threshold: z.string().default('1kb')
  })
    .default({})
    .describe('Response compression settings'),

  /** Static file serving */
  static: z.object({
    enabled: z.boolean().default(false),
    path: z.string().default('/static'),
    directory: z.string().default('./public'),
    maxAge: z.string().default('1d'),
    etag: z.boolean().default(true)
  })
    .default({})
    .describe('Static file serving configuration')
});

// =============================================================================
// CORS Configuration Schema
// =============================================================================

/**
 * CORS configuration schema
 */
export const CORSConfigSchema = z.object({
  /** Enable CORS */
  enabled: z.boolean()
    .default(true)
    .describe('Enable CORS middleware'),

  /** Allowed origins */
  origin: z.union([
    z.boolean(),
    z.string(),
    z.array(z.string()),
    z.function()
      .args(z.string(), z.any())
      .returns(z.boolean())
  ])
    .default(true)
    .describe('Allowed origins for CORS requests'),

  /** Allowed methods */
  methods: z.array(z.enum(['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS', 'HEAD']))
    .default(['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS', 'HEAD'])
    .describe('Allowed HTTP methods'),

  /** Allowed headers */
  allowedHeaders: z.array(z.string())
    .default([
      'Origin',
      'X-Requested-With',
      'Content-Type',
      'Accept',
      'Authorization',
      'Cache-Control',
      'X-CSRF-Token'
    ])
    .describe('Allowed request headers'),

  /** Exposed headers */
  exposedHeaders: z.array(z.string())
    .default([])
    .describe('Headers exposed to the client'),

  /** Allow credentials */
  credentials: z.boolean()
    .default(true)
    .describe('Allow credentials in CORS requests'),

  /** Max age for preflight requests */
  maxAge: z.number()
    .int()
    .min(0)
    .default(86400)
    .describe('Max age for preflight cache in seconds'),

  /** Preflight continue */
  preflightContinue: z.boolean()
    .default(false)
    .describe('Pass control to next handler after preflight'),

  /** Success status for preflight */
  optionsSuccessStatus: z.number()
    .int()
    .min(200)
    .max(299)
    .default(204)
    .describe('Status code for successful preflight requests')
});

// =============================================================================
// Rate Limiting Configuration Schema
// =============================================================================

/**
 * Rate limit configuration schema
 */
export const RateLimitConfigSchema = z.object({
  /** Enable rate limiting */
  enabled: z.boolean()
    .default(true)
    .describe('Enable rate limiting middleware'),

  /** Time window in milliseconds */
  windowMs: z.number()
    .int()
    .min(1000)
    .default(900000) // 15 minutes
    .describe('Time window for rate limiting'),

  /** Maximum requests per window */
  max: z.number()
    .int()
    .min(1)
    .default(100)
    .describe('Maximum requests per window'),

  /** Custom message for rate limit exceeded */
  message: z.string()
    .default('Too many requests, please try again later')
    .describe('Message sent when rate limit is exceeded'),

  /** Status code for rate limit exceeded */
  statusCode: z.number()
    .int()
    .min(400)
    .max(499)
    .default(429)
    .describe('HTTP status code for rate limit exceeded'),

  /** Headers to include in response */
  headers: z.boolean()
    .default(true)
    .describe('Include rate limit headers in response'),

  /** Draft headers (new standard) */
  draft_polli_ratelimit_headers: z.boolean()
    .default(false)
    .describe('Use draft RateLimit headers'),

  /** Skip successful requests */
  skipSuccessfulRequests: z.boolean()
    .default(false)
    .describe('Skip counting successful requests'),

  /** Skip failed requests */
  skipFailedRequests: z.boolean()
    .default(false)
    .describe('Skip counting failed requests'),

  /** Key generator function */
  keyGenerator: z.function()
    .args(z.any())
    .returns(z.string())
    .optional()
    .describe('Function to generate rate limit key'),

  /** Skip function */
  skip: z.function()
    .args(z.any())
    .returns(z.boolean())
    .optional()
    .describe('Function to skip rate limiting for specific requests'),

  /** Store configuration */
  store: z.object({
    type: z.enum(['memory', 'redis', 'memcached']).default('memory'),
    options: z.record(z.unknown()).default({})
  })
    .default({})
    .describe('Rate limit store configuration')
});

// =============================================================================
// Health Check Configuration Schema
// =============================================================================

/**
 * Health check configuration schema
 */
export const HealthCheckConfigSchema = z.object({
  /** Enable health checks */
  enabled: z.boolean()
    .default(true)
    .describe('Enable health check endpoints'),

  /** Health check endpoint path */
  path: z.string()
    .default('/health')
    .describe('Path for health check endpoint'),

  /** Detailed health endpoint path */
  detailedPath: z.string()
    .default('/health/detailed')
    .describe('Path for detailed health check endpoint'),

  /** Include system information */
  includeSystem: z.boolean()
    .default(false)
    .describe('Include system information in health checks'),

  /** Include database status */
  includeDatabase: z.boolean()
    .default(true)
    .describe('Include database connectivity in health checks'),

  /** Include external services */
  includeExternal: z.boolean()
    .default(false)
    .describe('Include external service checks'),

  /** Timeout for health checks */
  timeout: z.number()
    .int()
    .min(1000)
    .default(5000)
    .describe('Timeout for health check operations'),

  /** Custom health checks */
  custom: z.array(z.object({
    name: z.string(),
    check: z.function().returns(z.promise(z.boolean())),
    timeout: z.number().int().min(100).default(3000)
  }))
    .default([])
    .describe('Custom health check functions')
});

// =============================================================================
// Metrics Configuration Schema
// =============================================================================

/**
 * Metrics configuration schema
 */
export const MetricsConfigSchema = z.object({
  /** Enable metrics collection */
  enabled: z.boolean()
    .default(false)
    .describe('Enable application metrics'),

  /** Metrics endpoint path */
  path: z.string()
    .default('/metrics')
    .describe('Path for metrics endpoint'),

  /** Metrics format */
  format: z.enum(['prometheus', 'json', 'text'])
    .default('prometheus')
    .describe('Metrics output format'),

  /** Include default metrics */
  includeDefaults: z.boolean()
    .default(true)
    .describe('Include default Node.js metrics'),

  /** Include HTTP metrics */
  includeHttp: z.boolean()
    .default(true)
    .describe('Include HTTP request metrics'),

  /** Include auth metrics */
  includeAuth: z.boolean()
    .default(true)
    .describe('Include authentication metrics'),

  /** Custom labels */
  labels: z.record(z.string())
    .default({})
    .describe('Custom labels to add to all metrics'),

  /** Metrics collection interval */
  interval: z.number()
    .int()
    .min(1000)
    .default(5000)
    .describe('Metrics collection interval in milliseconds'),

  /** Histogram buckets */
  histogramBuckets: z.array(z.number())
    .default([0.1, 0.3, 0.5, 0.7, 1, 3, 5, 7, 10])
    .describe('Histogram buckets for duration metrics')
});

// =============================================================================
// Main Application Configuration Schema
// =============================================================================

/**
 * Complete application configuration schema
 */
export const AppConfigSchema = z.object({
  /** Application name */
  name: z.string()
    .min(1)
    .default('CF-Better-Auth App')
    .describe('Application name'),

  /** Application version */
  version: z.string()
    .default('1.0.0')
    .describe('Application version'),

  /** Application description */
  description: z.string()
    .optional()
    .describe('Application description'),

  /** Application environment */
  environment: z.enum(['development', 'production', 'test', 'staging'] as const)
    .default('development' as Environment)
    .describe('Application environment'),

  /** Debug mode */
  debug: z.boolean()
    .default(false)
    .describe('Enable debug mode'),

  /** Timezone */
  timezone: z.string()
    .default('UTC')
    .describe('Application timezone'),

  /** Default locale */
  locale: z.string()
    .default('en')
    .describe('Default application locale'),

  /** Supported locales */
  supportedLocales: z.array(z.string())
    .default(['en'])
    .describe('Supported application locales'),

  /** Server configuration */
  server: ServerConfigSchema
    .default({})
    .describe('Server configuration'),

  /** CORS configuration */
  cors: CORSConfigSchema
    .default({})
    .describe('CORS configuration'),

  /** Rate limiting configuration */
  rateLimit: RateLimitConfigSchema
    .default({})
    .describe('Rate limiting configuration'),

  /** Health check configuration */
  healthCheck: HealthCheckConfigSchema
    .default({})
    .describe('Health check configuration'),

  /** Metrics configuration */
  metrics: MetricsConfigSchema
    .default({})
    .describe('Metrics configuration'),

  /** Feature flags */
  features: z.record(z.boolean())
    .default({})
    .describe('Application feature flags'),

  /** Application metadata */
  metadata: z.record(z.unknown())
    .default({})
    .describe('Additional application metadata'),

  /** External URLs */
  urls: z.object({
    /** Frontend URL */
    frontend: z.string().url().optional().describe('Frontend application URL'),
    /** API URL */
    api: z.string().url().optional().describe('API base URL'),
    /** Documentation URL */
    docs: z.string().url().optional().describe('Documentation URL'),
    /** Support URL */
    support: z.string().url().optional().describe('Support/help URL'),
    /** Terms of service URL */
    terms: z.string().url().optional().describe('Terms of service URL'),
    /** Privacy policy URL */
    privacy: z.string().url().optional().describe('Privacy policy URL')
  })
    .default({})
    .describe('External URLs'),

  /** Development settings */
  development: z.object({
    /** Enable hot reload */
    hotReload: z.boolean().default(true),
    /** Enable source maps */
    sourceMaps: z.boolean().default(true),
    /** Pretty print JSON responses */
    prettyJson: z.boolean().default(true),
    /** Include stack traces in errors */
    includeStackTrace: z.boolean().default(true),
    /** Mock external services */
    mockExternal: z.boolean().default(false)
  })
    .default({})
    .describe('Development-only settings'),

  /** Production settings */
  production: z.object({
    /** Minimize response size */
    minify: z.boolean().default(true),
    /** Enable caching */
    cache: z.boolean().default(true),
    /** Cluster mode */
    cluster: z.boolean().default(false),
    /** Number of worker processes */
    workers: z.number().int().min(1).default(1),
    /** Enable performance monitoring */
    monitoring: z.boolean().default(true)
  })
    .default({})
    .describe('Production-only settings')
});

// =============================================================================
// Type Exports
// =============================================================================

export type AppConfig = z.infer<typeof AppConfigSchema>;
export type ServerConfig = z.infer<typeof ServerConfigSchema>;
export type CORSConfig = z.infer<typeof CORSConfigSchema>;
export type RateLimitConfig = z.infer<typeof RateLimitConfigSchema>;
export type HealthCheckConfig = z.infer<typeof HealthCheckConfigSchema>;
export type MetricsConfig = z.infer<typeof MetricsConfigSchema>;

// =============================================================================
// Schema Validation Functions
// =============================================================================

/**
 * Validate application configuration
 */
export function validateAppConfig(config: unknown): AppConfig {
  return AppConfigSchema.parse(config);
}

/**
 * Validate partial application configuration
 */
export function validatePartialAppConfig(config: unknown): Partial<AppConfig> {
  return AppConfigSchema.partial().parse(config);
}

/**
 * Validate server configuration
 */
export function validateServerConfig(config: unknown): ServerConfig {
  return ServerConfigSchema.parse(config);
}

/**
 * Validate CORS configuration
 */
export function validateCORSConfig(config: unknown): CORSConfig {
  return CORSConfigSchema.parse(config);
}

/**
 * Validate rate limit configuration
 */
export function validateRateLimitConfig(config: unknown): RateLimitConfig {
  return RateLimitConfigSchema.parse(config);
}

/**
 * Get default application configuration
 */
export function getDefaultAppConfig(): AppConfig {
  return AppConfigSchema.parse({});
}

// =============================================================================
// Schema Utilities
// =============================================================================

/**
 * Get application configuration schema description
 */
export function getAppConfigSchemaDescription(): Record<string, any> {
  return {
    type: 'object',
    properties: Object.fromEntries(
      Object.entries(AppConfigSchema.shape).map(([key, schema]) => [
        key,
        {
          type: (schema as any)._def?.typeName || 'unknown',
          description: (schema as any)._def?.description || '',
          default: (schema as any)._def?.defaultValue?.()
        }
      ])
    )
  };
}

/**
 * Create application configuration with environment-specific defaults
 */
export function createAppConfigForEnvironment(
  environment: Environment,
  overrides: Partial<AppConfig> = {}
): AppConfig {
  const baseConfig = getDefaultAppConfig();
  
  const environmentDefaults: Partial<AppConfig> = {
    development: {
      debug: true,
      server: {
        port: 3000,
        host: 'localhost'
      },
      development: {
        hotReload: true,
        sourceMaps: true,
        prettyJson: true,
        includeStackTrace: true
      }
    },
    production: {
      debug: false,
      server: {
        port: parseInt(process.env.PORT || '8000', 10),
        host: '0.0.0.0'
      },
      production: {
        minify: true,
        cache: true,
        cluster: true,
        monitoring: true
      }
    },
    test: {
      debug: false,
      server: {
        port: 0 // Random port
      }
    },
    staging: {
      debug: true,
      server: {
        port: parseInt(process.env.PORT || '8000', 10)
      }
    }
  }[environment] || {};

  return AppConfigSchema.parse({
    ...baseConfig,
    environment,
    ...environmentDefaults,
    ...overrides
  });
}
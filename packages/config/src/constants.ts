/**
 * CF-Auth Configuration Constants
 * 
 * @fileoverview Default values, constants, and configuration presets
 * for the CF-Better-Auth configuration system.
 * 
 * @version 0.1.0
 * @license MIT
 */

import type { Environment, LogLevel } from '@cf-auth/types';
import type { 
  ConfigFormat, 
  ConfigSource, 
  InterpolationOptions,
  CacheOptions,
  RetryOptions 
} from './types';

// =============================================================================
// Package Information
// =============================================================================

export const PACKAGE_INFO = {
  name: '@cf-auth/config',
  version: '0.1.0',
  description: 'Configuration management for CF-Better-Auth',
  author: 'CF-Auth Team',
  license: 'MIT'
} as const;

// =============================================================================
// Configuration File Names and Patterns
// =============================================================================

/**
 * Default configuration file names to search for
 */
export const CONFIG_FILE_NAMES = [
  'cf-auth.config.js',
  'cf-auth.config.ts',
  'cf-auth.config.json',
  'cf-auth.config.yaml',
  'cf-auth.config.yml',
  'cf-auth.json',
  'cf-auth.yaml',
  'cf-auth.yml',
  '.cf-authrc',
  '.cf-authrc.json',
  '.cf-authrc.yaml',
  '.cf-authrc.yml'
] as const;

/**
 * Environment-specific configuration file patterns
 */
export const ENV_CONFIG_PATTERNS = {
  development: [
    'cf-auth.development.json',
    'cf-auth.development.yaml',
    'cf-auth.dev.json',
    'cf-auth.dev.yaml',
    '.cf-authrc.development.json',
    '.cf-authrc.dev.json'
  ],
  production: [
    'cf-auth.production.json',
    'cf-auth.production.yaml',
    'cf-auth.prod.json',
    'cf-auth.prod.yaml',
    '.cf-authrc.production.json',
    '.cf-authrc.prod.json'
  ],
  test: [
    'cf-auth.test.json',
    'cf-auth.test.yaml',
    '.cf-authrc.test.json'
  ],
  staging: [
    'cf-auth.staging.json',
    'cf-auth.staging.yaml',
    '.cf-authrc.staging.json'
  ]
} as const;

/**
 * Environment file names
 */
export const ENV_FILE_NAMES = [
  '.env',
  '.env.local',
  '.env.development',
  '.env.development.local',
  '.env.production',
  '.env.production.local',
  '.env.test',
  '.env.test.local',
  '.env.staging',
  '.env.staging.local'
] as const;

// =============================================================================
// Configuration Sources and Formats
// =============================================================================

/**
 * Supported configuration sources
 */
export const CONFIG_SOURCES: readonly ConfigSource[] = [
  'file',
  'environment', 
  'remote',
  'vault',
  'aws-secrets',
  'azure-keyvault',
  'memory',
  'cli',
  'preset'
] as const;

/**
 * Supported configuration formats
 */
export const CONFIG_FORMATS: readonly ConfigFormat[] = [
  'json',
  'yaml',
  'yml',
  'toml', 
  'env',
  'js',
  'ts'
] as const;

/**
 * File extension to format mapping
 */
export const FORMAT_EXTENSIONS = {
  '.json': 'json',
  '.yaml': 'yaml', 
  '.yml': 'yaml',
  '.toml': 'toml',
  '.env': 'env',
  '.js': 'js',
  '.mjs': 'js',
  '.ts': 'ts',
  '.mts': 'ts'
} as const satisfies Record<string, ConfigFormat>;

/**
 * MIME types for configuration formats
 */
export const FORMAT_MIME_TYPES = {
  json: 'application/json',
  yaml: 'application/x-yaml',
  yml: 'application/x-yaml',
  toml: 'application/toml',
  env: 'text/plain',
  js: 'application/javascript',
  ts: 'application/typescript'
} as const;

// =============================================================================
// Default Configuration Values
// =============================================================================

/**
 * Default configuration loader options
 */
export const DEFAULT_LOADER_OPTIONS = {
  environment: 'development' as Environment,
  required: false,
  cache: {
    enabled: true,
    ttl: 300000 // 5 minutes
  } as CacheOptions,
  interpolation: {
    enabled: true,
    prefix: '${',
    suffix: '}',
    allowUndefined: false
  } as InterpolationOptions
} as const;

/**
 * Default retry options
 */
export const DEFAULT_RETRY_OPTIONS: RetryOptions = {
  attempts: 3,
  delay: 1000,
  backoff: 2,
  maxDelay: 10000
} as const;

/**
 * Default cache options
 */
export const DEFAULT_CACHE_OPTIONS: CacheOptions = {
  enabled: true,
  ttl: 300000, // 5 minutes
  maxSize: 100
} as const;

/**
 * Default interpolation options
 */
export const DEFAULT_INTERPOLATION_OPTIONS: InterpolationOptions = {
  enabled: true,
  prefix: '${',
  suffix: '}',
  allowUndefined: false,
  defaults: {},
  resolvers: {}
} as const;

// =============================================================================
// Environment Variable Prefixes
// =============================================================================

/**
 * Default environment variable prefixes to look for
 */
export const ENV_PREFIXES = [
  'CF_AUTH_',
  'CFAUTH_',
  'AUTH_',
  'APP_'
] as const;

/**
 * Environment variable mapping for common configuration properties
 */
export const ENV_VAR_MAPPING = {
  // App configuration
  'CF_AUTH_APP_NAME': 'app.name',
  'CF_AUTH_APP_URL': 'app.url',
  'CF_AUTH_APP_PORT': 'app.port',
  'CF_AUTH_APP_HOST': 'app.host',
  'CF_AUTH_APP_ENV': 'app.environment',
  
  // Database configuration  
  'CF_AUTH_DB_URL': 'database.url',
  'CF_AUTH_DB_HOST': 'database.host',
  'CF_AUTH_DB_PORT': 'database.port',
  'CF_AUTH_DB_NAME': 'database.name',
  'CF_AUTH_DB_USER': 'database.user',
  'CF_AUTH_DB_PASSWORD': 'database.password',
  'CF_AUTH_DB_SSL': 'database.ssl',
  
  // Security configuration
  'CF_AUTH_SECRET': 'security.secret',
  'CF_AUTH_JWT_SECRET': 'security.jwt.secret',
  'CF_AUTH_ENCRYPTION_KEY': 'security.encryption.key',
  
  // Session configuration
  'CF_AUTH_SESSION_DURATION': 'session.duration',
  'CF_AUTH_SESSION_SECRET': 'session.secret',
  
  // Email configuration
  'CF_AUTH_EMAIL_PROVIDER': 'email.provider',
  'CF_AUTH_EMAIL_API_KEY': 'email.apiKey',
  'CF_AUTH_EMAIL_FROM': 'email.from',
  'CF_AUTH_SMTP_HOST': 'email.smtp.host',
  'CF_AUTH_SMTP_PORT': 'email.smtp.port',
  'CF_AUTH_SMTP_USER': 'email.smtp.user',
  'CF_AUTH_SMTP_PASSWORD': 'email.smtp.password',
  
  // OAuth configuration
  'CF_AUTH_GOOGLE_CLIENT_ID': 'auth.social.google.clientId',
  'CF_AUTH_GOOGLE_CLIENT_SECRET': 'auth.social.google.clientSecret',
  'CF_AUTH_GITHUB_CLIENT_ID': 'auth.social.github.clientId',  
  'CF_AUTH_GITHUB_CLIENT_SECRET': 'auth.social.github.clientSecret',
  
  // Logging configuration
  'CF_AUTH_LOG_LEVEL': 'logging.level',
  'CF_AUTH_LOG_FORMAT': 'logging.format',
  
  // Redis configuration
  'CF_AUTH_REDIS_URL': 'storage.redis.url',
  'CF_AUTH_REDIS_HOST': 'storage.redis.host',
  'CF_AUTH_REDIS_PORT': 'storage.redis.port',
  'CF_AUTH_REDIS_PASSWORD': 'storage.redis.password'
} as const;

// =============================================================================
// Validation Constants
// =============================================================================

/**
 * Configuration validation error codes
 */
export const VALIDATION_ERRORS = {
  // General errors
  INVALID_TYPE: 'INVALID_TYPE',
  REQUIRED_FIELD: 'REQUIRED_FIELD',
  UNKNOWN_PROPERTY: 'UNKNOWN_PROPERTY',
  INVALID_FORMAT: 'INVALID_FORMAT',
  
  // Specific validation errors
  INVALID_URL: 'INVALID_URL',
  INVALID_EMAIL: 'INVALID_EMAIL',
  INVALID_PORT: 'INVALID_PORT',
  INVALID_HOST: 'INVALID_HOST',
  INVALID_SECRET: 'INVALID_SECRET',
  INVALID_JWT_SECRET: 'INVALID_JWT_SECRET',
  INVALID_DATABASE_URL: 'INVALID_DATABASE_URL',
  INVALID_ENCRYPTION_KEY: 'INVALID_ENCRYPTION_KEY',
  
  // Range errors
  VALUE_TOO_SMALL: 'VALUE_TOO_SMALL',
  VALUE_TOO_LARGE: 'VALUE_TOO_LARGE',
  STRING_TOO_SHORT: 'STRING_TOO_SHORT',
  STRING_TOO_LONG: 'STRING_TOO_LONG',
  
  // Security errors
  WEAK_PASSWORD: 'WEAK_PASSWORD',
  INSECURE_SECRET: 'INSECURE_SECRET',
  DEPRECATED_ALGORITHM: 'DEPRECATED_ALGORITHM',
  
  // Environment errors  
  MISSING_ENV_VAR: 'MISSING_ENV_VAR',
  INVALID_ENV_VALUE: 'INVALID_ENV_VALUE'
} as const;

/**
 * Minimum security requirements
 */
export const SECURITY_REQUIREMENTS = {
  SECRET_MIN_LENGTH: 32,
  JWT_SECRET_MIN_LENGTH: 32,
  ENCRYPTION_KEY_MIN_LENGTH: 32,
  PASSWORD_MIN_LENGTH: 8,
  SESSION_TIMEOUT_MIN: 300000, // 5 minutes
  SESSION_TIMEOUT_MAX: 2592000000 // 30 days
} as const;

// =============================================================================
// Default Ports and Common Values
// =============================================================================

/**
 * Default ports for various services
 */
export const DEFAULT_PORTS = {
  HTTP: 80,
  HTTPS: 443,
  APP: 3000,
  API: 8000,
  
  // Databases
  MYSQL: 3306,
  POSTGRESQL: 5432,
  MONGODB: 27017,
  REDIS: 6379,
  
  // Message queues
  RABBITMQ: 5672,
  KAFKA: 9092,
  
  // Email
  SMTP: 25,
  SMTP_TLS: 587,
  SMTP_SSL: 465,
  POP3: 110,
  POP3_SSL: 995,
  IMAP: 143,
  IMAP_SSL: 993
} as const;

/**
 * Common host values
 */
export const COMMON_HOSTS = {
  LOCALHOST: 'localhost',
  LOCAL_IP: '127.0.0.1',
  ALL_INTERFACES: '0.0.0.0',
  IPV6_LOCALHOST: '::1',
  IPV6_ALL: '::'
} as const;

/**
 * Common database providers
 */
export const DATABASE_PROVIDERS = [
  'mysql',
  'postgresql', 
  'postgres',
  'sqlite',
  'mongodb',
  'redis'
] as const;

/**
 * Common email providers
 */
export const EMAIL_PROVIDERS = [
  'smtp',
  'sendgrid',
  'mailgun',
  'ses',
  'postmark',
  'mailjet',
  'mandrill'
] as const;

/**
 * Supported OAuth providers
 */
export const OAUTH_PROVIDERS = [
  'google',
  'github',
  'facebook',
  'twitter',
  'linkedin',
  'microsoft',
  'apple',
  'discord',
  'slack'
] as const;

// =============================================================================
// Configuration Paths and Directories
// =============================================================================

/**
 * Common configuration directories to search
 */
export const CONFIG_DIRECTORIES = [
  '.',
  './config',
  './configs', 
  './settings',
  './etc',
  '~/.config/cf-auth',
  '~/.cf-auth',
  '/etc/cf-auth',
  '/usr/local/etc/cf-auth'
] as const;

/**
 * Configuration file search order (highest priority first)
 */
export const CONFIG_SEARCH_ORDER = [
  'memory',
  'cli',
  'environment',
  'file',
  'remote',
  'vault',
  'preset'
] as const satisfies readonly ConfigSource[];

// =============================================================================
// Logging and Debug Constants
// =============================================================================

/**
 * Default log levels
 */
export const LOG_LEVELS: readonly LogLevel[] = [
  'trace',
  'debug', 
  'info',
  'warn',
  'error',
  'fatal'
] as const;

/**
 * Configuration operation types for logging
 */
export const CONFIG_OPERATIONS = {
  LOAD: 'config:load',
  SAVE: 'config:save',
  VALIDATE: 'config:validate',
  MERGE: 'config:merge',
  WATCH: 'config:watch',
  CHANGE: 'config:change',
  ERROR: 'config:error'
} as const;

// =============================================================================
// Platform and Environment Detection
// =============================================================================

/**
 * Supported platforms
 */
export const PLATFORMS = [
  'darwin',
  'linux', 
  'win32',
  'freebsd',
  'openbsd',
  'sunos',
  'aix'
] as const;

/**
 * Environment detection patterns
 */
export const ENVIRONMENT_PATTERNS = {
  development: ['dev', 'develop', 'development', 'local'],
  production: ['prod', 'production', 'live'],
  test: ['test', 'testing', 'spec'],
  staging: ['stage', 'staging', 'uat', 'pre-prod']
} as const;

/**
 * Common environment variables for environment detection
 */
export const ENV_DETECTION_VARS = [
  'NODE_ENV',
  'APP_ENV', 
  'ENVIRONMENT',
  'ENV',
  'CF_AUTH_ENV',
  'NEXT_PUBLIC_NODE_ENV'
] as const;

// =============================================================================
// Time and Duration Constants
// =============================================================================

/**
 * Common time durations in milliseconds
 */
export const DURATIONS = {
  SECOND: 1000,
  MINUTE: 60 * 1000,
  HOUR: 60 * 60 * 1000,
  DAY: 24 * 60 * 60 * 1000,
  WEEK: 7 * 24 * 60 * 60 * 1000,
  MONTH: 30 * 24 * 60 * 60 * 1000,
  YEAR: 365 * 24 * 60 * 60 * 1000
} as const;

/**
 * Default timeouts
 */
export const TIMEOUTS = {
  CONFIG_LOAD: 10000, // 10 seconds
  REMOTE_REQUEST: 30000, // 30 seconds  
  FILE_WATCH: 1000, // 1 second
  CACHE_TTL: 5 * DURATIONS.MINUTE,
  SESSION_DEFAULT: 24 * DURATIONS.HOUR,
  JWT_DEFAULT: DURATIONS.HOUR
} as const;

// =============================================================================
// Regular Expressions
// =============================================================================

/**
 * Common validation patterns
 */
export const REGEX_PATTERNS = {
  EMAIL: /^[^\s@]+@[^\s@]+\.[^\s@]+$/,
  URL: /^https?:\/\/(?:[-\w.])+(?::[0-9]+)?(?:\/(?:[\w\/_.])*)?(?:\?(?:[\w&=%.]*))?(?:#(?:[\w.]*))?$/,
  PORT: /^([1-9][0-9]{0,3}|[1-5][0-9]{4}|6[0-4][0-9]{3}|65[0-4][0-9]{2}|655[0-2][0-9]|6553[0-5])$/,
  HOST: /^(?:[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?\.)*[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?$/,
  IPV4: /^(?:(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\.){3}(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)$/,
  IPV6: /^(?:[0-9a-fA-F]{1,4}:){7}[0-9a-fA-F]{1,4}$|^::1$|^::$/,
  SECRET_KEY: /^[A-Za-z0-9+/]{32,}={0,2}$/,
  JWT_TOKEN: /^[A-Za-z0-9-_]+\.[A-Za-z0-9-_]+\.[A-Za-z0-9-_]*$/,
  ENV_VAR: /^\$\{([A-Z_][A-Z0-9_]*)\}$/,
  INTERPOLATION: /\$\{([^}]+)\}/g
} as const;

// =============================================================================
// Error Messages
// =============================================================================

/**
 * Common error messages
 */
export const ERROR_MESSAGES = {
  CONFIG_NOT_FOUND: 'Configuration file not found',
  CONFIG_INVALID: 'Configuration is invalid',
  CONFIG_LOAD_FAILED: 'Failed to load configuration',
  CONFIG_PARSE_FAILED: 'Failed to parse configuration file',
  CONFIG_VALIDATION_FAILED: 'Configuration validation failed',
  
  MISSING_REQUIRED: 'Required configuration property is missing',
  INVALID_TYPE: 'Configuration property has invalid type',
  INVALID_VALUE: 'Configuration property has invalid value',
  
  SECRET_TOO_SHORT: 'Secret must be at least 32 characters long',
  SECRET_WEAK: 'Secret is too weak, use a stronger value',
  
  URL_INVALID: 'URL format is invalid',
  EMAIL_INVALID: 'Email address format is invalid',
  PORT_INVALID: 'Port number is invalid (must be 1-65535)',
  
  FILE_NOT_READABLE: 'Configuration file is not readable',
  FILE_NOT_WRITABLE: 'Configuration file is not writable',
  
  NETWORK_ERROR: 'Network error while loading remote configuration',
  TIMEOUT_ERROR: 'Timeout while loading configuration',
  
  INTERPOLATION_FAILED: 'Variable interpolation failed',
  MISSING_ENV_VAR: 'Required environment variable is missing'
} as const;

// =============================================================================
// Feature Flags
// =============================================================================

/**
 * Default feature flags
 */
export const DEFAULT_FEATURES = {
  // Core features
  CONFIG_VALIDATION: true,
  CONFIG_CACHING: true,
  CONFIG_WATCHING: true,
  ENVIRONMENT_INTERPOLATION: true,
  
  // Advanced features
  REMOTE_CONFIG: false,
  CONFIG_ENCRYPTION: false,
  CONFIG_MIGRATION: false,
  HOT_RELOAD: false,
  
  // Integration features
  VAULT_INTEGRATION: false,
  AWS_SECRETS_INTEGRATION: false,
  AZURE_KEYVAULT_INTEGRATION: false,
  
  // Development features
  CONFIG_DOCS_GENERATION: true,
  CONFIG_SCHEMA_EXPORT: true,
  CONFIG_VALIDATION_REPORTS: true
} as const;

// =============================================================================
// Export All Constants
// =============================================================================

export const CONFIG_CONSTANTS = {
  PACKAGE_INFO,
  CONFIG_FILE_NAMES,
  ENV_CONFIG_PATTERNS,
  ENV_FILE_NAMES,
  CONFIG_SOURCES,
  CONFIG_FORMATS,
  FORMAT_EXTENSIONS,
  FORMAT_MIME_TYPES,
  DEFAULT_LOADER_OPTIONS,
  DEFAULT_RETRY_OPTIONS,
  DEFAULT_CACHE_OPTIONS,
  DEFAULT_INTERPOLATION_OPTIONS,
  ENV_PREFIXES,
  ENV_VAR_MAPPING,
  VALIDATION_ERRORS,
  SECURITY_REQUIREMENTS,
  DEFAULT_PORTS,
  COMMON_HOSTS,
  DATABASE_PROVIDERS,
  EMAIL_PROVIDERS,
  OAUTH_PROVIDERS,
  CONFIG_DIRECTORIES,
  CONFIG_SEARCH_ORDER,
  LOG_LEVELS,
  CONFIG_OPERATIONS,
  PLATFORMS,
  ENVIRONMENT_PATTERNS,
  ENV_DETECTION_VARS,
  DURATIONS,
  TIMEOUTS,
  REGEX_PATTERNS,
  ERROR_MESSAGES,
  DEFAULT_FEATURES
} as const;
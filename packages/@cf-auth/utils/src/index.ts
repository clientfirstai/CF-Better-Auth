/**
 * CF-Better-Auth Utils
 * 
 * @fileoverview Main export file for the CF-Better-Auth utils package.
 * Provides comprehensive utility functions for authentication, validation,
 * cryptography, HTTP handling, and more.
 * 
 * @version 0.1.0
 * @license MIT
 */

// Re-export all utilities for tree-shaking
// Each module can be imported individually for optimal bundling

/**
 * Constants - Shared constants across the ecosystem
 * @example import { AUTH_CONSTANTS, CRYPTO_CONSTANTS } from '@cf-auth/utils';
 */
export * from './constants';

/**
 * Cryptographic utilities - Password hashing, encryption, token generation
 * @example import { hashPassword, generateSecureToken } from '@cf-auth/utils/crypto';
 */
export * from './crypto';

/**
 * Validation utilities - Email, password, phone, URL validation
 * @example import { validateEmail, validatePassword } from '@cf-auth/utils/validation';
 */
export * from './validation';

/**
 * HTTP utilities - Request helpers, error handling, HTTP client
 * @example import { HTTPClient, buildURL } from '@cf-auth/utils/http';
 */
export * from './http';

/**
 * JWT utilities - Token creation, verification, parsing using jose
 * @example import { JWTManager, createJWT } from '@cf-auth/utils/jwt';
 */
export * from './jwt';

/**
 * Storage utilities - Caching, session storage, key-value stores
 * @example import { createCache, Storage } from '@cf-auth/utils/storage';
 */
export * from './storage';

/**
 * Formatting utilities - Date, number, string formatting
 * @example import { formatDate, formatCurrency } from '@cf-auth/utils/formatting';
 */
export * from './formatting';

/**
 * Security utilities - CSRF, rate limiting, security headers
 * @example import { CSRFProtection, RateLimiter } from '@cf-auth/utils/security';
 */
export * from './security';

/**
 * Async utilities - Retry, debounce, throttle, queue management
 * @example import { retry, debounce, AsyncQueue } from '@cf-auth/utils/async';
 */
export * from './async';

/**
 * Logger utilities - Structured logging with multiple transports
 * @example import { logger, createLogger } from '@cf-auth/utils/logger';
 */
export * from './logger';

/**
 * Error utilities - Error creation, formatting, handling
 * @example import { CFAuthError, ErrorFactory } from '@cf-auth/utils/errors';
 */
export * from './errors';

/**
 * Event utilities - Event emitter, pub/sub system
 * @example import { EventEmitter, pubsub } from '@cf-auth/utils/events';
 */
export * from './events';

/**
 * Type guards - Runtime type checking and assertions
 * @example import { isString, assertUser } from '@cf-auth/utils/guards';
 */
export * from './guards';

/**
 * Transformers - Data transformation and conversion utilities
 * @example import { deepClone, camelToSnake } from '@cf-auth/utils/transformers';
 */
export * from './transformers';

/**
 * Package metadata
 */
export const VERSION = '0.1.0';

export const PACKAGE_INFO = {
  name: '@cf-auth/utils',
  version: VERSION,
  description: 'Comprehensive utility functions for CF-Better-Auth ecosystem',
  author: 'CF-Auth Team',
  license: 'MIT',
  repository: 'https://github.com/cf-auth/cf-better-auth',
  homepage: 'https://cf-auth.dev',
  keywords: [
    'auth',
    'authentication',
    'better-auth',
    'cloudflare',
    'typescript',
    'utilities',
    'crypto',
    'jwt',
    'validation',
    'http',
    'logging',
    'events'
  ]
} as const;

/**
 * Compatibility information
 */
export const COMPATIBILITY = {
  node: '>=16.0.0',
  browsers: ['Chrome >= 90', 'Firefox >= 88', 'Safari >= 14', 'Edge >= 90'],
  betterAuth: '>=0.2.0'
} as const;

/**
 * Feature detection utilities
 */
export const FEATURES = {
  crypto: typeof crypto !== 'undefined',
  fetch: typeof fetch === 'function',
  localStorage: (() => {
    try {
      return typeof localStorage !== 'undefined';
    } catch {
      return false;
    }
  })(),
  sessionStorage: (() => {
    try {
      return typeof sessionStorage !== 'undefined';
    } catch {
      return false;
    }
  })(),
  webWorkers: typeof Worker !== 'undefined',
  serviceWorkers: typeof navigator !== 'undefined' && 'serviceWorker' in navigator,
  indexedDB: typeof indexedDB !== 'undefined',
  webAssembly: typeof WebAssembly !== 'undefined'
} as const;

/**
 * Environment detection
 */
export const ENVIRONMENT = {
  isNode: typeof process !== 'undefined' && process.versions?.node != null,
  isBrowser: typeof window !== 'undefined' && typeof document !== 'undefined',
  isWorker: typeof importScripts === 'function',
  isDeno: typeof Deno !== 'undefined',
  isBun: typeof Bun !== 'undefined',
  isDevelopment: process?.env?.NODE_ENV === 'development',
  isProduction: process?.env?.NODE_ENV === 'production',
  isTest: process?.env?.NODE_ENV === 'test'
} as const;

/**
 * Quick utility functions for common operations
 */

// Import specific functions for re-export (avoiding circular imports)
import { 
  hashPassword,
  verifyPassword,
  generateSecureToken,
  generateUUID
} from './crypto';

import { 
  validateEmail,
  validatePassword,
  validatePhone,
  validateURL
} from './validation';

import { 
  get,
  post,
  put,
  patch,
  del,
  buildURL
} from './http';

import { 
  createJWT,
  verifyJWT,
  isTokenExpired
} from './jwt';

import { 
  createCache,
  createMemoryStorage
} from './storage';

import { 
  formatDate,
  formatNumber,
  formatCurrency,
  formatDuration,
  formatFileSize
} from './formatting';

import { 
  getSecurityHeaders,
  sanitizeHTML
} from './security';

import { 
  sleep,
  retry,
  debounce,
  throttle
} from './async';

import { 
  logger,
  createLogger
} from './logger';

import { 
  CFAuthError,
  ErrorFactory,
  isCFAuthError
} from './errors';

import { 
  eventBus,
  pubsub
} from './events';

import { 
  isString,
  isNumber,
  isObject,
  isArray,
  isEmail,
  isURL
} from './guards';

import { 
  deepClone,
  deepMerge,
  pick,
  omit,
  camelToSnake,
  snakeToCamel
} from './transformers';

// Re-export for convenience
export {
  // Crypto
  hashPassword,
  verifyPassword,
  generateSecureToken,
  generateUUID,
  
  // Validation
  validateEmail,
  validatePassword,
  validatePhone,
  validateURL,
  
  // HTTP
  get,
  post,
  put,
  patch,
  del as httpDelete,
  buildURL,
  
  // JWT
  createJWT,
  verifyJWT,
  isTokenExpired,
  
  // Storage
  createCache,
  createMemoryStorage,
  
  // Formatting
  formatDate,
  formatNumber,
  formatCurrency,
  formatDuration,
  formatFileSize,
  
  // Security
  getSecurityHeaders,
  sanitizeHTML,
  
  // Async
  sleep,
  retry,
  debounce,
  throttle,
  
  // Logging
  logger,
  createLogger,
  
  // Errors
  CFAuthError,
  ErrorFactory,
  isCFAuthError,
  
  // Events
  eventBus,
  pubsub,
  
  // Guards
  isString,
  isNumber,
  isObject,
  isArray,
  isEmail,
  isURL,
  
  // Transformers
  deepClone,
  deepMerge,
  pick,
  omit,
  camelToSnake,
  snakeToCamel
};

/**
 * Default export with commonly used utilities
 */
export default {
  // Package info
  VERSION,
  PACKAGE_INFO,
  COMPATIBILITY,
  FEATURES,
  ENVIRONMENT,
  
  // Crypto essentials
  hashPassword,
  verifyPassword,
  generateSecureToken,
  
  // Validation essentials  
  validateEmail,
  validatePassword,
  
  // HTTP essentials
  get,
  post,
  buildURL,
  
  // JWT essentials
  createJWT,
  verifyJWT,
  
  // Storage essentials
  createCache,
  
  // Formatting essentials
  formatDate,
  formatNumber,
  
  // Security essentials
  getSecurityHeaders,
  
  // Async essentials
  sleep,
  retry,
  
  // Logging essentials
  logger,
  
  // Error essentials
  CFAuthError,
  isCFAuthError,
  
  // Event essentials
  eventBus,
  
  // Guard essentials
  isString,
  isObject,
  isEmail,
  
  // Transformer essentials
  deepClone,
  pick,
  omit
};
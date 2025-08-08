/**
 * Shared constants for CF-Better-Auth utilities
 * 
 * @fileoverview This module provides shared constants used across the CF-Better-Auth ecosystem.
 * These constants ensure consistency and prevent magic numbers/strings throughout the codebase.
 */

import type { LogLevel, Environment } from '@cf-auth/types';

/**
 * Authentication related constants
 */
export const AUTH_CONSTANTS = {
  /** Default session duration in milliseconds (24 hours) */
  DEFAULT_SESSION_DURATION: 24 * 60 * 60 * 1000,
  
  /** Maximum session duration in milliseconds (30 days) */
  MAX_SESSION_DURATION: 30 * 24 * 60 * 60 * 1000,
  
  /** Minimum session duration in milliseconds (1 hour) */
  MIN_SESSION_DURATION: 60 * 60 * 1000,
  
  /** Default JWT expiration in seconds (1 hour) */
  DEFAULT_JWT_EXPIRATION: 60 * 60,
  
  /** Refresh token expiration in seconds (30 days) */
  REFRESH_TOKEN_EXPIRATION: 30 * 24 * 60 * 60,
  
  /** Password reset token expiration in seconds (1 hour) */
  PASSWORD_RESET_EXPIRATION: 60 * 60,
  
  /** Email verification token expiration in seconds (24 hours) */
  EMAIL_VERIFICATION_EXPIRATION: 24 * 60 * 60,
  
  /** OTP expiration in seconds (5 minutes) */
  OTP_EXPIRATION: 5 * 60,
  
  /** Maximum login attempts before lockout */
  MAX_LOGIN_ATTEMPTS: 5,
  
  /** Account lockout duration in seconds (15 minutes) */
  LOCKOUT_DURATION: 15 * 60
} as const;

/**
 * Cryptographic constants
 */
export const CRYPTO_CONSTANTS = {
  /** Default Argon2 configuration */
  ARGON2: {
    /** Time cost (iterations) */
    TIME_COST: 3,
    /** Memory cost in KB */
    MEMORY_COST: 65536, // 64MB
    /** Parallelism factor */
    PARALLELISM: 1,
    /** Hash length */
    HASH_LENGTH: 32
  },
  
  /** Salt length for various operations */
  SALT_LENGTH: 32,
  
  /** Default encryption key length */
  ENCRYPTION_KEY_LENGTH: 32,
  
  /** Default IV length */
  IV_LENGTH: 16,
  
  /** Token lengths for various purposes */
  TOKEN_LENGTHS: {
    /** Session token length */
    SESSION: 48,
    /** API key length */
    API_KEY: 64,
    /** Reset token length */
    RESET: 48,
    /** Verification token length */
    VERIFICATION: 32,
    /** OTP length */
    OTP: 6,
    /** CSRF token length */
    CSRF: 32
  },
  
  /** Supported encryption algorithms */
  ALGORITHMS: {
    SYMMETRIC: 'aes-256-gcm',
    ASYMMETRIC: 'rsa-oaep',
    HASH: 'sha256',
    HMAC: 'sha256'
  }
} as const;

/**
 * Validation constants
 */
export const VALIDATION_CONSTANTS = {
  /** Email validation */
  EMAIL: {
    /** Maximum email length */
    MAX_LENGTH: 254,
    /** Minimum email length */
    MIN_LENGTH: 5,
    /** Email regex pattern */
    PATTERN: /^[a-zA-Z0-9.!#$%&'*+/=?^_`{|}~-]+@[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?(?:\.[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?)*$/
  },
  
  /** Password validation */
  PASSWORD: {
    /** Minimum password length */
    MIN_LENGTH: 8,
    /** Maximum password length */
    MAX_LENGTH: 128,
    /** Require uppercase letter */
    REQUIRE_UPPERCASE: true,
    /** Require lowercase letter */
    REQUIRE_LOWERCASE: true,
    /** Require number */
    REQUIRE_NUMBER: true,
    /** Require special character */
    REQUIRE_SPECIAL: true,
    /** Special characters allowed */
    SPECIAL_CHARS: '!@#$%^&*()_+-=[]{}|;:,.<>?'
  },
  
  /** Phone number validation */
  PHONE: {
    /** Minimum phone number length */
    MIN_LENGTH: 10,
    /** Maximum phone number length */
    MAX_LENGTH: 15,
    /** Phone regex pattern (international format) */
    PATTERN: /^\+?[1-9]\d{1,14}$/
  },
  
  /** Name validation */
  NAME: {
    /** Minimum name length */
    MIN_LENGTH: 1,
    /** Maximum name length */
    MAX_LENGTH: 100,
    /** Name pattern (letters, spaces, hyphens, apostrophes) */
    PATTERN: /^[a-zA-Z\s'-]+$/
  },
  
  /** Username validation */
  USERNAME: {
    /** Minimum username length */
    MIN_LENGTH: 3,
    /** Maximum username length */
    MAX_LENGTH: 30,
    /** Username pattern (alphanumeric, underscores, hyphens) */
    PATTERN: /^[a-zA-Z0-9_-]+$/
  }
} as const;

/**
 * HTTP related constants
 */
export const HTTP_CONSTANTS = {
  /** Default request timeout in milliseconds */
  DEFAULT_TIMEOUT: 30000,
  
  /** Default retry attempts */
  DEFAULT_RETRY_ATTEMPTS: 3,
  
  /** Default retry delay in milliseconds */
  DEFAULT_RETRY_DELAY: 1000,
  
  /** HTTP status codes */
  STATUS_CODES: {
    OK: 200,
    CREATED: 201,
    NO_CONTENT: 204,
    BAD_REQUEST: 400,
    UNAUTHORIZED: 401,
    FORBIDDEN: 403,
    NOT_FOUND: 404,
    CONFLICT: 409,
    UNPROCESSABLE_ENTITY: 422,
    TOO_MANY_REQUESTS: 429,
    INTERNAL_SERVER_ERROR: 500,
    BAD_GATEWAY: 502,
    SERVICE_UNAVAILABLE: 503,
    GATEWAY_TIMEOUT: 504
  },
  
  /** Content types */
  CONTENT_TYPES: {
    JSON: 'application/json',
    FORM: 'application/x-www-form-urlencoded',
    MULTIPART: 'multipart/form-data',
    TEXT: 'text/plain',
    HTML: 'text/html'
  },
  
  /** HTTP methods */
  METHODS: {
    GET: 'GET',
    POST: 'POST',
    PUT: 'PUT',
    PATCH: 'PATCH',
    DELETE: 'DELETE',
    HEAD: 'HEAD',
    OPTIONS: 'OPTIONS'
  }
} as const;

/**
 * Rate limiting constants
 */
export const RATE_LIMIT_CONSTANTS = {
  /** Default rate limit windows */
  WINDOWS: {
    /** Per minute */
    MINUTE: 60 * 1000,
    /** Per hour */
    HOUR: 60 * 60 * 1000,
    /** Per day */
    DAY: 24 * 60 * 60 * 1000
  },
  
  /** Default rate limits */
  LIMITS: {
    /** Login attempts per IP per hour */
    LOGIN_PER_IP: 20,
    /** Registration attempts per IP per day */
    REGISTER_PER_IP: 5,
    /** Password reset attempts per IP per hour */
    PASSWORD_RESET_PER_IP: 3,
    /** Email verification attempts per email per hour */
    EMAIL_VERIFICATION_PER_EMAIL: 3,
    /** API requests per user per minute */
    API_PER_USER: 100,
    /** Generic requests per IP per minute */
    GENERIC_PER_IP: 60
  }
} as const;

/**
 * Cache constants
 */
export const CACHE_CONSTANTS = {
  /** Default TTL values in seconds */
  TTL: {
    /** Short-term cache (5 minutes) */
    SHORT: 5 * 60,
    /** Medium-term cache (1 hour) */
    MEDIUM: 60 * 60,
    /** Long-term cache (24 hours) */
    LONG: 24 * 60 * 60,
    /** User session cache (30 minutes) */
    SESSION: 30 * 60,
    /** User data cache (15 minutes) */
    USER: 15 * 60,
    /** Configuration cache (1 hour) */
    CONFIG: 60 * 60
  },
  
  /** Cache key prefixes */
  PREFIXES: {
    USER: 'user:',
    SESSION: 'session:',
    CONFIG: 'config:',
    RATE_LIMIT: 'rl:',
    TOKEN: 'token:',
    OTP: 'otp:',
    ATTEMPT: 'attempt:'
  }
} as const;

/**
 * Logging constants
 */
export const LOGGING_CONSTANTS = {
  /** Log levels in order of severity */
  LEVELS: ['error', 'warn', 'info', 'debug', 'trace'] as LogLevel[],
  
  /** Log level priorities (higher = more severe) */
  PRIORITIES: {
    error: 50,
    warn: 40,
    info: 30,
    debug: 20,
    trace: 10
  },
  
  /** Default log formats */
  FORMATS: {
    TIMESTAMP: 'YYYY-MM-DD HH:mm:ss.SSS',
    DATE_ONLY: 'YYYY-MM-DD'
  },
  
  /** Maximum log message length */
  MAX_MESSAGE_LENGTH: 1000,
  
  /** Maximum log field length */
  MAX_FIELD_LENGTH: 500
} as const;

/**
 * Environment constants
 */
export const ENVIRONMENT_CONSTANTS = {
  /** Available environments */
  ENVIRONMENTS: ['development', 'staging', 'production', 'test'] as Environment[],
  
  /** Default environment */
  DEFAULT: 'development' as Environment,
  
  /** Environment variable names */
  ENV_VARS: {
    NODE_ENV: 'NODE_ENV',
    DATABASE_URL: 'DATABASE_URL',
    JWT_SECRET: 'JWT_SECRET',
    ENCRYPTION_KEY: 'ENCRYPTION_KEY',
    LOG_LEVEL: 'LOG_LEVEL',
    REDIS_URL: 'REDIS_URL',
    EMAIL_FROM: 'EMAIL_FROM',
    EMAIL_API_KEY: 'EMAIL_API_KEY'
  }
} as const;

/**
 * Error constants
 */
export const ERROR_CONSTANTS = {
  /** Error categories */
  CATEGORIES: {
    AUTHENTICATION: 'authentication',
    AUTHORIZATION: 'authorization',
    VALIDATION: 'validation',
    NETWORK: 'network',
    DATABASE: 'database',
    SYSTEM: 'system',
    PLUGIN: 'plugin',
    CONFIG: 'config'
  },
  
  /** Error severity levels */
  SEVERITY: {
    LOW: 'low',
    MEDIUM: 'medium',
    HIGH: 'high',
    CRITICAL: 'critical'
  },
  
  /** Common error messages */
  MESSAGES: {
    INVALID_CREDENTIALS: 'Invalid credentials provided',
    EXPIRED_TOKEN: 'Token has expired',
    INVALID_TOKEN: 'Invalid token provided',
    ACCESS_DENIED: 'Access denied',
    USER_NOT_FOUND: 'User not found',
    EMAIL_ALREADY_EXISTS: 'Email already exists',
    WEAK_PASSWORD: 'Password does not meet requirements',
    RATE_LIMIT_EXCEEDED: 'Too many requests, please try again later',
    INTERNAL_ERROR: 'Internal server error occurred',
    VALIDATION_FAILED: 'Validation failed',
    NETWORK_ERROR: 'Network error occurred',
    DATABASE_ERROR: 'Database error occurred'
  }
} as const;

/**
 * Event constants
 */
export const EVENT_CONSTANTS = {
  /** Event priorities */
  PRIORITIES: {
    LOW: 1,
    NORMAL: 5,
    HIGH: 10,
    CRITICAL: 15
  },
  
  /** Event categories */
  CATEGORIES: {
    AUTH: 'authentication',
    USER: 'user',
    SESSION: 'session',
    SECURITY: 'security',
    SYSTEM: 'system',
    AUDIT: 'audit'
  },
  
  /** Maximum event payload size in bytes */
  MAX_PAYLOAD_SIZE: 1024 * 1024, // 1MB
  
  /** Event retention in seconds (30 days) */
  RETENTION_PERIOD: 30 * 24 * 60 * 60
} as const;

/**
 * Security constants
 */
export const SECURITY_CONSTANTS = {
  /** CSRF protection */
  CSRF: {
    /** Token header name */
    HEADER_NAME: 'x-csrf-token',
    /** Cookie name */
    COOKIE_NAME: '__csrf_token',
    /** Token length */
    TOKEN_LENGTH: 32
  },
  
  /** Content Security Policy */
  CSP: {
    /** Default CSP directives */
    DIRECTIVES: {
      'default-src': "'self'",
      'script-src': "'self' 'unsafe-inline'",
      'style-src': "'self' 'unsafe-inline'",
      'img-src': "'self' data: https:",
      'font-src': "'self' data:",
      'connect-src': "'self'",
      'frame-ancestors': "'none'",
      'base-uri': "'self'"
    }
  },
  
  /** Security headers */
  HEADERS: {
    'X-Content-Type-Options': 'nosniff',
    'X-Frame-Options': 'DENY',
    'X-XSS-Protection': '1; mode=block',
    'Referrer-Policy': 'strict-origin-when-cross-origin',
    'Strict-Transport-Security': 'max-age=31536000; includeSubDomains'
  }
} as const;

/**
 * Regular expressions for common validations
 */
export const REGEX_PATTERNS = {
  /** Email pattern (RFC 5322 compliant) */
  EMAIL: /^[a-zA-Z0-9.!#$%&'*+/=?^_`{|}~-]+@[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?(?:\.[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?)*$/,
  
  /** Strong password pattern */
  STRONG_PASSWORD: /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]{8,}$/,
  
  /** Phone number pattern (international) */
  PHONE: /^\+?[1-9]\d{1,14}$/,
  
  /** UUID pattern */
  UUID: /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i,
  
  /** URL pattern */
  URL: /^https?:\/\/(?:www\.)?[-a-zA-Z0-9@:%._\+~#=]{1,256}\.[a-zA-Z0-9()]{1,6}\b(?:[-a-zA-Z0-9()@:%_\+.~#?&=]*)$/,
  
  /** Domain pattern */
  DOMAIN: /^(?:[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?\.)+[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?$/i,
  
  /** IP address pattern (IPv4) */
  IPV4: /^(?:(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\.){3}(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)$/,
  
  /** Alphanumeric pattern */
  ALPHANUMERIC: /^[a-zA-Z0-9]+$/,
  
  /** Slug pattern */
  SLUG: /^[a-z0-9]+(?:-[a-z0-9]+)*$/,
  
  /** Hex color pattern */
  HEX_COLOR: /^#([A-Fa-f0-9]{6}|[A-Fa-f0-9]{3})$/,
  
  /** Credit card pattern (basic) */
  CREDIT_CARD: /^\d{13,19}$/,
  
  /** Social Security Number pattern */
  SSN: /^\d{3}-?\d{2}-?\d{4}$/,
  
  /** Postal code patterns */
  POSTAL_CODES: {
    US: /^\d{5}(-\d{4})?$/,
    UK: /^[A-Z]{1,2}\d[A-Z\d]?\s*\d[A-Z]{2}$/i,
    CA: /^[A-Z]\d[A-Z]\s*\d[A-Z]\d$/i,
    DE: /^\d{5}$/,
    FR: /^\d{5}$/
  }
} as const;

/**
 * Time constants
 */
export const TIME_CONSTANTS = {
  /** Milliseconds in time units */
  MILLISECONDS: {
    SECOND: 1000,
    MINUTE: 60 * 1000,
    HOUR: 60 * 60 * 1000,
    DAY: 24 * 60 * 60 * 1000,
    WEEK: 7 * 24 * 60 * 60 * 1000,
    MONTH: 30 * 24 * 60 * 60 * 1000,
    YEAR: 365 * 24 * 60 * 60 * 1000
  },
  
  /** Seconds in time units */
  SECONDS: {
    MINUTE: 60,
    HOUR: 60 * 60,
    DAY: 24 * 60 * 60,
    WEEK: 7 * 24 * 60 * 60,
    MONTH: 30 * 24 * 60 * 60,
    YEAR: 365 * 24 * 60 * 60
  },
  
  /** Common date formats */
  FORMATS: {
    ISO_DATE: 'YYYY-MM-DD',
    ISO_DATETIME: 'YYYY-MM-DDTHH:mm:ss.SSSZ',
    US_DATE: 'MM/DD/YYYY',
    EU_DATE: 'DD/MM/YYYY',
    READABLE: 'MMMM D, YYYY',
    READABLE_TIME: 'MMMM D, YYYY [at] h:mm A',
    TIME_ONLY: 'HH:mm:ss',
    SHORT_TIME: 'HH:mm'
  }
} as const;

/**
 * File and media constants
 */
export const FILE_CONSTANTS = {
  /** Maximum file sizes in bytes */
  MAX_SIZES: {
    AVATAR: 5 * 1024 * 1024, // 5MB
    DOCUMENT: 10 * 1024 * 1024, // 10MB
    IMAGE: 5 * 1024 * 1024, // 5MB
    VIDEO: 100 * 1024 * 1024, // 100MB
    AUDIO: 50 * 1024 * 1024 // 50MB
  },
  
  /** Allowed MIME types */
  MIME_TYPES: {
    IMAGES: [
      'image/jpeg',
      'image/jpg',
      'image/png',
      'image/gif',
      'image/webp',
      'image/svg+xml'
    ],
    DOCUMENTS: [
      'application/pdf',
      'application/msword',
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      'text/plain',
      'text/csv'
    ],
    AUDIO: [
      'audio/mpeg',
      'audio/mp3',
      'audio/wav',
      'audio/ogg'
    ],
    VIDEO: [
      'video/mp4',
      'video/webm',
      'video/ogg',
      'video/avi'
    ]
  },
  
  /** File extensions */
  EXTENSIONS: {
    IMAGES: ['.jpg', '.jpeg', '.png', '.gif', '.webp', '.svg'],
    DOCUMENTS: ['.pdf', '.doc', '.docx', '.txt', '.csv'],
    AUDIO: ['.mp3', '.wav', '.ogg'],
    VIDEO: ['.mp4', '.webm', '.ogg', '.avi']
  }
} as const;
/**
 * Error types and codes for CF-Better-Auth
 * Defines all error classes, codes, and error handling interfaces
 */

import type { HttpStatusCode } from './api';

/**
 * Base error interface
 */
export interface BaseError {
  /** Error code */
  code: string;
  
  /** Error message */
  message: string;
  
  /** Error details */
  details?: any;
  
  /** Error timestamp */
  timestamp?: string;
  
  /** Request ID */
  requestId?: string;
  
  /** User ID (if applicable) */
  userId?: string;
  
  /** Session ID (if applicable) */
  sessionId?: string;
  
  /** Additional metadata */
  metadata?: Record<string, any>;
}

/**
 * CF-Better-Auth error class
 */
export class CFAuthError extends Error implements BaseError {
  /** Error code */
  public readonly code: string;
  
  /** Error details */
  public readonly details?: any;
  
  /** HTTP status code */
  public readonly statusCode?: HttpStatusCode;
  
  /** Error timestamp */
  public readonly timestamp: string;
  
  /** Request ID */
  public readonly requestId?: string;
  
  /** User ID */
  public readonly userId?: string;
  
  /** Session ID */
  public readonly sessionId?: string;
  
  /** Error metadata */
  public readonly metadata?: Record<string, any>;
  
  /** Whether error is retryable */
  public readonly retryable: boolean;
  
  /** Error category */
  public readonly category: ErrorCategory;
  
  constructor(options: CFAuthErrorOptions) {
    super(options.message);
    
    this.name = 'CFAuthError';
    this.code = options.code;
    this.details = options.details;
    this.statusCode = options.statusCode;
    this.timestamp = options.timestamp || new Date().toISOString();
    this.requestId = options.requestId;
    this.userId = options.userId;
    this.sessionId = options.sessionId;
    this.metadata = options.metadata;
    this.retryable = options.retryable ?? false;
    this.category = options.category ?? 'UNKNOWN';
    
    // Ensure proper prototype chain
    Object.setPrototypeOf(this, CFAuthError.prototype);
    
    // Capture stack trace
    if (Error.captureStackTrace) {
      Error.captureStackTrace(this, CFAuthError);
    }
  }
  
  /**
   * Convert error to JSON
   */
  toJSON(): BaseError {
    return {
      code: this.code,
      message: this.message,
      details: this.details,
      timestamp: this.timestamp,
      requestId: this.requestId,
      userId: this.userId,
      sessionId: this.sessionId,
      metadata: this.metadata
    };
  }
  
  /**
   * Create error from unknown error
   */
  static fromError(error: unknown, options?: Partial<CFAuthErrorOptions>): CFAuthError {
    if (error instanceof CFAuthError) {
      return error;
    }
    
    if (error instanceof Error) {
      return new CFAuthError({
        code: options?.code || 'UNKNOWN_ERROR',
        message: error.message,
        details: { originalError: error.name, stack: error.stack },
        category: 'UNKNOWN',
        ...options
      });
    }
    
    return new CFAuthError({
      code: options?.code || 'UNKNOWN_ERROR',
      message: typeof error === 'string' ? error : 'An unknown error occurred',
      details: { originalError: error },
      category: 'UNKNOWN',
      ...options
    });
  }
  
  /**
   * Check if error is retryable
   */
  isRetryable(): boolean {
    return this.retryable;
  }
  
  /**
   * Check if error is client error (4xx)
   */
  isClientError(): boolean {
    return this.statusCode ? this.statusCode >= 400 && this.statusCode < 500 : false;
  }
  
  /**
   * Check if error is server error (5xx)
   */
  isServerError(): boolean {
    return this.statusCode ? this.statusCode >= 500 : false;
  }
}

/**
 * CF-Better-Auth error options
 */
export interface CFAuthErrorOptions {
  /** Error code */
  code: string;
  
  /** Error message */
  message: string;
  
  /** Error details */
  details?: any;
  
  /** HTTP status code */
  statusCode?: HttpStatusCode;
  
  /** Error timestamp */
  timestamp?: string;
  
  /** Request ID */
  requestId?: string;
  
  /** User ID */
  userId?: string;
  
  /** Session ID */
  sessionId?: string;
  
  /** Error metadata */
  metadata?: Record<string, any>;
  
  /** Whether error is retryable */
  retryable?: boolean;
  
  /** Error category */
  category?: ErrorCategory;
}

/**
 * Error categories
 */
export type ErrorCategory = 
  | 'AUTHENTICATION'
  | 'AUTHORIZATION'
  | 'VALIDATION'
  | 'NETWORK'
  | 'DATABASE'
  | 'CONFIGURATION'
  | 'RATE_LIMIT'
  | 'PLUGIN'
  | 'SYSTEM'
  | 'UNKNOWN';

/**
 * Error severity levels
 */
export type ErrorSeverity = 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';

/**
 * Authentication error codes
 */
export const AUTH_ERROR_CODES = {
  // General authentication errors
  INVALID_CREDENTIALS: 'INVALID_CREDENTIALS',
  USER_NOT_FOUND: 'USER_NOT_FOUND',
  ACCOUNT_LOCKED: 'ACCOUNT_LOCKED',
  ACCOUNT_DISABLED: 'ACCOUNT_DISABLED',
  ACCOUNT_SUSPENDED: 'ACCOUNT_SUSPENDED',
  ACCOUNT_DELETED: 'ACCOUNT_DELETED',
  EMAIL_NOT_VERIFIED: 'EMAIL_NOT_VERIFIED',
  PHONE_NOT_VERIFIED: 'PHONE_NOT_VERIFIED',
  
  // Session errors
  SESSION_EXPIRED: 'SESSION_EXPIRED',
  SESSION_INVALID: 'SESSION_INVALID',
  SESSION_NOT_FOUND: 'SESSION_NOT_FOUND',
  SESSION_REVOKED: 'SESSION_REVOKED',
  CONCURRENT_SESSION_LIMIT: 'CONCURRENT_SESSION_LIMIT',
  
  // Token errors
  TOKEN_EXPIRED: 'TOKEN_EXPIRED',
  TOKEN_INVALID: 'TOKEN_INVALID',
  TOKEN_MISSING: 'TOKEN_MISSING',
  TOKEN_MALFORMED: 'TOKEN_MALFORMED',
  REFRESH_TOKEN_EXPIRED: 'REFRESH_TOKEN_EXPIRED',
  REFRESH_TOKEN_INVALID: 'REFRESH_TOKEN_INVALID',
  
  // MFA errors
  MFA_REQUIRED: 'MFA_REQUIRED',
  MFA_CODE_INVALID: 'MFA_CODE_INVALID',
  MFA_CODE_EXPIRED: 'MFA_CODE_EXPIRED',
  MFA_METHOD_NOT_SETUP: 'MFA_METHOD_NOT_SETUP',
  MFA_BACKUP_CODE_INVALID: 'MFA_BACKUP_CODE_INVALID',
  MFA_MAX_ATTEMPTS_EXCEEDED: 'MFA_MAX_ATTEMPTS_EXCEEDED',
  
  // Password errors
  PASSWORD_INVALID: 'PASSWORD_INVALID',
  PASSWORD_EXPIRED: 'PASSWORD_EXPIRED',
  PASSWORD_TOO_WEAK: 'PASSWORD_TOO_WEAK',
  PASSWORD_RECENTLY_USED: 'PASSWORD_RECENTLY_USED',
  PASSWORD_RESET_TOKEN_INVALID: 'PASSWORD_RESET_TOKEN_INVALID',
  PASSWORD_RESET_TOKEN_EXPIRED: 'PASSWORD_RESET_TOKEN_EXPIRED',
  
  // Registration errors
  USER_ALREADY_EXISTS: 'USER_ALREADY_EXISTS',
  EMAIL_ALREADY_TAKEN: 'EMAIL_ALREADY_TAKEN',
  PHONE_ALREADY_TAKEN: 'PHONE_ALREADY_TAKEN',
  USERNAME_ALREADY_TAKEN: 'USERNAME_ALREADY_TAKEN',
  REGISTRATION_DISABLED: 'REGISTRATION_DISABLED',
  INVITATION_REQUIRED: 'INVITATION_REQUIRED',
  
  // OAuth errors
  OAUTH_PROVIDER_ERROR: 'OAUTH_PROVIDER_ERROR',
  OAUTH_STATE_MISMATCH: 'OAUTH_STATE_MISMATCH',
  OAUTH_CODE_INVALID: 'OAUTH_CODE_INVALID',
  OAUTH_TOKEN_ERROR: 'OAUTH_TOKEN_ERROR',
  OAUTH_PROFILE_ERROR: 'OAUTH_PROFILE_ERROR',
  OAUTH_ACCOUNT_NOT_LINKED: 'OAUTH_ACCOUNT_NOT_LINKED',
  OAUTH_ACCOUNT_ALREADY_LINKED: 'OAUTH_ACCOUNT_ALREADY_LINKED',
  
  // WebAuthn errors
  WEBAUTHN_NOT_SUPPORTED: 'WEBAUTHN_NOT_SUPPORTED',
  WEBAUTHN_REGISTRATION_FAILED: 'WEBAUTHN_REGISTRATION_FAILED',
  WEBAUTHN_AUTHENTICATION_FAILED: 'WEBAUTHN_AUTHENTICATION_FAILED',
  WEBAUTHN_CREDENTIAL_NOT_FOUND: 'WEBAUTHN_CREDENTIAL_NOT_FOUND',
  WEBAUTHN_INVALID_SIGNATURE: 'WEBAUTHN_INVALID_SIGNATURE',
  
  // Magic link errors
  MAGIC_LINK_INVALID: 'MAGIC_LINK_INVALID',
  MAGIC_LINK_EXPIRED: 'MAGIC_LINK_EXPIRED',
  MAGIC_LINK_ALREADY_USED: 'MAGIC_LINK_ALREADY_USED',
  
  // Verification errors
  VERIFICATION_CODE_INVALID: 'VERIFICATION_CODE_INVALID',
  VERIFICATION_CODE_EXPIRED: 'VERIFICATION_CODE_EXPIRED',
  VERIFICATION_MAX_ATTEMPTS: 'VERIFICATION_MAX_ATTEMPTS',
  VERIFICATION_ALREADY_VERIFIED: 'VERIFICATION_ALREADY_VERIFIED',
} as const;

/**
 * Authorization error codes
 */
export const AUTHZ_ERROR_CODES = {
  // Permission errors
  INSUFFICIENT_PERMISSIONS: 'INSUFFICIENT_PERMISSIONS',
  PERMISSION_DENIED: 'PERMISSION_DENIED',
  RESOURCE_NOT_FOUND: 'RESOURCE_NOT_FOUND',
  RESOURCE_FORBIDDEN: 'RESOURCE_FORBIDDEN',
  
  // Role errors
  ROLE_NOT_FOUND: 'ROLE_NOT_FOUND',
  ROLE_ASSIGNMENT_FAILED: 'ROLE_ASSIGNMENT_FAILED',
  ROLE_REMOVAL_FAILED: 'ROLE_REMOVAL_FAILED',
  INSUFFICIENT_ROLE: 'INSUFFICIENT_ROLE',
  
  // Organization errors
  ORGANIZATION_NOT_FOUND: 'ORGANIZATION_NOT_FOUND',
  ORGANIZATION_ACCESS_DENIED: 'ORGANIZATION_ACCESS_DENIED',
  ORGANIZATION_MEMBERSHIP_REQUIRED: 'ORGANIZATION_MEMBERSHIP_REQUIRED',
  ORGANIZATION_ROLE_REQUIRED: 'ORGANIZATION_ROLE_REQUIRED',
  
  // Team errors
  TEAM_NOT_FOUND: 'TEAM_NOT_FOUND',
  TEAM_ACCESS_DENIED: 'TEAM_ACCESS_DENIED',
  TEAM_MEMBERSHIP_REQUIRED: 'TEAM_MEMBERSHIP_REQUIRED',
  TEAM_ROLE_REQUIRED: 'TEAM_ROLE_REQUIRED',
  
  // API key errors
  API_KEY_INVALID: 'API_KEY_INVALID',
  API_KEY_EXPIRED: 'API_KEY_EXPIRED',
  API_KEY_REVOKED: 'API_KEY_REVOKED',
  API_KEY_INSUFFICIENT_SCOPE: 'API_KEY_INSUFFICIENT_SCOPE',
} as const;

/**
 * Validation error codes
 */
export const VALIDATION_ERROR_CODES = {
  // General validation
  VALIDATION_FAILED: 'VALIDATION_FAILED',
  REQUIRED_FIELD_MISSING: 'REQUIRED_FIELD_MISSING',
  INVALID_FORMAT: 'INVALID_FORMAT',
  INVALID_VALUE: 'INVALID_VALUE',
  
  // Email validation
  INVALID_EMAIL: 'INVALID_EMAIL',
  EMAIL_DOMAIN_NOT_ALLOWED: 'EMAIL_DOMAIN_NOT_ALLOWED',
  
  // Phone validation
  INVALID_PHONE: 'INVALID_PHONE',
  PHONE_COUNTRY_NOT_SUPPORTED: 'PHONE_COUNTRY_NOT_SUPPORTED',
  
  // Password validation
  PASSWORD_TOO_SHORT: 'PASSWORD_TOO_SHORT',
  PASSWORD_TOO_LONG: 'PASSWORD_TOO_LONG',
  PASSWORD_MISSING_UPPERCASE: 'PASSWORD_MISSING_UPPERCASE',
  PASSWORD_MISSING_LOWERCASE: 'PASSWORD_MISSING_LOWERCASE',
  PASSWORD_MISSING_NUMBERS: 'PASSWORD_MISSING_NUMBERS',
  PASSWORD_MISSING_SYMBOLS: 'PASSWORD_MISSING_SYMBOLS',
  PASSWORD_COMMON: 'PASSWORD_COMMON',
  PASSWORD_CONTAINS_PERSONAL_INFO: 'PASSWORD_CONTAINS_PERSONAL_INFO',
  
  // URL validation
  INVALID_URL: 'INVALID_URL',
  URL_NOT_HTTPS: 'URL_NOT_HTTPS',
  
  // File validation
  FILE_TOO_LARGE: 'FILE_TOO_LARGE',
  FILE_TYPE_NOT_ALLOWED: 'FILE_TYPE_NOT_ALLOWED',
  FILE_CORRUPTED: 'FILE_CORRUPTED',
  
  // JSON validation
  INVALID_JSON: 'INVALID_JSON',
  SCHEMA_VALIDATION_FAILED: 'SCHEMA_VALIDATION_FAILED',
} as const;

/**
 * Network error codes
 */
export const NETWORK_ERROR_CODES = {
  // Connection errors
  CONNECTION_FAILED: 'CONNECTION_FAILED',
  CONNECTION_TIMEOUT: 'CONNECTION_TIMEOUT',
  CONNECTION_REFUSED: 'CONNECTION_REFUSED',
  DNS_RESOLUTION_FAILED: 'DNS_RESOLUTION_FAILED',
  
  // HTTP errors
  REQUEST_FAILED: 'REQUEST_FAILED',
  REQUEST_TIMEOUT: 'REQUEST_TIMEOUT',
  RESPONSE_INVALID: 'RESPONSE_INVALID',
  RESPONSE_TOO_LARGE: 'RESPONSE_TOO_LARGE',
  
  // SSL/TLS errors
  SSL_CERTIFICATE_ERROR: 'SSL_CERTIFICATE_ERROR',
  SSL_HANDSHAKE_FAILED: 'SSL_HANDSHAKE_FAILED',
  
  // Rate limiting
  TOO_MANY_REQUESTS: 'TOO_MANY_REQUESTS',
  RATE_LIMIT_EXCEEDED: 'RATE_LIMIT_EXCEEDED',
} as const;

/**
 * Database error codes
 */
export const DATABASE_ERROR_CODES = {
  // Connection errors
  DATABASE_CONNECTION_FAILED: 'DATABASE_CONNECTION_FAILED',
  DATABASE_CONNECTION_LOST: 'DATABASE_CONNECTION_LOST',
  DATABASE_TIMEOUT: 'DATABASE_TIMEOUT',
  
  // Query errors
  QUERY_FAILED: 'QUERY_FAILED',
  QUERY_TIMEOUT: 'QUERY_TIMEOUT',
  QUERY_SYNTAX_ERROR: 'QUERY_SYNTAX_ERROR',
  
  // Constraint errors
  UNIQUE_CONSTRAINT_VIOLATION: 'UNIQUE_CONSTRAINT_VIOLATION',
  FOREIGN_KEY_CONSTRAINT_VIOLATION: 'FOREIGN_KEY_CONSTRAINT_VIOLATION',
  CHECK_CONSTRAINT_VIOLATION: 'CHECK_CONSTRAINT_VIOLATION',
  NOT_NULL_CONSTRAINT_VIOLATION: 'NOT_NULL_CONSTRAINT_VIOLATION',
  
  // Transaction errors
  TRANSACTION_FAILED: 'TRANSACTION_FAILED',
  TRANSACTION_ROLLBACK: 'TRANSACTION_ROLLBACK',
  DEADLOCK_DETECTED: 'DEADLOCK_DETECTED',
  
  // Migration errors
  MIGRATION_FAILED: 'MIGRATION_FAILED',
  MIGRATION_ROLLBACK_FAILED: 'MIGRATION_ROLLBACK_FAILED',
  
  // Backup/restore errors
  BACKUP_FAILED: 'BACKUP_FAILED',
  RESTORE_FAILED: 'RESTORE_FAILED',
} as const;

/**
 * Configuration error codes
 */
export const CONFIG_ERROR_CODES = {
  // General configuration
  INVALID_CONFIGURATION: 'INVALID_CONFIGURATION',
  MISSING_CONFIGURATION: 'MISSING_CONFIGURATION',
  CONFIGURATION_LOAD_FAILED: 'CONFIGURATION_LOAD_FAILED',
  
  // Environment
  MISSING_ENVIRONMENT_VARIABLE: 'MISSING_ENVIRONMENT_VARIABLE',
  INVALID_ENVIRONMENT_VARIABLE: 'INVALID_ENVIRONMENT_VARIABLE',
  
  // File errors
  CONFIG_FILE_NOT_FOUND: 'CONFIG_FILE_NOT_FOUND',
  CONFIG_FILE_INVALID: 'CONFIG_FILE_INVALID',
  CONFIG_FILE_PERMISSION_DENIED: 'CONFIG_FILE_PERMISSION_DENIED',
  
  // Schema errors
  CONFIG_SCHEMA_VALIDATION_FAILED: 'CONFIG_SCHEMA_VALIDATION_FAILED',
  UNSUPPORTED_CONFIG_VERSION: 'UNSUPPORTED_CONFIG_VERSION',
} as const;

/**
 * Plugin error codes
 */
export const PLUGIN_ERROR_CODES = {
  // Plugin loading
  PLUGIN_LOAD_FAILED: 'PLUGIN_LOAD_FAILED',
  PLUGIN_NOT_FOUND: 'PLUGIN_NOT_FOUND',
  PLUGIN_INVALID: 'PLUGIN_INVALID',
  PLUGIN_DEPENDENCY_MISSING: 'PLUGIN_DEPENDENCY_MISSING',
  PLUGIN_VERSION_INCOMPATIBLE: 'PLUGIN_VERSION_INCOMPATIBLE',
  
  // Plugin execution
  PLUGIN_INITIALIZATION_FAILED: 'PLUGIN_INITIALIZATION_FAILED',
  PLUGIN_EXECUTION_FAILED: 'PLUGIN_EXECUTION_FAILED',
  PLUGIN_HOOK_FAILED: 'PLUGIN_HOOK_FAILED',
  PLUGIN_MIDDLEWARE_FAILED: 'PLUGIN_MIDDLEWARE_FAILED',
  
  // Plugin management
  PLUGIN_REGISTRATION_FAILED: 'PLUGIN_REGISTRATION_FAILED',
  PLUGIN_UNREGISTRATION_FAILED: 'PLUGIN_UNREGISTRATION_FAILED',
  PLUGIN_ALREADY_REGISTERED: 'PLUGIN_ALREADY_REGISTERED',
  PLUGIN_NOT_REGISTERED: 'PLUGIN_NOT_REGISTERED',
  
  // Plugin configuration
  PLUGIN_CONFIG_INVALID: 'PLUGIN_CONFIG_INVALID',
  PLUGIN_CONFIG_MISSING: 'PLUGIN_CONFIG_MISSING',
} as const;

/**
 * System error codes
 */
export const SYSTEM_ERROR_CODES = {
  // General system errors
  INTERNAL_SERVER_ERROR: 'INTERNAL_SERVER_ERROR',
  SERVICE_UNAVAILABLE: 'SERVICE_UNAVAILABLE',
  MAINTENANCE_MODE: 'MAINTENANCE_MODE',
  
  // Resource errors
  OUT_OF_MEMORY: 'OUT_OF_MEMORY',
  DISK_FULL: 'DISK_FULL',
  CPU_LIMIT_EXCEEDED: 'CPU_LIMIT_EXCEEDED',
  
  // File system errors
  FILE_NOT_FOUND: 'FILE_NOT_FOUND',
  FILE_PERMISSION_DENIED: 'FILE_PERMISSION_DENIED',
  FILE_SYSTEM_ERROR: 'FILE_SYSTEM_ERROR',
  
  // Network system errors
  NETWORK_INTERFACE_ERROR: 'NETWORK_INTERFACE_ERROR',
  PORT_ALREADY_IN_USE: 'PORT_ALREADY_IN_USE',
  
  // Process errors
  PROCESS_CRASHED: 'PROCESS_CRASHED',
  PROCESS_TIMEOUT: 'PROCESS_TIMEOUT',
  SIGNAL_RECEIVED: 'SIGNAL_RECEIVED',
} as const;

/**
 * All error codes combined
 */
export const ERROR_CODES = {
  ...AUTH_ERROR_CODES,
  ...AUTHZ_ERROR_CODES,
  ...VALIDATION_ERROR_CODES,
  ...NETWORK_ERROR_CODES,
  ...DATABASE_ERROR_CODES,
  ...CONFIG_ERROR_CODES,
  ...PLUGIN_ERROR_CODES,
  ...SYSTEM_ERROR_CODES,
} as const;

/**
 * Error code type
 */
export type ErrorCode = keyof typeof ERROR_CODES;

/**
 * Error details interface
 */
export interface ErrorDetails {
  /** Error field (for validation errors) */
  field?: string;
  
  /** Error value (for validation errors) */
  value?: any;
  
  /** Expected value or format */
  expected?: any;
  
  /** Additional context */
  context?: Record<string, any>;
  
  /** Nested errors */
  errors?: ErrorDetails[];
  
  /** Error location (file, line, etc.) */
  location?: {
    file?: string;
    line?: number;
    column?: number;
    function?: string;
  };
  
  /** HTTP-specific details */
  http?: {
    method?: string;
    url?: string;
    headers?: Record<string, string>;
    statusCode?: number;
    responseBody?: any;
  };
  
  /** Database-specific details */
  database?: {
    query?: string;
    parameters?: any[];
    constraint?: string;
    table?: string;
    column?: string;
  };
  
  /** Plugin-specific details */
  plugin?: {
    id?: string;
    version?: string;
    hook?: string;
    middleware?: string;
  };
}

/**
 * Error handler interface
 */
export interface ErrorHandler {
  /** Handle error */
  handle: (error: CFAuthError) => Promise<void> | void;
  
  /** Check if handler can handle error */
  canHandle?: (error: CFAuthError) => boolean;
  
  /** Error handler priority */
  priority?: number;
}

/**
 * Error reporter interface
 */
export interface ErrorReporter {
  /** Report error */
  report: (error: CFAuthError) => Promise<void> | void;
  
  /** Configure reporter */
  configure?: (options: any) => void;
  
  /** Reporter name */
  name: string;
}

/**
 * Error recovery strategy
 */
export interface ErrorRecoveryStrategy {
  /** Strategy name */
  name: string;
  
  /** Check if strategy can recover from error */
  canRecover: (error: CFAuthError) => boolean;
  
  /** Attempt recovery */
  recover: (error: CFAuthError, context: any) => Promise<any>;
  
  /** Maximum recovery attempts */
  maxAttempts?: number;
  
  /** Recovery timeout */
  timeout?: number;
}

/**
 * Error notification interface
 */
export interface ErrorNotification {
  /** Notification ID */
  id: string;
  
  /** Error that triggered notification */
  error: CFAuthError;
  
  /** Notification severity */
  severity: ErrorSeverity;
  
  /** Notification channel */
  channel: 'email' | 'slack' | 'webhook' | 'sms' | 'custom';
  
  /** Notification recipients */
  recipients: string[];
  
  /** Notification timestamp */
  timestamp: Date;
  
  /** Whether notification was sent */
  sent: boolean;
  
  /** Notification metadata */
  metadata?: Record<string, any>;
}

/**
 * Error metrics interface
 */
export interface ErrorMetrics {
  /** Total error count */
  total: number;
  
  /** Error count by category */
  byCategory: Record<ErrorCategory, number>;
  
  /** Error count by code */
  byCode: Record<string, number>;
  
  /** Error count by severity */
  bySeverity: Record<ErrorSeverity, number>;
  
  /** Error rate (errors per minute) */
  rate: number;
  
  /** Average response time for errors */
  averageResponseTime: number;
  
  /** Most common errors */
  topErrors: Array<{
    code: string;
    count: number;
    percentage: number;
  }>;
  
  /** Error trend over time */
  trend: Array<{
    timestamp: Date;
    count: number;
  }>;
}

/**
 * Error context interface
 */
export interface ErrorContext {
  /** Request information */
  request?: {
    method?: string;
    url?: string;
    headers?: Record<string, string>;
    body?: any;
    params?: Record<string, any>;
    query?: Record<string, any>;
    ip?: string;
    userAgent?: string;
  };
  
  /** User information */
  user?: {
    id?: string;
    email?: string;
    roles?: string[];
    permissions?: string[];
  };
  
  /** Session information */
  session?: {
    id?: string;
    createdAt?: Date;
    lastActiveAt?: Date;
  };
  
  /** Application state */
  app?: {
    version?: string;
    environment?: string;
    uptime?: number;
    memory?: {
      used: number;
      total: number;
    };
  };
  
  /** Database state */
  database?: {
    connectionCount?: number;
    activeQueries?: number;
    lastQuery?: string;
  };
  
  /** Plugin state */
  plugins?: {
    active?: string[];
    inactive?: string[];
    failed?: string[];
  };
  
  /** Custom context */
  custom?: Record<string, any>;
}

/**
 * Error factory for creating typed errors
 */
export class ErrorFactory {
  /**
   * Create authentication error
   */
  static auth(
    code: keyof typeof AUTH_ERROR_CODES,
    message?: string,
    details?: any,
    options?: Partial<CFAuthErrorOptions>
  ): CFAuthError {
    return new CFAuthError({
      code,
      message: message || this.getDefaultMessage(code),
      details,
      category: 'AUTHENTICATION',
      statusCode: this.getStatusCode(code),
      ...options,
    });
  }
  
  /**
   * Create authorization error
   */
  static authz(
    code: keyof typeof AUTHZ_ERROR_CODES,
    message?: string,
    details?: any,
    options?: Partial<CFAuthErrorOptions>
  ): CFAuthError {
    return new CFAuthError({
      code,
      message: message || this.getDefaultMessage(code),
      details,
      category: 'AUTHORIZATION',
      statusCode: this.getStatusCode(code),
      ...options,
    });
  }
  
  /**
   * Create validation error
   */
  static validation(
    code: keyof typeof VALIDATION_ERROR_CODES,
    message?: string,
    details?: any,
    options?: Partial<CFAuthErrorOptions>
  ): CFAuthError {
    return new CFAuthError({
      code,
      message: message || this.getDefaultMessage(code),
      details,
      category: 'VALIDATION',
      statusCode: 422,
      ...options,
    });
  }
  
  /**
   * Create database error
   */
  static database(
    code: keyof typeof DATABASE_ERROR_CODES,
    message?: string,
    details?: any,
    options?: Partial<CFAuthErrorOptions>
  ): CFAuthError {
    return new CFAuthError({
      code,
      message: message || this.getDefaultMessage(code),
      details,
      category: 'DATABASE',
      statusCode: 500,
      retryable: true,
      ...options,
    });
  }
  
  /**
   * Create configuration error
   */
  static config(
    code: keyof typeof CONFIG_ERROR_CODES,
    message?: string,
    details?: any,
    options?: Partial<CFAuthErrorOptions>
  ): CFAuthError {
    return new CFAuthError({
      code,
      message: message || this.getDefaultMessage(code),
      details,
      category: 'CONFIGURATION',
      statusCode: 500,
      ...options,
    });
  }
  
  /**
   * Create plugin error
   */
  static plugin(
    code: keyof typeof PLUGIN_ERROR_CODES,
    message?: string,
    details?: any,
    options?: Partial<CFAuthErrorOptions>
  ): CFAuthError {
    return new CFAuthError({
      code,
      message: message || this.getDefaultMessage(code),
      details,
      category: 'PLUGIN',
      statusCode: 500,
      ...options,
    });
  }
  
  /**
   * Create system error
   */
  static system(
    code: keyof typeof SYSTEM_ERROR_CODES,
    message?: string,
    details?: any,
    options?: Partial<CFAuthErrorOptions>
  ): CFAuthError {
    return new CFAuthError({
      code,
      message: message || this.getDefaultMessage(code),
      details,
      category: 'SYSTEM',
      statusCode: 500,
      retryable: true,
      ...options,
    });
  }
  
  /**
   * Get default message for error code
   */
  private static getDefaultMessage(code: string): string {
    const messages: Record<string, string> = {
      INVALID_CREDENTIALS: 'Invalid credentials provided',
      USER_NOT_FOUND: 'User not found',
      SESSION_EXPIRED: 'Session has expired',
      TOKEN_INVALID: 'Invalid token',
      INSUFFICIENT_PERMISSIONS: 'Insufficient permissions',
      VALIDATION_FAILED: 'Validation failed',
      DATABASE_CONNECTION_FAILED: 'Database connection failed',
      INTERNAL_SERVER_ERROR: 'Internal server error',
      // Add more default messages as needed
    };
    
    return messages[code] || 'An error occurred';
  }
  
  /**
   * Get HTTP status code for error code
   */
  private static getStatusCode(code: string): HttpStatusCode {
    const statusCodes: Record<string, HttpStatusCode> = {
      INVALID_CREDENTIALS: 401,
      USER_NOT_FOUND: 404,
      SESSION_EXPIRED: 401,
      TOKEN_INVALID: 401,
      INSUFFICIENT_PERMISSIONS: 403,
      VALIDATION_FAILED: 422,
      TOO_MANY_REQUESTS: 429,
      // Add more status codes as needed
    };
    
    return statusCodes[code] || 500;
  }
}
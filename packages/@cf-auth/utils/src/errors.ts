/**
 * Error utilities for CF-Better-Auth
 * 
 * @fileoverview This module provides error creation, formatting, and handling
 * utilities with structured error information and stack trace management.
 * 
 * Features:
 * - Structured error creation
 * - Error categorization and severity
 * - Stack trace processing
 * - Error serialization/deserialization
 * - Error reporting and metrics
 */

import type { Brand } from '@cf-auth/types';
import { ERROR_CONSTANTS } from './constants';

/**
 * Branded types for errors
 */
export type ErrorCode = Brand<string, 'ErrorCode'>;
export type ErrorId = Brand<string, 'ErrorId'>;

/**
 * Error interfaces
 */
export interface ErrorOptions {
  /** Error code */
  code?: ErrorCode;
  /** Error category */
  category?: string;
  /** Error severity */
  severity?: 'low' | 'medium' | 'high' | 'critical';
  /** Additional error context */
  context?: Record<string, any>;
  /** Original/cause error */
  cause?: Error;
  /** User-friendly message */
  userMessage?: string;
  /** Whether error should be reported */
  reportable?: boolean;
  /** Retry information */
  retryable?: boolean;
  /** HTTP status code */
  statusCode?: number;
  /** Error metadata */
  metadata?: Record<string, any>;
}

export interface SerializedError {
  name: string;
  message: string;
  code?: ErrorCode;
  category?: string;
  severity?: string;
  stack?: string;
  context?: Record<string, any>;
  userMessage?: string;
  statusCode?: number;
  timestamp: number;
  id: ErrorId;
  metadata?: Record<string, any>;
}

export interface ErrorReport {
  error: SerializedError;
  environment: {
    userAgent?: string;
    url?: string;
    userId?: string;
    sessionId?: string;
    version?: string;
  };
  timestamp: number;
  reportId: string;
}

/**
 * Base CF-Auth error class
 */
export class CFAuthError extends Error {
  public readonly code: ErrorCode;
  public readonly category: string;
  public readonly severity: 'low' | 'medium' | 'high' | 'critical';
  public readonly context: Record<string, any>;
  public readonly cause?: Error;
  public readonly userMessage?: string;
  public readonly reportable: boolean;
  public readonly retryable: boolean;
  public readonly statusCode?: number;
  public readonly metadata: Record<string, any>;
  public readonly id: ErrorId;
  public readonly timestamp: number;

  constructor(message: string, options: ErrorOptions = {}) {
    super(message);
    
    this.name = this.constructor.name;
    this.code = options.code || ('UNKNOWN_ERROR' as ErrorCode);
    this.category = options.category || ERROR_CONSTANTS.CATEGORIES.SYSTEM;
    this.severity = options.severity || 'medium';
    this.context = options.context || {};
    this.cause = options.cause;
    this.userMessage = options.userMessage;
    this.reportable = options.reportable !== false;
    this.retryable = options.retryable || false;
    this.statusCode = options.statusCode;
    this.metadata = options.metadata || {};
    this.id = this.generateId();
    this.timestamp = Date.now();

    // Maintain proper prototype chain
    Object.setPrototypeOf(this, CFAuthError.prototype);

    // Capture stack trace
    if (Error.captureStackTrace) {
      Error.captureStackTrace(this, CFAuthError);
    }
  }

  /**
   * Generate unique error ID
   */
  private generateId(): ErrorId {
    return `err_${Date.now()}_${Math.random().toString(36).substring(2)}` as ErrorId;
  }

  /**
   * Serialize error to JSON
   */
  toJSON(): SerializedError {
    return {
      name: this.name,
      message: this.message,
      code: this.code,
      category: this.category,
      severity: this.severity,
      stack: this.stack,
      context: this.context,
      userMessage: this.userMessage,
      statusCode: this.statusCode,
      timestamp: this.timestamp,
      id: this.id,
      metadata: this.metadata
    };
  }

  /**
   * Get formatted error message for users
   */
  getUserMessage(): string {
    return this.userMessage || this.getDefaultUserMessage();
  }

  /**
   * Get default user-friendly message based on category
   */
  private getDefaultUserMessage(): string {
    switch (this.category) {
      case ERROR_CONSTANTS.CATEGORIES.AUTHENTICATION:
        return 'Authentication failed. Please check your credentials.';
      case ERROR_CONSTANTS.CATEGORIES.AUTHORIZATION:
        return 'You do not have permission to perform this action.';
      case ERROR_CONSTANTS.CATEGORIES.VALIDATION:
        return 'The provided information is invalid.';
      case ERROR_CONSTANTS.CATEGORIES.NETWORK:
        return 'A network error occurred. Please try again.';
      case ERROR_CONSTANTS.CATEGORIES.DATABASE:
        return 'A database error occurred. Please try again later.';
      default:
        return 'An unexpected error occurred. Please try again.';
    }
  }

  /**
   * Create error report
   */
  createReport(environment: Partial<ErrorReport['environment']> = {}): ErrorReport {
    return {
      error: this.toJSON(),
      environment,
      timestamp: Date.now(),
      reportId: `report_${this.id}_${Date.now()}`
    };
  }
}

/**
 * Specific error classes
 */
export class ValidationError extends CFAuthError {
  constructor(message: string, options: ErrorOptions = {}) {
    super(message, {
      ...options,
      category: ERROR_CONSTANTS.CATEGORIES.VALIDATION,
      statusCode: options.statusCode || 400,
      retryable: false
    });
  }
}

export class AuthenticationError extends CFAuthError {
  constructor(message: string, options: ErrorOptions = {}) {
    super(message, {
      ...options,
      category: ERROR_CONSTANTS.CATEGORIES.AUTHENTICATION,
      statusCode: options.statusCode || 401,
      retryable: false
    });
  }
}

export class AuthorizationError extends CFAuthError {
  constructor(message: string, options: ErrorOptions = {}) {
    super(message, {
      ...options,
      category: ERROR_CONSTANTS.CATEGORIES.AUTHORIZATION,
      statusCode: options.statusCode || 403,
      retryable: false
    });
  }
}

export class NetworkError extends CFAuthError {
  constructor(message: string, options: ErrorOptions = {}) {
    super(message, {
      ...options,
      category: ERROR_CONSTANTS.CATEGORIES.NETWORK,
      statusCode: options.statusCode || 500,
      retryable: true
    });
  }
}

export class DatabaseError extends CFAuthError {
  constructor(message: string, options: ErrorOptions = {}) {
    super(message, {
      ...options,
      category: ERROR_CONSTANTS.CATEGORIES.DATABASE,
      statusCode: options.statusCode || 500,
      retryable: true,
      severity: 'high'
    });
  }
}

export class ConfigurationError extends CFAuthError {
  constructor(message: string, options: ErrorOptions = {}) {
    super(message, {
      ...options,
      category: ERROR_CONSTANTS.CATEGORIES.CONFIG,
      statusCode: options.statusCode || 500,
      retryable: false,
      severity: 'high'
    });
  }
}

export class PluginError extends CFAuthError {
  constructor(message: string, options: ErrorOptions = {}) {
    super(message, {
      ...options,
      category: ERROR_CONSTANTS.CATEGORIES.PLUGIN,
      statusCode: options.statusCode || 500,
      retryable: false
    });
  }
}

export class SystemError extends CFAuthError {
  constructor(message: string, options: ErrorOptions = {}) {
    super(message, {
      ...options,
      category: ERROR_CONSTANTS.CATEGORIES.SYSTEM,
      statusCode: options.statusCode || 500,
      severity: 'critical'
    });
  }
}

/**
 * Error factory
 */
export class ErrorFactory {
  private static codeToClass: Map<string, typeof CFAuthError> = new Map([
    ['VALIDATION_ERROR', ValidationError],
    ['AUTHENTICATION_ERROR', AuthenticationError],
    ['AUTHORIZATION_ERROR', AuthorizationError],
    ['NETWORK_ERROR', NetworkError],
    ['DATABASE_ERROR', DatabaseError],
    ['CONFIG_ERROR', ConfigurationError],
    ['PLUGIN_ERROR', PluginError],
    ['SYSTEM_ERROR', SystemError]
  ]);

  /**
   * Create error from code
   */
  static create(code: ErrorCode, message: string, options: ErrorOptions = {}): CFAuthError {
    const ErrorClass = this.codeToClass.get(code) || CFAuthError;
    return new ErrorClass(message, { ...options, code });
  }

  /**
   * Create error from existing error
   */
  static wrap(error: Error, options: ErrorOptions = {}): CFAuthError {
    if (error instanceof CFAuthError) {
      return error;
    }

    return new CFAuthError(error.message, {
      ...options,
      cause: error,
      code: options.code || ('WRAPPED_ERROR' as ErrorCode)
    });
  }

  /**
   * Create error from HTTP response
   */
  static fromHTTPResponse(
    status: number,
    statusText: string,
    body?: any,
    options: ErrorOptions = {}
  ): CFAuthError {
    let ErrorClass = CFAuthError;
    let code = 'HTTP_ERROR' as ErrorCode;

    if (status === 400) {
      ErrorClass = ValidationError;
      code = 'VALIDATION_ERROR' as ErrorCode;
    } else if (status === 401) {
      ErrorClass = AuthenticationError;
      code = 'AUTHENTICATION_ERROR' as ErrorCode;
    } else if (status === 403) {
      ErrorClass = AuthorizationError;
      code = 'AUTHORIZATION_ERROR' as ErrorCode;
    } else if (status >= 500) {
      ErrorClass = SystemError;
      code = 'SYSTEM_ERROR' as ErrorCode;
    }

    const message = body?.message || statusText || `HTTP ${status} Error`;

    return new ErrorClass(message, {
      ...options,
      code,
      statusCode: status,
      context: { status, statusText, body }
    });
  }

  /**
   * Register custom error class
   */
  static register(code: string, errorClass: typeof CFAuthError): void {
    this.codeToClass.set(code, errorClass);
  }
}

/**
 * Error utilities
 */

/**
 * Check if error is a CFAuth error
 */
export function isCFAuthError(error: any): error is CFAuthError {
  return error instanceof CFAuthError;
}

/**
 * Check if error is retryable
 */
export function isRetryableError(error: any): boolean {
  if (isCFAuthError(error)) {
    return error.retryable;
  }

  // Check for common retryable error patterns
  if (error?.code === 'ECONNRESET' || error?.code === 'ENOTFOUND') {
    return true;
  }

  if (error?.status >= 500) {
    return true;
  }

  return false;
}

/**
 * Get error message safely
 */
export function getErrorMessage(error: any): string {
  if (typeof error === 'string') {
    return error;
  }

  if (error?.message) {
    return String(error.message);
  }

  if (error?.toString) {
    return error.toString();
  }

  return 'Unknown error occurred';
}

/**
 * Get error stack trace safely
 */
export function getErrorStack(error: any): string | undefined {
  if (error?.stack) {
    return String(error.stack);
  }

  return undefined;
}

/**
 * Serialize error for transmission
 */
export function serializeError(error: any): SerializedError {
  if (isCFAuthError(error)) {
    return error.toJSON();
  }

  return {
    name: error?.name || 'Error',
    message: getErrorMessage(error),
    stack: getErrorStack(error),
    timestamp: Date.now(),
    id: `err_${Date.now()}_${Math.random().toString(36).substring(2)}` as ErrorId
  };
}

/**
 * Deserialize error from JSON
 */
export function deserializeError(serialized: SerializedError): CFAuthError {
  return new CFAuthError(serialized.message, {
    code: serialized.code,
    category: serialized.category,
    severity: serialized.severity as any,
    context: serialized.context,
    userMessage: serialized.userMessage,
    statusCode: serialized.statusCode,
    metadata: serialized.metadata
  });
}

/**
 * Format error for logging
 */
export function formatError(error: any, includeStack: boolean = true): string {
  const message = getErrorMessage(error);
  const stack = includeStack ? getErrorStack(error) : undefined;

  let formatted = `Error: ${message}`;

  if (isCFAuthError(error)) {
    formatted = `[${error.code}] ${error.category}: ${message}`;
    
    if (Object.keys(error.context).length > 0) {
      formatted += `\nContext: ${JSON.stringify(error.context, null, 2)}`;
    }
  }

  if (stack) {
    formatted += `\n${stack}`;
  }

  return formatted;
}

/**
 * Create error matcher function
 */
export function createErrorMatcher(...codes: ErrorCode[]) {
  return (error: any): boolean => {
    if (!isCFAuthError(error)) {
      return false;
    }

    return codes.includes(error.code);
  };
}

/**
 * Aggregate multiple errors
 */
export class AggregateError extends CFAuthError {
  public readonly errors: Error[];

  constructor(errors: Error[], message: string = 'Multiple errors occurred') {
    super(message, {
      code: 'AGGREGATE_ERROR' as ErrorCode,
      category: ERROR_CONSTANTS.CATEGORIES.SYSTEM
    });

    this.errors = errors;
    this.name = 'AggregateError';
  }

  /**
   * Get all error messages
   */
  getAllMessages(): string[] {
    return this.errors.map(getErrorMessage);
  }

  /**
   * Format all errors
   */
  formatAll(): string {
    return this.errors.map(formatError).join('\n\n');
  }
}

/**
 * Error metrics collector
 */
export class ErrorMetrics {
  private metrics = new Map<string, {
    count: number;
    lastOccurred: number;
    severity: string;
  }>();

  /**
   * Record error occurrence
   */
  record(error: CFAuthError): void {
    const key = `${error.category}:${error.code}`;
    const existing = this.metrics.get(key);

    if (existing) {
      existing.count++;
      existing.lastOccurred = Date.now();
    } else {
      this.metrics.set(key, {
        count: 1,
        lastOccurred: Date.now(),
        severity: error.severity
      });
    }
  }

  /**
   * Get metrics for a specific error
   */
  getMetrics(category: string, code: ErrorCode): {
    count: number;
    lastOccurred: number;
    severity: string;
  } | undefined {
    return this.metrics.get(`${category}:${code}`);
  }

  /**
   * Get all metrics
   */
  getAllMetrics(): Record<string, {
    count: number;
    lastOccurred: number;
    severity: string;
  }> {
    return Object.fromEntries(this.metrics);
  }

  /**
   * Clear metrics
   */
  clear(): void {
    this.metrics.clear();
  }

  /**
   * Get top errors by count
   */
  getTopErrors(limit: number = 10): Array<{
    key: string;
    count: number;
    lastOccurred: number;
    severity: string;
  }> {
    return Array.from(this.metrics.entries())
      .map(([key, metrics]) => ({ key, ...metrics }))
      .sort((a, b) => b.count - a.count)
      .slice(0, limit);
  }
}

/**
 * Create error metrics instance
 */
export function createErrorMetrics(): ErrorMetrics {
  return new ErrorMetrics();
}

/**
 * Error boundary utility for async functions
 */
export async function errorBoundary<T>(
  fn: () => Promise<T>,
  fallback?: (error: Error) => T | Promise<T>
): Promise<T> {
  try {
    return await fn();
  } catch (error) {
    if (fallback) {
      return await fallback(error as Error);
    }
    throw error;
  }
}

/**
 * Create safe function wrapper
 */
export function makeSafe<T extends (...args: any[]) => any>(
  fn: T,
  fallback?: (error: Error, ...args: Parameters<T>) => ReturnType<T>
): T {
  return ((...args: Parameters<T>): ReturnType<T> => {
    try {
      const result = fn(...args);
      
      // Handle promise-returning functions
      if (result && typeof result.catch === 'function') {
        return result.catch((error: Error) => {
          if (fallback) {
            return fallback(error, ...args);
          }
          throw error;
        });
      }
      
      return result;
    } catch (error) {
      if (fallback) {
        return fallback(error as Error, ...args);
      }
      throw error;
    }
  }) as T;
}
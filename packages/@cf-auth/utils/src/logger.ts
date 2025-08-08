/**
 * Logging utilities for CF-Better-Auth
 * 
 * @fileoverview This module provides structured logging utilities with multiple
 * levels, formatters, transports, and context management for debugging and monitoring.
 * 
 * Features:
 * - Multiple log levels with filtering
 * - Structured logging with context
 * - Multiple output formats
 * - Transport system (console, file, remote)
 * - Performance logging
 * - Error tracking integration
 */

import type { LogLevel, Brand } from '@cf-auth/types';
import { LOGGING_CONSTANTS } from './constants';

/**
 * Branded types for logging
 */
export type LogContext = Brand<Record<string, any>, 'LogContext'>;
export type LogMessage = Brand<string, 'LogMessage'>;
export type LogId = Brand<string, 'LogId'>;

/**
 * Log entry interface
 */
export interface LogEntry {
  /** Unique log entry ID */
  id: LogId;
  /** Log level */
  level: LogLevel;
  /** Log message */
  message: LogMessage;
  /** Timestamp */
  timestamp: Date;
  /** Additional context data */
  context: LogContext;
  /** Logger name/category */
  logger?: string;
  /** Error object (for error logs) */
  error?: Error;
  /** Request ID for tracing */
  requestId?: string;
  /** User ID for user-specific logs */
  userId?: string;
  /** Session ID for session tracking */
  sessionId?: string;
}

/**
 * Logger configuration
 */
export interface LoggerConfig {
  /** Minimum log level to output */
  level?: LogLevel;
  /** Logger name */
  name?: string;
  /** Default context to include in all logs */
  defaultContext?: Record<string, any>;
  /** Enable/disable logging */
  enabled?: boolean;
  /** Output format */
  format?: LogFormat;
  /** Transports to use */
  transports?: LogTransport[];
}

/**
 * Log format types
 */
export type LogFormat = 'json' | 'text' | 'simple' | 'detailed';

/**
 * Log transport interface
 */
export interface LogTransport {
  name: string;
  level?: LogLevel;
  log(entry: LogEntry): Promise<void> | void;
  flush?(): Promise<void>;
  close?(): Promise<void>;
}

/**
 * Performance timing interface
 */
export interface PerformanceTimer {
  /** Timer ID */
  id: string;
  /** Start time */
  start: number;
  /** End timer and log duration */
  end(message?: string, context?: Record<string, any>): void;
}

/**
 * Logger class
 */
export class Logger {
  private config: Required<LoggerConfig>;
  private timers = new Map<string, number>();

  constructor(config: LoggerConfig = {}) {
    this.config = {
      level: config.level || 'info',
      name: config.name || 'default',
      defaultContext: config.defaultContext || {},
      enabled: config.enabled !== false,
      format: config.format || 'text',
      transports: config.transports || [new ConsoleTransport()]
    };
  }

  /**
   * Log error message
   */
  error(message: string, context: Record<string, any> = {}, error?: Error): void {
    this.log('error', message, context, error);
  }

  /**
   * Log warning message
   */
  warn(message: string, context: Record<string, any> = {}): void {
    this.log('warn', message, context);
  }

  /**
   * Log info message
   */
  info(message: string, context: Record<string, any> = {}): void {
    this.log('info', message, context);
  }

  /**
   * Log debug message
   */
  debug(message: string, context: Record<string, any> = {}): void {\n    this.log('debug', message, context);
  }

  /**
   * Log trace message
   */
  trace(message: string, context: Record<string, any> = {}): void {
    this.log('trace', message, context);
  }

  /**
   * Generic log method
   */
  log(\n    level: LogLevel,\n    message: string,\n    context: Record<string, any> = {},\n    error?: Error\n  ): void {
    if (!this.config.enabled || !this.shouldLog(level)) {
      return;
    }

    const entry: LogEntry = {
      id: this.generateLogId(),
      level,
      message: message as LogMessage,
      timestamp: new Date(),
      context: { ...this.config.defaultContext, ...context } as LogContext,
      logger: this.config.name,
      error
    };

    // Add request/user context if available
    if (typeof globalThis !== 'undefined' && (globalThis as any).logContext) {
      const globalContext = (globalThis as any).logContext;
      entry.requestId = globalContext.requestId;
      entry.userId = globalContext.userId;
      entry.sessionId = globalContext.sessionId;
    }

    this.output(entry);
  }

  /**
   * Start performance timer
   */
  time(label: string): PerformanceTimer {
    const id = `${this.config.name}:${label}`;
    const start = performance.now();
    this.timers.set(id, start);

    return {
      id,
      start,
      end: (message?: string, context: Record<string, any> = {}) => {
        this.timeEnd(label, message, context);
      }
    };
  }

  /**
   * End performance timer and log duration
   */
  timeEnd(label: string, message?: string, context: Record<string, any> = {}): void {
    const id = `${this.config.name}:${label}`;
    const start = this.timers.get(id);
    
    if (start === undefined) {
      this.warn(`Timer '${label}' was not started`);
      return;
    }

    const duration = performance.now() - start;
    this.timers.delete(id);

    this.info(
      message || `Timer '${label}' completed`,
      { ...context, duration: `${duration.toFixed(2)}ms`, label }
    );
  }

  /**
   * Create child logger with additional context
   */
  child(context: Record<string, any>, name?: string): Logger {
    return new Logger({
      ...this.config,
      name: name || this.config.name,
      defaultContext: { ...this.config.defaultContext, ...context }
    });
  }

  /**
   * Set log level
   */
  setLevel(level: LogLevel): void {
    this.config.level = level;
  }

  /**
   * Add transport
   */
  addTransport(transport: LogTransport): void {
    this.config.transports.push(transport);
  }

  /**
   * Remove transport
   */
  removeTransport(name: string): void {
    this.config.transports = this.config.transports.filter(t => t.name !== name);
  }

  /**
   * Enable/disable logging
   */
  setEnabled(enabled: boolean): void {
    this.config.enabled = enabled;
  }

  /**
   * Flush all transports
   */
  async flush(): Promise<void> {
    await Promise.all(
      this.config.transports
        .filter(transport => transport.flush)
        .map(transport => transport.flush!())
    );
  }

  /**
   * Close all transports
   */
  async close(): Promise<void> {
    await Promise.all(
      this.config.transports
        .filter(transport => transport.close)
        .map(transport => transport.close!())
    );
  }

  /**
   * Check if level should be logged
   */
  private shouldLog(level: LogLevel): boolean {
    const levelPriority = LOGGING_CONSTANTS.PRIORITIES[level] || 0;
    const configPriority = LOGGING_CONSTANTS.PRIORITIES[this.config.level] || 0;
    return levelPriority >= configPriority;
  }

  /**
   * Output log entry to transports
   */
  private async output(entry: LogEntry): Promise<void> {
    const promises = this.config.transports
      .filter(transport => !transport.level || this.shouldLogForTransport(entry.level, transport.level))
      .map(transport => transport.log(entry));

    await Promise.allSettled(promises);
  }

  /**
   * Check if level should be logged for specific transport
   */
  private shouldLogForTransport(level: LogLevel, transportLevel: LogLevel): boolean {
    const levelPriority = LOGGING_CONSTANTS.PRIORITIES[level] || 0;
    const transportPriority = LOGGING_CONSTANTS.PRIORITIES[transportLevel] || 0;
    return levelPriority >= transportPriority;
  }

  /**
   * Generate unique log ID
   */
  private generateLogId(): LogId {
    return `log_${Date.now()}_${Math.random().toString(36).substring(2)}` as LogId;
  }
}

/**
 * Console transport
 */
export class ConsoleTransport implements LogTransport {
  name = 'console';
  level?: LogLevel;

  constructor(level?: LogLevel) {
    this.level = level;
  }

  log(entry: LogEntry): void {
    const formatted = this.format(entry);
    
    switch (entry.level) {
      case 'error':
        console.error(formatted);
        if (entry.error) console.error(entry.error);
        break;
      case 'warn':
        console.warn(formatted);
        break;
      case 'info':
        console.info(formatted);
        break;
      case 'debug':
        console.debug(formatted);
        break;
      case 'trace':
        console.trace(formatted);
        break;
      default:
        console.log(formatted);
    }
  }

  private format(entry: LogEntry): string {
    const timestamp = entry.timestamp.toISOString();
    const level = entry.level.toUpperCase().padEnd(5);
    const logger = entry.logger ? `[${entry.logger}]` : '';
    const context = Object.keys(entry.context).length > 0 
      ? ` ${JSON.stringify(entry.context)}`
      : '';
    
    return `${timestamp} ${level} ${logger} ${entry.message}${context}`;
  }
}

/**
 * JSON transport (for structured logging)
 */
export class JSONTransport implements LogTransport {
  name = 'json';
  level?: LogLevel;

  constructor(level?: LogLevel) {
    this.level = level;
  }

  log(entry: LogEntry): void {
    const jsonEntry = {
      id: entry.id,
      timestamp: entry.timestamp.toISOString(),
      level: entry.level,
      logger: entry.logger,
      message: entry.message,
      context: entry.context,
      requestId: entry.requestId,
      userId: entry.userId,
      sessionId: entry.sessionId,
      error: entry.error ? {
        name: entry.error.name,
        message: entry.error.message,
        stack: entry.error.stack
      } : undefined
    };

    console.log(JSON.stringify(jsonEntry));
  }
}

/**
 * File transport (Node.js only)
 */
export class FileTransport implements LogTransport {
  name = 'file';
  level?: LogLevel;
  private filename: string;
  private maxSize?: number;
  private maxFiles?: number;

  constructor(filename: string, options: {
    level?: LogLevel;
    maxSize?: number;
    maxFiles?: number;
  } = {}) {
    this.filename = filename;
    this.level = options.level;
    this.maxSize = options.maxSize;
    this.maxFiles = options.maxFiles;
  }

  async log(entry: LogEntry): Promise<void> {
    if (typeof require === 'undefined') {
      return; // Not in Node.js environment
    }

    try {
      const fs = require('fs').promises;
      const path = require('path');
      
      const formatted = this.format(entry);
      const logLine = `${formatted}\n`;

      // Ensure directory exists
      const dir = path.dirname(this.filename);
      await fs.mkdir(dir, { recursive: true });

      // Check file size and rotate if needed
      if (this.maxSize) {
        try {
          const stats = await fs.stat(this.filename);
          if (stats.size + logLine.length > this.maxSize) {
            await this.rotate();
          }
        } catch (error) {
          // File doesn't exist, ignore
        }
      }

      await fs.appendFile(this.filename, logLine);
    } catch (error) {
      console.error('Failed to write to log file:', error);
    }
  }

  private format(entry: LogEntry): string {
    const timestamp = entry.timestamp.toISOString();
    const level = entry.level.toUpperCase();
    const logger = entry.logger ? `[${entry.logger}]` : '';
    const context = Object.keys(entry.context).length > 0 
      ? ` ${JSON.stringify(entry.context)}`
      : '';
    
    let formatted = `${timestamp} ${level} ${logger} ${entry.message}${context}`;
    
    if (entry.error) {
      formatted += `\nError: ${entry.error.message}\nStack: ${entry.error.stack}`;
    }
    
    return formatted;
  }

  private async rotate(): Promise<void> {
    if (typeof require === 'undefined') return;

    try {
      const fs = require('fs').promises;
      const path = require('path');
      
      const ext = path.extname(this.filename);
      const base = path.basename(this.filename, ext);
      const dir = path.dirname(this.filename);

      // Rotate existing files
      if (this.maxFiles) {
        for (let i = this.maxFiles - 1; i >= 1; i--) {
          const oldFile = path.join(dir, `${base}.${i}${ext}`);
          const newFile = path.join(dir, `${base}.${i + 1}${ext}`);
          
          try {
            await fs.rename(oldFile, newFile);
          } catch (error) {
            // File doesn't exist, ignore
          }
        }
      }

      // Move current file to .1
      const rotatedFile = path.join(dir, `${base}.1${ext}`);
      await fs.rename(this.filename, rotatedFile);
    } catch (error) {
      console.error('Failed to rotate log file:', error);
    }
  }
}

/**
 * Remote transport (for sending logs to external service)
 */
export class RemoteTransport implements LogTransport {
  name = 'remote';
  level?: LogLevel;
  private endpoint: string;
  private apiKey?: string;
  private batchSize: number;
  private flushInterval: number;
  private batch: LogEntry[] = [];
  private timer?: NodeJS.Timeout;

  constructor(endpoint: string, options: {
    level?: LogLevel;
    apiKey?: string;
    batchSize?: number;
    flushInterval?: number;
  } = {}) {
    this.endpoint = endpoint;
    this.level = options.level;
    this.apiKey = options.apiKey;
    this.batchSize = options.batchSize || 10;
    this.flushInterval = options.flushInterval || 5000;

    this.startFlushTimer();
  }

  log(entry: LogEntry): void {
    this.batch.push(entry);
    
    if (this.batch.length >= this.batchSize) {
      this.flush();
    }
  }

  async flush(): Promise<void> {
    if (this.batch.length === 0) return;

    const batch = [...this.batch];
    this.batch = [];

    try {
      const headers: Record<string, string> = {
        'Content-Type': 'application/json'
      };

      if (this.apiKey) {
        headers.Authorization = `Bearer ${this.apiKey}`;
      }

      const response = await fetch(this.endpoint, {
        method: 'POST',
        headers,
        body: JSON.stringify({ logs: batch })
      });

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }
    } catch (error) {
      console.error('Failed to send logs to remote endpoint:', error);
      // Put logs back in batch to retry later
      this.batch.unshift(...batch);
    }
  }

  async close(): Promise<void> {
    if (this.timer) {
      clearInterval(this.timer);
    }
    await this.flush();
  }

  private startFlushTimer(): void {
    this.timer = setInterval(() => {
      this.flush().catch(error => {
        console.error('Error during scheduled flush:', error);
      });
    }, this.flushInterval);
  }
}

/**
 * Global logger instance
 */
export const logger = new Logger({
  name: 'cf-auth',
  level: (process?.env?.LOG_LEVEL as LogLevel) || 'info'
});

/**
 * Create logger with configuration
 */
export function createLogger(config: LoggerConfig): Logger {
  return new Logger(config);
}

/**
 * Set global log context
 */
export function setLogContext(context: {
  requestId?: string;
  userId?: string;
  sessionId?: string;
}): void {
  if (typeof globalThis !== 'undefined') {
    (globalThis as any).logContext = context;
  }
}

/**
 * Clear global log context
 */
export function clearLogContext(): void {
  if (typeof globalThis !== 'undefined') {
    delete (globalThis as any).logContext;
  }
}

/**
 * Log function execution time
 */
export function logExecutionTime<T extends (...args: any[]) => any>(
  fn: T,
  name: string = fn.name || 'function',
  logLevel: LogLevel = 'debug'
): T {
  return ((...args: Parameters<T>): ReturnType<T> => {
    const start = performance.now();
    
    try {
      const result = fn(...args);
      
      // Handle async functions
      if (result && typeof result.then === 'function') {
        return result.then((value: any) => {
          const duration = performance.now() - start;
          logger[logLevel](`${name} completed`, { duration: `${duration.toFixed(2)}ms` });
          return value;
        }).catch((error: Error) => {
          const duration = performance.now() - start;
          logger.error(`${name} failed`, { duration: `${duration.toFixed(2)}ms` }, error);
          throw error;
        });
      }
      
      // Handle sync functions
      const duration = performance.now() - start;
      logger[logLevel](`${name} completed`, { duration: `${duration.toFixed(2)}ms` });
      return result;
    } catch (error) {
      const duration = performance.now() - start;
      logger.error(`${name} failed`, { duration: `${duration.toFixed(2)}ms` }, error as Error);
      throw error;
    }
  }) as T;
}

/**
 * Create performance middleware for HTTP requests
 */
export function createPerformanceMiddleware() {
  return (req: any, res: any, next: any) => {
    const start = performance.now();
    const timer = logger.time(`${req.method} ${req.url}`);

    res.on('finish', () => {
      const duration = performance.now() - start;
      logger.info('HTTP Request', {
        method: req.method,
        url: req.url,
        status: res.statusCode,
        duration: `${duration.toFixed(2)}ms`,
        userAgent: req.headers['user-agent'],
        ip: req.ip || req.connection.remoteAddress
      });
    });

    next();
  };
}

/**
 * Structured error logging
 */
export function logError(error: Error, context: Record<string, any> = {}): void {
  logger.error(error.message, {
    ...context,
    name: error.name,
    stack: error.stack,
    ...(error as any).context
  }, error);
}

/**
 * Log memory usage (Node.js only)
 */
export function logMemoryUsage(label: string = 'Memory Usage'): void {
  if (typeof process !== 'undefined' && process.memoryUsage) {
    const usage = process.memoryUsage();
    logger.info(label, {
      rss: `${(usage.rss / 1024 / 1024).toFixed(2)} MB`,
      heapTotal: `${(usage.heapTotal / 1024 / 1024).toFixed(2)} MB`,
      heapUsed: `${(usage.heapUsed / 1024 / 1024).toFixed(2)} MB`,
      external: `${(usage.external / 1024 / 1024).toFixed(2)} MB`
    });
  }
}
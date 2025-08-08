/**
 * CF-Auth Configuration Errors
 * 
 * @fileoverview Configuration-specific error classes with detailed error information
 * and recovery suggestions for the CF-Better-Auth configuration system.
 * 
 * @version 0.1.0
 * @license MIT
 */

import { CFAuthError, ErrorFactory } from '@cf-auth/utils';
import type { ConfigValidationError, ConfigSource, ConfigFormat } from './types';
import { VALIDATION_ERRORS, ERROR_MESSAGES } from './constants';

// =============================================================================
// Base Configuration Error
// =============================================================================

/**
 * Base configuration error class
 */
export class ConfigError extends CFAuthError {
  constructor(
    message: string,
    options: {
      code?: string;
      cause?: Error;
      context?: Record<string, unknown>;
      suggestions?: string[];
    } = {}
  ) {
    super(message, {
      code: options.code || 'CONFIG_ERROR',
      category: 'configuration',
      severity: 'error',
      cause: options.cause,
      context: options.context,
      suggestions: options.suggestions
    });
  }
}

// =============================================================================
// Configuration Loading Errors
// =============================================================================

/**
 * Configuration file not found error
 */
export class ConfigFileNotFoundError extends ConfigError {
  constructor(
    filePath: string,
    searchPaths?: string[],
    cause?: Error
  ) {
    super(ERROR_MESSAGES.CONFIG_NOT_FOUND, {
      code: 'CONFIG_FILE_NOT_FOUND',
      cause,
      context: {
        filePath,
        searchPaths: searchPaths || []
      },
      suggestions: [
        'Create a configuration file in one of the expected locations',
        'Specify the configuration file path explicitly',
        'Check file permissions and accessibility',
        'Verify the working directory is correct'
      ]
    });
  }
}

/**
 * Configuration parse error
 */
export class ConfigParseError extends ConfigError {
  constructor(
    filePath: string,
    format: ConfigFormat,
    cause?: Error,
    line?: number,
    column?: number
  ) {
    super(ERROR_MESSAGES.CONFIG_PARSE_FAILED, {
      code: 'CONFIG_PARSE_ERROR',
      cause,
      context: {
        filePath,
        format,
        line,
        column
      },
      suggestions: [
        `Verify the ${format.toUpperCase()} syntax is correct`,
        'Check for missing commas, brackets, or quotes',
        'Use a syntax validator or linter',
        'Ensure proper character encoding (UTF-8)'
      ]
    });
  }
}

/**
 * Configuration load error
 */
export class ConfigLoadError extends ConfigError {
  constructor(
    source: ConfigSource,
    identifier: string,
    cause?: Error
  ) {
    super(ERROR_MESSAGES.CONFIG_LOAD_FAILED, {
      code: 'CONFIG_LOAD_ERROR',
      cause,
      context: {
        source,
        identifier
      },
      suggestions: [
        'Check source availability and permissions',
        'Verify connection settings for remote sources',
        'Ensure required authentication credentials are provided',
        'Check network connectivity for remote sources'
      ]
    });
  }
}

/**
 * Remote configuration error
 */
export class RemoteConfigError extends ConfigError {
  constructor(
    url: string,
    statusCode?: number,
    cause?: Error
  ) {
    super('Failed to load remote configuration', {
      code: 'REMOTE_CONFIG_ERROR',
      cause,
      context: {
        url,
        statusCode
      },
      suggestions: [
        'Verify the remote URL is accessible',
        'Check authentication credentials',
        'Ensure the remote service is running',
        'Check network connectivity and firewall settings'
      ]
    });
  }
}

// =============================================================================
// Configuration Validation Errors
// =============================================================================

/**
 * Configuration validation error
 */
export class ConfigValidationError extends ConfigError {
  public readonly validationErrors: ConfigValidationError[];

  constructor(
    validationErrors: ConfigValidationError[],
    context?: Record<string, unknown>
  ) {
    const errorCount = validationErrors.length;
    const message = `Configuration validation failed with ${errorCount} error${errorCount === 1 ? '' : 's'}`;

    super(message, {
      code: 'CONFIG_VALIDATION_ERROR',
      context: {
        errorCount,
        errors: validationErrors,
        ...context
      },
      suggestions: [
        'Review the validation errors and fix the configuration',
        'Check the configuration schema documentation',
        'Use configuration validation tools or IDE plugins',
        'Verify all required properties are provided'
      ]
    });

    this.validationErrors = validationErrors;
  }

  /**
   * Get validation errors for a specific path
   */
  getErrorsForPath(path: (string | number)[]): ConfigValidationError[] {
    return this.validationErrors.filter(error => 
      error.path.length === path.length &&
      error.path.every((segment, index) => segment === path[index])
    );
  }

  /**
   * Get all error messages
   */
  getAllMessages(): string[] {
    return this.validationErrors.map(error => error.message);
  }

  /**
   * Format validation errors for display
   */
  formatErrors(): string {
    return this.validationErrors
      .map(error => {
        const path = error.path.length > 0 ? error.path.join('.') : 'root';
        return `  ${path}: ${error.message}`;
      })
      .join('\n');
  }
}

/**
 * Schema validation error
 */
export class SchemaValidationError extends ConfigError {
  constructor(
    schemaPath: string,
    dataPath: (string | number)[],
    expectedType: string,
    actualValue: unknown,
    cause?: Error
  ) {
    const pathString = dataPath.length > 0 ? dataPath.join('.') : 'root';
    const message = `Schema validation failed at ${pathString}: expected ${expectedType}`;

    super(message, {
      code: 'SCHEMA_VALIDATION_ERROR',
      cause,
      context: {
        schemaPath,
        dataPath,
        expectedType,
        actualValue,
        actualType: typeof actualValue
      },
      suggestions: [
        `Ensure the value at ${pathString} is of type ${expectedType}`,
        'Check the schema definition for required format',
        'Use proper data types in your configuration',
        'Refer to the configuration documentation for examples'
      ]
    });
  }
}

// =============================================================================
// Environment and Variable Errors
// =============================================================================

/**
 * Missing environment variable error
 */
export class MissingEnvironmentVariableError extends ConfigError {
  constructor(
    variableName: string,
    context?: Record<string, unknown>
  ) {
    super(`Required environment variable '${variableName}' is missing`, {
      code: 'MISSING_ENV_VAR',
      context: {
        variableName,
        ...context
      },
      suggestions: [
        `Set the ${variableName} environment variable`,
        'Check your .env file contains all required variables',
        'Verify environment variable names are correct',
        'Ensure the environment is properly loaded'
      ]
    });
  }
}

/**
 * Invalid environment variable error
 */
export class InvalidEnvironmentVariableError extends ConfigError {
  constructor(
    variableName: string,
    value: string,
    expectedType: string,
    cause?: Error
  ) {
    super(`Environment variable '${variableName}' has invalid value`, {
      code: 'INVALID_ENV_VAR',
      cause,
      context: {
        variableName,
        value,
        expectedType
      },
      suggestions: [
        `Ensure ${variableName} is set to a valid ${expectedType}`,
        'Check the format requirements for this variable',
        'Verify there are no extra spaces or characters',
        'Use proper data type conversion if needed'
      ]
    });
  }
}

/**
 * Variable interpolation error
 */
export class InterpolationError extends ConfigError {
  constructor(
    variable: string,
    configPath: (string | number)[],
    cause?: Error
  ) {
    const pathString = configPath.length > 0 ? configPath.join('.') : 'root';
    super(`Variable interpolation failed for '${variable}' at ${pathString}`, {
      code: 'INTERPOLATION_ERROR',
      cause,
      context: {
        variable,
        configPath,
        pathString
      },
      suggestions: [
        `Ensure the variable '${variable}' is defined in the environment`,
        'Check the variable name spelling and format',
        'Verify the interpolation syntax is correct (${variable})',
        'Use default values for optional variables'
      ]
    });
  }
}

// =============================================================================
// Security Errors
// =============================================================================

/**
 * Weak secret error
 */
export class WeakSecretError extends ConfigError {
  constructor(
    secretName: string,
    length: number,
    minLength: number
  ) {
    super(`Secret '${secretName}' is too weak`, {
      code: 'WEAK_SECRET',
      context: {
        secretName,
        length,
        minLength,
        strengthCheck: {
          lengthOk: length >= minLength,
          hasLetters: /[a-zA-Z]/.test(secretName),
          hasNumbers: /\d/.test(secretName),
          hasSpecialChars: /[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]/.test(secretName)
        }
      },
      suggestions: [
        `Use at least ${minLength} characters for the secret`,
        'Include a mix of letters, numbers, and special characters',
        'Use a secure random generator for secrets',
        'Avoid common words or patterns'
      ]
    });
  }
}

/**
 * Insecure configuration error
 */
export class InsecureConfigurationError extends ConfigError {
  constructor(
    securityIssues: string[],
    context?: Record<string, unknown>
  ) {
    super('Configuration contains security issues', {
      code: 'INSECURE_CONFIGURATION',
      context: {
        securityIssues,
        issueCount: securityIssues.length,
        ...context
      },
      suggestions: [
        'Review and fix all security issues',
        'Use environment variables for sensitive values',
        'Enable encryption for sensitive configuration',
        'Follow security best practices for configuration'
      ]
    });
  }
}

// =============================================================================
// File System Errors
// =============================================================================

/**
 * File permission error
 */
export class FilePermissionError extends ConfigError {
  constructor(
    filePath: string,
    operation: 'read' | 'write' | 'execute',
    cause?: Error
  ) {
    super(`Insufficient permissions to ${operation} configuration file`, {
      code: 'FILE_PERMISSION_ERROR',
      cause,
      context: {
        filePath,
        operation
      },
      suggestions: [
        'Check file permissions and ownership',
        'Run with appropriate user privileges',
        'Ensure the file is not locked by another process',
        'Verify the parent directory permissions'
      ]
    });
  }
}

/**
 * File system error
 */
export class FileSystemError extends ConfigError {
  constructor(
    filePath: string,
    operation: string,
    cause?: Error
  ) {
    super(`File system error during ${operation}`, {
      code: 'FILE_SYSTEM_ERROR',
      cause,
      context: {
        filePath,
        operation
      },
      suggestions: [
        'Check if the file path exists and is accessible',
        'Verify there is sufficient disk space',
        'Ensure the file is not corrupted',
        'Check for file system mounting issues'
      ]
    });
  }
}

// =============================================================================
// Watch and Hot-Reload Errors
// =============================================================================

/**
 * Configuration watch error
 */
export class ConfigWatchError extends ConfigError {
  constructor(
    filePath: string,
    cause?: Error
  ) {
    super('Failed to watch configuration file for changes', {
      code: 'CONFIG_WATCH_ERROR',
      cause,
      context: {
        filePath
      },
      suggestions: [
        'Check if the file exists and is readable',
        'Verify file system supports file watching',
        'Ensure there are no permission issues',
        'Try reducing the number of watched files'
      ]
    });
  }
}

/**
 * Hot reload error
 */
export class HotReloadError extends ConfigError {
  constructor(
    reason: string,
    context?: Record<string, unknown>,
    cause?: Error
  ) {
    super(`Hot reload failed: ${reason}`, {
      code: 'HOT_RELOAD_ERROR',
      cause,
      context,
      suggestions: [
        'Check the new configuration is valid',
        'Ensure the configuration can be safely reloaded',
        'Review the hot reload logs for more details',
        'Restart the application if hot reload continues to fail'
      ]
    });
  }
}

// =============================================================================
// Network and Remote Errors
// =============================================================================

/**
 * Network timeout error
 */
export class NetworkTimeoutError extends ConfigError {
  constructor(
    operation: string,
    timeout: number,
    cause?: Error
  ) {
    super(`Network timeout during ${operation}`, {
      code: 'NETWORK_TIMEOUT',
      cause,
      context: {
        operation,
        timeout
      },
      suggestions: [
        'Check network connectivity',
        'Increase the timeout value if needed',
        'Verify the remote service is responding',
        'Check for network proxy or firewall issues'
      ]
    });
  }
}

/**
 * Authentication error for remote configuration
 */
export class RemoteAuthenticationError extends ConfigError {
  constructor(
    service: string,
    cause?: Error
  ) {
    super(`Authentication failed for ${service}`, {
      code: 'REMOTE_AUTH_ERROR',
      cause,
      context: {
        service
      },
      suggestions: [
        'Check authentication credentials are correct',
        'Verify API keys or tokens are not expired',
        'Ensure proper permissions are granted',
        'Check service-specific authentication requirements'
      ]
    });
  }
}

// =============================================================================
// Error Factory
// =============================================================================

/**
 * Configuration error factory
 */
export const ConfigErrorFactory = {
  /**
   * Create a configuration file not found error
   */
  fileNotFound: (filePath: string, searchPaths?: string[], cause?: Error) =>
    new ConfigFileNotFoundError(filePath, searchPaths, cause),

  /**
   * Create a configuration parse error
   */
  parseError: (filePath: string, format: ConfigFormat, cause?: Error, line?: number, column?: number) =>
    new ConfigParseError(filePath, format, cause, line, column),

  /**
   * Create a configuration load error
   */
  loadError: (source: ConfigSource, identifier: string, cause?: Error) =>
    new ConfigLoadError(source, identifier, cause),

  /**
   * Create a validation error
   */
  validationError: (errors: ConfigValidationError[], context?: Record<string, unknown>) =>
    new ConfigValidationError(errors, context),

  /**
   * Create a missing environment variable error
   */
  missingEnvVar: (variableName: string, context?: Record<string, unknown>) =>
    new MissingEnvironmentVariableError(variableName, context),

  /**
   * Create an invalid environment variable error
   */
  invalidEnvVar: (variableName: string, value: string, expectedType: string, cause?: Error) =>
    new InvalidEnvironmentVariableError(variableName, value, expectedType, cause),

  /**
   * Create an interpolation error
   */
  interpolationError: (variable: string, configPath: (string | number)[], cause?: Error) =>
    new InterpolationError(variable, configPath, cause),

  /**
   * Create a weak secret error
   */
  weakSecret: (secretName: string, length: number, minLength: number) =>
    new WeakSecretError(secretName, length, minLength),

  /**
   * Create a file permission error
   */
  filePermission: (filePath: string, operation: 'read' | 'write' | 'execute', cause?: Error) =>
    new FilePermissionError(filePath, operation, cause),

  /**
   * Create a remote configuration error
   */
  remoteConfig: (url: string, statusCode?: number, cause?: Error) =>
    new RemoteConfigError(url, statusCode, cause),

  /**
   * Create a network timeout error
   */
  networkTimeout: (operation: string, timeout: number, cause?: Error) =>
    new NetworkTimeoutError(operation, timeout, cause),

  /**
   * Create a configuration watch error
   */
  watchError: (filePath: string, cause?: Error) =>
    new ConfigWatchError(filePath, cause),

  /**
   * Create a hot reload error
   */
  hotReloadError: (reason: string, context?: Record<string, unknown>, cause?: Error) =>
    new HotReloadError(reason, context, cause),

  /**
   * Create a generic configuration error
   */
  generic: (message: string, code?: string, context?: Record<string, unknown>, cause?: Error) =>
    new ConfigError(message, { code, context, cause })
} as const;

// =============================================================================
// Type Guards
// =============================================================================

/**
 * Check if error is a configuration error
 */
export function isConfigError(error: unknown): error is ConfigError {
  return error instanceof ConfigError;
}

/**
 * Check if error is a configuration validation error
 */
export function isConfigValidationError(error: unknown): error is ConfigValidationError {
  return error instanceof ConfigValidationError;
}

/**
 * Check if error is a file not found error
 */
export function isConfigFileNotFoundError(error: unknown): error is ConfigFileNotFoundError {
  return error instanceof ConfigFileNotFoundError;
}

/**
 * Check if error is a parse error
 */
export function isConfigParseError(error: unknown): error is ConfigParseError {
  return error instanceof ConfigParseError;
}

/**
 * Check if error is a missing environment variable error
 */
export function isMissingEnvironmentVariableError(error: unknown): error is MissingEnvironmentVariableError {
  return error instanceof MissingEnvironmentVariableError;
}

/**
 * Check if error is a security-related error
 */
export function isSecurityError(error: unknown): error is WeakSecretError | InsecureConfigurationError {
  return error instanceof WeakSecretError || error instanceof InsecureConfigurationError;
}

// =============================================================================
// Error Utilities
// =============================================================================

/**
 * Extract error context for logging
 */
export function extractErrorContext(error: ConfigError): Record<string, unknown> {
  return {
    code: error.code,
    category: error.category,
    severity: error.severity,
    context: error.context,
    suggestions: error.suggestions,
    stack: error.stack
  };
}

/**
 * Format error for user display
 */
export function formatConfigError(error: ConfigError): string {
  let message = `${error.name}: ${error.message}`;
  
  if (error.context && Object.keys(error.context).length > 0) {
    message += '\n\nContext:';
    for (const [key, value] of Object.entries(error.context)) {
      message += `\n  ${key}: ${JSON.stringify(value)}`;
    }
  }
  
  if (error.suggestions && error.suggestions.length > 0) {
    message += '\n\nSuggestions:';
    for (const suggestion of error.suggestions) {
      message += `\n  • ${suggestion}`;
    }
  }
  
  return message;
}

/**
 * Create error from validation result
 */
export function createValidationError(
  errors: ConfigValidationError[],
  context?: Record<string, unknown>
): ConfigValidationError {
  return new ConfigValidationError(errors, context);
}

// Export error codes for external use
export { VALIDATION_ERRORS } from './constants';
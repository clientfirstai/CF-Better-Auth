/**
 * Plugin error classes for CF-Better-Auth
 */

import { PLUGIN_ERROR_CODES } from './constants';

/**
 * Base plugin error class
 */
export class PluginError extends Error {
  public readonly code: string;
  public readonly pluginId?: string;
  public readonly details?: Record<string, any>;

  constructor(
    message: string,
    code: string = PLUGIN_ERROR_CODES.PLUGIN_REGISTRY_ERROR,
    pluginId?: string,
    details?: Record<string, any>
  ) {
    super(message);
    this.name = 'PluginError';
    this.code = code;
    this.pluginId = pluginId;
    this.details = details;

    // Maintain proper stack trace for where our error was thrown (only available on V8)
    if (Error.captureStackTrace) {
      Error.captureStackTrace(this, PluginError);
    }
  }

  /**
   * Convert error to JSON format
   */
  toJSON(): Record<string, any> {
    return {
      name: this.name,
      message: this.message,
      code: this.code,
      pluginId: this.pluginId,
      details: this.details,
      stack: this.stack,
    };
  }
}

/**
 * Invalid plugin error
 */
export class InvalidPluginError extends PluginError {
  constructor(message: string, pluginId?: string, details?: Record<string, any>) {
    super(message, PLUGIN_ERROR_CODES.INVALID_PLUGIN, pluginId, details);
    this.name = 'InvalidPluginError';
  }
}

/**
 * Plugin not found error
 */
export class PluginNotFoundError extends PluginError {
  constructor(pluginId: string, details?: Record<string, any>) {
    super(`Plugin '${pluginId}' not found`, PLUGIN_ERROR_CODES.PLUGIN_NOT_FOUND, pluginId, details);
    this.name = 'PluginNotFoundError';
  }
}

/**
 * Plugin already registered error
 */
export class PluginAlreadyRegisteredError extends PluginError {
  constructor(pluginId: string, details?: Record<string, any>) {
    super(`Plugin '${pluginId}' is already registered`, PLUGIN_ERROR_CODES.PLUGIN_ALREADY_REGISTERED, pluginId, details);
    this.name = 'PluginAlreadyRegisteredError';
  }
}

/**
 * Plugin dependency not found error
 */
export class PluginDependencyNotFoundError extends PluginError {
  public readonly dependencyId: string;

  constructor(pluginId: string, dependencyId: string, details?: Record<string, any>) {
    super(
      `Plugin '${pluginId}' requires dependency '${dependencyId}' which was not found`,
      PLUGIN_ERROR_CODES.PLUGIN_DEPENDENCY_NOT_FOUND,
      pluginId,
      { ...details, dependencyId }
    );
    this.name = 'PluginDependencyNotFoundError';
    this.dependencyId = dependencyId;
  }
}

/**
 * Plugin circular dependency error
 */
export class PluginCircularDependencyError extends PluginError {
  public readonly dependencyChain: string[];

  constructor(dependencyChain: string[], details?: Record<string, any>) {
    super(
      `Circular dependency detected: ${dependencyChain.join(' -> ')}`,
      PLUGIN_ERROR_CODES.PLUGIN_CIRCULAR_DEPENDENCY,
      dependencyChain[0],
      { ...details, dependencyChain }
    );
    this.name = 'PluginCircularDependencyError';
    this.dependencyChain = dependencyChain;
  }
}

/**
 * Plugin incompatible version error
 */
export class PluginIncompatibleVersionError extends PluginError {
  public readonly requiredVersion: string;
  public readonly actualVersion: string;

  constructor(
    pluginId: string,
    requiredVersion: string,
    actualVersion: string,
    details?: Record<string, any>
  ) {
    super(
      `Plugin '${pluginId}' requires version '${requiredVersion}' but got '${actualVersion}'`,
      PLUGIN_ERROR_CODES.PLUGIN_INCOMPATIBLE_VERSION,
      pluginId,
      { ...details, requiredVersion, actualVersion }
    );
    this.name = 'PluginIncompatibleVersionError';
    this.requiredVersion = requiredVersion;
    this.actualVersion = actualVersion;
  }
}

/**
 * Plugin load error
 */
export class PluginLoadError extends PluginError {
  public readonly source: string;

  constructor(message: string, source: string, pluginId?: string, details?: Record<string, any>) {
    super(message, PLUGIN_ERROR_CODES.PLUGIN_LOAD_ERROR, pluginId, { ...details, source });
    this.name = 'PluginLoadError';
    this.source = source;
  }
}

/**
 * Plugin initialization error
 */
export class PluginInitError extends PluginError {
  constructor(message: string, pluginId: string, details?: Record<string, any>) {
    super(message, PLUGIN_ERROR_CODES.PLUGIN_INIT_ERROR, pluginId, details);
    this.name = 'PluginInitError';
  }
}

/**
 * Plugin configuration error
 */
export class PluginConfigError extends PluginError {
  public readonly configPath?: string;
  public readonly validationErrors?: any[];

  constructor(
    message: string,
    pluginId: string,
    configPath?: string,
    validationErrors?: any[],
    details?: Record<string, any>
  ) {
    super(message, PLUGIN_ERROR_CODES.PLUGIN_CONFIG_ERROR, pluginId, {
      ...details,
      configPath,
      validationErrors,
    });
    this.name = 'PluginConfigError';
    this.configPath = configPath;
    this.validationErrors = validationErrors;
  }
}

/**
 * Plugin hook error
 */
export class PluginHookError extends PluginError {
  public readonly hookName: string;

  constructor(message: string, hookName: string, pluginId: string, details?: Record<string, any>) {
    super(message, PLUGIN_ERROR_CODES.PLUGIN_HOOK_ERROR, pluginId, { ...details, hookName });
    this.name = 'PluginHookError';
    this.hookName = hookName;
  }
}

/**
 * Plugin sandbox error
 */
export class PluginSandboxError extends PluginError {
  public readonly sandboxId?: string;

  constructor(message: string, pluginId: string, sandboxId?: string, details?: Record<string, any>) {
    super(message, PLUGIN_ERROR_CODES.PLUGIN_SANDBOX_ERROR, pluginId, { ...details, sandboxId });
    this.name = 'PluginSandboxError';
    this.sandboxId = sandboxId;
  }
}

/**
 * Plugin security error
 */
export class PluginSecurityError extends PluginError {
  public readonly securityIssue: string;

  constructor(message: string, securityIssue: string, pluginId: string, details?: Record<string, any>) {
    super(message, PLUGIN_ERROR_CODES.PLUGIN_SECURITY_ERROR, pluginId, { ...details, securityIssue });
    this.name = 'PluginSecurityError';
    this.securityIssue = securityIssue;
  }
}

/**
 * Plugin registry error
 */
export class PluginRegistryError extends PluginError {
  public readonly operation: string;

  constructor(message: string, operation: string, pluginId?: string, details?: Record<string, any>) {
    super(message, PLUGIN_ERROR_CODES.PLUGIN_REGISTRY_ERROR, pluginId, { ...details, operation });
    this.name = 'PluginRegistryError';
    this.operation = operation;
  }
}

/**
 * Helper function to create plugin error from unknown error
 */
export function createPluginError(
  error: unknown,
  pluginId?: string,
  operation?: string
): PluginError {
  if (error instanceof PluginError) {
    return error;
  }

  if (error instanceof Error) {
    return new PluginError(
      error.message,
      PLUGIN_ERROR_CODES.PLUGIN_REGISTRY_ERROR,
      pluginId,
      {
        originalError: error.name,
        operation,
        stack: error.stack,
      }
    );
  }

  return new PluginError(
    String(error),
    PLUGIN_ERROR_CODES.PLUGIN_REGISTRY_ERROR,
    pluginId,
    { originalError: error, operation }
  );
}

/**
 * Helper function to check if error is a plugin error
 */
export function isPluginError(error: unknown): error is PluginError {
  return error instanceof PluginError;
}

/**
 * Helper function to format plugin error for logging
 */
export function formatPluginError(error: PluginError): string {
  const parts = [`[${error.code}]`];
  
  if (error.pluginId) {
    parts.push(`Plugin: ${error.pluginId}`);
  }
  
  parts.push(error.message);
  
  if (error.details) {
    parts.push(`Details: ${JSON.stringify(error.details)}`);
  }
  
  return parts.join(' | ');
}

/**
 * Error handler for plugin operations
 */
export class PluginErrorHandler {
  private static instance: PluginErrorHandler;
  private errorHandlers: Map<string, (error: PluginError) => void> = new Map();
  private globalErrorHandler?: (error: PluginError) => void;

  /**
   * Get singleton instance
   */
  static getInstance(): PluginErrorHandler {
    if (!PluginErrorHandler.instance) {
      PluginErrorHandler.instance = new PluginErrorHandler();
    }
    return PluginErrorHandler.instance;
  }

  /**
   * Register error handler for specific plugin
   */
  registerHandler(pluginId: string, handler: (error: PluginError) => void): void {
    this.errorHandlers.set(pluginId, handler);
  }

  /**
   * Register global error handler
   */
  registerGlobalHandler(handler: (error: PluginError) => void): void {
    this.globalErrorHandler = handler;
  }

  /**
   * Handle plugin error
   */
  handleError(error: PluginError): void {
    // Try plugin-specific handler first
    if (error.pluginId) {
      const handler = this.errorHandlers.get(error.pluginId);
      if (handler) {
        try {
          handler(error);
          return;
        } catch (handlerError) {
          console.error('Error in plugin error handler:', handlerError);
        }
      }
    }

    // Fall back to global handler
    if (this.globalErrorHandler) {
      try {
        this.globalErrorHandler(error);
        return;
      } catch (handlerError) {
        console.error('Error in global plugin error handler:', handlerError);
      }
    }

    // Default handling: log to console
    console.error('Plugin Error:', formatPluginError(error));
    if (error.stack) {
      console.error('Stack trace:', error.stack);
    }
  }

  /**
   * Remove error handler
   */
  removeHandler(pluginId: string): void {
    this.errorHandlers.delete(pluginId);
  }

  /**
   * Remove global error handler
   */
  removeGlobalHandler(): void {
    this.globalErrorHandler = undefined;
  }

  /**
   * Clear all error handlers
   */
  clearHandlers(): void {
    this.errorHandlers.clear();
    this.globalErrorHandler = undefined;
  }
}
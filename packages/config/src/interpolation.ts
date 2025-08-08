/**
 * CF-Auth Configuration Interpolation
 * 
 * @fileoverview Variable interpolation system for configuration values,
 * supporting environment variables, nested references, and custom resolvers.
 * 
 * @version 0.1.0
 * @license MIT
 */

import type { ConfigObject } from '@cf-auth/types';
import { isString, isObject } from '@cf-auth/utils';

import type { 
  InterpolationOptions,
  InterpolationContext,
  VariableResolver
} from './types';
import { 
  DEFAULT_INTERPOLATION_OPTIONS,
  REGEX_PATTERNS
} from './constants';
import { ConfigErrorFactory } from './errors';

// =============================================================================
// Configuration Interpolation Engine
// =============================================================================

/**
 * Configuration interpolation engine
 */
export class ConfigInterpolator {
  private readonly options: Required<InterpolationOptions>;
  private readonly resolvers: Map<string, VariableResolver>;
  private readonly context: InterpolationContext;

  constructor(
    options: InterpolationOptions = {},
    context?: Partial<InterpolationContext>
  ) {
    this.options = {
      ...DEFAULT_INTERPOLATION_OPTIONS,
      ...options,
      resolvers: {
        ...DEFAULT_INTERPOLATION_OPTIONS.resolvers,
        ...options.resolvers
      }
    };

    this.resolvers = new Map();
    this.setupBuiltInResolvers();
    
    // Add custom resolvers
    for (const [name, resolver] of Object.entries(this.options.resolvers)) {
      this.resolvers.set(name, resolver);
    }

    this.context = {
      config: {},
      env: process.env,
      cwd: process.cwd(),
      context: {},
      ...context
    };
  }

  /**
   * Interpolate variables in a configuration object
   */
  async interpolate<T extends ConfigObject>(config: T): Promise<T> {
    if (!this.options.enabled) {
      return config;
    }

    // Update context with current config
    this.context.config = config;

    // Create a deep copy to avoid mutating the original
    const result = JSON.parse(JSON.stringify(config)) as T;
    
    // Track visited paths to prevent circular references
    const visited = new Set<string>();
    
    await this.interpolateValue(result, [], visited);
    
    return result;
  }

  /**
   * Interpolate a single value
   */
  async interpolateValue(
    value: any,
    path: (string | number)[] = [],
    visited: Set<string> = new Set()
  ): Promise<any> {
    const pathString = path.join('.');
    
    // Prevent circular references
    if (visited.has(pathString)) {
      throw ConfigErrorFactory.interpolationError(
        `Circular reference detected`,
        path
      );
    }

    if (isString(value)) {
      return await this.interpolateString(value, path, visited);
    }

    if (isObject(value) && !Array.isArray(value)) {
      visited.add(pathString);
      
      for (const [key, val] of Object.entries(value)) {
        value[key] = await this.interpolateValue(val, [...path, key], visited);
      }
      
      visited.delete(pathString);
      return value;
    }

    if (Array.isArray(value)) {
      visited.add(pathString);
      
      for (let i = 0; i < value.length; i++) {
        value[i] = await this.interpolateValue(value[i], [...path, i], visited);
      }
      
      visited.delete(pathString);
      return value;
    }

    return value;
  }

  /**
   * Interpolate variables in a string
   */
  async interpolateString(
    str: string,
    path: (string | number)[] = [],
    visited: Set<string> = new Set()
  ): Promise<string> {
    const regex = new RegExp(
      `\\${this.options.prefix}([^${this.options.suffix}]+)\\${this.options.suffix}`,
      'g'
    );

    let result = str;
    let match: RegExpExecArray | null;
    
    while ((match = regex.exec(str)) !== null) {
      const [fullMatch, variable] = match;
      
      try {
        const resolvedValue = await this.resolveVariable(variable.trim(), path);
        result = result.replace(fullMatch, String(resolvedValue));
      } catch (error) {
        if (!this.options.allowUndefined) {
          throw error;
        }
        // Keep original placeholder if undefined is allowed
        result = result.replace(fullMatch, fullMatch);
      }
    }

    return result;
  }

  /**
   * Resolve a variable reference
   */
  async resolveVariable(
    variable: string,
    path: (string | number)[] = []
  ): Promise<string> {
    // Parse variable expression (supports resolver:variable format)
    const [resolverName, variableName] = this.parseVariableExpression(variable);

    // Use specific resolver if specified
    if (resolverName && this.resolvers.has(resolverName)) {
      const resolver = this.resolvers.get(resolverName)!;
      return await resolver(variableName || variable, this.context);
    }

    // Try built-in resolvers in order
    const builtInResolvers = ['env', 'config', 'default'];
    
    for (const resolverName of builtInResolvers) {
      const resolver = this.resolvers.get(resolverName);
      if (resolver) {
        try {
          return await resolver(variable, this.context);
        } catch {
          // Continue to next resolver
          continue;
        }
      }
    }

    // Check defaults
    if (this.options.defaults && variable in this.options.defaults) {
      return this.options.defaults[variable];
    }

    throw ConfigErrorFactory.interpolationError(variable, path);
  }

  /**
   * Parse variable expression to extract resolver and variable name
   */
  private parseVariableExpression(variable: string): [string | null, string | null] {
    const colonIndex = variable.indexOf(':');
    
    if (colonIndex === -1) {
      return [null, null];
    }
    
    const resolverName = variable.substring(0, colonIndex).trim();
    const variableName = variable.substring(colonIndex + 1).trim();
    
    return [resolverName, variableName];
  }

  /**
   * Setup built-in variable resolvers
   */
  private setupBuiltInResolvers(): void {
    // Environment variable resolver
    this.resolvers.set('env', (variable: string) => {
      const value = this.context.env[variable];
      if (value === undefined) {
        throw new Error(`Environment variable '${variable}' is not defined`);
      }
      return value;
    });

    // Configuration reference resolver
    this.resolvers.set('config', (variable: string) => {
      const value = this.getNestedValue(this.context.config, variable);
      if (value === undefined) {
        throw new Error(`Configuration value '${variable}' is not defined`);
      }
      return String(value);
    });

    // Context resolver
    this.resolvers.set('context', (variable: string) => {
      const value = this.getNestedValue(this.context.context || {}, variable);
      if (value === undefined) {
        throw new Error(`Context value '${variable}' is not defined`);
      }
      return String(value);
    });

    // Default resolver (tries env first, then config)
    this.resolvers.set('default', (variable: string) => {
      // Try environment first
      let value = this.context.env[variable];
      if (value !== undefined) {
        return value;
      }

      // Try configuration
      value = this.getNestedValue(this.context.config, variable);
      if (value !== undefined) {
        return String(value);
      }

      throw new Error(`Variable '${variable}' is not defined`);
    });

    // File system resolver
    this.resolvers.set('fs', (variable: string) => {
      const fs = require('node:fs');
      const path = require('node:path');
      
      const filePath = path.resolve(this.context.cwd, variable);
      
      try {
        return fs.readFileSync(filePath, 'utf8').trim();
      } catch (error) {
        throw new Error(`Failed to read file '${filePath}': ${error.message}`);
      }
    });

    // Date/time resolver
    this.resolvers.set('date', (variable: string) => {
      const now = new Date();
      
      switch (variable.toLowerCase()) {
        case 'now':
        case 'timestamp':
          return now.toISOString();
        case 'date':
          return now.toISOString().split('T')[0];
        case 'time':
          return now.toISOString().split('T')[1].split('.')[0];
        case 'unix':
          return String(Math.floor(now.getTime() / 1000));
        case 'millis':
          return String(now.getTime());
        default:
          // Try to parse as date format
          try {
            return now.toLocaleDateString('en-US', { 
              year: 'numeric',
              month: '2-digit', 
              day: '2-digit'
            });
          } catch {
            throw new Error(`Unknown date format '${variable}'`);
          }
      }
    });

    // Math resolver for simple calculations
    this.resolvers.set('math', (variable: string) => {
      try {
        // Simple math operations (be careful with eval in production)
        const sanitized = variable.replace(/[^0-9+\-*/.() ]/g, '');
        if (sanitized !== variable) {
          throw new Error('Invalid characters in math expression');
        }
        
        // eslint-disable-next-line no-eval
        const result = eval(sanitized);
        return String(result);
      } catch (error) {
        throw new Error(`Math evaluation failed: ${error.message}`);
      }
    });

    // Random value resolver
    this.resolvers.set('random', (variable: string) => {
      switch (variable.toLowerCase()) {
        case 'uuid':
          return require('crypto').randomUUID();
        case 'string':
          return require('crypto').randomBytes(16).toString('hex');
        case 'number':
          return String(Math.random());
        case 'int':
          return String(Math.floor(Math.random() * 1000000));
        default:
          throw new Error(`Unknown random type '${variable}'`);
      }
    });
  }

  /**
   * Get nested value from object using dot notation
   */
  private getNestedValue(obj: any, path: string): any {
    const parts = path.split('.');
    let current = obj;
    
    for (const part of parts) {
      if (!isObject(current) || !(part in current)) {
        return undefined;
      }
      current = current[part];
    }
    
    return current;
  }

  /**
   * Add custom resolver
   */
  addResolver(name: string, resolver: VariableResolver): void {
    this.resolvers.set(name, resolver);
  }

  /**
   * Remove resolver
   */
  removeResolver(name: string): boolean {
    return this.resolvers.delete(name);
  }

  /**
   * Check if resolver exists
   */
  hasResolver(name: string): boolean {
    return this.resolvers.has(name);
  }

  /**
   * Get list of available resolvers
   */
  getResolvers(): string[] {
    return Array.from(this.resolvers.keys());
  }
}

// =============================================================================
// Utility Functions
// =============================================================================

/**
 * Create a new interpolator instance
 */
export function createInterpolator(
  options: InterpolationOptions = {},
  context?: Partial<InterpolationContext>
): ConfigInterpolator {
  return new ConfigInterpolator(options, context);
}

/**
 * Interpolate configuration with default options
 */
export async function interpolateConfig<T extends ConfigObject>(
  config: T,
  options: InterpolationOptions = {},
  context?: Partial<InterpolationContext>
): Promise<T> {
  const interpolator = createInterpolator(options, context);
  return await interpolator.interpolate(config);
}

/**
 * Check if a string contains interpolation variables
 */
export function hasInterpolationVariables(
  str: string,
  options: Pick<InterpolationOptions, 'prefix' | 'suffix'> = {}
): boolean {
  const { prefix = '${', suffix = '}' } = options;
  const regex = new RegExp(`\\${prefix}[^${suffix}]+\\${suffix}`);
  return regex.test(str);
}

/**
 * Extract interpolation variables from a string
 */
export function extractInterpolationVariables(
  str: string,
  options: Pick<InterpolationOptions, 'prefix' | 'suffix'> = {}
): string[] {
  const { prefix = '${', suffix = '}' } = options;
  const regex = new RegExp(`\\${prefix}([^${suffix}]+)\\${suffix}`, 'g');
  const variables: string[] = [];
  let match: RegExpExecArray | null;
  
  while ((match = regex.exec(str)) !== null) {
    variables.push(match[1].trim());
  }
  
  return variables;
}

/**
 * Validate interpolation syntax in configuration
 */
export function validateInterpolationSyntax(
  config: ConfigObject,
  options: Pick<InterpolationOptions, 'prefix' | 'suffix'> = {}
): {
  valid: boolean;
  errors: Array<{
    path: string[];
    variable: string;
    error: string;
  }>;
} {
  const { prefix = '${', suffix = '}' } = options;
  const errors: Array<{
    path: string[];
    variable: string;
    error: string;
  }> = [];

  function validateValue(value: any, path: string[] = []): void {
    if (isString(value)) {
      const variables = extractInterpolationVariables(value, { prefix, suffix });
      
      for (const variable of variables) {
        // Check for empty variables
        if (!variable.trim()) {
          errors.push({
            path,
            variable,
            error: 'Empty variable reference'
          });
        }
        
        // Check for invalid characters
        if (!/^[a-zA-Z_][a-zA-Z0-9_.:]*$/.test(variable.trim())) {
          errors.push({
            path,
            variable,
            error: 'Invalid variable name format'
          });
        }
      }
    } else if (isObject(value) && !Array.isArray(value)) {
      for (const [key, val] of Object.entries(value)) {
        validateValue(val, [...path, key]);
      }
    } else if (Array.isArray(value)) {
      for (let i = 0; i < value.length; i++) {
        validateValue(value[i], [...path, String(i)]);
      }
    }
  }

  validateValue(config);

  return {
    valid: errors.length === 0,
    errors
  };
}

/**
 * Preview interpolation results without applying them
 */
export async function previewInterpolation<T extends ConfigObject>(
  config: T,
  options: InterpolationOptions = {},
  context?: Partial<InterpolationContext>
): Promise<{
  interpolated: T;
  variables: Array<{
    path: string[];
    variable: string;
    resolved: string;
    error?: string;
  }>;
}> {
  const interpolator = createInterpolator(options, context);
  const variables: Array<{
    path: string[];
    variable: string;
    resolved: string;
    error?: string;
  }> = [];

  // Create a modified interpolator that tracks resolution
  const originalResolveVariable = interpolator.resolveVariable.bind(interpolator);
  interpolator.resolveVariable = async function(variable: string, path: string[] = []): Promise<string> {
    try {
      const resolved = await originalResolveVariable(variable, path);
      variables.push({ path, variable, resolved });
      return resolved;
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : String(error);
      variables.push({ path, variable, resolved: '', error: errorMsg });
      throw error;
    }
  };

  try {
    const interpolated = await interpolator.interpolate(config);
    return { interpolated, variables };
  } catch (error) {
    // Return partial results even if interpolation fails
    return { 
      interpolated: config, 
      variables: variables.map(v => ({ ...v, error: v.error || 'Interpolation failed' }))
    };
  }
}

// =============================================================================
// Built-in Variable Resolvers
// =============================================================================

/**
 * Environment variable resolver
 */
export const envResolver: VariableResolver = (variable: string, context: InterpolationContext) => {
  const value = context.env[variable];
  if (value === undefined) {
    throw new Error(`Environment variable '${variable}' is not defined`);
  }
  return value;
};

/**
 * Configuration reference resolver
 */
export const configResolver: VariableResolver = (variable: string, context: InterpolationContext) => {
  const parts = variable.split('.');
  let current: any = context.config;
  
  for (const part of parts) {
    if (!isObject(current) || !(part in current)) {
      throw new Error(`Configuration value '${variable}' is not defined`);
    }
    current = current[part];
  }
  
  return String(current);
};

/**
 * File content resolver
 */
export const fileResolver: VariableResolver = (variable: string, context: InterpolationContext) => {
  const fs = require('node:fs');
  const path = require('node:path');
  
  const filePath = path.resolve(context.cwd, variable);
  
  try {
    return fs.readFileSync(filePath, 'utf8').trim();
  } catch (error) {
    throw new Error(`Failed to read file '${filePath}': ${error.message}`);
  }
};

// =============================================================================
// Export Utilities
// =============================================================================

export {
  DEFAULT_INTERPOLATION_OPTIONS
} from './constants';
/**
 * Plugin Validator for CF-Better-Auth
 * Validates plugin manifests, dependencies, and compatibility
 */

import type {
  BasePlugin,
  PluginManifest,
  ValidationResult,
  ValidationError
} from '@cf-auth/types';

import type { PluginValidator as IPluginValidator } from './types';

import {
  PluginError,
  PluginDependencyNotFoundError,
  PluginCircularDependencyError,
  PluginIncompatibleVersionError,
  createPluginError
} from './errors';

import {
  PLUGIN_VALIDATION_RULES,
  PLUGIN_TYPE,
  PLUGIN_STATUS,
  PLUGIN_PRIORITY
} from './constants';

import {
  isValidPluginId,
  isValidVersion,
  satisfiesVersion,
  compareVersions,
  validatePluginName,
  validatePluginDescription
} from './utils';

/**
 * Plugin Validator Implementation
 */
export class PluginValidator implements IPluginValidator {
  private registryResolver?: (pluginId: string) => BasePlugin | null;
  private versionResolver?: (requirement: string) => string;

  /**
   * Initialize the validator
   */
  async initialize(options: PluginValidatorOptions = {}): Promise<void> {
    this.registryResolver = options.registryResolver;
    this.versionResolver = options.versionResolver;
  }

  /**
   * Set registry resolver
   */
  setRegistryResolver(resolver: (pluginId: string) => BasePlugin | null): void {
    this.registryResolver = resolver;
  }

  /**
   * Set version resolver
   */
  setVersionResolver(resolver: (requirement: string) => string): void {
    this.versionResolver = resolver;
  }

  /**
   * Validate plugin
   */
  async validatePlugin(plugin: BasePlugin): Promise<ValidationResult> {
    const errors: ValidationError[] = [];

    // Validate basic plugin structure
    const basicValidation = this.validateBasicStructure(plugin);
    if (!basicValidation.valid) {
      errors.push(...(basicValidation.errors || []));
    }

    // Validate plugin metadata
    const metadataValidation = this.validateMetadata(plugin);
    if (!metadataValidation.valid) {
      errors.push(...(metadataValidation.errors || []));
    }

    // Validate plugin configuration schema
    if (plugin.configSchema) {
      const configValidation = this.validateConfigSchema(plugin.configSchema);
      if (!configValidation.valid) {
        errors.push(...(configValidation.errors || []));
      }
    }

    // Validate plugin hooks
    if (plugin.hooks) {
      const hooksValidation = this.validateHooks(plugin);
      if (!hooksValidation.valid) {
        errors.push(...(hooksValidation.errors || []));
      }
    }

    // Validate plugin engines compatibility
    if (plugin.engines) {
      const engineValidation = this.validateEngines(plugin.engines);
      if (!engineValidation.valid) {
        errors.push(...(engineValidation.errors || []));
      }
    }

    return {
      valid: errors.length === 0,
      errors: errors.length > 0 ? errors : undefined,
    };
  }

  /**
   * Validate plugin manifest
   */
  validateManifest(manifest: PluginManifest): ValidationResult {
    const errors: ValidationError[] = [];

    // Validate as base plugin first
    const baseValidation = this.validatePlugin(manifest);
    if (!baseValidation.valid) {
      errors.push(...(baseValidation.errors || []));
    }

    // Validate manifest-specific fields
    if (manifest.main && typeof manifest.main !== 'string') {
      errors.push({
        path: 'main',
        message: 'Main entry point must be a string',
        value: manifest.main,
      });
    }

    if (manifest.files && !Array.isArray(manifest.files)) {
      errors.push({
        path: 'files',
        message: 'Files must be an array of strings',
        value: manifest.files,
      });
    }

    if (manifest.scripts && typeof manifest.scripts !== 'object') {
      errors.push({
        path: 'scripts',
        message: 'Scripts must be an object',
        value: manifest.scripts,
      });
    }

    return {
      valid: errors.length === 0,
      errors: errors.length > 0 ? errors : undefined,
    };
  }

  /**
   * Validate plugin dependencies
   */
  validateDependencies(plugin: BasePlugin): ValidationResult {
    const errors: ValidationError[] = [];

    // Check if dependencies exist
    const dependencies = plugin.dependencies || [];
    for (const depId of dependencies) {
      if (!this.isDependencyAvailable(depId)) {
        errors.push({
          path: 'dependencies',
          message: `Dependency '${depId}' is not available`,
          value: depId,
        });
      }
    }

    // Check peer dependencies
    const peerDependencies = plugin.peerDependencies || [];
    for (const peerDepId of peerDependencies) {
      if (!this.isDependencyAvailable(peerDepId)) {
        errors.push({
          path: 'peerDependencies',
          message: `Peer dependency '${peerDepId}' is not available`,
          value: peerDepId,
        });
      }
    }

    // Check circular dependencies
    try {
      this.checkCircularDependencies([plugin]);
    } catch (error) {
      if (error instanceof PluginCircularDependencyError) {
        errors.push({
          path: 'dependencies',
          message: error.message,
          value: error.dependencyChain,
        });
      }
    }

    return {
      valid: errors.length === 0,
      errors: errors.length > 0 ? errors : undefined,
    };
  }

  /**
   * Resolve plugin dependencies
   */
  resolveDependencies(pluginId: string): string[] {
    if (!this.registryResolver) {
      throw new PluginError('Registry resolver not configured');
    }

    const resolved: string[] = [];
    const visited = new Set<string>();
    const visiting = new Set<string>();

    const resolve = (id: string): void => {
      if (visiting.has(id)) {
        const chain = Array.from(visiting);
        chain.push(id);
        throw new PluginCircularDependencyError(chain);
      }

      if (visited.has(id)) {
        return;
      }

      visiting.add(id);

      const plugin = this.registryResolver!(id);
      if (!plugin) {
        throw new PluginDependencyNotFoundError(pluginId, id);
      }

      const dependencies = plugin.dependencies || [];
      for (const depId of dependencies) {
        resolve(depId);
      }

      visiting.delete(id);
      visited.add(id);

      if (!resolved.includes(id)) {
        resolved.push(id);
      }
    };

    resolve(pluginId);

    // Remove the original plugin ID from dependencies
    return resolved.filter(id => id !== pluginId);
  }

  /**
   * Check plugin compatibility
   */
  checkCompatibility(plugin: BasePlugin): ValidationResult {
    const errors: ValidationError[] = [];

    // Check CF-Better-Auth compatibility
    if (plugin.engines?.cfBetterAuth) {
      const currentVersion = this.getCurrentVersion();
      if (!satisfiesVersion(currentVersion, plugin.engines.cfBetterAuth)) {
        errors.push({
          path: 'engines.cfBetterAuth',
          message: `Plugin requires CF-Better-Auth ${plugin.engines.cfBetterAuth}, but current version is ${currentVersion}`,
          value: plugin.engines.cfBetterAuth,
        });
      }
    }

    // Check Better-Auth compatibility
    if (plugin.engines?.betterAuth) {
      const betterAuthVersion = this.getBetterAuthVersion();
      if (betterAuthVersion && !satisfiesVersion(betterAuthVersion, plugin.engines.betterAuth)) {
        errors.push({
          path: 'engines.betterAuth',
          message: `Plugin requires Better-Auth ${plugin.engines.betterAuth}, but current version is ${betterAuthVersion}`,
          value: plugin.engines.betterAuth,
        });
      }
    }

    // Check Node.js compatibility
    if (plugin.engines?.node) {
      const nodeVersion = process.version.slice(1); // Remove 'v' prefix
      if (!satisfiesVersion(nodeVersion, plugin.engines.node)) {
        errors.push({
          path: 'engines.node',
          message: `Plugin requires Node.js ${plugin.engines.node}, but current version is ${nodeVersion}`,
          value: plugin.engines.node,
        });
      }
    }

    return {
      valid: errors.length === 0,
      errors: errors.length > 0 ? errors : undefined,
    };
  }

  /**
   * Validate plugin configuration
   */
  validateConfiguration(plugin: BasePlugin, config: any): ValidationResult {
    if (!plugin.configSchema) {
      return { valid: true };
    }

    return this.validateConfigAgainstSchema(config, plugin.configSchema);
  }

  /**
   * Check for circular dependencies
   */
  checkCircularDependencies(plugins: BasePlugin[]): ValidationResult {
    const errors: ValidationError[] = [];
    const visited = new Set<string>();
    const visiting = new Set<string>();

    const checkCircular = (pluginId: string, chain: string[] = []): void => {
      if (visiting.has(pluginId)) {
        const circularChain = [...chain, pluginId];
        throw new PluginCircularDependencyError(circularChain);
      }

      if (visited.has(pluginId)) {
        return;
      }

      visiting.add(pluginId);

      const plugin = plugins.find(p => p.id === pluginId);
      if (plugin) {
        const dependencies = plugin.dependencies || [];
        for (const depId of dependencies) {
          checkCircular(depId, [...chain, pluginId]);
        }
      }

      visiting.delete(pluginId);
      visited.add(pluginId);
    };

    try {
      for (const plugin of plugins) {
        if (!visited.has(plugin.id)) {
          checkCircular(plugin.id);
        }
      }
    } catch (error) {
      if (error instanceof PluginCircularDependencyError) {
        errors.push({
          path: 'dependencies',
          message: error.message,
          value: error.dependencyChain,
        });
      }
    }

    return {
      valid: errors.length === 0,
      errors: errors.length > 0 ? errors : undefined,
    };
  }

  /**
   * Validate basic plugin structure
   */
  private validateBasicStructure(plugin: BasePlugin): ValidationResult {
    const errors: ValidationError[] = [];

    // Required fields
    if (!plugin.id) {
      errors.push({
        path: 'id',
        message: 'Plugin ID is required',
        value: plugin.id,
      });
    } else if (!isValidPluginId(plugin.id)) {
      errors.push({
        path: 'id',
        message: 'Plugin ID must contain only lowercase letters, numbers, hyphens, and underscores',
        value: plugin.id,
      });
    }

    // Validate name
    const nameValidation = validatePluginName(plugin.name);
    if (!nameValidation.valid) {
      errors.push(...(nameValidation.errors || []));
    }

    // Validate version
    if (!plugin.version) {
      errors.push({
        path: 'version',
        message: 'Plugin version is required',
        value: plugin.version,
      });
    } else if (!isValidVersion(plugin.version)) {
      errors.push({
        path: 'version',
        message: 'Plugin version must follow semantic versioning (e.g., 1.0.0)',
        value: plugin.version,
      });
    }

    // Validate type
    if (!plugin.type) {
      errors.push({
        path: 'type',
        message: 'Plugin type is required',
        value: plugin.type,
      });
    } else if (!Object.values(PLUGIN_TYPE).includes(plugin.type as any)) {
      errors.push({
        path: 'type',
        message: `Invalid plugin type. Must be one of: ${Object.values(PLUGIN_TYPE).join(', ')}`,
        value: plugin.type,
      });
    }

    // Validate priority
    if (plugin.priority && !Object.values(PLUGIN_PRIORITY).includes(plugin.priority as any)) {
      errors.push({
        path: 'priority',
        message: `Invalid plugin priority. Must be one of: ${Object.values(PLUGIN_PRIORITY).join(', ')}`,
        value: plugin.priority,
      });
    }

    return {
      valid: errors.length === 0,
      errors: errors.length > 0 ? errors : undefined,
    };
  }

  /**
   * Validate plugin metadata
   */
  private validateMetadata(plugin: BasePlugin): ValidationResult {
    const errors: ValidationError[] = [];

    // Validate description
    if (plugin.description) {
      const descValidation = validatePluginDescription(plugin.description);
      if (!descValidation.valid) {
        errors.push(...(descValidation.errors || []));
      }
    }

    // Validate homepage URL
    if (plugin.homepage && !this.isValidUrl(plugin.homepage)) {
      errors.push({
        path: 'homepage',
        message: 'Homepage must be a valid URL',
        value: plugin.homepage,
      });
    }

    // Validate repository URL
    if (plugin.repository && !this.isValidUrl(plugin.repository)) {
      errors.push({
        path: 'repository',
        message: 'Repository must be a valid URL',
        value: plugin.repository,
      });
    }

    // Validate keywords
    if (plugin.keywords) {
      if (!Array.isArray(plugin.keywords)) {
        errors.push({
          path: 'keywords',
          message: 'Keywords must be an array of strings',
          value: plugin.keywords,
        });
      } else {
        plugin.keywords.forEach((keyword, index) => {
          if (typeof keyword !== 'string') {
            errors.push({
              path: `keywords[${index}]`,
              message: 'Each keyword must be a string',
              value: keyword,
            });
          }
        });
      }
    }

    return {
      valid: errors.length === 0,
      errors: errors.length > 0 ? errors : undefined,
    };
  }

  /**
   * Validate plugin configuration schema
   */
  private validateConfigSchema(schema: any): ValidationResult {
    const errors: ValidationError[] = [];

    if (typeof schema !== 'object' || schema === null) {
      errors.push({
        path: 'configSchema',
        message: 'Configuration schema must be an object',
        value: schema,
      });
      return { valid: false, errors };
    }

    if (schema.type !== 'object') {
      errors.push({
        path: 'configSchema.type',
        message: 'Configuration schema type must be "object"',
        value: schema.type,
      });
    }

    if (!schema.properties || typeof schema.properties !== 'object') {
      errors.push({
        path: 'configSchema.properties',
        message: 'Configuration schema must have properties object',
        value: schema.properties,
      });
    }

    return {
      valid: errors.length === 0,
      errors: errors.length > 0 ? errors : undefined,
    };
  }

  /**
   * Validate plugin hooks
   */
  private validateHooks(plugin: BasePlugin): ValidationResult {
    const errors: ValidationError[] = [];

    if (typeof plugin.hooks !== 'object' || plugin.hooks === null) {
      errors.push({
        path: 'hooks',
        message: 'Hooks must be an object',
        value: plugin.hooks,
      });
      return { valid: false, errors };
    }

    // Validate each hook
    Object.entries(plugin.hooks).forEach(([hookName, hookFunction]) => {
      if (typeof hookFunction !== 'function') {
        errors.push({
          path: `hooks.${hookName}`,
          message: 'Hook must be a function',
          value: typeof hookFunction,
        });
      }
    });

    return {
      valid: errors.length === 0,
      errors: errors.length > 0 ? errors : undefined,
    };
  }

  /**
   * Validate plugin engines
   */
  private validateEngines(engines: any): ValidationResult {
    const errors: ValidationError[] = [];

    if (typeof engines !== 'object' || engines === null) {
      errors.push({
        path: 'engines',
        message: 'Engines must be an object',
        value: engines,
      });
      return { valid: false, errors };
    }

    // Validate version requirements
    Object.entries(engines).forEach(([engine, requirement]) => {
      if (typeof requirement !== 'string') {
        errors.push({
          path: `engines.${engine}`,
          message: 'Engine requirement must be a string',
          value: requirement,
        });
      }
    });

    return {
      valid: errors.length === 0,
      errors: errors.length > 0 ? errors : undefined,
    };
  }

  /**
   * Validate configuration against schema
   */
  private validateConfigAgainstSchema(config: any, schema: any): ValidationResult {
    // This is a simplified validation - in a real implementation,
    // you would use a proper JSON schema validator like Ajv
    const errors: ValidationError[] = [];

    if (schema.type === 'object' && schema.properties) {
      if (typeof config !== 'object' || config === null) {
        errors.push({
          path: '',
          message: 'Configuration must be an object',
          value: config,
        });
        return { valid: false, errors };
      }

      // Check required properties
      if (schema.required) {
        schema.required.forEach((prop: string) => {
          if (!(prop in config)) {
            errors.push({
              path: prop,
              message: `Required property '${prop}' is missing`,
              value: undefined,
            });
          }
        });
      }

      // Validate properties
      Object.entries(schema.properties).forEach(([prop, propSchema]: [string, any]) => {
        if (prop in config) {
          const value = config[prop];
          const propErrors = this.validateValue(value, propSchema, prop);
          errors.push(...propErrors);
        }
      });
    }

    return {
      valid: errors.length === 0,
      errors: errors.length > 0 ? errors : undefined,
    };
  }

  /**
   * Validate value against property schema
   */
  private validateValue(value: any, schema: any, path: string): ValidationError[] {
    const errors: ValidationError[] = [];

    // Type validation
    if (schema.type) {
      const expectedType = schema.type;
      const actualType = typeof value;

      if (expectedType === 'array' && !Array.isArray(value)) {
        errors.push({
          path,
          message: `Expected array but got ${actualType}`,
          value,
        });
      } else if (expectedType !== 'array' && actualType !== expectedType) {
        errors.push({
          path,
          message: `Expected ${expectedType} but got ${actualType}`,
          value,
        });
      }
    }

    return errors;
  }

  /**
   * Check if dependency is available
   */
  private isDependencyAvailable(depId: string): boolean {
    if (!this.registryResolver) {
      return false;
    }
    return this.registryResolver(depId) !== null;
  }

  /**
   * Check if URL is valid
   */
  private isValidUrl(url: string): boolean {
    try {
      new URL(url);
      return true;
    } catch {
      return false;
    }
  }

  /**
   * Get current CF-Better-Auth version
   */
  private getCurrentVersion(): string {
    // This would typically read from package.json or version file
    return '0.1.0';
  }

  /**
   * Get Better-Auth version
   */
  private getBetterAuthVersion(): string | null {
    try {
      // This would typically read from package.json
      return null;
    } catch {
      return null;
    }
  }
}

/**
 * Plugin validator options
 */
export interface PluginValidatorOptions {
  registryResolver?: (pluginId: string) => BasePlugin | null;
  versionResolver?: (requirement: string) => string;
  strictValidation?: boolean;
  allowExperimentalFeatures?: boolean;
}

/**
 * Create plugin validator instance
 */
export function createPluginValidator(options?: PluginValidatorOptions): IPluginValidator {
  return new PluginValidator();
}
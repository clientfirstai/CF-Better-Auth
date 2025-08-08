/**
 * CF-Auth Configuration Package
 * 
 * @fileoverview Main entry point for the CF-Better-Auth configuration system.
 * Provides comprehensive configuration management with loading, validation,
 * interpolation, and runtime management capabilities.
 * 
 * @version 0.1.0
 * @license MIT
 */

// =============================================================================
// Core Configuration System
// =============================================================================

// Types and interfaces
export * from './types';

// Constants and defaults
export * from './constants';

// Error classes and utilities
export * from './errors';

// Utility functions
export * from './utils';

// Variable interpolation system
export * from './interpolation';

// Legacy exports (for backward compatibility)
export * from './version-manager';
export * from './config-loader';
export * from './migration-manager';
export * from './schema-validator';
export * from './environment-loader';

// =============================================================================
// Configuration Schemas
// =============================================================================

// Re-export schemas from schemas directory
export * from './schemas/app.schema';

// =============================================================================
// Package Metadata
// =============================================================================

/**
 * Package version
 */
export const VERSION = '0.1.0';

/**
 * Package information
 */
export const PACKAGE_INFO = {
  name: '@cf-auth/config',
  version: VERSION,
  description: 'Configuration management system for CF-Better-Auth',
  author: 'CF-Auth Team',
  license: 'MIT',
  repository: 'https://github.com/cf-auth/cf-better-auth',
  homepage: 'https://cf-auth.dev',
  keywords: [
    'config',
    'configuration',
    'validation',
    'auth',
    'better-auth',
    'cloudflare',
    'typescript',
    'zod',
    'environment',
    'secrets'
  ]
} as const;

// =============================================================================
// Factory Functions
// =============================================================================

// Legacy factory functions (for backward compatibility)
import { ConfigLoader } from './config-loader';
import { VersionManager } from './version-manager';
import { MigrationManager } from './migration-manager';
import { SchemaValidator } from './schema-validator';
import { ConfigInterpolator, createInterpolator } from './interpolation';

/**
 * Create a configuration loader instance
 */
export function createConfigLoader(projectRoot?: string) {
  return new ConfigLoader(projectRoot);
}

/**
 * Create a version manager instance
 */
export function createVersionManager(projectRoot?: string) {
  return new VersionManager(projectRoot);
}

/**
 * Create a migration manager instance
 */
export function createMigrationManager(projectRoot?: string) {
  return new MigrationManager(projectRoot);
}

/**
 * Create a schema validator instance
 */
export function createSchemaValidator() {
  return new SchemaValidator();
}

/**
 * Create a configuration interpolator instance
 */
export { createInterpolator };

// =============================================================================
// Quick Start Utilities
// =============================================================================

import type { Environment } from '@cf-auth/types';
import type { 
  ConfigLoaderOptions,
  InterpolationOptions,
  ConfigObject
} from './types';
import { 
  detectEnvironment,
  findConfigFiles,
  findEnvironmentFiles,
  getConfigValue,
  setConfigValue,
  formatConfig
} from './utils';
import { interpolateConfig } from './interpolation';
import { AppConfigSchema, createAppConfigForEnvironment } from './schemas/app.schema';

/**
 * Quick configuration loading with smart defaults
 */
export async function quickLoadConfig<T extends ConfigObject = ConfigObject>(
  options: {
    /** Base directory to search for config files */
    baseDir?: string;
    /** Environment to load config for */
    environment?: Environment;
    /** Enable variable interpolation */
    interpolation?: boolean | InterpolationOptions;
    /** Configuration schema for validation */
    schema?: any;
    /** Additional loader options */
    loaderOptions?: Partial<ConfigLoaderOptions>;
  } = {}
): Promise<T> {
  const {
    baseDir = process.cwd(),
    environment = detectEnvironment(),
    interpolation = true,
    schema,
    loaderOptions = {}
  } = options;

  // Find configuration files
  const configFiles = await findConfigFiles(baseDir, environment);
  const envFiles = await findEnvironmentFiles(baseDir, environment);

  // Create basic configuration object
  let config: ConfigObject = {};

  // Load environment files first (lowest priority)
  for (const envFile of envFiles.reverse()) {
    try {
      require('dotenv').config({ path: envFile });
    } catch (error) {
      // Ignore missing dotenv
    }
  }

  // Load configuration files
  if (configFiles.length > 0) {
    const configLoader = createConfigLoader(baseDir);
    config = await configLoader.load(configFiles[0], loaderOptions);
  }

  // Apply variable interpolation
  if (interpolation) {
    const interpolationOptions = typeof interpolation === 'boolean' 
      ? {} 
      : interpolation;
    config = await interpolateConfig(config, interpolationOptions);
  }

  // Validate with schema if provided
  if (schema) {
    config = schema.parse(config);
  }

  return config as T;
}

/**
 * Create environment-specific configuration
 */
export { createAppConfigForEnvironment };

/**
 * Get configuration value using dot notation
 */
export { getConfigValue };

/**
 * Set configuration value using dot notation
 */
export { setConfigValue };

/**
 * Format configuration for display
 */
export { formatConfig };

/**
 * Detect current environment
 */
export { detectEnvironment };

// =============================================================================
// Default Exports
// =============================================================================

/**
 * Default export with commonly used utilities
 */
export default {
  // Package info
  VERSION,
  PACKAGE_INFO,

  // Core functions
  quickLoadConfig,
  createAppConfigForEnvironment,
  detectEnvironment,
  interpolateConfig,
  
  // Configuration utilities
  getConfigValue,
  setConfigValue,
  formatConfig,
  
  // Factory functions
  createConfigLoader,
  createVersionManager,
  createMigrationManager,
  createSchemaValidator,
  createInterpolator,
  
  // Schemas
  AppConfigSchema
};
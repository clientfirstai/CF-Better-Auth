/**
 * CF-Auth Configuration Utilities
 * 
 * @fileoverview Utility functions for configuration management including
 * file operations, path resolution, environment detection, and more.
 * 
 * @version 0.1.0
 * @license MIT
 */

import { promises as fs } from 'node:fs';
import { join, resolve, dirname, basename, extname, isAbsolute } from 'node:path';
import { homedir, platform } from 'node:os';
import { existsSync, statSync } from 'node:fs';

import type { Environment, ConfigObject } from '@cf-auth/types';
import { isString, isObject, deepClone, deepMerge } from '@cf-auth/utils';

import type { 
  ConfigFormat, 
  ConfigSource, 
  ConfigLoaderOptions,
  ConfigValidationResult,
  InterpolationContext
} from './types';
import {
  CONFIG_FILE_NAMES,
  ENV_CONFIG_PATTERNS,
  ENV_FILE_NAMES,
  FORMAT_EXTENSIONS,
  CONFIG_DIRECTORIES,
  ENVIRONMENT_PATTERNS,
  ENV_DETECTION_VARS,
  REGEX_PATTERNS
} from './constants';
import { ConfigErrorFactory } from './errors';

// =============================================================================
// Path and File Utilities
// =============================================================================

/**
 * Resolve configuration file path
 */
export function resolveConfigPath(
  filePath?: string,
  baseDir?: string
): string {
  if (!filePath) {
    throw new Error('Configuration file path is required');
  }

  // If absolute path, return as-is
  if (isAbsolute(filePath)) {
    return filePath;
  }

  // Resolve relative to base directory
  const base = baseDir || process.cwd();
  return resolve(base, filePath);
}

/**
 * Find configuration files in common locations
 */
export async function findConfigFiles(
  baseDir: string = process.cwd(),
  environment?: Environment
): Promise<string[]> {
  const foundFiles: string[] = [];
  const searchDirs = getConfigSearchDirectories(baseDir);
  
  // Get file names to search for
  const fileNames = [
    ...CONFIG_FILE_NAMES,
    ...(environment ? ENV_CONFIG_PATTERNS[environment] || [] : [])
  ];

  for (const dir of searchDirs) {
    if (!await directoryExists(dir)) {
      continue;
    }

    for (const fileName of fileNames) {
      const filePath = join(dir, fileName);
      if (await fileExists(filePath)) {
        foundFiles.push(filePath);
      }
    }
  }

  return foundFiles;
}

/**
 * Get configuration search directories
 */
export function getConfigSearchDirectories(baseDir: string = process.cwd()): string[] {
  const dirs: string[] = [];

  // Add current directory and common config directories
  for (const relativePath of CONFIG_DIRECTORIES) {
    let dir: string;
    
    if (relativePath.startsWith('~/')) {
      // Home directory relative path
      dir = join(homedir(), relativePath.slice(2));
    } else if (relativePath.startsWith('./') || relativePath === '.') {
      // Base directory relative path
      dir = resolve(baseDir, relativePath);
    } else if (isAbsolute(relativePath)) {
      // Absolute path
      dir = relativePath;
    } else {
      // Relative to base directory
      dir = join(baseDir, relativePath);
    }
    
    dirs.push(dir);
  }

  // Remove duplicates while preserving order
  return Array.from(new Set(dirs));
}

/**
 * Find environment files
 */
export async function findEnvironmentFiles(
  baseDir: string = process.cwd(),
  environment?: Environment
): Promise<string[]> {
  const foundFiles: string[] = [];
  
  // Priority order for environment files
  const fileNames: string[] = [];
  
  if (environment) {
    fileNames.push(`.env.${environment}.local`);
    fileNames.push(`.env.${environment}`);
  }
  
  fileNames.push('.env.local');
  fileNames.push('.env');

  for (const fileName of fileNames) {
    const filePath = join(baseDir, fileName);
    if (await fileExists(filePath)) {
      foundFiles.push(filePath);
    }
  }

  return foundFiles;
}

/**
 * Get configuration format from file path
 */
export function getConfigFormat(filePath: string): ConfigFormat {
  const ext = extname(filePath).toLowerCase();
  return FORMAT_EXTENSIONS[ext as keyof typeof FORMAT_EXTENSIONS] || 'json';
}

/**
 * Check if file exists
 */
export async function fileExists(filePath: string): Promise<boolean> {
  try {
    await fs.access(filePath);
    return true;
  } catch {
    return false;
  }
}

/**
 * Check if file exists synchronously
 */
export function fileExistsSync(filePath: string): boolean {
  return existsSync(filePath);
}

/**
 * Check if directory exists
 */
export async function directoryExists(dirPath: string): Promise<boolean> {
  try {
    const stats = await fs.stat(dirPath);
    return stats.isDirectory();
  } catch {
    return false;
  }
}

/**
 * Check if file is readable
 */
export async function isReadable(filePath: string): Promise<boolean> {
  try {
    await fs.access(filePath, fs.constants.R_OK);
    return true;
  } catch {
    return false;
  }
}

/**
 * Check if file is writable
 */
export async function isWritable(filePath: string): Promise<boolean> {
  try {
    await fs.access(filePath, fs.constants.W_OK);
    return true;
  } catch {
    return false;
  }
}

/**
 * Get file stats
 */
export async function getFileStats(filePath: string) {
  try {
    return await fs.stat(filePath);
  } catch (error) {
    throw ConfigErrorFactory.generic(
      `Failed to get file stats for ${filePath}`,
      'FILE_STATS_ERROR',
      { filePath },
      error as Error
    );
  }
}

/**
 * Create directory recursively
 */
export async function ensureDirectory(dirPath: string): Promise<void> {
  try {
    await fs.mkdir(dirPath, { recursive: true });
  } catch (error) {
    throw ConfigErrorFactory.generic(
      `Failed to create directory ${dirPath}`,
      'DIRECTORY_CREATE_ERROR',
      { dirPath },
      error as Error
    );
  }
}

// =============================================================================
// Environment Detection and Variables
// =============================================================================

/**
 * Detect current environment
 */
export function detectEnvironment(): Environment {
  // Check explicit environment variables
  for (const envVar of ENV_DETECTION_VARS) {
    const value = process.env[envVar];
    if (value) {
      const normalized = value.toLowerCase().trim();
      
      // Check each environment pattern
      for (const [env, patterns] of Object.entries(ENVIRONMENT_PATTERNS)) {
        if (patterns.includes(normalized)) {
          return env as Environment;
        }
      }
    }
  }

  // Default fallback
  return 'development';
}

/**
 * Get environment variable with default value
 */
export function getEnvVar(
  name: string, 
  defaultValue?: string
): string | undefined {
  return process.env[name] || defaultValue;
}

/**
 * Get required environment variable
 */
export function getRequiredEnvVar(name: string): string {
  const value = process.env[name];
  if (!value) {
    throw ConfigErrorFactory.missingEnvVar(name);
  }
  return value;
}

/**
 * Parse environment variable as specific type
 */
export function parseEnvVar<T = any>(
  name: string,
  type: 'string' | 'number' | 'boolean' | 'json',
  defaultValue?: T
): T | undefined {
  const value = process.env[name];
  
  if (!value) {
    return defaultValue;
  }

  try {
    switch (type) {
      case 'string':
        return value as T;
      
      case 'number': {
        const num = Number(value);
        if (isNaN(num)) {
          throw ConfigErrorFactory.invalidEnvVar(name, value, 'number');
        }
        return num as T;
      }
      
      case 'boolean': {
        const normalized = value.toLowerCase().trim();
        const boolValue = ['true', '1', 'yes', 'on'].includes(normalized);
        return boolValue as T;
      }
      
      case 'json': {
        return JSON.parse(value) as T;
      }
      
      default:
        return value as T;
    }
  } catch (error) {
    throw ConfigErrorFactory.invalidEnvVar(name, value, type, error as Error);
  }
}

/**
 * Get all environment variables with a specific prefix
 */
export function getEnvVarsWithPrefix(prefix: string): Record<string, string> {
  const result: Record<string, string> = {};
  
  for (const [key, value] of Object.entries(process.env)) {
    if (key.startsWith(prefix) && value !== undefined) {
      // Remove prefix and convert to camelCase
      const cleanKey = key.slice(prefix.length).toLowerCase();
      const camelKey = cleanKey.replace(/_([a-z])/g, (_, letter) => letter.toUpperCase());
      result[camelKey] = value;
    }
  }
  
  return result;
}

// =============================================================================
// Configuration Object Utilities
// =============================================================================

/**
 * Flatten configuration object with dot notation
 */
export function flattenConfig(
  config: ConfigObject, 
  separator: string = '.', 
  prefix: string = ''
): Record<string, any> {
  const result: Record<string, any> = {};
  
  for (const [key, value] of Object.entries(config)) {
    const newKey = prefix ? `${prefix}${separator}${key}` : key;
    
    if (isObject(value) && !Array.isArray(value)) {
      Object.assign(result, flattenConfig(value, separator, newKey));
    } else {
      result[newKey] = value;
    }
  }
  
  return result;
}

/**
 * Unflatten configuration object from dot notation
 */
export function unflattenConfig(
  flatConfig: Record<string, any>,
  separator: string = '.'
): ConfigObject {
  const result: ConfigObject = {};
  
  for (const [key, value] of Object.entries(flatConfig)) {
    const parts = key.split(separator);
    let current = result;
    
    for (let i = 0; i < parts.length - 1; i++) {
      const part = parts[i];
      if (!(part in current) || !isObject(current[part])) {
        current[part] = {};
      }
      current = current[part] as ConfigObject;
    }
    
    current[parts[parts.length - 1]] = value;
  }
  
  return result;
}

/**
 * Get nested configuration value using dot notation
 */
export function getConfigValue<T = any>(
  config: ConfigObject,
  path: string,
  defaultValue?: T,
  separator: string = '.'
): T | undefined {
  const parts = path.split(separator);
  let current: any = config;
  
  for (const part of parts) {
    if (!isObject(current) || !(part in current)) {
      return defaultValue;
    }
    current = current[part];
  }
  
  return current as T;
}

/**
 * Set nested configuration value using dot notation
 */
export function setConfigValue(
  config: ConfigObject,
  path: string,
  value: any,
  separator: string = '.'
): void {
  const parts = path.split(separator);
  let current = config;
  
  for (let i = 0; i < parts.length - 1; i++) {
    const part = parts[i];
    if (!(part in current) || !isObject(current[part])) {
      current[part] = {};
    }
    current = current[part] as ConfigObject;
  }
  
  current[parts[parts.length - 1]] = value;
}

/**
 * Delete nested configuration value using dot notation
 */
export function deleteConfigValue(
  config: ConfigObject,
  path: string,
  separator: string = '.'
): boolean {
  const parts = path.split(separator);
  let current = config;
  
  for (let i = 0; i < parts.length - 1; i++) {
    const part = parts[i];
    if (!isObject(current) || !(part in current)) {
      return false;
    }
    current = current[part] as ConfigObject;
  }
  
  const lastPart = parts[parts.length - 1];
  if (lastPart in current) {
    delete current[lastPart];
    return true;
  }
  
  return false;
}

/**
 * Check if configuration has a specific path
 */
export function hasConfigPath(
  config: ConfigObject,
  path: string,
  separator: string = '.'
): boolean {
  const parts = path.split(separator);
  let current: any = config;
  
  for (const part of parts) {
    if (!isObject(current) || !(part in current)) {
      return false;
    }
    current = current[part];
  }
  
  return true;
}

// =============================================================================
// Validation Utilities
// =============================================================================

/**
 * Validate URL format
 */
export function isValidUrl(url: string): boolean {
  return REGEX_PATTERNS.URL.test(url);
}

/**
 * Validate email format
 */
export function isValidEmail(email: string): boolean {
  return REGEX_PATTERNS.EMAIL.test(email);
}

/**
 * Validate port number
 */
export function isValidPort(port: number | string): boolean {
  const portNum = typeof port === 'string' ? parseInt(port, 10) : port;
  return Number.isInteger(portNum) && portNum >= 1 && portNum <= 65535;
}

/**
 * Validate host format
 */
export function isValidHost(host: string): boolean {
  return REGEX_PATTERNS.HOST.test(host) || 
         REGEX_PATTERNS.IPV4.test(host) || 
         REGEX_PATTERNS.IPV6.test(host);
}

/**
 * Validate secret strength
 */
export function validateSecretStrength(
  secret: string,
  minLength: number = 32
): { isStrong: boolean; issues: string[] } {
  const issues: string[] = [];
  
  if (secret.length < minLength) {
    issues.push(`Must be at least ${minLength} characters long`);
  }
  
  if (!/[a-z]/.test(secret)) {
    issues.push('Must contain lowercase letters');
  }
  
  if (!/[A-Z]/.test(secret)) {
    issues.push('Must contain uppercase letters');
  }
  
  if (!/\d/.test(secret)) {
    issues.push('Must contain numbers');
  }
  
  if (!/[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]/.test(secret)) {
    issues.push('Must contain special characters');
  }
  
  // Check for common weak patterns
  if (/^(.)\1+$/.test(secret)) {
    issues.push('Must not be all the same character');
  }
  
  if (/^(012|123|234|345|456|567|678|789|890|abc|def|ghi|jkl|mno|pqr|stu|vwx|xyz)/i.test(secret)) {
    issues.push('Must not contain sequential patterns');
  }
  
  return {
    isStrong: issues.length === 0,
    issues
  };
}

// =============================================================================
// Configuration Comparison and Diffing
// =============================================================================

/**
 * Compare two configuration objects
 */
export function compareConfigs(
  config1: ConfigObject,
  config2: ConfigObject
): {
  equal: boolean;
  added: string[];
  removed: string[];
  changed: string[];
} {
  const flat1 = flattenConfig(config1);
  const flat2 = flattenConfig(config2);
  
  const keys1 = new Set(Object.keys(flat1));
  const keys2 = new Set(Object.keys(flat2));
  
  const added = Array.from(keys2).filter(key => !keys1.has(key));
  const removed = Array.from(keys1).filter(key => !keys2.has(key));
  const changed = Array.from(keys1)
    .filter(key => keys2.has(key) && flat1[key] !== flat2[key]);
  
  return {
    equal: added.length === 0 && removed.length === 0 && changed.length === 0,
    added,
    removed,
    changed
  };
}

/**
 * Generate configuration diff
 */
export function diffConfigs(
  oldConfig: ConfigObject,
  newConfig: ConfigObject
): {
  path: string;
  type: 'added' | 'removed' | 'changed';
  oldValue?: any;
  newValue?: any;
}[] {
  const oldFlat = flattenConfig(oldConfig);
  const newFlat = flattenConfig(newConfig);
  const allKeys = new Set([...Object.keys(oldFlat), ...Object.keys(newFlat)]);
  
  const diffs: {
    path: string;
    type: 'added' | 'removed' | 'changed';
    oldValue?: any;
    newValue?: any;
  }[] = [];
  
  for (const key of allKeys) {
    const oldValue = oldFlat[key];
    const newValue = newFlat[key];
    
    if (oldValue === undefined) {
      diffs.push({ path: key, type: 'added', newValue });
    } else if (newValue === undefined) {
      diffs.push({ path: key, type: 'removed', oldValue });
    } else if (oldValue !== newValue) {
      diffs.push({ path: key, type: 'changed', oldValue, newValue });
    }
  }
  
  return diffs;
}

// =============================================================================
// Platform and Runtime Detection
// =============================================================================

/**
 * Get current platform information
 */
export function getPlatformInfo() {
  return {
    platform: platform(),
    arch: process.arch,
    nodeVersion: process.version,
    pid: process.pid,
    cwd: process.cwd(),
    home: homedir(),
    env: detectEnvironment()
  };
}

/**
 * Check if running in specific environment
 */
export function isEnvironment(env: Environment): boolean {
  return detectEnvironment() === env;
}

/**
 * Check if running in development
 */
export function isDevelopment(): boolean {
  return isEnvironment('development');
}

/**
 * Check if running in production
 */
export function isProduction(): boolean {
  return isEnvironment('production');
}

/**
 * Check if running in test environment
 */
export function isTest(): boolean {
  return isEnvironment('test');
}

// =============================================================================
// Formatting and Serialization
// =============================================================================

/**
 * Format configuration for display
 */
export function formatConfig(
  config: ConfigObject,
  options: {
    format?: 'json' | 'yaml' | 'table';
    indent?: number;
    hideSecrets?: boolean;
    maxDepth?: number;
  } = {}
): string {
  const {
    format = 'json',
    indent = 2,
    hideSecrets = true,
    maxDepth = Infinity
  } = options;

  // Clone and optionally hide secrets
  let processedConfig = deepClone(config);
  
  if (hideSecrets) {
    processedConfig = hideConfigSecrets(processedConfig);
  }
  
  // Limit depth if specified
  if (maxDepth < Infinity) {
    processedConfig = limitConfigDepth(processedConfig, maxDepth);
  }

  switch (format) {
    case 'json':
      return JSON.stringify(processedConfig, null, indent);
    
    case 'yaml':
      // Would need yaml library for full implementation
      return JSON.stringify(processedConfig, null, indent);
    
    case 'table':
      return formatConfigAsTable(processedConfig);
    
    default:
      return JSON.stringify(processedConfig, null, indent);
  }
}

/**
 * Hide secrets in configuration
 */
function hideConfigSecrets(config: ConfigObject): ConfigObject {
  const sensitiveKeys = [
    'secret', 'password', 'apikey', 'token', 'key', 'private',
    'auth', 'credential', 'pass', 'pwd'
  ];
  
  const result = deepClone(config);
  
  function hideSensitive(obj: any, path: string[] = []): void {
    if (!isObject(obj)) return;
    
    for (const [key, value] of Object.entries(obj)) {
      const fullPath = [...path, key].join('.').toLowerCase();
      const keyLower = key.toLowerCase();
      
      const isSensitive = sensitiveKeys.some(sensitiveKey =>
        keyLower.includes(sensitiveKey) || fullPath.includes(sensitiveKey)
      );
      
      if (isSensitive && isString(value)) {
        obj[key] = '***';
      } else if (isObject(value)) {
        hideSensitive(value, [...path, key]);
      }
    }
  }
  
  hideSensitive(result);
  return result;
}

/**
 * Limit configuration depth
 */
function limitConfigDepth(config: ConfigObject, maxDepth: number): ConfigObject {
  function limitDepth(obj: any, currentDepth: number): any {
    if (currentDepth >= maxDepth) {
      return '[Object]';
    }
    
    if (!isObject(obj) || Array.isArray(obj)) {
      return obj;
    }
    
    const result: any = {};
    for (const [key, value] of Object.entries(obj)) {
      result[key] = limitDepth(value, currentDepth + 1);
    }
    
    return result;
  }
  
  return limitDepth(config, 0);
}

/**
 * Format configuration as table
 */
function formatConfigAsTable(config: ConfigObject): string {
  const flat = flattenConfig(config);
  const entries = Object.entries(flat);
  
  if (entries.length === 0) {
    return 'No configuration found';
  }
  
  const maxKeyLength = Math.max(...entries.map(([key]) => key.length));
  const lines = entries.map(([key, value]) => {
    const paddedKey = key.padEnd(maxKeyLength);
    const stringValue = typeof value === 'string' ? value : JSON.stringify(value);
    return `${paddedKey} | ${stringValue}`;
  });
  
  return lines.join('\n');
}

// =============================================================================
// Checksum and Hashing
// =============================================================================

/**
 * Generate configuration checksum
 */
export function generateConfigChecksum(config: ConfigObject): string {
  // Simple hash implementation - would use crypto in real implementation
  const str = JSON.stringify(config, Object.keys(config).sort());
  let hash = 0;
  
  for (let i = 0; i < str.length; i++) {
    const char = str.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash; // Convert to 32bit integer
  }
  
  return Math.abs(hash).toString(16);
}

/**
 * Verify configuration checksum
 */
export function verifyConfigChecksum(
  config: ConfigObject,
  expectedChecksum: string
): boolean {
  const actualChecksum = generateConfigChecksum(config);
  return actualChecksum === expectedChecksum;
}
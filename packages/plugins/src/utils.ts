/**
 * Plugin utilities for CF-Better-Auth
 */

import { nanoid } from 'nanoid';
import { PLUGIN_PRIORITY_VALUES, PLUGIN_VALIDATION_RULES } from './constants';
import type { 
  BasePlugin, 
  PluginPriority, 
  ValidationResult,
  PluginPerformanceMetrics,
  PluginHealthStatus 
} from '@cf-auth/types';
import { InvalidPluginError } from './errors';

/**
 * Generate unique plugin ID
 */
export function generatePluginId(): string {
  return `plugin-${nanoid(12)}`;
}

/**
 * Validate plugin ID format
 */
export function isValidPluginId(id: string): boolean {
  return PLUGIN_VALIDATION_RULES.ID_PATTERN.test(id);
}

/**
 * Validate plugin version format (semver)
 */
export function isValidVersion(version: string): boolean {
  return PLUGIN_VALIDATION_RULES.VERSION_PATTERN.test(version);
}

/**
 * Compare plugin versions
 */
export function compareVersions(version1: string, version2: string): number {
  const v1Parts = version1.split('.').map(Number);
  const v2Parts = version2.split('.').map(Number);
  
  for (let i = 0; i < Math.max(v1Parts.length, v2Parts.length); i++) {
    const v1Part = v1Parts[i] || 0;
    const v2Part = v2Parts[i] || 0;
    
    if (v1Part > v2Part) return 1;
    if (v1Part < v2Part) return -1;
  }
  
  return 0;
}

/**
 * Check if version satisfies requirement
 */
export function satisfiesVersion(version: string, requirement: string): boolean {
  // Simple implementation - can be enhanced with full semver support
  if (requirement.startsWith('^')) {
    const reqVersion = requirement.slice(1);
    const [reqMajor] = reqVersion.split('.').map(Number);
    const [verMajor] = version.split('.').map(Number);
    return verMajor === reqMajor && compareVersions(version, reqVersion) >= 0;
  }
  
  if (requirement.startsWith('~')) {
    const reqVersion = requirement.slice(1);
    const [reqMajor, reqMinor] = reqVersion.split('.').map(Number);
    const [verMajor, verMinor] = version.split('.').map(Number);
    return verMajor === reqMajor && verMinor === reqMinor && compareVersions(version, reqVersion) >= 0;
  }
  
  if (requirement.startsWith('>=')) {
    return compareVersions(version, requirement.slice(2)) >= 0;
  }
  
  if (requirement.startsWith('<=')) {
    return compareVersions(version, requirement.slice(2)) <= 0;
  }
  
  if (requirement.startsWith('>')) {
    return compareVersions(version, requirement.slice(1)) > 0;
  }
  
  if (requirement.startsWith('<')) {
    return compareVersions(version, requirement.slice(1)) < 0;
  }
  
  return version === requirement;
}

/**
 * Sort plugins by priority
 */
export function sortPluginsByPriority(plugins: BasePlugin[]): BasePlugin[] {
  return plugins.sort((a, b) => {
    const priorityA = PLUGIN_PRIORITY_VALUES[a.priority || 'normal'];
    const priorityB = PLUGIN_PRIORITY_VALUES[b.priority || 'normal'];
    return priorityB - priorityA; // Higher priority first
  });
}

/**
 * Get plugin priority numeric value
 */
export function getPluginPriorityValue(priority: PluginPriority): number {
  return PLUGIN_PRIORITY_VALUES[priority];
}

/**
 * Deep clone object
 */
export function deepClone<T>(obj: T): T {
  if (obj === null || typeof obj !== 'object') {
    return obj;
  }
  
  if (obj instanceof Date) {
    return new Date(obj.getTime()) as any;
  }
  
  if (obj instanceof Array) {
    return obj.map(item => deepClone(item)) as any;
  }
  
  if (typeof obj === 'object') {
    const cloned: any = {};
    Object.keys(obj).forEach(key => {
      cloned[key] = deepClone((obj as any)[key]);
    });
    return cloned;
  }
  
  return obj;
}

/**
 * Merge configuration objects deeply
 */
export function mergeConfig<T extends Record<string, any>>(
  defaultConfig: T,
  userConfig: Partial<T>
): T {
  const result = deepClone(defaultConfig);
  
  Object.keys(userConfig).forEach(key => {
    const userValue = userConfig[key];
    const defaultValue = result[key];
    
    if (userValue !== undefined) {
      if (
        typeof userValue === 'object' &&
        userValue !== null &&
        !Array.isArray(userValue) &&
        typeof defaultValue === 'object' &&
        defaultValue !== null &&
        !Array.isArray(defaultValue)
      ) {
        result[key] = mergeConfig(defaultValue, userValue);
      } else {
        result[key] = userValue;
      }
    }
  });
  
  return result;
}

/**
 * Sanitize plugin name for file system
 */
export function sanitizePluginName(name: string): string {
  return name
    .toLowerCase()
    .replace(/[^a-z0-9-_]/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '');
}

/**
 * Generate plugin slug from name
 */
export function generatePluginSlug(name: string): string {
  return sanitizePluginName(name);
}

/**
 * Validate plugin name
 */
export function validatePluginName(name: string): ValidationResult {
  const errors: any[] = [];
  
  if (!name || name.trim().length === 0) {
    errors.push({
      path: 'name',
      message: 'Plugin name is required',
      value: name,
    });
  }
  
  if (name.length < PLUGIN_VALIDATION_RULES.NAME_MIN_LENGTH) {
    errors.push({
      path: 'name',
      message: `Plugin name must be at least ${PLUGIN_VALIDATION_RULES.NAME_MIN_LENGTH} characters long`,
      value: name,
    });
  }
  
  if (name.length > PLUGIN_VALIDATION_RULES.NAME_MAX_LENGTH) {
    errors.push({
      path: 'name',
      message: `Plugin name must not exceed ${PLUGIN_VALIDATION_RULES.NAME_MAX_LENGTH} characters`,
      value: name,
    });
  }
  
  return {
    valid: errors.length === 0,
    errors: errors.length > 0 ? errors : undefined,
  };
}

/**
 * Validate plugin description
 */
export function validatePluginDescription(description?: string): ValidationResult {
  const errors: any[] = [];
  
  if (description && description.length > PLUGIN_VALIDATION_RULES.DESCRIPTION_MAX_LENGTH) {
    errors.push({
      path: 'description',
      message: `Plugin description must not exceed ${PLUGIN_VALIDATION_RULES.DESCRIPTION_MAX_LENGTH} characters`,
      value: description,
    });
  }
  
  return {
    valid: errors.length === 0,
    errors: errors.length > 0 ? errors : undefined,
  };
}

/**
 * Create performance metrics snapshot
 */
export function createPerformanceSnapshot(
  pluginId: string,
  loadTime: number = 0,
  hookExecutionTimes: Record<string, number> = {}
): PluginPerformanceMetrics {
  const memoryUsage = process.memoryUsage();
  
  return {
    pluginId,
    loadTime,
    memoryUsage: Math.round(memoryUsage.heapUsed / 1024 / 1024), // Convert to MB
    cpuUsage: process.cpuUsage().user / 1000000, // Convert to percentage
    hookExecutionTimes,
    errorCount: 0,
    lastActivity: new Date(),
  };
}

/**
 * Calculate plugin health score
 */
export function calculateHealthScore(
  performance: PluginPerformanceMetrics,
  errorThreshold: number = 5,
  memoryThreshold: number = 100, // MB
  cpuThreshold: number = 50 // %
): number {
  let score = 100;
  
  // Deduct points for errors
  if (performance.errorCount > 0) {
    score -= Math.min(performance.errorCount * 10, 50);
  }
  
  // Deduct points for high memory usage
  if (performance.memoryUsage > memoryThreshold) {
    const memoryPenalty = Math.min((performance.memoryUsage - memoryThreshold) / memoryThreshold * 30, 30);
    score -= memoryPenalty;
  }
  
  // Deduct points for high CPU usage
  if (performance.cpuUsage > cpuThreshold) {
    const cpuPenalty = Math.min((performance.cpuUsage - cpuThreshold) / cpuThreshold * 20, 20);
    score -= cpuPenalty;
  }
  
  return Math.max(Math.round(score), 0);
}

/**
 * Create health status from performance metrics
 */
export function createHealthStatus(
  pluginId: string,
  performance: PluginPerformanceMetrics
): PluginHealthStatus {
  const score = calculateHealthScore(performance);
  const issues: any[] = [];
  
  let status: 'healthy' | 'warning' | 'error' | 'unknown' = 'healthy';
  
  if (performance.errorCount > 5) {
    status = 'error';
    issues.push({
      type: 'errors',
      severity: 'error',
      message: `Plugin has ${performance.errorCount} errors`,
      action: 'Check plugin logs and fix errors',
    });
  } else if (performance.errorCount > 0) {
    status = 'warning';
    issues.push({
      type: 'errors',
      severity: 'warning',
      message: `Plugin has ${performance.errorCount} errors`,
      action: 'Monitor error frequency',
    });
  }
  
  if (performance.memoryUsage > 200) {
    status = status === 'healthy' ? 'error' : status;
    issues.push({
      type: 'memory',
      severity: 'error',
      message: `High memory usage: ${performance.memoryUsage}MB`,
      action: 'Optimize memory usage or increase limits',
    });
  } else if (performance.memoryUsage > 100) {
    status = status === 'healthy' ? 'warning' : status;
    issues.push({
      type: 'memory',
      severity: 'warning',
      message: `Moderate memory usage: ${performance.memoryUsage}MB`,
      action: 'Monitor memory usage trends',
    });
  }
  
  if (performance.cpuUsage > 80) {
    status = status === 'healthy' ? 'error' : status;
    issues.push({
      type: 'cpu',
      severity: 'error',
      message: `High CPU usage: ${performance.cpuUsage.toFixed(2)}%`,
      action: 'Optimize CPU-intensive operations',
    });
  } else if (performance.cpuUsage > 50) {
    status = status === 'healthy' ? 'warning' : status;
    issues.push({
      type: 'cpu',
      severity: 'warning',
      message: `Moderate CPU usage: ${performance.cpuUsage.toFixed(2)}%`,
      action: 'Monitor CPU usage patterns',
    });
  }
  
  return {
    pluginId,
    status,
    score,
    issues,
    lastCheck: new Date(),
  };
}

/**
 * Debounce function calls
 */
export function debounce<T extends (...args: any[]) => any>(
  fn: T,
  delay: number
): T {
  let timeoutId: NodeJS.Timeout;
  
  return ((...args: any[]) => {
    clearTimeout(timeoutId);
    timeoutId = setTimeout(() => fn(...args), delay);
  }) as T;
}

/**
 * Throttle function calls
 */
export function throttle<T extends (...args: any[]) => any>(
  fn: T,
  limit: number
): T {
  let inThrottle: boolean;
  
  return ((...args: any[]) => {
    if (!inThrottle) {
      fn(...args);
      inThrottle = true;
      setTimeout(() => (inThrottle = false), limit);
    }
  }) as T;
}

/**
 * Create timeout promise
 */
export function withTimeout<T>(
  promise: Promise<T>,
  ms: number,
  errorMessage: string = 'Operation timed out'
): Promise<T> {
  const timeoutPromise = new Promise<never>((_, reject) => {
    setTimeout(() => reject(new Error(errorMessage)), ms);
  });
  
  return Promise.race([promise, timeoutPromise]);
}

/**
 * Retry function with exponential backoff
 */
export async function retryWithBackoff<T>(
  fn: () => Promise<T>,
  maxRetries: number = 3,
  baseDelay: number = 1000,
  maxDelay: number = 10000
): Promise<T> {
  let lastError: Error;
  
  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      return await fn();
    } catch (error) {
      lastError = error as Error;
      
      if (attempt === maxRetries) {
        break;
      }
      
      const delay = Math.min(baseDelay * Math.pow(2, attempt), maxDelay);
      await new Promise(resolve => setTimeout(resolve, delay));
    }
  }
  
  throw lastError!;
}

/**
 * Format file size
 */
export function formatFileSize(bytes: number): string {
  const sizes = ['B', 'KB', 'MB', 'GB', 'TB'];
  if (bytes === 0) return '0 B';
  
  const i = Math.floor(Math.log(bytes) / Math.log(1024));
  return Math.round(bytes / Math.pow(1024, i) * 100) / 100 + ' ' + sizes[i];
}

/**
 * Format duration in milliseconds
 */
export function formatDuration(ms: number): string {
  if (ms < 1000) {
    return `${ms}ms`;
  }
  
  const seconds = Math.floor(ms / 1000);
  const minutes = Math.floor(seconds / 60);
  const hours = Math.floor(minutes / 60);
  
  if (hours > 0) {
    return `${hours}h ${minutes % 60}m ${seconds % 60}s`;
  }
  
  if (minutes > 0) {
    return `${minutes}m ${seconds % 60}s`;
  }
  
  return `${seconds}s`;
}

/**
 * Check if code is running in development mode
 */
export function isDevelopment(): boolean {
  return process.env.NODE_ENV === 'development';
}

/**
 * Check if code is running in production mode
 */
export function isProduction(): boolean {
  return process.env.NODE_ENV === 'production';
}

/**
 * Get environment variable with fallback
 */
export function getEnvVar(name: string, fallback?: string): string | undefined {
  return process.env[name] || fallback;
}

/**
 * Safe JSON parse with fallback
 */
export function safeJSONParse<T = any>(json: string, fallback: T): T {
  try {
    return JSON.parse(json);
  } catch {
    return fallback;
  }
}

/**
 * Safe JSON stringify
 */
export function safeJSONStringify(obj: any, replacer?: any, space?: number): string {
  try {
    return JSON.stringify(obj, replacer, space);
  } catch {
    return '{}';
  }
}
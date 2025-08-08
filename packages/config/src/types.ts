/**
 * CF-Auth Configuration Types
 * 
 * @fileoverview Core types for the configuration system including loaders, 
 * validators, builders, and runtime management.
 * 
 * @version 0.1.0
 * @license MIT
 */

import type { z } from 'zod';
import type { 
  CFAuthConfig, 
  ConfigObject,
  DeepPartial,
  JsonValue,
  Environment 
} from '@cf-auth/types';

// =============================================================================
// Configuration Sources and Loading
// =============================================================================

/**
 * Configuration source types
 */
export type ConfigSource = 
  | 'file'
  | 'environment'
  | 'remote'
  | 'vault'
  | 'aws-secrets'
  | 'azure-keyvault'
  | 'memory'
  | 'cli'
  | 'preset';

/**
 * Configuration format types
 */
export type ConfigFormat = 
  | 'json'
  | 'yaml'
  | 'yml' 
  | 'toml'
  | 'env'
  | 'js'
  | 'ts';

/**
 * Configuration loader interface
 */
export interface ConfigLoader<T = ConfigObject> {
  readonly source: ConfigSource;
  readonly format?: ConfigFormat;
  load(path?: string, options?: ConfigLoaderOptions): Promise<T>;
  validate?(config: unknown): config is T;
  transform?(config: unknown): T;
}

/**
 * Configuration loader options
 */
export interface ConfigLoaderOptions {
  /** Environment to load configuration for */
  environment?: Environment;
  /** Whether to throw on missing files */
  required?: boolean;
  /** Custom validation schema */
  schema?: z.ZodSchema;
  /** Transformation functions to apply */
  transforms?: ConfigTransform[];
  /** Interpolation options */
  interpolation?: InterpolationOptions;
  /** Caching options */
  cache?: CacheOptions;
  /** Encryption options for secure values */
  encryption?: EncryptionOptions;
}

/**
 * Configuration transformation function
 */
export type ConfigTransform<T = any, R = any> = (config: T) => R | Promise<R>;

/**
 * Configuration interpolation options
 */
export interface InterpolationOptions {
  /** Enable variable interpolation */
  enabled?: boolean;
  /** Variable prefix (default: ${) */
  prefix?: string;
  /** Variable suffix (default: }) */
  suffix?: string;
  /** Allow undefined variables */
  allowUndefined?: boolean;
  /** Default values for variables */
  defaults?: Record<string, string>;
  /** Custom resolvers for variables */
  resolvers?: Record<string, VariableResolver>;
}

/**
 * Variable resolver function
 */
export type VariableResolver = (key: string, context: InterpolationContext) => string | Promise<string>;

/**
 * Interpolation context
 */
export interface InterpolationContext {
  /** Current configuration object */
  config: ConfigObject;
  /** Environment variables */
  env: NodeJS.ProcessEnv;
  /** Current working directory */
  cwd: string;
  /** Additional context variables */
  context?: Record<string, unknown>;
}

// =============================================================================
// Configuration Validation
// =============================================================================

/**
 * Configuration validation result
 */
export interface ConfigValidationResult<T = ConfigObject> {
  /** Whether validation passed */
  success: boolean;
  /** Validated and transformed data (if successful) */
  data?: T;
  /** Validation errors (if failed) */
  errors?: ConfigValidationError[];
  /** Validation warnings */
  warnings?: ConfigValidationWarning[];
}

/**
 * Configuration validation error
 */
export interface ConfigValidationError {
  /** Error code */
  code: string;
  /** Error message */
  message: string;
  /** Path to the invalid property */
  path: (string | number)[];
  /** Expected value or type */
  expected?: string;
  /** Actual value received */
  received?: unknown;
  /** Severity level */
  severity: 'error' | 'warning';
}

/**
 * Configuration validation warning
 */
export interface ConfigValidationWarning {
  /** Warning code */
  code: string;
  /** Warning message */
  message: string;
  /** Path to the property */
  path: (string | number)[];
  /** Suggested action */
  suggestion?: string;
}

/**
 * Configuration validator interface
 */
export interface ConfigValidator<T = CFAuthConfig> {
  /** Validation schema */
  readonly schema: z.ZodSchema<T>;
  /** Validate configuration */
  validate(config: unknown): ConfigValidationResult<T>;
  /** Validate partial configuration */
  validatePartial(config: unknown): ConfigValidationResult<DeepPartial<T>>;
  /** Add custom validation rule */
  addRule(rule: ValidationRule): void;
  /** Remove validation rule */
  removeRule(name: string): void;
}

/**
 * Custom validation rule
 */
export interface ValidationRule {
  /** Rule name */
  name: string;
  /** Rule description */
  description?: string;
  /** Validation function */
  validate: (value: unknown, path: (string | number)[], config: ConfigObject) => ValidationRuleResult;
  /** Priority (higher runs first) */
  priority?: number;
}

/**
 * Validation rule result
 */
export interface ValidationRuleResult {
  /** Whether validation passed */
  success: boolean;
  /** Error message if failed */
  message?: string;
  /** Transformed value */
  value?: unknown;
}

// =============================================================================
// Configuration Building and Merging
// =============================================================================

/**
 * Configuration builder interface
 */
export interface ConfigBuilder<T = CFAuthConfig> {
  /** Set a configuration value */
  set<K extends keyof T>(key: K, value: T[K]): ConfigBuilder<T>;
  /** Set multiple configuration values */
  setMany(values: DeepPartial<T>): ConfigBuilder<T>;
  /** Get a configuration value */
  get<K extends keyof T>(key: K): T[K] | undefined;
  /** Remove a configuration value */
  unset<K extends keyof T>(key: K): ConfigBuilder<T>;
  /** Merge with another configuration */
  merge(config: DeepPartial<T>): ConfigBuilder<T>;
  /** Apply a preset */
  preset(name: string): ConfigBuilder<T>;
  /** Apply transformation */
  transform(transformer: ConfigTransform<T>): ConfigBuilder<T>;
  /** Validate the configuration */
  validate(): ConfigValidationResult<T>;
  /** Build the final configuration */
  build(): T;
  /** Build with validation */
  buildSafe(): ConfigValidationResult<T>;
}

/**
 * Configuration merger options
 */
export interface ConfigMergerOptions {
  /** Merge strategy for arrays */
  arrayMerge?: 'replace' | 'concat' | 'merge';
  /** Whether to clone objects */
  clone?: boolean;
  /** Custom merge functions */
  customMerge?: Record<string, MergeFunction>;
  /** Properties to ignore during merge */
  ignore?: string[];
}

/**
 * Custom merge function
 */
export type MergeFunction = (target: unknown, source: unknown, path: string[]) => unknown;

// =============================================================================
// Configuration Management and Watching
// =============================================================================

/**
 * Configuration manager interface
 */
export interface ConfigManager<T = CFAuthConfig> {
  /** Current configuration */
  readonly config: T;
  /** Configuration source information */
  readonly sources: ConfigSourceInfo[];
  /** Load configuration */
  load(options?: ConfigManagerOptions): Promise<void>;
  /** Reload configuration */
  reload(): Promise<void>;
  /** Watch for configuration changes */
  watch(callback: ConfigChangeCallback<T>): ConfigWatcher;
  /** Stop watching for changes */
  unwatch(): void;
  /** Get configuration value */
  get<K extends keyof T>(key: K): T[K];
  /** Set configuration value */
  set<K extends keyof T>(key: K, value: T[K]): void;
  /** Update multiple configuration values */
  update(values: DeepPartial<T>): void;
  /** Validate current configuration */
  validate(): ConfigValidationResult<T>;
  /** Export configuration */
  export(format?: ConfigFormat): string;
  /** Create a snapshot */
  snapshot(): ConfigSnapshot<T>;
  /** Restore from snapshot */
  restore(snapshot: ConfigSnapshot<T>): void;
}

/**
 * Configuration manager options
 */
export interface ConfigManagerOptions extends ConfigLoaderOptions {
  /** Configuration sources to load from */
  sources?: ConfigSourceConfig[];
  /** Watch for file changes */
  watch?: boolean;
  /** Auto-reload on changes */
  autoReload?: boolean;
  /** Validation options */
  validation?: ValidationOptions;
}

/**
 * Configuration source configuration
 */
export interface ConfigSourceConfig {
  /** Source type */
  type: ConfigSource;
  /** Source path or identifier */
  path?: string;
  /** Source format */
  format?: ConfigFormat;
  /** Source priority (higher loads later) */
  priority?: number;
  /** Whether source is required */
  required?: boolean;
  /** Source-specific options */
  options?: Record<string, unknown>;
}

/**
 * Configuration source information
 */
export interface ConfigSourceInfo extends ConfigSourceConfig {
  /** When the source was last loaded */
  loadedAt: Date;
  /** Source loading status */
  status: 'pending' | 'loaded' | 'error';
  /** Error if loading failed */
  error?: Error;
  /** Source metadata */
  metadata?: Record<string, unknown>;
}

/**
 * Configuration change callback
 */
export type ConfigChangeCallback<T = CFAuthConfig> = (changes: ConfigChange<T>) => void | Promise<void>;

/**
 * Configuration change information
 */
export interface ConfigChange<T = CFAuthConfig> {
  /** Change type */
  type: 'added' | 'modified' | 'removed' | 'reload';
  /** Changed property path */
  path?: (string | number)[];
  /** Old value */
  oldValue?: unknown;
  /** New value */
  newValue?: unknown;
  /** Full configuration before change */
  oldConfig: T;
  /** Full configuration after change */
  newConfig: T;
  /** Source that triggered the change */
  source?: ConfigSourceInfo;
  /** Timestamp of change */
  timestamp: Date;
}

/**
 * Configuration watcher interface
 */
export interface ConfigWatcher {
  /** Whether the watcher is active */
  readonly active: boolean;
  /** Files being watched */
  readonly paths: string[];
  /** Start watching */
  start(): Promise<void>;
  /** Stop watching */
  stop(): Promise<void>;
  /** Add path to watch */
  add(path: string): void;
  /** Remove path from watching */
  remove(path: string): void;
}

/**
 * Configuration snapshot
 */
export interface ConfigSnapshot<T = CFAuthConfig> {
  /** Snapshot ID */
  id: string;
  /** Configuration data */
  config: T;
  /** Snapshot timestamp */
  timestamp: Date;
  /** Source information */
  sources: ConfigSourceInfo[];
  /** Snapshot metadata */
  metadata?: Record<string, unknown>;
}

// =============================================================================
// Presets and Profiles
// =============================================================================

/**
 * Configuration preset
 */
export interface ConfigPreset<T = CFAuthConfig> {
  /** Preset name */
  name: string;
  /** Preset description */
  description?: string;
  /** Preset version */
  version?: string;
  /** Preset configuration */
  config: DeepPartial<T>;
  /** Preset dependencies */
  extends?: string[];
  /** Environment conditions */
  condition?: PresetCondition;
  /** Preset metadata */
  metadata?: Record<string, unknown>;
}

/**
 * Preset condition for conditional loading
 */
export interface PresetCondition {
  /** Environment condition */
  environment?: Environment | Environment[];
  /** Platform condition */
  platform?: NodeJS.Platform | NodeJS.Platform[];
  /** Custom condition function */
  custom?: (context: PresetContext) => boolean | Promise<boolean>;
}

/**
 * Preset context for condition evaluation
 */
export interface PresetContext {
  /** Current environment */
  environment: Environment;
  /** Current platform */
  platform: NodeJS.Platform;
  /** Environment variables */
  env: NodeJS.ProcessEnv;
  /** Current working directory */
  cwd: string;
  /** Current configuration */
  config: ConfigObject;
}

// =============================================================================
// Caching and Performance
// =============================================================================

/**
 * Configuration cache options
 */
export interface CacheOptions {
  /** Whether caching is enabled */
  enabled?: boolean;
  /** Cache TTL in milliseconds */
  ttl?: number;
  /** Maximum cache size */
  maxSize?: number;
  /** Cache storage adapter */
  adapter?: CacheAdapter;
}

/**
 * Cache adapter interface
 */
export interface CacheAdapter {
  /** Get value from cache */
  get<T = unknown>(key: string): Promise<T | undefined>;
  /** Set value in cache */
  set<T = unknown>(key: string, value: T, ttl?: number): Promise<void>;
  /** Delete value from cache */
  delete(key: string): Promise<boolean>;
  /** Clear entire cache */
  clear(): Promise<void>;
  /** Check if key exists */
  has(key: string): Promise<boolean>;
}

// =============================================================================
// Security and Encryption
// =============================================================================

/**
 * Configuration encryption options
 */
export interface EncryptionOptions {
  /** Encryption algorithm */
  algorithm?: string;
  /** Encryption key */
  key?: string;
  /** Key derivation options */
  keyDerivation?: KeyDerivationOptions;
  /** Properties to encrypt */
  encrypt?: string[];
  /** Properties to decrypt */
  decrypt?: string[];
}

/**
 * Key derivation options
 */
export interface KeyDerivationOptions {
  /** Salt for key derivation */
  salt?: string;
  /** Number of iterations */
  iterations?: number;
  /** Derived key length */
  keyLength?: number;
  /** Hash algorithm for derivation */
  digest?: string;
}

// =============================================================================
// Remote Configuration
// =============================================================================

/**
 * Remote configuration options
 */
export interface RemoteConfigOptions {
  /** Remote endpoint URL */
  url: string;
  /** Authentication method */
  auth?: RemoteAuthConfig;
  /** Request headers */
  headers?: Record<string, string>;
  /** Request timeout in milliseconds */
  timeout?: number;
  /** Retry options */
  retry?: RetryOptions;
  /** Polling interval for updates */
  pollInterval?: number;
  /** Response format */
  format?: ConfigFormat;
}

/**
 * Remote authentication configuration
 */
export interface RemoteAuthConfig {
  /** Authentication type */
  type: 'bearer' | 'basic' | 'apikey' | 'oauth2';
  /** Authentication credentials */
  credentials: Record<string, string>;
}

/**
 * Retry options
 */
export interface RetryOptions {
  /** Number of retry attempts */
  attempts?: number;
  /** Delay between retries in milliseconds */
  delay?: number;
  /** Exponential backoff factor */
  backoff?: number;
  /** Maximum delay */
  maxDelay?: number;
}

// =============================================================================
// Validation Options
// =============================================================================

/**
 * Validation options
 */
export interface ValidationOptions {
  /** Whether validation is strict */
  strict?: boolean;
  /** Whether to allow unknown properties */
  allowUnknown?: boolean;
  /** Whether to coerce types */
  coerce?: boolean;
  /** Whether to strip unknown properties */
  stripUnknown?: boolean;
  /** Custom validation schema */
  schema?: z.ZodSchema;
  /** Additional validation rules */
  rules?: ValidationRule[];
}

// =============================================================================
// Type Utilities
// =============================================================================

/**
 * Extract configuration type from loader
 */
export type LoaderConfig<T> = T extends ConfigLoader<infer U> ? U : never;

/**
 * Extract configuration type from validator
 */
export type ValidatorConfig<T> = T extends ConfigValidator<infer U> ? U : never;

/**
 * Extract configuration type from builder
 */
export type BuilderConfig<T> = T extends ConfigBuilder<infer U> ? U : never;

/**
 * Extract configuration type from manager
 */
export type ManagerConfig<T> = T extends ConfigManager<infer U> ? U : never;

/**
 * Configuration with metadata
 */
export interface ConfigWithMetadata<T = CFAuthConfig> {
  /** Configuration data */
  config: T;
  /** Configuration metadata */
  metadata: ConfigMetadata;
}

/**
 * Configuration metadata
 */
export interface ConfigMetadata {
  /** Configuration version */
  version?: string;
  /** Last modified timestamp */
  lastModified?: Date;
  /** Configuration sources */
  sources?: string[];
  /** Configuration checksum */
  checksum?: string;
  /** Custom metadata */
  [key: string]: unknown;
}

/**
 * Configuration factory function
 */
export type ConfigFactory<T = CFAuthConfig> = (options?: ConfigFactoryOptions) => T | Promise<T>;

/**
 * Configuration factory options
 */
export interface ConfigFactoryOptions {
  /** Environment to create config for */
  environment?: Environment;
  /** Additional context */
  context?: Record<string, unknown>;
}

// =============================================================================
// Export helpers
// =============================================================================

/**
 * Configuration export format
 */
export type ConfigExportFormat = ConfigFormat;

/**
 * Configuration export options
 */
export interface ConfigExportOptions {
  /** Export format */
  format: ConfigExportFormat;
  /** Whether to include metadata */
  includeMetadata?: boolean;
  /** Whether to include comments */
  includeComments?: boolean;
  /** Properties to exclude */
  exclude?: string[];
  /** Properties to include only */
  include?: string[];
  /** Whether to format output */
  format_output?: boolean;
  /** Indentation for formatted output */
  indent?: number | string;
}

/**
 * Re-export commonly used types from @cf-auth/types
 */
export type {
  CFAuthConfig,
  ConfigObject,
  DeepPartial,
  JsonValue,
  Environment
} from '@cf-auth/types';
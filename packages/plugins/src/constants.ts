/**
 * Plugin system constants for CF-Better-Auth
 */

/**
 * Plugin lifecycle phases
 */
export const PLUGIN_LIFECYCLE = {
  INITIALIZE: 'initialize' as const,
  BEFORE_REGISTER: 'beforeRegister' as const,
  AFTER_REGISTER: 'afterRegister' as const,
  BEFORE_UNREGISTER: 'beforeUnregister' as const,
  AFTER_UNREGISTER: 'afterUnregister' as const,
  DESTROY: 'destroy' as const,
} as const;

/**
 * Plugin types
 */
export const PLUGIN_TYPE = {
  SERVER: 'server' as const,
  CLIENT: 'client' as const,
  UNIVERSAL: 'universal' as const,
  ADAPTER: 'adapter' as const,
  MIDDLEWARE: 'middleware' as const,
  AUTH_PROVIDER: 'auth-provider' as const,
  DATABASE: 'database' as const,
  UI_COMPONENT: 'ui-component' as const,
  EXTENSION: 'extension' as const,
} as const;

/**
 * Plugin status
 */
export const PLUGIN_STATUS = {
  INACTIVE: 'inactive' as const,
  LOADING: 'loading' as const,
  ACTIVE: 'active' as const,
  ERROR: 'error' as const,
  DISABLED: 'disabled' as const,
  DEPRECATED: 'deprecated' as const,
} as const;

/**
 * Plugin priority levels
 */
export const PLUGIN_PRIORITY = {
  LOWEST: 'lowest' as const,
  LOW: 'low' as const,
  NORMAL: 'normal' as const,
  HIGH: 'high' as const,
  HIGHEST: 'highest' as const,
} as const;

/**
 * Plugin priority numeric values
 */
export const PLUGIN_PRIORITY_VALUES = {
  [PLUGIN_PRIORITY.LOWEST]: 0,
  [PLUGIN_PRIORITY.LOW]: 25,
  [PLUGIN_PRIORITY.NORMAL]: 50,
  [PLUGIN_PRIORITY.HIGH]: 75,
  [PLUGIN_PRIORITY.HIGHEST]: 100,
} as const;

/**
 * Plugin events
 */
export const PLUGIN_EVENTS = {
  // Registry events
  PLUGIN_REGISTERED: 'plugin:registered' as const,
  PLUGIN_UNREGISTERED: 'plugin:unregistered' as const,
  PLUGIN_ENABLED: 'plugin:enabled' as const,
  PLUGIN_DISABLED: 'plugin:disabled' as const,
  PLUGIN_LOADED: 'plugin:loaded' as const,
  PLUGIN_UNLOADED: 'plugin:unloaded' as const,
  PLUGIN_ERROR: 'plugin:error' as const,
  PLUGIN_UPDATED: 'plugin:updated' as const,
  
  // Lifecycle events
  PLUGIN_INITIALIZING: 'plugin:initializing' as const,
  PLUGIN_INITIALIZED: 'plugin:initialized' as const,
  PLUGIN_DESTROYING: 'plugin:destroying' as const,
  PLUGIN_DESTROYED: 'plugin:destroyed' as const,
  
  // Hook events
  HOOK_BEFORE_EXECUTE: 'hook:before-execute' as const,
  HOOK_AFTER_EXECUTE: 'hook:after-execute' as const,
  HOOK_ERROR: 'hook:error' as const,
  
  // Context events
  CONTEXT_CREATED: 'context:created' as const,
  CONTEXT_UPDATED: 'context:updated' as const,
  CONTEXT_DESTROYED: 'context:destroyed' as const,
} as const;

/**
 * Built-in hook names
 */
export const BUILT_IN_HOOKS = {
  // Authentication hooks
  BEFORE_REGISTER: 'beforeRegister' as const,
  AFTER_REGISTER: 'afterRegister' as const,
  BEFORE_LOGIN: 'beforeLogin' as const,
  AFTER_LOGIN: 'afterLogin' as const,
  BEFORE_LOGOUT: 'beforeLogout' as const,
  AFTER_LOGOUT: 'afterLogout' as const,
  
  // Token hooks
  BEFORE_TOKEN_GENERATION: 'beforeTokenGeneration' as const,
  AFTER_TOKEN_GENERATION: 'afterTokenGeneration' as const,
  BEFORE_TOKEN_VERIFICATION: 'beforeTokenVerification' as const,
  AFTER_TOKEN_VERIFICATION: 'afterTokenVerification' as const,
  
  // Password hooks
  BEFORE_PASSWORD_HASH: 'beforePasswordHash' as const,
  AFTER_PASSWORD_HASH: 'afterPasswordHash' as const,
  
  // Session hooks
  BEFORE_SESSION_CREATE: 'beforeSessionCreate' as const,
  AFTER_SESSION_CREATE: 'afterSessionCreate' as const,
  BEFORE_SESSION_UPDATE: 'beforeSessionUpdate' as const,
  AFTER_SESSION_UPDATE: 'afterSessionUpdate' as const,
  BEFORE_SESSION_DELETE: 'beforeSessionDelete' as const,
  AFTER_SESSION_DELETE: 'afterSessionDelete' as const,
  
  // Client hooks
  BEFORE_SIGN_IN: 'beforeSignIn' as const,
  AFTER_SIGN_IN: 'afterSignIn' as const,
  BEFORE_SIGN_OUT: 'beforeSignOut' as const,
  AFTER_SIGN_OUT: 'afterSignOut' as const,
  ON_AUTH_STATE_CHANGE: 'onAuthStateChange' as const,
  BEFORE_ROUTE_CHANGE: 'beforeRouteChange' as const,
  AFTER_ROUTE_CHANGE: 'afterRouteChange' as const,
} as const;

/**
 * Plugin configuration keys
 */
export const PLUGIN_CONFIG_KEYS = {
  ID: 'id' as const,
  NAME: 'name' as const,
  VERSION: 'version' as const,
  DESCRIPTION: 'description' as const,
  TYPE: 'type' as const,
  ENABLED: 'enabled' as const,
  CONFIG: 'config' as const,
  DEPENDENCIES: 'dependencies' as const,
  PRIORITY: 'priority' as const,
  METADATA: 'metadata' as const,
} as const;

/**
 * Default plugin configuration
 */
export const DEFAULT_PLUGIN_CONFIG = {
  enabled: true,
  priority: PLUGIN_PRIORITY.NORMAL,
  enabledByDefault: false,
  type: PLUGIN_TYPE.UNIVERSAL,
} as const;

/**
 * Plugin validation rules
 */
export const PLUGIN_VALIDATION_RULES = {
  ID_PATTERN: /^[a-z0-9-_]+$/,
  VERSION_PATTERN: /^\d+\.\d+\.\d+(-[a-zA-Z0-9-]+)?(\+[a-zA-Z0-9-]+)?$/,
  NAME_MIN_LENGTH: 3,
  NAME_MAX_LENGTH: 50,
  DESCRIPTION_MAX_LENGTH: 500,
} as const;

/**
 * Plugin security settings
 */
export const PLUGIN_SECURITY = {
  DEFAULT_MEMORY_LIMIT: 128, // MB
  DEFAULT_CPU_TIME_LIMIT: 5000, // ms
  DEFAULT_SANDBOX_TIMEOUT: 30000, // ms
  MAX_PLUGIN_SIZE: 50 * 1024 * 1024, // 50MB
  ALLOWED_FILE_EXTENSIONS: ['.js', '.mjs', '.ts', '.json'],
  BLOCKED_MODULES: [
    'child_process',
    'cluster',
    'dgram',
    'dns',
    'net',
    'tls',
    'worker_threads',
  ],
} as const;

/**
 * Plugin directories
 */
export const PLUGIN_DIRECTORIES = {
  PLUGINS: 'plugins',
  NODE_MODULES: 'node_modules',
  CACHE: '.cache/plugins',
  CONFIG: 'config/plugins',
  LOGS: 'logs/plugins',
  TMP: 'tmp/plugins',
} as const;

/**
 * Plugin file names
 */
export const PLUGIN_FILES = {
  MANIFEST: 'plugin.json',
  PACKAGE: 'package.json',
  INDEX: 'index.js',
  TYPES: 'index.d.ts',
  README: 'README.md',
  CHANGELOG: 'CHANGELOG.md',
  LICENSE: 'LICENSE',
} as const;

/**
 * Plugin registry endpoints
 */
export const PLUGIN_REGISTRY_ENDPOINTS = {
  SEARCH: '/plugins/search',
  INFO: '/plugins/info',
  INSTALL: '/plugins/install',
  UPDATE: '/plugins/update',
  VERSIONS: '/plugins/versions',
} as const;

/**
 * HTTP status codes for plugin operations
 */
export const PLUGIN_HTTP_STATUS = {
  SUCCESS: 200,
  CREATED: 201,
  NO_CONTENT: 204,
  BAD_REQUEST: 400,
  UNAUTHORIZED: 401,
  FORBIDDEN: 403,
  NOT_FOUND: 404,
  CONFLICT: 409,
  UNPROCESSABLE_ENTITY: 422,
  INTERNAL_SERVER_ERROR: 500,
} as const;

/**
 * Plugin error codes
 */
export const PLUGIN_ERROR_CODES = {
  INVALID_PLUGIN: 'INVALID_PLUGIN',
  PLUGIN_NOT_FOUND: 'PLUGIN_NOT_FOUND',
  PLUGIN_ALREADY_REGISTERED: 'PLUGIN_ALREADY_REGISTERED',
  PLUGIN_DEPENDENCY_NOT_FOUND: 'PLUGIN_DEPENDENCY_NOT_FOUND',
  PLUGIN_CIRCULAR_DEPENDENCY: 'PLUGIN_CIRCULAR_DEPENDENCY',
  PLUGIN_INCOMPATIBLE_VERSION: 'PLUGIN_INCOMPATIBLE_VERSION',
  PLUGIN_LOAD_ERROR: 'PLUGIN_LOAD_ERROR',
  PLUGIN_INIT_ERROR: 'PLUGIN_INIT_ERROR',
  PLUGIN_CONFIG_ERROR: 'PLUGIN_CONFIG_ERROR',
  PLUGIN_HOOK_ERROR: 'PLUGIN_HOOK_ERROR',
  PLUGIN_SANDBOX_ERROR: 'PLUGIN_SANDBOX_ERROR',
  PLUGIN_SECURITY_ERROR: 'PLUGIN_SECURITY_ERROR',
  PLUGIN_REGISTRY_ERROR: 'PLUGIN_REGISTRY_ERROR',
} as const;

/**
 * Plugin health check intervals
 */
export const PLUGIN_HEALTH_CHECK = {
  DEFAULT_INTERVAL: 60000, // 1 minute
  PERFORMANCE_INTERVAL: 30000, // 30 seconds
  MEMORY_CHECK_INTERVAL: 10000, // 10 seconds
  ERROR_THRESHOLD: 5,
  MEMORY_WARNING_THRESHOLD: 0.8, // 80%
  CPU_WARNING_THRESHOLD: 0.9, // 90%
} as const;

/**
 * Plugin cache settings
 */
export const PLUGIN_CACHE = {
  DEFAULT_TTL: 3600000, // 1 hour
  MAX_CACHE_SIZE: 1000,
  CLEANUP_INTERVAL: 300000, // 5 minutes
} as const;
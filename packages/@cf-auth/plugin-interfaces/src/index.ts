/**
 * CF-Better-Auth Plugin Interfaces
 * 
 * This package provides comprehensive TypeScript interfaces and types for developing
 * plugins in the CF-Better-Auth ecosystem. It includes server-side plugin interfaces,
 * client-side plugin interfaces, hooks system, and utility types.
 * 
 * @version 1.0.0
 * @author CF-Better-Auth Team
 * @license MIT
 */

// ============================================================================
// Server Plugin Interfaces
// ============================================================================

export type {
  // Core Plugin Interface
  BetterAuthPlugin,
  PluginDependency,
  PluginLoadContext,
  
  // Endpoint System
  AuthEndpoint,
  EndpointHandler,
  EndpointContext,
  PluginUtils,
  
  // Database Schema
  DatabaseSchema,
  TableDefinition,
  Column,
  ColumnType,
  ForeignKey,
  UniqueConstraint,
  TableIndex,
  TableOptions,
  Migration,
  TypeDefinition,
  Index,
  Relation,
  
  // Plugin Hooks
  PluginHooks,
  RequestContext,
  ResponseContext,
  ErrorContext,
  
  // Middleware
  Middleware,
  MiddlewareContext,
  
  // Rate Limiting
  RateLimitConfig,
  RateLimitStore,
  
  // Validation
  ValidationSchema,
  ValidationRule,
  
  // Configuration
  PluginOptions,
  CORSConfig,
  EmailOptions,
  EmailAttachment,
  
  // Core Entities
  User,
  Session,
  SignInData,
  SignUpData,
  
  // Database
  DatabaseAdapter,
  DatabaseTransaction
} from './server';

// ============================================================================
// Client Plugin Interfaces
// ============================================================================

export type {
  // Core Client Plugin Interface
  BetterAuthClientPlugin,
  InferServerPlugin,
  InferClientActions,
  
  // Client Actions
  ClientActions,
  BaseClientActions,
  CallOptions,
  RetryConfig,
  CacheConfig,
  
  // State Management
  ClientAtoms,
  BaseClientAtoms,
  ComputedAtom,
  AsyncAtom,
  AsyncState,
  StateManager,
  
  // React Hooks
  ClientHooks,
  BaseClientHooks,
  
  // Event System
  ClientEventListeners,
  NetworkError,
  AuthError,
  ClientEventEmitter,
  
  // Plugin Context
  ClientPluginContext,
  ClientStorage,
  ClientLogger,
  
  // Configuration
  ClientPluginOptions,
  
  // Fetch System
  FetchFunction,
  FetchOptions,
  
  // Plugin Composition
  ComposedClientPlugin,
  ClientPluginFactory,
  
  // Error Handling
  ErrorHandler,
  ErrorBoundary
} from './client';

// ============================================================================
// Hooks and Middleware System
// ============================================================================

export type {
  // Hook Registry
  HookRegistry,
  HookUnsubscribe,
  HookOptions,
  
  // Complete Hook Map
  HookMap,
  
  // Authentication Hook Types
  BeforeSignInHook,
  AfterSignInHook,
  BeforeSignUpHook,
  AfterSignUpHook,
  BeforeSignOutHook,
  AfterSignOutHook,
  SignInFailedHook,
  SignUpFailedHook,
  
  // Session Hook Types
  BeforeSessionCreateHook,
  AfterSessionCreateHook,
  BeforeSessionUpdateHook,
  AfterSessionUpdateHook,
  BeforeSessionDeleteHook,
  AfterSessionDeleteHook,
  SessionExpiredHook,
  BeforeSessionValidateHook,
  AfterSessionValidateHook,
  
  // User Hook Types
  BeforeUserCreateHook,
  AfterUserCreateHook,
  BeforeUserUpdateHook,
  AfterUserUpdateHook,
  BeforeUserDeleteHook,
  AfterUserDeleteHook,
  BeforeVerifyEmailHook,
  AfterVerifyEmailHook,
  BeforeResetPasswordHook,
  AfterResetPasswordHook,
  
  // Request/Response Hook Types
  BeforeRequestHook,
  AfterRequestHook,
  BeforeResponseHook,
  AfterResponseHook,
  RequestErrorHook,
  
  // Database Hook Types
  BeforeDbQueryHook,
  AfterDbQueryHook,
  DbErrorHook,
  BeforeTransactionHook,
  AfterCommitHook,
  AfterRollbackHook,
  
  // Security Hook Types
  BeforeRateLimitHook,
  RateLimitExceededHook,
  BeforeCsrfHook,
  CsrfFailedHook,
  SecurityEventHook,
  SuspiciousActivityHook,
  
  // Plugin Hook Types
  BeforePluginLoadHook,
  AfterPluginLoadHook,
  BeforePluginUnloadHook,
  AfterPluginUnloadHook,
  PluginErrorHook,
  
  // Context Types
  BaseContext,
  SignInContext,
  PostSignInContext,
  SignUpContext,
  PostSignUpContext,
  SignOutContext,
  PostSignOutContext,
  SignInFailedContext,
  SignUpFailedContext,
  CreateSessionContext,
  PostCreateSessionContext,
  UpdateSessionContext,
  PostUpdateSessionContext,
  DeleteSessionContext,
  PostDeleteSessionContext,
  SessionExpiredContext,
  ValidateSessionContext,
  PostValidateSessionContext,
  CreateUserContext,
  PostCreateUserContext,
  UpdateUserContext,
  PostUpdateUserContext,
  DeleteUserContext,
  PostDeleteUserContext,
  VerifyEmailContext,
  PostVerifyEmailContext,
  ResetPasswordContext,
  PostResetPasswordContext,
  PostRequestContext,
  DbQueryContext,
  PostDbQueryContext,
  DbErrorContext,
  TransactionContext,
  PostCommitContext,
  PostRollbackContext,
  RateLimitContext,
  RateLimitExceededContext,
  CsrfContext,
  CsrfFailedContext,
  SecurityEventContext,
  SuspiciousActivityContext,
  PluginLoadContext,
  PostPluginLoadContext,
  PluginUnloadContext,
  PostPluginUnloadContext,
  PluginErrorContext,
  
  // Middleware Integration
  HookMiddleware
} from './hooks';

// ============================================================================
// Utility Types
// ============================================================================

/**
 * Extract plugin configuration from plugin type
 */
export type ExtractPluginConfig<T extends BetterAuthPlugin> = T['options'];

/**
 * Extract plugin endpoints from plugin type
 */
export type ExtractPluginEndpoints<T extends BetterAuthPlugin> = T['endpoints'];

/**
 * Extract plugin schema from plugin type
 */
export type ExtractPluginSchema<T extends BetterAuthPlugin> = T['schema'];

/**
 * Extract plugin hooks from plugin type
 */
export type ExtractPluginHooks<T extends BetterAuthPlugin> = T['hooks'];

/**
 * Create a plugin with required fields
 */
export type CreatePlugin<
  TId extends string,
  TOptions extends PluginOptions = PluginOptions
> = {
  id: TId;
  options?: TOptions;
} & Partial<Omit<BetterAuthPlugin, 'id' | 'options'>>;

/**
 * Plugin factory function type
 */
export type PluginFactory<
  TOptions extends PluginOptions = PluginOptions,
  TPlugin extends BetterAuthPlugin = BetterAuthPlugin
> = (options?: TOptions) => TPlugin;

/**
 * Extract all possible hook names from the hook map
 */
export type HookNames = keyof HookMap;

/**
 * Extract hook handler type for a specific hook
 */
export type HookHandler<T extends HookNames> = HookMap[T];

/**
 * Create a typed hook registry for specific plugins
 */
export type TypedHookRegistry<TPlugins extends readonly BetterAuthPlugin[]> = {
  [K in HookNames]: HookHandler<K>[];
} & HookRegistry;

/**
 * Plugin collection type
 */
export type PluginCollection<TPlugins extends readonly BetterAuthPlugin[]> = {
  readonly plugins: TPlugins;
  readonly hooks: TypedHookRegistry<TPlugins>;
  readonly actions: UnionToIntersection<InferClientActions<TPlugins[number]>>;
};

/**
 * Utility to convert union to intersection type
 */
type UnionToIntersection<U> = (U extends any ? (k: U) => void : never) extends (
  k: infer I
) => void
  ? I
  : never;

/**
 * Plugin metadata interface
 */
export interface PluginMetadata {
  id: string;
  name: string;
  version: string;
  description?: string;
  author?: string;
  homepage?: string;
  repository?: string;
  license?: string;
  keywords?: string[];
  dependencies?: PluginDependency[];
  peerDependencies?: Record<string, string>;
}

/**
 * Plugin manifest for package management
 */
export interface PluginManifest extends PluginMetadata {
  /** Main plugin file */
  main: string;
  
  /** Client plugin file (if separate) */
  client?: string;
  
  /** TypeScript definitions */
  types?: string;
  
  /** Plugin capabilities */
  capabilities: {
    server: boolean;
    client: boolean;
    hooks: string[];
    endpoints: string[];
    middleware: boolean;
    schema: boolean;
  };
  
  /** Runtime requirements */
  runtime: {
    node?: string;
    browser?: boolean;
    nextjs?: string;
    react?: string;
  };
}

// ============================================================================
// Constants and Defaults
// ============================================================================

/**
 * Default plugin options
 */
export const DEFAULT_PLUGIN_OPTIONS: PluginOptions = {
  enabled: true
};

/**
 * Default client plugin options
 */
export const DEFAULT_CLIENT_PLUGIN_OPTIONS: ClientPluginOptions = {
  enabled: true,
  timeout: 30000,
  retry: {
    attempts: 3,
    delay: 1000,
    backoff: 2
  }
};

/**
 * Default hook options
 */
export const DEFAULT_HOOK_OPTIONS: HookOptions = {
  priority: 100,
  async: true,
  once: false
};

/**
 * Common HTTP status codes for plugin endpoints
 */
export const HTTP_STATUS = {
  OK: 200,
  CREATED: 201,
  NO_CONTENT: 204,
  BAD_REQUEST: 400,
  UNAUTHORIZED: 401,
  FORBIDDEN: 403,
  NOT_FOUND: 404,
  CONFLICT: 409,
  UNPROCESSABLE_ENTITY: 422,
  TOO_MANY_REQUESTS: 429,
  INTERNAL_SERVER_ERROR: 500,
  NOT_IMPLEMENTED: 501,
  SERVICE_UNAVAILABLE: 503
} as const;

/**
 * Common MIME types
 */
export const MIME_TYPES = {
  JSON: 'application/json',
  HTML: 'text/html',
  TEXT: 'text/plain',
  XML: 'application/xml',
  FORM_URLENCODED: 'application/x-www-form-urlencoded',
  MULTIPART_FORM: 'multipart/form-data'
} as const;

// ============================================================================
// Re-exports from submodules
// ============================================================================

export * from './server';
export * from './client';
export * from './hooks';

// ============================================================================
// Version and Package Info
// ============================================================================

/**
 * Package version
 */
export const VERSION = '1.0.0';

/**
 * Package name
 */
export const PACKAGE_NAME = '@cf-auth/plugin-interfaces';

/**
 * Minimum supported better-auth version
 */
export const MIN_BETTER_AUTH_VERSION = '1.0.0';

/**
 * API version for compatibility
 */
export const API_VERSION = '1.0';

/**
 * Package metadata
 */
export const PACKAGE_INFO = {
  name: PACKAGE_NAME,
  version: VERSION,
  apiVersion: API_VERSION,
  minBetterAuthVersion: MIN_BETTER_AUTH_VERSION
} as const;
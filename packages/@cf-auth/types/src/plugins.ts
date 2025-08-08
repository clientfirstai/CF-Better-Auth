/**
 * Plugin system types for CF-Better-Auth
 * Defines interfaces for both server and client-side plugins
 */

import type { User, Session, Organization, Team } from './auth';
import type { DatabaseConnection } from './database';
import type { ApiRequest, ApiResponseBase } from './api';
import type { EventHandler, Middleware, ConfigObject, Builder } from './common';

/**
 * Plugin lifecycle phases
 */
export type PluginLifecycle = 
  | 'initialize'
  | 'beforeRegister'
  | 'afterRegister'
  | 'beforeUnregister'
  | 'afterUnregister'
  | 'destroy';

/**
 * Plugin types
 */
export type PluginType = 
  | 'server'
  | 'client'
  | 'universal'
  | 'adapter'
  | 'middleware'
  | 'auth-provider'
  | 'database'
  | 'ui-component'
  | 'extension';

/**
 * Plugin status
 */
export type PluginStatus = 
  | 'inactive'
  | 'loading'
  | 'active'
  | 'error'
  | 'disabled'
  | 'deprecated';

/**
 * Plugin priority levels
 */
export type PluginPriority = 
  | 'lowest'
  | 'low'
  | 'normal'
  | 'high'
  | 'highest';

/**
 * Base plugin interface
 */
export interface BasePlugin {
  /** Unique plugin identifier */
  id: string;
  
  /** Plugin name */
  name: string;
  
  /** Plugin version */
  version: string;
  
  /** Plugin description */
  description?: string;
  
  /** Plugin author */
  author?: string;
  
  /** Plugin homepage */
  homepage?: string;
  
  /** Plugin repository */
  repository?: string;
  
  /** Plugin license */
  license?: string;
  
  /** Plugin keywords */
  keywords?: string[];
  
  /** Plugin type */
  type: PluginType;
  
  /** Plugin dependencies */
  dependencies?: string[];
  
  /** Plugin peer dependencies */
  peerDependencies?: string[];
  
  /** Plugin optional dependencies */
  optionalDependencies?: string[];
  
  /** CF-Better-Auth version compatibility */
  engines?: {
    cfBetterAuth?: string;
    betterAuth?: string;
    node?: string;
  };
  
  /** Plugin configuration schema */
  configSchema?: PluginConfigSchema;
  
  /** Default plugin configuration */
  defaultConfig?: ConfigObject;
  
  /** Plugin priority */
  priority?: PluginPriority;
  
  /** Whether plugin is enabled by default */
  enabledByDefault?: boolean;
  
  /** Plugin metadata */
  metadata?: PluginMetadata;
}

/**
 * Plugin metadata
 */
export interface PluginMetadata {
  /** Plugin categories */
  categories?: string[];
  
  /** Plugin tags */
  tags?: string[];
  
  /** Plugin icons */
  icons?: {
    light?: string;
    dark?: string;
  };
  
  /** Plugin screenshots */
  screenshots?: string[];
  
  /** Plugin documentation */
  documentation?: string;
  
  /** Plugin changelog */
  changelog?: string;
  
  /** Plugin support information */
  support?: {
    email?: string;
    url?: string;
    issues?: string;
  };
  
  /** Custom metadata */
  custom?: Record<string, any>;
}

/**
 * Plugin configuration schema
 */
export interface PluginConfigSchema {
  type: 'object';
  properties: Record<string, PluginConfigProperty>;
  required?: string[];
  additionalProperties?: boolean;
}

/**
 * Plugin configuration property
 */
export interface PluginConfigProperty {
  type: 'string' | 'number' | 'boolean' | 'object' | 'array';
  description?: string;
  default?: any;
  enum?: any[];
  minimum?: number;
  maximum?: number;
  minLength?: number;
  maxLength?: number;
  pattern?: string;
  format?: string;
  items?: PluginConfigProperty;
  properties?: Record<string, PluginConfigProperty>;
  required?: string[];
}

/**
 * Plugin context interface
 */
export interface PluginContext {
  /** Plugin configuration */
  config: ConfigObject;
  
  /** Plugin logger */
  logger: PluginLogger;
  
  /** Plugin registry */
  registry: PluginRegistry;
  
  /** Plugin storage */
  storage: PluginStorage;
  
  /** Plugin events */
  events: PluginEventEmitter;
  
  /** Plugin utilities */
  utils: PluginUtils;
  
  /** Core CF-Better-Auth instance */
  auth: AuthInstance;
  
  /** Database connection */
  database?: DatabaseConnection;
  
  /** Environment variables */
  env: Record<string, string>;
  
  /** Plugin metadata */
  metadata: Record<string, any>;
}

/**
 * Plugin logger interface
 */
export interface PluginLogger {
  debug: (message: string, ...args: any[]) => void;
  info: (message: string, ...args: any[]) => void;
  warn: (message: string, ...args: any[]) => void;
  error: (message: string, ...args: any[]) => void;
  trace: (message: string, ...args: any[]) => void;
  child: (metadata: Record<string, any>) => PluginLogger;
}

/**
 * Plugin storage interface
 */
export interface PluginStorage {
  get: <T = any>(key: string) => Promise<T | null>;
  set: <T = any>(key: string, value: T, ttl?: number) => Promise<void>;
  delete: (key: string) => Promise<void>;
  exists: (key: string) => Promise<boolean>;
  keys: (pattern?: string) => Promise<string[]>;
  clear: () => Promise<void>;
}

/**
 * Plugin event emitter interface
 */
export interface PluginEventEmitter {
  on: <T = any>(event: string, handler: EventHandler<T>) => void;
  off: <T = any>(event: string, handler: EventHandler<T>) => void;
  once: <T = any>(event: string, handler: EventHandler<T>) => void;
  emit: <T = any>(event: string, data?: T) => Promise<void>;
  listenerCount: (event: string) => number;
  removeAllListeners: (event?: string) => void;
}

/**
 * Plugin utilities interface
 */
export interface PluginUtils {
  /** Generate unique ID */
  generateId: () => string;
  
  /** Hash function */
  hash: (data: string | Buffer) => string;
  
  /** Encrypt function */
  encrypt: (data: string, key?: string) => string;
  
  /** Decrypt function */
  decrypt: (data: string, key?: string) => string;
  
  /** Validate configuration */
  validateConfig: (config: any, schema: PluginConfigSchema) => ValidationResult;
  
  /** Parse JWT token */
  parseJWT: (token: string) => any;
  
  /** Generate JWT token */
  generateJWT: (payload: any, options?: JWTOptions) => string;
  
  /** HTTP client */
  http: PluginHttpClient;
  
  /** File system utilities */
  fs: PluginFileSystem;
  
  /** Path utilities */
  path: PluginPathUtils;
}

/**
 * Validation result
 */
export interface ValidationResult {
  valid: boolean;
  errors?: ValidationError[];
}

/**
 * Validation error
 */
export interface ValidationError {
  path: string;
  message: string;
  value?: any;
}

/**
 * JWT options
 */
export interface JWTOptions {
  expiresIn?: string | number;
  issuer?: string;
  audience?: string;
  subject?: string;
  notBefore?: string | number;
  algorithm?: string;
}

/**
 * Plugin HTTP client interface
 */
export interface PluginHttpClient {
  get: <T = any>(url: string, options?: HttpRequestOptions) => Promise<HttpResponse<T>>;
  post: <T = any>(url: string, data?: any, options?: HttpRequestOptions) => Promise<HttpResponse<T>>;
  put: <T = any>(url: string, data?: any, options?: HttpRequestOptions) => Promise<HttpResponse<T>>;
  patch: <T = any>(url: string, data?: any, options?: HttpRequestOptions) => Promise<HttpResponse<T>>;
  delete: <T = any>(url: string, options?: HttpRequestOptions) => Promise<HttpResponse<T>>;
  request: <T = any>(options: HttpRequestOptions) => Promise<HttpResponse<T>>;
}

/**
 * HTTP request options
 */
export interface HttpRequestOptions {
  url?: string;
  method?: string;
  headers?: Record<string, string>;
  params?: Record<string, any>;
  data?: any;
  timeout?: number;
  retries?: number;
  retryDelay?: number;
}

/**
 * HTTP response interface
 */
export interface HttpResponse<T = any> {
  data: T;
  status: number;
  statusText: string;
  headers: Record<string, string>;
}

/**
 * Plugin file system interface
 */
export interface PluginFileSystem {
  readFile: (path: string, encoding?: string) => Promise<string | Buffer>;
  writeFile: (path: string, data: string | Buffer) => Promise<void>;
  exists: (path: string) => Promise<boolean>;
  mkdir: (path: string, options?: { recursive?: boolean }) => Promise<void>;
  readdir: (path: string) => Promise<string[]>;
  stat: (path: string) => Promise<FileStats>;
  unlink: (path: string) => Promise<void>;
  rmdir: (path: string, options?: { recursive?: boolean }) => Promise<void>;
}

/**
 * File statistics
 */
export interface FileStats {
  size: number;
  isFile: boolean;
  isDirectory: boolean;
  createdAt: Date;
  modifiedAt: Date;
}

/**
 * Plugin path utilities
 */
export interface PluginPathUtils {
  join: (...paths: string[]) => string;
  resolve: (...paths: string[]) => string;
  relative: (from: string, to: string) => string;
  dirname: (path: string) => string;
  basename: (path: string, ext?: string) => string;
  extname: (path: string) => string;
  isAbsolute: (path: string) => boolean;
  normalize: (path: string) => string;
}

/**
 * Auth instance interface (simplified)
 */
export interface AuthInstance {
  getUser: (userId: string) => Promise<User | null>;
  getSession: (sessionId: string) => Promise<Session | null>;
  createUser: (userData: any) => Promise<User>;
  updateUser: (userId: string, userData: any) => Promise<User>;
  deleteUser: (userId: string) => Promise<void>;
  signIn: (credentials: any) => Promise<{ user: User; session: Session }>;
  signOut: (sessionId: string) => Promise<void>;
  verifyToken: (token: string) => Promise<any>;
  generateToken: (payload: any, options?: any) => string;
}

/**
 * Server plugin interface
 */
export interface ServerPlugin extends BasePlugin {
  type: 'server' | 'universal';
  
  /** Initialize plugin */
  initialize?: (context: PluginContext) => Promise<void> | void;
  
  /** Plugin lifecycle hooks */
  hooks?: ServerPluginHooks;
  
  /** Plugin middleware */
  middleware?: ServerPluginMiddleware[];
  
  /** Plugin routes */
  routes?: ServerPluginRoute[];
  
  /** Plugin database migrations */
  migrations?: DatabaseMigration[];
  
  /** Plugin cleanup function */
  destroy?: (context: PluginContext) => Promise<void> | void;
}

/**
 * Server plugin hooks
 */
export interface ServerPluginHooks {
  /** Before user registration */
  beforeRegister?: (userData: any, context: PluginContext) => Promise<any> | any;
  
  /** After user registration */
  afterRegister?: (user: User, context: PluginContext) => Promise<void> | void;
  
  /** Before user login */
  beforeLogin?: (credentials: any, context: PluginContext) => Promise<any> | any;
  
  /** After user login */
  afterLogin?: (user: User, session: Session, context: PluginContext) => Promise<void> | void;
  
  /** Before user logout */
  beforeLogout?: (sessionId: string, context: PluginContext) => Promise<void> | void;
  
  /** After user logout */
  afterLogout?: (sessionId: string, context: PluginContext) => Promise<void> | void;
  
  /** Before token generation */
  beforeTokenGeneration?: (payload: any, context: PluginContext) => Promise<any> | any;
  
  /** After token generation */
  afterTokenGeneration?: (token: string, payload: any, context: PluginContext) => Promise<string> | string;
  
  /** Before token verification */
  beforeTokenVerification?: (token: string, context: PluginContext) => Promise<string> | string;
  
  /** After token verification */
  afterTokenVerification?: (payload: any, context: PluginContext) => Promise<any> | any;
  
  /** Before password hash */
  beforePasswordHash?: (password: string, context: PluginContext) => Promise<string> | string;
  
  /** After password hash */
  afterPasswordHash?: (hashedPassword: string, context: PluginContext) => Promise<string> | string;
  
  /** Custom hooks */
  [key: string]: ((data: any, context: PluginContext) => Promise<any> | any) | undefined;
}

/**
 * Server plugin middleware
 */
export interface ServerPluginMiddleware {
  /** Middleware name */
  name: string;
  
  /** Middleware path pattern */
  path?: string | RegExp;
  
  /** HTTP methods */
  methods?: string[];
  
  /** Middleware priority */
  priority?: PluginPriority;
  
  /** Middleware handler */
  handler: (req: ApiRequest, res: ApiResponseBase, next: () => void) => Promise<void> | void;
}

/**
 * Server plugin route
 */
export interface ServerPluginRoute {
  /** Route method */
  method: 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE';
  
  /** Route path */
  path: string;
  
  /** Route handler */
  handler: (req: ApiRequest, res: ApiResponseBase) => Promise<void> | void;
  
  /** Route middleware */
  middleware?: ServerPluginMiddleware[];
  
  /** Route authentication required */
  auth?: boolean;
  
  /** Required permissions */
  permissions?: string[];
  
  /** Rate limiting */
  rateLimit?: {
    max: number;
    windowMs: number;
  };
}

/**
 * Database migration
 */
export interface DatabaseMigration {
  /** Migration ID */
  id: string;
  
  /** Migration name */
  name: string;
  
  /** Migration version */
  version: string;
  
  /** Up migration */
  up: (db: DatabaseConnection) => Promise<void>;
  
  /** Down migration */
  down: (db: DatabaseConnection) => Promise<void>;
  
  /** Migration dependencies */
  dependencies?: string[];
}

/**
 * Client plugin interface
 */
export interface ClientPlugin extends BasePlugin {
  type: 'client' | 'universal';
  
  /** Initialize plugin */
  initialize?: (context: ClientPluginContext) => Promise<void> | void;
  
  /** Plugin hooks */
  hooks?: ClientPluginHooks;
  
  /** Plugin components */
  components?: ClientPluginComponent[];
  
  /** Plugin providers */
  providers?: ClientPluginProvider[];
  
  /** Plugin utilities */
  utils?: ClientPluginUtilities;
  
  /** Plugin cleanup function */
  destroy?: (context: ClientPluginContext) => Promise<void> | void;
}

/**
 * Client plugin context
 */
export interface ClientPluginContext extends Omit<PluginContext, 'database'> {
  /** Client-specific utilities */
  client: ClientPluginClient;
  
  /** Router instance */
  router?: ClientRouter;
  
  /** State management */
  state?: ClientStateManager;
}

/**
 * Client plugin client interface
 */
export interface ClientPluginClient {
  /** Make authenticated API requests */
  request: <T = any>(options: HttpRequestOptions) => Promise<HttpResponse<T>>;
  
  /** Get current user */
  getCurrentUser: () => Promise<User | null>;
  
  /** Get current session */
  getCurrentSession: () => Promise<Session | null>;
  
  /** Sign in */
  signIn: (credentials: any) => Promise<{ user: User; session: Session }>;
  
  /** Sign out */
  signOut: () => Promise<void>;
  
  /** Subscribe to auth events */
  onAuthStateChange: (callback: (user: User | null, session: Session | null) => void) => () => void;
}

/**
 * Client router interface
 */
export interface ClientRouter {
  /** Navigate to route */
  push: (path: string, state?: any) => void;
  
  /** Replace current route */
  replace: (path: string, state?: any) => void;
  
  /** Go back */
  back: () => void;
  
  /** Go forward */
  forward: () => void;
  
  /** Get current path */
  getCurrentPath: () => string;
  
  /** Listen to route changes */
  listen: (callback: (path: string, state?: any) => void) => () => void;
}

/**
 * Client state manager interface
 */
export interface ClientStateManager {
  /** Get state */
  getState: <T = any>(key: string) => T | undefined;
  
  /** Set state */
  setState: <T = any>(key: string, value: T) => void;
  
  /** Subscribe to state changes */
  subscribe: <T = any>(key: string, callback: (value: T) => void) => () => void;
  
  /** Remove state */
  removeState: (key: string) => void;
  
  /** Clear all state */
  clearState: () => void;
}

/**
 * Client plugin hooks
 */
export interface ClientPluginHooks {
  /** Before sign in */
  beforeSignIn?: (credentials: any) => Promise<any> | any;
  
  /** After sign in */
  afterSignIn?: (user: User, session: Session) => Promise<void> | void;
  
  /** Before sign out */
  beforeSignOut?: () => Promise<void> | void;
  
  /** After sign out */
  afterSignOut?: () => Promise<void> | void;
  
  /** On auth state change */
  onAuthStateChange?: (user: User | null, session: Session | null) => Promise<void> | void;
  
  /** Before route change */
  beforeRouteChange?: (path: string, state?: any) => Promise<boolean> | boolean;
  
  /** After route change */
  afterRouteChange?: (path: string, state?: any) => Promise<void> | void;
  
  /** Custom hooks */
  [key: string]: ((...args: any[]) => Promise<any> | any) | undefined;
}

/**
 * Client plugin component
 */
export interface ClientPluginComponent {
  /** Component name */
  name: string;
  
  /** Component implementation */
  component: any; // React/Vue/Angular component
  
  /** Component props schema */
  propsSchema?: PluginConfigSchema;
  
  /** Component slots */
  slots?: string[];
  
  /** Component events */
  events?: string[];
}

/**
 * Client plugin provider
 */
export interface ClientPluginProvider {
  /** Provider name */
  name: string;
  
  /** Provider implementation */
  provider: any; // React/Vue/Angular provider
  
  /** Provider configuration */
  config?: ConfigObject;
}

/**
 * Client plugin utilities
 */
export interface ClientPluginUtilities {
  /** Local storage utilities */
  storage: ClientPluginStorage;
  
  /** Cookie utilities */
  cookies: ClientPluginCookies;
  
  /** DOM utilities */
  dom: ClientPluginDom;
  
  /** Form utilities */
  forms: ClientPluginForms;
  
  /** Validation utilities */
  validation: ClientPluginValidation;
}

/**
 * Client plugin storage interface
 */
export interface ClientPluginStorage {
  get: <T = any>(key: string) => T | null;
  set: <T = any>(key: string, value: T) => void;
  remove: (key: string) => void;
  clear: () => void;
  keys: () => string[];
}

/**
 * Client plugin cookies interface
 */
export interface ClientPluginCookies {
  get: (name: string) => string | null;
  set: (name: string, value: string, options?: CookieOptions) => void;
  remove: (name: string, options?: CookieOptions) => void;
  getAll: () => Record<string, string>;
}

/**
 * Cookie options
 */
export interface CookieOptions {
  expires?: Date;
  maxAge?: number;
  domain?: string;
  path?: string;
  secure?: boolean;
  httpOnly?: boolean;
  sameSite?: 'strict' | 'lax' | 'none';
}

/**
 * Client plugin DOM interface
 */
export interface ClientPluginDom {
  querySelector: (selector: string) => Element | null;
  querySelectorAll: (selector: string) => NodeList;
  createElement: (tagName: string) => Element;
  addEventListener: (element: Element, event: string, handler: EventListener) => void;
  removeEventListener: (element: Element, event: string, handler: EventListener) => void;
  ready: (callback: () => void) => void;
}

/**
 * Client plugin forms interface
 */
export interface ClientPluginForms {
  serialize: (form: HTMLFormElement) => Record<string, any>;
  validate: (form: HTMLFormElement, rules: ValidationRules) => ValidationResult;
  reset: (form: HTMLFormElement) => void;
  setErrors: (form: HTMLFormElement, errors: Record<string, string>) => void;
  clearErrors: (form: HTMLFormElement) => void;
}

/**
 * Validation rules
 */
export interface ValidationRules {
  [field: string]: ValidationRule[];
}

/**
 * Validation rule
 */
export interface ValidationRule {
  type: 'required' | 'email' | 'min' | 'max' | 'pattern' | 'custom';
  value?: any;
  message: string;
  validator?: (value: any) => boolean;
}

/**
 * Client plugin validation interface
 */
export interface ClientPluginValidation {
  validateEmail: (email: string) => boolean;
  validatePassword: (password: string, rules?: PasswordValidationRules) => ValidationResult;
  validatePhone: (phone: string) => boolean;
  validateUrl: (url: string) => boolean;
  validateRequired: (value: any) => boolean;
  validateLength: (value: string, min?: number, max?: number) => boolean;
  validatePattern: (value: string, pattern: RegExp) => boolean;
}

/**
 * Password validation rules
 */
export interface PasswordValidationRules {
  minLength?: number;
  maxLength?: number;
  requireUppercase?: boolean;
  requireLowercase?: boolean;
  requireNumbers?: boolean;
  requireSymbols?: boolean;
  customPatterns?: RegExp[];
}

/**
 * Plugin registry interface
 */
export interface PluginRegistry {
  /** Register a plugin */
  register: (plugin: BasePlugin) => Promise<void>;
  
  /** Unregister a plugin */
  unregister: (pluginId: string) => Promise<void>;
  
  /** Get plugin by ID */
  get: (pluginId: string) => BasePlugin | null;
  
  /** List all plugins */
  list: (filter?: PluginFilter) => BasePlugin[];
  
  /** Check if plugin is registered */
  has: (pluginId: string) => boolean;
  
  /** Enable plugin */
  enable: (pluginId: string) => Promise<void>;
  
  /** Disable plugin */
  disable: (pluginId: string) => Promise<void>;
  
  /** Get plugin status */
  getStatus: (pluginId: string) => PluginStatus;
  
  /** Get plugin dependencies */
  getDependencies: (pluginId: string) => string[];
  
  /** Resolve plugin dependencies */
  resolveDependencies: (pluginId: string) => string[];
  
  /** Validate plugin */
  validate: (plugin: BasePlugin) => ValidationResult;
  
  /** Load plugin from file/URL */
  load: (source: string) => Promise<BasePlugin>;
  
  /** Unload plugin */
  unload: (pluginId: string) => Promise<void>;
  
  /** Plugin events */
  on: (event: PluginRegistryEvent, handler: EventHandler) => void;
  off: (event: PluginRegistryEvent, handler: EventHandler) => void;
  emit: (event: PluginRegistryEvent, data?: any) => Promise<void>;
}

/**
 * Plugin filter
 */
export interface PluginFilter {
  type?: PluginType;
  status?: PluginStatus;
  enabled?: boolean;
  search?: string;
  tags?: string[];
  categories?: string[];
}

/**
 * Plugin registry events
 */
export type PluginRegistryEvent = 
  | 'plugin:registered'
  | 'plugin:unregistered'
  | 'plugin:enabled'
  | 'plugin:disabled'
  | 'plugin:loaded'
  | 'plugin:unloaded'
  | 'plugin:error';

/**
 * Plugin builder interface
 */
export interface PluginBuilder extends Builder<BasePlugin> {
  /** Set plugin ID */
  setId: (id: string) => PluginBuilder;
  
  /** Set plugin name */
  setName: (name: string) => PluginBuilder;
  
  /** Set plugin version */
  setVersion: (version: string) => PluginBuilder;
  
  /** Set plugin description */
  setDescription: (description: string) => PluginBuilder;
  
  /** Set plugin type */
  setType: (type: PluginType) => PluginBuilder;
  
  /** Add plugin dependency */
  addDependency: (dependency: string) => PluginBuilder;
  
  /** Set plugin configuration */
  setConfig: (config: ConfigObject) => PluginBuilder;
  
  /** Add plugin hook */
  addHook: (name: string, handler: Function) => PluginBuilder;
  
  /** Add plugin middleware */
  addMiddleware: (middleware: ServerPluginMiddleware) => PluginBuilder;
  
  /** Add plugin route */
  addRoute: (route: ServerPluginRoute) => PluginBuilder;
  
  /** Add plugin component */
  addComponent: (component: ClientPluginComponent) => PluginBuilder;
  
  /** Set plugin metadata */
  setMetadata: (metadata: PluginMetadata) => PluginBuilder;
}

/**
 * Plugin manifest interface
 */
export interface PluginManifest extends BasePlugin {
  /** Plugin entry point */
  main?: string;
  
  /** Plugin source files */
  files?: string[];
  
  /** Plugin build output */
  dist?: string;
  
  /** Plugin development dependencies */
  devDependencies?: string[];
  
  /** Plugin scripts */
  scripts?: Record<string, string>;
  
  /** Plugin configuration files */
  configFiles?: string[];
  
  /** Plugin assets */
  assets?: string[];
  
  /** Plugin localization files */
  locales?: Record<string, string>;
  
  /** Plugin themes */
  themes?: Record<string, string>;
}

/**
 * Plugin installation options
 */
export interface PluginInstallOptions {
  /** Installation source */
  source: 'npm' | 'github' | 'url' | 'file';
  
  /** Package version */
  version?: string;
  
  /** Installation directory */
  directory?: string;
  
  /** Whether to enable after installation */
  enable?: boolean;
  
  /** Plugin configuration */
  config?: ConfigObject;
  
  /** Installation metadata */
  metadata?: Record<string, any>;
}
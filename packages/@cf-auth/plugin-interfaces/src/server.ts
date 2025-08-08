/**
 * Server Plugin Interface Definitions for CF-Better-Auth
 * 
 * This module defines the complete interface structure for server-side plugins
 * in the CF-Better-Auth ecosystem. It provides type-safe plugin development
 * with comprehensive lifecycle hooks, endpoint definitions, and database schema extensions.
 */

import type { Request, Response } from 'express';

// ============================================================================
// Core Plugin Interface
// ============================================================================

export interface BetterAuthPlugin {
  /** Unique plugin identifier */
  id: string;
  
  /** Human-readable plugin name */
  name?: string;
  
  /** Plugin version */
  version?: string;
  
  /** Plugin description */
  description?: string;
  
  /** Plugin author */
  author?: string;
  
  /** Custom API endpoints */
  endpoints?: Record<string, AuthEndpoint>;
  
  /** Database schema extensions */
  schema?: DatabaseSchema;
  
  /** Lifecycle hooks */
  hooks?: PluginHooks;
  
  /** Request middlewares */
  middlewares?: Middleware[];
  
  /** Rate limiting configuration */
  rateLimit?: RateLimitConfig[];
  
  /** Plugin configuration options */
  options?: PluginOptions;
  
  /** Plugin dependencies */
  dependencies?: PluginDependency[];
  
  /** Conflicting plugins */
  conflicts?: string[];
  
  /** Plugin loading hooks */
  beforeLoad?: (context: PluginLoadContext) => Promise<void> | void;
  afterLoad?: (context: PluginLoadContext) => Promise<void> | void;
  
  /** Plugin unloading hooks */
  beforeUnload?: () => Promise<void> | void;
  afterUnload?: () => Promise<void> | void;
}

// ============================================================================
// Plugin Dependencies
// ============================================================================

export interface PluginDependency {
  /** Required plugin ID */
  pluginId: string;
  
  /** Minimum required version */
  version?: string;
  
  /** Whether this dependency is optional */
  optional?: boolean;
}

export interface PluginLoadContext {
  /** Check if a plugin is loaded */
  isPluginLoaded: (pluginId: string) => boolean;
  
  /** Get loaded plugin instance */
  getPlugin: <T = any>(pluginId: string) => T | undefined;
  
  /** Plugin configuration */
  config: PluginOptions;
  
  /** Authentication instance */
  auth: any; // Will be typed based on better-auth core
}

// ============================================================================
// Endpoint Definitions
// ============================================================================

export interface AuthEndpoint {
  /** HTTP method */
  method: 'GET' | 'POST' | 'PUT' | 'DELETE' | 'PATCH' | 'OPTIONS' | 'HEAD';
  
  /** Endpoint path (relative to /api/auth) */
  path: string;
  
  /** Request handler function */
  handler: EndpointHandler;
  
  /** Endpoint-specific middleware */
  middleware?: Middleware[];
  
  /** Rate limiting for this endpoint */
  rateLimit?: RateLimitConfig;
  
  /** Request validation schema */
  validation?: ValidationSchema;
  
  /** Whether authentication is required */
  requireAuth?: boolean;
  
  /** Required permissions/roles */
  permissions?: string[];
  
  /** CORS configuration */
  cors?: CORSConfig;
}

export type EndpointHandler = (context: EndpointContext) => Promise<Response> | Response;

export interface EndpointContext {
  /** HTTP request object */
  request: Request;
  
  /** Parsed request body */
  body: any;
  
  /** Query parameters */
  query: Record<string, string>;
  
  /** Route parameters */
  params: Record<string, string>;
  
  /** Request headers */
  headers: Headers;
  
  /** Authenticated user (if available) */
  user?: User;
  
  /** Active session (if available) */
  session?: Session;
  
  /** Database adapter */
  db: DatabaseAdapter;
  
  /** Authentication instance */
  auth: any; // Will be typed based on better-auth core
  
  /** Plugin utilities */
  utils: PluginUtils;
}

export interface PluginUtils {
  /** Generate secure random tokens */
  generateToken: (length?: number) => string;
  
  /** Hash passwords securely */
  hashPassword: (password: string) => Promise<string>;
  
  /** Verify password hashes */
  verifyPassword: (password: string, hash: string) => Promise<boolean>;
  
  /** Send emails */
  sendEmail: (options: EmailOptions) => Promise<void>;
  
  /** Log plugin events */
  log: {
    info: (message: string, data?: any) => void;
    warn: (message: string, data?: any) => void;
    error: (message: string, error?: Error) => void;
    debug: (message: string, data?: any) => void;
  };
}

// ============================================================================
// Database Schema Extensions
// ============================================================================

export interface DatabaseSchema {
  /** Table definitions */
  tables?: Record<string, TableDefinition>;
  
  /** Database migrations */
  migrations?: Migration[];
  
  /** Index definitions */
  indexes?: Index[];
  
  /** Relationship definitions */
  relations?: Relation[];
  
  /** Custom types */
  types?: TypeDefinition[];
}

export interface TableDefinition {
  /** Table name */
  name: string;
  
  /** Column definitions */
  columns: Column[];
  
  /** Primary key column(s) */
  primaryKey?: string | string[];
  
  /** Foreign key constraints */
  foreignKeys?: ForeignKey[];
  
  /** Unique constraints */
  uniqueConstraints?: UniqueConstraint[];
  
  /** Table-level indexes */
  indexes?: TableIndex[];
  
  /** Table options */
  options?: TableOptions;
}

export interface Column {
  /** Column name */
  name: string;
  
  /** Data type */
  type: ColumnType;
  
  /** Whether column is primary key */
  primaryKey?: boolean;
  
  /** Whether column allows NULL */
  nullable?: boolean;
  
  /** Whether column must be NOT NULL */
  notNull?: boolean;
  
  /** Default value */
  default?: any;
  
  /** Whether column is unique */
  unique?: boolean;
  
  /** Whether column auto-increments */
  autoIncrement?: boolean;
  
  /** Column length (for strings) */
  length?: number;
  
  /** Numeric precision */
  precision?: number;
  
  /** Numeric scale */
  scale?: number;
  
  /** Column comment */
  comment?: string;
}

export type ColumnType = 
  | 'uuid'
  | 'varchar' | 'text' | 'char'
  | 'int' | 'bigint' | 'smallint'
  | 'decimal' | 'float' | 'double'
  | 'boolean'
  | 'timestamp' | 'date' | 'time'
  | 'json' | 'jsonb'
  | 'blob' | 'bytea'
  | string; // Allow custom types

export interface ForeignKey {
  /** Local column name */
  column: string;
  
  /** Referenced table.column */
  references: string;
  
  /** ON DELETE action */
  onDelete?: 'CASCADE' | 'SET NULL' | 'RESTRICT' | 'NO ACTION';
  
  /** ON UPDATE action */
  onUpdate?: 'CASCADE' | 'SET NULL' | 'RESTRICT' | 'NO ACTION';
}

export interface UniqueConstraint {
  /** Constraint name */
  name?: string;
  
  /** Column names */
  columns: string[];
}

export interface TableIndex {
  /** Index name */
  name?: string;
  
  /** Column names */
  columns: string[];
  
  /** Whether index is unique */
  unique?: boolean;
  
  /** Index type */
  type?: 'btree' | 'hash' | 'gin' | 'gist';
  
  /** Partial index condition */
  where?: string;
}

export interface TableOptions {
  /** Table comment */
  comment?: string;
  
  /** Storage engine (MySQL) */
  engine?: string;
  
  /** Character set */
  charset?: string;
  
  /** Collation */
  collate?: string;
}

export interface Migration {
  /** Migration ID */
  id: string;
  
  /** Migration description */
  description: string;
  
  /** Migration version */
  version: string;
  
  /** Up migration function */
  up: (db: DatabaseAdapter) => Promise<void>;
  
  /** Down migration function */
  down: (db: DatabaseAdapter) => Promise<void>;
  
  /** Migration dependencies */
  dependencies?: string[];
}

// ============================================================================
// Plugin Hooks System
// ============================================================================

export interface PluginHooks {
  // Authentication Lifecycle
  beforeSignIn?: (data: SignInData) => Promise<SignInData> | SignInData;
  afterSignIn?: (session: Session) => Promise<void> | void;
  beforeSignUp?: (data: SignUpData) => Promise<SignUpData> | SignUpData;
  afterSignUp?: (user: User) => Promise<void> | void;
  beforeSignOut?: (session: Session) => Promise<void> | void;
  afterSignOut?: (context: { userId: string }) => Promise<void> | void;
  
  // Session Management
  beforeSessionCreate?: (session: Partial<Session>) => Promise<Partial<Session>> | Partial<Session>;
  afterSessionCreate?: (session: Session) => Promise<void> | void;
  beforeSessionUpdate?: (session: Partial<Session>) => Promise<Partial<Session>> | Partial<Session>;
  afterSessionUpdate?: (session: Session) => Promise<void> | void;
  beforeSessionDelete?: (session: Session) => Promise<void> | void;
  afterSessionDelete?: (context: { sessionId: string }) => Promise<void> | void;
  
  // User Management
  beforeUserCreate?: (user: Partial<User>) => Promise<Partial<User>> | Partial<User>;
  afterUserCreate?: (user: User) => Promise<void> | void;
  beforeUserUpdate?: (user: Partial<User>) => Promise<Partial<User>> | Partial<User>;
  afterUserUpdate?: (user: User) => Promise<void> | void;
  beforeUserDelete?: (user: User) => Promise<void> | void;
  afterUserDelete?: (context: { userId: string }) => Promise<void> | void;
  
  // Request Lifecycle
  beforeRequest?: (context: RequestContext) => Promise<RequestContext> | RequestContext;
  afterRequest?: (context: ResponseContext) => Promise<void> | void;
  onError?: (error: Error, context: ErrorContext) => Promise<void> | void;
  
  // Custom Events
  [customHook: string]: ((...args: any[]) => Promise<any> | any) | undefined;
}

// ============================================================================
// Context Types
// ============================================================================

export interface RequestContext {
  /** HTTP request */
  request: Request;
  
  /** Parsed body */
  body: any;
  
  /** Query parameters */
  query: Record<string, string>;
  
  /** Route parameters */
  params: Record<string, string>;
  
  /** Request metadata */
  metadata: Record<string, any>;
}

export interface ResponseContext extends RequestContext {
  /** HTTP response */
  response: Response;
  
  /** Response data */
  data: any;
  
  /** Processing time */
  processingTime: number;
}

export interface ErrorContext extends RequestContext {
  /** Error that occurred */
  error: Error;
  
  /** Error code */
  code?: string;
  
  /** Additional error metadata */
  errorMetadata: Record<string, any>;
}

// ============================================================================
// Middleware System
// ============================================================================

export type Middleware = (
  context: MiddlewareContext,
  next: () => Promise<void>
) => Promise<void> | void;

export interface MiddlewareContext {
  /** HTTP request */
  request: Request;
  
  /** HTTP response */
  response: Response;
  
  /** Authenticated user */
  user?: User;
  
  /** Active session */
  session?: Session;
  
  /** Database adapter */
  db: DatabaseAdapter;
  
  /** Plugin utilities */
  utils: PluginUtils;
  
  /** Request metadata */
  metadata: Record<string, any>;
}

// ============================================================================
// Rate Limiting
// ============================================================================

export interface RateLimitConfig {
  /** Endpoint path pattern */
  path?: string;
  
  /** HTTP method */
  method?: string;
  
  /** Time window in milliseconds */
  windowMs: number;
  
  /** Maximum requests per window */
  max: number;
  
  /** Rate limit identifier function */
  keyGenerator?: (context: EndpointContext) => string;
  
  /** Custom rate limit message */
  message?: string;
  
  /** Skip rate limiting function */
  skip?: (context: EndpointContext) => boolean;
  
  /** Rate limit store */
  store?: RateLimitStore;
}

export interface RateLimitStore {
  /** Increment counter */
  incr: (key: string) => Promise<{ totalHits: number; timeToExpire?: number }>;
  
  /** Reset counter */
  resetKey: (key: string) => Promise<void>;
  
  /** Reset all counters */
  resetAll?: () => Promise<void>;
}

// ============================================================================
// Validation System
// ============================================================================

export interface ValidationSchema {
  /** Body validation */
  body?: ValidationRule;
  
  /** Query validation */
  query?: ValidationRule;
  
  /** Params validation */
  params?: ValidationRule;
  
  /** Headers validation */
  headers?: ValidationRule;
}

export interface ValidationRule {
  type: 'object' | 'array' | 'string' | 'number' | 'boolean';
  properties?: Record<string, ValidationRule>;
  items?: ValidationRule;
  required?: string[];
  minLength?: number;
  maxLength?: number;
  min?: number;
  max?: number;
  pattern?: string;
  enum?: any[];
  custom?: (value: any) => boolean | string;
}

// ============================================================================
// Configuration
// ============================================================================

export interface PluginOptions {
  /** Whether plugin is enabled */
  enabled?: boolean;
  
  /** Plugin-specific configuration */
  [key: string]: any;
}

export interface CORSConfig {
  /** Allowed origins */
  origin?: string | string[] | ((origin: string) => boolean);
  
  /** Allowed methods */
  methods?: string[];
  
  /** Allowed headers */
  allowedHeaders?: string[];
  
  /** Exposed headers */
  exposedHeaders?: string[];
  
  /** Whether to include credentials */
  credentials?: boolean;
  
  /** Preflight cache max age */
  maxAge?: number;
}

export interface EmailOptions {
  /** Recipient email */
  to: string;
  
  /** Sender email */
  from?: string;
  
  /** Email subject */
  subject: string;
  
  /** HTML content */
  html?: string;
  
  /** Plain text content */
  text?: string;
  
  /** Email template */
  template?: string;
  
  /** Template variables */
  variables?: Record<string, any>;
  
  /** Attachments */
  attachments?: EmailAttachment[];
}

export interface EmailAttachment {
  /** Filename */
  filename: string;
  
  /** Content */
  content: string | Buffer;
  
  /** Content type */
  contentType?: string;
  
  /** Content disposition */
  disposition?: 'attachment' | 'inline';
}

// ============================================================================
// Core Entity Types
// ============================================================================

export interface User {
  id: string;
  email: string;
  name?: string;
  image?: string;
  emailVerified: boolean;
  createdAt: Date;
  updatedAt: Date;
  [key: string]: any;
}

export interface Session {
  id: string;
  userId: string;
  user?: User;
  expiresAt: Date;
  createdAt: Date;
  updatedAt: Date;
  [key: string]: any;
}

export interface SignInData {
  email?: string;
  password?: string;
  provider?: string;
  [key: string]: any;
}

export interface SignUpData {
  email: string;
  password?: string;
  name?: string;
  [key: string]: any;
}

// ============================================================================
// Database Adapter
// ============================================================================

export interface DatabaseAdapter {
  /** Execute raw query */
  query: (sql: string, params?: any[]) => Promise<any[]>;
  
  /** Insert record */
  insert: (table: string, data: Record<string, any>) => Promise<any>;
  
  /** Update records */
  update: (table: string, data: Record<string, any>, where: Record<string, any>) => Promise<any>;
  
  /** Delete records */
  delete: (table: string, where: Record<string, any>) => Promise<any>;
  
  /** Find records */
  find: (table: string, where?: Record<string, any>) => Promise<any[]>;
  
  /** Find single record */
  findOne: (table: string, where: Record<string, any>) => Promise<any>;
  
  /** Begin transaction */
  beginTransaction: () => Promise<DatabaseTransaction>;
}

export interface DatabaseTransaction {
  /** Execute query in transaction */
  query: (sql: string, params?: any[]) => Promise<any[]>;
  
  /** Commit transaction */
  commit: () => Promise<void>;
  
  /** Rollback transaction */
  rollback: () => Promise<void>;
}

// ============================================================================
// Additional Types
// ============================================================================

export interface TypeDefinition {
  /** Type name */
  name: string;
  
  /** Base type */
  type: string;
  
  /** Type definition SQL */
  definition: string;
}

export interface Index {
  /** Index name */
  name: string;
  
  /** Table name */
  table: string;
  
  /** Column names */
  columns: string[];
  
  /** Whether index is unique */
  unique?: boolean;
  
  /** Index type */
  type?: string;
}

export interface Relation {
  /** Relation name */
  name: string;
  
  /** Source table */
  from: string;
  
  /** Target table */
  to: string;
  
  /** Relation type */
  type: 'oneToOne' | 'oneToMany' | 'manyToOne' | 'manyToMany';
  
  /** Foreign key column */
  foreignKey?: string;
  
  /** Junction table (for many-to-many) */
  through?: string;
}
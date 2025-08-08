/**
 * Plugin Hooks and Middleware Types for CF-Better-Auth
 * 
 * This module defines comprehensive hook and middleware interfaces that provide
 * extensibility points throughout the authentication lifecycle. These hooks
 * enable plugins to intercept, modify, and extend authentication behavior.
 */

import type { Request, Response, NextFunction } from 'express';
import type { User, Session, DatabaseAdapter } from './server';

// ============================================================================
// Hook Registry System
// ============================================================================

export interface HookRegistry {
  /** Register a hook */
  register<T extends keyof HookMap>(
    event: T,
    handler: HookMap[T],
    options?: HookOptions
  ): HookUnsubscribe;
  
  /** Execute hooks for an event */
  execute<T extends keyof HookMap>(
    event: T,
    ...args: Parameters<HookMap[T]>
  ): Promise<any>;
  
  /** Execute hooks synchronously */
  executeSync<T extends keyof HookMap>(
    event: T,
    ...args: Parameters<HookMap[T]>
  ): any;
  
  /** Remove a hook */
  unregister<T extends keyof HookMap>(
    event: T,
    handler: HookMap[T]
  ): boolean;
  
  /** Remove all hooks for an event */
  clear<T extends keyof HookMap>(event: T): void;
  
  /** Remove all hooks */
  clearAll(): void;
  
  /** Get all registered hooks for an event */
  getHooks<T extends keyof HookMap>(event: T): HookMap[T][];
  
  /** Check if hooks are registered for an event */
  hasHooks<T extends keyof HookMap>(event: T): boolean;
}

export type HookUnsubscribe = () => void;

export interface HookOptions {
  /** Hook priority (lower numbers run first) */
  priority?: number;
  
  /** Whether hook can be async */
  async?: boolean;
  
  /** Whether hook should run once */
  once?: boolean;
  
  /** Hook conditions */
  condition?: (context: any) => boolean;
  
  /** Plugin ID that registered this hook */
  pluginId?: string;
}

// ============================================================================
// Complete Hook Map
// ============================================================================

export interface HookMap {
  // ========================================================================
  // Authentication Lifecycle Hooks
  // ========================================================================
  
  /** Before user sign-in attempt */
  'auth:before-signin': BeforeSignInHook;
  
  /** After successful sign-in */
  'auth:after-signin': AfterSignInHook;
  
  /** Before user sign-up attempt */
  'auth:before-signup': BeforeSignUpHook;
  
  /** After successful sign-up */
  'auth:after-signup': AfterSignUpHook;
  
  /** Before user sign-out */
  'auth:before-signout': BeforeSignOutHook;
  
  /** After user sign-out */
  'auth:after-signout': AfterSignOutHook;
  
  /** When authentication fails */
  'auth:signin-failed': SignInFailedHook;
  
  /** When sign-up fails */
  'auth:signup-failed': SignUpFailedHook;
  
  // ========================================================================
  // Session Management Hooks
  // ========================================================================
  
  /** Before session creation */
  'session:before-create': BeforeSessionCreateHook;
  
  /** After session creation */
  'session:after-create': AfterSessionCreateHook;
  
  /** Before session update */
  'session:before-update': BeforeSessionUpdateHook;
  
  /** After session update */
  'session:after-update': AfterSessionUpdateHook;
  
  /** Before session deletion */
  'session:before-delete': BeforeSessionDeleteHook;
  
  /** After session deletion */
  'session:after-delete': AfterSessionDeleteHook;
  
  /** When session expires */
  'session:expired': SessionExpiredHook;
  
  /** Before session validation */
  'session:before-validate': BeforeSessionValidateHook;
  
  /** After session validation */
  'session:after-validate': AfterSessionValidateHook;
  
  // ========================================================================
  // User Management Hooks
  // ========================================================================
  
  /** Before user creation */
  'user:before-create': BeforeUserCreateHook;
  
  /** After user creation */
  'user:after-create': AfterUserCreateHook;
  
  /** Before user update */
  'user:before-update': BeforeUserUpdateHook;
  
  /** After user update */
  'user:after-update': AfterUserUpdateHook;
  
  /** Before user deletion */
  'user:before-delete': BeforeUserDeleteHook;
  
  /** After user deletion */
  'user:after-delete': AfterUserDeleteHook;
  
  /** Before email verification */
  'user:before-verify-email': BeforeVerifyEmailHook;
  
  /** After email verification */
  'user:after-verify-email': AfterVerifyEmailHook;
  
  /** Before password reset */
  'user:before-reset-password': BeforeResetPasswordHook;
  
  /** After password reset */
  'user:after-reset-password': AfterResetPasswordHook;
  
  // ========================================================================
  // Request/Response Hooks
  // ========================================================================
  
  /** Before request processing */
  'request:before-process': BeforeRequestHook;
  
  /** After request processing */
  'request:after-process': AfterRequestHook;
  
  /** Before response sending */
  'response:before-send': BeforeResponseHook;
  
  /** After response sent */
  'response:after-send': AfterResponseHook;
  
  /** On request error */
  'request:error': RequestErrorHook;
  
  // ========================================================================
  // Database Hooks
  // ========================================================================
  
  /** Before database query */
  'db:before-query': BeforeDbQueryHook;
  
  /** After database query */
  'db:after-query': AfterDbQueryHook;
  
  /** On database error */
  'db:error': DbErrorHook;
  
  /** Before transaction start */
  'db:before-transaction': BeforeTransactionHook;
  
  /** After transaction commit */
  'db:after-commit': AfterCommitHook;
  
  /** After transaction rollback */
  'db:after-rollback': AfterRollbackHook;
  
  // ========================================================================
  // Security Hooks
  // ========================================================================
  
  /** Before rate limiting check */
  'security:before-rate-limit': BeforeRateLimitHook;
  
  /** When rate limit exceeded */
  'security:rate-limit-exceeded': RateLimitExceededHook;
  
  /** Before CSRF validation */
  'security:before-csrf': BeforeCsrfHook;
  
  /** When CSRF validation fails */
  'security:csrf-failed': CsrfFailedHook;
  
  /** On security event */
  'security:event': SecurityEventHook;
  
  /** On suspicious activity */
  'security:suspicious-activity': SuspiciousActivityHook;
  
  // ========================================================================
  // Plugin Hooks
  // ========================================================================
  
  /** Before plugin loading */
  'plugin:before-load': BeforePluginLoadHook;
  
  /** After plugin loading */
  'plugin:after-load': AfterPluginLoadHook;
  
  /** Before plugin unloading */
  'plugin:before-unload': BeforePluginUnloadHook;
  
  /** After plugin unloading */
  'plugin:after-unload': AfterPluginUnloadHook;
  
  /** On plugin error */
  'plugin:error': PluginErrorHook;
  
  // ========================================================================
  // Custom Event Hooks
  // ========================================================================
  
  /** Custom events (plugins can define their own) */
  [customEvent: string]: (...args: any[]) => any;
}

// ============================================================================
// Hook Type Definitions
// ============================================================================

// Authentication Hooks
export type BeforeSignInHook = (context: SignInContext) => Promise<SignInContext> | SignInContext;
export type AfterSignInHook = (context: PostSignInContext) => Promise<void> | void;
export type BeforeSignUpHook = (context: SignUpContext) => Promise<SignUpContext> | SignUpContext;
export type AfterSignUpHook = (context: PostSignUpContext) => Promise<void> | void;
export type BeforeSignOutHook = (context: SignOutContext) => Promise<void> | void;
export type AfterSignOutHook = (context: PostSignOutContext) => Promise<void> | void;
export type SignInFailedHook = (context: SignInFailedContext) => Promise<void> | void;
export type SignUpFailedHook = (context: SignUpFailedContext) => Promise<void> | void;

// Session Hooks
export type BeforeSessionCreateHook = (context: CreateSessionContext) => Promise<CreateSessionContext> | CreateSessionContext;
export type AfterSessionCreateHook = (context: PostCreateSessionContext) => Promise<void> | void;
export type BeforeSessionUpdateHook = (context: UpdateSessionContext) => Promise<UpdateSessionContext> | UpdateSessionContext;
export type AfterSessionUpdateHook = (context: PostUpdateSessionContext) => Promise<void> | void;
export type BeforeSessionDeleteHook = (context: DeleteSessionContext) => Promise<void> | void;
export type AfterSessionDeleteHook = (context: PostDeleteSessionContext) => Promise<void> | void;
export type SessionExpiredHook = (context: SessionExpiredContext) => Promise<void> | void;
export type BeforeSessionValidateHook = (context: ValidateSessionContext) => Promise<ValidateSessionContext> | ValidateSessionContext;
export type AfterSessionValidateHook = (context: PostValidateSessionContext) => Promise<void> | void;

// User Hooks
export type BeforeUserCreateHook = (context: CreateUserContext) => Promise<CreateUserContext> | CreateUserContext;
export type AfterUserCreateHook = (context: PostCreateUserContext) => Promise<void> | void;
export type BeforeUserUpdateHook = (context: UpdateUserContext) => Promise<UpdateUserContext> | UpdateUserContext;
export type AfterUserUpdateHook = (context: PostUpdateUserContext) => Promise<void> | void;
export type BeforeUserDeleteHook = (context: DeleteUserContext) => Promise<void> | void;
export type AfterUserDeleteHook = (context: PostDeleteUserContext) => Promise<void> | void;
export type BeforeVerifyEmailHook = (context: VerifyEmailContext) => Promise<VerifyEmailContext> | VerifyEmailContext;
export type AfterVerifyEmailHook = (context: PostVerifyEmailContext) => Promise<void> | void;
export type BeforeResetPasswordHook = (context: ResetPasswordContext) => Promise<ResetPasswordContext> | ResetPasswordContext;
export type AfterResetPasswordHook = (context: PostResetPasswordContext) => Promise<void> | void;

// Request/Response Hooks
export type BeforeRequestHook = (context: RequestContext) => Promise<RequestContext> | RequestContext;
export type AfterRequestHook = (context: PostRequestContext) => Promise<void> | void;
export type BeforeResponseHook = (context: ResponseContext) => Promise<ResponseContext> | ResponseContext;
export type AfterResponseHook = (context: PostResponseContext) => Promise<void> | void;
export type RequestErrorHook = (context: RequestErrorContext) => Promise<void> | void;

// Database Hooks
export type BeforeDbQueryHook = (context: DbQueryContext) => Promise<DbQueryContext> | DbQueryContext;
export type AfterDbQueryHook = (context: PostDbQueryContext) => Promise<void> | void;
export type DbErrorHook = (context: DbErrorContext) => Promise<void> | void;
export type BeforeTransactionHook = (context: TransactionContext) => Promise<void> | void;
export type AfterCommitHook = (context: PostCommitContext) => Promise<void> | void;
export type AfterRollbackHook = (context: PostRollbackContext) => Promise<void> | void;

// Security Hooks
export type BeforeRateLimitHook = (context: RateLimitContext) => Promise<RateLimitContext> | RateLimitContext;
export type RateLimitExceededHook = (context: RateLimitExceededContext) => Promise<void> | void;
export type BeforeCsrfHook = (context: CsrfContext) => Promise<CsrfContext> | CsrfContext;
export type CsrfFailedHook = (context: CsrfFailedContext) => Promise<void> | void;
export type SecurityEventHook = (context: SecurityEventContext) => Promise<void> | void;
export type SuspiciousActivityHook = (context: SuspiciousActivityContext) => Promise<void> | void;

// Plugin Hooks
export type BeforePluginLoadHook = (context: PluginLoadContext) => Promise<void> | void;
export type AfterPluginLoadHook = (context: PostPluginLoadContext) => Promise<void> | void;
export type BeforePluginUnloadHook = (context: PluginUnloadContext) => Promise<void> | void;
export type AfterPluginUnloadHook = (context: PostPluginUnloadContext) => Promise<void> | void;
export type PluginErrorHook = (context: PluginErrorContext) => Promise<void> | void;

// ============================================================================
// Context Definitions
// ============================================================================

// Base Context
export interface BaseContext {
  /** Request ID */
  requestId: string;
  
  /** Timestamp */
  timestamp: Date;
  
  /** Plugin ID that triggered the hook */
  pluginId?: string;
  
  /** Additional metadata */
  metadata: Record<string, any>;
}

// Authentication Contexts
export interface SignInContext extends BaseContext {
  /** Sign-in credentials */
  credentials: {
    email?: string;
    username?: string;
    password?: string;
    provider?: string;
    token?: string;
    [key: string]: any;
  };
  
  /** HTTP request */
  request: Request;
  
  /** IP address */
  ip: string;
  
  /** User agent */
  userAgent: string;
}

export interface PostSignInContext extends BaseContext {
  /** Authenticated user */
  user: User;
  
  /** Created session */
  session: Session;
  
  /** Sign-in method */
  method: string;
  
  /** Whether this is a new user */
  isNewUser: boolean;
}

export interface SignUpContext extends BaseContext {
  /** Registration data */
  userData: {
    email: string;
    password?: string;
    name?: string;
    [key: string]: any;
  };
  
  /** HTTP request */
  request: Request;
  
  /** IP address */
  ip: string;
  
  /** Registration method */
  method: string;
}

export interface PostSignUpContext extends BaseContext {
  /** Created user */
  user: User;
  
  /** Initial session (if created) */
  session?: Session;
  
  /** Registration method */
  method: string;
}

export interface SignOutContext extends BaseContext {
  /** User being signed out */
  user: User;
  
  /** Session being terminated */
  session: Session;
  
  /** HTTP request */
  request: Request;
}

export interface PostSignOutContext extends BaseContext {
  /** User ID */
  userId: string;
  
  /** Session ID */
  sessionId: string;
  
  /** Whether all sessions were terminated */
  allSessions: boolean;
}

export interface SignInFailedContext extends BaseContext {
  /** Failed credentials */
  credentials: any;
  
  /** Failure reason */
  reason: string;
  
  /** Error details */
  error: Error;
  
  /** HTTP request */
  request: Request;
  
  /** Attempt count */
  attemptCount: number;
}

export interface SignUpFailedContext extends BaseContext {
  /** Failed registration data */
  userData: any;
  
  /** Failure reason */
  reason: string;
  
  /** Error details */
  error: Error;
  
  /** HTTP request */
  request: Request;
}

// Session Contexts
export interface CreateSessionContext extends BaseContext {
  /** User for whom session is created */
  user: User;
  
  /** Session data */
  sessionData: Partial<Session>;
  
  /** HTTP request */
  request: Request;
  
  /** Session expiration */
  expiresAt?: Date;
}

export interface PostCreateSessionContext extends BaseContext {
  /** Created session */
  session: Session;
  
  /** User */
  user: User;
}

export interface UpdateSessionContext extends BaseContext {
  /** Current session */
  session: Session;
  
  /** Update data */
  updates: Partial<Session>;
  
  /** HTTP request */
  request?: Request;
}

export interface PostUpdateSessionContext extends BaseContext {
  /** Updated session */
  session: Session;
  
  /** Previous session data */
  previousSession: Session;
}

export interface DeleteSessionContext extends BaseContext {
  /** Session to delete */
  session: Session;
  
  /** User */
  user: User;
  
  /** HTTP request */
  request?: Request;
}

export interface PostDeleteSessionContext extends BaseContext {
  /** Deleted session ID */
  sessionId: string;
  
  /** User ID */
  userId: string;
}

export interface SessionExpiredContext extends BaseContext {
  /** Expired session */
  session: Session;
  
  /** User */
  user: User;
  
  /** Expiration reason */
  reason: 'timeout' | 'inactivity' | 'manual';
}

export interface ValidateSessionContext extends BaseContext {
  /** Session to validate */
  session: Session;
  
  /** HTTP request */
  request: Request;
  
  /** Validation options */
  options: {
    checkExpiry?: boolean;
    checkIP?: boolean;
    checkUserAgent?: boolean;
  };
}

export interface PostValidateSessionContext extends BaseContext {
  /** Validated session */
  session: Session;
  
  /** Validation result */
  valid: boolean;
  
  /** Validation details */
  details: {
    expired?: boolean;
    ipMismatch?: boolean;
    userAgentMismatch?: boolean;
  };
}

// User Contexts
export interface CreateUserContext extends BaseContext {
  /** User data to create */
  userData: Partial<User>;
  
  /** HTTP request */
  request?: Request;
  
  /** Registration source */
  source: 'signup' | 'admin' | 'import' | 'oauth';
}

export interface PostCreateUserContext extends BaseContext {
  /** Created user */
  user: User;
  
  /** Registration source */
  source: string;
}

export interface UpdateUserContext extends BaseContext {
  /** Current user */
  user: User;
  
  /** Update data */
  updates: Partial<User>;
  
  /** HTTP request */
  request?: Request;
  
  /** Update source */
  source: 'self' | 'admin' | 'system';
}

export interface PostUpdateUserContext extends BaseContext {
  /** Updated user */
  user: User;
  
  /** Previous user data */
  previousUser: User;
  
  /** Changed fields */
  changedFields: string[];
}

export interface DeleteUserContext extends BaseContext {
  /** User to delete */
  user: User;
  
  /** HTTP request */
  request?: Request;
  
  /** Deletion reason */
  reason: string;
}

export interface PostDeleteUserContext extends BaseContext {
  /** Deleted user ID */
  userId: string;
  
  /** User data at time of deletion */
  userData: User;
  
  /** Cleanup results */
  cleanup: {
    sessionsDeleted: number;
    dataArchived: boolean;
  };
}

export interface VerifyEmailContext extends BaseContext {
  /** Verification token */
  token: string;
  
  /** User being verified */
  user?: User;
  
  /** HTTP request */
  request: Request;
}

export interface PostVerifyEmailContext extends BaseContext {
  /** Verified user */
  user: User;
  
  /** Previous verification status */
  wasVerified: boolean;
}

export interface ResetPasswordContext extends BaseContext {
  /** Reset token */
  token: string;
  
  /** New password */
  newPassword: string;
  
  /** User requesting reset */
  user: User;
  
  /** HTTP request */
  request: Request;
}

export interface PostResetPasswordContext extends BaseContext {
  /** User whose password was reset */
  user: User;
  
  /** Whether all sessions were invalidated */
  sessionsInvalidated: boolean;
}

// Request/Response Contexts
export interface RequestContext extends BaseContext {
  /** HTTP request */
  request: Request;
  
  /** Route information */
  route: {
    path: string;
    method: string;
    params: Record<string, any>;
  };
  
  /** Authenticated user (if any) */
  user?: User;
  
  /** Active session (if any) */
  session?: Session;
}

export interface PostRequestContext extends BaseContext {
  /** HTTP request */
  request: Request;
  
  /** HTTP response */
  response: Response;
  
  /** Processing time */
  processingTime: number;
  
  /** Response status */
  status: number;
}

export interface ResponseContext extends BaseContext {
  /** HTTP request */
  request: Request;
  
  /** HTTP response */
  response: Response;
  
  /** Response data */
  data: any;
  
  /** Response status */
  status: number;
}

export interface PostResponseContext extends BaseContext {
  /** HTTP request */
  request: Request;
  
  /** HTTP response */
  response: Response;
  
  /** Total processing time */
  totalTime: number;
  
  /** Response size */
  responseSize: number;
}

export interface RequestErrorContext extends BaseContext {
  /** HTTP request */
  request: Request;
  
  /** Error that occurred */
  error: Error;
  
  /** Error code */
  code?: string;
  
  /** HTTP status code */
  status: number;
  
  /** Whether error was handled */
  handled: boolean;
}

// Database Contexts
export interface DbQueryContext extends BaseContext {
  /** SQL query */
  query: string;
  
  /** Query parameters */
  params: any[];
  
  /** Query type */
  type: 'SELECT' | 'INSERT' | 'UPDATE' | 'DELETE' | 'OTHER';
  
  /** Table being queried */
  table?: string;
}

export interface PostDbQueryContext extends BaseContext {
  /** SQL query */
  query: string;
  
  /** Query parameters */
  params: any[];
  
  /** Query result */
  result: any;
  
  /** Query execution time */
  executionTime: number;
  
  /** Rows affected */
  rowsAffected?: number;
}

export interface DbErrorContext extends BaseContext {
  /** SQL query */
  query: string;
  
  /** Query parameters */
  params: any[];
  
  /** Database error */
  error: Error;
  
  /** Error code */
  code?: string;
}

export interface TransactionContext extends BaseContext {
  /** Transaction ID */
  transactionId: string;
  
  /** Transaction type */
  type: 'READ' | 'WRITE' | 'READ_WRITE';
}

export interface PostCommitContext extends BaseContext {
  /** Transaction ID */
  transactionId: string;
  
  /** Changes made */
  changes: {
    tables: string[];
    operations: string[];
  };
}

export interface PostRollbackContext extends BaseContext {
  /** Transaction ID */
  transactionId: string;
  
  /** Rollback reason */
  reason: string;
  
  /** Error that caused rollback */
  error?: Error;
}

// Security Contexts
export interface RateLimitContext extends BaseContext {
  /** HTTP request */
  request: Request;
  
  /** Rate limit key */
  key: string;
  
  /** Rate limit configuration */
  limit: {
    windowMs: number;
    max: number;
  };
  
  /** Current hit count */
  hits: number;
}

export interface RateLimitExceededContext extends BaseContext {
  /** HTTP request */
  request: Request;
  
  /** Rate limit key */
  key: string;
  
  /** Limit configuration */
  limit: any;
  
  /** Current hits */
  hits: number;
  
  /** Time until reset */
  resetTime: Date;
}

export interface CsrfContext extends BaseContext {
  /** HTTP request */
  request: Request;
  
  /** CSRF token from request */
  token: string;
  
  /** Expected CSRF token */
  expectedToken: string;
}

export interface CsrfFailedContext extends BaseContext {
  /** HTTP request */
  request: Request;
  
  /** Failure reason */
  reason: 'missing' | 'invalid' | 'expired';
  
  /** Token provided */
  providedToken?: string;
}

export interface SecurityEventContext extends BaseContext {
  /** Event type */
  type: 'LOGIN_ATTEMPT' | 'PASSWORD_RESET' | 'SUSPICIOUS_ACTIVITY' | 'BREACH_ATTEMPT';
  
  /** Event details */
  details: Record<string, any>;
  
  /** Risk level */
  riskLevel: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
  
  /** User involved (if any) */
  user?: User;
  
  /** HTTP request */
  request?: Request;
}

export interface SuspiciousActivityContext extends BaseContext {
  /** Activity type */
  activity: string;
  
  /** Activity details */
  details: Record<string, any>;
  
  /** Confidence score (0-1) */
  confidence: number;
  
  /** User involved */
  user?: User;
  
  /** HTTP request */
  request: Request;
}

// Plugin Contexts
export interface PluginLoadContext extends BaseContext {
  /** Plugin being loaded */
  plugin: {
    id: string;
    name: string;
    version: string;
  };
  
  /** Plugin configuration */
  config: any;
}

export interface PostPluginLoadContext extends BaseContext {
  /** Loaded plugin */
  plugin: any;
  
  /** Load time */
  loadTime: number;
}

export interface PluginUnloadContext extends BaseContext {
  /** Plugin being unloaded */
  plugin: {
    id: string;
    name: string;
  };
  
  /** Unload reason */
  reason: 'shutdown' | 'reload' | 'disable' | 'error';
}

export interface PostPluginUnloadContext extends BaseContext {
  /** Unloaded plugin ID */
  pluginId: string;
  
  /** Cleanup results */
  cleanup: {
    hooksRemoved: number;
    resourcesCleaned: boolean;
  };
}

export interface PluginErrorContext extends BaseContext {
  /** Plugin that errored */
  plugin: {
    id: string;
    name: string;
  };
  
  /** Error that occurred */
  error: Error;
  
  /** Error context */
  context: 'load' | 'execute' | 'hook' | 'runtime';
  
  /** Additional error details */
  details: Record<string, any>;
}

// ============================================================================
// Middleware System Integration
// ============================================================================

export interface HookMiddleware {
  /** Middleware name */
  name: string;
  
  /** Execute middleware */
  execute: (context: any, next: NextFunction) => Promise<void> | void;
  
  /** Middleware priority */
  priority?: number;
  
  /** Whether middleware is async */
  async?: boolean;
}
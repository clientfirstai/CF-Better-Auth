/**
 * Type definitions for @cf-auth/core
 */

import type { BetterAuth } from 'better-auth';
import type { ConfigurationManager } from './config';
import type { CompatibilityLayer } from './compatibility';
import type { MiddlewareStack } from './middleware';
import type { ExtensionManager } from './extensions';
import type { PluginAdapter } from './plugin-adapter';

export interface AdapterConfig {
  database?: {
    provider: 'postgresql' | 'mysql' | 'sqlite';
    connectionString?: string;
    host?: string;
    port?: number;
    user?: string;
    password?: string;
    database?: string;
    ssl?: boolean | any;
  };
  email?: {
    provider: 'smtp' | 'sendgrid' | 'resend' | 'mailgun';
    options?: any;
  };
  session?: {
    maxAge?: number;
    updateAge?: number;
    cookieName?: string;
    secure?: boolean;
    sameSite?: 'lax' | 'strict' | 'none';
  };
  user?: {
    additionalFields?: Record<string, any>;
    defaultRole?: string;
  };
  plugins?: any[];
  extensions?: any[];
  trustedOrigins?: string[];
  baseURL?: string;
  secret?: string;
  rateLimit?: {
    enabled?: boolean;
    windowMs?: number;
    max?: number;
    storage?: 'memory' | 'redis';
  };
  advanced?: {
    disableCSRFCheck?: boolean;
    generateId?: () => string;
    customValidation?: boolean;
  };
  debug?: boolean;
}

export interface AdapterOptions {
  betterAuthVersion?: string;
  debug?: boolean;
  logLevel?: 'error' | 'warn' | 'info' | 'debug';
  customAdapters?: any[];
  customMiddleware?: any[];
  customExtensions?: any[];
}

export interface AdapterInstance {
  initialize(): Promise<void>;
  getAuthInstance(): BetterAuth | null;
  getConfigManager(): ConfigurationManager;
  getCompatibilityLayer(): CompatibilityLayer;
  getMiddlewareStack(): MiddlewareStack;
  getExtensionManager(): ExtensionManager;
  getPluginAdapter(): PluginAdapter;
  registerPlugin(plugin: any): Promise<void>;
  registerExtension(extension: any): Promise<void>;
  addMiddleware(middleware: any): void;
  shutdown(): Promise<void>;
}

export interface CompatibilityConfig {
  version: string;
  transforms?: any[];
  shims?: any[];
  deprecations?: string[];
}

export interface ExtensionConfig {
  name: string;
  version?: string;
  enabled?: boolean;
  config?: any;
}

export interface MiddlewareConfig {
  name: string;
  priority?: number;
  enabled?: boolean;
  before?: (context: any) => Promise<any> | any;
  after?: (context: any) => Promise<any> | any;
}

export interface PluginConfig {
  name: string;
  version?: string;
  enabled?: boolean;
  config?: any;
  dependencies?: string[];
}

export interface AuthContext {
  type: string;
  user?: any;
  session?: any;
  request?: Request;
  response?: Response;
  error?: Error;
  data?: any;
}

export interface SessionData {
  userId: string;
  email?: string;
  name?: string;
  image?: string;
  role?: string;
  permissions?: string[];
  createdAt: Date;
  expiresAt: Date;
  metadata?: Record<string, any>;
}

export interface UserData {
  id: string;
  email: string;
  emailVerified?: boolean;
  name?: string;
  image?: string;
  role?: string;
  permissions?: string[];
  createdAt: Date;
  updatedAt: Date;
  metadata?: Record<string, any>;
}

export interface OrganizationData {
  id: string;
  name: string;
  slug: string;
  logo?: string;
  description?: string;
  ownerId: string;
  createdAt: Date;
  updatedAt: Date;
  metadata?: Record<string, any>;
}

export interface TeamData {
  id: string;
  name: string;
  organizationId: string;
  description?: string;
  createdAt: Date;
  updatedAt: Date;
  metadata?: Record<string, any>;
}

export interface ApiKeyData {
  id: string;
  name: string;
  key: string;
  userId: string;
  organizationId?: string;
  permissions?: string[];
  expiresAt?: Date;
  lastUsedAt?: Date;
  createdAt: Date;
  updatedAt: Date;
}

export interface AuditLogData {
  id: string;
  event: string;
  userId?: string;
  organizationId?: string;
  ip?: string;
  userAgent?: string;
  metadata?: Record<string, any>;
  createdAt: Date;
}

export interface AuthResponse<T = any> {
  success: boolean;
  data?: T;
  error?: {
    code: string;
    message: string;
    details?: any;
  };
}

export interface SignInCredentials {
  email?: string;
  username?: string;
  password?: string;
  provider?: string;
  code?: string;
  token?: string;
}

export interface SignUpData {
  email: string;
  password?: string;
  name?: string;
  username?: string;
  metadata?: Record<string, any>;
}

export interface PasswordResetData {
  email?: string;
  token?: string;
  newPassword?: string;
}

export interface VerificationData {
  token: string;
  type: 'email' | 'phone' | 'totp';
  code?: string;
}

export interface SocialProvider {
  id: string;
  name: string;
  clientId: string;
  clientSecret: string;
  redirectUri?: string;
  scope?: string[];
  authorizationUrl?: string;
  tokenUrl?: string;
  userInfoUrl?: string;
}

export interface RateLimitConfig {
  windowMs: number;
  max: number;
  message?: string;
  skipSuccessfulRequests?: boolean;
  skipFailedRequests?: boolean;
  keyGenerator?: (req: Request) => string;
}

export interface SecurityConfig {
  csrfProtection?: boolean;
  cors?: {
    origin?: string | string[] | boolean;
    credentials?: boolean;
    methods?: string[];
    headers?: string[];
  };
  headers?: {
    hsts?: boolean;
    noSniff?: boolean;
    xssProtection?: boolean;
    frameOptions?: 'DENY' | 'SAMEORIGIN';
  };
}

// Re-export better-auth types that we extend
export type { BetterAuth } from 'better-auth';
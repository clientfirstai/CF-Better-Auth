// Re-export core types from better-auth with CF-Auth extensions
export type * from "better-auth/types";

// Core CF-Auth Types
export interface CFAuthOptions {
  /** Better Auth configuration options */
  betterAuth?: BetterAuthOptions;
  /** Custom adapter configuration */
  adapter?: {
    /** Custom compatibility layer settings */
    compatibility?: {
      /** Better-auth version to target */
      version?: string;
      /** Enable compatibility warnings */
      warnings?: boolean;
    };
    /** Custom configuration overrides */
    overrides?: Record<string, any>;
  };
  /** Plugin management settings */
  plugins?: {
    /** Auto-load built-in plugins */
    autoLoad?: boolean;
    /** Custom plugin configurations */
    custom?: Record<string, any>;
  };
}

// Core Database Types
export interface DatabaseConfig {
  provider: 'postgresql' | 'mysql' | 'sqlite' | 'mongodb';
  connectionString?: string;
  url?: string;
  [key: string]: any;
}

// Session Management
export interface SessionConfig {
  expiresIn?: number;
  updateAge?: number;
  cookieName?: string;
  [key: string]: any;
}

// Email & Password Authentication
export interface EmailPasswordConfig {
  enabled?: boolean;
  requireEmailVerification?: boolean;
  minPasswordLength?: number;
  maxPasswordLength?: number;
  autoSignIn?: boolean;
  [key: string]: any;
}

// Social Providers Configuration
export interface SocialProvidersConfig {
  google?: ProviderConfig;
  github?: ProviderConfig;
  facebook?: ProviderConfig;
  twitter?: ProviderConfig;
  discord?: ProviderConfig;
  apple?: ProviderConfig;
  [key: string]: ProviderConfig | undefined;
}

export interface ProviderConfig {
  clientId: string;
  clientSecret: string;
  redirectUri?: string;
  scope?: string[];
  [key: string]: any;
}

// Rate Limiting
export interface RateLimitConfig {
  enabled?: boolean;
  window?: number;
  max?: number;
  storage?: 'memory' | 'database' | 'secondary-storage';
  customRules?: Record<string, { window: number; max: number }>;
  [key: string]: any;
}

// Better Auth Options (simplified subset)
export interface BetterAuthOptions {
  appName?: string;
  baseURL?: string;
  basePath?: string;
  secret?: string;
  database?: any;
  emailAndPassword?: EmailPasswordConfig;
  socialProviders?: SocialProvidersConfig;
  session?: SessionConfig;
  rateLimit?: RateLimitConfig;
  plugins?: any[];
  trustedOrigins?: string[];
  advanced?: {
    useSecureCookies?: boolean;
    disableCSRFCheck?: boolean;
    cookiePrefix?: string;
  };
  [key: string]: any;
}

// CF-Auth Adapter Instance
export interface CFAuthInstance {
  /** Initialize the auth instance */
  initialize(): Promise<void>;
  /** Get the underlying Better Auth instance */
  getInstance(): BetterAuthInstance;
  /** Upgrade to a new version */
  upgrade(version?: string): Promise<void>;
  /** Get current version */
  getVersion(): string;
  /** Sign in a user */
  signIn: (credentials: any) => Promise<any>;
  /** Sign up a new user */
  signUp: (data: any) => Promise<any>;
  /** Sign out a user */
  signOut: (sessionId?: string) => Promise<void>;
  /** Get user session */
  getSession: (sessionId: string) => Promise<any>;
  /** Use middleware */
  use?: (middleware: any) => void;
  [key: string]: any;
}

// Better Auth Instance Interface
export interface BetterAuthInstance {
  signIn: (credentials: any) => Promise<any>;
  signUp: (data: any) => Promise<any>;
  signOut: (sessionId?: string) => Promise<void>;
  getSession: (sessionId: string) => Promise<any>;
  use?: (middleware: any) => void;
  [key: string]: any;
}

// Core Models
export interface User {
  id: string;
  email?: string;
  name?: string;
  image?: string;
  emailVerified?: boolean;
  createdAt: Date;
  updatedAt: Date;
  [key: string]: any;
}

export interface Session {
  id: string;
  userId: string;
  token?: string;
  expiresAt: Date;
  createdAt: Date;
  updatedAt: Date;
  ipAddress?: string;
  userAgent?: string;
  [key: string]: any;
}

export interface Account {
  id: string;
  userId: string;
  provider: string;
  providerAccountId: string;
  type: string;
  access_token?: string;
  refresh_token?: string;
  id_token?: string;
  token_type?: string;
  scope?: string;
  expires_at?: number;
  createdAt: Date;
  updatedAt: Date;
  [key: string]: any;
}

export interface Verification {
  id: string;
  identifier: string;
  value: string;
  expiresAt: Date;
  createdAt: Date;
  [key: string]: any;
}

// Response Types
export interface AuthResponse<T = any> {
  data?: T;
  user?: User;
  session?: Session;
  error?: {
    message: string;
    code?: string;
    details?: any;
  };
  [key: string]: any;
}

export interface SignInResponse extends AuthResponse {
  user: User;
  session: Session;
}

export interface SignUpResponse extends AuthResponse {
  user: User;
  session?: Session;
  requiresVerification?: boolean;
}

// Plugin Types
export interface CFAuthPlugin {
  id: string;
  name: string;
  version: string;
  description?: string;
  dependencies?: string[];
  config?: Record<string, any>;
  init?: (options: any) => Promise<any> | any;
  [key: string]: any;
}

// Utility Types
export type DeepPartial<T> = {
  [P in keyof T]?: T[P] extends object ? DeepPartial<T[P]> : T[P];
};

export type RequireAtLeastOne<T, Keys extends keyof T = keyof T> = 
  Pick<T, Exclude<keyof T, Keys>> & 
  { [K in Keys]-?: Required<Pick<T, K>> & Partial<Pick<T, Exclude<Keys, K>>> }[Keys];

export type OmitId<T> = Omit<T, 'id'>;

export type WithId<T> = T & { id: string };

// Configuration Management Types
export interface ConfigurationOptions {
  /** Environment to load configuration for */
  environment?: 'development' | 'production' | 'test';
  /** Custom configuration file path */
  configFile?: string;
  /** Enable configuration validation */
  validate?: boolean;
  /** Configuration cache settings */
  cache?: {
    enabled?: boolean;
    ttl?: number;
  };
}

export interface MigrationOptions {
  /** Target version for migration */
  targetVersion?: string;
  /** Backup before migration */
  backup?: boolean;
  /** Rollback on failure */
  rollbackOnFailure?: boolean;
  /** Migration strategy */
  strategy?: 'auto' | 'manual';
}

// Client Types
export interface ClientOptions {
  /** Base URL for the auth server */
  baseURL: string;
  /** API path prefix */
  apiPath?: string;
  /** Enable automatic token refresh */
  autoRefresh?: boolean;
  /** Storage type for tokens */
  storage?: 'localStorage' | 'sessionStorage' | 'memory' | 'custom';
  /** Custom storage implementation */
  customStorage?: {
    getItem: (key: string) => string | null | Promise<string | null>;
    setItem: (key: string, value: string) => void | Promise<void>;
    removeItem: (key: string) => void | Promise<void>;
  };
}

// Hook Types
export interface UseAuthReturn {
  user: User | null;
  session: Session | null;
  loading: boolean;
  error: Error | null;
  signIn: (credentials: any) => Promise<SignInResponse>;
  signUp: (data: any) => Promise<SignUpResponse>;
  signOut: () => Promise<void>;
  refresh: () => Promise<void>;
}

// Provider Types
export interface AuthProviderProps {
  children: React.ReactNode;
  options?: ClientOptions;
}

export interface AuthContextType {
  user: User | null;
  session: Session | null;
  loading: boolean;
  error: Error | null;
  signIn: (credentials: any) => Promise<SignInResponse>;
  signUp: (data: any) => Promise<SignUpResponse>;
  signOut: () => Promise<void>;
  refresh: () => Promise<void>;
}

// Error Types
export class CFAuthError extends Error {
  code: string;
  details?: any;
  
  constructor(message: string, code: string, details?: any) {
    super(message);
    this.name = 'CFAuthError';
    this.code = code;
    this.details = details;
  }
}

export interface ErrorCodes {
  INVALID_CREDENTIALS: 'INVALID_CREDENTIALS';
  USER_NOT_FOUND: 'USER_NOT_FOUND';
  EMAIL_NOT_VERIFIED: 'EMAIL_NOT_VERIFIED';
  SESSION_EXPIRED: 'SESSION_EXPIRED';
  RATE_LIMITED: 'RATE_LIMITED';
  INVALID_TOKEN: 'INVALID_TOKEN';
  PROVIDER_ERROR: 'PROVIDER_ERROR';
  DATABASE_ERROR: 'DATABASE_ERROR';
  CONFIGURATION_ERROR: 'CONFIGURATION_ERROR';
  COMPATIBILITY_ERROR: 'COMPATIBILITY_ERROR';
}

// Export constants
export const ERROR_CODES: ErrorCodes = {
  INVALID_CREDENTIALS: 'INVALID_CREDENTIALS',
  USER_NOT_FOUND: 'USER_NOT_FOUND',
  EMAIL_NOT_VERIFIED: 'EMAIL_NOT_VERIFIED',
  SESSION_EXPIRED: 'SESSION_EXPIRED',
  RATE_LIMITED: 'RATE_LIMITED',
  INVALID_TOKEN: 'INVALID_TOKEN',
  PROVIDER_ERROR: 'PROVIDER_ERROR',
  DATABASE_ERROR: 'DATABASE_ERROR',
  CONFIGURATION_ERROR: 'CONFIGURATION_ERROR',
  COMPATIBILITY_ERROR: 'COMPATIBILITY_ERROR'
};

// Version compatibility
export interface VersionInfo {
  current: string;
  target?: string;
  compatible: boolean;
  warnings?: string[];
  breaking?: string[];
}

// Plugin Management
export interface PluginManager {
  register: (plugin: CFAuthPlugin) => Promise<void>;
  unregister: (pluginId: string) => Promise<void>;
  list: () => CFAuthPlugin[];
  get: (pluginId: string) => CFAuthPlugin | null;
  isEnabled: (pluginId: string) => boolean;
  enable: (pluginId: string) => Promise<void>;
  disable: (pluginId: string) => Promise<void>;
}
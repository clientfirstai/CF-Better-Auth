/**
 * Configuration types for CF-Better-Auth
 * Defines all configuration schemas and options
 */

import type { DatabaseConfig } from './database';
import type { OAuthProvider } from './auth';
import type { BasePlugin } from './plugins';
import type { Environment, LogLevel, DeepPartial, ConfigObject } from './common';

/**
 * Main CF-Better-Auth configuration
 */
export interface CFAuthConfig {
  /** Application settings */
  app: AppConfig;
  
  /** Authentication settings */
  auth: AuthConfig;
  
  /** Database configuration */
  database: DatabaseConfig;
  
  /** Security settings */
  security: SecurityConfig;
  
  /** Session management */
  session: SessionConfig;
  
  /** Email configuration */
  email?: EmailConfig;
  
  /** SMS configuration */
  sms?: SMSConfig;
  
  /** OAuth providers */
  oauth?: OAuthConfig;
  
  /** Plugin configuration */
  plugins?: PluginConfig;
  
  /** Logging configuration */
  logging?: LoggingConfig;
  
  /** Rate limiting */
  rateLimit?: RateLimitConfig;
  
  /** CORS settings */
  cors?: CORSConfig;
  
  /** File storage settings */
  storage?: StorageConfig;
  
  /** Webhook configuration */
  webhooks?: WebhookConfig;
  
  /** Analytics configuration */
  analytics?: AnalyticsConfig;
  
  /** Feature flags */
  features?: FeatureFlags;
  
  /** Environment-specific overrides */
  environments?: EnvironmentConfig;
  
  /** Custom configuration */
  custom?: ConfigObject;
}

/**
 * Application configuration
 */
export interface AppConfig {
  /** Application name */
  name: string;
  
  /** Application version */
  version?: string;
  
  /** Application description */
  description?: string;
  
  /** Application environment */
  environment: Environment;
  
  /** Base URL */
  baseUrl: string;
  
  /** API path prefix */
  apiPath?: string;
  
  /** Frontend URL */
  frontendUrl?: string;
  
  /** Application port */
  port?: number;
  
  /** Application host */
  host?: string;
  
  /** Trusted origins */
  trustedOrigins?: string[];
  
  /** Application timezone */
  timezone?: string;
  
  /** Application locale */
  locale?: string;
  
  /** Debug mode */
  debug?: boolean;
  
  /** Application metadata */
  metadata?: ConfigObject;
}

/**
 * Authentication configuration
 */
export interface AuthConfig {
  /** Email/password authentication */
  emailPassword?: EmailPasswordConfig;
  
  /** Magic link authentication */
  magicLink?: MagicLinkConfig;
  
  /** Phone/OTP authentication */
  phoneOtp?: PhoneOtpConfig;
  
  /** Multi-factor authentication */
  mfa?: MFAConfig;
  
  /** WebAuthn/FIDO2 configuration */
  webauthn?: WebAuthnConfig;
  
  /** Social authentication */
  social?: SocialAuthConfig;
  
  /** Anonymous authentication */
  anonymous?: AnonymousAuthConfig;
  
  /** JWT configuration */
  jwt?: JWTConfig;
  
  /** Password policy */
  passwordPolicy?: PasswordPolicyConfig;
  
  /** Account linking */
  accountLinking?: AccountLinkingConfig;
  
  /** User verification */
  verification?: VerificationConfig;
  
  /** Authentication flows */
  flows?: AuthFlowConfig;
}

/**
 * Email/password authentication config
 */
export interface EmailPasswordConfig {
  /** Enable email/password authentication */
  enabled: boolean;
  
  /** Require email verification */
  requireEmailVerification?: boolean;
  
  /** Allow sign up */
  allowSignUp?: boolean;
  
  /** Auto sign in after registration */
  autoSignIn?: boolean;
  
  /** Email field name */
  emailField?: string;
  
  /** Password field name */
  passwordField?: string;
  
  /** Custom validation */
  validation?: {
    email?: (email: string) => boolean | string;
    password?: (password: string) => boolean | string;
  };
}

/**
 * Magic link authentication config
 */
export interface MagicLinkConfig {
  /** Enable magic link authentication */
  enabled: boolean;
  
  /** Link expiration time (in seconds) */
  expiresIn?: number;
  
  /** Link length */
  linkLength?: number;
  
  /** Custom link generator */
  generateLink?: (email: string) => string;
  
  /** Redirect URL after verification */
  redirectUrl?: string;
  
  /** Rate limiting */
  rateLimit?: {
    requests: number;
    window: number;
  };
}

/**
 * Phone/OTP authentication config
 */
export interface PhoneOtpConfig {
  /** Enable phone/OTP authentication */
  enabled: boolean;
  
  /** OTP length */
  otpLength?: number;
  
  /** OTP expiration time (in seconds) */
  expiresIn?: number;
  
  /** SMS provider */
  provider?: 'twilio' | 'aws-sns' | 'custom';
  
  /** Provider configuration */
  providerConfig?: ConfigObject;
  
  /** Custom OTP generator */
  generateOtp?: () => string;
  
  /** Rate limiting */
  rateLimit?: {
    requests: number;
    window: number;
  };
}

/**
 * Multi-factor authentication config
 */
export interface MFAConfig {
  /** Enable MFA */
  enabled: boolean;
  
  /** Require MFA for all users */
  required?: boolean;
  
  /** Require MFA for admin users */
  requireForAdmin?: boolean;
  
  /** TOTP configuration */
  totp?: {
    enabled: boolean;
    issuer?: string;
    period?: number;
    digits?: number;
    algorithm?: 'SHA1' | 'SHA256' | 'SHA512';
  };
  
  /** SMS configuration */
  sms?: {
    enabled: boolean;
    provider?: string;
    providerConfig?: ConfigObject;
  };
  
  /** Email configuration */
  email?: {
    enabled: boolean;
  };
  
  /** Backup codes */
  backupCodes?: {
    enabled: boolean;
    count?: number;
    length?: number;
  };
  
  /** Recovery codes */
  recoveryCodes?: {
    enabled: boolean;
    count?: number;
    length?: number;
  };
}

/**
 * WebAuthn/FIDO2 configuration
 */
export interface WebAuthnConfig {
  /** Enable WebAuthn */
  enabled: boolean;
  
  /** Relying party ID */
  rpId: string;
  
  /** Relying party name */
  rpName: string;
  
  /** Origin */
  origin: string;
  
  /** Timeout (in milliseconds) */
  timeout?: number;
  
  /** User verification requirement */
  userVerification?: 'required' | 'preferred' | 'discouraged';
  
  /** Authenticator attachment */
  authenticatorSelection?: {
    authenticatorAttachment?: 'platform' | 'cross-platform';
    requireResidentKey?: boolean;
    userVerification?: 'required' | 'preferred' | 'discouraged';
  };
  
  /** Attestation conveyance preference */
  attestation?: 'none' | 'indirect' | 'direct' | 'enterprise';
}

/**
 * Social authentication configuration
 */
export interface SocialAuthConfig {
  /** Enable social authentication */
  enabled: boolean;
  
  /** Auto-create accounts */
  autoCreateAccount?: boolean;
  
  /** Auto-link accounts */
  autoLinkAccounts?: boolean;
  
  /** Default redirect URL */
  defaultRedirectUrl?: string;
  
  /** Provider-specific configuration */
  providers?: Record<string, SocialProviderConfig>;
}

/**
 * Social provider configuration
 */
export interface SocialProviderConfig {
  /** Enable provider */
  enabled: boolean;
  
  /** Client ID */
  clientId: string;
  
  /** Client secret */
  clientSecret: string;
  
  /** Redirect URI */
  redirectUri?: string;
  
  /** Scopes */
  scope?: string[];
  
  /** Custom parameters */
  params?: ConfigObject;
  
  /** User data mapping */
  userMapping?: {
    id?: string;
    email?: string;
    name?: string;
    image?: string;
    [key: string]: string | undefined;
  };
  
  /** Custom configuration */
  custom?: ConfigObject;
}

/**
 * Anonymous authentication configuration
 */
export interface AnonymousAuthConfig {
  /** Enable anonymous authentication */
  enabled: boolean;
  
  /** Convert to regular account */
  allowConversion?: boolean;
  
  /** Auto-convert after certain time */
  autoConvertAfter?: number;
  
  /** Anonymous user prefix */
  userPrefix?: string;
  
  /** Session expiration */
  sessionExpiration?: number;
}

/**
 * JWT configuration
 */
export interface JWTConfig {
  /** Secret key */
  secret: string;
  
  /** Algorithm */
  algorithm?: 'HS256' | 'HS384' | 'HS512' | 'RS256' | 'RS384' | 'RS512' | 'ES256' | 'ES384' | 'ES512';
  
  /** Access token expiration */
  accessTokenExpiration?: string | number;
  
  /** Refresh token expiration */
  refreshTokenExpiration?: string | number;
  
  /** Issuer */
  issuer?: string;
  
  /** Audience */
  audience?: string | string[];
  
  /** Custom claims */
  customClaims?: (user: any, session: any) => ConfigObject;
  
  /** Verify options */
  verifyOptions?: {
    clockTolerance?: number;
    ignoreExpiration?: boolean;
    ignoreNotBefore?: boolean;
  };
}

/**
 * Password policy configuration
 */
export interface PasswordPolicyConfig {
  /** Minimum length */
  minLength?: number;
  
  /** Maximum length */
  maxLength?: number;
  
  /** Require uppercase letters */
  requireUppercase?: boolean;
  
  /** Require lowercase letters */
  requireLowercase?: boolean;
  
  /** Require numbers */
  requireNumbers?: boolean;
  
  /** Require special characters */
  requireSpecialChars?: boolean;
  
  /** Disallow common passwords */
  disallowCommon?: boolean;
  
  /** Disallow personal information */
  disallowPersonalInfo?: boolean;
  
  /** Password history count */
  historyCount?: number;
  
  /** Custom validation function */
  customValidator?: (password: string, user?: any) => boolean | string;
}

/**
 * Account linking configuration
 */
export interface AccountLinkingConfig {
  /** Enable account linking */
  enabled: boolean;
  
  /** Auto-link by email */
  autoLinkByEmail?: boolean;
  
  /** Require verification for linking */
  requireVerification?: boolean;
  
  /** Maximum linked accounts */
  maxLinkedAccounts?: number;
  
  /** Allow unlinking */
  allowUnlinking?: boolean;
}

/**
 * Verification configuration
 */
export interface VerificationConfig {
  /** Email verification */
  email?: {
    enabled: boolean;
    required?: boolean;
    expiresIn?: number;
    template?: string;
    redirectUrl?: string;
  };
  
  /** Phone verification */
  phone?: {
    enabled: boolean;
    required?: boolean;
    expiresIn?: number;
    otpLength?: number;
  };
  
  /** Custom verification methods */
  custom?: Record<string, {
    enabled: boolean;
    handler: (identifier: string, code: string) => Promise<boolean>;
  }>;
}

/**
 * Authentication flow configuration
 */
export interface AuthFlowConfig {
  /** Registration flow */
  registration?: {
    enabled: boolean;
    requireEmailVerification?: boolean;
    requirePhoneVerification?: boolean;
    customFields?: RegistrationField[];
    redirectAfterRegistration?: string;
  };
  
  /** Login flow */
  login?: {
    enabled: boolean;
    rememberMe?: boolean;
    maxFailedAttempts?: number;
    lockoutDuration?: number;
    redirectAfterLogin?: string;
  };
  
  /** Logout flow */
  logout?: {
    enabled: boolean;
    redirectAfterLogout?: string;
    clearAllSessions?: boolean;
  };
  
  /** Password reset flow */
  passwordReset?: {
    enabled: boolean;
    expiresIn?: number;
    redirectAfterReset?: string;
  };
  
  /** Account recovery flow */
  accountRecovery?: {
    enabled: boolean;
    methods?: ('email' | 'phone' | 'security-questions')[];
    requireMultipleMethods?: boolean;
  };
}

/**
 * Registration field configuration
 */
export interface RegistrationField {
  /** Field name */
  name: string;
  
  /** Field type */
  type: 'text' | 'email' | 'password' | 'phone' | 'select' | 'checkbox' | 'radio';
  
  /** Field label */
  label: string;
  
  /** Field is required */
  required?: boolean;
  
  /** Field validation */
  validation?: {
    pattern?: string;
    minLength?: number;
    maxLength?: number;
    custom?: (value: any) => boolean | string;
  };
  
  /** Field options (for select/radio) */
  options?: Array<{ value: string; label: string }>;
  
  /** Field placeholder */
  placeholder?: string;
  
  /** Field help text */
  helpText?: string;
}

/**
 * Security configuration
 */
export interface SecurityConfig {
  /** HTTPS enforcement */
  forceHttps?: boolean;
  
  /** Secure cookies */
  secureCookies?: boolean;
  
  /** Cookie same-site policy */
  cookieSameSite?: 'strict' | 'lax' | 'none';
  
  /** CSRF protection */
  csrf?: {
    enabled: boolean;
    secret?: string;
    sameSite?: boolean;
    httpOnly?: boolean;
  };
  
  /** Content Security Policy */
  csp?: {
    enabled: boolean;
    directives?: Record<string, string | string[]>;
  };
  
  /** HSTS headers */
  hsts?: {
    enabled: boolean;
    maxAge?: number;
    includeSubDomains?: boolean;
    preload?: boolean;
  };
  
  /** IP whitelisting */
  ipWhitelist?: string[];
  
  /** IP blacklisting */
  ipBlacklist?: string[];
  
  /** Brute force protection */
  bruteForce?: {
    enabled: boolean;
    maxAttempts?: number;
    windowMs?: number;
    blockDuration?: number;
  };
  
  /** Password encryption */
  encryption?: {
    algorithm?: 'bcrypt' | 'argon2' | 'scrypt';
    rounds?: number;
    saltLength?: number;
  };
  
  /** Security headers */
  headers?: {
    xFrameOptions?: string;
    xContentTypeOptions?: boolean;
    xXssProtection?: boolean;
    referrerPolicy?: string;
    permissionsPolicy?: string;
  };
}

/**
 * Session configuration
 */
export interface SessionConfig {
  /** Session provider */
  provider?: 'memory' | 'database' | 'redis' | 'custom';
  
  /** Provider configuration */
  providerConfig?: ConfigObject;
  
  /** Session expiration (in seconds) */
  maxAge?: number;
  
  /** Update age (how often to update lastActive) */
  updateAge?: number;
  
  /** Cookie name */
  name?: string;
  
  /** Cookie domain */
  domain?: string;
  
  /** Cookie path */
  path?: string;
  
  /** HTTP only cookies */
  httpOnly?: boolean;
  
  /** Secure cookies */
  secure?: boolean;
  
  /** Same-site policy */
  sameSite?: 'strict' | 'lax' | 'none';
  
  /** Rolling sessions */
  rolling?: boolean;
  
  /** Generate session ID */
  generateId?: () => string;
  
  /** Custom serialization */
  serialize?: (session: any) => string;
  
  /** Custom deserialization */
  deserialize?: (data: string) => any;
}

/**
 * Email configuration
 */
export interface EmailConfig {
  /** Email provider */
  provider: 'smtp' | 'sendgrid' | 'mailgun' | 'ses' | 'resend' | 'nodemailer' | 'custom';
  
  /** Provider configuration */
  providerConfig: ConfigObject;
  
  /** Default from address */
  from: string;
  
  /** Default from name */
  fromName?: string;
  
  /** Reply-to address */
  replyTo?: string;
  
  /** Email templates */
  templates?: {
    welcome?: EmailTemplate;
    verification?: EmailTemplate;
    passwordReset?: EmailTemplate;
    passwordChanged?: EmailTemplate;
    accountLocked?: EmailTemplate;
    magicLink?: EmailTemplate;
    mfaCode?: EmailTemplate;
    customTemplates?: Record<string, EmailTemplate>;
  };
  
  /** Email options */
  options?: {
    retries?: number;
    retryDelay?: number;
    timeout?: number;
    queue?: boolean;
    batchSize?: number;
  };
}

/**
 * Email template configuration
 */
export interface EmailTemplate {
  /** Template subject */
  subject: string;
  
  /** HTML template */
  html?: string;
  
  /** Text template */
  text?: string;
  
  /** Template file path */
  templatePath?: string;
  
  /** Template variables */
  variables?: ConfigObject;
  
  /** Custom template renderer */
  render?: (variables: ConfigObject) => { subject: string; html?: string; text?: string };
}

/**
 * SMS configuration
 */
export interface SMSConfig {
  /** SMS provider */
  provider: 'twilio' | 'aws-sns' | 'vonage' | 'custom';
  
  /** Provider configuration */
  providerConfig: ConfigObject;
  
  /** Default from number */
  from: string;
  
  /** SMS templates */
  templates?: {
    verification?: SMSTemplate;
    mfaCode?: SMSTemplate;
    passwordReset?: SMSTemplate;
    customTemplates?: Record<string, SMSTemplate>;
  };
  
  /** SMS options */
  options?: {
    retries?: number;
    retryDelay?: number;
    timeout?: number;
    queue?: boolean;
  };
}

/**
 * SMS template configuration
 */
export interface SMSTemplate {
  /** Template message */
  message: string;
  
  /** Template variables */
  variables?: ConfigObject;
  
  /** Custom template renderer */
  render?: (variables: ConfigObject) => string;
}

/**
 * OAuth configuration
 */
export interface OAuthConfig {
  /** Enable OAuth */
  enabled: boolean;
  
  /** OAuth providers */
  providers: Record<string, OAuthProvider>;
  
  /** Default scopes */
  defaultScopes?: string[];
  
  /** State parameter length */
  stateLength?: number;
  
  /** PKCE support */
  pkce?: boolean;
  
  /** Custom state generator */
  generateState?: () => string;
  
  /** Custom callback handler */
  callbackHandler?: (provider: string, profile: any) => Promise<any>;
}

/**
 * Plugin configuration
 */
export interface PluginConfig {
  /** Enable plugins */
  enabled: boolean;
  
  /** Plugin directory */
  directory?: string;
  
  /** Auto-load plugins */
  autoLoad?: boolean;
  
  /** Plugin whitelist */
  whitelist?: string[];
  
  /** Plugin blacklist */
  blacklist?: string[];
  
  /** Plugin configurations */
  configs?: Record<string, ConfigObject>;
  
  /** Plugin installation settings */
  installation?: {
    allowRemote?: boolean;
    trustedSources?: string[];
    maxSize?: number;
  };
}

/**
 * Logging configuration
 */
export interface LoggingConfig {
  /** Enable logging */
  enabled: boolean;
  
  /** Log level */
  level: LogLevel;
  
  /** Log format */
  format?: 'json' | 'text' | 'combined' | 'short' | 'tiny';
  
  /** Log outputs */
  outputs?: LogOutput[];
  
  /** Log requests */
  requests?: boolean;
  
  /** Log responses */
  responses?: boolean;
  
  /** Log errors */
  errors?: boolean;
  
  /** Log authentication events */
  auth?: boolean;
  
  /** Custom log filters */
  filters?: LogFilter[];
  
  /** Log metadata */
  metadata?: ConfigObject;
}

/**
 * Log output configuration
 */
export interface LogOutput {
  /** Output type */
  type: 'console' | 'file' | 'database' | 'http' | 'custom';
  
  /** Output configuration */
  config?: ConfigObject;
  
  /** Output level */
  level?: LogLevel;
  
  /** Output format */
  format?: string;
  
  /** Output filter */
  filter?: LogFilter;
}

/**
 * Log filter configuration
 */
export interface LogFilter {
  /** Filter name */
  name: string;
  
  /** Filter function */
  filter: (log: LogEntry) => boolean;
  
  /** Filter configuration */
  config?: ConfigObject;
}

/**
 * Log entry interface
 */
export interface LogEntry {
  /** Log timestamp */
  timestamp: Date;
  
  /** Log level */
  level: LogLevel;
  
  /** Log message */
  message: string;
  
  /** Log metadata */
  metadata?: ConfigObject;
  
  /** Request ID */
  requestId?: string;
  
  /** User ID */
  userId?: string;
  
  /** Session ID */
  sessionId?: string;
  
  /** Error details */
  error?: {
    name: string;
    message: string;
    stack?: string;
  };
}

/**
 * Rate limiting configuration
 */
export interface RateLimitConfig {
  /** Enable rate limiting */
  enabled: boolean;
  
  /** Rate limiting store */
  store?: 'memory' | 'redis' | 'database' | 'custom';
  
  /** Store configuration */
  storeConfig?: ConfigObject;
  
  /** Global rate limits */
  global?: RateLimit;
  
  /** Per-user rate limits */
  perUser?: RateLimit;
  
  /** Per-IP rate limits */
  perIp?: RateLimit;
  
  /** Endpoint-specific rate limits */
  endpoints?: Record<string, RateLimit>;
  
  /** Custom rate limiters */
  custom?: Record<string, RateLimit>;
  
  /** Rate limit headers */
  headers?: boolean;
  
  /** Skip successful requests */
  skipSuccessfulRequests?: boolean;
  
  /** Skip failed requests */
  skipFailedRequests?: boolean;
}

/**
 * Rate limit configuration
 */
export interface RateLimit {
  /** Maximum requests */
  max: number;
  
  /** Time window (in milliseconds) */
  windowMs: number;
  
  /** Custom message */
  message?: string;
  
  /** Custom status code */
  statusCode?: number;
  
  /** Custom headers */
  headers?: Record<string, string>;
  
  /** Skip condition */
  skip?: (req: any) => boolean;
  
  /** Key generator */
  keyGenerator?: (req: any) => string;
  
  /** On limit reached callback */
  onLimitReached?: (req: any, res: any) => void;
}

/**
 * CORS configuration
 */
export interface CORSConfig {
  /** Enable CORS */
  enabled: boolean;
  
  /** Allowed origins */
  origin?: string | string[] | ((origin: string) => boolean);
  
  /** Allowed methods */
  methods?: string[];
  
  /** Allowed headers */
  allowedHeaders?: string[];
  
  /** Exposed headers */
  exposedHeaders?: string[];
  
  /** Allow credentials */
  credentials?: boolean;
  
  /** Preflight max age */
  maxAge?: number;
  
  /** Options success status */
  optionsSuccessStatus?: number;
}

/**
 * Storage configuration
 */
export interface StorageConfig {
  /** Storage provider */
  provider: 'local' | 's3' | 'gcs' | 'azure' | 'cloudflare' | 'custom';
  
  /** Provider configuration */
  providerConfig: ConfigObject;
  
  /** Upload limits */
  limits?: {
    fileSize?: number;
    fileCount?: number;
    allowedMimeTypes?: string[];
    allowedExtensions?: string[];
  };
  
  /** Image processing */
  imageProcessing?: {
    enabled: boolean;
    formats?: string[];
    quality?: number;
    maxWidth?: number;
    maxHeight?: number;
    thumbnails?: Array<{
      name: string;
      width: number;
      height: number;
    }>;
  };
  
  /** Security settings */
  security?: {
    scanFiles?: boolean;
    allowPublicAccess?: boolean;
    signedUrls?: boolean;
    urlExpiration?: number;
  };
}

/**
 * Webhook configuration
 */
export interface WebhookConfig {
  /** Enable webhooks */
  enabled: boolean;
  
  /** Webhook endpoints */
  endpoints?: Array<{
    url: string;
    events: string[];
    secret?: string;
    headers?: Record<string, string>;
    enabled: boolean;
  }>;
  
  /** Retry configuration */
  retry?: {
    attempts?: number;
    backoff?: 'fixed' | 'exponential';
    delay?: number;
  };
  
  /** Security settings */
  security?: {
    signatureHeader?: string;
    signatureAlgorithm?: 'sha256' | 'sha1' | 'md5';
    verifySignature?: boolean;
  };
  
  /** Custom webhook handler */
  handler?: (event: string, data: any) => Promise<void>;
}

/**
 * Analytics configuration
 */
export interface AnalyticsConfig {
  /** Enable analytics */
  enabled: boolean;
  
  /** Analytics provider */
  provider?: 'custom' | 'google-analytics' | 'mixpanel' | 'segment';
  
  /** Provider configuration */
  providerConfig?: ConfigObject;
  
  /** Track authentication events */
  trackAuth?: boolean;
  
  /** Track user actions */
  trackActions?: boolean;
  
  /** Track API requests */
  trackRequests?: boolean;
  
  /** Custom events */
  customEvents?: Record<string, any>;
  
  /** Privacy settings */
  privacy?: {
    anonymizeIp?: boolean;
    excludePersonalData?: boolean;
    respectDoNotTrack?: boolean;
  };
}

/**
 * Feature flags configuration
 */
export interface FeatureFlags {
  /** Enable registration */
  registration?: boolean;
  
  /** Enable password reset */
  passwordReset?: boolean;
  
  /** Enable account linking */
  accountLinking?: boolean;
  
  /** Enable MFA */
  mfa?: boolean;
  
  /** Enable WebAuthn */
  webauthn?: boolean;
  
  /** Enable social auth */
  socialAuth?: boolean;
  
  /** Enable magic links */
  magicLinks?: boolean;
  
  /** Enable phone auth */
  phoneAuth?: boolean;
  
  /** Enable organizations */
  organizations?: boolean;
  
  /** Enable teams */
  teams?: boolean;
  
  /** Enable roles and permissions */
  rbac?: boolean;
  
  /** Enable audit logging */
  auditLogging?: boolean;
  
  /** Enable webhooks */
  webhooks?: boolean;
  
  /** Enable API keys */
  apiKeys?: boolean;
  
  /** Custom feature flags */
  custom?: Record<string, boolean>;
}

/**
 * Environment-specific configuration
 */
export interface EnvironmentConfig {
  /** Development environment overrides */
  development?: DeepPartial<CFAuthConfig>;
  
  /** Production environment overrides */
  production?: DeepPartial<CFAuthConfig>;
  
  /** Staging environment overrides */
  staging?: DeepPartial<CFAuthConfig>;
  
  /** Test environment overrides */
  test?: DeepPartial<CFAuthConfig>;
  
  /** Custom environment overrides */
  [environment: string]: DeepPartial<CFAuthConfig> | undefined;
}

/**
 * Configuration validation schema
 */
export interface ConfigValidationSchema {
  /** Schema type */
  type: 'object';
  
  /** Schema properties */
  properties: Record<string, ConfigValidationProperty>;
  
  /** Required properties */
  required?: string[];
  
  /** Additional properties allowed */
  additionalProperties?: boolean;
}

/**
 * Configuration validation property
 */
export interface ConfigValidationProperty {
  /** Property type */
  type: string;
  
  /** Property description */
  description?: string;
  
  /** Default value */
  default?: any;
  
  /** Enum values */
  enum?: any[];
  
  /** Nested properties */
  properties?: Record<string, ConfigValidationProperty>;
  
  /** Array items */
  items?: ConfigValidationProperty;
  
  /** Validation constraints */
  minimum?: number;
  maximum?: number;
  minLength?: number;
  maxLength?: number;
  pattern?: string;
  
  /** Custom validator */
  validator?: (value: any) => boolean | string;
}

/**
 * Configuration loader options
 */
export interface ConfigLoaderOptions {
  /** Configuration file paths */
  configFiles?: string[];
  
  /** Environment variable prefix */
  envPrefix?: string;
  
  /** Environment variables to load */
  envVars?: string[];
  
  /** Watch for configuration changes */
  watch?: boolean;
  
  /** Configuration validation */
  validate?: boolean;
  
  /** Validation schema */
  schema?: ConfigValidationSchema;
  
  /** Allow unknown properties */
  allowUnknown?: boolean;
  
  /** Configuration cache */
  cache?: boolean;
  
  /** Cache TTL */
  cacheTtl?: number;
  
  /** Custom configuration loader */
  loader?: (options: ConfigLoaderOptions) => Promise<CFAuthConfig>;
}

/**
 * Configuration builder interface
 */
export interface ConfigBuilder {
  /** Set app configuration */
  app: (config: AppConfig) => ConfigBuilder;
  
  /** Set auth configuration */
  auth: (config: AuthConfig) => ConfigBuilder;
  
  /** Set database configuration */
  database: (config: DatabaseConfig) => ConfigBuilder;
  
  /** Set security configuration */
  security: (config: SecurityConfig) => ConfigBuilder;
  
  /** Set session configuration */
  session: (config: SessionConfig) => ConfigBuilder;
  
  /** Set email configuration */
  email: (config: EmailConfig) => ConfigBuilder;
  
  /** Set SMS configuration */
  sms: (config: SMSConfig) => ConfigBuilder;
  
  /** Set OAuth configuration */
  oauth: (config: OAuthConfig) => ConfigBuilder;
  
  /** Set plugin configuration */
  plugins: (config: PluginConfig) => ConfigBuilder;
  
  /** Set logging configuration */
  logging: (config: LoggingConfig) => ConfigBuilder;
  
  /** Set rate limiting configuration */
  rateLimit: (config: RateLimitConfig) => ConfigBuilder;
  
  /** Set CORS configuration */
  cors: (config: CORSConfig) => ConfigBuilder;
  
  /** Set storage configuration */
  storage: (config: StorageConfig) => ConfigBuilder;
  
  /** Set webhook configuration */
  webhooks: (config: WebhookConfig) => ConfigBuilder;
  
  /** Set analytics configuration */
  analytics: (config: AnalyticsConfig) => ConfigBuilder;
  
  /** Set feature flags */
  features: (config: FeatureFlags) => ConfigBuilder;
  
  /** Set environment configuration */
  environments: (config: EnvironmentConfig) => ConfigBuilder;
  
  /** Set custom configuration */
  custom: (config: ConfigObject) => ConfigBuilder;
  
  /** Build final configuration */
  build: () => CFAuthConfig;
  
  /** Validate configuration */
  validate: () => { valid: boolean; errors?: string[] };
  
  /** Load configuration from file */
  loadFromFile: (filePath: string) => ConfigBuilder;
  
  /** Load configuration from environment */
  loadFromEnv: (prefix?: string) => ConfigBuilder;
  
  /** Merge with existing configuration */
  merge: (config: DeepPartial<CFAuthConfig>) => ConfigBuilder;
}
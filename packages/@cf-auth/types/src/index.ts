/**
 * CF-Better-Auth Types
 * 
 * Shared TypeScript type definitions for the CF-Better-Auth ecosystem.
 * This package provides a single source of truth for all type definitions
 * used across @cf-auth packages.
 * 
 * @version 0.1.0
 * @license MIT
 */

// =============================================================================
// Common utility types
// =============================================================================
export * from './common';
export type {
  DeepPartial,
  DeepRequired,
  RequireAtLeastOne,
  RequireExactlyOne,
  PartialBy,
  RequiredBy,
  OmitId,
  WithId,
  OmitTimestamps,
  WithTimestamps,
  WithOptionalTimestamps,
  StringifyValues,
  ValueOf,
  ArrayElement,
  Brand,
  Nominal,
  JsonPrimitive,
  JsonValue,
  JsonObject,
  JsonArray,
  Expand,
  IsNever,
  XOR,
  Mutable,
  Immutable,
  OptionalKeys,
  RequiredKeys,
  OptionalProperties,
  RequiredProperties,
  AnyFunction,
  VoidFunction,
  AsyncFunction,
  Awaited,
  Status,
  Environment,
  LogLevel,
  SortOrder,
  PaginationParams,
  PaginatedResponse,
  SortParams,
  FilterParams,
  SearchParams,
  ApiResponse,
  ConfigObject,
  Callback,
  EventHandler,
  Middleware,
  Factory,
  Builder,
  Disposable
} from './common';

// =============================================================================
// Authentication types
// =============================================================================
export * from './auth';
export type {
  // Branded types
  UserId,
  SessionId,
  AccountId,
  OrganizationId,
  TeamId,
  RoleId,
  PermissionId,
  
  // Core entities
  User,
  CreateUserInput,
  UpdateUserInput,
  UserPreferences,
  Session,
  DeviceInfo,
  LocationInfo,
  Account,
  Verification,
  Organization,
  Address,
  OrganizationSettings,
  PasswordPolicy,
  Team,
  TeamSettings,
  Role,
  Permission,
  UserRole,
  OrganizationMember,
  TeamMember,
  
  // MFA types
  MFASettings,
  WebAuthnCredential,
  
  // Auth attempts and methods
  AuthMethod,
  AuthAttempt,
  
  // Credentials and registration
  LoginCredentials,
  RegisterData,
  PasswordResetRequest,
  PasswordResetConfirmation,
  
  // OAuth
  OAuthProvider
} from './auth';

// =============================================================================
// Database schema types
// =============================================================================
export * from './database';
export type {
  DatabaseProvider,
  DatabaseConfig,
  DatabaseSchema,
  BaseTable,
  UserTable,
  SessionTable,
  AccountTable,
  VerificationTable,
  OrganizationTable,
  TeamTable,
  RoleTable,
  PermissionTable,
  UserRoleTable,
  OrganizationMemberTable,
  TeamMemberTable,
  RolePermissionTable,
  MFASettingsTable,
  WebAuthnCredentialTable,
  AuthAttemptTable,
  OAuthProviderTable,
  ApiKeyTable,
  AuditLogTable,
  RateLimitTable,
  NotificationTable,
  UserPreferencesTable,
  Migration,
  DatabaseConnection,
  DatabaseAdapter,
  QueryBuilder,
  Repository,
  FindOptions,
  DatabaseEvent,
  DatabaseEventPayload,
  DatabaseMetrics,
  DatabaseHealthCheck
} from './database';

// =============================================================================
// API request/response types
// =============================================================================
export * from './api';
export type {
  HttpMethod,
  HttpStatusCode,
  ApiRequest,
  ApiResponseBase,
  ErrorResponse,
  ValidationError,
  SuccessResponse,
  
  // WebSocket types
  WebSocketMessageType,
  WebSocketMessage,
  WebSocketAuthMessage,
  WebSocketSubscribeMessage,
  WebSocketEventMessage,
  WebSocketErrorMessage,
  WebSocketNotificationMessage,
  
  // Webhook types
  WebhookEventType,
  WebhookPayload,
  WebhookConfig,
  WebhookDelivery
} from './api';

// Export all endpoint namespaces
export {
  LoginEndpoint,
  RegisterEndpoint,
  LogoutEndpoint,
  RefreshEndpoint,
  MeEndpoint,
  ForgotPasswordEndpoint,
  ResetPasswordEndpoint,
  VerifyEmailEndpoint,
  ResendEmailVerificationEndpoint,
  OAuthLoginEndpoint,
  OAuthCallbackEndpoint,
  ListUsersEndpoint,
  GetUserEndpoint,
  UpdateUserEndpoint,
  DeleteUserEndpoint,
  ListUserSessionsEndpoint,
  RevokeUserSessionEndpoint,
  ListOrganizationsEndpoint,
  CreateOrganizationEndpoint,
  GetOrganizationEndpoint,
  UpdateOrganizationEndpoint,
  DeleteOrganizationEndpoint,
  ListOrganizationMembersEndpoint,
  AddOrganizationMemberEndpoint,
  UpdateOrganizationMemberEndpoint,
  RemoveOrganizationMemberEndpoint,
  ListTeamsEndpoint,
  CreateTeamEndpoint,
  GetTeamEndpoint,
  UpdateTeamEndpoint,
  DeleteTeamEndpoint,
  ListRolesEndpoint,
  CreateRoleEndpoint,
  GetRoleEndpoint,
  UpdateRoleEndpoint,
  DeleteRoleEndpoint,
  ListPermissionsEndpoint,
  GetMFAStatusEndpoint,
  SetupTOTPEndpoint,
  VerifyTOTPEndpoint,
  DisableTOTPEndpoint
} from './api';

// =============================================================================
// Plugin system types
// =============================================================================
export * from './plugins';
export type {
  PluginLifecycle,
  PluginType,
  PluginStatus,
  PluginPriority,
  BasePlugin,
  PluginMetadata,
  PluginConfigSchema,
  PluginConfigProperty,
  PluginContext,
  PluginLogger,
  PluginStorage,
  PluginEventEmitter,
  PluginUtils,
  ValidationResult,
  ValidationError as PluginValidationError,
  JWTOptions,
  PluginHttpClient,
  HttpRequestOptions,
  HttpResponse,
  PluginFileSystem,
  FileStats,
  PluginPathUtils,
  AuthInstance,
  ServerPlugin,
  ServerPluginHooks,
  ServerPluginMiddleware,
  ServerPluginRoute,
  DatabaseMigration,
  ClientPlugin,
  ClientPluginContext,
  ClientPluginClient,
  ClientRouter,
  ClientStateManager,
  ClientPluginHooks,
  ClientPluginComponent,
  ClientPluginProvider,
  ClientPluginUtilities,
  ClientPluginStorage,
  ClientPluginCookies,
  CookieOptions,
  ClientPluginDom,
  ClientPluginForms,
  ValidationRules,
  ValidationRule as ClientValidationRule,
  ClientPluginValidation,
  PasswordValidationRules,
  PluginRegistry,
  PluginFilter,
  PluginRegistryEvent,
  PluginBuilder,
  PluginManifest,
  PluginInstallOptions
} from './plugins';

// =============================================================================
// Configuration types
// =============================================================================
export * from './config';
export type {
  CFAuthConfig,
  AppConfig,
  AuthConfig,
  EmailPasswordConfig,
  MagicLinkConfig,
  PhoneOtpConfig,
  MFAConfig,
  WebAuthnConfig,
  SocialAuthConfig,
  SocialProviderConfig,
  AnonymousAuthConfig,
  JWTConfig,
  PasswordPolicyConfig,
  AccountLinkingConfig,
  VerificationConfig,
  AuthFlowConfig,
  RegistrationField,
  SecurityConfig,
  SessionConfig,
  EmailConfig,
  EmailTemplate,
  SMSConfig,
  SMSTemplate,
  OAuthConfig,
  PluginConfig,
  LoggingConfig,
  LogOutput,
  LogFilter,
  LogEntry,
  RateLimitConfig,
  RateLimit,
  CORSConfig,
  StorageConfig,
  WebhookConfig,
  AnalyticsConfig,
  FeatureFlags,
  EnvironmentConfig,
  ConfigValidationSchema,
  ConfigValidationProperty,
  ConfigLoaderOptions,
  ConfigBuilder
} from './config';

// =============================================================================
// Error types and codes
// =============================================================================
export * from './errors';
export {
  CFAuthError,
  ErrorFactory,
  AUTH_ERROR_CODES,
  AUTHZ_ERROR_CODES,
  VALIDATION_ERROR_CODES,
  NETWORK_ERROR_CODES,
  DATABASE_ERROR_CODES,
  CONFIG_ERROR_CODES,
  PLUGIN_ERROR_CODES,
  SYSTEM_ERROR_CODES,
  ERROR_CODES
} from './errors';

export type {
  BaseError,
  CFAuthErrorOptions,
  ErrorCategory,
  ErrorSeverity,
  ErrorCode,
  ErrorDetails,
  ErrorHandler,
  ErrorReporter,
  ErrorRecoveryStrategy,
  ErrorNotification,
  ErrorMetrics,
  ErrorContext
} from './errors';

// =============================================================================
// Event system types
// =============================================================================
export * from './events';
export type {
  BaseEvent,
  EventMetadata,
  EventPriority,
  EventCategory,
  CFAuthEvent,
  EventEmitter,
  EventBus,
  ChannelConfig,
  EventChannel,
  ChannelStats,
  EventMiddleware,
  EventStore,
  EventQueryOptions,
  EventQueryCriteria,
  EventSubscription,
  EventReplay,
  EventAggregator,
  EventStatistics,
  RealTimeConfig,
  RealTimeClient
} from './events';

// Export all event namespaces
export {
  AuthenticationEvents,
  SessionEvents,
  UserEvents,
  OrganizationEvents,
  TeamEvents,
  SecurityEvents,
  SystemEvents,
  PluginEvents,
  WebhookEvents,
  NotificationEvents
} from './events';

// =============================================================================
// Version and metadata
// =============================================================================

/**
 * Package version
 */
export const VERSION = '0.1.0';

/**
 * Package metadata
 */
export const PACKAGE_INFO = {
  name: '@cf-auth/types',
  version: VERSION,
  description: 'Shared TypeScript type definitions for the CF-Better-Auth ecosystem',
  author: 'CF-Auth Team',
  license: 'MIT',
  repository: 'https://github.com/cf-auth/cf-better-auth',
  homepage: 'https://cf-auth.dev',
  keywords: [
    'auth',
    'authentication',
    'better-auth',
    'cloudflare',
    'typescript',
    'types'
  ]
} as const;

/**
 * Supported better-auth versions
 */
export const BETTER_AUTH_COMPATIBILITY = {
  minimum: '0.2.0',
  tested: ['0.2.0', '0.3.0'],
  latest: '0.3.0'
} as const;

/**
 * Type guards and utilities
 */

/**
 * Check if value is a CF-Auth error
 */
export function isCFAuthError(error: unknown): error is CFAuthError {
  return error instanceof CFAuthError;
}

/**
 * Check if value is a valid user ID
 */
export function isUserId(value: unknown): value is UserId {
  return typeof value === 'string' && value.length > 0;
}

/**
 * Check if value is a valid session ID  
 */
export function isSessionId(value: unknown): value is SessionId {
  return typeof value === 'string' && value.length > 0;
}

/**
 * Check if value is a valid organization ID
 */
export function isOrganizationId(value: unknown): value is OrganizationId {
  return typeof value === 'string' && value.length > 0;
}

/**
 * Check if value is a valid team ID
 */
export function isTeamId(value: unknown): value is TeamId {
  return typeof value === 'string' && value.length > 0;
}

/**
 * Check if value is a valid event
 */
export function isCFAuthEvent(value: unknown): value is CFAuthEvent {
  return (
    typeof value === 'object' &&
    value !== null &&
    'id' in value &&
    'type' in value &&
    'timestamp' in value &&
    'source' in value &&
    'version' in value &&
    'data' in value
  );
}

/**
 * Type assertion helpers
 */

/**
 * Assert that value is a User
 */
export function assertUser(value: unknown): asserts value is User {
  if (!value || typeof value !== 'object') {
    throw new Error('Expected User object');
  }
  
  const user = value as any;
  if (!user.id || typeof user.id !== 'string') {
    throw new Error('User must have a valid id');
  }
  
  if (!user.createdAt || !(user.createdAt instanceof Date)) {
    throw new Error('User must have a valid createdAt timestamp');
  }
  
  if (!user.updatedAt || !(user.updatedAt instanceof Date)) {
    throw new Error('User must have a valid updatedAt timestamp');
  }
}

/**
 * Assert that value is a Session
 */
export function assertSession(value: unknown): asserts value is Session {
  if (!value || typeof value !== 'object') {
    throw new Error('Expected Session object');
  }
  
  const session = value as any;
  if (!session.id || typeof session.id !== 'string') {
    throw new Error('Session must have a valid id');
  }
  
  if (!session.userId || typeof session.userId !== 'string') {
    throw new Error('Session must have a valid userId');
  }
  
  if (!session.expiresAt || !(session.expiresAt instanceof Date)) {
    throw new Error('Session must have a valid expiresAt timestamp');
  }
}

/**
 * Assert that value is an Organization
 */
export function assertOrganization(value: unknown): asserts value is Organization {
  if (!value || typeof value !== 'object') {
    throw new Error('Expected Organization object');
  }
  
  const org = value as any;
  if (!org.id || typeof org.id !== 'string') {
    throw new Error('Organization must have a valid id');
  }
  
  if (!org.name || typeof org.name !== 'string') {
    throw new Error('Organization must have a valid name');
  }
  
  if (!org.slug || typeof org.slug !== 'string') {
    throw new Error('Organization must have a valid slug');
  }
}

/**
 * Utility functions for working with types
 */

/**
 * Create a new user with defaults
 */
export function createUser(data: CreateUserInput): Omit<User, 'id'> {
  const now = new Date();
  
  return {
    email: data.email,
    emailVerified: data.emailVerified || false,
    name: data.name,
    firstName: data.firstName,
    lastName: data.lastName,
    image: data.image,
    phone: data.phone,
    phoneVerified: data.phoneVerified || false,
    locale: data.locale || 'en',
    timezone: data.timezone,
    status: data.status || 'active',
    roles: data.roles || [],
    organizations: data.organizations || [],
    teams: data.teams || [],
    lastActiveAt: data.lastActiveAt,
    preferences: data.preferences || {},
    metadata: data.metadata || {},
    bannedAt: data.bannedAt,
    banReason: data.banReason,
    deletedAt: data.deletedAt,
    createdAt: now,
    updatedAt: now
  };
}

/**
 * Create a new session with defaults
 */
export function createSession(userId: UserId, data: Partial<Session> = {}): Omit<Session, 'id'> {
  const now = new Date();
  const defaultExpiry = new Date(now.getTime() + 24 * 60 * 60 * 1000); // 24 hours
  
  return {
    userId,
    token: data.token,
    expiresAt: data.expiresAt || defaultExpiry,
    ipAddress: data.ipAddress,
    userAgent: data.userAgent,
    device: data.device,
    location: data.location,
    isActive: data.isActive !== undefined ? data.isActive : true,
    lastAccessedAt: data.lastAccessedAt,
    metadata: data.metadata || {},
    revokedAt: data.revokedAt,
    revokeReason: data.revokeReason,
    createdAt: now,
    updatedAt: now
  };
}

/**
 * Create a new organization with defaults
 */
export function createOrganization(data: Omit<Organization, 'id' | 'createdAt' | 'updatedAt'>): Omit<Organization, 'id'> {
  const now = new Date();
  
  return {
    ...data,
    status: data.status || 'active',
    settings: data.settings || {},
    metadata: data.metadata || {},
    createdAt: now,
    updatedAt: now
  };
}

/**
 * Default export with all types and utilities
 */
export default {
  VERSION,
  PACKAGE_INFO,
  BETTER_AUTH_COMPATIBILITY,
  ERROR_CODES,
  isCFAuthError,
  isUserId,
  isSessionId,
  isOrganizationId,
  isTeamId,
  isCFAuthEvent,
  assertUser,
  assertSession,
  assertOrganization,
  createUser,
  createSession,
  createOrganization,
  CFAuthError,
  ErrorFactory
};
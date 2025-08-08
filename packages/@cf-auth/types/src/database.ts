/**
 * Database schema types for CF-Better-Auth
 * Defines the database structure for all authentication-related tables
 */

import type {
  User,
  Session,
  Account,
  Verification,
  Organization,
  Team,
  Role,
  Permission,
  UserRole,
  OrganizationMember,
  TeamMember,
  MFASettings,
  WebAuthnCredential,
  AuthAttempt,
  OAuthProvider,
  UserId,
  SessionId,
  AccountId,
  OrganizationId,
  TeamId,
  RoleId,
  PermissionId
} from './auth';

/**
 * Database provider types
 */
export type DatabaseProvider = 'postgresql' | 'mysql' | 'sqlite' | 'mongodb' | 'turso' | 'planetscale';

/**
 * Database connection configuration
 */
export interface DatabaseConfig {
  /** Database provider */
  provider: DatabaseProvider;
  
  /** Connection URL */
  url?: string;
  
  /** Connection string (alias for url) */
  connectionString?: string;
  
  /** Host */
  host?: string;
  
  /** Port */
  port?: number;
  
  /** Database name */
  database?: string;
  
  /** Username */
  username?: string;
  
  /** Password */
  password?: string;
  
  /** SSL configuration */
  ssl?: boolean | {
    ca?: string;
    cert?: string;
    key?: string;
    rejectUnauthorized?: boolean;
  };
  
  /** Connection pool settings */
  pool?: {
    min?: number;
    max?: number;
    idleTimeoutMillis?: number;
    connectionTimeoutMillis?: number;
  };
  
  /** Additional provider-specific options */
  options?: Record<string, any>;
  
  /** Migration settings */
  migrations?: {
    enabled?: boolean;
    directory?: string;
    tableName?: string;
  };
  
  /** Logging settings */
  logging?: boolean | {
    level?: 'debug' | 'info' | 'warn' | 'error';
    queries?: boolean;
    parameters?: boolean;
  };
}

/**
 * Database table schema definitions
 */
export interface DatabaseSchema {
  users: UserTable;
  sessions: SessionTable;
  accounts: AccountTable;
  verifications: VerificationTable;
  organizations: OrganizationTable;
  teams: TeamTable;
  roles: RoleTable;
  permissions: PermissionTable;
  userRoles: UserRoleTable;
  organizationMembers: OrganizationMemberTable;
  teamMembers: TeamMemberTable;
  mfaSettings: MFASettingsTable;
  webauthnCredentials: WebAuthnCredentialTable;
  authAttempts: AuthAttemptTable;
  oauthProviders: OAuthProviderTable;
  apiKeys: ApiKeyTable;
  auditLogs: AuditLogTable;
  rateLimits: RateLimitTable;
  notifications: NotificationTable;
  userPreferences: UserPreferencesTable;
}

/**
 * Base table interface with common fields
 */
export interface BaseTable {
  id: string;
  createdAt: Date;
  updatedAt: Date;
}

/**
 * Users table schema
 */
export interface UserTable extends BaseTable {
  id: UserId;
  email?: string;
  emailVerified?: boolean;
  name?: string;
  firstName?: string;
  lastName?: string;
  image?: string;
  phone?: string;
  phoneVerified?: boolean;
  locale?: string;
  timezone?: string;
  status: 'active' | 'inactive' | 'pending' | 'suspended' | 'deleted';
  lastActiveAt?: Date;
  metadata?: string; // JSON string
  bannedAt?: Date;
  banReason?: string;
  deletedAt?: Date;
}

/**
 * Sessions table schema
 */
export interface SessionTable extends BaseTable {
  id: SessionId;
  userId: UserId;
  token?: string;
  expiresAt: Date;
  ipAddress?: string;
  userAgent?: string;
  device?: string; // JSON string
  location?: string; // JSON string
  isActive: boolean;
  lastAccessedAt?: Date;
  metadata?: string; // JSON string
  revokedAt?: Date;
  revokeReason?: string;
}

/**
 * Accounts table schema
 */
export interface AccountTable extends BaseTable {
  id: AccountId;
  userId: UserId;
  provider: string;
  providerAccountId: string;
  type: 'oauth' | 'oidc' | 'email' | 'credentials' | 'webauthn';
  accessToken?: string;
  refreshToken?: string;
  idToken?: string;
  tokenType?: string;
  scope?: string;
  expiresAt?: number;
  providerData?: string; // JSON string
  status: 'active' | 'inactive' | 'pending' | 'suspended' | 'deleted';
  linkedAt: Date;
}

/**
 * Verifications table schema
 */
export interface VerificationTable extends BaseTable {
  id: string;
  identifier: string;
  value: string;
  expiresAt: Date;
  type: 'email' | 'phone' | 'password_reset' | 'email_change';
  userId?: UserId;
  attempts?: number;
  maxAttempts?: number;
  used?: boolean;
  usedAt?: Date;
}

/**
 * Organizations table schema
 */
export interface OrganizationTable extends BaseTable {
  id: OrganizationId;
  name: string;
  slug: string;
  description?: string;
  logo?: string;
  website?: string;
  email?: string;
  phone?: string;
  address?: string; // JSON string
  settings?: string; // JSON string
  status: 'active' | 'inactive' | 'pending' | 'suspended' | 'deleted';
  metadata?: string; // JSON string
  deletedAt?: Date;
}

/**
 * Teams table schema
 */
export interface TeamTable extends BaseTable {
  id: TeamId;
  name: string;
  slug: string;
  description?: string;
  organizationId: OrganizationId;
  avatar?: string;
  settings?: string; // JSON string
  status: 'active' | 'inactive' | 'pending' | 'suspended' | 'deleted';
  metadata?: string; // JSON string
  deletedAt?: Date;
}

/**
 * Roles table schema
 */
export interface RoleTable extends BaseTable {
  id: RoleId;
  name: string;
  description?: string;
  organizationId?: OrganizationId;
  system: boolean;
  color?: string;
  metadata?: string; // JSON string
  status: 'active' | 'inactive' | 'pending' | 'suspended' | 'deleted';
}

/**
 * Permissions table schema
 */
export interface PermissionTable extends BaseTable {
  id: PermissionId;
  name: string;
  description?: string;
  resource: string;
  action: string;
  conditions?: string; // JSON string
  system: boolean;
  metadata?: string; // JSON string
}

/**
 * User roles junction table schema
 */
export interface UserRoleTable {
  userId: UserId;
  roleId: RoleId;
  organizationId?: OrganizationId;
  assignedAt: Date;
  assignedBy?: UserId;
  expiresAt?: Date;
  metadata?: string; // JSON string
  createdAt: Date;
  updatedAt: Date;
}

/**
 * Organization members junction table schema
 */
export interface OrganizationMemberTable {
  userId: UserId;
  organizationId: OrganizationId;
  role: string;
  status: 'active' | 'inactive' | 'pending' | 'suspended';
  joinedAt: Date;
  invitedBy?: UserId;
  permissions?: string; // JSON array string
  metadata?: string; // JSON string
  createdAt: Date;
  updatedAt: Date;
}

/**
 * Team members junction table schema
 */
export interface TeamMemberTable {
  userId: UserId;
  teamId: TeamId;
  role: string;
  status: 'active' | 'inactive' | 'pending';
  joinedAt: Date;
  addedBy?: UserId;
  permissions?: string; // JSON array string
  metadata?: string; // JSON string
  createdAt: Date;
  updatedAt: Date;
}

/**
 * Role permissions junction table schema
 */
export interface RolePermissionTable {
  roleId: RoleId;
  permissionId: PermissionId;
  createdAt: Date;
  updatedAt: Date;
}

/**
 * MFA settings table schema
 */
export interface MFASettingsTable extends BaseTable {
  id: string;
  userId: UserId;
  enabled: boolean;
  totp?: string; // JSON string
  sms?: string; // JSON string
  email?: string; // JSON string
  webauthn?: string; // JSON string
  recoveryCodes?: string; // JSON array string
  metadata?: string; // JSON string
}

/**
 * WebAuthn credentials table schema
 */
export interface WebAuthnCredentialTable extends BaseTable {
  id: string;
  userId: UserId;
  publicKey: string;
  counter: number;
  name?: string;
  device?: string; // JSON string
  lastUsedAt?: Date;
  backupEligible?: boolean;
  backupState?: boolean;
  metadata?: string; // JSON string
}

/**
 * Auth attempts table schema
 */
export interface AuthAttemptTable extends BaseTable {
  id: string;
  userId?: UserId;
  identifier?: string;
  method: 'password' | 'oauth' | 'magic_link' | 'otp' | 'webauthn' | 'sms' | 'totp' | 'recovery_code';
  success: boolean;
  errorCode?: string;
  errorMessage?: string;
  ipAddress?: string;
  userAgent?: string;
  device?: string; // JSON string
  location?: string; // JSON string
  metadata?: string; // JSON string
}

/**
 * OAuth providers table schema
 */
export interface OAuthProviderTable extends BaseTable {
  id: string;
  name: string;
  type: 'oauth2' | 'oidc';
  clientId: string;
  clientSecret: string;
  authorizationUrl: string;
  tokenUrl: string;
  userInfoUrl?: string;
  redirectUri: string;
  scopes: string; // JSON array string
  config?: string; // JSON string
  enabled: boolean;
}

/**
 * API keys table schema
 */
export interface ApiKeyTable extends BaseTable {
  id: string;
  userId?: UserId;
  organizationId?: OrganizationId;
  name: string;
  key: string; // Hashed
  permissions: string; // JSON array string
  expiresAt?: Date;
  lastUsedAt?: Date;
  status: 'active' | 'inactive' | 'revoked';
  metadata?: string; // JSON string
}

/**
 * Audit logs table schema
 */
export interface AuditLogTable extends BaseTable {
  id: string;
  userId?: UserId;
  organizationId?: OrganizationId;
  action: string;
  resource: string;
  resourceId?: string;
  oldValues?: string; // JSON string
  newValues?: string; // JSON string
  ipAddress?: string;
  userAgent?: string;
  metadata?: string; // JSON string
}

/**
 * Rate limits table schema
 */
export interface RateLimitTable extends BaseTable {
  id: string;
  identifier: string; // IP, user ID, etc.
  resource: string; // What's being rate limited
  count: number;
  windowStart: Date;
  windowEnd: Date;
  metadata?: string; // JSON string
}

/**
 * Notifications table schema
 */
export interface NotificationTable extends BaseTable {
  id: string;
  userId: UserId;
  type: string;
  title: string;
  message?: string;
  data?: string; // JSON string
  read: boolean;
  readAt?: Date;
  expiresAt?: Date;
  metadata?: string; // JSON string
}

/**
 * User preferences table schema
 */
export interface UserPreferencesTable extends BaseTable {
  id: string;
  userId: UserId;
  preferences: string; // JSON string of UserPreferences
}

/**
 * Database migration interface
 */
export interface Migration {
  /** Migration ID */
  id: string;
  
  /** Migration name */
  name: string;
  
  /** Migration version */
  version: string;
  
  /** Migration timestamp */
  timestamp: Date;
  
  /** Up migration function */
  up: (db: DatabaseConnection) => Promise<void>;
  
  /** Down migration function */
  down: (db: DatabaseConnection) => Promise<void>;
  
  /** Migration dependencies */
  dependencies?: string[];
}

/**
 * Database connection interface
 */
export interface DatabaseConnection {
  /** Execute raw SQL query */
  query: (sql: string, params?: any[]) => Promise<any>;
  
  /** Execute SQL in a transaction */
  transaction: <T>(fn: (trx: DatabaseConnection) => Promise<T>) => Promise<T>;
  
  /** Close connection */
  close: () => Promise<void>;
  
  /** Check if connection is healthy */
  ping: () => Promise<boolean>;
  
  /** Get database provider */
  getProvider: () => DatabaseProvider;
  
  /** Get connection configuration */
  getConfig: () => DatabaseConfig;
}

/**
 * Database adapter interface
 */
export interface DatabaseAdapter {
  /** Initialize the adapter */
  initialize: (config: DatabaseConfig) => Promise<DatabaseConnection>;
  
  /** Create database tables */
  createTables: (connection: DatabaseConnection) => Promise<void>;
  
  /** Drop database tables */
  dropTables: (connection: DatabaseConnection) => Promise<void>;
  
  /** Run migrations */
  migrate: (connection: DatabaseConnection, migrations: Migration[]) => Promise<void>;
  
  /** Rollback migrations */
  rollback: (connection: DatabaseConnection, steps?: number) => Promise<void>;
  
  /** Get migration status */
  getMigrationStatus: (connection: DatabaseConnection) => Promise<Migration[]>;
  
  /** Seed database with initial data */
  seed: (connection: DatabaseConnection, data: any) => Promise<void>;
  
  /** Backup database */
  backup: (connection: DatabaseConnection, path: string) => Promise<void>;
  
  /** Restore database */
  restore: (connection: DatabaseConnection, path: string) => Promise<void>;
}

/**
 * Query builder interface
 */
export interface QueryBuilder<T = any> {
  /** Select columns */
  select: (columns?: string[]) => QueryBuilder<T>;
  
  /** From table */
  from: (table: string) => QueryBuilder<T>;
  
  /** Where clause */
  where: (condition: string | object, value?: any) => QueryBuilder<T>;
  
  /** Join clause */
  join: (table: string, condition: string) => QueryBuilder<T>;
  
  /** Order by */
  orderBy: (column: string, direction?: 'asc' | 'desc') => QueryBuilder<T>;
  
  /** Limit results */
  limit: (count: number) => QueryBuilder<T>;
  
  /** Offset results */
  offset: (count: number) => QueryBuilder<T>;
  
  /** Insert data */
  insert: (data: Partial<T>) => QueryBuilder<T>;
  
  /** Update data */
  update: (data: Partial<T>) => QueryBuilder<T>;
  
  /** Delete data */
  delete: () => QueryBuilder<T>;
  
  /** Execute query */
  execute: () => Promise<T[]>;
  
  /** Execute query and return first result */
  first: () => Promise<T | null>;
  
  /** Get SQL string */
  toSQL: () => string;
}

/**
 * Repository interface for database operations
 */
export interface Repository<T, ID = string> {
  /** Find by ID */
  findById: (id: ID) => Promise<T | null>;
  
  /** Find one by criteria */
  findOne: (criteria: Partial<T>) => Promise<T | null>;
  
  /** Find many by criteria */
  findMany: (criteria?: Partial<T>, options?: FindOptions) => Promise<T[]>;
  
  /** Create new entity */
  create: (data: Omit<T, 'id' | 'createdAt' | 'updatedAt'>) => Promise<T>;
  
  /** Update entity */
  update: (id: ID, data: Partial<T>) => Promise<T>;
  
  /** Delete entity */
  delete: (id: ID) => Promise<boolean>;
  
  /** Count entities */
  count: (criteria?: Partial<T>) => Promise<number>;
  
  /** Check if entity exists */
  exists: (id: ID) => Promise<boolean>;
}

/**
 * Find options for repository queries
 */
export interface FindOptions {
  /** Pagination */
  limit?: number;
  offset?: number;
  
  /** Sorting */
  orderBy?: string;
  order?: 'asc' | 'desc';
  
  /** Include related data */
  include?: string[];
  
  /** Select specific columns */
  select?: string[];
}

/**
 * Database event types
 */
export type DatabaseEvent = 
  | 'connected'
  | 'disconnected'
  | 'error'
  | 'query'
  | 'migration_start'
  | 'migration_complete'
  | 'migration_error'
  | 'backup_start'
  | 'backup_complete'
  | 'backup_error'
  | 'restore_start'
  | 'restore_complete'
  | 'restore_error';

/**
 * Database event payload
 */
export interface DatabaseEventPayload {
  event: DatabaseEvent;
  timestamp: Date;
  data?: any;
  error?: Error;
  metadata?: Record<string, any>;
}

/**
 * Database metrics
 */
export interface DatabaseMetrics {
  /** Connection pool status */
  connections: {
    active: number;
    idle: number;
    total: number;
  };
  
  /** Query statistics */
  queries: {
    total: number;
    successful: number;
    failed: number;
    averageTime: number;
  };
  
  /** Error statistics */
  errors: {
    total: number;
    recent: Error[];
  };
  
  /** Migration status */
  migrations: {
    pending: number;
    completed: number;
    failed: number;
  };
}

/**
 * Database health check result
 */
export interface DatabaseHealthCheck {
  /** Whether database is healthy */
  healthy: boolean;
  
  /** Health check timestamp */
  timestamp: Date;
  
  /** Response time in milliseconds */
  responseTime: number;
  
  /** Connection status */
  connectionStatus: 'connected' | 'disconnected' | 'error';
  
  /** Migration status */
  migrationStatus: 'up-to-date' | 'pending' | 'error';
  
  /** Error details (if any) */
  error?: {
    message: string;
    code?: string;
    details?: any;
  };
  
  /** Additional metadata */
  metadata?: Record<string, any>;
}
/**
 * Type definitions for @cf-auth/client
 */

import type { ReactNode } from 'react';
import type { Atom, WritableAtom } from 'nanostores';
import type { BetterAuthClientPlugin } from '@cf-auth/plugin-interfaces/client';
import type { 
  User,
  Session,
  AuthResponse,
  SignInResponse,
  SignUpResponse,
  OrganizationData,
  TeamData,
  ApiKeyData,
  AuditLogData,
  CFAuthError 
} from '@cf-auth/types';

// ============================================================================
// Core Client Configuration
// ============================================================================

export interface CFAuthClientOptions {
  /** Base URL for the auth server */
  baseURL: string;
  
  /** API path prefix (default: "/api/auth") */
  apiPath?: string;
  
  /** Enable automatic token refresh */
  autoRefresh?: boolean;
  
  /** Token refresh threshold in minutes (default: 5) */
  refreshThreshold?: number;
  
  /** Storage configuration */
  storage?: StorageConfig;
  
  /** WebSocket configuration for real-time updates */
  websocket?: WebSocketConfig;
  
  /** Request timeout in milliseconds (default: 30000) */
  timeout?: number;
  
  /** Retry configuration */
  retry?: RetryConfig;
  
  /** Cache configuration */
  cache?: CacheConfig;
  
  /** Client-side plugins */
  plugins?: BetterAuthClientPlugin[];
  
  /** Enable debug mode */
  debug?: boolean;
  
  /** Custom fetch implementation */
  customFetch?: typeof fetch;
  
  /** Global error handler */
  onError?: (error: CFAuthError) => void;
  
  /** Session update callback */
  onSessionUpdate?: (session: Session | null) => void;
  
  /** User update callback */
  onUserUpdate?: (user: User | null) => void;
}

export interface StorageConfig {
  /** Storage type */
  type: 'localStorage' | 'sessionStorage' | 'memory' | 'custom';
  
  /** Custom storage implementation (required for type: 'custom') */
  implementation?: StorageImplementation;
  
  /** Storage key prefix (default: 'cf-auth-') */
  keyPrefix?: string;
}

export interface StorageImplementation {
  getItem: (key: string) => string | null | Promise<string | null>;
  setItem: (key: string, value: string) => void | Promise<void>;
  removeItem: (key: string) => void | Promise<void>;
  clear?: () => void | Promise<void>;
}

export interface WebSocketConfig {
  /** Enable WebSocket connection */
  enabled: boolean;
  
  /** WebSocket endpoint URL */
  url?: string;
  
  /** Auto-reconnect configuration */
  reconnect?: {
    /** Enable auto-reconnect */
    enabled?: boolean;
    /** Max reconnection attempts */
    maxAttempts?: number;
    /** Delay between attempts in ms */
    delay?: number;
    /** Exponential backoff multiplier */
    backoffMultiplier?: number;
  };
  
  /** Connection timeout in ms */
  timeout?: number;
  
  /** Heartbeat configuration */
  heartbeat?: {
    /** Enable heartbeat */
    enabled?: boolean;
    /** Heartbeat interval in ms */
    interval?: number;
    /** Heartbeat timeout in ms */
    timeout?: number;
  };
}

export interface RetryConfig {
  /** Maximum retry attempts */
  maxAttempts: number;
  
  /** Delay between retries in ms */
  delay: number;
  
  /** Exponential backoff multiplier */
  backoffMultiplier?: number;
  
  /** Maximum delay between retries in ms */
  maxDelay?: number;
  
  /** Conditions to retry on */
  retryConditions?: Array<(error: any) => boolean>;
}

export interface CacheConfig {
  /** Enable caching */
  enabled: boolean;
  
  /** Default TTL in ms */
  defaultTTL?: number;
  
  /** Maximum cache size */
  maxSize?: number;
  
  /** Cache invalidation strategies */
  invalidateOn?: Array<'signIn' | 'signOut' | 'sessionUpdate' | 'userUpdate'>;
}

// ============================================================================
// Authentication State
// ============================================================================

export interface AuthState {
  /** Current user */
  user: User | null;
  
  /** Current session */
  session: Session | null;
  
  /** Loading state */
  loading: boolean;
  
  /** Error state */
  error: CFAuthError | null;
  
  /** Initialization state */
  initialized: boolean;
  
  /** Last updated timestamp */
  lastUpdated: number;
}

export interface SessionState extends AuthState {
  /** Session expiration time */
  expiresAt: Date | null;
  
  /** Time until token refresh */
  refreshIn: number;
  
  /** Whether session is expired */
  isExpired: boolean;
  
  /** Whether session needs refresh */
  needsRefresh: boolean;
}

// ============================================================================
// Hook Return Types
// ============================================================================

export interface UseSessionReturn extends SessionState {
  /** Refresh session */
  refresh: () => Promise<void>;
  
  /** Sign out */
  signOut: () => Promise<void>;
}

export interface UseUserReturn {
  /** Current user */
  user: User | null;
  
  /** Loading state */
  loading: boolean;
  
  /** Error state */
  error: CFAuthError | null;
  
  /** Update user */
  updateUser: (data: Partial<User>) => Promise<User>;
  
  /** Change password */
  changePassword: (oldPassword: string, newPassword: string) => Promise<void>;
  
  /** Update email */
  updateEmail: (email: string) => Promise<void>;
  
  /** Verify email */
  verifyEmail: (token: string) => Promise<void>;
  
  /** Enable two-factor authentication */
  enableTwoFactor: () => Promise<{ qrCode: string; backupCodes: string[] }>;
  
  /** Disable two-factor authentication */
  disableTwoFactor: (code: string) => Promise<void>;
}

export interface UseAuthReturn extends UseSessionReturn {
  /** Sign in */
  signIn: (credentials: SignInCredentials) => Promise<SignInResponse>;
  
  /** Sign up */
  signUp: (data: SignUpData) => Promise<SignUpResponse>;
  
  /** Reset password */
  resetPassword: (data: PasswordResetData) => Promise<void>;
  
  /** Verify reset token */
  verifyResetToken: (token: string) => Promise<boolean>;
  
  /** Resend verification email */
  resendVerificationEmail: () => Promise<void>;
}

export interface UseOrganizationReturn {
  /** Current active organization */
  organization: OrganizationData | null;
  
  /** All user organizations */
  organizations: OrganizationData[];
  
  /** Loading state */
  loading: boolean;
  
  /** Error state */
  error: CFAuthError | null;
  
  /** Switch active organization */
  switchOrganization: (organizationId: string) => Promise<void>;
  
  /** Create organization */
  createOrganization: (data: CreateOrganizationData) => Promise<OrganizationData>;
  
  /** Update organization */
  updateOrganization: (id: string, data: Partial<OrganizationData>) => Promise<OrganizationData>;
  
  /** Delete organization */
  deleteOrganization: (id: string) => Promise<void>;
  
  /** Invite member */
  inviteMember: (email: string, role: string) => Promise<void>;
  
  /** Remove member */
  removeMember: (userId: string) => Promise<void>;
  
  /** Update member role */
  updateMemberRole: (userId: string, role: string) => Promise<void>;
}

export interface UseTeamReturn {
  /** Current teams */
  teams: TeamData[];
  
  /** Loading state */
  loading: boolean;
  
  /** Error state */
  error: CFAuthError | null;
  
  /** Create team */
  createTeam: (data: CreateTeamData) => Promise<TeamData>;
  
  /** Update team */
  updateTeam: (id: string, data: Partial<TeamData>) => Promise<TeamData>;
  
  /** Delete team */
  deleteTeam: (id: string) => Promise<void>;
  
  /** Add team member */
  addMember: (teamId: string, userId: string, role?: string) => Promise<void>;
  
  /** Remove team member */
  removeMember: (teamId: string, userId: string) => Promise<void>;
}

export interface UseApiKeysReturn {
  /** User API keys */
  apiKeys: ApiKeyData[];
  
  /** Loading state */
  loading: boolean;
  
  /** Error state */
  error: CFAuthError | null;
  
  /** Create API key */
  createKey: (data: CreateApiKeyData) => Promise<ApiKeyData>;
  
  /** Revoke API key */
  revokeKey: (keyId: string) => Promise<void>;
  
  /** Update API key */
  updateKey: (keyId: string, data: Partial<ApiKeyData>) => Promise<ApiKeyData>;
}

export interface UseAuditLogReturn {
  /** Audit log entries */
  logs: AuditLogData[];
  
  /** Loading state */
  loading: boolean;
  
  /** Error state */
  error: CFAuthError | null;
  
  /** Fetch more logs */
  fetchMore: () => Promise<void>;
  
  /** Filter logs */
  filter: (filters: AuditLogFilters) => Promise<void>;
  
  /** Export logs */
  export: (format: 'json' | 'csv') => Promise<Blob>;
}

// ============================================================================
// Request/Response Types
// ============================================================================

export interface SignInCredentials {
  email?: string;
  username?: string;
  password?: string;
  provider?: string;
  code?: string;
  token?: string;
  twoFactorCode?: string;
  rememberMe?: boolean;
}

export interface SignUpData {
  email: string;
  password?: string;
  name?: string;
  username?: string;
  metadata?: Record<string, any>;
  organizationInviteToken?: string;
}

export interface PasswordResetData {
  email?: string;
  token?: string;
  newPassword?: string;
}

export interface CreateOrganizationData {
  name: string;
  slug?: string;
  description?: string;
  metadata?: Record<string, any>;
}

export interface CreateTeamData {
  name: string;
  organizationId: string;
  description?: string;
  metadata?: Record<string, any>;
}

export interface CreateApiKeyData {
  name: string;
  permissions?: string[];
  expiresAt?: Date;
  metadata?: Record<string, any>;
}

export interface AuditLogFilters {
  event?: string;
  userId?: string;
  organizationId?: string;
  startDate?: Date;
  endDate?: Date;
  limit?: number;
  offset?: number;
}

export interface MagicLinkData {
  email: string;
  redirectTo?: string;
  data?: Record<string, any>;
}

export interface PasskeyCredentials {
  challenge?: string;
  userVerification?: 'required' | 'preferred' | 'discouraged';
}

// ============================================================================
// WebSocket Types
// ============================================================================

export interface WebSocketMessage {
  type: string;
  payload: any;
  id?: string;
  timestamp: number;
}

export interface WebSocketEvent {
  type: 'open' | 'close' | 'error' | 'message';
  data?: any;
  error?: Error;
  code?: number;
  reason?: string;
}

export interface WebSocketState {
  connected: boolean;
  connecting: boolean;
  error: Error | null;
  lastConnected: Date | null;
  reconnectAttempts: number;
}

// ============================================================================
// Provider Context Types
// ============================================================================

export interface AuthProviderProps {
  children: ReactNode;
  options: CFAuthClientOptions;
}

export interface AuthContextValue extends UseAuthReturn {
  /** Client instance */
  client: CFAuthClient;
  
  /** WebSocket state */
  websocket: WebSocketState;
  
  /** Connect to WebSocket */
  connectWebSocket: () => Promise<void>;
  
  /** Disconnect from WebSocket */
  disconnectWebSocket: () => void;
}

// ============================================================================
// Client Interface
// ============================================================================

export interface CFAuthClient {
  /** Configuration options */
  options: CFAuthClientOptions;
  
  /** Authentication methods */
  auth: {
    signIn: (credentials: SignInCredentials) => Promise<SignInResponse>;
    signUp: (data: SignUpData) => Promise<SignUpResponse>;
    signOut: () => Promise<void>;
    resetPassword: (data: PasswordResetData) => Promise<void>;
    verifyResetToken: (token: string) => Promise<boolean>;
    sendMagicLink: (data: MagicLinkData) => Promise<void>;
    verifyMagicLink: (token: string) => Promise<SignInResponse>;
    refreshSession: () => Promise<Session>;
    getSession: () => Promise<Session | null>;
  };
  
  /** User management */
  user: {
    get: () => Promise<User | null>;
    update: (data: Partial<User>) => Promise<User>;
    changePassword: (oldPassword: string, newPassword: string) => Promise<void>;
    updateEmail: (email: string) => Promise<void>;
    verifyEmail: (token: string) => Promise<void>;
    resendVerificationEmail: () => Promise<void>;
    enableTwoFactor: () => Promise<{ qrCode: string; backupCodes: string[] }>;
    disableTwoFactor: (code: string) => Promise<void>;
    verifyTwoFactor: (code: string) => Promise<boolean>;
  };
  
  /** Organization management */
  organization: {
    list: () => Promise<OrganizationData[]>;
    get: (id: string) => Promise<OrganizationData>;
    create: (data: CreateOrganizationData) => Promise<OrganizationData>;
    update: (id: string, data: Partial<OrganizationData>) => Promise<OrganizationData>;
    delete: (id: string) => Promise<void>;
    switch: (id: string) => Promise<void>;
    inviteMember: (id: string, email: string, role: string) => Promise<void>;
    removeMember: (id: string, userId: string) => Promise<void>;
    updateMemberRole: (id: string, userId: string, role: string) => Promise<void>;
  };
  
  /** Team management */
  team: {
    list: (organizationId?: string) => Promise<TeamData[]>;
    get: (id: string) => Promise<TeamData>;
    create: (data: CreateTeamData) => Promise<TeamData>;
    update: (id: string, data: Partial<TeamData>) => Promise<TeamData>;
    delete: (id: string) => Promise<void>;
    addMember: (teamId: string, userId: string, role?: string) => Promise<void>;
    removeMember: (teamId: string, userId: string) => Promise<void>;
  };
  
  /** API key management */
  apiKey: {
    list: () => Promise<ApiKeyData[]>;
    create: (data: CreateApiKeyData) => Promise<ApiKeyData>;
    update: (id: string, data: Partial<ApiKeyData>) => Promise<ApiKeyData>;
    revoke: (id: string) => Promise<void>;
  };
  
  /** Audit log */
  auditLog: {
    list: (filters?: AuditLogFilters) => Promise<AuditLogData[]>;
    export: (format: 'json' | 'csv', filters?: AuditLogFilters) => Promise<Blob>;
  };
  
  /** Passkey support */
  passkey: {
    register: (options?: PasskeyCredentials) => Promise<void>;
    authenticate: (options?: PasskeyCredentials) => Promise<SignInResponse>;
    list: () => Promise<any[]>;
    remove: (id: string) => Promise<void>;
  };
  
  /** State management atoms */
  atoms: {
    auth: WritableAtom<AuthState>;
    user: WritableAtom<User | null>;
    session: WritableAtom<Session | null>;
    organizations: WritableAtom<OrganizationData[]>;
    activeOrganization: WritableAtom<OrganizationData | null>;
    teams: WritableAtom<TeamData[]>;
    apiKeys: WritableAtom<ApiKeyData[]>;
    websocket: WritableAtom<WebSocketState>;
  };
  
  /** WebSocket connection */
  websocket: {
    connect: () => Promise<void>;
    disconnect: () => void;
    send: (message: WebSocketMessage) => void;
    on: (event: string, listener: (data: any) => void) => () => void;
    off: (event: string, listener: (data: any) => void) => void;
    state: WebSocketState;
  };
  
  /** Storage utilities */
  storage: {
    get: (key: string) => Promise<string | null>;
    set: (key: string, value: string) => Promise<void>;
    remove: (key: string) => Promise<void>;
    clear: () => Promise<void>;
  };
  
  /** Plugin management */
  plugins: {
    register: (plugin: BetterAuthClientPlugin) => void;
    unregister: (pluginId: string) => void;
    get: (pluginId: string) => BetterAuthClientPlugin | null;
    list: () => BetterAuthClientPlugin[];
  };
  
  /** Utility methods */
  utils: {
    buildUrl: (path: string, params?: Record<string, any>) => string;
    request: <T = any>(endpoint: string, options?: RequestOptions) => Promise<T>;
    refreshTokenIfNeeded: () => Promise<void>;
    clearCache: () => void;
  };
  
  /** Lifecycle methods */
  initialize: () => Promise<void>;
  destroy: () => void;
}

export interface RequestOptions {
  method?: 'GET' | 'POST' | 'PUT' | 'DELETE' | 'PATCH';
  headers?: Record<string, string>;
  body?: any;
  params?: Record<string, any>;
  timeout?: number;
  retry?: RetryConfig;
  cache?: boolean;
}

// ============================================================================
// Event Types
// ============================================================================

export interface AuthEventMap {
  'auth:signIn': { user: User; session: Session };
  'auth:signOut': {};
  'auth:sessionUpdate': { session: Session };
  'auth:userUpdate': { user: User };
  'auth:error': { error: CFAuthError };
  'auth:tokenRefresh': { session: Session };
  'organization:switch': { organization: OrganizationData };
  'organization:update': { organization: OrganizationData };
  'websocket:connect': {};
  'websocket:disconnect': {};
  'websocket:error': { error: Error };
  'websocket:message': { message: WebSocketMessage };
}

export type AuthEventName = keyof AuthEventMap;
export type AuthEventListener<T extends AuthEventName> = (data: AuthEventMap[T]) => void;

// ============================================================================
// Utility Types
// ============================================================================

export type DeepPartial<T> = {
  [P in keyof T]?: T[P] extends object ? DeepPartial<T[P]> : T[P];
};

export type OptionalExcept<T, K extends keyof T> = Partial<T> & Pick<T, K>;

export type AsyncState<T> = {
  data: T | null;
  loading: boolean;
  error: Error | null;
  lastUpdated: number | null;
};

export type MutationState<T> = AsyncState<T> & {
  mutate: (data: T | null) => void;
  reset: () => void;
};

// ============================================================================
// Plugin System Types
// ============================================================================

export interface ClientPlugin extends BetterAuthClientPlugin {
  /** Plugin initialization */
  init?: (client: CFAuthClient) => Promise<void> | void;
  
  /** Plugin cleanup */
  cleanup?: () => Promise<void> | void;
  
  /** Plugin configuration */
  configure?: (options: any) => void;
}

// ============================================================================
// Error Types
// ============================================================================

export interface ClientError extends CFAuthError {
  /** HTTP status code */
  statusCode?: number;
  
  /** Request URL */
  url?: string;
  
  /** Request method */
  method?: string;
  
  /** Response data */
  response?: any;
  
  /** Retry attempt number */
  attempt?: number;
}

export type ErrorCode = 
  | 'NETWORK_ERROR'
  | 'TIMEOUT_ERROR'
  | 'AUTHENTICATION_ERROR'
  | 'AUTHORIZATION_ERROR'
  | 'VALIDATION_ERROR'
  | 'SERVER_ERROR'
  | 'CLIENT_ERROR'
  | 'WEBSOCKET_ERROR'
  | 'STORAGE_ERROR'
  | 'PLUGIN_ERROR';
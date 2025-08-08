/**
 * @cf-auth/client - Client-side authentication wrapper for CF-Better-Auth
 * 
 * This package provides a complete client-side authentication solution that works
 * seamlessly with the @cf-auth/core server adapter. It includes:
 * 
 * - Full TypeScript support
 * - React hooks and context providers
 * - WebSocket support for real-time updates
 * - Automatic token refresh
 * - Plugin system for extensibility
 * - Comprehensive error handling
 * - Storage management (localStorage, sessionStorage, memory, custom)
 * - Organizations, teams, and role-based access control
 * - API key management
 * - Audit logging
 * - Passkey support (WebAuthn)
 * - Two-factor authentication
 * - Magic link authentication
 * 
 * @example
 * ```tsx
 * import { CFAuthProvider, useAuth } from '@cf-auth/client';
 * 
 * function App() {
 *   return (
 *     <CFAuthProvider options={{ baseURL: 'https://api.example.com' }}>
 *       <AuthenticatedApp />
 *     </CFAuthProvider>
 *   );
 * }
 * 
 * function AuthenticatedApp() {
 *   const { user, signIn, signOut } = useAuth();
 *   
 *   if (!user) {
 *     return <LoginForm onSignIn={signIn} />;
 *   }
 *   
 *   return <Dashboard user={user} onSignOut={signOut} />;
 * }
 * ```
 */

// ============================================================================
// Core Client
// ============================================================================

export { createCFAuthClient, CFAuthClientImpl } from './client';
export type { CFAuthClient } from './types';

// ============================================================================
// React Integration
// ============================================================================

// Providers
export {
  CFAuthProvider,
  AuthGuard,
  Authenticated,
  Unauthenticated,
  Verified,
  RoleGuard,
  PermissionGuard,
  LoadingGuard,
  AuthErrorBoundary,
  Conditional,
  UserDisplay,
  WebSocketProvider,
  withAuth,
  withRole,
  withPermission,
  useAuthContext
} from './providers';

// Hooks
export {
  useAuth,
  useSession,
  useUser,
  useOrganizations,
  useActiveOrganization,
  useTeams,
  useApiKeys,
  useAuditLogs,
  useWebSocket,
  useAsyncState,
  useDebounce,
  useLocalStorage,
  usePrevious,
  useIsOnline,
  useAuthState,
  useAuthClient,
  setGlobalClient
} from './hooks';

// ============================================================================
// Types
// ============================================================================

export type {
  // Core configuration
  CFAuthClientOptions,
  StorageConfig,
  StorageImplementation,
  WebSocketConfig,
  RetryConfig,
  CacheConfig,
  RequestOptions,
  
  // Authentication state
  AuthState,
  SessionState,
  
  // Hook return types
  UseSessionReturn,
  UseUserReturn,
  UseAuthReturn,
  UseOrganizationReturn,
  UseTeamReturn,
  UseApiKeysReturn,
  UseAuditLogReturn,
  
  // Request/Response types
  SignInCredentials,
  SignUpData,
  PasswordResetData,
  CreateOrganizationData,
  CreateTeamData,
  CreateApiKeyData,
  AuditLogFilters,
  MagicLinkData,
  PasskeyCredentials,
  
  // WebSocket types
  WebSocketMessage,
  WebSocketEvent,
  WebSocketState,
  
  // Provider types
  AuthProviderProps,
  AuthContextValue,
  
  // Plugin types
  ClientPlugin,
  
  // Error types
  ClientError,
  ErrorCode,
  
  // Utility types
  DeepPartial,
  OptionalExcept,
  AsyncState,
  MutationState,
  
  // Event types (if we had defined them)
  AuthEventMap,
  AuthEventName,
  AuthEventListener
} from './types';

// ============================================================================
// Utilities
// ============================================================================

export {
  StorageManager,
  RequestManager,
  WebSocketManager,
  TokenManager,
  CacheManager,
  ClientError,
  createClientError,
  isClientError,
  parseJWTPayload,
  isTokenExpired,
  getTokenExpirationTime,
  validateEmail,
  validatePassword,
  generateRandomId,
  debounce,
  throttle,
  handleApiError
} from './utils';

// ============================================================================
// Re-exports from dependencies
// ============================================================================

// Re-export types from @cf-auth/types for convenience
export type {
  User,
  Session,
  Account,
  Verification,
  OrganizationData,
  TeamData,
  ApiKeyData,
  AuditLogData,
  AuthResponse,
  SignInResponse,
  SignUpResponse,
  CFAuthError,
  ERROR_CODES
} from '@cf-auth/types';

// Re-export plugin interfaces
export type {
  BetterAuthClientPlugin,
  ClientActions,
  ClientAtoms,
  ClientHooks,
  ClientEventListeners,
  ClientPluginContext,
  ClientPluginOptions
} from '@cf-auth/plugin-interfaces/client';

// ============================================================================
// Constants
// ============================================================================

export const VERSION = '0.1.0';

export const DEFAULT_OPTIONS: Partial<CFAuthClientOptions> = {
  apiPath: '/api/auth',
  autoRefresh: true,
  refreshThreshold: 5,
  timeout: 30000,
  storage: {
    type: 'localStorage',
    keyPrefix: 'cf-auth-'
  },
  retry: {
    maxAttempts: 3,
    delay: 1000,
    backoffMultiplier: 2,
    maxDelay: 10000
  },
  cache: {
    enabled: true,
    defaultTTL: 5 * 60 * 1000, // 5 minutes
    maxSize: 100,
    invalidateOn: ['signIn', 'signOut', 'sessionUpdate']
  },
  debug: false
};

export const STORAGE_KEYS = {
  TOKENS: 'tokens',
  USER: 'user',
  SESSION: 'session',
  ORGANIZATIONS: 'organizations',
  ACTIVE_ORGANIZATION: 'activeOrganization',
  PREFERENCES: 'preferences'
} as const;

export const ERROR_CODES = {
  NETWORK_ERROR: 'NETWORK_ERROR',
  TIMEOUT_ERROR: 'TIMEOUT_ERROR',
  AUTHENTICATION_ERROR: 'AUTHENTICATION_ERROR',
  AUTHORIZATION_ERROR: 'AUTHORIZATION_ERROR',
  VALIDATION_ERROR: 'VALIDATION_ERROR',
  SERVER_ERROR: 'SERVER_ERROR',
  CLIENT_ERROR: 'CLIENT_ERROR',
  WEBSOCKET_ERROR: 'WEBSOCKET_ERROR',
  STORAGE_ERROR: 'STORAGE_ERROR',
  PLUGIN_ERROR: 'PLUGIN_ERROR',
  INITIALIZATION_ERROR: 'INITIALIZATION_ERROR',
  CONFIGURATION_ERROR: 'CONFIGURATION_ERROR',
  NOT_IMPLEMENTED: 'NOT_IMPLEMENTED'
} as const;

// ============================================================================
// Utility Functions
// ============================================================================

/**
 * Create a client instance with default options
 */
export function createClient(options: CFAuthClientOptions): CFAuthClient {
  return createCFAuthClient({
    ...DEFAULT_OPTIONS,
    ...options
  } as CFAuthClientOptions);
}

/**
 * Check if the current environment supports WebSocket
 */
export function supportsWebSocket(): boolean {
  return typeof WebSocket !== 'undefined';
}

/**
 * Check if the current environment supports localStorage
 */
export function supportsLocalStorage(): boolean {
  try {
    if (typeof localStorage === 'undefined') return false;
    const test = 'cf-auth-test';
    localStorage.setItem(test, test);
    localStorage.removeItem(test);
    return true;
  } catch {
    return false;
  }
}

/**
 * Check if the current environment supports sessionStorage
 */
export function supportsSessionStorage(): boolean {
  try {
    if (typeof sessionStorage === 'undefined') return false;
    const test = 'cf-auth-test';
    sessionStorage.setItem(test, test);
    sessionStorage.removeItem(test);
    return true;
  } catch {
    return false;
  }
}

/**
 * Get recommended storage type based on environment capabilities
 */
export function getRecommendedStorageType(): 'localStorage' | 'sessionStorage' | 'memory' {
  if (supportsLocalStorage()) return 'localStorage';
  if (supportsSessionStorage()) return 'sessionStorage';
  return 'memory';
}

/**
 * Validate client options
 */
export function validateClientOptions(options: CFAuthClientOptions): void {
  if (!options.baseURL) {
    throw new ClientError('baseURL is required', 'CONFIGURATION_ERROR');
  }

  try {
    new URL(options.baseURL);
  } catch {
    throw new ClientError('baseURL must be a valid URL', 'CONFIGURATION_ERROR');
  }

  if (options.storage?.type === 'custom' && !options.storage.implementation) {
    throw new ClientError(
      'storage.implementation is required when storage.type is "custom"',
      'CONFIGURATION_ERROR'
    );
  }

  if (options.websocket?.enabled && !supportsWebSocket()) {
    console.warn('WebSocket is not supported in this environment');
  }
}

// ============================================================================
// Plugin Helpers
// ============================================================================

/**
 * Create a simple client plugin
 */
export function createPlugin(config: {
  id: string;
  name?: string;
  version?: string;
  init?: (client: CFAuthClient) => void | Promise<void>;
  cleanup?: () => void | Promise<void>;
  actions?: Record<string, (...args: any[]) => Promise<any>>;
  hooks?: Record<string, (...args: any[]) => any>;
}): ClientPlugin {
  return {
    id: config.id,
    name: config.name,
    version: config.version,
    init: config.init,
    cleanup: config.cleanup,
    getActions: config.actions ? () => config.actions! : undefined,
    getHooks: config.hooks ? () => config.hooks! : undefined
  } as ClientPlugin;
}

// ============================================================================
// Development Helpers
// ============================================================================

/**
 * Enable debug mode for development
 */
export function enableDebugMode(): void {
  if (typeof window !== 'undefined') {
    (window as any).__CF_AUTH_DEBUG__ = true;
    console.log('CF-Auth debug mode enabled');
  }
}

/**
 * Get debug information about the client
 */
export function getDebugInfo(client: CFAuthClient): object {
  return {
    version: VERSION,
    options: client.options,
    initialized: client.atoms.auth.get().initialized,
    user: client.atoms.user.get(),
    session: client.atoms.session.get(),
    websocket: client.atoms.websocket.get(),
    plugins: client.plugins.list().map(p => ({
      id: p.id,
      name: p.name,
      version: p.version
    }))
  };
}

// ============================================================================
// Default Export
// ============================================================================

export default {
  createClient,
  createCFAuthClient,
  CFAuthProvider,
  useAuth,
  useSession,
  useUser,
  VERSION,
  DEFAULT_OPTIONS,
  ERROR_CODES
};
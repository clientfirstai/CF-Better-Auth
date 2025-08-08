/**
 * Main client implementation for @cf-auth/client
 */

import { atom, WritableAtom } from 'nanostores';
import { createAuthClient } from 'better-auth/react';
import type {
  CFAuthClient,
  CFAuthClientOptions,
  AuthState,
  WebSocketState,
  SignInCredentials,
  SignUpData,
  PasswordResetData,
  MagicLinkData,
  PasskeyCredentials,
  CreateOrganizationData,
  CreateTeamData,
  CreateApiKeyData,
  AuditLogFilters,
  RequestOptions,
  ClientPlugin
} from './types';
import type {
  User,
  Session,
  SignInResponse,
  SignUpResponse,
  OrganizationData,
  TeamData,
  ApiKeyData,
  AuditLogData
} from '@cf-auth/types';
import {
  StorageManager,
  RequestManager,
  WebSocketManager,
  TokenManager,
  CacheManager,
  ClientError,
  createClientError
} from './utils';
import { BetterAuthClientPlugin } from '@cf-auth/plugin-interfaces/client';
import EventEmitter from 'eventemitter3';

export class CFAuthClientImpl implements CFAuthClient {
  readonly options: CFAuthClientOptions;
  
  // Core managers
  private storage: StorageManager;
  private requestManager: RequestManager;
  private websocketManager?: WebSocketManager;
  private tokenManager: TokenManager;
  private cacheManager?: CacheManager;
  private eventEmitter: EventEmitter;
  
  // Better Auth client
  private betterAuthClient: any;
  
  // State atoms
  readonly atoms: {
    auth: WritableAtom<AuthState>;
    user: WritableAtom<User | null>;
    session: WritableAtom<Session | null>;
    organizations: WritableAtom<OrganizationData[]>;
    activeOrganization: WritableAtom<OrganizationData | null>;
    teams: WritableAtom<TeamData[]>;
    apiKeys: WritableAtom<ApiKeyData[]>;
    websocket: WritableAtom<WebSocketState>;
  };
  
  // Plugins
  private plugins = new Map<string, ClientPlugin>();
  
  // Internal state
  private initialized = false;
  private destroyed = false;
  private refreshTimeout?: NodeJS.Timeout;

  constructor(options: CFAuthClientOptions) {
    this.options = { ...options };
    this.eventEmitter = new EventEmitter();
    
    // Initialize managers
    this.storage = new StorageManager(options.storage);
    this.requestManager = new RequestManager(options, this.storage);
    this.tokenManager = new TokenManager(this.storage);
    
    if (options.websocket?.enabled) {
      this.websocketManager = new WebSocketManager(
        options.baseURL,
        options.websocket,
        this.storage
      );
    }
    
    if (options.cache?.enabled) {
      this.cacheManager = new CacheManager(options.cache);
    }
    
    // Initialize atoms
    this.atoms = {
      auth: atom<AuthState>({
        user: null,
        session: null,
        loading: false,
        error: null,
        initialized: false,
        lastUpdated: 0
      }),
      user: atom<User | null>(null),
      session: atom<Session | null>(null),
      organizations: atom<OrganizationData[]>([]),
      activeOrganization: atom<OrganizationData | null>(null),
      teams: atom<TeamData[]>([]),
      apiKeys: atom<ApiKeyData[]>([]),
      websocket: atom<WebSocketState>({
        connected: false,
        connecting: false,
        error: null,
        lastConnected: null,
        reconnectAttempts: 0
      })
    };
    
    // Create better-auth client with plugins
    this.createBetterAuthClient();
    
    // Register built-in plugins
    if (options.plugins) {
      options.plugins.forEach(plugin => this.plugins.register(plugin));
    }
  }

  private createBetterAuthClient(): void {
    const plugins = Array.from(this.plugins.values()).map(plugin => 
      plugin.getActions?.(this.requestManager.request.bind(this.requestManager))
    ).filter(Boolean);

    this.betterAuthClient = createAuthClient({
      baseURL: this.options.baseURL,
      plugins,
      fetchOptions: {
        onError: (error) => {
          if (this.options.onError) {
            this.options.onError(createClientError(
              error.message || 'Request failed',
              'CLIENT_ERROR',
              error
            ));
          }
        }
      }
    });
  }

  // ============================================================================
  // Lifecycle Methods
  // ============================================================================

  async initialize(): Promise<void> {
    if (this.initialized || this.destroyed) return;

    try {
      this.setAuthState({ loading: true, error: null });

      // Try to restore session from storage
      await this.restoreSession();

      // Initialize WebSocket if enabled
      if (this.websocketManager) {
        await this.setupWebSocket();
      }

      // Setup automatic token refresh
      if (this.options.autoRefresh !== false) {
        this.setupTokenRefresh();
      }

      // Initialize plugins
      await this.initializePlugins();

      this.setAuthState({ 
        loading: false, 
        initialized: true,
        lastUpdated: Date.now()
      });

      this.initialized = true;
    } catch (error) {
      const clientError = createClientError(
        'Failed to initialize client',
        'INITIALIZATION_ERROR',
        error
      );
      
      this.setAuthState({
        loading: false,
        error: clientError,
        initialized: true,
        lastUpdated: Date.now()
      });

      if (this.options.onError) {
        this.options.onError(clientError);
      }
    }
  }

  destroy(): void {
    if (this.destroyed) return;

    // Clear refresh timeout
    if (this.refreshTimeout) {
      clearTimeout(this.refreshTimeout);
    }

    // Disconnect WebSocket
    if (this.websocketManager) {
      this.websocketManager.disconnect();
    }

    // Cleanup plugins
    for (const plugin of this.plugins.values()) {
      if (plugin.cleanup) {
        plugin.cleanup();
      }
    }

    // Clear cache
    if (this.cacheManager) {
      this.cacheManager.clear();
    }

    // Remove all event listeners
    this.eventEmitter.removeAllListeners();

    this.destroyed = true;
  }

  // ============================================================================
  // Authentication Methods
  // ============================================================================

  readonly auth = {
    signIn: async (credentials: SignInCredentials): Promise<SignInResponse> => {
      try {
        this.setAuthState({ loading: true, error: null });

        const response = await this.betterAuthClient.signIn.email(credentials);
        
        if (response.error) {
          throw createClientError(response.error.message, 'AUTHENTICATION_ERROR');
        }

        await this.handleAuthSuccess(response.data.user, response.data.session);
        
        this.eventEmitter.emit('auth:signIn', { 
          user: response.data.user, 
          session: response.data.session 
        });

        return response.data;
      } catch (error) {
        const clientError = createClientError(
          'Sign in failed',
          'AUTHENTICATION_ERROR',
          error
        );
        this.setAuthState({ loading: false, error: clientError });
        throw clientError;
      }
    },

    signUp: async (data: SignUpData): Promise<SignUpResponse> => {
      try {
        this.setAuthState({ loading: true, error: null });

        const response = await this.betterAuthClient.signUp.email(data);
        
        if (response.error) {
          throw createClientError(response.error.message, 'AUTHENTICATION_ERROR');
        }

        if (response.data.session) {
          await this.handleAuthSuccess(response.data.user, response.data.session);
        } else {
          // Email verification required
          this.setAuthState({ loading: false });
        }

        return response.data;
      } catch (error) {
        const clientError = createClientError(
          'Sign up failed',
          'AUTHENTICATION_ERROR',
          error
        );
        this.setAuthState({ loading: false, error: clientError });
        throw clientError;
      }
    },

    signOut: async (): Promise<void> => {
      try {
        await this.betterAuthClient.signOut();
        await this.handleSignOut();
        
        this.eventEmitter.emit('auth:signOut', {});
      } catch (error) {
        // Still clear local state even if server signout fails
        await this.handleSignOut();
        throw createClientError('Sign out failed', 'CLIENT_ERROR', error);
      }
    },

    resetPassword: async (data: PasswordResetData): Promise<void> => {
      try {
        if (data.token && data.newPassword) {
          // Reset password with token
          await this.requestManager.request('/password-reset/confirm', {
            method: 'POST',
            body: data
          });
        } else if (data.email) {
          // Send reset email
          await this.requestManager.request('/password-reset/request', {
            method: 'POST',
            body: { email: data.email }
          });
        } else {
          throw createClientError('Invalid password reset data', 'VALIDATION_ERROR');
        }
      } catch (error) {
        throw createClientError('Password reset failed', 'CLIENT_ERROR', error);
      }
    },

    verifyResetToken: async (token: string): Promise<boolean> => {
      try {
        await this.requestManager.request('/password-reset/verify', {
          method: 'POST',
          body: { token }
        });
        return true;
      } catch (error) {
        return false;
      }
    },

    sendMagicLink: async (data: MagicLinkData): Promise<void> => {
      try {
        await this.requestManager.request('/magic-link/send', {
          method: 'POST',
          body: data
        });
      } catch (error) {
        throw createClientError('Failed to send magic link', 'CLIENT_ERROR', error);
      }
    },

    verifyMagicLink: async (token: string): Promise<SignInResponse> => {
      try {
        const response = await this.requestManager.request<SignInResponse>('/magic-link/verify', {
          method: 'POST',
          body: { token }
        });
        
        await this.handleAuthSuccess(response.user, response.session);
        return response;
      } catch (error) {
        throw createClientError('Magic link verification failed', 'AUTHENTICATION_ERROR', error);
      }
    },

    refreshSession: async (): Promise<Session> => {
      try {
        await this.tokenManager.refreshTokens('/session/refresh', this.requestManager);
        
        const session = await this.getSession();
        if (!session) {
          throw createClientError('No session after refresh', 'AUTHENTICATION_ERROR');
        }

        this.atoms.session.set(session);
        this.eventEmitter.emit('auth:tokenRefresh', { session });
        
        return session;
      } catch (error) {
        throw createClientError('Session refresh failed', 'AUTHENTICATION_ERROR', error);
      }
    },

    getSession: async (): Promise<Session | null> => {
      try {
        const response = await this.requestManager.request<{ session: Session }>('/session');
        return response.session || null;
      } catch (error) {
        return null;
      }
    }
  };

  // ============================================================================
  // User Methods
  // ============================================================================

  readonly user = {
    get: async (): Promise<User | null> => {
      try {
        const response = await this.requestManager.request<{ user: User }>('/user');
        return response.user || null;
      } catch (error) {
        return null;
      }
    },

    update: async (data: Partial<User>): Promise<User> => {
      try {
        const response = await this.requestManager.request<{ user: User }>('/user', {
          method: 'PATCH',
          body: data
        });
        
        this.atoms.user.set(response.user);
        this.eventEmitter.emit('auth:userUpdate', { user: response.user });
        
        return response.user;
      } catch (error) {
        throw createClientError('User update failed', 'CLIENT_ERROR', error);
      }
    },

    changePassword: async (oldPassword: string, newPassword: string): Promise<void> => {
      try {
        await this.requestManager.request('/user/change-password', {
          method: 'POST',
          body: { oldPassword, newPassword }
        });
      } catch (error) {
        throw createClientError('Password change failed', 'CLIENT_ERROR', error);
      }
    },

    updateEmail: async (email: string): Promise<void> => {
      try {
        await this.requestManager.request('/user/email', {
          method: 'PATCH',
          body: { email }
        });
      } catch (error) {
        throw createClientError('Email update failed', 'CLIENT_ERROR', error);
      }
    },

    verifyEmail: async (token: string): Promise<void> => {
      try {
        await this.requestManager.request('/user/verify-email', {
          method: 'POST',
          body: { token }
        });
      } catch (error) {
        throw createClientError('Email verification failed', 'CLIENT_ERROR', error);
      }
    },

    resendVerificationEmail: async (): Promise<void> => {
      try {
        await this.requestManager.request('/user/resend-verification', {
          method: 'POST'
        });
      } catch (error) {
        throw createClientError('Failed to resend verification email', 'CLIENT_ERROR', error);
      }
    },

    enableTwoFactor: async (): Promise<{ qrCode: string; backupCodes: string[] }> => {
      try {
        const response = await this.requestManager.request('/user/2fa/enable', {
          method: 'POST'
        });
        return response;
      } catch (error) {
        throw createClientError('Failed to enable two-factor authentication', 'CLIENT_ERROR', error);
      }
    },

    disableTwoFactor: async (code: string): Promise<void> => {
      try {
        await this.requestManager.request('/user/2fa/disable', {
          method: 'POST',
          body: { code }
        });
      } catch (error) {
        throw createClientError('Failed to disable two-factor authentication', 'CLIENT_ERROR', error);
      }
    },

    verifyTwoFactor: async (code: string): Promise<boolean> => {
      try {
        await this.requestManager.request('/user/2fa/verify', {
          method: 'POST',
          body: { code }
        });
        return true;
      } catch (error) {
        return false;
      }
    }
  };

  // ============================================================================
  // Organization Methods
  // ============================================================================

  readonly organization = {
    list: async (): Promise<OrganizationData[]> => {
      try {
        const cached = this.cacheManager?.get<OrganizationData[]>('organizations');
        if (cached) return cached;

        const response = await this.requestManager.request<{ organizations: OrganizationData[] }>('/organizations');
        const organizations = response.organizations || [];
        
        this.cacheManager?.set('organizations', organizations, undefined, ['organizations']);
        this.atoms.organizations.set(organizations);
        
        return organizations;
      } catch (error) {
        throw createClientError('Failed to fetch organizations', 'CLIENT_ERROR', error);
      }
    },

    get: async (id: string): Promise<OrganizationData> => {
      try {
        const cached = this.cacheManager?.get<OrganizationData>(`organization:${id}`);
        if (cached) return cached;

        const response = await this.requestManager.request<{ organization: OrganizationData }>(`/organizations/${id}`);
        
        this.cacheManager?.set(`organization:${id}`, response.organization, undefined, ['organizations']);
        
        return response.organization;
      } catch (error) {
        throw createClientError('Failed to fetch organization', 'CLIENT_ERROR', error);
      }
    },

    create: async (data: CreateOrganizationData): Promise<OrganizationData> => {
      try {
        const response = await this.requestManager.request<{ organization: OrganizationData }>('/organizations', {
          method: 'POST',
          body: data
        });
        
        // Invalidate organizations cache
        this.cacheManager?.invalidateByTag('organizations');
        
        return response.organization;
      } catch (error) {
        throw createClientError('Failed to create organization', 'CLIENT_ERROR', error);
      }
    },

    update: async (id: string, data: Partial<OrganizationData>): Promise<OrganizationData> => {
      try {
        const response = await this.requestManager.request<{ organization: OrganizationData }>(`/organizations/${id}`, {
          method: 'PATCH',
          body: data
        });
        
        // Invalidate caches
        this.cacheManager?.invalidateByTag('organizations');
        this.cacheManager?.delete(`organization:${id}`);
        
        this.eventEmitter.emit('organization:update', { organization: response.organization });
        
        return response.organization;
      } catch (error) {
        throw createClientError('Failed to update organization', 'CLIENT_ERROR', error);
      }
    },

    delete: async (id: string): Promise<void> => {
      try {
        await this.requestManager.request(`/organizations/${id}`, {
          method: 'DELETE'
        });
        
        // Invalidate caches
        this.cacheManager?.invalidateByTag('organizations');
        this.cacheManager?.delete(`organization:${id}`);
      } catch (error) {
        throw createClientError('Failed to delete organization', 'CLIENT_ERROR', error);
      }
    },

    switch: async (id: string): Promise<void> => {
      try {
        await this.requestManager.request('/organizations/switch', {
          method: 'POST',
          body: { organizationId: id }
        });
        
        const organization = await this.organization.get(id);
        this.atoms.activeOrganization.set(organization);
        
        this.eventEmitter.emit('organization:switch', { organization });
      } catch (error) {
        throw createClientError('Failed to switch organization', 'CLIENT_ERROR', error);
      }
    },

    inviteMember: async (id: string, email: string, role: string): Promise<void> => {
      try {
        await this.requestManager.request(`/organizations/${id}/invite`, {
          method: 'POST',
          body: { email, role }
        });
      } catch (error) {
        throw createClientError('Failed to invite member', 'CLIENT_ERROR', error);
      }
    },

    removeMember: async (id: string, userId: string): Promise<void> => {
      try {
        await this.requestManager.request(`/organizations/${id}/members/${userId}`, {
          method: 'DELETE'
        });
      } catch (error) {
        throw createClientError('Failed to remove member', 'CLIENT_ERROR', error);
      }
    },

    updateMemberRole: async (id: string, userId: string, role: string): Promise<void> => {
      try {
        await this.requestManager.request(`/organizations/${id}/members/${userId}`, {
          method: 'PATCH',
          body: { role }
        });
      } catch (error) {
        throw createClientError('Failed to update member role', 'CLIENT_ERROR', error);
      }
    }
  };

  // ============================================================================
  // Team Methods
  // ============================================================================

  readonly team = {
    list: async (organizationId?: string): Promise<TeamData[]> => {
      try {
        const params = organizationId ? { organizationId } : undefined;
        const response = await this.requestManager.request<{ teams: TeamData[] }>('/teams', {
          params
        });
        
        const teams = response.teams || [];
        this.atoms.teams.set(teams);
        
        return teams;
      } catch (error) {
        throw createClientError('Failed to fetch teams', 'CLIENT_ERROR', error);
      }
    },

    get: async (id: string): Promise<TeamData> => {
      try {
        const response = await this.requestManager.request<{ team: TeamData }>(`/teams/${id}`);
        return response.team;
      } catch (error) {
        throw createClientError('Failed to fetch team', 'CLIENT_ERROR', error);
      }
    },

    create: async (data: CreateTeamData): Promise<TeamData> => {
      try {
        const response = await this.requestManager.request<{ team: TeamData }>('/teams', {
          method: 'POST',
          body: data
        });
        return response.team;
      } catch (error) {
        throw createClientError('Failed to create team', 'CLIENT_ERROR', error);
      }
    },

    update: async (id: string, data: Partial<TeamData>): Promise<TeamData> => {
      try {
        const response = await this.requestManager.request<{ team: TeamData }>(`/teams/${id}`, {
          method: 'PATCH',
          body: data
        });
        return response.team;
      } catch (error) {
        throw createClientError('Failed to update team', 'CLIENT_ERROR', error);
      }
    },

    delete: async (id: string): Promise<void> => {
      try {
        await this.requestManager.request(`/teams/${id}`, {
          method: 'DELETE'
        });
      } catch (error) {
        throw createClientError('Failed to delete team', 'CLIENT_ERROR', error);
      }
    },

    addMember: async (teamId: string, userId: string, role?: string): Promise<void> => {
      try {
        await this.requestManager.request(`/teams/${teamId}/members`, {
          method: 'POST',
          body: { userId, role }
        });
      } catch (error) {
        throw createClientError('Failed to add team member', 'CLIENT_ERROR', error);
      }
    },

    removeMember: async (teamId: string, userId: string): Promise<void> => {
      try {
        await this.requestManager.request(`/teams/${teamId}/members/${userId}`, {
          method: 'DELETE'
        });
      } catch (error) {
        throw createClientError('Failed to remove team member', 'CLIENT_ERROR', error);
      }
    }
  };

  // ============================================================================
  // API Key Methods
  // ============================================================================

  readonly apiKey = {
    list: async (): Promise<ApiKeyData[]> => {
      try {
        const response = await this.requestManager.request<{ apiKeys: ApiKeyData[] }>('/api-keys');
        const apiKeys = response.apiKeys || [];
        
        this.atoms.apiKeys.set(apiKeys);
        return apiKeys;
      } catch (error) {
        throw createClientError('Failed to fetch API keys', 'CLIENT_ERROR', error);
      }
    },

    create: async (data: CreateApiKeyData): Promise<ApiKeyData> => {
      try {
        const response = await this.requestManager.request<{ apiKey: ApiKeyData }>('/api-keys', {
          method: 'POST',
          body: data
        });
        return response.apiKey;
      } catch (error) {
        throw createClientError('Failed to create API key', 'CLIENT_ERROR', error);
      }
    },

    update: async (id: string, data: Partial<ApiKeyData>): Promise<ApiKeyData> => {
      try {
        const response = await this.requestManager.request<{ apiKey: ApiKeyData }>(`/api-keys/${id}`, {
          method: 'PATCH',
          body: data
        });
        return response.apiKey;
      } catch (error) {
        throw createClientError('Failed to update API key', 'CLIENT_ERROR', error);
      }
    },

    revoke: async (id: string): Promise<void> => {
      try {
        await this.requestManager.request(`/api-keys/${id}`, {
          method: 'DELETE'
        });
      } catch (error) {
        throw createClientError('Failed to revoke API key', 'CLIENT_ERROR', error);
      }
    }
  };

  // ============================================================================
  // Audit Log Methods
  // ============================================================================

  readonly auditLog = {
    list: async (filters?: AuditLogFilters): Promise<AuditLogData[]> => {
      try {
        const response = await this.requestManager.request<{ logs: AuditLogData[] }>('/audit-logs', {
          params: filters
        });
        return response.logs || [];
      } catch (error) {
        throw createClientError('Failed to fetch audit logs', 'CLIENT_ERROR', error);
      }
    },

    export: async (format: 'json' | 'csv', filters?: AuditLogFilters): Promise<Blob> => {
      try {
        const response = await this.requestManager.request(`/audit-logs/export`, {
          params: { format, ...filters },
          method: 'GET'
        });
        
        // Assuming the response is already a Blob or we need to create one
        if (response instanceof Blob) {
          return response;
        }
        
        const mimeType = format === 'json' ? 'application/json' : 'text/csv';
        return new Blob([JSON.stringify(response)], { type: mimeType });
      } catch (error) {
        throw createClientError('Failed to export audit logs', 'CLIENT_ERROR', error);
      }
    }
  };

  // ============================================================================
  // Passkey Methods
  // ============================================================================

  readonly passkey = {
    register: async (options?: PasskeyCredentials): Promise<void> => {
      try {
        // This would integrate with WebAuthn APIs
        throw createClientError('Passkey registration not implemented', 'NOT_IMPLEMENTED');
      } catch (error) {
        throw createClientError('Passkey registration failed', 'CLIENT_ERROR', error);
      }
    },

    authenticate: async (options?: PasskeyCredentials): Promise<SignInResponse> => {
      try {
        // This would integrate with WebAuthn APIs
        throw createClientError('Passkey authentication not implemented', 'NOT_IMPLEMENTED');
      } catch (error) {
        throw createClientError('Passkey authentication failed', 'CLIENT_ERROR', error);
      }
    },

    list: async (): Promise<any[]> => {
      try {
        const response = await this.requestManager.request<{ passkeys: any[] }>('/passkeys');
        return response.passkeys || [];
      } catch (error) {
        throw createClientError('Failed to fetch passkeys', 'CLIENT_ERROR', error);
      }
    },

    remove: async (id: string): Promise<void> => {
      try {
        await this.requestManager.request(`/passkeys/${id}`, {
          method: 'DELETE'
        });
      } catch (error) {
        throw createClientError('Failed to remove passkey', 'CLIENT_ERROR', error);
      }
    }
  };

  // ============================================================================
  // WebSocket Methods
  // ============================================================================

  readonly websocket = {
    connect: async (): Promise<void> => {
      if (!this.websocketManager) {
        throw createClientError('WebSocket not enabled', 'CONFIGURATION_ERROR');
      }
      
      try {
        await this.websocketManager.connect();
      } catch (error) {
        throw createClientError('WebSocket connection failed', 'WEBSOCKET_ERROR', error);
      }
    },

    disconnect: (): void => {
      if (this.websocketManager) {
        this.websocketManager.disconnect();
      }
    },

    send: (message: any): void => {
      if (!this.websocketManager) {
        throw createClientError('WebSocket not enabled', 'CONFIGURATION_ERROR');
      }
      
      this.websocketManager.send(message);
    },

    on: (event: string, listener: (data: any) => void): (() => void) => {
      if (!this.websocketManager) {
        throw createClientError('WebSocket not enabled', 'CONFIGURATION_ERROR');
      }
      
      return this.websocketManager.on(event, listener);
    },

    off: (event: string, listener: (data: any) => void): void => {
      if (this.websocketManager) {
        this.websocketManager.off(event, listener);
      }
    },

    get state(): WebSocketState {
      return this.websocketManager?.state || {
        connected: false,
        connecting: false,
        error: null,
        lastConnected: null,
        reconnectAttempts: 0
      };
    }
  };

  // ============================================================================
  // Storage Methods
  // ============================================================================

  readonly storage = {
    get: async (key: string): Promise<string | null> => {
      return await this.storage.get(key);
    },

    set: async (key: string, value: string): Promise<void> => {
      await this.storage.set(key, value);
    },

    remove: async (key: string): Promise<void> => {
      await this.storage.remove(key);
    },

    clear: async (): Promise<void> => {
      await this.storage.clear();
    }
  };

  // ============================================================================
  // Plugin Methods
  // ============================================================================

  readonly plugins = {
    register: (plugin: BetterAuthClientPlugin): void => {
      if (this.plugins.has(plugin.id)) {
        console.warn(`Plugin ${plugin.id} is already registered`);
        return;
      }

      this.plugins.set(plugin.id, plugin as ClientPlugin);
      
      // Initialize plugin if client is already initialized
      if (this.initialized && plugin.init) {
        plugin.init(this);
      }
    },

    unregister: (pluginId: string): void => {
      const plugin = this.plugins.get(pluginId);
      if (plugin) {
        if (plugin.cleanup) {
          plugin.cleanup();
        }
        this.plugins.delete(pluginId);
      }
    },

    get: (pluginId: string): BetterAuthClientPlugin | null => {
      return this.plugins.get(pluginId) || null;
    },

    list: (): BetterAuthClientPlugin[] => {
      return Array.from(this.plugins.values());
    }
  };

  // ============================================================================
  // Utility Methods
  // ============================================================================

  readonly utils = {
    buildUrl: (path: string, params?: Record<string, any>): string => {
      return this.requestManager.buildUrl(path, params);
    },

    request: async <T = any>(endpoint: string, options?: RequestOptions): Promise<T> => {
      return await this.requestManager.request<T>(endpoint, options);
    },

    refreshTokenIfNeeded: async (): Promise<void> => {
      if (this.options.autoRefresh === false) return;
      
      const shouldRefresh = await this.tokenManager.shouldRefresh(
        this.options.refreshThreshold || 5
      );
      
      if (shouldRefresh) {
        await this.auth.refreshSession();
      }
    },

    clearCache: (): void => {
      if (this.cacheManager) {
        this.cacheManager.clear();
      }
    }
  };

  // ============================================================================
  // Private Helper Methods
  // ============================================================================

  private async restoreSession(): Promise<void> {
    try {
      const tokens = await this.tokenManager.getTokens();
      if (!tokens?.accessToken) return;

      // Check if token is still valid
      const session = await this.auth.getSession();
      const user = await this.user.get();
      
      if (session && user) {
        this.atoms.session.set(session);
        this.atoms.user.set(user);
        this.setAuthState({ user, session });
      } else {
        // Clear invalid tokens
        await this.tokenManager.clearTokens();
      }
    } catch (error) {
      // Ignore restoration errors and clear tokens
      await this.tokenManager.clearTokens();
    }
  }

  private async setupWebSocket(): Promise<void> {
    if (!this.websocketManager) return;

    // Set up WebSocket event handlers
    this.websocketManager.on('connect', () => {
      this.atoms.websocket.set({
        ...this.atoms.websocket.get(),
        connected: true,
        connecting: false
      });
    });

    this.websocketManager.on('disconnect', (data) => {
      this.atoms.websocket.set({
        ...this.atoms.websocket.get(),
        connected: false,
        connecting: false
      });
    });

    this.websocketManager.on('error', (data) => {
      this.atoms.websocket.set({
        ...this.atoms.websocket.get(),
        error: data.error,
        connecting: false
      });
    });

    // Connect WebSocket
    try {
      await this.websocketManager.connect();
    } catch (error) {
      console.warn('WebSocket connection failed:', error);
    }
  }

  private setupTokenRefresh(): void {
    const scheduleRefresh = async () => {
      try {
        const tokens = await this.tokenManager.getTokens();
        if (!tokens?.expiresAt) return;

        const now = Date.now();
        const refreshThreshold = (this.options.refreshThreshold || 5) * 60 * 1000;
        const timeUntilRefresh = tokens.expiresAt - now - refreshThreshold;

        if (timeUntilRefresh > 0) {
          this.refreshTimeout = setTimeout(async () => {
            try {
              await this.auth.refreshSession();
              scheduleRefresh(); // Schedule next refresh
            } catch (error) {
              console.warn('Token refresh failed:', error);
            }
          }, timeUntilRefresh);
        }
      } catch (error) {
        console.warn('Failed to schedule token refresh:', error);
      }
    };

    scheduleRefresh();
  }

  private async initializePlugins(): Promise<void> {
    const initPromises = Array.from(this.plugins.values()).map(async (plugin) => {
      try {
        if (plugin.init) {
          await plugin.init(this);
        }
      } catch (error) {
        console.warn(`Failed to initialize plugin ${plugin.id}:`, error);
      }
    });

    await Promise.all(initPromises);
  }

  private async handleAuthSuccess(user: User, session: Session): Promise<void> {
    // Store tokens
    const tokens = {
      accessToken: (session as any).token || '',
      refreshToken: (session as any).refreshToken,
      expiresAt: session.expiresAt ? new Date(session.expiresAt).getTime() : undefined
    };
    
    await this.tokenManager.setTokens(tokens);

    // Update state
    this.atoms.user.set(user);
    this.atoms.session.set(session);
    this.setAuthState({ user, session, loading: false });

    // Schedule token refresh
    if (this.options.autoRefresh !== false) {
      this.setupTokenRefresh();
    }

    // Invalidate cache on sign in
    if (this.cacheManager && this.options.cache?.invalidateOn?.includes('signIn')) {
      this.cacheManager.clear();
    }
  }

  private async handleSignOut(): Promise<void> {
    // Clear tokens
    await this.tokenManager.clearTokens();

    // Clear state
    this.atoms.user.set(null);
    this.atoms.session.set(null);
    this.atoms.organizations.set([]);
    this.atoms.activeOrganization.set(null);
    this.atoms.teams.set([]);
    this.atoms.apiKeys.set([]);
    
    this.setAuthState({
      user: null,
      session: null,
      loading: false,
      error: null,
      initialized: true,
      lastUpdated: Date.now()
    });

    // Clear refresh timeout
    if (this.refreshTimeout) {
      clearTimeout(this.refreshTimeout);
      this.refreshTimeout = undefined;
    }

    // Clear cache on sign out
    if (this.cacheManager && this.options.cache?.invalidateOn?.includes('signOut')) {
      this.cacheManager.clear();
    }

    // Disconnect WebSocket
    if (this.websocketManager) {
      this.websocketManager.disconnect();
    }
  }

  private setAuthState(partialState: Partial<AuthState>): void {
    const currentState = this.atoms.auth.get();
    this.atoms.auth.set({
      ...currentState,
      ...partialState
    });
  }

  private async getSession(): Promise<Session | null> {
    return await this.auth.getSession();
  }
}

// ============================================================================
// Factory Function
// ============================================================================

export function createCFAuthClient(options: CFAuthClientOptions): CFAuthClient {
  return new CFAuthClientImpl(options);
}
/**
 * React hooks for @cf-auth/client
 */

import { useEffect, useState, useCallback, useMemo, useRef } from 'react';
import { useStore } from '@nanostores/react';
import type {
  CFAuthClient,
  UseSessionReturn,
  UseUserReturn,
  UseAuthReturn,
  UseOrganizationReturn,
  UseTeamReturn,
  UseApiKeysReturn,
  UseAuditLogReturn,
  SignInCredentials,
  SignUpData,
  PasswordResetData,
  CreateOrganizationData,
  CreateTeamData,
  CreateApiKeyData,
  AuditLogFilters,
  AsyncState,
  WebSocketState
} from './types';
import type {
  User,
  Session,
  SignInResponse,
  SignUpResponse,
  OrganizationData,
  TeamData,
  ApiKeyData,
  AuditLogData,
  CFAuthError
} from '@cf-auth/types';
import { createClientError } from './utils';

// ============================================================================
// Context Hook
// ============================================================================

let globalClient: CFAuthClient | null = null;

export function setGlobalClient(client: CFAuthClient): void {
  globalClient = client;
}

export function useAuthClient(): CFAuthClient {
  if (!globalClient) {
    throw new Error('CFAuthClient not found. Make sure to wrap your app with CFAuthProvider.');
  }
  return globalClient;
}

// ============================================================================
// Core Authentication Hooks
// ============================================================================

export function useAuth(): UseAuthReturn {
  const client = useAuthClient();
  const authState = useStore(client.atoms.auth);
  const user = useStore(client.atoms.user);
  const session = useStore(client.atoms.session);
  
  const signIn = useCallback(async (credentials: SignInCredentials): Promise<SignInResponse> => {
    return await client.auth.signIn(credentials);
  }, [client]);

  const signUp = useCallback(async (data: SignUpData): Promise<SignUpResponse> => {
    return await client.auth.signUp(data);
  }, [client]);

  const signOut = useCallback(async (): Promise<void> => {
    await client.auth.signOut();
  }, [client]);

  const refresh = useCallback(async (): Promise<void> => {
    await client.auth.refreshSession();
  }, [client]);

  const resetPassword = useCallback(async (data: PasswordResetData): Promise<void> => {
    await client.auth.resetPassword(data);
  }, [client]);

  const verifyResetToken = useCallback(async (token: string): Promise<boolean> => {
    return await client.auth.verifyResetToken(token);
  }, [client]);

  const resendVerificationEmail = useCallback(async (): Promise<void> => {
    await client.user.resendVerificationEmail();
  }, [client]);

  return {
    user,
    session,
    loading: authState.loading,
    error: authState.error,
    initialized: authState.initialized,
    lastUpdated: authState.lastUpdated,
    expiresAt: session?.expiresAt ? new Date(session.expiresAt) : null,
    refreshIn: session?.expiresAt ? new Date(session.expiresAt).getTime() - Date.now() : 0,
    isExpired: session?.expiresAt ? new Date(session.expiresAt).getTime() <= Date.now() : false,
    needsRefresh: session?.expiresAt ? (new Date(session.expiresAt).getTime() - Date.now()) <= (5 * 60 * 1000) : false,
    signIn,
    signUp,
    signOut,
    refresh,
    resetPassword,
    verifyResetToken,
    resendVerificationEmail
  };
}

export function useSession(): UseSessionReturn {
  const client = useAuthClient();
  const authState = useStore(client.atoms.auth);
  const session = useStore(client.atoms.session);
  
  const refresh = useCallback(async (): Promise<void> => {
    await client.auth.refreshSession();
  }, [client]);

  const signOut = useCallback(async (): Promise<void> => {
    await client.auth.signOut();
  }, [client]);

  return {
    user: authState.user,
    session,
    loading: authState.loading,
    error: authState.error,
    initialized: authState.initialized,
    lastUpdated: authState.lastUpdated,
    expiresAt: session?.expiresAt ? new Date(session.expiresAt) : null,
    refreshIn: session?.expiresAt ? new Date(session.expiresAt).getTime() - Date.now() : 0,
    isExpired: session?.expiresAt ? new Date(session.expiresAt).getTime() <= Date.now() : false,
    needsRefresh: session?.expiresAt ? (new Date(session.expiresAt).getTime() - Date.now()) <= (5 * 60 * 1000) : false,
    refresh,
    signOut
  };
}

export function useUser(): UseUserReturn {
  const client = useAuthClient();
  const user = useStore(client.atoms.user);
  const authState = useStore(client.atoms.auth);
  
  const updateUser = useCallback(async (data: Partial<User>): Promise<User> => {
    return await client.user.update(data);
  }, [client]);

  const changePassword = useCallback(async (oldPassword: string, newPassword: string): Promise<void> => {
    await client.user.changePassword(oldPassword, newPassword);
  }, [client]);

  const updateEmail = useCallback(async (email: string): Promise<void> => {
    await client.user.updateEmail(email);
  }, [client]);

  const verifyEmail = useCallback(async (token: string): Promise<void> => {
    await client.user.verifyEmail(token);
  }, [client]);

  const enableTwoFactor = useCallback(async (): Promise<{ qrCode: string; backupCodes: string[] }> => {
    return await client.user.enableTwoFactor();
  }, [client]);

  const disableTwoFactor = useCallback(async (code: string): Promise<void> => {
    await client.user.disableTwoFactor(code);
  }, [client]);

  return {
    user,
    loading: authState.loading,
    error: authState.error,
    updateUser,
    changePassword,
    updateEmail,
    verifyEmail,
    enableTwoFactor,
    disableTwoFactor
  };
}

// ============================================================================
// Organization Hooks
// ============================================================================

export function useOrganizations(): UseOrganizationReturn {
  const client = useAuthClient();
  const organizations = useStore(client.atoms.organizations);
  const activeOrganization = useStore(client.atoms.activeOrganization);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<CFAuthError | null>(null);

  const switchOrganization = useCallback(async (organizationId: string): Promise<void> => {
    try {
      setLoading(true);
      setError(null);
      await client.organization.switch(organizationId);
    } catch (err) {
      const error = createClientError('Failed to switch organization', 'CLIENT_ERROR', err);
      setError(error);
      throw error;
    } finally {
      setLoading(false);
    }
  }, [client]);

  const createOrganization = useCallback(async (data: CreateOrganizationData): Promise<OrganizationData> => {
    try {
      setLoading(true);
      setError(null);
      const organization = await client.organization.create(data);
      
      // Refresh organizations list
      await client.organization.list();
      
      return organization;
    } catch (err) {
      const error = createClientError('Failed to create organization', 'CLIENT_ERROR', err);
      setError(error);
      throw error;
    } finally {
      setLoading(false);
    }
  }, [client]);

  const updateOrganization = useCallback(async (id: string, data: Partial<OrganizationData>): Promise<OrganizationData> => {
    try {
      setLoading(true);
      setError(null);
      const organization = await client.organization.update(id, data);
      
      // Refresh organizations list
      await client.organization.list();
      
      return organization;
    } catch (err) {
      const error = createClientError('Failed to update organization', 'CLIENT_ERROR', err);
      setError(error);
      throw error;
    } finally {
      setLoading(false);
    }
  }, [client]);

  const deleteOrganization = useCallback(async (id: string): Promise<void> => {
    try {
      setLoading(true);
      setError(null);
      await client.organization.delete(id);
      
      // Refresh organizations list
      await client.organization.list();
    } catch (err) {
      const error = createClientError('Failed to delete organization', 'CLIENT_ERROR', err);
      setError(error);
      throw error;
    } finally {
      setLoading(false);
    }
  }, [client]);

  const inviteMember = useCallback(async (email: string, role: string): Promise<void> => {
    if (!activeOrganization) {
      throw createClientError('No active organization', 'CLIENT_ERROR');
    }
    
    try {
      setLoading(true);
      setError(null);
      await client.organization.inviteMember(activeOrganization.id, email, role);
    } catch (err) {
      const error = createClientError('Failed to invite member', 'CLIENT_ERROR', err);
      setError(error);
      throw error;
    } finally {
      setLoading(false);
    }
  }, [client, activeOrganization]);

  const removeMember = useCallback(async (userId: string): Promise<void> => {
    if (!activeOrganization) {
      throw createClientError('No active organization', 'CLIENT_ERROR');
    }
    
    try {
      setLoading(true);
      setError(null);
      await client.organization.removeMember(activeOrganization.id, userId);
    } catch (err) {
      const error = createClientError('Failed to remove member', 'CLIENT_ERROR', err);
      setError(error);
      throw error;
    } finally {
      setLoading(false);
    }
  }, [client, activeOrganization]);

  const updateMemberRole = useCallback(async (userId: string, role: string): Promise<void> => {
    if (!activeOrganization) {
      throw createClientError('No active organization', 'CLIENT_ERROR');
    }
    
    try {
      setLoading(true);
      setError(null);
      await client.organization.updateMemberRole(activeOrganization.id, userId, role);
    } catch (err) {
      const error = createClientError('Failed to update member role', 'CLIENT_ERROR', err);
      setError(error);
      throw error;
    } finally {
      setLoading(false);
    }
  }, [client, activeOrganization]);

  // Load organizations on mount
  useEffect(() => {
    let mounted = true;
    
    const loadOrganizations = async () => {
      try {
        if (organizations.length === 0) {
          setLoading(true);
          await client.organization.list();
        }
      } catch (err) {
        if (mounted) {
          setError(createClientError('Failed to load organizations', 'CLIENT_ERROR', err));
        }
      } finally {
        if (mounted) {
          setLoading(false);
        }
      }
    };

    loadOrganizations();
    
    return () => {
      mounted = false;
    };
  }, [client, organizations.length]);

  return {
    organization: activeOrganization,
    organizations,
    loading,
    error,
    switchOrganization,
    createOrganization,
    updateOrganization,
    deleteOrganization,
    inviteMember,
    removeMember,
    updateMemberRole
  };
}

export function useActiveOrganization(): OrganizationData | null {
  const client = useAuthClient();
  return useStore(client.atoms.activeOrganization);
}

// ============================================================================
// Team Hooks
// ============================================================================

export function useTeams(organizationId?: string): UseTeamReturn {
  const client = useAuthClient();
  const teams = useStore(client.atoms.teams);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<CFAuthError | null>(null);

  const createTeam = useCallback(async (data: CreateTeamData): Promise<TeamData> => {
    try {
      setLoading(true);
      setError(null);
      const team = await client.team.create(data);
      
      // Refresh teams list
      await client.team.list(organizationId);
      
      return team;
    } catch (err) {
      const error = createClientError('Failed to create team', 'CLIENT_ERROR', err);
      setError(error);
      throw error;
    } finally {
      setLoading(false);
    }
  }, [client, organizationId]);

  const updateTeam = useCallback(async (id: string, data: Partial<TeamData>): Promise<TeamData> => {
    try {
      setLoading(true);
      setError(null);
      const team = await client.team.update(id, data);
      
      // Refresh teams list
      await client.team.list(organizationId);
      
      return team;
    } catch (err) {
      const error = createClientError('Failed to update team', 'CLIENT_ERROR', err);
      setError(error);
      throw error;
    } finally {
      setLoading(false);
    }
  }, [client, organizationId]);

  const deleteTeam = useCallback(async (id: string): Promise<void> => {
    try {
      setLoading(true);
      setError(null);
      await client.team.delete(id);
      
      // Refresh teams list
      await client.team.list(organizationId);
    } catch (err) {
      const error = createClientError('Failed to delete team', 'CLIENT_ERROR', err);
      setError(error);
      throw error;
    } finally {
      setLoading(false);
    }
  }, [client, organizationId]);

  const addMember = useCallback(async (teamId: string, userId: string, role?: string): Promise<void> => {
    try {
      setLoading(true);
      setError(null);
      await client.team.addMember(teamId, userId, role);
    } catch (err) {
      const error = createClientError('Failed to add team member', 'CLIENT_ERROR', err);
      setError(error);
      throw error;
    } finally {
      setLoading(false);
    }
  }, [client]);

  const removeMember = useCallback(async (teamId: string, userId: string): Promise<void> => {
    try {
      setLoading(true);
      setError(null);
      await client.team.removeMember(teamId, userId);
    } catch (err) {
      const error = createClientError('Failed to remove team member', 'CLIENT_ERROR', err);
      setError(error);
      throw error;
    } finally {
      setLoading(false);
    }
  }, [client]);

  // Load teams on mount or when organizationId changes
  useEffect(() => {
    let mounted = true;
    
    const loadTeams = async () => {
      try {
        setLoading(true);
        await client.team.list(organizationId);
      } catch (err) {
        if (mounted) {
          setError(createClientError('Failed to load teams', 'CLIENT_ERROR', err));
        }
      } finally {
        if (mounted) {
          setLoading(false);
        }
      }
    };

    loadTeams();
    
    return () => {
      mounted = false;
    };
  }, [client, organizationId]);

  return {
    teams,
    loading,
    error,
    createTeam,
    updateTeam,
    deleteTeam,
    addMember,
    removeMember
  };
}

// ============================================================================
// API Keys Hooks
// ============================================================================

export function useApiKeys(): UseApiKeysReturn {
  const client = useAuthClient();
  const apiKeys = useStore(client.atoms.apiKeys);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<CFAuthError | null>(null);

  const createKey = useCallback(async (data: CreateApiKeyData): Promise<ApiKeyData> => {
    try {
      setLoading(true);
      setError(null);
      const apiKey = await client.apiKey.create(data);
      
      // Refresh API keys list
      await client.apiKey.list();
      
      return apiKey;
    } catch (err) {
      const error = createClientError('Failed to create API key', 'CLIENT_ERROR', err);
      setError(error);
      throw error;
    } finally {
      setLoading(false);
    }
  }, [client]);

  const revokeKey = useCallback(async (keyId: string): Promise<void> => {
    try {
      setLoading(true);
      setError(null);
      await client.apiKey.revoke(keyId);
      
      // Refresh API keys list
      await client.apiKey.list();
    } catch (err) {
      const error = createClientError('Failed to revoke API key', 'CLIENT_ERROR', err);
      setError(error);
      throw error;
    } finally {
      setLoading(false);
    }
  }, [client]);

  const updateKey = useCallback(async (keyId: string, data: Partial<ApiKeyData>): Promise<ApiKeyData> => {
    try {
      setLoading(true);
      setError(null);
      const apiKey = await client.apiKey.update(keyId, data);
      
      // Refresh API keys list
      await client.apiKey.list();
      
      return apiKey;
    } catch (err) {
      const error = createClientError('Failed to update API key', 'CLIENT_ERROR', err);
      setError(error);
      throw error;
    } finally {
      setLoading(false);
    }
  }, [client]);

  // Load API keys on mount
  useEffect(() => {
    let mounted = true;
    
    const loadApiKeys = async () => {
      try {
        if (apiKeys.length === 0) {
          setLoading(true);
          await client.apiKey.list();
        }
      } catch (err) {
        if (mounted) {
          setError(createClientError('Failed to load API keys', 'CLIENT_ERROR', err));
        }
      } finally {
        if (mounted) {
          setLoading(false);
        }
      }
    };

    loadApiKeys();
    
    return () => {
      mounted = false;
    };
  }, [client, apiKeys.length]);

  return {
    apiKeys,
    loading,
    error,
    createKey,
    revokeKey,
    updateKey
  };
}

// ============================================================================
// Audit Log Hooks
// ============================================================================

export function useAuditLogs(initialFilters?: AuditLogFilters): UseAuditLogReturn {
  const client = useAuthClient();
  const [logs, setLogs] = useState<AuditLogData[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<CFAuthError | null>(null);
  const [filters, setFilters] = useState<AuditLogFilters | undefined>(initialFilters);
  const [hasMore, setHasMore] = useState(true);

  const fetchLogs = useCallback(async (newFilters?: AuditLogFilters, append = false): Promise<void> => {
    try {
      setLoading(true);
      setError(null);
      
      const currentFilters = newFilters || filters;
      const result = await client.auditLog.list(currentFilters);
      
      if (append) {
        setLogs(prev => [...prev, ...result]);
      } else {
        setLogs(result);
      }
      
      // Check if there are more logs (assuming the API returns a consistent page size)
      const pageSize = currentFilters?.limit || 50;
      setHasMore(result.length === pageSize);
    } catch (err) {
      const error = createClientError('Failed to fetch audit logs', 'CLIENT_ERROR', err);
      setError(error);
    } finally {
      setLoading(false);
    }
  }, [client, filters]);

  const fetchMore = useCallback(async (): Promise<void> => {
    if (!hasMore || loading) return;
    
    const moreFilters = {
      ...filters,
      offset: (filters?.offset || 0) + logs.length
    };
    
    await fetchLogs(moreFilters, true);
  }, [fetchLogs, filters, hasMore, loading, logs.length]);

  const filter = useCallback(async (newFilters: AuditLogFilters): Promise<void> => {
    setFilters(newFilters);
    await fetchLogs(newFilters);
  }, [fetchLogs]);

  const exportLogs = useCallback(async (format: 'json' | 'csv'): Promise<Blob> => {
    try {
      setLoading(true);
      setError(null);
      return await client.auditLog.export(format, filters);
    } catch (err) {
      const error = createClientError('Failed to export audit logs', 'CLIENT_ERROR', err);
      setError(error);
      throw error;
    } finally {
      setLoading(false);
    }
  }, [client, filters]);

  // Load initial logs
  useEffect(() => {
    fetchLogs();
  }, [fetchLogs]);

  return {
    logs,
    loading,
    error,
    fetchMore,
    filter,
    export: exportLogs
  };
}

// ============================================================================
// WebSocket Hooks
// ============================================================================

export function useWebSocket(): {
  state: WebSocketState;
  connect: () => Promise<void>;
  disconnect: () => void;
  send: (message: any) => void;
  on: (event: string, listener: (data: any) => void) => () => void;
} {
  const client = useAuthClient();
  const state = useStore(client.atoms.websocket);

  return {
    state,
    connect: client.websocket.connect,
    disconnect: client.websocket.disconnect,
    send: client.websocket.send,
    on: client.websocket.on
  };
}

// ============================================================================
// Utility Hooks
// ============================================================================

export function useAsyncState<T>(
  asyncFn: () => Promise<T>,
  dependencies: any[] = []
): AsyncState<T> & { execute: () => Promise<void> } {
  const [state, setState] = useState<AsyncState<T>>({
    data: null,
    loading: false,
    error: null,
    lastUpdated: null
  });

  const execute = useCallback(async () => {
    try {
      setState(prev => ({ ...prev, loading: true, error: null }));
      const data = await asyncFn();
      setState({
        data,
        loading: false,
        error: null,
        lastUpdated: Date.now()
      });
    } catch (error) {
      setState(prev => ({
        ...prev,
        loading: false,
        error: error as Error,
        lastUpdated: Date.now()
      }));
    }
  }, dependencies);

  useEffect(() => {
    execute();
  }, [execute]);

  return { ...state, execute };
}

export function useDebounce<T>(value: T, delay: number): T {
  const [debouncedValue, setDebouncedValue] = useState<T>(value);

  useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedValue(value);
    }, delay);

    return () => {
      clearTimeout(handler);
    };
  }, [value, delay]);

  return debouncedValue;
}

export function useLocalStorage<T>(
  key: string,
  initialValue: T
): [T, (value: T) => void] {
  const [storedValue, setStoredValue] = useState<T>(() => {
    try {
      const item = window.localStorage.getItem(key);
      return item ? JSON.parse(item) : initialValue;
    } catch (error) {
      console.warn('Error reading from localStorage:', error);
      return initialValue;
    }
  });

  const setValue = useCallback((value: T) => {
    try {
      setStoredValue(value);
      window.localStorage.setItem(key, JSON.stringify(value));
    } catch (error) {
      console.warn('Error writing to localStorage:', error);
    }
  }, [key]);

  return [storedValue, setValue];
}

export function usePrevious<T>(value: T): T | undefined {
  const ref = useRef<T>();
  
  useEffect(() => {
    ref.current = value;
  }, [value]);
  
  return ref.current;
}

export function useIsOnline(): boolean {
  const [isOnline, setIsOnline] = useState(navigator.onLine);

  useEffect(() => {
    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  return isOnline;
}

// ============================================================================
// Custom Authentication State Hook
// ============================================================================

export function useAuthState(): {
  isAuthenticated: boolean;
  isLoading: boolean;
  user: User | null;
  session: Session | null;
  error: CFAuthError | null;
} {
  const client = useAuthClient();
  const authState = useStore(client.atoms.auth);
  const user = useStore(client.atoms.user);
  const session = useStore(client.atoms.session);

  return {
    isAuthenticated: !!(user && session),
    isLoading: authState.loading,
    user,
    session,
    error: authState.error
  };
}
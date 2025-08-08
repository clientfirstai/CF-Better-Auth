import { useEffect, useState, useCallback, useMemo } from 'react';
import { CFAuthClient } from './client';
import type { User, Session } from '@cf-auth/types';

let globalClient: CFAuthClient | null = null;

export function initializeAuth(options?: Parameters<typeof CFAuthClient>[0]): CFAuthClient {
  if (!globalClient) {
    globalClient = new CFAuthClient(options);
  }
  return globalClient;
}

export function getAuthClient(): CFAuthClient {
  if (!globalClient) {
    throw new Error('Auth client not initialized. Call initializeAuth() first.');
  }
  return globalClient;
}

export function useAuth() {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  const client = useMemo(() => {
    try {
      return getAuthClient();
    } catch {
      return initializeAuth();
    }
  }, []);

  useEffect(() => {
    const loadSession = async () => {
      try {
        setLoading(true);
        const currentSession = await client.getSession();
        if (currentSession) {
          setSession(currentSession);
          setUser(client.getUser());
        }
      } catch (err) {
        setError(err as Error);
      } finally {
        setLoading(false);
      }
    };

    loadSession();

    const unsubscribe = client.subscribe(({ user, session }) => {
      setUser(user);
      setSession(session);
    });

    return unsubscribe;
  }, [client]);

  const signIn = useCallback(async (credentials: { email: string; password: string }) => {
    setLoading(true);
    setError(null);
    try {
      const response = await client.signIn(credentials);
      return response;
    } catch (err) {
      setError(err as Error);
      throw err;
    } finally {
      setLoading(false);
    }
  }, [client]);

  const signUp = useCallback(async (data: { email: string; password: string; name?: string }) => {
    setLoading(true);
    setError(null);
    try {
      const response = await client.signUp(data);
      return response;
    } catch (err) {
      setError(err as Error);
      throw err;
    } finally {
      setLoading(false);
    }
  }, [client]);

  const signOut = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      await client.signOut();
    } catch (err) {
      setError(err as Error);
      throw err;
    } finally {
      setLoading(false);
    }
  }, [client]);

  const refreshSession = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const newSession = await client.refreshSession();
      return newSession;
    } catch (err) {
      setError(err as Error);
      throw err;
    } finally {
      setLoading(false);
    }
  }, [client]);

  const updateProfile = useCallback(async (data: Partial<User>) => {
    setLoading(true);
    setError(null);
    try {
      const updatedUser = await client.updateProfile(data);
      return updatedUser;
    } catch (err) {
      setError(err as Error);
      throw err;
    } finally {
      setLoading(false);
    }
  }, [client]);

  return {
    user,
    session,
    loading,
    error,
    isAuthenticated: client.isAuthenticated(),
    signIn,
    signUp,
    signOut,
    refreshSession,
    updateProfile
  };
}

export function useUser() {
  const { user } = useAuth();
  return user;
}

export function useSession() {
  const { session } = useAuth();
  return session;
}

export function useIsAuthenticated() {
  const { isAuthenticated } = useAuth();
  return isAuthenticated;
}

export function useRequireAuth(redirectTo: string = '/login') {
  const { isAuthenticated, loading } = useAuth();

  useEffect(() => {
    if (!loading && !isAuthenticated && typeof window !== 'undefined') {
      window.location.href = redirectTo;
    }
  }, [isAuthenticated, loading, redirectTo]);

  return { isAuthenticated, loading };
}
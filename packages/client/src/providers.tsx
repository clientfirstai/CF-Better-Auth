import React, { createContext, useContext, ReactNode } from 'react';
import { CFAuthClient } from './client';
import { useAuth } from './hooks';
import type { User, Session } from '@cf-auth/types';

interface AuthContextValue {
  user: User | null;
  session: Session | null;
  loading: boolean;
  error: Error | null;
  isAuthenticated: boolean;
  signIn: (credentials: { email: string; password: string }) => Promise<any>;
  signUp: (data: { email: string; password: string; name?: string }) => Promise<any>;
  signOut: () => Promise<void>;
  refreshSession: () => Promise<Session | null>;
  updateProfile: (data: Partial<User>) => Promise<User>;
  client: CFAuthClient;
}

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

export interface AuthProviderProps {
  children: ReactNode;
  client?: CFAuthClient;
  options?: Parameters<typeof CFAuthClient>[0];
}

export function AuthProvider({ children, client, options }: AuthProviderProps) {
  const authClient = React.useMemo(() => {
    return client || new CFAuthClient(options);
  }, [client, options]);

  const auth = useAuth();

  const value: AuthContextValue = {
    ...auth,
    client: authClient
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuthContext(): AuthContextValue {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuthContext must be used within an AuthProvider');
  }
  return context;
}

interface ProtectedRouteProps {
  children: ReactNode;
  fallback?: ReactNode;
  redirectTo?: string;
}

export function ProtectedRoute({ 
  children, 
  fallback = null, 
  redirectTo 
}: ProtectedRouteProps) {
  const { isAuthenticated, loading } = useAuthContext();

  React.useEffect(() => {
    if (!loading && !isAuthenticated && redirectTo && typeof window !== 'undefined') {
      window.location.href = redirectTo;
    }
  }, [isAuthenticated, loading, redirectTo]);

  if (loading) {
    return <>{fallback}</>;
  }

  if (!isAuthenticated) {
    return <>{fallback}</>;
  }

  return <>{children}</>;
}

interface GuestRouteProps {
  children: ReactNode;
  redirectTo?: string;
}

export function GuestRoute({ children, redirectTo = '/' }: GuestRouteProps) {
  const { isAuthenticated, loading } = useAuthContext();

  React.useEffect(() => {
    if (!loading && isAuthenticated && typeof window !== 'undefined') {
      window.location.href = redirectTo;
    }
  }, [isAuthenticated, loading, redirectTo]);

  if (loading || isAuthenticated) {
    return null;
  }

  return <>{children}</>;
}
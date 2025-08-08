/**
 * React context providers for @cf-auth/client
 */

import React, { 
  createContext, 
  useContext, 
  useEffect, 
  useState, 
  useRef,
  type ReactNode,
  type PropsWithChildren 
} from 'react';
import { useStore } from '@nanostores/react';
import { createCFAuthClient } from './client';
import { setGlobalClient } from './hooks';
import type {
  CFAuthClient,
  CFAuthClientOptions,
  AuthContextValue,
  AuthProviderProps,
  SignInCredentials,
  SignUpData,
  PasswordResetData,
  WebSocketState
} from './types';
import type {
  User,
  Session,
  SignInResponse,
  SignUpResponse,
  CFAuthError
} from '@cf-auth/types';
import { createClientError } from './utils';

// ============================================================================
// Auth Context
// ============================================================================

const AuthContext = createContext<AuthContextValue | null>(null);

export function useAuthContext(): AuthContextValue {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuthContext must be used within CFAuthProvider');
  }
  return context;
}

// ============================================================================
// Main Auth Provider
// ============================================================================

export function CFAuthProvider({ 
  children, 
  options 
}: PropsWithChildren<AuthProviderProps>): JSX.Element {
  const [client] = useState(() => createCFAuthClient(options));
  const [initialized, setInitialized] = useState(false);
  const [initError, setInitError] = useState<CFAuthError | null>(null);
  const initializeRef = useRef(false);
  
  // Subscribe to client state
  const authState = useStore(client.atoms.auth);
  const user = useStore(client.atoms.user);
  const session = useStore(client.atoms.session);
  const websocketState = useStore(client.atoms.websocket);

  // Initialize client
  useEffect(() => {
    if (initializeRef.current) return;
    initializeRef.current = true;

    const initializeClient = async () => {
      try {
        setInitError(null);
        await client.initialize();
        setGlobalClient(client);
        setInitialized(true);
      } catch (error) {
        const clientError = createClientError(
          'Failed to initialize authentication client',
          'INITIALIZATION_ERROR',
          error
        );
        setInitError(clientError);
        setInitialized(true);
        
        if (options.onError) {
          options.onError(clientError);
        }
      }
    };

    initializeClient();
  }, [client, options]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      client.destroy();
    };
  }, [client]);

  // Authentication methods
  const signIn = async (credentials: SignInCredentials): Promise<SignInResponse> => {
    return await client.auth.signIn(credentials);
  };

  const signUp = async (data: SignUpData): Promise<SignUpResponse> => {
    return await client.auth.signUp(data);
  };

  const signOut = async (): Promise<void> => {
    await client.auth.signOut();
  };

  const refresh = async (): Promise<void> => {
    await client.auth.refreshSession();
  };

  const resetPassword = async (data: PasswordResetData): Promise<void> => {
    await client.auth.resetPassword(data);
  };

  const verifyResetToken = async (token: string): Promise<boolean> => {
    return await client.auth.verifyResetToken(token);
  };

  const resendVerificationEmail = async (): Promise<void> => {
    await client.user.resendVerificationEmail();
  };

  // WebSocket methods
  const connectWebSocket = async (): Promise<void> => {
    await client.websocket.connect();
  };

  const disconnectWebSocket = (): void => {
    client.websocket.disconnect();
  };

  const contextValue: AuthContextValue = {
    // State
    user,
    session,
    loading: authState.loading,
    error: initError || authState.error,
    initialized: initialized && authState.initialized,
    lastUpdated: authState.lastUpdated,
    expiresAt: session?.expiresAt ? new Date(session.expiresAt) : null,
    refreshIn: session?.expiresAt ? new Date(session.expiresAt).getTime() - Date.now() : 0,
    isExpired: session?.expiresAt ? new Date(session.expiresAt).getTime() <= Date.now() : false,
    needsRefresh: session?.expiresAt ? (new Date(session.expiresAt).getTime() - Date.now()) <= (5 * 60 * 1000) : false,
    
    // Client
    client,
    
    // Authentication methods
    signIn,
    signUp,
    signOut,
    refresh,
    resetPassword,
    verifyResetToken,
    resendVerificationEmail,
    
    // WebSocket
    websocket: websocketState,
    connectWebSocket,
    disconnectWebSocket
  };

  return (
    <AuthContext.Provider value={contextValue}>
      {children}
    </AuthContext.Provider>
  );
}

// ============================================================================
// Auth Guard Components
// ============================================================================

interface AuthGuardProps {
  children: ReactNode;
  fallback?: ReactNode;
  redirect?: string;
  require?: 'authenticated' | 'unauthenticated' | 'verified';
  roles?: string[];
  permissions?: string[];
}

export function AuthGuard({
  children,
  fallback = null,
  redirect,
  require = 'authenticated',
  roles,
  permissions
}: AuthGuardProps): JSX.Element | null {
  const { user, session, loading, initialized } = useAuthContext();

  // Show loading state during initialization
  if (!initialized || loading) {
    return (
      <div className="cf-auth-loading">
        <div className="cf-auth-spinner" />
      </div>
    ) as JSX.Element;
  }

  const isAuthenticated = !!(user && session);
  const isVerified = user?.emailVerified === true;

  // Check authentication requirement
  switch (require) {
    case 'authenticated':
      if (!isAuthenticated) {
        if (redirect && typeof window !== 'undefined') {
          window.location.href = redirect;
          return null;
        }
        return fallback as JSX.Element;
      }
      break;

    case 'unauthenticated':
      if (isAuthenticated) {
        if (redirect && typeof window !== 'undefined') {
          window.location.href = redirect;
          return null;
        }
        return fallback as JSX.Element;
      }
      break;

    case 'verified':
      if (!isAuthenticated || !isVerified) {
        if (redirect && typeof window !== 'undefined') {
          window.location.href = redirect;
          return null;
        }
        return fallback as JSX.Element;
      }
      break;
  }

  // Check role requirements
  if (roles && roles.length > 0 && user) {
    const userRole = user.role || 'user';
    if (!roles.includes(userRole)) {
      return fallback as JSX.Element;
    }
  }

  // Check permission requirements
  if (permissions && permissions.length > 0 && user) {
    const userPermissions = user.permissions || [];
    const hasAllPermissions = permissions.every(permission => 
      userPermissions.includes(permission)
    );
    
    if (!hasAllPermissions) {
      return fallback as JSX.Element;
    }
  }

  return children as JSX.Element;
}

// ============================================================================
// Authentication Status Components
// ============================================================================

interface AuthenticatedProps {
  children: ReactNode;
  fallback?: ReactNode;
}

export function Authenticated({ children, fallback = null }: AuthenticatedProps): JSX.Element | null {
  return (
    <AuthGuard require="authenticated" fallback={fallback}>
      {children}
    </AuthGuard>
  );
}

export function Unauthenticated({ children, fallback = null }: AuthenticatedProps): JSX.Element | null {
  return (
    <AuthGuard require="unauthenticated" fallback={fallback}>
      {children}
    </AuthGuard>
  );
}

interface VerifiedProps extends AuthenticatedProps {}

export function Verified({ children, fallback = null }: VerifiedProps): JSX.Element | null {
  return (
    <AuthGuard require="verified" fallback={fallback}>
      {children}
    </AuthGuard>
  );
}

// ============================================================================
// Role-Based Components
// ============================================================================

interface RoleGuardProps {
  children: ReactNode;
  roles: string | string[];
  fallback?: ReactNode;
  requireAll?: boolean;
}

export function RoleGuard({ 
  children, 
  roles, 
  fallback = null, 
  requireAll = false 
}: RoleGuardProps): JSX.Element | null {
  const { user } = useAuthContext();
  
  if (!user) {
    return fallback as JSX.Element;
  }

  const userRole = user.role || 'user';
  const requiredRoles = Array.isArray(roles) ? roles : [roles];

  let hasAccess: boolean;
  
  if (requireAll) {
    // User must have all roles (not typical, but supported)
    hasAccess = requiredRoles.every(role => userRole === role);
  } else {
    // User must have at least one role
    hasAccess = requiredRoles.includes(userRole);
  }

  return hasAccess ? (children as JSX.Element) : (fallback as JSX.Element);
}

// ============================================================================
// Permission-Based Components
// ============================================================================

interface PermissionGuardProps {
  children: ReactNode;
  permissions: string | string[];
  fallback?: ReactNode;
  requireAll?: boolean;
}

export function PermissionGuard({ 
  children, 
  permissions, 
  fallback = null, 
  requireAll = true 
}: PermissionGuardProps): JSX.Element | null {
  const { user } = useAuthContext();
  
  if (!user) {
    return fallback as JSX.Element;
  }

  const userPermissions = user.permissions || [];
  const requiredPermissions = Array.isArray(permissions) ? permissions : [permissions];

  let hasAccess: boolean;
  
  if (requireAll) {
    // User must have all permissions
    hasAccess = requiredPermissions.every(permission => 
      userPermissions.includes(permission)
    );
  } else {
    // User must have at least one permission
    hasAccess = requiredPermissions.some(permission => 
      userPermissions.includes(permission)
    );
  }

  return hasAccess ? (children as JSX.Element) : (fallback as JSX.Element);
}

// ============================================================================
// Loading Components
// ============================================================================

interface LoadingGuardProps {
  children: ReactNode;
  fallback?: ReactNode;
}

export function LoadingGuard({ children, fallback }: LoadingGuardProps): JSX.Element | null {
  const { loading, initialized } = useAuthContext();

  if (!initialized || loading) {
    return fallback ? (fallback as JSX.Element) : (
      <div className="cf-auth-loading">
        <div className="cf-auth-spinner" />
        <p>Loading...</p>
      </div>
    ) as JSX.Element;
  }

  return children as JSX.Element;
}

// ============================================================================
// Error Boundary
// ============================================================================

interface AuthErrorBoundaryState {
  hasError: boolean;
  error: Error | null;
}

interface AuthErrorBoundaryProps {
  children: ReactNode;
  fallback?: (error: Error) => ReactNode;
  onError?: (error: Error, errorInfo: any) => void;
}

export class AuthErrorBoundary extends React.Component<
  AuthErrorBoundaryProps,
  AuthErrorBoundaryState
> {
  constructor(props: AuthErrorBoundaryProps) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error): AuthErrorBoundaryState {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: any) {
    if (this.props.onError) {
      this.props.onError(error, errorInfo);
    } else {
      console.error('Authentication error:', error, errorInfo);
    }
  }

  render() {
    if (this.state.hasError && this.state.error) {
      if (this.props.fallback) {
        return this.props.fallback(this.state.error);
      }
      
      return (
        <div className="cf-auth-error">
          <h2>Authentication Error</h2>
          <p>{this.state.error.message}</p>
          <button
            onClick={() => this.setState({ hasError: false, error: null })}
            className="cf-auth-retry-button"
          >
            Try Again
          </button>
        </div>
      );
    }

    return this.props.children;
  }
}

// ============================================================================
// Utility Components
// ============================================================================

interface ConditionalProps {
  condition: boolean;
  children: ReactNode;
  fallback?: ReactNode;
}

export function Conditional({ condition, children, fallback = null }: ConditionalProps): JSX.Element | null {
  return condition ? (children as JSX.Element) : (fallback as JSX.Element);
}

interface UserDisplayProps {
  fallback?: ReactNode;
  children: (user: User) => ReactNode;
}

export function UserDisplay({ children, fallback = null }: UserDisplayProps): JSX.Element | null {
  const { user } = useAuthContext();
  
  if (!user) {
    return fallback as JSX.Element;
  }
  
  return children(user) as JSX.Element;
}

// ============================================================================
// WebSocket Provider (Optional separate provider)
// ============================================================================

interface WebSocketProviderProps {
  children: ReactNode;
  autoConnect?: boolean;
  onConnect?: () => void;
  onDisconnect?: () => void;
  onError?: (error: Error) => void;
}

export function WebSocketProvider({
  children,
  autoConnect = false,
  onConnect,
  onDisconnect,
  onError
}: WebSocketProviderProps): JSX.Element {
  const { client, connectWebSocket, disconnectWebSocket, websocket } = useAuthContext();
  const [isSetup, setIsSetup] = useState(false);

  useEffect(() => {
    if (isSetup) return;
    setIsSetup(true);

    // Set up WebSocket event listeners
    if (onConnect) {
      client.websocket.on('connect', onConnect);
    }
    
    if (onDisconnect) {
      client.websocket.on('disconnect', onDisconnect);
    }
    
    if (onError) {
      client.websocket.on('error', (data) => onError(data.error));
    }

    // Auto-connect if enabled
    if (autoConnect && !websocket.connected && !websocket.connecting) {
      connectWebSocket().catch(error => {
        console.warn('Auto WebSocket connection failed:', error);
      });
    }

    return () => {
      // Cleanup listeners would go here if the client supported it
      if (!autoConnect) {
        disconnectWebSocket();
      }
    };
  }, [
    client,
    isSetup,
    autoConnect,
    connectWebSocket,
    disconnectWebSocket,
    websocket.connected,
    websocket.connecting,
    onConnect,
    onDisconnect,
    onError
  ]);

  return <>{children}</>;
}

// ============================================================================
// HOCs (Higher-Order Components)
// ============================================================================

export function withAuth<P extends object>(
  Component: React.ComponentType<P>,
  options: {
    require?: 'authenticated' | 'unauthenticated' | 'verified';
    fallback?: ReactNode;
    redirect?: string;
    roles?: string[];
    permissions?: string[];
  } = {}
) {
  return function AuthenticatedComponent(props: P): JSX.Element {
    return (
      <AuthGuard {...options}>
        <Component {...props} />
      </AuthGuard>
    );
  };
}

export function withRole<P extends object>(
  Component: React.ComponentType<P>,
  roles: string | string[],
  fallback?: ReactNode
) {
  return function RoleComponent(props: P): JSX.Element {
    return (
      <RoleGuard roles={roles} fallback={fallback}>
        <Component {...props} />
      </RoleGuard>
    );
  };
}

export function withPermission<P extends object>(
  Component: React.ComponentType<P>,
  permissions: string | string[],
  options: { fallback?: ReactNode; requireAll?: boolean } = {}
) {
  return function PermissionComponent(props: P): JSX.Element {
    return (
      <PermissionGuard permissions={permissions} {...options}>
        <Component {...props} />
      </PermissionGuard>
    );
  };
}
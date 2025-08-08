# @cf-auth/client

A comprehensive client-side authentication wrapper for CF-Better-Auth that provides seamless integration with the @cf-auth/core server adapter.

## Features

- 🔐 **Full Authentication Support** - Email/password, OAuth, magic links, passkeys, 2FA
- ⚡ **React Integration** - Hooks, context providers, and guard components
- 🔄 **Automatic Token Refresh** - Seamless session management
- 🌐 **WebSocket Support** - Real-time updates and notifications
- 📦 **Plugin System** - Extensible architecture for custom functionality
- 💾 **Flexible Storage** - localStorage, sessionStorage, memory, or custom storage
- 🏢 **Organization Management** - Multi-tenant support with teams and roles
- 🔑 **API Key Management** - Programmatic access tokens
- 📊 **Audit Logging** - Complete activity tracking
- 🛡️ **Type Safety** - Full TypeScript support
- 🚦 **Error Handling** - Comprehensive error management with retry logic
- 📱 **Cross-Platform** - Works in browsers, React Native, and Node.js

## Installation

```bash
npm install @cf-auth/client
# or
yarn add @cf-auth/client
# or
pnpm add @cf-auth/client
```

## Quick Start

### 1. Setup Provider

Wrap your application with the `CFAuthProvider`:

```tsx
import { CFAuthProvider } from '@cf-auth/client';

function App() {
  return (
    <CFAuthProvider
      options={{
        baseURL: 'https://your-api.com',
        autoRefresh: true,
        websocket: { enabled: true }
      }}
    >
      <YourApp />
    </CFAuthProvider>
  );
}
```

### 2. Use Authentication

Use the `useAuth` hook to handle authentication:

```tsx
import { useAuth } from '@cf-auth/client';

function LoginForm() {
  const { user, signIn, signOut, loading } = useAuth();

  if (loading) return <div>Loading...</div>;

  if (user) {
    return (
      <div>
        <p>Welcome, {user.name || user.email}!</p>
        <button onClick={signOut}>Sign Out</button>
      </div>
    );
  }

  const handleSignIn = async () => {
    try {
      await signIn({
        email: 'user@example.com',
        password: 'password123'
      });
    } catch (error) {
      console.error('Sign in failed:', error);
    }
  };

  return (
    <div>
      <button onClick={handleSignIn}>Sign In</button>
    </div>
  );
}
```

### 3. Protect Routes

Use guard components to protect routes:

```tsx
import { Authenticated, AuthGuard } from '@cf-auth/client';

function Dashboard() {
  return (
    <Authenticated fallback={<div>Please sign in</div>}>
      <div>Protected dashboard content</div>
    </Authenticated>
  );
}

function AdminPanel() {
  return (
    <AuthGuard
      require="authenticated"
      roles={['admin']}
      fallback={<div>Admin access required</div>}
    >
      <div>Admin panel</div>
    </AuthGuard>
  );
}
```

## Core API

### Client Configuration

```tsx
import { createCFAuthClient } from '@cf-auth/client';

const client = createCFAuthClient({
  baseURL: 'https://your-api.com',
  apiPath: '/api/auth',
  autoRefresh: true,
  refreshThreshold: 5, // minutes
  timeout: 30000, // ms
  storage: {
    type: 'localStorage',
    keyPrefix: 'myapp-auth-'
  },
  websocket: {
    enabled: true,
    reconnect: {
      maxAttempts: 5,
      delay: 1000
    }
  },
  cache: {
    enabled: true,
    defaultTTL: 300000, // 5 minutes
    invalidateOn: ['signIn', 'signOut']
  },
  plugins: [
    // Custom plugins
  ]
});
```

### Authentication Methods

```tsx
// Email/Password
await client.auth.signIn({
  email: 'user@example.com',
  password: 'password123'
});

await client.auth.signUp({
  email: 'user@example.com',
  password: 'password123',
  name: 'John Doe'
});

// OAuth (via better-auth integration)
await client.auth.signIn({
  provider: 'google'
});

// Magic Link
await client.auth.sendMagicLink({
  email: 'user@example.com',
  redirectTo: '/dashboard'
});

// Password Reset
await client.auth.resetPassword({
  email: 'user@example.com'
});

// Sign Out
await client.auth.signOut();
```

### User Management

```tsx
// Get current user
const user = await client.user.get();

// Update user
const updatedUser = await client.user.update({
  name: 'New Name',
  metadata: { preference: 'dark' }
});

// Change password
await client.user.changePassword('oldPassword', 'newPassword');

// Two-factor authentication
const { qrCode, backupCodes } = await client.user.enableTwoFactor();
await client.user.disableTwoFactor('123456');
```

### Organization Management

```tsx
// List organizations
const organizations = await client.organization.list();

// Create organization
const org = await client.organization.create({
  name: 'Acme Corp',
  slug: 'acme'
});

// Switch organization
await client.organization.switch(org.id);

// Invite member
await client.organization.inviteMember(org.id, 'user@example.com', 'member');
```

## React Hooks

### Core Hooks

```tsx
import {
  useAuth,
  useSession,
  useUser,
  useOrganizations,
  useTeams,
  useApiKeys,
  useWebSocket
} from '@cf-auth/client';

function MyComponent() {
  const { user, signIn, signOut } = useAuth();
  const { session, refresh } = useSession();
  const { organizations, switchOrganization } = useOrganizations();
  const { teams, createTeam } = useTeams();
  const { apiKeys, createKey } = useApiKeys();
  const { state: wsState, connect, send } = useWebSocket();
  
  // ... component logic
}
```

### Utility Hooks

```tsx
import {
  useAsyncState,
  useDebounce,
  useLocalStorage,
  useIsOnline
} from '@cf-auth/client';

function UtilityExample() {
  const { data, loading, execute } = useAsyncState(
    () => fetch('/api/data').then(r => r.json())
  );
  
  const [query, setQuery] = useState('');
  const debouncedQuery = useDebounce(query, 500);
  
  const [settings, setSettings] = useLocalStorage('settings', {});
  const isOnline = useIsOnline();
  
  // ... component logic
}
```

## Guard Components

### Authentication Guards

```tsx
import {
  Authenticated,
  Unauthenticated,
  Verified,
  RoleGuard,
  PermissionGuard
} from '@cf-auth/client';

// Only show to authenticated users
<Authenticated fallback={<LoginPrompt />}>
  <Dashboard />
</Authenticated>

// Only show to unauthenticated users
<Unauthenticated fallback={<Dashboard />}>
  <LandingPage />
</Unauthenticated>

// Require email verification
<Verified fallback={<VerificationPrompt />}>
  <SensitiveContent />
</Verified>

// Role-based access
<RoleGuard roles={['admin', 'moderator']} fallback={<AccessDenied />}>
  <AdminPanel />
</RoleGuard>

// Permission-based access
<PermissionGuard 
  permissions={['read:users', 'write:users']} 
  requireAll={true}
  fallback={<AccessDenied />}
>
  <UserManagement />
</PermissionGuard>
```

### Higher-Order Components

```tsx
import { withAuth, withRole, withPermission } from '@cf-auth/client';

// Protect entire component
const ProtectedComponent = withAuth(MyComponent, {
  require: 'authenticated',
  fallback: <LoginPrompt />,
  redirect: '/login'
});

// Role-based component
const AdminComponent = withRole(MyComponent, ['admin']);

// Permission-based component
const UserMgmtComponent = withPermission(MyComponent, ['manage:users']);
```

## WebSocket Integration

```tsx
import { useWebSocket } from '@cf-auth/client';

function RealtimeComponent() {
  const { state, connect, disconnect, send, on } = useWebSocket();

  useEffect(() => {
    const unsubscribe = on('notification', (data) => {
      console.log('Received notification:', data);
    });

    return unsubscribe;
  }, [on]);

  const handleConnect = async () => {
    await connect();
  };

  const sendMessage = () => {
    send({
      type: 'chat_message',
      payload: { message: 'Hello!' },
      timestamp: Date.now()
    });
  };

  return (
    <div>
      <p>Status: {state.connected ? 'Connected' : 'Disconnected'}</p>
      <button onClick={handleConnect}>Connect</button>
      <button onClick={sendMessage}>Send Message</button>
    </div>
  );
}
```

## Plugin System

Create custom plugins to extend functionality:

```tsx
import { createPlugin } from '@cf-auth/client';

const analyticsPlugin = createPlugin({
  id: 'analytics',
  name: 'Analytics Plugin',
  version: '1.0.0',
  init: (client) => {
    // Track authentication events
    client.websocket.on('auth:signIn', (data) => {
      analytics.track('User Signed In', { userId: data.user.id });
    });
  },
  actions: {
    trackEvent: async (event: string, properties: any) => {
      return analytics.track(event, properties);
    }
  },
  hooks: {
    useAnalytics: () => {
      return {
        track: (event: string, properties: any) => {
          analytics.track(event, properties);
        }
      };
    }
  }
});

// Use in provider
<CFAuthProvider
  options={{
    baseURL: 'https://api.example.com',
    plugins: [analyticsPlugin]
  }}
>
  <App />
</CFAuthProvider>
```

## Error Handling

```tsx
import { AuthErrorBoundary, ClientError } from '@cf-auth/client';

function App() {
  return (
    <AuthErrorBoundary
      fallback={(error) => (
        <div>
          <h2>Authentication Error</h2>
          <p>{error.message}</p>
        </div>
      )}
      onError={(error, errorInfo) => {
        console.error('Auth error:', error, errorInfo);
        // Send to error reporting service
      }}
    >
      <CFAuthProvider options={{ baseURL: 'https://api.example.com' }}>
        <MyApp />
      </CFAuthProvider>
    </AuthErrorBoundary>
  );
}

// Handle errors in components
function LoginForm() {
  const { signIn } = useAuth();

  const handleSubmit = async (credentials) => {
    try {
      await signIn(credentials);
    } catch (error) {
      if (error instanceof ClientError) {
        switch (error.code) {
          case 'AUTHENTICATION_ERROR':
            setError('Invalid credentials');
            break;
          case 'NETWORK_ERROR':
            setError('Network error, please try again');
            break;
          default:
            setError('An unexpected error occurred');
        }
      }
    }
  };
}
```

## Storage Options

### Custom Storage Implementation

```tsx
import { CFAuthProvider } from '@cf-auth/client';

// Custom storage for React Native
const AsyncStorageImplementation = {
  async getItem(key: string) {
    return await AsyncStorage.getItem(key);
  },
  async setItem(key: string, value: string) {
    await AsyncStorage.setItem(key, value);
  },
  async removeItem(key: string) {
    await AsyncStorage.removeItem(key);
  },
  async clear() {
    await AsyncStorage.clear();
  }
};

<CFAuthProvider
  options={{
    baseURL: 'https://api.example.com',
    storage: {
      type: 'custom',
      implementation: AsyncStorageImplementation
    }
  }}
>
  <App />
</CFAuthProvider>
```

## TypeScript Support

The package is fully typed with comprehensive TypeScript definitions:

```tsx
import type {
  CFAuthClient,
  User,
  Session,
  UseAuthReturn,
  SignInCredentials,
  OrganizationData
} from '@cf-auth/client';

// Type-safe authentication
const handleSignIn = async (credentials: SignInCredentials) => {
  const result: SignInResponse = await signIn(credentials);
  const user: User = result.user;
  const session: Session = result.session;
};

// Type-safe hooks
const authState: UseAuthReturn = useAuth();
const user: User | null = authState.user;
```

## API Reference

For complete API documentation, see the [TypeScript definitions](./src/types.ts) and [source code](./src/).

## License

MIT

## Contributing

See the main [CF-Better-Auth contributing guide](../../CONTRIBUTING.md).
# CF-Better-Auth

Enterprise-grade authentication platform built on top of [better-auth](https://github.com/better-auth/better-auth) with modular architecture for easy upgrades and extensibility.

## 🎯 Project Status: Phase 0 Complete ✅

**Phase 0: Modular Architecture Setup** has been successfully implemented with:
- ✅ Complete adapter layer architecture
- ✅ Full plugin system with built-in adapters
- ✅ Automated upgrade and compatibility management
- ✅ Comprehensive testing framework
- ✅ CI/CD workflows and documentation
- ✅ Ready for Phase 1: Project Foundation & Setup

## 🏗️ Architecture

CF-Better-Auth uses a sophisticated modular architecture that wraps better-auth as a Git submodule, providing:

- **Adapter Layer**: Isolates your code from better-auth API changes
- **Automatic Upgrades**: Safely upgrade better-auth with compatibility checks
- **Plugin System**: Extend functionality without modifying core
- **Version Management**: Track and manage better-auth versions
- **Migration System**: Handle breaking changes smoothly

## 📦 Packages

- **@cf-auth/core** - Core adapter layer for better-auth integration
- **@cf-auth/client** - Client-side authentication with React hooks
- **@cf-auth/plugins** - Plugin adapter system with built-in plugins
- **@cf-auth/config** - Configuration and version management
- **@cf-auth/types** - TypeScript type definitions
- **@cf-auth/utils** - Utility functions and helpers

## 🚀 Quick Start

### Installation

```bash
# Clone the repository
git clone https://github.com/yourusername/cf-better-auth.git
cd cf-better-auth

# Initialize submodules
git submodule update --init --recursive

# Install dependencies
pnpm install

# Build packages
pnpm build
```

### Basic Usage

```typescript
import { CFBetterAuth } from '@cf-auth/core';

// Initialize authentication
const auth = new CFBetterAuth({
  database: {
    provider: 'postgresql',
    connectionString: process.env.DATABASE_URL
  },
  session: {
    expiresIn: 60 * 60 * 24 * 7 // 1 week
  }
});

await auth.initialize();

// Use authentication
const result = await auth.signIn({
  email: 'user@example.com',
  password: 'password'
});
```

### Client-Side (React)

```tsx
import { AuthProvider, useAuth } from '@cf-auth/client';

// Wrap your app
function App() {
  return (
    <AuthProvider>
      <YourApp />
    </AuthProvider>
  );
}

// Use in components
function LoginButton() {
  const { signIn, isAuthenticated } = useAuth();
  
  if (isAuthenticated) {
    return <div>Already logged in!</div>;
  }
  
  return (
    <button onClick={() => signIn({ email, password })}>
      Login
    </button>
  );
}
```

## 🔄 Upgrading Better-Auth

CF-Better-Auth makes it safe and easy to upgrade the underlying better-auth library:

### Automatic Upgrade

```bash
# Check compatibility and upgrade if safe
pnpm run upgrade:better-auth
```

### Manual Upgrade with Compatibility Check

```bash
# Check compatibility first
pnpm run compatibility:check

# If compatible, upgrade
cd vendor/better-auth
git pull origin main
cd ../..
pnpm install
pnpm build
```

### Handling Breaking Changes

The system automatically detects breaking changes and provides migration guides:

```bash
# Run migrations after major version upgrade
pnpm run migrate
```

## 🔌 Plugin System

### Using Built-in Plugins

```typescript
import { CFBetterAuth } from '@cf-auth/core';
import { createOAuthPlugin, createMFAPlugin } from '@cf-auth/plugins';

const auth = new CFBetterAuth();

// Add OAuth support
auth.addExtension(createOAuthPlugin({
  providers: {
    google: {
      clientId: process.env.GOOGLE_CLIENT_ID,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET
    }
  }
}));

// Add MFA support
auth.addExtension(createMFAPlugin({
  enabled: true,
  methods: { totp: true, sms: true }
}));
```

### Creating Custom Plugins

```typescript
import { createCustomPlugin } from '@cf-auth/plugins';

const auditPlugin = createCustomPlugin({
  name: 'audit-log',
  hooks: {
    afterSignIn: async (user, session) => {
      console.log(`User ${user.id} signed in`);
    },
    afterSignOut: async () => {
      console.log('User signed out');
    }
  }
});

auth.addExtension(auditPlugin);
```

## 🧪 Testing

```bash
# Run all tests
pnpm test

# Run specific package tests
pnpm test --filter @cf-auth/core

# Run integration tests
pnpm test:integration

# Check compatibility
pnpm compatibility:check
```

## 🔧 Configuration

### Environment Variables

```env
DATABASE_URL=postgresql://user:password@localhost:5432/db
AUTH_SECRET=your-secret-key
AUTH_URL=http://localhost:3000
SESSION_EXPIRES_IN=604800
```

### Configuration File

```javascript
// cf-auth.config.js
module.exports = {
  database: {
    provider: 'postgresql',
    connectionString: process.env.DATABASE_URL
  },
  session: {
    expiresIn: 60 * 60 * 24 * 7,
    cookieName: 'cf-auth-session'
  },
  emailAndPassword: {
    enabled: true,
    requireEmailVerification: true
  },
  rateLimit: {
    enabled: true,
    window: 60,
    max: 10
  }
};
```

## 📊 CI/CD

The project includes comprehensive CI/CD workflows:

- **Daily Compatibility Checks**: Automatically checks for better-auth updates
- **Automated Testing**: Runs on every push and PR
- **Auto-Update PRs**: Creates PRs for compatible better-auth updates
- **Integration Testing**: Tests against real databases

## 🛠️ Development

```bash
# Start development mode
pnpm dev

# Build all packages
pnpm build

# Clean build artifacts
pnpm clean

# Run linting
pnpm lint

# Type checking
pnpm typecheck
```

## 📝 Scripts

- `upgrade:better-auth` - Upgrade better-auth with compatibility checks
- `compatibility:check` - Check compatibility with current better-auth version
- `migrate` - Run pending migrations
- `migrate:rollback` - Rollback last migration
- `version:info` - Display version information

## 🤝 Contributing

1. Fork the repository
2. Create your feature branch (`git checkout -b feature/amazing`)
3. Commit your changes (`git commit -m 'Add amazing feature'`)
4. Push to the branch (`git push origin feature/amazing`)
5. Open a Pull Request

## 📄 License

MIT

## 🔗 Links

- [Better-Auth Documentation](https://better-auth.com)
- [CF-Better-Auth Documentation](./docs)
- [API Reference](./docs/api)
- [Migration Guide](./docs/migrations)
# CF-Better-Auth Applications

This directory contains complete applications that demonstrate and utilize the CF-Better-Auth system. These applications serve as both examples and production-ready implementations that showcase the full capabilities of the modular authentication architecture.

## Applications Overview

### [dashboard/](./dashboard/) - Management Dashboard
A comprehensive administrative dashboard for managing authentication, users, and system configuration.

**Purpose**: 
- System administration and monitoring
- User and organization management  
- Analytics and reporting
- Plugin configuration and management

**Key Features**:
- Real-time authentication analytics
- User lifecycle management
- Organization and team administration
- Security monitoring and audit logs
- Plugin marketplace and configuration
- System health monitoring

**Technology Stack**:
- **Framework**: Next.js 14 with App Router
- **UI**: Aceternity UI + shadcn/ui components
- **State Management**: Zustand with persistence
- **Charts**: Recharts for analytics visualization
- **Database**: Direct integration with CF-Better-Auth data layer

### [example/](./example/) - Example Implementation
A complete example application demonstrating CF-Better-Auth integration patterns and best practices.

**Purpose**:
- Reference implementation for developers
- Integration examples and patterns
- Plugin development examples
- Testing and validation scenarios

**Key Features**:
- Multi-tenant organization setup
- All authentication flows (signup, signin, password reset, etc.)
- Social provider integrations
- Two-factor authentication examples
- Passkey/WebAuthn implementation
- API integration examples
- Plugin development examples

**Technology Stack**:
- **Framework**: Next.js 14 with TypeScript
- **UI**: Tailwind CSS with custom components
- **Authentication**: Full CF-Better-Auth integration
- **Testing**: Comprehensive test coverage with Playwright

## Architecture Integration

Both applications demonstrate the full CF-Better-Auth architecture:

### Modular Plugin System
```typescript
// Example plugin integration
import { CFBetterAuth } from '@cf-auth/core';
import { 
  multiTenantPlugin, 
  analyticsPlugin, 
  compliancePlugin 
} from '@cf-auth/plugins';

export const auth = new CFBetterAuth({
  plugins: [
    multiTenantPlugin({
      allowSelfRegistration: true,
      defaultRole: 'member'
    }),
    analyticsPlugin({
      trackSessions: true,
      trackEvents: ['signin', 'signup', 'password_reset']
    }),
    compliancePlugin({
      gdprCompliant: true,
      auditLog: true
    })
  ]
});
```

### Client-Side Integration
```typescript
// React hooks and state management
import { useAuth, useOrganization } from '@cf-auth/client';
import { useAnalytics } from '@cf-auth/plugins/analytics';

function Dashboard() {
  const { user, session } = useAuth();
  const { currentOrganization, switchOrganization } = useOrganization();
  const { trackEvent } = useAnalytics();

  return (
    <div>
      <h1>Welcome, {user?.name}</h1>
      <p>Organization: {currentOrganization?.name}</p>
    </div>
  );
}
```

## Development Environment

### Prerequisites
```bash
# Install dependencies
pnpm install

# Setup environment variables
cp .env.example .env.local

# Initialize database
pnpm db:setup

# Run migrations
pnpm db:migrate
```

### Running Applications

#### Dashboard Application
```bash
# Start dashboard in development
pnpm --filter dashboard dev

# Build dashboard for production
pnpm --filter dashboard build

# Run dashboard tests
pnpm --filter dashboard test
```

#### Example Application
```bash
# Start example app in development
pnpm --filter example dev

# Build example for production
pnpm --filter example build

# Run example tests
pnpm --filter example test

# Run E2E tests
pnpm --filter example test:e2e
```

### Environment Configuration

Both applications require similar environment setup:

```bash
# Database
DATABASE_URL="postgresql://user:password@localhost:5432/cfauth"
REDIS_URL="redis://localhost:6379"

# Authentication secrets
BETTER_AUTH_SECRET="your-secret-key-here"
BETTER_AUTH_URL="http://localhost:3000"

# OAuth providers
GOOGLE_CLIENT_ID="your-google-client-id"
GOOGLE_CLIENT_SECRET="your-google-client-secret"
GITHUB_CLIENT_ID="your-github-client-id"  
GITHUB_CLIENT_SECRET="your-github-client-secret"

# Email service
EMAIL_FROM="noreply@yourdomain.com"
RESEND_API_KEY="your-resend-api-key"

# Analytics (optional)
ANALYTICS_ENDPOINT="https://your-analytics-endpoint.com"

# Feature flags
ENABLE_ORGANIZATIONS=true
ENABLE_PASSKEYS=true
ENABLE_ANALYTICS=true
```

## Dashboard Application Details

### Core Features

#### User Management
- **User Directory**: Complete user listing with search and filters
- **User Profiles**: Detailed user information and edit capabilities
- **Session Management**: View and manage active user sessions
- **Account Actions**: Password resets, email verification, account suspension

#### Organization Management  
- **Organization Dashboard**: Overview of all organizations
- **Member Management**: Add, remove, and manage organization members
- **Role Assignment**: Assign and modify user roles within organizations
- **Organization Settings**: Configure organization-specific settings

#### Analytics & Reporting
- **Authentication Metrics**: Sign-in/sign-up rates, success rates
- **User Activity**: Active users, session duration, geographic distribution
- **Security Events**: Failed login attempts, suspicious activity
- **Custom Reports**: Configurable reports with export functionality

#### System Administration
- **Plugin Management**: Install, configure, and manage plugins
- **System Configuration**: Modify system-wide authentication settings
- **Health Monitoring**: System status, performance metrics, error rates
- **Audit Logs**: Comprehensive audit trail of all system activities

### Technical Implementation

#### Database Queries
```typescript
// Advanced user queries with filtering
const users = await db.query(`
  SELECT u.*, o.name as organization_name, s.last_active
  FROM users u
  LEFT JOIN organization_members om ON u.id = om.user_id
  LEFT JOIN organizations o ON om.organization_id = o.id
  LEFT JOIN sessions s ON u.id = s.user_id AND s.expires_at > NOW()
  WHERE u.created_at > $1
  ORDER BY u.created_at DESC
  LIMIT $2
`, [startDate, limit]);
```

#### Real-time Updates
```typescript
// WebSocket integration for real-time dashboard updates
const useRealTimeMetrics = () => {
  const [metrics, setMetrics] = useState(null);
  
  useEffect(() => {
    const ws = new WebSocket('/api/ws/metrics');
    
    ws.onmessage = (event) => {
      const data = JSON.parse(event.data);
      setMetrics(data);
    };
    
    return () => ws.close();
  }, []);
  
  return metrics;
};
```

## Example Application Details

### Authentication Flows

#### Complete Sign-up Flow
```typescript
// Multi-step signup with email verification
const signup = async (userData) => {
  // Step 1: Create account
  const { user } = await auth.signUp({
    email: userData.email,
    password: userData.password,
    name: userData.name
  });
  
  // Step 2: Send verification email
  await auth.sendVerificationEmail(user.email);
  
  // Step 3: Handle organization invitation (if applicable)
  if (userData.organizationInvite) {
    await auth.acceptOrganizationInvite(userData.organizationInvite);
  }
};
```

#### Social Authentication
```typescript
// Social provider integration
const socialSignIn = async (provider) => {
  await auth.signIn({
    provider,
    redirectTo: '/dashboard'
  });
};
```

#### Two-Factor Authentication
```typescript
// TOTP setup and verification
const setupTOTP = async () => {
  const { secret, qrCode } = await auth.twoFactor.generateTOTP();
  
  // Display QR code to user
  setQRCode(qrCode);
  
  // Verify setup
  const verificationCode = await getUserInput();
  await auth.twoFactor.verifyTOTP(secret, verificationCode);
};
```

### Plugin Development Examples

#### Custom Analytics Plugin
```typescript
// Example analytics plugin implementation
export const customAnalyticsPlugin: BetterAuthPlugin = {
  id: 'custom-analytics',
  
  hooks: {
    afterSignIn: async (session) => {
      await trackEvent('user_signin', {
        userId: session.user.id,
        timestamp: new Date(),
        provider: session.provider,
        location: getLocationFromIP(session.ip)
      });
    }
  },
  
  endpoints: {
    '/analytics/report': {
      method: 'GET',
      handler: async (context) => {
        const report = await generateAnalyticsReport(
          context.query.startDate,
          context.query.endDate
        );
        return Response.json(report);
      }
    }
  }
};
```

## Testing Strategy

### Unit Testing
```typescript
// Component testing with authentication context
import { render, screen } from '@testing-library/react';
import { AuthProvider } from '@cf-auth/client';
import { Dashboard } from '../Dashboard';

test('renders user dashboard correctly', () => {
  const mockUser = { id: '1', name: 'John Doe', email: 'john@example.com' };
  
  render(
    <AuthProvider value={{ user: mockUser }}>
      <Dashboard />
    </AuthProvider>
  );
  
  expect(screen.getByText('Welcome, John Doe')).toBeInTheDocument();
});
```

### Integration Testing
```typescript
// API integration testing
import { createTestAuth } from '@cf-auth/testing-utils';

describe('Authentication Integration', () => {
  let testAuth;
  
  beforeEach(() => {
    testAuth = createTestAuth({
      database: testDatabase,
      plugins: [testPlugins]
    });
  });
  
  it('should complete signup flow', async () => {
    const userData = { email: 'test@example.com', password: 'password123' };
    
    const { user } = await testAuth.signUp(userData);
    expect(user.email).toBe(userData.email);
    expect(user.emailVerified).toBe(false);
    
    await testAuth.verifyEmail(user.emailVerificationToken);
    const verifiedUser = await testAuth.getUser(user.id);
    expect(verifiedUser.emailVerified).toBe(true);
  });
});
```

### End-to-End Testing
```typescript
// Playwright E2E testing
import { test, expect } from '@playwright/test';

test('complete authentication flow', async ({ page }) => {
  // Navigate to signup
  await page.goto('/signup');
  
  // Fill signup form
  await page.fill('[name="email"]', 'test@example.com');
  await page.fill('[name="password"]', 'password123');
  await page.click('button[type="submit"]');
  
  // Verify redirect to verification page
  await expect(page).toHaveURL('/verify-email');
  
  // Simulate email verification
  const verificationToken = await getVerificationToken('test@example.com');
  await page.goto(`/verify-email?token=${verificationToken}`);
  
  // Verify redirect to dashboard
  await expect(page).toHaveURL('/dashboard');
  await expect(page.locator('h1')).toContainText('Welcome');
});
```

## Deployment

Both applications support multiple deployment strategies:

### Vercel Deployment
```bash
# Deploy dashboard
pnpm --filter dashboard deploy:vercel

# Deploy example
pnpm --filter example deploy:vercel
```

### Docker Deployment
```dockerfile
# Multi-stage Docker build
FROM node:18-alpine AS builder
WORKDIR /app
COPY . .
RUN pnpm install --frozen-lockfile
RUN pnpm build

FROM node:18-alpine AS runner
WORKDIR /app
COPY --from=builder /app/dist ./dist
COPY --from=builder /app/node_modules ./node_modules
EXPOSE 3000
CMD ["pnpm", "start"]
```

### Self-hosted Deployment
```bash
# Build for production
pnpm build

# Start with PM2
pm2 start ecosystem.config.js

# Setup reverse proxy (nginx)
sudo cp nginx.conf /etc/nginx/sites-available/cfauth
sudo nginx -s reload
```

These applications demonstrate the full power and flexibility of CF-Better-Auth, providing both practical implementations and comprehensive examples for developers building their own authentication solutions.
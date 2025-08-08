# CF-Better-Auth Dashboard

A comprehensive, modern authentication dashboard built with Next.js 14 and the CF-Better-Auth client library. This dashboard provides a complete interface for managing users, organizations, API keys, security settings, and monitoring authentication activities.

## Features

### 🔐 Authentication & Authorization
- **Secure Authentication Flow**: Integrated with @cf-auth/client
- **Role-Based Access Control**: Support for different user roles and permissions
- **Email Verification**: Required verification before accessing the dashboard
- **Authentication Guards**: Protect routes and components

### 🏢 Organization Management
- **Multi-Organization Support**: Switch between organizations
- **Organization Overview**: View member counts, teams, and projects
- **Organization Creation**: Create and configure new organizations
- **Role Management**: Manage user roles within organizations

### 👥 User & Profile Management
- **User Profile**: Edit personal information, contact details, and preferences
- **Avatar Support**: Upload and manage profile pictures
- **Account Settings**: Comprehensive settings management
- **Profile Verification Status**: Display verification badges

### 🔑 API Key Management
- **API Key Generation**: Create API keys with custom scopes and expiration
- **Key Visibility Toggle**: Show/hide API keys for security
- **Usage Tracking**: Monitor API key usage and statistics
- **Key Revocation**: Manage and revoke API keys

### 🛡️ Security Features
- **Two-Factor Authentication**: Enable/disable 2FA
- **Passkey Support**: WebAuthn biometric authentication
- **Security Audit Logs**: Track security-related activities
- **Session Management**: Monitor and manage active sessions

### 📊 Dashboard Analytics
- **Real-time Statistics**: User counts, API usage, security events
- **Activity Feed**: Live activity updates via WebSocket
- **Usage Metrics**: Track system usage and performance
- **Visual Charts**: Data visualization with Recharts

### 🎨 Modern UI/UX
- **Dark/Light Theme**: System preference detection with manual toggle
- **Responsive Design**: Mobile-first responsive layout
- **Accessible Components**: ARIA-compliant UI components
- **Loading States**: Skeleton loaders and spinners
- **Error Boundaries**: Graceful error handling

### ⚡ Real-time Features
- **WebSocket Integration**: Real-time activity updates
- **Live Notifications**: Instant security alerts and updates
- **Connection Status**: Visual WebSocket connection indicator
- **Auto-reconnection**: Automatic WebSocket reconnection

## Tech Stack

- **Framework**: Next.js 14 (App Router)
- **Language**: TypeScript
- **Styling**: Tailwind CSS
- **UI Components**: Radix UI primitives
- **Authentication**: @cf-auth/client
- **State Management**: React Query + Zustand
- **Real-time**: WebSocket support
- **Icons**: Lucide React
- **Animations**: Framer Motion
- **Forms**: React Hook Form + Zod validation

## Project Structure

```
src/
├── app/                          # Next.js App Router
│   ├── dashboard/               # Dashboard routes
│   │   ├── layout.tsx          # Dashboard layout with auth guards
│   │   ├── page.tsx            # Main dashboard page
│   │   ├── profile/            # User profile management
│   │   ├── organizations/      # Organization management
│   │   ├── api-keys/          # API key management
│   │   ├── settings/          # Account settings
│   │   └── ...
│   ├── globals.css            # Global styles
│   └── layout.tsx             # Root layout
├── components/
│   ├── auth/                  # Authentication components
│   │   └── auth-guard.tsx     # Route protection
│   ├── dashboard/             # Dashboard-specific components
│   │   ├── stats-widget.tsx   # Statistics widgets
│   │   ├── quick-actions.tsx  # Quick action buttons
│   │   ├── activity-feed.tsx  # Activity timeline
│   │   └── organization-overview.tsx
│   ├── error/                 # Error handling
│   │   └── error-boundary.tsx # Error boundaries
│   ├── layout/                # Layout components
│   │   ├── sidebar.tsx        # Navigation sidebar
│   │   ├── header.tsx         # Top header
│   │   └── organization-switcher.tsx
│   ├── loading/               # Loading states
│   │   └── dashboard-skeleton.tsx
│   ├── providers/             # Context providers
│   │   └── index.tsx          # App providers
│   ├── realtime/              # WebSocket components
│   │   ├── websocket-status.tsx
│   │   └── live-activity.tsx
│   └── ui/                    # Reusable UI components
│       ├── button.tsx
│       ├── card.tsx
│       ├── input.tsx
│       └── ...
├── hooks/                     # Custom React hooks
│   └── use-toast.ts
├── lib/                       # Utility functions
│   └── utils.ts
└── types/                     # TypeScript type definitions
```

## Getting Started

### Prerequisites

- Node.js 18+ 
- pnpm (recommended) or npm
- CF-Better-Auth server running

### Installation

1. **Install dependencies**:
   ```bash
   pnpm install
   ```

2. **Set up environment variables**:
   ```bash
   cp .env.example .env.local
   ```
   
   Configure the following variables:
   ```env
   NEXT_PUBLIC_APP_URL=http://localhost:3001
   NEXT_PUBLIC_API_URL=http://localhost:3000
   NEXT_PUBLIC_WS_URL=ws://localhost:3000/ws
   ```

3. **Start the development server**:
   ```bash
   pnpm dev
   ```

4. **Access the dashboard**:
   Open [http://localhost:3001](http://localhost:3001) in your browser.

### Production Build

```bash
# Build the application
pnpm build

# Start the production server
pnpm start
```

## Configuration

### Authentication Setup

The dashboard automatically connects to your CF-Better-Auth server using the configured API URL. Ensure your server is running and accessible.

### WebSocket Configuration

Real-time features require WebSocket support. Configure the WebSocket URL in your environment variables:

```env
NEXT_PUBLIC_WS_URL=ws://your-server.com/ws
```

### Theme Configuration

The dashboard supports system preference detection and manual theme switching. Themes are automatically persisted using localStorage.

## Key Components

### Dashboard Layout
- **Sidebar Navigation**: Collapsible sidebar with organization switcher
- **Header**: Search, notifications, theme toggle, and user menu
- **Content Area**: Protected by authentication guards and error boundaries

### Authentication Flow
1. **Auth Guard**: Checks authentication status
2. **Email Verification**: Ensures email is verified
3. **Role Validation**: Validates user roles and permissions
4. **Session Management**: Handles token refresh automatically

### Real-time Features
- **WebSocket Connection**: Automatic connection management
- **Live Activity Feed**: Real-time activity updates
- **Connection Status**: Visual connection indicator
- **Auto-reconnection**: Handles connection drops gracefully

## Development

### Adding New Pages

1. Create a new directory under `src/app/dashboard/`
2. Add a `page.tsx` file for the route component
3. Add navigation entry in `src/components/layout/sidebar.tsx`
4. Implement proper TypeScript types

### Creating Components

1. Use the existing UI component patterns
2. Follow the component structure in `src/components/ui/`
3. Include proper accessibility attributes
4. Add loading and error states

### Styling Guidelines

- Use Tailwind CSS utility classes
- Follow the design system color palette
- Use CSS variables for theming
- Implement responsive design (mobile-first)

## Deployment

The dashboard can be deployed to any platform that supports Next.js:

- **Vercel**: Automatic deployments from Git
- **Netlify**: Static site generation support
- **Docker**: Production-ready Dockerfile included
- **Self-hosted**: Node.js server deployment

### Environment Variables

Set the following environment variables in production:

```env
NEXT_PUBLIC_APP_URL=https://your-dashboard.com
NEXT_PUBLIC_API_URL=https://your-api.com
NEXT_PUBLIC_WS_URL=wss://your-api.com/ws
```

## Security Considerations

- **HTTPS Only**: Use HTTPS in production
- **API Security**: Ensure API endpoints are properly secured
- **Token Management**: Automatic token refresh and secure storage
- **CSP Headers**: Implement Content Security Policy
- **CSRF Protection**: Built-in CSRF protection

## Browser Support

- Chrome 88+
- Firefox 85+
- Safari 14+
- Edge 88+

Modern browsers with ES2020 and WebSocket support.

## Contributing

1. Fork the repository
2. Create a feature branch
3. Follow the coding standards
4. Add tests for new functionality
5. Submit a pull request

## License

This project is part of the CF-Better-Auth ecosystem and follows the same license terms.

## Support

For questions and support:
- GitHub Issues: Create an issue for bugs or feature requests
- Documentation: Check the main CF-Better-Auth documentation
- Community: Join the community discussions
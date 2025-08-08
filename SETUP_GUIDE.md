# CF-Better-Auth Setup Guide

This guide will walk you through setting up the complete CF-Better-Auth project based on the specifications in `Final_Project.md`.

## 🚀 Quick Start

### Prerequisites

- Node.js 18+ 
- PostgreSQL database
- Redis (optional, for sessions and caching)
- Email service (SendGrid or Resend)

### 1. Installation

```bash
# Install all dependencies
npm run install:all

# Or install individually
npm install
cd server && npm install
cd ../apps/web && npm install
```

### 2. Environment Configuration

#### Server Configuration

Copy and configure the server environment:

```bash
cp server/.env.example server/.env
```

Edit `server/.env` with your actual configuration:

```env
# === REQUIRED: Update these for your brand ===
APP_NAME=Your Company Auth
APP_LOGO_URL=/logo.png
APP_DESCRIPTION=Secure authentication for your application
APP_PRIMARY_COLOR=#3B82F6
APP_DOMAIN=localhost

# === REQUIRED: Security ===
BETTER_AUTH_SECRET=your-super-secret-key-minimum-32-characters-long
BETTER_AUTH_URL=http://localhost:3000

# === REQUIRED: Database ===
DATABASE_URL=postgresql://user:password@localhost:5432/auth_db

# === REQUIRED: Email Service ===
SENDGRID_API_KEY=your-sendgrid-api-key
FROM_EMAIL=noreply@yourdomain.com
```

#### Frontend Configuration

Copy and configure the frontend environment:

```bash
cp apps/web/.env.example apps/web/.env.local
```

Edit `apps/web/.env.local`:

```env
NEXT_PUBLIC_APP_NAME=Your Company Auth
NEXT_PUBLIC_APP_LOGO_URL=/logo.png
NEXT_PUBLIC_APP_PRIMARY_COLOR=#3B82F6
NEXT_PUBLIC_APP_URL=http://localhost:3000
NEXT_PUBLIC_AUTH_SERVER_URL=http://localhost:8787
BETTER_AUTH_SECRET=your-super-secret-key-minimum-32-characters-long
```

### 3. Database Setup

Create your PostgreSQL database:

```sql
CREATE DATABASE auth_db;
CREATE USER auth_user WITH PASSWORD 'your-password';
GRANT ALL PRIVILEGES ON DATABASE auth_db TO auth_user;
```

Run database migrations:

```bash
npm run migrate
```

### 4. Development

Start both server and frontend in development mode:

```bash
npm run dev
```

This will start:
- Backend server on `http://localhost:8787`
- Frontend application on `http://localhost:3000`

Or run individually:

```bash
# Start server only
npm run dev:server

# Start frontend only
npm run dev:frontend
```

## 📁 Project Structure

```
CF-Better-Auth/
├── server/                    # Backend Express server
│   ├── src/
│   │   ├── lib/
│   │   │   ├── auth.ts       # Better-auth configuration
│   │   │   ├── db.ts         # Database connection
│   │   │   └── email.ts      # Email service
│   │   └── index.ts          # Server entry point
│   ├── .env.example          # Environment template
│   └── package.json
├── apps/web/                  # Next.js frontend
│   ├── src/
│   │   ├── app/              # Next.js 14 App Router
│   │   ├── components/       # React components
│   │   ├── lib/              # Utility functions
│   │   └── hooks/            # Custom React hooks
│   ├── .env.example          # Environment template
│   └── package.json
└── package.json              # Root workspace config
```

## 🔧 Available Scripts

### Root Level Scripts

```bash
npm run install:all          # Install all dependencies
npm run dev                  # Start both server and frontend
npm run build                # Build both applications
npm run test                 # Run all tests
npm run lint                 # Lint all code
npm run format               # Format all code
```

### Server Scripts

```bash
cd server
npm run dev                  # Start development server
npm run build                # Build for production
npm run start                # Start production server
npm run migrate              # Run database migrations
npm run generate             # Generate database schema
```

### Frontend Scripts

```bash
cd apps/web
npm run dev                  # Start development server
npm run build                # Build for production
npm run start                # Start production server
npm run type-check           # TypeScript type checking
```

## 🔐 Authentication Features

The system includes:

- **Email/Password Authentication** - Traditional login with verification
- **OAuth Providers** - Google, GitHub, Discord, Facebook, Apple
- **Magic Links** - Passwordless authentication via email
- **Passkeys** - WebAuthn/FIDO2 biometric authentication  
- **Two-Factor Authentication** - TOTP and backup codes
- **SMS OTP** - Phone number verification
- **Organizations** - Multi-tenant support with roles
- **API Keys** - Programmatic access tokens
- **Session Management** - Multi-device sessions
- **Audit Logging** - Security event tracking

## 🎨 Customization

### Branding

Update your brand settings in the environment files:

```env
APP_NAME=Your Company Name
APP_LOGO_URL=/path/to/your/logo.png
APP_DESCRIPTION=Your app description
APP_PRIMARY_COLOR=#YourBrandColor
APP_FAVICON=/path/to/favicon.ico
```

### UI Themes

The frontend uses Tailwind CSS with customizable design tokens. Modify the theme in:

- `apps/web/src/app/globals.css` - CSS custom properties
- `apps/web/tailwind.config.js` - Tailwind configuration

## 🔌 OAuth Providers Setup

### Google OAuth

1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Create a new project or select existing
3. Enable Google+ API
4. Create OAuth 2.0 credentials
5. Add your domain to authorized origins
6. Update your `.env` file:

```env
GOOGLE_CLIENT_ID=your-google-client-id
GOOGLE_CLIENT_SECRET=your-google-client-secret
```

### GitHub OAuth

1. Go to GitHub Settings > Developer settings > OAuth Apps
2. Click "New OAuth App"
3. Set Authorization callback URL to `http://localhost:8787/api/auth/callback/github`
4. Update your `.env` file:

```env
GITHUB_CLIENT_ID=your-github-client-id
GITHUB_CLIENT_SECRET=your-github-client-secret
```

## 📧 Email Service Setup

### SendGrid

1. Sign up for [SendGrid](https://sendgrid.com/)
2. Create an API key with Mail Send permissions
3. Update your `.env` file:

```env
SENDGRID_API_KEY=your-sendgrid-api-key
FROM_EMAIL=noreply@yourdomain.com
```

### Resend (Alternative)

1. Sign up for [Resend](https://resend.com/)
2. Create an API key
3. Update your `.env` file:

```env
RESEND_API_KEY=your-resend-api-key
FROM_EMAIL=noreply@yourdomain.com
```

## 🚀 Production Deployment

### Environment Variables

Ensure all production environment variables are set:

```env
NODE_ENV=production
BETTER_AUTH_SECRET=your-production-secret-64-characters-minimum
DATABASE_URL=postgresql://user:pass@host:port/dbname
ALLOWED_ORIGINS=https://yourdomain.com,https://www.yourdomain.com
```

### Database

Run production migrations:

```bash
NODE_ENV=production npm run migrate
```

### Build and Deploy

```bash
npm run build
npm run docker:build
npm run docker:up
```

## 🛠 Troubleshooting

### Common Issues

1. **Database Connection Error**
   - Check your `DATABASE_URL` format
   - Ensure PostgreSQL is running
   - Verify user permissions

2. **Email Not Sending**
   - Check your email service API key
   - Verify `FROM_EMAIL` is authorized
   - Check service quotas and limits

3. **OAuth Not Working**
   - Verify callback URLs match exactly
   - Check client ID and secret
   - Ensure OAuth apps are published/verified

4. **CORS Issues**
   - Update `ALLOWED_ORIGINS` in server `.env`
   - Check frontend and backend URLs match

### Support

For issues and questions:

1. Check the [troubleshooting guide](docs/maintenance/troubleshooting-guide.md)
2. Review the [Final_Project.md](Final_Project.md) specifications
3. Check existing issues in the repository

## 📚 Next Steps

1. **Complete Authentication Integration** - Implement actual auth forms
2. **Add Protected Routes** - Set up authentication guards  
3. **Customize UI Components** - Brand your interface
4. **Configure Production Services** - Set up production database, email, etc.
5. **Add Analytics** - Implement usage tracking
6. **Set up Monitoring** - Add error tracking and health checks

---

🎉 **Congratulations!** You now have a complete authentication system ready for development. Start by customizing the branding and adding your specific business logic.
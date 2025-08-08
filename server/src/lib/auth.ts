import { betterAuth } from 'better-auth';
import { drizzleAdapter } from 'better-auth/adapters/drizzle';
import { 
  emailOTP,
  magicLink,
  passkey,
  username,
  twoFactor,
  phoneNumber,
  organization,
  admin,
  multiSession,
  apiKey,
  bearer,
  jwt,
  rateLimit,
  audit,
  oidcProvider,
  genericOAuth,
  customSession,
  openAPI
} from 'better-auth/plugins';

import { db } from './db';
import { sendEmail } from './email';

// Validate required environment variables
const requiredEnvVars = [
  'BETTER_AUTH_SECRET',
  'BETTER_AUTH_URL',
  'DATABASE_URL'
];

for (const envVar of requiredEnvVars) {
  if (!process.env[envVar]) {
    throw new Error(`Missing required environment variable: ${envVar}`);
  }
}

export const auth = betterAuth({
  // Database configuration
  database: drizzleAdapter(db, {
    provider: 'pg',
    schema: {
      // Custom schema extensions can be added here
    }
  }),

  // Core authentication settings
  secret: process.env.BETTER_AUTH_SECRET!,
  baseURL: process.env.BETTER_AUTH_URL!,

  // Email configuration
  emailAndPassword: {
    enabled: process.env.ENABLE_EMAIL_AUTH === 'true',
    requireEmailVerification: true,
    sendResetPassword: async ({ user, url }) => {
      await sendEmail({
        to: user.email,
        subject: `Reset Your Password - ${process.env.APP_NAME || 'CF-Better-Auth'}`,
        html: `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
            <h2>Reset Your Password</h2>
            <p>Hi ${user.name || 'there'},</p>
            <p>You requested a password reset for your account. Click the button below to reset your password:</p>
            <a href="${url}" style="display: inline-block; background-color: ${process.env.APP_PRIMARY_COLOR || '#3B82F6'}; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; margin: 20px 0;">Reset Password</a>
            <p>If you didn't request this, you can safely ignore this email.</p>
            <p>This link will expire in 1 hour.</p>
            <hr style="margin: 30px 0; border: none; border-top: 1px solid #eee;">
            <p style="color: #666; font-size: 12px;">
              This email was sent by ${process.env.APP_NAME || 'CF-Better-Auth'}<br>
              If you have questions, contact us at ${process.env.SUPPORT_EMAIL || 'support@example.com'}
            </p>
          </div>
        `
      });
    }
  },

  // Session configuration
  session: {
    expiresIn: 60 * 60 * 24 * 7, // 7 days
    updateAge: 60 * 60 * 24, // 1 day
    cookieCache: {
      enabled: true,
      maxAge: 60 * 5 // 5 minutes
    }
  },

  // User configuration
  user: {
    additionalFields: {
      username: {
        type: 'string',
        required: false,
        unique: true,
        validator: (value: string) => {
          if (value && !/^[a-zA-Z0-9_]{3,20}$/.test(value)) {
            throw new Error('Username must be 3-20 characters long and contain only letters, numbers, and underscores');
          }
          return true;
        }
      },
      phoneNumber: {
        type: 'string',
        required: false,
        unique: true
      },
      role: {
        type: 'string',
        required: false,
        defaultValue: 'user'
      }
    }
  },

  // Rate limiting
  rateLimit: {
    window: parseInt(process.env.RATE_LIMIT_WINDOW || '60000'),
    max: parseInt(process.env.RATE_LIMIT_MAX_REQUESTS || '100'),
    storage: 'memory' // Use Redis in production
  },

  // Social providers configuration
  socialProviders: process.env.ENABLE_OAUTH === 'true' ? {
    google: process.env.GOOGLE_CLIENT_ID ? {
      clientId: process.env.GOOGLE_CLIENT_ID,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET!
    } : undefined,

    github: process.env.GITHUB_CLIENT_ID ? {
      clientId: process.env.GITHUB_CLIENT_ID,
      clientSecret: process.env.GITHUB_CLIENT_SECRET!
    } : undefined,

    discord: process.env.DISCORD_CLIENT_ID ? {
      clientId: process.env.DISCORD_CLIENT_ID,
      clientSecret: process.env.DISCORD_CLIENT_SECRET!
    } : undefined,

    facebook: process.env.FACEBOOK_CLIENT_ID ? {
      clientId: process.env.FACEBOOK_CLIENT_ID,
      clientSecret: process.env.FACEBOOK_CLIENT_SECRET!
    } : undefined,

    apple: process.env.APPLE_CLIENT_ID ? {
      clientId: process.env.APPLE_CLIENT_ID,
      clientSecret: process.env.APPLE_CLIENT_SECRET!
    } : undefined
  } : {},

  // Plugins configuration
  plugins: [
    // Email OTP
    process.env.ENABLE_EMAIL_AUTH === 'true' && emailOTP({
      async sendOTP({ email, otp, type }) {
        await sendEmail({
          to: email,
          subject: `Your verification code - ${process.env.APP_NAME || 'CF-Better-Auth'}`,
          html: `
            <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
              <h2>Verification Code</h2>
              <p>Your verification code is:</p>
              <div style="font-size: 32px; font-weight: bold; color: ${process.env.APP_PRIMARY_COLOR || '#3B82F6'}; text-align: center; padding: 20px; background-color: #f8f9fa; border-radius: 8px; margin: 20px 0;">
                ${otp}
              </div>
              <p>This code will expire in 5 minutes.</p>
              <p style="color: #666; font-size: 12px;">
                This email was sent by ${process.env.APP_NAME || 'CF-Better-Auth'}
              </p>
            </div>
          `
        });
      },
      expiresIn: 60 * 5, // 5 minutes
      otpLength: 6
    }),

    // Magic Links
    process.env.ENABLE_MAGIC_LINKS === 'true' && magicLink({
      async sendMagicLink({ email, url, token }) {
        await sendEmail({
          to: email,
          subject: `Sign in to ${process.env.APP_NAME || 'CF-Better-Auth'}`,
          html: `
            <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
              <h2>Sign In</h2>
              <p>Click the button below to sign in to your account:</p>
              <a href="${url}" style="display: inline-block; background-color: ${process.env.APP_PRIMARY_COLOR || '#3B82F6'}; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; margin: 20px 0;">Sign In</a>
              <p>If you didn't request this, you can safely ignore this email.</p>
              <p>This link will expire in 10 minutes.</p>
              <p style="color: #666; font-size: 12px;">
                This email was sent by ${process.env.APP_NAME || 'CF-Better-Auth'}
              </p>
            </div>
          `
        });
      },
      expiresIn: 60 * 10 // 10 minutes
    }),

    // Passkeys (WebAuthn)
    process.env.ENABLE_PASSKEYS === 'true' && passkey({
      rpID: process.env.APP_DOMAIN || 'localhost',
      rpName: process.env.APP_NAME || 'CF-Better-Auth',
      origin: process.env.BETTER_AUTH_URL!
    }),

    // Username authentication
    username({
      validator: (username: string) => {
        if (!/^[a-zA-Z0-9_]{3,20}$/.test(username)) {
          throw new Error('Username must be 3-20 characters long and contain only letters, numbers, and underscores');
        }
        return true;
      }
    }),

    // Two-Factor Authentication
    process.env.ENABLE_2FA === 'true' && twoFactor({
      issuer: process.env.APP_NAME || 'CF-Better-Auth',
      backupCodeLength: 8,
      backupCodeCount: 10
    }),

    // Phone Number (SMS OTP)
    phoneNumber({
      async sendSMS({ phoneNumber, otp }) {
        // SMS implementation would go here using Twilio
        console.log(`SMS OTP ${otp} would be sent to ${phoneNumber}`);
      }
    }),

    // Organization (Multi-tenancy)
    organization({
      allowUserToCreateOrganization: true,
      organizationLimit: 5,
      memberLimit: 100
    }),

    // Admin capabilities
    admin(),

    // Multiple sessions
    multiSession(),

    // API Keys
    process.env.ENABLE_API_KEYS === 'true' && apiKey({
      apiKeyLength: 32,
      prefix: 'cf_auth_'
    }),

    // Bearer token
    bearer(),

    // JWT
    jwt({
      jwksEndpoint: '/api/auth/jwks'
    }),

    // Rate limiting
    rateLimit({
      window: parseInt(process.env.RATE_LIMIT_WINDOW || '60000'),
      max: parseInt(process.env.RATE_LIMIT_MAX_REQUESTS || '100'),
      storage: 'memory'
    }),

    // Audit logging
    audit(),

    // OIDC Provider
    oidcProvider({
      clientSecret: process.env.OIDC_CLIENT_SECRET
    }),

    // Generic OAuth
    process.env.CUSTOM_OAUTH_CLIENT_ID && genericOAuth({
      providerId: 'custom',
      clientId: process.env.CUSTOM_OAUTH_CLIENT_ID,
      clientSecret: process.env.CUSTOM_OAUTH_CLIENT_SECRET!,
      authorizationUrl: 'https://your-oauth-provider.com/oauth/authorize',
      tokenUrl: 'https://your-oauth-provider.com/oauth/token',
      userInfoUrl: 'https://your-oauth-provider.com/oauth/userinfo',
      scopes: ['openid', 'profile', 'email']
    }),

    // Custom session data
    customSession(),

    // OpenAPI documentation
    openAPI()
  ].filter(Boolean), // Remove any undefined plugins

  // Advanced security options
  advanced: {
    generateId: () => crypto.randomUUID(),
    crossSubDomainCookies: {
      enabled: false // Set to true if using subdomains
    },
    useSecureCookies: process.env.NODE_ENV === 'production',
    cookieSameSite: 'lax'
  },

  // Trusted origins for CORS
  trustedOrigins: process.env.ALLOWED_ORIGINS?.split(',') || ['http://localhost:3000']
});

export type AuthType = typeof auth;
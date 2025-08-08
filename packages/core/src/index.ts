// Core adapter and wrapper
export * from './adapter';
export * from './auth-wrapper';
export * from './config';
export * from './middleware';
export * from './compatibility';
export * from './extensions';

// Main exports
export { CFBetterAuth, createCFAuth, createCFAuthAsync } from './auth-wrapper';
export { BetterAuthAdapter } from './adapter';

// Re-export types for convenience
export type {
  BetterAuthOptions,
  BetterAuthInstance,
  CFAuthInstance,
  User,
  Session,
  SignInResponse,
  SignUpResponse
} from '@cf-auth/types';

// Default export
export { CFBetterAuth as default } from './auth-wrapper';
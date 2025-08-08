/**
 * Authentication types for CF-Better-Auth
 * Compatible with better-auth types while extending for CF-specific features
 */

import type { WithId, WithTimestamps, OmitId, OmitTimestamps, Brand, Status } from './common';

/**
 * Branded types for enhanced type safety
 */
export type UserId = Brand<string, 'UserId'>;
export type SessionId = Brand<string, 'SessionId'>;
export type AccountId = Brand<string, 'AccountId'>;
export type OrganizationId = Brand<string, 'OrganizationId'>;
export type TeamId = Brand<string, 'TeamId'>;
export type RoleId = Brand<string, 'RoleId'>;
export type PermissionId = Brand<string, 'PermissionId'>;

/**
 * Core User entity
 */
export interface User extends WithId, WithTimestamps {
  /** Unique identifier for the user */
  id: UserId;
  
  /** User's email address (unique) */
  email?: string;
  
  /** Whether the email has been verified */
  emailVerified?: boolean;
  
  /** User's display name */
  name?: string;
  
  /** User's first name */
  firstName?: string;
  
  /** User's last name */
  lastName?: string;
  
  /** User's profile image URL */
  image?: string;
  
  /** User's phone number */
  phone?: string;
  
  /** Whether the phone has been verified */
  phoneVerified?: boolean;
  
  /** User's preferred locale/language */
  locale?: string;
  
  /** User's timezone */
  timezone?: string;
  
  /** User's current status */
  status: Status;
  
  /** User's role assignments */
  roles?: UserRole[];
  
  /** User's organization memberships */
  organizations?: OrganizationMember[];
  
  /** User's team memberships */
  teams?: TeamMember[];
  
  /** Last time user was active */
  lastActiveAt?: Date;
  
  /** User preferences and settings */
  preferences?: UserPreferences;
  
  /** User metadata (extensible) */
  metadata?: Record<string, any>;
  
  /** When user was banned (if applicable) */
  bannedAt?: Date;
  
  /** Reason for ban (if applicable) */
  banReason?: string;
  
  /** When user account was deleted (soft delete) */
  deletedAt?: Date;
}

/**
 * User creation input
 */
export type CreateUserInput = OmitId<OmitTimestamps<User>> & {
  password?: string;
  confirmPassword?: string;
};

/**
 * User update input
 */
export type UpdateUserInput = Partial<Omit<CreateUserInput, 'email'>> & {
  id: UserId;
};

/**
 * User preferences
 */
export interface UserPreferences {
  /** Email notification settings */
  emailNotifications?: {
    marketing?: boolean;
    security?: boolean;
    updates?: boolean;
  };
  
  /** Push notification settings */
  pushNotifications?: {
    enabled?: boolean;
    marketing?: boolean;
    security?: boolean;
  };
  
  /** UI/UX preferences */
  ui?: {
    theme?: 'light' | 'dark' | 'auto';
    language?: string;
    timezone?: string;
  };
  
  /** Privacy settings */
  privacy?: {
    profileVisible?: boolean;
    emailVisible?: boolean;
    phoneVisible?: boolean;
  };
  
  /** Additional custom preferences */
  custom?: Record<string, any>;
}

/**
 * Session entity
 */
export interface Session extends WithId, WithTimestamps {
  /** Unique session identifier */
  id: SessionId;
  
  /** Associated user ID */
  userId: UserId;
  
  /** Session token (hashed) */
  token?: string;
  
  /** When the session expires */
  expiresAt: Date;
  
  /** IP address where session was created */
  ipAddress?: string;
  
  /** User agent string */
  userAgent?: string;
  
  /** Device information */
  device?: DeviceInfo;
  
  /** Location information */
  location?: LocationInfo;
  
  /** Whether this is the active session */
  isActive: boolean;
  
  /** When user was last active in this session */
  lastAccessedAt?: Date;
  
  /** Session metadata */
  metadata?: Record<string, any>;
  
  /** When session was revoked */
  revokedAt?: Date;
  
  /** Reason for revocation */
  revokeReason?: string;
}

/**
 * Device information
 */
export interface DeviceInfo {
  /** Device type */
  type?: 'desktop' | 'mobile' | 'tablet' | 'unknown';
  
  /** Operating system */
  os?: string;
  
  /** Browser name */
  browser?: string;
  
  /** Device name/model */
  name?: string;
  
  /** Whether device is trusted */
  trusted?: boolean;
}

/**
 * Location information
 */
export interface LocationInfo {
  /** Country code */
  country?: string;
  
  /** Region/state */
  region?: string;
  
  /** City */
  city?: string;
  
  /** Approximate coordinates */
  coordinates?: {
    lat: number;
    lng: number;
  };
}

/**
 * Account entity (OAuth/Social logins)
 */
export interface Account extends WithId, WithTimestamps {
  /** Unique account identifier */
  id: AccountId;
  
  /** Associated user ID */
  userId: UserId;
  
  /** Provider name (e.g., 'google', 'github') */
  provider: string;
  
  /** Provider's account ID */
  providerAccountId: string;
  
  /** Account type */
  type: 'oauth' | 'oidc' | 'email' | 'credentials' | 'webauthn';
  
  /** OAuth access token */
  access_token?: string;
  
  /** OAuth refresh token */
  refresh_token?: string;
  
  /** OAuth ID token */
  id_token?: string;
  
  /** Token type */
  token_type?: string;
  
  /** OAuth scope */
  scope?: string;
  
  /** When access token expires */
  expires_at?: number;
  
  /** Provider-specific data */
  providerData?: Record<string, any>;
  
  /** Account status */
  status: Status;
  
  /** When account was linked */
  linkedAt: Date;
}

/**
 * Verification entity (email, phone, etc.)
 */
export interface Verification extends WithId, WithTimestamps {
  /** Unique verification identifier */
  id: string;
  
  /** What is being verified (email, phone) */
  identifier: string;
  
  /** Verification value/token */
  value: string;
  
  /** When verification expires */
  expiresAt: Date;
  
  /** Type of verification */
  type: 'email' | 'phone' | 'password_reset' | 'email_change';
  
  /** Associated user ID (if applicable) */
  userId?: UserId;
  
  /** Number of attempts made */
  attempts?: number;
  
  /** Maximum allowed attempts */
  maxAttempts?: number;
  
  /** Whether verification was used */
  used?: boolean;
  
  /** When verification was used */
  usedAt?: Date;
}

/**
 * Organization entity
 */
export interface Organization extends WithId, WithTimestamps {
  /** Unique organization identifier */
  id: OrganizationId;
  
  /** Organization name */
  name: string;
  
  /** Organization slug (unique) */
  slug: string;
  
  /** Organization description */
  description?: string;
  
  /** Organization logo URL */
  logo?: string;
  
  /** Organization website */
  website?: string;
  
  /** Organization email */
  email?: string;
  
  /** Organization phone */
  phone?: string;
  
  /** Organization address */
  address?: Address;
  
  /** Organization settings */
  settings?: OrganizationSettings;
  
  /** Organization status */
  status: Status;
  
  /** Organization metadata */
  metadata?: Record<string, any>;
  
  /** When organization was deleted (soft delete) */
  deletedAt?: Date;
}

/**
 * Address information
 */
export interface Address {
  street?: string;
  city?: string;
  state?: string;
  country?: string;
  postalCode?: string;
  coordinates?: {
    lat: number;
    lng: number;
  };
}

/**
 * Organization settings
 */
export interface OrganizationSettings {
  /** Whether organization allows public visibility */
  public?: boolean;
  
  /** Default user role for new members */
  defaultRole?: string;
  
  /** Whether organization requires approval for new members */
  requireApproval?: boolean;
  
  /** Custom branding settings */
  branding?: {
    primaryColor?: string;
    secondaryColor?: string;
    logo?: string;
    favicon?: string;
  };
  
  /** Security settings */
  security?: {
    requireMFA?: boolean;
    passwordPolicy?: PasswordPolicy;
    sessionTimeout?: number;
  };
  
  /** Additional custom settings */
  custom?: Record<string, any>;
}

/**
 * Password policy configuration
 */
export interface PasswordPolicy {
  minLength?: number;
  maxLength?: number;
  requireUppercase?: boolean;
  requireLowercase?: boolean;
  requireNumbers?: boolean;
  requireSymbols?: boolean;
  preventCommonPasswords?: boolean;
  preventPasswordReuse?: number;
}

/**
 * Team entity
 */
export interface Team extends WithId, WithTimestamps {
  /** Unique team identifier */
  id: TeamId;
  
  /** Team name */
  name: string;
  
  /** Team slug (unique within organization) */
  slug: string;
  
  /** Team description */
  description?: string;
  
  /** Associated organization ID */
  organizationId: OrganizationId;
  
  /** Team avatar/image URL */
  avatar?: string;
  
  /** Team settings */
  settings?: TeamSettings;
  
  /** Team status */
  status: Status;
  
  /** Team metadata */
  metadata?: Record<string, any>;
  
  /** When team was deleted (soft delete) */
  deletedAt?: Date;
}

/**
 * Team settings
 */
export interface TeamSettings {
  /** Whether team is private */
  private?: boolean;
  
  /** Default permissions for team members */
  defaultPermissions?: string[];
  
  /** Additional custom settings */
  custom?: Record<string, any>;
}

/**
 * Role entity
 */
export interface Role extends WithId, WithTimestamps {
  /** Unique role identifier */
  id: RoleId;
  
  /** Role name */
  name: string;
  
  /** Role description */
  description?: string;
  
  /** Associated organization ID (null for system roles) */
  organizationId?: OrganizationId;
  
  /** Whether this is a system role */
  system: boolean;
  
  /** Role permissions */
  permissions: Permission[];
  
  /** Role color (for UI) */
  color?: string;
  
  /** Role metadata */
  metadata?: Record<string, any>;
  
  /** Role status */
  status: Status;
}

/**
 * Permission entity
 */
export interface Permission extends WithId, WithTimestamps {
  /** Unique permission identifier */
  id: PermissionId;
  
  /** Permission name/key */
  name: string;
  
  /** Permission description */
  description?: string;
  
  /** Permission resource */
  resource: string;
  
  /** Permission action */
  action: string;
  
  /** Permission conditions (for complex permissions) */
  conditions?: Record<string, any>;
  
  /** Whether this is a system permission */
  system: boolean;
  
  /** Permission metadata */
  metadata?: Record<string, any>;
}

/**
 * User role assignment
 */
export interface UserRole extends WithTimestamps {
  /** User ID */
  userId: UserId;
  
  /** Role ID */
  roleId: RoleId;
  
  /** Associated organization ID (if applicable) */
  organizationId?: OrganizationId;
  
  /** When role was assigned */
  assignedAt: Date;
  
  /** Who assigned the role */
  assignedBy?: UserId;
  
  /** When role assignment expires (if applicable) */
  expiresAt?: Date;
  
  /** Role assignment metadata */
  metadata?: Record<string, any>;
}

/**
 * Organization member
 */
export interface OrganizationMember extends WithTimestamps {
  /** User ID */
  userId: UserId;
  
  /** Organization ID */
  organizationId: OrganizationId;
  
  /** Member role within organization */
  role: string;
  
  /** Member status */
  status: 'active' | 'inactive' | 'pending' | 'suspended';
  
  /** When user joined organization */
  joinedAt: Date;
  
  /** Who invited the user */
  invitedBy?: UserId;
  
  /** Additional permissions */
  permissions?: string[];
  
  /** Member metadata */
  metadata?: Record<string, any>;
}

/**
 * Team member
 */
export interface TeamMember extends WithTimestamps {
  /** User ID */
  userId: UserId;
  
  /** Team ID */
  teamId: TeamId;
  
  /** Member role within team */
  role: string;
  
  /** Member status */
  status: 'active' | 'inactive' | 'pending';
  
  /** When user joined team */
  joinedAt: Date;
  
  /** Who added the user to team */
  addedBy?: UserId;
  
  /** Additional permissions */
  permissions?: string[];
  
  /** Member metadata */
  metadata?: Record<string, any>;
}

/**
 * Multi-factor authentication settings
 */
export interface MFASettings {
  /** Whether MFA is enabled */
  enabled: boolean;
  
  /** TOTP settings */
  totp?: {
    enabled: boolean;
    secret?: string;
    backupCodes?: string[];
    verified: boolean;
  };
  
  /** SMS settings */
  sms?: {
    enabled: boolean;
    phoneNumber?: string;
    verified: boolean;
  };
  
  /** Email settings */
  email?: {
    enabled: boolean;
    verified: boolean;
  };
  
  /** WebAuthn/FIDO settings */
  webauthn?: {
    enabled: boolean;
    credentials: WebAuthnCredential[];
  };
  
  /** Recovery codes */
  recoveryCodes?: string[];
  
  /** MFA metadata */
  metadata?: Record<string, any>;
}

/**
 * WebAuthn credential
 */
export interface WebAuthnCredential extends WithId, WithTimestamps {
  /** Credential ID */
  id: string;
  
  /** Associated user ID */
  userId: UserId;
  
  /** Credential public key */
  publicKey: string;
  
  /** Credential counter */
  counter: number;
  
  /** Credential name/label */
  name?: string;
  
  /** Device information */
  device?: DeviceInfo;
  
  /** When credential was last used */
  lastUsedAt?: Date;
  
  /** Whether credential is backup eligible */
  backupEligible?: boolean;
  
  /** Whether credential is backed up */
  backupState?: boolean;
  
  /** Credential metadata */
  metadata?: Record<string, any>;
}

/**
 * Authentication methods
 */
export type AuthMethod = 
  | 'password'
  | 'oauth'
  | 'magic_link'
  | 'otp'
  | 'webauthn'
  | 'sms'
  | 'totp'
  | 'recovery_code';

/**
 * Authentication attempt
 */
export interface AuthAttempt extends WithId, WithTimestamps {
  /** Attempt ID */
  id: string;
  
  /** User ID (if known) */
  userId?: UserId;
  
  /** Email/identifier used */
  identifier?: string;
  
  /** Authentication method used */
  method: AuthMethod;
  
  /** Whether attempt was successful */
  success: boolean;
  
  /** Error code (if failed) */
  errorCode?: string;
  
  /** Error message (if failed) */
  errorMessage?: string;
  
  /** IP address */
  ipAddress?: string;
  
  /** User agent */
  userAgent?: string;
  
  /** Device information */
  device?: DeviceInfo;
  
  /** Location information */
  location?: LocationInfo;
  
  /** Attempt metadata */
  metadata?: Record<string, any>;
}

/**
 * Login/authentication credentials
 */
export interface LoginCredentials {
  /** Email or username */
  identifier: string;
  
  /** Password */
  password: string;
  
  /** Remember me flag */
  remember?: boolean;
  
  /** MFA code (if required) */
  mfaCode?: string;
  
  /** MFA method */
  mfaMethod?: 'totp' | 'sms' | 'email' | 'recovery_code';
  
  /** Additional metadata */
  metadata?: Record<string, any>;
}

/**
 * Registration/signup data
 */
export interface RegisterData {
  /** Email address */
  email: string;
  
  /** Password */
  password: string;
  
  /** Confirm password */
  confirmPassword?: string;
  
  /** Display name */
  name?: string;
  
  /** First name */
  firstName?: string;
  
  /** Last name */
  lastName?: string;
  
  /** Phone number */
  phone?: string;
  
  /** User preferences */
  preferences?: Partial<UserPreferences>;
  
  /** Terms acceptance */
  acceptTerms?: boolean;
  
  /** Marketing consent */
  marketingConsent?: boolean;
  
  /** Additional metadata */
  metadata?: Record<string, any>;
}

/**
 * Password reset request
 */
export interface PasswordResetRequest {
  /** Email address */
  email: string;
  
  /** Additional metadata */
  metadata?: Record<string, any>;
}

/**
 * Password reset confirmation
 */
export interface PasswordResetConfirmation {
  /** Reset token */
  token: string;
  
  /** New password */
  password: string;
  
  /** Confirm new password */
  confirmPassword?: string;
}

/**
 * OAuth provider configuration
 */
export interface OAuthProvider {
  /** Provider ID */
  id: string;
  
  /** Provider name */
  name: string;
  
  /** Provider type */
  type: 'oauth2' | 'oidc';
  
  /** Client ID */
  clientId: string;
  
  /** Client secret */
  clientSecret: string;
  
  /** Authorization URL */
  authorizationUrl: string;
  
  /** Token URL */
  tokenUrl: string;
  
  /** User info URL */
  userInfoUrl?: string;
  
  /** Redirect URI */
  redirectUri: string;
  
  /** Scopes */
  scopes: string[];
  
  /** Provider-specific configuration */
  config?: Record<string, any>;
  
  /** Whether provider is enabled */
  enabled: boolean;
}
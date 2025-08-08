/**
 * API request and response types for CF-Better-Auth
 * Defines all HTTP API interfaces and data transfer objects
 */

import type {
  User,
  Session,
  Account,
  Organization,
  Team,
  Role,
  Permission,
  LoginCredentials,
  RegisterData,
  PasswordResetRequest,
  PasswordResetConfirmation,
  MFASettings,
  UserId,
  SessionId,
  OrganizationId,
  TeamId,
  RoleId
} from './auth';

import type {
  PaginationParams,
  PaginatedResponse,
  SortParams,
  ApiResponse
} from './common';

/**
 * HTTP methods
 */
export type HttpMethod = 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE' | 'HEAD' | 'OPTIONS';

/**
 * HTTP status codes
 */
export type HttpStatusCode = 
  | 200 | 201 | 202 | 204 // Success
  | 400 | 401 | 403 | 404 | 409 | 422 | 429 // Client errors
  | 500 | 502 | 503 | 504; // Server errors

/**
 * Base API request interface
 */
export interface ApiRequest<T = any> {
  /** Request headers */
  headers?: Record<string, string>;
  
  /** Request body */
  body?: T;
  
  /** Query parameters */
  query?: Record<string, string | number | boolean>;
  
  /** URL parameters */
  params?: Record<string, string>;
  
  /** Request metadata */
  metadata?: {
    requestId?: string;
    timestamp?: string;
    userAgent?: string;
    ipAddress?: string;
  };
}

/**
 * Base API response interface
 */
export interface ApiResponseBase<T = any> extends ApiResponse<T> {
  /** HTTP status code */
  statusCode: HttpStatusCode;
  
  /** Response headers */
  headers?: Record<string, string>;
  
  /** Response metadata */
  meta?: {
    timestamp: string;
    requestId?: string;
    version?: string;
    rateLimit?: {
      limit: number;
      remaining: number;
      reset: number;
    };
  };
}

/**
 * Error response interface
 */
export interface ErrorResponse extends ApiResponseBase<null> {
  success: false;
  error: {
    code: string;
    message: string;
    details?: any;
    validation?: ValidationError[];
  };
}

/**
 * Validation error
 */
export interface ValidationError {
  field: string;
  code: string;
  message: string;
  value?: any;
}

/**
 * Success response interface
 */
export interface SuccessResponse<T = any> extends ApiResponseBase<T> {
  success: true;
  data: T;
}

// ============================================================================
// Authentication Endpoints
// ============================================================================

/**
 * POST /auth/login
 */
export namespace LoginEndpoint {
  export interface Request extends ApiRequest<LoginCredentials> {}
  
  export interface Response extends SuccessResponse<{
    user: User;
    session: Session;
    accessToken?: string;
    refreshToken?: string;
    expiresIn?: number;
    mfaRequired?: boolean;
    mfaMethods?: string[];
  }> {}
}

/**
 * POST /auth/register
 */
export namespace RegisterEndpoint {
  export interface Request extends ApiRequest<RegisterData> {}
  
  export interface Response extends SuccessResponse<{
    user: User;
    session?: Session;
    accessToken?: string;
    refreshToken?: string;
    emailVerificationRequired?: boolean;
    phoneVerificationRequired?: boolean;
  }> {}
}

/**
 * POST /auth/logout
 */
export namespace LogoutEndpoint {
  export interface Request extends ApiRequest<{
    sessionId?: SessionId;
    allSessions?: boolean;
  }> {}
  
  export interface Response extends SuccessResponse<{
    message: string;
    sessionsClosed?: number;
  }> {}
}

/**
 * POST /auth/refresh
 */
export namespace RefreshEndpoint {
  export interface Request extends ApiRequest<{
    refreshToken: string;
  }> {}
  
  export interface Response extends SuccessResponse<{
    accessToken: string;
    refreshToken?: string;
    expiresIn: number;
  }> {}
}

/**
 * GET /auth/me
 */
export namespace MeEndpoint {
  export interface Request extends ApiRequest {}
  
  export interface Response extends SuccessResponse<{
    user: User;
    session: Session;
    permissions?: string[];
    roles?: Role[];
  }> {}
}

/**
 * POST /auth/password/forgot
 */
export namespace ForgotPasswordEndpoint {
  export interface Request extends ApiRequest<PasswordResetRequest> {}
  
  export interface Response extends SuccessResponse<{
    message: string;
    emailSent?: boolean;
  }> {}
}

/**
 * POST /auth/password/reset
 */
export namespace ResetPasswordEndpoint {
  export interface Request extends ApiRequest<PasswordResetConfirmation> {}
  
  export interface Response extends SuccessResponse<{
    message: string;
    user?: User;
    session?: Session;
    autoLogin?: boolean;
  }> {}
}

/**
 * POST /auth/verify/email
 */
export namespace VerifyEmailEndpoint {
  export interface Request extends ApiRequest<{
    token: string;
  }> {}
  
  export interface Response extends SuccessResponse<{
    user: User;
    verified: boolean;
  }> {}
}

/**
 * POST /auth/verify/email/resend
 */
export namespace ResendEmailVerificationEndpoint {
  export interface Request extends ApiRequest<{
    email?: string;
  }> {}
  
  export interface Response extends SuccessResponse<{
    message: string;
    emailSent: boolean;
  }> {}
}

/**
 * GET /auth/oauth/{provider}
 */
export namespace OAuthLoginEndpoint {
  export interface Request extends ApiRequest<{
    redirectUrl?: string;
    state?: string;
  }> {}
  
  export interface Response extends SuccessResponse<{
    authUrl: string;
    state: string;
  }> {}
}

/**
 * GET /auth/oauth/{provider}/callback
 */
export namespace OAuthCallbackEndpoint {
  export interface Request extends ApiRequest {
    query: {
      code: string;
      state: string;
      error?: string;
      error_description?: string;
    };
  }
  
  export interface Response extends SuccessResponse<{
    user: User;
    session: Session;
    accessToken?: string;
    refreshToken?: string;
    isNewUser?: boolean;
  }> {}
}

// ============================================================================
// User Management Endpoints
// ============================================================================

/**
 * GET /users
 */
export namespace ListUsersEndpoint {
  export interface Request extends ApiRequest {
    query?: PaginationParams & SortParams & {
      search?: string;
      status?: string;
      role?: string;
      organizationId?: string;
    };
  }
  
  export interface Response extends SuccessResponse<PaginatedResponse<User>> {}
}

/**
 * GET /users/{id}
 */
export namespace GetUserEndpoint {
  export interface Request extends ApiRequest {
    params: {
      id: UserId;
    };
  }
  
  export interface Response extends SuccessResponse<User> {}
}

/**
 * PATCH /users/{id}
 */
export namespace UpdateUserEndpoint {
  export interface Request extends ApiRequest<Partial<User>> {
    params: {
      id: UserId;
    };
  }
  
  export interface Response extends SuccessResponse<User> {}
}

/**
 * DELETE /users/{id}
 */
export namespace DeleteUserEndpoint {
  export interface Request extends ApiRequest {
    params: {
      id: UserId;
    };
  }
  
  export interface Response extends SuccessResponse<{
    message: string;
    deletedUserId: UserId;
  }> {}
}

/**
 * GET /users/{id}/sessions
 */
export namespace ListUserSessionsEndpoint {
  export interface Request extends ApiRequest {
    params: {
      id: UserId;
    };
    query?: PaginationParams;
  }
  
  export interface Response extends SuccessResponse<PaginatedResponse<Session>> {}
}

/**
 * DELETE /users/{id}/sessions/{sessionId}
 */
export namespace RevokeUserSessionEndpoint {
  export interface Request extends ApiRequest {
    params: {
      id: UserId;
      sessionId: SessionId;
    };
  }
  
  export interface Response extends SuccessResponse<{
    message: string;
    revokedSessionId: SessionId;
  }> {}
}

// ============================================================================
// Organization Management Endpoints
// ============================================================================

/**
 * GET /organizations
 */
export namespace ListOrganizationsEndpoint {
  export interface Request extends ApiRequest {
    query?: PaginationParams & SortParams & {
      search?: string;
      status?: string;
    };
  }
  
  export interface Response extends SuccessResponse<PaginatedResponse<Organization>> {}
}

/**
 * POST /organizations
 */
export namespace CreateOrganizationEndpoint {
  export interface Request extends ApiRequest<Omit<Organization, 'id' | 'createdAt' | 'updatedAt'>> {}
  
  export interface Response extends SuccessResponse<Organization> {}
}

/**
 * GET /organizations/{id}
 */
export namespace GetOrganizationEndpoint {
  export interface Request extends ApiRequest {
    params: {
      id: OrganizationId;
    };
  }
  
  export interface Response extends SuccessResponse<Organization> {}
}

/**
 * PATCH /organizations/{id}
 */
export namespace UpdateOrganizationEndpoint {
  export interface Request extends ApiRequest<Partial<Organization>> {
    params: {
      id: OrganizationId;
    };
  }
  
  export interface Response extends SuccessResponse<Organization> {}
}

/**
 * DELETE /organizations/{id}
 */
export namespace DeleteOrganizationEndpoint {
  export interface Request extends ApiRequest {
    params: {
      id: OrganizationId;
    };
  }
  
  export interface Response extends SuccessResponse<{
    message: string;
    deletedOrganizationId: OrganizationId;
  }> {}
}

/**
 * GET /organizations/{id}/members
 */
export namespace ListOrganizationMembersEndpoint {
  export interface Request extends ApiRequest {
    params: {
      id: OrganizationId;
    };
    query?: PaginationParams & SortParams & {
      role?: string;
      status?: string;
    };
  }
  
  export interface Response extends SuccessResponse<PaginatedResponse<User & {
    organizationRole: string;
    organizationStatus: string;
    joinedAt: Date;
  }>> {}
}

/**
 * POST /organizations/{id}/members
 */
export namespace AddOrganizationMemberEndpoint {
  export interface Request extends ApiRequest<{
    userId?: UserId;
    email?: string;
    role: string;
    permissions?: string[];
  }> {
    params: {
      id: OrganizationId;
    };
  }
  
  export interface Response extends SuccessResponse<{
    message: string;
    member: User;
    invited?: boolean;
  }> {}
}

/**
 * PATCH /organizations/{id}/members/{userId}
 */
export namespace UpdateOrganizationMemberEndpoint {
  export interface Request extends ApiRequest<{
    role?: string;
    permissions?: string[];
    status?: string;
  }> {
    params: {
      id: OrganizationId;
      userId: UserId;
    };
  }
  
  export interface Response extends SuccessResponse<{
    message: string;
    member: User;
  }> {}
}

/**
 * DELETE /organizations/{id}/members/{userId}
 */
export namespace RemoveOrganizationMemberEndpoint {
  export interface Request extends ApiRequest {
    params: {
      id: OrganizationId;
      userId: UserId;
    };
  }
  
  export interface Response extends SuccessResponse<{
    message: string;
    removedUserId: UserId;
  }> {}
}

// ============================================================================
// Team Management Endpoints
// ============================================================================

/**
 * GET /teams
 */
export namespace ListTeamsEndpoint {
  export interface Request extends ApiRequest {
    query?: PaginationParams & SortParams & {
      organizationId?: OrganizationId;
      search?: string;
      status?: string;
    };
  }
  
  export interface Response extends SuccessResponse<PaginatedResponse<Team>> {}
}

/**
 * POST /teams
 */
export namespace CreateTeamEndpoint {
  export interface Request extends ApiRequest<Omit<Team, 'id' | 'createdAt' | 'updatedAt'>> {}
  
  export interface Response extends SuccessResponse<Team> {}
}

/**
 * GET /teams/{id}
 */
export namespace GetTeamEndpoint {
  export interface Request extends ApiRequest {
    params: {
      id: TeamId;
    };
  }
  
  export interface Response extends SuccessResponse<Team> {}
}

/**
 * PATCH /teams/{id}
 */
export namespace UpdateTeamEndpoint {
  export interface Request extends ApiRequest<Partial<Team>> {
    params: {
      id: TeamId;
    };
  }
  
  export interface Response extends SuccessResponse<Team> {}
}

/**
 * DELETE /teams/{id}
 */
export namespace DeleteTeamEndpoint {
  export interface Request extends ApiRequest {
    params: {
      id: TeamId;
    };
  }
  
  export interface Response extends SuccessResponse<{
    message: string;
    deletedTeamId: TeamId;
  }> {}
}

// ============================================================================
// Role and Permission Endpoints
// ============================================================================

/**
 * GET /roles
 */
export namespace ListRolesEndpoint {
  export interface Request extends ApiRequest {
    query?: PaginationParams & SortParams & {
      organizationId?: OrganizationId;
      system?: boolean;
    };
  }
  
  export interface Response extends SuccessResponse<PaginatedResponse<Role>> {}
}

/**
 * POST /roles
 */
export namespace CreateRoleEndpoint {
  export interface Request extends ApiRequest<Omit<Role, 'id' | 'createdAt' | 'updatedAt'>> {}
  
  export interface Response extends SuccessResponse<Role> {}
}

/**
 * GET /roles/{id}
 */
export namespace GetRoleEndpoint {
  export interface Request extends ApiRequest {
    params: {
      id: RoleId;
    };
  }
  
  export interface Response extends SuccessResponse<Role> {}
}

/**
 * PATCH /roles/{id}
 */
export namespace UpdateRoleEndpoint {
  export interface Request extends ApiRequest<Partial<Role>> {
    params: {
      id: RoleId;
    };
  }
  
  export interface Response extends SuccessResponse<Role> {}
}

/**
 * DELETE /roles/{id}
 */
export namespace DeleteRoleEndpoint {
  export interface Request extends ApiRequest {
    params: {
      id: RoleId;
    };
  }
  
  export interface Response extends SuccessResponse<{
    message: string;
    deletedRoleId: RoleId;
  }> {}
}

/**
 * GET /permissions
 */
export namespace ListPermissionsEndpoint {
  export interface Request extends ApiRequest {
    query?: PaginationParams & SortParams & {
      resource?: string;
      action?: string;
      system?: boolean;
    };
  }
  
  export interface Response extends SuccessResponse<PaginatedResponse<Permission>> {}
}

// ============================================================================
// MFA Endpoints
// ============================================================================

/**
 * GET /auth/mfa/status
 */
export namespace GetMFAStatusEndpoint {
  export interface Request extends ApiRequest {}
  
  export interface Response extends SuccessResponse<MFASettings> {}
}

/**
 * POST /auth/mfa/totp/setup
 */
export namespace SetupTOTPEndpoint {
  export interface Request extends ApiRequest {}
  
  export interface Response extends SuccessResponse<{
    secret: string;
    qrCode: string;
    backupCodes: string[];
  }> {}
}

/**
 * POST /auth/mfa/totp/verify
 */
export namespace VerifyTOTPEndpoint {
  export interface Request extends ApiRequest<{
    code: string;
  }> {}
  
  export interface Response extends SuccessResponse<{
    verified: boolean;
    backupCodes?: string[];
  }> {}
}

/**
 * POST /auth/mfa/totp/disable
 */
export namespace DisableTOTPEndpoint {
  export interface Request extends ApiRequest<{
    password?: string;
    code?: string;
  }> {}
  
  export interface Response extends SuccessResponse<{
    message: string;
  }> {}
}

// ============================================================================
// WebSocket API Types
// ============================================================================

/**
 * WebSocket message types
 */
export type WebSocketMessageType = 
  | 'auth'
  | 'subscribe'
  | 'unsubscribe'
  | 'event'
  | 'error'
  | 'heartbeat'
  | 'notification';

/**
 * Base WebSocket message
 */
export interface WebSocketMessage<T = any> {
  id?: string;
  type: WebSocketMessageType;
  timestamp: string;
  data?: T;
}

/**
 * WebSocket authentication message
 */
export interface WebSocketAuthMessage extends WebSocketMessage<{
  token: string;
}> {
  type: 'auth';
}

/**
 * WebSocket subscription message
 */
export interface WebSocketSubscribeMessage extends WebSocketMessage<{
  channel: string;
  params?: Record<string, any>;
}> {
  type: 'subscribe' | 'unsubscribe';
}

/**
 * WebSocket event message
 */
export interface WebSocketEventMessage extends WebSocketMessage<{
  event: string;
  payload: any;
  channel?: string;
}> {
  type: 'event';
}

/**
 * WebSocket error message
 */
export interface WebSocketErrorMessage extends WebSocketMessage<{
  code: string;
  message: string;
  details?: any;
}> {
  type: 'error';
}

/**
 * WebSocket notification message
 */
export interface WebSocketNotificationMessage extends WebSocketMessage<{
  title: string;
  message?: string;
  type: string;
  data?: any;
}> {
  type: 'notification';
}

// ============================================================================
// Webhook Types
// ============================================================================

/**
 * Webhook event types
 */
export type WebhookEventType = 
  | 'user.created'
  | 'user.updated'
  | 'user.deleted'
  | 'user.login'
  | 'user.logout'
  | 'session.created'
  | 'session.expired'
  | 'session.revoked'
  | 'organization.created'
  | 'organization.updated'
  | 'organization.deleted'
  | 'team.created'
  | 'team.updated'
  | 'team.deleted'
  | 'role.created'
  | 'role.updated'
  | 'role.deleted';

/**
 * Webhook payload
 */
export interface WebhookPayload<T = any> {
  id: string;
  event: WebhookEventType;
  timestamp: string;
  data: T;
  organizationId?: OrganizationId;
  userId?: UserId;
  metadata?: Record<string, any>;
}

/**
 * Webhook configuration
 */
export interface WebhookConfig {
  id: string;
  url: string;
  events: WebhookEventType[];
  secret?: string;
  headers?: Record<string, string>;
  active: boolean;
  organizationId?: OrganizationId;
  createdAt: Date;
  updatedAt: Date;
}

/**
 * Webhook delivery
 */
export interface WebhookDelivery {
  id: string;
  webhookId: string;
  payload: WebhookPayload;
  status: 'pending' | 'success' | 'failed' | 'retrying';
  attempts: number;
  maxAttempts: number;
  nextRetryAt?: Date;
  response?: {
    statusCode: number;
    headers: Record<string, string>;
    body?: string;
  };
  error?: string;
  createdAt: Date;
  updatedAt: Date;
}
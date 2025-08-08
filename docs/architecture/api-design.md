# CF-Better-Auth API Design Documentation

## Table of Contents

1. [API Overview](#api-overview)
2. [Authentication Endpoints](#authentication-endpoints)
3. [OAuth Endpoints](#oauth-endpoints)
4. [User Management Endpoints](#user-management-endpoints)
5. [Organization Endpoints](#organization-endpoints)
6. [Team Endpoints](#team-endpoints)
7. [Session Management Endpoints](#session-management-endpoints)
8. [API Key Endpoints](#api-key-endpoints)
9. [Admin Endpoints](#admin-endpoints)
10. [GraphQL Schema](#graphql-schema)
11. [WebSocket Events](#websocket-events)
12. [API Response Formats](#api-response-formats)
13. [Authentication & Authorization](#authentication--authorization)
14. [API Best Practices](#api-best-practices)

---

## API Overview

CF-Better-Auth provides a comprehensive authentication and authorization API built on RESTful principles, complemented by GraphQL subscriptions and WebSocket events for real-time functionality.

### RESTful API Principles

- **Resource-based URLs**: All endpoints follow REST conventions with clear resource hierarchies
- **HTTP methods**: Proper use of GET, POST, PUT, DELETE for different operations
- **Status codes**: Standard HTTP status codes for consistent response handling
- **Stateless**: Each request contains all necessary information
- **HATEOAS**: Hypermedia as the Engine of Application State for resource navigation

### GraphQL Schema Design

GraphQL endpoint available at `/api/graphql` for complex queries and real-time subscriptions:

- **Single endpoint**: All GraphQL operations through one endpoint
- **Type-safe**: Full TypeScript integration with schema-first approach
- **Real-time subscriptions**: Live updates for sessions, organizations, and security events
- **Query optimization**: Resolver-level optimization and N+1 query prevention

### WebSocket Events Architecture

WebSocket connection at `/api/ws` for real-time events:

- **Authenticated connections**: JWT-based WebSocket authentication
- **Event namespacing**: Organized event categories (session, org, security)
- **Selective subscriptions**: Subscribe only to relevant event types
- **Connection management**: Automatic reconnection and heartbeat

### API Versioning Strategy

- **URL versioning**: `/api/v1/auth/*` for version-specific endpoints
- **Header versioning**: `Accept: application/vnd.cf-auth.v1+json` for fine-grained control
- **Backward compatibility**: Minimum 12-month support for previous versions
- **Deprecation headers**: Clear migration guidance in response headers

---

## Authentication Endpoints

All authentication endpoints are prefixed with `/api/auth` and follow RESTful conventions.

### POST /api/auth/register

Register a new user account.

**Authentication**: None required  
**Rate limit**: 5 requests per minute per IP

#### Request Body

```json
{
  "email": "user@example.com",
  "password": "securePassword123",
  "name": "John Doe",
  "username": "johndoe" // optional
}
```

#### Response

**Status**: `201 Created`

```json
{
  "success": true,
  "data": {
    "user": {
      "id": "usr_1234567890abcdef",
      "email": "user@example.com",
      "name": "John Doe",
      "username": "johndoe",
      "emailVerified": false,
      "createdAt": "2024-01-15T10:30:00Z",
      "updatedAt": "2024-01-15T10:30:00Z"
    },
    "session": {
      "id": "sess_abcdef1234567890",
      "expiresAt": "2024-01-22T10:30:00Z",
      "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
    }
  },
  "message": "Account created successfully. Please verify your email."
}
```

#### Error Responses

**Status**: `400 Bad Request`

```json
{
  "success": false,
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "Invalid input data",
    "details": {
      "email": "Email already exists",
      "password": "Password must be at least 8 characters"
    }
  }
}
```

---

### POST /api/auth/login

Authenticate user and create session.

**Authentication**: None required  
**Rate limit**: 10 requests per minute per IP

#### Request Body

```json
{
  "email": "user@example.com",
  "password": "securePassword123",
  "rememberMe": true // optional, extends session duration
}
```

#### Response

**Status**: `200 OK`

```json
{
  "success": true,
  "data": {
    "user": {
      "id": "usr_1234567890abcdef",
      "email": "user@example.com",
      "name": "John Doe",
      "username": "johndoe",
      "emailVerified": true,
      "role": "user",
      "createdAt": "2024-01-15T10:30:00Z"
    },
    "session": {
      "id": "sess_abcdef1234567890",
      "expiresAt": "2024-01-22T10:30:00Z",
      "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
    },
    "twoFactorRequired": false
  }
}
```

#### MFA Required Response

**Status**: `200 OK`

```json
{
  "success": true,
  "data": {
    "twoFactorRequired": true,
    "methods": ["totp", "sms"],
    "sessionId": "sess_temp_1234567890"
  },
  "message": "Two-factor authentication required"
}
```

---

### POST /api/auth/logout

End the current session.

**Authentication**: Bearer token required  
**Rate limit**: 20 requests per minute

#### Request Body

```json
{
  "logoutAll": false // optional, logout from all devices
}
```

#### Response

**Status**: `200 OK`

```json
{
  "success": true,
  "message": "Logged out successfully"
}
```

---

### POST /api/auth/refresh

Refresh the authentication token.

**Authentication**: Refresh token required  
**Rate limit**: 30 requests per minute

#### Request Body

```json
{
  "refreshToken": "rt_abcdef1234567890"
}
```

#### Response

**Status**: `200 OK`

```json
{
  "success": true,
  "data": {
    "accessToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
    "refreshToken": "rt_newtoken1234567890",
    "expiresAt": "2024-01-22T10:30:00Z"
  }
}
```

---

### POST /api/auth/verify-email

Verify user's email address.

**Authentication**: None required  
**Rate limit**: 10 requests per minute per IP

#### Request Body

```json
{
  "token": "email_verify_token_123456",
  "email": "user@example.com"
}
```

#### Response

**Status**: `200 OK`

```json
{
  "success": true,
  "data": {
    "user": {
      "id": "usr_1234567890abcdef",
      "emailVerified": true
    }
  },
  "message": "Email verified successfully"
}
```

---

### POST /api/auth/forgot-password

Request password reset.

**Authentication**: None required  
**Rate limit**: 3 requests per minute per IP

#### Request Body

```json
{
  "email": "user@example.com"
}
```

#### Response

**Status**: `200 OK`

```json
{
  "success": true,
  "message": "Password reset email sent if account exists"
}
```

---

### POST /api/auth/reset-password

Reset password using token.

**Authentication**: None required  
**Rate limit**: 5 requests per minute per IP

#### Request Body

```json
{
  "token": "password_reset_token_123456",
  "password": "newSecurePassword123",
  "confirmPassword": "newSecurePassword123"
}
```

#### Response

**Status**: `200 OK`

```json
{
  "success": true,
  "message": "Password reset successfully"
}
```

---

### POST /api/auth/change-password

Change password for authenticated user.

**Authentication**: Bearer token required  
**Rate limit**: 5 requests per minute

#### Request Body

```json
{
  "currentPassword": "currentPassword123",
  "newPassword": "newSecurePassword123",
  "confirmPassword": "newSecurePassword123"
}
```

#### Response

**Status**: `200 OK`

```json
{
  "success": true,
  "message": "Password changed successfully"
}
```

---

### GET /api/auth/me

Get current user information.

**Authentication**: Bearer token required  
**Rate limit**: 100 requests per minute

#### Response

**Status**: `200 OK`

```json
{
  "success": true,
  "data": {
    "user": {
      "id": "usr_1234567890abcdef",
      "email": "user@example.com",
      "name": "John Doe",
      "username": "johndoe",
      "emailVerified": true,
      "role": "user",
      "phoneNumber": "+1234567890",
      "twoFactorEnabled": true,
      "createdAt": "2024-01-15T10:30:00Z",
      "updatedAt": "2024-01-20T14:22:00Z"
    },
    "session": {
      "id": "sess_abcdef1234567890",
      "expiresAt": "2024-01-22T10:30:00Z",
      "lastActiveAt": "2024-01-20T14:22:00Z"
    },
    "organizations": [
      {
        "id": "org_1234567890abcdef",
        "name": "Acme Corp",
        "role": "admin"
      }
    ]
  }
}
```

---

### POST /api/auth/mfa/enable

Enable multi-factor authentication.

**Authentication**: Bearer token required  
**Rate limit**: 10 requests per minute

#### Request Body

```json
{
  "method": "totp", // or "sms"
  "phoneNumber": "+1234567890" // required for SMS
}
```

#### Response

**Status**: `200 OK`

```json
{
  "success": true,
  "data": {
    "method": "totp",
    "qrCode": "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAA...",
    "secret": "JBSWY3DPEHPK3PXP",
    "backupCodes": [
      "12345678",
      "87654321",
      "11223344"
    ]
  },
  "message": "MFA setup initiated. Please verify to complete setup."
}
```

---

### POST /api/auth/mfa/verify

Verify and complete MFA setup or authenticate with MFA.

**Authentication**: Bearer token required  
**Rate limit**: 20 requests per minute

#### Request Body

```json
{
  "code": "123456",
  "method": "totp", // or "sms" or "backup"
  "sessionId": "sess_temp_1234567890" // for MFA during login
}
```

#### Response

**Status**: `200 OK`

```json
{
  "success": true,
  "data": {
    "verified": true,
    "session": {
      "id": "sess_abcdef1234567890",
      "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
      "expiresAt": "2024-01-22T10:30:00Z"
    }
  },
  "message": "MFA verified successfully"
}
```

---

### POST /api/auth/mfa/disable

Disable multi-factor authentication.

**Authentication**: Bearer token required  
**Rate limit**: 5 requests per minute

#### Request Body

```json
{
  "password": "currentPassword123",
  "code": "123456" // current MFA code
}
```

#### Response

**Status**: `200 OK`

```json
{
  "success": true,
  "message": "MFA disabled successfully"
}
```

---

## OAuth Endpoints

OAuth endpoints handle third-party authentication providers.

### GET /api/auth/oauth/:provider

Initiate OAuth flow with supported provider.

**Supported providers**: google, github, discord, facebook, apple, custom

**Authentication**: None required  
**Rate limit**: 10 requests per minute per IP

#### Parameters

- `provider`: OAuth provider name
- `redirectTo`: Optional redirect URL after authentication

#### Response

**Status**: `302 Found`
**Location**: Provider's authorization URL

---

### GET /api/auth/oauth/:provider/callback

OAuth callback endpoint.

**Authentication**: None required  
**Rate limit**: 20 requests per minute per IP

#### Query Parameters

- `code`: Authorization code from provider
- `state`: State parameter for CSRF protection

#### Response

**Status**: `302 Found`
**Location**: Success redirect URL with session token

```json
{
  "success": true,
  "data": {
    "user": {
      "id": "usr_1234567890abcdef",
      "email": "user@example.com",
      "name": "John Doe",
      "provider": "google",
      "providerId": "google_123456789"
    },
    "session": {
      "id": "sess_abcdef1234567890",
      "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
      "expiresAt": "2024-01-22T10:30:00Z"
    },
    "isNewUser": false
  }
}
```

---

### POST /api/auth/oauth/unlink

Unlink OAuth provider from account.

**Authentication**: Bearer token required  
**Rate limit**: 10 requests per minute

#### Request Body

```json
{
  "provider": "google",
  "password": "currentPassword123" // required if no other auth method
}
```

#### Response

**Status**: `200 OK`

```json
{
  "success": true,
  "message": "OAuth provider unlinked successfully"
}
```

---

## User Management Endpoints

User management endpoints for administrative operations.

### GET /api/users

List users (admin only).

**Authentication**: Bearer token with admin role  
**Rate limit**: 100 requests per minute

#### Query Parameters

- `page`: Page number (default: 1)
- `limit`: Results per page (default: 20, max: 100)
- `search`: Search by name, email, or username
- `role`: Filter by role
- `status`: Filter by status (active, suspended, pending)
- `sort`: Sort field (createdAt, name, email)
- `order`: Sort order (asc, desc)

#### Response

**Status**: `200 OK`

```json
{
  "success": true,
  "data": {
    "users": [
      {
        "id": "usr_1234567890abcdef",
        "email": "user@example.com",
        "name": "John Doe",
        "username": "johndoe",
        "role": "user",
        "status": "active",
        "emailVerified": true,
        "lastLoginAt": "2024-01-20T10:30:00Z",
        "createdAt": "2024-01-15T10:30:00Z"
      }
    ],
    "pagination": {
      "page": 1,
      "limit": 20,
      "total": 150,
      "pages": 8
    }
  }
}
```

---

### GET /api/users/:id

Get specific user details.

**Authentication**: Bearer token (own profile) or admin role  
**Rate limit**: 200 requests per minute

#### Response

**Status**: `200 OK`

```json
{
  "success": true,
  "data": {
    "user": {
      "id": "usr_1234567890abcdef",
      "email": "user@example.com",
      "name": "John Doe",
      "username": "johndoe",
      "role": "user",
      "status": "active",
      "emailVerified": true,
      "phoneNumber": "+1234567890",
      "twoFactorEnabled": true,
      "lastLoginAt": "2024-01-20T10:30:00Z",
      "createdAt": "2024-01-15T10:30:00Z",
      "updatedAt": "2024-01-20T14:22:00Z",
      "organizations": [
        {
          "id": "org_1234567890abcdef",
          "name": "Acme Corp",
          "role": "member"
        }
      ],
      "sessions": [
        {
          "id": "sess_abcdef1234567890",
          "device": "Chrome on macOS",
          "lastActiveAt": "2024-01-20T14:22:00Z",
          "current": true
        }
      ]
    }
  }
}
```

---

### PUT /api/users/:id

Update user information.

**Authentication**: Bearer token (own profile) or admin role  
**Rate limit**: 50 requests per minute

#### Request Body

```json
{
  "name": "Jane Doe",
  "username": "janedoe",
  "phoneNumber": "+1234567890",
  "role": "admin" // admin only
}
```

#### Response

**Status**: `200 OK`

```json
{
  "success": true,
  "data": {
    "user": {
      "id": "usr_1234567890abcdef",
      "name": "Jane Doe",
      "username": "janedoe",
      "updatedAt": "2024-01-20T15:30:00Z"
    }
  },
  "message": "User updated successfully"
}
```

---

### DELETE /api/users/:id

Delete user account.

**Authentication**: Bearer token (own account) or admin role  
**Rate limit**: 10 requests per minute

#### Request Body

```json
{
  "password": "currentPassword123", // required for own account
  "confirmation": "DELETE" // required
}
```

#### Response

**Status**: `200 OK`

```json
{
  "success": true,
  "message": "User account deleted successfully"
}
```

---

### GET /api/users/:id/sessions

Get user's active sessions.

**Authentication**: Bearer token (own sessions) or admin role  
**Rate limit**: 100 requests per minute

#### Response

**Status**: `200 OK`

```json
{
  "success": true,
  "data": {
    "sessions": [
      {
        "id": "sess_abcdef1234567890",
        "device": "Chrome on macOS",
        "ipAddress": "192.168.1.100",
        "userAgent": "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7)...",
        "createdAt": "2024-01-20T10:30:00Z",
        "lastActiveAt": "2024-01-20T14:22:00Z",
        "expiresAt": "2024-01-27T10:30:00Z",
        "current": true
      }
    ]
  }
}
```

---

### POST /api/users/:id/suspend

Suspend user account (admin only).

**Authentication**: Bearer token with admin role  
**Rate limit**: 20 requests per minute

#### Request Body

```json
{
  "reason": "Violation of terms of service",
  "duration": 7 // days, null for indefinite
}
```

#### Response

**Status**: `200 OK`

```json
{
  "success": true,
  "data": {
    "user": {
      "id": "usr_1234567890abcdef",
      "status": "suspended",
      "suspendedUntil": "2024-01-27T10:30:00Z"
    }
  },
  "message": "User suspended successfully"
}
```

---

### POST /api/users/:id/activate

Activate suspended user account (admin only).

**Authentication**: Bearer token with admin role  
**Rate limit**: 20 requests per minute

#### Response

**Status**: `200 OK`

```json
{
  "success": true,
  "data": {
    "user": {
      "id": "usr_1234567890abcdef",
      "status": "active",
      "suspendedUntil": null
    }
  },
  "message": "User activated successfully"
}
```

---

## Organization Endpoints

Organization endpoints for multi-tenant functionality.

### GET /api/organizations

List user's organizations.

**Authentication**: Bearer token required  
**Rate limit**: 100 requests per minute

#### Query Parameters

- `role`: Filter by user's role in organization
- `page`: Page number (default: 1)
- `limit`: Results per page (default: 20, max: 50)

#### Response

**Status**: `200 OK`

```json
{
  "success": true,
  "data": {
    "organizations": [
      {
        "id": "org_1234567890abcdef",
        "name": "Acme Corp",
        "slug": "acme-corp",
        "description": "Leading software company",
        "role": "admin",
        "memberCount": 25,
        "teamCount": 5,
        "createdAt": "2024-01-10T10:30:00Z"
      }
    ],
    "pagination": {
      "page": 1,
      "limit": 20,
      "total": 3,
      "pages": 1
    }
  }
}
```

---

### POST /api/organizations

Create new organization.

**Authentication**: Bearer token required  
**Rate limit**: 5 requests per minute

#### Request Body

```json
{
  "name": "New Corp",
  "slug": "new-corp", // optional, auto-generated
  "description": "A new company"
}
```

#### Response

**Status**: `201 Created`

```json
{
  "success": true,
  "data": {
    "organization": {
      "id": "org_abcdef1234567890",
      "name": "New Corp",
      "slug": "new-corp",
      "description": "A new company",
      "role": "owner",
      "memberCount": 1,
      "teamCount": 0,
      "createdAt": "2024-01-20T15:30:00Z"
    }
  },
  "message": "Organization created successfully"
}
```

---

### GET /api/organizations/:id

Get organization details.

**Authentication**: Bearer token (organization member)  
**Rate limit**: 200 requests per minute

#### Response

**Status**: `200 OK`

```json
{
  "success": true,
  "data": {
    "organization": {
      "id": "org_1234567890abcdef",
      "name": "Acme Corp",
      "slug": "acme-corp",
      "description": "Leading software company",
      "role": "admin",
      "memberCount": 25,
      "teamCount": 5,
      "settings": {
        "allowPublicInvites": false,
        "requireEmailVerification": true
      },
      "createdAt": "2024-01-10T10:30:00Z",
      "updatedAt": "2024-01-15T14:20:00Z"
    }
  }
}
```

---

### PUT /api/organizations/:id

Update organization.

**Authentication**: Bearer token (admin/owner role)  
**Rate limit**: 50 requests per minute

#### Request Body

```json
{
  "name": "Acme Corporation",
  "description": "Updated description",
  "settings": {
    "allowPublicInvites": true,
    "requireEmailVerification": false
  }
}
```

#### Response

**Status**: `200 OK`

```json
{
  "success": true,
  "data": {
    "organization": {
      "id": "org_1234567890abcdef",
      "name": "Acme Corporation",
      "description": "Updated description",
      "updatedAt": "2024-01-20T16:00:00Z"
    }
  },
  "message": "Organization updated successfully"
}
```

---

### DELETE /api/organizations/:id

Delete organization.

**Authentication**: Bearer token (owner role)  
**Rate limit**: 10 requests per minute

#### Request Body

```json
{
  "confirmation": "DELETE",
  "transferOwnership": "usr_newowner123456" // optional
}
```

#### Response

**Status**: `200 OK`

```json
{
  "success": true,
  "message": "Organization deleted successfully"
}
```

---

### GET /api/organizations/:id/members

List organization members.

**Authentication**: Bearer token (organization member)  
**Rate limit**: 100 requests per minute

#### Query Parameters

- `role`: Filter by role
- `page`: Page number (default: 1)
- `limit`: Results per page (default: 20, max: 100)
- `search`: Search by name or email

#### Response

**Status**: `200 OK`

```json
{
  "success": true,
  "data": {
    "members": [
      {
        "id": "usr_1234567890abcdef",
        "name": "John Doe",
        "email": "john@example.com",
        "role": "admin",
        "status": "active",
        "joinedAt": "2024-01-10T10:30:00Z",
        "lastActiveAt": "2024-01-20T14:22:00Z"
      }
    ],
    "pagination": {
      "page": 1,
      "limit": 20,
      "total": 25,
      "pages": 2
    }
  }
}
```

---

### POST /api/organizations/:id/members

Add member to organization.

**Authentication**: Bearer token (admin/owner role)  
**Rate limit**: 20 requests per minute

#### Request Body

```json
{
  "email": "newmember@example.com",
  "role": "member", // member, admin
  "teamIds": ["team_1234567890abcdef"] // optional
}
```

#### Response

**Status**: `201 Created`

```json
{
  "success": true,
  "data": {
    "member": {
      "id": "usr_newmember123456",
      "email": "newmember@example.com",
      "role": "member",
      "status": "invited",
      "invitedAt": "2024-01-20T16:30:00Z"
    }
  },
  "message": "Member invited successfully"
}
```

---

### PUT /api/organizations/:id/members/:userId

Update member role.

**Authentication**: Bearer token (admin/owner role)  
**Rate limit**: 50 requests per minute

#### Request Body

```json
{
  "role": "admin"
}
```

#### Response

**Status**: `200 OK`

```json
{
  "success": true,
  "data": {
    "member": {
      "id": "usr_1234567890abcdef",
      "role": "admin",
      "updatedAt": "2024-01-20T16:45:00Z"
    }
  },
  "message": "Member role updated successfully"
}
```

---

### DELETE /api/organizations/:id/members/:userId

Remove member from organization.

**Authentication**: Bearer token (admin/owner role, or own membership)  
**Rate limit**: 20 requests per minute

#### Response

**Status**: `200 OK`

```json
{
  "success": true,
  "message": "Member removed successfully"
}
```

---

### POST /api/organizations/:id/invitations

Create invitation to join organization.

**Authentication**: Bearer token (admin/owner role)  
**Rate limit**: 10 requests per minute

#### Request Body

```json
{
  "email": "invited@example.com",
  "role": "member",
  "message": "Welcome to our organization!",
  "expiresIn": 7 // days, default 7
}
```

#### Response

**Status**: `201 Created`

```json
{
  "success": true,
  "data": {
    "invitation": {
      "id": "inv_1234567890abcdef",
      "email": "invited@example.com",
      "role": "member",
      "status": "pending",
      "expiresAt": "2024-01-27T16:30:00Z",
      "inviteUrl": "https://app.example.com/invite/inv_1234567890abcdef"
    }
  },
  "message": "Invitation sent successfully"
}
```

---

## Team Endpoints

Team endpoints for organization sub-groups.

### GET /api/organizations/:orgId/teams

List organization teams.

**Authentication**: Bearer token (organization member)  
**Rate limit**: 100 requests per minute

#### Query Parameters

- `page`: Page number (default: 1)
- `limit`: Results per page (default: 20, max: 50)
- `search`: Search by team name

#### Response

**Status**: `200 OK`

```json
{
  "success": true,
  "data": {
    "teams": [
      {
        "id": "team_1234567890abcdef",
        "name": "Engineering",
        "description": "Product development team",
        "memberCount": 12,
        "role": "member",
        "createdAt": "2024-01-12T10:30:00Z"
      }
    ],
    "pagination": {
      "page": 1,
      "limit": 20,
      "total": 5,
      "pages": 1
    }
  }
}
```

---

### POST /api/organizations/:orgId/teams

Create new team.

**Authentication**: Bearer token (admin/owner role)  
**Rate limit**: 10 requests per minute

#### Request Body

```json
{
  "name": "Marketing",
  "description": "Marketing and communications team"
}
```

#### Response

**Status**: `201 Created`

```json
{
  "success": true,
  "data": {
    "team": {
      "id": "team_abcdef1234567890",
      "name": "Marketing",
      "description": "Marketing and communications team",
      "memberCount": 1,
      "role": "admin",
      "createdAt": "2024-01-20T17:00:00Z"
    }
  },
  "message": "Team created successfully"
}
```

---

### GET /api/teams/:id

Get team details.

**Authentication**: Bearer token (team member or org admin)  
**Rate limit**: 200 requests per minute

#### Response

**Status**: `200 OK`

```json
{
  "success": true,
  "data": {
    "team": {
      "id": "team_1234567890abcdef",
      "name": "Engineering",
      "description": "Product development team",
      "organizationId": "org_1234567890abcdef",
      "memberCount": 12,
      "role": "member",
      "createdAt": "2024-01-12T10:30:00Z",
      "updatedAt": "2024-01-18T14:20:00Z"
    }
  }
}
```

---

### PUT /api/teams/:id

Update team.

**Authentication**: Bearer token (team admin or org admin)  
**Rate limit**: 50 requests per minute

#### Request Body

```json
{
  "name": "Product Engineering",
  "description": "Updated team description"
}
```

#### Response

**Status**: `200 OK`

```json
{
  "success": true,
  "data": {
    "team": {
      "id": "team_1234567890abcdef",
      "name": "Product Engineering",
      "description": "Updated team description",
      "updatedAt": "2024-01-20T17:15:00Z"
    }
  },
  "message": "Team updated successfully"
}
```

---

### DELETE /api/teams/:id

Delete team.

**Authentication**: Bearer token (org admin/owner)  
**Rate limit**: 10 requests per minute

#### Request Body

```json
{
  "confirmation": "DELETE"
}
```

#### Response

**Status**: `200 OK`

```json
{
  "success": true,
  "message": "Team deleted successfully"
}
```

---

### GET /api/teams/:id/members

List team members.

**Authentication**: Bearer token (team member or org admin)  
**Rate limit**: 100 requests per minute

#### Query Parameters

- `page`: Page number (default: 1)
- `limit`: Results per page (default: 20, max: 100)
- `role`: Filter by team role

#### Response

**Status**: `200 OK`

```json
{
  "success": true,
  "data": {
    "members": [
      {
        "id": "usr_1234567890abcdef",
        "name": "John Doe",
        "email": "john@example.com",
        "role": "admin",
        "joinedAt": "2024-01-12T10:30:00Z"
      }
    ],
    "pagination": {
      "page": 1,
      "limit": 20,
      "total": 12,
      "pages": 1
    }
  }
}
```

---

### POST /api/teams/:id/members

Add member to team.

**Authentication**: Bearer token (team admin or org admin)  
**Rate limit**: 20 requests per minute

#### Request Body

```json
{
  "userId": "usr_1234567890abcdef",
  "role": "member" // member, admin
}
```

#### Response

**Status**: `201 Created`

```json
{
  "success": true,
  "data": {
    "member": {
      "id": "usr_1234567890abcdef",
      "role": "member",
      "joinedAt": "2024-01-20T17:30:00Z"
    }
  },
  "message": "Member added to team successfully"
}
```

---

### DELETE /api/teams/:id/members/:userId

Remove member from team.

**Authentication**: Bearer token (team admin, org admin, or own membership)  
**Rate limit**: 20 requests per minute

#### Response

**Status**: `200 OK`

```json
{
  "success": true,
  "message": "Member removed from team successfully"
}
```

---

## Session Management Endpoints

Session management for security and device tracking.

### GET /api/sessions

List current user's sessions.

**Authentication**: Bearer token required  
**Rate limit**: 100 requests per minute

#### Query Parameters

- `active`: Filter active sessions only
- `page`: Page number (default: 1)
- `limit`: Results per page (default: 20, max: 50)

#### Response

**Status**: `200 OK`

```json
{
  "success": true,
  "data": {
    "sessions": [
      {
        "id": "sess_abcdef1234567890",
        "device": "Chrome on macOS",
        "ipAddress": "192.168.1.100",
        "location": "San Francisco, CA",
        "userAgent": "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7)...",
        "createdAt": "2024-01-20T10:30:00Z",
        "lastActiveAt": "2024-01-20T17:45:00Z",
        "expiresAt": "2024-01-27T10:30:00Z",
        "current": true
      }
    ],
    "pagination": {
      "page": 1,
      "limit": 20,
      "total": 3,
      "pages": 1
    }
  }
}
```

---

### GET /api/sessions/:id

Get specific session details.

**Authentication**: Bearer token (own session or admin)  
**Rate limit**: 200 requests per minute

#### Response

**Status**: `200 OK`

```json
{
  "success": true,
  "data": {
    "session": {
      "id": "sess_abcdef1234567890",
      "userId": "usr_1234567890abcdef",
      "device": "Chrome on macOS",
      "ipAddress": "192.168.1.100",
      "location": "San Francisco, CA",
      "userAgent": "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7)...",
      "createdAt": "2024-01-20T10:30:00Z",
      "lastActiveAt": "2024-01-20T17:45:00Z",
      "expiresAt": "2024-01-27T10:30:00Z",
      "current": true,
      "activities": [
        {
          "action": "login",
          "timestamp": "2024-01-20T10:30:00Z",
          "ipAddress": "192.168.1.100"
        }
      ]
    }
  }
}
```

---

### DELETE /api/sessions/:id

Revoke specific session.

**Authentication**: Bearer token (own session or admin)  
**Rate limit**: 50 requests per minute

#### Response

**Status**: `200 OK`

```json
{
  "success": true,
  "message": "Session revoked successfully"
}
```

---

### DELETE /api/sessions/revoke-all

Revoke all sessions except current.

**Authentication**: Bearer token required  
**Rate limit**: 10 requests per minute

#### Request Body

```json
{
  "keepCurrent": true // optional, default true
}
```

#### Response

**Status**: `200 OK`

```json
{
  "success": true,
  "data": {
    "revokedCount": 5
  },
  "message": "All sessions revoked successfully"
}
```

---

## API Key Endpoints

API key management for programmatic access.

### GET /api/api-keys

List user's API keys.

**Authentication**: Bearer token required  
**Rate limit**: 100 requests per minute

#### Query Parameters

- `active`: Filter active keys only
- `page`: Page number (default: 1)
- `limit`: Results per page (default: 20, max: 50)

#### Response

**Status**: `200 OK`

```json
{
  "success": true,
  "data": {
    "apiKeys": [
      {
        "id": "key_1234567890abcdef",
        "name": "Production API",
        "prefix": "cf_auth_prod_",
        "scopes": ["users:read", "orgs:read"],
        "lastUsedAt": "2024-01-20T16:30:00Z",
        "expiresAt": "2025-01-20T10:30:00Z",
        "createdAt": "2024-01-20T10:30:00Z",
        "active": true
      }
    ],
    "pagination": {
      "page": 1,
      "limit": 20,
      "total": 3,
      "pages": 1
    }
  }
}
```

---

### POST /api/api-keys

Create new API key.

**Authentication**: Bearer token required  
**Rate limit**: 10 requests per minute

#### Request Body

```json
{
  "name": "Development API",
  "scopes": ["users:read", "sessions:read"],
  "expiresIn": 365 // days, max 365
}
```

#### Response

**Status**: `201 Created`

```json
{
  "success": true,
  "data": {
    "apiKey": {
      "id": "key_abcdef1234567890",
      "name": "Development API",
      "key": "cf_auth_dev_1234567890abcdef...", // Only shown once
      "scopes": ["users:read", "sessions:read"],
      "expiresAt": "2025-01-20T18:00:00Z",
      "createdAt": "2024-01-20T18:00:00Z"
    }
  },
  "message": "API key created successfully. Save the key securely - it won't be shown again."
}
```

---

### GET /api/api-keys/:id

Get API key details.

**Authentication**: Bearer token (own key) or admin  
**Rate limit**: 200 requests per minute

#### Response

**Status**: `200 OK`

```json
{
  "success": true,
  "data": {
    "apiKey": {
      "id": "key_1234567890abcdef",
      "name": "Production API",
      "prefix": "cf_auth_prod_",
      "scopes": ["users:read", "orgs:read"],
      "lastUsedAt": "2024-01-20T16:30:00Z",
      "usageCount": 1250,
      "expiresAt": "2025-01-20T10:30:00Z",
      "createdAt": "2024-01-20T10:30:00Z",
      "active": true
    }
  }
}
```

---

### DELETE /api/api-keys/:id

Delete API key.

**Authentication**: Bearer token (own key) or admin  
**Rate limit**: 20 requests per minute

#### Response

**Status**: `200 OK`

```json
{
  "success": true,
  "message": "API key deleted successfully"
}
```

---

### POST /api/api-keys/:id/regenerate

Regenerate API key.

**Authentication**: Bearer token (own key) or admin  
**Rate limit**: 5 requests per minute

#### Response

**Status**: `200 OK`

```json
{
  "success": true,
  "data": {
    "apiKey": {
      "id": "key_1234567890abcdef",
      "key": "cf_auth_prod_new1234567890abcdef...", // New key
      "regeneratedAt": "2024-01-20T18:30:00Z"
    }
  },
  "message": "API key regenerated successfully. Update your applications with the new key."
}
```

---

## Admin Endpoints

Administrative endpoints for system management.

### GET /api/admin/users

List all users (admin only).

**Authentication**: Bearer token with admin role  
**Rate limit**: 100 requests per minute

#### Query Parameters

- `page`: Page number (default: 1)
- `limit`: Results per page (default: 50, max: 200)
- `search`: Search by name, email, or username
- `status`: Filter by status
- `role`: Filter by role
- `registered`: Filter by registration date range
- `sort`: Sort field
- `order`: Sort order

#### Response

**Status**: `200 OK`

```json
{
  "success": true,
  "data": {
    "users": [
      {
        "id": "usr_1234567890abcdef",
        "email": "user@example.com",
        "name": "John Doe",
        "username": "johndoe",
        "role": "user",
        "status": "active",
        "emailVerified": true,
        "twoFactorEnabled": true,
        "lastLoginAt": "2024-01-20T10:30:00Z",
        "sessionCount": 2,
        "organizationCount": 1,
        "createdAt": "2024-01-15T10:30:00Z"
      }
    ],
    "pagination": {
      "page": 1,
      "limit": 50,
      "total": 1250,
      "pages": 25
    },
    "stats": {
      "totalUsers": 1250,
      "activeUsers": 1180,
      "suspendedUsers": 70,
      "verifiedUsers": 1200
    }
  }
}
```

---

### GET /api/admin/audit-logs

Get system audit logs (admin only).

**Authentication**: Bearer token with admin role  
**Rate limit**: 50 requests per minute

#### Query Parameters

- `page`: Page number (default: 1)
- `limit`: Results per page (default: 50, max: 200)
- `userId`: Filter by user ID
- `action`: Filter by action type
- `resource`: Filter by resource type
- `from`: Start date (ISO string)
- `to`: End date (ISO string)
- `ipAddress`: Filter by IP address

#### Response

**Status**: `200 OK`

```json
{
  "success": true,
  "data": {
    "logs": [
      {
        "id": "log_1234567890abcdef",
        "userId": "usr_1234567890abcdef",
        "action": "user.login",
        "resource": "session",
        "resourceId": "sess_abcdef1234567890",
        "metadata": {
          "ipAddress": "192.168.1.100",
          "userAgent": "Chrome/120.0.0.0",
          "success": true
        },
        "timestamp": "2024-01-20T18:45:00Z"
      }
    ],
    "pagination": {
      "page": 1,
      "limit": 50,
      "total": 50000,
      "pages": 1000
    }
  }
}
```

---

### GET /api/admin/stats

Get system statistics (admin only).

**Authentication**: Bearer token with admin role  
**Rate limit**: 20 requests per minute

#### Query Parameters

- `period`: Time period (24h, 7d, 30d, 90d)
- `timezone`: Timezone for date calculations

#### Response

**Status**: `200 OK`

```json
{
  "success": true,
  "data": {
    "users": {
      "total": 1250,
      "active": 1180,
      "new": 45,
      "growth": 3.6
    },
    "sessions": {
      "active": 890,
      "total": 15600,
      "averageDuration": 7200
    },
    "organizations": {
      "total": 180,
      "active": 165,
      "new": 8
    },
    "security": {
      "failedLogins": 234,
      "suspendedUsers": 70,
      "mfaEnabled": 856
    },
    "activity": [
      {
        "date": "2024-01-20",
        "logins": 450,
        "registrations": 12,
        "organizations": 2
      }
    ]
  }
}
```

---

### POST /api/admin/impersonate

Impersonate user (admin only).

**Authentication**: Bearer token with admin role  
**Rate limit**: 10 requests per minute

#### Request Body

```json
{
  "userId": "usr_1234567890abcdef",
  "reason": "User support request #12345"
}
```

#### Response

**Status**: `200 OK`

```json
{
  "success": true,
  "data": {
    "impersonationToken": "imp_token_1234567890abcdef",
    "user": {
      "id": "usr_1234567890abcdef",
      "email": "user@example.com",
      "name": "John Doe"
    },
    "expiresAt": "2024-01-20T20:00:00Z"
  },
  "message": "Impersonation session created. This action has been logged."
}
```

---

## GraphQL Schema

CF-Better-Auth provides a comprehensive GraphQL API alongside REST endpoints for complex queries and real-time subscriptions.

### Type Definitions

```graphql
type User {
  id: ID!
  email: String!
  name: String
  username: String
  role: UserRole!
  status: UserStatus!
  emailVerified: Boolean!
  phoneNumber: String
  twoFactorEnabled: Boolean!
  lastLoginAt: DateTime
  createdAt: DateTime!
  updatedAt: DateTime!
  
  # Relationships
  sessions: [Session!]!
  organizations: [OrganizationMembership!]!
  teams: [TeamMembership!]!
  apiKeys: [ApiKey!]!
}

type Organization {
  id: ID!
  name: String!
  slug: String!
  description: String
  memberCount: Int!
  teamCount: Int!
  settings: OrganizationSettings!
  createdAt: DateTime!
  updatedAt: DateTime!
  
  # Relationships
  members: [OrganizationMembership!]!
  teams: [Team!]!
  invitations: [Invitation!]!
  
  # Current user's role in this organization
  role: OrganizationRole!
}

type Team {
  id: ID!
  name: String!
  description: String
  organizationId: ID!
  memberCount: Int!
  createdAt: DateTime!
  updatedAt: DateTime!
  
  # Relationships
  organization: Organization!
  members: [TeamMembership!]!
  
  # Current user's role in this team
  role: TeamRole
}

type Session {
  id: ID!
  userId: ID!
  device: String
  ipAddress: String
  location: String
  userAgent: String
  current: Boolean!
  lastActiveAt: DateTime!
  expiresAt: DateTime!
  createdAt: DateTime!
  
  # Relationships
  user: User!
  activities: [SessionActivity!]!
}

type ApiKey {
  id: ID!
  name: String!
  prefix: String!
  scopes: [String!]!
  lastUsedAt: DateTime
  usageCount: Int!
  expiresAt: DateTime
  createdAt: DateTime!
  active: Boolean!
  
  # Relationships
  user: User!
}

type OrganizationMembership {
  user: User!
  organization: Organization!
  role: OrganizationRole!
  joinedAt: DateTime!
  lastActiveAt: DateTime
}

type TeamMembership {
  user: User!
  team: Team!
  role: TeamRole!
  joinedAt: DateTime!
}

type Invitation {
  id: ID!
  email: String!
  organizationId: ID!
  role: OrganizationRole!
  status: InvitationStatus!
  message: String
  expiresAt: DateTime!
  createdAt: DateTime!
  
  # Relationships
  organization: Organization!
  invitedBy: User!
}

type SessionActivity {
  id: ID!
  sessionId: ID!
  action: String!
  ipAddress: String
  timestamp: DateTime!
  metadata: JSON
}

enum UserRole {
  USER
  ADMIN
  SUPER_ADMIN
}

enum UserStatus {
  ACTIVE
  SUSPENDED
  PENDING
}

enum OrganizationRole {
  MEMBER
  ADMIN
  OWNER
}

enum TeamRole {
  MEMBER
  ADMIN
}

enum InvitationStatus {
  PENDING
  ACCEPTED
  EXPIRED
  REVOKED
}

type OrganizationSettings {
  allowPublicInvites: Boolean!
  requireEmailVerification: Boolean!
  maxMembers: Int
}

scalar DateTime
scalar JSON
```

### Query Operations

```graphql
type Query {
  # Current user
  me: User
  
  # Users (admin only)
  users(
    page: Int = 1
    limit: Int = 20
    search: String
    role: UserRole
    status: UserStatus
  ): UserConnection!
  
  user(id: ID!): User
  
  # Organizations
  organizations(
    page: Int = 1
    limit: Int = 20
    role: OrganizationRole
  ): OrganizationConnection!
  
  organization(id: ID!): Organization
  
  # Teams
  teams(
    organizationId: ID!
    page: Int = 1
    limit: Int = 20
  ): TeamConnection!
  
  team(id: ID!): Team
  
  # Sessions
  sessions(
    page: Int = 1
    limit: Int = 20
    active: Boolean
  ): SessionConnection!
  
  session(id: ID!): Session
  
  # API Keys
  apiKeys(
    page: Int = 1
    limit: Int = 20
    active: Boolean
  ): ApiKeyConnection!
  
  apiKey(id: ID!): ApiKey
  
  # Admin queries
  adminStats(period: String = "7d"): AdminStats
  auditLogs(
    page: Int = 1
    limit: Int = 50
    userId: ID
    action: String
    from: DateTime
    to: DateTime
  ): AuditLogConnection!
}

type UserConnection {
  edges: [UserEdge!]!
  pageInfo: PageInfo!
  totalCount: Int!
}

type OrganizationConnection {
  edges: [OrganizationEdge!]!
  pageInfo: PageInfo!
  totalCount: Int!
}

# Similar connection types for other entities...
```

### Mutation Operations

```graphql
type Mutation {
  # Authentication
  login(input: LoginInput!): LoginResult!
  register(input: RegisterInput!): RegisterResult!
  logout(logoutAll: Boolean = false): LogoutResult!
  refreshToken(refreshToken: String!): RefreshTokenResult!
  
  # User management
  updateUser(id: ID!, input: UpdateUserInput!): User!
  deleteUser(id: ID!, confirmation: String!): DeleteUserResult!
  suspendUser(id: ID!, input: SuspendUserInput!): User!
  activateUser(id: ID!): User!
  
  # Organizations
  createOrganization(input: CreateOrganizationInput!): Organization!
  updateOrganization(id: ID!, input: UpdateOrganizationInput!): Organization!
  deleteOrganization(id: ID!, confirmation: String!): DeleteOrganizationResult!
  
  # Organization members
  addOrganizationMember(
    organizationId: ID!
    input: AddMemberInput!
  ): OrganizationMembership!
  
  updateOrganizationMemberRole(
    organizationId: ID!
    userId: ID!
    role: OrganizationRole!
  ): OrganizationMembership!
  
  removeOrganizationMember(
    organizationId: ID!
    userId: ID!
  ): RemoveMemberResult!
  
  # Teams
  createTeam(input: CreateTeamInput!): Team!
  updateTeam(id: ID!, input: UpdateTeamInput!): Team!
  deleteTeam(id: ID!, confirmation: String!): DeleteTeamResult!
  
  # Team members
  addTeamMember(teamId: ID!, userId: ID!, role: TeamRole!): TeamMembership!
  removeTeamMember(teamId: ID!, userId: ID!): RemoveTeamMemberResult!
  
  # Sessions
  revokeSession(id: ID!): RevokeSessionResult!
  revokeAllSessions(keepCurrent: Boolean = true): RevokeAllSessionsResult!
  
  # API Keys
  createApiKey(input: CreateApiKeyInput!): CreateApiKeyResult!
  deleteApiKey(id: ID!): DeleteApiKeyResult!
  regenerateApiKey(id: ID!): RegenerateApiKeyResult!
  
  # MFA
  enableMFA(input: EnableMFAInput!): EnableMFAResult!
  verifyMFA(input: VerifyMFAInput!): VerifyMFAResult!
  disableMFA(input: DisableMFAInput!): DisableMFAResult!
}

input LoginInput {
  email: String!
  password: String!
  rememberMe: Boolean = false
}

input RegisterInput {
  email: String!
  password: String!
  name: String
  username: String
}

input CreateOrganizationInput {
  name: String!
  slug: String
  description: String
}

# Additional input types...
```

### Subscription Operations

```graphql
type Subscription {
  # Session events
  sessionUpdated(userId: ID): Session!
  sessionCreated(userId: ID): Session!
  sessionRevoked(userId: ID): Session!
  
  # Organization events
  organizationUpdated(organizationId: ID!): Organization!
  organizationMemberAdded(organizationId: ID!): OrganizationMembership!
  organizationMemberRemoved(organizationId: ID!): OrganizationMembership!
  
  # Team events
  teamUpdated(teamId: ID!): Team!
  teamMemberAdded(teamId: ID!): TeamMembership!
  teamMemberRemoved(teamId: ID!): TeamMembership!
  
  # Security events
  securityAlert(userId: ID): SecurityAlert!
  
  # Admin events
  userStatusChanged: User!
  auditLogCreated: AuditLog!
}

type SecurityAlert {
  id: ID!
  type: SecurityAlertType!
  severity: AlertSeverity!
  message: String!
  metadata: JSON!
  timestamp: DateTime!
}

enum SecurityAlertType {
  SUSPICIOUS_LOGIN
  MULTIPLE_FAILED_LOGINS
  NEW_DEVICE_LOGIN
  PASSWORD_CHANGED
  MFA_DISABLED
}

enum AlertSeverity {
  LOW
  MEDIUM
  HIGH
  CRITICAL
}
```

---

## WebSocket Events

Real-time events are delivered via WebSocket connections at `/api/ws`.

### Connection and Authentication

```javascript
// Establish WebSocket connection
const ws = new WebSocket('wss://api.example.com/api/ws');

// Authenticate connection
ws.send(JSON.stringify({
  type: 'auth',
  token: 'your_jwt_token_here'
}));

// Connection confirmed
ws.onmessage = (event) => {
  const message = JSON.parse(event.data);
  if (message.type === 'auth_success') {
    console.log('WebSocket authenticated');
  }
};
```

### Event Subscription

```javascript
// Subscribe to specific event types
ws.send(JSON.stringify({
  type: 'subscribe',
  events: [
    'session:updated',
    'organization:member_added',
    'security:alert'
  ]
}));

// Subscribe with filters
ws.send(JSON.stringify({
  type: 'subscribe',
  events: ['organization:*'],
  filters: {
    organizationId: 'org_1234567890abcdef'
  }
}));
```

### Session Events

```javascript
// Session created (new login)
{
  "type": "session:created",
  "data": {
    "sessionId": "sess_abcdef1234567890",
    "userId": "usr_1234567890abcdef",
    "device": "Chrome on macOS",
    "ipAddress": "192.168.1.100",
    "timestamp": "2024-01-20T19:00:00Z"
  }
}

// Session updated (activity)
{
  "type": "session:updated",
  "data": {
    "sessionId": "sess_abcdef1234567890",
    "lastActiveAt": "2024-01-20T19:15:00Z"
  }
}

// Session revoked
{
  "type": "session:revoked",
  "data": {
    "sessionId": "sess_abcdef1234567890",
    "reason": "user_logout",
    "timestamp": "2024-01-20T19:30:00Z"
  }
}
```

### Organization Events

```javascript
// Member added
{
  "type": "organization:member_added",
  "data": {
    "organizationId": "org_1234567890abcdef",
    "userId": "usr_newmember123456",
    "role": "member",
    "addedBy": "usr_admin123456",
    "timestamp": "2024-01-20T19:45:00Z"
  }
}

// Member role changed
{
  "type": "organization:member_role_changed",
  "data": {
    "organizationId": "org_1234567890abcdef",
    "userId": "usr_1234567890abcdef",
    "oldRole": "member",
    "newRole": "admin",
    "changedBy": "usr_owner123456",
    "timestamp": "2024-01-20T20:00:00Z"
  }
}

// Member removed
{
  "type": "organization:member_removed",
  "data": {
    "organizationId": "org_1234567890abcdef",
    "userId": "usr_1234567890abcdef",
    "removedBy": "usr_admin123456",
    "timestamp": "2024-01-20T20:15:00Z"
  }
}
```

### Team Events

```javascript
// Team created
{
  "type": "team:created",
  "data": {
    "teamId": "team_abcdef1234567890",
    "organizationId": "org_1234567890abcdef",
    "name": "Marketing",
    "createdBy": "usr_admin123456",
    "timestamp": "2024-01-20T20:30:00Z"
  }
}

// Team member added
{
  "type": "team:member_added",
  "data": {
    "teamId": "team_1234567890abcdef",
    "userId": "usr_1234567890abcdef",
    "role": "member",
    "addedBy": "usr_teamadmin123456",
    "timestamp": "2024-01-20T20:45:00Z"
  }
}
```

### Security Events

```javascript
// Suspicious login detected
{
  "type": "security:alert",
  "data": {
    "alertId": "alert_1234567890abcdef",
    "type": "suspicious_login",
    "severity": "high",
    "userId": "usr_1234567890abcdef",
    "message": "Login from unusual location detected",
    "metadata": {
      "ipAddress": "203.0.113.1",
      "location": "Unknown Location",
      "device": "Chrome on Windows"
    },
    "timestamp": "2024-01-20T21:00:00Z"
  }
}

// Password changed
{
  "type": "security:password_changed",
  "data": {
    "userId": "usr_1234567890abcdef",
    "ipAddress": "192.168.1.100",
    "timestamp": "2024-01-20T21:15:00Z"
  }
}

// MFA status changed
{
  "type": "security:mfa_status_changed",
  "data": {
    "userId": "usr_1234567890abcdef",
    "enabled": true,
    "method": "totp",
    "timestamp": "2024-01-20T21:30:00Z"
  }
}
```

### Connection Management

```javascript
// Heartbeat (sent every 30 seconds)
{
  "type": "ping"
}

// Heartbeat response (client should respond)
{
  "type": "pong"
}

// Connection status
{
  "type": "connection:status",
  "data": {
    "connected": true,
    "authenticated": true,
    "subscriptions": [
      "session:*",
      "organization:member_added"
    ],
    "timestamp": "2024-01-20T21:45:00Z"
  }
}

// Error events
{
  "type": "error",
  "data": {
    "code": "SUBSCRIPTION_ERROR",
    "message": "Invalid event filter",
    "timestamp": "2024-01-20T22:00:00Z"
  }
}
```

---

## API Response Formats

All API responses follow consistent formatting standards for predictable client integration.

### Success Response Structure

```json
{
  "success": true,
  "data": {
    // Response payload varies by endpoint
  },
  "message": "Optional success message",
  "meta": {
    "timestamp": "2024-01-20T22:15:00Z",
    "requestId": "req_1234567890abcdef",
    "version": "v1"
  }
}
```

### Error Response Structure

```json
{
  "success": false,
  "error": {
    "code": "ERROR_CODE",
    "message": "Human readable error message",
    "details": {
      // Field-specific validation errors or additional context
    }
  },
  "meta": {
    "timestamp": "2024-01-20T22:15:00Z",
    "requestId": "req_1234567890abcdef",
    "version": "v1"
  }
}
```

### Pagination Format

```json
{
  "success": true,
  "data": {
    "items": [
      // Array of resources
    ],
    "pagination": {
      "page": 1,
      "limit": 20,
      "total": 150,
      "pages": 8,
      "hasNext": true,
      "hasPrev": false,
      "nextPage": 2,
      "prevPage": null
    }
  }
}
```

### Filtering and Sorting

#### Query Parameters for Filtering

```
GET /api/users?role=admin&status=active&search=john&page=2&limit=50
```

#### Supported Filter Operators

- `eq`: Equals (default)
- `ne`: Not equals
- `gt`: Greater than
- `gte`: Greater than or equal
- `lt`: Less than
- `lte`: Less than or equal
- `in`: In array
- `nin`: Not in array
- `like`: String contains (case-insensitive)

#### Advanced Filtering Syntax

```
GET /api/users?filters[role][eq]=admin&filters[createdAt][gte]=2024-01-01&filters[name][like]=john
```

#### Sorting Parameters

```
GET /api/users?sort=createdAt&order=desc
```

Multiple sort fields:
```
GET /api/users?sort=role,createdAt&order=asc,desc
```

### HTTP Status Codes

#### Success Codes
- `200 OK`: Request successful
- `201 Created`: Resource created successfully
- `202 Accepted`: Request accepted for processing
- `204 No Content`: Request successful, no response body

#### Client Error Codes
- `400 Bad Request`: Invalid request format or parameters
- `401 Unauthorized`: Authentication required or invalid
- `403 Forbidden`: Access denied for authenticated user
- `404 Not Found`: Resource not found
- `409 Conflict`: Resource conflict (duplicate, constraint violation)
- `422 Unprocessable Entity`: Validation errors
- `429 Too Many Requests`: Rate limit exceeded

#### Server Error Codes
- `500 Internal Server Error`: Unexpected server error
- `502 Bad Gateway`: Upstream service error
- `503 Service Unavailable`: Service temporarily unavailable
- `504 Gateway Timeout`: Upstream service timeout

### Rate Limiting Headers

All responses include rate limiting headers:

```
X-RateLimit-Limit: 100
X-RateLimit-Remaining: 87
X-RateLimit-Reset: 1642694400
X-RateLimit-Window: 60
```

### Error Code Reference

#### Authentication Errors
- `AUTH_REQUIRED`: Authentication token required
- `AUTH_INVALID`: Invalid or expired token
- `AUTH_INSUFFICIENT`: Insufficient permissions
- `MFA_REQUIRED`: Multi-factor authentication required

#### Validation Errors
- `VALIDATION_ERROR`: General validation failure
- `INVALID_EMAIL`: Invalid email format
- `INVALID_PASSWORD`: Password doesn't meet requirements
- `EMAIL_EXISTS`: Email already registered
- `USERNAME_EXISTS`: Username already taken

#### Resource Errors
- `RESOURCE_NOT_FOUND`: Requested resource doesn't exist
- `RESOURCE_CONFLICT`: Resource conflict or constraint violation
- `RESOURCE_LOCKED`: Resource temporarily unavailable

#### Rate Limiting Errors
- `RATE_LIMIT_EXCEEDED`: Too many requests
- `QUOTA_EXCEEDED`: Usage quota exceeded

#### Server Errors
- `INTERNAL_ERROR`: Unexpected server error
- `SERVICE_UNAVAILABLE`: Service temporarily down
- `MAINTENANCE_MODE`: System in maintenance mode

---

## Authentication & Authorization

CF-Better-Auth implements a multi-layered authentication and authorization system supporting various authentication methods and granular permissions.

### JWT Token Structure

#### Access Token

```json
{
  "header": {
    "alg": "HS256",
    "typ": "JWT"
  },
  "payload": {
    "sub": "usr_1234567890abcdef",
    "email": "user@example.com",
    "name": "John Doe",
    "role": "user",
    "permissions": [
      "users:read:own",
      "organizations:read",
      "sessions:manage:own"
    ],
    "organizations": [
      {
        "id": "org_1234567890abcdef",
        "role": "admin"
      }
    ],
    "session": "sess_abcdef1234567890",
    "iat": 1642694400,
    "exp": 1642698000,
    "aud": "cf-better-auth",
    "iss": "https://api.example.com"
  }
}
```

#### Refresh Token

```json
{
  "header": {
    "alg": "HS256",
    "typ": "JWT"
  },
  "payload": {
    "sub": "usr_1234567890abcdef",
    "session": "sess_abcdef1234567890",
    "type": "refresh",
    "iat": 1642694400,
    "exp": 1643299200,
    "aud": "cf-better-auth",
    "iss": "https://api.example.com"
  }
}
```

### API Key Authentication

API keys provide programmatic access with scoped permissions:

```
Authorization: Bearer cf_auth_prod_1234567890abcdef...
```

#### API Key Format

```
cf_auth_{environment}_{random_string}
```

- `cf_auth_`: Fixed prefix
- `environment`: prod, dev, test
- `random_string`: 32-character alphanumeric string

### Permission Scopes

#### User Scopes
- `users:read:own`: Read own user data
- `users:write:own`: Update own user data
- `users:read:all`: Read all users (admin)
- `users:write:all`: Modify any user (admin)
- `users:delete:all`: Delete any user (admin)

#### Organization Scopes
- `organizations:read`: Read organization data
- `organizations:write`: Update organization
- `organizations:delete`: Delete organization
- `organizations:members:read`: Read member list
- `organizations:members:write`: Manage members
- `organizations:admin`: Full organization access

#### Session Scopes
- `sessions:read:own`: Read own sessions
- `sessions:manage:own`: Manage own sessions
- `sessions:read:all`: Read all sessions (admin)
- `sessions:manage:all`: Manage any session (admin)

#### Team Scopes
- `teams:read`: Read team data
- `teams:write`: Update team
- `teams:delete`: Delete team
- `teams:members:read`: Read team members
- `teams:members:write`: Manage team members

### Role-Based Access Control (RBAC)

#### System Roles

**Super Admin**
- Full system access
- User management
- System configuration
- Audit log access

**Admin**  
- User management within scope
- Organization administration
- Limited system access

**User**
- Basic user operations
- Own data management
- Organization/team membership

#### Organization Roles

**Owner**
- Full organization control
- Billing and subscription management
- Member and team management
- Organization deletion

**Admin**
- Member and team management
- Organization settings
- Invitation management

**Member**
- Basic organization access
- Team membership
- Limited settings access

#### Team Roles

**Admin**
- Team management
- Member management
- Team settings

**Member**
- Team participation
- Basic team access

### Authorization Header Formats

#### Bearer Token (JWT)
```
Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
```

#### API Key
```
Authorization: Bearer cf_auth_prod_1234567890abcdef...
```

#### Custom Header (Alternative)
```
X-CF-Auth-Token: eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
```

### Rate Limiting

Rate limits are applied per authentication method and endpoint:

#### User Authentication
- Login attempts: 5 per minute per IP
- Registration: 3 per minute per IP
- Password reset: 3 per minute per IP
- General API: 1000 per hour per user

#### API Key Authentication
- Standard tier: 10,000 per hour
- Premium tier: 100,000 per hour
- Enterprise tier: 1,000,000 per hour

#### Anonymous Requests
- Public endpoints: 100 per hour per IP
- Documentation: 1000 per hour per IP

### Session Security

#### Session Configuration
```json
{
  "expiresIn": 604800,     // 7 days
  "refreshWindow": 86400,   // 1 day before expiry
  "maxSessions": 10,        // Per user
  "idleTimeout": 7200,      // 2 hours
  "absoluteTimeout": 2592000 // 30 days
}
```

#### Session Validation
- Token signature verification
- Expiration checking
- Session status validation
- Device fingerprinting (optional)
- IP address validation (optional)

### Multi-Factor Authentication

#### TOTP (Time-based One-Time Password)
```json
{
  "type": "totp",
  "secret": "JBSWY3DPEHPK3PXP",
  "qrCode": "data:image/png;base64,iVBORw0KGg...",
  "backupCodes": ["12345678", "87654321"]
}
```

#### SMS OTP
```json
{
  "type": "sms",
  "phoneNumber": "+1234567890",
  "codeLength": 6,
  "expiresIn": 300
}
```

#### Email OTP
```json
{
  "type": "email",
  "email": "user@example.com",
  "codeLength": 6,
  "expiresIn": 300
}
```

---

## API Best Practices

### Status Codes

Follow HTTP status code conventions:

#### 2xx Success
- `200 OK`: Standard success response
- `201 Created`: Resource created successfully
- `202 Accepted`: Request accepted, processing async
- `204 No Content`: Success with no response body

#### 4xx Client Errors
- `400 Bad Request`: Malformed request
- `401 Unauthorized`: Authentication required/failed
- `403 Forbidden`: Access denied
- `404 Not Found`: Resource not found
- `409 Conflict`: Resource conflict
- `422 Unprocessable Entity`: Validation failed
- `429 Too Many Requests`: Rate limit exceeded

#### 5xx Server Errors
- `500 Internal Server Error`: Unexpected error
- `502 Bad Gateway`: Upstream error
- `503 Service Unavailable`: Service down
- `504 Gateway Timeout`: Request timeout

### Error Handling

#### Consistent Error Format
```json
{
  "success": false,
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "The request contains invalid data",
    "details": {
      "email": "Email is required",
      "password": "Password must be at least 8 characters"
    },
    "timestamp": "2024-01-20T22:30:00Z",
    "requestId": "req_1234567890abcdef"
  }
}
```

#### Error Response Guidelines
- Use descriptive error messages
- Include field-specific validation errors
- Provide actionable guidance when possible
- Log detailed errors server-side
- Never expose sensitive information

### Versioning Strategy

#### URL Versioning (Primary)
```
GET /api/v1/users
GET /api/v2/users
```

#### Header Versioning (Secondary)
```
Accept: application/vnd.cf-auth.v1+json
```

#### Version Support Policy
- Maintain backwards compatibility for 1 year
- Deprecation warnings 6 months before removal
- Clear migration documentation
- Automated migration tools when possible

### Documentation Standards

#### OpenAPI Specification
- Complete API documentation
- Interactive testing interface
- Code generation support
- Version-specific schemas

#### SDK Documentation
- Language-specific examples
- Authentication setup guides
- Common use case tutorials
- Error handling patterns

### Security Best Practices

#### Input Validation
- Validate all input parameters
- Use whitelist validation approach
- Sanitize data before processing
- Check data types and formats

#### Output Security
- Never expose internal IDs in errors
- Sanitize output data
- Use consistent response formats
- Implement proper CORS headers

#### Rate Limiting Implementation
```javascript
// Rate limiting by user
const userRateLimit = {
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 1000, // Limit each user to 1000 requests per windowMs
  keyGenerator: (req) => req.user.id,
  message: "Too many requests from this user"
};

// Rate limiting by IP
const ipRateLimit = {
  windowMs: 15 * 60 * 1000, // 15 minutes  
  max: 100, // Limit each IP to 100 requests per windowMs
  message: "Too many requests from this IP"
};
```

### Performance Optimization

#### Caching Strategy
- Use ETags for conditional requests
- Implement proper cache headers
- Cache static configuration data
- Use Redis for session caching

#### Database Optimization
- Use connection pooling
- Implement query optimization
- Add proper database indexes
- Use read replicas for read-heavy operations

#### Response Optimization
- Implement GZIP compression
- Use CDN for static assets
- Minimize response payload size
- Support partial responses for large datasets

### Monitoring and Logging

#### Request Logging
```json
{
  "timestamp": "2024-01-20T22:45:00Z",
  "requestId": "req_1234567890abcdef",
  "method": "GET",
  "path": "/api/v1/users",
  "userId": "usr_1234567890abcdef",
  "ipAddress": "192.168.1.100",
  "userAgent": "Mozilla/5.0...",
  "statusCode": 200,
  "responseTime": 125,
  "queryParams": {
    "page": 1,
    "limit": 20
  }
}
```

#### Error Logging
```json
{
  "timestamp": "2024-01-20T22:45:00Z",
  "requestId": "req_1234567890abcdef",
  "level": "error",
  "message": "Database connection failed",
  "error": {
    "name": "ConnectionError",
    "message": "Connection timeout",
    "stack": "Error: Connection timeout\n    at..."
  },
  "context": {
    "userId": "usr_1234567890abcdef",
    "endpoint": "/api/v1/users",
    "queryTime": 5000
  }
}
```

#### Metrics Collection
- Response time distribution
- Error rate by endpoint
- Active user sessions
- API key usage statistics
- Rate limiting violations

### Development Guidelines

#### API Design Principles
1. **RESTful Design**: Follow REST conventions
2. **Consistent Naming**: Use clear, consistent resource names
3. **Idempotency**: Ensure safe retry behavior
4. **Statelessness**: Each request should be self-contained
5. **Scalability**: Design for horizontal scaling

#### Testing Strategy
```javascript
// Example API test
describe('GET /api/v1/users/:id', () => {
  it('should return user data for valid ID', async () => {
    const response = await request(app)
      .get('/api/v1/users/usr_1234567890abcdef')
      .set('Authorization', `Bearer ${validToken}`)
      .expect(200);
      
    expect(response.body.success).toBe(true);
    expect(response.body.data.user.id).toBe('usr_1234567890abcdef');
  });
  
  it('should return 404 for non-existent user', async () => {
    const response = await request(app)
      .get('/api/v1/users/usr_nonexistent')
      .set('Authorization', `Bearer ${validToken}`)
      .expect(404);
      
    expect(response.body.success).toBe(false);
    expect(response.body.error.code).toBe('RESOURCE_NOT_FOUND');
  });
});
```

#### Code Quality Standards
- Use TypeScript for type safety
- Implement comprehensive error handling
- Follow consistent code formatting
- Write extensive unit and integration tests
- Use automated code quality tools

---

This comprehensive API design documentation provides a complete reference for CF-Better-Auth's authentication and authorization system. The API follows RESTful principles, supports real-time communication through GraphQL and WebSockets, and implements enterprise-grade security features with detailed error handling and monitoring capabilities.
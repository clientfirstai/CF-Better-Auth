/**
 * Event system types for CF-Better-Auth
 * Defines all event types, emitters, and real-time communication interfaces
 */

import type {
  User,
  Session,
  Account,
  Organization,
  Team,
  Role,
  Permission,
  UserId,
  SessionId,
  OrganizationId,
  TeamId
} from './auth';

import type { EventHandler, ConfigObject } from './common';

/**
 * Base event interface
 */
export interface BaseEvent {
  /** Event ID */
  id: string;
  
  /** Event type */
  type: string;
  
  /** Event timestamp */
  timestamp: Date;
  
  /** Event source */
  source: string;
  
  /** Event version */
  version: string;
  
  /** Event data */
  data: any;
  
  /** Event metadata */
  metadata?: EventMetadata;
}

/**
 * Event metadata
 */
export interface EventMetadata {
  /** User who triggered the event */
  userId?: UserId;
  
  /** Session associated with the event */
  sessionId?: SessionId;
  
  /** Organization context */
  organizationId?: OrganizationId;
  
  /** Team context */
  teamId?: TeamId;
  
  /** Request ID */
  requestId?: string;
  
  /** IP address */
  ipAddress?: string;
  
  /** User agent */
  userAgent?: string;
  
  /** Correlation ID for event tracking */
  correlationId?: string;
  
  /** Event priority */
  priority?: EventPriority;
  
  /** Event tags */
  tags?: string[];
  
  /** Custom metadata */
  custom?: Record<string, any>;
}

/**
 * Event priority levels
 */
export type EventPriority = 'LOW' | 'NORMAL' | 'HIGH' | 'CRITICAL';

/**
 * Event categories
 */
export type EventCategory = 
  | 'AUTHENTICATION'
  | 'AUTHORIZATION'
  | 'USER_MANAGEMENT'
  | 'SESSION_MANAGEMENT'
  | 'ORGANIZATION'
  | 'TEAM'
  | 'SECURITY'
  | 'SYSTEM'
  | 'PLUGIN'
  | 'WEBHOOK'
  | 'NOTIFICATION';

/**
 * Authentication events
 */
export namespace AuthenticationEvents {
  export interface UserRegistered extends BaseEvent {
    type: 'user.registered';
    data: {
      user: User;
      method: 'email' | 'phone' | 'oauth' | 'magic-link';
      provider?: string;
      requiresVerification: boolean;
    };
  }
  
  export interface UserLoggedIn extends BaseEvent {
    type: 'user.logged_in';
    data: {
      user: User;
      session: Session;
      method: 'password' | 'oauth' | 'magic-link' | 'mfa' | 'webauthn';
      provider?: string;
      newDevice: boolean;
      location?: {
        country?: string;
        city?: string;
      };
    };
  }
  
  export interface UserLoggedOut extends BaseEvent {
    type: 'user.logged_out';
    data: {
      user: User;
      session: Session;
      reason: 'user_initiated' | 'session_expired' | 'admin_action' | 'security_logout';
    };
  }
  
  export interface LoginFailed extends BaseEvent {
    type: 'user.login_failed';
    data: {
      identifier: string;
      method: string;
      reason: string;
      attempts: number;
      blocked?: boolean;
    };
  }
  
  export interface PasswordChanged extends BaseEvent {
    type: 'user.password_changed';
    data: {
      user: User;
      method: 'self_service' | 'admin_reset' | 'force_reset';
    };
  }
  
  export interface EmailVerified extends BaseEvent {
    type: 'user.email_verified';
    data: {
      user: User;
      email: string;
    };
  }
  
  export interface PhoneVerified extends BaseEvent {
    type: 'user.phone_verified';
    data: {
      user: User;
      phone: string;
    };
  }
  
  export interface AccountLocked extends BaseEvent {
    type: 'user.account_locked';
    data: {
      user: User;
      reason: string;
      duration?: number;
      attempts?: number;
    };
  }
  
  export interface AccountUnlocked extends BaseEvent {
    type: 'user.account_unlocked';
    data: {
      user: User;
      method: 'auto' | 'admin' | 'self_service';
    };
  }
  
  export interface MfaEnabled extends BaseEvent {
    type: 'user.mfa_enabled';
    data: {
      user: User;
      method: 'totp' | 'sms' | 'email' | 'webauthn';
    };
  }
  
  export interface MfaDisabled extends BaseEvent {
    type: 'user.mfa_disabled';
    data: {
      user: User;
      method: 'totp' | 'sms' | 'email' | 'webauthn';
    };
  }
  
  export interface SocialAccountLinked extends BaseEvent {
    type: 'user.social_account_linked';
    data: {
      user: User;
      account: Account;
      provider: string;
    };
  }
  
  export interface SocialAccountUnlinked extends BaseEvent {
    type: 'user.social_account_unlinked';
    data: {
      user: User;
      account: Account;
      provider: string;
    };
  }
}

/**
 * Session events
 */
export namespace SessionEvents {
  export interface SessionCreated extends BaseEvent {
    type: 'session.created';
    data: {
      session: Session;
      user: User;
    };
  }
  
  export interface SessionExpired extends BaseEvent {
    type: 'session.expired';
    data: {
      session: Session;
      user: User;
      reason: 'timeout' | 'inactivity' | 'max_age';
    };
  }
  
  export interface SessionRevoked extends BaseEvent {
    type: 'session.revoked';
    data: {
      session: Session;
      user: User;
      reason: 'user_action' | 'admin_action' | 'security_policy' | 'device_change';
      revokedBy?: UserId;
    };
  }
  
  export interface SessionRefreshed extends BaseEvent {
    type: 'session.refreshed';
    data: {
      session: Session;
      user: User;
      previousExpiry: Date;
      newExpiry: Date;
    };
  }
  
  export interface ConcurrentSessionDetected extends BaseEvent {
    type: 'session.concurrent_detected';
    data: {
      user: User;
      existingSessions: SessionId[];
      newSession: Session;
      action: 'allow' | 'deny' | 'revoke_others';
    };
  }
}

/**
 * User management events
 */
export namespace UserEvents {
  export interface UserCreated extends BaseEvent {
    type: 'user.created';
    data: {
      user: User;
      createdBy?: UserId;
      method: 'registration' | 'admin' | 'invitation' | 'import';
    };
  }
  
  export interface UserUpdated extends BaseEvent {
    type: 'user.updated';
    data: {
      user: User;
      updatedBy: UserId;
      changes: Record<string, { old: any; new: any }>;
    };
  }
  
  export interface UserDeleted extends BaseEvent {
    type: 'user.deleted';
    data: {
      user: User;
      deletedBy: UserId;
      method: 'soft_delete' | 'hard_delete';
      reason?: string;
    };
  }
  
  export interface UserSuspended extends BaseEvent {
    type: 'user.suspended';
    data: {
      user: User;
      suspendedBy: UserId;
      reason: string;
      duration?: number;
    };
  }
  
  export interface UserReactivated extends BaseEvent {
    type: 'user.reactivated';
    data: {
      user: User;
      reactivatedBy: UserId;
      reason?: string;
    };
  }
  
  export interface UserRoleAssigned extends BaseEvent {
    type: 'user.role_assigned';
    data: {
      user: User;
      role: Role;
      assignedBy: UserId;
      organizationId?: OrganizationId;
      expiresAt?: Date;
    };
  }
  
  export interface UserRoleRemoved extends BaseEvent {
    type: 'user.role_removed';
    data: {
      user: User;
      role: Role;
      removedBy: UserId;
      organizationId?: OrganizationId;
      reason?: string;
    };
  }
  
  export interface UserPermissionGranted extends BaseEvent {
    type: 'user.permission_granted';
    data: {
      user: User;
      permission: Permission;
      grantedBy: UserId;
      scope?: string;
      expiresAt?: Date;
    };
  }
  
  export interface UserPermissionRevoked extends BaseEvent {
    type: 'user.permission_revoked';
    data: {
      user: User;
      permission: Permission;
      revokedBy: UserId;
      reason?: string;
    };
  }
}

/**
 * Organization events
 */
export namespace OrganizationEvents {
  export interface OrganizationCreated extends BaseEvent {
    type: 'organization.created';
    data: {
      organization: Organization;
      createdBy: UserId;
    };
  }
  
  export interface OrganizationUpdated extends BaseEvent {
    type: 'organization.updated';
    data: {
      organization: Organization;
      updatedBy: UserId;
      changes: Record<string, { old: any; new: any }>;
    };
  }
  
  export interface OrganizationDeleted extends BaseEvent {
    type: 'organization.deleted';
    data: {
      organization: Organization;
      deletedBy: UserId;
      method: 'soft_delete' | 'hard_delete';
      reason?: string;
    };
  }
  
  export interface MemberAdded extends BaseEvent {
    type: 'organization.member_added';
    data: {
      organization: Organization;
      user: User;
      addedBy: UserId;
      role: string;
      method: 'invitation' | 'direct_add' | 'self_join';
    };
  }
  
  export interface MemberRemoved extends BaseEvent {
    type: 'organization.member_removed';
    data: {
      organization: Organization;
      user: User;
      removedBy: UserId;
      reason: 'voluntary_leave' | 'admin_removal' | 'violation' | 'inactivity';
    };
  }
  
  export interface MemberRoleChanged extends BaseEvent {
    type: 'organization.member_role_changed';
    data: {
      organization: Organization;
      user: User;
      changedBy: UserId;
      oldRole: string;
      newRole: string;
    };
  }
  
  export interface InvitationSent extends BaseEvent {
    type: 'organization.invitation_sent';
    data: {
      organization: Organization;
      email: string;
      role: string;
      invitedBy: UserId;
      expiresAt: Date;
    };
  }
  
  export interface InvitationAccepted extends BaseEvent {
    type: 'organization.invitation_accepted';
    data: {
      organization: Organization;
      user: User;
      role: string;
      invitationId: string;
    };
  }
  
  export interface InvitationDeclined extends BaseEvent {
    type: 'organization.invitation_declined';
    data: {
      organization: Organization;
      email: string;
      role: string;
      invitationId: string;
    };
  }
}

/**
 * Team events
 */
export namespace TeamEvents {
  export interface TeamCreated extends BaseEvent {
    type: 'team.created';
    data: {
      team: Team;
      organization: Organization;
      createdBy: UserId;
    };
  }
  
  export interface TeamUpdated extends BaseEvent {
    type: 'team.updated';
    data: {
      team: Team;
      updatedBy: UserId;
      changes: Record<string, { old: any; new: any }>;
    };
  }
  
  export interface TeamDeleted extends BaseEvent {
    type: 'team.deleted';
    data: {
      team: Team;
      deletedBy: UserId;
      reason?: string;
    };
  }
  
  export interface TeamMemberAdded extends BaseEvent {
    type: 'team.member_added';
    data: {
      team: Team;
      user: User;
      addedBy: UserId;
      role: string;
    };
  }
  
  export interface TeamMemberRemoved extends BaseEvent {
    type: 'team.member_removed';
    data: {
      team: Team;
      user: User;
      removedBy: UserId;
      reason?: string;
    };
  }
  
  export interface TeamMemberRoleChanged extends BaseEvent {
    type: 'team.member_role_changed';
    data: {
      team: Team;
      user: User;
      changedBy: UserId;
      oldRole: string;
      newRole: string;
    };
  }
}

/**
 * Security events
 */
export namespace SecurityEvents {
  export interface SecurityThreatDetected extends BaseEvent {
    type: 'security.threat_detected';
    data: {
      threatType: 'brute_force' | 'suspicious_activity' | 'credential_stuffing' | 'account_takeover';
      severity: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
      source: string;
      details: Record<string, any>;
      blocked: boolean;
    };
  }
  
  export interface RateLimitExceeded extends BaseEvent {
    type: 'security.rate_limit_exceeded';
    data: {
      identifier: string;
      resource: string;
      limit: number;
      attempts: number;
      blocked: boolean;
      duration?: number;
    };
  }
  
  export interface SuspiciousLocationLogin extends BaseEvent {
    type: 'security.suspicious_location_login';
    data: {
      user: User;
      location: {
        country: string;
        city?: string;
        coordinates?: { lat: number; lng: number };
      };
      previousLocations: string[];
      blocked: boolean;
    };
  }
  
  export interface UnusualDeviceLogin extends BaseEvent {
    type: 'security.unusual_device_login';
    data: {
      user: User;
      device: {
        type: string;
        os: string;
        browser: string;
        fingerprint: string;
      };
      blocked: boolean;
    };
  }
  
  export interface DataBreach extends BaseEvent {
    type: 'security.data_breach';
    data: {
      severity: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
      affectedUsers: number;
      dataTypes: string[];
      source: string;
      containmentActions: string[];
      reportedToAuthorities: boolean;
    };
  }
  
  export interface PasswordPolicyViolation extends BaseEvent {
    type: 'security.password_policy_violation';
    data: {
      user: User;
      violations: string[];
      attempts: number;
      blocked: boolean;
    };
  }
  
  export interface ApiKeyCompromised extends BaseEvent {
    type: 'security.api_key_compromised';
    data: {
      keyId: string;
      userId?: UserId;
      organizationId?: OrganizationId;
      lastUsed: Date;
      suspiciousActivity: Record<string, any>;
      revoked: boolean;
    };
  }
}

/**
 * System events
 */
export namespace SystemEvents {
  export interface SystemStarted extends BaseEvent {
    type: 'system.started';
    data: {
      version: string;
      environment: string;
      startupTime: number;
      config: {
        database: boolean;
        redis: boolean;
        plugins: string[];
      };
    };
  }
  
  export interface SystemShutdown extends BaseEvent {
    type: 'system.shutdown';
    data: {
      reason: 'graceful' | 'forced' | 'crash' | 'signal';
      uptime: number;
      activeConnections: number;
    };
  }
  
  export interface HealthCheckFailed extends BaseEvent {
    type: 'system.health_check_failed';
    data: {
      service: string;
      check: string;
      error: string;
      duration: number;
      consecutiveFailures: number;
    };
  }
  
  export interface ResourceLimitReached extends BaseEvent {
    type: 'system.resource_limit_reached';
    data: {
      resource: 'memory' | 'cpu' | 'disk' | 'connections' | 'file_descriptors';
      current: number;
      limit: number;
      percentage: number;
    };
  }
  
  export interface ConfigurationChanged extends BaseEvent {
    type: 'system.configuration_changed';
    data: {
      changedBy?: UserId;
      changes: Record<string, { old: any; new: any }>;
      restart_required: boolean;
    };
  }
  
  export interface DatabaseMigration extends BaseEvent {
    type: 'system.database_migration';
    data: {
      migration: string;
      version: string;
      direction: 'up' | 'down';
      duration: number;
      success: boolean;
      error?: string;
    };
  }
  
  export interface BackupCreated extends BaseEvent {
    type: 'system.backup_created';
    data: {
      backupId: string;
      type: 'full' | 'incremental';
      size: number;
      duration: number;
      location: string;
      success: boolean;
    };
  }
  
  export interface BackupRestored extends BaseEvent {
    type: 'system.backup_restored';
    data: {
      backupId: string;
      restoredBy: UserId;
      duration: number;
      success: boolean;
      dataLoss?: boolean;
    };
  }
}

/**
 * Plugin events
 */
export namespace PluginEvents {
  export interface PluginRegistered extends BaseEvent {
    type: 'plugin.registered';
    data: {
      plugin: {
        id: string;
        name: string;
        version: string;
        type: string;
      };
      registeredBy?: UserId;
    };
  }
  
  export interface PluginUnregistered extends BaseEvent {
    type: 'plugin.unregistered';
    data: {
      plugin: {
        id: string;
        name: string;
        version: string;
      };
      unregisteredBy?: UserId;
      reason?: string;
    };
  }
  
  export interface PluginEnabled extends BaseEvent {
    type: 'plugin.enabled';
    data: {
      plugin: {
        id: string;
        name: string;
        version: string;
      };
      enabledBy?: UserId;
    };
  }
  
  export interface PluginDisabled extends BaseEvent {
    type: 'plugin.disabled';
    data: {
      plugin: {
        id: string;
        name: string;
        version: string;
      };
      disabledBy?: UserId;
      reason?: string;
    };
  }
  
  export interface PluginError extends BaseEvent {
    type: 'plugin.error';
    data: {
      plugin: {
        id: string;
        name: string;
        version: string;
      };
      error: string;
      stack?: string;
      context?: Record<string, any>;
    };
  }
  
  export interface PluginConfigChanged extends BaseEvent {
    type: 'plugin.config_changed';
    data: {
      plugin: {
        id: string;
        name: string;
        version: string;
      };
      changes: Record<string, { old: any; new: any }>;
      changedBy?: UserId;
    };
  }
}

/**
 * Webhook events
 */
export namespace WebhookEvents {
  export interface WebhookDelivered extends BaseEvent {
    type: 'webhook.delivered';
    data: {
      webhookId: string;
      url: string;
      event: string;
      statusCode: number;
      duration: number;
      attempt: number;
      success: boolean;
    };
  }
  
  export interface WebhookFailed extends BaseEvent {
    type: 'webhook.failed';
    data: {
      webhookId: string;
      url: string;
      event: string;
      error: string;
      attempt: number;
      maxAttempts: number;
      nextRetry?: Date;
    };
  }
  
  export interface WebhookCreated extends BaseEvent {
    type: 'webhook.created';
    data: {
      webhookId: string;
      url: string;
      events: string[];
      createdBy: UserId;
    };
  }
  
  export interface WebhookUpdated extends BaseEvent {
    type: 'webhook.updated';
    data: {
      webhookId: string;
      url: string;
      updatedBy: UserId;
      changes: Record<string, { old: any; new: any }>;
    };
  }
  
  export interface WebhookDeleted extends BaseEvent {
    type: 'webhook.deleted';
    data: {
      webhookId: string;
      url: string;
      deletedBy: UserId;
    };
  }
}

/**
 * Notification events
 */
export namespace NotificationEvents {
  export interface NotificationSent extends BaseEvent {
    type: 'notification.sent';
    data: {
      notificationId: string;
      type: string;
      channel: 'email' | 'sms' | 'push' | 'in_app';
      recipient: string;
      success: boolean;
      duration?: number;
      error?: string;
    };
  }
  
  export interface NotificationRead extends BaseEvent {
    type: 'notification.read';
    data: {
      notificationId: string;
      userId: UserId;
      readAt: Date;
    };
  }
  
  export interface NotificationClicked extends BaseEvent {
    type: 'notification.clicked';
    data: {
      notificationId: string;
      userId: UserId;
      clickedAt: Date;
      url?: string;
    };
  }
  
  export interface NotificationDismissed extends BaseEvent {
    type: 'notification.dismissed';
    data: {
      notificationId: string;
      userId: UserId;
      dismissedAt: Date;
    };
  }
}

/**
 * Union type of all event types
 */
export type CFAuthEvent = 
  | AuthenticationEvents.UserRegistered
  | AuthenticationEvents.UserLoggedIn
  | AuthenticationEvents.UserLoggedOut
  | AuthenticationEvents.LoginFailed
  | AuthenticationEvents.PasswordChanged
  | AuthenticationEvents.EmailVerified
  | AuthenticationEvents.PhoneVerified
  | AuthenticationEvents.AccountLocked
  | AuthenticationEvents.AccountUnlocked
  | AuthenticationEvents.MfaEnabled
  | AuthenticationEvents.MfaDisabled
  | AuthenticationEvents.SocialAccountLinked
  | AuthenticationEvents.SocialAccountUnlinked
  | SessionEvents.SessionCreated
  | SessionEvents.SessionExpired
  | SessionEvents.SessionRevoked
  | SessionEvents.SessionRefreshed
  | SessionEvents.ConcurrentSessionDetected
  | UserEvents.UserCreated
  | UserEvents.UserUpdated
  | UserEvents.UserDeleted
  | UserEvents.UserSuspended
  | UserEvents.UserReactivated
  | UserEvents.UserRoleAssigned
  | UserEvents.UserRoleRemoved
  | UserEvents.UserPermissionGranted
  | UserEvents.UserPermissionRevoked
  | OrganizationEvents.OrganizationCreated
  | OrganizationEvents.OrganizationUpdated
  | OrganizationEvents.OrganizationDeleted
  | OrganizationEvents.MemberAdded
  | OrganizationEvents.MemberRemoved
  | OrganizationEvents.MemberRoleChanged
  | OrganizationEvents.InvitationSent
  | OrganizationEvents.InvitationAccepted
  | OrganizationEvents.InvitationDeclined
  | TeamEvents.TeamCreated
  | TeamEvents.TeamUpdated
  | TeamEvents.TeamDeleted
  | TeamEvents.TeamMemberAdded
  | TeamEvents.TeamMemberRemoved
  | TeamEvents.TeamMemberRoleChanged
  | SecurityEvents.SecurityThreatDetected
  | SecurityEvents.RateLimitExceeded
  | SecurityEvents.SuspiciousLocationLogin
  | SecurityEvents.UnusualDeviceLogin
  | SecurityEvents.DataBreach
  | SecurityEvents.PasswordPolicyViolation
  | SecurityEvents.ApiKeyCompromised
  | SystemEvents.SystemStarted
  | SystemEvents.SystemShutdown
  | SystemEvents.HealthCheckFailed
  | SystemEvents.ResourceLimitReached
  | SystemEvents.ConfigurationChanged
  | SystemEvents.DatabaseMigration
  | SystemEvents.BackupCreated
  | SystemEvents.BackupRestored
  | PluginEvents.PluginRegistered
  | PluginEvents.PluginUnregistered
  | PluginEvents.PluginEnabled
  | PluginEvents.PluginDisabled
  | PluginEvents.PluginError
  | PluginEvents.PluginConfigChanged
  | WebhookEvents.WebhookDelivered
  | WebhookEvents.WebhookFailed
  | WebhookEvents.WebhookCreated
  | WebhookEvents.WebhookUpdated
  | WebhookEvents.WebhookDeleted
  | NotificationEvents.NotificationSent
  | NotificationEvents.NotificationRead
  | NotificationEvents.NotificationClicked
  | NotificationEvents.NotificationDismissed;

/**
 * Event emitter interface
 */
export interface EventEmitter {
  /** Add event listener */
  on<T extends CFAuthEvent>(eventType: T['type'], handler: EventHandler<T>): void;
  
  /** Add one-time event listener */
  once<T extends CFAuthEvent>(eventType: T['type'], handler: EventHandler<T>): void;
  
  /** Remove event listener */
  off<T extends CFAuthEvent>(eventType: T['type'], handler: EventHandler<T>): void;
  
  /** Emit event */
  emit<T extends CFAuthEvent>(event: T): Promise<void>;
  
  /** Get listener count */
  listenerCount(eventType: string): number;
  
  /** Remove all listeners */
  removeAllListeners(eventType?: string): void;
  
  /** Get event names */
  eventNames(): string[];
  
  /** Get max listeners */
  getMaxListeners(): number;
  
  /** Set max listeners */
  setMaxListeners(n: number): void;
}

/**
 * Event bus interface
 */
export interface EventBus extends EventEmitter {
  /** Subscribe to event pattern */
  subscribe(pattern: string, handler: EventHandler): string;
  
  /** Unsubscribe from event pattern */
  unsubscribe(subscriptionId: string): void;
  
  /** Publish event to specific channel */
  publish(channel: string, event: CFAuthEvent): Promise<void>;
  
  /** Create event channel */
  createChannel(name: string, config?: ChannelConfig): EventChannel;
  
  /** Get event channel */
  getChannel(name: string): EventChannel | null;
  
  /** List all channels */
  listChannels(): EventChannel[];
  
  /** Close event bus */
  close(): Promise<void>;
}

/**
 * Event channel configuration
 */
export interface ChannelConfig {
  /** Channel capacity */
  capacity?: number;
  
  /** Message TTL */
  messageTtl?: number;
  
  /** Channel persistence */
  persistent?: boolean;
  
  /** Channel filter */
  filter?: (event: CFAuthEvent) => boolean;
  
  /** Channel transformer */
  transformer?: (event: CFAuthEvent) => CFAuthEvent;
  
  /** Channel middleware */
  middleware?: EventMiddleware[];
}

/**
 * Event channel interface
 */
export interface EventChannel {
  /** Channel name */
  name: string;
  
  /** Channel configuration */
  config: ChannelConfig;
  
  /** Send event to channel */
  send(event: CFAuthEvent): Promise<void>;
  
  /** Receive events from channel */
  receive(handler: EventHandler): string;
  
  /** Stop receiving events */
  stop(subscriptionId: string): void;
  
  /** Get channel stats */
  getStats(): ChannelStats;
  
  /** Close channel */
  close(): Promise<void>;
}

/**
 * Channel statistics
 */
export interface ChannelStats {
  /** Channel name */
  name: string;
  
  /** Message count */
  messageCount: number;
  
  /** Active subscribers */
  subscriberCount: number;
  
  /** Messages per second */
  messagesPerSecond: number;
  
  /** Average message size */
  averageMessageSize: number;
  
  /** Channel uptime */
  uptime: number;
  
  /** Last message timestamp */
  lastMessageAt?: Date;
}

/**
 * Event middleware interface
 */
export interface EventMiddleware {
  /** Middleware name */
  name: string;
  
  /** Process event */
  process(event: CFAuthEvent, next: (event: CFAuthEvent) => Promise<void>): Promise<void>;
  
  /** Middleware priority */
  priority?: number;
}

/**
 * Event store interface
 */
export interface EventStore {
  /** Store event */
  store(event: CFAuthEvent): Promise<void>;
  
  /** Get events by type */
  getEvents(eventType: string, options?: EventQueryOptions): Promise<CFAuthEvent[]>;
  
  /** Get events by criteria */
  query(criteria: EventQueryCriteria): Promise<CFAuthEvent[]>;
  
  /** Get event by ID */
  getById(id: string): Promise<CFAuthEvent | null>;
  
  /** Delete event */
  delete(id: string): Promise<void>;
  
  /** Get event count */
  count(criteria?: EventQueryCriteria): Promise<number>;
  
  /** Subscribe to new events */
  subscribe(criteria: EventQueryCriteria, handler: EventHandler): string;
  
  /** Unsubscribe from events */
  unsubscribe(subscriptionId: string): void;
}

/**
 * Event query options
 */
export interface EventQueryOptions {
  /** Limit results */
  limit?: number;
  
  /** Skip results */
  skip?: number;
  
  /** Sort field */
  sortBy?: string;
  
  /** Sort direction */
  sortOrder?: 'asc' | 'desc';
  
  /** Start date */
  startDate?: Date;
  
  /** End date */
  endDate?: Date;
  
  /** Include metadata */
  includeMetadata?: boolean;
}

/**
 * Event query criteria
 */
export interface EventQueryCriteria {
  /** Event types */
  types?: string[];
  
  /** Event sources */
  sources?: string[];
  
  /** User IDs */
  userIds?: UserId[];
  
  /** Organization IDs */
  organizationIds?: OrganizationId[];
  
  /** Team IDs */
  teamIds?: TeamId[];
  
  /** Date range */
  dateRange?: {
    start: Date;
    end: Date;
  };
  
  /** Event priorities */
  priorities?: EventPriority[];
  
  /** Event tags */
  tags?: string[];
  
  /** Custom filters */
  custom?: Record<string, any>;
}

/**
 * Event subscription interface
 */
export interface EventSubscription {
  /** Subscription ID */
  id: string;
  
  /** Subscription criteria */
  criteria: EventQueryCriteria;
  
  /** Event handler */
  handler: EventHandler;
  
  /** Subscription status */
  active: boolean;
  
  /** Created timestamp */
  createdAt: Date;
  
  /** Last event timestamp */
  lastEventAt?: Date;
  
  /** Event count */
  eventCount: number;
  
  /** Unsubscribe function */
  unsubscribe(): void;
}

/**
 * Event replay interface
 */
export interface EventReplay {
  /** Replay events from specific timestamp */
  replayFrom(timestamp: Date, handler: EventHandler): Promise<void>;
  
  /** Replay events between dates */
  replayBetween(startDate: Date, endDate: Date, handler: EventHandler): Promise<void>;
  
  /** Replay events by criteria */
  replayByCriteria(criteria: EventQueryCriteria, handler: EventHandler): Promise<void>;
  
  /** Replay specific events */
  replayEvents(eventIds: string[], handler: EventHandler): Promise<void>;
}

/**
 * Event aggregator interface
 */
export interface EventAggregator {
  /** Aggregate events by type */
  aggregateByType(startDate: Date, endDate: Date): Promise<Record<string, number>>;
  
  /** Aggregate events by user */
  aggregateByUser(startDate: Date, endDate: Date): Promise<Record<UserId, number>>;
  
  /** Aggregate events by organization */
  aggregateByOrganization(startDate: Date, endDate: Date): Promise<Record<OrganizationId, number>>;
  
  /** Custom aggregation */
  aggregate(criteria: EventQueryCriteria, groupBy: string): Promise<Record<string, number>>;
  
  /** Get event statistics */
  getStatistics(criteria: EventQueryCriteria): Promise<EventStatistics>;
}

/**
 * Event statistics
 */
export interface EventStatistics {
  /** Total event count */
  totalEvents: number;
  
  /** Events by type */
  eventsByType: Record<string, number>;
  
  /** Events by source */
  eventsBySource: Record<string, number>;
  
  /** Events by priority */
  eventsByPriority: Record<EventPriority, number>;
  
  /** Events over time */
  eventsOverTime: Array<{
    timestamp: Date;
    count: number;
  }>;
  
  /** Top users by event count */
  topUsers: Array<{
    userId: UserId;
    count: number;
  }>;
  
  /** Average events per day */
  averageEventsPerDay: number;
  
  /** Peak event time */
  peakEventTime?: {
    timestamp: Date;
    count: number;
  };
}

/**
 * Real-time event configuration
 */
export interface RealTimeConfig {
  /** Enable real-time events */
  enabled: boolean;
  
  /** Transport type */
  transport: 'websocket' | 'server-sent-events' | 'polling' | 'custom';
  
  /** Transport configuration */
  transportConfig?: ConfigObject;
  
  /** Authentication required */
  requireAuth?: boolean;
  
  /** Rate limiting */
  rateLimit?: {
    max: number;
    window: number;
  };
  
  /** Message compression */
  compression?: boolean;
  
  /** Heartbeat interval */
  heartbeatInterval?: number;
  
  /** Reconnection settings */
  reconnection?: {
    enabled: boolean;
    attempts: number;
    delay: number;
    backoff: 'linear' | 'exponential';
  };
  
  /** Custom event filters */
  filters?: Array<(event: CFAuthEvent) => boolean>;
}

/**
 * Real-time client interface
 */
export interface RealTimeClient {
  /** Connect to server */
  connect(): Promise<void>;
  
  /** Disconnect from server */
  disconnect(): Promise<void>;
  
  /** Subscribe to events */
  subscribe(eventTypes: string[], handler: EventHandler): string;
  
  /** Unsubscribe from events */
  unsubscribe(subscriptionId: string): void;
  
  /** Send event to server */
  send(event: CFAuthEvent): Promise<void>;
  
  /** Connection status */
  isConnected(): boolean;
  
  /** Get connection stats */
  getStats(): {
    connected: boolean;
    reconnections: number;
    messagesReceived: number;
    messagesSent: number;
    uptime: number;
  };
  
  /** Event handlers */
  onConnect(handler: () => void): void;
  onDisconnect(handler: (reason: string) => void): void;
  onError(handler: (error: Error) => void): void;
  onReconnect(handler: () => void): void;
}
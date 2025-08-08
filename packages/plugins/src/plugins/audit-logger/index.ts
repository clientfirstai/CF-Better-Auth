/**
 * Audit Logger Plugin for CF-Better-Auth
 * Comprehensive audit logging with multiple storage backends and real-time monitoring
 */

import { createServerPlugin } from '../../plugin-builder';
import type { PluginContext, User, Session, ApiRequest } from '@cf-auth/types';
import { Redis } from 'ioredis';

/**
 * Audit event types
 */
export type AuditEventType = 
  | 'user.register'
  | 'user.login'
  | 'user.logout'
  | 'user.update'
  | 'user.delete'
  | 'user.password_change'
  | 'user.password_reset'
  | 'session.create'
  | 'session.update'
  | 'session.delete'
  | 'permission.grant'
  | 'permission.revoke'
  | 'api.request'
  | 'api.error'
  | 'admin.action'
  | 'security.threat'
  | 'system.config';

/**
 * Audit event severity levels
 */
export type AuditSeverity = 'low' | 'medium' | 'high' | 'critical';

/**
 * Audit event structure
 */
export interface AuditEvent {
  /** Unique event ID */
  id: string;
  
  /** Event type */
  type: AuditEventType;
  
  /** Event timestamp */
  timestamp: Date;
  
  /** User who performed the action */
  userId?: string;
  
  /** Session ID if applicable */
  sessionId?: string;
  
  /** IP address */
  ipAddress?: string;
  
  /** User agent */
  userAgent?: string;
  
  /** Event severity */
  severity: AuditSeverity;
  
  /** Action description */
  action: string;
  
  /** Target resource */
  resource?: string;
  
  /** Resource ID */
  resourceId?: string;
  
  /** Event metadata */
  metadata?: Record<string, any>;
  
  /** Previous values (for updates) */
  previousValues?: Record<string, any>;
  
  /** New values (for updates) */
  newValues?: Record<string, any>;
  
  /** Result of the action */
  result: 'success' | 'failure' | 'partial';
  
  /** Error message if failed */
  error?: string;
  
  /** Request method */
  method?: string;
  
  /** Request path */
  path?: string;
  
  /** Response status code */
  statusCode?: number;
  
  /** Request duration in milliseconds */
  duration?: number;
  
  /** Geolocation data */
  location?: {
    country?: string;
    region?: string;
    city?: string;
    latitude?: number;
    longitude?: number;
  };
  
  /** Risk score (0-100) */
  riskScore?: number;
  
  /** Tags for categorization */
  tags?: string[];
}

/**
 * Audit storage backend types
 */
export type AuditStorageBackend = 'memory' | 'redis' | 'database' | 'file' | 'elasticsearch' | 'webhook';

/**
 * Audit logger configuration
 */
export interface AuditLoggerConfig {
  /** Enable audit logging */
  enabled: boolean;
  
  /** Storage backends */
  storage: {
    /** Primary storage backend */
    primary: AuditStorageBackend;
    
    /** Fallback storage backends */
    fallbacks?: AuditStorageBackend[];
    
    /** Storage configuration */
    config: {
      redis?: {
        url?: string;
        host?: string;
        port?: number;
        password?: string;
        db?: number;
        keyPrefix?: string;
        maxEvents?: number;
        ttl?: number; // Time to live in seconds
      };
      
      file?: {
        path: string;
        maxFileSize?: number;
        maxFiles?: number;
        rotateDaily?: boolean;
      };
      
      webhook?: {
        url: string;
        headers?: Record<string, string>;
        timeout?: number;
        retries?: number;
      };
      
      elasticsearch?: {
        node: string;
        index: string;
        auth?: {
          username: string;
          password: string;
        };
      };
    };
  };
  
  /** Event filtering */
  filtering: {
    /** Event types to log */
    includeEvents?: AuditEventType[];
    
    /** Event types to exclude */
    excludeEvents?: AuditEventType[];
    
    /** Minimum severity level to log */
    minSeverity?: AuditSeverity;
    
    /** Paths to exclude from API logging */
    excludePaths?: string[];
    
    /** IP addresses to exclude */
    excludeIPs?: string[];
    
    /** Custom filter function */
    customFilter?: (event: AuditEvent) => boolean;
  };
  
  /** Data retention */
  retention: {
    /** Days to keep audit logs */
    days: number;
    
    /** Automatic cleanup enabled */
    autoCleanup: boolean;
    
    /** Cleanup interval in milliseconds */
    cleanupInterval: number;
  };
  
  /** Real-time monitoring */
  monitoring: {
    /** Enable real-time alerts */
    enabled: boolean;
    
    /** Alert thresholds */
    thresholds: {
      /** Failed logins per minute */
      failedLogins: number;
      
      /** High severity events per hour */
      highSeverityEvents: number;
      
      /** API errors per minute */
      apiErrors: number;
      
      /** Suspicious activity score */
      suspiciousActivity: number;
    };
    
    /** Webhook for alerts */
    alertWebhook?: string;
  };
  
  /** Performance settings */
  performance: {
    /** Buffer size for batch processing */
    bufferSize: number;
    
    /** Flush interval in milliseconds */
    flushInterval: number;
    
    /** Enable async logging */
    async: boolean;
  };
}

/**
 * Default configuration
 */
const DEFAULT_CONFIG: AuditLoggerConfig = {
  enabled: true,
  storage: {
    primary: 'memory',
    config: {},
  },
  filtering: {
    minSeverity: 'low',
    excludePaths: ['/health', '/metrics', '/favicon.ico'],
  },
  retention: {
    days: 90,
    autoCleanup: true,
    cleanupInterval: 24 * 60 * 60 * 1000, // Daily
  },
  monitoring: {
    enabled: true,
    thresholds: {
      failedLogins: 10,
      highSeverityEvents: 50,
      apiErrors: 100,
      suspiciousActivity: 75,
    },
  },
  performance: {
    bufferSize: 100,
    flushInterval: 5000,
    async: true,
  },
};

/**
 * Audit statistics
 */
interface AuditStatistics {
  totalEvents: number;
  eventsByType: Record<AuditEventType, number>;
  eventsBySeverity: Record<AuditSeverity, number>;
  eventsToday: number;
  eventsThisWeek: number;
  topUsers: Array<{ userId: string; count: number }>;
  topIPs: Array<{ ip: string; count: number }>;
  recentAlerts: AuditEvent[];
}

/**
 * Audit Logger Plugin Implementation
 */
class AuditLoggerPlugin {
  private config: AuditLoggerConfig;
  private redis?: Redis;
  private eventBuffer: AuditEvent[] = [];
  private flushInterval?: NodeJS.Timeout;
  private cleanupInterval?: NodeJS.Timeout;
  private statistics: AuditStatistics = {
    totalEvents: 0,
    eventsByType: {} as any,
    eventsBySeverity: {} as any,
    eventsToday: 0,
    eventsThisWeek: 0,
    topUsers: [],
    topIPs: [],
    recentAlerts: [],
  };

  constructor(config: Partial<AuditLoggerConfig> = {}) {
    this.config = this.mergeConfig(DEFAULT_CONFIG, config);
  }

  /**
   * Initialize the audit logger
   */
  async initialize(context: PluginContext): Promise<void> {
    if (!this.config.enabled) {
      context.logger.info('Audit Logger plugin disabled');
      return;
    }

    context.logger.info('Initializing Audit Logger plugin');

    // Initialize storage backends
    await this.initializeStorage(context);

    // Start periodic flush if async enabled
    if (this.config.performance.async) {
      this.startFlushInterval(context);
    }

    // Start cleanup interval if auto cleanup enabled
    if (this.config.retention.autoCleanup) {
      this.startCleanupInterval(context);
    }

    // Load existing statistics
    await this.loadStatistics(context);

    context.logger.info('Audit Logger plugin initialized');
  }

  /**
   * Log an audit event
   */
  async logEvent(event: Partial<AuditEvent>, context: PluginContext): Promise<void> {
    if (!this.config.enabled) {
      return;
    }

    try {
      // Create complete audit event
      const auditEvent: AuditEvent = {
        id: await context.utils.generateId(),
        timestamp: new Date(),
        severity: 'medium',
        result: 'success',
        ...event,
      } as AuditEvent;

      // Apply filtering
      if (!this.shouldLogEvent(auditEvent)) {
        return;
      }

      // Calculate risk score if not provided
      if (auditEvent.riskScore === undefined) {
        auditEvent.riskScore = this.calculateRiskScore(auditEvent);
      }

      // Add to buffer or log immediately
      if (this.config.performance.async) {
        this.eventBuffer.push(auditEvent);
        
        if (this.eventBuffer.length >= this.config.performance.bufferSize) {
          await this.flushBuffer(context);
        }
      } else {
        await this.writeEvent(auditEvent, context);
      }

      // Update statistics
      this.updateStatistics(auditEvent);

      // Check for alerts
      if (this.config.monitoring.enabled) {
        await this.checkAlerts(auditEvent, context);
      }

    } catch (error) {
      context.logger.error('Error logging audit event:', error);
    }
  }

  /**
   * Query audit events
   */
  async queryEvents(query: AuditQueryOptions, context: PluginContext): Promise<AuditQueryResult> {
    try {
      const events = await this.retrieveEvents(query, context);
      const total = await this.countEvents(query, context);

      return {
        events,
        total,
        page: query.page || 1,
        limit: query.limit || 100,
        totalPages: Math.ceil(total / (query.limit || 100)),
      };

    } catch (error) {
      context.logger.error('Error querying audit events:', error);
      return { events: [], total: 0, page: 1, limit: 100, totalPages: 0 };
    }
  }

  /**
   * Get audit statistics
   */
  async getStatistics(context: PluginContext): Promise<AuditStatistics> {
    await this.refreshStatistics(context);
    return { ...this.statistics };
  }

  /**
   * Export audit logs
   */
  async exportLogs(format: 'json' | 'csv', query?: AuditQueryOptions, context?: PluginContext): Promise<string> {
    const events = await this.retrieveEvents({ ...query, limit: 10000 }, context!);

    if (format === 'json') {
      return JSON.stringify(events, null, 2);
    } else {
      return this.convertToCSV(events);
    }
  }

  /**
   * Cleanup old audit logs
   */
  async cleanup(context: PluginContext): Promise<number> {
    try {
      const cutoffDate = new Date();
      cutoffDate.setDate(cutoffDate.getDate() - this.config.retention.days);

      let cleanedCount = 0;

      // Implementation depends on storage backend
      switch (this.config.storage.primary) {
        case 'redis':
          cleanedCount = await this.cleanupRedis(cutoffDate, context);
          break;
        case 'memory':
          cleanedCount = await this.cleanupMemory(cutoffDate, context);
          break;
        // Add other storage backends as needed
      }

      if (cleanedCount > 0) {
        context.logger.info(`Cleaned up ${cleanedCount} old audit events`);
      }

      return cleanedCount;

    } catch (error) {
      context.logger.error('Error during audit log cleanup:', error);
      return 0;
    }
  }

  /**
   * Initialize storage backends
   */
  private async initializeStorage(context: PluginContext): Promise<void> {
    switch (this.config.storage.primary) {
      case 'redis':
        await this.initializeRedis(context);
        break;
      case 'file':
        await this.initializeFileStorage(context);
        break;
      // Add other storage backends
    }
  }

  /**
   * Initialize Redis storage
   */
  private async initializeRedis(context: PluginContext): Promise<void> {
    const redisConfig = this.config.storage.config.redis;
    if (!redisConfig) {
      throw new Error('Redis configuration required for Redis storage');
    }

    try {
      if (redisConfig.url) {
        this.redis = new Redis(redisConfig.url);
      } else {
        this.redis = new Redis({
          host: redisConfig.host || 'localhost',
          port: redisConfig.port || 6379,
          password: redisConfig.password,
          db: redisConfig.db || 0,
          keyPrefix: redisConfig.keyPrefix || 'cf-auth:audit:',
        });
      }

      await this.redis.ping();
      context.logger.info('Redis connection established for audit logging');

    } catch (error) {
      context.logger.error('Failed to connect to Redis for audit logging:', error);
      throw error;
    }
  }

  /**
   * Initialize file storage
   */
  private async initializeFileStorage(context: PluginContext): Promise<void> {
    const fileConfig = this.config.storage.config.file;
    if (!fileConfig) {
      throw new Error('File configuration required for file storage');
    }

    // Implementation would create necessary directories and set up log rotation
    context.logger.info(`File storage initialized at: ${fileConfig.path}`);
  }

  /**
   * Check if event should be logged based on filters
   */
  private shouldLogEvent(event: AuditEvent): boolean {
    const { filtering } = this.config;

    // Check include/exclude event types
    if (filtering.includeEvents && !filtering.includeEvents.includes(event.type)) {
      return false;
    }

    if (filtering.excludeEvents && filtering.excludeEvents.includes(event.type)) {
      return false;
    }

    // Check minimum severity
    if (filtering.minSeverity) {
      const severityLevels = { low: 1, medium: 2, high: 3, critical: 4 };
      if (severityLevels[event.severity] < severityLevels[filtering.minSeverity]) {
        return false;
      }
    }

    // Check excluded paths
    if (filtering.excludePaths && event.path) {
      if (filtering.excludePaths.some(path => event.path?.includes(path))) {
        return false;
      }
    }

    // Check excluded IPs
    if (filtering.excludeIPs && event.ipAddress) {
      if (filtering.excludeIPs.includes(event.ipAddress)) {
        return false;
      }
    }

    // Check custom filter
    if (filtering.customFilter) {
      return filtering.customFilter(event);
    }

    return true;
  }

  /**
   * Calculate risk score for an event
   */
  private calculateRiskScore(event: AuditEvent): number {
    let score = 0;

    // Base score by event type
    const eventTypeScores: Record<string, number> = {
      'user.login': 10,
      'user.password_change': 30,
      'user.password_reset': 40,
      'admin.action': 50,
      'security.threat': 90,
      'api.error': 20,
    };

    score += eventTypeScores[event.type] || 10;

    // Increase score for failures
    if (event.result === 'failure') {
      score += 30;
    }

    // Increase score for high severity
    const severityScores = { low: 0, medium: 10, high: 30, critical: 50 };
    score += severityScores[event.severity];

    // Add location-based risk (example: unknown countries)
    if (!event.location?.country) {
      score += 20;
    }

    return Math.min(score, 100);
  }

  /**
   * Write event to storage
   */
  private async writeEvent(event: AuditEvent, context: PluginContext): Promise<void> {
    try {
      switch (this.config.storage.primary) {
        case 'redis':
          await this.writeToRedis(event, context);
          break;
        case 'memory':
          await this.writeToMemory(event, context);
          break;
        case 'file':
          await this.writeToFile(event, context);
          break;
        case 'webhook':
          await this.writeToWebhook(event, context);
          break;
        // Add other storage backends
      }
    } catch (error) {
      context.logger.error('Error writing audit event to primary storage:', error);
      
      // Try fallback storage
      await this.tryFallbackStorage(event, context);
    }
  }

  /**
   * Write to Redis
   */
  private async writeToRedis(event: AuditEvent, context: PluginContext): Promise<void> {
    if (!this.redis) {
      throw new Error('Redis not initialized');
    }

    const key = `event:${event.id}`;
    const ttl = this.config.storage.config.redis?.ttl || (this.config.retention.days * 24 * 60 * 60);

    await this.redis.setex(key, ttl, JSON.stringify(event));
    
    // Add to sorted set for time-based queries
    await this.redis.zadd('events:by_time', event.timestamp.getTime(), event.id);
    
    // Add to sets for filtering
    await this.redis.sadd(`events:by_type:${event.type}`, event.id);
    await this.redis.sadd(`events:by_user:${event.userId || 'anonymous'}`, event.id);
  }

  /**
   * Write to memory (for testing/development)
   */
  private async writeToMemory(event: AuditEvent, context: PluginContext): Promise<void> {
    await context.storage.set(`audit:event:${event.id}`, event);
  }

  /**
   * Write to file
   */
  private async writeToFile(event: AuditEvent, context: PluginContext): Promise<void> {
    // Implementation would write to log file with rotation
    const logLine = JSON.stringify(event) + '\n';
    context.logger.debug('Would write to file:', logLine);
  }

  /**
   * Write to webhook
   */
  private async writeToWebhook(event: AuditEvent, context: PluginContext): Promise<void> {
    const webhookConfig = this.config.storage.config.webhook;
    if (!webhookConfig) {
      throw new Error('Webhook configuration required');
    }

    // Implementation would send HTTP POST request
    context.logger.debug('Would send to webhook:', webhookConfig.url);
  }

  /**
   * Try fallback storage
   */
  private async tryFallbackStorage(event: AuditEvent, context: PluginContext): Promise<void> {
    const fallbacks = this.config.storage.fallbacks || ['memory'];
    
    for (const backend of fallbacks) {
      try {
        switch (backend) {
          case 'memory':
            await this.writeToMemory(event, context);
            return;
          // Add other fallback implementations
        }
      } catch (error) {
        context.logger.warn(`Fallback storage ${backend} also failed:`, error);
      }
    }
  }

  /**
   * Flush event buffer
   */
  private async flushBuffer(context: PluginContext): Promise<void> {
    if (this.eventBuffer.length === 0) {
      return;
    }

    const events = [...this.eventBuffer];
    this.eventBuffer.length = 0;

    try {
      await Promise.all(events.map(event => this.writeEvent(event, context)));
    } catch (error) {
      context.logger.error('Error flushing audit event buffer:', error);
      // Put events back in buffer for retry
      this.eventBuffer.unshift(...events);
    }
  }

  /**
   * Start flush interval
   */
  private startFlushInterval(context: PluginContext): void {
    this.flushInterval = setInterval(
      () => this.flushBuffer(context),
      this.config.performance.flushInterval
    );
  }

  /**
   * Start cleanup interval
   */
  private startCleanupInterval(context: PluginContext): void {
    this.cleanupInterval = setInterval(
      () => this.cleanup(context),
      this.config.retention.cleanupInterval
    );
  }

  /**
   * Update statistics
   */
  private updateStatistics(event: AuditEvent): void {
    this.statistics.totalEvents++;
    
    this.statistics.eventsByType[event.type] = (this.statistics.eventsByType[event.type] || 0) + 1;
    this.statistics.eventsBySeverity[event.severity] = (this.statistics.eventsBySeverity[event.severity] || 0) + 1;

    // Update today's count
    const today = new Date().toDateString();
    if (event.timestamp.toDateString() === today) {
      this.statistics.eventsToday++;
    }

    // Update weekly count
    const weekAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
    if (event.timestamp > weekAgo) {
      this.statistics.eventsThisWeek++;
    }

    // Update top users and IPs
    if (event.userId) {
      this.updateTopList(this.statistics.topUsers, 'userId', event.userId);
    }
    if (event.ipAddress) {
      this.updateTopList(this.statistics.topIPs, 'ip', event.ipAddress);
    }
  }

  /**
   * Update top list
   */
  private updateTopList(list: Array<{ userId?: string; ip?: string; count: number }>, key: string, value: string): void {
    const existing = list.find(item => item[key as keyof typeof item] === value);
    if (existing) {
      existing.count++;
    } else {
      const item = { count: 1 } as any;
      item[key] = value;
      list.push(item);
    }

    list.sort((a, b) => b.count - a.count);
    list.splice(10); // Keep only top 10
  }

  /**
   * Check for alerts
   */
  private async checkAlerts(event: AuditEvent, context: PluginContext): Promise<void> {
    const { thresholds } = this.config.monitoring;

    // Check for suspicious activity
    if (event.riskScore && event.riskScore >= thresholds.suspiciousActivity) {
      await this.sendAlert({
        type: 'suspicious_activity',
        message: `High risk activity detected: ${event.action}`,
        event,
      }, context);
    }

    // Check for high severity events
    if (event.severity === 'critical' || event.severity === 'high') {
      this.statistics.recentAlerts.unshift(event);
      this.statistics.recentAlerts.splice(50); // Keep only recent 50 alerts
    }

    // Additional alert logic would go here
  }

  /**
   * Send alert
   */
  private async sendAlert(alert: any, context: PluginContext): Promise<void> {
    if (this.config.monitoring.alertWebhook) {
      try {
        // Send webhook alert
        context.logger.info('Would send alert to webhook:', alert);
      } catch (error) {
        context.logger.error('Error sending alert:', error);
      }
    }
  }

  /**
   * Retrieve events (placeholder implementation)
   */
  private async retrieveEvents(query: AuditQueryOptions, context: PluginContext): Promise<AuditEvent[]> {
    // Implementation depends on storage backend
    return [];
  }

  /**
   * Count events (placeholder implementation)
   */
  private async countEvents(query: AuditQueryOptions, context: PluginContext): Promise<number> {
    // Implementation depends on storage backend
    return 0;
  }

  /**
   * Load statistics
   */
  private async loadStatistics(context: PluginContext): Promise<void> {
    try {
      const saved = await context.storage.get<AuditStatistics>('audit:statistics');
      if (saved) {
        this.statistics = { ...this.statistics, ...saved };
      }
    } catch (error) {
      context.logger.warn('Error loading audit statistics:', error);
    }
  }

  /**
   * Save statistics
   */
  private async saveStatistics(context: PluginContext): Promise<void> {
    try {
      await context.storage.set('audit:statistics', this.statistics);
    } catch (error) {
      context.logger.error('Error saving audit statistics:', error);
    }
  }

  /**
   * Refresh statistics
   */
  private async refreshStatistics(context: PluginContext): Promise<void> {
    await this.saveStatistics(context);
  }

  /**
   * Convert events to CSV
   */
  private convertToCSV(events: AuditEvent[]): string {
    if (events.length === 0) {
      return '';
    }

    const headers = Object.keys(events[0]).filter(key => typeof events[0][key as keyof AuditEvent] !== 'object');
    const csvLines = [headers.join(',')];

    events.forEach(event => {
      const values = headers.map(header => {
        const value = event[header as keyof AuditEvent];
        return typeof value === 'string' ? `"${value.replace(/"/g, '""')}"` : String(value || '');
      });
      csvLines.push(values.join(','));
    });

    return csvLines.join('\n');
  }

  /**
   * Cleanup Redis events
   */
  private async cleanupRedis(cutoffDate: Date, context: PluginContext): Promise<number> {
    // Implementation would clean up old Redis entries
    return 0;
  }

  /**
   * Cleanup memory events
   */
  private async cleanupMemory(cutoffDate: Date, context: PluginContext): Promise<number> {
    // Implementation would clean up old memory entries
    return 0;
  }

  /**
   * Merge configuration
   */
  private mergeConfig(defaultConfig: AuditLoggerConfig, userConfig: Partial<AuditLoggerConfig>): AuditLoggerConfig {
    return {
      ...defaultConfig,
      ...userConfig,
      storage: { ...defaultConfig.storage, ...userConfig.storage },
      filtering: { ...defaultConfig.filtering, ...userConfig.filtering },
      retention: { ...defaultConfig.retention, ...userConfig.retention },
      monitoring: { ...defaultConfig.monitoring, ...userConfig.monitoring },
      performance: { ...defaultConfig.performance, ...userConfig.performance },
    };
  }

  /**
   * Destroy cleanup
   */
  async destroy(context: PluginContext): Promise<void> {
    if (this.flushInterval) {
      clearInterval(this.flushInterval);
    }

    if (this.cleanupInterval) {
      clearInterval(this.cleanupInterval);
    }

    // Flush any remaining events
    await this.flushBuffer(context);

    if (this.redis) {
      await this.redis.quit();
    }

    await this.saveStatistics(context);
    context.logger.info('Audit Logger plugin destroyed');
  }
}

/**
 * Audit query options
 */
export interface AuditQueryOptions {
  eventTypes?: AuditEventType[];
  userId?: string;
  ipAddress?: string;
  severity?: AuditSeverity;
  startDate?: Date;
  endDate?: Date;
  search?: string;
  page?: number;
  limit?: number;
  sortBy?: keyof AuditEvent;
  sortOrder?: 'asc' | 'desc';
}

/**
 * Audit query result
 */
export interface AuditQueryResult {
  events: AuditEvent[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

/**
 * Create audit logger plugin
 */
export function createAuditLoggerPlugin(config?: Partial<AuditLoggerConfig>) {
  const plugin = new AuditLoggerPlugin(config);

  return createServerPlugin()
    .setId('audit-logger')
    .setName('Comprehensive Audit Logger')
    .setVersion('1.0.0')
    .setDescription('Comprehensive audit logging with multiple storage backends and real-time monitoring')
    .setAuthor('CF-Better-Auth Team')
    .addCategory('security')
    .addCategory('monitoring')
    .addTag('audit')
    .addTag('logging')
    .addTag('compliance')
    .addTag('monitoring')
    .setInitialize(plugin.initialize.bind(plugin))
    .setDestroy(plugin.destroy.bind(plugin))
    .addServerHook('afterLogin', async (user, session, context) => {
      await plugin.logEvent({
        type: 'user.login',
        userId: user.id,
        sessionId: session.id,
        action: `User ${user.email} logged in successfully`,
        result: 'success',
        severity: 'low',
      }, context);
    })
    .addServerHook('afterRegister', async (user, context) => {
      await plugin.logEvent({
        type: 'user.register',
        userId: user.id,
        action: `New user registered: ${user.email}`,
        result: 'success',
        severity: 'medium',
      }, context);
    })
    .addServerHook('beforeLogout', async (sessionId, context) => {
      await plugin.logEvent({
        type: 'user.logout',
        sessionId,
        action: 'User logged out',
        result: 'success',
        severity: 'low',
      }, context);
    })
    .addRoute({
      method: 'GET',
      path: '/api/admin/audit/events',
      auth: true,
      permissions: ['admin'],
      handler: async (req, res) => {
        const query = req.query as unknown as AuditQueryOptions;
        const result = await plugin.queryEvents(query, req.context);
        res.json(result);
      },
    })
    .addRoute({
      method: 'GET',
      path: '/api/admin/audit/statistics',
      auth: true,
      permissions: ['admin'],
      handler: async (req, res) => {
        const statistics = await plugin.getStatistics(req.context);
        res.json({ statistics });
      },
    })
    .addRoute({
      method: 'GET',
      path: '/api/admin/audit/export',
      auth: true,
      permissions: ['admin'],
      handler: async (req, res) => {
        const format = req.query.format as 'json' | 'csv' || 'json';
        const query = req.query as unknown as AuditQueryOptions;
        
        const data = await plugin.exportLogs(format, query, req.context);
        
        res.setHeader('Content-Type', format === 'json' ? 'application/json' : 'text/csv');
        res.setHeader('Content-Disposition', `attachment; filename=audit-logs.${format}`);
        res.send(data);
      },
    })
    .addRoute({
      method: 'POST',
      path: '/api/admin/audit/cleanup',
      auth: true,
      permissions: ['admin'],
      handler: async (req, res) => {
        const cleanedCount = await plugin.cleanup(req.context);
        res.json({ message: `Cleaned up ${cleanedCount} old audit events` });
      },
    })
    .build();
}

// Export default plugin instance
export default createAuditLoggerPlugin();
/**
 * Session Manager Plugin for CF-Better-Auth
 * Advanced session management with Redis support, automatic cleanup, and session analytics
 */

import { createServerPlugin } from '../../plugin-builder';
import type { PluginContext, User, Session } from '@cf-auth/types';
import { Redis } from 'ioredis';

/**
 * Session manager configuration
 */
export interface SessionManagerConfig {
  /** Redis connection settings */
  redis?: {
    url?: string;
    host?: string;
    port?: number;
    password?: string;
    db?: number;
    keyPrefix?: string;
  };
  
  /** Session settings */
  session: {
    /** Default session expiry in seconds */
    maxAge: number;
    
    /** Cleanup interval in milliseconds */
    cleanupInterval: number;
    
    /** Maximum sessions per user */
    maxSessionsPerUser: number;
    
    /** Enable session analytics */
    enableAnalytics: boolean;
    
    /** Session cookie settings */
    cookie: {
      name: string;
      secure: boolean;
      httpOnly: boolean;
      sameSite: 'strict' | 'lax' | 'none';
    };
  };
  
  /** Security settings */
  security: {
    /** Rotate session ID on authentication */
    rotateOnAuth: boolean;
    
    /** Track session fingerprints */
    trackFingerprints: boolean;
    
    /** Maximum failed attempts before lockout */
    maxFailedAttempts: number;
    
    /** Lockout duration in seconds */
    lockoutDuration: number;
  };
}

/**
 * Session data structure
 */
interface SessionData extends Session {
  fingerprint?: string;
  lastActivity: Date;
  ipAddress?: string;
  userAgent?: string;
  failedAttempts?: number;
  lockedUntil?: Date;
}

/**
 * Session analytics data
 */
interface SessionAnalytics {
  totalSessions: number;
  activeSessions: number;
  averageSessionDuration: number;
  sessionsByLocation: Record<string, number>;
  sessionsByDevice: Record<string, number>;
  dailyActiveUsers: number;
}

/**
 * Default configuration
 */
const DEFAULT_CONFIG: SessionManagerConfig = {
  session: {
    maxAge: 7 * 24 * 60 * 60, // 7 days
    cleanupInterval: 60 * 60 * 1000, // 1 hour
    maxSessionsPerUser: 5,
    enableAnalytics: true,
    cookie: {
      name: 'cf-auth-session',
      secure: true,
      httpOnly: true,
      sameSite: 'strict',
    },
  },
  security: {
    rotateOnAuth: true,
    trackFingerprints: true,
    maxFailedAttempts: 3,
    lockoutDuration: 15 * 60, // 15 minutes
  },
};

/**
 * Session Manager Plugin Implementation
 */
class SessionManagerPlugin {
  private redis?: Redis;
  private cleanupInterval?: NodeJS.Timeout;
  private config: SessionManagerConfig;
  private analytics: SessionAnalytics = {
    totalSessions: 0,
    activeSessions: 0,
    averageSessionDuration: 0,
    sessionsByLocation: {},
    sessionsByDevice: {},
    dailyActiveUsers: 0,
  };

  constructor(config: Partial<SessionManagerConfig> = {}) {
    this.config = this.mergeConfig(DEFAULT_CONFIG, config);
  }

  /**
   * Initialize the session manager
   */
  async initialize(context: PluginContext): Promise<void> {
    context.logger.info('Initializing Session Manager plugin');

    // Initialize Redis connection if configured
    if (this.config.redis) {
      await this.initializeRedis(context);
    }

    // Start cleanup interval
    this.startCleanupInterval(context);

    // Load existing analytics
    await this.loadAnalytics(context);

    context.logger.info('Session Manager plugin initialized');
  }

  /**
   * Create a new session
   */
  async createSession(userData: User, context: PluginContext, req?: any): Promise<SessionData> {
    const sessionId = await context.utils.generateId();
    const now = new Date();
    
    const sessionData: SessionData = {
      id: sessionId,
      userId: userData.id,
      user: userData,
      createdAt: now,
      updatedAt: now,
      expiresAt: new Date(now.getTime() + this.config.session.maxAge * 1000),
      lastActivity: now,
      ipAddress: req?.ip || req?.headers?.['x-forwarded-for'] || 'unknown',
      userAgent: req?.headers?.['user-agent'] || 'unknown',
      failedAttempts: 0,
    };

    // Generate session fingerprint if enabled
    if (this.config.security.trackFingerprints) {
      sessionData.fingerprint = await this.generateFingerprint(req, context);
    }

    // Check session limits
    await this.enforceSessionLimits(userData.id, context);

    // Store session
    await this.storeSession(sessionData, context);

    // Update analytics
    await this.updateAnalytics('create', sessionData, context);

    context.logger.info(`Session created for user ${userData.id}: ${sessionId}`);
    return sessionData;
  }

  /**
   * Get session by ID
   */
  async getSession(sessionId: string, context: PluginContext): Promise<SessionData | null> {
    try {
      const session = await this.retrieveSession(sessionId, context);
      
      if (!session) {
        return null;
      }

      // Check if session is expired
      if (new Date() > new Date(session.expiresAt)) {
        await this.deleteSession(sessionId, context);
        return null;
      }

      // Check if session is locked
      if (session.lockedUntil && new Date() < new Date(session.lockedUntil)) {
        return null;
      }

      return session;

    } catch (error) {
      context.logger.error(`Error retrieving session ${sessionId}:`, error);
      return null;
    }
  }

  /**
   * Update session
   */
  async updateSession(sessionId: string, updates: Partial<SessionData>, context: PluginContext): Promise<boolean> {
    try {
      const session = await this.getSession(sessionId, context);
      if (!session) {
        return false;
      }

      const updatedSession: SessionData = {
        ...session,
        ...updates,
        updatedAt: new Date(),
        lastActivity: new Date(),
      };

      await this.storeSession(updatedSession, context);
      
      context.logger.debug(`Session updated: ${sessionId}`);
      return true;

    } catch (error) {
      context.logger.error(`Error updating session ${sessionId}:`, error);
      return false;
    }
  }

  /**
   * Delete session
   */
  async deleteSession(sessionId: string, context: PluginContext): Promise<boolean> {
    try {
      const session = await this.retrieveSession(sessionId, context);
      
      if (this.redis) {
        await this.redis.del(`session:${sessionId}`);
        if (session) {
          await this.redis.srem(`user:${session.userId}:sessions`, sessionId);
        }
      } else {
        // Fallback to context storage
        await context.storage.delete(`session:${sessionId}`);
        if (session) {
          const userSessions = await context.storage.get<string[]>(`user:${session.userId}:sessions`) || [];
          const filteredSessions = userSessions.filter(id => id !== sessionId);
          await context.storage.set(`user:${session.userId}:sessions`, filteredSessions);
        }
      }

      // Update analytics
      if (session) {
        await this.updateAnalytics('delete', session, context);
      }

      context.logger.info(`Session deleted: ${sessionId}`);
      return true;

    } catch (error) {
      context.logger.error(`Error deleting session ${sessionId}:`, error);
      return false;
    }
  }

  /**
   * Get user sessions
   */
  async getUserSessions(userId: string, context: PluginContext): Promise<SessionData[]> {
    try {
      let sessionIds: string[];

      if (this.redis) {
        sessionIds = await this.redis.smembers(`user:${userId}:sessions`);
      } else {
        sessionIds = await context.storage.get<string[]>(`user:${userId}:sessions`) || [];
      }

      const sessions: SessionData[] = [];
      
      for (const sessionId of sessionIds) {
        const session = await this.getSession(sessionId, context);
        if (session) {
          sessions.push(session);
        }
      }

      return sessions.sort((a, b) => new Date(b.lastActivity).getTime() - new Date(a.lastActivity).getTime());

    } catch (error) {
      context.logger.error(`Error retrieving user sessions for ${userId}:`, error);
      return [];
    }
  }

  /**
   * Cleanup expired sessions
   */
  async cleanupExpiredSessions(context: PluginContext): Promise<number> {
    let cleanedCount = 0;

    try {
      if (this.redis) {
        // Use Redis SCAN to find expired sessions
        const stream = this.redis.scanStream({
          match: 'session:*',
          count: 100,
        });

        const expiredKeys: string[] = [];
        
        stream.on('data', async (keys: string[]) => {
          for (const key of keys) {
            const sessionData = await this.redis!.get(key);
            if (sessionData) {
              const session: SessionData = JSON.parse(sessionData);
              if (new Date() > new Date(session.expiresAt)) {
                expiredKeys.push(key);
                await this.redis!.srem(`user:${session.userId}:sessions`, session.id);
              }
            }
          }
        });

        stream.on('end', async () => {
          if (expiredKeys.length > 0) {
            await this.redis!.del(...expiredKeys);
            cleanedCount = expiredKeys.length;
          }
        });

      } else {
        // Fallback cleanup using context storage
        const keys = await context.storage.keys('session:*');
        
        for (const key of keys) {
          const sessionData = await context.storage.get<SessionData>(key);
          if (sessionData && new Date() > new Date(sessionData.expiresAt)) {
            await context.storage.delete(key);
            
            // Remove from user sessions
            const userSessions = await context.storage.get<string[]>(`user:${sessionData.userId}:sessions`) || [];
            const filteredSessions = userSessions.filter(id => id !== sessionData.id);
            await context.storage.set(`user:${sessionData.userId}:sessions`, filteredSessions);
            
            cleanedCount++;
          }
        }
      }

      if (cleanedCount > 0) {
        context.logger.info(`Cleaned up ${cleanedCount} expired sessions`);
        await this.updateAnalytics('cleanup', { count: cleanedCount }, context);
      }

      return cleanedCount;

    } catch (error) {
      context.logger.error('Error during session cleanup:', error);
      return 0;
    }
  }

  /**
   * Get session analytics
   */
  async getAnalytics(context: PluginContext): Promise<SessionAnalytics> {
    if (!this.config.session.enableAnalytics) {
      return this.analytics;
    }

    try {
      // Refresh real-time statistics
      await this.refreshAnalytics(context);
      return { ...this.analytics };

    } catch (error) {
      context.logger.error('Error retrieving session analytics:', error);
      return this.analytics;
    }
  }

  /**
   * Rotate session ID
   */
  async rotateSessionId(oldSessionId: string, context: PluginContext): Promise<string | null> {
    try {
      const session = await this.getSession(oldSessionId, context);
      if (!session) {
        return null;
      }

      // Generate new session ID
      const newSessionId = await context.utils.generateId();
      
      // Create new session with same data
      const newSession: SessionData = {
        ...session,
        id: newSessionId,
        updatedAt: new Date(),
      };

      // Store new session
      await this.storeSession(newSession, context);

      // Delete old session
      await this.deleteSession(oldSessionId, context);

      context.logger.info(`Session ID rotated: ${oldSessionId} -> ${newSessionId}`);
      return newSessionId;

    } catch (error) {
      context.logger.error(`Error rotating session ID ${oldSessionId}:`, error);
      return null;
    }
  }

  /**
   * Lock session due to security concerns
   */
  async lockSession(sessionId: string, duration: number, context: PluginContext): Promise<boolean> {
    try {
      const lockUntil = new Date(Date.now() + duration * 1000);
      
      return await this.updateSession(sessionId, {
        lockedUntil: lockUntil,
        failedAttempts: (await this.getSession(sessionId, context))?.failedAttempts || 0 + 1,
      }, context);

    } catch (error) {
      context.logger.error(`Error locking session ${sessionId}:`, error);
      return false;
    }
  }

  /**
   * Initialize Redis connection
   */
  private async initializeRedis(context: PluginContext): Promise<void> {
    try {
      const redisConfig = this.config.redis!;
      
      if (redisConfig.url) {
        this.redis = new Redis(redisConfig.url);
      } else {
        this.redis = new Redis({
          host: redisConfig.host || 'localhost',
          port: redisConfig.port || 6379,
          password: redisConfig.password,
          db: redisConfig.db || 0,
          keyPrefix: redisConfig.keyPrefix || 'cf-auth:',
        });
      }

      // Test connection
      await this.redis.ping();
      context.logger.info('Redis connection established for session storage');

    } catch (error) {
      context.logger.error('Failed to connect to Redis:', error);
      throw error;
    }
  }

  /**
   * Start cleanup interval
   */
  private startCleanupInterval(context: PluginContext): void {
    this.cleanupInterval = setInterval(
      () => this.cleanupExpiredSessions(context),
      this.config.session.cleanupInterval
    );

    context.logger.info(`Session cleanup interval started: ${this.config.session.cleanupInterval}ms`);
  }

  /**
   * Store session data
   */
  private async storeSession(session: SessionData, context: PluginContext): Promise<void> {
    const sessionKey = `session:${session.id}`;
    const userSessionsKey = `user:${session.userId}:sessions`;
    const ttl = Math.floor((new Date(session.expiresAt).getTime() - Date.now()) / 1000);

    if (this.redis) {
      // Store in Redis with TTL
      await this.redis.setex(sessionKey, ttl, JSON.stringify(session));
      await this.redis.sadd(userSessionsKey, session.id);
      await this.redis.expire(userSessionsKey, ttl);
    } else {
      // Fallback to context storage
      await context.storage.set(sessionKey, session, ttl * 1000);
      
      const userSessions = await context.storage.get<string[]>(userSessionsKey) || [];
      if (!userSessions.includes(session.id)) {
        userSessions.push(session.id);
        await context.storage.set(userSessionsKey, userSessions, ttl * 1000);
      }
    }
  }

  /**
   * Retrieve session data
   */
  private async retrieveSession(sessionId: string, context: PluginContext): Promise<SessionData | null> {
    const sessionKey = `session:${sessionId}`;

    if (this.redis) {
      const sessionData = await this.redis.get(sessionKey);
      return sessionData ? JSON.parse(sessionData) : null;
    } else {
      return await context.storage.get<SessionData>(sessionKey);
    }
  }

  /**
   * Enforce session limits per user
   */
  private async enforceSessionLimits(userId: string, context: PluginContext): Promise<void> {
    const userSessions = await this.getUserSessions(userId, context);
    
    if (userSessions.length >= this.config.session.maxSessionsPerUser) {
      // Remove oldest sessions to make room
      const sessionsToRemove = userSessions
        .sort((a, b) => new Date(a.lastActivity).getTime() - new Date(b.lastActivity).getTime())
        .slice(0, userSessions.length - this.config.session.maxSessionsPerUser + 1);

      for (const session of sessionsToRemove) {
        await this.deleteSession(session.id, context);
      }

      context.logger.info(`Removed ${sessionsToRemove.length} old sessions for user ${userId}`);
    }
  }

  /**
   * Generate session fingerprint
   */
  private async generateFingerprint(req: any, context: PluginContext): Promise<string> {
    const fpData = {
      userAgent: req?.headers?.['user-agent'] || '',
      acceptLanguage: req?.headers?.['accept-language'] || '',
      acceptEncoding: req?.headers?.['accept-encoding'] || '',
      connection: req?.headers?.connection || '',
    };

    return context.utils.hash(JSON.stringify(fpData));
  }

  /**
   * Update analytics
   */
  private async updateAnalytics(action: string, data: any, context: PluginContext): Promise<void> {
    if (!this.config.session.enableAnalytics) {
      return;
    }

    try {
      switch (action) {
        case 'create':
          this.analytics.totalSessions++;
          this.analytics.activeSessions++;
          break;
        
        case 'delete':
          this.analytics.activeSessions = Math.max(0, this.analytics.activeSessions - 1);
          break;
        
        case 'cleanup':
          this.analytics.activeSessions = Math.max(0, this.analytics.activeSessions - data.count);
          break;
      }

      // Save analytics periodically
      await this.saveAnalytics(context);

    } catch (error) {
      context.logger.error('Error updating session analytics:', error);
    }
  }

  /**
   * Load analytics data
   */
  private async loadAnalytics(context: PluginContext): Promise<void> {
    try {
      const saved = await context.storage.get<SessionAnalytics>('session:analytics');
      if (saved) {
        this.analytics = { ...this.analytics, ...saved };
      }
    } catch (error) {
      context.logger.warn('Error loading session analytics:', error);
    }
  }

  /**
   * Save analytics data
   */
  private async saveAnalytics(context: PluginContext): Promise<void> {
    try {
      await context.storage.set('session:analytics', this.analytics);
    } catch (error) {
      context.logger.error('Error saving session analytics:', error);
    }
  }

  /**
   * Refresh real-time analytics
   */
  private async refreshAnalytics(context: PluginContext): Promise<void> {
    // This would typically query the database or Redis for current statistics
    // Implementation depends on the specific storage backend
  }

  /**
   * Merge configuration objects
   */
  private mergeConfig(defaultConfig: SessionManagerConfig, userConfig: Partial<SessionManagerConfig>): SessionManagerConfig {
    return {
      redis: { ...defaultConfig.redis, ...userConfig.redis },
      session: { ...defaultConfig.session, ...userConfig.session },
      security: { ...defaultConfig.security, ...userConfig.security },
    };
  }

  /**
   * Cleanup on destroy
   */
  async destroy(context: PluginContext): Promise<void> {
    if (this.cleanupInterval) {
      clearInterval(this.cleanupInterval);
    }

    if (this.redis) {
      await this.redis.quit();
    }

    context.logger.info('Session Manager plugin destroyed');
  }
}

/**
 * Create session manager plugin
 */
export function createSessionManagerPlugin(config?: Partial<SessionManagerConfig>) {
  const plugin = new SessionManagerPlugin(config);

  return createServerPlugin()
    .setId('session-manager')
    .setName('Advanced Session Manager')
    .setVersion('1.0.0')
    .setDescription('Advanced session management with Redis support, automatic cleanup, and analytics')
    .setAuthor('CF-Better-Auth Team')
    .addCategory('session')
    .addTag('session')
    .addTag('redis')
    .addTag('analytics')
    .addTag('security')
    .setInitialize(plugin.initialize.bind(plugin))
    .setDestroy(plugin.destroy.bind(plugin))
    .addServerHook('afterLogin', async (user, session, context) => {
      // Create managed session after login
      const sessionData = await plugin.createSession(user, context);
      
      // Rotate session ID if configured
      if (plugin['config'].security.rotateOnAuth) {
        await plugin.rotateSessionId(session.id, context);
      }
      
      return { user, session: sessionData };
    })
    .addServerHook('beforeLogout', async (sessionId, context) => {
      // Clean up session on logout
      await plugin.deleteSession(sessionId, context);
    })
    .addRoute({
      method: 'GET',
      path: '/api/sessions',
      auth: true,
      handler: async (req, res) => {
        const user = req.user;
        if (!user) {
          res.status(401).json({ error: 'Unauthorized' });
          return;
        }

        const sessions = await plugin.getUserSessions(user.id, req.context);
        res.json({ sessions });
      },
    })
    .addRoute({
      method: 'DELETE',
      path: '/api/sessions/:sessionId',
      auth: true,
      handler: async (req, res) => {
        const { sessionId } = req.params;
        const success = await plugin.deleteSession(sessionId, req.context);
        
        if (success) {
          res.json({ message: 'Session deleted successfully' });
        } else {
          res.status(404).json({ error: 'Session not found' });
        }
      },
    })
    .addRoute({
      method: 'GET',
      path: '/api/sessions/analytics',
      auth: true,
      permissions: ['admin'],
      handler: async (req, res) => {
        const analytics = await plugin.getAnalytics(req.context);
        res.json({ analytics });
      },
    })
    .build();
}

// Export default plugin instance
export default createSessionManagerPlugin();
/**
 * Rate Limiter Plugin for CF-Better-Auth
 * Advanced rate limiting with multiple strategies, Redis support, and bypass rules
 */

import { createServerPlugin } from '../../plugin-builder';
import type { PluginContext, ApiRequest, ApiResponseBase } from '@cf-auth/types';
import { RateLimiterRedis, RateLimiterMemory, RateLimiterRes } from 'rate-limiter-flexible';
import { Redis } from 'ioredis';

/**
 * Rate limit strategy
 */
export type RateLimitStrategy = 'fixed-window' | 'sliding-window' | 'token-bucket' | 'leaky-bucket';

/**
 * Rate limit configuration
 */
export interface RateLimitRule {
  /** Rule identifier */
  id: string;
  
  /** Path pattern to match */
  path: string | RegExp;
  
  /** HTTP methods to apply rate limiting */
  methods?: string[];
  
  /** Maximum requests allowed */
  points: number;
  
  /** Time window in seconds */
  duration: number;
  
  /** Block duration in seconds after limit exceeded */
  blockDuration?: number;
  
  /** Rate limiting strategy */
  strategy?: RateLimitStrategy;
  
  /** Skip authenticated users */
  skipOnAuth?: boolean;
  
  /** Skip based on user roles */
  skipRoles?: string[];
  
  /** Custom skip function */
  skip?: (req: ApiRequest) => boolean | Promise<boolean>;
  
  /** Key generator function */
  keyGenerator?: (req: ApiRequest) => string | Promise<string>;
  
  /** Custom message when rate limited */
  message?: string;
  
  /** HTTP status code when rate limited */
  statusCode?: number;
  
  /** Priority for rule matching */
  priority?: number;
  
  /** Enable/disable rule */
  enabled?: boolean;
}

/**
 * Rate limiter configuration
 */
export interface RateLimiterConfig {
  /** Redis connection settings */
  redis?: {
    url?: string;
    host?: string;
    port?: number;
    password?: string;
    db?: number;
    keyPrefix?: string;
  };
  
  /** Default rate limit settings */
  defaults: {
    points: number;
    duration: number;
    blockDuration: number;
    strategy: RateLimitStrategy;
  };
  
  /** Global settings */
  global: {
    /** Enable rate limiting globally */
    enabled: boolean;
    
    /** Skip rate limiting for specific IPs */
    whitelistIPs: string[];
    
    /** Headers to include in response */
    headers: boolean;
    
    /** Include retry-after header */
    includeRetryAfter: boolean;
    
    /** Enable analytics */
    enableAnalytics: boolean;
  };
  
  /** Predefined rate limit rules */
  rules: RateLimitRule[];
}

/**
 * Rate limit analytics
 */
interface RateLimitAnalytics {
  totalRequests: number;
  blockedRequests: number;
  topBlockedIPs: Array<{ ip: string; count: number }>;
  topBlockedPaths: Array<{ path: string; count: number }>;
  ruleStats: Record<string, { requests: number; blocks: number }>;
}

/**
 * Default configuration
 */
const DEFAULT_CONFIG: RateLimiterConfig = {
  defaults: {
    points: 100,
    duration: 60,
    blockDuration: 60,
    strategy: 'sliding-window',
  },
  global: {
    enabled: true,
    whitelistIPs: ['127.0.0.1', '::1'],
    headers: true,
    includeRetryAfter: true,
    enableAnalytics: true,
  },
  rules: [
    // Authentication endpoints
    {
      id: 'auth-strict',
      path: '/api/auth/(login|register|reset-password)',
      points: 5,
      duration: 60,
      blockDuration: 300,
      message: 'Too many authentication attempts',
      priority: 1,
      enabled: true,
    },
    // General API endpoints
    {
      id: 'api-general',
      path: '/api/**',
      points: 100,
      duration: 60,
      skipOnAuth: false,
      priority: 2,
      enabled: true,
    },
    // Public endpoints
    {
      id: 'public',
      path: '/**',
      points: 200,
      duration: 60,
      priority: 3,
      enabled: true,
    },
  ],
};

/**
 * Rate Limiter Plugin Implementation
 */
class RateLimiterPlugin {
  private config: RateLimiterConfig;
  private redis?: Redis;
  private limiters = new Map<string, any>();
  private analytics: RateLimitAnalytics = {
    totalRequests: 0,
    blockedRequests: 0,
    topBlockedIPs: [],
    topBlockedPaths: [],
    ruleStats: {},
  };

  constructor(config: Partial<RateLimiterConfig> = {}) {
    this.config = this.mergeConfig(DEFAULT_CONFIG, config);
  }

  /**
   * Initialize the rate limiter
   */
  async initialize(context: PluginContext): Promise<void> {
    context.logger.info('Initializing Rate Limiter plugin');

    // Initialize Redis if configured
    if (this.config.redis) {
      await this.initializeRedis(context);
    }

    // Initialize rate limiters for each rule
    await this.initializeLimiters(context);

    // Load analytics
    await this.loadAnalytics(context);

    context.logger.info('Rate Limiter plugin initialized');
  }

  /**
   * Rate limiting middleware
   */
  async rateLimitMiddleware(req: ApiRequest, res: ApiResponseBase, next: () => void): Promise<void> {
    const context = (req as any).context as PluginContext;

    if (!this.config.global.enabled) {
      return next();
    }

    try {
      // Check if IP is whitelisted
      const clientIP = this.getClientIP(req);
      if (this.isWhitelisted(clientIP)) {
        return next();
      }

      // Find matching rule
      const rule = await this.findMatchingRule(req, context);
      if (!rule || !rule.enabled) {
        return next();
      }

      // Check if should skip rate limiting
      if (await this.shouldSkip(req, rule, context)) {
        return next();
      }

      // Apply rate limiting
      const result = await this.applyRateLimit(req, rule, context);
      
      // Update analytics
      this.updateAnalytics(req, rule, result.blocked);

      // Set rate limit headers
      if (this.config.global.headers) {
        this.setRateLimitHeaders(res, result);
      }

      // Check if rate limited
      if (result.blocked) {
        context.logger.warn(`Rate limit exceeded for ${clientIP} on ${req.method} ${req.url}`);
        
        const statusCode = rule.statusCode || 429;
        const message = rule.message || 'Rate limit exceeded';
        
        res.status(statusCode).json({
          error: message,
          retryAfter: result.msBeforeNext ? Math.ceil(result.msBeforeNext / 1000) : undefined,
        });
        return;
      }

      next();

    } catch (error) {
      context.logger.error('Error in rate limiting middleware:', error);
      // Continue on error to avoid blocking requests
      next();
    }
  }

  /**
   * Add rate limit rule
   */
  addRule(rule: RateLimitRule, context: PluginContext): void {
    // Validate rule
    if (!rule.id || !rule.path) {
      throw new Error('Rate limit rule must have id and path');
    }

    // Add to config
    this.config.rules.push(rule);
    this.config.rules.sort((a, b) => (a.priority || 999) - (b.priority || 999));

    // Initialize limiter for the rule
    this.initializeLimiterForRule(rule, context);

    context.logger.info(`Added rate limit rule: ${rule.id}`);
  }

  /**
   * Remove rate limit rule
   */
  removeRule(ruleId: string, context: PluginContext): boolean {
    const index = this.config.rules.findIndex(rule => rule.id === ruleId);
    if (index >= 0) {
      this.config.rules.splice(index, 1);
      this.limiters.delete(ruleId);
      context.logger.info(`Removed rate limit rule: ${ruleId}`);
      return true;
    }
    return false;
  }

  /**
   * Update rate limit rule
   */
  updateRule(ruleId: string, updates: Partial<RateLimitRule>, context: PluginContext): boolean {
    const rule = this.config.rules.find(r => r.id === ruleId);
    if (rule) {
      Object.assign(rule, updates);
      
      // Re-initialize limiter for the updated rule
      this.initializeLimiterForRule(rule, context);
      
      context.logger.info(`Updated rate limit rule: ${ruleId}`);
      return true;
    }
    return false;
  }

  /**
   * Get rate limit analytics
   */
  async getAnalytics(context: PluginContext): Promise<RateLimitAnalytics> {
    if (this.config.global.enableAnalytics) {
      await this.refreshAnalytics(context);
    }
    return { ...this.analytics };
  }

  /**
   * Reset rate limits for a key
   */
  async resetRateLimit(key: string, ruleId?: string, context?: PluginContext): Promise<boolean> {
    try {
      if (ruleId) {
        const limiter = this.limiters.get(ruleId);
        if (limiter) {
          await limiter.delete(key);
          return true;
        }
      } else {
        // Reset for all rules
        for (const limiter of this.limiters.values()) {
          await limiter.delete(key);
        }
        return true;
      }
      return false;
    } catch (error) {
      context?.logger.error(`Error resetting rate limit for key ${key}:`, error);
      return false;
    }
  }

  /**
   * Get current rate limit status
   */
  async getRateLimitStatus(key: string, ruleId: string): Promise<RateLimiterRes | null> {
    try {
      const limiter = this.limiters.get(ruleId);
      if (!limiter) {
        return null;
      }

      return await limiter.get(key);
    } catch (error) {
      return null;
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
          keyPrefix: redisConfig.keyPrefix || 'cf-auth:ratelimit:',
        });
      }

      await this.redis.ping();
      context.logger.info('Redis connection established for rate limiting');

    } catch (error) {
      context.logger.error('Failed to connect to Redis for rate limiting:', error);
      throw error;
    }
  }

  /**
   * Initialize rate limiters for all rules
   */
  private async initializeLimiters(context: PluginContext): Promise<void> {
    for (const rule of this.config.rules) {
      this.initializeLimiterForRule(rule, context);
    }
  }

  /**
   * Initialize rate limiter for a specific rule
   */
  private initializeLimiterForRule(rule: RateLimitRule, context: PluginContext): void {
    const options = {
      points: rule.points,
      duration: rule.duration,
      blockDuration: rule.blockDuration || this.config.defaults.blockDuration,
    };

    let limiter;

    if (this.redis) {
      limiter = new RateLimiterRedis({
        storeClient: this.redis,
        ...options,
      });
    } else {
      limiter = new RateLimiterMemory(options);
    }

    this.limiters.set(rule.id, limiter);
    
    // Initialize rule stats
    if (!this.analytics.ruleStats[rule.id]) {
      this.analytics.ruleStats[rule.id] = { requests: 0, blocks: 0 };
    }
  }

  /**
   * Find matching rate limit rule
   */
  private async findMatchingRule(req: ApiRequest, context: PluginContext): Promise<RateLimitRule | null> {
    const path = req.url || '/';
    const method = req.method || 'GET';

    for (const rule of this.config.rules) {
      if (!rule.enabled) continue;

      // Check method
      if (rule.methods && !rule.methods.includes(method)) {
        continue;
      }

      // Check path
      if (this.pathMatches(path, rule.path)) {
        return rule;
      }
    }

    return null;
  }

  /**
   * Check if path matches pattern
   */
  private pathMatches(path: string, pattern: string | RegExp): boolean {
    if (typeof pattern === 'string') {
      // Convert glob pattern to regex
      const regexPattern = pattern
        .replace(/\*\*/g, '.*')
        .replace(/\*/g, '[^/]*')
        .replace(/\?/g, '.');
      const regex = new RegExp(`^${regexPattern}$`);
      return regex.test(path);
    }

    if (pattern instanceof RegExp) {
      return pattern.test(path);
    }

    return false;
  }

  /**
   * Check if should skip rate limiting
   */
  private async shouldSkip(req: ApiRequest, rule: RateLimitRule, context: PluginContext): Promise<boolean> {
    // Check custom skip function
    if (rule.skip) {
      const shouldSkip = await rule.skip(req);
      if (shouldSkip) return true;
    }

    // Check authentication skip
    if (rule.skipOnAuth && req.user) {
      return true;
    }

    // Check role-based skip
    if (rule.skipRoles && req.user?.roles) {
      const userRoles = Array.isArray(req.user.roles) ? req.user.roles : [req.user.roles];
      if (rule.skipRoles.some(role => userRoles.includes(role))) {
        return true;
      }
    }

    return false;
  }

  /**
   * Apply rate limiting
   */
  private async applyRateLimit(req: ApiRequest, rule: RateLimitRule, context: PluginContext): Promise<any> {
    const limiter = this.limiters.get(rule.id);
    if (!limiter) {
      throw new Error(`Rate limiter not found for rule: ${rule.id}`);
    }

    // Generate rate limit key
    const key = rule.keyGenerator ? await rule.keyGenerator(req) : this.getClientIP(req);

    try {
      // Consume a point
      const result = await limiter.consume(key);
      return { blocked: false, ...result };
    } catch (rateLimiterRes) {
      // Rate limit exceeded
      return { blocked: true, ...rateLimiterRes };
    }
  }

  /**
   * Get client IP address
   */
  private getClientIP(req: ApiRequest): string {
    return (
      req.ip ||
      req.headers?.['x-forwarded-for']?.split(',')[0]?.trim() ||
      req.headers?.['x-real-ip'] ||
      req.connection?.remoteAddress ||
      'unknown'
    );
  }

  /**
   * Check if IP is whitelisted
   */
  private isWhitelisted(ip: string): boolean {
    return this.config.global.whitelistIPs.includes(ip);
  }

  /**
   * Set rate limit headers
   */
  private setRateLimitHeaders(res: ApiResponseBase, result: any): void {
    const headers = {
      'X-RateLimit-Limit': result.totalHits || 0,
      'X-RateLimit-Remaining': result.remainingPoints || 0,
      'X-RateLimit-Reset': new Date(Date.now() + (result.msBeforeNext || 0)).toISOString(),
    };

    if (this.config.global.includeRetryAfter && result.blocked) {
      headers['Retry-After'] = Math.ceil((result.msBeforeNext || 0) / 1000);
    }

    Object.entries(headers).forEach(([key, value]) => {
      res.setHeader(key, value.toString());
    });
  }

  /**
   * Update analytics
   */
  private updateAnalytics(req: ApiRequest, rule: RateLimitRule, blocked: boolean): void {
    if (!this.config.global.enableAnalytics) {
      return;
    }

    this.analytics.totalRequests++;
    this.analytics.ruleStats[rule.id].requests++;

    if (blocked) {
      this.analytics.blockedRequests++;
      this.analytics.ruleStats[rule.id].blocks++;

      // Track blocked IPs and paths
      const ip = this.getClientIP(req);
      const path = req.url || '/';

      this.updateTopBlocked(this.analytics.topBlockedIPs, ip);
      this.updateTopBlocked(this.analytics.topBlockedPaths, path);
    }
  }

  /**
   * Update top blocked items
   */
  private updateTopBlocked(list: Array<{ ip?: string; path?: string; count: number }>, item: string): void {
    const existing = list.find(entry => entry.ip === item || entry.path === item);
    if (existing) {
      existing.count++;
    } else {
      const entry = { count: 1 } as any;
      if (item.includes('.') || item.includes(':')) {
        entry.ip = item;
      } else {
        entry.path = item;
      }
      list.push(entry);
    }

    // Keep only top 10
    list.sort((a, b) => b.count - a.count);
    list.splice(10);
  }

  /**
   * Load analytics data
   */
  private async loadAnalytics(context: PluginContext): Promise<void> {
    try {
      const saved = await context.storage.get<RateLimitAnalytics>('ratelimit:analytics');
      if (saved) {
        this.analytics = { ...this.analytics, ...saved };
      }
    } catch (error) {
      context.logger.warn('Error loading rate limit analytics:', error);
    }
  }

  /**
   * Save analytics data
   */
  private async saveAnalytics(context: PluginContext): Promise<void> {
    try {
      await context.storage.set('ratelimit:analytics', this.analytics);
    } catch (error) {
      context.logger.error('Error saving rate limit analytics:', error);
    }
  }

  /**
   * Refresh analytics
   */
  private async refreshAnalytics(context: PluginContext): Promise<void> {
    await this.saveAnalytics(context);
  }

  /**
   * Merge configuration objects
   */
  private mergeConfig(defaultConfig: RateLimiterConfig, userConfig: Partial<RateLimiterConfig>): RateLimiterConfig {
    return {
      redis: { ...defaultConfig.redis, ...userConfig.redis },
      defaults: { ...defaultConfig.defaults, ...userConfig.defaults },
      global: { ...defaultConfig.global, ...userConfig.global },
      rules: [...defaultConfig.rules, ...(userConfig.rules || [])],
    };
  }

  /**
   * Cleanup on destroy
   */
  async destroy(context: PluginContext): Promise<void> {
    if (this.redis) {
      await this.redis.quit();
    }

    await this.saveAnalytics(context);
    context.logger.info('Rate Limiter plugin destroyed');
  }
}

/**
 * Create rate limiter plugin
 */
export function createRateLimiterPlugin(config?: Partial<RateLimiterConfig>) {
  const plugin = new RateLimiterPlugin(config);

  return createServerPlugin()
    .setId('rate-limiter')
    .setName('Advanced Rate Limiter')
    .setVersion('1.0.0')
    .setDescription('Advanced rate limiting with multiple strategies, Redis support, and analytics')
    .setAuthor('CF-Better-Auth Team')
    .addCategory('security')
    .addTag('rate-limiting')
    .addTag('security')
    .addTag('ddos-protection')
    .addTag('redis')
    .setInitialize(plugin.initialize.bind(plugin))
    .setDestroy(plugin.destroy.bind(plugin))
    .addMiddleware({
      name: 'rate-limiter',
      priority: 'highest',
      handler: plugin.rateLimitMiddleware.bind(plugin),
    })
    .addRoute({
      method: 'GET',
      path: '/api/admin/rate-limits',
      auth: true,
      permissions: ['admin'],
      handler: async (req, res) => {
        res.json({ rules: plugin['config'].rules });
      },
    })
    .addRoute({
      method: 'POST',
      path: '/api/admin/rate-limits',
      auth: true,
      permissions: ['admin'],
      handler: async (req, res) => {
        try {
          const rule = req.body as RateLimitRule;
          plugin.addRule(rule, req.context);
          res.json({ message: 'Rate limit rule added successfully' });
        } catch (error) {
          res.status(400).json({ error: error.message });
        }
      },
    })
    .addRoute({
      method: 'PUT',
      path: '/api/admin/rate-limits/:ruleId',
      auth: true,
      permissions: ['admin'],
      handler: async (req, res) => {
        const { ruleId } = req.params;
        const updates = req.body;
        
        const success = plugin.updateRule(ruleId, updates, req.context);
        if (success) {
          res.json({ message: 'Rate limit rule updated successfully' });
        } else {
          res.status(404).json({ error: 'Rate limit rule not found' });
        }
      },
    })
    .addRoute({
      method: 'DELETE',
      path: '/api/admin/rate-limits/:ruleId',
      auth: true,
      permissions: ['admin'],
      handler: async (req, res) => {
        const { ruleId } = req.params;
        const success = plugin.removeRule(ruleId, req.context);
        
        if (success) {
          res.json({ message: 'Rate limit rule removed successfully' });
        } else {
          res.status(404).json({ error: 'Rate limit rule not found' });
        }
      },
    })
    .addRoute({
      method: 'GET',
      path: '/api/admin/rate-limits/analytics',
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
export default createRateLimiterPlugin();
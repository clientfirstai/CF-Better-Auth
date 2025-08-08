import { Redis } from 'ioredis';
import { config } from 'dotenv';

// Load environment variables
config();

if (!process.env.REDIS_URL) {
  throw new Error('REDIS_URL environment variable is required');
}

// Redis configuration
const redisConfig = {
  maxRetriesPerRequest: 3,
  retryDelayOnFailover: 100,
  enableReadyCheck: true,
  lazyConnect: true,
  keepAlive: 30000,
  family: 4, // IPv4
  // Connection timeout
  connectTimeout: 10000,
  // Command timeout
  commandTimeout: 5000,
  // Retry configuration
  retryDelayOnClusterDown: 300,
  retryDelayOnFailover: 100,
  maxRetriesPerRequest: 3,
};

// Create Redis client
export const redis = new Redis(process.env.REDIS_URL!, redisConfig);

// Redis connection event handlers
redis.on('connect', () => {
  console.log('🔌 Redis connecting...');
});

redis.on('ready', () => {
  console.log('✅ Redis connection ready');
});

redis.on('error', (error) => {
  console.error('❌ Redis connection error:', error);
});

redis.on('close', () => {
  console.log('📦 Redis connection closed');
});

redis.on('reconnecting', () => {
  console.log('🔄 Redis reconnecting...');
});

// Connection health check
export async function checkRedisConnection(): Promise<boolean> {
  try {
    const result = await redis.ping();
    console.log('✅ Redis health check successful:', result);
    return result === 'PONG';
  } catch (error) {
    console.error('❌ Redis health check failed:', error);
    return false;
  }
}

// Cache helper functions
export class CacheManager {
  private prefix: string;

  constructor(prefix = 'cf-auth:') {
    this.prefix = prefix;
  }

  private key(key: string): string {
    return `${this.prefix}${key}`;
  }

  async get<T = any>(key: string): Promise<T | null> {
    try {
      const value = await redis.get(this.key(key));
      return value ? JSON.parse(value) : null;
    } catch (error) {
      console.error(`Cache get error for key ${key}:`, error);
      return null;
    }
  }

  async set(key: string, value: any, ttl?: number): Promise<boolean> {
    try {
      const serialized = JSON.stringify(value);
      if (ttl) {
        await redis.setex(this.key(key), ttl, serialized);
      } else {
        await redis.set(this.key(key), serialized);
      }
      return true;
    } catch (error) {
      console.error(`Cache set error for key ${key}:`, error);
      return false;
    }
  }

  async del(key: string): Promise<boolean> {
    try {
      const result = await redis.del(this.key(key));
      return result > 0;
    } catch (error) {
      console.error(`Cache delete error for key ${key}:`, error);
      return false;
    }
  }

  async exists(key: string): Promise<boolean> {
    try {
      const result = await redis.exists(this.key(key));
      return result === 1;
    } catch (error) {
      console.error(`Cache exists error for key ${key}:`, error);
      return false;
    }
  }

  async clear(pattern?: string): Promise<number> {
    try {
      const searchPattern = pattern ? this.key(pattern) : `${this.prefix}*`;
      const keys = await redis.keys(searchPattern);
      
      if (keys.length === 0) {
        return 0;
      }
      
      const result = await redis.del(...keys);
      console.log(`🧹 Cleared ${result} cache entries matching pattern: ${searchPattern}`);
      return result;
    } catch (error) {
      console.error(`Cache clear error for pattern ${pattern}:`, error);
      return 0;
    }
  }

  async increment(key: string, ttl?: number): Promise<number> {
    try {
      const pipeline = redis.pipeline();
      pipeline.incr(this.key(key));
      if (ttl) {
        pipeline.expire(this.key(key), ttl);
      }
      const results = await pipeline.exec();
      return results?.[0]?.[1] as number || 0;
    } catch (error) {
      console.error(`Cache increment error for key ${key}:`, error);
      return 0;
    }
  }

  async decrement(key: string): Promise<number> {
    try {
      const result = await redis.decr(this.key(key));
      return result;
    } catch (error) {
      console.error(`Cache decrement error for key ${key}:`, error);
      return 0;
    }
  }

  async getMany<T = any>(keys: string[]): Promise<(T | null)[]> {
    try {
      const redisKeys = keys.map(k => this.key(k));
      const values = await redis.mget(...redisKeys);
      return values.map(v => v ? JSON.parse(v) : null);
    } catch (error) {
      console.error(`Cache getMany error:`, error);
      return new Array(keys.length).fill(null);
    }
  }

  async setMany(items: Array<{ key: string; value: any; ttl?: number }>): Promise<boolean> {
    try {
      const pipeline = redis.pipeline();
      
      for (const { key, value, ttl } of items) {
        const serialized = JSON.stringify(value);
        if (ttl) {
          pipeline.setex(this.key(key), ttl, serialized);
        } else {
          pipeline.set(this.key(key), serialized);
        }
      }
      
      await pipeline.exec();
      return true;
    } catch (error) {
      console.error(`Cache setMany error:`, error);
      return false;
    }
  }
}

// Create default cache manager instance
export const cache = new CacheManager();

// Session-specific cache manager
export const sessionCache = new CacheManager('cf-auth:session:');

// Rate limiting cache manager
export const rateLimitCache = new CacheManager('cf-auth:ratelimit:');

// OTP cache manager
export const otpCache = new CacheManager('cf-auth:otp:');

// Generic cache utilities
export const cacheUtils = {
  // Generate cache key with hash for complex objects
  generateKey: (prefix: string, ...parts: (string | number | object)[]): string => {
    const keyParts = parts.map(part => 
      typeof part === 'object' ? JSON.stringify(part) : String(part)
    );
    return `${prefix}:${keyParts.join(':')}`;
  },

  // Calculate TTL based on data type
  calculateTTL: (type: 'session' | 'otp' | 'user' | 'organization' | 'api'): number => {
    const ttls = {
      session: 60 * 60 * 24 * 7, // 7 days
      otp: 60 * 5,              // 5 minutes
      user: 60 * 60,            // 1 hour
      organization: 60 * 60 * 2, // 2 hours
      api: 60 * 15,             // 15 minutes
    };
    return ttls[type] || 60 * 60; // Default 1 hour
  },

  // Serialize data consistently
  serialize: (data: any): string => {
    return JSON.stringify(data, (key, value) => {
      // Handle special types
      if (value instanceof Date) {
        return { __type: 'Date', value: value.toISOString() };
      }
      if (value instanceof Set) {
        return { __type: 'Set', value: Array.from(value) };
      }
      if (value instanceof Map) {
        return { __type: 'Map', value: Array.from(value.entries()) };
      }
      return value;
    });
  },

  // Deserialize data consistently
  deserialize: (data: string): any => {
    return JSON.parse(data, (key, value) => {
      // Handle special types
      if (value && typeof value === 'object' && value.__type) {
        switch (value.__type) {
          case 'Date':
            return new Date(value.value);
          case 'Set':
            return new Set(value.value);
          case 'Map':
            return new Map(value.value);
        }
      }
      return value;
    });
  },
};

// Advanced caching patterns
export class AdvancedCache extends CacheManager {
  // Cache with automatic refresh
  async getWithRefresh<T>(
    key: string,
    fetcher: () => Promise<T>,
    ttl: number = 3600,
    refreshThreshold: number = 0.8
  ): Promise<T> {
    const cachedData = await this.get<{ value: T; cachedAt: number }>(key);
    
    if (cachedData) {
      const age = Date.now() - cachedData.cachedAt;
      const maxAge = ttl * 1000;
      
      // Return cached data if it's fresh enough
      if (age < maxAge * refreshThreshold) {
        return cachedData.value;
      }
      
      // Refresh in background if data is stale but not expired
      if (age < maxAge) {
        setImmediate(async () => {
          try {
            const fresh = await fetcher();
            await this.set(key, { value: fresh, cachedAt: Date.now() }, ttl);
          } catch (error) {
            console.error(`Background refresh failed for key ${key}:`, error);
          }
        });
        return cachedData.value;
      }
    }
    
    // Fetch fresh data
    const fresh = await fetcher();
    await this.set(key, { value: fresh, cachedAt: Date.now() }, ttl);
    return fresh;
  }

  // Cache with circuit breaker
  async getWithCircuitBreaker<T>(
    key: string,
    fetcher: () => Promise<T>,
    ttl: number = 3600,
    maxFailures: number = 5
  ): Promise<T | null> {
    const failureKey = `${key}:failures`;
    const failures = await this.get<number>(failureKey) || 0;
    
    if (failures >= maxFailures) {
      console.warn(`Circuit breaker open for key ${key}, returning cached data`);
      const cached = await this.get<T>(key);
      return cached;
    }
    
    try {
      const data = await fetcher();
      await this.set(key, data, ttl);
      // Reset failure count on success
      await this.del(failureKey);
      return data;
    } catch (error) {
      // Increment failure count
      await this.increment(failureKey, 300); // 5 minute failure window
      console.error(`Fetcher failed for key ${key}:`, error);
      
      // Return stale cache if available
      const cached = await this.get<T>(key);
      return cached;
    }
  }
}

// Export advanced cache instance
export const advancedCache = new AdvancedCache();

// Graceful shutdown
export async function closeRedisConnection(): Promise<void> {
  try {
    await redis.quit();
    console.log('📦 Redis connection closed gracefully');
  } catch (error) {
    console.error('Error closing Redis connection:', error);
  }
}

// Handle process termination
process.on('SIGTERM', closeRedisConnection);
process.on('SIGINT', closeRedisConnection);

// Export Redis instance for direct usage
export { redis };
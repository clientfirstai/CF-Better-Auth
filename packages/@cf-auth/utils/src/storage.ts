/**
 * Storage utilities for CF-Better-Auth
 * 
 * @fileoverview This module provides storage abstractions including caching,
 * session storage, and key-value store utilities with multiple backend support.
 * 
 * Features:
 * - In-memory cache with TTL support
 * - localStorage/sessionStorage wrappers
 * - Key-value store abstraction
 * - Storage backends (memory, localStorage, etc.)
 * - Serialization/deserialization
 * - Storage event handling
 */

import type { Brand } from '@cf-auth/types';
import { CACHE_CONSTANTS } from './constants';

/**
 * Branded types for storage
 */
export type StorageKey = Brand<string, 'StorageKey'>;
export type CacheKey = Brand<string, 'CacheKey'>;

/**
 * Storage interfaces
 */
export interface StorageOptions {
  /** Key prefix for all operations */
  prefix?: string;
  /** Default TTL in seconds */
  defaultTTL?: number;
  /** Maximum storage size */
  maxSize?: number;
  /** Serialization options */
  serializer?: StorageSerializer;
  /** Whether to enable compression */
  compress?: boolean;
}

export interface StorageSerializer {
  serialize(value: any): string;
  deserialize(value: string): any;
}

export interface StorageItem<T = any> {
  value: T;
  expires?: number;
  created: number;
  accessed: number;
  metadata?: Record<string, any>;
}

export interface CacheStats {
  hits: number;
  misses: number;
  sets: number;
  deletes: number;
  size: number;
  hitRate: number;
}

export interface StorageEvent<T = any> {
  type: 'set' | 'get' | 'delete' | 'clear' | 'expired';
  key: string;
  value?: T;
  oldValue?: T;
  timestamp: number;
}

/**
 * Storage backend interface
 */
export interface StorageBackend {
  get(key: string): Promise<string | null>;
  set(key: string, value: string, ttl?: number): Promise<void>;
  delete(key: string): Promise<boolean>;
  clear(): Promise<void>;
  keys(): Promise<string[]>;
  has(key: string): Promise<boolean>;
  size(): Promise<number>;
}

/**
 * Memory storage backend
 */
export class MemoryStorageBackend implements StorageBackend {
  private storage = new Map<string, { value: string; expires?: number }>();
  private cleanupInterval?: NodeJS.Timeout;

  constructor() {
    this.startCleanup();
  }

  async get(key: string): Promise<string | null> {
    const item = this.storage.get(key);
    
    if (!item) {
      return null;
    }

    // Check expiration
    if (item.expires && Date.now() > item.expires) {
      this.storage.delete(key);
      return null;
    }

    return item.value;
  }

  async set(key: string, value: string, ttl?: number): Promise<void> {
    const expires = ttl ? Date.now() + (ttl * 1000) : undefined;
    this.storage.set(key, { value, expires });
  }

  async delete(key: string): Promise<boolean> {
    return this.storage.delete(key);
  }

  async clear(): Promise<void> {
    this.storage.clear();
  }

  async keys(): Promise<string[]> {
    return Array.from(this.storage.keys());
  }

  async has(key: string): Promise<boolean> {
    const item = this.storage.get(key);
    
    if (!item) {
      return false;
    }

    // Check expiration
    if (item.expires && Date.now() > item.expires) {
      this.storage.delete(key);
      return false;
    }

    return true;
  }

  async size(): Promise<number> {
    // Clean up expired items first
    await this.cleanup();
    return this.storage.size;
  }

  private startCleanup(): void {
    this.cleanupInterval = setInterval(async () => {
      await this.cleanup();
    }, 60000); // Cleanup every minute
  }

  private async cleanup(): Promise<void> {
    const now = Date.now();
    
    for (const [key, item] of this.storage.entries()) {
      if (item.expires && now > item.expires) {
        this.storage.delete(key);
      }
    }
  }

  destroy(): void {
    if (this.cleanupInterval) {
      clearInterval(this.cleanupInterval);
    }
    this.storage.clear();
  }
}

/**
 * LocalStorage backend (browser only)
 */
export class LocalStorageBackend implements StorageBackend {
  private isAvailable: boolean;

  constructor() {
    this.isAvailable = this.checkAvailability();
  }

  private checkAvailability(): boolean {
    try {
      if (typeof window === 'undefined' || !window.localStorage) {
        return false;
      }
      
      const test = '__storage_test__';
      window.localStorage.setItem(test, 'test');
      window.localStorage.removeItem(test);
      return true;
    } catch {
      return false;
    }
  }

  async get(key: string): Promise<string | null> {
    if (!this.isAvailable) return null;

    try {
      const item = window.localStorage.getItem(key);
      if (!item) return null;

      const parsed = JSON.parse(item);
      
      // Check expiration
      if (parsed.expires && Date.now() > parsed.expires) {
        window.localStorage.removeItem(key);
        return null;
      }

      return parsed.value;
    } catch {
      return null;
    }
  }

  async set(key: string, value: string, ttl?: number): Promise<void> {
    if (!this.isAvailable) return;

    try {
      const expires = ttl ? Date.now() + (ttl * 1000) : undefined;
      const item = { value, expires, created: Date.now() };
      window.localStorage.setItem(key, JSON.stringify(item));
    } catch (error) {
      // Handle quota exceeded
      if (error instanceof Error && error.name === 'QuotaExceededError') {
        await this.cleanup();
        // Try again after cleanup
        try {
          const expires = ttl ? Date.now() + (ttl * 1000) : undefined;
          const item = { value, expires, created: Date.now() };
          window.localStorage.setItem(key, JSON.stringify(item));
        } catch {
          // Still failed, throw error
          throw new Error('Storage quota exceeded');
        }
      }
    }
  }

  async delete(key: string): Promise<boolean> {
    if (!this.isAvailable) return false;

    try {
      const existed = window.localStorage.getItem(key) !== null;
      window.localStorage.removeItem(key);
      return existed;
    } catch {
      return false;
    }
  }

  async clear(): Promise<void> {
    if (!this.isAvailable) return;

    try {
      window.localStorage.clear();
    } catch {
      // Ignore errors
    }
  }

  async keys(): Promise<string[]> {
    if (!this.isAvailable) return [];

    try {
      return Object.keys(window.localStorage);
    } catch {
      return [];
    }
  }

  async has(key: string): Promise<boolean> {
    if (!this.isAvailable) return false;

    try {
      const item = window.localStorage.getItem(key);
      if (!item) return false;

      const parsed = JSON.parse(item);
      
      // Check expiration
      if (parsed.expires && Date.now() > parsed.expires) {
        window.localStorage.removeItem(key);
        return false;
      }

      return true;
    } catch {
      return false;
    }
  }

  async size(): Promise<number> {
    if (!this.isAvailable) return 0;

    try {
      return window.localStorage.length;
    } catch {
      return 0;
    }
  }

  private async cleanup(): Promise<void> {
    if (!this.isAvailable) return;

    const now = Date.now();
    const keysToDelete: string[] = [];

    try {
      for (let i = 0; i < window.localStorage.length; i++) {
        const key = window.localStorage.key(i);
        if (!key) continue;

        const item = window.localStorage.getItem(key);
        if (!item) continue;

        try {
          const parsed = JSON.parse(item);
          if (parsed.expires && now > parsed.expires) {
            keysToDelete.push(key);
          }
        } catch {
          // Remove malformed items
          keysToDelete.push(key);
        }
      }

      keysToDelete.forEach(key => window.localStorage.removeItem(key));
    } catch {
      // Ignore cleanup errors
    }
  }
}

/**
 * SessionStorage backend (browser only)
 */
export class SessionStorageBackend extends LocalStorageBackend {
  constructor() {
    super();
    this.isAvailable = this.checkSessionStorageAvailability();
  }

  private checkSessionStorageAvailability(): boolean {
    try {
      if (typeof window === 'undefined' || !window.sessionStorage) {
        return false;
      }
      
      const test = '__session_storage_test__';
      window.sessionStorage.setItem(test, 'test');
      window.sessionStorage.removeItem(test);
      return true;
    } catch {
      return false;
    }
  }

  // Override localStorage methods to use sessionStorage
  async get(key: string): Promise<string | null> {
    if (!this.isAvailable) return null;

    try {
      const item = window.sessionStorage.getItem(key);
      if (!item) return null;

      const parsed = JSON.parse(item);
      
      if (parsed.expires && Date.now() > parsed.expires) {
        window.sessionStorage.removeItem(key);
        return null;
      }

      return parsed.value;
    } catch {
      return null;
    }
  }

  async set(key: string, value: string, ttl?: number): Promise<void> {
    if (!this.isAvailable) return;

    try {
      const expires = ttl ? Date.now() + (ttl * 1000) : undefined;
      const item = { value, expires, created: Date.now() };
      window.sessionStorage.setItem(key, JSON.stringify(item));
    } catch {
      throw new Error('Session storage quota exceeded');
    }
  }

  async delete(key: string): Promise<boolean> {
    if (!this.isAvailable) return false;

    try {
      const existed = window.sessionStorage.getItem(key) !== null;
      window.sessionStorage.removeItem(key);
      return existed;
    } catch {
      return false;
    }
  }

  async clear(): Promise<void> {
    if (!this.isAvailable) return;

    try {
      window.sessionStorage.clear();
    } catch {
      // Ignore errors
    }
  }

  async keys(): Promise<string[]> {
    if (!this.isAvailable) return [];

    try {
      return Object.keys(window.sessionStorage);
    } catch {
      return [];
    }
  }
}

/**
 * Universal storage class with multiple backends
 */
export class Storage<T = any> {
  private backend: StorageBackend;
  private prefix: string;
  private serializer: StorageSerializer;
  private eventListeners: Array<(event: StorageEvent<T>) => void> = [];
  private stats: CacheStats = {
    hits: 0,
    misses: 0,
    sets: 0,
    deletes: 0,
    size: 0,
    hitRate: 0
  };

  constructor(backend: StorageBackend, options: StorageOptions = {}) {
    this.backend = backend;
    this.prefix = options.prefix || '';
    this.serializer = options.serializer || {
      serialize: JSON.stringify,
      deserialize: JSON.parse
    };
  }

  /**
   * Get value from storage
   * 
   * @param key - Storage key
   * @returns Stored value or null
   */
  async get(key: StorageKey): Promise<T | null> {
    const fullKey = this.buildKey(key);
    
    try {
      const value = await this.backend.get(fullKey);
      
      if (value === null) {
        this.stats.misses++;
        this.updateHitRate();
        this.emit('get', key, undefined);
        return null;
      }

      const deserialized = this.serializer.deserialize(value);
      this.stats.hits++;
      this.updateHitRate();
      this.emit('get', key, deserialized);
      
      return deserialized;
    } catch (error) {
      this.stats.misses++;
      this.updateHitRate();
      return null;
    }
  }

  /**
   * Set value in storage
   * 
   * @param key - Storage key
   * @param value - Value to store
   * @param ttl - TTL in seconds
   */
  async set(key: StorageKey, value: T, ttl?: number): Promise<void> {
    const fullKey = this.buildKey(key);
    const oldValue = await this.get(key);
    
    try {
      const serialized = this.serializer.serialize(value);
      await this.backend.set(fullKey, serialized, ttl);
      
      this.stats.sets++;
      this.emit('set', key, value, oldValue);
    } catch (error) {
      throw new Error(`Failed to set value: ${error}`);
    }
  }

  /**
   * Delete value from storage
   * 
   * @param key - Storage key
   * @returns Whether key existed
   */
  async delete(key: StorageKey): Promise<boolean> {
    const fullKey = this.buildKey(key);
    const oldValue = await this.get(key);
    
    try {
      const deleted = await this.backend.delete(fullKey);
      
      if (deleted) {
        this.stats.deletes++;
        this.emit('delete', key, undefined, oldValue);
      }
      
      return deleted;
    } catch (error) {
      return false;
    }
  }

  /**
   * Check if key exists
   * 
   * @param key - Storage key
   * @returns Whether key exists
   */
  async has(key: StorageKey): Promise<boolean> {
    const fullKey = this.buildKey(key);
    return this.backend.has(fullKey);
  }

  /**
   * Clear all storage
   */
  async clear(): Promise<void> {
    await this.backend.clear();
    this.stats = {
      hits: 0,
      misses: 0,
      sets: 0,
      deletes: 0,
      size: 0,
      hitRate: 0
    };
    this.emit('clear', '' as StorageKey);
  }

  /**
   * Get all keys
   * 
   * @returns Array of keys
   */
  async keys(): Promise<string[]> {
    const allKeys = await this.backend.keys();
    return allKeys
      .filter(key => key.startsWith(this.prefix))
      .map(key => key.substring(this.prefix.length));
  }

  /**
   * Get storage size
   * 
   * @returns Number of items
   */
  async size(): Promise<number> {
    return this.backend.size();
  }

  /**
   * Get storage statistics
   * 
   * @returns Cache statistics
   */
  getStats(): CacheStats {
    return { ...this.stats };
  }

  /**
   * Reset statistics
   */
  resetStats(): void {
    this.stats = {
      hits: 0,
      misses: 0,
      sets: 0,
      deletes: 0,
      size: 0,
      hitRate: 0
    };
  }

  /**
   * Add event listener
   * 
   * @param listener - Event listener function
   */
  addEventListener(listener: (event: StorageEvent<T>) => void): void {
    this.eventListeners.push(listener);
  }

  /**
   * Remove event listener
   * 
   * @param listener - Event listener function
   */
  removeEventListener(listener: (event: StorageEvent<T>) => void): void {
    const index = this.eventListeners.indexOf(listener);
    if (index > -1) {
      this.eventListeners.splice(index, 1);
    }
  }

  /**
   * Get or set value with callback
   * 
   * @param key - Storage key
   * @param factory - Function to create value if not exists
   * @param ttl - TTL in seconds
   * @returns Stored or created value
   */
  async getOrSet(key: StorageKey, factory: () => Promise<T> | T, ttl?: number): Promise<T> {
    let value = await this.get(key);
    
    if (value === null) {
      value = await factory();
      await this.set(key, value, ttl);
    }
    
    return value;
  }

  /**
   * Increment numeric value
   * 
   * @param key - Storage key
   * @param delta - Increment value
   * @param ttl - TTL in seconds
   * @returns New value
   */
  async increment(key: StorageKey, delta: number = 1, ttl?: number): Promise<number> {
    const current = await this.get(key) as number || 0;
    const newValue = current + delta;
    await this.set(key, newValue as T, ttl);
    return newValue;
  }

  /**
   * Set value with expiration
   * 
   * @param key - Storage key
   * @param value - Value to store
   * @param expiresAt - Expiration date
   */
  async setWithExpiration(key: StorageKey, value: T, expiresAt: Date): Promise<void> {
    const ttl = Math.floor((expiresAt.getTime() - Date.now()) / 1000);
    if (ttl > 0) {
      await this.set(key, value, ttl);
    }
  }

  /**
   * Build full storage key with prefix
   */
  private buildKey(key: StorageKey): string {
    return `${this.prefix}${key}`;
  }

  /**
   * Update hit rate statistics
   */
  private updateHitRate(): void {
    const total = this.stats.hits + this.stats.misses;
    this.stats.hitRate = total > 0 ? this.stats.hits / total : 0;
  }

  /**
   * Emit storage event
   */
  private emit(type: StorageEvent<T>['type'], key: StorageKey, value?: T, oldValue?: T): void {
    const event: StorageEvent<T> = {
      type,
      key,
      value,
      oldValue,
      timestamp: Date.now()
    };

    this.eventListeners.forEach(listener => {
      try {
        listener(event);
      } catch (error) {
        console.error('Storage event listener error:', error);
      }
    });
  }
}

/**
 * Cache class with advanced features
 */
export class Cache<T = any> extends Storage<T> {
  private defaultTTL: number;

  constructor(backend: StorageBackend, options: StorageOptions & { defaultTTL?: number } = {}) {
    super(backend, options);
    this.defaultTTL = options.defaultTTL || CACHE_CONSTANTS.TTL.MEDIUM;
  }

  /**
   * Set value with default TTL
   */
  async set(key: StorageKey, value: T, ttl?: number): Promise<void> {
    return super.set(key, value, ttl || this.defaultTTL);
  }

  /**
   * Cache value from async function
   */
  async cached<R>(
    key: StorageKey,
    factory: () => Promise<R>,
    ttl?: number
  ): Promise<R> {
    return this.getOrSet(key, factory, ttl || this.defaultTTL) as Promise<R>;
  }

  /**
   * Cache with tags for grouped invalidation
   */
  private tags = new Map<string, Set<string>>();

  async setWithTags(key: StorageKey, value: T, tags: string[], ttl?: number): Promise<void> {
    await this.set(key, value, ttl);
    
    // Associate key with tags
    tags.forEach(tag => {
      if (!this.tags.has(tag)) {
        this.tags.set(tag, new Set());
      }
      this.tags.get(tag)!.add(key);
    });
  }

  /**
   * Invalidate all keys with specific tag
   */
  async invalidateTag(tag: string): Promise<void> {
    const keys = this.tags.get(tag);
    if (keys) {
      await Promise.all(Array.from(keys).map(key => this.delete(key as StorageKey)));
      this.tags.delete(tag);
    }
  }
}

/**
 * Utility functions
 */

/**
 * Create memory storage instance
 */
export function createMemoryStorage<T = any>(options: StorageOptions = {}): Storage<T> {
  return new Storage<T>(new MemoryStorageBackend(), options);
}

/**
 * Create localStorage instance (browser only)
 */
export function createLocalStorage<T = any>(options: StorageOptions = {}): Storage<T> {
  return new Storage<T>(new LocalStorageBackend(), options);
}

/**
 * Create sessionStorage instance (browser only)
 */
export function createSessionStorage<T = any>(options: StorageOptions = {}): Storage<T> {
  return new Storage<T>(new SessionStorageBackend(), options);
}

/**
 * Create cache instance
 */
export function createCache<T = any>(
  backend?: StorageBackend,
  options: StorageOptions & { defaultTTL?: number } = {}
): Cache<T> {
  return new Cache<T>(backend || new MemoryStorageBackend(), options);
}

/**
 * Create namespaced storage
 */
export function createNamespacedStorage<T = any>(
  namespace: string,
  backend?: StorageBackend,
  options: Omit<StorageOptions, 'prefix') = {}
): Storage<T> {
  return new Storage<T>(backend || new MemoryStorageBackend(), {
    ...options,
    prefix: `${namespace}:`
  });
}

/**
 * Simple LRU Cache implementation
 */
export class LRUCache<T = any> {
  private cache = new Map<string, T>();
  private maxSize: number;

  constructor(maxSize: number = 100) {
    this.maxSize = maxSize;
  }

  get(key: string): T | undefined {
    const value = this.cache.get(key);
    
    if (value !== undefined) {
      // Move to end (mark as recently used)
      this.cache.delete(key);
      this.cache.set(key, value);
    }
    
    return value;
  }

  set(key: string, value: T): void {
    // Remove if exists
    if (this.cache.has(key)) {
      this.cache.delete(key);
    } else if (this.cache.size >= this.maxSize) {
      // Remove oldest (first) item
      const firstKey = this.cache.keys().next().value;
      this.cache.delete(firstKey);
    }
    
    this.cache.set(key, value);
  }

  has(key: string): boolean {
    return this.cache.has(key);
  }

  delete(key: string): boolean {
    return this.cache.delete(key);
  }

  clear(): void {
    this.cache.clear();
  }

  size(): number {
    return this.cache.size;
  }

  keys(): IterableIterator<string> {
    return this.cache.keys();
  }

  values(): IterableIterator<T> {
    return this.cache.values();
  }
}

/**
 * Create LRU cache instance
 */
export function createLRUCache<T = any>(maxSize: number = 100): LRUCache<T> {
  return new LRUCache<T>(maxSize);
}
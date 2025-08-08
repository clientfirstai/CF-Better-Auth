/**
 * Utility functions for @cf-auth/client
 */

import type { 
  CFAuthClientOptions, 
  StorageImplementation, 
  RetryConfig, 
  RequestOptions,
  ClientError,
  WebSocketMessage 
} from './types';
import { CFAuthError } from '@cf-auth/types';
import { buildUrl, sleep, retry as utilRetry } from '@cf-auth/utils';

// ============================================================================
// Storage Utilities
// ============================================================================

export class StorageManager {
  private storage: StorageImplementation;
  private keyPrefix: string;

  constructor(config: CFAuthClientOptions['storage'] = { type: 'localStorage' }) {
    this.keyPrefix = config.keyPrefix || 'cf-auth-';
    this.storage = this.createStorageImplementation(config);
  }

  private createStorageImplementation(config: CFAuthClientOptions['storage']): StorageImplementation {
    switch (config?.type) {
      case 'sessionStorage':
        return {
          getItem: (key: string) => {
            try {
              return sessionStorage.getItem(key);
            } catch {
              return null;
            }
          },
          setItem: (key: string, value: string) => {
            try {
              sessionStorage.setItem(key, value);
            } catch {
              // Ignore storage errors
            }
          },
          removeItem: (key: string) => {
            try {
              sessionStorage.removeItem(key);
            } catch {
              // Ignore storage errors
            }
          },
          clear: () => {
            try {
              sessionStorage.clear();
            } catch {
              // Ignore storage errors
            }
          }
        };

      case 'memory':
        const memoryStorage = new Map<string, string>();
        return {
          getItem: (key: string) => memoryStorage.get(key) || null,
          setItem: (key: string, value: string) => {
            memoryStorage.set(key, value);
          },
          removeItem: (key: string) => {
            memoryStorage.delete(key);
          },
          clear: () => {
            memoryStorage.clear();
          }
        };

      case 'custom':
        if (!config.implementation) {
          throw new CFAuthError('Custom storage implementation is required', 'CONFIGURATION_ERROR');
        }
        return config.implementation;

      case 'localStorage':
      default:
        return {
          getItem: (key: string) => {
            try {
              return localStorage.getItem(key);
            } catch {
              return null;
            }
          },
          setItem: (key: string, value: string) => {
            try {
              localStorage.setItem(key, value);
            } catch {
              // Ignore storage errors
            }
          },
          removeItem: (key: string) => {
            try {
              localStorage.removeItem(key);
            } catch {
              // Ignore storage errors
            }
          },
          clear: () => {
            try {
              localStorage.clear();
            } catch {
              // Ignore storage errors
            }
          }
        };
    }
  }

  private getKey(key: string): string {
    return `${this.keyPrefix}${key}`;
  }

  async get<T = any>(key: string): Promise<T | null> {
    try {
      const value = await this.storage.getItem(this.getKey(key));
      return value ? JSON.parse(value) : null;
    } catch (error) {
      console.warn('Failed to get item from storage:', error);
      return null;
    }
  }

  async set<T = any>(key: string, value: T): Promise<void> {
    try {
      await this.storage.setItem(this.getKey(key), JSON.stringify(value));
    } catch (error) {
      console.warn('Failed to set item in storage:', error);
    }
  }

  async remove(key: string): Promise<void> {
    try {
      await this.storage.removeItem(this.getKey(key));
    } catch (error) {
      console.warn('Failed to remove item from storage:', error);
    }
  }

  async clear(): Promise<void> {
    try {
      if (this.storage.clear) {
        await this.storage.clear();
      } else {
        // Fallback: manually remove known keys
        const keys = ['user', 'session', 'tokens', 'organizations', 'preferences'];
        await Promise.all(keys.map(key => this.remove(key)));
      }
    } catch (error) {
      console.warn('Failed to clear storage:', error);
    }
  }

  async keys(): Promise<string[]> {
    // This is a best-effort implementation for storage types that support it
    try {
      if (this.storage === localStorage || this.storage === sessionStorage) {
        const allKeys = Object.keys(this.storage as Storage);
        return allKeys
          .filter(key => key.startsWith(this.keyPrefix))
          .map(key => key.slice(this.keyPrefix.length));
      }
    } catch {
      // Ignore errors
    }
    return [];
  }
}

// ============================================================================
// Request Utilities
// ============================================================================

export class RequestManager {
  private baseURL: string;
  private apiPath: string;
  private timeout: number;
  private defaultHeaders: Record<string, string>;
  private storage: StorageManager;
  private customFetch?: typeof fetch;

  constructor(options: CFAuthClientOptions, storage: StorageManager) {
    this.baseURL = options.baseURL.replace(/\/$/, '');
    this.apiPath = options.apiPath || '/api/auth';
    this.timeout = options.timeout || 30000;
    this.storage = storage;
    this.customFetch = options.customFetch;
    this.defaultHeaders = {
      'Content-Type': 'application/json',
      'Accept': 'application/json'
    };
  }

  private get fetch() {
    return this.customFetch || globalThis.fetch;
  }

  async request<T = any>(endpoint: string, options: RequestOptions = {}): Promise<T> {
    const url = this.buildUrl(endpoint, options.params);
    const headers = { ...this.defaultHeaders, ...options.headers };
    
    // Add authorization header if available
    const tokens = await this.storage.get('tokens');
    if (tokens?.accessToken) {
      headers.Authorization = `Bearer ${tokens.accessToken}`;
    }

    const requestOptions: RequestInit = {
      method: options.method || 'GET',
      headers,
      credentials: 'include'
    };

    // Add body for non-GET requests
    if (options.body && options.method !== 'GET') {
      requestOptions.body = typeof options.body === 'string' 
        ? options.body 
        : JSON.stringify(options.body);
    }

    const timeout = options.timeout || this.timeout;
    const retryConfig = options.retry;

    const makeRequest = async (): Promise<T> => {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), timeout);

      try {
        const response = await this.fetch(url, {
          ...requestOptions,
          signal: controller.signal
        });

        clearTimeout(timeoutId);

        if (!response.ok) {
          const error = await this.createErrorFromResponse(response, url, requestOptions.method);
          throw error;
        }

        const contentType = response.headers.get('content-type');
        if (contentType?.includes('application/json')) {
          return await response.json();
        } else {
          return await response.text() as T;
        }
      } catch (error) {
        clearTimeout(timeoutId);
        
        if (error instanceof Error) {
          if (error.name === 'AbortError') {
            throw new ClientError('Request timeout', 'TIMEOUT_ERROR', { url, method: requestOptions.method });
          }
          
          if (!navigator.onLine) {
            throw new ClientError('Network error', 'NETWORK_ERROR', { url, method: requestOptions.method });
          }
        }

        throw error;
      }
    };

    if (retryConfig) {
      return await this.retryRequest(makeRequest, retryConfig);
    }

    return await makeRequest();
  }

  private async retryRequest<T>(
    requestFn: () => Promise<T>,
    retryConfig: RetryConfig
  ): Promise<T> {
    const shouldRetry = (error: any, attempt: number): boolean => {
      if (attempt >= retryConfig.maxAttempts) return false;
      
      // Check custom retry conditions
      if (retryConfig.retryConditions) {
        return retryConfig.retryConditions.some(condition => condition(error));
      }
      
      // Default retry conditions
      if (error instanceof ClientError) {
        // Retry on network errors and server errors (5xx)
        return error.code === 'NETWORK_ERROR' || 
               error.code === 'TIMEOUT_ERROR' ||
               (error.statusCode && error.statusCode >= 500);
      }
      
      return false;
    };

    return await utilRetry(
      requestFn,
      retryConfig.maxAttempts,
      retryConfig.delay,
      retryConfig.backoffMultiplier || 2
    );
  }

  private async createErrorFromResponse(
    response: Response,
    url: string,
    method?: string
  ): Promise<ClientError> {
    let errorData: any = {};
    
    try {
      const contentType = response.headers.get('content-type');
      if (contentType?.includes('application/json')) {
        errorData = await response.json();
      } else {
        errorData = { message: await response.text() };
      }
    } catch {
      errorData = { message: 'Unknown error' };
    }

    const error = new ClientError(
      errorData.message || `Request failed with status ${response.status}`,
      this.getErrorCodeFromStatus(response.status),
      errorData.details
    );

    error.statusCode = response.status;
    error.url = url;
    error.method = method;
    error.response = errorData;

    return error;
  }

  private getErrorCodeFromStatus(status: number): string {
    if (status >= 500) return 'SERVER_ERROR';
    if (status === 401) return 'AUTHENTICATION_ERROR';
    if (status === 403) return 'AUTHORIZATION_ERROR';
    if (status === 422 || status === 400) return 'VALIDATION_ERROR';
    if (status === 429) return 'RATE_LIMITED';
    return 'CLIENT_ERROR';
  }

  buildUrl(endpoint: string, params?: Record<string, any>): string {
    const path = endpoint.startsWith('/') ? endpoint : `${this.apiPath}/${endpoint}`;
    return buildUrl(this.baseURL, path, params);
  }
}

// ============================================================================
// WebSocket Utilities
// ============================================================================

export class WebSocketManager {
  private ws: WebSocket | null = null;
  private url: string;
  private reconnectAttempts = 0;
  private maxReconnectAttempts: number;
  private reconnectDelay: number;
  private backoffMultiplier: number;
  private heartbeatInterval?: NodeJS.Timeout;
  private heartbeatTimeout?: NodeJS.Timeout;
  private eventListeners = new Map<string, Set<(data: any) => void>>();
  private messageQueue: WebSocketMessage[] = [];
  private isConnecting = false;
  private storage: StorageManager;

  constructor(
    baseURL: string,
    config: CFAuthClientOptions['websocket'],
    storage: StorageManager
  ) {
    this.storage = storage;
    
    // Build WebSocket URL
    const wsProtocol = baseURL.startsWith('https://') ? 'wss://' : 'ws://';
    const wsHost = baseURL.replace(/^https?:\/\//, '');
    this.url = config?.url || `${wsProtocol}${wsHost}/ws`;
    
    // Configure reconnection
    this.maxReconnectAttempts = config?.reconnect?.maxAttempts || 5;
    this.reconnectDelay = config?.reconnect?.delay || 1000;
    this.backoffMultiplier = config?.reconnect?.backoffMultiplier || 1.5;
  }

  async connect(): Promise<void> {
    if (this.ws?.readyState === WebSocket.OPEN || this.isConnecting) {
      return;
    }

    this.isConnecting = true;

    return new Promise((resolve, reject) => {
      try {
        // Add authentication token to WebSocket URL
        this.addAuthToUrl().then(authUrl => {
          this.ws = new WebSocket(authUrl);

          this.ws.onopen = () => {
            this.isConnecting = false;
            this.reconnectAttempts = 0;
            this.startHeartbeat();
            this.processMessageQueue();
            this.emit('connect', {});
            resolve();
          };

          this.ws.onclose = (event) => {
            this.isConnecting = false;
            this.stopHeartbeat();
            this.emit('disconnect', { code: event.code, reason: event.reason });
            
            if (event.code !== 1000 && this.shouldReconnect()) {
              this.scheduleReconnect();
            }
          };

          this.ws.onerror = (error) => {
            this.isConnecting = false;
            this.emit('error', { error });
            reject(error);
          };

          this.ws.onmessage = (event) => {
            try {
              const message: WebSocketMessage = JSON.parse(event.data);
              this.emit('message', { message });
              this.emit(message.type, message.payload);
            } catch (error) {
              console.warn('Failed to parse WebSocket message:', error);
            }
          };
        }).catch(reject);
      } catch (error) {
        this.isConnecting = false;
        reject(error);
      }
    });
  }

  disconnect(): void {
    if (this.ws) {
      this.ws.close(1000, 'Client disconnect');
      this.ws = null;
    }
    this.stopHeartbeat();
    this.reconnectAttempts = this.maxReconnectAttempts; // Prevent reconnection
  }

  send(message: WebSocketMessage): void {
    if (this.ws?.readyState === WebSocket.OPEN) {
      this.ws.send(JSON.stringify(message));
    } else {
      // Queue message for later
      this.messageQueue.push(message);
    }
  }

  on(event: string, listener: (data: any) => void): () => void {
    if (!this.eventListeners.has(event)) {
      this.eventListeners.set(event, new Set());
    }
    this.eventListeners.get(event)!.add(listener);

    // Return unsubscribe function
    return () => this.off(event, listener);
  }

  off(event: string, listener: (data: any) => void): void {
    const listeners = this.eventListeners.get(event);
    if (listeners) {
      listeners.delete(listener);
      if (listeners.size === 0) {
        this.eventListeners.delete(event);
      }
    }
  }

  private emit(event: string, data: any): void {
    const listeners = this.eventListeners.get(event);
    if (listeners) {
      listeners.forEach(listener => {
        try {
          listener(data);
        } catch (error) {
          console.warn('Error in WebSocket event listener:', error);
        }
      });
    }
  }

  private async addAuthToUrl(): Promise<string> {
    const tokens = await this.storage.get('tokens');
    if (tokens?.accessToken) {
      const url = new URL(this.url);
      url.searchParams.set('token', tokens.accessToken);
      return url.toString();
    }
    return this.url;
  }

  private shouldReconnect(): boolean {
    return this.reconnectAttempts < this.maxReconnectAttempts;
  }

  private scheduleReconnect(): void {
    const delay = this.reconnectDelay * Math.pow(this.backoffMultiplier, this.reconnectAttempts);
    
    setTimeout(() => {
      this.reconnectAttempts++;
      this.connect().catch(error => {
        console.warn('WebSocket reconnection failed:', error);
      });
    }, Math.min(delay, 30000)); // Cap at 30 seconds
  }

  private startHeartbeat(): void {
    const interval = 30000; // 30 seconds
    const timeout = 5000; // 5 seconds

    this.heartbeatInterval = setInterval(() => {
      if (this.ws?.readyState === WebSocket.OPEN) {
        this.send({
          type: 'ping',
          payload: {},
          timestamp: Date.now()
        });

        this.heartbeatTimeout = setTimeout(() => {
          // No pong received, close connection
          this.ws?.close(1000, 'Heartbeat timeout');
        }, timeout);
      }
    }, interval);

    // Listen for pong messages
    this.on('pong', () => {
      if (this.heartbeatTimeout) {
        clearTimeout(this.heartbeatTimeout);
        this.heartbeatTimeout = undefined;
      }
    });
  }

  private stopHeartbeat(): void {
    if (this.heartbeatInterval) {
      clearInterval(this.heartbeatInterval);
      this.heartbeatInterval = undefined;
    }
    if (this.heartbeatTimeout) {
      clearTimeout(this.heartbeatTimeout);
      this.heartbeatTimeout = undefined;
    }
  }

  private processMessageQueue(): void {
    while (this.messageQueue.length > 0 && this.ws?.readyState === WebSocket.OPEN) {
      const message = this.messageQueue.shift()!;
      this.send(message);
    }
  }

  get state() {
    return {
      connected: this.ws?.readyState === WebSocket.OPEN,
      connecting: this.isConnecting,
      error: null, // Would need to track last error
      lastConnected: null, // Would need to track this
      reconnectAttempts: this.reconnectAttempts
    };
  }
}

// ============================================================================
// Token Management
// ============================================================================

export class TokenManager {
  private storage: StorageManager;
  private refreshPromise: Promise<void> | null = null;

  constructor(storage: StorageManager) {
    this.storage = storage;
  }

  async getTokens(): Promise<{
    accessToken: string | null;
    refreshToken: string | null;
    expiresAt: number | null;
  } | null> {
    return await this.storage.get('tokens');
  }

  async setTokens(tokens: {
    accessToken: string;
    refreshToken?: string;
    expiresAt?: number;
  }): Promise<void> {
    await this.storage.set('tokens', {
      accessToken: tokens.accessToken,
      refreshToken: tokens.refreshToken || null,
      expiresAt: tokens.expiresAt || null
    });
  }

  async clearTokens(): Promise<void> {
    await this.storage.remove('tokens');
  }

  async shouldRefresh(thresholdMinutes: number = 5): Promise<boolean> {
    const tokens = await this.getTokens();
    if (!tokens?.expiresAt) return false;

    const now = Date.now();
    const threshold = thresholdMinutes * 60 * 1000;
    return (tokens.expiresAt - now) <= threshold;
  }

  async refreshTokens(
    refreshEndpoint: string,
    requestManager: RequestManager
  ): Promise<void> {
    // Prevent multiple concurrent refresh attempts
    if (this.refreshPromise) {
      return this.refreshPromise;
    }

    this.refreshPromise = this.performRefresh(refreshEndpoint, requestManager);
    
    try {
      await this.refreshPromise;
    } finally {
      this.refreshPromise = null;
    }
  }

  private async performRefresh(
    refreshEndpoint: string,
    requestManager: RequestManager
  ): Promise<void> {
    const tokens = await this.getTokens();
    if (!tokens?.refreshToken) {
      throw new CFAuthError('No refresh token available', 'AUTHENTICATION_ERROR');
    }

    try {
      const response = await requestManager.request(refreshEndpoint, {
        method: 'POST',
        body: {
          refreshToken: tokens.refreshToken
        }
      });

      await this.setTokens({
        accessToken: response.accessToken,
        refreshToken: response.refreshToken || tokens.refreshToken,
        expiresAt: response.expiresAt
      });
    } catch (error) {
      // If refresh fails, clear tokens
      await this.clearTokens();
      throw error;
    }
  }
}

// ============================================================================
// Cache Utilities
// ============================================================================

export class CacheManager {
  private cache = new Map<string, {
    data: any;
    expiresAt: number;
    tags: Set<string>;
  }>();
  private defaultTTL: number;
  private maxSize: number;

  constructor(config: CFAuthClientOptions['cache']) {
    this.defaultTTL = config?.defaultTTL || 5 * 60 * 1000; // 5 minutes
    this.maxSize = config?.maxSize || 100;
  }

  get<T>(key: string): T | null {
    const item = this.cache.get(key);
    if (!item) return null;

    if (Date.now() > item.expiresAt) {
      this.cache.delete(key);
      return null;
    }

    return item.data;
  }

  set<T>(key: string, data: T, ttl?: number, tags: string[] = []): void {
    // Implement LRU eviction if cache is full
    if (this.cache.size >= this.maxSize && !this.cache.has(key)) {
      const firstKey = this.cache.keys().next().value;
      if (firstKey) {
        this.cache.delete(firstKey);
      }
    }

    this.cache.set(key, {
      data,
      expiresAt: Date.now() + (ttl || this.defaultTTL),
      tags: new Set(tags)
    });
  }

  delete(key: string): boolean {
    return this.cache.delete(key);
  }

  invalidateByTag(tag: string): void {
    for (const [key, item] of this.cache.entries()) {
      if (item.tags.has(tag)) {
        this.cache.delete(key);
      }
    }
  }

  clear(): void {
    this.cache.clear();
  }

  size(): number {
    return this.cache.size;
  }

  cleanup(): void {
    const now = Date.now();
    for (const [key, item] of this.cache.entries()) {
      if (now > item.expiresAt) {
        this.cache.delete(key);
      }
    }
  }
}

// ============================================================================
// Utility Functions
// ============================================================================

export function createClientError(
  message: string,
  code: string,
  details?: any
): ClientError {
  const error = new ClientError(message, code, details);
  return error;
}

export function isClientError(error: any): error is ClientError {
  return error instanceof ClientError;
}

export function parseJWTPayload(token: string): any {
  try {
    const [, payload] = token.split('.');
    if (!payload) return null;
    
    const decoded = atob(payload.replace(/-/g, '+').replace(/_/g, '/'));
    return JSON.parse(decoded);
  } catch {
    return null;
  }
}

export function isTokenExpired(token: string): boolean {
  const payload = parseJWTPayload(token);
  if (!payload || !payload.exp) return true;
  return Date.now() >= payload.exp * 1000;
}

export function getTokenExpirationTime(token: string): Date | null {
  const payload = parseJWTPayload(token);
  if (!payload || !payload.exp) return null;
  return new Date(payload.exp * 1000);
}

export function validateEmail(email: string): boolean {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email.trim().toLowerCase());
}

export function validatePassword(password: string, minLength: number = 8): {
  isValid: boolean;
  errors: string[];
} {
  const errors: string[] = [];

  if (password.length < minLength) {
    errors.push(`Password must be at least ${minLength} characters long`);
  }

  if (!/[A-Z]/.test(password)) {
    errors.push('Password must contain at least one uppercase letter');
  }

  if (!/[a-z]/.test(password)) {
    errors.push('Password must contain at least one lowercase letter');
  }

  if (!/\d/.test(password)) {
    errors.push('Password must contain at least one number');
  }

  return {
    isValid: errors.length === 0,
    errors
  };
}

export function generateRandomId(length: number = 16): string {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
  let result = '';
  for (let i = 0; i < length; i++) {
    result += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return result;
}

export function debounce<T extends (...args: any[]) => any>(
  func: T,
  delay: number
): (...args: Parameters<T>) => void {
  let timeoutId: NodeJS.Timeout;
  
  return (...args: Parameters<T>) => {
    clearTimeout(timeoutId);
    timeoutId = setTimeout(() => func(...args), delay);
  };
}

export function throttle<T extends (...args: any[]) => any>(
  func: T,
  delay: number
): (...args: Parameters<T>) => void {
  let lastCallTime = 0;
  
  return (...args: Parameters<T>) => {
    const now = Date.now();
    if (now - lastCallTime >= delay) {
      lastCallTime = now;
      func(...args);
    }
  };
}

// ============================================================================
// Error Handling
// ============================================================================

export class ClientError extends CFAuthError {
  statusCode?: number;
  url?: string;
  method?: string;
  response?: any;
  attempt?: number;

  constructor(message: string, code: string, details?: any) {
    super(message, code, details);
    this.name = 'ClientError';
  }
}

export function handleApiError(error: any): ClientError {
  if (isClientError(error)) {
    return error;
  }

  if (error instanceof CFAuthError) {
    const clientError = new ClientError(error.message, error.code, error.details);
    return clientError;
  }

  if (error instanceof Error) {
    return new ClientError(error.message, 'CLIENT_ERROR', { originalError: error });
  }

  return new ClientError('An unknown error occurred', 'UNKNOWN_ERROR', { originalError: error });
}
/**
 * HTTP utilities for CF-Better-Auth
 * 
 * @fileoverview This module provides HTTP request helpers, response handling,
 * error processing, and other network-related utilities.
 * 
 * Features:
 * - Type-safe HTTP client with retry logic
 * - Request/response interceptors
 * - Error handling and classification
 * - URL building and query parameter handling
 * - HTTP header utilities
 * - Content type handling
 */

import type { Brand } from '@cf-auth/types';
import { HTTP_CONSTANTS } from './constants';

/**
 * Branded types for HTTP-related data
 */
export type HTTPMethod = 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE' | 'HEAD' | 'OPTIONS';
export type HTTPStatusCode = Brand<number, 'HTTPStatusCode'>;
export type ContentType = Brand<string, 'ContentType'>;
export type UserAgent = Brand<string, 'UserAgent'>;

/**
 * HTTP request/response interfaces
 */
export interface HTTPHeaders {
  [key: string]: string | string[] | undefined;
}

export interface HTTPRequestOptions {
  /** HTTP method */
  method?: HTTPMethod;
  /** Request headers */
  headers?: HTTPHeaders;
  /** Request body */
  body?: any;
  /** Query parameters */
  query?: Record<string, any>;
  /** Request timeout in milliseconds */
  timeout?: number;
  /** Retry configuration */
  retry?: RetryOptions;
  /** Whether to follow redirects */
  followRedirects?: boolean;
  /** Maximum number of redirects to follow */
  maxRedirects?: number;
  /** Abort signal */
  signal?: AbortSignal;
  /** Request interceptor */
  beforeRequest?: RequestInterceptor;
  /** Response interceptor */
  afterResponse?: ResponseInterceptor;
  /** Base URL for relative URLs */
  baseURL?: string;
  /** Authentication token */
  auth?: string | AuthConfig;
  /** Content type override */
  contentType?: ContentType;
}

export interface HTTPResponse<T = any> {
  /** Response status code */
  status: HTTPStatusCode;
  /** Response status text */
  statusText: string;
  /** Response headers */
  headers: HTTPHeaders;
  /** Parsed response data */
  data: T;
  /** Raw response body */
  body?: string;
  /** Request URL */
  url: string;
  /** Whether response was from cache */
  fromCache?: boolean;
  /** Response timing information */
  timing?: {
    start: number;
    end: number;
    duration: number;
  };
}

export interface HTTPError extends Error {
  /** HTTP status code */
  status?: HTTPStatusCode;
  /** Response data */
  response?: HTTPResponse;
  /** Request options */
  request?: HTTPRequestOptions;
  /** Error code */
  code?: string;
  /** Whether error is retryable */
  retryable?: boolean;
}

export interface RetryOptions {
  /** Maximum number of retry attempts */
  maxAttempts?: number;
  /** Initial delay between retries in milliseconds */
  delay?: number;
  /** Backoff multiplier */
  backoff?: number;
  /** Maximum delay between retries */
  maxDelay?: number;
  /** Custom retry condition */
  shouldRetry?: (error: HTTPError, attempt: number) => boolean;
  /** Jitter for delay randomization */
  jitter?: boolean;
}

export interface AuthConfig {
  /** Auth type */
  type: 'bearer' | 'basic' | 'api-key';
  /** Token or credentials */
  credentials: string | { username: string; password: string } | { key: string; value: string };
  /** Header name for API key auth */
  header?: string;
}

export interface CacheOptions {
  /** Cache TTL in seconds */
  ttl?: number;
  /** Cache key prefix */
  keyPrefix?: string;
  /** Whether to cache errors */
  cacheErrors?: boolean;
  /** Custom cache key generator */
  keyGenerator?: (url: string, options: HTTPRequestOptions) => string;
}

/**
 * Type definitions for interceptors
 */
export type RequestInterceptor = (options: HTTPRequestOptions) => Promise<HTTPRequestOptions>;
export type ResponseInterceptor = <T>(response: HTTPResponse<T>) => Promise<HTTPResponse<T>>;

/**
 * HTTP client class with retry and caching capabilities
 */
export class HTTPClient {
  private baseURL: string;
  private defaultHeaders: HTTPHeaders;
  private defaultTimeout: number;
  private requestInterceptors: RequestInterceptor[] = [];
  private responseInterceptors: ResponseInterceptor[] = [];
  private cache?: Map<string, { data: any; expires: number }>;

  constructor(options: {
    baseURL?: string;
    headers?: HTTPHeaders;
    timeout?: number;
    enableCache?: boolean;
  } = {}) {
    this.baseURL = options.baseURL || '';
    this.defaultHeaders = options.headers || {};
    this.defaultTimeout = options.timeout || HTTP_CONSTANTS.DEFAULT_TIMEOUT;
    
    if (options.enableCache) {
      this.cache = new Map();
      this.startCacheCleanup();
    }
  }

  /**
   * Add request interceptor
   */
  addRequestInterceptor(interceptor: RequestInterceptor): void {
    this.requestInterceptors.push(interceptor);
  }

  /**
   * Add response interceptor
   */
  addResponseInterceptor(interceptor: ResponseInterceptor): void {
    this.responseInterceptors.push(interceptor);
  }

  /**
   * Make HTTP GET request
   */
  async get<T = any>(url: string, options: Omit<HTTPRequestOptions, 'method' | 'body'> = {}): Promise<HTTPResponse<T>> {
    return this.request<T>(url, { ...options, method: 'GET' });
  }

  /**
   * Make HTTP POST request
   */
  async post<T = any>(url: string, data?: any, options: Omit<HTTPRequestOptions, 'method'> = {}): Promise<HTTPResponse<T>> {
    return this.request<T>(url, { ...options, method: 'POST', body: data });
  }

  /**
   * Make HTTP PUT request
   */
  async put<T = any>(url: string, data?: any, options: Omit<HTTPRequestOptions, 'method'> = {}): Promise<HTTPResponse<T>> {
    return this.request<T>(url, { ...options, method: 'PUT', body: data });
  }

  /**
   * Make HTTP PATCH request
   */
  async patch<T = any>(url: string, data?: any, options: Omit<HTTPRequestOptions, 'method'> = {}): Promise<HTTPResponse<T>> {
    return this.request<T>(url, { ...options, method: 'PATCH', body: data });
  }

  /**
   * Make HTTP DELETE request
   */
  async delete<T = any>(url: string, options: Omit<HTTPRequestOptions, 'method' | 'body'> = {}): Promise<HTTPResponse<T>> {
    return this.request<T>(url, { ...options, method: 'DELETE' });
  }

  /**
   * Make generic HTTP request
   */
  async request<T = any>(url: string, options: HTTPRequestOptions = {}): Promise<HTTPResponse<T>> {
    const startTime = Date.now();
    let finalOptions = this.mergeOptions(options);
    
    // Apply request interceptors
    for (const interceptor of this.requestInterceptors) {
      finalOptions = await interceptor(finalOptions);
    }

    // Check cache first
    if (finalOptions.method === 'GET' && this.cache) {
      const cacheKey = this.generateCacheKey(url, finalOptions);
      const cached = this.cache.get(cacheKey);
      if (cached && cached.expires > Date.now()) {
        return {
          ...cached.data,
          fromCache: true
        };
      }
    }

    // Execute request with retry logic
    const response = await this.executeWithRetry<T>(url, finalOptions, startTime);

    // Cache successful GET requests
    if (response.status < 400 && finalOptions.method === 'GET' && this.cache) {
      const cacheKey = this.generateCacheKey(url, finalOptions);
      this.cache.set(cacheKey, {
        data: response,
        expires: Date.now() + 5 * 60 * 1000 // 5 minutes default
      });
    }

    return response;
  }

  /**
   * Execute request with retry logic
   */
  private async executeWithRetry<T>(
    url: string,
    options: HTTPRequestOptions,
    startTime: number
  ): Promise<HTTPResponse<T>> {
    const retry = options.retry || {};
    const maxAttempts = retry.maxAttempts || HTTP_CONSTANTS.DEFAULT_RETRY_ATTEMPTS;
    
    let lastError: HTTPError | null = null;
    
    for (let attempt = 1; attempt <= maxAttempts; attempt++) {
      try {
        const response = await this.executeRequest<T>(url, options, startTime);
        
        // Apply response interceptors
        let finalResponse = response;
        for (const interceptor of this.responseInterceptors) {
          finalResponse = await interceptor(finalResponse);
        }
        
        return finalResponse;
      } catch (error) {
        lastError = error as HTTPError;
        
        // Don't retry on last attempt
        if (attempt === maxAttempts) {
          break;
        }
        
        // Check if error is retryable
        if (!this.shouldRetry(lastError, attempt, retry)) {
          break;
        }
        
        // Calculate delay
        const delay = this.calculateRetryDelay(attempt, retry);
        await this.sleep(delay);
      }
    }
    
    throw lastError;
  }

  /**
   * Execute single HTTP request
   */
  private async executeRequest<T>(
    url: string,
    options: HTTPRequestOptions,
    startTime: number
  ): Promise<HTTPResponse<T>> {
    const fullURL = this.buildURL(url, options);
    const headers = this.buildHeaders(options);
    const body = this.buildBody(options);
    
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), options.timeout || this.defaultTimeout);
    
    try {
      const response = await fetch(fullURL, {
        method: options.method || 'GET',
        headers: headers as any,
        body,
        signal: options.signal || controller.signal,
        redirect: options.followRedirects !== false ? 'follow' : 'manual'
      });
      
      clearTimeout(timeoutId);
      
      const endTime = Date.now();
      const responseData = await this.parseResponse<T>(response);
      
      const httpResponse: HTTPResponse<T> = {
        status: response.status as HTTPStatusCode,
        statusText: response.statusText,
        headers: this.parseHeaders(response.headers),
        data: responseData,
        url: response.url,
        timing: {
          start: startTime,
          end: endTime,
          duration: endTime - startTime
        }
      };
      
      // Throw error for non-2xx status codes
      if (!response.ok) {
        const error = this.createHTTPError(
          `HTTP ${response.status}: ${response.statusText}`,
          response.status as HTTPStatusCode,
          httpResponse,
          options
        );
        throw error;
      }
      
      return httpResponse;
    } catch (error) {
      clearTimeout(timeoutId);
      
      if (error instanceof Error) {
        if (error.name === 'AbortError') {
          throw this.createHTTPError('Request timeout', undefined, undefined, options, 'TIMEOUT');
        }
        
        if (error.name === 'TypeError' && error.message.includes('fetch')) {
          throw this.createHTTPError('Network error', undefined, undefined, options, 'NETWORK_ERROR');
        }
      }
      
      throw error;
    }
  }

  /**
   * Merge request options with defaults
   */
  private mergeOptions(options: HTTPRequestOptions): HTTPRequestOptions {
    return {
      method: 'GET',
      headers: { ...this.defaultHeaders, ...options.headers },
      timeout: this.defaultTimeout,
      followRedirects: true,
      maxRedirects: 5,
      ...options,
      baseURL: options.baseURL || this.baseURL
    };
  }

  /**
   * Build full URL with query parameters
   */
  private buildURL(url: string, options: HTTPRequestOptions): string {
    let fullURL = url;
    
    // Add base URL if URL is relative
    if (options.baseURL && !url.startsWith('http')) {
      fullURL = `${options.baseURL.replace(/\/$/, '')}/${url.replace(/^\//, '')}`;
    }
    
    // Add query parameters
    if (options.query && Object.keys(options.query).length > 0) {
      const queryString = this.buildQueryString(options.query);
      const separator = fullURL.includes('?') ? '&' : '?';
      fullURL = `${fullURL}${separator}${queryString}`;
    }
    
    return fullURL;
  }

  /**
   * Build request headers
   */
  private buildHeaders(options: HTTPRequestOptions): HTTPHeaders {
    const headers = { ...options.headers };
    
    // Add authentication header
    if (options.auth) {
      const authHeader = this.buildAuthHeader(options.auth);
      Object.assign(headers, authHeader);
    }
    
    // Set content type for POST/PUT/PATCH requests with body
    if (options.body && ['POST', 'PUT', 'PATCH'].includes(options.method || '')) {
      if (!headers['content-type'] && !headers['Content-Type']) {
        if (typeof options.body === 'object') {
          headers['Content-Type'] = HTTP_CONSTANTS.CONTENT_TYPES.JSON;
        } else {
          headers['Content-Type'] = options.contentType || HTTP_CONSTANTS.CONTENT_TYPES.TEXT;
        }
      }
    }
    
    return headers;
  }

  /**
   * Build authentication header
   */
  private buildAuthHeader(auth: string | AuthConfig): HTTPHeaders {
    if (typeof auth === 'string') {
      return { Authorization: `Bearer ${auth}` };
    }
    
    switch (auth.type) {
      case 'bearer':
        return { Authorization: `Bearer ${auth.credentials}` };
      
      case 'basic':
        const creds = auth.credentials as { username: string; password: string };
        const encoded = btoa(`${creds.username}:${creds.password}`);
        return { Authorization: `Basic ${encoded}` };
      
      case 'api-key':
        const apiKey = auth.credentials as { key: string; value: string };
        const header = auth.header || apiKey.key;
        return { [header]: apiKey.value };
      
      default:
        return {};
    }
  }

  /**
   * Build request body
   */
  private buildBody(options: HTTPRequestOptions): string | FormData | URLSearchParams | undefined {
    if (!options.body) {
      return undefined;
    }
    
    const contentType = options.headers?.['content-type'] || options.headers?.['Content-Type'];
    
    if (contentType === HTTP_CONSTANTS.CONTENT_TYPES.JSON) {
      return JSON.stringify(options.body);
    }
    
    if (contentType === HTTP_CONSTANTS.CONTENT_TYPES.FORM) {
      const params = new URLSearchParams();
      Object.entries(options.body).forEach(([key, value]) => {
        params.append(key, String(value));
      });
      return params;
    }
    
    if (options.body instanceof FormData || options.body instanceof URLSearchParams) {
      return options.body;
    }
    
    if (typeof options.body === 'object') {
      return JSON.stringify(options.body);
    }
    
    return String(options.body);
  }

  /**
   * Parse response data
   */
  private async parseResponse<T>(response: Response): Promise<T> {
    const contentType = response.headers.get('content-type') || '';
    
    if (contentType.includes('application/json')) {
      const text = await response.text();
      return text ? JSON.parse(text) : null;
    }
    
    if (contentType.includes('text/')) {
      return response.text() as any;
    }
    
    if (contentType.includes('application/octet-stream')) {
      return response.arrayBuffer() as any;
    }
    
    // Try JSON first, fallback to text
    const text = await response.text();
    try {
      return JSON.parse(text);
    } catch {
      return text as any;
    }
  }

  /**
   * Parse response headers
   */
  private parseHeaders(headers: Headers): HTTPHeaders {
    const result: HTTPHeaders = {};
    headers.forEach((value, key) => {
      result[key.toLowerCase()] = value;
    });
    return result;
  }

  /**
   * Create HTTP error
   */
  private createHTTPError(
    message: string,
    status?: HTTPStatusCode,
    response?: HTTPResponse,
    request?: HTTPRequestOptions,
    code?: string
  ): HTTPError {
    const error = new Error(message) as HTTPError;
    error.name = 'HTTPError';
    error.status = status;
    error.response = response;
    error.request = request;
    error.code = code;
    error.retryable = this.isRetryableError(status, code);
    return error;
  }

  /**
   * Check if error is retryable
   */
  private isRetryableError(status?: HTTPStatusCode, code?: string): boolean {
    if (code === 'TIMEOUT' || code === 'NETWORK_ERROR') {
      return true;
    }
    
    if (status) {
      // Retry on server errors and rate limiting
      return status >= 500 || status === 429;
    }
    
    return false;
  }

  /**
   * Determine if should retry request
   */
  private shouldRetry(error: HTTPError, attempt: number, retryOptions: RetryOptions): boolean {
    if (retryOptions.shouldRetry) {
      return retryOptions.shouldRetry(error, attempt);
    }
    
    return error.retryable || false;
  }

  /**
   * Calculate retry delay with exponential backoff
   */
  private calculateRetryDelay(attempt: number, retryOptions: RetryOptions): number {
    const baseDelay = retryOptions.delay || HTTP_CONSTANTS.DEFAULT_RETRY_DELAY;
    const backoff = retryOptions.backoff || 2;
    const maxDelay = retryOptions.maxDelay || 30000;
    
    let delay = baseDelay * Math.pow(backoff, attempt - 1);
    
    // Apply jitter
    if (retryOptions.jitter !== false) {
      delay *= 0.5 + Math.random() * 0.5;
    }
    
    return Math.min(delay, maxDelay);
  }

  /**
   * Sleep for specified duration
   */
  private sleep(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  /**
   * Build query string from object
   */
  private buildQueryString(params: Record<string, any>): string {
    const searchParams = new URLSearchParams();
    
    Object.entries(params).forEach(([key, value]) => {
      if (value !== undefined && value !== null) {
        if (Array.isArray(value)) {
          value.forEach(v => searchParams.append(key, String(v)));
        } else {
          searchParams.append(key, String(value));
        }
      }
    });
    
    return searchParams.toString();
  }

  /**
   * Generate cache key
   */
  private generateCacheKey(url: string, options: HTTPRequestOptions): string {
    const keyData = {
      url,
      method: options.method,
      query: options.query,
      headers: Object.fromEntries(
        Object.entries(options.headers || {})
          .filter(([key]) => !['authorization', 'cookie'].includes(key.toLowerCase()))
      )
    };
    
    return btoa(JSON.stringify(keyData));
  }

  /**
   * Start cache cleanup interval
   */
  private startCacheCleanup(): void {
    if (this.cache) {
      setInterval(() => {
        const now = Date.now();
        for (const [key, value] of this.cache!.entries()) {
          if (value.expires <= now) {
            this.cache!.delete(key);
          }
        }
      }, 5 * 60 * 1000); // Cleanup every 5 minutes
    }
  }
}

/**
 * Utility functions
 */

/**
 * Create a default HTTP client instance
 */
export const defaultClient = new HTTPClient();

/**
 * Convenience functions using the default client
 */
export const get = defaultClient.get.bind(defaultClient);
export const post = defaultClient.post.bind(defaultClient);
export const put = defaultClient.put.bind(defaultClient);
export const patch = defaultClient.patch.bind(defaultClient);
export const del = defaultClient.delete.bind(defaultClient);

/**
 * Parse URL and extract components
 * 
 * @param url - URL to parse
 * @returns Parsed URL components
 */
export function parseURL(url: string): URL | null {
  try {
    return new URL(url);
  } catch {
    return null;
  }
}

/**
 * Build URL with base and path
 * 
 * @param base - Base URL
 * @param path - Path to append
 * @param params - Query parameters
 * @returns Built URL
 */
export function buildURL(base: string, path: string = '', params: Record<string, any> = {}): string {
  let url = `${base.replace(/\/$/, '')}/${path.replace(/^\//, '')}`;
  
  const queryString = buildQueryString(params);
  if (queryString) {
    url += `?${queryString}`;
  }
  
  return url;
}

/**
 * Build query string from parameters
 * 
 * @param params - Parameters object
 * @returns Query string
 */
export function buildQueryString(params: Record<string, any>): string {
  return new URLSearchParams(
    Object.entries(params)
      .filter(([, value]) => value !== undefined && value !== null)
      .map(([key, value]) => [key, String(value)])
  ).toString();
}

/**
 * Check if status code indicates success
 * 
 * @param status - HTTP status code
 * @returns Whether status indicates success
 */
export function isSuccessStatus(status: number): boolean {
  return status >= 200 && status < 300;
}

/**
 * Check if status code indicates client error
 * 
 * @param status - HTTP status code
 * @returns Whether status indicates client error
 */
export function isClientError(status: number): boolean {
  return status >= 400 && status < 500;
}

/**
 * Check if status code indicates server error
 * 
 * @param status - HTTP status code
 * @returns Whether status indicates server error
 */
export function isServerError(status: number): boolean {
  return status >= 500;
}

/**
 * Get HTTP status text
 * 
 * @param status - HTTP status code
 * @returns Status text
 */
export function getStatusText(status: number): string {
  const statusTexts: Record<number, string> = {
    200: 'OK',
    201: 'Created',
    204: 'No Content',
    400: 'Bad Request',
    401: 'Unauthorized',
    403: 'Forbidden',
    404: 'Not Found',
    409: 'Conflict',
    422: 'Unprocessable Entity',
    429: 'Too Many Requests',
    500: 'Internal Server Error',
    502: 'Bad Gateway',
    503: 'Service Unavailable',
    504: 'Gateway Timeout'
  };
  
  return statusTexts[status] || 'Unknown Status';
}

/**
 * Parse Content-Type header
 * 
 * @param contentType - Content-Type header value
 * @returns Parsed content type info
 */
export function parseContentType(contentType: string): {
  type: string;
  charset?: string;
  boundary?: string;
} {
  const [type, ...params] = contentType.split(';').map(s => s.trim());
  
  const result = { type };
  
  params.forEach(param => {
    const [key, value] = param.split('=').map(s => s.trim());
    if (key === 'charset') {
      (result as any).charset = value.replace(/['"]/g, '');
    } else if (key === 'boundary') {
      (result as any).boundary = value.replace(/['"]/g, '');
    }
  });
  
  return result;
}

/**
 * Detect content type from file extension or content
 * 
 * @param filename - File name or path
 * @param content - File content (optional)
 * @returns Detected content type
 */
export function detectContentType(filename: string, content?: any): string {
  const ext = filename.toLowerCase().split('.').pop();
  
  const mimeTypes: Record<string, string> = {
    'json': 'application/json',
    'xml': 'application/xml',
    'html': 'text/html',
    'css': 'text/css',
    'js': 'application/javascript',
    'pdf': 'application/pdf',
    'zip': 'application/zip',
    'png': 'image/png',
    'jpg': 'image/jpeg',
    'jpeg': 'image/jpeg',
    'gif': 'image/gif',
    'svg': 'image/svg+xml',
    'mp4': 'video/mp4',
    'mp3': 'audio/mpeg',
    'txt': 'text/plain'
  };
  
  return mimeTypes[ext || ''] || 'application/octet-stream';
}

/**
 * Normalize HTTP headers (lowercase keys)
 * 
 * @param headers - Headers object
 * @returns Normalized headers
 */
export function normalizeHeaders(headers: HTTPHeaders): HTTPHeaders {
  const normalized: HTTPHeaders = {};
  
  Object.entries(headers).forEach(([key, value]) => {
    normalized[key.toLowerCase()] = value;
  });
  
  return normalized;
}

/**
 * Create User-Agent string
 * 
 * @param appName - Application name
 * @param version - Application version
 * @param additional - Additional info
 * @returns User-Agent string
 */
export function createUserAgent(
  appName: string,
  version: string,
  additional: string = ''
): UserAgent {
  let userAgent = `${appName}/${version}`;
  
  if (additional) {
    userAgent += ` ${additional}`;
  }
  
  // Add Node.js info in server environment
  if (typeof process !== 'undefined' && process.versions?.node) {
    userAgent += ` Node.js/${process.versions.node}`;
  }
  
  return userAgent as UserAgent;
}
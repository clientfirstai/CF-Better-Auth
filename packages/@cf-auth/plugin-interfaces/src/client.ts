/**
 * Client Plugin Interface Definitions for CF-Better-Auth
 * 
 * This module defines the complete interface structure for client-side plugins
 * in the CF-Better-Auth ecosystem. It provides type-safe client development
 * with state management, actions, and server plugin type inference.
 */

import type { Atom, WritableAtom } from 'nanostores';
import type { BetterAuthPlugin } from './server';

// ============================================================================
// Core Client Plugin Interface
// ============================================================================

export interface BetterAuthClientPlugin<
  TServerPlugin extends BetterAuthPlugin = BetterAuthPlugin
> {
  /** Plugin identifier (should match server plugin) */
  id: string;
  
  /** Plugin name */
  name?: string;
  
  /** Plugin version */
  version?: string;
  
  /** Server plugin type for inference */
  $InferServerPlugin?: TServerPlugin;
  
  /** Client-side actions */
  getActions?: (fetchFn: FetchFunction) => ClientActions;
  
  /** State management atoms */
  getAtoms?: (fetchFn: FetchFunction) => ClientAtoms;
  
  /** React hooks */
  getHooks?: () => ClientHooks;
  
  /** Client configuration */
  options?: ClientPluginOptions;
  
  /** Plugin initialization */
  onInit?: (context: ClientPluginContext) => Promise<void> | void;
  
  /** Plugin cleanup */
  onDestroy?: () => Promise<void> | void;
  
  /** Event listeners */
  listeners?: ClientEventListeners;
}

// ============================================================================
// Type Inference System
// ============================================================================

/**
 * Infer client types from server plugin
 */
export type InferServerPlugin<T extends BetterAuthPlugin> = {
  endpoints: T['endpoints'];
  schema: T['schema'];
  options: T['options'];
};

/**
 * Infer client actions from server endpoints
 */
export type InferClientActions<T extends BetterAuthPlugin> = 
  T['endpoints'] extends Record<string, infer E>
    ? E extends { method: infer M; path: infer P }
      ? M extends 'POST'
        ? { [K in P as CamelCase<K>]: (...args: any[]) => Promise<any> }
        : M extends 'GET'
          ? { [K in P as `get${Capitalize<CamelCase<K>>}`]: (...args: any[]) => Promise<any> }
          : M extends 'PUT'
            ? { [K in P as `update${Capitalize<CamelCase<K>>}`]: (...args: any[]) => Promise<any> }
            : M extends 'DELETE'
              ? { [K in P as `delete${Capitalize<CamelCase<K>>}`]: (...args: any[]) => Promise<any> }
              : { [K in P as CamelCase<K>]: (...args: any[]) => Promise<any> }
      : {}
    : {};

/**
 * Convert kebab-case to camelCase
 */
type CamelCase<S extends string> = 
  S extends `${infer P1}-${infer P2}${infer P3}`
    ? `${P1}${Uppercase<P2>}${CamelCase<P3>}`
    : S;

// ============================================================================
// Client Actions
// ============================================================================

export type ClientActions = Record<string, (...args: any[]) => Promise<any>>;

export interface BaseClientActions {
  /** Generic API call */
  call: <T = any>(endpoint: string, options?: CallOptions) => Promise<T>;
  
  /** GET request */
  get: <T = any>(endpoint: string, params?: Record<string, any>) => Promise<T>;
  
  /** POST request */
  post: <T = any>(endpoint: string, data?: any) => Promise<T>;
  
  /** PUT request */
  put: <T = any>(endpoint: string, data?: any) => Promise<T>;
  
  /** DELETE request */
  delete: <T = any>(endpoint: string, data?: any) => Promise<T>;
  
  /** PATCH request */
  patch: <T = any>(endpoint: string, data?: any) => Promise<T>;
}

export interface CallOptions {
  /** HTTP method */
  method?: 'GET' | 'POST' | 'PUT' | 'DELETE' | 'PATCH';
  
  /** Request headers */
  headers?: Record<string, string>;
  
  /** Request body */
  body?: any;
  
  /** Query parameters */
  params?: Record<string, any>;
  
  /** Request timeout */
  timeout?: number;
  
  /** Retry configuration */
  retry?: RetryConfig;
  
  /** Cache configuration */
  cache?: CacheConfig;
}

export interface RetryConfig {
  /** Maximum retry attempts */
  attempts: number;
  
  /** Delay between retries (ms) */
  delay: number;
  
  /** Exponential backoff multiplier */
  backoff?: number;
  
  /** Retry condition function */
  retryIf?: (error: any) => boolean;
}

export interface CacheConfig {
  /** Cache key */
  key?: string;
  
  /** Cache TTL (ms) */
  ttl?: number;
  
  /** Whether to use stale data while revalidating */
  staleWhileRevalidate?: boolean;
}

// ============================================================================
// State Management (NanoStores)
// ============================================================================

export type ClientAtoms = Record<string, Atom<any> | WritableAtom<any>>;

export interface BaseClientAtoms {
  /** Loading state */
  loading: WritableAtom<boolean>;
  
  /** Error state */
  error: WritableAtom<Error | null>;
  
  /** Generic data store */
  data: WritableAtom<Record<string, any>>;
}

/**
 * Computed atom that derives its value from other atoms
 */
export interface ComputedAtom<T> extends Atom<T> {
  /** Dependencies */
  dependencies: Atom<any>[];
  
  /** Computation function */
  compute: (...values: any[]) => T;
}

/**
 * Async atom for handling asynchronous operations
 */
export interface AsyncAtom<T> extends WritableAtom<AsyncState<T>> {
  /** Execute async operation */
  execute: (...args: any[]) => Promise<T>;
  
  /** Reset to initial state */
  reset: () => void;
}

export interface AsyncState<T> {
  /** Loading state */
  loading: boolean;
  
  /** Data */
  data: T | null;
  
  /** Error */
  error: Error | null;
  
  /** Last update timestamp */
  lastUpdated: number | null;
}

// ============================================================================
// React Hooks
// ============================================================================

export type ClientHooks = Record<string, (...args: any[]) => any>;

export interface BaseClientHooks {
  /** Use atom value */
  useAtom: <T>(atom: Atom<T>) => T;
  
  /** Use writable atom */
  useWritableAtom: <T>(atom: WritableAtom<T>) => [T, (value: T) => void];
  
  /** Use async operation */
  useAsync: <T>(fn: () => Promise<T>, deps?: any[]) => AsyncState<T>;
  
  /** Use API call */
  useCall: <T>(endpoint: string, options?: CallOptions) => AsyncState<T>;
  
  /** Use optimistic updates */
  useOptimistic: <T>(atom: WritableAtom<T>, updateFn: (current: T, optimistic: T) => T) => [T, (optimistic: T) => void];
}

// ============================================================================
// Event System
// ============================================================================

export interface ClientEventListeners {
  /** Authentication events */
  onSignIn?: (session: any) => void;
  onSignOut?: () => void;
  onSessionUpdate?: (session: any) => void;
  onSessionExpire?: () => void;
  
  /** Error events */
  onError?: (error: Error) => void;
  onNetworkError?: (error: NetworkError) => void;
  onAuthError?: (error: AuthError) => void;
  
  /** State change events */
  onStateChange?: (state: any) => void;
  onDataUpdate?: (data: any) => void;
  
  /** Custom events */
  [eventName: string]: ((...args: any[]) => void) | undefined;
}

export interface NetworkError extends Error {
  status: number;
  statusText: string;
  response?: any;
}

export interface AuthError extends Error {
  code: string;
  details?: any;
}

// ============================================================================
// Plugin Context
// ============================================================================

export interface ClientPluginContext {
  /** Plugin configuration */
  config: ClientPluginOptions;
  
  /** Authentication client instance */
  auth: any; // Will be typed based on better-auth client
  
  /** Fetch function */
  fetch: FetchFunction;
  
  /** Event emitter */
  events: ClientEventEmitter;
  
  /** Storage utilities */
  storage: ClientStorage;
  
  /** Logger */
  logger: ClientLogger;
}

export interface ClientEventEmitter {
  /** Emit event */
  emit: (event: string, ...args: any[]) => void;
  
  /** Listen to event */
  on: (event: string, listener: (...args: any[]) => void) => () => void;
  
  /** Listen to event once */
  once: (event: string, listener: (...args: any[]) => void) => () => void;
  
  /** Remove event listener */
  off: (event: string, listener: (...args: any[]) => void) => void;
  
  /** Remove all listeners */
  removeAllListeners: (event?: string) => void;
}

export interface ClientStorage {
  /** Get item from storage */
  getItem: (key: string) => string | null;
  
  /** Set item in storage */
  setItem: (key: string, value: string) => void;
  
  /** Remove item from storage */
  removeItem: (key: string) => void;
  
  /** Clear all items */
  clear: () => void;
  
  /** Get all keys */
  keys: () => string[];
}

export interface ClientLogger {
  info: (message: string, data?: any) => void;
  warn: (message: string, data?: any) => void;
  error: (message: string, error?: Error) => void;
  debug: (message: string, data?: any) => void;
}

// ============================================================================
// Configuration
// ============================================================================

export interface ClientPluginOptions {
  /** Whether plugin is enabled */
  enabled?: boolean;
  
  /** Base URL for API calls */
  baseUrl?: string;
  
  /** Default request timeout */
  timeout?: number;
  
  /** Default retry configuration */
  retry?: RetryConfig;
  
  /** Default cache configuration */
  cache?: CacheConfig;
  
  /** Plugin-specific options */
  [key: string]: any;
}

// ============================================================================
// Fetch Function
// ============================================================================

export type FetchFunction = (
  endpoint: string,
  options?: FetchOptions
) => Promise<Response>;

export interface FetchOptions {
  /** HTTP method */
  method?: string;
  
  /** Request headers */
  headers?: Record<string, string>;
  
  /** Request body */
  body?: any;
  
  /** Query parameters */
  params?: Record<string, any>;
  
  /** Request timeout */
  timeout?: number;
  
  /** Credentials mode */
  credentials?: 'omit' | 'same-origin' | 'include';
  
  /** Cache mode */
  cache?: 'default' | 'no-store' | 'reload' | 'no-cache' | 'force-cache' | 'only-if-cached';
  
  /** Redirect mode */
  redirect?: 'follow' | 'error' | 'manual';
}

// ============================================================================
// Plugin Composition
// ============================================================================

/**
 * Compose multiple client plugins into a single plugin
 */
export interface ComposedClientPlugin<TPlugins extends readonly BetterAuthClientPlugin[]> {
  /** Composed plugin ID */
  id: string;
  
  /** Individual plugins */
  plugins: TPlugins;
  
  /** Combined actions */
  actions: UnionToIntersection<
    TPlugins[number] extends { getActions: (...args: any[]) => infer A }
      ? A
      : {}
  >;
  
  /** Combined atoms */
  atoms: UnionToIntersection<
    TPlugins[number] extends { getAtoms: (...args: any[]) => infer A }
      ? A
      : {}
  >;
  
  /** Combined hooks */
  hooks: UnionToIntersection<
    TPlugins[number] extends { getHooks: (...args: any[]) => infer H }
      ? H
      : {}
  >;
}

/**
 * Utility type to convert union to intersection
 */
type UnionToIntersection<U> = (U extends any ? (k: U) => void : never) extends (
  k: infer I
) => void
  ? I
  : never;

// ============================================================================
// Plugin Factory
// ============================================================================

export interface ClientPluginFactory<
  TOptions extends ClientPluginOptions = ClientPluginOptions
> {
  /** Create plugin instance */
  create: (options?: TOptions) => BetterAuthClientPlugin;
  
  /** Plugin metadata */
  meta: {
    id: string;
    name: string;
    version: string;
    description?: string;
    author?: string;
  };
}

// ============================================================================
// Advanced State Management
// ============================================================================

export interface StateManager {
  /** Get atom by key */
  getAtom: <T>(key: string) => Atom<T> | undefined;
  
  /** Set atom value */
  setAtom: <T>(key: string, value: T) => void;
  
  /** Subscribe to atom changes */
  subscribe: <T>(key: string, listener: (value: T) => void) => () => void;
  
  /** Create derived atom */
  derive: <T, R>(atoms: Atom<T>[], fn: (values: T[]) => R) => Atom<R>;
  
  /** Create async atom */
  async: <T>(key: string, fn: () => Promise<T>) => AsyncAtom<T>;
  
  /** Batch updates */
  batch: (fn: () => void) => void;
  
  /** Reset all atoms */
  reset: () => void;
}

// ============================================================================
// Error Handling
// ============================================================================

export interface ErrorHandler {
  /** Handle API errors */
  handleApiError: (error: any) => void;
  
  /** Handle network errors */
  handleNetworkError: (error: NetworkError) => void;
  
  /** Handle authentication errors */
  handleAuthError: (error: AuthError) => void;
  
  /** Global error handler */
  handleError: (error: Error, context?: any) => void;
}

export interface ErrorBoundary {
  /** Whether error boundary is active */
  isActive: boolean;
  
  /** Current error */
  error: Error | null;
  
  /** Error info */
  errorInfo: any;
  
  /** Reset error boundary */
  reset: () => void;
  
  /** Error boundary component */
  component: React.ComponentType<{ children: React.ReactNode }>;
}
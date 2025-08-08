/**
 * Async utilities for CF-Better-Auth
 * 
 * @fileoverview This module provides async utilities including retry logic,
 * debouncing, throttling, and other async control flow helpers.
 * 
 * Features:
 * - Retry with exponential backoff
 * - Debounce and throttle functions
 * - Timeout and cancellation
 * - Queue management
 * - Rate limiting
 * - Batch processing
 */

import { HTTP_CONSTANTS } from './constants';

/**
 * Retry configuration
 */
export interface RetryOptions {
  /** Maximum number of attempts */
  maxAttempts?: number;
  /** Initial delay in milliseconds */
  delay?: number;
  /** Backoff multiplier */
  backoff?: number;
  /** Maximum delay in milliseconds */
  maxDelay?: number;
  /** Custom retry condition */
  shouldRetry?: (error: Error, attempt: number) => boolean;
  /** Add jitter to delay */
  jitter?: boolean;
  /** Timeout for each attempt */
  timeout?: number;
}

export interface DebounceOptions {
  /** Delay in milliseconds */
  delay: number;
  /** Execute on leading edge */
  leading?: boolean;
  /** Execute on trailing edge */
  trailing?: boolean;
  /** Maximum wait time */
  maxWait?: number;
}

export interface ThrottleOptions {
  /** Delay in milliseconds */
  delay: number;
  /** Execute on leading edge */
  leading?: boolean;
  /** Execute on trailing edge */
  trailing?: boolean;
}

export interface TimeoutOptions {
  /** Timeout in milliseconds */
  timeout: number;
  /** Custom error message */
  message?: string;
  /** AbortController signal */
  signal?: AbortSignal;
}

export interface QueueOptions {
  /** Maximum concurrent operations */
  concurrency?: number;
  /** Queue timeout in milliseconds */
  timeout?: number;
  /** Maximum queue size */
  maxSize?: number;
}

/**
 * Result types
 */
export interface RetryResult<T> {
  value: T;
  attempts: number;
  totalTime: number;
}

export interface DebouncedFunction<T extends (...args: any[]) => any> {
  (...args: Parameters<T>): Promise<ReturnType<T>>;
  cancel(): void;
  flush(): Promise<ReturnType<T> | undefined>;
  pending(): boolean;
}

export interface ThrottledFunction<T extends (...args: any[]) => any> {
  (...args: Parameters<T>): ReturnType<T> | undefined;
  cancel(): void;
  flush(): ReturnType<T> | undefined;
}

/**
 * Basic async utilities
 */

/**
 * Sleep for specified duration
 * 
 * @param ms - Milliseconds to sleep
 * @returns Promise that resolves after delay
 * 
 * @example
 * ```typescript
 * await sleep(1000); // Sleep for 1 second
 * ```
 */
export function sleep(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}

/**
 * Add timeout to a promise
 * 
 * @param promise - Promise to add timeout to
 * @param options - Timeout options
 * @returns Promise with timeout
 * 
 * @example
 * ```typescript
 * const result = await withTimeout(fetchData(), { timeout: 5000 });
 * ```
 */
export async function withTimeout<T>(
  promise: Promise<T>,
  options: TimeoutOptions
): Promise<T> {
  const { timeout, message, signal } = options;

  return new Promise((resolve, reject) => {
    let timeoutId: NodeJS.Timeout;
    let completed = false;

    // Handle existing abort signal
    if (signal?.aborted) {
      reject(new Error('Operation was aborted'));
      return;
    }

    // Setup timeout
    timeoutId = setTimeout(() => {
      if (!completed) {
        completed = true;
        reject(new Error(message || `Operation timed out after ${timeout}ms`));
      }
    }, timeout);

    // Setup abort listener
    const abortListener = () => {
      if (!completed) {
        completed = true;
        clearTimeout(timeoutId);
        reject(new Error('Operation was aborted'));
      }
    };

    signal?.addEventListener('abort', abortListener);

    // Handle promise resolution
    promise
      .then(value => {
        if (!completed) {
          completed = true;
          clearTimeout(timeoutId);
          signal?.removeEventListener('abort', abortListener);
          resolve(value);
        }
      })
      .catch(error => {
        if (!completed) {
          completed = true;
          clearTimeout(timeoutId);
          signal?.removeEventListener('abort', abortListener);
          reject(error);
        }
      });
  });
}

/**
 * Retry a function with exponential backoff
 * 
 * @param fn - Function to retry
 * @param options - Retry options
 * @returns Promise with retry result
 * 
 * @example
 * ```typescript
 * const result = await retry(
 *   () => apiCall(),
 *   { maxAttempts: 3, delay: 1000, backoff: 2 }
 * );
 * ```
 */
export async function retry<T>(
  fn: () => Promise<T>,
  options: RetryOptions = {}
): Promise<RetryResult<T>> {
  const {
    maxAttempts = HTTP_CONSTANTS.DEFAULT_RETRY_ATTEMPTS,
    delay = HTTP_CONSTANTS.DEFAULT_RETRY_DELAY,
    backoff = 2,
    maxDelay = 30000,
    shouldRetry = () => true,
    jitter = true,
    timeout
  } = options;

  const startTime = Date.now();
  let lastError: Error;

  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    try {
      const operation = timeout ? withTimeout(fn(), { timeout }) : fn();
      const value = await operation;
      
      return {
        value,
        attempts: attempt,
        totalTime: Date.now() - startTime
      };
    } catch (error) {
      lastError = error as Error;

      // Don't retry on last attempt
      if (attempt === maxAttempts) {
        break;
      }

      // Check if should retry
      if (!shouldRetry(lastError, attempt)) {
        break;
      }

      // Calculate delay
      let nextDelay = delay * Math.pow(backoff, attempt - 1);
      nextDelay = Math.min(nextDelay, maxDelay);

      // Add jitter
      if (jitter) {
        nextDelay *= 0.5 + Math.random() * 0.5;
      }

      await sleep(nextDelay);
    }
  }

  throw lastError!;
}

/**
 * Debounce function execution
 * 
 * @param fn - Function to debounce
 * @param options - Debounce options
 * @returns Debounced function
 * 
 * @example
 * ```typescript
 * const debouncedSave = debounce(saveData, { delay: 300 });
 * debouncedSave(data); // Will execute after 300ms delay
 * ```
 */
export function debounce<T extends (...args: any[]) => any>(
  fn: T,
  options: DebounceOptions
): DebouncedFunction<T> {
  const { delay, leading = false, trailing = true, maxWait } = options;

  let timeoutId: NodeJS.Timeout | undefined;
  let maxTimeoutId: NodeJS.Timeout | undefined;
  let lastCallTime: number | undefined;
  let lastInvokeTime = 0;
  let lastArgs: Parameters<T> | undefined;
  let result: ReturnType<T>;
  let pendingResolvers: Array<{
    resolve: (value: ReturnType<T>) => void;
    reject: (error: Error) => void;
  }> = [];

  function invokeFunc(time: number): ReturnType<T> {
    const args = lastArgs!;
    lastArgs = undefined;
    lastInvokeTime = time;

    try {
      result = fn(...args);
      
      // Resolve all pending promises
      pendingResolvers.forEach(({ resolve }) => resolve(result));
      pendingResolvers = [];
      
      return result;
    } catch (error) {
      // Reject all pending promises
      pendingResolvers.forEach(({ reject }) => reject(error as Error));
      pendingResolvers = [];
      throw error;
    }
  }

  function shouldInvoke(time: number): boolean {
    const timeSinceLastCall = lastCallTime === undefined ? 0 : time - lastCallTime;
    const timeSinceLastInvoke = time - lastInvokeTime;

    return (
      lastCallTime === undefined ||
      timeSinceLastCall >= delay ||
      timeSinceLastCall < 0 ||
      (maxWait !== undefined && timeSinceLastInvoke >= maxWait)
    );
  }

  function timerExpired(): void {
    const time = Date.now();
    if (shouldInvoke(time)) {
      invokeFunc(time);
    }
  }

  function remainingWait(time: number): number {
    const timeSinceLastCall = lastCallTime === undefined ? 0 : time - lastCallTime;
    const timeSinceLastInvoke = time - lastInvokeTime;
    const timeWaiting = delay - timeSinceLastCall;

    if (maxWait !== undefined) {
      return Math.min(timeWaiting, maxWait - timeSinceLastInvoke);
    }
    
    return timeWaiting;
  }

  const debouncedFn = function (...args: Parameters<T>): Promise<ReturnType<T>> {
    return new Promise<ReturnType<T>>((resolve, reject) => {
      const time = Date.now();
      const isInvoking = shouldInvoke(time);

      lastArgs = args;
      lastCallTime = time;
      pendingResolvers.push({ resolve, reject });

      if (isInvoking) {
        if (timeoutId === undefined) {
          // Leading edge
          if (leading) {
            try {
              const result = invokeFunc(time);
              resolve(result);
              return;
            } catch (error) {
              reject(error);
              return;
            }
          }
          
          lastInvokeTime = time;
        } else {
          // Subsequent calls
          if (trailing) {
            clearTimeout(timeoutId);
            timeoutId = setTimeout(timerExpired, delay);
          }
        }
      }

      if (timeoutId === undefined && trailing) {
        timeoutId = setTimeout(timerExpired, delay);
      }

      if (maxWait !== undefined && maxTimeoutId === undefined) {
        maxTimeoutId = setTimeout(() => {
          invokeFunc(Date.now());
        }, maxWait);
      }
    });
  } as DebouncedFunction<T>;

  debouncedFn.cancel = function (): void {
    if (timeoutId !== undefined) {
      clearTimeout(timeoutId);
    }
    if (maxTimeoutId !== undefined) {
      clearTimeout(maxTimeoutId);
    }
    
    lastInvokeTime = 0;
    lastArgs = undefined;
    lastCallTime = undefined;
    timeoutId = undefined;
    maxTimeoutId = undefined;
    
    // Reject pending promises
    pendingResolvers.forEach(({ reject }) => 
      reject(new Error('Debounced function was cancelled'))
    );
    pendingResolvers = [];
  };

  debouncedFn.flush = async function (): Promise<ReturnType<T> | undefined> {
    if (timeoutId === undefined) {
      return result;
    }
    
    return invokeFunc(Date.now());
  };

  debouncedFn.pending = function (): boolean {
    return timeoutId !== undefined;
  };

  return debouncedFn;
}

/**
 * Throttle function execution
 * 
 * @param fn - Function to throttle
 * @param options - Throttle options
 * @returns Throttled function
 * 
 * @example
 * ```typescript
 * const throttledScroll = throttle(handleScroll, { delay: 100 });
 * window.addEventListener('scroll', throttledScroll);
 * ```
 */
export function throttle<T extends (...args: any[]) => any>(
  fn: T,
  options: ThrottleOptions
): ThrottledFunction<T> {
  const { delay, leading = true, trailing = true } = options;
  
  return debounce(fn, {
    delay,
    leading,
    trailing,
    maxWait: delay
  }) as any;
}

/**
 * Create a rate limiter
 * 
 * @param limit - Maximum number of calls
 * @param windowMs - Time window in milliseconds
 * @returns Rate limiter function
 * 
 * @example
 * ```typescript
 * const limiter = rateLimit(10, 60000); // 10 calls per minute
 * if (await limiter()) {
 *   // Call is allowed
 * }
 * ```
 */
export function rateLimit(limit: number, windowMs: number) {
  const calls: number[] = [];

  return async function (): Promise<boolean> {
    const now = Date.now();
    
    // Remove expired calls
    while (calls.length > 0 && calls[0] <= now - windowMs) {
      calls.shift();
    }

    if (calls.length >= limit) {
      return false;
    }

    calls.push(now);
    return true;
  };
}

/**
 * Process items in batches
 * 
 * @param items - Items to process
 * @param batchSize - Size of each batch
 * @param processor - Function to process each batch
 * @param delay - Delay between batches
 * @returns Promise that resolves when all batches are processed
 * 
 * @example
 * ```typescript
 * await batchProcess(users, 10, async (batch) => {
 *   await Promise.all(batch.map(user => updateUser(user)));
 * }, 100);
 * ```
 */
export async function batchProcess<T, R>(
  items: T[],
  batchSize: number,
  processor: (batch: T[]) => Promise<R>,
  delay: number = 0
): Promise<R[]> {
  const results: R[] = [];
  
  for (let i = 0; i < items.length; i += batchSize) {
    const batch = items.slice(i, i + batchSize);
    const result = await processor(batch);
    results.push(result);
    
    // Add delay between batches (except for the last batch)
    if (delay > 0 && i + batchSize < items.length) {
      await sleep(delay);
    }
  }
  
  return results;
}

/**
 * Process items with concurrency control
 * 
 * @param items - Items to process
 * @param processor - Function to process each item
 * @param concurrency - Maximum concurrent operations
 * @returns Promise that resolves when all items are processed
 * 
 * @example
 * ```typescript
 * const results = await mapConcurrent(urls, fetchUrl, 3);
 * ```
 */
export async function mapConcurrent<T, R>(
  items: T[],
  processor: (item: T, index: number) => Promise<R>,
  concurrency: number = 5
): Promise<R[]> {
  const results: R[] = new Array(items.length);
  const executing: Promise<void>[] = [];

  for (let i = 0; i < items.length; i++) {
    const promise = processor(items[i], i).then(result => {
      results[i] = result;
    });

    executing.push(promise);

    if (executing.length >= concurrency) {
      await Promise.race(executing);
      const finishedIndex = executing.findIndex(p => 
        p.then(() => true).catch(() => false)
      );
      if (finishedIndex !== -1) {
        executing.splice(finishedIndex, 1);
      }
    }
  }

  await Promise.all(executing);
  return results;
}

/**
 * Queue class for managing async operations
 */
export class AsyncQueue<T = any> {
  private queue: Array<{
    task: () => Promise<T>;
    resolve: (value: T) => void;
    reject: (error: Error) => void;
  }> = [];
  private running = 0;
  private concurrency: number;
  private timeout?: number;
  private maxSize?: number;

  constructor(options: QueueOptions = {}) {
    this.concurrency = options.concurrency || 1;
    this.timeout = options.timeout;
    this.maxSize = options.maxSize;
  }

  /**
   * Add task to queue
   * 
   * @param task - Async task to add
   * @returns Promise that resolves when task completes
   */
  add(task: () => Promise<T>): Promise<T> {
    return new Promise((resolve, reject) => {
      if (this.maxSize && this.queue.length >= this.maxSize) {
        reject(new Error('Queue is full'));
        return;
      }

      this.queue.push({ task, resolve, reject });
      this.process();
    });
  }

  /**
   * Get queue size
   */
  size(): number {
    return this.queue.length;
  }

  /**
   * Get number of running tasks
   */
  pending(): number {
    return this.running;
  }

  /**
   * Clear the queue
   */
  clear(): void {
    this.queue.forEach(({ reject }) => 
      reject(new Error('Queue was cleared'))
    );
    this.queue = [];
  }

  /**
   * Process queue
   */
  private async process(): Promise<void> {
    if (this.running >= this.concurrency || this.queue.length === 0) {
      return;
    }

    this.running++;
    const { task, resolve, reject } = this.queue.shift()!;

    try {
      const taskPromise = task();
      const result = this.timeout 
        ? await withTimeout(taskPromise, { timeout: this.timeout })
        : await taskPromise;
      
      resolve(result);
    } catch (error) {
      reject(error as Error);
    } finally {
      this.running--;
      this.process(); // Process next task
    }
  }
}

/**
 * Create an async queue
 * 
 * @param options - Queue options
 * @returns Async queue instance
 */
export function createQueue<T = any>(options: QueueOptions = {}): AsyncQueue<T> {
  return new AsyncQueue<T>(options);
}

/**
 * Create a mutex (mutual exclusion) lock
 * 
 * @returns Mutex object
 * 
 * @example
 * ```typescript
 * const mutex = createMutex();
 * 
 * const result = await mutex.lock(async () => {
 *   // Critical section - only one execution at a time
 *   return await criticalOperation();
 * });
 * ```
 */
export function createMutex() {
  let locked = false;
  const queue: Array<() => void> = [];

  return {
    async lock<T>(fn: () => Promise<T>): Promise<T> {
      return new Promise<T>((resolve, reject) => {
        const execute = async () => {
          try {
            const result = await fn();
            resolve(result);
          } catch (error) {
            reject(error);
          } finally {
            locked = false;
            const next = queue.shift();
            if (next) {
              next();
            }
          }
        };

        if (locked) {
          queue.push(execute);
        } else {
          locked = true;
          execute();
        }
      });
    },

    isLocked(): boolean {
      return locked;
    }
  };
}

/**
 * Create a semaphore
 * 
 * @param permits - Number of permits
 * @returns Semaphore object
 * 
 * @example
 * ```typescript
 * const semaphore = createSemaphore(3); // Allow 3 concurrent operations
 * 
 * const result = await semaphore.acquire(async () => {
 *   return await expensiveOperation();
 * });
 * ```
 */
export function createSemaphore(permits: number) {
  let available = permits;
  const queue: Array<() => void> = [];

  return {
    async acquire<T>(fn: () => Promise<T>): Promise<T> {
      return new Promise<T>((resolve, reject) => {
        const execute = async () => {
          try {
            const result = await fn();
            resolve(result);
          } catch (error) {
            reject(error);
          } finally {
            available++;
            const next = queue.shift();
            if (next) {
              next();
            }
          }
        };

        if (available > 0) {
          available--;
          execute();
        } else {
          queue.push(execute);
        }
      });
    },

    available(): number {
      return available;
    },

    waiting(): number {
      return queue.length;
    }
  };
}

/**
 * Race promises with timeout
 * 
 * @param promises - Promises to race
 * @param timeout - Timeout in milliseconds
 * @returns Promise that resolves with first result or rejects on timeout
 */
export async function raceWithTimeout<T>(
  promises: Promise<T>[],
  timeout: number
): Promise<T> {
  const timeoutPromise = new Promise<never>((_, reject) => {
    setTimeout(() => reject(new Error(`Race timed out after ${timeout}ms`)), timeout);
  });

  return Promise.race([...promises, timeoutPromise]);
}

/**
 * All settled with timeout
 * 
 * @param promises - Promises to settle
 * @param timeout - Timeout in milliseconds
 * @returns Promise with all results or partial results on timeout
 */
export async function allSettledWithTimeout<T>(
  promises: Promise<T>[],
  timeout: number
): Promise<PromiseSettledResult<T>[]> {
  const timeoutPromise = new Promise<PromiseSettledResult<T>[]>((resolve) => {
    setTimeout(() => {
      resolve(promises.map(() => ({ 
        status: 'rejected' as const, 
        reason: new Error('Timeout') 
      })));
    }, timeout);
  });

  return Promise.race([Promise.allSettled(promises), timeoutPromise]);
}
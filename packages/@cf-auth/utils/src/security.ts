/**
 * Security utilities for CF-Better-Auth
 * 
 * @fileoverview This module provides security utilities including CSRF protection,
 * rate limiting, content security policies, and other security measures.
 */

import { SECURITY_CONSTANTS, RATE_LIMIT_CONSTANTS } from './constants';
import { generateSecureToken } from './crypto';

/**
 * CSRF token management
 */
export class CSRFProtection {
  private tokens = new Map<string, number>();
  private readonly maxAge: number;

  constructor(maxAge: number = 24 * 60 * 60 * 1000) {
    this.maxAge = maxAge;
    this.startCleanup();
  }

  generateToken(sessionId: string): string {
    const token = generateSecureToken({ 
      length: SECURITY_CONSTANTS.CSRF.TOKEN_LENGTH 
    });
    this.tokens.set(token, Date.now());
    return token;
  }

  verifyToken(token: string): boolean {
    const timestamp = this.tokens.get(token);
    if (!timestamp) return false;
    
    if (Date.now() - timestamp > this.maxAge) {
      this.tokens.delete(token);
      return false;
    }
    
    return true;
  }

  private startCleanup(): void {
    setInterval(() => {
      const now = Date.now();
      for (const [token, timestamp] of this.tokens.entries()) {
        if (now - timestamp > this.maxAge) {
          this.tokens.delete(token);
        }
      }
    }, 60000);
  }
}

/**
 * Rate limiter implementation
 */
export class RateLimiter {
  private requests = new Map<string, number[]>();
  private readonly windowMs: number;
  private readonly maxRequests: number;

  constructor(windowMs: number, maxRequests: number) {
    this.windowMs = windowMs;
    this.maxRequests = maxRequests;
  }

  isAllowed(key: string): boolean {
    const now = Date.now();
    const requests = this.requests.get(key) || [];
    
    const recentRequests = requests.filter(time => now - time < this.windowMs);
    
    if (recentRequests.length >= this.maxRequests) {
      return false;
    }
    
    recentRequests.push(now);
    this.requests.set(key, recentRequests);
    
    return true;
  }

  getRemainingRequests(key: string): number {
    const now = Date.now();
    const requests = this.requests.get(key) || [];
    const recentRequests = requests.filter(time => now - time < this.windowMs);
    return Math.max(0, this.maxRequests - recentRequests.length);
  }
}

/**
 * Content Security Policy builder
 */
export class CSPBuilder {
  private directives = new Map<string, string[]>();

  constructor() {
    // Set default directives
    Object.entries(SECURITY_CONSTANTS.CSP.DIRECTIVES).forEach(([key, value]) => {
      this.directives.set(key, [value]);
    });
  }

  addDirective(directive: string, values: string[]): this {
    this.directives.set(directive, values);
    return this;
  }

  appendToDirective(directive: string, value: string): this {
    const existing = this.directives.get(directive) || [];
    existing.push(value);
    this.directives.set(directive, existing);
    return this;
  }

  build(): string {
    const parts: string[] = [];
    
    for (const [directive, values] of this.directives) {
      parts.push(`${directive} ${values.join(' ')}`);
    }
    
    return parts.join('; ');
  }
}

/**
 * Security headers generator
 */
export function getSecurityHeaders(): Record<string, string> {
  return {
    ...SECURITY_CONSTANTS.HEADERS,
    'Content-Security-Policy': new CSPBuilder().build()
  };
}

/**
 * IP-based rate limiter factory
 */
export function createIPRateLimiter(
  maxRequests: number = RATE_LIMIT_CONSTANTS.LIMITS.GENERIC_PER_IP,
  windowMs: number = RATE_LIMIT_CONSTANTS.WINDOWS.MINUTE
): RateLimiter {
  return new RateLimiter(windowMs, maxRequests);
}

/**
 * Create login rate limiter
 */
export function createLoginRateLimiter(): RateLimiter {
  return new RateLimiter(
    RATE_LIMIT_CONSTANTS.WINDOWS.HOUR,
    RATE_LIMIT_CONSTANTS.LIMITS.LOGIN_PER_IP
  );
}

/**
 * Sanitize input to prevent XSS
 */
export function sanitizeHTML(input: string): string {
  return input
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#x27;')
    .replace(/\//g, '&#x2F;');
}

/**
 * Check if request is from secure context
 */
export function isSecureContext(protocol: string, hostname: string): boolean {
  return protocol === 'https:' || hostname === 'localhost' || hostname === '127.0.0.1';
}

/**
 * Generate nonce for CSP
 */
export function generateNonce(): string {
  return generateSecureToken({ length: 16 });
}
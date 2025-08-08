/**
 * Utility functions for @cf-auth/core
 */

import { BetterAuthAdapter } from './adapter';
import { CompatibilityLayer } from './compatibility';
import type { AdapterConfig, AdapterOptions } from './types';

/**
 * Create a new adapter instance
 */
export async function createAdapter(
  config: AdapterConfig,
  options?: AdapterOptions
): Promise<BetterAuthAdapter> {
  const adapter = new BetterAuthAdapter(config, options);
  await adapter.initialize();
  return adapter;
}

/**
 * Create an auth instance directly
 */
export async function createAuthInstance(
  config: AdapterConfig,
  options?: AdapterOptions
): Promise<any> {
  const adapter = await createAdapter(config, options);
  return adapter.getAuthInstance();
}

/**
 * Get compatibility layer for current better-auth version
 */
export function getCompatibilityLayer(version?: string): CompatibilityLayer {
  return new CompatibilityLayer(version);
}

/**
 * Merge multiple configurations with priority
 */
export function mergeConfigurations(...configs: Partial<AdapterConfig>[]): AdapterConfig {
  const merged: AdapterConfig = {};

  for (const config of configs) {
    Object.assign(merged, deepMerge(merged, config));
  }

  return merged;
}

/**
 * Deep merge helper
 */
function deepMerge(target: any, source: any): any {
  if (!source) return target;
  if (!target) return source;

  const result = { ...target };

  for (const key in source) {
    if (source[key] instanceof Object && !Array.isArray(source[key])) {
      result[key] = deepMerge(result[key] || {}, source[key]);
    } else {
      result[key] = source[key];
    }
  }

  return result;
}

/**
 * Generate a secure random ID
 */
export function generateId(prefix?: string): string {
  const timestamp = Date.now().toString(36);
  const randomPart = Math.random().toString(36).substring(2, 15);
  const id = `${timestamp}${randomPart}`;
  return prefix ? `${prefix}_${id}` : id;
}

/**
 * Validate email format
 */
export function isValidEmail(email: string): boolean {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
}

/**
 * Validate password strength
 */
export function validatePasswordStrength(password: string): {
  valid: boolean;
  errors: string[];
} {
  const errors: string[] = [];

  if (password.length < 8) {
    errors.push('Password must be at least 8 characters long');
  }

  if (!/[A-Z]/.test(password)) {
    errors.push('Password must contain at least one uppercase letter');
  }

  if (!/[a-z]/.test(password)) {
    errors.push('Password must contain at least one lowercase letter');
  }

  if (!/[0-9]/.test(password)) {
    errors.push('Password must contain at least one number');
  }

  if (!/[^A-Za-z0-9]/.test(password)) {
    errors.push('Password must contain at least one special character');
  }

  return {
    valid: errors.length === 0,
    errors,
  };
}

/**
 * Parse JWT token (without verification)
 */
export function parseJWT(token: string): any {
  try {
    const parts = token.split('.');
    if (parts.length !== 3) {
      throw new Error('Invalid JWT format');
    }

    const payload = parts[1];
    const decoded = atob(payload.replace(/-/g, '+').replace(/_/g, '/'));
    return JSON.parse(decoded);
  } catch (error) {
    console.error('Failed to parse JWT:', error);
    return null;
  }
}

/**
 * Check if a JWT token is expired
 */
export function isTokenExpired(token: string): boolean {
  const payload = parseJWT(token);
  if (!payload || !payload.exp) {
    return true;
  }

  const expirationTime = payload.exp * 1000; // Convert to milliseconds
  return Date.now() > expirationTime;
}

/**
 * Get IP address from request
 */
export function getIpAddress(request: Request): string {
  // Check various headers that might contain the real IP
  const headers = request.headers;
  const forwardedFor = headers.get('x-forwarded-for');
  const realIp = headers.get('x-real-ip');
  const cfConnectingIp = headers.get('cf-connecting-ip');

  if (forwardedFor) {
    return forwardedFor.split(',')[0].trim();
  }

  if (realIp) {
    return realIp;
  }

  if (cfConnectingIp) {
    return cfConnectingIp;
  }

  // Fallback to request URL host
  const url = new URL(request.url);
  return url.hostname;
}

/**
 * Sanitize user input
 */
export function sanitizeInput(input: string): string {
  return input
    .replace(/[<>]/g, '') // Remove potential HTML tags
    .replace(/javascript:/gi, '') // Remove javascript: protocol
    .replace(/on\w+=/gi, '') // Remove event handlers
    .trim();
}

/**
 * Create a secure hash
 */
export async function createHash(data: string): Promise<string> {
  const encoder = new TextEncoder();
  const dataBuffer = encoder.encode(data);
  const hashBuffer = await crypto.subtle.digest('SHA-256', dataBuffer);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
}

/**
 * Compare two hashes securely (constant time)
 */
export function secureCompare(a: string, b: string): boolean {
  if (a.length !== b.length) {
    return false;
  }

  let result = 0;
  for (let i = 0; i < a.length; i++) {
    result |= a.charCodeAt(i) ^ b.charCodeAt(i);
  }

  return result === 0;
}

/**
 * Create a response with standard headers
 */
export function createResponse(
  body: any,
  status: number = 200,
  headers: Record<string, string> = {}
): Response {
  const defaultHeaders = {
    'Content-Type': 'application/json',
    'X-Content-Type-Options': 'nosniff',
    'X-Frame-Options': 'DENY',
    'X-XSS-Protection': '1; mode=block',
    ...headers,
  };

  return new Response(JSON.stringify(body), {
    status,
    headers: defaultHeaders,
  });
}

/**
 * Parse cookies from request
 */
export function parseCookies(request: Request): Record<string, string> {
  const cookieHeader = request.headers.get('Cookie');
  if (!cookieHeader) {
    return {};
  }

  const cookies: Record<string, string> = {};
  const pairs = cookieHeader.split(';');

  for (const pair of pairs) {
    const [key, value] = pair.trim().split('=');
    if (key && value) {
      cookies[key] = decodeURIComponent(value);
    }
  }

  return cookies;
}

/**
 * Set cookie header
 */
export function setCookie(
  name: string,
  value: string,
  options: {
    maxAge?: number;
    path?: string;
    domain?: string;
    secure?: boolean;
    httpOnly?: boolean;
    sameSite?: 'Lax' | 'Strict' | 'None';
  } = {}
): string {
  const parts = [`${name}=${encodeURIComponent(value)}`];

  if (options.maxAge) {
    parts.push(`Max-Age=${options.maxAge}`);
  }

  if (options.path) {
    parts.push(`Path=${options.path}`);
  }

  if (options.domain) {
    parts.push(`Domain=${options.domain}`);
  }

  if (options.secure) {
    parts.push('Secure');
  }

  if (options.httpOnly) {
    parts.push('HttpOnly');
  }

  if (options.sameSite) {
    parts.push(`SameSite=${options.sameSite}`);
  }

  return parts.join('; ');
}
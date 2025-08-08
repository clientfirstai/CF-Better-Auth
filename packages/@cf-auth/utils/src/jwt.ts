/**
 * JWT utilities for CF-Better-Auth using the jose library
 * 
 * @fileoverview This module provides secure JWT token generation, verification,
 * and parsing utilities using the jose library for maximum security and compliance.
 * 
 * Features:
 * - JWT creation with proper headers and claims
 * - Token verification and validation
 * - Token parsing and claim extraction
 * - Support for multiple signing algorithms
 * - Key management utilities
 * - Token expiration and refresh handling
 */

import {
  SignJWT,
  jwtVerify,
  generateSecret,
  importJWK,
  exportJWK,
  type JWTPayload,
  type KeyLike,
  type JWTVerifyResult,
  type JWTHeaderParameters,
  errors as joseErrors
} from 'jose';

import type { Brand, UserId, SessionId } from '@cf-auth/types';
import { AUTH_CONSTANTS } from './constants';

/**
 * Branded types for JWT-related data
 */
export type JWTToken = Brand<string, 'JWTToken'>;
export type JWTSecret = Brand<string, 'JWTSecret'>;
export type JWTKeyId = Brand<string, 'JWTKeyId'>;

/**
 * JWT algorithm types
 */
export type JWTAlgorithm = 
  | 'HS256' | 'HS384' | 'HS512'  // HMAC
  | 'RS256' | 'RS384' | 'RS512'  // RSA
  | 'ES256' | 'ES384' | 'ES512'  // ECDSA
  | 'PS256' | 'PS384' | 'PS512'; // RSA-PSS

/**
 * JWT token types
 */
export type JWTTokenType = 
  | 'access'     // Short-lived access token
  | 'refresh'    // Long-lived refresh token
  | 'id'         // OpenID Connect ID token
  | 'session'    // Session token
  | 'reset'      // Password reset token
  | 'verify';    // Email verification token

/**
 * JWT configuration interfaces
 */
export interface JWTConfig {
  /** Secret key or KeyLike object */
  secret: string | KeyLike;
  /** Algorithm to use for signing */
  algorithm?: JWTAlgorithm;
  /** Token issuer */
  issuer?: string;
  /** Token audience */
  audience?: string | string[];
  /** Default expiration time in seconds */
  expiresIn?: number;
  /** Not before time in seconds */
  notBefore?: number;
  /** Key ID for multi-key scenarios */
  keyId?: JWTKeyId;
  /** Additional headers */
  headers?: JWTHeaderParameters;
}

export interface JWTCreateOptions {
  /** Token type */
  type?: JWTTokenType;
  /** Custom expiration time in seconds */
  expiresIn?: number;
  /** Token audience override */
  audience?: string | string[];
  /** Additional claims */
  claims?: Record<string, any>;
  /** JWT ID (unique identifier) */
  jti?: string;
  /** Key ID override */
  keyId?: JWTKeyId;
  /** Additional headers */
  headers?: JWTHeaderParameters;
}

export interface JWTVerifyOptions {
  /** Expected audience */
  audience?: string | string[];
  /** Expected issuer */
  issuer?: string;
  /** Clock tolerance in seconds */
  clockTolerance?: number;
  /** Maximum token age in seconds */
  maxTokenAge?: number;
  /** Required claims */
  requiredClaims?: string[];
  /** Custom claim validators */
  validators?: Record<string, (value: any) => boolean>;
}

/**
 * JWT payload interfaces
 */
export interface CFAuthJWTPayload extends JWTPayload {
  /** User ID */
  uid?: UserId;
  /** Session ID */
  sid?: SessionId;
  /** Token type */
  typ?: JWTTokenType;
  /** User email */
  email?: string;
  /** User roles */
  roles?: string[];
  /** Organizations */
  organizations?: string[];
  /** Permissions */
  permissions?: string[];
  /** Device fingerprint */
  device?: string;
  /** IP address */
  ip?: string;
  /** Session metadata */
  metadata?: Record<string, any>;
}

export interface JWTCreateResult {
  /** Generated JWT token */
  token: JWTToken;
  /** Token payload */
  payload: CFAuthJWTPayload;
  /** Token expiration date */
  expiresAt: Date;
  /** Token type */
  type: JWTTokenType;
  /** JWT ID */
  jti: string;
}

export interface JWTVerifyResult {
  /** Whether token is valid */
  valid: boolean;
  /** Decoded payload (if valid) */
  payload?: CFAuthJWTPayload;
  /** JWT header */
  header?: JWTHeaderParameters;
  /** Error message (if invalid) */
  error?: string;
  /** Error code */
  errorCode?: string;
  /** Token expiration date */
  expiresAt?: Date;
  /** Time until expiration in seconds */
  expiresIn?: number;
}

export interface JWTParseResult {
  /** JWT header */
  header: JWTHeaderParameters;
  /** JWT payload (unverified) */
  payload: CFAuthJWTPayload;
  /** Token signature */
  signature: string;
  /** Whether token is expired (based on payload) */
  isExpired: boolean;
  /** Expiration date */
  expiresAt?: Date;
}

/**
 * JWT manager class
 */
export class JWTManager {
  private config: JWTConfig;
  private secretKey: KeyLike | Uint8Array;

  constructor(config: JWTConfig) {
    this.config = {
      algorithm: 'HS256',
      expiresIn: AUTH_CONSTANTS.DEFAULT_JWT_EXPIRATION,
      ...config
    };
    
    // Convert string secret to Uint8Array for HMAC algorithms
    if (typeof config.secret === 'string') {
      this.secretKey = new TextEncoder().encode(config.secret);
    } else {
      this.secretKey = config.secret;
    }
  }

  /**
   * Create a JWT token
   * 
   * @param payload - Token payload
   * @param options - Creation options
   * @returns Created token result
   * 
   * @example
   * ```typescript
   * const manager = new JWTManager({ secret: 'your-secret' });
   * const result = await manager.createToken({
   *   uid: 'user-123',
   *   email: 'user@example.com'
   * });
   * console.log(result.token);
   * ```
   */
  async createToken(
    payload: Partial<CFAuthJWTPayload>,
    options: JWTCreateOptions = {}
  ): Promise<JWTCreateResult> {
    const now = Math.floor(Date.now() / 1000);
    const type = options.type || 'access';
    const jti = options.jti || this.generateJTI();
    
    // Determine expiration based on token type
    const expiresIn = this.getExpirationForType(type, options.expiresIn);
    const exp = now + expiresIn;
    
    // Build the JWT payload
    const jwtPayload: CFAuthJWTPayload = {
      // Standard claims
      iss: this.config.issuer,
      aud: options.audience || this.config.audience,
      exp,
      iat: now,
      nbf: now + (this.config.notBefore || 0),
      jti,
      
      // Custom claims
      typ: type,
      ...payload,
      ...options.claims
    };

    // Create JWT
    const jwt = new SignJWT(jwtPayload)
      .setProtectedHeader({
        alg: this.config.algorithm!,
        typ: 'JWT',
        kid: options.keyId || this.config.keyId,
        ...this.config.headers,
        ...options.headers
      });

    const token = await jwt.sign(this.secretKey) as JWTToken;

    return {
      token,
      payload: jwtPayload,
      expiresAt: new Date(exp * 1000),
      type,
      jti
    };
  }

  /**
   * Verify a JWT token
   * 
   * @param token - JWT token to verify
   * @param options - Verification options
   * @returns Verification result
   * 
   * @example
   * ```typescript
   * const result = await manager.verifyToken(token);
   * if (result.valid) {
   *   console.log('User ID:', result.payload.uid);
   * }
   * ```
   */
  async verifyToken(
    token: JWTToken,
    options: JWTVerifyOptions = {}
  ): Promise<JWTVerifyResult> {
    try {
      const verifyOptions = {
        audience: options.audience || this.config.audience,
        issuer: options.issuer || this.config.issuer,
        clockTolerance: options.clockTolerance || 30, // 30 seconds tolerance
        maxTokenAge: options.maxTokenAge
      };

      const result: JWTVerifyResult<CFAuthJWTPayload> = await jwtVerify(
        token,
        this.secretKey,
        verifyOptions
      );

      const payload = result.payload as CFAuthJWTPayload;
      
      // Additional validations
      const validationError = this.validateClaims(payload, options);
      if (validationError) {
        return {
          valid: false,
          error: validationError,
          errorCode: 'INVALID_CLAIMS'
        };
      }

      // Calculate expiration info
      const expiresAt = payload.exp ? new Date(payload.exp * 1000) : undefined;
      const expiresIn = payload.exp ? payload.exp - Math.floor(Date.now() / 1000) : undefined;

      return {
        valid: true,
        payload,
        header: result.protectedHeader,
        expiresAt,
        expiresIn
      };

    } catch (error) {
      return this.handleJWTError(error);
    }
  }

  /**
   * Parse JWT token without verification (unsafe for validation)
   * 
   * @param token - JWT token to parse
   * @returns Parsed token data
   * 
   * @example
   * ```typescript
   * const parsed = parseToken(token);
   * console.log('Token type:', parsed.payload.typ);
   * ```
   */
  parseToken(token: JWTToken): JWTParseResult {
    const parts = token.split('.');
    if (parts.length !== 3) {
      throw new Error('Invalid JWT format');
    }

    const [headerPart, payloadPart, signaturePart] = parts;

    // Decode header and payload
    const header = JSON.parse(this.base64UrlDecode(headerPart)) as JWTHeaderParameters;
    const payload = JSON.parse(this.base64UrlDecode(payloadPart)) as CFAuthJWTPayload;

    // Check expiration
    const now = Math.floor(Date.now() / 1000);
    const isExpired = payload.exp ? payload.exp < now : false;
    const expiresAt = payload.exp ? new Date(payload.exp * 1000) : undefined;

    return {
      header,
      payload,
      signature: signaturePart,
      isExpired,
      expiresAt
    };
  }

  /**
   * Refresh a JWT token
   * 
   * @param refreshToken - Refresh token
   * @param newPayload - Updated payload data
   * @returns New access token
   */
  async refreshToken(
    refreshToken: JWTToken,
    newPayload: Partial<CFAuthJWTPayload> = {}
  ): Promise<JWTCreateResult> {
    // Verify the refresh token
    const verifyResult = await this.verifyToken(refreshToken);
    if (!verifyResult.valid) {
      throw new Error('Invalid refresh token');
    }

    const currentPayload = verifyResult.payload!;
    
    // Ensure it's actually a refresh token
    if (currentPayload.typ !== 'refresh') {
      throw new Error('Token is not a refresh token');
    }

    // Create new access token with updated payload
    const updatedPayload = {
      ...currentPayload,
      ...newPayload,
      typ: 'access' as JWTTokenType
    };

    delete updatedPayload.exp; // Let createToken set the expiration
    delete updatedPayload.iat;
    delete updatedPayload.nbf;
    delete updatedPayload.jti;

    return this.createToken(updatedPayload, { type: 'access' });
  }

  /**
   * Generate a key pair for asymmetric algorithms
   * 
   * @param algorithm - Algorithm to generate key pair for
   * @returns Key pair in JWK format
   */
  static async generateKeyPair(algorithm: 'RS256' | 'RS384' | 'RS512' | 'ES256' | 'ES384' | 'ES512') {
    const keyPair = await generateSecret(algorithm);
    const publicKey = await exportJWK(keyPair);
    const privateKey = await exportJWK(keyPair);
    
    return { publicKey, privateKey };
  }

  /**
   * Import a JWK key
   * 
   * @param jwk - JWK to import
   * @param algorithm - Algorithm for the key
   * @returns KeyLike object
   */
  static async importKey(jwk: any, algorithm: string): Promise<KeyLike> {
    return importJWK(jwk, algorithm);
  }

  /**
   * Get default expiration time for token type
   */
  private getExpirationForType(type: JWTTokenType, override?: number): number {
    if (override) {
      return override;
    }

    switch (type) {
      case 'access':
        return this.config.expiresIn || AUTH_CONSTANTS.DEFAULT_JWT_EXPIRATION;
      case 'refresh':
        return AUTH_CONSTANTS.REFRESH_TOKEN_EXPIRATION;
      case 'session':
        return AUTH_CONSTANTS.DEFAULT_SESSION_DURATION / 1000;
      case 'reset':
        return AUTH_CONSTANTS.PASSWORD_RESET_EXPIRATION;
      case 'verify':
        return AUTH_CONSTANTS.EMAIL_VERIFICATION_EXPIRATION;
      case 'id':
        return this.config.expiresIn || AUTH_CONSTANTS.DEFAULT_JWT_EXPIRATION;
      default:
        return this.config.expiresIn || AUTH_CONSTANTS.DEFAULT_JWT_EXPIRATION;
    }
  }

  /**
   * Generate a unique JWT ID
   */
  private generateJTI(): string {
    return `${Date.now()}-${Math.random().toString(36).substring(2, 15)}`;
  }

  /**
   * Validate custom claims
   */
  private validateClaims(payload: CFAuthJWTPayload, options: JWTVerifyOptions): string | null {
    // Check required claims
    if (options.requiredClaims) {
      for (const claim of options.requiredClaims) {
        if (!(claim in payload)) {
          return `Missing required claim: ${claim}`;
        }
      }
    }

    // Run custom validators
    if (options.validators) {
      for (const [claim, validator] of Object.entries(options.validators)) {
        if (claim in payload && !validator(payload[claim as keyof CFAuthJWTPayload])) {
          return `Claim validation failed: ${claim}`;
        }
      }
    }

    return null;
  }

  /**
   * Handle JWT verification errors
   */
  private handleJWTError(error: any): JWTVerifyResult {
    if (error instanceof joseErrors.JWTExpired) {
      return {
        valid: false,
        error: 'Token has expired',
        errorCode: 'TOKEN_EXPIRED'
      };
    }

    if (error instanceof joseErrors.JWTInvalid) {
      return {
        valid: false,
        error: 'Invalid token',
        errorCode: 'TOKEN_INVALID'
      };
    }

    if (error instanceof joseErrors.JWTClaimValidationFailed) {
      return {
        valid: false,
        error: 'Token claim validation failed',
        errorCode: 'CLAIM_VALIDATION_FAILED'
      };
    }

    // Generic error
    return {
      valid: false,
      error: error.message || 'Token verification failed',
      errorCode: 'VERIFICATION_FAILED'
    };
  }

  /**
   * Base64URL decode
   */
  private base64UrlDecode(str: string): string {
    // Add padding if needed
    let padded = str;
    while (padded.length % 4) {
      padded += '=';
    }
    
    // Replace URL-safe characters
    const base64 = padded.replace(/-/g, '+').replace(/_/g, '/');
    
    // Decode
    return atob(base64);
  }
}

/**
 * Utility functions
 */

/**
 * Create a default JWT manager instance
 * 
 * @param secret - JWT secret
 * @param config - Additional configuration
 * @returns JWT manager instance
 */
export function createJWTManager(secret: string, config: Partial<JWTConfig> = {}): JWTManager {
  return new JWTManager({
    secret,
    ...config
  });
}

/**
 * Quick JWT creation function
 * 
 * @param secret - JWT secret
 * @param payload - Token payload
 * @param options - Creation options
 * @returns JWT token
 */
export async function createJWT(
  secret: string,
  payload: Partial<CFAuthJWTPayload>,
  options: JWTCreateOptions & { algorithm?: JWTAlgorithm } = {}
): Promise<JWTToken> {
  const manager = new JWTManager({
    secret,
    algorithm: options.algorithm
  });
  
  const result = await manager.createToken(payload, options);
  return result.token;
}

/**
 * Quick JWT verification function
 * 
 * @param secret - JWT secret
 * @param token - JWT token to verify
 * @param options - Verification options
 * @returns Verification result
 */
export async function verifyJWT(
  secret: string,
  token: JWTToken,
  options: JWTVerifyOptions & { algorithm?: JWTAlgorithm } = {}
): Promise<JWTVerifyResult> {
  const manager = new JWTManager({
    secret,
    algorithm: options.algorithm
  });
  
  return manager.verifyToken(token, options);
}

/**
 * Extract user information from JWT token (without verification)
 * 
 * @param token - JWT token
 * @returns User information or null
 */
export function extractUserFromToken(token: JWTToken): {
  userId?: UserId;
  email?: string;
  roles?: string[];
  organizations?: string[];
} | null {
  try {
    const parts = token.split('.');
    if (parts.length !== 3) {
      return null;
    }

    const payload = JSON.parse(atob(parts[1].replace(/-/g, '+').replace(/_/g, '/'))) as CFAuthJWTPayload;
    
    return {
      userId: payload.uid,
      email: payload.email,
      roles: payload.roles,
      organizations: payload.organizations
    };
  } catch {
    return null;
  }
}

/**
 * Check if JWT token is expired (without verification)
 * 
 * @param token - JWT token
 * @param clockTolerance - Clock tolerance in seconds
 * @returns Whether token is expired
 */
export function isTokenExpired(token: JWTToken, clockTolerance: number = 30): boolean {
  try {
    const parts = token.split('.');
    if (parts.length !== 3) {
      return true;
    }

    const payload = JSON.parse(atob(parts[1].replace(/-/g, '+').replace(/_/g, '/')));
    
    if (!payload.exp) {
      return false; // No expiration claim
    }
    
    const now = Math.floor(Date.now() / 1000);
    return payload.exp < (now - clockTolerance);
  } catch {
    return true; // Assume expired if we can't parse
  }
}

/**
 * Get token expiration time (without verification)
 * 
 * @param token - JWT token
 * @returns Expiration date or null
 */
export function getTokenExpiration(token: JWTToken): Date | null {
  try {
    const parts = token.split('.');
    if (parts.length !== 3) {
      return null;
    }

    const payload = JSON.parse(atob(parts[1].replace(/-/g, '+').replace(/_/g, '/')));
    
    return payload.exp ? new Date(payload.exp * 1000) : null;
  } catch {
    return null;
  }
}

/**
 * Get time until token expiration (without verification)
 * 
 * @param token - JWT token
 * @returns Seconds until expiration or null
 */
export function getTokenTTL(token: JWTToken): number | null {
  const expirationDate = getTokenExpiration(token);
  if (!expirationDate) {
    return null;
  }
  
  const now = Date.now();
  const ttl = Math.floor((expirationDate.getTime() - now) / 1000);
  
  return Math.max(0, ttl);
}

/**
 * Generate a secure JWT secret
 * 
 * @param length - Secret length in bytes
 * @returns Base64 encoded secret
 */
export async function generateJWTSecret(length: number = 32): Promise<JWTSecret> {
  const secret = await generateSecret('HS256');
  const jwk = await exportJWK(secret);
  
  if (jwk.k) {
    return jwk.k as JWTSecret;
  }
  
  throw new Error('Failed to generate JWT secret');
}

/**
 * Validate JWT secret strength
 * 
 * @param secret - Secret to validate
 * @returns Validation result
 */
export function validateJWTSecret(secret: string): {
  valid: boolean;
  errors: string[];
  strength: 'weak' | 'medium' | 'strong';
} {
  const errors: string[] = [];
  
  if (secret.length < 32) {
    errors.push('Secret should be at least 32 characters long');
  }
  
  if (!/[A-Z]/.test(secret)) {
    errors.push('Secret should contain uppercase letters');
  }
  
  if (!/[a-z]/.test(secret)) {
    errors.push('Secret should contain lowercase letters');
  }
  
  if (!/\d/.test(secret)) {
    errors.push('Secret should contain numbers');
  }
  
  if (!/[^A-Za-z0-9]/.test(secret)) {
    errors.push('Secret should contain special characters');
  }
  
  let strength: 'weak' | 'medium' | 'strong' = 'weak';
  
  if (errors.length === 0 && secret.length >= 64) {
    strength = 'strong';
  } else if (errors.length <= 2 && secret.length >= 32) {
    strength = 'medium';
  }
  
  return {
    valid: errors.length === 0,
    errors,
    strength
  };
}
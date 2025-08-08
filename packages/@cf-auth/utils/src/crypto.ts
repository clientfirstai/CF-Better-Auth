/**
 * Cryptographic utilities for CF-Better-Auth
 * 
 * @fileoverview This module provides secure cryptographic functions including
 * password hashing, token generation, encryption/decryption, and other security utilities.
 * 
 * Features:
 * - Argon2 password hashing
 * - Secure random token generation
 * - AES encryption/decryption
 * - HMAC signing/verification
 * - Timing-safe comparison
 * - Key derivation functions
 */

import { hash, verify, type Options as Argon2Options } from 'argon2';
import { nanoid, customAlphabet } from 'nanoid';
import * as crypto from 'crypto';
import { promisify } from 'util';

import type { Brand } from '@cf-auth/types';
import { CRYPTO_CONSTANTS, REGEX_PATTERNS } from './constants';

/**
 * Branded types for enhanced type safety
 */
export type HashedPassword = Brand<string, 'HashedPassword'>;
export type SecureToken = Brand<string, 'SecureToken'>;
export type EncryptionKey = Brand<string, 'EncryptionKey'>;
export type Salt = Brand<string, 'Salt'>;
export type Hash = Brand<string, 'Hash'>;
export type Signature = Brand<string, 'Signature'>;

/**
 * Crypto operation result types
 */
export interface EncryptionResult {
  /** Encrypted data in base64 format */
  encrypted: string;
  /** Initialization vector in base64 format */
  iv: string;
  /** Authentication tag in base64 format (for AES-GCM) */
  authTag?: string;
}

export interface DecryptionOptions {
  /** Initialization vector in base64 format */
  iv: string;
  /** Authentication tag in base64 format (for AES-GCM) */
  authTag?: string;
}

export interface KeyDerivationOptions {
  /** Salt length in bytes */
  saltLength?: number;
  /** Number of iterations */
  iterations?: number;
  /** Derived key length in bytes */
  keyLength?: number;
  /** Hash algorithm */
  algorithm?: string;
}

export interface TokenGenerationOptions {
  /** Token length */
  length?: number;
  /** Custom alphabet for token generation */
  alphabet?: string;
  /** Include timestamp in token */
  includeTimestamp?: boolean;
  /** Prefix for the token */
  prefix?: string;
}

/**
 * Argon2 configuration interface
 */
export interface Argon2Config extends Partial<Argon2Options> {
  /** Time cost (iterations) */
  timeCost?: number;
  /** Memory cost in KB */
  memoryCost?: number;
  /** Parallelism factor */
  parallelism?: number;
  /** Hash length */
  hashLength?: number;
}

// Create promisified versions of crypto functions
const randomBytes = promisify(crypto.randomBytes);
const pbkdf2 = promisify(crypto.pbkdf2);
const scrypt = promisify(crypto.scrypt);

/**
 * Default Argon2 configuration
 */
const DEFAULT_ARGON2_CONFIG: Argon2Config = {
  timeCost: CRYPTO_CONSTANTS.ARGON2.TIME_COST,
  memoryCost: CRYPTO_CONSTANTS.ARGON2.MEMORY_COST,
  parallelism: CRYPTO_CONSTANTS.ARGON2.PARALLELISM,
  hashLength: CRYPTO_CONSTANTS.ARGON2.HASH_LENGTH,
  type: 2, // Argon2id
};

/**
 * Password hashing utilities
 */

/**
 * Hash a password using Argon2
 * 
 * @param password - Plain text password to hash
 * @param options - Argon2 configuration options
 * @returns Promise resolving to hashed password
 * 
 * @example
 * ```typescript
 * const hashed = await hashPassword('mySecretPassword');
 * console.log(hashed); // $argon2id$v=19$m=65536,t=3,p=1$...
 * ```
 */
export async function hashPassword(
  password: string,
  options: Argon2Config = {}
): Promise<HashedPassword> {
  if (!password || typeof password !== 'string') {
    throw new Error('Password must be a non-empty string');
  }

  const config = { ...DEFAULT_ARGON2_CONFIG, ...options };
  
  try {
    const hashed = await hash(password, config);
    return hashed as HashedPassword;
  } catch (error) {
    throw new Error(`Password hashing failed: ${error}`);
  }
}

/**
 * Verify a password against a hash using Argon2
 * 
 * @param password - Plain text password to verify
 * @param hashedPassword - Hashed password to verify against
 * @returns Promise resolving to verification result
 * 
 * @example
 * ```typescript
 * const isValid = await verifyPassword('mySecretPassword', hashedPassword);
 * console.log(isValid); // true or false
 * ```
 */
export async function verifyPassword(
  password: string,
  hashedPassword: HashedPassword
): Promise<boolean> {
  if (!password || typeof password !== 'string') {
    return false;
  }

  if (!hashedPassword || typeof hashedPassword !== 'string') {
    return false;
  }

  try {
    return await verify(hashedPassword, password);
  } catch (error) {
    // Log error but don't throw to prevent information leakage
    console.error('Password verification failed:', error);
    return false;
  }
}

/**
 * Check if password needs rehashing (e.g., due to updated security parameters)
 * 
 * @param hashedPassword - Hashed password to check
 * @param options - Current Argon2 configuration
 * @returns Whether the password needs rehashing
 */
export function needsRehash(
  hashedPassword: HashedPassword,
  options: Argon2Config = {}
): boolean {
  const config = { ...DEFAULT_ARGON2_CONFIG, ...options };
  
  try {
    // Parse the hash to extract parameters
    const parts = hashedPassword.split('$');
    if (parts.length < 4) return true;
    
    const params = parts[3].split(',');
    const currentParams = new Map();
    
    params.forEach(param => {
      const [key, value] = param.split('=');
      currentParams.set(key, parseInt(value));
    });
    
    // Check if any parameter has changed
    return (
      currentParams.get('m') !== config.memoryCost ||
      currentParams.get('t') !== config.timeCost ||
      currentParams.get('p') !== config.parallelism
    );
  } catch (error) {
    // If we can't parse the hash, assume it needs rehashing
    return true;
  }
}

/**
 * Token generation utilities
 */

/**
 * Generate a cryptographically secure random token
 * 
 * @param options - Token generation options
 * @returns Generated secure token
 * 
 * @example
 * ```typescript
 * const token = generateSecureToken({ length: 32, prefix: 'auth_' });
 * console.log(token); // auth_abc123def456...
 * ```
 */
export function generateSecureToken(options: TokenGenerationOptions = {}): SecureToken {
  const {
    length = CRYPTO_CONSTANTS.TOKEN_LENGTHS.SESSION,
    alphabet = '0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz',
    includeTimestamp = false,
    prefix = ''
  } = options;

  const generate = customAlphabet(alphabet, length);
  let token = generate();

  if (includeTimestamp) {
    const timestamp = Date.now().toString(36);
    token = `${timestamp}_${token}`;
  }

  if (prefix) {
    token = `${prefix}${token}`;
  }

  return token as SecureToken;
}

/**
 * Generate a short numeric OTP (One-Time Password)
 * 
 * @param length - OTP length (default: 6)
 * @returns Generated OTP
 * 
 * @example
 * ```typescript
 * const otp = generateOTP(6);
 * console.log(otp); // 123456
 * ```
 */
export function generateOTP(length: number = CRYPTO_CONSTANTS.TOKEN_LENGTHS.OTP): string {
  const min = Math.pow(10, length - 1);
  const max = Math.pow(10, length) - 1;
  return Math.floor(Math.random() * (max - min + 1) + min).toString();
}

/**
 * Generate a URL-safe random string
 * 
 * @param length - String length
 * @returns URL-safe random string
 */
export function generateUrlSafeToken(length: number = 32): string {
  return nanoid(length);
}

/**
 * Generate a UUID v4
 * 
 * @returns UUID v4 string
 */
export function generateUUID(): string {
  return crypto.randomUUID();
}

/**
 * Encryption/Decryption utilities
 */

/**
 * Generate a random encryption key
 * 
 * @param length - Key length in bytes
 * @returns Base64 encoded encryption key
 */
export async function generateEncryptionKey(
  length: number = CRYPTO_CONSTANTS.ENCRYPTION_KEY_LENGTH
): Promise<EncryptionKey> {
  const key = await randomBytes(length);
  return key.toString('base64') as EncryptionKey;
}

/**
 * Generate a random salt
 * 
 * @param length - Salt length in bytes
 * @returns Base64 encoded salt
 */
export async function generateSalt(length: number = CRYPTO_CONSTANTS.SALT_LENGTH): Promise<Salt> {
  const salt = await randomBytes(length);
  return salt.toString('base64') as Salt;
}

/**
 * Encrypt data using AES-256-GCM
 * 
 * @param data - Data to encrypt
 * @param key - Encryption key (base64 encoded)
 * @returns Encryption result with encrypted data, IV, and auth tag
 * 
 * @example
 * ```typescript
 * const key = await generateEncryptionKey();
 * const result = await encryptData('sensitive data', key);
 * console.log(result); // { encrypted: '...', iv: '...', authTag: '...' }
 * ```
 */
export async function encryptData(
  data: string,
  key: EncryptionKey
): Promise<EncryptionResult> {
  if (!data || !key) {
    throw new Error('Data and key are required for encryption');
  }

  try {
    const keyBuffer = Buffer.from(key, 'base64');
    const iv = await randomBytes(CRYPTO_CONSTANTS.IV_LENGTH);
    
    const cipher = crypto.createCipherGCM(CRYPTO_CONSTANTS.ALGORITHMS.SYMMETRIC, keyBuffer);
    cipher.setAAD(Buffer.from('cf-auth', 'utf8'));
    
    let encrypted = cipher.update(data, 'utf8', 'base64');
    encrypted += cipher.final('base64');
    
    const authTag = cipher.getAuthTag();
    
    return {
      encrypted,
      iv: iv.toString('base64'),
      authTag: authTag.toString('base64')
    };
  } catch (error) {
    throw new Error(`Encryption failed: ${error}`);
  }
}

/**
 * Decrypt data using AES-256-GCM
 * 
 * @param encrypted - Encrypted data (base64 encoded)
 * @param key - Encryption key (base64 encoded)
 * @param options - Decryption options (IV and auth tag)
 * @returns Decrypted data
 * 
 * @example
 * ```typescript
 * const decrypted = await decryptData(result.encrypted, key, {
 *   iv: result.iv,
 *   authTag: result.authTag
 * });
 * console.log(decrypted); // 'sensitive data'
 * ```
 */
export async function decryptData(
  encrypted: string,
  key: EncryptionKey,
  options: DecryptionOptions
): Promise<string> {
  if (!encrypted || !key || !options.iv || !options.authTag) {
    throw new Error('Encrypted data, key, IV, and auth tag are required for decryption');
  }

  try {
    const keyBuffer = Buffer.from(key, 'base64');
    const iv = Buffer.from(options.iv, 'base64');
    const authTag = Buffer.from(options.authTag, 'base64');
    
    const decipher = crypto.createDecipherGCM(CRYPTO_CONSTANTS.ALGORITHMS.SYMMETRIC, keyBuffer);
    decipher.setAAD(Buffer.from('cf-auth', 'utf8'));
    decipher.setAuthTag(authTag);
    
    let decrypted = decipher.update(encrypted, 'base64', 'utf8');
    decrypted += decipher.final('utf8');
    
    return decrypted;
  } catch (error) {
    throw new Error(`Decryption failed: ${error}`);
  }
}

/**
 * HMAC utilities
 */

/**
 * Generate HMAC signature
 * 
 * @param data - Data to sign
 * @param secret - Secret key
 * @param algorithm - HMAC algorithm
 * @returns Base64 encoded signature
 * 
 * @example
 * ```typescript
 * const signature = generateHMAC('data to sign', 'secret-key');
 * console.log(signature); // base64 encoded signature
 * ```
 */
export function generateHMAC(
  data: string,
  secret: string,
  algorithm: string = CRYPTO_CONSTANTS.ALGORITHMS.HMAC
): Signature {
  const hmac = crypto.createHmac(algorithm, secret);
  hmac.update(data);
  return hmac.digest('base64') as Signature;
}

/**
 * Verify HMAC signature using timing-safe comparison
 * 
 * @param data - Original data
 * @param signature - Signature to verify
 * @param secret - Secret key
 * @param algorithm - HMAC algorithm
 * @returns Verification result
 * 
 * @example
 * ```typescript
 * const isValid = verifyHMAC('data to sign', signature, 'secret-key');
 * console.log(isValid); // true or false
 * ```
 */
export function verifyHMAC(
  data: string,
  signature: Signature,
  secret: string,
  algorithm: string = CRYPTO_CONSTANTS.ALGORITHMS.HMAC
): boolean {
  try {
    const expectedSignature = generateHMAC(data, secret, algorithm);
    return timingSafeEqual(signature, expectedSignature);
  } catch (error) {
    return false;
  }
}

/**
 * Key derivation utilities
 */

/**
 * Derive key using PBKDF2
 * 
 * @param password - Password to derive key from
 * @param salt - Salt for key derivation
 * @param options - Key derivation options
 * @returns Derived key in base64 format
 */
export async function deriveKeyPBKDF2(
  password: string,
  salt: Salt,
  options: KeyDerivationOptions = {}
): Promise<EncryptionKey> {
  const {
    iterations = 100000,
    keyLength = 32,
    algorithm = 'sha256'
  } = options;

  const saltBuffer = Buffer.from(salt, 'base64');
  const derivedKey = await pbkdf2(password, saltBuffer, iterations, keyLength, algorithm);
  
  return derivedKey.toString('base64') as EncryptionKey;
}

/**
 * Derive key using scrypt
 * 
 * @param password - Password to derive key from
 * @param salt - Salt for key derivation
 * @param options - Key derivation options
 * @returns Derived key in base64 format
 */
export async function deriveKeyScrypt(
  password: string,
  salt: Salt,
  options: Omit<KeyDerivationOptions, 'iterations' | 'algorithm'> & { N?: number; r?: number; p?: number } = {}
): Promise<EncryptionKey> {
  const {
    keyLength = 32,
    N = 32768,
    r = 8,
    p = 1
  } = options;

  const saltBuffer = Buffer.from(salt, 'base64');
  const derivedKey = await scrypt(password, saltBuffer, keyLength, { N, r, p });
  
  return (derivedKey as Buffer).toString('base64') as EncryptionKey;
}

/**
 * Utility functions
 */

/**
 * Timing-safe string comparison
 * 
 * @param a - First string
 * @param b - Second string
 * @returns Comparison result
 */
export function timingSafeEqual(a: string, b: string): boolean {
  if (a.length !== b.length) {
    return false;
  }

  const bufferA = Buffer.from(a);
  const bufferB = Buffer.from(b);

  return crypto.timingSafeEqual(bufferA, bufferB);
}

/**
 * Generate a cryptographic hash of data
 * 
 * @param data - Data to hash
 * @param algorithm - Hash algorithm
 * @returns Base64 encoded hash
 * 
 * @example
 * ```typescript
 * const hash = hashData('data to hash');
 * console.log(hash); // base64 encoded SHA-256 hash
 * ```
 */
export function hashData(
  data: string,
  algorithm: string = CRYPTO_CONSTANTS.ALGORITHMS.HASH
): Hash {
  const hash = crypto.createHash(algorithm);
  hash.update(data);
  return hash.digest('base64') as Hash;
}

/**
 * Generate a fingerprint for an object (deterministic hash)
 * 
 * @param obj - Object to fingerprint
 * @returns Object fingerprint
 */
export function generateFingerprint(obj: any): string {
  const sortedString = JSON.stringify(obj, Object.keys(obj).sort());
  return hashData(sortedString);
}

/**
 * Constant-time string length check
 * 
 * @param str - String to check
 * @param expectedLength - Expected length
 * @returns Whether string has expected length
 */
export function constantTimeLength(str: string, expectedLength: number): boolean {
  let result = str.length ^ expectedLength;
  for (let i = 0; i < str.length; i++) {
    result |= 0;
  }
  return result === 0;
}

/**
 * Validate token format
 * 
 * @param token - Token to validate
 * @param expectedLength - Expected token length
 * @param allowPrefix - Whether to allow prefixes
 * @returns Validation result
 */
export function validateTokenFormat(
  token: string,
  expectedLength?: number,
  allowPrefix: boolean = true
): boolean {
  if (!token || typeof token !== 'string') {
    return false;
  }

  // Remove prefix if allowed
  let cleanToken = token;
  if (allowPrefix && token.includes('_')) {
    const parts = token.split('_');
    cleanToken = parts[parts.length - 1];
  }

  // Check length if specified
  if (expectedLength && cleanToken.length !== expectedLength) {
    return false;
  }

  // Check if token contains only allowed characters
  return /^[A-Za-z0-9_-]+$/.test(cleanToken);
}

/**
 * Securely wipe a string from memory (best effort)
 * Note: JavaScript strings are immutable, so this is not guaranteed
 * 
 * @param str - String to wipe
 */
export function secureWipe(str: string): void {
  // This is a best-effort attempt in JavaScript
  // In production, consider using native modules for secure memory wiping
  if (typeof str === 'string') {
    try {
      // Overwrite the string reference (limited effectiveness in JS)
      (str as any) = null;
    } catch (error) {
      // Ignore errors
    }
  }
}

/**
 * Check if running in a secure context (HTTPS)
 * 
 * @returns Whether the current context is secure
 */
export function isSecureContext(): boolean {
  if (typeof window !== 'undefined') {
    return window.isSecureContext || window.location.protocol === 'https:';
  }
  
  // In Node.js, assume secure for now
  return true;
}

/**
 * Generate a random integer within a range
 * 
 * @param min - Minimum value (inclusive)
 * @param max - Maximum value (exclusive)
 * @returns Random integer
 */
export function randomInt(min: number, max: number): number {
  const range = max - min;
  const randomBuffer = crypto.randomBytes(4);
  const randomValue = randomBuffer.readUInt32BE(0) / 0x100000000;
  return Math.floor(randomValue * range) + min;
}

/**
 * Generate a random element from an array
 * 
 * @param array - Array to select from
 * @returns Random element
 */
export function randomChoice<T>(array: T[]): T {
  if (array.length === 0) {
    throw new Error('Array must not be empty');
  }
  
  const index = randomInt(0, array.length);
  return array[index];
}

/**
 * Shuffle an array using Fisher-Yates algorithm with crypto random
 * 
 * @param array - Array to shuffle
 * @returns Shuffled array (new array)
 */
export function cryptoShuffle<T>(array: T[]): T[] {
  const shuffled = [...array];
  
  for (let i = shuffled.length - 1; i > 0; i--) {
    const j = randomInt(0, i + 1);
    [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
  }
  
  return shuffled;
}
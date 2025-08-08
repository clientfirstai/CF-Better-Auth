/**
 * Validation utilities for CF-Better-Auth
 * 
 * @fileoverview This module provides comprehensive validation functions for
 * emails, passwords, phone numbers, URLs, and other common data types.
 * 
 * Features:
 * - Email validation with domain checking
 * - Password strength validation
 * - Phone number validation with international support
 * - URL validation and sanitization
 * - Input sanitization and normalization
 * - Custom validation rules with Zod integration
 */

import { z } from 'zod';
import type { Brand } from '@cf-auth/types';
import { VALIDATION_CONSTANTS, REGEX_PATTERNS } from './constants';

/**
 * Branded types for validated data
 */
export type ValidatedEmail = Brand<string, 'ValidatedEmail'>;
export type ValidatedPhone = Brand<string, 'ValidatedPhone'>;
export type ValidatedURL = Brand<string, 'ValidatedURL'>;
export type ValidatedDomain = Brand<string, 'ValidatedDomain'>;
export type SanitizedString = Brand<string, 'SanitizedString'>;

/**
 * Validation result interfaces
 */
export interface ValidationResult<T = any> {
  /** Whether the validation passed */
  isValid: boolean;
  /** Validated/normalized value (if valid) */
  value?: T;
  /** Error message (if invalid) */
  error?: string;
  /** Additional validation details */
  details?: Record<string, any>;
}

export interface PasswordValidationResult extends ValidationResult<string> {
  /** Password strength score (0-5) */
  score: number;
  /** Detailed feedback for improvement */
  feedback: string[];
  /** Whether password meets minimum requirements */
  meetsRequirements: boolean;
  /** Estimated time to crack */
  crackTime?: string;
}

export interface EmailValidationResult extends ValidationResult<ValidatedEmail> {
  /** Normalized email address */
  normalized?: ValidatedEmail;
  /** Whether domain appears valid */
  domainValid?: boolean;
  /** Suggested corrections (if any) */
  suggestions?: string[];
}

export interface PhoneValidationResult extends ValidationResult<ValidatedPhone> {
  /** Normalized phone number */
  normalized?: ValidatedPhone;
  /** Detected country code */
  countryCode?: string;
  /** Phone type (mobile, landline, etc.) */
  type?: 'mobile' | 'landline' | 'voip' | 'unknown';
}

export interface URLValidationResult extends ValidationResult<ValidatedURL> {
  /** Normalized URL */
  normalized?: ValidatedURL;
  /** URL components */
  components?: {
    protocol: string;
    hostname: string;
    port?: number;
    pathname: string;
    search?: string;
    hash?: string;
  };
  /** Whether URL is safe (not in blocklist) */
  isSafe?: boolean;
}

/**
 * Validation options
 */
export interface EmailValidationOptions {
  /** Allow internationalized domain names */
  allowIDN?: boolean;
  /** Check domain MX records (requires network) */
  checkMX?: boolean;
  /** Allow disposable email domains */
  allowDisposable?: boolean;
  /** Custom domain blocklist */
  blockedDomains?: string[];
  /** Custom domain allowlist */
  allowedDomains?: string[];
}

export interface PasswordValidationOptions {
  /** Minimum password length */
  minLength?: number;
  /** Maximum password length */
  maxLength?: number;
  /** Require uppercase letter */
  requireUppercase?: boolean;
  /** Require lowercase letter */
  requireLowercase?: boolean;
  /** Require number */
  requireNumber?: boolean;
  /** Require special character */
  requireSpecial?: boolean;
  /** Custom special characters */
  specialChars?: string;
  /** Disallowed patterns (common passwords, etc.) */
  disallowedPatterns?: RegExp[];
  /** Check against common password lists */
  checkCommonPasswords?: boolean;
}

export interface PhoneValidationOptions {
  /** Default country code */
  defaultCountry?: string;
  /** Allowed country codes */
  allowedCountries?: string[];
  /** Blocked country codes */
  blockedCountries?: string[];
  /** Allow landline numbers */
  allowLandline?: boolean;
  /** Allow VoIP numbers */
  allowVoIP?: boolean;
}

export interface URLValidationOptions {
  /** Allowed protocols */
  allowedProtocols?: string[];
  /** Blocked domains */
  blockedDomains?: string[];
  /** Allow IP addresses */
  allowIP?: boolean;
  /** Allow localhost */
  allowLocalhost?: boolean;
  /** Allow private IP ranges */
  allowPrivateIP?: boolean;
  /** Maximum URL length */
  maxLength?: number;
}

/**
 * Common disposable email domains (subset for basic checking)
 */
const DISPOSABLE_EMAIL_DOMAINS = new Set([
  '10minutemail.com',
  'tempmail.org',
  'guerrillamail.com',
  'mailinator.com',
  'yopmail.com',
  'temp-mail.org',
  'throwaway.email'
]);

/**
 * Common weak passwords (subset for basic checking)
 */
const COMMON_WEAK_PASSWORDS = new Set([
  'password',
  '123456',
  '123456789',
  'qwerty',
  'abc123',
  'password123',
  'admin',
  'letmein',
  'welcome',
  'monkey'
]);

/**
 * Email validation utilities
 */

/**
 * Validate email address with comprehensive checks
 * 
 * @param email - Email address to validate
 * @param options - Validation options
 * @returns Email validation result
 * 
 * @example
 * ```typescript
 * const result = validateEmail('user@example.com');
 * if (result.isValid) {
 *   console.log('Valid email:', result.normalized);
 * }
 * ```
 */
export function validateEmail(
  email: string,
  options: EmailValidationOptions = {}
): EmailValidationResult {
  if (!email || typeof email !== 'string') {
    return {
      isValid: false,
      error: 'Email must be a non-empty string'
    };
  }

  const trimmedEmail = email.trim().toLowerCase();

  // Basic length check
  if (trimmedEmail.length < VALIDATION_CONSTANTS.EMAIL.MIN_LENGTH) {
    return {
      isValid: false,
      error: `Email must be at least ${VALIDATION_CONSTANTS.EMAIL.MIN_LENGTH} characters`
    };
  }

  if (trimmedEmail.length > VALIDATION_CONSTANTS.EMAIL.MAX_LENGTH) {
    return {
      isValid: false,
      error: `Email must be no more than ${VALIDATION_CONSTANTS.EMAIL.MAX_LENGTH} characters`
    };
  }

  // Regex validation
  if (!VALIDATION_CONSTANTS.EMAIL.PATTERN.test(trimmedEmail)) {
    return {
      isValid: false,
      error: 'Invalid email format',
      suggestions: generateEmailSuggestions(email)
    };
  }

  // Extract domain
  const [localPart, domain] = trimmedEmail.split('@');
  
  if (!localPart || !domain) {
    return {
      isValid: false,
      error: 'Email must contain both local and domain parts'
    };
  }

  // Domain validation
  if (!isValidDomain(domain)) {
    return {
      isValid: false,
      error: 'Invalid email domain',
      domainValid: false
    };
  }

  // Check against blocklist/allowlist
  if (options.blockedDomains?.includes(domain)) {
    return {
      isValid: false,
      error: 'Email domain is not allowed'
    };
  }

  if (options.allowedDomains && !options.allowedDomains.includes(domain)) {
    return {
      isValid: false,
      error: 'Email domain is not in allowlist'
    };
  }

  // Check disposable email domains
  if (!options.allowDisposable && DISPOSABLE_EMAIL_DOMAINS.has(domain)) {
    return {
      isValid: false,
      error: 'Disposable email addresses are not allowed'
    };
  }

  return {
    isValid: true,
    value: trimmedEmail as ValidatedEmail,
    normalized: trimmedEmail as ValidatedEmail,
    domainValid: true
  };
}

/**
 * Generate email suggestions for common typos
 * 
 * @param email - Email with potential typo
 * @returns Suggested corrections
 */
function generateEmailSuggestions(email: string): string[] {
  const suggestions: string[] = [];
  const commonDomains = ['gmail.com', 'yahoo.com', 'hotmail.com', 'outlook.com'];
  
  const atIndex = email.lastIndexOf('@');
  if (atIndex > 0) {
    const localPart = email.substring(0, atIndex);
    const domain = email.substring(atIndex + 1).toLowerCase();
    
    // Common domain typos
    const domainMap: Record<string, string> = {
      'gmai.com': 'gmail.com',
      'gmial.com': 'gmail.com',
      'yahooo.com': 'yahoo.com',
      'hotmai.com': 'hotmail.com',
      'outlok.com': 'outlook.com'
    };
    
    if (domainMap[domain]) {
      suggestions.push(`${localPart}@${domainMap[domain]}`);
    }
    
    // Suggest common domains if current domain is short and invalid
    if (domain.length < 5) {
      suggestions.push(...commonDomains.map(d => `${localPart}@${d}`));
    }
  }
  
  return suggestions.slice(0, 3); // Limit to 3 suggestions
}

/**
 * Normalize email address
 * 
 * @param email - Email to normalize
 * @returns Normalized email
 */
export function normalizeEmail(email: string): ValidatedEmail {
  return email.trim().toLowerCase() as ValidatedEmail;
}

/**
 * Password validation utilities
 */

/**
 * Validate password strength with comprehensive analysis
 * 
 * @param password - Password to validate
 * @param options - Validation options
 * @returns Password validation result
 * 
 * @example
 * ```typescript
 * const result = validatePassword('MySecure123!');
 * console.log('Score:', result.score); // 0-5
 * console.log('Feedback:', result.feedback);
 * ```
 */
export function validatePassword(
  password: string,
  options: PasswordValidationOptions = {}
): PasswordValidationResult {
  if (!password || typeof password !== 'string') {
    return {
      isValid: false,
      score: 0,
      feedback: ['Password must be a non-empty string'],
      meetsRequirements: false,
      error: 'Password must be provided'
    };
  }

  const {
    minLength = VALIDATION_CONSTANTS.PASSWORD.MIN_LENGTH,
    maxLength = VALIDATION_CONSTANTS.PASSWORD.MAX_LENGTH,
    requireUppercase = VALIDATION_CONSTANTS.PASSWORD.REQUIRE_UPPERCASE,
    requireLowercase = VALIDATION_CONSTANTS.PASSWORD.REQUIRE_LOWERCASE,
    requireNumber = VALIDATION_CONSTANTS.PASSWORD.REQUIRE_NUMBER,
    requireSpecial = VALIDATION_CONSTANTS.PASSWORD.REQUIRE_SPECIAL,
    specialChars = VALIDATION_CONSTANTS.PASSWORD.SPECIAL_CHARS,
    checkCommonPasswords = true
  } = options;

  let score = 0;
  const feedback: string[] = [];
  let meetsRequirements = true;

  // Length checks
  if (password.length < minLength) {
    feedback.push(`Password must be at least ${minLength} characters long`);
    meetsRequirements = false;
  } else if (password.length >= minLength) {
    score += 1;
  }

  if (password.length > maxLength) {
    feedback.push(`Password must be no more than ${maxLength} characters long`);
    meetsRequirements = false;
  }

  // Character type checks
  if (requireUppercase && !/[A-Z]/.test(password)) {
    feedback.push('Password must contain at least one uppercase letter');
    meetsRequirements = false;
  } else if (/[A-Z]/.test(password)) {
    score += 1;
  }

  if (requireLowercase && !/[a-z]/.test(password)) {
    feedback.push('Password must contain at least one lowercase letter');
    meetsRequirements = false;
  } else if (/[a-z]/.test(password)) {
    score += 1;
  }

  if (requireNumber && !/\d/.test(password)) {
    feedback.push('Password must contain at least one number');
    meetsRequirements = false;
  } else if (/\d/.test(password)) {
    score += 1;
  }

  if (requireSpecial && !new RegExp(`[${escapeRegExp(specialChars)}]`).test(password)) {
    feedback.push('Password must contain at least one special character');
    meetsRequirements = false;
  } else if (new RegExp(`[${escapeRegExp(specialChars)}]`).test(password)) {
    score += 1;
  }

  // Additional strength checks
  if (password.length >= 12) {
    score += 1; // Bonus for longer passwords
  }

  // Check for common patterns
  if (checkCommonPasswords && COMMON_WEAK_PASSWORDS.has(password.toLowerCase())) {
    feedback.push('Password is too common, please choose a more unique password');
    meetsRequirements = false;
    score = Math.max(0, score - 2);
  }

  // Check for repeated characters
  if (/(.)\1{3,}/.test(password)) {
    feedback.push('Avoid repeating the same character multiple times');
    score = Math.max(0, score - 1);
  }

  // Check for sequential patterns
  if (hasSequentialPattern(password)) {
    feedback.push('Avoid sequential patterns like "abc" or "123"');
    score = Math.max(0, score - 1);
  }

  // Estimate crack time
  const crackTime = estimatePasswordCrackTime(password);

  const isValid = meetsRequirements && score >= 3;

  return {
    isValid,
    value: isValid ? password : undefined,
    score,
    feedback,
    meetsRequirements,
    crackTime,
    error: isValid ? undefined : 'Password does not meet requirements'
  };
}

/**
 * Check for sequential patterns in password
 */
function hasSequentialPattern(password: string): boolean {
  const sequences = [
    'abcdefghijklmnopqrstuvwxyz',
    'qwertyuiopasdfghjklzxcvbnm',
    '0123456789'
  ];

  return sequences.some(seq => {
    for (let i = 0; i <= seq.length - 3; i++) {
      const pattern = seq.substring(i, i + 3);
      if (password.toLowerCase().includes(pattern) || 
          password.toLowerCase().includes(pattern.split('').reverse().join(''))) {
        return true;
      }
    }
    return false;
  });
}

/**
 * Estimate time to crack password (simplified)
 */
function estimatePasswordCrackTime(password: string): string {
  let charSpace = 0;
  
  if (/[a-z]/.test(password)) charSpace += 26;
  if (/[A-Z]/.test(password)) charSpace += 26;
  if (/\d/.test(password)) charSpace += 10;
  if (/[^a-zA-Z0-9]/.test(password)) charSpace += 32;

  const entropy = Math.log2(Math.pow(charSpace, password.length));
  const guessesPerSecond = 1e9; // Assume 1 billion guesses per second
  const secondsToCrack = Math.pow(2, entropy - 1) / guessesPerSecond;

  if (secondsToCrack < 60) return 'Less than a minute';
  if (secondsToCrack < 3600) return `${Math.round(secondsToCrack / 60)} minutes`;
  if (secondsToCrack < 86400) return `${Math.round(secondsToCrack / 3600)} hours`;
  if (secondsToCrack < 31536000) return `${Math.round(secondsToCrack / 86400)} days`;
  if (secondsToCrack < 31536000000) return `${Math.round(secondsToCrack / 31536000)} years`;
  return 'Centuries';
}

/**
 * Phone number validation utilities
 */

/**
 * Validate phone number with international support
 * 
 * @param phone - Phone number to validate
 * @param options - Validation options
 * @returns Phone validation result
 */
export function validatePhone(
  phone: string,
  options: PhoneValidationOptions = {}
): PhoneValidationResult {
  if (!phone || typeof phone !== 'string') {
    return {
      isValid: false,
      error: 'Phone number must be a non-empty string'
    };
  }

  // Clean the phone number
  const cleaned = phone.replace(/[\s\-\(\)\.]/g, '');
  
  // Basic length check
  if (cleaned.length < VALIDATION_CONSTANTS.PHONE.MIN_LENGTH) {
    return {
      isValid: false,
      error: `Phone number must be at least ${VALIDATION_CONSTANTS.PHONE.MIN_LENGTH} digits`
    };
  }

  if (cleaned.length > VALIDATION_CONSTANTS.PHONE.MAX_LENGTH) {
    return {
      isValid: false,
      error: `Phone number must be no more than ${VALIDATION_CONSTANTS.PHONE.MAX_LENGTH} digits`
    };
  }

  // Basic pattern validation
  if (!VALIDATION_CONSTANTS.PHONE.PATTERN.test(cleaned)) {
    return {
      isValid: false,
      error: 'Invalid phone number format'
    };
  }

  // Extract country code (simplified)
  let countryCode = '';
  let nationalNumber = cleaned;
  
  if (cleaned.startsWith('+')) {
    const match = cleaned.match(/^\+(\d{1,4})/);
    if (match) {
      countryCode = match[1];
      nationalNumber = cleaned.substring(match[0].length);
    }
  } else if (options.defaultCountry) {
    countryCode = options.defaultCountry;
  }

  // Country code validation
  if (options.allowedCountries && countryCode && !options.allowedCountries.includes(countryCode)) {
    return {
      isValid: false,
      error: 'Phone number country code is not allowed'
    };
  }

  if (options.blockedCountries && countryCode && options.blockedCountries.includes(countryCode)) {
    return {
      isValid: false,
      error: 'Phone number country code is blocked'
    };
  }

  // Format normalized number
  const normalized = countryCode ? `+${countryCode}${nationalNumber}` : nationalNumber;

  return {
    isValid: true,
    value: normalized as ValidatedPhone,
    normalized: normalized as ValidatedPhone,
    countryCode: countryCode || undefined,
    type: 'unknown' // Would need more sophisticated parsing for accurate type detection
  };
}

/**
 * Normalize phone number
 * 
 * @param phone - Phone number to normalize
 * @returns Normalized phone number
 */
export function normalizePhone(phone: string): string {
  return phone.replace(/[\s\-\(\)\.]/g, '');
}

/**
 * URL validation utilities
 */

/**
 * Validate URL with security checks
 * 
 * @param url - URL to validate
 * @param options - Validation options
 * @returns URL validation result
 */
export function validateURL(
  url: string,
  options: URLValidationOptions = {}
): URLValidationResult {
  if (!url || typeof url !== 'string') {
    return {
      isValid: false,
      error: 'URL must be a non-empty string'
    };
  }

  const {
    allowedProtocols = ['http', 'https'],
    maxLength = 2048,
    allowIP = false,
    allowLocalhost = false,
    allowPrivateIP = false
  } = options;

  // Length check
  if (url.length > maxLength) {
    return {
      isValid: false,
      error: `URL must be no more than ${maxLength} characters`
    };
  }

  let urlObj: URL;
  try {
    urlObj = new URL(url);
  } catch (error) {
    return {
      isValid: false,
      error: 'Invalid URL format'
    };
  }

  // Protocol check
  const protocol = urlObj.protocol.slice(0, -1); // Remove trailing ':'
  if (!allowedProtocols.includes(protocol)) {
    return {
      isValid: false,
      error: `Protocol '${protocol}' is not allowed`
    };
  }

  // Hostname checks
  const hostname = urlObj.hostname.toLowerCase();

  // Check blocked domains
  if (options.blockedDomains?.includes(hostname)) {
    return {
      isValid: false,
      error: 'Domain is blocked'
    };
  }

  // IP address checks
  if (REGEX_PATTERNS.IPV4.test(hostname)) {
    if (!allowIP) {
      return {
        isValid: false,
        error: 'IP addresses are not allowed'
      };
    }

    if (!allowPrivateIP && isPrivateIP(hostname)) {
      return {
        isValid: false,
        error: 'Private IP addresses are not allowed'
      };
    }
  }

  // Localhost check
  if (!allowLocalhost && (hostname === 'localhost' || hostname === '127.0.0.1')) {
    return {
      isValid: false,
      error: 'Localhost URLs are not allowed'
    };
  }

  // Extract components
  const components = {
    protocol: urlObj.protocol,
    hostname: urlObj.hostname,
    port: urlObj.port ? parseInt(urlObj.port) : undefined,
    pathname: urlObj.pathname,
    search: urlObj.search || undefined,
    hash: urlObj.hash || undefined
  };

  return {
    isValid: true,
    value: url as ValidatedURL,
    normalized: urlObj.toString() as ValidatedURL,
    components,
    isSafe: true // Would implement more sophisticated safety checking
  };
}

/**
 * Check if IP is private
 */
function isPrivateIP(ip: string): boolean {
  const parts = ip.split('.').map(Number);
  if (parts.length !== 4) return false;

  // 10.0.0.0/8
  if (parts[0] === 10) return true;
  
  // 172.16.0.0/12
  if (parts[0] === 172 && parts[1] >= 16 && parts[1] <= 31) return true;
  
  // 192.168.0.0/16
  if (parts[0] === 192 && parts[1] === 168) return true;
  
  // 127.0.0.0/8 (loopback)
  if (parts[0] === 127) return true;

  return false;
}

/**
 * Domain validation utilities
 */

/**
 * Validate domain name
 * 
 * @param domain - Domain to validate
 * @returns Whether domain is valid
 */
export function isValidDomain(domain: string): boolean {
  if (!domain || typeof domain !== 'string') {
    return false;
  }

  // Basic length and character checks
  if (domain.length > 253 || domain.length < 1) {
    return false;
  }

  return REGEX_PATTERNS.DOMAIN.test(domain);
}

/**
 * Input sanitization utilities
 */

/**
 * Sanitize string input to prevent XSS
 * 
 * @param input - Input string to sanitize
 * @returns Sanitized string
 */
export function sanitizeString(input: string): SanitizedString {
  if (!input || typeof input !== 'string') {
    return '' as SanitizedString;
  }

  return input
    .replace(/[<>]/g, '')
    .replace(/javascript:/gi, '')
    .replace(/on\w+=/gi, '')
    .replace(/data:/gi, '')
    .trim() as SanitizedString;
}

/**
 * Sanitize HTML input
 * 
 * @param html - HTML string to sanitize
 * @returns Sanitized HTML
 */
export function sanitizeHTML(html: string): SanitizedString {
  if (!html || typeof html !== 'string') {
    return '' as SanitizedString;
  }

  // Basic HTML sanitization (in production, use a proper HTML sanitizer like DOMPurify)
  return html
    .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '')
    .replace(/<iframe\b[^<]*(?:(?!<\/iframe>)<[^<]*)*<\/iframe>/gi, '')
    .replace(/on\w+="[^"]*"/gi, '')
    .replace(/on\w+='[^']*'/gi, '')
    .replace(/javascript:/gi, '')
    .replace(/data:/gi, '') as SanitizedString;
}

/**
 * Zod schema utilities
 */

/**
 * Create email validation schema
 */
export const emailSchema = (options: EmailValidationOptions = {}) =>
  z.string().refine((email) => {
    const result = validateEmail(email, options);
    return result.isValid;
  }, {
    message: 'Invalid email address'
  });

/**
 * Create password validation schema
 */
export const passwordSchema = (options: PasswordValidationOptions = {}) =>
  z.string().refine((password) => {
    const result = validatePassword(password, options);
    return result.isValid;
  }, {
    message: 'Password does not meet requirements'
  });

/**
 * Create phone validation schema
 */
export const phoneSchema = (options: PhoneValidationOptions = {}) =>
  z.string().refine((phone) => {
    const result = validatePhone(phone, options);
    return result.isValid;
  }, {
    message: 'Invalid phone number'
  });

/**
 * Create URL validation schema
 */
export const urlSchema = (options: URLValidationOptions = {}) =>
  z.string().refine((url) => {
    const result = validateURL(url, options);
    return result.isValid;
  }, {
    message: 'Invalid URL'
  });

/**
 * Utility functions
 */

/**
 * Escape special characters for regex
 */
function escapeRegExp(string: string): string {
  return string.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

/**
 * Check if string contains only allowed characters
 * 
 * @param str - String to check
 * @param allowedChars - Allowed characters (regex pattern)
 * @returns Whether string is valid
 */
export function containsOnlyAllowedChars(str: string, allowedChars: RegExp): boolean {
  return allowedChars.test(str);
}

/**
 * Validate credit card number using Luhn algorithm
 * 
 * @param cardNumber - Credit card number
 * @returns Whether card number is valid
 */
export function validateCreditCard(cardNumber: string): boolean {
  const cleaned = cardNumber.replace(/\s/g, '');
  
  if (!REGEX_PATTERNS.CREDIT_CARD.test(cleaned)) {
    return false;
  }

  // Luhn algorithm
  let sum = 0;
  let isEven = false;
  
  for (let i = cleaned.length - 1; i >= 0; i--) {
    let digit = parseInt(cleaned[i]);
    
    if (isEven) {
      digit *= 2;
      if (digit > 9) {
        digit -= 9;
      }
    }
    
    sum += digit;
    isEven = !isEven;
  }
  
  return sum % 10 === 0;
}

/**
 * Validate username
 * 
 * @param username - Username to validate
 * @returns Validation result
 */
export function validateUsername(username: string): ValidationResult<string> {
  if (!username || typeof username !== 'string') {
    return {
      isValid: false,
      error: 'Username must be a non-empty string'
    };
  }

  if (username.length < VALIDATION_CONSTANTS.USERNAME.MIN_LENGTH) {
    return {
      isValid: false,
      error: `Username must be at least ${VALIDATION_CONSTANTS.USERNAME.MIN_LENGTH} characters`
    };
  }

  if (username.length > VALIDATION_CONSTANTS.USERNAME.MAX_LENGTH) {
    return {
      isValid: false,
      error: `Username must be no more than ${VALIDATION_CONSTANTS.USERNAME.MAX_LENGTH} characters`
    };
  }

  if (!VALIDATION_CONSTANTS.USERNAME.PATTERN.test(username)) {
    return {
      isValid: false,
      error: 'Username can only contain letters, numbers, underscores, and hyphens'
    };
  }

  return {
    isValid: true,
    value: username.toLowerCase()
  };
}
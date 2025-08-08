/**
 * Type guards and assertion utilities for CF-Better-Auth
 * 
 * @fileoverview This module provides comprehensive type guards, assertion functions,
 * and runtime type checking utilities with branded types support.
 * 
 * Features:
 * - Basic type guards (string, number, object, etc.)
 * - CF-Auth specific type guards
 * - Assertion functions with error messages
 * - Array and object validation
 * - Branded type validation
 * - Complex type checking
 */

import type { 
  UserId, 
  SessionId, 
  User, 
  Session, 
  Organization,
  Brand,
  JsonValue,
  JsonObject
} from '@cf-auth/types';
import { REGEX_PATTERNS } from './constants';

/**
 * Basic type guards
 */

/**
 * Check if value is a string
 */
export function isString(value: unknown): value is string {
  return typeof value === 'string';
}

/**
 * Check if value is a non-empty string
 */
export function isNonEmptyString(value: unknown): value is string {
  return isString(value) && value.length > 0;
}

/**
 * Check if value is a number
 */
export function isNumber(value: unknown): value is number {
  return typeof value === 'number' && !isNaN(value) && isFinite(value);
}

/**
 * Check if value is a positive number
 */
export function isPositiveNumber(value: unknown): value is number {
  return isNumber(value) && value > 0;
}

/**
 * Check if value is a boolean
 */
export function isBoolean(value: unknown): value is boolean {
  return typeof value === 'boolean';
}

/**
 * Check if value is null
 */
export function isNull(value: unknown): value is null {
  return value === null;
}

/**
 * Check if value is undefined
 */
export function isUndefined(value: unknown): value is undefined {
  return value === undefined;
}

/**
 * Check if value is null or undefined
 */
export function isNullish(value: unknown): value is null | undefined {
  return value == null;
}

/**
 * Check if value is defined (not null or undefined)
 */
export function isDefined<T>(value: T | null | undefined): value is T {
  return value != null;
}

/**
 * Check if value is a function
 */
export function isFunction(value: unknown): value is Function {
  return typeof value === 'function';
}

/**
 * Check if value is an object (excluding null and arrays)
 */
export function isObject(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

/**
 * Check if value is a plain object (created with {} or new Object())
 */
export function isPlainObject(value: unknown): value is Record<string, unknown> {
  if (!isObject(value)) {
    return false;
  }

  const proto = Object.getPrototypeOf(value);
  return proto === null || proto === Object.prototype;
}

/**
 * Check if value is an array
 */
export function isArray(value: unknown): value is unknown[] {
  return Array.isArray(value);
}

/**
 * Check if value is a non-empty array
 */
export function isNonEmptyArray<T>(value: unknown): value is [T, ...T[]] {
  return isArray(value) && value.length > 0;
}

/**
 * Check if value is a Date object
 */
export function isDate(value: unknown): value is Date {
  return value instanceof Date && !isNaN(value.getTime());
}

/**
 * Check if value is a RegExp
 */
export function isRegExp(value: unknown): value is RegExp {
  return value instanceof RegExp;
}

/**
 * Check if value is a Promise
 */
export function isPromise(value: unknown): value is Promise<unknown> {
  return value instanceof Promise;
}

/**
 * Check if value is Promise-like (has then method)
 */
export function isPromiseLike(value: unknown): value is PromiseLike<unknown> {
  return isObject(value) && isFunction((value as any).then);
}

/**
 * Check if value is an Error
 */
export function isError(value: unknown): value is Error {
  return value instanceof Error;
}

/**
 * Array type guards
 */

/**
 * Check if array contains only strings
 */
export function isStringArray(value: unknown): value is string[] {
  return isArray(value) && value.every(isString);
}

/**
 * Check if array contains only numbers
 */
export function isNumberArray(value: unknown): value is number[] {
  return isArray(value) && value.every(isNumber);
}

/**
 * Check if array contains only booleans
 */
export function isBooleanArray(value: unknown): value is boolean[] {
  return isArray(value) && value.every(isBoolean);
}

/**
 * Create array type guard
 */
export function createArrayGuard<T>(guard: (value: unknown) => value is T) {
  return (value: unknown): value is T[] => {
    return isArray(value) && value.every(guard);
  };
}

/**
 * JSON type guards
 */

/**
 * Check if value is JSON primitive
 */
export function isJsonPrimitive(value: unknown): value is string | number | boolean | null {
  return isString(value) || isNumber(value) || isBoolean(value) || isNull(value);
}

/**
 * Check if value is valid JSON value
 */
export function isJsonValue(value: unknown): value is JsonValue {
  if (isJsonPrimitive(value)) {
    return true;
  }

  if (isArray(value)) {
    return value.every(isJsonValue);
  }

  if (isPlainObject(value)) {
    return Object.values(value).every(isJsonValue);
  }

  return false;
}

/**
 * Check if value is JSON object
 */
export function isJsonObject(value: unknown): value is JsonObject {
  return isPlainObject(value) && Object.values(value).every(isJsonValue);
}

/**
 * Format validation guards
 */

/**
 * Check if string is valid email
 */
export function isEmail(value: unknown): value is string {
  return isString(value) && REGEX_PATTERNS.EMAIL.test(value);
}

/**
 * Check if string is valid URL
 */
export function isURL(value: unknown): value is string {
  if (!isString(value)) {
    return false;
  }

  try {
    new URL(value);
    return true;
  } catch {
    return false;
  }
}

/**
 * Check if string is valid UUID
 */
export function isUUID(value: unknown): value is string {
  return isString(value) && REGEX_PATTERNS.UUID.test(value);
}

/**
 * Check if string is valid phone number
 */
export function isPhoneNumber(value: unknown): value is string {
  return isString(value) && REGEX_PATTERNS.PHONE.test(value.replace(/[\s\-\(\)\.]/g, ''));
}

/**
 * Check if string is alphanumeric
 */
export function isAlphanumeric(value: unknown): value is string {
  return isString(value) && REGEX_PATTERNS.ALPHANUMERIC.test(value);
}

/**
 * Check if string is valid slug
 */
export function isSlug(value: unknown): value is string {
  return isString(value) && REGEX_PATTERNS.SLUG.test(value);
}

/**
 * Branded type guards
 */

/**
 * Check if value is a valid UserId
 */
export function isUserId(value: unknown): value is UserId {
  return isNonEmptyString(value);
}

/**
 * Check if value is a valid SessionId
 */
export function isSessionId(value: unknown): value is SessionId {
  return isNonEmptyString(value);
}

/**
 * Create branded type guard
 */
export function createBrandedGuard<T extends Brand<any, any>>(
  baseGuard: (value: unknown) => boolean
) {
  return (value: unknown): value is T => baseGuard(value);
}

/**
 * CF-Auth entity type guards
 */

/**
 * Check if value is a valid User object
 */
export function isUser(value: unknown): value is User {
  if (!isObject(value)) {
    return false;
  }

  const user = value as any;
  
  return (
    isUserId(user.id) &&
    isDate(user.createdAt) &&
    isDate(user.updatedAt) &&
    (user.email === undefined || isEmail(user.email)) &&
    (user.emailVerified === undefined || isBoolean(user.emailVerified)) &&
    (user.name === undefined || isString(user.name)) &&
    (user.phone === undefined || isString(user.phone)) &&
    (user.phoneVerified === undefined || isBoolean(user.phoneVerified))
  );
}

/**
 * Check if value is a valid Session object
 */
export function isSession(value: unknown): value is Session {
  if (!isObject(value)) {
    return false;
  }

  const session = value as any;
  
  return (
    isSessionId(session.id) &&
    isUserId(session.userId) &&
    isDate(session.expiresAt) &&
    isDate(session.createdAt) &&
    isDate(session.updatedAt) &&
    (session.isActive === undefined || isBoolean(session.isActive))
  );
}

/**
 * Check if value is a valid Organization object
 */
export function isOrganization(value: unknown): value is Organization {
  if (!isObject(value)) {
    return false;
  }

  const org = value as any;
  
  return (
    isNonEmptyString(org.id) &&
    isNonEmptyString(org.name) &&
    isNonEmptyString(org.slug) &&
    isDate(org.createdAt) &&
    isDate(org.updatedAt)
  );
}

/**
 * Complex validation guards
 */

/**
 * Check if object has specific properties
 */
export function hasProperties<T extends Record<string, unknown>>(
  value: unknown,
  properties: (keyof T)[]
): value is T {
  if (!isObject(value)) {
    return false;
  }

  return properties.every(prop => prop in value);
}

/**
 * Check if object has all required properties with type validation
 */
export function hasValidProperties<T extends Record<string, unknown>>(
  value: unknown,
  validators: { [K in keyof T]: (value: unknown) => value is T[K] }
): value is T {
  if (!isObject(value)) {
    return false;
  }

  return Object.entries(validators).every(([key, validator]) => 
    validator((value as any)[key])
  );
}

/**
 * Check if value matches one of several types
 */
export function isOneOf<T extends readonly unknown[]>(
  value: unknown,
  ...guards: { [K in keyof T]: (value: unknown) => value is T[K] }
): value is T[number] {
  return guards.some(guard => guard(value));
}

/**
 * Check if all items in array match guard
 */
export function areAll<T>(
  values: unknown[],
  guard: (value: unknown) => value is T
): values is T[] {
  return values.every(guard);
}

/**
 * Check if any item in array matches guard
 */
export function isAny<T>(
  values: unknown[],
  guard: (value: unknown) => value is T
): boolean {
  return values.some(guard);
}

/**
 * Assertion functions
 */

/**
 * Assert that value is defined
 */
export function assertDefined<T>(
  value: T | null | undefined,
  message?: string
): asserts value is T {
  if (value == null) {
    throw new Error(message || 'Value must be defined');
  }
}

/**
 * Assert that value is a string
 */
export function assertString(
  value: unknown,
  message?: string
): asserts value is string {
  if (!isString(value)) {
    throw new Error(message || 'Value must be a string');
  }
}

/**
 * Assert that value is a non-empty string
 */
export function assertNonEmptyString(
  value: unknown,
  message?: string
): asserts value is string {
  if (!isNonEmptyString(value)) {
    throw new Error(message || 'Value must be a non-empty string');
  }
}

/**
 * Assert that value is a number
 */
export function assertNumber(
  value: unknown,
  message?: string
): asserts value is number {
  if (!isNumber(value)) {
    throw new Error(message || 'Value must be a number');
  }
}

/**
 * Assert that value is a positive number
 */
export function assertPositiveNumber(
  value: unknown,
  message?: string
): asserts value is number {
  if (!isPositiveNumber(value)) {
    throw new Error(message || 'Value must be a positive number');
  }
}

/**
 * Assert that value is a boolean
 */
export function assertBoolean(
  value: unknown,
  message?: string
): asserts value is boolean {
  if (!isBoolean(value)) {
    throw new Error(message || 'Value must be a boolean');
  }
}

/**
 * Assert that value is an object
 */
export function assertObject(
  value: unknown,
  message?: string
): asserts value is Record<string, unknown> {
  if (!isObject(value)) {
    throw new Error(message || 'Value must be an object');
  }
}

/**
 * Assert that value is an array
 */
export function assertArray(
  value: unknown,
  message?: string
): asserts value is unknown[] {
  if (!isArray(value)) {
    throw new Error(message || 'Value must be an array');
  }
}

/**
 * Assert that value is a non-empty array
 */
export function assertNonEmptyArray<T>(
  value: unknown,
  message?: string
): asserts value is [T, ...T[]] {
  if (!isNonEmptyArray(value)) {
    throw new Error(message || 'Value must be a non-empty array');
  }
}

/**
 * Assert that value is a function
 */
export function assertFunction(
  value: unknown,
  message?: string
): asserts value is Function {
  if (!isFunction(value)) {
    throw new Error(message || 'Value must be a function');
  }
}

/**
 * Assert that value is a Date
 */
export function assertDate(
  value: unknown,
  message?: string
): asserts value is Date {
  if (!isDate(value)) {
    throw new Error(message || 'Value must be a valid Date');
  }
}

/**
 * Assert that value is a valid email
 */
export function assertEmail(
  value: unknown,
  message?: string
): asserts value is string {
  if (!isEmail(value)) {
    throw new Error(message || 'Value must be a valid email address');
  }
}

/**
 * Assert that value is a valid URL
 */
export function assertURL(
  value: unknown,
  message?: string
): asserts value is string {
  if (!isURL(value)) {
    throw new Error(message || 'Value must be a valid URL');
  }
}

/**
 * Assert that value is a valid UUID
 */
export function assertUUID(
  value: unknown,
  message?: string
): asserts value is string {
  if (!isUUID(value)) {
    throw new Error(message || 'Value must be a valid UUID');
  }
}

/**
 * Assert that value is a valid User
 */
export function assertUser(
  value: unknown,
  message?: string
): asserts value is User {
  if (!isUser(value)) {
    throw new Error(message || 'Value must be a valid User object');
  }
}

/**
 * Assert that value is a valid Session
 */
export function assertSession(
  value: unknown,
  message?: string
): asserts value is Session {
  if (!isSession(value)) {
    throw new Error(message || 'Value must be a valid Session object');
  }
}

/**
 * Generic assertion function creator
 */
export function createAssertion<T>(
  guard: (value: unknown) => value is T,
  defaultMessage: string = 'Assertion failed'
) {
  return (value: unknown, message?: string): asserts value is T => {
    if (!guard(value)) {
      throw new Error(message || defaultMessage);
    }
  };
}

/**
 * Range validation guards
 */

/**
 * Check if number is within range
 */
export function isInRange(value: unknown, min: number, max: number): value is number {
  return isNumber(value) && value >= min && value <= max;
}

/**
 * Check if string length is within range
 */
export function hasLengthInRange(value: unknown, min: number, max: number): value is string {
  return isString(value) && value.length >= min && value.length <= max;
}

/**
 * Check if array length is within range
 */
export function hasArrayLengthInRange(value: unknown, min: number, max: number): value is unknown[] {
  return isArray(value) && value.length >= min && value.length <= max;
}

/**
 * Environment guards
 */

/**
 * Check if running in browser environment
 */
export function isBrowser(): boolean {
  return typeof window !== 'undefined' && typeof document !== 'undefined';
}

/**
 * Check if running in Node.js environment
 */
export function isNode(): boolean {
  return typeof process !== 'undefined' && 
         process.versions != null && 
         process.versions.node != null;
}

/**
 * Check if running in worker environment
 */
export function isWorker(): boolean {
  return typeof importScripts === 'function' && 
         typeof window === 'undefined';
}

/**
 * Feature detection guards
 */

/**
 * Check if localStorage is available
 */
export function hasLocalStorage(): boolean {
  try {
    return typeof localStorage !== 'undefined' && localStorage !== null;
  } catch {
    return false;
  }
}

/**
 * Check if sessionStorage is available
 */
export function hasSessionStorage(): boolean {
  try {
    return typeof sessionStorage !== 'undefined' && sessionStorage !== null;
  } catch {
    return false;
  }
}

/**
 * Check if fetch API is available
 */
export function hasFetch(): boolean {
  return typeof fetch === 'function';
}

/**
 * Check if WebSocket is available
 */
export function hasWebSocket(): boolean {
  return typeof WebSocket !== 'undefined';
}

/**
 * Validation result guards
 */

/**
 * Check if validation result is success
 */
export function isValidationSuccess<T>(
  result: { success: boolean; data?: T; error?: any }
): result is { success: true; data: T } {
  return result.success === true && result.data !== undefined;
}

/**
 * Check if validation result is failure
 */
export function isValidationFailure<E>(
  result: { success: boolean; data?: any; error?: E }
): result is { success: false; error: E } {
  return result.success === false;
}

/**
 * Utility functions
 */

/**
 * Get type of value as string
 */
export function getType(value: unknown): string {
  if (value === null) return 'null';
  if (value === undefined) return 'undefined';
  if (isArray(value)) return 'array';
  if (isDate(value)) return 'date';
  if (isRegExp(value)) return 'regexp';
  if (isError(value)) return 'error';
  
  return typeof value;
}

/**
 * Check if two values are of the same type
 */
export function areSameType(a: unknown, b: unknown): boolean {
  return getType(a) === getType(b);
}

/**
 * Safely check if value has property
 */
export function hasProperty<T extends PropertyKey>(
  value: unknown,
  property: T
): value is Record<T, unknown> {
  return isObject(value) && property in value;
}

/**
 * Check if value is empty (null, undefined, empty string, empty array, empty object)
 */
export function isEmpty(value: unknown): boolean {
  if (isNullish(value)) return true;
  if (isString(value)) return value.length === 0;
  if (isArray(value)) return value.length === 0;
  if (isObject(value)) return Object.keys(value).length === 0;
  return false;
}
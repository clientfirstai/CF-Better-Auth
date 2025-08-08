/**
 * Data transformation utilities for CF-Better-Auth
 * 
 * @fileoverview This module provides utilities for transforming, mapping,
 * and converting data between different formats and structures.
 */

import type { Brand } from '@cf-auth/types';

export type TransformedData<T> = Brand<T, 'TransformedData'>;

/**
 * Object transformation utilities
 */

/**
 * Deep clone an object
 */
export function deepClone<T>(obj: T): T {
  if (obj === null || typeof obj !== 'object') {
    return obj;
  }
  
  if (obj instanceof Date) {
    return new Date(obj.getTime()) as T;
  }
  
  if (obj instanceof Array) {
    return obj.map(deepClone) as T;
  }
  
  if (typeof obj === 'object') {
    const cloned = {} as T;
    for (const key in obj) {
      if (obj.hasOwnProperty(key)) {
        cloned[key] = deepClone(obj[key]);
      }
    }
    return cloned;
  }
  
  return obj;
}

/**
 * Deep merge two objects
 */
export function deepMerge<T extends Record<string, any>>(target: T, source: Partial<T>): T {
  const result = deepClone(target);
  
  for (const key in source) {
    if (source.hasOwnProperty(key)) {
      const sourceValue = source[key];
      const targetValue = result[key];
      
      if (isObject(sourceValue) && isObject(targetValue)) {
        result[key] = deepMerge(targetValue, sourceValue);
      } else {
        result[key] = sourceValue;
      }
    }
  }
  
  return result;
}

/**
 * Pick specific properties from an object
 */
export function pick<T, K extends keyof T>(obj: T, keys: K[]): Pick<T, K> {
  const result = {} as Pick<T, K>;
  
  keys.forEach(key => {
    if (key in obj) {
      result[key] = obj[key];
    }
  });
  
  return result;
}

/**
 * Omit specific properties from an object
 */
export function omit<T, K extends keyof T>(obj: T, keys: K[]): Omit<T, K> {
  const result = { ...obj };
  
  keys.forEach(key => {
    delete result[key];
  });
  
  return result;
}

/**
 * Rename object keys
 */
export function renameKeys<T extends Record<string, any>>(
  obj: T,
  keyMap: Record<string, string>
): Record<string, any> {
  const result: Record<string, any> = {};
  
  Object.entries(obj).forEach(([key, value]) => {
    const newKey = keyMap[key] || key;
    result[newKey] = value;
  });
  
  return result;
}

/**
 * Array transformation utilities
 */

/**
 * Group array items by a key
 */
export function groupBy<T, K extends keyof T>(
  array: T[],
  key: K
): Record<string, T[]> {
  return array.reduce((groups, item) => {
    const groupKey = String(item[key]);
    groups[groupKey] = groups[groupKey] || [];
    groups[groupKey].push(item);
    return groups;
  }, {} as Record<string, T[]>);
}

/**
 * Create a map from array using a key function
 */
export function mapBy<T, K>(
  array: T[],
  keyFn: (item: T) => K
): Map<K, T> {
  const map = new Map<K, T>();
  array.forEach(item => {
    map.set(keyFn(item), item);
  });
  return map;
}

/**
 * Remove duplicates from array
 */
export function unique<T>(array: T[], keyFn?: (item: T) => any): T[] {
  if (!keyFn) {
    return [...new Set(array)];
  }
  
  const seen = new Set();
  return array.filter(item => {
    const key = keyFn(item);
    if (seen.has(key)) {
      return false;
    }
    seen.add(key);
    return true;
  });
}

/**
 * Chunk array into smaller arrays
 */
export function chunk<T>(array: T[], size: number): T[][] {
  const chunks: T[][] = [];
  
  for (let i = 0; i < array.length; i += size) {
    chunks.push(array.slice(i, i + size));
  }
  
  return chunks;
}

/**
 * Flatten nested arrays
 */
export function flatten<T>(array: (T | T[])[]): T[] {
  return array.reduce<T[]>((acc, val) => {
    return acc.concat(Array.isArray(val) ? flatten(val) : val);
  }, []);
}

/**
 * Data format conversions
 */

/**
 * Convert camelCase to snake_case
 */
export function camelToSnake(str: string): string {
  return str.replace(/([A-Z])/g, '_$1').toLowerCase().replace(/^_/, '');
}

/**
 * Convert snake_case to camelCase
 */
export function snakeToCamel(str: string): string {
  return str.replace(/_([a-z])/g, (_, letter) => letter.toUpperCase());
}

/**
 * Convert object keys from camelCase to snake_case
 */
export function keysToSnakeCase<T extends Record<string, any>>(
  obj: T
): Record<string, any> {
  if (Array.isArray(obj)) {
    return obj.map(keysToSnakeCase);
  }
  
  if (obj === null || typeof obj !== 'object') {
    return obj;
  }
  
  const result: Record<string, any> = {};
  
  Object.entries(obj).forEach(([key, value]) => {
    const snakeKey = camelToSnake(key);
    result[snakeKey] = keysToSnakeCase(value);
  });
  
  return result;
}

/**
 * Convert object keys from snake_case to camelCase
 */
export function keysToCamelCase<T extends Record<string, any>>(
  obj: T
): Record<string, any> {
  if (Array.isArray(obj)) {
    return obj.map(keysToCamelCase);
  }
  
  if (obj === null || typeof obj !== 'object') {
    return obj;
  }
  
  const result: Record<string, any> = {};
  
  Object.entries(obj).forEach(([key, value]) => {
    const camelKey = snakeToCamel(key);
    result[camelKey] = keysToCamelCase(value);
  });
  
  return result;
}

/**
 * Serialization utilities
 */

/**
 * Safely stringify JSON with BigInt support
 */
export function safeStringify(obj: any, space?: number): string {
  return JSON.stringify(obj, (key, value) => {
    if (typeof value === 'bigint') {
      return value.toString();
    }
    if (value instanceof Date) {
      return value.toISOString();
    }
    if (value instanceof RegExp) {
      return value.toString();
    }
    if (typeof value === 'function') {
      return '[Function]';
    }
    if (typeof value === 'undefined') {
      return null;
    }
    return value;
  }, space);
}

/**
 * Safely parse JSON with error handling
 */
export function safeParse<T = any>(str: string, fallback: T): T {
  try {
    return JSON.parse(str);
  } catch {
    return fallback;
  }
}

/**
 * Database transformation utilities
 */

/**
 * Transform database row to domain object
 */
export function transformFromDB<T>(
  row: Record<string, any>,
  transformer?: (row: Record<string, any>) => T
): T {
  if (transformer) {
    return transformer(row);
  }
  
  // Default transformation: snake_case to camelCase
  return keysToCamelCase(row) as T;
}

/**
 * Transform domain object to database row
 */
export function transformToDB<T extends Record<string, any>>(
  obj: T,
  transformer?: (obj: T) => Record<string, any>
): Record<string, any> {
  if (transformer) {
    return transformer(obj);
  }
  
  // Default transformation: camelCase to snake_case
  return keysToSnakeCase(obj);
}

/**
 * API transformation utilities
 */

/**
 * Transform internal object to API response format
 */
export function transformToAPI<T>(
  obj: T,
  options: {
    exclude?: string[];
    include?: string[];
    rename?: Record<string, string>;
    transform?: Record<string, (value: any) => any>;
  } = {}
): any {
  const { exclude = [], include, rename = {}, transform = {} } = options;
  
  let result: any;
  
  if (include) {
    result = pick(obj as any, include);
  } else {
    result = omit(obj as any, exclude);
  }
  
  // Apply transformations
  Object.entries(transform).forEach(([key, transformFn]) => {
    if (key in result) {
      result[key] = transformFn(result[key]);
    }
  });
  
  // Rename keys
  result = renameKeys(result, rename);
  
  return result;
}

/**
 * Form data utilities
 */

/**
 * Convert FormData to object
 */
export function formDataToObject(formData: FormData): Record<string, any> {
  const result: Record<string, any> = {};
  
  formData.forEach((value, key) => {
    if (key in result) {
      // Handle multiple values
      if (Array.isArray(result[key])) {
        result[key].push(value);
      } else {
        result[key] = [result[key], value];
      }
    } else {
      result[key] = value;
    }
  });
  
  return result;
}

/**
 * Convert object to FormData
 */
export function objectToFormData<T extends Record<string, any>>(
  obj: T
): FormData {
  const formData = new FormData();
  
  Object.entries(obj).forEach(([key, value]) => {
    if (Array.isArray(value)) {
      value.forEach(item => formData.append(key, String(item)));
    } else if (value instanceof File || value instanceof Blob) {
      formData.append(key, value);
    } else if (value !== null && value !== undefined) {
      formData.append(key, String(value));
    }
  });
  
  return formData;
}

/**
 * URL search params utilities
 */

/**
 * Convert object to URLSearchParams
 */
export function objectToSearchParams(
  obj: Record<string, any>
): URLSearchParams {
  const params = new URLSearchParams();
  
  Object.entries(obj).forEach(([key, value]) => {
    if (Array.isArray(value)) {
      value.forEach(item => params.append(key, String(item)));
    } else if (value !== null && value !== undefined) {
      params.append(key, String(value));
    }
  });
  
  return params;
}

/**
 * Convert URLSearchParams to object
 */
export function searchParamsToObject(
  params: URLSearchParams
): Record<string, string | string[]> {
  const result: Record<string, string | string[]> = {};
  
  params.forEach((value, key) => {
    if (key in result) {
      const existing = result[key];
      if (Array.isArray(existing)) {
        existing.push(value);
      } else {
        result[key] = [existing, value];
      }
    } else {
      result[key] = value;
    }
  });
  
  return result;
}

/**
 * Utility functions
 */

function isObject(value: any): value is Record<string, any> {
  return value !== null && typeof value === 'object' && !Array.isArray(value);
}

/**
 * Create transformer function
 */
export function createTransformer<TInput, TOutput>(
  transformFn: (input: TInput) => TOutput
): (input: TInput) => TransformedData<TOutput> {
  return (input: TInput) => transformFn(input) as TransformedData<TOutput>;
}

/**
 * Pipe multiple transformers
 */
export function pipe<T>(
  value: T,
  ...transformers: Array<(input: any) => any>
): any {
  return transformers.reduce((acc, transformer) => transformer(acc), value);
}

/**
 * Compose multiple transformers (right to left)
 */
export function compose<T>(
  ...transformers: Array<(input: any) => any>
): (input: T) => any {
  return (input: T) => {
    return transformers.reduceRight((acc, transformer) => transformer(acc), input);
  };
}
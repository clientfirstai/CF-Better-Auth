/**
 * Common utility types shared across the CF-Better-Auth ecosystem
 */

/**
 * Make all properties in T optional deeply
 */
export type DeepPartial<T> = {
  [P in keyof T]?: T[P] extends object ? DeepPartial<T[P]> : T[P];
};

/**
 * Make all properties in T required deeply
 */
export type DeepRequired<T> = {
  [P in keyof T]-?: T[P] extends object ? DeepRequired<T[P]> : T[P];
};

/**
 * Require at least one of the specified keys
 */
export type RequireAtLeastOne<T, Keys extends keyof T = keyof T> = 
  Pick<T, Exclude<keyof T, Keys>> & 
  { [K in Keys]-?: Required<Pick<T, K>> & Partial<Pick<T, Exclude<Keys, K>>> }[Keys];

/**
 * Require exactly one of the specified keys
 */
export type RequireExactlyOne<T, Keys extends keyof T = keyof T> =
  Pick<T, Exclude<keyof T, Keys>> &
  { [K in Keys]: Required<Pick<T, K>> & Partial<Record<Exclude<Keys, K>, undefined>> }[Keys];

/**
 * Make specified properties optional
 */
export type PartialBy<T, K extends keyof T> = Omit<T, K> & Partial<Pick<T, K>>;

/**
 * Make specified properties required
 */
export type RequiredBy<T, K extends keyof T> = Omit<T, K> & Required<Pick<T, K>>;

/**
 * Omit the 'id' field from a type
 */
export type OmitId<T> = Omit<T, 'id'>;

/**
 * Add an 'id' field to a type
 */
export type WithId<T> = T & { id: string };

/**
 * Make timestamps optional (for creation operations)
 */
export type OmitTimestamps<T> = Omit<T, 'createdAt' | 'updatedAt'>;

/**
 * Add timestamps to a type
 */
export type WithTimestamps<T> = T & {
  createdAt: Date;
  updatedAt: Date;
};

/**
 * Create type with optional timestamps (for updates)
 */
export type WithOptionalTimestamps<T> = T & {
  createdAt?: Date;
  updatedAt?: Date;
};

/**
 * Create a type with all string values (useful for environment variables)
 */
export type StringifyValues<T> = {
  [K in keyof T]: string;
};

/**
 * Extract the value type of an object or array
 */
export type ValueOf<T> = T[keyof T];

/**
 * Extract array element type
 */
export type ArrayElement<ArrayType extends readonly unknown[]> = ArrayType extends readonly (infer ElementType)[] ? ElementType : never;

/**
 * Branded type for type safety
 */
export type Brand<T, B> = T & { __brand: B };

/**
 * Nominal type for stronger type safety
 */
export type Nominal<T, N extends string> = T & { readonly __nominal: N };

/**
 * JSON serializable types
 */
export type JsonPrimitive = string | number | boolean | null;
export type JsonValue = JsonPrimitive | JsonObject | JsonArray;
export type JsonObject = { [key: string]: JsonValue };
export type JsonArray = JsonValue[];

/**
 * Utility for creating extensible enums
 */
export type Expand<T> = T extends infer O ? { [K in keyof O]: O[K] } : never;

/**
 * Utility for creating conditional types based on never
 */
export type IsNever<T> = [T] extends [never] ? true : false;

/**
 * Utility for creating exclusive or types
 */
export type XOR<T, U> = T | U extends object ? (T & Partial<Record<Exclude<keyof U, keyof T>, never>>) | (U & Partial<Record<Exclude<keyof T, keyof U>, never>>) : T | U;

/**
 * Utility for creating mutable versions of readonly types
 */
export type Mutable<T> = {
  -readonly [P in keyof T]: T[P];
};

/**
 * Utility for creating immutable versions of types
 */
export type Immutable<T> = {
  readonly [P in keyof T]: T[P] extends object ? Immutable<T[P]> : T[P];
};

/**
 * Utility for creating optional keys from an object
 */
export type OptionalKeys<T> = {
  [K in keyof T]-?: {} extends Pick<T, K> ? K : never;
}[keyof T];

/**
 * Utility for creating required keys from an object
 */
export type RequiredKeys<T> = {
  [K in keyof T]-?: {} extends Pick<T, K> ? never : K;
}[keyof T];

/**
 * Utility for creating a type with only optional properties
 */
export type OptionalProperties<T> = Pick<T, OptionalKeys<T>>;

/**
 * Utility for creating a type with only required properties
 */
export type RequiredProperties<T> = Pick<T, RequiredKeys<T>>;

/**
 * Utility for function types
 */
export type AnyFunction = (...args: any[]) => any;
export type VoidFunction = (...args: any[]) => void;
export type AsyncFunction = (...args: any[]) => Promise<any>;

/**
 * Utility for promise types
 */
export type Awaited<T> = T extends PromiseLike<infer U> ? U : T;

/**
 * Common status enums
 */
export type Status = 'active' | 'inactive' | 'pending' | 'suspended' | 'deleted';

/**
 * Common environment types
 */
export type Environment = 'development' | 'staging' | 'production' | 'test';

/**
 * Common log levels
 */
export type LogLevel = 'error' | 'warn' | 'info' | 'debug' | 'trace';

/**
 * Common sort orders
 */
export type SortOrder = 'asc' | 'desc';

/**
 * Generic pagination parameters
 */
export interface PaginationParams {
  page?: number;
  limit?: number;
  offset?: number;
}

/**
 * Generic pagination response
 */
export interface PaginatedResponse<T> {
  data: T[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
    hasNext: boolean;
    hasPrev: boolean;
  };
}

/**
 * Generic sort parameters
 */
export interface SortParams<T = string> {
  sortBy?: T;
  sortOrder?: SortOrder;
}

/**
 * Generic filter parameters
 */
export interface FilterParams {
  [key: string]: any;
}

/**
 * Generic search parameters
 */
export interface SearchParams extends PaginationParams, SortParams {
  query?: string;
  filters?: FilterParams;
}

/**
 * Generic API response wrapper
 */
export interface ApiResponse<T = any> {
  success: boolean;
  data?: T;
  error?: {
    code: string;
    message: string;
    details?: any;
  };
  meta?: {
    timestamp: string;
    requestId?: string;
    version?: string;
  };
}

/**
 * Generic configuration object
 */
export interface ConfigObject {
  [key: string]: any;
}

/**
 * Generic callback function
 */
export type Callback<T = any> = (error?: Error | null, result?: T) => void;

/**
 * Generic event handler
 */
export type EventHandler<T = any> = (event: T) => void | Promise<void>;

/**
 * Generic middleware function
 */
export type Middleware<T = any, R = any> = (input: T, next: () => Promise<R>) => Promise<R>;

/**
 * Generic factory function
 */
export type Factory<T, Args extends any[] = []> = (...args: Args) => T;

/**
 * Generic builder pattern
 */
export interface Builder<T> {
  build(): T;
}

/**
 * Generic disposable resource
 */
export interface Disposable {
  dispose(): void | Promise<void>;
}
import type { BetterAuthInstance } from '@cf-auth/types';

export interface Middleware {
  name: string;
  priority?: number;
  handler: (context: any, next: () => Promise<any>) => Promise<any>;
}

export class MiddlewareManager {
  private middlewares: Middleware[] = [];

  register(middleware: Middleware): void {
    this.middlewares.push(middleware);
    this.middlewares.sort((a, b) => (a.priority || 0) - (b.priority || 0));
  }

  applyMiddleware(instance: BetterAuthInstance): void {
    if (!instance.use || typeof instance.use !== 'function') {
      console.warn('BetterAuth instance does not support middleware');
      return;
    }

    for (const middleware of this.middlewares) {
      instance.use(middleware.handler);
    }
  }

  remove(name: string): void {
    this.middlewares = this.middlewares.filter(m => m.name !== name);
  }

  clear(): void {
    this.middlewares = [];
  }

  getMiddlewares(): Middleware[] {
    return [...this.middlewares];
  }
}

export const createLoggingMiddleware = (): Middleware => ({
  name: 'logging',
  priority: 0,
  handler: async (context, next) => {
    const start = Date.now();
    const result = await next();
    const duration = Date.now() - start;
    console.log(`[Auth] ${context.method} ${context.path} - ${duration}ms`);
    return result;
  }
});

export const createRateLimitMiddleware = (
  windowMs: number = 60000,
  maxRequests: number = 10
): Middleware => {
  const requests = new Map<string, { count: number; resetTime: number }>();

  return {
    name: 'rateLimit',
    priority: 1,
    handler: async (context, next) => {
      const key = context.ip || context.userId || 'anonymous';
      const now = Date.now();
      const record = requests.get(key);

      if (!record || record.resetTime < now) {
        requests.set(key, { count: 1, resetTime: now + windowMs });
      } else if (record.count >= maxRequests) {
        throw new Error('Rate limit exceeded');
      } else {
        record.count++;
      }

      return next();
    }
  };
};

export const createCorsMiddleware = (options: {
  origins?: string[];
  credentials?: boolean;
} = {}): Middleware => ({
  name: 'cors',
  priority: -1,
  handler: async (context, next) => {
    const origin = context.headers?.origin;
    const allowedOrigins = options.origins || ['*'];

    if (allowedOrigins.includes('*') || allowedOrigins.includes(origin)) {
      context.headers['Access-Control-Allow-Origin'] = origin || '*';
      context.headers['Access-Control-Allow-Credentials'] = options.credentials ? 'true' : 'false';
      context.headers['Access-Control-Allow-Methods'] = 'GET, POST, PUT, DELETE, OPTIONS';
      context.headers['Access-Control-Allow-Headers'] = 'Content-Type, Authorization';
    }

    if (context.method === 'OPTIONS') {
      return { status: 204 };
    }

    return next();
  }
});
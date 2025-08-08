/**
 * MiddlewareStack - Manages middleware pipeline for request/response processing
 */

export interface Middleware {
  name: string;
  priority?: number;
  enabled?: boolean;
  before?: (context: any) => Promise<any> | any;
  after?: (context: any) => Promise<any> | any;
}

export class MiddlewareStack {
  private middlewares: Middleware[] = [];
  private initialized: boolean = false;

  /**
   * Add middleware to the stack
   */
  add(middleware: Middleware): void {
    this.middlewares.push(middleware);
    this.sortMiddlewares();
  }

  /**
   * Remove middleware from the stack
   */
  remove(name: string): void {
    this.middlewares = this.middlewares.filter(m => m.name !== name);
  }

  /**
   * Sort middlewares by priority
   */
  private sortMiddlewares(): void {
    this.middlewares.sort((a, b) => (a.priority || 0) - (b.priority || 0));
  }

  /**
   * Initialize the middleware stack
   */
  async initialize(): Promise<void> {
    // Add default middlewares
    this.addDefaultMiddlewares();
    this.initialized = true;
  }

  /**
   * Add default middlewares
   */
  private addDefaultMiddlewares(): void {
    // CORS middleware
    this.add({
      name: 'cors',
      priority: 1,
      before: async (context) => {
        if (context.headers) {
          context.headers['Access-Control-Allow-Origin'] = '*';
          context.headers['Access-Control-Allow-Methods'] = 'GET, POST, PUT, DELETE, OPTIONS';
          context.headers['Access-Control-Allow-Headers'] = 'Content-Type, Authorization';
        }
        return context;
      },
    });

    // Security headers middleware
    this.add({
      name: 'security-headers',
      priority: 2,
      before: async (context) => {
        if (context.headers) {
          context.headers['X-Content-Type-Options'] = 'nosniff';
          context.headers['X-Frame-Options'] = 'DENY';
          context.headers['X-XSS-Protection'] = '1; mode=block';
          context.headers['Strict-Transport-Security'] = 'max-age=31536000; includeSubDomains';
        }
        return context;
      },
    });

    // Request logging middleware
    this.add({
      name: 'request-logger',
      priority: 10,
      before: async (context) => {
        console.log(`[${new Date().toISOString()}] ${context.method} ${context.path}`);
        return context;
      },
    });

    // Error handling middleware
    this.add({
      name: 'error-handler',
      priority: 100,
      after: async (context) => {
        if (context.error) {
          console.error('Error in request processing:', context.error);
          return {
            ...context,
            status: context.status || 500,
            body: {
              error: 'Internal server error',
              message: context.error.message,
            },
          };
        }
        return context;
      },
    });
  }

  /**
   * Process configuration through middleware
   */
  async processConfig(config: any): Promise<any> {
    let processedConfig = config;

    for (const middleware of this.middlewares) {
      if (middleware.enabled !== false && middleware.before) {
        processedConfig = await middleware.before({ type: 'config', data: processedConfig });
        processedConfig = processedConfig.data || processedConfig;
      }
    }

    return processedConfig;
  }

  /**
   * Process request through middleware
   */
  async processRequest(request: Request): Promise<Request> {
    let context: any = {
      type: 'request',
      method: request.method,
      path: new URL(request.url).pathname,
      headers: Object.fromEntries(request.headers.entries()),
      body: request.body,
      request,
    };

    // Run before middlewares
    for (const middleware of this.middlewares) {
      if (middleware.enabled !== false && middleware.before) {
        context = await middleware.before(context);
      }
    }

    // Create modified request if needed
    if (context.headers || context.body) {
      const modifiedRequest = new Request(request.url, {
        method: request.method,
        headers: context.headers || request.headers,
        body: context.body || request.body,
      });
      return modifiedRequest;
    }

    return request;
  }

  /**
   * Process response through middleware
   */
  async processResponse(response: Response): Promise<Response> {
    let context: any = {
      type: 'response',
      status: response.status,
      headers: Object.fromEntries(response.headers.entries()),
      response,
    };

    // Run after middlewares (in reverse order)
    for (let i = this.middlewares.length - 1; i >= 0; i--) {
      const middleware = this.middlewares[i];
      if (middleware.enabled !== false && middleware.after) {
        context = await middleware.after(context);
      }
    }

    // Create modified response if needed
    if (context.headers || context.body) {
      const modifiedResponse = new Response(
        context.body || response.body,
        {
          status: context.status || response.status,
          headers: context.headers || response.headers,
        }
      );
      return modifiedResponse;
    }

    return response;
  }

  /**
   * Post-initialization processing
   */
  async postInitialize(authInstance: any): Promise<void> {
    // Apply any post-initialization middleware
    for (const middleware of this.middlewares) {
      if (middleware.enabled !== false && middleware.after) {
        await middleware.after({ type: 'post-init', instance: authInstance });
      }
    }
  }

  /**
   * Clean up middleware resources
   */
  async cleanup(): Promise<void> {
    // Clean up any middleware resources
    for (const middleware of this.middlewares) {
      if (middleware.after) {
        await middleware.after({ type: 'cleanup' });
      }
    }
    this.middlewares = [];
    this.initialized = false;
  }

  /**
   * Enable or disable a middleware
   */
  setEnabled(name: string, enabled: boolean): void {
    const middleware = this.middlewares.find(m => m.name === name);
    if (middleware) {
      middleware.enabled = enabled;
    }
  }

  /**
   * Get all middlewares
   */
  getMiddlewares(): Middleware[] {
    return [...this.middlewares];
  }
}
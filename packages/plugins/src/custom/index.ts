import type { Plugin } from '../plugin-adapter';
import type { BetterAuthInstance } from '@cf-auth/types';

export interface CustomPluginConfig {
  name: string;
  version?: string;
  dependencies?: string[];
  hooks?: {
    beforeSignIn?: (data: any) => Promise<any>;
    afterSignIn?: (user: any, session: any) => Promise<void>;
    beforeSignUp?: (data: any) => Promise<any>;
    afterSignUp?: (user: any) => Promise<void>;
    beforeSignOut?: (session: any) => Promise<void>;
    afterSignOut?: () => Promise<void>;
  };
  middleware?: (context: any, next: () => Promise<any>) => Promise<any>;
  routes?: Array<{
    method: string;
    path: string;
    handler: (req: any, res: any) => Promise<any>;
  }>;
}

export function createCustomPlugin(config: CustomPluginConfig): Plugin {
  return {
    name: config.name,
    version: config.version,
    dependencies: config.dependencies,
    init: async (auth: BetterAuthInstance) => {
      if (config.hooks) {
        registerHooks(auth, config.hooks);
      }
      
      if (config.middleware && auth.use) {
        auth.use(config.middleware);
      }
      
      if (config.routes && auth.registerRoutes) {
        for (const route of config.routes) {
          auth.registerRoutes(route);
        }
      }
    }
  };
}

function registerHooks(auth: BetterAuthInstance, hooks: CustomPluginConfig['hooks']): void {
  if (!auth.on) {
    console.warn('BetterAuth instance does not support hooks');
    return;
  }
  
  if (hooks?.beforeSignIn) {
    auth.on('beforeSignIn', hooks.beforeSignIn);
  }
  
  if (hooks?.afterSignIn) {
    auth.on('afterSignIn', hooks.afterSignIn);
  }
  
  if (hooks?.beforeSignUp) {
    auth.on('beforeSignUp', hooks.beforeSignUp);
  }
  
  if (hooks?.afterSignUp) {
    auth.on('afterSignUp', hooks.afterSignUp);
  }
  
  if (hooks?.beforeSignOut) {
    auth.on('beforeSignOut', hooks.beforeSignOut);
  }
  
  if (hooks?.afterSignOut) {
    auth.on('afterSignOut', hooks.afterSignOut);
  }
}

export function createAuditLogPlugin(): Plugin {
  return createCustomPlugin({
    name: 'audit-log',
    version: '1.0.0',
    hooks: {
      afterSignIn: async (user, session) => {
        console.log(`[AUDIT] User ${user.id} signed in at ${new Date().toISOString()}`);
      },
      afterSignUp: async (user) => {
        console.log(`[AUDIT] New user ${user.id} registered at ${new Date().toISOString()}`);
      },
      afterSignOut: async () => {
        console.log(`[AUDIT] User signed out at ${new Date().toISOString()}`);
      }
    }
  });
}

export function createIPWhitelistPlugin(allowedIPs: string[]): Plugin {
  return createCustomPlugin({
    name: 'ip-whitelist',
    version: '1.0.0',
    middleware: async (context, next) => {
      const clientIP = context.ip || context.headers?.['x-forwarded-for'] || 'unknown';
      
      if (!allowedIPs.includes(clientIP) && clientIP !== 'unknown') {
        throw new Error('Access denied: IP not whitelisted');
      }
      
      return next();
    }
  });
}

export function createPasswordPolicyPlugin(options: {
  minLength?: number;
  requireUppercase?: boolean;
  requireLowercase?: boolean;
  requireNumbers?: boolean;
  requireSpecialChars?: boolean;
}): Plugin {
  return createCustomPlugin({
    name: 'password-policy',
    version: '1.0.0',
    hooks: {
      beforeSignUp: async (data) => {
        const password = data.password;
        if (!password) return data;
        
        if (options.minLength && password.length < options.minLength) {
          throw new Error(`Password must be at least ${options.minLength} characters`);
        }
        
        if (options.requireUppercase && !/[A-Z]/.test(password)) {
          throw new Error('Password must contain at least one uppercase letter');
        }
        
        if (options.requireLowercase && !/[a-z]/.test(password)) {
          throw new Error('Password must contain at least one lowercase letter');
        }
        
        if (options.requireNumbers && !/\d/.test(password)) {
          throw new Error('Password must contain at least one number');
        }
        
        if (options.requireSpecialChars && !/[!@#$%^&*(),.?":{}|<>]/.test(password)) {
          throw new Error('Password must contain at least one special character');
        }
        
        return data;
      }
    }
  });
}
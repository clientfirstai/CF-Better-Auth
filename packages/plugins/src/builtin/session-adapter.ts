import type { Plugin, PluginAdapter } from '../plugin-adapter';
import type { BetterAuthInstance } from '@cf-auth/types';

export interface SessionConfig {
  maxSessions?: number;
  sessionTimeout?: number;
  idleTimeout?: number;
  rememberMeDuration?: number;
  rotateRefreshToken?: boolean;
  deviceTracking?: boolean;
}

export const sessionAdapter: PluginAdapter = {
  name: 'session',
  
  fromBetterAuth: (betterAuthPlugin: any): Plugin => {
    return {
      name: 'session',
      init: async (auth: BetterAuthInstance) => {
        if (typeof betterAuthPlugin === 'function') {
          const instance = betterAuthPlugin(auth);
          if (auth.use) {
            auth.use(instance);
          }
        } else {
          if (auth.use) {
            auth.use(betterAuthPlugin);
          }
        }
      }
    };
  },
  
  toBetterAuth: (plugin: Plugin): any => {
    return plugin.config || {};
  }
};

export function createSessionPlugin(config: SessionConfig): Plugin {
  const activeSessions = new Map<string, Set<string>>();
  const sessionActivity = new Map<string, number>();
  
  return {
    name: 'session',
    config,
    init: async (auth: BetterAuthInstance) => {
      const sessionHandlers = {
        createSession: async (userId: string, options?: any) => {
          const sessionId = generateSessionId();
          const userSessions = activeSessions.get(userId) || new Set();
          
          if (config.maxSessions && userSessions.size >= config.maxSessions) {
            const oldestSession = Array.from(userSessions)[0];
            await sessionHandlers.revokeSession(oldestSession);
          }
          
          userSessions.add(sessionId);
          activeSessions.set(userId, userSessions);
          sessionActivity.set(sessionId, Date.now());
          
          const expiresAt = calculateExpiry(options?.rememberMe, config);
          
          return {
            sessionId,
            userId,
            expiresAt,
            createdAt: new Date(),
            device: options?.device
          };
        },
        
        validateSession: async (sessionId: string) => {
          const lastActivity = sessionActivity.get(sessionId);
          if (!lastActivity) {
            return { valid: false, reason: 'Session not found' };
          }
          
          if (config.idleTimeout) {
            const idleTime = Date.now() - lastActivity;
            if (idleTime > config.idleTimeout) {
              await sessionHandlers.revokeSession(sessionId);
              return { valid: false, reason: 'Session expired due to inactivity' };
            }
          }
          
          sessionActivity.set(sessionId, Date.now());
          return { valid: true };
        },
        
        revokeSession: async (sessionId: string) => {
          sessionActivity.delete(sessionId);
          
          for (const [userId, sessions] of activeSessions) {
            if (sessions.has(sessionId)) {
              sessions.delete(sessionId);
              if (sessions.size === 0) {
                activeSessions.delete(userId);
              }
              break;
            }
          }
          
          return { revoked: true };
        },
        
        revokeAllSessions: async (userId: string) => {
          const sessions = activeSessions.get(userId);
          if (sessions) {
            for (const sessionId of sessions) {
              sessionActivity.delete(sessionId);
            }
            activeSessions.delete(userId);
          }
          
          return { revokedCount: sessions?.size || 0 };
        },
        
        getUserSessions: async (userId: string) => {
          const sessions = activeSessions.get(userId);
          if (!sessions) return [];
          
          return Array.from(sessions).map(sessionId => ({
            sessionId,
            lastActivity: sessionActivity.get(sessionId) || 0
          }));
        },
        
        refreshSession: async (sessionId: string) => {
          if (!config.rotateRefreshToken) {
            sessionActivity.set(sessionId, Date.now());
            return { sessionId };
          }
          
          const userId = findUserBySession(sessionId, activeSessions);
          if (!userId) {
            throw new Error('Session not found');
          }
          
          await sessionHandlers.revokeSession(sessionId);
          return sessionHandlers.createSession(userId);
        }
      };
      
      if (auth.registerSessionHandlers) {
        auth.registerSessionHandlers(sessionHandlers);
      }
      
      if (auth.use) {
        auth.use(createSessionMiddleware(sessionHandlers));
      }
    }
  };
}

function generateSessionId(): string {
  return Date.now().toString(36) + Math.random().toString(36).substring(2);
}

function calculateExpiry(rememberMe: boolean, config: SessionConfig): Date {
  const duration = rememberMe && config.rememberMeDuration
    ? config.rememberMeDuration
    : config.sessionTimeout || 60 * 60 * 24 * 7 * 1000;
  
  return new Date(Date.now() + duration);
}

function findUserBySession(
  sessionId: string,
  activeSessions: Map<string, Set<string>>
): string | null {
  for (const [userId, sessions] of activeSessions) {
    if (sessions.has(sessionId)) {
      return userId;
    }
  }
  return null;
}

function createSessionMiddleware(handlers: any) {
  return async (context: any, next: () => Promise<any>) => {
    const sessionId = extractSessionId(context);
    
    if (sessionId) {
      const validation = await handlers.validateSession(sessionId);
      if (!validation.valid) {
        context.session = null;
        context.sessionError = validation.reason;
      } else {
        context.session = { id: sessionId };
      }
    }
    
    return next();
  };
}

function extractSessionId(context: any): string | null {
  if (context.headers?.authorization) {
    const [type, token] = context.headers.authorization.split(' ');
    if (type === 'Bearer') {
      return token;
    }
  }
  
  if (context.cookies?.['session-id']) {
    return context.cookies['session-id'];
  }
  
  return null;
}
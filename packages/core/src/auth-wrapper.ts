import { BetterAuthAdapter, AdapterEvents } from './adapter';
import type { 
  BetterAuthOptions, 
  BetterAuthInstance, 
  CFAuthInstance,
  SignInResponse,
  SignUpResponse,
  User,
  Session
} from '@cf-auth/types';
import { ExtensionManager } from './extensions';
import { MiddlewareManager } from './middleware';
import { createError, getErrorMessage } from '@cf-auth/utils';

export interface CFAuthEvents extends AdapterEvents {
  signIn: (user: User, session: Session) => void;
  signUp: (user: User, session?: Session) => void;
  signOut: (sessionId?: string) => void;
  sessionRefresh: (session: Session) => void;
}

export class CFBetterAuth implements CFAuthInstance {
  private adapter: BetterAuthAdapter;
  private extensionManager: ExtensionManager;
  private middlewareManager: MiddlewareManager;
  private initialized = false;
  private eventListeners: Map<keyof CFAuthEvents, Function[]> = new Map();

  constructor(config?: Partial<BetterAuthOptions>) {
    this.adapter = new BetterAuthAdapter(config);
    this.extensionManager = new ExtensionManager();
    this.middlewareManager = new MiddlewareManager();

    // Forward adapter events
    this.adapter.on('initialized', () => this.emit('initialized'));
    this.adapter.on('error', (error) => this.emit('error', error));
    this.adapter.on('upgrade', (from, to) => this.emit('upgrade', from, to));
  }

  async initialize(): Promise<void> {
    if (this.initialized) return;
    
    try {
      await this.adapter.initialize();
      const instance = this.adapter.getInstance();
      
      this.extensionManager.applyExtensions(instance);
      this.middlewareManager.applyMiddleware(instance);
      
      this.initialized = true;
    } catch (error) {
      const wrappedError = createError(
        `Failed to initialize CFBetterAuth: ${getErrorMessage(error)}`,
        'CF_AUTH_INIT_FAILED'
      );
      this.emit('error', wrappedError);
      throw wrappedError;
    }
  }

  get auth(): BetterAuthInstance {
    if (!this.initialized) {
      throw createError('CFBetterAuth not initialized. Call initialize() first.', 'NOT_INITIALIZED');
    }
    return this.adapter.getInstance();
  }

  getInstance(): BetterAuthInstance {
    return this.auth;
  }

  async signIn(credentials: any): Promise<SignInResponse> {
    await this.ensureInitialized();
    
    try {
      const result = await this.auth.signIn(credentials);
      
      // Emit event if successful
      if (result.user && result.session) {
        this.emit('signIn', result.user, result.session);
      }
      
      return result;
    } catch (error) {
      throw createError(
        `Sign in failed: ${getErrorMessage(error)}`,
        'SIGN_IN_FAILED'
      );
    }
  }

  async signUp(data: any): Promise<SignUpResponse> {
    await this.ensureInitialized();
    
    try {
      const result = await this.auth.signUp(data);
      
      // Emit event if successful
      if (result.user) {
        this.emit('signUp', result.user, result.session);
      }
      
      return result;
    } catch (error) {
      throw createError(
        `Sign up failed: ${getErrorMessage(error)}`,
        'SIGN_UP_FAILED'
      );
    }
  }

  async signOut(sessionId?: string): Promise<void> {
    await this.ensureInitialized();
    
    try {
      await this.auth.signOut(sessionId);
      this.emit('signOut', sessionId);
    } catch (error) {
      throw createError(
        `Sign out failed: ${getErrorMessage(error)}`,
        'SIGN_OUT_FAILED'
      );
    }
  }

  async getSession(sessionId: string): Promise<any> {
    await this.ensureInitialized();
    
    try {
      return await this.auth.getSession(sessionId);
    } catch (error) {
      throw createError(
        `Failed to get session: ${getErrorMessage(error)}`,
        'GET_SESSION_FAILED'
      );
    }
  }

  async validateSession(sessionId: string): Promise<boolean> {
    try {
      const session = await this.getSession(sessionId);
      return !!session && !this.isSessionExpired(session);
    } catch {
      return false;
    }
  }

  async refreshSession(sessionId: string): Promise<Session> {
    await this.ensureInitialized();
    
    try {
      // Try to use built-in refresh method if available
      if (this.auth.refreshSession) {
        const session = await this.auth.refreshSession(sessionId);
        this.emit('sessionRefresh', session);
        return session;
      }
      
      // Fallback: get session and check if refresh is needed
      const session = await this.getSession(sessionId);
      if (!session) {
        throw createError('Session not found', 'SESSION_NOT_FOUND');
      }
      
      return session;
    } catch (error) {
      throw createError(
        `Failed to refresh session: ${getErrorMessage(error)}`,
        'SESSION_REFRESH_FAILED'
      );
    }
  }

  async createSession(userId: string, data?: Record<string, any>): Promise<Session> {
    await this.ensureInitialized();
    
    try {
      if (this.auth.createSession) {
        return await this.auth.createSession(userId, data);
      }
      
      throw createError('Session creation not supported by underlying auth instance', 'UNSUPPORTED_OPERATION');
    } catch (error) {
      throw createError(
        `Failed to create session: ${getErrorMessage(error)}`,
        'CREATE_SESSION_FAILED'
      );
    }
  }

  async revokeSession(sessionId: string): Promise<void> {
    await this.ensureInitialized();
    
    try {
      if (this.auth.revokeSession) {
        await this.auth.revokeSession(sessionId);
      } else {
        // Fallback to signOut
        await this.signOut(sessionId);
      }
    } catch (error) {
      throw createError(
        `Failed to revoke session: ${getErrorMessage(error)}`,
        'REVOKE_SESSION_FAILED'
      );
    }
  }

  async getAllSessions(userId: string): Promise<Session[]> {
    await this.ensureInitialized();
    
    try {
      if (this.auth.getAllSessions) {
        return await this.auth.getAllSessions(userId);
      }
      
      throw createError('Multi-session support not available', 'UNSUPPORTED_OPERATION');
    } catch (error) {
      throw createError(
        `Failed to get all sessions: ${getErrorMessage(error)}`,
        'GET_ALL_SESSIONS_FAILED'
      );
    }
  }

  private isSessionExpired(session: any): boolean {
    if (!session.expiresAt) return false;
    return new Date(session.expiresAt) < new Date();
  }

  // Extension and middleware management
  addExtension(extension: any): void {
    this.extensionManager.register(extension);
    if (this.initialized) {
      this.extensionManager.applyExtensions(this.adapter.getInstance());
    }
  }

  removeExtension(extensionId: string): void {
    this.extensionManager.unregister(extensionId);
  }

  addMiddleware(middleware: any): void {
    this.middlewareManager.register(middleware);
    if (this.initialized) {
      this.middlewareManager.applyMiddleware(this.adapter.getInstance());
    }
  }

  removeMiddleware(middlewareId: string): void {
    this.middlewareManager.unregister(middlewareId);
  }

  // Version and upgrade management
  async upgrade(version?: string): Promise<void> {
    const oldVersion = this.getVersion();
    
    try {
      await this.adapter.upgrade(version);
      this.initialized = false;
      await this.initialize();
    } catch (error) {
      throw createError(
        `Failed to upgrade from ${oldVersion}: ${getErrorMessage(error)}`,
        'UPGRADE_FAILED'
      );
    }
  }

  getVersion(): string {
    return this.adapter.getVersion();
  }

  isCompatibleWith(version: string): boolean {
    return this.adapter.isCompatibleWith(version);
  }

  // Health and diagnostics
  async healthCheck(): Promise<{ healthy: boolean; issues: string[] }> {
    const adapterHealth = await this.adapter.healthCheck();
    const issues = [...adapterHealth.issues];
    
    if (!this.initialized) {
      issues.push('CF-Auth wrapper not initialized');
    }
    
    return {
      healthy: issues.length === 0,
      issues
    };
  }

  // Configuration
  getConfig(): Partial<BetterAuthOptions> {
    return this.adapter.getConfig();
  }

  updateConfig(newConfig: Partial<BetterAuthOptions>): void {
    this.adapter.updateConfig(newConfig);
  }

  // Status
  isInitialized(): boolean {
    return this.initialized && this.adapter.isInitialized();
  }

  // Event system
  on<K extends keyof CFAuthEvents>(event: K, listener: CFAuthEvents[K]): void {
    const listeners = this.eventListeners.get(event) || [];
    listeners.push(listener);
    this.eventListeners.set(event, listeners);
  }

  off<K extends keyof CFAuthEvents>(event: K, listener: CFAuthEvents[K]): void {
    const listeners = this.eventListeners.get(event) || [];
    const index = listeners.indexOf(listener);
    if (index > -1) {
      listeners.splice(index, 1);
    }
  }

  private emit<K extends keyof CFAuthEvents>(event: K, ...args: Parameters<CFAuthEvents[K]>): void {
    const listeners = this.eventListeners.get(event) || [];
    listeners.forEach(listener => {
      try {
        (listener as any)(...args);
      } catch (error) {
        console.error(`Error in event listener for ${event}:`, error);
      }
    });
  }

  // Utility methods
  private async ensureInitialized(): Promise<void> {
    if (!this.initialized) {
      await this.initialize();
    }
  }

  async reset(): Promise<void> {
    await this.adapter.reset();
    this.initialized = false;
    await this.initialize();
  }

  // Cleanup
  destroy(): void {
    this.adapter.destroy();
    this.eventListeners.clear();
    this.initialized = false;
  }

  // Factory method for easier instantiation
  static async create(config?: Partial<BetterAuthOptions>): Promise<CFBetterAuth> {
    const instance = new CFBetterAuth(config);
    await instance.initialize();
    return instance;
  }

  // Static convenience methods
  static async createWithDefaults(): Promise<CFBetterAuth> {
    return this.create();
  }

  static async createForProduction(config: Partial<BetterAuthOptions>): Promise<CFBetterAuth> {
    const productionConfig = {
      ...config,
      advanced: {
        useSecureCookies: true,
        disableCSRFCheck: false,
        ...config.advanced
      },
      rateLimit: {
        enabled: true,
        window: 60,
        max: 100,
        ...config.rateLimit
      }
    };
    
    return this.create(productionConfig);
  }
}

// Export convenience function
export function createCFAuth(config?: Partial<BetterAuthOptions>): CFBetterAuth {
  return new CFBetterAuth(config);
}

export async function createCFAuthAsync(config?: Partial<BetterAuthOptions>): Promise<CFBetterAuth> {
  return CFBetterAuth.create(config);
}
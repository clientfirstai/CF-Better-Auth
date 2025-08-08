/**
 * AuthWrapper - Wraps the better-auth instance with compatibility and middleware
 */

import { betterAuth } from 'better-auth';
import type { BetterAuth } from 'better-auth';
import { ConfigurationManager } from './config';
import { CompatibilityLayer } from './compatibility';
import { MiddlewareStack } from './middleware';

export class AuthWrapper {
  private instance: BetterAuth | null = null;
  private configManager: ConfigurationManager;
  private compatibilityLayer: CompatibilityLayer;
  private middlewareStack: MiddlewareStack;
  private debug: boolean = false;

  constructor(
    configManager: ConfigurationManager,
    compatibilityLayer: CompatibilityLayer,
    middlewareStack: MiddlewareStack
  ) {
    this.configManager = configManager;
    this.compatibilityLayer = compatibilityLayer;
    this.middlewareStack = middlewareStack;
  }

  /**
   * Initialize the better-auth instance with the provided configuration
   */
  async initialize(config: any): Promise<void> {
    try {
      if (this.debug) {
        console.log('Initializing better-auth with config:', JSON.stringify(config, null, 2));
      }

      // Wrap the configuration with compatibility layer
      const wrappedConfig = this.compatibilityLayer.wrapConfig(config);

      // Apply middleware to the configuration
      const finalConfig = await this.middlewareStack.processConfig(wrappedConfig);

      // Create the better-auth instance
      this.instance = betterAuth(finalConfig);

      // Apply post-initialization middleware
      await this.middlewareStack.postInitialize(this.instance);

      if (this.debug) {
        console.log('Better-auth instance created successfully');
      }
    } catch (error) {
      console.error('Failed to initialize better-auth:', error);
      throw error;
    }
  }

  /**
   * Get the better-auth instance
   */
  getInstance(): BetterAuth | null {
    return this.instance;
  }

  /**
   * Enable debug mode
   */
  enableDebug(): void {
    this.debug = true;
  }

  /**
   * Shutdown the auth wrapper
   */
  async shutdown(): Promise<void> {
    if (this.instance) {
      // Clean up any resources
      await this.middlewareStack.cleanup();
      this.instance = null;
    }
  }

  /**
   * Handle authentication requests
   */
  async handleRequest(request: Request): Promise<Response> {
    if (!this.instance) {
      throw new Error('Auth instance not initialized');
    }

    // Apply request middleware
    const processedRequest = await this.middlewareStack.processRequest(request);

    // Handle the request with better-auth
    const response = await this.instance.handler(processedRequest);

    // Apply response middleware
    const processedResponse = await this.middlewareStack.processResponse(response);

    return processedResponse;
  }

  /**
   * Get session from request
   */
  async getSession(request: Request) {
    if (!this.instance) {
      throw new Error('Auth instance not initialized');
    }

    return await this.instance.api.getSession({ headers: request.headers });
  }

  /**
   * Sign in a user
   */
  async signIn(credentials: any) {
    if (!this.instance) {
      throw new Error('Auth instance not initialized');
    }

    return await this.instance.api.signInEmail(credentials);
  }

  /**
   * Sign up a new user
   */
  async signUp(userData: any) {
    if (!this.instance) {
      throw new Error('Auth instance not initialized');
    }

    return await this.instance.api.signUpEmail(userData);
  }

  /**
   * Sign out a user
   */
  async signOut(request: Request) {
    if (!this.instance) {
      throw new Error('Auth instance not initialized');
    }

    return await this.instance.api.signOut({ headers: request.headers });
  }

  /**
   * Verify email
   */
  async verifyEmail(token: string) {
    if (!this.instance) {
      throw new Error('Auth instance not initialized');
    }

    return await this.instance.api.verifyEmail({ token });
  }

  /**
   * Reset password
   */
  async resetPassword(email: string) {
    if (!this.instance) {
      throw new Error('Auth instance not initialized');
    }

    return await this.instance.api.forgetPassword({ email });
  }

  /**
   * Update password
   */
  async updatePassword(token: string, newPassword: string) {
    if (!this.instance) {
      throw new Error('Auth instance not initialized');
    }

    return await this.instance.api.resetPassword({ token, newPassword });
  }
}
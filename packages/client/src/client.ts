import type { AuthResponse, User, Session } from '@cf-auth/types';
import { isTokenExpired, parseJWT } from '@cf-auth/utils';

export interface ClientOptions {
  baseURL?: string;
  credentials?: RequestCredentials;
  headers?: Record<string, string>;
  onError?: (error: Error) => void;
  storage?: Storage;
}

export class CFAuthClient {
  private baseURL: string;
  private options: ClientOptions;
  private session: Session | null = null;
  private user: User | null = null;
  private listeners: Set<(data: { user: User | null; session: Session | null }) => void> = new Set();

  constructor(options: ClientOptions = {}) {
    this.baseURL = options.baseURL || (typeof window !== 'undefined' ? window.location.origin : 'http://localhost:3000');
    this.options = {
      credentials: 'include',
      storage: typeof window !== 'undefined' ? window.localStorage : undefined,
      ...options
    };
    
    this.loadStoredSession();
  }

  private async request<T = any>(
    endpoint: string,
    options: RequestInit = {}
  ): Promise<T> {
    try {
      const response = await fetch(`${this.baseURL}/api/auth${endpoint}`, {
        ...options,
        credentials: this.options.credentials,
        headers: {
          'Content-Type': 'application/json',
          ...this.options.headers,
          ...options.headers
        }
      });

      if (!response.ok) {
        const error = await response.json().catch(() => ({ message: response.statusText }));
        throw new Error(error.message || `Request failed: ${response.status}`);
      }

      return response.json();
    } catch (error) {
      if (this.options.onError) {
        this.options.onError(error as Error);
      }
      throw error;
    }
  }

  async signIn(credentials: { email: string; password: string }): Promise<AuthResponse> {
    const response = await this.request<AuthResponse>('/sign-in', {
      method: 'POST',
      body: JSON.stringify(credentials)
    });

    if (response.user && response.session) {
      this.setSession(response.session, response.user);
    }

    return response;
  }

  async signUp(data: {
    email: string;
    password: string;
    name?: string;
  }): Promise<AuthResponse> {
    const response = await this.request<AuthResponse>('/sign-up', {
      method: 'POST',
      body: JSON.stringify(data)
    });

    if (response.user && response.session) {
      this.setSession(response.session, response.user);
    }

    return response;
  }

  async signOut(): Promise<void> {
    try {
      await this.request('/sign-out', { method: 'POST' });
    } finally {
      this.clearSession();
    }
  }

  async getSession(): Promise<Session | null> {
    if (this.session && !this.isSessionExpired()) {
      return this.session;
    }

    try {
      const response = await this.request<{ session: Session; user: User }>('/session');
      if (response.session && response.user) {
        this.setSession(response.session, response.user);
        return response.session;
      }
    } catch {
      this.clearSession();
    }

    return null;
  }

  async refreshSession(): Promise<Session | null> {
    try {
      const response = await this.request<AuthResponse>('/refresh', {
        method: 'POST'
      });

      if (response.session && response.user) {
        this.setSession(response.session, response.user);
        return response.session;
      }
    } catch {
      this.clearSession();
    }

    return null;
  }

  getUser(): User | null {
    return this.user;
  }

  isAuthenticated(): boolean {
    return !!this.session && !this.isSessionExpired();
  }

  private isSessionExpired(): boolean {
    if (!this.session?.expiresAt) return true;
    return new Date(this.session.expiresAt) < new Date();
  }

  private setSession(session: Session, user: User): void {
    this.session = session;
    this.user = user;
    this.storeSession();
    this.notifyListeners();
  }

  private clearSession(): void {
    this.session = null;
    this.user = null;
    this.clearStoredSession();
    this.notifyListeners();
  }

  private storeSession(): void {
    if (!this.options.storage) return;
    
    this.options.storage.setItem('cf-auth-session', JSON.stringify({
      session: this.session,
      user: this.user
    }));
  }

  private loadStoredSession(): void {
    if (!this.options.storage) return;
    
    try {
      const stored = this.options.storage.getItem('cf-auth-session');
      if (stored) {
        const { session, user } = JSON.parse(stored);
        if (session && user && !this.isSessionExpired()) {
          this.session = session;
          this.user = user;
        } else {
          this.clearStoredSession();
        }
      }
    } catch {
      this.clearStoredSession();
    }
  }

  private clearStoredSession(): void {
    if (!this.options.storage) return;
    this.options.storage.removeItem('cf-auth-session');
  }

  subscribe(listener: (data: { user: User | null; session: Session | null }) => void): () => void {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }

  private notifyListeners(): void {
    const data = { user: this.user, session: this.session };
    this.listeners.forEach(listener => listener(data));
  }

  async verifyEmail(token: string): Promise<boolean> {
    const response = await this.request<{ success: boolean }>('/verify-email', {
      method: 'POST',
      body: JSON.stringify({ token })
    });
    return response.success;
  }

  async forgotPassword(email: string): Promise<boolean> {
    const response = await this.request<{ success: boolean }>('/forgot-password', {
      method: 'POST',
      body: JSON.stringify({ email })
    });
    return response.success;
  }

  async resetPassword(token: string, newPassword: string): Promise<boolean> {
    const response = await this.request<{ success: boolean }>('/reset-password', {
      method: 'POST',
      body: JSON.stringify({ token, password: newPassword })
    });
    return response.success;
  }

  async updateProfile(data: Partial<User>): Promise<User> {
    const response = await this.request<{ user: User }>('/profile', {
      method: 'PUT',
      body: JSON.stringify(data)
    });
    
    if (response.user) {
      this.user = response.user;
      this.storeSession();
      this.notifyListeners();
    }
    
    return response.user;
  }
}
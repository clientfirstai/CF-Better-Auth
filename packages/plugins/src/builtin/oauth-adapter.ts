import type { Plugin, PluginAdapter } from '../plugin-adapter';
import type { BetterAuthInstance } from '@cf-auth/types';

export interface OAuthConfig {
  providers: {
    google?: {
      clientId: string;
      clientSecret: string;
      redirectUri?: string;
      scope?: string[];
    };
    github?: {
      clientId: string;
      clientSecret: string;
      redirectUri?: string;
      scope?: string[];
    };
    [key: string]: any;
  };
}

export const oauthAdapter: PluginAdapter = {
  name: 'oauth',
  
  fromBetterAuth: (betterAuthPlugin: any): Plugin => {
    return {
      name: 'oauth',
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

export function createOAuthPlugin(config: OAuthConfig): Plugin {
  return {
    name: 'oauth',
    config,
    init: async (auth: BetterAuthInstance) => {
      const providers = Object.entries(config.providers);
      
      for (const [name, providerConfig] of providers) {
        if (!providerConfig) continue;
        
        const handler = {
          clientId: providerConfig.clientId,
          clientSecret: providerConfig.clientSecret,
          redirectUri: providerConfig.redirectUri || `/api/auth/callback/${name}`,
          scope: providerConfig.scope || getDefaultScope(name)
        };
        
        if (auth.registerProvider) {
          auth.registerProvider(name, handler);
        }
      }
    }
  };
}

function getDefaultScope(provider: string): string[] {
  const scopes: Record<string, string[]> = {
    google: ['openid', 'email', 'profile'],
    github: ['read:user', 'user:email'],
    facebook: ['email', 'public_profile'],
    twitter: ['tweet.read', 'users.read']
  };
  
  return scopes[provider] || ['email', 'profile'];
}
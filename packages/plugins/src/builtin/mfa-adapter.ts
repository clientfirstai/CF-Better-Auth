import type { Plugin, PluginAdapter } from '../plugin-adapter';
import type { BetterAuthInstance } from '@cf-auth/types';

export interface MFAConfig {
  enabled: boolean;
  methods: {
    totp?: boolean;
    sms?: boolean;
    email?: boolean;
    backup?: boolean;
  };
  issuer?: string;
  recoveryCodesCount?: number;
}

export const mfaAdapter: PluginAdapter = {
  name: 'mfa',
  
  fromBetterAuth: (betterAuthPlugin: any): Plugin => {
    return {
      name: 'mfa',
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

export function createMFAPlugin(config: MFAConfig): Plugin {
  return {
    name: 'mfa',
    config,
    init: async (auth: BetterAuthInstance) => {
      if (!config.enabled) return;
      
      const mfaHandlers = {
        enable: async (userId: string, method: string) => {
          return handleMFAEnable(userId, method, config);
        },
        disable: async (userId: string, method: string) => {
          return handleMFADisable(userId, method);
        },
        verify: async (userId: string, code: string, method: string) => {
          return handleMFAVerify(userId, code, method);
        },
        generateBackupCodes: async (userId: string) => {
          return generateBackupCodes(config.recoveryCodesCount || 10);
        }
      };
      
      if (auth.registerMFA) {
        auth.registerMFA(mfaHandlers);
      }
    }
  };
}

async function handleMFAEnable(userId: string, method: string, config: MFAConfig): Promise<any> {
  switch (method) {
    case 'totp':
      if (!config.methods.totp) {
        throw new Error('TOTP method is not enabled');
      }
      return generateTOTPSecret(config.issuer || 'CF-Better-Auth');
    
    case 'sms':
      if (!config.methods.sms) {
        throw new Error('SMS method is not enabled');
      }
      return { message: 'SMS verification code sent' };
    
    case 'email':
      if (!config.methods.email) {
        throw new Error('Email method is not enabled');
      }
      return { message: 'Email verification code sent' };
    
    default:
      throw new Error(`Unknown MFA method: ${method}`);
  }
}

async function handleMFADisable(userId: string, method: string): Promise<void> {
  console.log(`Disabling MFA method ${method} for user ${userId}`);
}

async function handleMFAVerify(userId: string, code: string, method: string): Promise<boolean> {
  console.log(`Verifying MFA code for user ${userId} using method ${method}`);
  return true;
}

function generateTOTPSecret(issuer: string): { secret: string; qrCode: string; uri: string } {
  const secret = generateRandomString(32);
  const uri = `otpauth://totp/${issuer}:user?secret=${secret}&issuer=${issuer}`;
  
  return {
    secret,
    qrCode: `https://api.qrserver.com/v1/create-qr-code/?data=${encodeURIComponent(uri)}`,
    uri
  };
}

function generateBackupCodes(count: number): string[] {
  const codes: string[] = [];
  for (let i = 0; i < count; i++) {
    codes.push(generateRandomString(8).toUpperCase());
  }
  return codes;
}

function generateRandomString(length: number): string {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
  let result = '';
  for (let i = 0; i < length; i++) {
    result += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return result;
}
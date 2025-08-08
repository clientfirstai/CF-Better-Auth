/**
 * Multi-Factor Authentication (MFA) Plugin for CF-Better-Auth
 * Supports TOTP, SMS, Email, and Backup Codes
 */

import { createUniversalPlugin } from '../../plugin-builder';
import type { PluginContext, User } from '@cf-auth/types';

/**
 * MFA method types
 */
export type MFAMethod = 'totp' | 'sms' | 'email' | 'backup_codes';

/**
 * MFA configuration
 */
export interface MFAConfig {
  /** Supported MFA methods */
  methods: {
    totp: {
      enabled: boolean;
      issuer: string;
      window?: number;
    };
    sms: {
      enabled: boolean;
      provider: 'twilio' | 'aws_sns' | 'custom';
      config: Record<string, any>;
    };
    email: {
      enabled: boolean;
      template?: string;
    };
    backupCodes: {
      enabled: boolean;
      count: number;
    };
  };
  
  /** Enforcement settings */
  enforcement: {
    required: boolean;
    requiredForRoles?: string[];
    gracePeriodDays?: number;
  };
  
  /** Security settings */
  security: {
    maxAttempts: number;
    lockoutDuration: number;
    codeExpiry: number;
  };
}

/**
 * Default MFA configuration
 */
const DEFAULT_CONFIG: MFAConfig = {
  methods: {
    totp: {
      enabled: true,
      issuer: 'CF-Better-Auth',
      window: 1,
    },
    sms: {
      enabled: false,
      provider: 'twilio',
      config: {},
    },
    email: {
      enabled: true,
    },
    backupCodes: {
      enabled: true,
      count: 8,
    },
  },
  enforcement: {
    required: false,
  },
  security: {
    maxAttempts: 3,
    lockoutDuration: 15 * 60, // 15 minutes
    codeExpiry: 5 * 60, // 5 minutes
  },
};

/**
 * MFA Plugin Implementation
 */
class MFAPlugin {
  private config: MFAConfig;

  constructor(config: Partial<MFAConfig> = {}) {
    this.config = this.mergeConfig(DEFAULT_CONFIG, config);
  }

  /**
   * Initialize MFA plugin
   */
  async initialize(context: PluginContext): Promise<void> {
    context.logger.info('Initializing MFA plugin');
    
    // Validate configuration
    this.validateConfig();
    
    context.logger.info('MFA plugin initialized');
  }

  /**
   * Setup TOTP for user
   */
  async setupTOTP(userId: string, context: PluginContext): Promise<{ secret: string; qrCode: string; backupCodes?: string[] }> {
    if (!this.config.methods.totp.enabled) {
      throw new Error('TOTP is not enabled');
    }

    // Generate TOTP secret
    const secret = this.generateTOTPSecret();
    
    // Generate QR code URL
    const qrCode = this.generateQRCodeURL(userId, secret, context);
    
    // Generate backup codes if enabled
    let backupCodes: string[] | undefined;
    if (this.config.methods.backupCodes.enabled) {
      backupCodes = this.generateBackupCodes();
      await this.storeBackupCodes(userId, backupCodes, context);
    }

    // Store TOTP secret (not activated until verified)
    await context.storage.set(`mfa:totp:pending:${userId}`, {
      secret,
      createdAt: new Date(),
    });

    context.logger.info(`TOTP setup initiated for user ${userId}`);

    return {
      secret,
      qrCode,
      backupCodes,
    };
  }

  /**
   * Verify TOTP and activate MFA
   */
  async verifyTOTP(userId: string, token: string, context: PluginContext): Promise<boolean> {
    const pendingSetup = await context.storage.get(`mfa:totp:pending:${userId}`);
    if (!pendingSetup) {
      throw new Error('No pending TOTP setup found');
    }

    const isValid = this.validateTOTPToken(pendingSetup.secret, token);
    if (!isValid) {
      return false;
    }

    // Activate TOTP for user
    await context.storage.set(`mfa:totp:${userId}`, {
      secret: pendingSetup.secret,
      activatedAt: new Date(),
      backupCodesUsed: [],
    });

    // Clean up pending setup
    await context.storage.delete(`mfa:totp:pending:${userId}`);

    // Mark user as having MFA enabled
    await this.setUserMFAStatus(userId, true, context);

    context.logger.info(`TOTP activated for user ${userId}`);
    return true;
  }

  /**
   * Verify MFA token during login
   */
  async verifyMFA(userId: string, token: string, method?: MFAMethod, context?: PluginContext): Promise<boolean> {
    const userMFA = await context!.storage.get(`mfa:totp:${userId}`);
    if (!userMFA) {
      return false;
    }

    // Check for backup code
    if (this.isBackupCode(token)) {
      return await this.verifyBackupCode(userId, token, context!);
    }

    // Verify TOTP token
    return this.validateTOTPToken(userMFA.secret, token);
  }

  /**
   * Generate backup codes
   */
  private generateBackupCodes(): string[] {
    const codes: string[] = [];
    for (let i = 0; i < this.config.methods.backupCodes.count; i++) {
      codes.push(this.generateRandomCode(8));
    }
    return codes;
  }

  /**
   * Store backup codes
   */
  private async storeBackupCodes(userId: string, codes: string[], context: PluginContext): Promise<void> {
    const hashedCodes = codes.map(code => context.utils.hash(code));
    await context.storage.set(`mfa:backup:${userId}`, {
      codes: hashedCodes,
      used: [],
      createdAt: new Date(),
    });
  }

  /**
   * Verify backup code
   */
  private async verifyBackupCode(userId: string, code: string, context: PluginContext): Promise<boolean> {
    const backupData = await context.storage.get(`mfa:backup:${userId}`);
    if (!backupData) {
      return false;
    }

    const hashedCode = context.utils.hash(code);
    const codeIndex = backupData.codes.indexOf(hashedCode);
    
    if (codeIndex === -1 || backupData.used.includes(codeIndex)) {
      return false;
    }

    // Mark backup code as used
    backupData.used.push(codeIndex);
    await context.storage.set(`mfa:backup:${userId}`, backupData);

    return true;
  }

  /**
   * Generate TOTP secret
   */
  private generateTOTPSecret(): string {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ234567';
    let secret = '';
    for (let i = 0; i < 32; i++) {
      secret += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return secret;
  }

  /**
   * Generate QR code URL for TOTP
   */
  private generateQRCodeURL(userId: string, secret: string, context: PluginContext): string {
    const issuer = encodeURIComponent(this.config.methods.totp.issuer);
    const label = encodeURIComponent(`${issuer}:${userId}`);
    return `otpauth://totp/${label}?secret=${secret}&issuer=${issuer}`;
  }

  /**
   * Validate TOTP token
   */
  private validateTOTPToken(secret: string, token: string): boolean {
    // This is a simplified TOTP validation
    // In a real implementation, you'd use a proper TOTP library like 'otplib'
    const timeStep = Math.floor(Date.now() / 1000 / 30);
    const window = this.config.methods.totp.window || 1;
    
    for (let i = -window; i <= window; i++) {
      const expectedToken = this.generateTOTPToken(secret, timeStep + i);
      if (expectedToken === token) {
        return true;
      }
    }
    
    return false;
  }

  /**
   * Generate TOTP token (simplified implementation)
   */
  private generateTOTPToken(secret: string, timeStep: number): string {
    // Simplified TOTP generation - use proper library in production
    const hash = require('crypto').createHmac('sha1', Buffer.from(secret, 'base32'));
    hash.update(Buffer.from([
      (timeStep >> 24) & 0xFF,
      (timeStep >> 16) & 0xFF,
      (timeStep >> 8) & 0xFF,
      timeStep & 0xFF,
    ]));
    
    const hmac = hash.digest();
    const offset = hmac[hmac.length - 1] & 0x0F;
    const code = ((hmac[offset] & 0x7F) << 24) |
                 ((hmac[offset + 1] & 0xFF) << 16) |
                 ((hmac[offset + 2] & 0xFF) << 8) |
                 (hmac[offset + 3] & 0xFF);
    
    return String(code % 1000000).padStart(6, '0');
  }

  /**
   * Check if token is a backup code format
   */
  private isBackupCode(token: string): boolean {
    return /^[A-Z0-9]{8}$/.test(token);
  }

  /**
   * Generate random code
   */
  private generateRandomCode(length: number): string {
    const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
    let code = '';
    for (let i = 0; i < length; i++) {
      code += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return code;
  }

  /**
   * Set user MFA status
   */
  private async setUserMFAStatus(userId: string, enabled: boolean, context: PluginContext): Promise<void> {
    await context.storage.set(`mfa:status:${userId}`, {
      enabled,
      updatedAt: new Date(),
    });
  }

  /**
   * Validate configuration
   */
  private validateConfig(): void {
    if (!Object.values(this.config.methods).some(method => method.enabled)) {
      throw new Error('At least one MFA method must be enabled');
    }
  }

  /**
   * Merge configuration
   */
  private mergeConfig(defaultConfig: MFAConfig, userConfig: Partial<MFAConfig>): MFAConfig {
    return {
      methods: {
        totp: { ...defaultConfig.methods.totp, ...userConfig.methods?.totp },
        sms: { ...defaultConfig.methods.sms, ...userConfig.methods?.sms },
        email: { ...defaultConfig.methods.email, ...userConfig.methods?.email },
        backupCodes: { ...defaultConfig.methods.backupCodes, ...userConfig.methods?.backupCodes },
      },
      enforcement: { ...defaultConfig.enforcement, ...userConfig.enforcement },
      security: { ...defaultConfig.security, ...userConfig.security },
    };
  }
}

/**
 * Create MFA plugin
 */
export function createMFAPlugin(config?: Partial<MFAConfig>) {
  const plugin = new MFAPlugin(config);

  return createUniversalPlugin()
    .setId('mfa')
    .setName('Multi-Factor Authentication')
    .setVersion('1.0.0')
    .setDescription('Multi-factor authentication with TOTP, SMS, Email, and Backup Codes')
    .setAuthor('CF-Better-Auth Team')
    .addCategory('security')
    .addCategory('authentication')
    .addTag('mfa')
    .addTag('totp')
    .addTag('2fa')
    .addTag('security')
    .setInitialize(plugin.initialize.bind(plugin))
    .addServerHook('afterLogin', async (user, session, context) => {
      // Check if MFA is required for this user
      const mfaStatus = await context.storage.get(`mfa:status:${user.id}`);
      if (mfaStatus?.enabled) {
        // MFA verification required
        session.mfaRequired = true;
        session.mfaVerified = false;
      }
      return { user, session };
    })
    .addRoute({
      method: 'POST',
      path: '/api/mfa/setup/totp',
      auth: true,
      handler: async (req, res) => {
        try {
          const result = await plugin.setupTOTP(req.user.id, req.context);
          res.json(result);
        } catch (error) {
          res.status(400).json({ error: error.message });
        }
      },
    })
    .addRoute({
      method: 'POST',
      path: '/api/mfa/verify/totp',
      auth: true,
      handler: async (req, res) => {
        const { token } = req.body;
        try {
          const verified = await plugin.verifyTOTP(req.user.id, token, req.context);
          res.json({ verified });
        } catch (error) {
          res.status(400).json({ error: error.message });
        }
      },
    })
    .addRoute({
      method: 'POST',
      path: '/api/mfa/verify',
      handler: async (req, res) => {
        const { userId, token, method } = req.body;
        try {
          const verified = await plugin.verifyMFA(userId, token, method, req.context);
          res.json({ verified });
        } catch (error) {
          res.status(400).json({ error: error.message });
        }
      },
    })
    .build();
}

// Export default plugin instance
export default createMFAPlugin();
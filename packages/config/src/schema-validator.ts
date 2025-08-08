import type { BetterAuthOptions, CFAuthOptions } from '@cf-auth/types';
import { isObject, isString, isNumber, isBoolean, isArray, isFunction } from '@cf-auth/utils';

export interface ValidationError {
  path: string;
  message: string;
  value: any;
}

export interface ValidationResult {
  valid: boolean;
  errors: ValidationError[];
  warnings: string[];
}

export class SchemaValidator {
  private errors: ValidationError[] = [];
  private warnings: string[] = [];

  validate(config: any, options: { strict?: boolean } = {}): ValidationResult {
    this.errors = [];
    this.warnings = [];

    this.validateRoot(config, options.strict);

    return {
      valid: this.errors.length === 0,
      errors: [...this.errors],
      warnings: [...this.warnings]
    };
  }

  private validateRoot(config: any, strict = false): void {
    if (!isObject(config)) {
      this.addError('', 'Configuration must be an object', config);
      return;
    }

    // Validate required fields
    if (!config.database) {
      this.addError('database', 'Database configuration is required', undefined);
    } else {
      this.validateDatabase(config.database);
    }

    // Validate optional fields
    if (config.secret !== undefined) this.validateSecret(config.secret);
    if (config.baseURL !== undefined) this.validateBaseURL(config.baseURL);
    if (config.basePath !== undefined) this.validateBasePath(config.basePath);
    if (config.appName !== undefined) this.validateAppName(config.appName);
    if (config.session !== undefined) this.validateSession(config.session);
    if (config.emailAndPassword !== undefined) this.validateEmailAndPassword(config.emailAndPassword);
    if (config.socialProviders !== undefined) this.validateSocialProviders(config.socialProviders);
    if (config.rateLimit !== undefined) this.validateRateLimit(config.rateLimit);
    if (config.plugins !== undefined) this.validatePlugins(config.plugins);
    if (config.trustedOrigins !== undefined) this.validateTrustedOrigins(config.trustedOrigins);
    if (config.advanced !== undefined) this.validateAdvanced(config.advanced);

    // Check for unknown fields in strict mode
    if (strict) {
      this.checkUnknownFields(config, [
        'database', 'secret', 'baseURL', 'basePath', 'appName',
        'session', 'emailAndPassword', 'socialProviders', 'rateLimit',
        'plugins', 'trustedOrigins', 'advanced'
      ], '');
    }
  }

  private validateDatabase(database: any): void {
    if (!isObject(database)) {
      this.addError('database', 'Database configuration must be an object', database);
      return;
    }

    // For object-style database config
    if (database.provider) {
      const validProviders = ['postgresql', 'mysql', 'sqlite', 'mongodb'];
      if (!validProviders.includes(database.provider)) {
        this.addError('database.provider', `Database provider must be one of: ${validProviders.join(', ')}`, database.provider);
      }

      if (!database.connectionString && !database.url) {
        this.addWarning('Database should have either connectionString or url property');
      }

      if (database.connectionString && !isString(database.connectionString)) {
        this.addError('database.connectionString', 'Connection string must be a string', database.connectionString);
      }

      if (database.url && !isString(database.url)) {
        this.addError('database.url', 'Database URL must be a string', database.url);
      }
    }
  }

  private validateSecret(secret: any): void {
    if (!isString(secret)) {
      this.addError('secret', 'Secret must be a string', secret);
      return;
    }

    if (secret.length < 32) {
      this.addWarning('Secret should be at least 32 characters long for security');
    }

    if (secret === 'better-auth-secret-123456789') {
      this.addWarning('Using default secret in production is not recommended');
    }
  }

  private validateBaseURL(baseURL: any): void {
    if (!isString(baseURL)) {
      this.addError('baseURL', 'Base URL must be a string', baseURL);
      return;
    }

    try {
      new URL(baseURL);
    } catch {
      this.addError('baseURL', 'Base URL must be a valid URL', baseURL);
    }
  }

  private validateBasePath(basePath: any): void {
    if (!isString(basePath)) {
      this.addError('basePath', 'Base path must be a string', basePath);
      return;
    }

    if (!basePath.startsWith('/')) {
      this.addWarning('Base path should start with "/"');
    }
  }

  private validateAppName(appName: any): void {
    if (!isString(appName)) {
      this.addError('appName', 'App name must be a string', appName);
    }
  }

  private validateSession(session: any): void {
    if (!isObject(session)) {
      this.addError('session', 'Session configuration must be an object', session);
      return;
    }

    if (session.expiresIn !== undefined) {
      if (!isNumber(session.expiresIn) || session.expiresIn <= 0) {
        this.addError('session.expiresIn', 'Session expiresIn must be a positive number', session.expiresIn);
      }
    }

    if (session.updateAge !== undefined) {
      if (!isNumber(session.updateAge) || session.updateAge < 0) {
        this.addError('session.updateAge', 'Session updateAge must be a non-negative number', session.updateAge);
      }
    }

    if (session.cookieName !== undefined && !isString(session.cookieName)) {
      this.addError('session.cookieName', 'Cookie name must be a string', session.cookieName);
    }

    if (session.freshAge !== undefined) {
      if (!isNumber(session.freshAge) || session.freshAge < 0) {
        this.addError('session.freshAge', 'Session freshAge must be a non-negative number', session.freshAge);
      }
    }
  }

  private validateEmailAndPassword(emailAndPassword: any): void {
    if (!isObject(emailAndPassword)) {
      this.addError('emailAndPassword', 'Email and password configuration must be an object', emailAndPassword);
      return;
    }

    if (emailAndPassword.enabled !== undefined && !isBoolean(emailAndPassword.enabled)) {
      this.addError('emailAndPassword.enabled', 'Enabled must be a boolean', emailAndPassword.enabled);
    }

    if (emailAndPassword.requireEmailVerification !== undefined && !isBoolean(emailAndPassword.requireEmailVerification)) {
      this.addError('emailAndPassword.requireEmailVerification', 'requireEmailVerification must be a boolean', emailAndPassword.requireEmailVerification);
    }

    if (emailAndPassword.minPasswordLength !== undefined) {
      if (!isNumber(emailAndPassword.minPasswordLength) || emailAndPassword.minPasswordLength < 1) {
        this.addError('emailAndPassword.minPasswordLength', 'minPasswordLength must be a positive number', emailAndPassword.minPasswordLength);
      }
    }

    if (emailAndPassword.maxPasswordLength !== undefined) {
      if (!isNumber(emailAndPassword.maxPasswordLength) || emailAndPassword.maxPasswordLength < 1) {
        this.addError('emailAndPassword.maxPasswordLength', 'maxPasswordLength must be a positive number', emailAndPassword.maxPasswordLength);
      }
    }

    if (emailAndPassword.autoSignIn !== undefined && !isBoolean(emailAndPassword.autoSignIn)) {
      this.addError('emailAndPassword.autoSignIn', 'autoSignIn must be a boolean', emailAndPassword.autoSignIn);
    }
  }

  private validateSocialProviders(socialProviders: any): void {
    if (!isObject(socialProviders)) {
      this.addError('socialProviders', 'Social providers configuration must be an object', socialProviders);
      return;
    }

    const validProviders = ['google', 'github', 'facebook', 'twitter', 'discord', 'apple'];
    
    for (const [provider, config] of Object.entries(socialProviders)) {
      if (!validProviders.includes(provider)) {
        this.addWarning(`Unknown social provider: ${provider}`);
      }

      this.validateProviderConfig(config, `socialProviders.${provider}`);
    }
  }

  private validateProviderConfig(config: any, path: string): void {
    if (!isObject(config)) {
      this.addError(path, 'Provider configuration must be an object', config);
      return;
    }

    if (!config.clientId || !isString(config.clientId)) {
      this.addError(`${path}.clientId`, 'Client ID is required and must be a string', config.clientId);
    }

    if (!config.clientSecret || !isString(config.clientSecret)) {
      this.addError(`${path}.clientSecret`, 'Client secret is required and must be a string', config.clientSecret);
    }

    if (config.redirectUri !== undefined && !isString(config.redirectUri)) {
      this.addError(`${path}.redirectUri`, 'Redirect URI must be a string', config.redirectUri);
    }

    if (config.scope !== undefined && !isArray(config.scope)) {
      this.addError(`${path}.scope`, 'Scope must be an array', config.scope);
    }
  }

  private validateRateLimit(rateLimit: any): void {
    if (!isObject(rateLimit)) {
      this.addError('rateLimit', 'Rate limit configuration must be an object', rateLimit);
      return;
    }

    if (rateLimit.enabled !== undefined && !isBoolean(rateLimit.enabled)) {
      this.addError('rateLimit.enabled', 'Rate limit enabled must be a boolean', rateLimit.enabled);
    }

    if (rateLimit.window !== undefined) {
      if (!isNumber(rateLimit.window) || rateLimit.window <= 0) {
        this.addError('rateLimit.window', 'Rate limit window must be a positive number', rateLimit.window);
      }
    }

    if (rateLimit.max !== undefined) {
      if (!isNumber(rateLimit.max) || rateLimit.max <= 0) {
        this.addError('rateLimit.max', 'Rate limit max must be a positive number', rateLimit.max);
      }
    }

    if (rateLimit.storage !== undefined) {
      const validStorage = ['memory', 'database', 'secondary-storage'];
      if (!validStorage.includes(rateLimit.storage)) {
        this.addError('rateLimit.storage', `Rate limit storage must be one of: ${validStorage.join(', ')}`, rateLimit.storage);
      }
    }
  }

  private validatePlugins(plugins: any): void {
    if (!isArray(plugins)) {
      this.addError('plugins', 'Plugins must be an array', plugins);
      return;
    }

    plugins.forEach((plugin, index) => {
      if (!isObject(plugin) && !isFunction(plugin)) {
        this.addError(`plugins[${index}]`, 'Plugin must be an object or function', plugin);
      }
    });
  }

  private validateTrustedOrigins(trustedOrigins: any): void {
    if (!isArray(trustedOrigins) && !isFunction(trustedOrigins)) {
      this.addError('trustedOrigins', 'Trusted origins must be an array or function', trustedOrigins);
      return;
    }

    if (isArray(trustedOrigins)) {
      trustedOrigins.forEach((origin, index) => {
        if (!isString(origin)) {
          this.addError(`trustedOrigins[${index}]`, 'Trusted origin must be a string', origin);
        }
      });
    }
  }

  private validateAdvanced(advanced: any): void {
    if (!isObject(advanced)) {
      this.addError('advanced', 'Advanced configuration must be an object', advanced);
      return;
    }

    if (advanced.useSecureCookies !== undefined && !isBoolean(advanced.useSecureCookies)) {
      this.addError('advanced.useSecureCookies', 'useSecureCookies must be a boolean', advanced.useSecureCookies);
    }

    if (advanced.disableCSRFCheck !== undefined && !isBoolean(advanced.disableCSRFCheck)) {
      this.addError('advanced.disableCSRFCheck', 'disableCSRFCheck must be a boolean', advanced.disableCSRFCheck);
    }

    if (advanced.cookiePrefix !== undefined && !isString(advanced.cookiePrefix)) {
      this.addError('advanced.cookiePrefix', 'cookiePrefix must be a string', advanced.cookiePrefix);
    }

    // Security warnings
    if (advanced.disableCSRFCheck === true) {
      this.addWarning('Disabling CSRF check is a security risk and should only be used for development');
    }
  }

  private checkUnknownFields(obj: any, knownFields: string[], basePath: string): void {
    for (const key in obj) {
      if (!knownFields.includes(key)) {
        const path = basePath ? `${basePath}.${key}` : key;
        this.addWarning(`Unknown configuration field: ${path}`);
      }
    }
  }

  private addError(path: string, message: string, value: any): void {
    this.errors.push({ path, message, value });
  }

  private addWarning(message: string): void {
    this.warnings.push(message);
  }

  // Static validation methods for quick checks
  static validateQuick(config: any): boolean {
    const validator = new SchemaValidator();
    const result = validator.validate(config);
    return result.valid;
  }

  static validateWithErrors(config: any): ValidationResult {
    const validator = new SchemaValidator();
    return validator.validate(config);
  }

  // Validate specific config sections
  static validateDatabase(database: any): ValidationError[] {
    const validator = new SchemaValidator();
    validator.validateDatabase(database);
    return validator.errors;
  }

  static validateSession(session: any): ValidationError[] {
    const validator = new SchemaValidator();
    validator.validateSession(session);
    return validator.errors;
  }

  static validateEmailAndPassword(emailAndPassword: any): ValidationError[] {
    const validator = new SchemaValidator();
    validator.validateEmailAndPassword(emailAndPassword);
    return validator.errors;
  }
}
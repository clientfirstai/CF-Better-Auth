# Plugin System Implementation

## Overview

CF-Better-Auth implements a sophisticated plugin architecture that extends better-auth's capabilities while maintaining complete compatibility. The system allows for modular functionality, type-safe extensions, and dynamic configuration without modifying the core authentication engine.

## Plugin Architecture Principles

### 1. Non-Invasive Extension
```typescript
// Core better-auth remains untouched
import { betterAuth } from 'better-auth';

// CF-Better-Auth wraps and extends
export class CFBetterAuth {
  private core: ReturnType<typeof betterAuth>;
  private pluginManager: PluginManager;
  
  constructor(config: CFAuthConfig) {
    // Initialize core with plugin-enhanced config
    this.core = betterAuth(this.buildCoreConfig(config));
    this.pluginManager = new PluginManager(config.plugins);
  }
}
```

### 2. Type-Safe Plugin Interface
```typescript
interface CFAuthPlugin<TConfig = any> {
  // Plugin metadata
  readonly meta: {
    id: string;
    name: string;
    version: string;
    description: string;
    author?: string;
    license?: string;
    repository?: string;
    tags?: string[];
  };
  
  // Configuration schema
  configSchema?: z.ZodSchema<TConfig>;
  defaultConfig?: Partial<TConfig>;
  
  // Dependencies
  dependencies?: {
    required?: string[];
    optional?: string[];
    conflicts?: string[];
    betterAuthVersion?: string;
    nodeVersion?: string;
  };
  
  // Plugin lifecycle
  init?: (context: PluginContext<TConfig>) => Promise<void> | void;
  start?: (context: PluginContext<TConfig>) => Promise<void> | void;
  stop?: (context: PluginContext<TConfig>) => Promise<void> | void;
  destroy?: (context: PluginContext<TConfig>) => Promise<void> | void;
  
  // Better-auth integration
  betterAuthPlugin?: BetterAuthPlugin;
  
  // Hook implementations
  hooks?: PluginHooks<TConfig>;
  
  // Event handlers
  events?: PluginEvents<TConfig>;
  
  // API extensions
  api?: PluginAPI<TConfig>;
  
  // Database extensions
  database?: PluginDatabase;
  
  // UI extensions (for frontend plugins)
  ui?: PluginUI;
}
```

## Plugin Context System

### Plugin Context Interface
```typescript
interface PluginContext<TConfig = any> {
  // Plugin-specific configuration
  config: TConfig;
  
  // Core authentication instance
  auth: CFBetterAuth;
  
  // Database access
  db: DatabaseInterface;
  
  // Cache access
  cache: CacheInterface;
  
  // Logger instance
  logger: Logger;
  
  // Event emitter
  events: EventEmitter;
  
  // HTTP client
  http: HttpClient;
  
  // Utility functions
  utils: {
    encrypt: (data: string) => Promise<string>;
    decrypt: (encrypted: string) => Promise<string>;
    hash: (data: string) => Promise<string>;
    verify: (hash: string, data: string) => Promise<boolean>;
    uuid: () => string;
    generateToken: (length?: number) => string;
  };
  
  // Plugin management
  plugins: {
    get: <T>(pluginId: string) => T | undefined;
    isEnabled: (pluginId: string) => boolean;
    invoke: <T>(pluginId: string, method: string, ...args: any[]) => Promise<T>;
  };
  
  // Environment info
  env: {
    isDevelopment: boolean;
    isProduction: boolean;
    isTesting: boolean;
    version: string;
  };
}
```

### Plugin Factory
```typescript
class PluginFactory {
  static create<TConfig>(
    definition: CFAuthPluginDefinition<TConfig>
  ): CFAuthPlugin<TConfig> {
    return {
      meta: definition.meta,
      configSchema: definition.configSchema,
      defaultConfig: definition.defaultConfig,
      dependencies: definition.dependencies,
      
      // Lifecycle with error handling
      init: this.wrapLifecycleMethod(definition.init),
      start: this.wrapLifecycleMethod(definition.start),
      stop: this.wrapLifecycleMethod(definition.stop),
      destroy: this.wrapLifecycleMethod(definition.destroy),
      
      // Feature implementations
      hooks: definition.hooks,
      events: definition.events,
      api: definition.api,
      database: definition.database,
      ui: definition.ui,
      
      // Better-auth integration
      betterAuthPlugin: definition.betterAuthPlugin,
    };
  }
  
  private static wrapLifecycleMethod<T extends any[]>(
    method?: (...args: T) => Promise<void> | void
  ) {
    if (!method) return undefined;
    
    return async (...args: T) => {
      try {
        await method(...args);
      } catch (error) {
        throw new PluginError(`Plugin lifecycle method failed: ${error.message}`);
      }
    };
  }
}
```

## Hook System

### Hook Types
```typescript
interface PluginHooks<TConfig = any> {
  // Authentication hooks
  beforeSignIn?: HookHandler<BeforeSignInContext, TConfig>;
  afterSignIn?: HookHandler<AfterSignInContext, TConfig>;
  beforeSignUp?: HookHandler<BeforeSignUpContext, TConfig>;
  afterSignUp?: HookHandler<AfterSignUpContext, TConfig>;
  beforeSignOut?: HookHandler<BeforeSignOutContext, TConfig>;
  afterSignOut?: HookHandler<AfterSignOutContext, TConfig>;
  
  // Session hooks
  beforeSessionCreate?: HookHandler<BeforeSessionCreateContext, TConfig>;
  afterSessionCreate?: HookHandler<AfterSessionCreateContext, TConfig>;
  beforeSessionDestroy?: HookHandler<BeforeSessionDestroyContext, TConfig>;
  afterSessionDestroy?: HookHandler<AfterSessionDestroyContext, TConfig>;
  sessionValidate?: HookHandler<SessionValidateContext, TConfig>;
  
  // User hooks
  beforeUserCreate?: HookHandler<BeforeUserCreateContext, TConfig>;
  afterUserCreate?: HookHandler<AfterUserCreateContext, TConfig>;
  beforeUserUpdate?: HookHandler<BeforeUserUpdateContext, TConfig>;
  afterUserUpdate?: HookHandler<AfterUserUpdateContext, TConfig>;
  beforeUserDelete?: HookHandler<BeforeUserDeleteContext, TConfig>;
  afterUserDelete?: HookHandler<AfterUserDeleteContext, TConfig>;
  
  // Organization hooks
  beforeOrgCreate?: HookHandler<BeforeOrgCreateContext, TConfig>;
  afterOrgCreate?: HookHandler<AfterOrgCreateContext, TConfig>;
  beforeOrgUpdate?: HookHandler<BeforeOrgUpdateContext, TConfig>;
  afterOrgUpdate?: HookHandler<AfterOrgUpdateContext, TConfig>;
  
  // Request hooks
  beforeRequest?: HookHandler<BeforeRequestContext, TConfig>;
  afterRequest?: HookHandler<AfterRequestContext, TConfig>;
  onError?: HookHandler<OnErrorContext, TConfig>;
  
  // Email hooks
  beforeEmailSend?: HookHandler<BeforeEmailSendContext, TConfig>;
  afterEmailSend?: HookHandler<AfterEmailSendContext, TConfig>;
}

type HookHandler<TContext, TConfig = any> = (
  context: TContext,
  pluginContext: PluginContext<TConfig>
) => Promise<TContext | void> | TContext | void;
```

### Hook Execution Engine
```typescript
class HookManager {
  private hooks = new Map<string, Array<{ plugin: string; handler: Function }>>();
  
  register(hookName: string, pluginId: string, handler: Function): void {
    if (!this.hooks.has(hookName)) {
      this.hooks.set(hookName, []);
    }
    this.hooks.get(hookName)!.push({ plugin: pluginId, handler });
  }
  
  async execute<T>(hookName: string, context: T): Promise<T> {
    const handlers = this.hooks.get(hookName) || [];
    let currentContext = context;
    
    for (const { plugin, handler } of handlers) {
      try {
        const result = await handler(currentContext);
        if (result !== undefined) {
          currentContext = result;
        }
      } catch (error) {
        this.logger.error(`Hook ${hookName} failed in plugin ${plugin}:`, error);
        throw new HookExecutionError(hookName, plugin, error);
      }
    }
    
    return currentContext;
  }
  
  async executeParallel<T>(hookName: string, context: T): Promise<T[]> {
    const handlers = this.hooks.get(hookName) || [];
    
    const results = await Promise.allSettled(
      handlers.map(({ handler }) => handler(context))
    );
    
    return results
      .filter((result): result is PromiseFulfilledResult<T> => result.status === 'fulfilled')
      .map(result => result.value);
  }
}
```

## Event System

### Event Types
```typescript
interface PluginEvents<TConfig = any> {
  // User events
  'user.created'?: EventHandler<UserCreatedEvent, TConfig>;
  'user.updated'?: EventHandler<UserUpdatedEvent, TConfig>;
  'user.deleted'?: EventHandler<UserDeletedEvent, TConfig>;
  'user.suspended'?: EventHandler<UserSuspendedEvent, TConfig>;
  'user.activated'?: EventHandler<UserActivatedEvent, TConfig>;
  
  // Authentication events
  'auth.login.success'?: EventHandler<LoginSuccessEvent, TConfig>;
  'auth.login.failed'?: EventHandler<LoginFailedEvent, TConfig>;
  'auth.logout'?: EventHandler<LogoutEvent, TConfig>;
  'auth.token.refresh'?: EventHandler<TokenRefreshEvent, TConfig>;
  'auth.password.changed'?: EventHandler<PasswordChangedEvent, TConfig>;
  
  // Session events
  'session.created'?: EventHandler<SessionCreatedEvent, TConfig>;
  'session.expired'?: EventHandler<SessionExpiredEvent, TConfig>;
  'session.revoked'?: EventHandler<SessionRevokedEvent, TConfig>;
  
  // Organization events
  'org.created'?: EventHandler<OrgCreatedEvent, TConfig>;
  'org.member.added'?: EventHandler<OrgMemberAddedEvent, TConfig>;
  'org.member.removed'?: EventHandler<OrgMemberRemovedEvent, TConfig>;
  'org.role.changed'?: EventHandler<OrgRoleChangedEvent, TConfig>;
  
  // Security events
  'security.threat.detected'?: EventHandler<ThreatDetectedEvent, TConfig>;
  'security.breach.suspected'?: EventHandler<BreachSuspectedEvent, TConfig>;
  'security.mfa.enabled'?: EventHandler<MFAEnabledEvent, TConfig>;
  'security.mfa.disabled'?: EventHandler<MFADisabledEvent, TConfig>;
  
  // System events
  'system.startup'?: EventHandler<SystemStartupEvent, TConfig>;
  'system.shutdown'?: EventHandler<SystemShutdownEvent, TConfig>;
  'system.maintenance'?: EventHandler<MaintenanceEvent, TConfig>;
}

type EventHandler<TEvent, TConfig = any> = (
  event: TEvent,
  context: PluginContext<TConfig>
) => Promise<void> | void;
```

### Event Manager
```typescript
class EventManager {
  private listeners = new Map<string, Array<{ plugin: string; handler: Function }>>();
  private eventQueue: Array<{ event: string; data: any; timestamp: Date }> = [];
  private processing = false;
  
  on(eventName: string, pluginId: string, handler: Function): void {
    if (!this.listeners.has(eventName)) {
      this.listeners.set(eventName, []);
    }
    this.listeners.get(eventName)!.push({ plugin: pluginId, handler });
  }
  
  async emit(eventName: string, data: any): Promise<void> {
    // Add to queue for processing
    this.eventQueue.push({
      event: eventName,
      data,
      timestamp: new Date(),
    });
    
    // Process queue if not already processing
    if (!this.processing) {
      await this.processEventQueue();
    }
  }
  
  private async processEventQueue(): Promise<void> {
    this.processing = true;
    
    while (this.eventQueue.length > 0) {
      const { event, data } = this.eventQueue.shift()!;
      const listeners = this.listeners.get(event) || [];
      
      // Execute all listeners in parallel
      await Promise.allSettled(
        listeners.map(async ({ plugin, handler }) => {
          try {
            await handler(data);
          } catch (error) {
            this.logger.error(`Event ${event} handler failed in plugin ${plugin}:`, error);
          }
        })
      );
    }
    
    this.processing = false;
  }
}
```

## Plugin Registry

### Plugin Discovery
```typescript
class PluginRegistry {
  private plugins = new Map<string, CFAuthPlugin>();
  private pluginPaths: string[] = [];
  
  async discoverPlugins(paths: string[]): Promise<void> {
    this.pluginPaths = paths;
    
    for (const path of paths) {
      await this.scanDirectory(path);
    }
  }
  
  private async scanDirectory(dir: string): Promise<void> {
    const entries = await fs.readdir(dir, { withFileTypes: true });
    
    for (const entry of entries) {
      if (entry.isDirectory()) {
        const pluginPath = path.join(dir, entry.name);
        const manifestPath = path.join(pluginPath, 'plugin.json');
        
        if (await fs.pathExists(manifestPath)) {
          await this.loadPlugin(pluginPath);
        }
      }
    }
  }
  
  private async loadPlugin(pluginPath: string): Promise<void> {
    try {
      // Load plugin manifest
      const manifest = await this.loadManifest(pluginPath);
      
      // Validate manifest
      this.validateManifest(manifest);
      
      // Load plugin code
      const pluginModule = await import(path.join(pluginPath, manifest.main));
      const plugin: CFAuthPlugin = pluginModule.default || pluginModule;
      
      // Validate plugin interface
      this.validatePlugin(plugin);
      
      // Register plugin
      this.plugins.set(plugin.meta.id, plugin);
      
      this.logger.info(`Loaded plugin: ${plugin.meta.name} v${plugin.meta.version}`);
    } catch (error) {
      this.logger.error(`Failed to load plugin from ${pluginPath}:`, error);
    }
  }
}
```

### Plugin Validation
```typescript
const pluginManifestSchema = z.object({
  name: z.string().min(1),
  version: z.string().regex(/^\d+\.\d+\.\d+$/),
  main: z.string().endsWith('.js'),
  description: z.string().optional(),
  author: z.string().optional(),
  license: z.string().optional(),
  repository: z.string().url().optional(),
  tags: z.array(z.string()).optional(),
  dependencies: z.object({
    required: z.array(z.string()).optional(),
    optional: z.array(z.string()).optional(),
    conflicts: z.array(z.string()).optional(),
    betterAuthVersion: z.string().optional(),
    nodeVersion: z.string().optional(),
  }).optional(),
  permissions: z.array(z.string()).optional(),
  config: z.record(z.any()).optional(),
});

class PluginValidator {
  validateManifest(manifest: unknown): PluginManifest {
    return pluginManifestSchema.parse(manifest);
  }
  
  validatePlugin(plugin: CFAuthPlugin): void {
    // Check required fields
    if (!plugin.meta?.id || !plugin.meta?.name || !plugin.meta?.version) {
      throw new Error('Plugin missing required metadata');
    }
    
    // Validate ID format
    if (!/^[a-z0-9-]+$/.test(plugin.meta.id)) {
      throw new Error('Plugin ID must contain only lowercase letters, numbers, and hyphens');
    }
    
    // Check for required methods if database extensions are used
    if (plugin.database && !plugin.init) {
      throw new Error('Plugins with database extensions must implement init method');
    }
  }
  
  async validateDependencies(plugin: CFAuthPlugin): Promise<void> {
    const deps = plugin.dependencies;
    if (!deps) return;
    
    // Check required dependencies
    if (deps.required) {
      for (const depId of deps.required) {
        if (!this.registry.has(depId)) {
          throw new Error(`Required dependency not found: ${depId}`);
        }
      }
    }
    
    // Check conflicts
    if (deps.conflicts) {
      for (const conflictId of deps.conflicts) {
        if (this.registry.has(conflictId)) {
          throw new Error(`Conflicting plugin detected: ${conflictId}`);
        }
      }
    }
    
    // Check version compatibility
    if (deps.betterAuthVersion) {
      const currentVersion = await this.getBetterAuthVersion();
      if (!semver.satisfies(currentVersion, deps.betterAuthVersion)) {
        throw new Error(`Better-auth version ${currentVersion} does not satisfy ${deps.betterAuthVersion}`);
      }
    }
  }
}
```

## Plugin Loading Strategy

### Dependency Resolution
```typescript
class DependencyResolver {
  resolve(plugins: Map<string, CFAuthPlugin>): string[] {
    const graph = new Map<string, string[]>();
    const inDegree = new Map<string, number>();
    
    // Build dependency graph
    for (const [id, plugin] of plugins) {
      graph.set(id, plugin.dependencies?.required || []);
      inDegree.set(id, 0);
    }
    
    // Calculate in-degrees
    for (const [id, deps] of graph) {
      for (const dep of deps) {
        inDegree.set(dep, (inDegree.get(dep) || 0) + 1);
      }
    }
    
    // Topological sort
    const queue: string[] = [];
    const result: string[] = [];
    
    for (const [id, degree] of inDegree) {
      if (degree === 0) {
        queue.push(id);
      }
    }
    
    while (queue.length > 0) {
      const current = queue.shift()!;
      result.push(current);
      
      for (const neighbor of graph.get(current) || []) {
        inDegree.set(neighbor, inDegree.get(neighbor)! - 1);
        if (inDegree.get(neighbor) === 0) {
          queue.push(neighbor);
        }
      }
    }
    
    // Check for circular dependencies
    if (result.length !== plugins.size) {
      const remaining = Array.from(plugins.keys()).filter(id => !result.includes(id));
      throw new Error(`Circular dependency detected in plugins: ${remaining.join(', ')}`);
    }
    
    return result;
  }
}
```

### Plugin Loader
```typescript
class PluginLoader {
  private loadedPlugins = new Map<string, LoadedPlugin>();
  private loadOrder: string[] = [];
  
  async loadAll(plugins: Map<string, CFAuthPlugin>): Promise<void> {
    // Resolve load order
    this.loadOrder = this.dependencyResolver.resolve(plugins);
    
    // Load plugins in order
    for (const pluginId of this.loadOrder) {
      await this.loadPlugin(pluginId, plugins.get(pluginId)!);
    }
  }
  
  private async loadPlugin(id: string, plugin: CFAuthPlugin): Promise<void> {
    try {
      this.logger.info(`Loading plugin: ${plugin.meta.name}`);
      
      // Validate configuration
      const config = await this.validateConfig(plugin);
      
      // Create plugin context
      const context = await this.createContext(plugin, config);
      
      // Initialize plugin
      if (plugin.init) {
        await plugin.init(context);
      }
      
      // Register hooks and events
      this.registerHooks(plugin, context);
      this.registerEvents(plugin, context);
      
      // Register API routes
      this.registerAPI(plugin, context);
      
      // Apply database migrations
      await this.applyDatabaseMigrations(plugin);
      
      // Mark as loaded
      this.loadedPlugins.set(id, {
        plugin,
        context,
        loadedAt: new Date(),
        status: 'loaded',
      });
      
      this.logger.info(`Plugin loaded successfully: ${plugin.meta.name}`);
    } catch (error) {
      this.logger.error(`Failed to load plugin ${plugin.meta.name}:`, error);
      throw new PluginLoadError(id, error);
    }
  }
}
```

## Built-in Plugin Examples

### Audit Logging Plugin
```typescript
export const auditLogPlugin = PluginFactory.create({
  meta: {
    id: 'audit-log',
    name: 'Audit Logging',
    version: '1.0.0',
    description: 'Comprehensive audit logging for compliance',
  },
  
  configSchema: z.object({
    enabled: z.boolean().default(true),
    logLevel: z.enum(['minimal', 'standard', 'verbose']).default('standard'),
    retention: z.number().default(2555), // 7 years
    storage: z.enum(['database', 'file', 's3']).default('database'),
  }),
  
  database: {
    migrations: [
      {
        version: 1,
        up: async (db) => {
          await db.schema.createTable('audit_logs', (table) => {
            table.uuid('id').primary();
            table.uuid('user_id').nullable();
            table.string('event_type').notNullable();
            table.string('event_action').notNullable();
            table.jsonb('old_values').nullable();
            table.jsonb('new_values').nullable();
            table.inet('ip_address').nullable();
            table.text('user_agent').nullable();
            table.timestamp('created_at').defaultTo(db.fn.now());
            
            table.index(['user_id', 'created_at']);
            table.index(['event_type', 'created_at']);
          });
        },
        down: async (db) => {
          await db.schema.dropTable('audit_logs');
        },
      },
    ],
  },
  
  hooks: {
    afterSignIn: async (context, pluginContext) => {
      await pluginContext.db.insertAuditLog({
        userId: context.user.id,
        eventType: 'authentication',
        eventAction: 'sign_in',
        ipAddress: context.ip,
        userAgent: context.userAgent,
        metadata: {
          provider: context.provider,
          mfaUsed: context.mfaUsed,
        },
      });
    },
    
    afterUserUpdate: async (context, pluginContext) => {
      await pluginContext.db.insertAuditLog({
        userId: context.user.id,
        eventType: 'user',
        eventAction: 'update',
        oldValues: context.oldValues,
        newValues: context.newValues,
        ipAddress: context.ip,
        userAgent: context.userAgent,
      });
    },
  },
  
  events: {
    'security.threat.detected': async (event, context) => {
      await context.db.insertAuditLog({
        userId: event.userId,
        eventType: 'security',
        eventAction: 'threat_detected',
        metadata: event,
        severity: 'high',
      });
      
      // Send alert
      await context.utils.sendAlert({
        type: 'security',
        severity: 'high',
        message: `Security threat detected: ${event.threatType}`,
        userId: event.userId,
      });
    },
  },
});
```

### Rate Limiting Plugin
```typescript
export const rateLimitPlugin = PluginFactory.create({
  meta: {
    id: 'rate-limit',
    name: 'Rate Limiting',
    version: '1.0.0',
    description: 'Advanced rate limiting with multiple strategies',
  },
  
  configSchema: z.object({
    strategies: z.object({
      perIP: z.object({
        login: z.object({ limit: z.number(), window: z.number() }).default({ limit: 5, window: 900 }),
        api: z.object({ limit: z.number(), window: z.number() }).default({ limit: 1000, window: 3600 }),
      }),
      perUser: z.object({
        api: z.object({ limit: z.number(), window: z.number() }).default({ limit: 10000, window: 3600 }),
      }),
    }),
    storage: z.enum(['memory', 'redis']).default('redis'),
    blockDuration: z.number().default(3600),
  }),
  
  dependencies: {
    optional: ['redis'],
  },
  
  init: async (context) => {
    // Initialize rate limiter
    const storage = context.config.storage === 'redis' 
      ? new RedisRateLimitStorage(context.cache)
      : new MemoryRateLimitStorage();
      
    context.rateLimiter = new RateLimiter(storage, context.config.strategies);
  },
  
  api: {
    middleware: [
      {
        name: 'rate-limit',
        handler: async (req, res, next, context) => {
          const key = `${req.ip}:${req.route?.path || 'unknown'}`;
          const allowed = await context.rateLimiter.checkLimit(key, 'api');
          
          if (!allowed) {
            return res.status(429).json({
              error: 'Rate limit exceeded',
              retryAfter: await context.rateLimiter.getRetryAfter(key),
            });
          }
          
          next();
        },
      },
    ],
  },
  
  hooks: {
    beforeSignIn: async (context, pluginContext) => {
      const key = `login:${context.ip}`;
      const allowed = await pluginContext.rateLimiter.checkLimit(key, 'login');
      
      if (!allowed) {
        throw new RateLimitError('Too many login attempts');
      }
    },
  },
});
```

### Organization Management Plugin
```typescript
export const organizationPlugin = PluginFactory.create({
  meta: {
    id: 'organizations',
    name: 'Organization Management',
    version: '1.0.0',
    description: 'Multi-tenant organization and team management',
  },
  
  configSchema: z.object({
    features: z.object({
      teams: z.boolean().default(true),
      invitations: z.boolean().default(true),
      billing: z.boolean().default(false),
      sso: z.boolean().default(false),
    }),
    limits: z.object({
      maxMembers: z.number().default(100),
      maxTeams: z.number().default(10),
    }),
  }),
  
  database: {
    migrations: [
      // Organization tables migration
      {
        version: 1,
        up: async (db) => {
          await db.schema.createTable('organizations', (table) => {
            table.uuid('id').primary();
            table.string('slug').unique().notNullable();
            table.string('name').notNullable();
            table.text('description').nullable();
            table.jsonb('settings').defaultTo('{}');
            table.timestamp('created_at').defaultTo(db.fn.now());
            table.timestamp('updated_at').defaultTo(db.fn.now());
          });
          
          await db.schema.createTable('organization_members', (table) => {
            table.uuid('id').primary();
            table.uuid('organization_id').references('organizations.id').onDelete('CASCADE');
            table.uuid('user_id').references('users.id').onDelete('CASCADE');
            table.string('role').defaultTo('member');
            table.jsonb('permissions').defaultTo('[]');
            table.timestamp('created_at').defaultTo(db.fn.now());
            
            table.unique(['organization_id', 'user_id']);
          });
        },
      },
    ],
  },
  
  api: {
    routes: [
      {
        method: 'GET',
        path: '/api/organizations',
        handler: async (req, res, context) => {
          const organizations = await context.db.getUserOrganizations(req.user.id);
          res.json({ data: organizations });
        },
        middleware: ['auth'],
      },
      {
        method: 'POST',
        path: '/api/organizations',
        handler: async (req, res, context) => {
          const org = await context.db.createOrganization(req.body, req.user.id);
          res.status(201).json({ data: org });
        },
        middleware: ['auth', 'validate:createOrganization'],
      },
    ],
  },
  
  hooks: {
    afterUserCreate: async (context, pluginContext) => {
      // Create personal organization for new user
      if (pluginContext.config.features.personalOrg) {
        await pluginContext.db.createOrganization({
          slug: `user-${context.user.id}`,
          name: `${context.user.name}'s Organization`,
          ownerId: context.user.id,
          type: 'personal',
        });
      }
    },
  },
  
  events: {
    'org.member.added': async (event, context) => {
      // Send welcome email
      await context.utils.sendEmail({
        to: event.userEmail,
        template: 'organization-welcome',
        data: {
          organizationName: event.organizationName,
          inviterName: event.inviterName,
        },
      });
    },
  },
});
```

## Plugin Development Guide

### Creating a Custom Plugin

#### 1. Plugin Structure
```
my-custom-plugin/
├── plugin.json          # Plugin manifest
├── index.ts            # Main plugin file
├── config.ts           # Configuration schema
├── hooks.ts            # Hook implementations
├── events.ts           # Event handlers
├── api.ts              # API routes
├── migrations/         # Database migrations
│   ├── 001_initial.ts
│   └── 002_add_feature.ts
├── ui/                 # UI components (optional)
│   ├── components/
│   └── pages/
├── tests/              # Plugin tests
└── README.md           # Plugin documentation
```

#### 2. Plugin Manifest (plugin.json)
```json
{
  "name": "My Custom Plugin",
  "version": "1.0.0",
  "main": "index.js",
  "description": "Custom authentication plugin",
  "author": "Your Name",
  "license": "MIT",
  "tags": ["authentication", "custom"],
  "dependencies": {
    "required": ["audit-log"],
    "optional": ["organizations"],
    "betterAuthVersion": "^0.25.0",
    "nodeVersion": ">=18.0.0"
  },
  "permissions": [
    "database:read",
    "database:write",
    "email:send",
    "http:request"
  ],
  "config": {
    "enabled": true,
    "feature1": "default-value"
  }
}
```

#### 3. Plugin Implementation
```typescript
// index.ts
import { PluginFactory } from '@cf-auth/core';
import { configSchema } from './config';
import { hooks } from './hooks';
import { events } from './events';
import { api } from './api';

export default PluginFactory.create({
  meta: {
    id: 'my-custom-plugin',
    name: 'My Custom Plugin',
    version: '1.0.0',
    description: 'Custom authentication plugin',
  },
  
  configSchema,
  
  dependencies: {
    required: ['audit-log'],
    optional: ['organizations'],
  },
  
  async init(context) {
    // Plugin initialization
    context.logger.info('Initializing My Custom Plugin');
    
    // Set up plugin-specific services
    context.customService = new CustomService(context.config);
    
    // Register custom middleware
    context.auth.use(this.customMiddleware);
  },
  
  hooks,
  events,
  api,
  
  customMiddleware: (req, res, next) => {
    // Custom request processing
    req.customFeature = true;
    next();
  },
});
```

### Plugin Testing
```typescript
// tests/plugin.test.ts
import { createTestContext } from '@cf-auth/testing';
import myPlugin from '../index';

describe('My Custom Plugin', () => {
  let context: PluginContext;
  
  beforeEach(async () => {
    context = await createTestContext({
      plugins: [myPlugin],
      config: {
        'my-custom-plugin': {
          enabled: true,
          feature1: 'test-value',
        },
      },
    });
  });
  
  it('should initialize correctly', async () => {
    expect(context.plugins.isEnabled('my-custom-plugin')).toBe(true);
  });
  
  it('should handle custom events', async () => {
    const spy = jest.spyOn(context.logger, 'info');
    
    await context.events.emit('custom.event', { data: 'test' });
    
    expect(spy).toHaveBeenCalledWith('Custom event received');
  });
});
```

## Plugin Security

### Sandboxing
```typescript
class PluginSandbox {
  private vm: VM;
  
  constructor(plugin: CFAuthPlugin) {
    this.vm = new VM({
      timeout: 5000, // 5 second timeout
      sandbox: this.createSandbox(plugin),
    });
  }
  
  private createSandbox(plugin: CFAuthPlugin) {
    return {
      // Safe globals
      console: this.createSafeConsole(),
      Buffer,
      process: {
        env: this.filterEnvVars(plugin.permissions),
      },
      
      // Plugin context
      context: this.createPluginContext(plugin),
      
      // Restricted APIs
      require: this.createSafeRequire(plugin.permissions),
      
      // No access to file system, network, etc.
      fs: undefined,
      http: undefined,
      https: undefined,
      net: undefined,
    };
  }
  
  execute(code: string): any {
    try {
      return this.vm.run(code);
    } catch (error) {
      throw new PluginSecurityError(`Plugin execution failed: ${error.message}`);
    }
  }
}
```

### Permission System
```typescript
interface PluginPermissions {
  'database:read': boolean;
  'database:write': boolean;
  'database:admin': boolean;
  'email:send': boolean;
  'sms:send': boolean;
  'http:request': boolean;
  'file:read': boolean;
  'file:write': boolean;
  'user:read': boolean;
  'user:write': boolean;
  'user:admin': boolean;
  'org:read': boolean;
  'org:write': boolean;
  'org:admin': boolean;
  'system:config': boolean;
  'system:monitoring': boolean;
}

class PermissionChecker {
  checkPermission(plugin: CFAuthPlugin, permission: keyof PluginPermissions): boolean {
    const manifest = plugin.manifest;
    return manifest.permissions?.includes(permission) || false;
  }
  
  enforcePermission(plugin: CFAuthPlugin, permission: keyof PluginPermissions): void {
    if (!this.checkPermission(plugin, permission)) {
      throw new PluginPermissionError(
        `Plugin ${plugin.meta.id} lacks permission: ${permission}`
      );
    }
  }
}
```

## Plugin Manager

### Plugin Lifecycle Management
```typescript
class PluginManager {
  private plugins = new Map<string, LoadedPlugin>();
  private status: 'initializing' | 'ready' | 'stopping' | 'stopped' = 'initializing';
  
  async initialize(pluginConfigs: PluginConfig[]): Promise<void> {
    try {
      // Discover plugins
      await this.registry.discoverPlugins(this.pluginPaths);
      
      // Load enabled plugins
      const enabledPlugins = pluginConfigs
        .filter(config => config.enabled)
        .map(config => this.registry.get(config.id))
        .filter(Boolean);
      
      // Resolve dependencies and load
      await this.loader.loadAll(new Map(enabledPlugins.map(p => [p.meta.id, p])));
      
      // Start all plugins
      await this.startAll();
      
      this.status = 'ready';
      this.logger.info('Plugin system ready');
    } catch (error) {
      this.logger.error('Plugin system initialization failed:', error);
      throw error;
    }
  }
  
  async shutdown(): Promise<void> {
    this.status = 'stopping';
    
    // Stop plugins in reverse order
    const stopOrder = [...this.loader.loadOrder].reverse();
    
    for (const pluginId of stopOrder) {
      const loaded = this.plugins.get(pluginId);
      if (loaded?.plugin.stop) {
        try {
          await loaded.plugin.stop(loaded.context);
        } catch (error) {
          this.logger.error(`Failed to stop plugin ${pluginId}:`, error);
        }
      }
    }
    
    this.status = 'stopped';
    this.logger.info('Plugin system stopped');
  }
  
  async reloadPlugin(pluginId: string): Promise<void> {
    // Stop plugin
    const loaded = this.plugins.get(pluginId);
    if (loaded?.plugin.stop) {
      await loaded.plugin.stop(loaded.context);
    }
    
    // Unregister hooks and events
    this.hookManager.unregister(pluginId);
    this.eventManager.unregister(pluginId);
    
    // Reload plugin
    await this.loader.reloadPlugin(pluginId);
    
    // Restart plugin
    const reloaded = this.plugins.get(pluginId);
    if (reloaded?.plugin.start) {
      await reloaded.plugin.start(reloaded.context);
    }
  }
}
```

This comprehensive plugin system provides a powerful, secure, and flexible foundation for extending CF-Better-Auth's functionality while maintaining complete compatibility with better-auth and ensuring enterprise-grade security and reliability.
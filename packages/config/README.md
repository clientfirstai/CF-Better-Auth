# @cf-auth/config

Comprehensive configuration management system for the CF-Better-Auth ecosystem. This package provides powerful configuration loading, validation, and management capabilities with support for multiple sources, formats, and deployment scenarios.

## Features

- 🔧 **Multi-source Configuration**: Load from files, environment variables, remote services, and secret stores
- 📝 **Multiple Formats**: JSON, YAML, TOML, environment files, and TypeScript/JavaScript modules
- ✅ **Schema Validation**: Zod-based validation with detailed error reporting
- 🔄 **Variable Interpolation**: Environment variable substitution with custom resolvers
- 📦 **Configuration Presets**: Pre-built configurations for different environments and platforms
- 🔥 **Hot Reloading**: Watch for configuration changes and reload automatically
- 🛡️ **Security Features**: Encrypted secrets, secure defaults, and validation
- 🏗️ **Builder Pattern**: Fluent API for programmatic configuration building
- 🔍 **Type Safety**: Full TypeScript support with comprehensive type definitions
- 📊 **Configuration Management**: Runtime configuration updates and snapshots

## Installation

```bash
npm install @cf-auth/config
# or
yarn add @cf-auth/config
# or
pnpm add @cf-auth/config
```

## Quick Start

### Basic Usage

```typescript
import { ConfigManager, createAppConfigForEnvironment } from '@cf-auth/config';

// Create configuration manager
const configManager = new ConfigManager();

// Load configuration from multiple sources
await configManager.load({
  sources: [
    { type: 'environment', priority: 1 },
    { type: 'file', path: './config.json', priority: 2 },
    { type: 'preset', path: 'development', priority: 3 }
  ],
  watch: true,
  autoReload: true
});

// Access configuration
const config = configManager.config;
console.log(`Server running on ${config.server.host}:${config.server.port}`);

// Watch for changes
configManager.watch((changes) => {
  console.log('Configuration changed:', changes);
});
```

### Schema Validation

```typescript
import { AppConfigSchema, validateAppConfig } from '@cf-auth/config/schemas';
import { z } from 'zod';

// Validate configuration
try {
  const config = validateAppConfig({
    name: 'My Auth App',
    environment: 'production',
    server: {
      port: 8000,
      host: '0.0.0.0'
    }
  });
  
  console.log('Configuration is valid:', config);
} catch (error) {
  if (error instanceof z.ZodError) {
    console.error('Validation errors:', error.errors);
  }
}
```

### Configuration Builder

```typescript
import { ConfigBuilder } from '@cf-auth/config';

const config = new ConfigBuilder()
  .preset('production')
  .set('app.name', 'My Auth Service')
  .set('server.port', 8080)
  .merge({
    database: {
      url: process.env.DATABASE_URL
    }
  })
  .transform(config => ({
    ...config,
    computedValue: config.server.port * 2
  }))
  .buildSafe();

if (config.success) {
  console.log('Built configuration:', config.data);
} else {
  console.error('Configuration errors:', config.errors);
}
```

### Variable Interpolation

```typescript
import { interpolateConfig } from '@cf-auth/config';

const config = {
  database: {
    host: '${DB_HOST}',
    port: '${DB_PORT:5432}', // with default value
    url: '${env:DATABASE_URL}' // explicit env resolver
  },
  app: {
    name: '${config:metadata.appName}', // reference other config values
    version: '${fs:VERSION}' // read from file
  }
};

const interpolated = await interpolateConfig(config, {
  enabled: true,
  allowUndefined: false,
  defaults: {
    DB_HOST: 'localhost'
  }
});

console.log('Interpolated config:', interpolated);
```

## Configuration Sources

### File-based Configuration

```typescript
// Load from JSON file
const config = await fileLoader.load('./config.json');

// Load from YAML file
const config = await fileLoader.load('./config.yaml');

// Load environment-specific configuration
const config = await fileLoader.load('./config.production.json');
```

### Environment Variables

```typescript
import { EnvLoader } from '@cf-auth/config/loaders';

const envLoader = new EnvLoader();

// Load all CF_AUTH_* environment variables
const config = await envLoader.load();

// Load with custom prefix
const config = await envLoader.load({
  prefix: 'MYAPP_',
  transform: true // convert to camelCase
});
```

### Remote Configuration

```typescript
import { RemoteLoader } from '@cf-auth/config/loaders';

const remoteLoader = new RemoteLoader({
  url: 'https://config.example.com/api/config',
  auth: {
    type: 'bearer',
    credentials: { token: process.env.CONFIG_TOKEN }
  },
  pollInterval: 30000, // Check for updates every 30 seconds
  retry: {
    attempts: 3,
    delay: 1000
  }
});

const config = await remoteLoader.load();
```

### Secret Stores

```typescript
// HashiCorp Vault
import { VaultLoader } from '@cf-auth/config/loaders';

const vaultLoader = new VaultLoader({
  endpoint: 'https://vault.example.com',
  token: process.env.VAULT_TOKEN,
  path: 'secret/myapp'
});

// AWS Secrets Manager
import { AWSSecretsLoader } from '@cf-auth/config/loaders';

const awsLoader = new AWSSecretsLoader({
  region: 'us-east-1',
  secretName: 'myapp/config'
});

// Azure Key Vault
import { AzureKeyVaultLoader } from '@cf-auth/config/loaders';

const azureLoader = new AzureKeyVaultLoader({
  vaultUrl: 'https://myvault.vault.azure.net/',
  credential: new DefaultAzureCredential()
});
```

## Configuration Schemas

### Application Schema

```typescript
import { AppConfigSchema } from '@cf-auth/config/schemas';

const config = AppConfigSchema.parse({
  name: 'My Auth App',
  environment: 'production',
  debug: false,
  server: {
    host: '0.0.0.0',
    port: 8000,
    baseUrl: 'https://api.example.com'
  },
  cors: {
    origin: ['https://app.example.com'],
    credentials: true
  },
  rateLimit: {
    windowMs: 900000, // 15 minutes
    max: 100
  }
});
```

### Database Schema

```typescript
import { DatabaseConfigSchema } from '@cf-auth/config/schemas';

const dbConfig = DatabaseConfigSchema.parse({
  provider: 'postgresql',
  url: 'postgresql://user:pass@localhost:5432/myapp',
  pool: {
    min: 2,
    max: 10
  },
  ssl: {
    enabled: true,
    rejectUnauthorized: false
  }
});
```

### Authentication Schema

```typescript
import { AuthConfigSchema } from '@cf-auth/config/schemas';

const authConfig = AuthConfigSchema.parse({
  session: {
    duration: 86400000, // 24 hours
    secret: process.env.SESSION_SECRET
  },
  jwt: {
    secret: process.env.JWT_SECRET,
    expiresIn: '1h'
  },
  social: {
    google: {
      clientId: process.env.GOOGLE_CLIENT_ID,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET
    }
  }
});
```

## Configuration Presets

### Built-in Presets

```typescript
import { developmentPreset, productionPreset, dockerPreset } from '@cf-auth/config/presets';

// Development preset
const devConfig = developmentPreset({
  database: {
    url: 'postgresql://localhost:5432/myapp_dev'
  }
});

// Production preset
const prodConfig = productionPreset({
  server: {
    host: '0.0.0.0',
    port: parseInt(process.env.PORT || '8000')
  }
});

// Docker preset
const dockerConfig = dockerPreset({
  database: {
    host: 'postgres',
    port: 5432
  }
});
```

### Custom Presets

```typescript
import { createConfigPreset } from '@cf-auth/config';

const customPreset = createConfigPreset({
  name: 'microservice',
  description: 'Configuration for microservice deployment',
  config: {
    server: {
      port: 3000,
      compression: { enabled: true }
    },
    logging: {
      level: 'info',
      format: 'json'
    },
    metrics: {
      enabled: true,
      path: '/metrics'
    }
  },
  condition: {
    environment: ['production', 'staging']
  }
});
```

## Advanced Features

### Hot Reloading

```typescript
import { ConfigWatcher } from '@cf-auth/config';

const watcher = new ConfigWatcher();

// Watch configuration files
await watcher.start();
watcher.add('./config.json');
watcher.add('./config.local.json');

watcher.on('change', async (filePath) => {
  console.log(`Configuration file changed: ${filePath}`);
  
  // Reload configuration
  await configManager.reload();
});
```

### Configuration Migration

```typescript
import { MigrationManager } from '@cf-auth/config';

const migrationManager = new MigrationManager();

// Define migration
migrationManager.addMigration({
  version: '2.0.0',
  description: 'Move server config to app.server',
  up: (config) => ({
    ...config,
    app: {
      ...config.app,
      server: config.server
    }
  }),
  down: (config) => ({
    ...config,
    server: config.app?.server
  })
});

// Run migrations
const migratedConfig = await migrationManager.migrate(config, '2.0.0');
```

### Configuration Encryption

```typescript
import { ConfigManager } from '@cf-auth/config';

const configManager = new ConfigManager({
  encryption: {
    enabled: true,
    key: process.env.CONFIG_ENCRYPTION_KEY,
    encrypt: ['database.password', 'jwt.secret'],
    decrypt: ['database.password', 'jwt.secret']
  }
});
```

### Configuration Snapshots

```typescript
// Create snapshot
const snapshot = configManager.snapshot();

// Make changes
configManager.set('server.port', 9000);

// Restore from snapshot
configManager.restore(snapshot);
```

## Environment Variables

The package automatically maps environment variables to configuration paths:

| Environment Variable | Configuration Path | Description |
|---------------------|-------------------|-------------|
| `CF_AUTH_APP_NAME` | `app.name` | Application name |
| `CF_AUTH_APP_PORT` | `app.port` | Server port |
| `CF_AUTH_DB_URL` | `database.url` | Database URL |
| `CF_AUTH_JWT_SECRET` | `security.jwt.secret` | JWT secret |
| `CF_AUTH_SESSION_SECRET` | `session.secret` | Session secret |
| `CF_AUTH_GOOGLE_CLIENT_ID` | `auth.social.google.clientId` | Google OAuth client ID |

### Custom Environment Mapping

```typescript
import { ENV_VAR_MAPPING } from '@cf-auth/config';

// Add custom mapping
ENV_VAR_MAPPING['MY_CUSTOM_VAR'] = 'custom.setting';

// Use in configuration
const config = await envLoader.load({
  mapping: ENV_VAR_MAPPING
});
```

## Configuration Validation

### Built-in Validation

```typescript
import { validateAppConfig, isConfigValidationError } from '@cf-auth/config';

try {
  const config = validateAppConfig(rawConfig);
  console.log('Configuration is valid');
} catch (error) {
  if (isConfigValidationError(error)) {
    console.error('Validation failed:');
    error.validationErrors.forEach(err => {
      console.error(`  ${err.path.join('.')}: ${err.message}`);
    });
  }
}
```

### Custom Validation Rules

```typescript
import { ConfigValidator } from '@cf-auth/config';

const validator = new ConfigValidator(AppConfigSchema);

// Add custom validation rule
validator.addRule({
  name: 'portRange',
  validate: (value, path) => {
    if (path.includes('port') && typeof value === 'number') {
      if (value < 1024 || value > 65535) {
        return {
          success: false,
          message: 'Port must be between 1024 and 65535'
        };
      }
    }
    return { success: true };
  }
});

const result = validator.validate(config);
```

## Error Handling

```typescript
import { 
  ConfigError,
  ConfigFileNotFoundError,
  ConfigValidationError,
  MissingEnvironmentVariableError,
  formatConfigError
} from '@cf-auth/config';

try {
  const config = await configManager.load();
} catch (error) {
  if (error instanceof ConfigFileNotFoundError) {
    console.error('Configuration file not found:', error.context.filePath);
  } else if (error instanceof ConfigValidationError) {
    console.error('Configuration validation failed:');
    console.error(error.formatErrors());
  } else if (error instanceof MissingEnvironmentVariableError) {
    console.error('Missing environment variable:', error.context.variableName);
  } else if (error instanceof ConfigError) {
    console.error('Configuration error:');
    console.error(formatConfigError(error));
  }
}
```

## TypeScript Support

The package provides comprehensive TypeScript definitions:

```typescript
import type {
  CFAuthConfig,
  ConfigManager,
  ConfigBuilder,
  ConfigLoader,
  ConfigValidationResult,
  InterpolationOptions
} from '@cf-auth/config';

// Type-safe configuration access
const config: CFAuthConfig = await configManager.load();

// Type-safe builder
const builder: ConfigBuilder<CFAuthConfig> = new ConfigBuilder();

// Custom configuration types
interface MyCustomConfig extends CFAuthConfig {
  custom: {
    feature: boolean;
    setting: string;
  };
}

const customConfig: MyCustomConfig = await configManager.load();
```

## Examples

Complete examples are available in the `examples/` directory:

- [Basic Configuration](./examples/basic.example.ts)
- [Multi-source Loading](./examples/multi-source.example.ts)
- [Custom Schema](./examples/custom-schema.example.ts)
- [Environment-specific](./examples/environment.example.ts)
- [Docker Deployment](./examples/docker.example.ts)
- [Kubernetes Deployment](./examples/kubernetes.example.ts)

## API Reference

### ConfigManager

The main configuration management class.

```typescript
class ConfigManager<T = CFAuthConfig> {
  load(options?: ConfigManagerOptions): Promise<void>
  reload(): Promise<void>
  watch(callback: ConfigChangeCallback<T>): ConfigWatcher
  get<K extends keyof T>(key: K): T[K]
  set<K extends keyof T>(key: K, value: T[K]): void
  validate(): ConfigValidationResult<T>
  snapshot(): ConfigSnapshot<T>
  restore(snapshot: ConfigSnapshot<T>): void
}
```

### ConfigBuilder

Fluent API for building configurations.

```typescript
class ConfigBuilder<T = CFAuthConfig> {
  set<K extends keyof T>(key: K, value: T[K]): ConfigBuilder<T>
  merge(config: DeepPartial<T>): ConfigBuilder<T>
  preset(name: string): ConfigBuilder<T>
  transform(transformer: ConfigTransform<T>): ConfigBuilder<T>
  build(): T
  buildSafe(): ConfigValidationResult<T>
}
```

### ConfigValidator

Configuration validation with Zod schemas.

```typescript
class ConfigValidator<T = CFAuthConfig> {
  validate(config: unknown): ConfigValidationResult<T>
  validatePartial(config: unknown): ConfigValidationResult<DeepPartial<T>>
  addRule(rule: ValidationRule): void
  removeRule(name: string): void
}
```

### ConfigInterpolator

Variable interpolation engine.

```typescript
class ConfigInterpolator {
  interpolate<T extends ConfigObject>(config: T): Promise<T>
  addResolver(name: string, resolver: VariableResolver): void
  removeResolver(name: string): boolean
}
```

## Contributing

1. Fork the repository
2. Create a feature branch: `git checkout -b feature/new-feature`
3. Make changes and add tests
4. Run tests: `npm test`
5. Run linting: `npm run lint`
6. Commit changes: `git commit -am 'Add new feature'`
7. Push to branch: `git push origin feature/new-feature`
8. Submit a pull request

## License

MIT License - see [LICENSE](LICENSE) file for details.

## Support

- 📚 [Documentation](https://cf-auth.dev/docs/config)
- 💬 [Discord Community](https://discord.gg/cf-auth)
- 🐛 [Issue Tracker](https://github.com/cf-auth/cf-better-auth/issues)
- 📧 [Email Support](mailto:support@cf-auth.dev)
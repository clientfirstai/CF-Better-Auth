# @cf-auth/utils

Comprehensive utility functions for the CF-Better-Auth ecosystem. This package provides production-ready utilities for authentication, validation, cryptography, HTTP handling, logging, and more.

## Installation

```bash
npm install @cf-auth/utils
# or
yarn add @cf-auth/utils
# or
pnpm add @cf-auth/utils
```

## Features

- 🔐 **Cryptography**: Argon2 password hashing, AES encryption, secure token generation
- ✅ **Validation**: Email, password, phone, URL validation with comprehensive feedback
- 🌐 **HTTP**: Type-safe HTTP client with retry logic and interceptors
- 🎫 **JWT**: Secure JWT handling with the jose library
- 💾 **Storage**: Caching and storage abstractions with multiple backends
- 📅 **Formatting**: Date, number, currency, and file size formatting
- 🛡️ **Security**: CSRF protection, rate limiting, security headers
- ⚡ **Async**: Retry logic, debouncing, throttling, queue management
- 📝 **Logging**: Structured logging with multiple transports
- 🚨 **Errors**: Comprehensive error handling and reporting
- 📡 **Events**: Event emitter and pub/sub system
- 🛡️ **Guards**: Runtime type checking and assertions
- 🔄 **Transformers**: Data transformation and conversion utilities

## Quick Start

```typescript
import { 
  hashPassword, 
  validateEmail, 
  createJWT, 
  logger 
} from '@cf-auth/utils';

// Hash a password
const hashedPassword = await hashPassword('userPassword123!');

// Validate an email
const emailResult = validateEmail('user@example.com');
if (emailResult.isValid) {
  console.log('Valid email:', emailResult.normalized);
}

// Create a JWT
const token = await createJWT('your-secret', {
  uid: 'user-123',
  email: 'user@example.com'
});

// Log structured data
logger.info('User logged in', { userId: 'user-123' });
```

## Tree-Shaking Support

Import only what you need for optimal bundle size:

```typescript
// Import specific modules
import { hashPassword } from '@cf-auth/utils/crypto';
import { validateEmail } from '@cf-auth/utils/validation';
import { HTTPClient } from '@cf-auth/utils/http';

// Or import from specific modules
import * as crypto from '@cf-auth/utils/crypto';
import * as validation from '@cf-auth/utils/validation';
```

## Modules

### Cryptography (`@cf-auth/utils/crypto`)

Secure cryptographic operations using industry standards.

```typescript
import { 
  hashPassword, 
  verifyPassword, 
  generateSecureToken,
  encryptData,
  decryptData 
} from '@cf-auth/utils/crypto';

// Password hashing with Argon2
const hash = await hashPassword('password123');
const isValid = await verifyPassword('password123', hash);

// Secure token generation
const token = generateSecureToken({ length: 32, prefix: 'auth_' });

// AES encryption
const key = await generateEncryptionKey();
const encrypted = await encryptData('sensitive data', key);
const decrypted = await decryptData(encrypted.encrypted, key, {
  iv: encrypted.iv,
  authTag: encrypted.authTag
});
```

### Validation (`@cf-auth/utils/validation`)

Comprehensive validation with detailed feedback.

```typescript
import { 
  validateEmail, 
  validatePassword, 
  validatePhone,
  validateURL 
} from '@cf-auth/utils/validation';

// Email validation
const emailResult = validateEmail('user@example.com');
console.log(emailResult.isValid); // true
console.log(emailResult.normalized); // 'user@example.com'

// Password validation with strength checking
const passwordResult = validatePassword('MySecure123!');
console.log(passwordResult.score); // 0-5
console.log(passwordResult.feedback); // ['Password meets requirements']

// Phone number validation
const phoneResult = validatePhone('+1-555-123-4567');
console.log(phoneResult.normalized); // '+15551234567'
```

### HTTP (`@cf-auth/utils/http`)

Type-safe HTTP client with advanced features.

```typescript
import { HTTPClient, get, post } from '@cf-auth/utils/http';

// Simple requests
const response = await get('https://api.example.com/users');
const created = await post('https://api.example.com/users', { name: 'John' });

// Advanced client
const client = new HTTPClient({
  baseURL: 'https://api.example.com',
  headers: { 'Authorization': 'Bearer token' },
  timeout: 5000
});

client.addRequestInterceptor(async (options) => {
  options.headers = { ...options.headers, 'X-Timestamp': Date.now() };
  return options;
});

const users = await client.get('/users');
```

### JWT (`@cf-auth/utils/jwt`)

Secure JWT handling using the jose library.

```typescript
import { JWTManager, createJWT, verifyJWT } from '@cf-auth/utils/jwt';

// Simple JWT operations
const token = await createJWT('secret', { uid: 'user-123' });
const result = await verifyJWT('secret', token);

// Advanced JWT management
const manager = new JWTManager({
  secret: 'your-secret',
  issuer: 'cf-auth',
  audience: 'your-app'
});

const { token } = await manager.createToken({
  uid: 'user-123',
  email: 'user@example.com'
}, { type: 'access', expiresIn: 3600 });

const verification = await manager.verifyToken(token);
if (verification.valid) {
  console.log('User ID:', verification.payload.uid);
}
```

### Storage (`@cf-auth/utils/storage`)

Flexible storage with multiple backends.

```typescript
import { 
  createCache, 
  createMemoryStorage, 
  createLocalStorage 
} from '@cf-auth/utils/storage';

// Simple cache
const cache = createCache();
await cache.set('key', 'value', 300); // 5 minutes TTL
const value = await cache.get('key');

// Memory storage
const storage = createMemoryStorage();
await storage.set('user:123', userData);

// Local storage (browser)
const localStorage = createLocalStorage({ prefix: 'myapp:' });
await localStorage.set('settings', userSettings);
```

### Formatting (`@cf-auth/utils/formatting`)

Comprehensive data formatting.

```typescript
import { 
  formatDate, 
  formatCurrency, 
  formatFileSize,
  formatDuration 
} from '@cf-auth/utils/formatting';

// Date formatting
const date = formatDate(new Date(), { 
  dateStyle: 'medium', 
  timeStyle: 'short' 
});

// Currency formatting
const price = formatCurrency(1234.56, 'USD'); // '$1,234.56'

// File size formatting
const size = formatFileSize(1536); // '1.5 KB'

// Duration formatting
const duration = formatDuration(90000); // '1 minute 30 seconds'
```

### Security (`@cf-auth/utils/security`)

Security utilities and protections.

```typescript
import { 
  CSRFProtection, 
  RateLimiter, 
  getSecurityHeaders 
} from '@cf-auth/utils/security';

// CSRF protection
const csrf = new CSRFProtection();
const token = csrf.generateToken('session-id');
const isValid = csrf.verifyToken(token);

// Rate limiting
const limiter = new RateLimiter(60000, 10); // 10 requests per minute
if (limiter.isAllowed('user-ip')) {
  // Process request
}

// Security headers
const headers = getSecurityHeaders();
```

### Async (`@cf-auth/utils/async`)

Async control flow utilities.

```typescript
import { 
  retry, 
  debounce, 
  throttle, 
  AsyncQueue 
} from '@cf-auth/utils/async';

// Retry with exponential backoff
const result = await retry(
  () => apiCall(),
  { maxAttempts: 3, delay: 1000, backoff: 2 }
);

// Debounce function
const debouncedSave = debounce(saveData, { delay: 300 });

// Queue management
const queue = new AsyncQueue({ concurrency: 3 });
await queue.add(() => processItem(item));
```

### Logging (`@cf-auth/utils/logger`)

Structured logging with multiple outputs.

```typescript
import { logger, createLogger, JSONTransport } from '@cf-auth/utils/logger';

// Simple logging
logger.info('User logged in', { userId: 'user-123' });
logger.error('Login failed', { email: 'user@example.com' }, error);

// Custom logger
const appLogger = createLogger({
  name: 'myapp',
  level: 'debug',
  transports: [
    new JSONTransport(),
    new FileTransport('./logs/app.log')
  ]
});

// Performance timing
const timer = appLogger.time('database-query');
await performQuery();
timer.end('Query completed');
```

### Error Handling (`@cf-auth/utils/errors`)

Comprehensive error management.

```typescript
import { 
  CFAuthError, 
  ValidationError, 
  ErrorFactory 
} from '@cf-auth/utils/errors';

// Custom errors
throw new ValidationError('Invalid email format', {
  code: 'INVALID_EMAIL',
  context: { email: 'invalid-email' }
});

// Error factory
const error = ErrorFactory.create(
  'AUTHENTICATION_ERROR',
  'Invalid credentials'
);

// Error wrapping
const wrapped = ErrorFactory.wrap(existingError, {
  context: { userId: 'user-123' }
});
```

### Events (`@cf-auth/utils/events`)

Event system with pub/sub.

```typescript
import { EventEmitter, pubsub } from '@cf-auth/utils/events';

// Event emitter
const emitter = new EventEmitter();
emitter.on('user:login', (event) => {
  console.log('User logged in:', event.data);
});
emitter.emit('user:login', { userId: 'user-123' });

// Pub/Sub
pubsub.subscribe('notifications', 'subscriber-1', (event) => {
  console.log('Notification:', event.data);
});
pubsub.publish('notifications', { message: 'Hello World' });
```

### Type Guards (`@cf-auth/utils/guards`)

Runtime type checking and assertions.

```typescript
import { 
  isString, 
  isEmail, 
  assertUser, 
  hasProperties 
} from '@cf-auth/utils/guards';

// Type guards
if (isString(value)) {
  // value is now typed as string
}

if (isEmail(input)) {
  // input is a valid email string
}

// Assertions
assertUser(userData); // throws if not a valid User object

// Property checking
if (hasProperties(obj, ['id', 'name'])) {
  // obj has id and name properties
}
```

### Transformers (`@cf-auth/utils/transformers`)

Data transformation utilities.

```typescript
import { 
  deepClone, 
  camelToSnake, 
  keysToCamelCase,
  transformToAPI 
} from '@cf-auth/utils/transformers';

// Deep cloning
const cloned = deepClone(complexObject);

// Case transformations
const snakeCase = camelToSnake('camelCaseString'); // 'camel_case_string'
const camelCased = keysToCamelCase(dbRecord);

// API transformations
const apiResponse = transformToAPI(internalObject, {
  exclude: ['internalField'],
  rename: { userId: 'user_id' }
});
```

## TypeScript Support

Full TypeScript support with branded types for enhanced type safety:

```typescript
import type { 
  HashedPassword, 
  ValidatedEmail, 
  JWTToken,
  SecureToken 
} from '@cf-auth/utils';

// Branded types prevent mixing different string types
const email: ValidatedEmail = validateEmail('test@example.com').value;
const token: JWTToken = await createJWT('secret', { sub: 'user' });
```

## Browser Compatibility

- Chrome >= 90
- Firefox >= 88
- Safari >= 14
- Edge >= 90

## Node.js Compatibility

- Node.js >= 16.0.0

## License

MIT

## Contributing

Please see the main CF-Better-Auth repository for contribution guidelines.

## Security

For security issues, please email security@cf-auth.dev instead of using the issue tracker.
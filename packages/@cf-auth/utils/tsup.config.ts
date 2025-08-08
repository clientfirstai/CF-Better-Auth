import { defineConfig } from 'tsup';

export default defineConfig({
  entry: {
    index: 'src/index.ts',
    crypto: 'src/crypto.ts',
    validation: 'src/validation.ts',
    http: 'src/http.ts',
    jwt: 'src/jwt.ts',
    storage: 'src/storage.ts',
    formatting: 'src/formatting.ts',
    security: 'src/security.ts',
    async: 'src/async.ts',
    logger: 'src/logger.ts',
    errors: 'src/errors.ts',
    events: 'src/events.ts',
    guards: 'src/guards.ts',
    transformers: 'src/transformers.ts',
    constants: 'src/constants.ts'
  },
  format: ['cjs', 'esm'],
  dts: true,
  splitting: false,
  sourcemap: true,
  clean: true,
  minify: false,
  target: 'es2022',
  outDir: 'dist',
  // Ensure tree-shaking works properly
  treeshake: true,
  external: [
    'better-auth',
    'jose',
    'argon2',
    'crypto-js',
    'nanoid'
  ]
});
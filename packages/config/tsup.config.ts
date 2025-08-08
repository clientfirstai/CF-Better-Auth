import { defineConfig } from 'tsup';

export default defineConfig({
  entry: [
    'src/index.ts',
    'src/schemas/index.ts',
    'src/presets/index.ts',
    'src/loaders/index.ts'
  ],
  format: ['cjs', 'esm'],
  dts: true,
  clean: true,
  splitting: false,
  sourcemap: true,
  minify: false,
  external: [
    '@cf-auth/types',
    '@cf-auth/utils',
    'better-auth',
    'zod',
    'yaml',
    'dotenv',
    'chokidar',
    'jose',
    'node-vault'
  ],
  outDir: 'dist',
  target: 'node16',
  platform: 'node',
  banner: {
    js: '// @cf-auth/config - Configuration management for CF-Better-Auth'
  },
  esbuildOptions: (options) => {
    options.packages = 'external';
  }
});
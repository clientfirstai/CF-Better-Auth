import { defineConfig } from 'tsup';

export default defineConfig({
  entry: [
    'src/index.ts',
    'src/auth.ts',
    'src/database.ts',
    'src/api.ts',
    'src/plugins.ts',
    'src/config.ts',
    'src/errors.ts',
    'src/events.ts',
    'src/common.ts'
  ],
  format: ['cjs', 'esm'],
  dts: true,
  sourcemap: true,
  clean: true,
  splitting: false,
  treeshake: true,
  minify: false,
  target: 'es2020',
  outDir: 'dist',
  tsconfig: './tsconfig.json',
  external: ['better-auth'],
  noExternal: [],
  banner: {
    js: '// CF-Better-Auth Types - Shared TypeScript type definitions'
  }
});
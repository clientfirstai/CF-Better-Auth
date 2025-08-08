import { defineConfig } from 'tsup';

export default defineConfig({
  entry: ['src/index.ts'],
  format: ['cjs', 'esm'],
  target: 'es2020',
  dts: true,
  clean: true,
  sourcemap: true,
  minify: false,
  splitting: true,
  treeshake: true,
  external: [
    'react',
    'react-dom',
    'better-auth',
    'better-auth/react',
    'better-auth/client',
    'better-auth/client/plugins',
    '@cf-auth/core',
    '@cf-auth/types',
    '@cf-auth/utils',
    '@cf-auth/plugin-interfaces'
  ],
  esbuildOptions: (options) => {
    options.jsx = 'automatic';
    options.jsxDev = false;
  }
});
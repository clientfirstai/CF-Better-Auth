import { defineConfig } from 'tsup';

export default defineConfig({
  entry: [
    'src/index.ts',
    'src/plugins/**/*.ts',
  ],
  format: ['esm', 'cjs'],
  dts: true,
  clean: true,
  sourcemap: true,
  minify: false,
  target: 'node18',
  outDir: 'dist',
  splitting: false,
  external: [
    '@cf-auth/core',
    '@cf-auth/types',
    '@cf-auth/utils',
    'better-auth'
  ],
  banner: {
    js: '"use client";',
  },
});
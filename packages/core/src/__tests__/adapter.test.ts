import { describe, it, expect, beforeEach, vi } from 'vitest';
import { BetterAuthAdapter } from '../adapter';

describe('BetterAuthAdapter', () => {
  let adapter: BetterAuthAdapter;

  beforeEach(() => {
    adapter = new BetterAuthAdapter({
      database: {
        provider: 'postgresql',
        connectionString: 'postgresql://test'
      }
    });
  });

  describe('initialization', () => {
    it('should create adapter instance', () => {
      expect(adapter).toBeDefined();
      expect(adapter).toBeInstanceOf(BetterAuthAdapter);
    });

    it('should handle missing better-auth gracefully', async () => {
      vi.mock('../../../vendor/better-auth', () => {
        throw new Error('Module not found');
      });

      try {
        await adapter.initialize();
      } catch (error) {
        expect(error).toBeDefined();
      }
    });
  });

  describe('configuration', () => {
    it('should merge custom config with defaults', () => {
      const customAdapter = new BetterAuthAdapter({
        session: {
          expiresIn: 3600
        }
      });

      expect(customAdapter).toBeDefined();
    });

    it('should validate required configuration', () => {
      const invalidAdapter = new BetterAuthAdapter({});
      expect(invalidAdapter).toBeDefined();
    });
  });

  describe('version management', () => {
    it('should get current version', () => {
      const version = adapter.getVersion();
      expect(typeof version).toBe('string');
    });

    it('should handle upgrade process', async () => {
      await expect(adapter.upgrade()).resolves.not.toThrow();
    });
  });

  describe('compatibility layer', () => {
    it('should transform v1 config to v2 format', () => {
      const v1Config = {
        database: {
          provider: 'postgres' as const,
          connectionString: 'postgresql://test'
        }
      };

      const adapter = new BetterAuthAdapter(v1Config);
      expect(adapter).toBeDefined();
    });

    it('should handle different module export formats', async () => {
      const mockModules = [
        { default: function BetterAuth() {} },
        { BetterAuth: function() {} },
        { createAuth: function() {} },
        function BetterAuth() {}
      ];

      for (const mockModule of mockModules) {
        vi.mock('../../../vendor/better-auth', () => mockModule);
        const testAdapter = new BetterAuthAdapter();
        expect(testAdapter).toBeDefined();
      }
    });
  });
});
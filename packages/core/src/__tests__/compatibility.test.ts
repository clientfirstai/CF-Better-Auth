import { describe, it, expect } from 'vitest';
import { getCompatibilityLayer } from '../compatibility';

describe('Compatibility Layer', () => {
  let compatibilityLayer: ReturnType<typeof getCompatibilityLayer>;

  beforeEach(() => {
    compatibilityLayer = getCompatibilityLayer();
  });

  describe('config transformation', () => {
    it('should transform database config for v2', () => {
      const v1Config = {
        database: {
          provider: 'postgres' as const,
          connectionString: 'postgresql://localhost'
        }
      };

      const transformed = compatibilityLayer.transformConfig(v1Config);
      expect(transformed).toBeDefined();
      expect(transformed.database).toBeDefined();
    });

    it('should preserve v2 config unchanged', () => {
      const v2Config = {
        database: {
          provider: 'postgresql' as const,
          connectionString: 'postgresql://localhost'
        }
      };

      const transformed = compatibilityLayer.transformConfig(v2Config);
      expect(transformed).toEqual(v2Config);
    });
  });

  describe('module wrapping', () => {
    it('should wrap function modules', () => {
      const module = function BetterAuth() {};
      const wrapped = compatibilityLayer.wrapModule(module);
      expect(typeof wrapped).toBe('function');
    });

    it('should wrap object modules with BetterAuth property', () => {
      const module = { BetterAuth: function() {} };
      const wrapped = compatibilityLayer.wrapModule(module);
      expect(typeof wrapped).toBe('function');
    });

    it('should wrap createAuth style modules', () => {
      const module = { createAuth: function() {} };
      const wrapped = compatibilityLayer.wrapModule(module);
      expect(typeof wrapped).toBe('function');
    });
  });

  describe('version checking', () => {
    it('should get current version', () => {
      const version = compatibilityLayer.getVersion();
      expect(typeof version).toBe('string');
    });

    it('should detect v2 or higher', () => {
      expect(typeof compatibilityLayer.isV2OrHigher()).toBe('boolean');
    });
  });

  describe('compatibility checking', () => {
    it('should check version compatibility', async () => {
      await expect(
        compatibilityLayer.checkCompatibility('1.0.0')
      ).resolves.not.toThrow();
    });

    it('should throw for incompatible versions', async () => {
      const mockMap = {
        '99.0.0': { compatible: false }
      };
      
      compatibilityLayer.loadCompatibilityMap = async () => mockMap;
      
      await expect(
        compatibilityLayer.checkCompatibility('99.0.0')
      ).rejects.toThrow();
    });
  });
});
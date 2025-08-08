import type { BetterAuthOptions } from '@cf-auth/types';
import { readFileSync } from 'fs';
import { join } from 'path';

interface CompatibilityLayer {
  transformConfig(config: BetterAuthOptions): any;
  wrapModule(module: any): any;
  checkCompatibility(version?: string): Promise<void>;
  getVersion(): string;
}

export function getCompatibilityLayer(): CompatibilityLayer {
  let currentVersion: string;

  try {
    const packageJson = JSON.parse(
      readFileSync(join(__dirname, '../../../vendor/better-auth/package.json'), 'utf-8')
    );
    currentVersion = packageJson.version;
  } catch {
    currentVersion = 'unknown';
  }

  return {
    transformConfig(config: BetterAuthOptions): any {
      const transformed = { ...config };
      
      if (this.isV2OrHigher()) {
        transformed.database = this.transformDatabaseConfig(config.database);
      }
      
      return transformed;
    },

    wrapModule(module: any): any {
      if (typeof module === 'function') {
        return module;
      }
      
      if (module.BetterAuth) {
        return module.BetterAuth;
      }
      
      if (module.createAuth) {
        return class BetterAuthWrapper {
          constructor(config: any) {
            return module.createAuth(config);
          }
        };
      }
      
      return module;
    },

    async checkCompatibility(targetVersion?: string): Promise<void> {
      const compatibilityMap = await this.loadCompatibilityMap();
      const version = targetVersion || currentVersion;
      
      if (!this.isVersionCompatible(version, compatibilityMap)) {
        throw new Error(
          `Version ${version} is not compatible. Please check the compatibility guide.`
        );
      }
    },

    getVersion(): string {
      return currentVersion;
    },

    isV2OrHigher(): boolean {
      const major = parseInt(currentVersion.split('.')[0]);
      return major >= 2;
    },

    transformDatabaseConfig(database: any): any {
      if (!database) return database;
      
      if (database.provider === 'postgres' && this.isV2OrHigher()) {
        return {
          ...database,
          provider: 'postgresql'
        };
      }
      
      return database;
    },

    async loadCompatibilityMap(): Promise<Record<string, any>> {
      try {
        const map = await import('../../../compatibility-map.json');
        return map.default || map;
      } catch {
        return {};
      }
    },

    isVersionCompatible(version: string, map: Record<string, any>): boolean {
      if (!map[version]) {
        const major = version.split('.')[0];
        return !map.breakingVersions || !map.breakingVersions.includes(major);
      }
      return map[version].compatible !== false;
    }
  };
}
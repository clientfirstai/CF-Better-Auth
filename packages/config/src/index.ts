export * from './version-manager';
export * from './config-loader';
export * from './migration-manager';
export * from './schema-validator';
export * from './environment-loader';

// Create convenience factory functions
import { ConfigLoader } from './config-loader';
import { VersionManager } from './version-manager';
import { MigrationManager } from './migration-manager';
import { SchemaValidator } from './schema-validator';

export function createConfigLoader(projectRoot?: string) {
  return new ConfigLoader(projectRoot);
}

export function createVersionManager(projectRoot?: string) {
  return new VersionManager(projectRoot);
}

export function createMigrationManager(projectRoot?: string) {
  return new MigrationManager(projectRoot);
}

export function createSchemaValidator() {
  return new SchemaValidator();
}
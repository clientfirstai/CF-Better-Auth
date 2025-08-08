import { db } from './db';
import { readdir, readFile } from 'fs/promises';
import { join } from 'path';
import { postgres } from './db';

interface Migration {
  version: string;
  name: string;
  sql: string;
  appliedAt?: Date;
}

class MigrationManager {
  private migrationsPath: string;

  constructor(migrationsPath: string = join(__dirname, '../migrations')) {
    this.migrationsPath = migrationsPath;
  }

  async ensureMigrationTable(): Promise<void> {
    try {
      await db.execute(`
        CREATE TABLE IF NOT EXISTS "migration" (
          id SERIAL PRIMARY KEY,
          version TEXT UNIQUE NOT NULL,
          name TEXT NOT NULL,
          appliedAt TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
        )
      `);
      console.log('✅ Migration table ensured');
    } catch (error) {
      console.error('❌ Failed to create migration table:', error);
      throw error;
    }
  }

  async getAppliedMigrations(): Promise<Migration[]> {
    try {
      const result = await db.execute(`
        SELECT version, name, appliedAt 
        FROM "migration" 
        ORDER BY version ASC
      `);
      return result.rows.map(row => ({
        version: row.version,
        name: row.name,
        appliedAt: row.appliedAt,
        sql: ''
      }));
    } catch (error) {
      console.error('❌ Failed to get applied migrations:', error);
      return [];
    }
  }

  async getPendingMigrations(): Promise<Migration[]> {
    try {
      // Get all migration files
      const files = await readdir(this.migrationsPath);
      const migrationFiles = files
        .filter(file => file.endsWith('.sql'))
        .sort();

      // Get applied migrations
      const applied = await this.getAppliedMigrations();
      const appliedVersions = new Set(applied.map(m => m.version));

      // Find pending migrations
      const pending: Migration[] = [];

      for (const file of migrationFiles) {
        const version = this.extractVersionFromFilename(file);
        const name = this.extractNameFromFilename(file);

        if (!appliedVersions.has(version)) {
          const sql = await readFile(join(this.migrationsPath, file), 'utf-8');
          pending.push({ version, name, sql });
        }
      }

      return pending;
    } catch (error) {
      console.error('❌ Failed to get pending migrations:', error);
      throw error;
    }
  }

  async applyMigration(migration: Migration): Promise<void> {
    try {
      console.log(`🔄 Applying migration ${migration.version}: ${migration.name}`);
      
      // Execute migration in transaction
      await db.transaction(async (tx) => {
        // Execute the migration SQL
        await tx.execute(migration.sql);
        
        // Record migration as applied
        await tx.execute(`
          INSERT INTO "migration" (version, name) 
          VALUES ($1, $2)
        `, [migration.version, migration.name]);
      });

      console.log(`✅ Migration ${migration.version} applied successfully`);
    } catch (error) {
      console.error(`❌ Failed to apply migration ${migration.version}:`, error);
      throw error;
    }
  }

  async applyAllPendingMigrations(): Promise<void> {
    try {
      await this.ensureMigrationTable();
      
      const pending = await this.getPendingMigrations();
      
      if (pending.length === 0) {
        console.log('✅ No pending migrations');
        return;
      }

      console.log(`📋 Found ${pending.length} pending migrations`);

      for (const migration of pending) {
        await this.applyMigration(migration);
      }

      console.log(`✅ Applied ${pending.length} migrations successfully`);
    } catch (error) {
      console.error('❌ Migration process failed:', error);
      throw error;
    }
  }

  async rollbackMigration(version: string): Promise<void> {
    try {
      console.log(`🔄 Rolling back migration ${version}`);
      
      // Check if rollback file exists
      const rollbackFile = join(this.migrationsPath, `${version}_rollback.sql`);
      
      try {
        const rollbackSQL = await readFile(rollbackFile, 'utf-8');
        
        await db.transaction(async (tx) => {
          // Execute rollback SQL
          await tx.execute(rollbackSQL);
          
          // Remove migration record
          await tx.execute(`
            DELETE FROM "migration" WHERE version = $1
          `, [version]);
        });

        console.log(`✅ Migration ${version} rolled back successfully`);
      } catch (fileError) {
        console.warn(`⚠️ No rollback file found for migration ${version}`);
        throw new Error(`Cannot rollback migration ${version}: no rollback script found`);
      }
    } catch (error) {
      console.error(`❌ Failed to rollback migration ${version}:`, error);
      throw error;
    }
  }

  async getMigrationStatus(): Promise<{ applied: Migration[]; pending: Migration[] }> {
    const applied = await this.getAppliedMigrations();
    const pending = await this.getPendingMigrations();
    
    return { applied, pending };
  }

  private extractVersionFromFilename(filename: string): string {
    const match = filename.match(/^(\d+)_/);
    return match ? match[1] : filename.replace('.sql', '');
  }

  private extractNameFromFilename(filename: string): string {
    const withoutExtension = filename.replace('.sql', '');
    const withoutVersion = withoutExtension.replace(/^\d+_/, '');
    return withoutVersion.replace(/_/g, ' ');
  }
}

// Create singleton instance
export const migrationManager = new MigrationManager();

// Convenience functions
export const runMigrations = () => migrationManager.applyAllPendingMigrations();
export const getMigrationStatus = () => migrationManager.getMigrationStatus();
export const rollbackMigration = (version: string) => migrationManager.rollbackMigration(version);

// Auto-run migrations in development
if (process.env.NODE_ENV === 'development' && process.env.AUTO_MIGRATE === 'true') {
  migrationManager.applyAllPendingMigrations().catch(console.error);
}
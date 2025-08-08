import { readFileSync, writeFileSync, existsSync, mkdirSync } from 'fs';
import { join } from 'path';

export interface Migration {
  id: string;
  name: string;
  version: string;
  description: string;
  up: () => Promise<void> | void;
  down?: () => Promise<void> | void;
  runAlways?: boolean;
}

export interface MigrationRecord {
  id: string;
  name: string;
  version: string;
  appliedAt: string;
  success: boolean;
  error?: string;
}

export class MigrationManager {
  private migrations: Map<string, Migration> = new Map();
  private recordsFile: string;
  private records: MigrationRecord[] = [];

  constructor(private projectRoot: string = process.cwd()) {
    this.recordsFile = join(projectRoot, '.cf-auth-migrations.json');
    this.loadRecords();
  }

  private loadRecords(): void {
    if (existsSync(this.recordsFile)) {
      try {
        const content = readFileSync(this.recordsFile, 'utf-8');
        this.records = JSON.parse(content);
      } catch (error) {
        console.error('Failed to load migration records:', error);
        this.records = [];
      }
    }
  }

  private saveRecords(): void {
    writeFileSync(
      this.recordsFile,
      JSON.stringify(this.records, null, 2)
    );
  }

  register(migration: Migration): void {
    if (this.migrations.has(migration.id)) {
      throw new Error(`Migration ${migration.id} is already registered`);
    }
    this.migrations.set(migration.id, migration);
  }

  registerMany(migrations: Migration[]): void {
    for (const migration of migrations) {
      this.register(migration);
    }
  }

  async run(targetVersion?: string): Promise<void> {
    const pending = this.getPendingMigrations(targetVersion);
    
    if (pending.length === 0) {
      console.log('No pending migrations');
      return;
    }

    console.log(`Found ${pending.length} pending migrations`);

    for (const migration of pending) {
      await this.runMigration(migration);
    }

    console.log('All migrations completed');
  }

  private async runMigration(migration: Migration): Promise<void> {
    console.log(`Running migration: ${migration.name} (${migration.id})`);
    
    const record: MigrationRecord = {
      id: migration.id,
      name: migration.name,
      version: migration.version,
      appliedAt: new Date().toISOString(),
      success: false
    };

    try {
      await migration.up();
      record.success = true;
      console.log(`  ✅ Migration ${migration.name} completed`);
    } catch (error) {
      record.error = error instanceof Error ? error.message : String(error);
      console.error(`  ❌ Migration ${migration.name} failed:`, error);
      throw error;
    } finally {
      this.records.push(record);
      this.saveRecords();
    }
  }

  async rollback(steps: number = 1): Promise<void> {
    const applied = this.records
      .filter(r => r.success)
      .reverse()
      .slice(0, steps);

    if (applied.length === 0) {
      console.log('No migrations to rollback');
      return;
    }

    for (const record of applied) {
      const migration = this.migrations.get(record.id);
      
      if (!migration) {
        console.warn(`Migration ${record.id} not found, skipping rollback`);
        continue;
      }

      if (!migration.down) {
        console.warn(`Migration ${record.id} has no down method, skipping rollback`);
        continue;
      }

      console.log(`Rolling back migration: ${migration.name} (${migration.id})`);
      
      try {
        await migration.down();
        this.records = this.records.filter(r => r.id !== record.id);
        console.log(`  ✅ Rollback ${migration.name} completed`);
      } catch (error) {
        console.error(`  ❌ Rollback ${migration.name} failed:`, error);
        throw error;
      }
    }

    this.saveRecords();
    console.log('Rollback completed');
  }

  private getPendingMigrations(targetVersion?: string): Migration[] {
    const pending: Migration[] = [];
    const appliedIds = new Set(this.records.filter(r => r.success).map(r => r.id));

    for (const [id, migration] of this.migrations) {
      if (migration.runAlways || !appliedIds.has(id)) {
        if (!targetVersion || this.isVersionLessOrEqual(migration.version, targetVersion)) {
          pending.push(migration);
        }
      }
    }

    return pending.sort((a, b) => this.compareVersions(a.version, b.version));
  }

  private isVersionLessOrEqual(v1: string, v2: string): boolean {
    return this.compareVersions(v1, v2) <= 0;
  }

  private compareVersions(v1: string, v2: string): number {
    const parts1 = v1.split('.').map(Number);
    const parts2 = v2.split('.').map(Number);

    for (let i = 0; i < Math.max(parts1.length, parts2.length); i++) {
      const p1 = parts1[i] || 0;
      const p2 = parts2[i] || 0;
      
      if (p1 < p2) return -1;
      if (p1 > p2) return 1;
    }

    return 0;
  }

  getStatus(): { applied: number; pending: number; failed: number } {
    const applied = this.records.filter(r => r.success).length;
    const failed = this.records.filter(r => !r.success).length;
    const pending = this.getPendingMigrations().length;

    return { applied, pending, failed };
  }

  getRecords(): MigrationRecord[] {
    return [...this.records];
  }

  reset(): void {
    this.records = [];
    this.saveRecords();
  }

  createMigration(name: string, version: string): string {
    const timestamp = Date.now();
    const id = `${timestamp}_${name.toLowerCase().replace(/\s+/g, '_')}`;
    const fileName = `${id}.ts`;
    const migrationsDir = join(this.projectRoot, 'migrations');

    if (!existsSync(migrationsDir)) {
      mkdirSync(migrationsDir, { recursive: true });
    }

    const template = `import type { Migration } from '@cf-auth/config';

export const migration: Migration = {
  id: '${id}',
  name: '${name}',
  version: '${version}',
  description: 'Add description here',
  
  async up() {
    // Add your migration logic here
    console.log('Running migration: ${name}');
  },
  
  async down() {
    // Add rollback logic here (optional)
    console.log('Rolling back migration: ${name}');
  }
};
`;

    const filePath = join(migrationsDir, fileName);
    writeFileSync(filePath, template);

    console.log(`Migration created: ${filePath}`);
    return filePath;
  }
}
import { readFileSync, writeFileSync, existsSync } from 'fs';
import { join } from 'path';

export interface VersionInfo {
  cfAuthVersion: string;
  betterAuthVersion: string;
  lastUpdated: string;
  compatibility: 'compatible' | 'partial' | 'incompatible';
  migrations: string[];
}

export interface VersionConstraints {
  minBetterAuthVersion?: string;
  maxBetterAuthVersion?: string;
  exactBetterAuthVersion?: string;
}

export class VersionManager {
  private versionFile: string;
  private currentVersion: VersionInfo | null = null;

  constructor(projectRoot: string = process.cwd()) {
    this.versionFile = join(projectRoot, '.cf-auth-version.json');
    this.loadVersion();
  }

  private loadVersion(): void {
    if (existsSync(this.versionFile)) {
      try {
        const content = readFileSync(this.versionFile, 'utf-8');
        this.currentVersion = JSON.parse(content);
      } catch (error) {
        console.error('Failed to load version file:', error);
      }
    }
  }

  private saveVersion(): void {
    if (this.currentVersion) {
      writeFileSync(
        this.versionFile,
        JSON.stringify(this.currentVersion, null, 2)
      );
    }
  }

  getCurrentVersion(): VersionInfo | null {
    return this.currentVersion;
  }

  getCFAuthVersion(): string {
    return this.currentVersion?.cfAuthVersion || '0.1.0';
  }

  getBetterAuthVersion(): string {
    return this.currentVersion?.betterAuthVersion || 'unknown';
  }

  updateBetterAuthVersion(version: string): void {
    if (!this.currentVersion) {
      this.currentVersion = this.createDefaultVersion();
    }

    this.currentVersion.betterAuthVersion = version;
    this.currentVersion.lastUpdated = new Date().toISOString();
    this.saveVersion();
  }

  setCompatibility(compatibility: VersionInfo['compatibility']): void {
    if (!this.currentVersion) {
      this.currentVersion = this.createDefaultVersion();
    }

    this.currentVersion.compatibility = compatibility;
    this.saveVersion();
  }

  addMigration(migration: string): void {
    if (!this.currentVersion) {
      this.currentVersion = this.createDefaultVersion();
    }

    if (!this.currentVersion.migrations.includes(migration)) {
      this.currentVersion.migrations.push(migration);
      this.saveVersion();
    }
  }

  checkVersionConstraints(constraints: VersionConstraints): boolean {
    const currentVersion = this.getBetterAuthVersion();
    
    if (constraints.exactBetterAuthVersion) {
      return currentVersion === constraints.exactBetterAuthVersion;
    }

    if (constraints.minBetterAuthVersion) {
      if (!this.isVersionGreaterOrEqual(currentVersion, constraints.minBetterAuthVersion)) {
        return false;
      }
    }

    if (constraints.maxBetterAuthVersion) {
      if (!this.isVersionLessOrEqual(currentVersion, constraints.maxBetterAuthVersion)) {
        return false;
      }
    }

    return true;
  }

  private createDefaultVersion(): VersionInfo {
    return {
      cfAuthVersion: '0.1.0',
      betterAuthVersion: 'unknown',
      lastUpdated: new Date().toISOString(),
      compatibility: 'compatible',
      migrations: []
    };
  }

  private parseVersion(version: string): { major: number; minor: number; patch: number } {
    const [major = 0, minor = 0, patch = 0] = version
      .split('.')
      .map(v => parseInt(v) || 0);
    
    return { major, minor, patch };
  }

  private isVersionGreaterOrEqual(v1: string, v2: string): boolean {
    const version1 = this.parseVersion(v1);
    const version2 = this.parseVersion(v2);

    if (version1.major !== version2.major) {
      return version1.major > version2.major;
    }
    if (version1.minor !== version2.minor) {
      return version1.minor > version2.minor;
    }
    return version1.patch >= version2.patch;
  }

  private isVersionLessOrEqual(v1: string, v2: string): boolean {
    const version1 = this.parseVersion(v1);
    const version2 = this.parseVersion(v2);

    if (version1.major !== version2.major) {
      return version1.major < version2.major;
    }
    if (version1.minor !== version2.minor) {
      return version1.minor < version2.minor;
    }
    return version1.patch <= version2.patch;
  }

  isCompatible(): boolean {
    return this.currentVersion?.compatibility === 'compatible';
  }

  isPartiallyCompatible(): boolean {
    return this.currentVersion?.compatibility === 'partial';
  }

  getMigrations(): string[] {
    return this.currentVersion?.migrations || [];
  }

  clearMigrations(): void {
    if (this.currentVersion) {
      this.currentVersion.migrations = [];
      this.saveVersion();
    }
  }

  getVersionReport(): string {
    if (!this.currentVersion) {
      return 'No version information available';
    }

    const lines = [
      `CF-Better-Auth Version: ${this.currentVersion.cfAuthVersion}`,
      `Better-Auth Version: ${this.currentVersion.betterAuthVersion}`,
      `Last Updated: ${new Date(this.currentVersion.lastUpdated).toLocaleString()}`,
      `Compatibility: ${this.currentVersion.compatibility}`,
      `Applied Migrations: ${this.currentVersion.migrations.length}`
    ];

    if (this.currentVersion.migrations.length > 0) {
      lines.push('Migrations:');
      this.currentVersion.migrations.forEach(m => lines.push(`  - ${m}`));
    }

    return lines.join('\n');
  }
}
# Version Management Guide

## Overview

CF-Better-Auth uses a sophisticated version management system to maintain compatibility with better-auth while providing stable APIs for your applications.

## Version Strategy

### Semantic Versioning

CF-Better-Auth follows semantic versioning:
- **Major (X.0.0)** - Breaking API changes
- **Minor (0.X.0)** - New features, backward compatible
- **Patch (0.0.X)** - Bug fixes, backward compatible

### Better-Auth Compatibility

Each CF-Better-Auth version supports specific better-auth versions:

```json
{
  "cf-auth": "0.1.0",
  "supports-better-auth": ["1.0.x", "1.1.x", "1.2.x"],
  "recommended-better-auth": "1.2.3"
}
```

## Version Management System

### Configuration

The version manager (`@cf-auth/config`) handles:

1. **Version Detection** - Automatic detection of better-auth version
2. **Compatibility Checking** - Validates version compatibility
3. **Migration Orchestration** - Manages version migrations
4. **Rollback Support** - Handles version rollbacks

### Usage

```typescript
import { VersionManager } from '@cf-auth/config';

const versionManager = new VersionManager();

// Check current versions
const versions = await versionManager.getCurrentVersions();
console.log('CF-Auth:', versions.cfAuth);
console.log('Better-Auth:', versions.betterAuth);

// Check compatibility
const isCompatible = await versionManager.checkCompatibility();
if (!isCompatible) {
  const issues = await versionManager.getCompatibilityIssues();
  console.log('Compatibility issues:', issues);
}

// Upgrade better-auth
const result = await versionManager.upgradeBetterAuth('1.2.3');
if (result.success) {
  console.log('Upgrade successful');
} else {
  console.log('Upgrade failed:', result.error);
}
```

## Compatibility Matrix

### Current Support Matrix

| CF-Auth Version | Better-Auth Versions | Status | Notes |
|-----------------|---------------------|---------|-------|
| 0.1.0 | 1.0.0 - 1.2.x | ✅ Supported | Full compatibility |
| 0.1.0 | 1.3.x | ⚠️ Beta | Some features may be unstable |
| 0.1.0 | 2.0.x | ❌ Not supported | Breaking changes |

### Compatibility Levels

1. **Full Compatibility** ✅
   - All features work as expected
   - No known issues
   - Recommended for production

2. **Partial Compatibility** ⚠️
   - Most features work
   - Some limitations or workarounds
   - Use with caution in production

3. **Experimental** 🧪
   - Limited compatibility
   - Frequent breaking changes
   - Development/testing only

4. **Not Compatible** ❌
   - Major breaking changes
   - Not supported
   - Upgrade required

## Version Tracking

### Compatibility Map Structure

```json
{
  "cf-auth-version": "0.1.0",
  "last-updated": "2024-08-08T00:00:00Z",
  "better-auth-compatibility": {
    "1.0.0": {
      "status": "supported",
      "level": "full",
      "tested-date": "2024-07-01",
      "breaking-changes": [],
      "migrations": [],
      "known-issues": [],
      "performance-notes": []
    },
    "1.1.0": {
      "status": "supported", 
      "level": "full",
      "tested-date": "2024-07-15",
      "breaking-changes": ["config-schema"],
      "migrations": ["migrate-config-v1.1.0"],
      "known-issues": [],
      "performance-notes": ["Improved session performance"]
    },
    "1.2.0": {
      "status": "supported",
      "level": "full", 
      "tested-date": "2024-08-01",
      "breaking-changes": ["plugin-interface"],
      "migrations": ["migrate-plugins-v1.2.0"],
      "known-issues": ["Minor UI rendering issue in plugin X"],
      "performance-notes": ["10% faster auth validation"]
    },
    "2.0.0-beta.1": {
      "status": "experimental",
      "level": "partial",
      "tested-date": "2024-08-05",
      "breaking-changes": ["complete-api-rewrite"],
      "migrations": ["migrate-all-v2.0.0"],
      "known-issues": ["Session migration incomplete"],
      "performance-notes": ["Significant performance improvements"]
    }
  }
}
```

### Automated Testing

Version compatibility is tested automatically:

```yaml
# .github/workflows/compatibility.yml
name: Compatibility Matrix

on:
  schedule:
    - cron: '0 2 * * *'  # Daily at 2 AM
  workflow_dispatch:

jobs:
  compatibility-test:
    strategy:
      matrix:
        better-auth-version: 
          - '1.0.0'
          - '1.1.0' 
          - '1.2.0'
          - '1.3.0-beta.1'
    
    steps:
      - name: Test compatibility
        run: |
          # Set better-auth version
          cd vendor/better-auth
          git checkout tags/${{ matrix.better-auth-version }}
          
          # Run compatibility tests
          cd ../..
          pnpm run test:compatibility
          
          # Update compatibility map
          node scripts/update-compatibility.js ${{ matrix.better-auth-version }}
```

## Migration Management

### Migration Types

1. **Configuration Migrations** - Update config schema
2. **Database Migrations** - Modify database structure
3. **API Migrations** - Handle API changes
4. **Plugin Migrations** - Update plugin interfaces

### Migration Examples

#### Configuration Migration

```typescript
// migrations/config/v1.1.0.ts
export const migrateConfigV1_1_0 = (config: any) => {
  const migrated = { ...config };
  
  // Rename emailProvider to email.provider
  if (config.emailProvider) {
    migrated.email = {
      provider: config.emailProvider,
      ...config.emailConfig
    };
    delete migrated.emailProvider;
    delete migrated.emailConfig;
  }
  
  // Add required session config
  if (!migrated.session) {
    migrated.session = {
      strategy: 'jwt',
      maxAge: 30 * 24 * 60 * 60 // 30 days
    };
  }
  
  return migrated;
};
```

#### Database Migration

```sql
-- migrations/database/v1.2.0.sql
-- Add device tracking
CREATE TABLE IF NOT EXISTS user_devices (
  id VARCHAR(255) PRIMARY KEY,
  user_id VARCHAR(255) NOT NULL REFERENCES users(id),
  device_id VARCHAR(255) NOT NULL,
  device_name VARCHAR(255),
  device_type VARCHAR(50),
  user_agent TEXT,
  ip_address INET,
  last_seen_at TIMESTAMP DEFAULT NOW(),
  created_at TIMESTAMP DEFAULT NOW(),
  UNIQUE(user_id, device_id)
);

-- Add indexes
CREATE INDEX IF NOT EXISTS idx_user_devices_user_id ON user_devices(user_id);
CREATE INDEX IF NOT EXISTS idx_user_devices_last_seen ON user_devices(last_seen_at);
```

#### Plugin Migration

```typescript
// migrations/plugins/v1.2.0.ts
export const migratePluginsV1_2_0 = (plugins: any[]) => {
  return plugins.map(plugin => {
    // Update plugin interface
    if (plugin.version === '1.1.0') {
      return {
        ...plugin,
        version: '1.2.0',
        // New async init method
        init: async (auth: any) => {
          // Wrap old sync method
          const result = plugin.setup(auth);
          if (result?.then) {
            await result;
          }
        },
        // Remove deprecated setup method
        setup: undefined
      };
    }
    return plugin;
  }).filter(Boolean);
};
```

## Rollback Procedures

### Automatic Rollback

The system automatically rolls back on migration failure:

```typescript
async function performMigration(targetVersion: string) {
  const rollbackPoint = await createRollbackPoint();
  
  try {
    await runMigration(targetVersion);
    await validateMigration();
    await commitMigration();
  } catch (error) {
    console.error('Migration failed, rolling back:', error);
    await rollbackToPoint(rollbackPoint);
    throw error;
  }
}
```

### Manual Rollback

For manual rollback procedures:

```bash
# Rollback to previous version
node scripts/rollback.js --to-version=1.1.0

# Or rollback to last known good state
node scripts/rollback.js --to-backup=last-good

# Rollback specific component
node scripts/rollback.js --component=database --to-version=1.1.0
```

## Version Pinning

### Development

Pin versions in development for consistency:

```json
// package.json
{
  "cf-auth": {
    "pin-better-auth": "1.2.3",
    "compatibility-mode": "strict"
  }
}
```

### Production

Use version ranges for production flexibility:

```json
{
  "cf-auth": {
    "better-auth-range": "^1.2.0",
    "compatibility-mode": "flexible",
    "auto-upgrade": false
  }
}
```

## Release Process

### CF-Auth Releases

1. **Pre-release Testing**
   - Test with all supported better-auth versions
   - Run full compatibility matrix
   - Performance regression testing

2. **Version Bumping**
   ```bash
   # Update version
   npm version minor
   
   # Update compatibility map
   node scripts/update-compatibility.js
   
   # Generate changelog
   npx conventional-changelog -p angular -i CHANGELOG.md -s
   ```

3. **Release Publishing**
   ```bash
   # Build packages
   pnpm build
   
   # Run final tests
   pnpm test
   
   # Publish to NPM
   pnpm publish-packages
   ```

### Better-Auth Version Adoption

When better-auth releases new versions:

1. **Compatibility Assessment** (Day 1)
   - Clone and test new version
   - Identify breaking changes
   - Assess impact on CF-Auth

2. **Compatibility Implementation** (Week 1)
   - Update compatibility layer
   - Write migration scripts
   - Update tests

3. **Beta Testing** (Week 2)
   - Internal testing
   - Community beta testing
   - Performance evaluation

4. **Production Release** (Week 3-4)
   - Update compatibility map
   - Release CF-Auth update
   - Documentation updates

## Monitoring & Alerts

### Version Drift Detection

Monitor for version compatibility issues:

```typescript
// Version monitoring
setInterval(async () => {
  const versions = await versionManager.getCurrentVersions();
  const compatibility = await versionManager.checkCompatibility();
  
  if (!compatibility.isCompatible) {
    // Alert on compatibility issues
    await sendAlert('Version compatibility issue detected', {
      cfAuth: versions.cfAuth,
      betterAuth: versions.betterAuth,
      issues: compatibility.issues
    });
  }
}, 60 * 60 * 1000); // Check hourly
```

### Update Notifications

Get notified of new versions:

```bash
# Set up notifications
npm install -g npm-check-updates
ncu --packageFile package.json --filter better-auth
```

## Best Practices

### Development

1. **Always pin versions** in development
2. **Test migrations** before deploying
3. **Use compatibility mode** for safer upgrades
4. **Monitor version drift** in production

### Production

1. **Plan upgrades** during maintenance windows
2. **Test in staging** first
3. **Have rollback plans** ready
4. **Monitor post-upgrade** for issues

### CI/CD

1. **Automate compatibility testing**
2. **Cache compatibility results**
3. **Fail fast** on incompatibilities
4. **Generate compatibility reports**

This version management system ensures smooth operation across better-auth version changes while maintaining API stability for your applications.
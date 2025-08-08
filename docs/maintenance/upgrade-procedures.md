# Upgrade Procedures

## Overview

CF-Better-Auth provides automated upgrade procedures to keep your authentication system up-to-date with the latest better-auth releases while maintaining compatibility and stability.

## Upgrade Process

### Automated Upgrade

Use the built-in upgrade script:

```bash
# Upgrade to latest version
pnpm run upgrade:better-auth

# Check compatibility before upgrading
pnpm run compatibility:check
```

### Manual Upgrade Process

1. **Create Backup**
   ```bash
   # Backup current state
   cp -r vendor/better-auth .backups/better-auth-$(date +%Y%m%d)
   ```

2. **Check Current Version**
   ```bash
   cd vendor/better-auth
   git describe --tags
   ```

3. **Update Submodule**
   ```bash
   git submodule update --remote vendor/better-auth
   ```

4. **Test Compatibility**
   ```bash
   pnpm run compatibility:check
   ```

5. **Run Tests**
   ```bash
   pnpm test
   ```

### Upgrade Script Details

The upgrade script (`scripts/upgrade-better-auth.js`) performs:

1. **Backup Creation** - Saves current state
2. **Version Detection** - Identifies current and target versions
3. **Compatibility Check** - Tests for breaking changes
4. **Automated Migration** - Applies necessary transformations
5. **Verification** - Runs tests to ensure everything works
6. **Rollback on Failure** - Automatically reverts on issues

## Version Compatibility

### Compatibility Matrix

The system maintains a compatibility map (`compatibility-map.json`):

```json
{
  "cf-auth-version": "0.1.0",
  "better-auth-compatibility": {
    "1.0.0": {
      "status": "supported",
      "breaking_changes": [],
      "migrations": []
    },
    "1.1.0": {
      "status": "supported",
      "breaking_changes": ["config-schema-change"],
      "migrations": ["migrate-config-v1.1.0"]
    },
    "2.0.0": {
      "status": "experimental",
      "breaking_changes": ["api-signature-change", "plugin-interface-change"],
      "migrations": ["migrate-api-v2.0.0", "migrate-plugins-v2.0.0"]
    }
  }
}
```

### Breaking Changes Handling

The compatibility layer automatically handles:

1. **Configuration Schema Changes**
   - Transforms old config format to new format
   - Provides deprecation warnings
   - Maintains backward compatibility

2. **API Signature Changes**
   - Wraps changed methods with compatibility shims
   - Logs usage of deprecated APIs
   - Provides migration paths

3. **Plugin Interface Changes**
   - Adapts plugin interfaces automatically
   - Maintains plugin compatibility
   - Updates plugin registrations

## Migration Procedures

### Configuration Migration

When better-auth changes its configuration schema:

```typescript
// Migration example for v1.1.0
export const migrateConfigV1_1_0 = (oldConfig: any) => {
  const newConfig = { ...oldConfig };
  
  // Handle renamed properties
  if (oldConfig.emailProvider) {
    newConfig.email = {
      provider: oldConfig.emailProvider,
      ...oldConfig.emailConfig
    };
    delete newConfig.emailProvider;
    delete newConfig.emailConfig;
  }
  
  // Handle new required properties
  if (!newConfig.session) {
    newConfig.session = {
      maxAge: 30 * 24 * 60 * 60 * 1000 // 30 days default
    };
  }
  
  return newConfig;
};
```

### Database Migration

For database schema changes:

```sql
-- Migration for better-auth v1.2.0
-- Add new columns to user table
ALTER TABLE users ADD COLUMN IF NOT EXISTS email_verified_at TIMESTAMP;
ALTER TABLE users ADD COLUMN IF NOT EXISTS phone_verified_at TIMESTAMP;

-- Create new tables
CREATE TABLE IF NOT EXISTS user_devices (
  id VARCHAR(255) PRIMARY KEY,
  user_id VARCHAR(255) REFERENCES users(id),
  device_name VARCHAR(255),
  device_type VARCHAR(50),
  last_used_at TIMESTAMP DEFAULT NOW(),
  created_at TIMESTAMP DEFAULT NOW()
);
```

### Plugin Migration

When plugin interfaces change:

```typescript
// Plugin adapter for new interface
export const migratePluginV2_0_0 = (oldPlugin: any) => {
  return {
    name: oldPlugin.name,
    version: oldPlugin.version || '1.0.0',
    // New init signature with async support
    init: async (auth: BetterAuthInstance) => {
      // Wrap old sync init in async
      if (oldPlugin.init.constructor.name === 'AsyncFunction') {
        await oldPlugin.init(auth);
      } else {
        oldPlugin.init(auth);
      }
    },
    // New configuration structure
    config: {
      ...oldPlugin.config,
      version: '2.0.0'
    }
  };
};
```

## Rollback Procedures

### Automatic Rollback

The upgrade script automatically rolls back on failure:

```javascript
async function rollback() {
  console.log('🔄 Rolling back to previous version...');
  
  // Restore from backup
  execSync('rm -rf vendor/better-auth');
  execSync('cp -r .backups/better-auth-latest vendor/better-auth');
  
  // Reset git submodule
  execSync('git submodule update --init vendor/better-auth');
  
  // Restore package.json dependencies
  if (fs.existsSync('.backups/package.json')) {
    execSync('cp .backups/package.json package.json');
    execSync('pnpm install');
  }
  
  console.log('✅ Rollback completed successfully');
}
```

### Manual Rollback

If automatic rollback fails:

```bash
# 1. Stop all services
pm2 stop all  # or docker-compose down

# 2. Restore from backup
rm -rf vendor/better-auth
cp -r .backups/better-auth-YYYYMMDD vendor/better-auth

# 3. Reset git submodule
git submodule update --init vendor/better-auth

# 4. Restore configuration
cp .backups/package.json package.json
pnpm install

# 5. Run tests
pnpm test

# 6. Restart services
pm2 start all  # or docker-compose up -d
```

## Pre-Upgrade Checklist

### Environment Preparation

- [ ] **Backup Database** - Create full database backup
- [ ] **Backup Configuration** - Save current configuration files
- [ ] **Check Disk Space** - Ensure adequate space for backup
- [ ] **Review Dependencies** - Check for conflicting dependencies
- [ ] **Test Environment** - Verify test environment is working

### Code Preparation

- [ ] **Run Tests** - Ensure all tests pass before upgrade
- [ ] **Check Custom Code** - Review custom plugins and extensions
- [ ] **Update Dependencies** - Update other dependencies first
- [ ] **Review Breaking Changes** - Check better-auth changelog
- [ ] **Plan Downtime** - Schedule maintenance window if needed

### Post-Upgrade Verification

- [ ] **Run Full Test Suite** - Execute all tests
- [ ] **Check Compatibility** - Run compatibility checks
- [ ] **Verify Authentication** - Test all auth methods
- [ ] **Check Plugins** - Verify all plugins work correctly
- [ ] **Monitor Performance** - Watch for performance regressions
- [ ] **Update Documentation** - Document any changes made

## Monitoring Upgrades

### Upgrade Notifications

Set up notifications for:
- Successful upgrades
- Failed upgrades
- Compatibility issues
- Performance regressions

### Logging

The upgrade process logs to:
- Console output (immediate feedback)
- Upgrade log file (`logs/upgrades.log`)
- System logs (via logger)
- External monitoring (optional)

### Metrics

Track upgrade metrics:
- Upgrade success rate
- Rollback frequency
- Compatibility issues
- Performance impact

## Emergency Procedures

### Critical Failure Recovery

If the system fails after upgrade:

1. **Immediate Response**
   ```bash
   # Stop services immediately
   pm2 stop all
   
   # Switch to maintenance mode
   touch maintenance.flag
   ```

2. **Assess Damage**
   ```bash
   # Check logs
   tail -n 100 logs/upgrade.log
   tail -n 100 logs/error.log
   
   # Test database connectivity
   pnpm run db:test
   ```

3. **Emergency Rollback**
   ```bash
   # Use emergency rollback script
   bash scripts/emergency-rollback.sh
   ```

4. **Verify Recovery**
   ```bash
   # Run health checks
   pnpm run health-check
   
   # Test authentication
   curl -X POST /api/auth/test
   ```

### Contact Procedures

For critical issues:
1. Check documentation and troubleshooting guides
2. Review GitHub issues and discussions
3. Contact support team (if applicable)
4. Post issue with detailed logs and reproduction steps

## Maintenance Schedule

### Regular Upgrades

- **Security Patches** - Apply within 24-48 hours
- **Minor Versions** - Apply within 1-2 weeks
- **Major Versions** - Plan and test thoroughly, apply within 1-2 months

### Testing Schedule

- **Daily** - Run compatibility checks in CI
- **Weekly** - Test upgrade process in staging
- **Monthly** - Full upgrade simulation with rollback testing

This comprehensive upgrade procedure ensures smooth, reliable updates while maintaining system stability and security.
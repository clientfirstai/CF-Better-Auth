# Database Schema Design

## Overview

CF-Better-Auth uses PostgreSQL as its primary database with a comprehensive schema designed for enterprise-grade authentication, authorization, and user management. The schema supports multi-tenancy, role-based access control, audit logging, and extensibility through plugins.

## Core Design Principles

1. **Normalization**: Properly normalized to 3NF to avoid data redundancy
2. **Performance**: Strategic indexing and denormalization where needed
3. **Security**: Sensitive data encryption and secure defaults
4. **Auditability**: Comprehensive audit trails for compliance
5. **Extensibility**: Plugin-friendly schema with extension points
6. **Multi-tenancy**: Organization-based data isolation

## Database Configuration

```sql
-- Database settings
CREATE DATABASE cf_better_auth
    WITH 
    OWNER = cf_auth_admin
    ENCODING = 'UTF8'
    LC_COLLATE = 'en_US.utf8'
    LC_CTYPE = 'en_US.utf8'
    TABLESPACE = pg_default
    CONNECTION LIMIT = -1;

-- Enable required extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";      -- UUID generation
CREATE EXTENSION IF NOT EXISTS "pgcrypto";       -- Encryption functions
CREATE EXTENSION IF NOT EXISTS "citext";         -- Case-insensitive text
CREATE EXTENSION IF NOT EXISTS "pg_trgm";        -- Trigram similarity search
CREATE EXTENSION IF NOT EXISTS "btree_gin";      -- GIN index support
```

## Schema Tables

### 1. Users Table

```sql
CREATE TABLE users (
    -- Primary Key
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    
    -- Authentication
    email CITEXT UNIQUE NOT NULL,
    email_verified BOOLEAN DEFAULT FALSE,
    email_verified_at TIMESTAMPTZ,
    username CITEXT UNIQUE,
    password_hash TEXT, -- Argon2id hash
    
    -- Profile
    name TEXT,
    given_name TEXT,
    family_name TEXT,
    middle_name TEXT,
    nickname TEXT,
    preferred_username TEXT,
    profile_url TEXT,
    picture_url TEXT,
    website TEXT,
    gender TEXT,
    birthdate DATE,
    timezone TEXT DEFAULT 'UTC',
    locale TEXT DEFAULT 'en',
    
    -- Contact
    phone_number TEXT,
    phone_number_verified BOOLEAN DEFAULT FALSE,
    phone_number_verified_at TIMESTAMPTZ,
    
    -- Status
    status TEXT DEFAULT 'active' CHECK (status IN ('active', 'inactive', 'suspended', 'deleted')),
    status_changed_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
    status_reason TEXT,
    
    -- Security
    two_factor_enabled BOOLEAN DEFAULT FALSE,
    two_factor_secret TEXT, -- Encrypted
    backup_codes TEXT[], -- Encrypted array
    security_keys JSONB DEFAULT '[]'::JSONB, -- WebAuthn credentials
    failed_login_attempts INTEGER DEFAULT 0,
    locked_until TIMESTAMPTZ,
    password_changed_at TIMESTAMPTZ,
    require_password_change BOOLEAN DEFAULT FALSE,
    
    -- Metadata
    metadata JSONB DEFAULT '{}'::JSONB,
    preferences JSONB DEFAULT '{}'::JSONB,
    
    -- Timestamps
    created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
    deleted_at TIMESTAMPTZ,
    last_active_at TIMESTAMPTZ,
    last_sign_in_at TIMESTAMPTZ,
    
    -- Constraints
    CONSTRAINT valid_email CHECK (email ~* '^[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}$')
);

-- Indexes
CREATE INDEX idx_users_email ON users(email);
CREATE INDEX idx_users_username ON users(username) WHERE username IS NOT NULL;
CREATE INDEX idx_users_status ON users(status) WHERE status != 'active';
CREATE INDEX idx_users_created_at ON users(created_at);
CREATE INDEX idx_users_metadata ON users USING GIN(metadata);
CREATE INDEX idx_users_deleted_at ON users(deleted_at) WHERE deleted_at IS NOT NULL;
```

### 2. Sessions Table

```sql
CREATE TABLE sessions (
    -- Primary Key
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    
    -- Relations
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    
    -- Session Data
    token_hash TEXT UNIQUE NOT NULL, -- SHA256 hash of session token
    refresh_token_hash TEXT UNIQUE, -- SHA256 hash of refresh token
    
    -- Token Info
    access_token_expires_at TIMESTAMPTZ NOT NULL,
    refresh_token_expires_at TIMESTAMPTZ,
    idle_timeout_at TIMESTAMPTZ,
    absolute_timeout_at TIMESTAMPTZ,
    
    -- Client Info
    ip_address INET,
    user_agent TEXT,
    device_id TEXT,
    device_name TEXT,
    device_type TEXT,
    browser_name TEXT,
    browser_version TEXT,
    os_name TEXT,
    os_version TEXT,
    
    -- Location
    country_code CHAR(2),
    region TEXT,
    city TEXT,
    latitude DECIMAL(10, 8),
    longitude DECIMAL(11, 8),
    
    -- Security
    is_impersonation BOOLEAN DEFAULT FALSE,
    impersonator_id UUID REFERENCES users(id),
    security_level TEXT DEFAULT 'standard' CHECK (security_level IN ('standard', 'elevated', 'critical')),
    
    -- Status
    status TEXT DEFAULT 'active' CHECK (status IN ('active', 'expired', 'revoked')),
    revoked_at TIMESTAMPTZ,
    revoked_by UUID REFERENCES users(id),
    revoke_reason TEXT,
    
    -- Activity
    last_activity_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
    activity_count INTEGER DEFAULT 0,
    
    -- Timestamps
    created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);

-- Indexes
CREATE INDEX idx_sessions_user_id ON sessions(user_id);
CREATE INDEX idx_sessions_token_hash ON sessions(token_hash);
CREATE INDEX idx_sessions_refresh_token_hash ON sessions(refresh_token_hash) WHERE refresh_token_hash IS NOT NULL;
CREATE INDEX idx_sessions_status ON sessions(status) WHERE status = 'active';
CREATE INDEX idx_sessions_expires_at ON sessions(access_token_expires_at) WHERE status = 'active';
CREATE INDEX idx_sessions_last_activity ON sessions(last_activity_at);
```

### 3. Organizations Table

```sql
CREATE TABLE organizations (
    -- Primary Key
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    
    -- Organization Info
    slug CITEXT UNIQUE NOT NULL,
    name TEXT NOT NULL,
    display_name TEXT,
    description TEXT,
    logo_url TEXT,
    website TEXT,
    
    -- Contact
    email CITEXT,
    phone TEXT,
    
    -- Address
    address_line1 TEXT,
    address_line2 TEXT,
    city TEXT,
    state_province TEXT,
    postal_code TEXT,
    country_code CHAR(2),
    
    -- Settings
    settings JSONB DEFAULT '{}'::JSONB,
    features JSONB DEFAULT '{}'::JSONB,
    
    -- Billing
    billing_email CITEXT,
    billing_plan TEXT DEFAULT 'free',
    billing_status TEXT DEFAULT 'active',
    trial_ends_at TIMESTAMPTZ,
    subscription_id TEXT,
    customer_id TEXT, -- Stripe/billing provider ID
    
    -- Limits
    max_users INTEGER,
    max_teams INTEGER,
    max_projects INTEGER,
    storage_quota_bytes BIGINT,
    
    -- Security
    require_2fa BOOLEAN DEFAULT FALSE,
    allowed_domains TEXT[], -- Email domains for auto-join
    ip_allowlist INET[],
    
    -- Status
    status TEXT DEFAULT 'active' CHECK (status IN ('active', 'inactive', 'suspended', 'deleted')),
    
    -- Metadata
    metadata JSONB DEFAULT '{}'::JSONB,
    
    -- Timestamps
    created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
    deleted_at TIMESTAMPTZ,
    
    -- Constraints
    CONSTRAINT valid_slug CHECK (slug ~ '^[a-z0-9-]+$')
);

-- Indexes
CREATE INDEX idx_organizations_slug ON organizations(slug);
CREATE INDEX idx_organizations_status ON organizations(status) WHERE status != 'active';
CREATE INDEX idx_organizations_created_at ON organizations(created_at);
CREATE INDEX idx_organizations_metadata ON organizations USING GIN(metadata);
```

### 4. Organization Members Table

```sql
CREATE TABLE organization_members (
    -- Primary Key
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    
    -- Relations
    organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    invited_by UUID REFERENCES users(id),
    
    -- Role & Permissions
    role TEXT NOT NULL DEFAULT 'member' CHECK (role IN ('owner', 'admin', 'member', 'guest')),
    permissions JSONB DEFAULT '[]'::JSONB,
    
    -- Invitation
    invitation_token TEXT UNIQUE,
    invitation_email CITEXT,
    invitation_sent_at TIMESTAMPTZ,
    invitation_accepted_at TIMESTAMPTZ,
    invitation_expires_at TIMESTAMPTZ,
    
    -- Status
    status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'active', 'inactive', 'removed')),
    
    -- Metadata
    metadata JSONB DEFAULT '{}'::JSONB,
    
    -- Timestamps
    created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
    removed_at TIMESTAMPTZ,
    
    -- Constraints
    CONSTRAINT unique_org_user UNIQUE (organization_id, user_id)
);

-- Indexes
CREATE INDEX idx_org_members_organization_id ON organization_members(organization_id);
CREATE INDEX idx_org_members_user_id ON organization_members(user_id);
CREATE INDEX idx_org_members_role ON organization_members(role);
CREATE INDEX idx_org_members_status ON organization_members(status);
CREATE INDEX idx_org_members_invitation_token ON organization_members(invitation_token) WHERE invitation_token IS NOT NULL;
```

### 5. Teams Table

```sql
CREATE TABLE teams (
    -- Primary Key
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    
    -- Relations
    organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    parent_team_id UUID REFERENCES teams(id) ON DELETE CASCADE,
    
    -- Team Info
    slug CITEXT NOT NULL,
    name TEXT NOT NULL,
    description TEXT,
    avatar_url TEXT,
    
    -- Settings
    settings JSONB DEFAULT '{}'::JSONB,
    permissions JSONB DEFAULT '[]'::JSONB,
    
    -- Status
    status TEXT DEFAULT 'active' CHECK (status IN ('active', 'inactive', 'deleted')),
    
    -- Metadata
    metadata JSONB DEFAULT '{}'::JSONB,
    
    -- Timestamps
    created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
    deleted_at TIMESTAMPTZ,
    
    -- Constraints
    CONSTRAINT unique_team_slug UNIQUE (organization_id, slug),
    CONSTRAINT valid_team_slug CHECK (slug ~ '^[a-z0-9-]+$')
);

-- Indexes
CREATE INDEX idx_teams_organization_id ON teams(organization_id);
CREATE INDEX idx_teams_parent_team_id ON teams(parent_team_id) WHERE parent_team_id IS NOT NULL;
CREATE INDEX idx_teams_slug ON teams(slug);
CREATE INDEX idx_teams_status ON teams(status) WHERE status != 'active';
```

### 6. Team Members Table

```sql
CREATE TABLE team_members (
    -- Primary Key
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    
    -- Relations
    team_id UUID NOT NULL REFERENCES teams(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    added_by UUID REFERENCES users(id),
    
    -- Role
    role TEXT NOT NULL DEFAULT 'member' CHECK (role IN ('lead', 'member', 'viewer')),
    
    -- Status
    status TEXT DEFAULT 'active' CHECK (status IN ('active', 'inactive')),
    
    -- Timestamps
    created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
    
    -- Constraints
    CONSTRAINT unique_team_user UNIQUE (team_id, user_id)
);

-- Indexes
CREATE INDEX idx_team_members_team_id ON team_members(team_id);
CREATE INDEX idx_team_members_user_id ON team_members(user_id);
CREATE INDEX idx_team_members_role ON team_members(role);
```

### 7. OAuth Accounts Table

```sql
CREATE TABLE oauth_accounts (
    -- Primary Key
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    
    -- Relations
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    
    -- Provider Info
    provider TEXT NOT NULL,
    provider_user_id TEXT NOT NULL,
    provider_type TEXT DEFAULT 'oauth2',
    
    -- Tokens
    access_token TEXT, -- Encrypted
    refresh_token TEXT, -- Encrypted
    id_token TEXT, -- Encrypted
    token_type TEXT,
    expires_at TIMESTAMPTZ,
    scope TEXT,
    
    -- Profile Data
    email CITEXT,
    name TEXT,
    picture_url TEXT,
    raw_profile JSONB,
    
    -- Status
    status TEXT DEFAULT 'active' CHECK (status IN ('active', 'revoked', 'expired')),
    
    -- Timestamps
    created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
    last_used_at TIMESTAMPTZ,
    
    -- Constraints
    CONSTRAINT unique_provider_account UNIQUE (provider, provider_user_id)
);

-- Indexes
CREATE INDEX idx_oauth_accounts_user_id ON oauth_accounts(user_id);
CREATE INDEX idx_oauth_accounts_provider ON oauth_accounts(provider);
CREATE INDEX idx_oauth_accounts_provider_user_id ON oauth_accounts(provider_user_id);
```

### 8. API Keys Table

```sql
CREATE TABLE api_keys (
    -- Primary Key
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    
    -- Relations
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    organization_id UUID REFERENCES organizations(id) ON DELETE CASCADE,
    
    -- Key Info
    name TEXT NOT NULL,
    description TEXT,
    key_hash TEXT UNIQUE NOT NULL, -- SHA256 hash
    key_prefix TEXT NOT NULL, -- First 8 chars for identification
    
    -- Permissions
    scopes TEXT[] DEFAULT ARRAY[]::TEXT[],
    permissions JSONB DEFAULT '{}'::JSONB,
    
    -- Restrictions
    allowed_ips INET[],
    allowed_origins TEXT[],
    rate_limit_per_minute INTEGER,
    
    -- Usage
    last_used_at TIMESTAMPTZ,
    last_used_ip INET,
    usage_count INTEGER DEFAULT 0,
    
    -- Expiration
    expires_at TIMESTAMPTZ,
    
    -- Status
    status TEXT DEFAULT 'active' CHECK (status IN ('active', 'revoked', 'expired')),
    revoked_at TIMESTAMPTZ,
    revoked_by UUID REFERENCES users(id),
    revoke_reason TEXT,
    
    -- Timestamps
    created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
    
    -- Constraints
    CHECK (user_id IS NOT NULL OR organization_id IS NOT NULL)
);

-- Indexes
CREATE INDEX idx_api_keys_user_id ON api_keys(user_id) WHERE user_id IS NOT NULL;
CREATE INDEX idx_api_keys_organization_id ON api_keys(organization_id) WHERE organization_id IS NOT NULL;
CREATE INDEX idx_api_keys_key_hash ON api_keys(key_hash);
CREATE INDEX idx_api_keys_key_prefix ON api_keys(key_prefix);
CREATE INDEX idx_api_keys_status ON api_keys(status) WHERE status = 'active';
CREATE INDEX idx_api_keys_expires_at ON api_keys(expires_at) WHERE expires_at IS NOT NULL;
```

### 9. Audit Logs Table

```sql
CREATE TABLE audit_logs (
    -- Primary Key
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    
    -- Relations
    user_id UUID REFERENCES users(id) ON DELETE SET NULL,
    organization_id UUID REFERENCES organizations(id) ON DELETE SET NULL,
    
    -- Event Info
    event_type TEXT NOT NULL,
    event_action TEXT NOT NULL,
    event_category TEXT,
    event_severity TEXT DEFAULT 'info' CHECK (event_severity IN ('debug', 'info', 'warning', 'error', 'critical')),
    
    -- Target
    target_type TEXT,
    target_id TEXT,
    target_name TEXT,
    
    -- Context
    ip_address INET,
    user_agent TEXT,
    session_id UUID,
    request_id TEXT,
    correlation_id TEXT,
    
    -- Location
    country_code CHAR(2),
    region TEXT,
    city TEXT,
    
    -- Data
    old_values JSONB,
    new_values JSONB,
    metadata JSONB DEFAULT '{}'::JSONB,
    
    -- Result
    success BOOLEAN DEFAULT TRUE,
    error_message TEXT,
    error_code TEXT,
    
    -- Timestamps
    created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);

-- Indexes
CREATE INDEX idx_audit_logs_user_id ON audit_logs(user_id) WHERE user_id IS NOT NULL;
CREATE INDEX idx_audit_logs_organization_id ON audit_logs(organization_id) WHERE organization_id IS NOT NULL;
CREATE INDEX idx_audit_logs_event_type ON audit_logs(event_type);
CREATE INDEX idx_audit_logs_event_action ON audit_logs(event_action);
CREATE INDEX idx_audit_logs_created_at ON audit_logs(created_at DESC);
CREATE INDEX idx_audit_logs_session_id ON audit_logs(session_id) WHERE session_id IS NOT NULL;
CREATE INDEX idx_audit_logs_target ON audit_logs(target_type, target_id) WHERE target_type IS NOT NULL;

-- Partitioning for large-scale audit logs
CREATE TABLE audit_logs_2024_01 PARTITION OF audit_logs
    FOR VALUES FROM ('2024-01-01') TO ('2024-02-01');
```

### 10. Email Verification Tokens Table

```sql
CREATE TABLE email_verification_tokens (
    -- Primary Key
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    
    -- Relations
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    
    -- Token Info
    token_hash TEXT UNIQUE NOT NULL,
    email CITEXT NOT NULL,
    
    -- Status
    used BOOLEAN DEFAULT FALSE,
    used_at TIMESTAMPTZ,
    
    -- Expiration
    expires_at TIMESTAMPTZ NOT NULL,
    
    -- Timestamps
    created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);

-- Indexes
CREATE INDEX idx_email_verification_tokens_user_id ON email_verification_tokens(user_id);
CREATE INDEX idx_email_verification_tokens_token_hash ON email_verification_tokens(token_hash);
CREATE INDEX idx_email_verification_tokens_expires_at ON email_verification_tokens(expires_at) WHERE used = FALSE;
```

### 11. Password Reset Tokens Table

```sql
CREATE TABLE password_reset_tokens (
    -- Primary Key
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    
    -- Relations
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    
    -- Token Info
    token_hash TEXT UNIQUE NOT NULL,
    
    -- Security
    ip_address INET,
    user_agent TEXT,
    
    -- Status
    used BOOLEAN DEFAULT FALSE,
    used_at TIMESTAMPTZ,
    
    -- Expiration
    expires_at TIMESTAMPTZ NOT NULL,
    
    -- Timestamps
    created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);

-- Indexes
CREATE INDEX idx_password_reset_tokens_user_id ON password_reset_tokens(user_id);
CREATE INDEX idx_password_reset_tokens_token_hash ON password_reset_tokens(token_hash);
CREATE INDEX idx_password_reset_tokens_expires_at ON password_reset_tokens(expires_at) WHERE used = FALSE;
```

### 12. Magic Links Table

```sql
CREATE TABLE magic_links (
    -- Primary Key
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    
    -- Link Info
    email CITEXT NOT NULL,
    token_hash TEXT UNIQUE NOT NULL,
    
    -- Relations
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    
    -- Security
    ip_address INET,
    user_agent TEXT,
    
    -- Status
    used BOOLEAN DEFAULT FALSE,
    used_at TIMESTAMPTZ,
    
    -- Expiration
    expires_at TIMESTAMPTZ NOT NULL,
    
    -- Timestamps
    created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);

-- Indexes
CREATE INDEX idx_magic_links_email ON magic_links(email);
CREATE INDEX idx_magic_links_token_hash ON magic_links(token_hash);
CREATE INDEX idx_magic_links_expires_at ON magic_links(expires_at) WHERE used = FALSE;
```

### 13. OTP Codes Table

```sql
CREATE TABLE otp_codes (
    -- Primary Key
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    
    -- Relations
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    
    -- OTP Info
    identifier TEXT NOT NULL, -- Email or phone
    code_hash TEXT NOT NULL,
    purpose TEXT NOT NULL CHECK (purpose IN ('login', 'verification', 'reset', '2fa')),
    
    -- Delivery
    delivery_method TEXT CHECK (delivery_method IN ('email', 'sms')),
    delivered_at TIMESTAMPTZ,
    
    -- Attempts
    attempts INTEGER DEFAULT 0,
    max_attempts INTEGER DEFAULT 3,
    
    -- Status
    used BOOLEAN DEFAULT FALSE,
    used_at TIMESTAMPTZ,
    
    -- Expiration
    expires_at TIMESTAMPTZ NOT NULL,
    
    -- Timestamps
    created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);

-- Indexes
CREATE INDEX idx_otp_codes_identifier ON otp_codes(identifier);
CREATE INDEX idx_otp_codes_user_id ON otp_codes(user_id) WHERE user_id IS NOT NULL;
CREATE INDEX idx_otp_codes_expires_at ON otp_codes(expires_at) WHERE used = FALSE;
```

### 14. Rate Limits Table

```sql
CREATE TABLE rate_limits (
    -- Primary Key
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    
    -- Identifier
    identifier TEXT NOT NULL, -- IP, user_id, api_key, etc.
    identifier_type TEXT NOT NULL CHECK (identifier_type IN ('ip', 'user', 'api_key', 'email')),
    
    -- Limit Info
    action TEXT NOT NULL,
    limit_value INTEGER NOT NULL,
    window_seconds INTEGER NOT NULL,
    
    -- Current State
    current_count INTEGER DEFAULT 0,
    window_start TIMESTAMPTZ NOT NULL,
    
    -- Timestamps
    created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
    
    -- Constraints
    CONSTRAINT unique_rate_limit UNIQUE (identifier, identifier_type, action)
);

-- Indexes
CREATE INDEX idx_rate_limits_identifier ON rate_limits(identifier, identifier_type, action);
CREATE INDEX idx_rate_limits_window_start ON rate_limits(window_start);
```

### 15. Plugin Data Table

```sql
CREATE TABLE plugin_data (
    -- Primary Key
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    
    -- Plugin Identification
    plugin_id TEXT NOT NULL,
    plugin_version TEXT,
    
    -- Relations (optional)
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    organization_id UUID REFERENCES organizations(id) ON DELETE CASCADE,
    
    -- Data
    key TEXT NOT NULL,
    value JSONB NOT NULL,
    encrypted BOOLEAN DEFAULT FALSE,
    
    -- Metadata
    metadata JSONB DEFAULT '{}'::JSONB,
    
    -- Timestamps
    created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
    expires_at TIMESTAMPTZ,
    
    -- Constraints
    CONSTRAINT unique_plugin_key UNIQUE (plugin_id, user_id, organization_id, key)
);

-- Indexes
CREATE INDEX idx_plugin_data_plugin_id ON plugin_data(plugin_id);
CREATE INDEX idx_plugin_data_user_id ON plugin_data(user_id) WHERE user_id IS NOT NULL;
CREATE INDEX idx_plugin_data_organization_id ON plugin_data(organization_id) WHERE organization_id IS NOT NULL;
CREATE INDEX idx_plugin_data_key ON plugin_data(key);
CREATE INDEX idx_plugin_data_expires_at ON plugin_data(expires_at) WHERE expires_at IS NOT NULL;
```

## Database Functions and Triggers

### Auto-update Timestamps

```sql
-- Function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Apply to all tables with updated_at
CREATE TRIGGER update_users_updated_at BEFORE UPDATE ON users
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_sessions_updated_at BEFORE UPDATE ON sessions
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_organizations_updated_at BEFORE UPDATE ON organizations
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ... (apply to all relevant tables)
```

### Soft Delete Function

```sql
-- Function for soft delete
CREATE OR REPLACE FUNCTION soft_delete()
RETURNS TRIGGER AS $$
BEGIN
    -- Instead of deleting, set deleted_at timestamp
    UPDATE users SET deleted_at = CURRENT_TIMESTAMP WHERE id = OLD.id;
    RETURN NULL; -- Prevent actual deletion
END;
$$ language 'plpgsql';

-- Apply soft delete to users
CREATE TRIGGER soft_delete_users
    BEFORE DELETE ON users
    FOR EACH ROW
    WHEN (OLD.deleted_at IS NULL)
    EXECUTE FUNCTION soft_delete();
```

### Session Cleanup Function

```sql
-- Function to clean up expired sessions
CREATE OR REPLACE FUNCTION cleanup_expired_sessions()
RETURNS void AS $$
BEGIN
    UPDATE sessions 
    SET status = 'expired'
    WHERE status = 'active' 
    AND access_token_expires_at < CURRENT_TIMESTAMP;
    
    DELETE FROM sessions 
    WHERE status = 'expired' 
    AND access_token_expires_at < CURRENT_TIMESTAMP - INTERVAL '30 days';
END;
$$ language 'plpgsql';

-- Schedule with pg_cron or external scheduler
-- SELECT cron.schedule('cleanup-sessions', '0 */6 * * *', 'SELECT cleanup_expired_sessions()');
```

## Performance Optimization

### Indexing Strategy

1. **Primary Keys**: All tables use UUID primary keys with B-tree indexes
2. **Foreign Keys**: Indexed for fast joins
3. **Search Fields**: Case-insensitive indexes on email, username, slug
4. **JSON Fields**: GIN indexes for JSONB columns
5. **Timestamp Fields**: Indexes on frequently queried date ranges
6. **Composite Indexes**: For common query patterns

### Query Optimization

```sql
-- Example: Efficient user session query
CREATE INDEX idx_sessions_user_active ON sessions(user_id, status, last_activity_at DESC) 
WHERE status = 'active';

-- Example: Organization member lookup
CREATE INDEX idx_org_members_lookup ON organization_members(organization_id, user_id, status) 
WHERE status = 'active';
```

### Partitioning Strategy

For high-volume tables like audit_logs, implement time-based partitioning:

```sql
-- Monthly partitions for audit logs
CREATE TABLE audit_logs_2024_02 PARTITION OF audit_logs
    FOR VALUES FROM ('2024-02-01') TO ('2024-03-01');

-- Automated partition creation
CREATE OR REPLACE FUNCTION create_monthly_partition()
RETURNS void AS $$
DECLARE
    partition_name TEXT;
    start_date DATE;
    end_date DATE;
BEGIN
    start_date := DATE_TRUNC('month', CURRENT_DATE + INTERVAL '1 month');
    end_date := start_date + INTERVAL '1 month';
    partition_name := 'audit_logs_' || TO_CHAR(start_date, 'YYYY_MM');
    
    EXECUTE format('CREATE TABLE IF NOT EXISTS %I PARTITION OF audit_logs FOR VALUES FROM (%L) TO (%L)',
        partition_name, start_date, end_date);
END;
$$ LANGUAGE plpgsql;
```

## Security Considerations

### Encryption

1. **At Rest**: Use PostgreSQL Transparent Data Encryption (TDE)
2. **Sensitive Fields**: Encrypt using pgcrypto for fields like:
   - OAuth tokens
   - Two-factor secrets
   - API keys
   - Backup codes

```sql
-- Example: Encrypting sensitive data
CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- Encrypt on insert
INSERT INTO users (email, two_factor_secret) 
VALUES ('user@example.com', pgp_sym_encrypt('secret', 'encryption_key'));

-- Decrypt on select
SELECT email, pgp_sym_decrypt(two_factor_secret::bytea, 'encryption_key') as secret 
FROM users;
```

### Row-Level Security

```sql
-- Enable RLS on sensitive tables
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE organizations ENABLE ROW LEVEL SECURITY;

-- Example policy: Users can only see their own data
CREATE POLICY users_isolation ON users
    FOR ALL
    USING (id = current_setting('app.current_user_id')::UUID);

-- Example policy: Organization members can see org data
CREATE POLICY org_member_access ON organizations
    FOR SELECT
    USING (
        id IN (
            SELECT organization_id 
            FROM organization_members 
            WHERE user_id = current_setting('app.current_user_id')::UUID
            AND status = 'active'
        )
    );
```

## Backup and Recovery

### Backup Strategy

```bash
# Full backup
pg_dump -h localhost -U cf_auth_admin -d cf_better_auth -F c -b -v -f backup.dump

# Incremental backup with WAL archiving
archive_mode = on
archive_command = 'test ! -f /backup/wal/%f && cp %p /backup/wal/%f'

# Point-in-time recovery
restore_command = 'cp /backup/wal/%f %p'
recovery_target_time = '2024-01-15 10:00:00'
```

### Disaster Recovery

1. **Primary-Standby Replication**: Real-time replication to standby
2. **Cross-Region Backups**: Store backups in different geographic regions
3. **Automated Testing**: Regular restoration tests
4. **RPO/RTO Targets**: 
   - RPO (Recovery Point Objective): < 1 hour
   - RTO (Recovery Time Objective): < 4 hours

## Monitoring and Maintenance

### Key Metrics to Monitor

```sql
-- Table sizes
SELECT 
    schemaname,
    tablename,
    pg_size_pretty(pg_total_relation_size(schemaname||'.'||tablename)) AS size
FROM pg_tables
WHERE schemaname = 'public'
ORDER BY pg_total_relation_size(schemaname||'.'||tablename) DESC;

-- Slow queries
SELECT 
    query,
    calls,
    total_time,
    mean_time,
    max_time
FROM pg_stat_statements
ORDER BY mean_time DESC
LIMIT 10;

-- Index usage
SELECT 
    schemaname,
    tablename,
    indexname,
    idx_scan,
    idx_tup_read,
    idx_tup_fetch
FROM pg_stat_user_indexes
ORDER BY idx_scan;
```

### Regular Maintenance Tasks

```sql
-- Vacuum and analyze
VACUUM ANALYZE users;
VACUUM ANALYZE sessions;
VACUUM ANALYZE audit_logs;

-- Reindex for performance
REINDEX TABLE users;
REINDEX TABLE sessions;

-- Update statistics
ANALYZE;
```

## Migration Strategy

### Version Control

All schema changes should be versioned and tracked:

```sql
CREATE TABLE schema_migrations (
    version INTEGER PRIMARY KEY,
    name TEXT NOT NULL,
    applied_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);

-- Example migration
INSERT INTO schema_migrations (version, name) 
VALUES (1, 'initial_schema');
```

### Migration Best Practices

1. **Always use transactions** for schema changes
2. **Test migrations** in staging environment first
3. **Include rollback scripts** for every migration
4. **Use zero-downtime migration techniques** for production
5. **Document breaking changes** clearly

This comprehensive database schema provides a solid foundation for CF-Better-Auth's authentication and authorization needs while maintaining flexibility for future extensions and scaling requirements.
-- CF-Better-Auth Initial Schema Migration
-- This migration sets up the core database schema for CF-Better-Auth

-- Enable required extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";      -- UUID generation
CREATE EXTENSION IF NOT EXISTS "pgcrypto";       -- Encryption functions
CREATE EXTENSION IF NOT EXISTS "citext";         -- Case-insensitive text
CREATE EXTENSION IF NOT EXISTS "pg_trgm";        -- Trigram similarity search
CREATE EXTENSION IF NOT EXISTS "btree_gin";      -- GIN index support

-- Create users table (core better-auth table with extensions)
CREATE TABLE IF NOT EXISTS "user" (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name TEXT,
    email CITEXT UNIQUE NOT NULL,
    emailVerified BOOLEAN DEFAULT FALSE,
    image TEXT,
    createdAt TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
    updatedAt TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
    
    -- CF-Better-Auth extensions
    username CITEXT UNIQUE,
    phoneNumber TEXT,
    phoneNumberVerified BOOLEAN DEFAULT FALSE,
    twoFactorEnabled BOOLEAN DEFAULT FALSE,
    role TEXT DEFAULT 'user',
    status TEXT DEFAULT 'active' CHECK (status IN ('active', 'inactive', 'suspended', 'deleted')),
    lastActiveAt TIMESTAMPTZ,
    metadata JSONB DEFAULT '{}'::JSONB,
    preferences JSONB DEFAULT '{}'::JSONB
);

-- Create session table
CREATE TABLE IF NOT EXISTS "session" (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    userId UUID NOT NULL REFERENCES "user"(id) ON DELETE CASCADE,
    expiresAt TIMESTAMPTZ NOT NULL,
    token TEXT UNIQUE NOT NULL,
    ipAddress INET,
    userAgent TEXT,
    createdAt TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
    updatedAt TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
    
    -- CF-Better-Auth extensions
    deviceId TEXT,
    deviceName TEXT,
    lastActivityAt TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
    isActive BOOLEAN DEFAULT TRUE
);

-- Create account table (OAuth providers)
CREATE TABLE IF NOT EXISTS "account" (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    userId UUID NOT NULL REFERENCES "user"(id) ON DELETE CASCADE,
    providerId TEXT NOT NULL,
    accountId TEXT NOT NULL,
    accessToken TEXT,
    refreshToken TEXT,
    idToken TEXT,
    expiresAt TIMESTAMPTZ,
    scope TEXT,
    createdAt TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
    updatedAt TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
    
    UNIQUE(providerId, accountId)
);

-- Create verification table (email/phone verification)
CREATE TABLE IF NOT EXISTS "verification" (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    identifier TEXT NOT NULL,
    value TEXT NOT NULL,
    expiresAt TIMESTAMPTZ NOT NULL,
    createdAt TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
    
    UNIQUE(identifier, value)
);

-- Create organization table
CREATE TABLE IF NOT EXISTS "organization" (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name TEXT NOT NULL,
    slug CITEXT UNIQUE NOT NULL,
    logo TEXT,
    createdAt TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
    updatedAt TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
    
    -- CF-Better-Auth extensions
    description TEXT,
    website TEXT,
    settings JSONB DEFAULT '{}'::JSONB,
    billingEmail CITEXT,
    maxMembers INTEGER DEFAULT 100,
    status TEXT DEFAULT 'active' CHECK (status IN ('active', 'inactive', 'suspended'))
);

-- Create organization member table
CREATE TABLE IF NOT EXISTS "member" (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    organizationId UUID NOT NULL REFERENCES "organization"(id) ON DELETE CASCADE,
    userId UUID NOT NULL REFERENCES "user"(id) ON DELETE CASCADE,
    role TEXT NOT NULL DEFAULT 'member',
    createdAt TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
    updatedAt TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
    
    -- CF-Better-Auth extensions
    permissions JSONB DEFAULT '[]'::JSONB,
    invitedBy UUID REFERENCES "user"(id),
    status TEXT DEFAULT 'active' CHECK (status IN ('active', 'pending', 'inactive')),
    
    UNIQUE(organizationId, userId)
);

-- Create invitation table
CREATE TABLE IF NOT EXISTS "invitation" (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    organizationId UUID NOT NULL REFERENCES "organization"(id) ON DELETE CASCADE,
    email CITEXT NOT NULL,
    role TEXT NOT NULL DEFAULT 'member',
    inviterId UUID NOT NULL REFERENCES "user"(id),
    token TEXT UNIQUE NOT NULL,
    expiresAt TIMESTAMPTZ NOT NULL,
    status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'accepted', 'expired', 'revoked')),
    createdAt TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
    updatedAt TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);

-- Create API keys table
CREATE TABLE IF NOT EXISTS "apiKey" (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name TEXT NOT NULL,
    key TEXT UNIQUE NOT NULL,
    keyHash TEXT UNIQUE NOT NULL,
    userId UUID REFERENCES "user"(id) ON DELETE CASCADE,
    organizationId UUID REFERENCES "organization"(id) ON DELETE CASCADE,
    expiresAt TIMESTAMPTZ,
    createdAt TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
    lastUsedAt TIMESTAMPTZ,
    
    -- CF-Better-Auth extensions
    scopes TEXT[] DEFAULT ARRAY[]::TEXT[],
    rateLimitPerMinute INTEGER,
    allowedIPs INET[],
    isActive BOOLEAN DEFAULT TRUE,
    
    CHECK (userId IS NOT NULL OR organizationId IS NOT NULL)
);

-- Create passkey table (WebAuthn)
CREATE TABLE IF NOT EXISTS "passkey" (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    userId UUID NOT NULL REFERENCES "user"(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    publicKey TEXT NOT NULL,
    credentialID TEXT UNIQUE NOT NULL,
    counter INTEGER DEFAULT 0,
    createdAt TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
    lastUsedAt TIMESTAMPTZ,
    
    -- CF-Better-Auth extensions
    deviceType TEXT,
    backupEligible BOOLEAN DEFAULT FALSE,
    backupState BOOLEAN DEFAULT FALSE,
    transports TEXT[] DEFAULT ARRAY[]::TEXT[],
    isActive BOOLEAN DEFAULT TRUE
);

-- Create twoFactor table
CREATE TABLE IF NOT EXISTS "twoFactor" (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    userId UUID NOT NULL REFERENCES "user"(id) ON DELETE CASCADE,
    secret TEXT NOT NULL,
    backupCodes TEXT[],
    createdAt TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
    
    -- CF-Better-Auth extensions
    lastUsedAt TIMESTAMPTZ,
    failedAttempts INTEGER DEFAULT 0,
    lockedUntil TIMESTAMPTZ
);

-- Create audit logs table
CREATE TABLE IF NOT EXISTS "auditLog" (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    userId UUID REFERENCES "user"(id) ON DELETE SET NULL,
    organizationId UUID REFERENCES "organization"(id) ON DELETE SET NULL,
    action TEXT NOT NULL,
    resource TEXT NOT NULL,
    resourceId TEXT,
    ipAddress INET,
    userAgent TEXT,
    metadata JSONB DEFAULT '{}'::JSONB,
    createdAt TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);

-- Create indexes for performance

-- User table indexes
CREATE INDEX IF NOT EXISTS idx_user_email ON "user"(email);
CREATE INDEX IF NOT EXISTS idx_user_username ON "user"(username) WHERE username IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_user_phone ON "user"(phoneNumber) WHERE phoneNumber IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_user_status ON "user"(status) WHERE status != 'active';
CREATE INDEX IF NOT EXISTS idx_user_created_at ON "user"(createdAt);
CREATE INDEX IF NOT EXISTS idx_user_metadata ON "user" USING GIN(metadata);

-- Session table indexes
CREATE INDEX IF NOT EXISTS idx_session_user_id ON "session"(userId);
CREATE INDEX IF NOT EXISTS idx_session_token ON "session"(token);
CREATE INDEX IF NOT EXISTS idx_session_expires_at ON "session"(expiresAt);
CREATE INDEX IF NOT EXISTS idx_session_device_id ON "session"(deviceId) WHERE deviceId IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_session_active ON "session"(userId, isActive) WHERE isActive = TRUE;

-- Account table indexes
CREATE INDEX IF NOT EXISTS idx_account_user_id ON "account"(userId);
CREATE INDEX IF NOT EXISTS idx_account_provider ON "account"(providerId, accountId);

-- Organization table indexes
CREATE INDEX IF NOT EXISTS idx_organization_slug ON "organization"(slug);
CREATE INDEX IF NOT EXISTS idx_organization_status ON "organization"(status) WHERE status != 'active';

-- Member table indexes
CREATE INDEX IF NOT EXISTS idx_member_organization_id ON "member"(organizationId);
CREATE INDEX IF NOT EXISTS idx_member_user_id ON "member"(userId);
CREATE INDEX IF NOT EXISTS idx_member_role ON "member"(organizationId, role);

-- Invitation table indexes
CREATE INDEX IF NOT EXISTS idx_invitation_organization_id ON "invitation"(organizationId);
CREATE INDEX IF NOT EXISTS idx_invitation_email ON "invitation"(email);
CREATE INDEX IF NOT EXISTS idx_invitation_token ON "invitation"(token);
CREATE INDEX IF NOT EXISTS idx_invitation_expires_at ON "invitation"(expiresAt) WHERE status = 'pending';

-- API key table indexes
CREATE INDEX IF NOT EXISTS idx_apikey_user_id ON "apiKey"(userId) WHERE userId IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_apikey_organization_id ON "apiKey"(organizationId) WHERE organizationId IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_apikey_key_hash ON "apiKey"(keyHash);
CREATE INDEX IF NOT EXISTS idx_apikey_active ON "apiKey"(isActive) WHERE isActive = TRUE;

-- Passkey table indexes
CREATE INDEX IF NOT EXISTS idx_passkey_user_id ON "passkey"(userId);
CREATE INDEX IF NOT EXISTS idx_passkey_credential_id ON "passkey"(credentialID);
CREATE INDEX IF NOT EXISTS idx_passkey_active ON "passkey"(userId, isActive) WHERE isActive = TRUE;

-- TwoFactor table indexes
CREATE INDEX IF NOT EXISTS idx_twofactor_user_id ON "twoFactor"(userId);

-- Audit log table indexes
CREATE INDEX IF NOT EXISTS idx_auditlog_user_id ON "auditLog"(userId) WHERE userId IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_auditlog_organization_id ON "auditLog"(organizationId) WHERE organizationId IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_auditlog_action ON "auditLog"(action);
CREATE INDEX IF NOT EXISTS idx_auditlog_resource ON "auditLog"(resource, resourceId);
CREATE INDEX IF NOT EXISTS idx_auditlog_created_at ON "auditLog"(createdAt DESC);

-- Triggers for updating timestamps
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updatedAt = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Apply update triggers to relevant tables
CREATE TRIGGER update_user_updated_at BEFORE UPDATE ON "user"
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_session_updated_at BEFORE UPDATE ON "session"
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_account_updated_at BEFORE UPDATE ON "account"
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_organization_updated_at BEFORE UPDATE ON "organization"
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_member_updated_at BEFORE UPDATE ON "member"
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_invitation_updated_at BEFORE UPDATE ON "invitation"
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Create migration tracking table
CREATE TABLE IF NOT EXISTS "migration" (
    id SERIAL PRIMARY KEY,
    version TEXT UNIQUE NOT NULL,
    name TEXT NOT NULL,
    appliedAt TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);

-- Record this migration
INSERT INTO "migration" (version, name) VALUES ('001', 'initial_schema') 
ON CONFLICT (version) DO NOTHING;
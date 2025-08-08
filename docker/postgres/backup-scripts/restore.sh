#!/bin/bash

# PostgreSQL Restore Script for CF Better Auth
# This script restores a database from a backup file

set -e

# Configuration
BACKUP_DIR="/backup"
DB_NAME="${POSTGRES_DB:-cf_auth}"
DB_USER="${POSTGRES_USER:-cf_auth_user}"

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Function to log messages
log() {
    echo -e "${GREEN}[$(date '+%Y-%m-%d %H:%M:%S')]${NC} $1"
}

error() {
    echo -e "${RED}[ERROR]${NC} $1" >&2
}

warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1"
}

info() {
    echo -e "${BLUE}[INFO]${NC} $1"
}

# Check if backup file is provided
if [ $# -eq 0 ]; then
    info "Usage: $0 <backup_file> [--force]"
    info "       $0 latest [--force]"
    echo ""
    info "Available backups:"
    ls -lh "${BACKUP_DIR}"/backup_*.sql.gz 2>/dev/null || echo "No backups found"
    exit 1
fi

BACKUP_FILE="$1"
FORCE_RESTORE="${2:-}"

# Handle 'latest' keyword
if [ "$BACKUP_FILE" = "latest" ]; then
    BACKUP_FILE="${BACKUP_DIR}/latest_${DB_NAME}.sql.gz"
    if [ ! -f "$BACKUP_FILE" ]; then
        error "No latest backup found"
        exit 1
    fi
    info "Using latest backup: $(readlink -f $BACKUP_FILE)"
elif [[ ! "$BACKUP_FILE" =~ ^/ ]]; then
    # If not an absolute path, assume it's in the backup directory
    BACKUP_FILE="${BACKUP_DIR}/$BACKUP_FILE"
fi

# Check if backup file exists
if [ ! -f "$BACKUP_FILE" ]; then
    error "Backup file not found: $BACKUP_FILE"
    exit 1
fi

# Display backup information
if [ -f "${BACKUP_FILE}.info" ]; then
    info "Backup metadata:"
    cat "${BACKUP_FILE}.info" | python3 -m json.tool 2>/dev/null || cat "${BACKUP_FILE}.info"
fi

# Confirm restore
if [ "$FORCE_RESTORE" != "--force" ]; then
    warning "This will replace all data in database: $DB_NAME"
    read -p "Are you sure you want to continue? (yes/no): " CONFIRM
    if [ "$CONFIRM" != "yes" ]; then
        info "Restore cancelled"
        exit 0
    fi
fi

# Create a safety backup before restore
SAFETY_BACKUP="${BACKUP_DIR}/pre_restore_safety_$(date +%Y%m%d_%H%M%S).sql.gz"
log "Creating safety backup before restore..."
if pg_dump -U "$DB_USER" -d "$DB_NAME" --no-owner | gzip > "$SAFETY_BACKUP"; then
    log "Safety backup created: $SAFETY_BACKUP"
else
    warning "Failed to create safety backup, continuing anyway..."
fi

# Terminate existing connections to the database
log "Terminating existing database connections..."
psql -U "$DB_USER" -d postgres -c "
    SELECT pg_terminate_backend(pid) 
    FROM pg_stat_activity 
    WHERE datname = '$DB_NAME' 
    AND pid <> pg_backend_pid();" > /dev/null 2>&1 || true

# Perform restore
log "Starting restore from: $BACKUP_FILE"

# Drop and recreate database for clean restore
log "Preparing database for restore..."
psql -U "$DB_USER" -d postgres <<EOF
DROP DATABASE IF EXISTS ${DB_NAME}_restore_temp;
CREATE DATABASE ${DB_NAME}_restore_temp WITH OWNER = $DB_USER;
EOF

# Restore to temporary database first
if gunzip -c "$BACKUP_FILE" | psql -U "$DB_USER" -d "${DB_NAME}_restore_temp" > /dev/null 2>&1; then
    log "Backup restored to temporary database successfully"
    
    # Swap databases
    log "Swapping databases..."
    psql -U "$DB_USER" -d postgres <<EOF
ALTER DATABASE $DB_NAME RENAME TO ${DB_NAME}_old;
ALTER DATABASE ${DB_NAME}_restore_temp RENAME TO $DB_NAME;
DROP DATABASE IF EXISTS ${DB_NAME}_old;
EOF
    
    log "Database swap completed"
else
    error "Restore failed! Original database unchanged."
    psql -U "$DB_USER" -d postgres -c "DROP DATABASE IF EXISTS ${DB_NAME}_restore_temp;" > /dev/null 2>&1
    exit 1
fi

# Verify restore
log "Verifying restore..."
TABLE_COUNT=$(psql -U "$DB_USER" -d "$DB_NAME" -t -c "SELECT COUNT(*) FROM information_schema.tables WHERE table_schema = 'public';")
log "Restored database contains $TABLE_COUNT tables"

# Run ANALYZE to update statistics
log "Updating database statistics..."
psql -U "$DB_USER" -d "$DB_NAME" -c "ANALYZE;" > /dev/null 2>&1

log "Restore completed successfully!"
info "Database $DB_NAME has been restored from $BACKUP_FILE"

# Cleanup old safety backups (keep last 3)
log "Cleaning up old safety backups..."
ls -t "${BACKUP_DIR}"/pre_restore_safety_*.sql.gz 2>/dev/null | tail -n +4 | xargs rm -f 2>/dev/null || true

exit 0
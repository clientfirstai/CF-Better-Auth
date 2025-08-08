#!/bin/bash

# PostgreSQL Backup Script for CF Better Auth
# This script creates timestamped backups of the PostgreSQL database

set -e

# Configuration
BACKUP_DIR="/backup"
DB_NAME="${POSTGRES_DB:-cf_auth}"
DB_USER="${POSTGRES_USER:-cf_auth_user}"
TIMESTAMP=$(date +%Y%m%d_%H%M%S)
BACKUP_FILE="${BACKUP_DIR}/backup_${DB_NAME}_${TIMESTAMP}.sql.gz"
RETENTION_DAYS=${BACKUP_RETENTION_DAYS:-30}

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
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

# Create backup directory if it doesn't exist
if [ ! -d "$BACKUP_DIR" ]; then
    mkdir -p "$BACKUP_DIR"
    log "Created backup directory: $BACKUP_DIR"
fi

# Perform backup
log "Starting backup of database: $DB_NAME"

if pg_dump -U "$DB_USER" -d "$DB_NAME" --no-owner --clean --if-exists | gzip > "$BACKUP_FILE"; then
    log "Backup completed successfully: $BACKUP_FILE"
    
    # Get backup size
    BACKUP_SIZE=$(du -h "$BACKUP_FILE" | cut -f1)
    log "Backup size: $BACKUP_SIZE"
    
    # Verify backup integrity
    if gunzip -t "$BACKUP_FILE" 2>/dev/null; then
        log "Backup integrity verified"
    else
        error "Backup integrity check failed!"
        exit 1
    fi
else
    error "Backup failed!"
    exit 1
fi

# Clean up old backups
log "Cleaning up backups older than $RETENTION_DAYS days"
find "$BACKUP_DIR" -name "backup_${DB_NAME}_*.sql.gz" -type f -mtime +$RETENTION_DAYS -delete

# List remaining backups
BACKUP_COUNT=$(find "$BACKUP_DIR" -name "backup_${DB_NAME}_*.sql.gz" -type f | wc -l)
log "Total backups retained: $BACKUP_COUNT"

# Create a latest symlink
ln -sf "$BACKUP_FILE" "${BACKUP_DIR}/latest_${DB_NAME}.sql.gz"
log "Created symlink to latest backup"

# Generate backup metadata
cat > "${BACKUP_FILE}.info" <<EOF
{
  "timestamp": "$(date -Iseconds)",
  "database": "$DB_NAME",
  "size": "$BACKUP_SIZE",
  "retention_days": $RETENTION_DAYS,
  "postgres_version": "$(postgres --version | awk '{print $3}')",
  "backup_file": "$(basename $BACKUP_FILE)"
}
EOF

log "Backup process completed successfully"
exit 0
#!/bin/bash
# Postgres logical backup via pg_dump inside the running container.
# Retention: RETENTION_DAYS daily backups are kept; older files are deleted.
# Intended to run as a cron job on the VM as user ezl.
# See docs/infra/postgres-backup.md for setup and restore instructions.

set -euo pipefail

CONTAINER="ezl-postgres-1"
DB_USER="${POSTGRES_USER:-ezl}"
DB_NAME="${POSTGRES_DB:-ezlaunch}"
BACKUP_DIR="${HOME}/ezl/backups"
RETENTION_DAYS=7
TIMESTAMP=$(date -u +%Y%m%d_%H%M%S)
FILENAME="ezlaunch_${TIMESTAMP}.sql.gz"
LOG_DIR="${HOME}/ezl/logs"
LOG_FILE="${LOG_DIR}/backup.log"

mkdir -p "$BACKUP_DIR" "$LOG_DIR"

log() {
  echo "[$(date -u '+%Y-%m-%d %H:%M:%S UTC')] $*" | tee -a "$LOG_FILE"
}

log "START backup → ${FILENAME}"

if ! docker inspect "$CONTAINER" > /dev/null 2>&1; then
  log "ERROR: container $CONTAINER not found or not running"
  exit 1
fi

docker exec "$CONTAINER" pg_dump -U "$DB_USER" "$DB_NAME" \
  | gzip > "${BACKUP_DIR}/${FILENAME}"

SIZE=$(du -sh "${BACKUP_DIR}/${FILENAME}" | cut -f1)
log "OK size=${SIZE} file=${FILENAME}"

# Remove backups older than RETENTION_DAYS
DELETED=$(find "$BACKUP_DIR" -name "ezlaunch_*.sql.gz" -mtime "+${RETENTION_DAYS}" -print -delete | wc -l)
[[ "$DELETED" -gt 0 ]] && log "PRUNED ${DELETED} backup(s) older than ${RETENTION_DAYS} days"

log "DONE"

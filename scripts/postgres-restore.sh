#!/bin/bash
# Restore Postgres from a backup created by postgres-backup.sh.
# Usage: ./postgres-restore.sh <backup-file.sql.gz>
# See docs/infra/postgres-backup.md for the full restore procedure and caveats.

set -euo pipefail

CONTAINER="ezl-postgres-1"
DB_USER="${POSTGRES_USER:-ezl}"
DB_NAME="${POSTGRES_DB:-ezlaunch}"
BACKUP_FILE="${1:-}"

if [[ -z "$BACKUP_FILE" ]]; then
  echo "Usage: $0 <backup-file.sql.gz>"
  echo "Available backups:"
  ls -lh "${HOME}/ezl/backups/ezlaunch_"*.sql.gz 2>/dev/null || echo "  (none found in ~/ezl/backups/)"
  exit 1
fi

if [[ ! -f "$BACKUP_FILE" ]]; then
  echo "ERROR: file not found: $BACKUP_FILE"
  exit 1
fi

echo "=== Postgres restore ==="
echo "  File:      $BACKUP_FILE"
echo "  Container: $CONTAINER"
echo "  Database:  $DB_NAME"
echo ""
read -rp "This will OVERWRITE the current database. Proceed? [yes/N]: " CONFIRM
[[ "$CONFIRM" != "yes" ]] && echo "Aborted." && exit 0

echo "[1/4] Stopping app containers to prevent writes during restore..."
cd ~/ezl && docker compose stop node-app python-app

echo "[2/4] Dropping and recreating database..."
docker exec "$CONTAINER" psql -U "$DB_USER" -c "DROP DATABASE IF EXISTS ${DB_NAME};"
docker exec "$CONTAINER" psql -U "$DB_USER" -c "CREATE DATABASE ${DB_NAME} OWNER ${DB_USER};"

echo "[3/4] Restoring from $BACKUP_FILE..."
gunzip -c "$BACKUP_FILE" | docker exec -i "$CONTAINER" psql -U "$DB_USER" "$DB_NAME"

echo "[4/4] Restarting app containers..."
cd ~/ezl && docker compose start node-app python-app

echo ""
echo "=== Restore complete. Run health check: ==="
echo "  docker exec ezl-caddy-1 wget -qO- http://node-app:3000/health"

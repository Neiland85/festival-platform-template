#!/usr/bin/env bash
# ──────────────────────────────────────────────────────────────
# Pre-migration backup — pg_dump for staging/production
#
# Usage:
#   ./scripts/backup-before-migrate.sh                          # uses DATABASE_URL from env
#   ./scripts/backup-before-migrate.sh "postgres://u:p@host/db" # explicit URL
#   BACKUP_DIR=/custom/path ./scripts/backup-before-migrate.sh  # custom output dir
#
# Output:
#   backups/festival-<dbname>-<timestamp>.dump
#
# Safety:
#   - Refuses to run if DATABASE_URL points to localhost/CI databases
#   - Creates compressed backup with pg_dump --format=custom
#   - Verifies backup integrity with pg_restore --list
#
# Prerequisites:
#   - pg_dump (PostgreSQL client tools)
#   - gzip
# ──────────────────────────────────────────────────────────────
set -euo pipefail

# ── Config ──────────────────────────────────────────────────────
DB_URL="${1:-${DATABASE_URL:-}}"
BACKUP_DIR="${BACKUP_DIR:-backups}"
TIMESTAMP=$(date +%Y%m%d-%H%M%S)

# ── Colors ──────────────────────────────────────────────────────
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[0;33m'
NC='\033[0m'

# ── Validation ──────────────────────────────────────────────────
if [[ -z "${DB_URL}" ]]; then
  echo -e "${RED}Error: No DATABASE_URL provided.${NC}"
  echo "  Usage: $0 <database-url>"
  echo "  Or set DATABASE_URL environment variable."
  exit 1
fi

# Check pg_dump is installed
if ! command -v pg_dump &>/dev/null; then
  echo -e "${RED}Error: pg_dump not found.${NC}"
  echo "  Install: brew install libpq (macOS) or apt install postgresql-client (Linux)"
  exit 1
fi

# Extract host and DB name for safety checks and naming
DB_HOST=$(echo "$DB_URL" | sed -E 's|.*@([^:/]+).*|\1|')
DB_NAME=$(echo "$DB_URL" | sed -E 's|.*/([^?]+).*|\1|')

# ── Safety: refuse localhost/CI databases ───────────────────────
BLOCKED_HOSTS=("localhost" "127.0.0.1" "postgres")
BLOCKED_DBS=("ci" "ci_e2e" "ci_test" "test")

for h in "${BLOCKED_HOSTS[@]}"; do
  if [[ "$DB_HOST" == "$h" ]]; then
    echo -e "${YELLOW}Warning: DATABASE_URL points to '${DB_HOST}' — this looks like a local/CI database.${NC}"
    echo -e "${YELLOW}Backups are intended for staging/production. Skipping.${NC}"
    exit 0
  fi
done

for d in "${BLOCKED_DBS[@]}"; do
  if [[ "$DB_NAME" == "$d" ]]; then
    echo -e "${YELLOW}Warning: Database name '${DB_NAME}' looks like a CI/test database.${NC}"
    echo -e "${YELLOW}Backups are intended for staging/production. Skipping.${NC}"
    exit 0
  fi
done

# ── Backup ──────────────────────────────────────────────────────
mkdir -p "${BACKUP_DIR}"
BACKUP_FILE="${BACKUP_DIR}/festival-${DB_NAME}-${TIMESTAMP}.dump"

echo -e "${GREEN}╔══════════════════════════════════════════╗${NC}"
echo -e "${GREEN}║   Pre-migration Backup                   ║${NC}"
echo -e "${GREEN}╚══════════════════════════════════════════╝${NC}"
echo ""
echo -e "  Host:     ${DB_HOST}"
echo -e "  Database: ${DB_NAME}"
echo -e "  Output:   ${BACKUP_FILE}"
echo -e "  Time:     $(date -u +%Y-%m-%dT%H:%M:%SZ)"
echo ""

echo -e "📦 Running pg_dump (custom format)..."
pg_dump \
  --format=custom \
  --verbose \
  --no-owner \
  --no-privileges \
  --file="${BACKUP_FILE}" \
  "${DB_URL}" 2>&1 | tail -5

# ── Verify backup integrity ────────────────────────────────────
echo ""
echo -e "🔍 Verifying backup integrity..."
if pg_restore --list "${BACKUP_FILE}" >/dev/null 2>&1; then
  echo -e "${GREEN}✅ Backup verified successfully${NC}"
else
  echo -e "${RED}❌ Backup verification failed — file may be corrupt${NC}"
  exit 1
fi

# ── Summary ─────────────────────────────────────────────────────
FILESIZE=$(du -h "${BACKUP_FILE}" | cut -f1)
TABLE_COUNT=$(pg_restore --list "${BACKUP_FILE}" 2>/dev/null | grep -c "TABLE " || true)

echo ""
echo -e "═══════════════════════════════════════════"
echo -e "  File:   ${BACKUP_FILE}"
echo -e "  Size:   ${FILESIZE}"
echo -e "  Tables: ${TABLE_COUNT}"
echo -e "═══════════════════════════════════════════"
echo ""
echo -e "${GREEN}Backup complete. To restore:${NC}"
echo -e "  pg_restore --verbose --clean --if-exists --no-owner -d \$DATABASE_URL ${BACKUP_FILE}"

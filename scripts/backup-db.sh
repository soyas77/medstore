#!/usr/bin/env bash
# =============================================================================
# scripts/backup-db.sh
# Dump the MedStore Postgres database and upload to S3 (gzip + timestamp).
# Keeps a local copy in ./backups and prunes local files older than 7 days.
#
# Required env (from root .env or environment):
#   POSTGRES_USER, POSTGRES_PASSWORD, POSTGRES_DB
#   BACKUP_S3_BUCKET   e.g. s3://my-bucket/medstore-backups
#   AWS_REGION         e.g. us-east-1
# Optional:
#   POSTGRES_HOST (default: localhost or "postgres" inside compose network)
#   POSTGRES_PORT (default: 5432)
#
# Cron example (daily 02:30, log to syslog):
#   30 2 * * *  cd /opt/medstore && ./scripts/backup-db.sh >> /var/log/medstore-backup.log 2>&1
#
# Inside docker compose you can instead schedule:
#   docker compose exec -T postgres pg_dump ...   (see DEPLOYMENT.md)
# =============================================================================
set -euo pipefail

cd "$(dirname "$0")/.."

if [ -f .env ]; then
  set -a; . ./.env; set +a
fi

: "${POSTGRES_USER:?POSTGRES_USER is required}"
: "${POSTGRES_DB:?POSTGRES_DB is required}"
: "${BACKUP_S3_BUCKET:?BACKUP_S3_BUCKET is required (e.g. s3://bucket/path)}"

POSTGRES_HOST="${POSTGRES_HOST:-localhost}"
POSTGRES_PORT="${POSTGRES_PORT:-5432}"

TS="$(date -u +%Y%m%dT%H%M%SZ)"
LOCAL_DIR="./backups"
FILE="medstore_${POSTGRES_DB}_${TS}.sql.gz"
mkdir -p "$LOCAL_DIR"

echo "==> Dumping ${POSTGRES_DB} from ${POSTGRES_HOST}:${POSTGRES_PORT}…"
export PGPASSWORD="${POSTGRES_PASSWORD:-}"

# Use pg_dump from the running container if available, else local pg_dump.
if command -v docker >/dev/null 2>&1 && docker compose ps postgres >/dev/null 2>&1; then
  docker compose exec -T postgres pg_dump -U "$POSTGRES_USER" -d "$POSTGRES_DB" \
    | gzip > "${LOCAL_DIR}/${FILE}"
else
  pg_dump -h "$POSTGRES_HOST" -p "$POSTGRES_PORT" -U "$POSTGRES_USER" -d "$POSTGRES_DB" \
    | gzip > "${LOCAL_DIR}/${FILE}"
fi

echo "==> Local backup: ${LOCAL_DIR}/${FILE} ($(du -h "${LOCAL_DIR}/${FILE}" | cut -f1))"

echo "==> Uploading to ${BACKUP_S3_BUCKET}/${FILE}…"
aws s3 cp "${LOCAL_DIR}/${FILE}" "${BACKUP_S3_BUCKET%/}/${FILE}" \
  ${AWS_REGION:+--region "$AWS_REGION"} \
  --storage-class STANDARD_IA

echo "==> Pruning local backups older than 7 days…"
find "$LOCAL_DIR" -name 'medstore_*.sql.gz' -type f -mtime +7 -delete || true

echo "==> Backup complete: ${FILE}"

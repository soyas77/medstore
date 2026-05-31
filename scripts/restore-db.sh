#!/usr/bin/env bash
# =============================================================================
# scripts/restore-db.sh
# Restore a gzipped pg_dump (local file or s3:// URL) into the database.
# DESTRUCTIVE: drops & recreates the public schema. Confirm before running.
#
# Usage:
#   ./scripts/restore-db.sh ./backups/medstore_medstore_2026....sql.gz
#   ./scripts/restore-db.sh s3://bucket/medstore-backups/medstore_....sql.gz
# =============================================================================
set -euo pipefail
cd "$(dirname "$0")/.."

if [ -f .env ]; then set -a; . ./.env; set +a; fi
: "${POSTGRES_USER:?}" "${POSTGRES_DB:?}"

SRC="${1:?Provide a backup file path or s3:// URL}"
TMP="$(mktemp /tmp/medstore_restore_XXXX.sql.gz)"
trap 'rm -f "$TMP"' EXIT

if [[ "$SRC" == s3://* ]]; then
  echo "==> Downloading $SRC…"
  aws s3 cp "$SRC" "$TMP" ${AWS_REGION:+--region "$AWS_REGION"}
else
  cp "$SRC" "$TMP"
fi

read -r -p "This will OVERWRITE database '$POSTGRES_DB'. Type 'yes' to continue: " ok
[ "$ok" = "yes" ] || { echo "Aborted."; exit 1; }

export PGPASSWORD="${POSTGRES_PASSWORD:-}"
RUN_PSQL() { docker compose exec -T postgres psql -U "$POSTGRES_USER" -d "$POSTGRES_DB" "$@"; }

echo "==> Resetting schema…"
RUN_PSQL -c "DROP SCHEMA public CASCADE; CREATE SCHEMA public;"

echo "==> Restoring…"
gunzip -c "$TMP" | docker compose exec -T postgres psql -U "$POSTGRES_USER" -d "$POSTGRES_DB"

echo "==> Restore complete."

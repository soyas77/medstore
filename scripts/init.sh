#!/usr/bin/env bash
# =============================================================================
# scripts/init.sh
# Initialise the MedStore database: run Alembic migrations (which also seed the
# first admin user, per alembic/versions/0001_initial.py).
#
# Usage:
#   ./scripts/init.sh                 # against $DATABASE_URL in env / .env
#   docker compose exec backend /app/scripts/init.sh
# =============================================================================
set -euo pipefail

cd "$(dirname "$0")/.."

# Load root .env if present (without overriding already-exported vars).
if [ -f .env ]; then
  set -a
  # shellcheck disable=SC1091
  . ./.env
  set +a
fi

echo "==> Running Alembic migrations (creates schema + seeds admin)…"

# If running on the host, exec inside the backend container; if already inside
# the backend image (cwd has alembic.ini), run directly.
if [ -f backend/alembic.ini ] && command -v docker >/dev/null 2>&1 && docker compose ps >/dev/null 2>&1; then
  docker compose exec -T backend alembic upgrade head
elif [ -f alembic.ini ]; then
  alembic upgrade head
else
  ( cd backend && alembic upgrade head )
fi

echo "==> Done."
echo "    Admin seeded: ${FIRST_ADMIN_EMAIL:-admin@medstore.test}"
echo "    (Change the password immediately in production.)"

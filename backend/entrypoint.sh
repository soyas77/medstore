#!/usr/bin/env sh
set -e

# Run database migrations, then start the server.
# RUN_MIGRATIONS=0 to skip (e.g. when a separate job handles migrations).
if [ "${RUN_MIGRATIONS:-1}" = "1" ]; then
  echo "Running Alembic migrations..."
  alembic upgrade head
fi

echo "Starting Gunicorn..."
exec gunicorn app.main:app -c gunicorn_conf.py

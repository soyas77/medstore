#!/usr/bin/env bash
# =============================================================================
# Guided Fly.io deploy for the MedStore backend.
# Run from the repo root:  ./deploy/deploy-backend-fly.sh
#
# Prereqs (one time):
#   - Install flyctl:  curl -L https://fly.io/install.sh | sh
#   - Log in:          fly auth login
# This script NEVER stores your token; it uses your local fly session.
# =============================================================================
set -euo pipefail

cd "$(dirname "$0")/../backend"

if ! command -v fly >/dev/null 2>&1; then
  echo "ERROR: flyctl not found. Install: curl -L https://fly.io/install.sh | sh"
  exit 1
fi

read -rp "Fly app name (globally unique, e.g. medstore-backend-yourname): " APP
read -rp "Region [iad]: " REGION; REGION="${REGION:-iad}"
read -rp "Postgres app name to create/attach [${APP}-db]: " DBAPP; DBAPP="${DBAPP:-${APP}-db}"
read -rp "Seed admin email [admin@example.com]: " ADMIN_EMAIL; ADMIN_EMAIL="${ADMIN_EMAIL:-admin@example.com}"
read -rsp "Seed admin password: " ADMIN_PW; echo
read -rp "Frontend origin for CORS (e.g. https://medstore.vercel.app) [* for now]: " CORS; CORS="${CORS:-*}"

echo "==> Creating app config (no deploy yet)…"
fly launch --no-deploy --copy-config --name "$APP" --region "$REGION" || true

echo "==> Provisioning Postgres '${DBAPP}' (skip if it already exists)…"
fly postgres create --name "$DBAPP" --region "$REGION" || true

echo "==> Attaching Postgres (sets DATABASE_URL secret)…"
fly postgres attach "$DBAPP" --app "$APP" || true

echo "==> Setting application secrets…"
JWT="$(openssl rand -hex 32)"
fly secrets set --app "$APP" \
  JWT_SECRET="$JWT" \
  CORS_ORIGINS="$CORS" \
  CORS_ORIGIN_REGEX="https://.*\\.vercel\\.app" \
  FIRST_ADMIN_EMAIL="$ADMIN_EMAIL" \
  FIRST_ADMIN_PASSWORD="$ADMIN_PW"

echo "==> Deploying…"
fly deploy --app "$APP"

URL="https://${APP}.fly.dev"
echo ""
echo "============================================================"
echo " Backend deployed!"
echo "   API base : ${URL}"
echo "   Health   : ${URL}/health"
echo "   Docs     : ${URL}/docs"
echo ""
echo " Next: deploy the frontend with NEXT_PUBLIC_API_URL=${URL}"
echo "   ./deploy/deploy-frontend-vercel.sh"
echo "============================================================"

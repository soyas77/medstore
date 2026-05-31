#!/usr/bin/env bash
# =============================================================================
# Guided Vercel deploy for the MedStore frontend.
# Run from the repo root:  ./deploy/deploy-frontend-vercel.sh
#
# Prereqs (one time):
#   - Install Vercel CLI:  npm i -g vercel
#   - Log in:              vercel login
# This script uses your local vercel session; no tokens are stored here.
# =============================================================================
set -euo pipefail

cd "$(dirname "$0")/../frontend"

if ! command -v vercel >/dev/null 2>&1; then
  echo "ERROR: vercel CLI not found. Install:  npm i -g vercel"
  exit 1
fi

read -rp "Backend API base URL (e.g. https://medstore-backend.fly.dev): " API_URL
if [ -z "$API_URL" ]; then echo "API URL is required."; exit 1; fi

echo "==> Linking project (follow prompts; accept Next.js defaults)…"
vercel link

echo "==> Setting environment variables for Production…"
# NEXT_PUBLIC_* are read at build time by Vercel.
printf "%s" "$API_URL"  | vercel env add NEXT_PUBLIC_API_URL production --force >/dev/null 2>&1 || \
  printf "%s" "$API_URL"  | vercel env add NEXT_PUBLIC_API_URL production
printf "%s" "0"        | vercel env add NEXT_PUBLIC_USE_MOCK_API production --force >/dev/null 2>&1 || \
  printf "%s" "0"        | vercel env add NEXT_PUBLIC_USE_MOCK_API production

echo "==> Deploying to production…"
vercel deploy --prod

echo ""
echo "============================================================"
echo " Frontend deployed! Vercel printed your live URL above."
echo ""
echo " IMPORTANT: add that URL to the backend CORS allow-list:"
echo "   cd backend && fly secrets set CORS_ORIGINS=<your-vercel-url>"
echo "   (the backend already allows *.vercel.app preview URLs via regex)"
echo "============================================================"

#!/usr/bin/env bash
# =============================================================================
# scripts/init-letsencrypt.sh
# First-time issuance of a Let's Encrypt certificate for the prod stack.
# Run ONCE after DNS points at the server. Afterwards the certbot companion
# container auto-renews and nginx reloads every 6h.
#
# Required env (root .env): DOMAIN, CERTBOT_EMAIL
# Usage: ./scripts/init-letsencrypt.sh
# =============================================================================
set -euo pipefail
cd "$(dirname "$0")/.."

if [ -f .env ]; then set -a; . ./.env; set +a; fi
: "${DOMAIN:?Set DOMAIN in .env}"
: "${CERTBOT_EMAIL:?Set CERTBOT_EMAIL in .env}"

COMPOSE="docker compose -f docker-compose.prod.yml"
STAGING="${STAGING:-0}"   # set STAGING=1 to test against LE staging

mkdir -p ./certbot/conf ./certbot/www

echo "==> Starting nginx (HTTP) to serve the ACME challenge…"
$COMPOSE up -d nginx

STAGING_FLAG=""
if [ "$STAGING" = "1" ]; then STAGING_FLAG="--staging"; fi

echo "==> Requesting certificate for ${DOMAIN}…"
$COMPOSE run --rm certbot certonly \
  --webroot -w /var/www/certbot \
  $STAGING_FLAG \
  --email "$CERTBOT_EMAIL" \
  --agree-tos --no-eff-email \
  -d "$DOMAIN"

echo "==> Reloading nginx with the new certificate…"
$COMPOSE exec nginx nginx -s reload || $COMPOSE up -d nginx

echo "==> TLS ready for https://${DOMAIN}"

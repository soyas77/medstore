# MedStore — Deployment Guide

Full operational guide for the MedStore stack: **FastAPI backend + Next.js
frontend + PostgreSQL**, fronted by **nginx** with **Let's Encrypt** TLS.

- [a) Local dev quickstart](#a-local-dev-quickstart)
- [b) Deploy to Fly.io](#b-deploy-to-flyio)
- [c) Deploy to AWS ECS with RDS](#c-deploy-to-aws-ecs-with-rds)
- [d) Environment variable checklist](#d-environment-variable-checklist)
- [e) How to rotate the JWT secret](#e-how-to-rotate-the-jwt-secret)
- [f) Backup / restore procedure](#f-backup--restore-procedure)
- [Production stack (docker-compose.prod.yml) + TLS](#production-stack)
- [Zero-downtime deployment notes](#zero-downtime-deployment-notes)

---

## a) Local dev quickstart

Prereqs: Docker + Docker Compose.

```bash
git clone <your-repo> medstore && cd medstore
cp .env.example .env            # edit POSTGRES_PASSWORD / JWT_SECRET if you like

docker compose up --build
```

| Service   | URL                            | Notes                              |
| --------- | ------------------------------ | ---------------------------------- |
| Frontend  | http://localhost:3000          | `next dev`, hot reload             |
| Backend   | http://localhost:8000/docs     | `uvicorn --reload`, auto-migrates  |
| Adminer   | http://localhost:8080          | DB GUI (server `postgres`)         |
| Postgres  | localhost:5432                 | persisted in `postgres_data` vol   |

The backend container runs `alembic upgrade head` on start, which **creates the
schema and seeds the admin** (`FIRST_ADMIN_EMAIL` / `FIRST_ADMIN_PASSWORD`).

Run migrations / seed manually at any time:

```bash
./scripts/init.sh
```

Tear down (keep data) / wipe everything:

```bash
docker compose down            # stop, keep volumes
docker compose down -v         # stop AND delete the database volume
```

> **Frontend-only (no backend/DB)?** Set `NEXT_PUBLIC_USE_MOCK_API=1` and run
> `cd frontend && npm run dev`. The bundled mock API serves realistic data.

---

## Production stack

`docker-compose.prod.yml` runs immutable images (no source mounts), gunicorn
with 4 workers, the Next.js standalone server, nginx (80/443), and a certbot
companion. Restart policy `unless-stopped` and per-service resource limits are
set.

### 1. Provision a host

Any VM with Docker (e.g. a 2 vCPU / 4 GB cloud instance). Point your domain's
`A`/`AAAA` records at it. Open ports **80** and **443**.

### 2. Configure env

```bash
cp .env.example .env
# REQUIRED in prod (see the checklist in section d):
#   POSTGRES_PASSWORD, JWT_SECRET (openssl rand -hex 32),
#   CORS_ORIGINS=https://medstore.example.com,
#   NEXT_PUBLIC_API_URL=https://medstore.example.com,
#   DOMAIN, CERTBOT_EMAIL, FIRST_ADMIN_*
```

Edit `nginx/conf.d/medstore.conf` and replace `medstore.example.com` with your
domain (or template it with `envsubst`).

### 3. Obtain certificates (first time only)

```bash
./scripts/init-letsencrypt.sh          # uses DOMAIN + CERTBOT_EMAIL from .env
# Test first against staging to avoid rate limits:
#   STAGING=1 ./scripts/init-letsencrypt.sh
```

### 4. Launch

```bash
# Build locally…
docker compose -f docker-compose.prod.yml up -d --build
# …or pull pre-built images from GHCR:
#   IMAGE_TAG=<sha> docker compose -f docker-compose.prod.yml up -d
```

Verify:

```bash
curl -s https://medstore.example.com/health        # backend {status,db,version}
curl -s https://medstore.example.com/api/health    # via nginx -> backend
curl -s https://medstore.example.com/api/v1/openapi.json | head
```

### TLS auto-renewal

The `certbot` container attempts renewal every 12h and only acts near expiry.
The `nginx` container reloads every 6h to pick up renewed certs — **no manual
action and no downtime**. Confirm with:

```bash
docker compose -f docker-compose.prod.yml exec certbot certbot certificates
```

---

## b) Deploy to Fly.io

Fly suits the two app containers; use **Fly Postgres** (or any managed PG) for
the database. TLS is handled by Fly's edge, so you don't need the nginx/certbot
containers there.

### 1. Install & auth

```bash
curl -L https://fly.io/install.sh | sh
fly auth login
```

### 2. Database

```bash
fly postgres create --name medstore-db --region iad
# Note the connection string it prints (postgres://...).
```

### 3. Backend app

`backend/fly.toml`:

```toml
app = "medstore-backend"
primary_region = "iad"

[build]
  dockerfile = "Dockerfile"

[env]
  ENVIRONMENT = "production"
  LOG_JSON = "true"
  RUN_MIGRATIONS = "1"
  WEB_CONCURRENCY = "4"

[http_service]
  internal_port = 8000
  force_https = true
  auto_stop_machines = true
  auto_start_machines = true
  min_machines_running = 1

  [[http_service.checks]]
    method = "GET"
    path = "/health"
    interval = "30s"
    timeout = "5s"

[[vm]]
  size = "shared-cpu-1x"
  memory = "1gb"
```

```bash
cd backend
fly launch --no-deploy --copy-config
# DATABASE_URL must use the async driver:
fly secrets set \
  DATABASE_URL="postgresql+asyncpg://<user>:<pw>@medstore-db.flycast:5432/medstore" \
  JWT_SECRET="$(openssl rand -hex 32)" \
  CORS_ORIGINS="https://medstore-frontend.fly.dev" \
  FIRST_ADMIN_EMAIL="admin@yourco.com" \
  FIRST_ADMIN_PASSWORD="$(openssl rand -base64 18)"
fly deploy
```

### 4. Frontend app

`NEXT_PUBLIC_*` are baked at build time, so pass them as build args:

```bash
cd frontend
fly launch --no-deploy
fly deploy \
  --build-arg NEXT_PUBLIC_API_URL="https://medstore-backend.fly.dev" \
  --build-arg NEXT_PUBLIC_USE_MOCK_API=0 \
  --build-arg NEXT_PUBLIC_APP_VERSION="$(git rev-parse --short HEAD)"
```

Set `CORS_ORIGINS` on the backend to the frontend's URL. Done.

---

## c) Deploy to AWS ECS with RDS

High-level reference architecture (Fargate):

```
Route53 ─> ACM cert ─> Application Load Balancer
                          ├── listener 443 /api/*  -> backend target group (8000)
                          └── listener 443 /*       -> frontend target group (3000)
ECS Fargate service: backend  (task: ghcr image, 1 vCPU / 2 GB)
ECS Fargate service: frontend (task: ghcr image, 0.5 vCPU / 1 GB)
RDS PostgreSQL 16 (Multi-AZ), Secrets Manager for credentials
```

### Steps

1. **RDS** — create a PostgreSQL 16 instance (Multi-AZ for prod). Put the master
   credentials in **AWS Secrets Manager**. Security group: allow 5432 from the
   ECS tasks' SG only.

2. **Images** — CI pushes to GHCR. Either let ECS pull from GHCR (store a GHCR
   PAT in Secrets Manager and reference it via `repositoryCredentials`) or mirror
   to **ECR**:
   ```bash
   docker pull ghcr.io/<org>/medstore-backend:<sha>
   docker tag  ghcr.io/<org>/medstore-backend:<sha> <acct>.dkr.ecr.<region>.amazonaws.com/medstore-backend:<sha>
   aws ecr get-login-password | docker login --username AWS --password-stdin <acct>.dkr.ecr.<region>.amazonaws.com
   docker push <acct>.dkr.ecr.<region>.amazonaws.com/medstore-backend:<sha>
   ```

3. **Task definitions** — one per service. Inject env from Secrets Manager:
   - backend: `DATABASE_URL` (built from the RDS secret, **with `+asyncpg`**),
     `JWT_SECRET`, `CORS_ORIGINS`, `LOG_JSON=true`, `WEB_CONCURRENCY=4`.
   - frontend: nothing secret at runtime (NEXT_PUBLIC baked at build).
   - Map container ports 8000 / 3000; set the ECS container health check to
     `CMD-SHELL curl -f http://localhost:8000/health` (backend) and
     `wget -qO- http://localhost:3000/api/health` (frontend).

4. **Migrations** — run as a **one-off ECS task** (don't auto-migrate on every
   task start in multi-instance setups):
   ```bash
   aws ecs run-task --cluster medstore --task-definition medstore-backend-migrate \
     --overrides '{"containerOverrides":[{"name":"backend","command":["alembic","upgrade","head"]}]}'
   ```
   Set `RUN_MIGRATIONS=0` on the long-running service so only the one-off task
   migrates.

5. **ALB** — HTTPS listener with an **ACM** certificate. Path-based routing:
   `/api/*` → backend TG, default → frontend TG. Health-check paths `/health`
   and `/api/health`.

6. **Logging** — task `awslogs` driver → CloudWatch. The apps already emit
   structured JSON, so CloudWatch Insights queries work out of the box.

---

## d) Environment variable checklist

Legend: ✅ required in prod · ➖ optional · 🔒 secret (use a secrets manager).

### Root / compose (`.env`)

| Variable | Req | Example | Notes |
| --- | --- | --- | --- |
| `POSTGRES_USER` | ✅ | `medstore` | |
| `POSTGRES_PASSWORD` | ✅ 🔒 | `…` | strong |
| `POSTGRES_DB` | ✅ | `medstore` | |
| `POSTGRES_PORT` | ➖ | `5432` | host bind (dev) |
| `JWT_SECRET` | ✅ 🔒 | `openssl rand -hex 32` | |
| `JWT_ALGORITHM` | ➖ | `HS256` | |
| `ACCESS_TOKEN_EXPIRE_MINUTES` | ➖ | `60` | |
| `CORS_ORIGINS` | ✅ | `https://medstore.example.com` | comma-separated |
| `FIRST_ADMIN_EMAIL` | ✅ | `admin@yourco.com` | |
| `FIRST_ADMIN_PASSWORD` | ✅ 🔒 | `…` | change after first login |
| `FIRST_ADMIN_NAME` | ➖ | `MedStore Admin` | |
| `RUN_MIGRATIONS` | ➖ | `1` | `0` if a job migrates |
| `NEXT_PUBLIC_API_URL` | ✅ | `https://medstore.example.com` | baked at build |
| `BACKEND_IMAGE` / `FRONTEND_IMAGE` | ➖ | `ghcr.io/org/…` | prod pull |
| `IMAGE_TAG` | ➖ | `latest` / `<sha>` | prod pull |
| `LOG_LEVEL` | ➖ | `info` | |
| `SENTRY_DSN_BACKEND` | ➖ 🔒 | `https://…` | empty = disabled |
| `SENTRY_DSN_FRONTEND` | ➖ 🔒 | `https://…` | empty = disabled |
| `DOMAIN` | ✅(prod) | `medstore.example.com` | TLS |
| `CERTBOT_EMAIL` | ✅(prod) | `ops@yourco.com` | TLS |
| `BACKUP_S3_BUCKET` | ➖ | `s3://bucket/path` | backups |
| `AWS_REGION` | ➖ | `us-east-1` | backups |

### Backend-only (`backend/.env`, non-Docker runs)

`APP_NAME`, `ENVIRONMENT`, `DEBUG`, `DATABASE_URL` (with `+asyncpg`),
`LOG_JSON`, `SENTRY_TRACES_SAMPLE_RATE`, `WEB_CONCURRENCY`, `PORT`.

### Frontend-only (`frontend/.env.local`, build time)

`NEXT_PUBLIC_API_URL`, `NEXT_PUBLIC_USE_MOCK_API`, `AUTH_COOKIE_NAME`,
`NEXT_PUBLIC_SENTRY_DSN`, `NEXT_PUBLIC_APP_VERSION`.

> ⚠️ `NEXT_PUBLIC_*` are **inlined at build time**. Changing them requires a
> frontend **rebuild**, not just a restart.

---

## e) How to rotate the JWT secret

Rotating `JWT_SECRET` **invalidates all existing tokens** — every user must log
in again. Plan a low-traffic window or use the dual-secret approach below.

### Simple rotation (forces re-login)

```bash
NEW=$(openssl rand -hex 32)

# 1. Update the secret store / .env
#    .env:        JWT_SECRET=$NEW
#    Fly:         fly secrets set JWT_SECRET=$NEW   (triggers a rolling restart)
#    ECS:         update the Secrets Manager value, then force new deployment

# 2. Restart the backend so it loads the new secret
docker compose -f docker-compose.prod.yml up -d --no-deps backend
#    Fly/ECS do this automatically on secret change / new deployment.
```

All issued JWTs immediately fail validation → clients get `401` → the frontend
interceptor logs out and redirects to `/login`. No DB change needed.

### Zero-forced-logout rotation (advanced)

Because tokens are short-lived (`ACCESS_TOKEN_EXPIRE_MINUTES=60`), the smoothest
path is:

1. **Lower** `ACCESS_TOKEN_EXPIRE_MINUTES` temporarily (e.g. 15) and deploy.
2. Wait for the old window to pass so most tokens are short-lived.
3. Rotate `JWT_SECRET` and restart — worst case a user re-logs once.

(For true overlapping-secret verification, extend the auth backend to accept a
`JWT_SECRET_PREVIOUS` during a grace period; not enabled by default.)

---

## f) Backup / restore procedure

### Automated backups to S3

`scripts/backup-db.sh` runs `pg_dump | gzip` and uploads to S3 (storage class
`STANDARD_IA`), keeping 7 days locally.

```bash
# one-off
./scripts/backup-db.sh

# cron (daily 02:30)
30 2 * * *  cd /opt/medstore && ./scripts/backup-db.sh >> /var/log/medstore-backup.log 2>&1
```

For lifecycle/retention in S3, add a bucket lifecycle rule (e.g. expire after 30
days, transition to Glacier after 90).

### Restore

```bash
# from local file or s3:// URL (DESTRUCTIVE — drops & recreates schema)
./scripts/restore-db.sh ./backups/medstore_medstore_2026XXXX.sql.gz
./scripts/restore-db.sh s3://your-bucket/medstore-backups/medstore_....sql.gz
```

After a restore, re-run migrations to ensure the schema is current:

```bash
./scripts/init.sh
```

### Point-in-time recovery

On managed Postgres (RDS / Fly), enable automated snapshots + PITR. The script
backups are a portable, cross-provider safety net on top of that.

---

## Zero-downtime deployment notes

- **Stateless apps, rolling updates.** Backend and frontend hold no local state,
  so replace containers one at a time:
  ```bash
  docker compose -f docker-compose.prod.yml pull
  docker compose -f docker-compose.prod.yml up -d --no-deps backend
  docker compose -f docker-compose.prod.yml up -d --no-deps frontend
  ```
  Run ≥2 replicas behind nginx/ALB for true zero-downtime; nginx keeps serving
  the healthy instance while the other restarts (health checks gate traffic).

- **Migrations must be backward-compatible.** Deploy the migration *before* the
  code that depends on it (expand → migrate → contract):
  1. Add columns/tables as **nullable / additive** (old code still works).
  2. Deploy new code that writes both old & new.
  3. Backfill, then deploy code that reads new.
  4. In a later release, drop the old column.
  Never combine a destructive migration with the deploy that needs it.

- **Run migrations as a discrete step** in multi-instance setups
  (`RUN_MIGRATIONS=0` on services; a one-off task/job runs `alembic upgrade
  head`) so concurrent app boots don't race. The invoice-counter rows and
  `SELECT … FOR UPDATE` numbering are safe under concurrency.

- **Health-gated cutover.** Both services expose health checks
  (`/health`, `/api/health`); load balancers should only route to `healthy`
  targets, draining old ones (`deregistration_delay` / nginx `max_fails`).

- **TLS renewals are non-disruptive** — certbot renews in the background and
  nginx reloads (not restarts) every 6h.

- **Rollback** = redeploy the previous image tag:
  ```bash
  IMAGE_TAG=<previous-sha> docker compose -f docker-compose.prod.yml up -d
  ```
  Keep DB migrations backward-compatible so a code rollback never needs a DB
  rollback.

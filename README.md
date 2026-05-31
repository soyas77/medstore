# MedStore

Wholesale pharmacy management — **FastAPI** backend + **Next.js 14** frontend +
**PostgreSQL 16**, with a production-ready DevOps setup (nginx, TLS, CI/CD).

```
medstore/
├── backend/                   # FastAPI (SQLAlchemy 2.0 async, Alembic, fastapi-users)
├── frontend/                  # Next.js 14 App Router (TanStack, Zustand, shadcn/ui)
├── nginx/                     # reverse proxy: gzip, security headers, TLS, /api routing
│   ├── nginx.conf
│   └── conf.d/medstore.conf
├── scripts/                   # init / backup / restore / letsencrypt
├── .github/workflows/ci.yml   # lint · typecheck · test · build · push (GHCR)
├── docker-compose.yml         # DEV: hot-reload + Adminer
├── docker-compose.prod.yml    # PROD: gunicorn, standalone FE, nginx + certbot
├── .env.example               # root env (compose)
└── DEPLOYMENT.md              # local / Fly.io / AWS ECS, JWT rotation, backups
```

## Quickstart (dev)

```bash
cp .env.example .env
docker compose up --build
```

- Frontend → http://localhost:3000
- Backend  → http://localhost:8000/docs
- Adminer  → http://localhost:8080

Default admin: `admin@medstore.test` / `admin123` (from `.env`).

## Production

```bash
cp .env.example .env            # fill in DOMAIN, JWT_SECRET, passwords…
./scripts/init-letsencrypt.sh   # first-time TLS
docker compose -f docker-compose.prod.yml up -d --build
```

See **[DEPLOYMENT.md](./DEPLOYMENT.md)** for the full guide (Fly.io, AWS ECS/RDS,
JWT rotation, backup/restore, zero-downtime notes).

## Health & observability

| Check | Endpoint |
| --- | --- |
| Backend | `GET /health` → `{status, db, version}` |
| Frontend | `GET /api/health` → `{status, version, backend}` |

- Backend: structured JSON logs via **structlog**, optional **Sentry**
  (`SENTRY_DSN` empty ⇒ disabled), per-request `X-Request-ID`.
- Frontend: **pino** logger, optional **Sentry** (`NEXT_PUBLIC_SENTRY_DSN`).

## CI/CD

`.github/workflows/ci.yml`:
- **PR** → ruff/eslint, mypy/tsc, pytest, frontend build, Docker builds (no push).
- **main** → build & push `backend`/`frontend` images to **GHCR**, tagged with the
  commit SHA and `latest`.

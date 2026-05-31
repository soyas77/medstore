# Deploying MedStore to a public URL

Two-part deploy that gives you a shareable link in ~15 minutes:

| Part | Where | Why |
| --- | --- | --- |
| **Frontend** (Next.js) | **Vercel** | First-class Next.js host, free tier, instant HTTPS URL |
| **Backend** (FastAPI + Postgres) | **Fly.io** | Runs the Docker image (incl. WeasyPrint) + managed Postgres |

> Deploy the **backend first** so you have its URL to give the frontend.

---

## 0. One-time tool install + login (on your machine)

```bash
# Fly
curl -L https://fly.io/install.sh | sh      # then restart your shell
fly auth signup     # or: fly auth login

# Vercel
npm i -g vercel
vercel login
```

You run these with **your own** accounts. Never share these tokens with anyone
(including in chat) — the scripts below use your local CLI session only.

---

## 1. Backend → Fly.io

### Option A — guided script (recommended)
```bash
./deploy/deploy-backend-fly.sh
```
It will: create the app, provision + attach Postgres (sets `DATABASE_URL`),
generate a strong `JWT_SECRET`, set CORS + seed-admin secrets, then `fly deploy`.
The container runs Alembic migrations on boot (creates schema + seeds the admin).

### Option B — manual
```bash
cd backend
fly launch --no-deploy --copy-config        # pick a UNIQUE app name + region
fly postgres create --name <app>-db
fly postgres attach <app>-db                 # sets DATABASE_URL secret
fly secrets set \
  JWT_SECRET="$(openssl rand -hex 32)" \
  CORS_ORIGINS="https://<your-frontend>.vercel.app" \
  CORS_ORIGIN_REGEX='https://.*\.vercel\.app' \
  FIRST_ADMIN_EMAIL="admin@example.com" \
  FIRST_ADMIN_PASSWORD="<choose-a-strong-one>"
fly deploy
```

**Verify:**
```bash
curl https://<app>.fly.dev/health        # {"status":"ok","db":"ok","version":"1.0.0"}
open  https://<app>.fly.dev/docs          # Swagger UI
```

> The app auto-converts Fly's `postgres://` URL to `postgresql+asyncpg://`, so no
> manual driver fiddling is needed.

---

## 2. Frontend → Vercel

### Option A — guided script
```bash
./deploy/deploy-frontend-vercel.sh        # asks for the backend URL from step 1
```

### Option B — Vercel dashboard (no CLI)
1. Push this repo to GitHub.
2. vercel.com → **Add New Project** → import the repo.
3. **Root Directory:** `frontend`  (Vercel auto-detects Next.js).
4. **Environment Variables** (Production):
   - `NEXT_PUBLIC_API_URL` = `https://<app>.fly.dev`
   - `NEXT_PUBLIC_USE_MOCK_API` = `0`
5. **Deploy.** You'll get `https://<project>.vercel.app`.

> `NEXT_PUBLIC_*` are baked at **build** time. If you change them later, trigger a
> **redeploy** (not just a restart).

---

## 3. Wire them together (CORS)

After the frontend URL exists, make sure the backend trusts it:

```bash
cd backend
fly secrets set CORS_ORIGINS="https://<project>.vercel.app"
# (preview deploys *.vercel.app are already allowed via CORS_ORIGIN_REGEX)
```

Open your Vercel URL, log in with the seed admin, and you're live. 🎉

---

## Environment variable checklist

**Backend (Fly secrets):**
- `DATABASE_URL` — set automatically by `fly postgres attach`
- `JWT_SECRET` — `openssl rand -hex 32`
- `CORS_ORIGINS` — your Vercel production URL
- `CORS_ORIGIN_REGEX` — `https://.*\.vercel\.app` (optional, for previews)
- `FIRST_ADMIN_EMAIL`, `FIRST_ADMIN_PASSWORD`

**Frontend (Vercel env,
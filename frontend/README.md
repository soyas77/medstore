# MedStore — Frontend

Production-grade **Next.js 14 (App Router)** frontend in TypeScript for **MedStore**, a wholesale pharmacy management web app.

## Tech stack

| Concern | Library |
| --- | --- |
| Framework | Next.js 14 (App Router, RSC, standalone output) |
| Language | TypeScript (strict) |
| Styling | Tailwind CSS + shadcn/ui primitives |
| Server state | TanStack Query v5 (query-key factory, optimistic updates) |
| Data tables | TanStack Table v8 |
| Cart state | Zustand |
| Forms | react-hook-form + zod |
| Charts | Recharts |
| Toasts | sonner |
| Icons | lucide-react |
| Theme | next-themes (light / dark / system) |

## Features

- **Auth** — email/password login with zod validation. The login route handler sets an **httpOnly cookie** (read by `middleware.ts`) plus a non-sensitive role cookie for coarse gating. The axios client mirrors the token for the `Authorization: Bearer` header and logs out on `401`.
- **Dashboard** — 4 KPI cards, 7-day sales area chart (Recharts), recent invoices table.
- **Inventory** — TanStack Table with debounced search, server sorting, pagination, **low-stock rows highlighted red**, add dialog, edit drawer, delete confirm. Edits use **optimistic updates**.
- **Sales** — two-column layout: searchable medicine list (left) → Zustand cart (right) with qty steppers, **`5% OFF` badge at qty ≥ 2**, live subtotal/discount/grand total, checkout dialog with **Download PDF**.
- **Restocks** — admin-only (cashiers redirected), same UX without discount logic and with editable unit cost.
- **Invoices** — filter bar (date range, type, user), table with View / Download PDF.
- **Invoice detail** — full breakdown + embedded `<iframe>` PDF preview.
- **Users** — admin-only table + invite dialog.
- **Settings** — admin-only business info + low-stock / discount defaults.
- **Global** — role-based sidebar (cashiers don't see Users/Settings/Restocks), topbar with user + role badge + **low-stock bell polling every 60s**, responsive sidebar→drawer below `md`, dark-mode toggle, toasts on every mutation.

## Getting started

```bash
cd frontend
cp .env.local.example .env.local   # adjust if needed
npm install
npm run dev                          # http://localhost:3000
```

### Demo accounts (mock mode)

The app ships with bundled **mock API route handlers** so it runs end-to-end with no backend (`NEXT_PUBLIC_USE_MOCK_API=1`).

| Role | Email | Password |
| --- | --- | --- |
| Admin | `admin@medstore.test` | `admin123` |
| Cashier | `cashier@medstore.test` | `cashier123` |

> Mock data lives in memory (`app/api/_mock/db.ts`) and resets on server restart.

## Environment variables

| Variable | Description |
| --- | --- |
| `NEXT_PUBLIC_API_URL` | Base URL of the real FastAPI backend. |
| `NEXT_PUBLIC_USE_MOCK_API` | `1` = use bundled mock route handlers; `0` = call the real backend. |
| `AUTH_COOKIE_NAME` | Name of the httpOnly auth cookie (keep in sync with middleware). |

## Switching to the real backend

1. Set `NEXT_PUBLIC_USE_MOCK_API=0` and `NEXT_PUBLIC_API_URL=https://api.yourhost`.
2. The axios client (`lib/api-client.ts`) will target `${NEXT_PUBLIC_API_URL}/api`.
3. Ensure the backend exposes the endpoints the frontend expects:
   - `POST /api/auth/login`, `POST /api/auth/logout`, `GET /api/auth/me`
   - `GET/POST /api/medicines`, `GET/PATCH/DELETE /api/medicines/{id}`, `GET /api/medicines/low-stock`
   - `POST /api/sales`, `POST /api/restocks`
   - `GET /api/invoices`, `GET /api/invoices/{id}`, `GET /api/invoices/{id}/pdf`
   - `GET /api/dashboard/stats`, `GET /api/dashboard/sales-trend`
   - `GET/POST /api/users`, `PATCH /api/users/{id}`
   - `GET/PUT /api/settings`
4. `types/api.ts` mirrors the expected Pydantic schemas — keep both sides in sync.

> Note: with a real backend the httpOnly cookie should be set by the backend (or a thin proxy). The included Next route handlers under `app/api/*` are for mock mode only.

## Scripts

```bash
npm run dev          # dev server
npm run build        # production build (standalone)
npm run start        # run the production build
npm run lint         # eslint
npm run type-check   # tsc --noEmit
```

## Docker

Multi-stage build (`deps → builder → runner`) on `node:20-alpine` with Next.js standalone output.

```bash
# Build
docker build -t medstore-frontend \
  --build-arg NEXT_PUBLIC_API_URL=http://localhost:8000 \
  --build-arg NEXT_PUBLIC_USE_MOCK_API=1 \
  ./frontend

# Run
docker run --rm -p 3000:3000 medstore-frontend
```

## Project structure

```
frontend/
├── app/
│   ├── (auth)/login/page.tsx
│   ├── (dashboard)/
│   │   ├── layout.tsx              # sidebar + topbar shell
│   │   ├── dashboard/              # KPIs + chart + recent invoices
│   │   ├── inventory/              # TanStack Table
│   │   ├── sales/new/             # cart checkout
│   │   ├── restocks/new/         # admin-only
│   │   ├── invoices/             # list + [id] detail
│   │   ├── users/                # admin-only
│   │   └── settings/            # admin-only
│   ├── api/                       # mock route handlers (mock mode)
│   └── layout.tsx                 # providers (Query, Theme, Toaster)
├── components/
│   ├── ui/                        # shadcn primitives
│   ├── layout/                    # AppSidebar, TopBar, LowStockBadge, …
│   ├── inventory/                 # MedicineDataTable, dialogs
│   ├── sales/                     # MedicineSearchPanel, CartPanel, Checkout
│   ├── invoices/                  # InvoiceTable, InvoiceDetail
│   └── users/                     # InviteUserDialog
├── hooks/                         # useMedicines, useSale, useInvoices, …
├── lib/                           # api-client, auth, query-keys, utils
├── stores/                        # cartStore (Zustand)
├── types/                         # api.ts (Pydantic mirror)
├── middleware.ts                  # route protection
├── tailwind.config.ts
├── Dockerfile
└── .env.local.example
```

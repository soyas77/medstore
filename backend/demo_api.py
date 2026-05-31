"""In-process live demo of the MedStore API (no network port needed).

Run:
    DATABASE_URL='sqlite+aiosqlite:///./demo.db' JWT_SECRET='demo-secret' \
        python demo_api.py
(Seed first with demo_bootstrap.py.)
"""

import asyncio
import os

os.environ.setdefault("DATABASE_URL", "sqlite+aiosqlite:///./demo.db")
os.environ.setdefault("JWT_SECRET", "demo-secret")
os.environ.setdefault("LOG_JSON", "true")

from httpx import ASGITransport, AsyncClient  # noqa: E402

from app.main import app  # noqa: E402


def hr(t: str) -> None:
    print("\n" + "=" * 64 + "\n" + t + "\n" + "=" * 64)


async def jline(coro) -> str:
    r = await coro
    return f"status {r.status_code} | {r.json()}"


async def main() -> None:
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://api") as c:
        hr("1) HEALTH  GET /health")
        print(await jline(c.get("/health")))

        hr("2) LOGIN  POST /api/v1/auth/login")
        r = await c.post(
            "/api/v1/auth/login",
            data={"username": "admin@example.com", "password": "admin123"},
            headers={"Content-Type": "application/x-www-form-urlencoded"},
        )
        tok = r.json()["access_token"]
        print("status", r.status_code, "| token:", tok[:32] + "...")
        A = {"Authorization": f"Bearer {tok}"}

        hr("3) WHOAMI  GET /api/v1/auth/me")
        print(await jline(c.get("/api/v1/auth/me", headers=A)))

        hr("4) NO TOKEN  GET /api/v1/auth/me  -> expect 401")
        print("status", (await c.get("/api/v1/auth/me")).status_code)

        hr("5) INVENTORY  GET /api/v1/medicines")
        d = (await c.get("/api/v1/medicines", headers=A)).json()
        for m in d["items"]:
            print(
                f'  {m["id"]}  {m["name"]:<20} '
                f'stock={m["stock_strips"]:<4} low={m["is_low_stock"]}'
            )

        hr("6) LOW STOCK  GET /api/v1/medicines/low-stock")
        for m in (await c.get("/api/v1/medicines/low-stock", headers=A)).json():
            print(
                f'  {m["id"]} {m["name"]} -> {m["stock_strips"]} '
                f'(<= {m["low_stock_threshold"]})'
            )

        hr("7) SALE w/ 5% DISCOUNT  POST /api/v1/sales  (2x MED-0001 @100)")
        r = await c.post(
            "/api/v1/sales",
            headers=A,
            json={
                "customer_name": "Walk-in",
                "items": [{"medicine_id": "MED-0001", "quantity_strips": 2}],
            },
        )
        print("status", r.status_code)
        s = r.json()
        print(f'  invoice    : {s["invoice_number"]}')
        print(f'  subtotal   : {s["subtotal"]}')
        print(
            f'  discount   : {s["discount_total"]}   '
            f'(line disc_pct={s["items"][0]["discount_pct"]})'
        )
        print(f'  grand_total: {s["grand_total"]}')
        inv_id = s["id"]

        hr("8) STOCK DEDUCTED  GET /api/v1/medicines/MED-0001  (was 50)")
        print(
            "  stock_strips =",
            (await c.get("/api/v1/medicines/MED-0001", headers=A)).json()[
                "stock_strips"
            ],
        )

        hr("9) INSUFFICIENT STOCK  POST /api/v1/sales (99x MED-0002) -> 400")
        r = await c.post(
            "/api/v1/sales",
            headers=A,
            json={"items": [{"medicine_id": "MED-0002", "quantity_strips": 99}]},
        )
        print("  status", r.status_code, "| detail:", r.json().get("detail"))

        hr("10) INVOICE DETAIL  GET /api/v1/invoices/{id}")
        d = (await c.get(f"/api/v1/invoices/{inv_id}", headers=A)).json()
        print(
            f'  {d["invoice_number"]} | {d["type"]} | '
            f'total {d["grand_total"]} | items {len(d["items"])}'
        )

        hr("11) INVOICE PDF  GET /api/v1/invoices/{id}/pdf")
        r = await c.get(f"/api/v1/invoices/{inv_id}/pdf", headers=A)
        ct = r.headers.get("content-type", "")
        if r.status_code == 200 and r.content[:4] == b"%PDF":
            print(
                f"  status 200 | {ct} | {len(r.content)} bytes | "
                f"starts with %PDF  OK"
            )
        else:
            print(
                f"  status {r.status_code} | {ct} "
                f"(WeasyPrint native libs absent in sandbox -> 503 expected)"
            )

        hr("12) DASHBOARD  GET /api/v1/dashboard/stats")
        print("  ", (await c.get("/api/v1/dashboard/stats", headers=A)).json())


if __name__ == "__main__":
    asyncio.run(main())

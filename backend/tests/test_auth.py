"""Auth-flow and API tests via the HTTP client (deps overridden as admin)."""

from __future__ import annotations

import pytest

pytestmark = pytest.mark.asyncio


async def test_health(client):
    resp = await client.get("/health")
    assert resp.status_code == 200
    assert resp.json()["status"] == "ok"


async def test_me_returns_current_user(client):
    resp = await client.get("/api/v1/auth/me")
    assert resp.status_code == 200
    body = resp.json()
    assert body["email"] == "admin@example.com"
    assert body["role"] == "admin"


async def test_list_medicines_endpoint(client):
    resp = await client.get("/api/v1/medicines?page=1&page_size=10")
    assert resp.status_code == 200
    body = resp.json()
    assert body["total"] == 2
    assert {m["id"] for m in body["items"]} == {"MED-0001", "MED-0002"}


async def test_low_stock_endpoint(client):
    resp = await client.get("/api/v1/medicines/low-stock")
    assert resp.status_code == 200
    ids = [m["id"] for m in resp.json()]
    assert "MED-0002" in ids  # stock 3 <= threshold 10
    assert "MED-0001" not in ids  # stock 50


async def test_create_sale_endpoint_applies_discount(client):
    resp = await client.post(
        "/api/v1/sales",
        json={
            "customer_name": "API Customer",
            "items": [{"medicine_id": "MED-0001", "quantity_strips": 2}],
        },
    )
    assert resp.status_code == 201
    body = resp.json()
    assert body["grand_total"] == "190.00"
    assert body["invoice_number"].startswith("INV-SALE-")


async def test_create_sale_insufficient_stock_returns_400(client):
    resp = await client.post(
        "/api/v1/sales",
        json={"items": [{"medicine_id": "MED-0002", "quantity_strips": 99}]},
    )
    assert resp.status_code == 400
    assert "Insufficient stock" in resp.json()["detail"]


async def test_dashboard_stats_endpoint(client):
    # Make a sale first so revenue is non-zero today.
    await client.post(
        "/api/v1/sales",
        json={"items": [{"medicine_id": "MED-0001", "quantity_strips": 1}]},
    )
    resp = await client.get("/api/v1/dashboard/stats")
    assert resp.status_code == 200
    body = resp.json()
    assert body["low_stock_count"] >= 1
    assert "total_inventory_value" in body


async def test_invoice_pdf_endpoint(client):
    created = await client.post(
        "/api/v1/sales",
        json={"items": [{"medicine_id": "MED-0001", "quantity_strips": 1}]},
    )
    invoice_id = created.json()["id"]
    resp = await client.get(f"/api/v1/invoices/{invoice_id}/pdf")
    # 200 (real PDF) if WeasyPrint native deps present; otherwise 503 when the
    # lazy import fails — accept either so the suite is portable.
    assert resp.status_code in (200, 503)
    if resp.status_code == 200:
        assert resp.headers["content-type"] == "application/pdf"
        assert resp.content[:4] == b"%PDF"

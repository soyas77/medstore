"""Sale processing tests: discount logic and insufficient stock."""

from __future__ import annotations

from decimal import Decimal

import pytest

from app.schemas.sale import SaleCreate, SaleItemInput
from app.services.sale_service import process_sale

pytestmark = pytest.mark.asyncio


async def test_sale_applies_5pct_discount_when_qty_ge_2(session_maker, seeded):
    admin = seeded["admin"]
    payload = SaleCreate(
        customer_name="Walk-in",
        items=[SaleItemInput(medicine_id="MED-0001", quantity_strips=2)],
    )
    async with session_maker() as s:
        invoice = await process_sale(s, payload, admin.id)

    # 2 x 100 = 200 gross, 5% discount = 10, total = 190.
    assert invoice.subtotal == Decimal("200.00")
    assert invoice.discount_total == Decimal("10.00")
    assert invoice.grand_total == Decimal("190.00")
    assert invoice.items[0].discount_pct == Decimal("5.00")
    assert invoice.invoice_number == "INV-SALE-0001"


async def test_sale_no_discount_when_qty_1(session_maker, seeded):
    admin = seeded["admin"]
    payload = SaleCreate(
        items=[SaleItemInput(medicine_id="MED-0001", quantity_strips=1)]
    )
    async with session_maker() as s:
        invoice = await process_sale(s, payload, admin.id)

    assert invoice.subtotal == Decimal("100.00")
    assert invoice.discount_total == Decimal("0.00")
    assert invoice.grand_total == Decimal("100.00")


async def test_sale_deducts_stock(session_maker, seeded):
    from app.models.medicine import Medicine

    admin = seeded["admin"]
    payload = SaleCreate(
        items=[SaleItemInput(medicine_id="MED-0001", quantity_strips=5)]
    )
    async with session_maker() as s:
        await process_sale(s, payload, admin.id)
    async with session_maker() as s:
        med = await s.get(Medicine, "MED-0001")
        assert med.stock_strips == 45  # 50 - 5


async def test_sale_insufficient_stock_raises_400(session_maker, seeded):
    from fastapi import HTTPException

    admin = seeded["admin"]
    payload = SaleCreate(
        items=[SaleItemInput(medicine_id="MED-0002", quantity_strips=10)]
    )  # only 3 in stock
    async with session_maker() as s:
        with pytest.raises(HTTPException) as exc:
            await process_sale(s, payload, admin.id)
    assert exc.value.status_code == 400
    assert "Insufficient stock" in exc.value.detail


async def test_sale_unknown_medicine_raises_400(session_maker, seeded):
    from fastapi import HTTPException

    admin = seeded["admin"]
    payload = SaleCreate(
        items=[SaleItemInput(medicine_id="MED-9999", quantity_strips=1)]
    )
    async with session_maker() as s:
        with pytest.raises(HTTPException) as exc:
            await process_sale(s, payload, admin.id)
    assert exc.value.status_code == 400

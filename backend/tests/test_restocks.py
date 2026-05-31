"""Restock processing tests."""

from __future__ import annotations

from decimal import Decimal

import pytest

from app.models.medicine import Medicine
from app.schemas.sale import RestockCreate, RestockItemInput
from app.services.restock_service import process_restock

pytestmark = pytest.mark.asyncio


async def test_restock_increments_stock(session_maker, seeded):
    admin = seeded["admin"]
    payload = RestockCreate(
        supplier_name="Acme Distributors",
        items=[
            RestockItemInput(
                medicine_id="MED-0002",
                quantity_strips=20,
                unit_cost=Decimal("150.00"),
            )
        ],
    )
    async with session_maker() as s:
        invoice = await process_restock(s, payload, admin.id)

    assert invoice.type.value == "restock"
    assert invoice.invoice_number == "INV-RESTOCK-0001"
    assert invoice.grand_total == Decimal("3000.00")  # 20 x 150
    assert invoice.discount_total == Decimal("0.00")

    async with session_maker() as s:
        med = await s.get(Medicine, "MED-0002")
        assert med.stock_strips == 23  # 3 + 20


async def test_restock_numbering_is_independent_from_sales(session_maker, seeded):
    admin = seeded["admin"]
    p1 = RestockCreate(
        items=[
            RestockItemInput(
                medicine_id="MED-0001", quantity_strips=1, unit_cost=Decimal("1.00")
            )
        ]
    )
    async with session_maker() as s:
        inv1 = await process_restock(s, p1, admin.id)
    async with session_maker() as s:
        inv2 = await process_restock(s, p1, admin.id)
    assert inv1.invoice_number == "INV-RESTOCK-0001"
    assert inv2.invoice_number == "INV-RESTOCK-0002"

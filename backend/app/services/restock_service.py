"""Restock processing business logic (admin-only at the API layer).

Increments ``stock_strips`` for each medicine and records a restock invoice.
No discount logic applies. Runs atomically in one transaction.
"""

from __future__ import annotations

import uuid
from decimal import ROUND_HALF_UP, Decimal

from fastapi import HTTPException, status
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.database import transaction
from app.models.invoice import Invoice, InvoiceItem, InvoiceType
from app.models.medicine import Medicine
from app.schemas.sale import RestockCreate
from app.utils.invoice_numbering import next_invoice_number

TWO_PLACES = Decimal("0.01")


def _money(value: Decimal) -> Decimal:
    return value.quantize(TWO_PLACES, rounding=ROUND_HALF_UP)


async def process_restock(
    session: AsyncSession, payload: RestockCreate, user_id: uuid.UUID
) -> Invoice:
    """Create a restock invoice and increment stock atomically."""
    async with transaction(session):
        ids = [item.medicine_id for item in payload.items]
        rows = (
            await session.execute(
                select(Medicine)
                .where(Medicine.id.in_(ids), Medicine.is_deleted.is_(False))
                .with_for_update()
            )
        ).scalars().all()
        by_id = {m.id: m for m in rows}

        subtotal = Decimal("0.00")
        items: list[InvoiceItem] = []

        for line in payload.items:
            med = by_id.get(line.medicine_id)
            if med is None:
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail=f"Medicine '{line.medicine_id}' not found",
                )

            line_total = _money(line.unit_cost * line.quantity_strips)
            subtotal += line_total

            # Increment stock.
            med.stock_strips += line.quantity_strips

            items.append(
                InvoiceItem(
                    medicine_id=med.id,
                    medicine_name=med.name,
                    manufacturer=med.manufacturer,
                    quantity_strips=line.quantity_strips,
                    unit_price=_money(line.unit_cost),
                    discount_pct=Decimal("0.00"),
                    line_total=line_total,
                )
            )

        number = await next_invoice_number(session, InvoiceType.restock)
        invoice = Invoice(
            invoice_number=number,
            type=InvoiceType.restock,
            user_id=user_id,
            supplier_name=payload.supplier_name,
            subtotal=_money(subtotal),
            discount_total=Decimal("0.00"),
            grand_total=_money(subtotal),
            items=items,
        )
        session.add(invoice)
        await session.flush()
        invoice_id = invoice.id

    result = await session.execute(
        select(Invoice).where(Invoice.id == invoice_id)
    )
    return result.scalar_one()

"""Sale processing business logic.

Rules (ported from the CLI):
  * For each line, if ``quantity_strips >= 2`` apply a 5% discount to that line.
  * Stock is deducted atomically inside a single DB transaction.
  * Raise HTTP 400 on insufficient stock or unknown medicine.
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
from app.schemas.sale import SaleCreate
from app.utils.invoice_numbering import next_invoice_number

DISCOUNT_MIN_QTY = 2
DISCOUNT_PCT = Decimal("5.00")  # percent
TWO_PLACES = Decimal("0.01")


def _money(value: Decimal) -> Decimal:
    return value.quantize(TWO_PLACES, rounding=ROUND_HALF_UP)


async def process_sale(
    session: AsyncSession, payload: SaleCreate, user_id: uuid.UUID
) -> Invoice:
    """Create a sale invoice, deduct stock, and return the persisted invoice.

    The whole operation runs in one transaction so stock deduction and invoice
    creation are atomic.
    """
    async with transaction(session):
        # Lock all involved medicine rows up-front to prevent oversell races.
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
        discount_total = Decimal("0.00")
        items: list[InvoiceItem] = []

        for line in payload.items:
            med = by_id.get(line.medicine_id)
            if med is None:
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail=f"Medicine '{line.medicine_id}' not found",
                )
            if line.quantity_strips > med.stock_strips:
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail=(
                        f"Insufficient stock for {med.name}: "
                        f"have {med.stock_strips}, need {line.quantity_strips}"
                    ),
                )

            unit_price = med.price_per_strip
            gross = _money(unit_price * line.quantity_strips)
            disc_pct = (
                DISCOUNT_PCT
                if line.quantity_strips >= DISCOUNT_MIN_QTY
                else Decimal("0.00")
            )
            line_discount = _money(gross * disc_pct / Decimal("100"))
            line_total = _money(gross - line_discount)

            subtotal += gross
            discount_total += line_discount

            # Deduct stock.
            med.stock_strips -= line.quantity_strips

            items.append(
                InvoiceItem(
                    medicine_id=med.id,
                    medicine_name=med.name,
                    manufacturer=med.manufacturer,
                    quantity_strips=line.quantity_strips,
                    unit_price=unit_price,
                    discount_pct=disc_pct,
                    line_total=line_total,
                )
            )

        grand_total = _money(subtotal - discount_total)
        number = await next_invoice_number(session, InvoiceType.sale)

        invoice = Invoice(
            invoice_number=number,
            type=InvoiceType.sale,
            user_id=user_id,
            customer_name=payload.customer_name,
            subtotal=_money(subtotal),
            discount_total=_money(discount_total),
            grand_total=grand_total,
            items=items,
        )
        session.add(invoice)
        await session.flush()
        invoice_id = invoice.id

    # Re-load with relationships eagerly populated after commit.
    return await _load_invoice(session, invoice_id)


async def _load_invoice(session: AsyncSession, invoice_id: uuid.UUID) -> Invoice:
    result = await session.execute(
        select(Invoice).where(Invoice.id == invoice_id)
    )
    return result.scalar_one()

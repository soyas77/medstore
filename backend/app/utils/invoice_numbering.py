"""Race-safe sequential invoice numbering.

Strategy: a single counter row per ``InvoiceType`` is locked with
``SELECT ... FOR UPDATE`` within the caller's transaction, incremented, and the
formatted number returned. Because the lock is held until commit, concurrent
transactions serialise on the row and cannot produce duplicate numbers.

Format: ``INV-SALE-0001`` / ``INV-RESTOCK-0001``.
"""

from __future__ import annotations

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.invoice import InvoiceCounter, InvoiceType

_PREFIX = {
    InvoiceType.sale: "INV-SALE",
    InvoiceType.restock: "INV-RESTOCK",
}


async def next_invoice_number(
    session: AsyncSession, invoice_type: InvoiceType
) -> str:
    """Return the next sequential invoice number for ``invoice_type``.

    Must be called inside an open transaction. The counter row is locked for
    the duration of the transaction to prevent races.
    """
    stmt = (
        select(InvoiceCounter)
        .where(InvoiceCounter.type == invoice_type)
        .with_for_update()
    )
    counter = (await session.execute(stmt)).scalar_one_or_none()

    if counter is None:
        # Lazily create the counter row on first use.
        counter = InvoiceCounter(type=invoice_type, last_value=0)
        session.add(counter)
        await session.flush()
        # Re-lock the freshly inserted row.
        counter = (await session.execute(stmt)).scalar_one()

    counter.last_value += 1
    await session.flush()

    return f"{_PREFIX[invoice_type]}-{counter.last_value:04d}"

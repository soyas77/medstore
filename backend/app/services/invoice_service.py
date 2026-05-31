"""Invoice query helpers (listing, fetching, dashboard aggregates)."""

from __future__ import annotations

import uuid
from datetime import UTC, date, datetime, timedelta
from decimal import Decimal

from sqlalchemy import Select, func, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.invoice import Invoice, InvoiceType
from app.models.medicine import Medicine
from app.schemas.invoice import DashboardStats, SalesTrendPoint


def _apply_invoice_filters(
    stmt: Select,
    *,
    type_: InvoiceType | None,
    user_id: uuid.UUID | None,
    date_from: date | None,
    date_to: date | None,
) -> Select:
    if type_ is not None:
        stmt = stmt.where(Invoice.type == type_)
    if user_id is not None:
        stmt = stmt.where(Invoice.user_id == user_id)
    if date_from is not None:
        stmt = stmt.where(
            Invoice.created_at >= datetime.combine(date_from, datetime.min.time())
        )
    if date_to is not None:
        stmt = stmt.where(
            Invoice.created_at <= datetime.combine(date_to, datetime.max.time())
        )
    return stmt


async def list_invoices(
    session: AsyncSession,
    *,
    type_: InvoiceType | None = None,
    user_id: uuid.UUID | None = None,
    date_from: date | None = None,
    date_to: date | None = None,
    page: int = 1,
    page_size: int = 10,
) -> tuple[list[Invoice], int]:
    """Return a page of invoices and the total count."""
    base = _apply_invoice_filters(
        select(Invoice),
        type_=type_,
        user_id=user_id,
        date_from=date_from,
        date_to=date_to,
    )
    total = (
        await session.execute(
            select(func.count()).select_from(base.subquery())
        )
    ).scalar_one()

    rows = (
        await session.execute(
            base.order_by(Invoice.created_at.desc())
            .offset((page - 1) * page_size)
            .limit(page_size)
        )
    ).scalars().all()
    return list(rows), int(total)


async def get_invoice(
    session: AsyncSession, invoice_id: uuid.UUID
) -> Invoice | None:
    return (
        await session.execute(select(Invoice).where(Invoice.id == invoice_id))
    ).scalar_one_or_none()


async def get_dashboard_stats(session: AsyncSession) -> DashboardStats:
    """Compute KPI tiles for the dashboard."""
    now = datetime.now(UTC)
    today_start = datetime.combine(now.date(), datetime.min.time(), tzinfo=UTC)
    yest_start = today_start - timedelta(days=1)

    async def _revenue(start: datetime, end: datetime) -> tuple[Decimal, int]:
        stmt = select(
            func.coalesce(func.sum(Invoice.grand_total), 0),
            func.count(Invoice.id),
        ).where(
            Invoice.type == InvoiceType.sale,
            Invoice.created_at >= start,
            Invoice.created_at < end,
        )
        rev, cnt = (await session.execute(stmt)).one()
        return Decimal(rev), int(cnt)

    today_rev, today_txn = await _revenue(today_start, today_start + timedelta(days=1))
    yest_rev, yest_txn = await _revenue(yest_start, today_start)

    low_stock_count = (
        await session.execute(
            select(func.count(Medicine.id)).where(
                Medicine.is_deleted.is_(False),
                Medicine.stock_strips <= Medicine.low_stock_threshold,
            )
        )
    ).scalar_one()

    inventory_value = (
        await session.execute(
            select(
                func.coalesce(
                    func.sum(Medicine.stock_strips * Medicine.price_per_strip), 0
                )
            ).where(Medicine.is_deleted.is_(False))
        )
    ).scalar_one()

    def _pct(curr: Decimal | int, prev: Decimal | int) -> float:
        if prev == 0:
            return 100.0 if curr > 0 else 0.0
        return round(float((Decimal(curr) - Decimal(prev)) / Decimal(prev) * 100), 1)

    return DashboardStats(
        today_revenue=today_rev,
        today_transactions=today_txn,
        low_stock_count=int(low_stock_count),
        total_inventory_value=Decimal(inventory_value),
        revenue_change_pct=_pct(today_rev, yest_rev),
        transactions_change_pct=_pct(today_txn, yest_txn),
    )


async def get_sales_trend(
    session: AsyncSession, days: int = 7
) -> list[SalesTrendPoint]:
    """Daily revenue / transaction counts for the last ``days`` days."""
    now = datetime.now(UTC)
    start = datetime.combine(
        (now - timedelta(days=days - 1)).date(),
        datetime.min.time(),
        tzinfo=UTC,
    )

    day_col = func.date(Invoice.created_at).label("day")
    rows = (
        await session.execute(
            select(
                day_col,
                func.coalesce(func.sum(Invoice.grand_total), 0),
                func.count(Invoice.id),
            )
            .where(
                Invoice.type == InvoiceType.sale,
                Invoice.created_at >= start,
            )
            .group_by(day_col)
            .order_by(day_col)
        )
    ).all()

    by_day = {str(r[0]): (Decimal(r[1]), int(r[2])) for r in rows}
    points: list[SalesTrendPoint] = []
    for i in range(days):
        d = (start + timedelta(days=i)).date().isoformat()
        rev, cnt = by_day.get(d, (Decimal("0.00"), 0))
        points.append(SalesTrendPoint(date=d, revenue=rev, transactions=cnt))
    return points

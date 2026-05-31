"""Dashboard routes.

Endpoints (2):
  GET /dashboard/stats        - KPI tiles
  GET /dashboard/sales-trend  - last-7-day sales series
"""

from __future__ import annotations

from fastapi import APIRouter, Depends, Query
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.database import get_async_session
from app.core.security import get_current_user
from app.models.user import User
from app.schemas.invoice import DashboardStats, SalesTrendPoint
from app.services import invoice_service

router = APIRouter(prefix="/dashboard", tags=["dashboard"])


@router.get("/stats", response_model=DashboardStats, summary="Dashboard KPIs")
async def dashboard_stats(
    _user: User = Depends(get_current_user),
    session: AsyncSession = Depends(get_async_session),
) -> DashboardStats:
    """Today's revenue & transactions, low-stock count, inventory value."""
    return await invoice_service.get_dashboard_stats(session)


@router.get(
    "/sales-trend",
    response_model=list[SalesTrendPoint],
    summary="Sales trend (last N days)",
)
async def sales_trend(
    days: int = Query(default=7, ge=1, le=90),
    _user: User = Depends(get_current_user),
    session: AsyncSession = Depends(get_async_session),
) -> list[SalesTrendPoint]:
    """Daily revenue and transaction counts for the last ``days`` days."""
    return await invoice_service.get_sales_trend(session, days=days)

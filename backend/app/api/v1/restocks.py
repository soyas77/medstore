"""Restock routes.

Endpoints (1):
  POST /restocks - process a restock (admin only)
"""

from __future__ import annotations

from fastapi import APIRouter, Depends, status
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.database import get_async_session
from app.core.security import get_current_admin
from app.models.user import User
from app.schemas.invoice import InvoiceDetailRead
from app.schemas.sale import RestockCreate
from app.services.restock_service import process_restock

router = APIRouter(prefix="/restocks", tags=["restocks"])


@router.post(
    "",
    response_model=InvoiceDetailRead,
    status_code=status.HTTP_201_CREATED,
    summary="Process a restock (admin only)",
)
async def create_restock(
    payload: RestockCreate,
    admin: User = Depends(get_current_admin),
    session: AsyncSession = Depends(get_async_session),
) -> InvoiceDetailRead:
    """Record incoming stock from a supplier and increment inventory.

    Admin-only. Runs atomically and returns the generated restock invoice.
    """
    invoice = await process_restock(session, payload, admin.id)
    return InvoiceDetailRead.model_validate(invoice)

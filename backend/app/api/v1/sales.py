"""Sale routes.

Endpoints (1):
  POST /sales - process a sale (any authenticated user)
"""

from __future__ import annotations

from fastapi import APIRouter, Depends, status
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.database import get_async_session
from app.core.security import get_current_user
from app.models.user import User
from app.schemas.invoice import InvoiceDetailRead
from app.schemas.sale import SaleCreate
from app.services.sale_service import process_sale

router = APIRouter(prefix="/sales", tags=["sales"])


@router.post(
    "",
    response_model=InvoiceDetailRead,
    status_code=status.HTTP_201_CREATED,
    summary="Process a sale",
)
async def create_sale(
    payload: SaleCreate,
    user: User = Depends(get_current_user),
    session: AsyncSession = Depends(get_async_session),
) -> InvoiceDetailRead:
    """Process a sale.

    Applies a 5% per-line discount when ``quantity_strips >= 2``, deducts stock
    atomically, and returns the generated invoice. Returns **400** on
    insufficient stock or an unknown medicine.
    """
    invoice = await process_sale(session, payload, user.id)
    return InvoiceDetailRead.model_validate(invoice)

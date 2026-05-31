"""Invoice routes.

Endpoints (3):
  GET /invoices            - paginated, filterable list
  GET /invoices/{id}       - full invoice detail
  GET /invoices/{id}/pdf   - stream the invoice as application/pdf
"""

from __future__ import annotations

import uuid
from datetime import date

from fastapi import APIRouter, Depends, HTTPException, Query, status
from fastapi.responses import Response
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.database import get_async_session
from app.core.security import get_current_user
from app.models.invoice import InvoiceType
from app.models.user import User
from app.schemas.invoice import (
    InvoiceDetailRead,
    InvoiceRead,
    PaginatedInvoices,
)
from app.services import invoice_service
from app.services.pdf_service import render_invoice_pdf

router = APIRouter(prefix="/invoices", tags=["invoices"])


@router.get("", response_model=PaginatedInvoices, summary="List invoices")
async def list_invoices(
    type: InvoiceType | None = Query(default=None),
    user_id: uuid.UUID | None = Query(default=None),
    date_from: date | None = Query(default=None),
    date_to: date | None = Query(default=None),
    page: int = Query(default=1, ge=1),
    page_size: int = Query(default=10, ge=1, le=100),
    _user: User = Depends(get_current_user),
    session: AsyncSession = Depends(get_async_session),
) -> PaginatedInvoices:
    """List invoices with optional filters (type, user, date range)."""
    rows, total = await invoice_service.list_invoices(
        session,
        type_=type,
        user_id=user_id,
        date_from=date_from,
        date_to=date_to,
        page=page,
        page_size=page_size,
    )
    return PaginatedInvoices(
        items=[InvoiceRead.model_validate(r) for r in rows],
        total=total,
        page=page,
        page_size=page_size,
    )


@router.get(
    "/{invoice_id}",
    response_model=InvoiceDetailRead,
    summary="Get invoice detail",
)
async def get_invoice(
    invoice_id: uuid.UUID,
    _user: User = Depends(get_current_user),
    session: AsyncSession = Depends(get_async_session),
) -> InvoiceDetailRead:
    """Retrieve a single invoice including its line items."""
    invoice = await invoice_service.get_invoice(session, invoice_id)
    if invoice is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND, detail="Invoice not found"
        )
    return InvoiceDetailRead.model_validate(invoice)


@router.get(
    "/{invoice_id}/pdf",
    summary="Download the invoice as a PDF",
    responses={200: {"content": {"application/pdf": {}}}},
)
async def get_invoice_pdf(
    invoice_id: uuid.UUID,
    _user: User = Depends(get_current_user),
    session: AsyncSession = Depends(get_async_session),
) -> Response:
    """Render and stream the invoice as ``application/pdf``."""
    invoice = await invoice_service.get_invoice(session, invoice_id)
    if invoice is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND, detail="Invoice not found"
        )
    try:
        pdf_bytes = render_invoice_pdf(invoice)
    except (ImportError, OSError) as exc:  # native libs unavailable
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="PDF rendering is unavailable (WeasyPrint not installed)",
        ) from exc
    filename = f"{invoice.invoice_number}.pdf"
    return Response(
        content=pdf_bytes,
        media_type="application/pdf",
        headers={"Content-Disposition": f'inline; filename="{filename}"'},
    )

"""Invoice response schemas."""

from __future__ import annotations

import uuid
from datetime import datetime
from decimal import Decimal

from pydantic import BaseModel, ConfigDict

from app.models.invoice import InvoiceType


class InvoiceItemRead(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: uuid.UUID
    medicine_id: str
    medicine_name: str
    manufacturer: str
    quantity_strips: int
    unit_price: Decimal
    discount_pct: Decimal
    line_total: Decimal


class InvoiceRead(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: uuid.UUID
    invoice_number: str
    type: InvoiceType
    user_id: uuid.UUID
    customer_name: str | None
    supplier_name: str | None
    subtotal: Decimal
    discount_total: Decimal
    grand_total: Decimal
    created_at: datetime


class InvoiceDetailRead(InvoiceRead):
    items: list[InvoiceItemRead]


class PaginatedInvoices(BaseModel):
    items: list[InvoiceRead]
    total: int
    page: int
    page_size: int


class DashboardStats(BaseModel):
    today_revenue: Decimal
    today_transactions: int
    low_stock_count: int
    total_inventory_value: Decimal
    revenue_change_pct: float
    transactions_change_pct: float


class SalesTrendPoint(BaseModel):
    date: str
    revenue: Decimal
    transactions: int

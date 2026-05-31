"""Invoice and InvoiceItem models, plus the invoice-numbering counter."""

from __future__ import annotations

import enum
import uuid
from datetime import datetime
from decimal import Decimal

from sqlalchemy import (
    DateTime,
    Enum,
    ForeignKey,
    Integer,
    Numeric,
    String,
    func,
)
from sqlalchemy.dialects.postgresql import UUID as PG_UUID
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.core.database import Base


class InvoiceType(str, enum.Enum):
    """Invoice kinds."""

    sale = "sale"
    restock = "restock"


class Invoice(Base):
    """Header for a sale or restock transaction."""

    __tablename__ = "invoices"

    id: Mapped[uuid.UUID] = mapped_column(
        PG_UUID(as_uuid=True), primary_key=True, default=uuid.uuid4
    )
    invoice_number: Mapped[str] = mapped_column(
        String(32), unique=True, nullable=False, index=True
    )
    type: Mapped[InvoiceType] = mapped_column(
        Enum(InvoiceType, name="invoice_type"), nullable=False
    )
    user_id: Mapped[uuid.UUID] = mapped_column(
        PG_UUID(as_uuid=True),
        ForeignKey("users.id", ondelete="RESTRICT"),
        nullable=False,
        index=True,
    )
    customer_name: Mapped[str | None] = mapped_column(String(255), nullable=True)
    supplier_name: Mapped[str | None] = mapped_column(String(255), nullable=True)

    subtotal: Mapped[Decimal] = mapped_column(Numeric(12, 2), nullable=False)
    discount_total: Mapped[Decimal] = mapped_column(
        Numeric(12, 2), nullable=False, default=0
    )
    grand_total: Mapped[Decimal] = mapped_column(Numeric(12, 2), nullable=False)

    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), nullable=False, server_default=func.now()
    )

    items: Mapped[list[InvoiceItem]] = relationship(
        back_populates="invoice",
        cascade="all, delete-orphan",
        lazy="selectin",
    )
    user: Mapped[object] = relationship("User", lazy="selectin")

    def __repr__(self) -> str:  # pragma: no cover - debug helper
        return f"<Invoice {self.invoice_number} {self.grand_total}>"


class InvoiceItem(Base):
    """A single line within an invoice."""

    __tablename__ = "invoice_items"

    id: Mapped[uuid.UUID] = mapped_column(
        PG_UUID(as_uuid=True), primary_key=True, default=uuid.uuid4
    )
    invoice_id: Mapped[uuid.UUID] = mapped_column(
        PG_UUID(as_uuid=True),
        ForeignKey("invoices.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )
    medicine_id: Mapped[str] = mapped_column(
        String(20),
        ForeignKey("medicines.id", ondelete="RESTRICT"),
        nullable=False,
    )
    # Denormalised snapshot so historical invoices stay correct.
    medicine_name: Mapped[str] = mapped_column(String(255), nullable=False)
    manufacturer: Mapped[str] = mapped_column(String(255), nullable=False)

    quantity_strips: Mapped[int] = mapped_column(Integer, nullable=False)
    unit_price: Mapped[Decimal] = mapped_column(Numeric(10, 2), nullable=False)
    discount_pct: Mapped[Decimal] = mapped_column(
        Numeric(5, 2), nullable=False, default=0
    )
    line_total: Mapped[Decimal] = mapped_column(Numeric(12, 2), nullable=False)

    invoice: Mapped[Invoice] = relationship(back_populates="items")

    def __repr__(self) -> str:  # pragma: no cover - debug helper
        return f"<InvoiceItem {self.medicine_id} x{self.quantity_strips}>"


class InvoiceCounter(Base):
    """Single-row-per-type counter for race-safe sequential numbering.

    Concurrency is handled with ``SELECT ... FOR UPDATE`` on the matching row
    inside the same transaction as the invoice insert.
    """

    __tablename__ = "invoice_counters"

    type: Mapped[InvoiceType] = mapped_column(
        Enum(InvoiceType, name="invoice_type", create_type=False),
        primary_key=True,
    )
    last_value: Mapped[int] = mapped_column(
        Integer, nullable=False, default=0, server_default="0"
    )

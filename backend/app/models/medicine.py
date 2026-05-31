"""Medicine (inventory) model."""

from __future__ import annotations

from datetime import datetime
from decimal import Decimal

from sqlalchemy import Boolean, DateTime, Integer, Numeric, String, func
from sqlalchemy.orm import Mapped, mapped_column

from app.core.database import Base


class Medicine(Base):
    """An inventory item, tracked in *strips*.

    ``id`` is a human-friendly VARCHAR SKU (e.g. ``MED-0001``), per spec.
    Soft-delete is supported via ``is_deleted``.
    """

    __tablename__ = "medicines"

    id: Mapped[str] = mapped_column(String(20), primary_key=True)
    name: Mapped[str] = mapped_column(String(255), nullable=False, index=True)
    manufacturer: Mapped[str] = mapped_column(String(255), nullable=False)
    price_per_strip: Mapped[Decimal] = mapped_column(
        Numeric(10, 2), nullable=False
    )
    strips_per_box: Mapped[int] = mapped_column(
        Integer, nullable=False, default=1, server_default="1"
    )
    stock_strips: Mapped[int] = mapped_column(
        Integer, nullable=False, default=0, server_default="0"
    )
    low_stock_threshold: Mapped[int] = mapped_column(
        Integer, nullable=False, default=10, server_default="10"
    )
    is_deleted: Mapped[bool] = mapped_column(
        Boolean, nullable=False, default=False, server_default="false"
    )
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), nullable=False, server_default=func.now()
    )
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        nullable=False,
        server_default=func.now(),
        onupdate=func.now(),
    )

    @property
    def is_low_stock(self) -> bool:
        return self.stock_strips <= self.low_stock_threshold

    def __repr__(self) -> str:  # pragma: no cover - debug helper
        return f"<Medicine {self.id} {self.name} stock={self.stock_strips}>"

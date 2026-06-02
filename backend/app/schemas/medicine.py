"""Medicine schemas."""

from __future__ import annotations

from datetime import datetime
from decimal import Decimal

from pydantic import (
    AliasChoices,
    BaseModel,
    ConfigDict,
    Field,
    computed_field,
)


class MedicineBase(BaseModel):
    name: str = Field(..., min_length=1, max_length=255)
    manufacturer: str = Field(..., min_length=1, max_length=255)
    price_per_strip: Decimal = Field(..., ge=0, max_digits=10, decimal_places=2)
    strips_per_box: int = Field(default=1, ge=1)
    low_stock_threshold: int = Field(default=10, ge=0)


class MedicineCreate(MedicineBase):
    """Create payload. ``id`` is optional; auto-generated if omitted."""

    model_config = ConfigDict(populate_by_name=True)

    id: str | None = Field(default=None, max_length=20)
    stock_strips: int = Field(
        default=0,
        ge=0,
        validation_alias=AliasChoices("stock", "stock_strips"),
    )


class MedicineUpdate(BaseModel):
    """Update payload. Accepts ``stock`` or ``stock_strips``."""

    model_config = ConfigDict(populate_by_name=True)

    name: str | None = Field(default=None, max_length=255)
    manufacturer: str | None = Field(default=None, max_length=255)
    price_per_strip: Decimal | None = Field(
        default=None, ge=0, max_digits=10, decimal_places=2
    )
    strips_per_box: int | None = Field(default=None, ge=1)
    stock_strips: int | None = Field(
        default=None,
        ge=0,
        validation_alias=AliasChoices("stock", "stock_strips"),
    )
    low_stock_threshold: int | None = Field(default=None, ge=0)


class MedicineRead(MedicineBase):
    model_config = ConfigDict(from_attributes=True)

    id: str
    stock_strips: int
    is_deleted: bool
    is_low_stock: bool
    created_at: datetime
    updated_at: datetime

    @computed_field  # type: ignore[prop-decorator]
    @property
    def stock(self) -> int:
        """Alias for stock_strips (frontend reads `stock`)."""
        return self.stock_strips


class PaginatedMedicines(BaseModel):
    items: list[MedicineRead]
    total: int
    page: int
    page_size: int
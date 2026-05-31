"""Medicine schemas."""

from __future__ import annotations

from datetime import datetime
from decimal import Decimal

from pydantic import BaseModel, ConfigDict, Field


class MedicineBase(BaseModel):
    name: str = Field(..., min_length=1, max_length=255)
    manufacturer: str = Field(..., min_length=1, max_length=255)
    price_per_strip: Decimal = Field(..., ge=0, max_digits=10, decimal_places=2)
    strips_per_box: int = Field(default=1, ge=1)
    low_stock_threshold: int = Field(default=10, ge=0)


class MedicineCreate(MedicineBase):
    """Create payload. ``id`` is optional; auto-generated if omitted."""

    id: str | None = Field(default=None, max_length=20)
    stock_strips: int = Field(default=0, ge=0)


class MedicineUpdate(BaseModel):
    name: str | None = Field(default=None, max_length=255)
    manufacturer: str | None = Field(default=None, max_length=255)
    price_per_strip: Decimal | None = Field(
        default=None, ge=0, max_digits=10, decimal_places=2
    )
    strips_per_box: int | None = Field(default=None, ge=1)
    stock_strips: int | None = Field(default=None, ge=0)
    low_stock_threshold: int | None = Field(default=None, ge=0)


class MedicineRead(MedicineBase):
    model_config = ConfigDict(from_attributes=True)

    id: str
    stock_strips: int
    is_deleted: bool
    is_low_stock: bool
    created_at: datetime
    updated_at: datetime


class PaginatedMedicines(BaseModel):
    items: list[MedicineRead]
    total: int
    page: int
    page_size: int

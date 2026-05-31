"""Sale & restock request schemas."""

from __future__ import annotations

from decimal import Decimal

from pydantic import BaseModel, Field, field_validator


class SaleItemInput(BaseModel):
    medicine_id: str = Field(..., max_length=20)
    quantity_strips: int = Field(..., gt=0, description="Strips to sell")


class SaleCreate(BaseModel):
    customer_name: str | None = Field(default=None, max_length=255)
    items: list[SaleItemInput] = Field(..., min_length=1)

    @field_validator("items")
    @classmethod
    def _no_duplicates(cls, items: list[SaleItemInput]) -> list[SaleItemInput]:
        ids = [i.medicine_id for i in items]
        if len(ids) != len(set(ids)):
            raise ValueError("Duplicate medicine_id in items")
        return items


class RestockItemInput(BaseModel):
    medicine_id: str = Field(..., max_length=20)
    quantity_strips: int = Field(..., gt=0, description="Strips received")
    unit_cost: Decimal = Field(
        ..., ge=0, max_digits=10, decimal_places=2, description="Cost per strip"
    )


class RestockCreate(BaseModel):
    supplier_name: str | None = Field(default=None, max_length=255)
    items: list[RestockItemInput] = Field(..., min_length=1)

    @field_validator("items")
    @classmethod
    def _no_duplicates(
        cls, items: list[RestockItemInput]
    ) -> list[RestockItemInput]:
        ids = [i.medicine_id for i in items]
        if len(ids) != len(set(ids)):
            raise ValueError("Duplicate medicine_id in items")
        return items

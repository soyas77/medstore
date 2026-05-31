"""Aggregate all v1 routers under a single APIRouter."""

from __future__ import annotations

from fastapi import APIRouter

from app.api.v1 import (
    auth,
    dashboard,
    invoices,
    medicines,
    restocks,
    sales,
)

api_router = APIRouter()
api_router.include_router(auth.router)
api_router.include_router(medicines.router)
api_router.include_router(sales.router)
api_router.include_router(restocks.router)
api_router.include_router(invoices.router)
api_router.include_router(dashboard.router)

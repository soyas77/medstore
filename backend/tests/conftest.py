"""Pytest fixtures.

Tests run against an in-memory SQLite (aiosqlite) database so they need no
Postgres. The app's ``get_async_session`` dependency is overridden to use this
engine, and tables are created from ORM metadata.

Note: ``invoice_numbering`` uses ``SELECT ... FOR UPDATE`` which SQLite simply
ignores (single-writer), so the logic still works for tests.
"""

from __future__ import annotations

import os

# Point the app at an in-memory SQLite DB *before* importing app modules so the
# module-level async engine is created against SQLite (no asyncpg needed).
os.environ.setdefault("DATABASE_URL", "sqlite+aiosqlite:///:memory:")
os.environ.setdefault("JWT_SECRET", "test-secret")
os.environ.setdefault("DEBUG", "false")

import asyncio  # noqa: E402
import uuid  # noqa: E402
from collections.abc import AsyncGenerator  # noqa: E402
from decimal import Decimal  # noqa: E402

import pytest
import pytest_asyncio
from httpx import ASGITransport, AsyncClient
from sqlalchemy.ext.asyncio import (
    AsyncSession,
    async_sessionmaker,
    create_async_engine,
)

from app.core.database import Base, get_async_session
from app.core.security import get_current_admin, get_current_user
from app.main import app
from app.models.invoice import InvoiceCounter, InvoiceType
from app.models.medicine import Medicine
from app.models.user import User, UserRole

TEST_DB_URL = "sqlite+aiosqlite:///:memory:"


@pytest.fixture(scope="session")
def event_loop():
    loop = asyncio.new_event_loop()
    yield loop
    loop.close()


@pytest_asyncio.fixture
async def engine():
    eng = create_async_engine(TEST_DB_URL, future=True)
    async with eng.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)
    yield eng
    await eng.dispose()


@pytest_asyncio.fixture
async def session_maker(engine):
    return async_sessionmaker(engine, class_=AsyncSession, expire_on_commit=False)


@pytest_asyncio.fixture
async def db_session(session_maker) -> AsyncGenerator[AsyncSession, None]:
    async with session_maker() as session:
        yield session


@pytest_asyncio.fixture
async def seeded(session_maker):
    """Seed an admin, a cashier, counters and a few medicines."""
    admin = User(
        id=uuid.uuid4(),
        email="admin@example.com",
        hashed_password="x",
        is_active=True,
        is_superuser=True,
        is_verified=True,
        full_name="Admin",
        role=UserRole.admin,
    )
    cashier = User(
        id=uuid.uuid4(),
        email="cashier@example.com",
        hashed_password="x",
        is_active=True,
        is_superuser=False,
        is_verified=True,
        full_name="Cashier",
        role=UserRole.cashier,
    )
    meds = [
        Medicine(
            id="MED-0001",
            name="Paracetamol 500mg",
            manufacturer="Cipla",
            price_per_strip=Decimal("100.00"),
            strips_per_box=10,
            stock_strips=50,
            low_stock_threshold=10,
        ),
        Medicine(
            id="MED-0002",
            name="Amoxicillin 250mg",
            manufacturer="Sun Pharma",
            price_per_strip=Decimal("200.00"),
            strips_per_box=10,
            stock_strips=3,
            low_stock_threshold=10,
        ),
    ]
    async with session_maker() as s:
        s.add_all([admin, cashier, *meds])
        s.add_all(
            [
                InvoiceCounter(type=InvoiceType.sale, last_value=0),
                InvoiceCounter(type=InvoiceType.restock, last_value=0),
            ]
        )
        await s.commit()
    return {"admin": admin, "cashier": cashier}


@pytest_asyncio.fixture
async def client(session_maker, seeded) -> AsyncGenerator[AsyncClient, None]:
    """HTTP client with DB + auth dependencies overridden (auth as admin)."""

    async def _override_session() -> AsyncGenerator[AsyncSession, None]:
        async with session_maker() as session:
            yield session

    admin = seeded["admin"]

    async def _override_current_user() -> User:
        return admin

    async def _override_current_admin() -> User:
        return admin

    app.dependency_overrides[get_async_session] = _override_session
    app.dependency_overrides[get_current_user] = _override_current_user
    app.dependency_overrides[get_current_admin] = _override_current_admin

    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as ac:
        yield ac

    app.dependency_overrides.clear()

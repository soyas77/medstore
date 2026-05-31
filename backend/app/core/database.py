"""Async SQLAlchemy 2.0 engine, session factory and declarative base."""

from __future__ import annotations

from collections.abc import AsyncGenerator
from contextlib import asynccontextmanager

from sqlalchemy.ext.asyncio import (
    AsyncSession,
    async_sessionmaker,
    create_async_engine,
)
from sqlalchemy.orm import DeclarativeBase

from app.core.config import settings


class Base(DeclarativeBase):
    """Declarative base for all ORM models."""


engine = create_async_engine(
    settings.database_url,
    echo=settings.debug,
    pool_pre_ping=True,
    future=True,
)

async_session_maker = async_sessionmaker(
    engine,
    class_=AsyncSession,
    expire_on_commit=False,
    autoflush=False,
)


async def get_async_session() -> AsyncGenerator[AsyncSession, None]:
    """FastAPI dependency yielding an async DB session.

    The session is committed by service-layer transactions; this dependency
    only guarantees the session is closed (and rolled back on error).
    """
    async with async_session_maker() as session:
        try:
            yield session
        except Exception:
            await session.rollback()
            raise
        finally:
            await session.close()


@asynccontextmanager
async def transaction(session: AsyncSession) -> AsyncGenerator[AsyncSession, None]:
    """Begin a transaction only if one isn't already active.

    FastAPI's request-scoped session may already have an implicit transaction
    open (autobegin) by the time a service runs, which makes a bare
    ``session.begin()`` raise "A transaction is already begun". This helper
    uses the existing transaction when present, otherwise opens a new one,
    committing/rolling back appropriately.
    """
    if session.in_transaction():
        # Reuse the active transaction; commit on success so the unit of work
        # is durable, matching the behaviour of an explicit begin() block.
        try:
            yield session
            await session.commit()
        except Exception:
            await session.rollback()
            raise
    else:
        async with session.begin():
            yield session

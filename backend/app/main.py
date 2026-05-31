"""MedStore FastAPI application entrypoint."""

from __future__ import annotations

import time
import uuid
from contextlib import asynccontextmanager

import structlog
from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from sqlalchemy import text

from app import __version__
from app.api.v1.router import api_router
from app.core.config import settings
from app.core.database import engine
from app.core.observability import (
    configure_logging,
    get_logger,
    init_sentry,
)

configure_logging()
log = get_logger("medstore.app")
SENTRY_ENABLED = init_sentry()


@asynccontextmanager
async def lifespan(_app: FastAPI):
    """Startup / shutdown hooks."""
    log.info(
        "startup",
        app=settings.app_name,
        version=__version__,
        environment=settings.environment,
        sentry=SENTRY_ENABLED,
    )
    # Migrations are run via Alembic / entrypoint, not on startup.
    yield
    log.info("shutdown")


def create_app() -> FastAPI:
    app = FastAPI(
        title=f"{settings.app_name} API",
        version=__version__,
        description="Wholesale pharmacy management — sales, inventory, invoicing.",
        lifespan=lifespan,
        openapi_url=f"{settings.api_v1_prefix}/openapi.json",
        docs_url="/docs",
        redoc_url="/redoc",
    )

    app.add_middleware(
        CORSMiddleware,
        allow_origins=settings.cors_origins,
        allow_origin_regex=settings.cors_origin_regex,
        allow_credentials=True,
        allow_methods=["*"],
        allow_headers=["*"],
    )

    @app.middleware("http")
    async def request_context(request: Request, call_next):
        """Attach a request id and emit a structured access log line."""
        request_id = request.headers.get("X-Request-ID", str(uuid.uuid4()))
        structlog.contextvars.bind_contextvars(
            request_id=request_id,
            path=request.url.path,
            method=request.method,
        )
        start = time.perf_counter()
        try:
            response = await call_next(request)
        finally:
            structlog.contextvars.clear_contextvars()
        duration_ms = round((time.perf_counter() - start) * 1000, 2)
        response.headers["X-Request-ID"] = request_id
        log.info(
            "request",
            status_code=response.status_code,
            duration_ms=duration_ms,
        )
        return response

    app.include_router(api_router, prefix=settings.api_v1_prefix)

    @app.get("/health", tags=["meta"], summary="Health check")
    async def health() -> dict[str, str]:
        """Liveness + readiness. Reports DB connectivity and app version."""
        db_status = "ok"
        try:
            async with engine.connect() as conn:
                await conn.execute(text("SELECT 1"))
        except Exception as exc:  # pragma: no cover - depends on live DB
            db_status = f"error: {type(exc).__name__}"
        status = "ok" if db_status == "ok" else "degraded"
        return {
            "status": status,
            "db": db_status,
            "version": __version__,
        }

    return app


app = create_app()

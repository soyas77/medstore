"""Structured logging (structlog) and optional Sentry integration.

- Logs are JSON when ``LOG_JSON`` is true (production), pretty otherwise.
- Sentry is initialised only when ``SENTRY_DSN`` is non-empty.
"""

from __future__ import annotations

import logging
import os
import sys

import structlog


def _log_level() -> int:
    return getattr(logging, os.getenv("LOG_LEVEL", "info").upper(), logging.INFO)


def configure_logging() -> None:
    """Configure structlog + stdlib logging once at startup."""
    json_logs = os.getenv("LOG_JSON", "false").lower() in {"1", "true", "yes"}
    level = _log_level()

    shared_processors: list = [
        structlog.contextvars.merge_contextvars,
        structlog.processors.add_log_level,
        structlog.processors.TimeStamper(fmt="iso"),
        structlog.processors.StackInfoRenderer(),
        structlog.processors.format_exc_info,
    ]

    renderer = (
        structlog.processors.JSONRenderer()
        if json_logs
        else structlog.dev.ConsoleRenderer(colors=True)
    )

    structlog.configure(
        processors=[*shared_processors, renderer],
        wrapper_class=structlog.make_filtering_bound_logger(level),
        logger_factory=structlog.PrintLoggerFactory(file=sys.stdout),
        cache_logger_on_first_use=True,
    )

    # Route stdlib logging (uvicorn/gunicorn/sqlalchemy) through the same level.
    logging.basicConfig(
        format="%(message)s", stream=sys.stdout, level=level, force=True
    )
    for noisy in ("uvicorn.access", "sqlalchemy.engine"):
        logging.getLogger(noisy).setLevel(max(level, logging.WARNING))


def get_logger(name: str = "medstore") -> structlog.stdlib.BoundLogger:
    return structlog.get_logger(name)


def init_sentry() -> bool:
    """Initialise Sentry if a DSN is configured. Returns True if enabled."""
    dsn = os.getenv("SENTRY_DSN", "").strip()
    if not dsn:
        return False
    try:
        import sentry_sdk
        from sentry_sdk.integrations.fastapi import FastApiIntegration
        from sentry_sdk.integrations.starlette import StarletteIntegration
    except ImportError:  # pragma: no cover - optional dependency
        get_logger().warning("sentry_sdk not installed; skipping Sentry init")
        return False

    sentry_sdk.init(
        dsn=dsn,
        environment=os.getenv("ENVIRONMENT", "development"),
        traces_sample_rate=float(os.getenv("SENTRY_TRACES_SAMPLE_RATE", "0.1")),
        integrations=[StarletteIntegration(), FastApiIntegration()],
        release=os.getenv("APP_VERSION"),
    )
    return True

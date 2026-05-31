"""Application configuration via Pydantic settings (.env driven)."""

from __future__ import annotations

from functools import lru_cache

from pydantic import field_validator
from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    """Strongly-typed application settings loaded from environment / .env."""

    model_config = SettingsConfigDict(
        env_file=".env",
        env_file_encoding="utf-8",
        case_sensitive=False,
        extra="ignore",
    )

    # ---- Application ----
    app_name: str = "MedStore"
    environment: str = "development"
    debug: bool = True
    api_v1_prefix: str = "/api/v1"

    # ---- Database ----
    database_url: str = (
        "postgresql+asyncpg://medstore:medstore@localhost:5432/medstore"
    )

    # ---- JWT / Auth ----
    jwt_secret: str = "CHANGE_ME"
    jwt_algorithm: str = "HS256"
    access_token_expire_minutes: int = 60

    # ---- CORS ----
    cors_origins: list[str] = ["http://localhost:3000"]
    # Optional regex (e.g. r"https://.*\.vercel\.app") to allow preview deploys.
    cors_origin_regex: str | None = None

    # ---- Seed admin ----
    first_admin_email: str = "admin@medstore.test"
    first_admin_password: str = "admin123"
    first_admin_name: str = "MedStore Admin"

    @field_validator("cors_origins", mode="before")
    @classmethod
    def _split_cors(cls, value: object) -> object:
        """Allow CORS_ORIGINS to be a comma-separated string in .env."""
        if isinstance(value, str):
            return [origin.strip() for origin in value.split(",") if origin.strip()]
        return value

    @field_validator("database_url", mode="before")
    @classmethod
    def _normalize_database_url(cls, value: object) -> object:
        """Normalise managed-Postgres URLs to the async (+asyncpg) driver.

        Hosts like Fly.io / Render / Railway / Heroku inject a DATABASE_URL of
        the form ``postgres://...`` or ``postgresql://...``. SQLAlchemy's async
        engine needs the ``postgresql+asyncpg://`` scheme, so we rewrite it here
        once at load time. SQLite URLs (used in tests) are left untouched.
        """
        if not isinstance(value, str) or not value:
            return value
        if value.startswith("sqlite"):
            return value
        if value.startswith("postgres://"):
            value = "postgresql://" + value[len("postgres://") :]
        if value.startswith("postgresql://"):
            value = "postgresql+asyncpg://" + value[len("postgresql://") :]
        return value

    @property
    def sync_database_url(self) -> str:
        """Synchronous URL (used by Alembic / WeasyPrint-free contexts)."""
        if self.database_url.startswith("sqlite"):
            return self.database_url
        return self.database_url.replace("+asyncpg", "+psycopg2").replace(
            "postgresql+asyncpg", "postgresql+psycopg2"
        )


@lru_cache
def get_settings() -> Settings:
    """Cached settings accessor (single instance per process)."""
    return Settings()


settings = get_settings()

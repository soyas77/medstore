"""Application configuration via Pydantic settings (.env driven)."""

from __future__ import annotations

from functools import lru_cache

from pydantic import AliasChoices, Field, field_validator
from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    """Strongly-typed application settings loaded from environment / .env."""

    model_config = SettingsConfigDict(
        env_file=".env",
        env_file_encoding="utf-8",
        case_sensitive=False,
        extra="ignore",
    )

    app_name: str = "MedStore"
    environment: str = "development"
    debug: bool = True
    api_v1_prefix: str = "/api/v1"

    database_url: str = (
        "postgresql+asyncpg://medstore:medstore@localhost:5432/medstore"
    )

    jwt_secret: str = "CHANGE_ME"
    jwt_algorithm: str = "HS256"
    access_token_expire_minutes: int = 60

    cors_origins_raw: str = Field(
        default="http://localhost:3000",
        validation_alias=AliasChoices("CORS_ORIGINS", "cors_origins_raw"),
    )
    cors_origin_regex: str | None = None

    first_admin_email: str = "admin@medstore.test"
    first_admin_password: str = "admin123"
    first_admin_name: str = "MedStore Admin"

    @property
    def cors_origins(self) -> list[str]:
        raw = (self.cors_origins_raw or "").strip()
        if raw == "*":
            return ["*"]
        return [o.strip() for o in raw.split(",") if o.strip()]

    @field_validator("database_url", mode="before")
    @classmethod
    def _normalize_database_url(cls, value: object) -> object:
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
        if self.database_url.startswith("sqlite"):
            return self.database_url
        return self.database_url.replace("+asyncpg", "+psycopg2").replace(
            "postgresql+asyncpg", "postgresql+psycopg2"
        )


@lru_cache
def get_settings() -> Settings:
    return Settings()


settings = get_settings()
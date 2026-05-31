"""User model (integrates with fastapi-users)."""

from __future__ import annotations

import enum
import uuid
from datetime import datetime

from fastapi_users.db import SQLAlchemyBaseUserTableUUID
from sqlalchemy import DateTime, Enum, String, func
from sqlalchemy.orm import Mapped, mapped_column

from app.core.database import Base


class UserRole(str, enum.Enum):
    """Application roles."""

    admin = "admin"
    cashier = "cashier"


class User(SQLAlchemyBaseUserTableUUID, Base):
    """Application user.

    ``SQLAlchemyBaseUserTableUUID`` provides:
    ``id (UUID PK)``, ``email (unique)``, ``hashed_password``,
    ``is_active``, ``is_superuser``, ``is_verified``.
    We add ``full_name``, ``role`` and ``created_at``.
    """

    __tablename__ = "users"

    full_name: Mapped[str] = mapped_column(String(255), nullable=False)
    role: Mapped[UserRole] = mapped_column(
        Enum(UserRole, name="user_role"),
        nullable=False,
        default=UserRole.cashier,
        server_default=UserRole.cashier.value,
    )
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        nullable=False,
        server_default=func.now(),
    )

    def __repr__(self) -> str:  # pragma: no cover - debug helper
        return f"<User {self.email} ({self.role})>"


# Re-export UUID for convenience in type hints elsewhere.
UUID = uuid.UUID

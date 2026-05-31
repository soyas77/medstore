"""User schemas (fastapi-users compatible)."""

from __future__ import annotations

import uuid
from datetime import datetime

from fastapi_users import schemas
from pydantic import BaseModel, ConfigDict, EmailStr, Field

from app.models.user import UserRole


class UserRead(schemas.BaseUser[uuid.UUID]):
    """Public user representation returned by the API."""

    full_name: str
    role: UserRole
    created_at: datetime


class UserCreate(schemas.BaseUserCreate):
    """Payload to register a user."""

    full_name: str = Field(..., min_length=1, max_length=255)
    role: UserRole = UserRole.cashier


class UserUpdate(schemas.BaseUserUpdate):
    """Payload to update a user."""

    full_name: str | None = Field(default=None, max_length=255)
    role: UserRole | None = None


class InviteUserRequest(BaseModel):
    """Admin-driven invite (server generates a temp password)."""

    model_config = ConfigDict(from_attributes=True)

    email: EmailStr
    full_name: str = Field(..., min_length=1, max_length=255)
    role: UserRole = UserRole.cashier

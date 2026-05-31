"""Auth & user-management routes.

Endpoints (5):
  POST   /auth/login        - obtain a JWT (fastapi-users)
  POST   /auth/logout       - revoke the bearer token (fastapi-users)
  GET    /auth/me           - current authenticated user
  GET    /users             - list users (admin)
  POST   /users             - invite/create a user (admin)
"""

from __future__ import annotations

import secrets

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.database import get_async_session
from app.core.security import (
    auth_backend,
    fastapi_users,
    get_current_admin,
    get_current_user,
    get_user_manager,
)
from app.models.user import User
from app.schemas.user import InviteUserRequest, UserCreate, UserRead

router = APIRouter()

# ---- Login / logout (provided by fastapi-users) ----
# Exposes POST /auth/login and POST /auth/logout.
router.include_router(fastapi_users.get_auth_router(auth_backend), prefix="/auth")


@router.get(
    "/auth/me",
    response_model=UserRead,
    tags=["auth"],
    summary="Get the current authenticated user",
)
async def read_current_user(user: User = Depends(get_current_user)) -> User:
    """Return the profile of the currently authenticated user."""
    return user


@router.get(
    "/users",
    response_model=list[UserRead],
    tags=["users"],
    summary="List all users (admin only)",
)
async def list_users(
    _admin: User = Depends(get_current_admin),
    session: AsyncSession = Depends(get_async_session),
) -> list[User]:
    """List all users. Requires the ``admin`` role."""
    rows = (
        await session.execute(select(User).order_by(User.created_at))
    ).scalars().all()
    return list(rows)


@router.post(
    "/users",
    response_model=UserRead,
    status_code=status.HTTP_201_CREATED,
    tags=["users"],
    summary="Invite / create a user (admin only)",
)
async def invite_user(
    payload: InviteUserRequest,
    _admin: User = Depends(get_current_admin),
    user_manager=Depends(get_user_manager),
) -> User:
    """Create a user with a generated temporary password.

    In production this would email an invite link; here we generate a random
    password so the account is immediately usable by an admin-set credential.
    """
    from fastapi_users.exceptions import UserAlreadyExists

    temp_password = secrets.token_urlsafe(12)
    try:
        user = await user_manager.create(
            UserCreate(
                email=payload.email,
                password=temp_password,
                full_name=payload.full_name,
                role=payload.role,
            )
        )
    except UserAlreadyExists as exc:  # pragma: no cover - simple mapping
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="A user with this email already exists",
        ) from exc
    return user

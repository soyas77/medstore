"""initial schema + seed admin and invoice counters

Revision ID: 0001_initial
Revises:
Create Date: 2026-01-01 00:00:00

"""

from __future__ import annotations

import uuid
from datetime import datetime, timezone
from typing import Sequence, Union

import sqlalchemy as sa
from alembic import op
from passlib.context import CryptContext
from sqlalchemy.dialects import postgresql

from app.core.config import settings

# revision identifiers, used by Alembic.
revision: str = "0001_initial"
down_revision: Union[str, None] = None
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None

_pwd = CryptContext(schemes=["bcrypt"], deprecated="auto")


def upgrade() -> None:
    bind = op.get_bind()

    user_role = postgresql.ENUM("admin", "cashier", name="user_role")
    invoice_type = postgresql.ENUM("sale", "restock", name="invoice_type")
    user_role.create(bind, checkfirst=True)
    invoice_type.create(bind, checkfirst=True)

    # ---- users ----
    op.create_table(
        "users",
        sa.Column("id", postgresql.UUID(as_uuid=True), primary_key=True),
        sa.Column("email", sa.String(length=320), nullable=False),
        sa.Column("hashed_password", sa.String(length=1024), nullable=False),
        sa.Column("is_active", sa.Boolean(), nullable=False, server_default=sa.true()),
        sa.Column(
            "is_superuser", sa.Boolean(), nullable=False, server_default=sa.false()
        ),
        sa.Column(
            "is_verified", sa.Boolean(), nullable=False, server_default=sa.false()
        ),
        sa.Column("full_name", sa.String(length=255), nullable=False),
        sa.Column(
            "role",
            postgresql.ENUM(
                "admin", "cashier", name="user_role", create_type=False
            ),
            nullable=False,
            server_default="cashier",
        ),
        sa.Column(
            "created_at",
            sa.DateTime(timezone=True),
            nullable=False,
            server_default=sa.func.now(),
        ),
    )
    op.create_index("ix_users_email", "users", ["email"], unique=True)

    # ---- medicines ----
    op.create_table(
        "medicines",
        sa.Column("id", sa.String(length=20), primary_key=True),
        sa.Column("name", sa.String(length=255), nullable=False),
        sa.Column("manufacturer", sa.String(length=255), nullable=False),
        sa.Column("price_per_strip", sa.Numeric(10, 2), nullable=False),
        sa.Column(
            "strips_per_box", sa.Integer(), nullable=False, server_default="1"
        ),
        sa.Column(
            "stock_strips", sa.Integer(), nullable=False, server_default="0"
        ),
        sa.Column(
            "low_stock_threshold",
            sa.Integer(),
            nullable=False,
            server_default="10",
        ),
        sa.Column(
            "is_deleted", sa.Boolean(), nullable=False, server_default=sa.false()
        ),
        sa.Column(
            "created_at",
            sa.DateTime(timezone=True),
            nullable=False,
            server_default=sa.func.now(),
        ),
        sa.Column(
            "updated_at",
            sa.DateTime(timezone=True),
            nullable=False,
            server_default=sa.func.now(),
        ),
    )
    op.create_index("ix_medicines_name", "medicines", ["name"])

    # ---- invoice_counters ----
    op.create_table(
        "invoice_counters",
        sa.Column(
            "type",
            postgresql.ENUM(
                "sale", "restock", name="invoice_type", create_type=False
            ),
            primary_key=True,
        ),
        sa.Column(
            "last_value", sa.Integer(), nullable=False, server_default="0"
        ),
    )

    # ---- invoices ----
    op.create_table(
        "invoices",
        sa.Column("id", postgresql.UUID(as_uuid=True), primary_key=True),
        sa.Column("invoice_number", sa.String(length=32), nullable=False),
        sa.Column(
            "type",
            postgresql.ENUM(
                "sale", "restock", name="invoice_type", create_type=False
            ),
            nullable=False,
        ),
        sa.Column(
            "user_id",
            postgresql.UUID(as_uuid=True),
            sa.ForeignKey("users.id", ondelete="RESTRICT"),
            nullable=False,
        ),
        sa.Column("customer_name", sa.String(length=255), nullable=True),
        sa.Column("supplier_name", sa.String(length=255), nullable=True),
        sa.Column("subtotal", sa.Numeric(12, 2), nullable=False),
        sa.Column(
            "discount_total", sa.Numeric(12, 2), nullable=False, server_default="0"
        ),
        sa.Column("grand_total", sa.Numeric(12, 2), nullable=False),
        sa.Column(
            "created_at",
            sa.DateTime(timezone=True),
            nullable=False,
            server_default=sa.func.now(),
        ),
    )
    op.create_index(
        "ix_invoices_invoice_number", "invoices", ["invoice_number"], unique=True
    )
    op.create_index("ix_invoices_user_id", "invoices", ["user_id"])

    # ---- invoice_items ----
    op.create_table(
        "invoice_items",
        sa.Column("id", postgresql.UUID(as_uuid=True), primary_key=True),
        sa.Column(
            "invoice_id",
            postgresql.UUID(as_uuid=True),
            sa.ForeignKey("invoices.id", ondelete="CASCADE"),
            nullable=False,
        ),
        sa.Column(
            "medicine_id",
            sa.String(length=20),
            sa.ForeignKey("medicines.id", ondelete="RESTRICT"),
            nullable=False,
        ),
        sa.Column("medicine_name", sa.String(length=255), nullable=False),
        sa.Column("manufacturer", sa.String(length=255), nullable=False),
        sa.Column("quantity_strips", sa.Integer(), nullable=False),
        sa.Column("unit_price", sa.Numeric(10, 2), nullable=False),
        sa.Column(
            "discount_pct", sa.Numeric(5, 2), nullable=False, server_default="0"
        ),
        sa.Column("line_total", sa.Numeric(12, 2), nullable=False),
    )
    op.create_index(
        "ix_invoice_items_invoice_id", "invoice_items", ["invoice_id"]
    )

    # ---- seed invoice counters ----
    op.bulk_insert(
        sa.table(
            "invoice_counters",
            sa.column("type", sa.String()),
            sa.column("last_value", sa.Integer()),
        ),
        [{"type": "sale", "last_value": 0}, {"type": "restock", "last_value": 0}],
    )

    # ---- seed admin user ----
    op.bulk_insert(
        sa.table(
            "users",
            sa.column("id", postgresql.UUID(as_uuid=True)),
            sa.column("email", sa.String()),
            sa.column("hashed_password", sa.String()),
            sa.column("is_active", sa.Boolean()),
            sa.column("is_superuser", sa.Boolean()),
            sa.column("is_verified", sa.Boolean()),
            sa.column("full_name", sa.String()),
            sa.column("role", sa.String()),
            sa.column("created_at", sa.DateTime(timezone=True)),
        ),
        [
            {
                "id": uuid.uuid4(),
                "email": settings.first_admin_email,
                "hashed_password": _pwd.hash(settings.first_admin_password),
                "is_active": True,
                "is_superuser": True,
                "is_verified": True,
                "full_name": settings.first_admin_name,
                "role": "admin",
                "created_at": datetime.now(timezone.utc),
            }
        ],
    )


def downgrade() -> None:
    op.drop_table("invoice_items")
    op.drop_table("invoices")
    op.drop_table("invoice_counters")
    op.drop_table("medicines")
    op.drop_table("users")
    bind = op.get_bind()
    postgresql.ENUM(name="invoice_type").drop(bind, checkfirst=True)
    postgresql.ENUM(name="user_role").drop(bind, checkfirst=True)

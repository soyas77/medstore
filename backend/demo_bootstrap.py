"""Create tables on a local sqlite DB and seed an admin + medicines for a live demo."""
import asyncio, os, uuid
from decimal import Decimal
os.environ.setdefault('DATABASE_URL','sqlite+aiosqlite:///./demo.db')
os.environ.setdefault('JWT_SECRET','demo-secret')

from app.core.database import Base, engine, async_session_maker
from app.models.user import User, UserRole
from app.models.medicine import Medicine
from app.models.invoice import InvoiceCounter, InvoiceType
from fastapi_users.password import PasswordHelper

async def main():
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.drop_all)
        await conn.run_sync(Base.metadata.create_all)
    ph = PasswordHelper()
    async with async_session_maker() as s:
        s.add(User(id=uuid.uuid4(), email="admin@example.com",
                   hashed_password=ph.hash("admin123"),
                   is_active=True, is_superuser=True, is_verified=True,
                   full_name="Asha Admin", role=UserRole.admin))
        s.add_all([
            Medicine(id="MED-0001", name="Paracetamol 500mg", manufacturer="Cipla",
                     price_per_strip=Decimal("100.00"), strips_per_box=10,
                     stock_strips=50, low_stock_threshold=10),
            Medicine(id="MED-0002", name="Amoxicillin 250mg", manufacturer="Sun Pharma",
                     price_per_strip=Decimal("200.00"), strips_per_box=10,
                     stock_strips=3, low_stock_threshold=10),
        ])
        s.add_all([InvoiceCounter(type=InvoiceType.sale, last_value=0),
                   InvoiceCounter(type=InvoiceType.restock, last_value=0)])
        await s.commit()
    print("seeded demo.db")

asyncio.run(main())

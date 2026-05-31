"""Medicine (inventory) routes.

Endpoints (6):
  GET    /medicines              - paginated list with search
  POST   /medicines              - create (admin)
  GET    /medicines/low-stock    - low-stock medicines
  GET    /medicines/{id}         - retrieve one
  PATCH  /medicines/{id}         - update (admin)
  DELETE /medicines/{id}         - soft delete (admin)
"""

from __future__ import annotations

from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy import func, or_, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.database import get_async_session, transaction
from app.core.security import get_current_admin, get_current_user
from app.models.medicine import Medicine
from app.models.user import User
from app.schemas.medicine import (
    MedicineCreate,
    MedicineRead,
    MedicineUpdate,
    PaginatedMedicines,
)

router = APIRouter(prefix="/medicines", tags=["medicines"])


async def _next_medicine_id(session: AsyncSession) -> str:
    """Generate the next ``MED-####`` id."""
    count = (
        await session.execute(select(func.count(Medicine.id)))
    ).scalar_one()
    return f"MED-{count + 1:04d}"


@router.get("", response_model=PaginatedMedicines, summary="List medicines")
async def list_medicines(
    search: str | None = Query(default=None, description="Name/manufacturer/id"),
    page: int = Query(default=1, ge=1),
    page_size: int = Query(default=10, ge=1, le=100),
    sort_by: str = Query(default="id"),
    sort_dir: str = Query(default="asc", pattern="^(asc|desc)$"),
    _user: User = Depends(get_current_user),
    session: AsyncSession = Depends(get_async_session),
) -> PaginatedMedicines:
    """Return a paginated, searchable, sortable list of (non-deleted) medicines."""
    stmt = select(Medicine).where(Medicine.is_deleted.is_(False))
    if search:
        like = f"%{search}%"
        stmt = stmt.where(
            or_(
                Medicine.name.ilike(like),
                Medicine.manufacturer.ilike(like),
                Medicine.id.ilike(like),
            )
        )

    total = (
        await session.execute(select(func.count()).select_from(stmt.subquery()))
    ).scalar_one()

    sort_col = getattr(Medicine, sort_by, Medicine.id)
    stmt = stmt.order_by(
        sort_col.desc() if sort_dir == "desc" else sort_col.asc()
    )
    rows = (
        await session.execute(
            stmt.offset((page - 1) * page_size).limit(page_size)
        )
    ).scalars().all()

    return PaginatedMedicines(
        items=[MedicineRead.model_validate(m) for m in rows],
        total=int(total),
        page=page,
        page_size=page_size,
    )


@router.get(
    "/low-stock",
    response_model=list[MedicineRead],
    summary="List low-stock medicines",
)
async def low_stock(
    _user: User = Depends(get_current_user),
    session: AsyncSession = Depends(get_async_session),
) -> list[MedicineRead]:
    """Medicines whose stock is at or below their threshold."""
    rows = (
        await session.execute(
            select(Medicine)
            .where(
                Medicine.is_deleted.is_(False),
                Medicine.stock_strips <= Medicine.low_stock_threshold,
            )
            .order_by(Medicine.stock_strips.asc())
        )
    ).scalars().all()
    return [MedicineRead.model_validate(m) for m in rows]


@router.post(
    "",
    response_model=MedicineRead,
    status_code=status.HTTP_201_CREATED,
    summary="Create a medicine (admin only)",
)
async def create_medicine(
    payload: MedicineCreate,
    _admin: User = Depends(get_current_admin),
    session: AsyncSession = Depends(get_async_session),
) -> MedicineRead:
    """Create a new inventory item. Generates an id if one is not supplied."""
    async with transaction(session):
        med_id = payload.id or await _next_medicine_id(session)
        exists = await session.get(Medicine, med_id)
        if exists is not None:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Medicine id '{med_id}' already exists",
            )
        medicine = Medicine(
            id=med_id,
            name=payload.name,
            manufacturer=payload.manufacturer,
            price_per_strip=payload.price_per_strip,
            strips_per_box=payload.strips_per_box,
            stock_strips=payload.stock_strips,
            low_stock_threshold=payload.low_stock_threshold,
        )
        session.add(medicine)
    refreshed = await session.get(Medicine, med_id)
    return MedicineRead.model_validate(refreshed)


@router.get("/{medicine_id}", response_model=MedicineRead, summary="Get a medicine")
async def get_medicine(
    medicine_id: str,
    _user: User = Depends(get_current_user),
    session: AsyncSession = Depends(get_async_session),
) -> MedicineRead:
    """Retrieve a single medicine by id."""
    medicine = await session.get(Medicine, medicine_id)
    if medicine is None or medicine.is_deleted:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND, detail="Medicine not found"
        )
    return MedicineRead.model_validate(medicine)


@router.patch(
    "/{medicine_id}",
    response_model=MedicineRead,
    summary="Update a medicine (admin only)",
)
async def update_medicine(
    medicine_id: str,
    payload: MedicineUpdate,
    _admin: User = Depends(get_current_admin),
    session: AsyncSession = Depends(get_async_session),
) -> MedicineRead:
    """Partially update a medicine."""
    async with transaction(session):
        medicine = await session.get(Medicine, medicine_id, with_for_update=True)
        if medicine is None or medicine.is_deleted:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND, detail="Medicine not found"
            )
        for field, value in payload.model_dump(exclude_unset=True).items():
            setattr(medicine, field, value)
    refreshed = await session.get(Medicine, medicine_id)
    return MedicineRead.model_validate(refreshed)


@router.delete(
    "/{medicine_id}",
    status_code=status.HTTP_204_NO_CONTENT,
    summary="Soft-delete a medicine (admin only)",
)
async def delete_medicine(
    medicine_id: str,
    _admin: User = Depends(get_current_admin),
    session: AsyncSession = Depends(get_async_session),
) -> None:
    """Soft-delete a medicine (sets ``is_deleted = true``)."""
    async with transaction(session):
        medicine = await session.get(Medicine, medicine_id, with_for_update=True)
        if medicine is None or medicine.is_deleted:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND, detail="Medicine not found"
            )
        medicine.is_deleted = True

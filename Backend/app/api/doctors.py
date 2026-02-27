"""
API Routes — Doctors
"""

from typing import List

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.database import get_db
from app.api.deps import CurrentUser, get_current_user, require_doctor
from app.models.user import Doctor
from app.schemas.doctor import DoctorListItem, DoctorProfile, DoctorUpdate

router = APIRouter(prefix="/doctors", tags=["Doctors"])


@router.get("", response_model=List[DoctorListItem])
async def list_doctors(db: AsyncSession = Depends(get_db)):
    """List all active doctors (for appointment booking)."""
    result = await db.execute(select(Doctor).where(Doctor.is_active == True).order_by(Doctor.full_name))
    doctors = result.scalars().all()
    return [DoctorListItem.model_validate(d) for d in doctors]


@router.get("/me", response_model=DoctorProfile)
async def get_my_profile(current_user: CurrentUser = Depends(require_doctor)):
    """Get current doctor's profile."""
    return DoctorProfile.model_validate(current_user.entity)


@router.put("/me", response_model=DoctorProfile)
async def update_my_profile(
    body: DoctorUpdate,
    current_user: CurrentUser = Depends(require_doctor),
    db: AsyncSession = Depends(get_db),
):
    """Update current doctor's profile."""
    doctor = current_user.entity
    update_data = body.model_dump(exclude_unset=True)
    for key, value in update_data.items():
        setattr(doctor, key, value)
    db.add(doctor)
    await db.flush()
    return DoctorProfile.model_validate(doctor)


@router.get("/{doctor_id}", response_model=DoctorProfile)
async def get_doctor_by_id(
    doctor_id: str,
    db: AsyncSession = Depends(get_db),
):
    """Get a doctor's public profile."""
    result = await db.execute(select(Doctor).where(Doctor.doctor_id == doctor_id))
    doctor = result.scalar_one_or_none()
    if not doctor:
        raise HTTPException(status_code=404, detail="Doctor not found")
    return DoctorProfile.model_validate(doctor)

"""
API Routes — Patients
"""

from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.database import get_db
from app.api.deps import CurrentUser, get_current_user, require_doctor, require_patient
from app.models.user import Patient, PatientOnboarding
from app.schemas.patient import OnboardingResponse, OnboardingSubmit, PatientProfile, PatientUpdate

router = APIRouter(prefix="/patients", tags=["Patients"])


@router.get("/me", response_model=PatientProfile)
async def get_my_profile(current_user: CurrentUser = Depends(require_patient)):
    """Get current patient's profile."""
    return PatientProfile.model_validate(current_user.entity)


@router.put("/me", response_model=PatientProfile)
async def update_my_profile(
    body: PatientUpdate,
    current_user: CurrentUser = Depends(require_patient),
    db: AsyncSession = Depends(get_db),
):
    """Update current patient's profile."""
    patient = current_user.entity
    update_data = body.model_dump(exclude_unset=True)
    for key, value in update_data.items():
        setattr(patient, key, value)
    db.add(patient)
    await db.flush()
    return PatientProfile.model_validate(patient)


@router.post("/me/onboarding", response_model=OnboardingResponse, status_code=201)
async def submit_onboarding(
    body: OnboardingSubmit,
    current_user: CurrentUser = Depends(require_patient),
    db: AsyncSession = Depends(get_db),
):
    """Submit or update patient onboarding data."""
    patient_id = current_user.user_id

    # Check if already exists
    result = await db.execute(
        select(PatientOnboarding).where(PatientOnboarding.patient_id == patient_id)
    )
    existing = result.scalar_one_or_none()

    if existing:
        update_data = body.model_dump()
        for key, value in update_data.items():
            setattr(existing, key, value)
        db.add(existing)
        await db.flush()
        return OnboardingResponse.model_validate(existing)
    else:
        onboarding = PatientOnboarding(patient_id=patient_id, **body.model_dump())
        db.add(onboarding)
        await db.flush()
        return OnboardingResponse.model_validate(onboarding)


@router.get("/me/onboarding", response_model=OnboardingResponse)
async def get_my_onboarding(
    current_user: CurrentUser = Depends(require_patient),
    db: AsyncSession = Depends(get_db),
):
    """Get current patient's onboarding data."""
    result = await db.execute(
        select(PatientOnboarding).where(PatientOnboarding.patient_id == current_user.user_id)
    )
    onboarding = result.scalar_one_or_none()
    if not onboarding:
        raise HTTPException(status_code=404, detail="Onboarding not completed yet")
    return OnboardingResponse.model_validate(onboarding)


@router.get("/{patient_id}", response_model=PatientProfile)
async def get_patient_by_id(
    patient_id: UUID,
    current_user: CurrentUser = Depends(require_doctor),
    db: AsyncSession = Depends(get_db),
):
    """Doctor views a patient's profile."""
    result = await db.execute(select(Patient).where(Patient.patient_id == patient_id))
    patient = result.scalar_one_or_none()
    if not patient:
        raise HTTPException(status_code=404, detail="Patient not found")
    return PatientProfile.model_validate(patient)


@router.get("/{patient_id}/onboarding", response_model=OnboardingResponse)
async def get_patient_onboarding(
    patient_id: UUID,
    current_user: CurrentUser = Depends(require_doctor),
    db: AsyncSession = Depends(get_db),
):
    """Doctor views a patient's onboarding data."""
    result = await db.execute(
        select(PatientOnboarding).where(PatientOnboarding.patient_id == patient_id)
    )
    onboarding = result.scalar_one_or_none()
    if not onboarding:
        raise HTTPException(status_code=404, detail="Onboarding not found")
    return OnboardingResponse.model_validate(onboarding)

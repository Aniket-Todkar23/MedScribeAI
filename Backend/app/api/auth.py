"""
API Routes — Authentication
"""

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.database import get_db
from app.models.user import Doctor, Patient
from app.schemas.auth import (
    DoctorSignup,
    LoginRequest,
    PatientSignup,
    RefreshRequest,
    TokenResponse,
    UserResponse,
)
from app.api.deps import CurrentUser, get_current_user
from app.utils.security import (
    create_access_token,
    create_refresh_token,
    decode_token,
    hash_password,
    verify_password,
)

router = APIRouter(prefix="/auth", tags=["Authentication"])


def _build_user_response(entity, user_type: str) -> UserResponse:
    """Build a consistent UserResponse from a Doctor or Patient entity."""
    if user_type == "doctor":
        return UserResponse(
            id=entity.doctor_id,
            full_name=entity.full_name,
            email=entity.email,
            user_type="doctor",
            phone=entity.phone,
            specialization=entity.specialization,
            license_number=entity.license_number,
            hospital_name=entity.hospital_name,
            avatar_url=entity.avatar_url,
            is_active=entity.is_active,
        )
    else:
        return UserResponse(
            id=entity.patient_id,
            full_name=entity.full_name,
            email=entity.email,
            user_type="patient",
            phone=entity.phone,
            gender=entity.gender,
            blood_group=entity.blood_group,
            avatar_url=entity.avatar_url,
            is_active=entity.is_active,
        )


# ── Signup ────────────────────────────────────────────────────────────────────


@router.post("/signup/doctor", response_model=TokenResponse, status_code=201)
async def signup_doctor(body: DoctorSignup, db: AsyncSession = Depends(get_db)):
    """Register a new doctor account."""
    # Check email uniqueness across both tables
    exists = await db.execute(select(Doctor).where(Doctor.email == body.email))
    if exists.scalar_one_or_none():
        raise HTTPException(status_code=409, detail="Email already registered")

    exists_patient = await db.execute(select(Patient).where(Patient.email == body.email))
    if exists_patient.scalar_one_or_none():
        raise HTTPException(status_code=409, detail="Email already registered as patient")

    # Check license uniqueness
    lic = await db.execute(select(Doctor).where(Doctor.license_number == body.license_number))
    if lic.scalar_one_or_none():
        raise HTTPException(status_code=409, detail="License number already in use")

    doctor = Doctor(
        full_name=body.full_name,
        email=body.email,
        password_hash=hash_password(body.password),
        phone=body.phone,
        specialization=body.specialization,
        license_number=body.license_number,
        hospital_name=body.hospital_name,
    )
    db.add(doctor)
    await db.flush()

    access = create_access_token(doctor.doctor_id, "doctor", doctor.email)
    refresh = create_refresh_token(doctor.doctor_id, "doctor")
    user = _build_user_response(doctor, "doctor")

    return TokenResponse(access_token=access, refresh_token=refresh, user=user)


@router.post("/signup/patient", response_model=TokenResponse, status_code=201)
async def signup_patient(body: PatientSignup, db: AsyncSession = Depends(get_db)):
    """Register a new patient account."""
    exists = await db.execute(select(Patient).where(Patient.email == body.email))
    if exists.scalar_one_or_none():
        raise HTTPException(status_code=409, detail="Email already registered")

    exists_doc = await db.execute(select(Doctor).where(Doctor.email == body.email))
    if exists_doc.scalar_one_or_none():
        raise HTTPException(status_code=409, detail="Email already registered as doctor")

    patient = Patient(
        full_name=body.full_name,
        email=body.email,
        password_hash=hash_password(body.password),
        phone=body.phone,
        gender=body.gender,
        blood_group=body.blood_group,
    )
    db.add(patient)
    await db.flush()

    access = create_access_token(patient.patient_id, "patient", patient.email)
    refresh = create_refresh_token(patient.patient_id, "patient")
    user = _build_user_response(patient, "patient")

    return TokenResponse(access_token=access, refresh_token=refresh, user=user)


# ── Login ─────────────────────────────────────────────────────────────────────


@router.post("/login", response_model=TokenResponse)
async def login(body: LoginRequest, db: AsyncSession = Depends(get_db)):
    """Login with email + password. Searches doctors first, then patients."""
    # Try doctor
    result = await db.execute(select(Doctor).where(Doctor.email == body.email))
    doctor = result.scalar_one_or_none()
    if doctor and doctor.password_hash and verify_password(body.password, doctor.password_hash):
        access = create_access_token(doctor.doctor_id, "doctor", doctor.email)
        refresh = create_refresh_token(doctor.doctor_id, "doctor")
        return TokenResponse(
            access_token=access,
            refresh_token=refresh,
            user=_build_user_response(doctor, "doctor"),
        )

    # Try patient
    result = await db.execute(select(Patient).where(Patient.email == body.email))
    patient = result.scalar_one_or_none()
    if patient and patient.password_hash and verify_password(body.password, patient.password_hash):
        access = create_access_token(patient.patient_id, "patient", patient.email)
        refresh = create_refresh_token(patient.patient_id, "patient")
        return TokenResponse(
            access_token=access,
            refresh_token=refresh,
            user=_build_user_response(patient, "patient"),
        )

    raise HTTPException(status_code=401, detail="Invalid email or password")


# ── Refresh ───────────────────────────────────────────────────────────────────


@router.post("/refresh", response_model=TokenResponse)
async def refresh_token(body: RefreshRequest, db: AsyncSession = Depends(get_db)):
    """Exchange a refresh token for a new access + refresh token pair."""
    payload = decode_token(body.refresh_token)
    if payload is None or payload.get("kind") != "refresh":
        raise HTTPException(status_code=401, detail="Invalid refresh token")

    user_type = payload["type"]
    user_id = payload["sub"]

    if user_type == "doctor":
        result = await db.execute(select(Doctor).where(Doctor.doctor_id == user_id))
        entity = result.scalar_one_or_none()
        if not entity:
            raise HTTPException(status_code=401, detail="User not found")
        access = create_access_token(entity.doctor_id, "doctor", entity.email)
        refresh = create_refresh_token(entity.doctor_id, "doctor")
        user = _build_user_response(entity, "doctor")
    else:
        result = await db.execute(select(Patient).where(Patient.patient_id == user_id))
        entity = result.scalar_one_or_none()
        if not entity:
            raise HTTPException(status_code=401, detail="User not found")
        access = create_access_token(entity.patient_id, "patient", entity.email)
        refresh = create_refresh_token(entity.patient_id, "patient")
        user = _build_user_response(entity, "patient")

    return TokenResponse(access_token=access, refresh_token=refresh, user=user)


# ── Me ────────────────────────────────────────────────────────────────────────


@router.get("/me", response_model=UserResponse)
async def get_me(current_user: CurrentUser = Depends(get_current_user)):
    """Get the currently authenticated user's profile."""
    return _build_user_response(current_user.entity, current_user.user_type)

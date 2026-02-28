"""
API Routes — Appointments
"""

from datetime import datetime, timezone
from typing import List, Optional
from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy import and_, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.database import get_db
from app.api.deps import CurrentUser, get_current_user, require_doctor, require_patient
from app.models.appointment import Appointment
from app.models.user import Doctor, Patient
from app.schemas.appointment import (
    AppointmentCreate,
    AppointmentReject,
    AppointmentResponse,
    AppointmentUpdate,
    DoctorScheduleAppointment,
)

router = APIRouter(prefix="/appointments", tags=["Appointments"])


async def _enrich(appt: Appointment, db: AsyncSession) -> AppointmentResponse:
    """Add doctor/patient names to an appointment response."""
    # Ensure all ORM attributes (like defaults) are loaded before Pydantic validation
    await db.refresh(appt)
    resp = AppointmentResponse.model_validate(appt)
    doc = await db.execute(select(Doctor.full_name).where(Doctor.doctor_id == appt.doctor_id))
    resp.doctor_name = doc.scalar_one_or_none()
    pat = await db.execute(select(Patient.full_name).where(Patient.patient_id == appt.patient_id))
    resp.patient_name = pat.scalar_one_or_none()
    return resp


@router.post("", response_model=AppointmentResponse, status_code=201)
async def create_appointment(
    body: AppointmentCreate,
    current_user: CurrentUser = Depends(require_patient),
    db: AsyncSession = Depends(get_db),
):
    """Patient requests an appointment with a doctor."""
    # Validate doctor exists
    doc = await db.execute(select(Doctor).where(Doctor.doctor_id == body.doctor_id))
    if not doc.scalar_one_or_none():
        raise HTTPException(status_code=404, detail="Doctor not found")

    # Validate future date
    if body.appointment_date < datetime.now(timezone.utc):
        raise HTTPException(status_code=400, detail="Appointment date must be in the future")

    appt = Appointment(
        doctor_id=body.doctor_id,
        patient_id=current_user.user_id,
        appointment_date=body.appointment_date,
        duration_minutes=body.duration_minutes,
        appointment_type=body.appointment_type,
        status="pending",
        reason=body.reason,
        notes=body.notes,
    )
    db.add(appt)
    await db.flush()
    return await _enrich(appt, db)


@router.post("/schedule", response_model=AppointmentResponse, status_code=201)
async def doctor_schedule_appointment(
    body: DoctorScheduleAppointment,
    current_user: CurrentUser = Depends(require_doctor),
    db: AsyncSession = Depends(get_db),
):
    """Doctor schedules an appointment/meeting with a patient.
    The patient must then approve or reject it."""
    # Validate patient exists
    pat = await db.execute(select(Patient).where(Patient.patient_id == body.patient_id))
    if not pat.scalar_one_or_none():
        raise HTTPException(status_code=404, detail="Patient not found")

    # Validate future date
    if body.appointment_date < datetime.now(timezone.utc):
        raise HTTPException(status_code=400, detail="Appointment date must be in the future")

    appt = Appointment(
        doctor_id=current_user.user_id,
        patient_id=body.patient_id,
        appointment_date=body.appointment_date,
        duration_minutes=body.duration_minutes,
        appointment_type=body.appointment_type,
        status="pending",
        reason=body.reason,
        notes=body.notes,
    )
    db.add(appt)
    await db.flush()
    return await _enrich(appt, db)


@router.get("", response_model=List[AppointmentResponse])
async def list_appointments(
    status: Optional[str] = Query(None),
    current_user: CurrentUser = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """List appointments for the current user (doctor or patient)."""
    if current_user.is_doctor:
        q = select(Appointment).where(Appointment.doctor_id == current_user.user_id)
    else:
        q = select(Appointment).where(Appointment.patient_id == current_user.user_id)

    if status:
        q = q.where(Appointment.status == status)

    q = q.order_by(Appointment.appointment_date.desc())
    result = await db.execute(q)
    appointments = result.scalars().all()
    return [await _enrich(a, db) for a in appointments]


@router.get("/upcoming", response_model=List[AppointmentResponse])
async def upcoming_appointments(
    current_user: CurrentUser = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Get upcoming appointments (confirmed/scheduled, future dates)."""
    now = datetime.now(timezone.utc)
    if current_user.is_doctor:
        q = select(Appointment).where(
            and_(
                Appointment.doctor_id == current_user.user_id,
                Appointment.appointment_date >= now,
                Appointment.status.in_(["pending", "scheduled", "confirmed"]),
            )
        )
    else:
        q = select(Appointment).where(
            and_(
                Appointment.patient_id == current_user.user_id,
                Appointment.appointment_date >= now,
                Appointment.status.in_(["pending", "scheduled", "confirmed"]),
            )
        )

    q = q.order_by(Appointment.appointment_date.asc())
    result = await db.execute(q)
    return [await _enrich(a, db) for a in result.scalars().all()]


@router.get("/{appointment_id}", response_model=AppointmentResponse)
async def get_appointment(
    appointment_id: UUID,
    current_user: CurrentUser = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Get a single appointment by ID."""
    result = await db.execute(select(Appointment).where(Appointment.appointment_id == appointment_id))
    appt = result.scalar_one_or_none()
    if not appt:
        raise HTTPException(status_code=404, detail="Appointment not found")

    # Access check
    if current_user.is_doctor and appt.doctor_id != current_user.user_id:
        raise HTTPException(status_code=403, detail="Not your appointment")
    if current_user.is_patient and appt.patient_id != current_user.user_id:
        raise HTTPException(status_code=403, detail="Not your appointment")

    return await _enrich(appt, db)


@router.post("/{appointment_id}/approve", response_model=AppointmentResponse)
async def approve_appointment(
    appointment_id: UUID,
    current_user: CurrentUser = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Doctor or patient approves a pending appointment."""
    result = await db.execute(select(Appointment).where(Appointment.appointment_id == appointment_id))
    appt = result.scalar_one_or_none()
    if not appt:
        raise HTTPException(status_code=404, detail="Appointment not found")

    # Access check — must be the doctor or patient on this appointment
    if current_user.is_doctor and appt.doctor_id != current_user.user_id:
        raise HTTPException(status_code=403, detail="Not your appointment")
    if current_user.is_patient and appt.patient_id != current_user.user_id:
        raise HTTPException(status_code=403, detail="Not your appointment")

    if appt.status != "pending":
        raise HTTPException(status_code=400, detail=f"Cannot approve appointment with status '{appt.status}'")

    appt.status = "confirmed"

    # Generate LiveKit room for telehealth appointments
    if appt.appointment_type == "telehealth":
        appt.meeting_room_id = f"meet-{appointment_id}"

    db.add(appt)
    await db.flush()
    return await _enrich(appt, db)


@router.post("/{appointment_id}/reject", response_model=AppointmentResponse)
async def reject_appointment(
    appointment_id: UUID,
    body: AppointmentReject,
    current_user: CurrentUser = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Doctor or patient rejects a pending appointment."""
    result = await db.execute(select(Appointment).where(Appointment.appointment_id == appointment_id))
    appt = result.scalar_one_or_none()
    if not appt:
        raise HTTPException(status_code=404, detail="Appointment not found")

    # Access check — must be the doctor or patient on this appointment
    if current_user.is_doctor and appt.doctor_id != current_user.user_id:
        raise HTTPException(status_code=403, detail="Not your appointment")
    if current_user.is_patient and appt.patient_id != current_user.user_id:
        raise HTTPException(status_code=403, detail="Not your appointment")

    if appt.status != "pending":
        raise HTTPException(status_code=400, detail=f"Cannot reject appointment with status '{appt.status}'")

    appt.status = "cancelled"
    appt.cancelled_reason = body.reason
    db.add(appt)
    await db.flush()
    return await _enrich(appt, db)


@router.put("/{appointment_id}", response_model=AppointmentResponse)
async def update_appointment(
    appointment_id: UUID,
    body: AppointmentUpdate,
    current_user: CurrentUser = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Update appointment details."""
    result = await db.execute(select(Appointment).where(Appointment.appointment_id == appointment_id))
    appt = result.scalar_one_or_none()
    if not appt:
        raise HTTPException(status_code=404, detail="Appointment not found")

    # Access control
    if current_user.is_doctor and appt.doctor_id != current_user.user_id:
        raise HTTPException(status_code=403, detail="Not your appointment")
    if current_user.is_patient and appt.patient_id != current_user.user_id:
        raise HTTPException(status_code=403, detail="Not your appointment")

    update_data = body.model_dump(exclude_unset=True)
    for key, value in update_data.items():
        setattr(appt, key, value)

    db.add(appt)
    await db.flush()
    return await _enrich(appt, db)


@router.delete("/{appointment_id}", response_model=AppointmentResponse)
async def cancel_appointment(
    appointment_id: UUID,
    current_user: CurrentUser = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Cancel an appointment (by doctor or patient)."""
    result = await db.execute(select(Appointment).where(Appointment.appointment_id == appointment_id))
    appt = result.scalar_one_or_none()
    if not appt:
        raise HTTPException(status_code=404, detail="Appointment not found")

    if current_user.is_doctor and appt.doctor_id != current_user.user_id:
        raise HTTPException(status_code=403, detail="Not your appointment")
    if current_user.is_patient and appt.patient_id != current_user.user_id:
        raise HTTPException(status_code=403, detail="Not your appointment")

    if appt.status in ("completed", "cancelled"):
        raise HTTPException(status_code=400, detail=f"Cannot cancel appointment with status '{appt.status}'")

    appt.status = "cancelled"
    appt.cancelled_reason = f"Cancelled by {current_user.user_type}"
    db.add(appt)
    await db.flush()
    return await _enrich(appt, db)

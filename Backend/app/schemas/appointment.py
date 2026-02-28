"""
Pydantic Schemas — Appointment
"""

from datetime import datetime
from typing import Optional
from uuid import UUID

from pydantic import BaseModel, Field


class AppointmentCreate(BaseModel):
    doctor_id: UUID
    appointment_date: datetime
    duration_minutes: int = Field(30, ge=15, le=120)
    appointment_type: str = "in_person"
    # in_person, telehealth, follow_up, emergency, routine_checkup
    reason: Optional[str] = None
    notes: Optional[str] = None


class DoctorScheduleAppointment(BaseModel):
    """Doctor schedules a meeting with a patient."""
    patient_id: UUID
    appointment_date: datetime
    duration_minutes: int = Field(30, ge=15, le=120)
    appointment_type: str = "telehealth"
    reason: Optional[str] = None
    notes: Optional[str] = None


class AppointmentUpdate(BaseModel):
    appointment_date: Optional[datetime] = None
    duration_minutes: Optional[int] = Field(None, ge=15, le=120)
    appointment_type: Optional[str] = None
    reason: Optional[str] = None
    notes: Optional[str] = None


class AppointmentReject(BaseModel):
    reason: str = Field(..., min_length=1)


class AppointmentResponse(BaseModel):
    appointment_id: UUID
    doctor_id: UUID
    patient_id: UUID
    appointment_date: datetime
    duration_minutes: int
    appointment_type: str
    status: str
    reason: Optional[str] = None
    notes: Optional[str] = None
    cancelled_reason: Optional[str] = None
    consultation_id: Optional[UUID] = None
    meeting_room_id: Optional[str] = None
    reminder_sent: bool = False
    created_at: Optional[datetime] = None
    updated_at: Optional[datetime] = None

    # Joined data
    doctor_name: Optional[str] = None
    patient_name: Optional[str] = None

    model_config = {"from_attributes": True}

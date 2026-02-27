"""
ORM Models — Appointment
"""

import uuid

from sqlalchemy import (
    Boolean, Column, DateTime, ForeignKey, Integer, String, Text, func,
)
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import relationship

from app.database import Base


class Appointment(Base):
    __tablename__ = "appointments"

    appointment_id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    doctor_id = Column(UUID(as_uuid=True), ForeignKey("doctors.doctor_id"), nullable=False, index=True)
    patient_id = Column(UUID(as_uuid=True), ForeignKey("patients.patient_id"), nullable=False, index=True)

    appointment_date = Column(DateTime(timezone=True), nullable=False, index=True)
    duration_minutes = Column(Integer, default=30)

    appointment_type = Column(
        String(50), default="in_person",
        # in_person, telehealth, follow_up, emergency, routine_checkup
    )
    status = Column(
        String(20), default="pending", index=True,
        # pending, scheduled, confirmed, in_progress, completed, cancelled, no_show
    )

    reason = Column(Text, nullable=True)
    notes = Column(Text, nullable=True)
    cancelled_reason = Column(Text, nullable=True)

    # Consultation link
    consultation_id = Column(UUID(as_uuid=True), nullable=True)

    # LiveKit meeting
    meeting_room_id = Column(String(255), nullable=True)

    # Reminders
    reminder_sent = Column(Boolean, default=False)
    reminder_sent_at = Column(DateTime(timezone=True), nullable=True)

    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now())

    # Relationships
    doctor = relationship("Doctor", back_populates="appointments", foreign_keys=[doctor_id])
    patient = relationship("Patient", back_populates="appointments", foreign_keys=[patient_id])

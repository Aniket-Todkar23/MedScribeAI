"""
ORM Models — Consultation
"""

import uuid

from sqlalchemy import Column, DateTime, ForeignKey, String, Text, func
from sqlalchemy.dialects.postgresql import JSONB, UUID
from sqlalchemy.orm import relationship

from app.database import Base


class Consultation(Base):
    __tablename__ = "consultations"

    consultation_id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    doctor_id = Column(UUID(as_uuid=True), ForeignKey("doctors.doctor_id"), nullable=False, index=True)
    patient_id = Column(UUID(as_uuid=True), ForeignKey("patients.patient_id"), nullable=False, index=True)
    appointment_id = Column(UUID(as_uuid=True), ForeignKey("appointments.appointment_id"), nullable=True, index=True)

    # Raw dialogue transcription (speaker-tagged)
    transcription = Column(Text, nullable=True)

    # AI-generated SOAP Note
    soap_note = Column(JSONB, default=dict)
    # {"subjective": "...", "objective": "...", "assessment": "...", "plan": "..."}

    # ICD Codes
    icd_codes = Column(JSONB, default=list)
    # [{"code": "I20.9", "description": "Angina pectoris, unspecified"}]

    # Prescription
    prescription = Column(JSONB, default=list)
    # [{"drug": "Aspirin", "dose": "75mg", "frequency": "Once daily", "duration": "30 days"}]

    # Patient-friendly summary
    patient_summary = Column(Text, nullable=True)

    # Full EMR record (complete AI-generated structured data)
    emr_data = Column(JSONB, default=dict)

    status = Column(String(20), default="draft", index=True)
    # draft, confirmed, reviewed

    consultation_date = Column(DateTime(timezone=True), server_default=func.now())
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now())

    # Relationships
    doctor = relationship("Doctor", back_populates="consultations", foreign_keys=[doctor_id])
    patient = relationship("Patient", back_populates="consultations", foreign_keys=[patient_id])

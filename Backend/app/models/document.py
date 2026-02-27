"""
ORM Models — Document
"""

import uuid

from sqlalchemy import Column, DateTime, ForeignKey, Integer, String, Text, func
from sqlalchemy.dialects.postgresql import JSONB, UUID
from sqlalchemy.orm import relationship

from app.database import Base


class Document(Base):
    __tablename__ = "documents"

    document_id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    consultation_id = Column(UUID(as_uuid=True), ForeignKey("consultations.consultation_id"), nullable=True, index=True)
    patient_id = Column(UUID(as_uuid=True), ForeignKey("patients.patient_id"), nullable=False, index=True)
    doctor_id = Column(UUID(as_uuid=True), ForeignKey("doctors.doctor_id"), nullable=True)

    document_name = Column(String(255), nullable=False)
    document_type = Column(String(50), nullable=True, index=True)
    # lab_report, prescription, xray, mri_scan, ecg, referral_letter, discharge_summary, insurance, other

    file_path = Column(Text, nullable=False)  # Local filesystem path
    file_size_kb = Column(Integer, nullable=True)
    mime_type = Column(String(100), nullable=True)

    uploaded_by = Column(UUID(as_uuid=True), nullable=True)
    notes = Column(Text, nullable=True)

    # AI analysis result (stored as JSON from AI backend response)
    analysis_result = Column(JSONB, default=dict)

    uploaded_at = Column(DateTime(timezone=True), server_default=func.now())

    # Relationships
    patient = relationship("Patient", back_populates="documents", foreign_keys=[patient_id])

"""
ORM Models — User entities (Doctor, Patient, PatientOnboarding)
"""

import uuid
from datetime import datetime

from sqlalchemy import (
    Boolean, Column, Date, DateTime, ForeignKey, String, Text, func,
)
from sqlalchemy.dialects.postgresql import JSONB, UUID
from sqlalchemy.orm import relationship

from app.database import Base


class Doctor(Base):
    __tablename__ = "doctors"

    doctor_id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    full_name = Column(String(150), nullable=False)
    email = Column(String(255), unique=True, nullable=False, index=True)
    password_hash = Column(String(255), nullable=True)  # nullable for future OAuth
    phone = Column(String(20), nullable=True)
    specialization = Column(String(100), nullable=True)
    license_number = Column(String(50), unique=True, nullable=False)
    hospital_name = Column(String(200), nullable=True)
    avatar_url = Column(Text, nullable=True)
    is_active = Column(Boolean, default=True)

    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now())

    # Relationships
    appointments = relationship("Appointment", back_populates="doctor", lazy="selectin")
    consultations = relationship("Consultation", back_populates="doctor", lazy="selectin")


class Patient(Base):
    __tablename__ = "patients"

    patient_id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    full_name = Column(String(150), nullable=False)
    email = Column(String(255), unique=True, nullable=False, index=True)
    password_hash = Column(String(255), nullable=True)
    phone = Column(String(20), nullable=True)
    date_of_birth = Column(Date, nullable=True)
    gender = Column(String(10), nullable=True)  # male, female, other
    blood_group = Column(String(5), nullable=True)
    address = Column(Text, nullable=True)
    emergency_contact = Column(String(20), nullable=True)
    avatar_url = Column(Text, nullable=True)
    is_active = Column(Boolean, default=True)

    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now())

    # Relationships
    onboarding = relationship("PatientOnboarding", back_populates="patient", uselist=False, lazy="selectin")
    appointments = relationship("Appointment", back_populates="patient", lazy="selectin")
    consultations = relationship("Consultation", back_populates="patient", lazy="selectin")
    documents = relationship("Document", back_populates="patient", lazy="selectin")


class PatientOnboarding(Base):
    __tablename__ = "patient_onboarding"

    onboarding_id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    patient_id = Column(UUID(as_uuid=True), ForeignKey("patients.patient_id"), nullable=False, index=True)

    # Basic information
    emergency_contact_name = Column(String(150), nullable=True)
    emergency_contact_phone = Column(String(20), nullable=True)

    # Medical conditions
    has_diabetes = Column(Boolean, default=False)
    diabetes_type = Column(String(20), nullable=True)
    on_insulin = Column(Boolean, default=False)

    has_heart_disease = Column(Boolean, default=False)
    heart_conditions = Column(JSONB, default=list)

    has_lung_disease = Column(Boolean, default=False)
    lung_conditions = Column(JSONB, default=list)
    uses_inhaler_daily = Column(Boolean, default=False)

    no_medical_conditions = Column(Boolean, default=False)

    # Medications & Lifestyle
    taking_medications = Column(Boolean, default=False)
    medications_list = Column(Text, nullable=True)
    has_allergies = Column(Boolean, default=False)
    allergies_list = Column(Text, nullable=True)
    smoking_status = Column(String(20), nullable=True)
    alcohol_use = Column(String(20), nullable=True)
    had_major_surgeries = Column(Boolean, default=False)
    surgeries_details = Column(Text, nullable=True)

    # Consent
    consent_data_storage = Column(Boolean, default=False, nullable=False)
    consent_ai_assist = Column(Boolean, default=False, nullable=False)

    completed_at = Column(DateTime(timezone=True), server_default=func.now())
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now())

    # Relationships
    patient = relationship("Patient", back_populates="onboarding", foreign_keys=[patient_id])

    __table_args__ = (
        {"comment": "Stores comprehensive medical history from patient onboarding"},
    )

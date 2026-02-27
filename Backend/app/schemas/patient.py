"""
Pydantic Schemas — Patient
"""

from datetime import date, datetime
from typing import List, Optional
from uuid import UUID

from pydantic import BaseModel, Field


class PatientProfile(BaseModel):
    patient_id: UUID
    full_name: str
    email: str
    phone: Optional[str] = None
    date_of_birth: Optional[date] = None
    gender: Optional[str] = None
    blood_group: Optional[str] = None
    address: Optional[str] = None
    emergency_contact: Optional[str] = None
    avatar_url: Optional[str] = None
    is_active: bool = True
    created_at: Optional[datetime] = None

    model_config = {"from_attributes": True}


class PatientUpdate(BaseModel):
    full_name: Optional[str] = Field(None, min_length=2, max_length=150)
    phone: Optional[str] = None
    date_of_birth: Optional[str] = None
    gender: Optional[str] = None
    blood_group: Optional[str] = None
    address: Optional[str] = None
    emergency_contact: Optional[str] = None
    avatar_url: Optional[str] = None


class OnboardingSubmit(BaseModel):
    emergency_contact_name: Optional[str] = None
    emergency_contact_phone: Optional[str] = None
    has_diabetes: bool = False
    diabetes_type: Optional[str] = None
    on_insulin: bool = False
    has_heart_disease: bool = False
    heart_conditions: List[str] = []
    has_lung_disease: bool = False
    lung_conditions: List[str] = []
    uses_inhaler_daily: bool = False
    no_medical_conditions: bool = False
    taking_medications: bool = False
    medications_list: Optional[str] = None
    has_allergies: bool = False
    allergies_list: Optional[str] = None
    smoking_status: Optional[str] = None
    alcohol_use: Optional[str] = None
    had_major_surgeries: bool = False
    surgeries_details: Optional[str] = None
    consent_data_storage: bool = False
    consent_ai_assist: bool = False


class OnboardingResponse(OnboardingSubmit):
    onboarding_id: UUID
    patient_id: UUID
    completed_at: Optional[datetime] = None

    model_config = {"from_attributes": True}

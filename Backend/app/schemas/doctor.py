"""
Pydantic Schemas — Doctor
"""

from datetime import datetime
from typing import Optional
from uuid import UUID

from pydantic import BaseModel, Field


class DoctorProfile(BaseModel):
    doctor_id: UUID
    full_name: str
    email: str
    phone: Optional[str] = None
    specialization: Optional[str] = None
    license_number: Optional[str] = None
    hospital_name: Optional[str] = None
    avatar_url: Optional[str] = None
    is_active: bool = True
    created_at: Optional[datetime] = None

    model_config = {"from_attributes": True}


class DoctorUpdate(BaseModel):
    full_name: Optional[str] = Field(None, min_length=2, max_length=150)
    phone: Optional[str] = None
    specialization: Optional[str] = None
    hospital_name: Optional[str] = None
    avatar_url: Optional[str] = None


class DoctorListItem(BaseModel):
    doctor_id: UUID
    full_name: str
    specialization: Optional[str] = None
    hospital_name: Optional[str] = None
    avatar_url: Optional[str] = None

    model_config = {"from_attributes": True}

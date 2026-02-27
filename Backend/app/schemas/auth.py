"""
Pydantic Schemas — Auth (signup, login, tokens)
"""

from typing import Optional
from uuid import UUID

from pydantic import BaseModel, EmailStr, Field


# ── Signup ────────────────────────────────────────────────────────────────────

class DoctorSignup(BaseModel):
    full_name: str = Field(..., min_length=2, max_length=150)
    email: EmailStr
    password: str = Field(..., min_length=6)
    phone: Optional[str] = None
    specialization: Optional[str] = None
    license_number: str = Field(..., min_length=1, max_length=50)
    hospital_name: Optional[str] = None


class PatientSignup(BaseModel):
    full_name: str = Field(..., min_length=2, max_length=150)
    email: EmailStr
    password: str = Field(..., min_length=6)
    phone: Optional[str] = None
    date_of_birth: Optional[str] = None  # ISO format
    gender: Optional[str] = None  # male, female, other
    blood_group: Optional[str] = None


# ── Login ─────────────────────────────────────────────────────────────────────

class LoginRequest(BaseModel):
    email: str
    password: str


# ── Token Responses ───────────────────────────────────────────────────────────

class TokenResponse(BaseModel):
    access_token: str
    refresh_token: str
    token_type: str = "bearer"
    user: "UserResponse"


class RefreshRequest(BaseModel):
    refresh_token: str


# ── User Response ─────────────────────────────────────────────────────────────

class UserResponse(BaseModel):
    id: UUID
    full_name: str
    email: str
    user_type: str  # doctor or patient
    phone: Optional[str] = None
    specialization: Optional[str] = None  # doctor only
    license_number: Optional[str] = None  # doctor only
    hospital_name: Optional[str] = None  # doctor only
    gender: Optional[str] = None  # patient only
    blood_group: Optional[str] = None  # patient only
    avatar_url: Optional[str] = None
    is_active: bool = True

    model_config = {"from_attributes": True}

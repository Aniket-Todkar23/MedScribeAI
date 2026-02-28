"""
Pydantic Schemas — Consultation
"""

from datetime import datetime
from typing import Any, Dict, List, Optional
from uuid import UUID

from pydantic import BaseModel


class ConsultationCreate(BaseModel):
    appointment_id: UUID
    patient_id: UUID


class SOAPNote(BaseModel):
    subjective: str = ""
    objective: str = ""
    assessment: str = ""
    plan: str = ""


class PrescriptionItem(BaseModel):
    drug: str
    dose: str = ""
    frequency: str = ""
    duration: str = ""
    notes: str = ""


class ICDCodeItem(BaseModel):
    code: str
    description: str
    version: int = 10


class ConsultationUpdate(BaseModel):
    transcription: Optional[str] = None
    soap_note: Optional[SOAPNote] = None
    icd_codes: Optional[List[ICDCodeItem]] = None
    prescription: Optional[List[PrescriptionItem]] = None
    patient_summary: Optional[str] = None
    extraction_data: Optional[Dict[str, Any]] = None
    emr_data: Optional[Dict[str, Any]] = None
    status: Optional[str] = None  # draft, confirmed, reviewed


class ConsultationResponse(BaseModel):
    consultation_id: UUID
    doctor_id: UUID
    patient_id: UUID
    appointment_id: Optional[UUID] = None
    transcription: Optional[str] = None
    soap_note: Dict[str, Any] = {}
    icd_codes: List[Dict[str, Any]] = []
    prescription: List[Dict[str, Any]] = []
    patient_summary: Optional[str] = None
    extraction_data: Dict[str, Any] = {}
    emr_data: Dict[str, Any] = {}
    status: str = "draft"
    consultation_date: Optional[datetime] = None
    created_at: Optional[datetime] = None
    updated_at: Optional[datetime] = None

    model_config = {"from_attributes": True}

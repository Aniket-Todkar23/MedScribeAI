"""
Pydantic Schemas — Document
"""

from datetime import datetime
from typing import Any, Dict, Optional
from uuid import UUID

from pydantic import BaseModel


class DocumentResponse(BaseModel):
    document_id: UUID
    consultation_id: Optional[UUID] = None
    patient_id: UUID
    doctor_id: Optional[UUID] = None
    document_name: str
    document_type: Optional[str] = None
    file_size_kb: Optional[int] = None
    mime_type: Optional[str] = None
    notes: Optional[str] = None
    analysis_result: Dict[str, Any] = {}
    uploaded_at: Optional[datetime] = None

    model_config = {"from_attributes": True}

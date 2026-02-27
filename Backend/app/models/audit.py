"""
ORM Models — Audit Log (HIPAA compliance — immutable)
"""

import uuid

from sqlalchemy import Boolean, Column, DateTime, String, Text, func
from sqlalchemy.dialects.postgresql import JSONB, UUID

from app.database import Base


class AuditLog(Base):
    __tablename__ = "audit_log"

    audit_id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)

    # WHO
    actor_id = Column(UUID(as_uuid=True), nullable=False, index=True)
    actor_type = Column(String(20), nullable=False)  # doctor, patient, system
    actor_name = Column(String(150), nullable=True)

    # WHAT
    action = Column(String(50), nullable=False, index=True)
    # consultation_created, document_uploaded, patient_record_accessed, etc.

    # WHAT was affected
    entity_type = Column(String(50), nullable=True)
    entity_id = Column(UUID(as_uuid=True), nullable=True, index=True)

    # DETAILS
    old_value = Column(JSONB, nullable=True)
    new_value = Column(JSONB, nullable=True)
    change_summary = Column(Text, nullable=True)

    # CONTEXT
    ip_address = Column(String(45), nullable=True)
    user_agent = Column(Text, nullable=True)
    session_id = Column(String(255), nullable=True, index=True)

    # COMPLIANCE
    data_sensitivity = Column(String(20), default="high")  # low, medium, high, critical
    is_phi_accessed = Column(Boolean, default=False, index=True)

    created_at = Column(DateTime(timezone=True), server_default=func.now(), nullable=False, index=True)

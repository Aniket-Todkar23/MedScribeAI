"""
ORM Models — Chat History (LangGraph Agent conversations)
"""

import uuid

from sqlalchemy import Column, DateTime, String, func
from sqlalchemy.dialects.postgresql import JSONB, UUID

from app.database import Base


class ChatHistory(Base):
    __tablename__ = "chat_history"

    chat_id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    user_id = Column(UUID(as_uuid=True), nullable=False, index=True)
    user_type = Column(String(20), nullable=False)  # doctor, patient
    session_id = Column(String(255), nullable=False, index=True)

    # Full message history as JSON array
    messages = Column(JSONB, default=list)
    # [{"role": "user", "content": "..."}, {"role": "assistant", "content": "..."}]

    # Context: which patient/appointment is being discussed
    context = Column(JSONB, default=dict)
    # {"patient_id": "...", "appointment_id": "...", "mode": "meeting"}

    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now())

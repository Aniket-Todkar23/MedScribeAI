"""
ORM Models — Notification Log
"""

import uuid

from sqlalchemy import Column, DateTime, String, Text, func
from sqlalchemy.dialects.postgresql import UUID

from app.database import Base


class NotificationLog(Base):
    __tablename__ = "notification_log"

    notification_id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    appointment_id = Column(UUID(as_uuid=True), nullable=True, index=True)
    consultation_id = Column(UUID(as_uuid=True), nullable=True, index=True)
    patient_id = Column(UUID(as_uuid=True), nullable=False, index=True)

    channel = Column(String(20), nullable=True)  # email, sms, whatsapp
    status = Column(String(20), default="pending", index=True)  # sent, failed, pending
    message_content = Column(Text, nullable=True)

    sent_at = Column(DateTime(timezone=True), server_default=func.now())

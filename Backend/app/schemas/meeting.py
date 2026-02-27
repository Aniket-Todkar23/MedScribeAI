"""
Pydantic Schemas — Meeting (LiveKit)
"""

from typing import Optional
from uuid import UUID

from pydantic import BaseModel


class MeetingCreateResponse(BaseModel):
    room_name: str
    appointment_id: UUID


class MeetingJoinToken(BaseModel):
    token: str
    room_name: str
    livekit_url: str
    identity: str  # user_id
    name: str  # display name
    role: str  # doctor or patient


class MeetingStatusResponse(BaseModel):
    room_name: str
    is_active: bool
    participant_count: int = 0
    is_recording: bool = False


class TranscriptionSegment(BaseModel):
    speaker: str  # "DOCTOR" or "PATIENT"
    speaker_name: str
    text: str
    start_time: Optional[float] = None
    end_time: Optional[float] = None

"""
API Routes — Meetings (LiveKit)
"""

import logging
from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.database import get_db
from app.api.deps import CurrentUser, get_current_user
from app.models.appointment import Appointment
from app.schemas.meeting import MeetingCreateResponse, MeetingJoinToken, MeetingStatusResponse
from app.services.meeting_service import create_room, generate_participant_token, get_room_status

router = APIRouter(prefix="/meetings", tags=["Meetings"])
logger = logging.getLogger(__name__)


@router.post("/{appointment_id}/create-room", response_model=MeetingCreateResponse)
async def create_meeting_room(
    appointment_id: UUID,
    current_user: CurrentUser = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Create a LiveKit room for an appointment."""
    result = await db.execute(
        select(Appointment).where(Appointment.appointment_id == appointment_id)
    )
    appt = result.scalar_one_or_none()
    if not appt:
        raise HTTPException(status_code=404, detail="Appointment not found")

    if appt.status not in ("confirmed", "in_progress"):
        raise HTTPException(status_code=400, detail="Appointment must be confirmed first")

    # Access control
    if current_user.user_id not in (appt.doctor_id, appt.patient_id):
        raise HTTPException(status_code=403, detail="Not your appointment")

    room_name = f"meet-{appointment_id}"

    try:
        await create_room(room_name)
    except Exception as e:
        logger.warning(f"LiveKit room creation failed (may already exist): {e}")

    appt.meeting_room_id = room_name
    appt.status = "in_progress"
    db.add(appt)
    await db.flush()

    return MeetingCreateResponse(room_name=room_name, appointment_id=appointment_id)


@router.get("/{appointment_id}/join-token", response_model=MeetingJoinToken)
async def get_join_token(
    appointment_id: UUID,
    current_user: CurrentUser = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Get a LiveKit participant token to join the meeting."""
    result = await db.execute(
        select(Appointment).where(Appointment.appointment_id == appointment_id)
    )
    appt = result.scalar_one_or_none()
    if not appt:
        raise HTTPException(status_code=404, detail="Appointment not found")
    if current_user.user_id not in (appt.doctor_id, appt.patient_id):
        raise HTTPException(status_code=403, detail="Not your appointment")

    room_name = appt.meeting_room_id or f"meet-{appointment_id}"
    role = current_user.user_type
    display_name = current_user.entity.full_name

    token = generate_participant_token(
        room_name=room_name,
        identity=str(current_user.user_id),
        name=display_name,
        role=role,
    )

    from app.config import settings
    return MeetingJoinToken(
        token=token,
        room_name=room_name,
        livekit_url=settings.LIVEKIT_URL,
        identity=str(current_user.user_id),
        name=display_name,
        role=role,
    )


@router.get("/{appointment_id}/status", response_model=MeetingStatusResponse)
async def meeting_status(
    appointment_id: UUID,
    current_user: CurrentUser = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Get meeting room status."""
    result = await db.execute(
        select(Appointment).where(Appointment.appointment_id == appointment_id)
    )
    appt = result.scalar_one_or_none()
    if not appt:
        raise HTTPException(status_code=404, detail="Appointment not found")

    room_name = appt.meeting_room_id or f"meet-{appointment_id}"
    status = await get_room_status(room_name)
    return status


@router.post("/{appointment_id}/end")
async def end_meeting(
    appointment_id: UUID,
    current_user: CurrentUser = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """End a meeting and mark appointment as completed."""
    result = await db.execute(
        select(Appointment).where(Appointment.appointment_id == appointment_id)
    )
    appt = result.scalar_one_or_none()
    if not appt:
        raise HTTPException(status_code=404, detail="Appointment not found")
    if current_user.user_id not in (appt.doctor_id, appt.patient_id):
        raise HTTPException(status_code=403, detail="Not your appointment")

    appt.status = "completed"
    db.add(appt)
    await db.flush()

    return {"message": "Meeting ended", "appointment_id": str(appointment_id)}

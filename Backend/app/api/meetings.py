"""
API Routes — Meetings (LiveKit)
"""

import logging
import tempfile
from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException, File, Form, UploadFile
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.database import get_db
from app.api.deps import CurrentUser, get_current_user, require_doctor
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
    current_user: CurrentUser = Depends(require_doctor),
    db: AsyncSession = Depends(get_db),
):
    """End a meeting and mark appointment as completed (doctor only)."""
    result = await db.execute(
        select(Appointment).where(Appointment.appointment_id == appointment_id)
    )
    appt = result.scalar_one_or_none()
    if not appt:
        raise HTTPException(status_code=404, detail="Appointment not found")
    if appt.doctor_id != current_user.user_id:
        raise HTTPException(status_code=403, detail="Only the doctor can end the meeting")

    appt.status = "completed"
    db.add(appt)
    await db.flush()

    return {"message": "Meeting ended", "appointment_id": str(appointment_id)}


@router.post("/{appointment_id}/leave")
async def leave_meeting(
    appointment_id: UUID,
    current_user: CurrentUser = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Patient leaves a meeting (does NOT end it)."""
    result = await db.execute(
        select(Appointment).where(Appointment.appointment_id == appointment_id)
    )
    appt = result.scalar_one_or_none()
    if not appt:
        raise HTTPException(status_code=404, detail="Appointment not found")
    if current_user.user_id not in (appt.doctor_id, appt.patient_id):
        raise HTTPException(status_code=403, detail="Not your appointment")

    return {"message": "Left meeting", "appointment_id": str(appointment_id)}


@router.post("/transcribe-turn")
async def transcribe_speaker_turn(
    audio_file: UploadFile = File(...),
    speaker_name: str = Form("Unknown"),
    speaker_role: str = Form("unknown"),
    current_user: CurrentUser = Depends(get_current_user),
):
    """
    Receive a single speaker-turn audio blob from the frontend,
    transcribe it, and return the text annotated with the speaker.
    The frontend accumulates these into a running transcript.
    """
    import httpx
    from app.config import settings

    audio_bytes = await audio_file.read()
    if len(audio_bytes) < 1000:
        return {"text": "", "speaker_name": speaker_name, "speaker_role": speaker_role}

    # Save to temp file for the AI backend
    suffix = ".webm" if "webm" in (audio_file.content_type or "") else ".wav"
    with tempfile.NamedTemporaryFile(delete=False, suffix=suffix) as tmp:
        tmp.write(audio_bytes)
        tmp_path = tmp.name

    try:
        ai_url = getattr(settings, "AI_BACKEND_URL", "http://localhost:8000")
        async with httpx.AsyncClient(timeout=60.0) as client:
            with open(tmp_path, "rb") as f:
                resp = await client.post(
                    f"{ai_url}/transcribe",
                    files={"audio_file": (audio_file.filename or "turn.webm", f, audio_file.content_type or "audio/webm")},
                )
            if resp.status_code == 200:
                data = resp.json()
                transcript = data.get("transcription") or data.get("text") or ""
                return {
                    "text": transcript.strip(),
                    "speaker_name": speaker_name,
                    "speaker_role": speaker_role,
                }
            else:
                logger.warning(f"AI transcription returned {resp.status_code}: {resp.text[:200]}")
                return {"text": "", "speaker_name": speaker_name, "speaker_role": speaker_role}
    except Exception as e:
        logger.error(f"Turn transcription error: {e}")
        return {"text": "", "speaker_name": speaker_name, "speaker_role": speaker_role}
    finally:
        import os
        try:
            os.unlink(tmp_path)
        except OSError:
            pass

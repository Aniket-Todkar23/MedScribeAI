"""
Meeting Service — LiveKit integration
Per-track audio capture for true speaker diarization.
"""

import logging
from typing import Optional

from app.config import settings
from app.schemas.meeting import MeetingStatusResponse

logger = logging.getLogger(__name__)

# LiveKit SDK imports (graceful fallback if not installed)
try:
    from livekit.api import LiveKitAPI, AccessToken, VideoGrants
    LIVEKIT_AVAILABLE = True
except ImportError:
    LIVEKIT_AVAILABLE = False
    logger.warning("LiveKit SDK not installed. Meeting features will use mock mode.")


async def create_room(room_name: str) -> dict:
    """Create a LiveKit room."""
    if not LIVEKIT_AVAILABLE:
        logger.info(f"[MOCK] Creating room: {room_name}")
        return {"room_name": room_name, "mock": True}

    api = LiveKitAPI(
        url=settings.LIVEKIT_URL,
        api_key=settings.LIVEKIT_API_KEY,
        api_secret=settings.LIVEKIT_API_SECRET,
    )
    try:
        room = await api.room.create_room(name=room_name, empty_timeout=600, max_participants=4)
        return {"room_name": room.name, "sid": room.sid}
    finally:
        await api.aclose()


def generate_participant_token(
    room_name: str,
    identity: str,
    name: str,
    role: str,
) -> str:
    """
    Generate a LiveKit access token for a participant.
    The identity and metadata fields embed who this person is,
    enabling per-track diarization (each track → known speaker).
    """
    if not LIVEKIT_AVAILABLE:
        return f"mock-token-{identity}-{room_name}"

    token = (
        AccessToken(settings.LIVEKIT_API_KEY, settings.LIVEKIT_API_SECRET)
        .with_identity(identity)
        .with_name(name)
        .with_metadata(f'{{"role": "{role}", "name": "{name}"}}')
        .with_grants(
            VideoGrants(
                room_join=True,
                room=room_name,
                can_publish=True,
                can_subscribe=True,
            )
        )
    )
    return token.to_jwt()


async def get_room_status(room_name: str) -> MeetingStatusResponse:
    """Get room status from LiveKit."""
    if not LIVEKIT_AVAILABLE:
        return MeetingStatusResponse(
            room_name=room_name,
            is_active=False,
            participant_count=0,
            is_recording=False,
        )

    api = LiveKitAPI(
        url=settings.LIVEKIT_URL,
        api_key=settings.LIVEKIT_API_KEY,
        api_secret=settings.LIVEKIT_API_SECRET,
    )
    try:
        rooms = await api.room.list_rooms(names=[room_name])
        if rooms and len(rooms) > 0:
            room = rooms[0]
            return MeetingStatusResponse(
                room_name=room_name,
                is_active=room.num_participants > 0,
                participant_count=room.num_participants,
                is_recording=room.active_recording,
            )
        return MeetingStatusResponse(
            room_name=room_name,
            is_active=False,
            participant_count=0,
            is_recording=False,
        )
    except Exception as e:
        logger.error(f"Failed to get room status: {e}")
        return MeetingStatusResponse(
            room_name=room_name,
            is_active=False,
            participant_count=0,
            is_recording=False,
        )
    finally:
        await api.aclose()

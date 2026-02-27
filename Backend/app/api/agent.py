"""
API Routes — LangGraph Agent Chat
"""

import uuid
from typing import Optional
from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy import select, text
from sqlalchemy.ext.asyncio import AsyncSession

from app.database import get_db
from app.api.deps import CurrentUser, get_current_user, require_doctor, require_patient
from app.models.chat_history import ChatHistory
from app.models.appointment import Appointment
from app.schemas.agent import AgentChatRequest, AgentChatResponse, ChatHistoryResponse, MeetingChatRequest
from app.agents.patient_agent import run_patient_agent
from app.agents.clinician_agent import run_clinician_agent

router = APIRouter(prefix="/agent", tags=["AI Agent"])


async def _get_or_create_session(
    db: AsyncSession, user_id: UUID, user_type: str, session_id: Optional[str], context: dict = None,
) -> ChatHistory:
    """Get existing chat session or create a new one."""
    if session_id:
        result = await db.execute(
            select(ChatHistory).where(
                ChatHistory.session_id == session_id,
                ChatHistory.user_id == user_id,
            )
        )
        existing = result.scalar_one_or_none()
        if existing:
            return existing

    # Create new
    new_session = ChatHistory(
        user_id=user_id,
        user_type=user_type,
        session_id=session_id or str(uuid.uuid4()),
        messages=[],
        context=context or {},
    )
    db.add(new_session)
    await db.flush()
    return new_session


@router.post("/patient/chat", response_model=AgentChatResponse)
async def patient_chat(
    body: AgentChatRequest,
    current_user: CurrentUser = Depends(require_patient),
    db: AsyncSession = Depends(get_db),
):
    """Patient chats with their health assistant."""
    session = await _get_or_create_session(
        db, current_user.user_id, "patient", body.session_id
    )

    # Add user message to history
    history = session.messages or []
    history.append({"role": "user", "content": body.message})

    # Run agent
    result = await run_patient_agent(
        message=body.message,
        patient_id=current_user.user_id,
        db=db,
        session_id=session.session_id,
        chat_history=history,
    )

    # Save assistant response
    history.append({"role": "assistant", "content": result["response"]})
    session.messages = history
    db.add(session)
    await db.flush()

    return AgentChatResponse(**result)


@router.post("/clinician/chat", response_model=AgentChatResponse)
async def clinician_chat(
    body: AgentChatRequest,
    current_user: CurrentUser = Depends(require_doctor),
    db: AsyncSession = Depends(get_db),
):
    """Clinician chats with consultation assistant."""
    session = await _get_or_create_session(
        db, current_user.user_id, "doctor", body.session_id
    )

    history = session.messages or []
    history.append({"role": "user", "content": body.message})

    result = await run_clinician_agent(
        message=body.message,
        doctor_id=current_user.user_id,
        db=db,
        session_id=session.session_id,
        chat_history=history,
    )

    history.append({"role": "assistant", "content": result["response"]})
    session.messages = history
    db.add(session)
    await db.flush()

    return AgentChatResponse(**result)


@router.post("/clinician/meeting-chat", response_model=AgentChatResponse)
async def clinician_meeting_chat(
    body: MeetingChatRequest,
    current_user: CurrentUser = Depends(require_doctor),
    db: AsyncSession = Depends(get_db),
):
    """Clinician chats with AI during a live meeting (patient context auto-loaded)."""
    # Get appointment to find patient
    result = await db.execute(
        select(Appointment).where(Appointment.appointment_id == body.appointment_id)
    )
    appt = result.scalar_one_or_none()
    if not appt:
        raise HTTPException(status_code=404, detail="Appointment not found")
    if appt.doctor_id != current_user.user_id:
        raise HTTPException(status_code=403, detail="Not your appointment")

    session = await _get_or_create_session(
        db, current_user.user_id, "doctor", body.session_id,
        context={"appointment_id": str(body.appointment_id), "patient_id": str(appt.patient_id), "mode": "meeting"},
    )

    history = session.messages or []
    history.append({"role": "user", "content": body.message})

    agent_result = await run_clinician_agent(
        message=body.message,
        doctor_id=current_user.user_id,
        db=db,
        session_id=session.session_id,
        chat_history=history,
        meeting_mode=True,
        patient_id=str(appt.patient_id),
    )

    history.append({"role": "assistant", "content": agent_result["response"]})
    session.messages = history
    db.add(session)
    await db.flush()

    return AgentChatResponse(**agent_result)


@router.get("/history/{session_id}", response_model=ChatHistoryResponse)
async def get_chat_history(
    session_id: str,
    current_user: CurrentUser = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Get chat history for a session."""
    result = await db.execute(
        select(ChatHistory).where(
            ChatHistory.session_id == session_id,
            ChatHistory.user_id == current_user.user_id,
        )
    )
    session = result.scalar_one_or_none()
    if not session:
        raise HTTPException(status_code=404, detail="Session not found")

    return ChatHistoryResponse(
        session_id=session.session_id,
        messages=session.messages or [],
        context=session.context or {},
    )


@router.delete("/history/{session_id}")
async def clear_chat_history(
    session_id: str,
    current_user: CurrentUser = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Clear chat history for a session."""
    result = await db.execute(
        select(ChatHistory).where(
            ChatHistory.session_id == session_id,
            ChatHistory.user_id == current_user.user_id,
        )
    )
    session = result.scalar_one_or_none()
    if not session:
        raise HTTPException(status_code=404, detail="Session not found")

    await db.delete(session)
    await db.flush()
    return {"message": "Chat history cleared"}

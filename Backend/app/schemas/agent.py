"""
Pydantic Schemas — LangGraph Agent
"""

from typing import Any, Dict, List, Optional
from uuid import UUID

from pydantic import BaseModel


class AgentChatRequest(BaseModel):
    message: str
    session_id: Optional[str] = None  # If None, a new session is created


class MeetingChatRequest(BaseModel):
    message: str
    appointment_id: UUID
    session_id: Optional[str] = None


class AgentChatResponse(BaseModel):
    response: str
    session_id: str
    tool_calls: List[Dict[str, Any]] = []  # For transparency — show what tools were called


class ChatHistoryResponse(BaseModel):
    session_id: str
    messages: List[Dict[str, Any]] = []
    context: Dict[str, Any] = {}

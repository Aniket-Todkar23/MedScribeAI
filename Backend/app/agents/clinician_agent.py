"""
LangGraph Agent — Clinician Consultation Assistant
"""

import logging
import time
import uuid
from typing import Any, Dict, List, Optional

from sqlalchemy.ext.asyncio import AsyncSession

from app.agents.prompts import CLINICIAN_SYSTEM_PROMPT, MEETING_CLINICIAN_PROMPT
from app.agents.tools import create_clinician_tools

logger = logging.getLogger(__name__)

# ── Gemini availability gate (cooldown after quota/rate errors) ───────────────
_gemini_disabled_until: float = 0.0
_GEMINI_COOLDOWN_SECONDS = 60  # wait 60s after a quota error before retrying


def _gemini_is_available() -> bool:
    """Return True unless Gemini was recently disabled due to quota errors."""
    return time.time() >= _gemini_disabled_until


def _disable_gemini() -> None:
    """Temporarily disable Gemini for COOLDOWN seconds."""
    global _gemini_disabled_until
    _gemini_disabled_until = time.time() + _GEMINI_COOLDOWN_SECONDS
    logger.info(f"Gemini disabled for {_GEMINI_COOLDOWN_SECONDS}s (quota cooldown)")


async def _run_with_ollama(message, system_prompt, tools, chat_history):
    """Fallback: run via local Ollama (httpx, zero extra deps)."""
    from app.agents.ollama_agent import run_ollama_agent

    return await run_ollama_agent(
        message=message,
        system_prompt=system_prompt,
        tools=tools,
        chat_history=chat_history,
    )


async def run_clinician_agent(
    message: str,
    doctor_id,
    db: AsyncSession,
    session_id: Optional[str] = None,
    chat_history: List[Dict[str, Any]] = None,
    meeting_mode: bool = False,
    patient_id: Optional[str] = None,
) -> Dict[str, Any]:
    """
    Run the clinician consultation assistant.
    3-tier fallback: Gemini → Ollama → keyword matching.
    """
    if session_id is None:
        session_id = str(uuid.uuid4())
    if chat_history is None:
        chat_history = []

    tools = create_clinician_tools(db, doctor_id)
    system_prompt = MEETING_CLINICIAN_PROMPT if meeting_mode else CLINICIAN_SYSTEM_PROMPT

    # If in meeting mode with a patient, prepend context
    if meeting_mode and patient_id:
        system_prompt += f"\n\nCurrent patient_id: {patient_id}. Use this for lookups."

    try:
        from langchain_google_genai import ChatGoogleGenerativeAI
        from langgraph.prebuilt import create_react_agent
        from app.config import settings

        if not settings.GEMINI_API_KEY:
            raise ValueError("GEMINI_API_KEY not configured")

        if not _gemini_is_available():
            raise ValueError("Gemini temporarily disabled (quota cooldown)")

        llm = ChatGoogleGenerativeAI(
            model="gemini-2.0-flash",
            google_api_key=settings.GEMINI_API_KEY,
            temperature=0.2,
        )

        agent = create_react_agent(llm, tools, prompt=system_prompt)

        messages = []
        for msg in chat_history[-10:]:
            messages.append({"role": msg.get("role", "user"), "content": msg.get("content", "")})
        messages.append({"role": "user", "content": message})

        result = await agent.ainvoke({"messages": messages})

        ai_messages = result.get("messages", [])
        response_text = ""
        tool_calls_info = []

        for msg in ai_messages:
            if hasattr(msg, "content") and msg.type == "ai":
                response_text = msg.content
            if hasattr(msg, "tool_calls") and msg.tool_calls:
                for tc in msg.tool_calls:
                    tool_calls_info.append({"tool": tc.get("name", ""), "args": tc.get("args", {})})

        return {
            "response": response_text or "Unable to process request.",
            "session_id": session_id,
            "tool_calls": tool_calls_info,
        }

    except ImportError as e:
        logger.warning(f"LangGraph/Gemini not available, trying Ollama: {e}")
    except Exception as e:
        err_str = str(e).lower()
        if "429" in err_str or "quota" in err_str or "rate" in err_str:
            _disable_gemini()
            logger.info("Gemini quota hit — falling back to Ollama")
        else:
            logger.error(f"Clinician agent error: {e}")

    # ── Tier 2: Ollama ────────────────────────────────────────────────────
    try:
        result = await _run_with_ollama(message, system_prompt, tools, chat_history)
        return {
            "response": result["response"],
            "session_id": session_id,
            "tool_calls": result.get("tool_calls", []),
        }
    except Exception as e:
        logger.error(f"Ollama fallback also failed: {e}")

    # ── Tier 3: keyword matching ──────────────────────────────────────────
    return await _fallback_clinician(message, tools, session_id, patient_id)


async def _fallback_clinician(message: str, tools: list, session_id: str, patient_id: Optional[str] = None) -> Dict[str, Any]:
    """Fallback when LLM not available."""
    msg_lower = message.lower()

    for tool_fn in tools:
        if tool_fn.name == "get_patient_history" and patient_id and any(w in msg_lower for w in ["history", "patient", "record", "background"]):
            try:
                result = await tool_fn.ainvoke({"patient_id": patient_id})
                return {"response": result, "session_id": session_id, "tool_calls": [{"tool": tool_fn.name}]}
            except Exception:
                pass

        if tool_fn.name == "get_patient_overview" and patient_id and any(w in msg_lower for w in ["overview", "summary", "quick"]):
            try:
                result = await tool_fn.ainvoke({"patient_id": patient_id})
                return {"response": result, "session_id": session_id, "tool_calls": [{"tool": tool_fn.name}]}
            except Exception:
                pass

        if tool_fn.name == "search_icd_codes" and any(w in msg_lower for w in ["icd", "code", "diagnosis"]):
            query = message.replace("icd", "").replace("code", "").strip()
            try:
                result = await tool_fn.ainvoke({"query": query or message})
                return {"response": result, "session_id": session_id, "tool_calls": [{"tool": tool_fn.name}]}
            except Exception:
                pass

    return {
        "response": "I can help with patient history, ICD codes, and clinical summaries. Configure a Gemini API key for full AI assistance.",
        "session_id": session_id,
        "tool_calls": [],
    }

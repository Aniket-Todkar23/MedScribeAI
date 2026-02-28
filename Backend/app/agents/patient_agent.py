"""
LangGraph Agent — Patient Health Assistant
"""

import logging
import time
import uuid
from typing import Any, Dict, List, Optional

from sqlalchemy.ext.asyncio import AsyncSession

from app.agents.prompts import PATIENT_SYSTEM_PROMPT
from app.agents.tools import create_patient_tools
from app.compliance.pii_masker import deidentify_for_llm

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


async def _run_with_ollama(message, tools, chat_history):
    """Fallback: run via local Ollama (httpx, zero extra deps)."""
    from app.agents.ollama_agent import run_ollama_agent

    return await run_ollama_agent(
        message=message,
        system_prompt=PATIENT_SYSTEM_PROMPT,
        tools=tools,
        chat_history=chat_history,
    )


async def run_patient_agent(
    message: str,
    patient_id,
    db: AsyncSession,
    session_id: Optional[str] = None,
    chat_history: List[Dict[str, Any]] = None,
) -> Dict[str, Any]:
    """
    Run the patient health assistant agent.
    3-tier fallback: Gemini → Ollama → keyword matching.
    """
    if session_id is None:
        session_id = str(uuid.uuid4())
    if chat_history is None:
        chat_history = []

    tools = create_patient_tools(db, patient_id)

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
            temperature=0.3,
        )

        agent = create_react_agent(llm, tools, prompt=PATIENT_SYSTEM_PROMPT)

        # Build message history
        messages = []
        for msg in chat_history[-10:]:
            messages.append({"role": msg.get("role", "user"), "content": msg.get("content", "")})
        messages.append({"role": "user", "content": message})

        result = await agent.ainvoke({"messages": messages})

        # Extract response
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
            "response": response_text or "I couldn't process your request. Please try again.",
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
            logger.error(f"Agent error: {e}")

    # ── Tier 2: Ollama ────────────────────────────────────────────────────
    try:
        result = await _run_with_ollama(message, tools, chat_history)
        return {
            "response": result["response"],
            "session_id": session_id,
            "tool_calls": result.get("tool_calls", []),
        }
    except Exception as e:
        logger.error(f"Ollama fallback also failed: {e}")

    # ── Tier 3: keyword matching ──────────────────────────────────────────
    return await _fallback_agent(message, tools, session_id)


async def _fallback_agent(message: str, tools: list, session_id: str) -> Dict[str, Any]:
    """Simple keyword-based fallback when LLM is not available."""
    msg_lower = message.lower()
    tool_calls = []

    for tool_fn in tools:
        if tool_fn.name == "get_my_health_summary" and any(w in msg_lower for w in ["health", "summary", "overview", "condition"]):
            try:
                result = await tool_fn.ainvoke({})
                return {"response": result, "session_id": session_id, "tool_calls": [{"tool": tool_fn.name}]}
            except Exception:
                pass

        if tool_fn.name == "get_my_appointments" and any(w in msg_lower for w in ["appointment", "schedule", "upcoming", "visit"]):
            try:
                result = await tool_fn.ainvoke({})
                return {"response": result, "session_id": session_id, "tool_calls": [{"tool": tool_fn.name}]}
            except Exception:
                pass

        if tool_fn.name == "get_my_prescriptions" and any(w in msg_lower for w in ["medication", "prescription", "medicine", "drug", "med"]):
            try:
                result = await tool_fn.ainvoke({})
                return {"response": result, "session_id": session_id, "tool_calls": [{"tool": tool_fn.name}]}
            except Exception:
                pass

        if tool_fn.name == "get_my_documents" and any(w in msg_lower for w in ["document", "report", "lab", "test", "result"]):
            try:
                result = await tool_fn.ainvoke({})
                return {"response": result, "session_id": session_id, "tool_calls": [{"tool": tool_fn.name}]}
            except Exception:
                pass

    return {
        "response": "I can help you with your health records, appointments, medications, and documents. Please configure a Gemini API key for full AI-powered assistance. What would you like to know?",
        "session_id": session_id,
        "tool_calls": [],
    }

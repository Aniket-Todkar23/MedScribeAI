"""
Ollama-based agentic loop using httpx (zero extra dependencies).

Implements tool-calling for Qwen2.5 (and other models that support
Ollama's chat API with tools). Used as automatic fallback when
Gemini quota is exhausted.
"""

import json
import logging
from typing import Any, Callable, Dict, List, Optional

import httpx

from app.config import settings

logger = logging.getLogger(__name__)

# ── Ollama API helpers ────────────────────────────────────────────────────────

OLLAMA_CHAT_URL = f"{settings.OLLAMA_BASE_URL}/api/chat"
MAX_TOOL_ROUNDS = 5  # prevent infinite loops


def _langchain_tool_to_ollama(tool) -> dict:
    """Convert a LangChain @tool to Ollama's tool schema."""
    schema = tool.args_schema.schema() if hasattr(tool, "args_schema") and tool.args_schema else {}
    properties = schema.get("properties", {})
    required = schema.get("required", [])

    return {
        "type": "function",
        "function": {
            "name": tool.name,
            "description": tool.description or "",
            "parameters": {
                "type": "object",
                "properties": properties,
                "required": required,
            },
        },
    }


async def _call_ollama(
    messages: List[dict],
    tools: Optional[List[dict]] = None,
) -> dict:
    """Single round-trip to Ollama /api/chat (non-streaming)."""
    payload: Dict[str, Any] = {
        "model": settings.OLLAMA_MODEL,
        "messages": messages,
        "stream": False,
        "options": {"temperature": 0.3},
    }
    if tools:
        payload["tools"] = tools

    async with httpx.AsyncClient(timeout=120.0) as client:
        resp = await client.post(OLLAMA_CHAT_URL, json=payload)
        resp.raise_for_status()
        return resp.json()


# ── Public API ────────────────────────────────────────────────────────────────

async def run_ollama_agent(
    message: str,
    system_prompt: str,
    tools: list,
    chat_history: Optional[List[dict]] = None,
) -> Dict[str, Any]:
    """
    Run a simple agentic loop via Ollama.

    Parameters
    ----------
    message : str
        User's latest message.
    system_prompt : str
        System instructions for the model.
    tools : list
        LangChain tool objects (with .name, .description, .ainvoke / .invoke).
    chat_history : list, optional
        Prior conversation in [{"role": ..., "content": ...}] format.

    Returns
    -------
    dict  {"response": str, "tool_calls": list[dict]}
    """
    # Build tool lookup & Ollama schemas
    tool_map: Dict[str, Any] = {t.name: t for t in tools}
    ollama_tools = [_langchain_tool_to_ollama(t) for t in tools] if tools else []

    # Build messages
    messages: List[dict] = [{"role": "system", "content": system_prompt}]
    if chat_history:
        for msg in chat_history[-10:]:
            messages.append({
                "role": msg.get("role", "user"),
                "content": msg.get("content", ""),
            })
    messages.append({"role": "user", "content": message})

    tool_calls_info: List[dict] = []

    for _round in range(MAX_TOOL_ROUNDS):
        try:
            result = await _call_ollama(messages, ollama_tools or None)
        except Exception as e:
            logger.error(f"Ollama call failed: {e}")
            return {"response": f"Local AI error: {e}", "tool_calls": tool_calls_info}

        assistant_msg = result.get("message", {})
        content = assistant_msg.get("content", "")
        called_tools = assistant_msg.get("tool_calls", [])

        if not called_tools:
            # No more tool calls — return the final answer
            return {"response": content or "I couldn't generate a response.", "tool_calls": tool_calls_info}

        # Append assistant message (with tool_calls) to history
        messages.append(assistant_msg)

        # Execute each tool call
        for tc in called_tools:
            fn_info = tc.get("function", {})
            fn_name = fn_info.get("name", "")
            fn_args = fn_info.get("arguments", {})

            tool_calls_info.append({"tool": fn_name, "args": fn_args})

            tool_fn = tool_map.get(fn_name)
            if tool_fn is None:
                tool_result = f"Error: unknown tool '{fn_name}'"
            else:
                try:
                    tool_result = await tool_fn.ainvoke(fn_args)
                except Exception as e:
                    tool_result = f"Tool error: {e}"

            # Append tool result as role=tool
            messages.append({
                "role": "tool",
                "content": str(tool_result),
            })

    # Exhausted MAX_TOOL_ROUNDS — make one final call without tools
    try:
        result = await _call_ollama(messages, None)
        content = result.get("message", {}).get("content", "")
    except Exception:
        content = ""

    return {
        "response": content or "I processed your request but couldn't generate a final summary.",
        "tool_calls": tool_calls_info,
    }

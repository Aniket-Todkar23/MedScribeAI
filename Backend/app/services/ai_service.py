"""
AI Service — HTTP client for the AI Backend (merged FastAPI server)
"""

import logging
from typing import Any, Dict, Optional

import httpx

from app.config import settings

logger = logging.getLogger(__name__)

_client: Optional[httpx.AsyncClient] = None


def _get_client() -> httpx.AsyncClient:
    global _client
    if _client is None:
        _client = httpx.AsyncClient(base_url=settings.AI_BACKEND_URL, timeout=600.0)
    return _client


async def health_check() -> Dict[str, Any]:
    """Check AI backend health."""
    try:
        resp = await _get_client().get("/health")
        return resp.json()
    except Exception as e:
        logger.warning(f"AI backend health check failed: {e}")
        return {"status": "unreachable", "error": str(e)}


async def _safe_post(path: str, **kwargs) -> Dict[str, Any]:
    """POST to AI backend with graceful error handling."""
    client = _get_client()
    try:
        resp = await client.post(path, **kwargs)
        resp.raise_for_status()
        return resp.json()
    except httpx.ConnectError:
        logger.warning(f"AI backend unreachable for {path}")
        return {"error": "AI backend is not running", "status": "unavailable"}
    except Exception as e:
        logger.error(f"AI backend error for {path}: {e}")
        return {"error": str(e), "status": "failed"}


async def transcribe_audio(audio_bytes: bytes, filename: str) -> Dict[str, Any]:
    """Send audio to AI backend for transcription."""
    return await _safe_post("/transcribe", files={"file": (filename, audio_bytes, "audio/mpeg")})


async def extract_entities(transcript: str) -> Dict[str, Any]:
    """Extract medical entities from transcript."""
    return await _safe_post("/extract", json={"transcript": transcript})


async def generate_emr(extraction_data: Dict[str, Any]) -> Dict[str, Any]:
    """Generate full EMR from extracted entities."""
    return await _safe_post("/generate-emr", json={"extraction": extraction_data})


async def generate_patient_summary(emr_data: Dict[str, Any]) -> Dict[str, Any]:
    """Generate patient-friendly summary."""
    return await _safe_post("/patient-summary", json={"emr_record": emr_data})


async def icd_lookup(query: str, version: int = 10, limit: int = 10) -> Dict[str, Any]:
    """Search ICD codes."""
    return await _safe_post("/icd-lookup", json={"query": query, "version": version, "limit": limit})


async def suggest_diagnoses(symptoms: str) -> Dict[str, Any]:
    """Get AI-suggested diagnoses."""
    # The AI backend expects symptoms as a list of Symptom objects
    symptoms_list = [{"description": s.strip()} for s in symptoms.split(",")] if symptoms else []
    return await _safe_post("/suggest-diagnoses", json={"symptoms": symptoms_list})


async def analyze_document_with_ai(
    file_bytes: bytes, filename: str, content_type: str = "application/pdf",
) -> Dict[str, Any]:
    """Send document to AI backend for analysis (doc analysis pipeline)."""
    return await _safe_post("/doc/analyze-document", files={"file": (filename, file_bytes, content_type)})


async def analyze_document_for_patient(
    file_bytes: bytes, filename: str, content_type: str = "application/pdf",
) -> Dict[str, Any]:
    """Patient-facing document analysis: structured data + patient-friendly summary.
    Faster than full analysis (1 Qwen + 1 MedGemma call).
    """
    return await _safe_post(
        "/doc/patient-report",
        files={"file": (filename, file_bytes, content_type)},
    )


async def analyze_document_for_clinician(
    file_bytes: bytes,
    filename: str,
    content_type: str = "application/pdf",
    medical_history: Optional[str] = None,
) -> Dict[str, Any]:
    """Clinician-facing document analysis: clinical insights, ICD codes, flags, recommendations.
    Accepts optional medical_history JSON for deeper contextual analysis.
    """
    data = {"medical_history": medical_history} if medical_history else {}
    return await _safe_post(
        "/doc/clinician-report",
        files={"file": (filename, file_bytes, content_type)},
        data=data,
    )


async def chat_with_medgemma(messages: list) -> str:
    """Chat with MedGemma via the AI backend."""
    client = _get_client()
    try:
        resp = await client.post("/doc/chat", json={"messages": messages})
        resp.raise_for_status()
        data = resp.json()
        return data.get("response", data.get("content", ""))
    except Exception as e:
        logger.error(f"MedGemma chat failed: {e}")
        return f"AI service unavailable: {e}"

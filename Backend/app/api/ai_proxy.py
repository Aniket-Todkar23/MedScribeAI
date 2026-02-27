"""
API Routes — AI Proxy (direct pass-through to AI Backend)
"""

from typing import Any, Dict, List, Optional

from fastapi import APIRouter, Depends, File, Form, UploadFile
from pydantic import BaseModel

from app.api.deps import CurrentUser, get_current_user, require_doctor
from app.services import ai_service

router = APIRouter(prefix="/ai", tags=["AI Services"])


class TranscriptRequest(BaseModel):
    transcript: str


class ICDLookupRequest(BaseModel):
    query: str
    version: int = 10
    limit: int = 10


class SuggestRequest(BaseModel):
    symptoms: str


class EMRRequest(BaseModel):
    extraction: Dict[str, Any]


class PatientSummaryRequest(BaseModel):
    emr: Dict[str, Any]


@router.get("/health")
async def ai_health():
    """Check AI backend health."""
    return await ai_service.health_check()


@router.post("/transcribe")
async def transcribe(
    file: UploadFile = File(...),
    _: CurrentUser = Depends(get_current_user),
):
    """Transcribe audio via AI backend."""
    content = await file.read()
    return await ai_service.transcribe_audio(content, file.filename or "audio.mp3")


@router.post("/extract")
async def extract(
    body: TranscriptRequest,
    _: CurrentUser = Depends(get_current_user),
):
    """Extract medical entities from transcript."""
    return await ai_service.extract_entities(body.transcript)


@router.post("/generate-emr")
async def generate_emr(
    body: EMRRequest,
    _: CurrentUser = Depends(get_current_user),
):
    """Generate EMR record."""
    return await ai_service.generate_emr(body.extraction)


@router.post("/patient-summary")
async def patient_summary(
    body: PatientSummaryRequest,
    _: CurrentUser = Depends(get_current_user),
):
    """Generate patient-friendly summary."""
    return await ai_service.generate_patient_summary(body.emr)


@router.post("/icd-lookup")
async def icd_lookup(
    body: ICDLookupRequest,
    _: CurrentUser = Depends(get_current_user),
):
    """Search ICD codes."""
    return await ai_service.icd_lookup(body.query, body.version, body.limit)


@router.post("/suggest-diagnoses")
async def suggest_diagnoses(
    body: SuggestRequest,
    _: CurrentUser = Depends(get_current_user),
):
    """Get AI-suggested diagnoses."""
    return await ai_service.suggest_diagnoses(body.symptoms)


@router.post("/analyze-document")
async def analyze_document(
    file: UploadFile = File(...),
    _: CurrentUser = Depends(get_current_user),
):
    """Analyze a document via AI backend."""
    content = await file.read()
    return await ai_service.analyze_document_with_ai(
        content, file.filename or "document.pdf", file.content_type or "application/pdf"
    )


# ─── Document report endpoints ────────────────────────────────────────────────

@router.post("/doc/patient-report")
async def doc_patient_report(
    file: UploadFile = File(...),
    _: CurrentUser = Depends(get_current_user),
):
    """Patient-facing document report: structured data + plain-language summary."""
    content = await file.read()
    return await ai_service.analyze_document_for_patient(
        content, file.filename or "document.pdf", file.content_type or "application/pdf"
    )


@router.post("/doc/clinician-report")
async def doc_clinician_report(
    file: UploadFile = File(...),
    medical_history: Optional[str] = Form(None),
    _: CurrentUser = Depends(require_doctor),
):
    """Clinician-facing document report: clinical insights, abnormal flags, ICD codes, recommendations.
    Optionally pass the patient's medical history as a plain-text/JSON string for deeper context.
    """
    content = await file.read()
    return await ai_service.analyze_document_for_clinician(
        content,
        file.filename or "document.pdf",
        file.content_type or "application/pdf",
        medical_history,
    )


# ─── MedGemma chat ────────────────────────────────────────────────────────────

class ChatMessage(BaseModel):
    role: str          # "user" | "assistant" | "system"
    content: str


class ChatRequest(BaseModel):
    messages: List[ChatMessage]


@router.post("/chat")
async def chat(
    body: ChatRequest,
    _: CurrentUser = Depends(get_current_user),
):
    """Chat with MedGemma (multi-turn medical Q&A)."""
    messages = [m.model_dump() for m in body.messages]
    reply = await ai_service.chat_with_medgemma(messages)
    return {"response": reply}

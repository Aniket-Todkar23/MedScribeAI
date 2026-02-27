"""
AI Core Service — API Routes
==============================
All endpoints that the primary backend (server/) calls.
Endpoints are mounted at /api/v1 by main.py.

Endpoint contract (must match server/app/services/ai_service.py):
  GET  /health
  POST /transcribe            — multipart file upload
  POST /extract               — json: {"transcript": str}
  POST /generate-emr          — json: {"extraction": dict}
  POST /patient-summary       — json: {"emr_record": dict}
  POST /icd-lookup            — json: {"query": str, "version": int, "limit": int}
  POST /suggest-diagnoses     — json: {"symptoms": [{"description": str}]}
  POST /doc/patient-report    — multipart: file + (patient uploads report/rx)
  POST /doc/clinician-report  — multipart: file + optional medical_history form field
  POST /doc/analyze-document  — multipart file upload (full pipeline, both summaries)
  POST /doc/chat              — json: {"messages": [{role, content}]}
"""

import json
import logging
import tempfile
import os
from typing import Any, Dict, Optional

from fastapi import APIRouter, File, Form, UploadFile, HTTPException, Request

from schemas import (
    ExtractedEntities,
    ExtractRequest,
    GenerateEMRRequest,
    PatientSummaryRequest,
    ICDLookupRequest,
    SuggestDiagnosesRequest,
    ChatCompletionRequest,
)

logger = logging.getLogger(__name__)

router = APIRouter()


# ─────────────────────────────────────────────────────────────────────────────
# Helpers
# ─────────────────────────────────────────────────────────────────────────────

def _require_medgemma(request: Request):
    """Return MedGemma service or raise 503 if Modal URL not configured."""
    svc = request.app.state.medgemma
    if not svc._ready:
        raise HTTPException(
            status_code=503,
            detail="MedGemma service unavailable — set MODAL_MEDGEMMA_URL in .env",
        )
    return svc


def _require_doc_analysis(request: Request):
    """Return doc analysis service or raise 503 if Modal URLs not configured."""
    svc = request.app.state.doc_analysis
    if not svc.qwen_vl_url or not svc.medgemma_url:
        raise HTTPException(
            status_code=503,
            detail="Document analysis unavailable — set MODAL_MEDGEMMA_URL and MODAL_QWEN_VL_URL in .env",
        )
    return svc


# ─────────────────────────────────────────────────────────────────────────────
# GET /health
# ─────────────────────────────────────────────────────────────────────────────

@router.get("/health")
async def health(request: Request):
    doc_svc = request.app.state.doc_analysis
    doc_health = await doc_svc.check_health()
    return {
        "status": "ok",
        "services": {
            "transcription": True,
            "medgemma": True,
            "icd": True,
            "document_analysis": doc_health,
        },
    }


# ─────────────────────────────────────────────────────────────────────────────
# POST /transcribe — multipart file upload
# ─────────────────────────────────────────────────────────────────────────────

@router.post("/transcribe")
async def transcribe(request: Request, file: UploadFile = File(...)):
    """Transcribe audio using faster-whisper."""
    transcription_svc = request.app.state.transcription
    audio_bytes = await file.read()
    filename = file.filename or "audio.mp3"

    try:
        result = await transcription_svc.transcribe_bytes(audio_bytes, filename)
        return result
    except Exception as e:
        logger.error(f"Transcription failed: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail=f"Transcription failed: {e}")


# ─────────────────────────────────────────────────────────────────────────────
# POST /extract — {"transcript": "..."}
# ─────────────────────────────────────────────────────────────────────────────

@router.post("/extract")
async def extract_entities(request: Request, body: ExtractRequest):
    """Extract medical entities from a transcript."""
    medgemma = _require_medgemma(request)
    try:
        entities = await medgemma.extract_entities(body.transcript)
        return {"entities": entities.model_dump()}
    except Exception as e:
        logger.error(f"Entity extraction failed: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail=f"Entity extraction failed: {e}")


# ─────────────────────────────────────────────────────────────────────────────
# POST /generate-emr — {"extraction": {...}}
# ─────────────────────────────────────────────────────────────────────────────

@router.post("/generate-emr")
async def generate_emr(request: Request, body: GenerateEMRRequest):
    """Build a FHIR-aligned EMR record from extracted entities."""
    medgemma = _require_medgemma(request)
    try:
        # Reconstruct ExtractedEntities from the raw dict
        entities = ExtractedEntities.model_validate(body.extraction)
        transcript_text = body.extraction.get("_transcript", "")
        emr_record = await medgemma.build_emr(entities, transcript_text=transcript_text)
        return {"emr_record": emr_record.model_dump()}
    except Exception as e:
        logger.error(f"EMR generation failed: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail=f"EMR generation failed: {e}")


# ─────────────────────────────────────────────────────────────────────────────
# POST /patient-summary — {"emr_record": {...}}
# ─────────────────────────────────────────────────────────────────────────────

@router.post("/patient-summary")
async def patient_summary(request: Request, body: PatientSummaryRequest):
    """Generate a patient-friendly summary from an EMR record."""
    medgemma = _require_medgemma(request)
    try:
        # Serialize the EMR dict to JSON string for the prompt
        emr_json_str = json.dumps(body.emr_record, indent=2, default=str)
        summary = await medgemma.generate_patient_summary(emr_json_str)
        return {"patient_summary": summary}
    except Exception as e:
        logger.error(f"Patient summary generation failed: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail=f"Patient summary failed: {e}")


# ─────────────────────────────────────────────────────────────────────────────
# POST /icd-lookup — {"query": "...", "version": 10, "limit": 5}
# ─────────────────────────────────────────────────────────────────────────────

@router.post("/icd-lookup")
async def icd_lookup(request: Request, body: ICDLookupRequest):
    """Look up ICD-9/10 codes by text query."""
    icd_svc = request.app.state.icd
    try:
        matches = icd_svc.lookup(
            query=body.query,
            top_k=body.limit,
            version=body.version,
        )
        from dataclasses import asdict
        return {
            "query": body.query,
            "matches": [asdict(m) for m in matches],
        }
    except Exception as e:
        logger.error(f"ICD lookup failed: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail=f"ICD lookup failed: {e}")


# ─────────────────────────────────────────────────────────────────────────────
# POST /suggest-diagnoses — {"symptoms": [{"description": "..."}]}
# ─────────────────────────────────────────────────────────────────────────────

@router.post("/suggest-diagnoses")
async def suggest_diagnoses(request: Request, body: SuggestDiagnosesRequest):
    """AI-powered differential diagnosis suggestions with ICD codes."""
    medgemma = _require_medgemma(request)
    icd_svc = request.app.state.icd
    try:
        suggestions = await icd_svc.suggest_diagnoses(
            symptoms=body.symptoms,
            generate_fn=medgemma.generate,
            top_k=5,
        )
        return {"suggestions": suggestions}
    except Exception as e:
        logger.error(f"Diagnosis suggestion failed: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail=f"Diagnosis suggestion failed: {e}")


# ─────────────────────────────────────────────────────────────────────────────
# POST /doc/patient-report — patient uploads lab report / prescription
# ─────────────────────────────────────────────────────────────────────────────

@router.post("/doc/patient-report")
async def patient_report(request: Request, file: UploadFile = File(...)):
    """Patient-facing document analysis: Qwen perception → structured data → patient-friendly summary.
    
    Optimised for speed (1 Qwen + 1 MedGemma call).
    Accepts PDF, PNG, JPG, WEBP.
    """
    doc_svc = _require_doc_analysis(request)
    file_bytes = await file.read()
    filename = file.filename or "document.pdf"

    try:
        result = await doc_svc.analyze_for_patient(file_bytes, filename)
        return result.model_dump()
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
    except Exception as e:
        logger.error(f"Patient report analysis failed: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail=f"Patient report failed: {e}")


# ─────────────────────────────────────────────────────────────────────────────
# POST /doc/clinician-report — doctor uploads patient's lab report
# ─────────────────────────────────────────────────────────────────────────────

@router.post("/doc/clinician-report")
async def clinician_report(
    request: Request,
    file: UploadFile = File(...),
    medical_history: Optional[str] = Form(None),
):
    """Clinician-facing document analysis: Qwen perception → structured data → clinical analysis with flags & ICD codes.
    
    Optimised for clinical depth (1 Qwen + 1 MedGemma call).
    Accepts PDF, PNG, JPG, WEBP.
    Optional `medical_history` field: JSON string of patient's medical history from DB
    for deeper contextual analysis.
    """
    doc_svc = _require_doc_analysis(request)
    file_bytes = await file.read()
    filename = file.filename or "document.pdf"

    try:
        result = await doc_svc.analyze_for_clinician(
            file_bytes, filename, medical_history=medical_history
        )
        return result.model_dump()
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
    except Exception as e:
        logger.error(f"Clinician report analysis failed: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail=f"Clinician report failed: {e}")


# ─────────────────────────────────────────────────────────────────────────────
# POST /doc/analyze-document — multipart file upload
# ─────────────────────────────────────────────────────────────────────────────

@router.post("/doc/analyze-document")
async def analyze_document(request: Request, file: UploadFile = File(...)):
    """Full 3-stage document analysis pipeline."""
    doc_svc = _require_doc_analysis(request)
    file_bytes = await file.read()
    filename = file.filename or "document.pdf"

    try:
        result = await doc_svc.analyze_document(file_bytes, filename)
        return result.model_dump()
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
    except Exception as e:
        logger.error(f"Document analysis failed: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail=f"Document analysis failed: {e}")


# ─────────────────────────────────────────────────────────────────────────────
# POST /doc/chat — {"messages": [{role, content}]}
# ─────────────────────────────────────────────────────────────────────────────

@router.post("/doc/chat")
async def chat_completion(request: Request, body: ChatCompletionRequest):
    """Generic chat with MedGemma."""
    medgemma = _require_medgemma(request)
    try:
        messages_raw = [{"role": m.role, "content": m.content} for m in body.messages]
        response_text = await medgemma.chat_completion(
            messages=messages_raw,
            max_tokens=body.max_tokens,
            temperature=body.temperature,
        )
        return {"response": response_text, "content": response_text}
    except Exception as e:
        logger.error(f"Chat completion failed: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail=f"Chat failed: {e}")

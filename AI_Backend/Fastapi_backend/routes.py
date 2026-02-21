"""
API Routes — Smart EMR Pipeline
================================
POST /api/v1/transcribe        Upload audio → transcription + classification
POST /api/v1/extract           Transcript → medical entities (MedGemma)
POST /api/v1/generate-emr      Entities + transcript → EMR record (MedGemma)
POST /api/v1/patient-summary   EMR record → patient-friendly summary (MedGemma)
GET  /api/v1/health            Health check
"""

import logging
import os
import tempfile
import shutil
from concurrent.futures import ThreadPoolExecutor
import asyncio

from fastapi import APIRouter, HTTPException, Request, UploadFile, File

from schemas import (
    ClassifiedTranscript,
    TranscribeResponse,
    ExtractRequest, ExtractResponse,
    GenerateEMRRequest, GenerateEMRResponse,
    PatientSummaryRequest, PatientSummaryResponse,
    ICDLookupRequest, ICDLookupResponse, ICDCode,
    SuggestDiagnosesRequest, SuggestDiagnosesResponse, DiagnosticSuggestion,
)

logger = logging.getLogger(__name__)
router = APIRouter()

# Thread pool for CPU-bound work (whisper transcription, classifier)
executor = ThreadPoolExecutor(max_workers=2)


# ─────────────────────────────────────────────────────────────────────────────
# 1. TRANSCRIBE  (audio upload → transcription + classification)
# ─────────────────────────────────────────────────────────────────────────────

@router.post(
    "/transcribe",
    response_model=TranscribeResponse,
    summary="Transcribe & classify uploaded audio",
    description="Upload an audio file (wav/mp3/m4a/etc). Returns speaker-classified transcript.",
    tags=["pipeline"],
)
async def transcribe_audio(request: Request, file: UploadFile = File(...)):
    state = request.app.state

    # Save upload to temp file
    fd, temp_path = tempfile.mkstemp(suffix=os.path.splitext(file.filename or ".wav")[1])
    try:
        with os.fdopen(fd, "wb") as f:
            shutil.copyfileobj(file.file, f)

        loop = asyncio.get_event_loop()

        # Transcribe (CPU-bound → run in thread pool)
        transcript, audio_duration = await loop.run_in_executor(
            executor, state.transcription_service.process, temp_path
        )

        # Classify speaker roles (CPU/IO-bound → thread pool)
        classified_turns = await loop.run_in_executor(
            executor, state.classifier.classify, transcript.turns
        )

        transcript = ClassifiedTranscript(
            turns=classified_turns,
            total_turns=len(classified_turns),
            clinician_turns=sum(1 for t in classified_turns if t.speaker.value == "CLINICIAN"),
            patient_turns=sum(1 for t in classified_turns if t.speaker.value == "PATIENT"),
            unknown_turns=sum(1 for t in classified_turns if t.speaker.value == "UNKNOWN"),
            raw_transcript=transcript.raw_transcript,
        )

        return TranscribeResponse(
            transcript=transcript,
            audio_duration_seconds=audio_duration,
        )

    except Exception as e:
        logger.exception(f"Transcription failed: {e}")
        raise HTTPException(status_code=500, detail=str(e))
    finally:
        if os.path.exists(temp_path):
            os.unlink(temp_path)


# ─────────────────────────────────────────────────────────────────────────────
# 2. EXTRACT  (transcript → medical entities via MedGemma)
# ─────────────────────────────────────────────────────────────────────────────

@router.post(
    "/extract",
    response_model=ExtractResponse,
    summary="Extract medical entities from transcript",
    description="Send a classified transcript, returns structured medical entities (vitals, symptoms, dx, meds, etc.).",
    tags=["pipeline"],
)
async def extract_entities(body: ExtractRequest, request: Request):
    state = request.app.state
    try:
        entities, _ = state.medgemma.extract_entities(body.transcript.turns)
        return ExtractResponse(entities=entities)
    except Exception as e:
        logger.exception(f"Extraction failed: {e}")
        raise HTTPException(status_code=500, detail=str(e))


# ─────────────────────────────────────────────────────────────────────────────
# 3. GENERATE EMR  (entities + transcript → EMR record via MedGemma)
# ─────────────────────────────────────────────────────────────────────────────

@router.post(
    "/generate-emr",
    response_model=GenerateEMRResponse,
    summary="Generate EMR record",
    description="Send extracted entities + transcript, returns a complete structured EMR record.",
    tags=["pipeline"],
)
async def generate_emr(body: GenerateEMRRequest, request: Request):
    state = request.app.state
    try:
        emr = state.medgemma.build_emr(
            entities=body.entities,
            transcript=body.transcript,
            patient_id=body.patient_id,
            encounter_date=body.encounter_date,
            encounter_type=body.encounter_type,
            audio_duration=body.audio_duration,
            patient_name=body.patient_name,
            provider_name=body.provider_name,
            facility_name=body.facility_name,
        )
        return GenerateEMRResponse(emr_record=emr)
    except Exception as e:
        logger.exception(f"EMR generation failed: {e}")
        raise HTTPException(status_code=500, detail=str(e))


# ─────────────────────────────────────────────────────────────────────────────
# 4. PATIENT SUMMARY  (EMR record → patient-friendly summary via MedGemma)
# ─────────────────────────────────────────────────────────────────────────────

@router.post(
    "/patient-summary",
    response_model=PatientSummaryResponse,
    summary="Generate patient-friendly summary",
    description="Translates an EMR record into a plain-English summary the patient can understand.",
    tags=["pipeline"],
)
async def patient_summary(body: PatientSummaryRequest, request: Request):
    state = request.app.state
    try:
        summary = state.medgemma.generate_patient_summary(body.emr_record)
        return PatientSummaryResponse(patient_summary=summary)
    except Exception as e:
        logger.exception(f"Patient summary failed: {e}")
        raise HTTPException(status_code=500, detail=str(e))


# ─────────────────────────────────────────────────────────────────────────────
# HEALTH CHECK
# ─────────────────────────────────────────────────────────────────────────────

@router.get(
    "/health",
    summary="Health check — shows which services are ready",
    tags=["system"],
)
async def health(request: Request):
    state = request.app.state
    return {
        "status": "ok",
        "services": {
            "whisper": getattr(state.transcription_service.whisper, "_model", None) is not None,
            "pyannote": state.transcription_service._diarization_available,
            "medgemma": getattr(state.medgemma._backend, "loaded", False),
            "medgemma_backend": state.medgemma.backend_name,
            "icd_service": getattr(state, "icd_service", None) is not None and state.icd_service.loaded,
        },
    }


# ─────────────────────────────────────────────────────────────────────────────
# 5. ICD CODE LOOKUP
# ─────────────────────────────────────────────────────────────────────────────

@router.post(
    "/icd-lookup",
    response_model=ICDLookupResponse,
    summary="Search ICD-9/ICD-10 codes",
    description="Fuzzy search for ICD codes matching a symptom or condition description.",
    tags=["icd"],
)
async def icd_lookup(body: ICDLookupRequest, request: Request):
    icd_svc = getattr(request.app.state, "icd_service", None)
    if not icd_svc or not icd_svc.loaded:
        raise HTTPException(status_code=503, detail="ICD service not loaded")

    matches = icd_svc.lookup(
        query=body.query,
        top_k=body.top_k,
        version=body.version,
    )
    return ICDLookupResponse(
        query=body.query,
        matches=[
            ICDCode(code=m.code, title=m.title, version=m.version, score=m.score)
            for m in matches
        ],
    )


# ─────────────────────────────────────────────────────────────────────────────
# 6. SUGGEST DIAGNOSES  (MedGemma differential + ICD mapping)
# ─────────────────────────────────────────────────────────────────────────────

@router.post(
    "/suggest-diagnoses",
    response_model=SuggestDiagnosesResponse,
    summary="AI-powered differential diagnosis with ICD codes",
    description="Given extracted symptoms + patient context, generates ranked differential diagnoses with ICD-10 code mappings.",
    tags=["icd"],
)
async def suggest_diagnoses(body: SuggestDiagnosesRequest, request: Request):
    state = request.app.state
    icd_svc = getattr(state, "icd_service", None)
    if not icd_svc or not icd_svc.loaded:
        raise HTTPException(status_code=503, detail="ICD service not loaded")

    try:
        symptoms_dicts = [s.model_dump(exclude_none=True) for s in body.symptoms]
        patient_info = {
            "age": body.age,
            "gender": body.gender,
            "social_history": body.social_history.model_dump(exclude_none=True) if body.social_history else {},
            "family_history": [fh.model_dump(exclude_none=True) for fh in body.family_history],
        }

        suggestions_raw = icd_svc.suggest_diagnoses(
            symptoms=symptoms_dicts,
            patient_info=patient_info,
            generate_fn=state.medgemma._backend.generate,
            top_k=5,
        )

        suggestions = [
            DiagnosticSuggestion(
                condition=s["condition"],
                likelihood=s["likelihood"],
                reasoning=s["reasoning"],
                icd10_codes=[
                    ICDCode(code=c["code"], title=c["title"], version=10, score=c.get("score", 0.0))
                    for c in s.get("icd10_codes", [])
                ],
            )
            for s in suggestions_raw
        ]

        return SuggestDiagnosesResponse(suggestions=suggestions)

    except Exception as e:
        logger.exception(f"Diagnosis suggestion failed: {e}")
        raise HTTPException(status_code=500, detail=str(e))


# ─────────────────────────────────────────────────────────────────────────────
# 7. ICD STATS
# ─────────────────────────────────────────────────────────────────────────────

@router.get(
    "/icd-stats",
    summary="ICD code database statistics",
    tags=["icd"],
)
async def icd_stats(request: Request):
    icd_svc = getattr(request.app.state, "icd_service", None)
    if not icd_svc:
        return {"loaded": False}
    return {
        "loaded": icd_svc.loaded,
        "icd9_count": len(icd_svc._entries) - len([e for e in icd_svc._entries if e.version == 10]),
        "icd10_count": len([e for e in icd_svc._entries if e.version == 10]),
        "total_codes": len(icd_svc._entries),
        "unique_tokens": len(icd_svc._inverted),
    }

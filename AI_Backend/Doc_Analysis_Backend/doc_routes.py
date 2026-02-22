"""
API Routes — Document Analysis Pipeline
========================================
POST /api/v1/analyze-document       Full pipeline: upload file → structured analysis + summaries
POST /api/v1/analyze-for-doctor     Doctor view: EMR data + clinician summary + anomalies + alerts
POST /api/v1/analyze-for-patient    Patient view: simple summary + lifestyle tips + abnormal highlights
POST /api/v1/perceive-document      Stage 1 only: upload file → markdown tables
POST /api/v1/extract-from-markdown  Stage 2+3: markdown → structured JSON + summaries
GET  /api/v1/health                 Health check (both Modal endpoints)
"""

import logging
import os
import tempfile
import shutil
import time

from fastapi import APIRouter, HTTPException, Request, UploadFile, File, Form
from typing import Optional

from doc_schemas import (
    PerceiveDocumentResponse,
    ExtractFromMarkdownRequest,
    DocumentAnalysisResponse,
    DoctorAnalysisResponse,
    PatientAnalysisResponse,
    ChatCompletionRequest,
)

logger = logging.getLogger(__name__)
router = APIRouter()

MAX_FILE_SIZE = 50 * 1024 * 1024  # 50MB


# ─── Shared helpers ──────────────────────────────────────────────────────────

async def _run_perception(service, content: bytes, filename: str):
    """Run Stage 1 (file → images → markdown) and return (markdown, page_count)."""
    ext = filename.rsplit(".", 1)[-1].lower() if "." in filename else ""

    if ext == "pdf":
        image_bytes_list = service.pdf_to_images(content)
        page_count = len(image_bytes_list)
    elif ext in ("png", "jpg", "jpeg", "webp", "bmp", "tiff", "tif"):
        image_bytes_list = [content]
        page_count = 1
    else:
        raise HTTPException(
            status_code=400,
            detail=f"Unsupported file type: .{ext}. Use PDF, PNG, JPG, or WEBP.",
        )

    markdown = await service.perceive_document(image_bytes_list)
    return markdown, page_count


def _validate_upload(content: bytes, filename: str):
    """Validate file size and type."""
    if len(content) > MAX_FILE_SIZE:
        raise HTTPException(
            status_code=413,
            detail=f"File too large. Maximum size is {MAX_FILE_SIZE // (1024*1024)}MB",
        )
    ext = filename.rsplit(".", 1)[-1].lower() if "." in filename else ""
    if ext not in ("pdf", "png", "jpg", "jpeg", "webp", "bmp", "tiff", "tif"):
        raise HTTPException(
            status_code=400,
            detail=f"Unsupported file type: .{ext}. Use PDF, PNG, JPG, or WEBP.",
        )


# ─────────────────────────────────────────────────────────────────────────────
# 1. ANALYZE DOCUMENT (Full 3-stage pipeline — original endpoint)
# ─────────────────────────────────────────────────────────────────────────────

@router.post(
    "/analyze-document",
    response_model=DocumentAnalysisResponse,
    summary="Full document analysis pipeline",
    description=(
        "Upload a medical document (PDF, PNG, JPG, WEBP) for complete analysis.\n\n"
        "**Pipeline stages:**\n"
        "1. Document Perception (Qwen2.5-VL) → Markdown tables\n"
        "2. Clinical Extraction (MedGemma-27B) → Structured JSON with ICD codes\n"
        "3. Summary Generation (MedGemma-27B) → Clinician + Patient summaries"
    ),
    tags=["pipeline"],
)
async def analyze_document(
    request: Request,
    file: UploadFile = File(..., description="PDF or image file (PNG, JPG, WEBP)"),
    conversation_transcript: Optional[str] = Form(
        default=None,
        description="Optional conversation transcript for context correlation",
    ),
    include_summaries: bool = Form(
        default=True,
        description="Whether to generate clinician and patient summaries (Stage 3)",
    ),
):
    service = request.app.state.doc_service
    content = await file.read()
    filename = file.filename or "document.pdf"
    _validate_upload(content, filename)

    try:
        result = await service.analyze_document(
            file_bytes=content,
            filename=filename,
            conversation_transcript=conversation_transcript,
            include_summaries=include_summaries,
        )
        return result
    except Exception as e:
        logger.exception(f"Document analysis failed: {e}")
        raise HTTPException(status_code=500, detail=str(e))


# ─────────────────────────────────────────────────────────────────────────────
# 2. ANALYZE FOR DOCTOR (EMR extraction + clinician summary)
# ─────────────────────────────────────────────────────────────────────────────

@router.post(
    "/analyze-for-doctor",
    response_model=DoctorAnalysisResponse,
    summary="Doctor-facing analysis: structured data + clinician summary",
    description=(
        "Upload a patient's medical document (lab report, prescription, etc.) "
        "to get a structured clinical summary.\n\n"
        "**Returns:**\n"
        "- Patient & document metadata (EMR-ready)\n"
        "- All test panels with results and reference ranges\n"
        "- Abnormal results highlighted with flags\n"
        "- Clinical insights with ICD-10 codes\n"
        "- Medication suggestions\n"
        "- Professional clinician summary with differential diagnoses and recommended actions"
    ),
    tags=["doctor"],
)
async def analyze_for_doctor(
    request: Request,
    file: UploadFile = File(..., description="PDF or image file (PNG, JPG, WEBP)"),
    conversation_transcript: Optional[str] = Form(
        default=None,
        description="Optional conversation transcript for context correlation",
    ),
):
    service = request.app.state.doc_service
    content = await file.read()
    filename = file.filename or "document.pdf"
    _validate_upload(content, filename)

    try:
        t0 = time.time()

        # Stage 1: Document Perception
        markdown, page_count = await _run_perception(service, content, filename)

        # Stage 2: Extraction + Clinical Reasoning
        structured_report = await service.extract_and_reason(
            markdown,
            conversation_transcript=conversation_transcript,
        )

        # Stage 3a: Clinician Summary (doctor-facing only — skips patient summary)
        clinician_summary = await service.generate_clinician_summary(
            structured_report, markdown=markdown
        )

        elapsed_ms = (time.time() - t0) * 1000

        return DoctorAnalysisResponse(
            metadata=structured_report.metadata,
            panels=structured_report.panels,
            abnormal_results=structured_report.abnormal_results,
            prescriptions=structured_report.prescriptions,
            clinical_insights=structured_report.clinical_insights,
            icd_codes=structured_report.icd_codes,
            medication_suggestions=structured_report.medication_suggestions,
            clinician_summary=clinician_summary,
            page_count=page_count,
            processing_time_ms=round(elapsed_ms, 1),
        )
    except Exception as e:
        logger.exception(f"Doctor analysis failed: {e}")
        raise HTTPException(status_code=500, detail=str(e))


# ─────────────────────────────────────────────────────────────────────────────
# 3. ANALYZE FOR PATIENT (simple summary + abnormal highlights)
# ─────────────────────────────────────────────────────────────────────────────

@router.post(
    "/analyze-for-patient",
    response_model=PatientAnalysisResponse,
    summary="Patient-facing analysis: simple summary in plain language",
    description=(
        "Upload a lab report or prescription to get a patient-friendly summary.\n\n"
        "**Returns:**\n"
        "- Simple, jargon-free explanation of what was tested\n"
        "- Which results are normal vs need attention\n"
        "- Actionable next steps\n"
        "- Lifestyle tips\n"
        "- Count of abnormal results"
    ),
    tags=["patient"],
)
async def analyze_for_patient(
    request: Request,
    file: UploadFile = File(..., description="PDF or image file (PNG, JPG, WEBP)"),
):
    service = request.app.state.doc_service
    content = await file.read()
    filename = file.filename or "document.pdf"
    _validate_upload(content, filename)

    try:
        t0 = time.time()

        # Stage 1: Document Perception
        markdown, page_count = await _run_perception(service, content, filename)

        # Stage 2: Extraction (panels + metadata — clinical reasoning still runs
        # but only patient summary is generated in Stage 3)
        structured_report = await service.extract_and_reason(markdown)

        # Stage 3b: Patient Summary (patient-facing only — skips clinician summary)
        patient_summary = await service.generate_patient_summary(structured_report)

        elapsed_ms = (time.time() - t0) * 1000

        # Count total tests across all panels
        total_tests = sum(len(p.tests) for p in structured_report.panels)

        return PatientAnalysisResponse(
            patient_name=structured_report.metadata.patient_name,
            report_date=structured_report.metadata.report_date,
            lab_name=structured_report.metadata.lab_name,
            document_type=structured_report.metadata.document_type,
            abnormal_results=structured_report.abnormal_results,
            total_tests_count=total_tests,
            abnormal_count=len(structured_report.abnormal_results),
            prescriptions=structured_report.prescriptions,
            patient_summary=patient_summary,
            page_count=page_count,
            processing_time_ms=round(elapsed_ms, 1),
        )
    except Exception as e:
        logger.exception(f"Patient analysis failed: {e}")
        raise HTTPException(status_code=500, detail=str(e))


# ─────────────────────────────────────────────────────────────────────────────
# 4. PERCEIVE DOCUMENT (Stage 1 only — file → markdown)
# ─────────────────────────────────────────────────────────────────────────────

@router.post(
    "/perceive-document",
    response_model=PerceiveDocumentResponse,
    summary="Document perception only (Stage 1)",
    description="Upload a document and get structured markdown tables. No clinical reasoning.",
    tags=["pipeline"],
)
async def perceive_document(
    request: Request,
    file: UploadFile = File(..., description="PDF or image file"),
):
    service = request.app.state.doc_service
    content = await file.read()
    filename = file.filename or "document.pdf"
    _validate_upload(content, filename)

    try:
        t0 = time.time()
        markdown, page_count = await _run_perception(service, content, filename)
        elapsed_ms = (time.time() - t0) * 1000

        return PerceiveDocumentResponse(
            markdown_content=markdown,
            page_count=page_count,
            processing_time_ms=round(elapsed_ms, 1),
        )
    except Exception as e:
        logger.exception(f"Document perception failed: {e}")
        raise HTTPException(status_code=500, detail=str(e))


# ─────────────────────────────────────────────────────────────────────────────
# 5. EXTRACT FROM MARKDOWN (Stage 2+3 — markdown → structured + summaries)
# ─────────────────────────────────────────────────────────────────────────────

@router.post(
    "/extract-from-markdown",
    response_model=DocumentAnalysisResponse,
    summary="Extract structured data from markdown (Stage 2+3)",
    description=(
        "Send previously extracted markdown content for clinical reasoning and summary generation. "
        "Useful when Stage 1 was run separately, or for re-processing existing markdown."
    ),
    tags=["pipeline"],
)
async def extract_from_markdown(
    body: ExtractFromMarkdownRequest,
    request: Request,
):
    service = request.app.state.doc_service

    if not body.markdown_content.strip():
        raise HTTPException(status_code=400, detail="markdown_content cannot be empty")

    try:
        t0 = time.time()

        # Stage 2
        structured_report = await service.extract_and_reason(
            body.markdown_content,
            conversation_transcript=body.conversation_transcript,
        )

        # Stage 3
        clinician_summary = None
        patient_summary = None
        stages = ["extraction"]

        if body.include_summaries:
            clinician_summary = await service.generate_clinician_summary(
                structured_report, markdown=body.markdown_content
            )
            patient_summary = await service.generate_patient_summary(structured_report)
            stages.append("summarization")

        elapsed_ms = (time.time() - t0) * 1000

        return DocumentAnalysisResponse(
            markdown_content=body.markdown_content,
            structured_report=structured_report,
            clinician_summary=clinician_summary,
            patient_summary=patient_summary,
            processing_time_ms=round(elapsed_ms, 1),
            stages_completed=stages,
        )
    except Exception as e:
        logger.exception(f"Extraction from markdown failed: {e}")
        raise HTTPException(status_code=500, detail=str(e))


# ─────────────────────────────────────────────────────────────────────────────
# HEALTH CHECK
# ─────────────────────────────────────────────────────────────────────────────

@router.get(
    "/health",
    summary="Health check — connectivity to Modal endpoints",
    tags=["system"],
)
async def health(request: Request):
    service = request.app.state.doc_service
    status = await service.check_health()
    return {
        "status": "ok" if all(status.values()) else "degraded",
        "services": status,
    }

# ─────────────────────────────────────────────────────────────────────────────
# CHAT API (MedGemma Passthrough)
# ─────────────────────────────────────────────────────────────────────────────

@router.post(
    "/chat",
    summary="Generic chat completions using MedGemma-27B",
    description="Acts as a pass-through to the Modal MedGemma `/v1/chat/completions` endpoint. Expects standard OpenAI-compatible message array.",
    tags=["chat"],
)
async def chat_endpoint(
    body: ChatCompletionRequest,
    request: Request,
):
    service = request.app.state.doc_service
    
    if not body.messages:
        raise HTTPException(status_code=400, detail="messages array cannot be empty")
        
    try:
        # Convert Pydantic models to dicts for the service
        messages_dict = [{"role": msg.role, "content": msg.content} for msg in body.messages]
        
        result = await service.chat_completion(
            messages=messages_dict,
            max_tokens=body.max_tokens,
            temperature=body.temperature,
        )
        return result
    except Exception as e:
        logger.exception(f"Chat completion failed: {e}")
        raise HTTPException(status_code=500, detail=str(e))

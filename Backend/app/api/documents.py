"""
API Routes — Documents (Upload + AI Analysis)
"""

import asyncio
import logging
from typing import Any, Dict, List, Optional
from uuid import UUID

from fastapi import APIRouter, Depends, File, Form, HTTPException, UploadFile
from sqlalchemy import select, update
from sqlalchemy.ext.asyncio import AsyncSession

from app.database import get_db, async_session_factory
from app.api.deps import CurrentUser, get_current_user, require_doctor
from app.config import settings
from app.models.document import Document
from app.models.user import PatientOnboarding
from app.schemas.document import DocumentResponse
from app.utils.storage import save_upload
from app.services.ai_service import (
    analyze_document_with_ai,
    analyze_document_for_patient,
    analyze_document_for_clinician,
)

logger = logging.getLogger(__name__)


def _build_medical_history(ob: PatientOnboarding) -> str:
    """Serialise a PatientOnboarding row into a plain-text medical history string
    suitable for the clinician-report AI prompt."""
    parts: List[str] = []
    if ob.has_diabetes:
        parts.append(f"Diabetes: {ob.diabetes_type or 'type unspecified'}, insulin: {ob.on_insulin}")
    if ob.has_heart_disease and ob.heart_conditions:
        parts.append(f"Heart disease: {ob.heart_conditions}")
    if ob.has_lung_disease and ob.lung_conditions:
        parts.append(f"Lung disease: {ob.lung_conditions}" + (" (daily inhaler)" if ob.uses_inhaler_daily else ""))
    if ob.taking_medications and ob.medications_list:
        parts.append(f"Current medications: {ob.medications_list}")
    if ob.has_allergies and ob.allergies_list:
        parts.append(f"Allergies: {ob.allergies_list}")
    if ob.smoking_status:
        parts.append(f"Smoking: {ob.smoking_status}")
    if getattr(ob, 'alcohol_use', None):
        parts.append(f"Alcohol: {ob.alcohol_use}")
    if ob.had_major_surgeries and ob.surgeries_details:
        parts.append(f"Past surgeries: {ob.surgeries_details}")
    return "; ".join(parts) if parts else ""


async def _run_ai_analysis_background(
    document_id: UUID,
    file_content: bytes,
    filename: str,
    content_type: str,
    is_patient: bool,
    medical_history: Optional[str],
):
    """Run AI analysis in the background and update the document record.

    Uses its own DB session since the request session is already closed
    by the time this coroutine executes.
    """
    logger.info(f"[BG] Starting AI analysis for document {document_id}")
    analysis: Dict[str, Any] = {"analysis_status": "processing"}

    try:
        if is_patient:
            patient_result = await analyze_document_for_patient(file_content, filename, content_type)
            # Check for error in response
            if patient_result.get("status") == "failed" or patient_result.get("error"):
                analysis = {
                    "analysis_status": "failed",
                    "error": patient_result.get("error", "AI analysis failed"),
                    "patient_report": None,
                    "clinician_report": None,
                }
            else:
                analysis = {
                    "analysis_status": "completed",
                    "patient_report": patient_result,
                    "clinician_report": None,
                }
        else:
            # Doctor upload → run both reports concurrently
            patient_coro = analyze_document_for_patient(file_content, filename, content_type)
            clinician_coro = analyze_document_for_clinician(
                file_content, filename, content_type, medical_history,
            )
            patient_result, clinician_result = await asyncio.gather(
                patient_coro, clinician_coro, return_exceptions=True,
            )

            # Handle individual failures
            if isinstance(patient_result, Exception):
                patient_result = {"error": str(patient_result), "status": "failed"}
            if isinstance(clinician_result, Exception):
                clinician_result = {"error": str(clinician_result), "status": "failed"}

            patient_ok = not (patient_result.get("status") == "failed" or patient_result.get("error"))
            clinician_ok = not (clinician_result.get("status") == "failed" or clinician_result.get("error"))

            if patient_ok or clinician_ok:
                analysis = {
                    "analysis_status": "completed",
                    "patient_report": patient_result if patient_ok else None,
                    "clinician_report": clinician_result if clinician_ok else None,
                }
            else:
                analysis = {
                    "analysis_status": "failed",
                    "error": patient_result.get("error") or clinician_result.get("error", "AI analysis failed"),
                    "patient_report": None,
                    "clinician_report": None,
                }

    except Exception as exc:
        logger.error(f"[BG] AI analysis failed for document {document_id}: {exc}")
        analysis = {
            "analysis_status": "failed",
            "error": str(exc),
            "patient_report": None,
            "clinician_report": None,
        }

    # Persist to DB with a fresh session
    try:
        async with async_session_factory() as session:
            await session.execute(
                update(Document)
                .where(Document.document_id == document_id)
                .values(analysis_result=analysis)
            )
            await session.commit()
        logger.info(f"[BG] AI analysis for document {document_id} → {analysis.get('analysis_status')}")
    except Exception as db_exc:
        logger.error(f"[BG] Failed to persist analysis for {document_id}: {db_exc}")


router = APIRouter(prefix="/documents", tags=["Documents"])


@router.post("/upload", response_model=DocumentResponse, status_code=201)
async def upload_document(
    file: UploadFile = File(...),
    patient_id: UUID = Form(...),
    document_type: Optional[str] = Form(None),
    consultation_id: Optional[UUID] = Form(None),
    notes: Optional[str] = Form(None),
    current_user: CurrentUser = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Upload a document and return immediately. AI analysis runs in the background."""
    # Size check
    content = await file.read()
    max_bytes = settings.MAX_UPLOAD_SIZE_MB * 1024 * 1024
    if len(content) > max_bytes:
        raise HTTPException(status_code=413, detail=f"File exceeds {settings.MAX_UPLOAD_SIZE_MB}MB limit")

    # Save to local storage
    file_path = await save_upload(content, file.filename or "upload.bin", sub_dir=f"documents/{patient_id}")

    doc = Document(
        patient_id=patient_id,
        doctor_id=current_user.user_id if current_user.is_doctor else None,
        consultation_id=consultation_id,
        document_name=file.filename or "upload",
        document_type=document_type,
        file_path=file_path,
        file_size_kb=len(content) // 1024,
        mime_type=file.content_type,
        uploaded_by=current_user.user_id,
        notes=notes,
        analysis_result={"analysis_status": "processing"},
    )
    db.add(doc)
    await db.flush()

    # Gather medical history for doctor uploads (before request session closes)
    medical_history: Optional[str] = None
    if current_user.is_doctor:
        ob_row = await db.execute(
            select(PatientOnboarding).where(PatientOnboarding.patient_id == patient_id)
        )
        ob = ob_row.scalar_one_or_none()
        medical_history = _build_medical_history(ob) if ob else ""

    # Launch AI analysis as a background asyncio task
    asyncio.create_task(
        _run_ai_analysis_background(
            document_id=doc.document_id,
            file_content=content,
            filename=file.filename or "upload.pdf",
            content_type=file.content_type or "application/pdf",
            is_patient=current_user.is_patient,
            medical_history=medical_history or None,
        )
    )

    return DocumentResponse.model_validate(doc)


@router.get("/{document_id}", response_model=DocumentResponse)
async def get_document(
    document_id: UUID,
    current_user: CurrentUser = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Get document by ID."""
    result = await db.execute(select(Document).where(Document.document_id == document_id))
    doc = result.scalar_one_or_none()
    if not doc:
        raise HTTPException(status_code=404, detail="Document not found")

    # Access control: patients see only their own
    if current_user.is_patient and doc.patient_id != current_user.user_id:
        raise HTTPException(status_code=403, detail="Access denied")

    return DocumentResponse.model_validate(doc)


@router.get("/{document_id}/analysis-status")
async def get_analysis_status(
    document_id: UUID,
    current_user: CurrentUser = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
) -> Dict[str, Any]:
    """Poll the analysis status of a document (processing | completed | failed)."""
    result = await db.execute(select(Document).where(Document.document_id == document_id))
    doc = result.scalar_one_or_none()
    if not doc:
        raise HTTPException(status_code=404, detail="Document not found")
    if current_user.is_patient and doc.patient_id != current_user.user_id:
        raise HTTPException(status_code=403, detail="Access denied")

    analysis: Dict[str, Any] = doc.analysis_result or {}
    status = analysis.get("analysis_status", "completed" if analysis.get("patient_report") or analysis.get("clinician_report") else "unknown")
    return {
        "document_id": str(document_id),
        "analysis_status": status,
        "error": analysis.get("error"),
    }


@router.get("/patient/{patient_id}", response_model=List[DocumentResponse])
async def get_patient_documents(
    patient_id: UUID,
    current_user: CurrentUser = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Get all documents for a patient."""
    if current_user.is_patient and current_user.user_id != patient_id:
        raise HTTPException(status_code=403, detail="Access denied")

    result = await db.execute(
        select(Document)
        .where(Document.patient_id == patient_id)
        .order_by(Document.uploaded_at.desc())
    )
    return [DocumentResponse.model_validate(d) for d in result.scalars().all()]


# ─── Report view helpers ───────────────────────────────────────────────────────

async def _get_accessible_doc(document_id: UUID, current_user: CurrentUser, db: AsyncSession) -> Document:
    result = await db.execute(select(Document).where(Document.document_id == document_id))
    doc = result.scalar_one_or_none()
    if not doc:
        raise HTTPException(status_code=404, detail="Document not found")
    if current_user.is_patient and doc.patient_id != current_user.user_id:
        raise HTTPException(status_code=403, detail="Access denied")
    return doc


@router.get("/{document_id}/patient-view")
async def get_patient_view(
    document_id: UUID,
    current_user: CurrentUser = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
) -> Dict[str, Any]:
    """Return the patient-friendly section of a document's AI analysis."""
    doc = await _get_accessible_doc(document_id, current_user, db)
    analysis: Dict[str, Any] = doc.analysis_result or {}
    report = analysis.get("patient_report") or analysis  # fallback: entire analysis_result
    return {"document_id": str(document_id), "patient_report": report}


@router.get("/{document_id}/clinician-view")
async def get_clinician_view(
    document_id: UUID,
    current_user: CurrentUser = Depends(require_doctor),
    db: AsyncSession = Depends(get_db),
) -> Dict[str, Any]:
    """Return the clinician-specific section of a document's AI analysis (doctors only)."""
    doc = await _get_accessible_doc(document_id, current_user, db)
    analysis: Dict[str, Any] = doc.analysis_result or {}
    report = analysis.get("clinician_report") or analysis
    return {"document_id": str(document_id), "clinician_report": report}

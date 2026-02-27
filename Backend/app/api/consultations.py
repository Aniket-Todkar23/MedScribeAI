"""
API Routes — Consultations
"""

import logging
from datetime import date
from typing import Any, Dict, List, Optional
from uuid import UUID

from fastapi import APIRouter, Depends, File, Form, HTTPException, UploadFile
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.database import get_db
from app.api.deps import CurrentUser, get_current_user, require_doctor
from app.models.consultation import Consultation
from app.models.appointment import Appointment
from app.schemas.consultation import (
    ConsultationCreate,
    ConsultationResponse,
    ConsultationUpdate,
)
from app.services import ai_service

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/consultations", tags=["Consultations"])


@router.post("", response_model=ConsultationResponse, status_code=201)
async def create_consultation(
    body: ConsultationCreate,
    current_user: CurrentUser = Depends(require_doctor),
    db: AsyncSession = Depends(get_db),
):
    """Create a consultation from an appointment."""
    # Validate appointment
    result = await db.execute(
        select(Appointment).where(Appointment.appointment_id == body.appointment_id)
    )
    appt = result.scalar_one_or_none()
    if not appt:
        raise HTTPException(status_code=404, detail="Appointment not found")
    if appt.doctor_id != current_user.user_id:
        raise HTTPException(status_code=403, detail="Not your appointment")

    consultation = Consultation(
        doctor_id=current_user.user_id,
        patient_id=body.patient_id,
        appointment_id=body.appointment_id,
    )
    db.add(consultation)
    await db.flush()

    # Link consultation to appointment
    appt.consultation_id = consultation.consultation_id
    appt.status = "in_progress"
    db.add(appt)
    await db.flush()
    await db.refresh(consultation)

    return ConsultationResponse.model_validate(consultation)


@router.get("/{consultation_id}", response_model=ConsultationResponse)
async def get_consultation(
    consultation_id: UUID,
    current_user: CurrentUser = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Get consultation by ID."""
    result = await db.execute(
        select(Consultation).where(Consultation.consultation_id == consultation_id)
    )
    consultation = result.scalar_one_or_none()
    if not consultation:
        raise HTTPException(status_code=404, detail="Consultation not found")

    # Access control
    if current_user.is_doctor and consultation.doctor_id != current_user.user_id:
        raise HTTPException(status_code=403, detail="Access denied")
    if current_user.is_patient and consultation.patient_id != current_user.user_id:
        raise HTTPException(status_code=403, detail="Access denied")

    return ConsultationResponse.model_validate(consultation)


@router.put("/{consultation_id}", response_model=ConsultationResponse)
async def update_consultation(
    consultation_id: UUID,
    body: ConsultationUpdate,
    current_user: CurrentUser = Depends(require_doctor),
    db: AsyncSession = Depends(get_db),
):
    """Update consultation data (SOAP, ICD, prescription, transcription)."""
    result = await db.execute(
        select(Consultation).where(Consultation.consultation_id == consultation_id)
    )
    consultation = result.scalar_one_or_none()
    if not consultation:
        raise HTTPException(status_code=404, detail="Consultation not found")
    if consultation.doctor_id != current_user.user_id:
        raise HTTPException(status_code=403, detail="Not your consultation")

    update_data = body.model_dump(exclude_unset=True)

    # Convert Pydantic models to dicts for JSONB fields
    if "soap_note" in update_data and update_data["soap_note"] is not None:
        update_data["soap_note"] = update_data["soap_note"].model_dump() if hasattr(update_data["soap_note"], "model_dump") else update_data["soap_note"]
    if "icd_codes" in update_data and update_data["icd_codes"] is not None:
        update_data["icd_codes"] = [c.model_dump() if hasattr(c, "model_dump") else c for c in update_data["icd_codes"]]
    if "prescription" in update_data and update_data["prescription"] is not None:
        update_data["prescription"] = [p.model_dump() if hasattr(p, "model_dump") else p for p in update_data["prescription"]]

    for key, value in update_data.items():
        setattr(consultation, key, value)

    db.add(consultation)
    await db.flush()
    await db.refresh(consultation)
    return ConsultationResponse.model_validate(consultation)


@router.get("/patient/{patient_id}", response_model=List[ConsultationResponse])
async def get_patient_consultations(
    patient_id: UUID,
    current_user: CurrentUser = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Get all consultations for a patient."""
    # Patients can only see their own
    if current_user.is_patient and current_user.user_id != patient_id:
        raise HTTPException(status_code=403, detail="Access denied")

    result = await db.execute(
        select(Consultation)
        .where(Consultation.patient_id == patient_id)
        .order_by(Consultation.consultation_date.desc())
    )
    return [ConsultationResponse.model_validate(c) for c in result.scalars().all()]


# ─── AI Audio Processing ───────────────────────────────────────────────────────

def _extract_icd_codes(emr: Dict[str, Any]) -> List[Dict[str, Any]]:
    """Collect unique ICD-10 codes from Symptoms and Diagnoses sections of an EMR."""
    seen: set = set()
    codes: List[Dict[str, Any]] = []

    for section_key in ("Symptoms", "Diagnoses"):
        for item in emr.get(section_key, []):
            for code_obj in item.get("icd10_codes", []):
                code = code_obj.get("code", "").strip()
                if code and code not in seen:
                    seen.add(code)
                    codes.append({
                        "code": code,
                        "description": code_obj.get("description", ""),
                        "version": 10,
                    })

    return codes


def _extract_prescription(emr: Dict[str, Any]) -> List[Dict[str, Any]]:
    """Map Medications section of an EMR to the consultation prescription schema."""
    rx: List[Dict[str, Any]] = []
    for med in emr.get("Medications", []):
        drug = (
            med.get("drug_name")
            or med.get("name")
            or med.get("drug")
            or "Unknown"
        )
        rx.append({
            "drug": drug,
            "dose": med.get("dosage") or med.get("dose") or "",
            "frequency": med.get("frequency") or "",
            "duration": med.get("duration") or "",
            "notes": med.get("instructions") or med.get("notes") or "",
        })
    return rx


def _build_soap(emr: Dict[str, Any]) -> Dict[str, str]:
    """Derive a SOAP note from the EMR NarrativeNotes section."""
    narr: Dict[str, str] = (
        emr.get("ClinicalFindings", {}).get("NarrativeNotes", {})
    )
    cc = narr.get("chief_complaint") or ""
    hpi = narr.get("history_of_present_illness") or ""
    subjective = " ".join(filter(None, [cc, hpi])).strip()

    return {
        "subjective": subjective,
        "objective": narr.get("physical_examination") or narr.get("Review_of_Systems") or "",
        "assessment": narr.get("assessment") or narr.get("Assessment") or "",
        "plan": narr.get("plan") or narr.get("Plan") or "",
    }


@router.post("/{consultation_id}/process-audio", response_model=ConsultationResponse)
async def process_consultation_audio(
    consultation_id: UUID,
    audio_file: UploadFile = File(...),
    encounter_date: Optional[str] = Form(None),
    current_user: CurrentUser = Depends(require_doctor),
    db: AsyncSession = Depends(get_db),
):
    """Full AI consultation workflow:
    audio → transcribe → extract entities → generate EMR →
    derive SOAP / ICD codes / prescription → patient summary → save.

    - *audio_file*: WAV, MP3, M4A, OGG, or WEBM recording of the consultation.
    - *encounter_date*: ISO date (YYYY-MM-DD). Defaults to today.
    """
    # 1. Verify consultation belongs to this doctor
    result = await db.execute(
        select(Consultation).where(Consultation.consultation_id == consultation_id)
    )
    consultation = result.scalar_one_or_none()
    if not consultation:
        raise HTTPException(status_code=404, detail="Consultation not found")
    if consultation.doctor_id != current_user.user_id:
        raise HTTPException(status_code=403, detail="Not your consultation")

    audio_bytes = await audio_file.read()
    filename = audio_file.filename or "audio.mp3"

    # 2. Transcription
    logger.info(f"[{consultation_id}] Transcribing audio ({len(audio_bytes)//1024} KB)")
    transcription_resp = await ai_service.transcribe_audio(audio_bytes, filename)
    if "error" in transcription_resp and "transcript" not in transcription_resp:
        raise HTTPException(status_code=502, detail=f"Transcription failed: {transcription_resp.get('error')}")
    transcript: str = transcription_resp.get("transcript", "")

    # 3. Entity extraction (adds ICD codes from local CSV lookup)
    logger.info(f"[{consultation_id}] Extracting entities from transcript")
    extraction_resp = await ai_service.extract_entities(transcript)
    if "error" in extraction_resp:
        raise HTTPException(status_code=502, detail=f"Entity extraction failed: {extraction_resp.get('error')}")

    # 4. EMR generation
    enc_date = encounter_date or date.today().isoformat()
    extraction_resp["encounter_date"] = enc_date
    extraction_resp["patient_id"] = str(consultation.patient_id)

    logger.info(f"[{consultation_id}] Generating EMR")
    emr_resp = await ai_service.generate_emr(extraction_resp)
    if "error" in emr_resp:
        raise HTTPException(status_code=502, detail=f"EMR generation failed: {emr_resp.get('error')}")

    emr_record: Dict[str, Any] = emr_resp.get("emr_record") or emr_resp

    # 5. Derive structured fields from EMR
    soap = _build_soap(emr_record)
    icd_codes = _extract_icd_codes(emr_record)
    prescription = _extract_prescription(emr_record)

    # 6. Patient-friendly summary
    logger.info(f"[{consultation_id}] Generating patient summary")
    summary_resp = await ai_service.generate_patient_summary(emr_record)
    patient_summary: str = (
        summary_resp.get("patient_summary")
        or summary_resp.get("summary")
        or ""
    )

    # 7. Persist everything
    consultation.transcription = transcript
    consultation.emr_data = emr_record
    consultation.soap_note = soap
    consultation.icd_codes = icd_codes
    consultation.prescription = prescription
    consultation.patient_summary = patient_summary
    consultation.status = "draft"

    db.add(consultation)
    await db.flush()
    await db.refresh(consultation)

    logger.info(f"[{consultation_id}] AI processing complete — "
                f"{len(icd_codes)} ICD codes, {len(prescription)} Rx items")

    return ConsultationResponse.model_validate(consultation)


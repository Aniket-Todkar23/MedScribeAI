"""
API Routes — FHIR R4 (EMR Integration)
Exposes patient data in HL7 FHIR R4 standard format.
"""

from typing import Any, Dict
from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.database import get_db
from app.api.deps import CurrentUser, get_current_user
from app.models.user import Patient
from app.models.consultation import Consultation
from app.models.document import Document

router = APIRouter(prefix="/fhir", tags=["FHIR R4 (EMR Integration)"])


def _fhir_patient(patient: Patient) -> Dict[str, Any]:
    """Convert Patient ORM to FHIR R4 Patient resource."""
    return {
        "resourceType": "Patient",
        "id": str(patient.patient_id),
        "active": patient.is_active,
        "name": [
            {
                "use": "official",
                "text": patient.full_name,
            }
        ],
        "telecom": [
            {"system": "email", "value": patient.email, "use": "home"},
            *([{"system": "phone", "value": patient.phone, "use": "mobile"}] if patient.phone else []),
        ],
        "gender": patient.gender or "unknown",
        "birthDate": patient.date_of_birth.isoformat() if patient.date_of_birth else None,
        "address": [{"text": patient.address}] if patient.address else [],
        "contact": [
            {"name": {"text": "Emergency Contact"}, "telecom": [{"system": "phone", "value": patient.emergency_contact}]}
        ] if patient.emergency_contact else [],
    }


def _fhir_encounter(consultation: Consultation) -> Dict[str, Any]:
    """Convert Consultation ORM to FHIR R4 Encounter resource."""
    return {
        "resourceType": "Encounter",
        "id": str(consultation.consultation_id),
        "status": "finished" if consultation.status == "confirmed" else "in-progress",
        "class": {"code": "AMB", "display": "ambulatory"},
        "subject": {"reference": f"Patient/{consultation.patient_id}"},
        "participant": [
            {
                "type": [{"coding": [{"code": "PPRF", "display": "primary performer"}]}],
                "individual": {"reference": f"Practitioner/{consultation.doctor_id}"},
            }
        ],
        "period": {
            "start": consultation.consultation_date.isoformat() if consultation.consultation_date else None,
        },
        "reasonCode": [
            {"coding": [{"system": "http://hl7.org/fhir/sid/icd-10", "code": ic.get("code"), "display": ic.get("description")}]}
            for ic in (consultation.icd_codes or [])
        ],
    }


def _fhir_condition(icd_code: Dict, patient_id: UUID, consultation_id: UUID) -> Dict[str, Any]:
    """Convert ICD code to FHIR R4 Condition resource."""
    return {
        "resourceType": "Condition",
        "id": f"{consultation_id}-{icd_code.get('code', 'unknown')}",
        "subject": {"reference": f"Patient/{patient_id}"},
        "code": {
            "coding": [
                {
                    "system": f"http://hl7.org/fhir/sid/icd-{icd_code.get('version', 10)}",
                    "code": icd_code.get("code", ""),
                    "display": icd_code.get("description", ""),
                }
            ]
        },
        "encounter": {"reference": f"Encounter/{consultation_id}"},
    }


def _fhir_medication_request(med: Dict, patient_id: UUID, doctor_id: UUID, consultation_id: UUID) -> Dict[str, Any]:
    """Convert prescription item to FHIR R4 MedicationRequest."""
    return {
        "resourceType": "MedicationRequest",
        "id": f"{consultation_id}-{med.get('drug', 'unknown').replace(' ', '-').lower()}",
        "status": "active",
        "intent": "order",
        "medicationCodeableConcept": {"text": med.get("drug", "")},
        "subject": {"reference": f"Patient/{patient_id}"},
        "requester": {"reference": f"Practitioner/{doctor_id}"},
        "dosageInstruction": [
            {
                "text": f"{med.get('dose', '')} {med.get('frequency', '')}",
                "timing": {"code": {"text": med.get("frequency", "")}},
                "doseAndRate": [{"doseQuantity": {"value": med.get("dose", "")}}],
            }
        ],
        "dispenseRequest": {"validityPeriod": {"start": None, "end": None}},
        "note": [{"text": med.get("notes", "")}] if med.get("notes") else [],
    }


# ── FHIR Endpoints ───────────────────────────────────────────────────────────


@router.get("/Patient/{patient_id}")
async def fhir_patient(
    patient_id: UUID,
    current_user: CurrentUser = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """FHIR R4 Patient resource."""
    result = await db.execute(select(Patient).where(Patient.patient_id == patient_id))
    patient = result.scalar_one_or_none()
    if not patient:
        raise HTTPException(status_code=404, detail="Patient not found")
    return _fhir_patient(patient)


@router.get("/Encounter/{consultation_id}")
async def fhir_encounter(
    consultation_id: UUID,
    current_user: CurrentUser = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """FHIR R4 Encounter resource (consultation)."""
    result = await db.execute(
        select(Consultation).where(Consultation.consultation_id == consultation_id)
    )
    consultation = result.scalar_one_or_none()
    if not consultation:
        raise HTTPException(status_code=404, detail="Encounter not found")
    return _fhir_encounter(consultation)


@router.get("/Condition/{consultation_id}")
async def fhir_conditions(
    consultation_id: UUID,
    current_user: CurrentUser = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """FHIR R4 Conditions (ICD codes from a consultation)."""
    result = await db.execute(
        select(Consultation).where(Consultation.consultation_id == consultation_id)
    )
    consultation = result.scalar_one_or_none()
    if not consultation:
        raise HTTPException(status_code=404, detail="Consultation not found")

    conditions = [
        _fhir_condition(ic, consultation.patient_id, consultation.consultation_id)
        for ic in (consultation.icd_codes or [])
    ]
    return {"resourceType": "Bundle", "type": "searchset", "total": len(conditions), "entry": conditions}


@router.get("/MedicationRequest/{consultation_id}")
async def fhir_medication_requests(
    consultation_id: UUID,
    current_user: CurrentUser = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """FHIR R4 MedicationRequests (prescriptions from a consultation)."""
    result = await db.execute(
        select(Consultation).where(Consultation.consultation_id == consultation_id)
    )
    consultation = result.scalar_one_or_none()
    if not consultation:
        raise HTTPException(status_code=404, detail="Consultation not found")

    meds = [
        _fhir_medication_request(med, consultation.patient_id, consultation.doctor_id, consultation.consultation_id)
        for med in (consultation.prescription or [])
    ]
    return {"resourceType": "Bundle", "type": "searchset", "total": len(meds), "entry": meds}

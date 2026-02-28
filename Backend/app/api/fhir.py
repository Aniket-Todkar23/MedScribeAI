"""
API Routes — FHIR R4 (EMR Integration)
Exposes patient data in HL7 FHIR R4 standard format.
Includes FHIR R4 Bundle export and patient EMR PDF export.
"""

import io
import json
from datetime import datetime, timezone
from typing import Any, Dict, List
from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException
from fastapi.responses import StreamingResponse
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.database import get_db
from app.api.deps import CurrentUser, get_current_user, require_doctor, require_patient
from app.models.user import Patient, Doctor, PatientOnboarding
from app.models.consultation import Consultation
from app.models.appointment import Appointment
from app.models.document import Document

# ReportLab imports for professional PDF generation
from reportlab.lib.pagesizes import A4
from reportlab.lib.units import mm
from reportlab.lib.colors import HexColor, white, black
from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
from reportlab.lib.enums import TA_LEFT, TA_CENTER, TA_RIGHT
from reportlab.platypus import (
    SimpleDocTemplate, Paragraph, Spacer, Table, TableStyle,
    HRFlowable,
)

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


# ── FHIR R4 Bundle Export (Doctor) ───────────────────────────────────────────


def _fhir_observation(consultation: Consultation) -> Dict[str, Any]:
    """Convert Consultation EMR data to a FHIR R4 Observation."""
    soap = consultation.soap_note or {}
    return {
        "resourceType": "Observation",
        "id": f"obs-{consultation.consultation_id}",
        "status": "final" if consultation.status in ("confirmed", "reviewed") else "preliminary",
        "category": [{"coding": [{"system": "http://terminology.hl7.org/CodeSystem/observation-category", "code": "exam", "display": "Exam"}]}],
        "code": {"text": "Clinical Observation"},
        "subject": {"reference": f"Patient/{consultation.patient_id}"},
        "encounter": {"reference": f"Encounter/{consultation.consultation_id}"},
        "effectiveDateTime": consultation.consultation_date.isoformat() if consultation.consultation_date else None,
        "note": [
            {"text": f"Subjective: {soap.get('subjective', '')}"},
            {"text": f"Objective: {soap.get('objective', '')}"},
            {"text": f"Assessment: {soap.get('assessment', '')}"},
            {"text": f"Plan: {soap.get('plan', '')}"},
        ],
    }


def _fhir_practitioner(doctor: Doctor) -> Dict[str, Any]:
    """Convert Doctor ORM to FHIR R4 Practitioner."""
    return {
        "resourceType": "Practitioner",
        "id": str(doctor.doctor_id),
        "active": doctor.is_active,
        "name": [{"use": "official", "text": doctor.full_name}],
        "telecom": [
            {"system": "email", "value": doctor.email},
            *([{"system": "phone", "value": doctor.phone}] if doctor.phone else []),
        ],
        "qualification": [
            {
                "code": {"text": doctor.specialization or "General Practice"},
                "identifier": [{"value": doctor.license_number}] if doctor.license_number else [],
            }
        ],
    }


@router.get("/Bundle/consultation/{consultation_id}")
async def fhir_consultation_bundle(
    consultation_id: UUID,
    current_user: CurrentUser = Depends(require_doctor),
    db: AsyncSession = Depends(get_db),
):
    """
    Export a complete FHIR R4 Bundle for a specific consultation (observation).
    Includes: Patient, Practitioner, Encounter, Observation, Conditions, MedicationRequests.
    For import into external EMR systems.
    """
    result = await db.execute(
        select(Consultation).where(Consultation.consultation_id == consultation_id)
    )
    consultation = result.scalar_one_or_none()
    if not consultation:
        raise HTTPException(status_code=404, detail="Consultation not found")
    if consultation.doctor_id != current_user.user_id:
        raise HTTPException(status_code=403, detail="Not your consultation")

    # Load patient & doctor
    pat_result = await db.execute(select(Patient).where(Patient.patient_id == consultation.patient_id))
    patient = pat_result.scalar_one_or_none()
    doc_result = await db.execute(select(Doctor).where(Doctor.doctor_id == consultation.doctor_id))
    doctor = doc_result.scalar_one_or_none()

    entries: List[Dict[str, Any]] = []

    # Patient resource
    if patient:
        entries.append({
            "fullUrl": f"urn:uuid:{patient.patient_id}",
            "resource": _fhir_patient(patient),
        })

    # Practitioner resource
    if doctor:
        entries.append({
            "fullUrl": f"urn:uuid:{doctor.doctor_id}",
            "resource": _fhir_practitioner(doctor),
        })

    # Encounter resource
    entries.append({
        "fullUrl": f"urn:uuid:{consultation.consultation_id}",
        "resource": _fhir_encounter(consultation),
    })

    # Observation resource
    entries.append({
        "fullUrl": f"urn:uuid:obs-{consultation.consultation_id}",
        "resource": _fhir_observation(consultation),
    })

    # Condition resources
    for ic in (consultation.icd_codes or []):
        entries.append({
            "fullUrl": f"urn:uuid:{consultation.consultation_id}-{ic.get('code', 'unknown')}",
            "resource": _fhir_condition(ic, consultation.patient_id, consultation.consultation_id),
        })

    # MedicationRequest resources
    for med in (consultation.prescription or []):
        entries.append({
            "fullUrl": f"urn:uuid:{consultation.consultation_id}-{med.get('drug', 'unknown').replace(' ', '-').lower()}",
            "resource": _fhir_medication_request(med, consultation.patient_id, consultation.doctor_id, consultation.consultation_id),
        })

    bundle = {
        "resourceType": "Bundle",
        "id": f"bundle-{consultation_id}",
        "type": "document",
        "timestamp": datetime.now(timezone.utc).isoformat(),
        "total": len(entries),
        "entry": entries,
    }
    return bundle


@router.get("/Bundle/consultation/{consultation_id}/download")
async def download_fhir_bundle(
    consultation_id: UUID,
    current_user: CurrentUser = Depends(require_doctor),
    db: AsyncSession = Depends(get_db),
):
    """Download FHIR R4 Bundle as a JSON file for EMR import."""
    bundle = await fhir_consultation_bundle(consultation_id, current_user, db)
    content = json.dumps(bundle, indent=2, default=str)
    return StreamingResponse(
        io.BytesIO(content.encode()),
        media_type="application/fhir+json",
        headers={"Content-Disposition": f'attachment; filename="fhir_bundle_{consultation_id}.json"'},
    )


# ── Patient EMR PDF Export ────────────────────────────────────────────────────


# ── Color palette for professional PDF ──
_PRIMARY     = HexColor("#1a56db")   # Deep blue
_PRIMARY_LT  = HexColor("#e1effe")   # Light blue bg
_ACCENT      = HexColor("#047857")   # Emerald
_ACCENT_LT   = HexColor("#d1fae5")   # Light emerald bg
_HEADER_BG   = HexColor("#1e3a5f")   # Dark navy header
_SUBHEADER   = HexColor("#374151")   # Gray-700
_TEXT         = HexColor("#1f2937")   # Gray-800
_MUTED       = HexColor("#6b7280")   # Gray-500
_BORDER      = HexColor("#d1d5db")   # Gray-300
_WARN_BG     = HexColor("#fef3c7")   # Yellow-100
_WARN        = HexColor("#92400e")   # Yellow-800
_WHITE       = white
_BLACK       = black
_TABLE_HDR   = HexColor("#1e40af")   # Blue-800
_TABLE_ALT   = HexColor("#f0f4ff")   # Blue-50 alternating rows
_RX_HDR      = HexColor("#065f46")   # Emerald-800
_RX_ALT      = HexColor("#ecfdf5")   # Emerald-50


def _pdf_styles():
    """Build custom paragraph styles for the EMR PDF."""
    base = getSampleStyleSheet()
    styles = {
        "title": ParagraphStyle(
            "emr_title", parent=base["Heading1"],
            fontName="Helvetica-Bold", fontSize=22, textColor=_WHITE,
            spaceAfter=4, alignment=TA_LEFT,
        ),
        "subtitle": ParagraphStyle(
            "emr_subtitle", parent=base["Normal"],
            fontName="Helvetica", fontSize=10, textColor=HexColor("#93c5fd"),
            spaceAfter=0,
        ),
        "section": ParagraphStyle(
            "emr_section", parent=base["Heading2"],
            fontName="Helvetica-Bold", fontSize=13, textColor=_PRIMARY,
            spaceBefore=14, spaceAfter=6,
            borderPadding=(0, 0, 2, 0),
        ),
        "body": ParagraphStyle(
            "emr_body", parent=base["Normal"],
            fontName="Helvetica", fontSize=9.5, textColor=_TEXT,
            leading=13, spaceAfter=4,
        ),
        "label": ParagraphStyle(
            "emr_label", parent=base["Normal"],
            fontName="Helvetica-Bold", fontSize=9, textColor=_MUTED,
        ),
        "value": ParagraphStyle(
            "emr_value", parent=base["Normal"],
            fontName="Helvetica", fontSize=9.5, textColor=_TEXT,
        ),
        "table_header": ParagraphStyle(
            "emr_th", parent=base["Normal"],
            fontName="Helvetica-Bold", fontSize=8.5, textColor=_WHITE,
        ),
        "table_cell": ParagraphStyle(
            "emr_td", parent=base["Normal"],
            fontName="Helvetica", fontSize=8.5, textColor=_TEXT,
            leading=12,
        ),
        "footer": ParagraphStyle(
            "emr_footer", parent=base["Normal"],
            fontName="Helvetica", fontSize=7, textColor=_MUTED,
            alignment=TA_CENTER,
        ),
        "soap_label": ParagraphStyle(
            "soap_lbl", parent=base["Normal"],
            fontName="Helvetica-Bold", fontSize=9, textColor=_PRIMARY,
        ),
        "soap_text": ParagraphStyle(
            "soap_txt", parent=base["Normal"],
            fontName="Helvetica", fontSize=9, textColor=_TEXT, leading=12,
        ),
        "warn": ParagraphStyle(
            "emr_warn", parent=base["Normal"],
            fontName="Helvetica-BoldOblique", fontSize=8, textColor=_WARN,
        ),
    }
    return styles


def _header_footer(canvas, doc):
    """Draw page header bar and footer on every page."""
    width, height = A4
    # Header bar
    canvas.saveState()
    canvas.setFillColor(_HEADER_BG)
    canvas.rect(0, height - 50, width, 50, fill=1, stroke=0)
    canvas.setFont("Helvetica-Bold", 14)
    canvas.setFillColor(_WHITE)
    canvas.drawString(28, height - 33, "Smart EMR")
    canvas.setFont("Helvetica", 8)
    canvas.setFillColor(HexColor("#93c5fd"))
    canvas.drawString(28, height - 45, "Patient Health Record")
    # Right side: date
    canvas.setFont("Helvetica", 8)
    canvas.setFillColor(HexColor("#93c5fd"))
    canvas.drawRightString(width - 28, height - 33, datetime.now(timezone.utc).strftime("%B %d, %Y"))
    canvas.drawRightString(width - 28, height - 45, f"Page {doc.page}")
    canvas.restoreState()

    # Footer
    canvas.saveState()
    canvas.setFillColor(_BORDER)
    canvas.rect(0, 0, width, 28, fill=1, stroke=0)
    canvas.setFont("Helvetica", 6.5)
    canvas.setFillColor(_MUTED)
    canvas.drawCentredString(width / 2, 10, "This document was generated by Smart EMR and is intended for informational purposes. Always consult your healthcare provider for medical advice.")
    canvas.restoreState()


def _build_emr_pdf(patient, onboarding, consultations: list, documents: list) -> bytes:
    """Build a professional, color-coded PDF EMR record."""
    buf = io.BytesIO()
    doc = SimpleDocTemplate(
        buf, pagesize=A4,
        leftMargin=24 * mm, rightMargin=24 * mm,
        topMargin=60, bottomMargin=40,
    )
    st = _pdf_styles()
    story: List[Any] = []

    usable_width = A4[0] - doc.leftMargin - doc.rightMargin

    # ─── Patient Information ─────────────────────────────────────────────
    story.append(Paragraph("Patient Information", st["section"]))
    story.append(HRFlowable(width="100%", thickness=1, color=_PRIMARY, spaceAfter=6))

    demo_data = [
        ["Full Name", patient.full_name, "Email", patient.email],
        ["Phone", patient.phone or "N/A", "Date of Birth", str(patient.date_of_birth) if patient.date_of_birth else "N/A"],
        ["Gender", (patient.gender or "N/A").capitalize(), "Blood Group", patient.blood_group or "N/A"],
        ["Address", patient.address or "N/A", "Emergency Contact", patient.emergency_contact or "N/A"],
    ]

    # Build table with label/value pairs
    tbl_data = []
    for row in demo_data:
        tbl_data.append([
            Paragraph(row[0], st["label"]),
            Paragraph(str(row[1]), st["value"]),
            Paragraph(row[2], st["label"]),
            Paragraph(str(row[3]), st["value"]),
        ])

    col_w = [usable_width * 0.18, usable_width * 0.32, usable_width * 0.18, usable_width * 0.32]
    t = Table(tbl_data, colWidths=col_w, hAlign="LEFT")
    t.setStyle(TableStyle([
        ("BACKGROUND", (0, 0), (-1, -1), _PRIMARY_LT),
        ("BOX", (0, 0), (-1, -1), 0.5, _BORDER),
        ("INNERGRID", (0, 0), (-1, -1), 0.25, _BORDER),
        ("VALIGN", (0, 0), (-1, -1), "MIDDLE"),
        ("TOPPADDING", (0, 0), (-1, -1), 5),
        ("BOTTOMPADDING", (0, 0), (-1, -1), 5),
        ("LEFTPADDING", (0, 0), (-1, -1), 6),
    ]))
    story.append(t)
    story.append(Spacer(1, 10))

    # ─── Medical History ─────────────────────────────────────────────────
    if onboarding:
        story.append(Paragraph("Medical History", st["section"]))
        story.append(HRFlowable(width="100%", thickness=1, color=_PRIMARY, spaceAfter=6))

        history_rows = []
        if onboarding.has_diabetes:
            history_rows.append(["Diabetes", f"{onboarding.diabetes_type or 'Yes'} — Insulin: {'Yes' if onboarding.on_insulin else 'No'}"])
        if onboarding.has_heart_disease and onboarding.heart_conditions:
            conds = ', '.join(onboarding.heart_conditions) if isinstance(onboarding.heart_conditions, list) else str(onboarding.heart_conditions)
            history_rows.append(["Heart Disease", conds])
        if onboarding.has_lung_disease and onboarding.lung_conditions:
            conds = ', '.join(onboarding.lung_conditions) if isinstance(onboarding.lung_conditions, list) else str(onboarding.lung_conditions)
            history_rows.append(["Lung Disease", conds])
        if onboarding.taking_medications and onboarding.medications_list:
            history_rows.append(["Current Medications", str(onboarding.medications_list)])
        if onboarding.has_allergies and onboarding.allergies_list:
            history_rows.append(["Allergies", str(onboarding.allergies_list)])
        history_rows.append(["Smoking Status", onboarding.smoking_status or "N/A"])
        if getattr(onboarding, "alcohol_use", None):
            history_rows.append(["Alcohol Use", onboarding.alcohol_use])
        if onboarding.had_major_surgeries and onboarding.surgeries_details:
            history_rows.append(["Past Surgeries", str(onboarding.surgeries_details)])
        if onboarding.no_medical_conditions:
            history_rows.append(["Status", "No significant medical conditions reported."])

        if history_rows:
            tbl = [[Paragraph(r[0], st["label"]), Paragraph(r[1], st["value"])] for r in history_rows]
            ht = Table(tbl, colWidths=[usable_width * 0.28, usable_width * 0.72], hAlign="LEFT")
            ht.setStyle(TableStyle([
                ("BACKGROUND", (0, 0), (0, -1), _ACCENT_LT),
                ("BACKGROUND", (1, 0), (1, -1), _WHITE),
                ("BOX", (0, 0), (-1, -1), 0.5, _BORDER),
                ("INNERGRID", (0, 0), (-1, -1), 0.25, _BORDER),
                ("VALIGN", (0, 0), (-1, -1), "TOP"),
                ("TOPPADDING", (0, 0), (-1, -1), 4),
                ("BOTTOMPADDING", (0, 0), (-1, -1), 4),
                ("LEFTPADDING", (0, 0), (-1, -1), 6),
            ]))

            # Highlight allergies row in warning color
            for i, r in enumerate(history_rows):
                if r[0] == "Allergies":
                    ht.setStyle(TableStyle([
                        ("BACKGROUND", (0, i), (-1, i), _WARN_BG),
                    ]))
            story.append(ht)
        story.append(Spacer(1, 10))

    # ─── Consultation Records ────────────────────────────────────────────
    if consultations:
        story.append(Paragraph(f"Consultation Records ({len(consultations)})", st["section"]))
        story.append(HRFlowable(width="100%", thickness=1, color=_PRIMARY, spaceAfter=6))

        for idx, c in enumerate(consultations, 1):
            # Consultation sub-header
            date_str = c.consultation_date.strftime("%B %d, %Y") if c.consultation_date else "N/A"
            status_display = (c.status or "unknown").capitalize()
            status_color = _ACCENT if c.status in ("confirmed", "reviewed") else _WARN

            con_header = Table(
                [[
                    Paragraph(f"<b>Consultation #{idx}</b>  —  {date_str}", st["body"]),
                    Paragraph(f"<font color='{status_color}'><b>{status_display}</b></font>", ParagraphStyle("st_r", parent=st["body"], alignment=TA_RIGHT)),
                ]],
                colWidths=[usable_width * 0.65, usable_width * 0.35],
                hAlign="LEFT",
            )
            con_header.setStyle(TableStyle([
                ("BACKGROUND", (0, 0), (-1, -1), HexColor("#f3f4f6")),
                ("BOX", (0, 0), (-1, -1), 0.5, _BORDER),
                ("TOPPADDING", (0, 0), (-1, -1), 5),
                ("BOTTOMPADDING", (0, 0), (-1, -1), 5),
                ("LEFTPADDING", (0, 0), (-1, -1), 8),
                ("RIGHTPADDING", (0, 0), (-1, -1), 8),
            ]))
            story.append(con_header)
            story.append(Spacer(1, 4))

            # SOAP Note
            soap = c.soap_note or {}
            if any(soap.values()):
                soap_items: List[Any] = []
                soap_colors = {
                    "subjective": HexColor("#dbeafe"),
                    "objective": HexColor("#d1fae5"),
                    "assessment": HexColor("#fef3c7"),
                    "plan": HexColor("#ede9fe"),
                }
                soap_label_colors = {
                    "subjective": HexColor("#1e40af"),
                    "objective": HexColor("#065f46"),
                    "assessment": HexColor("#92400e"),
                    "plan": HexColor("#5b21b6"),
                }
                for key in ("subjective", "objective", "assessment", "plan"):
                    val = soap.get(key, "")
                    if val:
                        lbl_style = ParagraphStyle(f"soap_l_{key}", parent=st["soap_label"], textColor=soap_label_colors[key])
                        soap_items.append([
                            Paragraph(key.upper()[0], lbl_style),
                            Paragraph(f"<b>{key.capitalize()}</b>", lbl_style),
                            Paragraph(str(val), st["soap_text"]),
                        ])

                if soap_items:
                    soap_tbl = Table(soap_items, colWidths=[usable_width * 0.04, usable_width * 0.14, usable_width * 0.82], hAlign="LEFT")
                    style_cmds: list = [
                        ("BOX", (0, 0), (-1, -1), 0.5, _BORDER),
                        ("INNERGRID", (0, 0), (-1, -1), 0.25, _BORDER),
                        ("VALIGN", (0, 0), (-1, -1), "TOP"),
                        ("TOPPADDING", (0, 0), (-1, -1), 5),
                        ("BOTTOMPADDING", (0, 0), (-1, -1), 5),
                        ("LEFTPADDING", (0, 0), (-1, -1), 5),
                    ]
                    soap_keys = [k for k in ("subjective", "objective", "assessment", "plan") if soap.get(k)]
                    for i, k in enumerate(soap_keys):
                        style_cmds.append(("BACKGROUND", (0, i), (0, i), soap_colors[k]))
                        style_cmds.append(("BACKGROUND", (1, i), (1, i), soap_colors[k]))
                    soap_tbl.setStyle(TableStyle(style_cmds))
                    story.append(soap_tbl)
                    story.append(Spacer(1, 4))

            # ICD Codes
            if c.icd_codes:
                icd_tbl_data = [[
                    Paragraph("Code", st["table_header"]),
                    Paragraph("Description", st["table_header"]),
                    Paragraph("Version", st["table_header"]),
                ]]
                for ic in c.icd_codes:
                    icd_tbl_data.append([
                        Paragraph(ic.get("code", ""), st["table_cell"]),
                        Paragraph(ic.get("description", ""), st["table_cell"]),
                        Paragraph(f"ICD-{ic.get('version', 10)}", st["table_cell"]),
                    ])
                icd_t = Table(icd_tbl_data, colWidths=[usable_width * 0.18, usable_width * 0.65, usable_width * 0.17], hAlign="LEFT")
                icd_style: list = [
                    ("BACKGROUND", (0, 0), (-1, 0), _TABLE_HDR),
                    ("BOX", (0, 0), (-1, -1), 0.5, _BORDER),
                    ("INNERGRID", (0, 0), (-1, -1), 0.25, _BORDER),
                    ("VALIGN", (0, 0), (-1, -1), "MIDDLE"),
                    ("TOPPADDING", (0, 0), (-1, -1), 4),
                    ("BOTTOMPADDING", (0, 0), (-1, -1), 4),
                    ("LEFTPADDING", (0, 0), (-1, -1), 5),
                ]
                for i in range(1, len(icd_tbl_data)):
                    if i % 2 == 0:
                        icd_style.append(("BACKGROUND", (0, i), (-1, i), _TABLE_ALT))
                icd_t.setStyle(TableStyle(icd_style))
                story.append(Paragraph("<b>Diagnoses</b>", ParagraphStyle("dx_hdr", parent=st["body"], textColor=_TABLE_HDR, fontSize=9)))
                story.append(icd_t)
                story.append(Spacer(1, 4))

            # Prescription
            if c.prescription:
                rx_tbl_data = [[
                    Paragraph("Medication", st["table_header"]),
                    Paragraph("Dose", st["table_header"]),
                    Paragraph("Frequency", st["table_header"]),
                    Paragraph("Duration", st["table_header"]),
                    Paragraph("Notes", st["table_header"]),
                ]]
                for rx in c.prescription:
                    rx_tbl_data.append([
                        Paragraph(rx.get("drug", ""), st["table_cell"]),
                        Paragraph(rx.get("dose", ""), st["table_cell"]),
                        Paragraph(rx.get("frequency", ""), st["table_cell"]),
                        Paragraph(rx.get("duration", ""), st["table_cell"]),
                        Paragraph(rx.get("notes", ""), st["table_cell"]),
                    ])
                rx_t = Table(
                    rx_tbl_data,
                    colWidths=[usable_width * 0.24, usable_width * 0.14, usable_width * 0.18, usable_width * 0.16, usable_width * 0.28],
                    hAlign="LEFT",
                )
                rx_style: list = [
                    ("BACKGROUND", (0, 0), (-1, 0), _RX_HDR),
                    ("BOX", (0, 0), (-1, -1), 0.5, _BORDER),
                    ("INNERGRID", (0, 0), (-1, -1), 0.25, _BORDER),
                    ("VALIGN", (0, 0), (-1, -1), "MIDDLE"),
                    ("TOPPADDING", (0, 0), (-1, -1), 4),
                    ("BOTTOMPADDING", (0, 0), (-1, -1), 4),
                    ("LEFTPADDING", (0, 0), (-1, -1), 5),
                ]
                for i in range(1, len(rx_tbl_data)):
                    if i % 2 == 0:
                        rx_style.append(("BACKGROUND", (0, i), (-1, i), _RX_ALT))
                rx_t.setStyle(TableStyle(rx_style))
                story.append(Paragraph("<b>Prescription</b>", ParagraphStyle("rx_hdr", parent=st["body"], textColor=_RX_HDR, fontSize=9)))
                story.append(rx_t)
                story.append(Spacer(1, 4))

            # Patient Summary
            if c.patient_summary:
                summary_tbl = Table(
                    [[Paragraph(f"<b>Patient Summary:</b> {c.patient_summary}", st["body"])]],
                    colWidths=[usable_width],
                    hAlign="LEFT",
                )
                summary_tbl.setStyle(TableStyle([
                    ("BACKGROUND", (0, 0), (-1, -1), HexColor("#eff6ff")),
                    ("BOX", (0, 0), (-1, -1), 0.5, _PRIMARY),
                    ("TOPPADDING", (0, 0), (-1, -1), 6),
                    ("BOTTOMPADDING", (0, 0), (-1, -1), 6),
                    ("LEFTPADDING", (0, 0), (-1, -1), 8),
                ]))
                story.append(summary_tbl)

            story.append(Spacer(1, 12))

    # ─── Documents ───────────────────────────────────────────────────────
    if documents:
        story.append(Paragraph(f"Documents ({len(documents)})", st["section"]))
        story.append(HRFlowable(width="100%", thickness=1, color=_PRIMARY, spaceAfter=6))

        doc_tbl_data = [[
            Paragraph("Document", st["table_header"]),
            Paragraph("Type", st["table_header"]),
            Paragraph("Uploaded", st["table_header"]),
            Paragraph("Notes / Key Findings", st["table_header"]),
        ]]
        for d in documents:
            notes_parts = []
            if d.notes:
                notes_parts.append(d.notes)
            analysis = d.analysis_result or {}
            if analysis.get("analysis_status") == "completed":
                pr = analysis.get("patient_report") or {}
                ps = pr.get("patient_summary") or {}
                if isinstance(ps, dict):
                    if ps.get("key_results"):
                        notes_parts.append(f"Key: {ps['key_results']}")
                    if ps.get("what_needs_attention"):
                        notes_parts.append(f"Attention: {ps['what_needs_attention']}")
                elif isinstance(analysis, dict) and analysis.get("summary"):
                    notes_parts.append(analysis["summary"])

            doc_tbl_data.append([
                Paragraph(d.document_name or "Untitled", st["table_cell"]),
                Paragraph((d.document_type or "unknown").capitalize(), st["table_cell"]),
                Paragraph(d.uploaded_at.strftime("%Y-%m-%d") if d.uploaded_at else "N/A", st["table_cell"]),
                Paragraph("; ".join(notes_parts) if notes_parts else "—", st["table_cell"]),
            ])

        dt = Table(doc_tbl_data, colWidths=[usable_width * 0.25, usable_width * 0.14, usable_width * 0.14, usable_width * 0.47], hAlign="LEFT")
        doc_style: list = [
            ("BACKGROUND", (0, 0), (-1, 0), _TABLE_HDR),
            ("BOX", (0, 0), (-1, -1), 0.5, _BORDER),
            ("INNERGRID", (0, 0), (-1, -1), 0.25, _BORDER),
            ("VALIGN", (0, 0), (-1, -1), "TOP"),
            ("TOPPADDING", (0, 0), (-1, -1), 4),
            ("BOTTOMPADDING", (0, 0), (-1, -1), 4),
            ("LEFTPADDING", (0, 0), (-1, -1), 5),
        ]
        for i in range(1, len(doc_tbl_data)):
            if i % 2 == 0:
                doc_style.append(("BACKGROUND", (0, i), (-1, i), _TABLE_ALT))
        dt.setStyle(TableStyle(doc_style))
        story.append(dt)

    # Build PDF
    doc.build(story, onFirstPage=_header_footer, onLaterPages=_header_footer)
    return buf.getvalue()


@router.get("/export/patient-emr")
async def export_patient_emr_pdf(
    current_user: CurrentUser = Depends(require_patient),
    db: AsyncSession = Depends(get_db),
):
    """
    Export the patient's complete EMR as a professional PDF.
    Includes: demographics, medical history, consultations, prescriptions, documents.
    """
    patient_id = current_user.user_id

    # Load all data
    pat_result = await db.execute(select(Patient).where(Patient.patient_id == patient_id))
    patient = pat_result.scalar_one_or_none()
    if not patient:
        raise HTTPException(status_code=404, detail="Patient not found")

    ob_result = await db.execute(select(PatientOnboarding).where(PatientOnboarding.patient_id == patient_id))
    onboarding = ob_result.scalar_one_or_none()

    cons_result = await db.execute(
        select(Consultation).where(Consultation.patient_id == patient_id).order_by(Consultation.consultation_date.desc())
    )
    consultations_list = cons_result.scalars().all()

    docs_result = await db.execute(
        select(Document).where(Document.patient_id == patient_id).order_by(Document.uploaded_at.desc())
    )
    documents_list = docs_result.scalars().all()

    pdf_bytes = _build_emr_pdf(patient, onboarding, consultations_list, documents_list)

    return StreamingResponse(
        io.BytesIO(pdf_bytes),
        media_type="application/pdf",
        headers={
            "Content-Disposition": f'attachment; filename="EMR_{patient.full_name.replace(" ", "_")}_{datetime.now().strftime("%Y%m%d")}.pdf"'
        },
    )

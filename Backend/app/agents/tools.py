"""
LangGraph Agent — Tools for database queries and AI calls
These tools are used by both patient and clinician agents.
"""

import logging
from typing import Any, Dict, List, Optional
from uuid import UUID

from langchain_core.tools import tool
from sqlalchemy import select, text
from sqlalchemy.ext.asyncio import AsyncSession

logger = logging.getLogger(__name__)


# ── Tool factory — creates tools with DB session injected ─────────────────────

def create_patient_tools(db: AsyncSession, patient_id: UUID):
    """Create tools scoped to a specific patient."""

    @tool
    async def get_my_health_summary() -> str:
        """Get a comprehensive health summary for the patient including consultations, conditions, and medications."""
        result = await db.execute(
            text("""
                SELECT c.consultation_date, c.soap_note, c.icd_codes, c.prescription, c.patient_summary
                FROM consultations c
                WHERE c.patient_id = :pid
                ORDER BY c.consultation_date DESC
                LIMIT 10
            """),
            {"pid": str(patient_id)},
        )
        rows = result.fetchall()
        if not rows:
            return "No consultation records found. You haven't had any consultations yet."

        summary_parts = []
        for row in rows:
            date_str = row[0].strftime("%Y-%m-%d") if row[0] else "Unknown"
            soap = row[1] or {}
            codes = row[2] or []
            meds = row[3] or []
            patient_sum = row[4] or ""

            part = f"**Consultation on {date_str}:**\n"
            if soap.get("assessment"):
                part += f"- Assessment: {soap['assessment']}\n"
            if codes:
                part += f"- Conditions: {', '.join(c.get('description', c.get('code', '')) for c in codes)}\n"
            if meds:
                part += f"- Medications: {', '.join(m.get('drug', '') for m in meds)}\n"
            if patient_sum:
                part += f"- Summary: {patient_sum[:200]}\n"
            summary_parts.append(part)

        return "\n".join(summary_parts)

    @tool
    async def get_my_appointments() -> str:
        """Get upcoming and recent appointments for the patient."""
        result = await db.execute(
            text("""
                SELECT a.appointment_date, a.status, a.appointment_type, a.reason,
                       d.full_name as doctor_name, d.specialization
                FROM appointments a
                JOIN doctors d ON d.doctor_id = a.doctor_id
                WHERE a.patient_id = :pid
                ORDER BY a.appointment_date DESC
                LIMIT 10
            """),
            {"pid": str(patient_id)},
        )
        rows = result.fetchall()
        if not rows:
            return "No appointments found."

        lines = []
        for row in rows:
            date_str = row[0].strftime("%Y-%m-%d %H:%M") if row[0] else "TBD"
            lines.append(
                f"- {date_str} | {row[1]} | {row[2]} | Dr. {row[4]} ({row[5] or 'General'}) | Reason: {row[3] or 'N/A'}"
            )
        return "Your appointments:\n" + "\n".join(lines)

    @tool
    async def get_my_prescriptions() -> str:
        """Get active prescriptions and medications for the patient."""
        result = await db.execute(
            text("""
                SELECT c.prescription, c.consultation_date, d.full_name
                FROM consultations c
                JOIN doctors d ON d.doctor_id = c.doctor_id
                WHERE c.patient_id = :pid AND c.prescription IS NOT NULL AND c.prescription != '[]'::jsonb
                ORDER BY c.consultation_date DESC
                LIMIT 5
            """),
            {"pid": str(patient_id)},
        )
        rows = result.fetchall()
        if not rows:
            return "No prescriptions found in your records."

        lines = []
        for row in rows:
            meds = row[0] or []
            date_str = row[1].strftime("%Y-%m-%d") if row[1] else "Unknown"
            for med in meds:
                lines.append(
                    f"- {med.get('drug', 'Unknown')} {med.get('dose', '')} | {med.get('frequency', '')} | {med.get('duration', '')} | Prescribed by Dr. {row[2]} on {date_str}"
                )
        return "Your medications:\n" + "\n".join(lines)

    @tool
    async def get_my_documents() -> str:
        """Get uploaded documents and their AI analysis summaries for the patient."""
        result = await db.execute(
            text("""
                SELECT document_name, document_type, uploaded_at, analysis_result
                FROM documents
                WHERE patient_id = :pid
                ORDER BY uploaded_at DESC
                LIMIT 10
            """),
            {"pid": str(patient_id)},
        )
        rows = result.fetchall()
        if not rows:
            return "No documents found."

        lines = []
        for row in rows:
            date_str = row[2].strftime("%Y-%m-%d") if row[2] else "Unknown"
            analysis = row[3] or {}
            summary = ""
            if isinstance(analysis, dict):
                summary = analysis.get("patient_summary", {})
                if isinstance(summary, dict):
                    summary = summary.get("key_results", "")
                elif not isinstance(summary, str):
                    summary = ""
            lines.append(f"- {row[0]} ({row[1] or 'other'}) uploaded {date_str}: {summary[:100]}")
        return "Your documents:\n" + "\n".join(lines)

    @tool
    async def explain_medical_term(term: str) -> str:
        """Explain a medical term in simple, patient-friendly language."""
        # This is handled by the LLM itself — the tool just signals intent
        return f"EXPLAIN_TERM: {term}"

    return [get_my_health_summary, get_my_appointments, get_my_prescriptions, get_my_documents, explain_medical_term]


def create_clinician_tools(db: AsyncSession, doctor_id: UUID):
    """Create tools scoped to a clinician with access to their patients."""

    @tool
    async def get_patient_history(patient_id: str) -> str:
        """Get complete medical history for a specific patient including consultations, documents, and onboarding."""
        result = await db.execute(
            text("""
                SELECT p.full_name, p.date_of_birth, p.gender, p.blood_group,
                       po.has_diabetes, po.diabetes_type, po.has_heart_disease,
                       po.heart_conditions, po.has_lung_disease, po.lung_conditions,
                       po.taking_medications, po.medications_list,
                       po.has_allergies, po.allergies_list, po.smoking_status, po.alcohol_use,
                       po.had_major_surgeries, po.surgeries_details
                FROM patients p
                LEFT JOIN patient_onboarding po ON po.patient_id = p.patient_id
                WHERE p.patient_id = :pid
            """),
            {"pid": patient_id},
        )
        row = result.fetchone()
        if not row:
            return f"Patient {patient_id} not found."

        history = f"**Patient: {row[0]}**\n"
        history += f"DOB: {row[1]}, Gender: {row[2]}, Blood Group: {row[3]}\n"

        if row[4]:
            history += f"Diabetes: {row[5] or 'Yes'}\n"
        if row[6]:
            history += f"Heart Disease: {row[7]}\n"
        if row[8]:
            history += f"Lung Disease: {row[9]}\n"
        if row[10]:
            history += f"Current Medications: {row[11]}\n"
        if row[12]:
            history += f"Allergies: {row[13]}\n"
        history += f"Smoking: {row[14] or 'N/A'}, Alcohol: {row[15] or 'N/A'}\n"
        if row[16]:
            history += f"Surgeries: {row[17]}\n"

        # Recent consultations
        cons = await db.execute(
            text("""
                SELECT consultation_date, soap_note, icd_codes, prescription, patient_summary
                FROM consultations
                WHERE patient_id = :pid
                ORDER BY consultation_date DESC
                LIMIT 5
            """),
            {"pid": patient_id},
        )
        for c in cons.fetchall():
            date_str = c[0].strftime("%Y-%m-%d") if c[0] else "Unknown"
            soap = c[1] or {}
            history += f"\n**Consultation {date_str}:**\n"
            if soap.get("assessment"):
                history += f"  Assessment: {soap['assessment']}\n"
            if c[2]:
                history += f"  ICD Codes: {', '.join(i.get('code', '') + ' - ' + i.get('description', '') for i in c[2])}\n"

        return history

    @tool
    async def get_patient_overview(patient_id: str) -> str:
        """Get a concise clinical overview of a patient — conditions, meds, recent visits."""
        result = await db.execute(
            text("""
                SELECT p.full_name, p.date_of_birth, p.gender,
                    (SELECT COUNT(*) FROM consultations WHERE patient_id = :pid) as visit_count,
                    (SELECT consultation_date FROM consultations WHERE patient_id = :pid ORDER BY consultation_date DESC LIMIT 1) as last_visit
                FROM patients p WHERE p.patient_id = :pid
            """),
            {"pid": patient_id},
        )
        row = result.fetchone()
        if not row:
            return "Patient not found."

        return f"**{row[0]}** | DOB: {row[1]} | Gender: {row[2]} | Total visits: {row[3]} | Last visit: {row[4] or 'Never'}"

    @tool
    async def search_icd_codes(query: str) -> str:
        """Search for ICD-9/ICD-10 codes matching a diagnosis or symptom description."""
        from app.services.ai_service import icd_lookup
        try:
            result = await icd_lookup(query)
            if result.get("success") and result.get("results"):
                lines = [f"- {r['code']}: {r['title']} (ICD-{r.get('version', 10)})" for r in result["results"][:5]]
                return "ICD Codes found:\n" + "\n".join(lines)
            return "No ICD codes found for that query."
        except Exception as e:
            return f"ICD lookup failed: {e}"

    @tool
    async def get_patient_documents(patient_id: str) -> str:
        """Get all documents for a patient with AI analysis summaries."""
        result = await db.execute(
            text("""
                SELECT document_name, document_type, uploaded_at, analysis_result
                FROM documents WHERE patient_id = :pid
                ORDER BY uploaded_at DESC LIMIT 10
            """),
            {"pid": patient_id},
        )
        rows = result.fetchall()
        if not rows:
            return "No documents found for this patient."

        lines = []
        for row in rows:
            date_str = row[2].strftime("%Y-%m-%d") if row[2] else "Unknown"
            lines.append(f"- {row[0]} ({row[1] or 'other'}) uploaded {date_str}")
        return "Patient documents:\n" + "\n".join(lines)

    return [get_patient_history, get_patient_overview, search_icd_codes, get_patient_documents]

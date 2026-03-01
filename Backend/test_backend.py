"""
MedScribe AI Backend — Comprehensive Test Script
================================================
Tests ALL backend endpoints including AI core service proxied routes.

Usage:
    pip install httpx      (if not already installed)
    python test_backend.py

Prerequisites:
    - Server running on http://localhost:3001  (docker compose up)
    - AI Core running on http://localhost:8000  (via docker compose)
    - PostgreSQL running on localhost:5433      (via docker compose)

Environment variables (optional overrides):
    BASE_URL        default http://localhost:3001
    AI_CORE_URL     default http://localhost:8000
"""

import asyncio
import json
import os
import sys
import time
from datetime import datetime, timedelta, timezone
from pathlib import Path
from typing import Any, Dict, Optional
from uuid import uuid4

import httpx

# ── Configuration ─────────────────────────────────────────────────────────────

BASE_URL = os.getenv("BASE_URL", "http://localhost:3001")
AI_CORE_URL = os.getenv("AI_CORE_URL", "http://localhost:8000")
API = f"{BASE_URL}/api/v1"

TIMEOUT = httpx.Timeout(300.0, connect=30.0)  # generous for AI calls (Modal cold start)

# Test user credentials
DOCTOR_EMAIL = f"testdoc_{uuid4().hex[:6]}@medscribe.dev"
PATIENT_EMAIL = f"testpat_{uuid4().hex[:6]}@medscribe.dev"
PASSWORD = "test1234"

# ── State ─────────────────────────────────────────────────────────────────────

state: Dict[str, Any] = {
    "doctor_token": "",
    "patient_token": "",
    "doctor_refresh": "",
    "patient_refresh": "",
    "doctor_id": "",
    "patient_id": "",
    "appointment_id": "",
    "consultation_id": "",
    "document_id": "",
    "session_id_patient": "",
    "session_id_doctor": "",
}

# ── Helpers ───────────────────────────────────────────────────────────────────

passed = 0
failed = 0
skipped = 0
errors = []


# Force UTF-8 stdout on Windows
import io
if sys.platform == 'win32':
    sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding='utf-8', errors='replace')
    sys.stderr = io.TextIOWrapper(sys.stderr.buffer, encoding='utf-8', errors='replace')


def green(s):
    return f"\033[92m{s}\033[0m"

def red(s):
    return f"\033[91m{s}\033[0m"

def yellow(s):
    return f"\033[93m{s}\033[0m"

def cyan(s):
    return f"\033[96m{s}\033[0m"


def check(
    test_name: str,
    response: httpx.Response,
    expected_status: int = 200,
    save_keys: Optional[Dict[str, str]] = None,
    print_body: bool = False,
):
    """Validate a response and optionally extract values into state."""
    global passed, failed

    ok = response.status_code == expected_status
    label = green("PASS") if ok else red("FAIL")
    status_str = f"{response.status_code}" if ok else f"{response.status_code} (expected {expected_status})"
    print(f"  [{label}] {test_name} — {status_str}")

    if not ok:
        failed += 1
        try:
            body = response.json()
        except Exception:
            body = response.text[:300]
        errors.append(f"{test_name}: status={response.status_code}, body={body}")
        if print_body:
            print(f"         Body: {body}")
        return None

    passed += 1

    try:
        body = response.json()
    except Exception:
        body = None

    if print_body and body:
        print(f"         Body: {json.dumps(body, indent=2, default=str)[:500]}")

    if save_keys and body:
        for state_key, json_path in save_keys.items():
            val = body
            for part in json_path.split("."):
                if isinstance(val, dict):
                    val = val.get(part)
                else:
                    val = None
                    break
            if val is not None:
                state[state_key] = str(val)

    return body


def doctor_headers():
    return {"Authorization": f"Bearer {state['doctor_token']}", "Content-Type": "application/json"}


def patient_headers():
    return {"Authorization": f"Bearer {state['patient_token']}", "Content-Type": "application/json"}


def doctor_auth_only():
    return {"Authorization": f"Bearer {state['doctor_token']}"}


def patient_auth_only():
    return {"Authorization": f"Bearer {state['patient_token']}"}


def skip_test(name: str, reason: str):
    global skipped
    skipped += 1
    print(f"  [{yellow('SKIP')}] {name} — {reason}")


# ── Create a small test PDF for document upload ──────────────────────────────

def create_test_pdf() -> bytes:
    """Create a minimal valid PDF with medical content for testing."""
    # Minimal PDF 1.4
    content = (
        "%PDF-1.4\n"
        "1 0 obj <</Type/Catalog/Pages 2 0 R>> endobj\n"
        "2 0 obj <</Type/Pages/Kids[3 0 R]/Count 1>> endobj\n"
        "3 0 obj <</Type/Page/Parent 2 0 R/MediaBox[0 0 612 792]/Contents 4 0 R/Resources<</Font<</F1 5 0 R>>>>>> endobj\n"
        "4 0 obj <</Length 230>>\nstream\n"
        "BT /F1 12 Tf 50 700 Td (Lab Report - Patient: Demo Patient) Tj ET\n"
        "BT /F1 10 Tf 50 680 Td (Date: 2026-02-20) Tj ET\n"
        "BT /F1 10 Tf 50 660 Td (Hemoglobin: 14.2 g/dL [Normal: 13.5-17.5]) Tj ET\n"
        "BT /F1 10 Tf 50 640 Td (WBC: 7500 cells/mcL [Normal: 4500-11000]) Tj ET\n"
        "\nendstream\nendobj\n"
        "5 0 obj <</Type/Font/Subtype/Type1/BaseFont/Helvetica>> endobj\n"
        "xref\n0 6\n"
        "0000000000 65535 f \n"
        "0000000009 00000 n \n"
        "0000000058 00000 n \n"
        "0000000115 00000 n \n"
        "0000000266 00000 n \n"
        "0000000548 00000 n \n"
        "trailer <</Root 1 0 R/Size 6>>\n"
        "startxref\n620\n%%EOF"
    )
    return content.encode()


def create_test_audio() -> bytes:
    """Create a minimal WAV file header (silence) for testing transcription endpoints."""
    import struct
    sample_rate = 16000
    num_samples = sample_rate * 2  # 2 seconds of silence
    data_size = num_samples * 2  # 16-bit samples
    header = struct.pack(
        '<4sI4s4sIHHIIHH4sI',
        b'RIFF',
        36 + data_size,
        b'WAVE',
        b'fmt ',
        16,      # chunk size
        1,       # PCM
        1,       # mono
        sample_rate,
        sample_rate * 2,
        2,       # block align
        16,      # bits per sample
        b'data',
        data_size,
    )
    return header + b'\x00' * data_size


# ═════════════════════════════════════════════════════════════════════════════
#  TEST SECTIONS
# ═════════════════════════════════════════════════════════════════════════════


async def run_all_tests():
    global passed, failed, skipped

    async with httpx.AsyncClient(timeout=TIMEOUT) as c:
        # ── 0. Health Checks ──────────────────────────────────────────────
        print(f"\n{cyan('━' * 60)}")
        print(cyan("  0. HEALTH CHECKS"))
        print(f"{cyan('━' * 60)}")

        r = await c.get(f"{BASE_URL}/health")
        check("Server health", r)

        r = await c.get(f"{API}/ai/health")
        check("AI Core health (via proxy)", r)

        r = await c.get(f"{AI_CORE_URL}/api/v1/health")
        check("AI Core health (direct)", r)

        # ── 1. Auth — Signup ──────────────────────────────────────────────
        print(f"\n{cyan('━' * 60)}")
        print(cyan("  1. AUTHENTICATION"))
        print(f"{cyan('━' * 60)}")

        r = await c.post(f"{API}/auth/signup/doctor", json={
            "full_name": "Dr. Test Backend",
            "email": DOCTOR_EMAIL,
            "password": PASSWORD,
            "specialization": "Internal Medicine",
            "license_number": f"TEST-{uuid4().hex[:6]}",
            "hospital_name": "MedScribe AI Test Hospital",
            "phone": "+911234567890",
        })
        check("Signup doctor", r, 201, save_keys={
            "doctor_token": "access_token",
            "doctor_refresh": "refresh_token",
            "doctor_id": "user.id",
        })

        r = await c.post(f"{API}/auth/signup/patient", json={
            "full_name": "Patient Test Demo",
            "email": PATIENT_EMAIL,
            "password": PASSWORD,
            "phone": "+911234567891",
            "date_of_birth": "1995-06-15",
            "gender": "male",
            "blood_group": "O+",
        })
        check("Signup patient", r, 201, save_keys={
            "patient_token": "access_token",
            "patient_refresh": "refresh_token",
            "patient_id": "user.id",
        })

        # Login
        r = await c.post(f"{API}/auth/login", json={
            "email": DOCTOR_EMAIL, "password": PASSWORD,
        })
        check("Login doctor", r, save_keys={
            "doctor_token": "access_token",
            "doctor_refresh": "refresh_token",
        })

        r = await c.post(f"{API}/auth/login", json={
            "email": PATIENT_EMAIL, "password": PASSWORD,
        })
        check("Login patient", r, save_keys={
            "patient_token": "access_token",
            "patient_refresh": "refresh_token",
        })

        # Get profile
        r = await c.get(f"{API}/auth/me", headers=doctor_headers())
        check("Get profile (doctor)", r)

        r = await c.get(f"{API}/auth/me", headers=patient_headers())
        check("Get profile (patient)", r)

        # Refresh token
        r = await c.post(f"{API}/auth/refresh", json={
            "refresh_token": state["doctor_refresh"],
        })
        body = check("Refresh token (doctor)", r, save_keys={
            "doctor_token": "access_token",
            "doctor_refresh": "refresh_token",
        })

        # ── 2. Patients ──────────────────────────────────────────────────
        print(f"\n{cyan('━' * 60)}")
        print(cyan("  2. PATIENTS"))
        print(f"{cyan('━' * 60)}")

        r = await c.get(f"{API}/patients/me", headers=patient_headers())
        check("Get my patient profile", r)

        r = await c.put(f"{API}/patients/me", headers=patient_headers(), json={
            "phone": "+919876543211",
            "blood_group": "O+",
            "address": "123 Test Street, Mumbai",
            "emergency_contact": "+919876543200",
        })
        check("Update patient profile", r)

        r = await c.post(f"{API}/patients/me/onboarding", headers=patient_headers(), json={
            "has_diabetes": False,
            "has_heart_disease": False,
            "has_lung_disease": False,
            "no_medical_conditions": True,
            "taking_medications": False,
            "has_allergies": True,
            "allergies_list": "Peanuts, Shellfish",
            "smoking_status": "never",
            "alcohol_use": "occasional",
            "had_major_surgeries": False,
            "consent_data_storage": True,
            "consent_ai_assist": True,
        })
        check("Submit onboarding", r, 201)

        r = await c.get(f"{API}/patients/me/onboarding", headers=patient_headers())
        check("Get my onboarding", r)

        r = await c.get(f"{API}/patients/{state['patient_id']}", headers=doctor_headers())
        check("Get patient by ID (doctor)", r)

        r = await c.get(f"{API}/patients/{state['patient_id']}/onboarding", headers=doctor_headers())
        check("Get patient onboarding (doctor)", r)

        r = await c.get(f"{API}/patients", headers=doctor_headers())
        check("List all patients (doctor)", r)

        # ── 3. Doctors ───────────────────────────────────────────────────
        print(f"\n{cyan('━' * 60)}")
        print(cyan("  3. DOCTORS"))
        print(f"{cyan('━' * 60)}")

        r = await c.get(f"{API}/doctors")
        check("List all doctors (public)", r)

        r = await c.get(f"{API}/doctors/me", headers=doctor_headers())
        check("Get my doctor profile", r)

        r = await c.put(f"{API}/doctors/me", headers=doctor_headers(), json={
            "specialization": "Cardiology",
            "hospital_name": "MedScribe Central Hospital",
        })
        check("Update doctor profile", r)

        r = await c.get(f"{API}/doctors/{state['doctor_id']}", headers=doctor_headers())
        check("Get doctor by ID", r)

        # ── 4. Appointments ──────────────────────────────────────────────
        print(f"\n{cyan('━' * 60)}")
        print(cyan("  4. APPOINTMENTS"))
        print(f"{cyan('━' * 60)}")

        appt_date = (datetime.now(timezone.utc) + timedelta(days=7)).isoformat()

        r = await c.post(f"{API}/appointments", headers=patient_headers(), json={
            "doctor_id": state["doctor_id"],
            "appointment_date": appt_date,
            "appointment_type": "telehealth",
            "reason": "Recurring headaches and mild fever for 3 days",
            "duration_minutes": 30,
        })
        check("Book appointment (patient)", r, 201, save_keys={
            "appointment_id": "appointment_id",
        })

        # Doctor schedules appointment for patient
        appt_date_doc = (datetime.now(timezone.utc) + timedelta(days=10)).isoformat()
        r = await c.post(f"{API}/appointments/schedule", headers=doctor_headers(), json={
            "patient_id": state["patient_id"],
            "appointment_date": appt_date_doc,
            "appointment_type": "in_person",
            "reason": "Follow-up consultation scheduled by doctor",
            "duration_minutes": 20,
        })
        check("Schedule appointment (doctor)", r, 201)

        r = await c.get(f"{API}/appointments", headers=patient_headers())
        check("List appointments (patient)", r)

        r = await c.get(f"{API}/appointments", headers=doctor_headers())
        check("List appointments (doctor)", r)

        r = await c.get(f"{API}/appointments/upcoming", headers=doctor_headers())
        check("Upcoming appointments (doctor)", r)

        if state["appointment_id"]:
            r = await c.get(f"{API}/appointments/{state['appointment_id']}", headers=doctor_headers())
            check("Get appointment by ID", r)

            r = await c.post(f"{API}/appointments/{state['appointment_id']}/approve", headers=doctor_headers())
            check("Approve appointment (doctor)", r)

            r = await c.put(f"{API}/appointments/{state['appointment_id']}", headers=doctor_headers(), json={
                "notes": "Patient may need follow-up labs",
                "duration_minutes": 45,
            })
            check("Update appointment", r)
        else:
            skip_test("Appointment CRUD", "No appointment_id")

        # ── 5. Consultations ─────────────────────────────────────────────
        print(f"\n{cyan('━' * 60)}")
        print(cyan("  5. CONSULTATIONS"))
        print(f"{cyan('━' * 60)}")

        if state["appointment_id"] and state["patient_id"]:
            r = await c.post(f"{API}/consultations", headers=doctor_headers(), json={
                "patient_id": state["patient_id"],
                "appointment_id": state["appointment_id"],
            })
            check("Create consultation", r, 201, save_keys={
                "consultation_id": "consultation_id",
            })

            if state["consultation_id"]:
                r = await c.get(f"{API}/consultations/{state['consultation_id']}", headers=doctor_headers())
                check("Get consultation by ID", r)

                r = await c.put(f"{API}/consultations/{state['consultation_id']}", headers=doctor_headers(), json={
                    "soap_note": {
                        "subjective": "Patient reports headaches for 3 days with mild fever and nausea.",
                        "objective": "Temp 99.8°F, BP 120/80, HR 82, RR 18.",
                        "assessment": "Viral upper respiratory infection with tension-type headache",
                        "plan": "Rest, hydration, Paracetamol 500mg PRN. Follow-up in 5 days.",
                    },
                    "icd_codes": [
                        {"code": "J06.9", "description": "Acute upper respiratory infection, unspecified"},
                        {"code": "R51", "description": "Headache"},
                    ],
                    "prescription": [
                        {"drug": "Paracetamol", "dose": "500mg", "frequency": "Every 6 hours", "duration": "5 days"},
                    ],
                    "patient_summary": "You have a viral infection causing headaches and fever. Take Paracetamol for pain.",
                    "status": "confirmed",
                })
                check("Update consultation (SOAP + ICD + Rx)", r)

                r = await c.get(f"{API}/consultations/patient/{state['patient_id']}", headers=doctor_headers())
                check("Get patient consultation history", r)
            else:
                skip_test("Consultation CRUD", "No consultation_id")
        else:
            skip_test("Consultations", "No appointment/patient")

        # ── 6. Documents ─────────────────────────────────────────────────
        print(f"\n{cyan('━' * 60)}")
        print(cyan("  6. DOCUMENTS"))
        print(f"{cyan('━' * 60)}")

        if state["patient_id"]:
            pdf_data = create_test_pdf()
            files = {"file": ("test_lab_report.pdf", pdf_data, "application/pdf")}
            data = {
                "patient_id": state["patient_id"],
                "document_type": "lab_report",
                "notes": "Test lab report upload",
            }
            r = await c.post(
                f"{API}/documents/upload",
                headers=patient_auth_only(),
                files=files,
                data=data,
            )
            check("Upload document (patient)", r, 201, save_keys={
                "document_id": "document_id",
            })

            if state["document_id"]:
                r = await c.get(f"{API}/documents/{state['document_id']}", headers=patient_headers())
                check("Get document by ID", r)

                r = await c.get(f"{API}/documents/{state['document_id']}/analysis-status", headers=patient_headers())
                check("Get document analysis status", r)

                r = await c.get(f"{API}/documents/{state['document_id']}/patient-view", headers=patient_headers())
                check("Get document patient-view", r)

                r = await c.get(f"{API}/documents/{state['document_id']}/clinician-view", headers=doctor_headers())
                check("Get document clinician-view", r)

            r = await c.get(f"{API}/documents/patient/{state['patient_id']}", headers=patient_headers())
            check("List patient documents", r)
        else:
            skip_test("Documents", "No patient_id")

        # ── 7. Meetings (LiveKit) ────────────────────────────────────────
        print(f"\n{cyan('━' * 60)}")
        print(cyan("  7. MEETINGS (LiveKit)"))
        print(f"{cyan('━' * 60)}")

        if state["appointment_id"]:
            r = await c.post(f"{API}/meetings/{state['appointment_id']}/create-room", headers=doctor_headers())
            check("Create meeting room", r)

            r = await c.get(f"{API}/meetings/{state['appointment_id']}/join-token", headers=doctor_headers())
            check("Get join token (doctor)", r)

            r = await c.get(f"{API}/meetings/{state['appointment_id']}/join-token", headers=patient_headers())
            check("Get join token (patient)", r)

            r = await c.get(f"{API}/meetings/{state['appointment_id']}/status", headers=doctor_headers())
            check("Get meeting status", r)

            r = await c.post(f"{API}/meetings/{state['appointment_id']}/leave", headers=patient_headers())
            check("Leave meeting (patient)", r)

            r = await c.post(f"{API}/meetings/{state['appointment_id']}/end", headers=doctor_headers())
            check("End meeting", r)

            r = await c.post(f"{API}/meetings/transcribe-turn", headers=doctor_headers(), json={
                "appointment_id": state["appointment_id"],
                "speaker": "doctor",
                "text": "Patient reports recurring headaches for three days with mild fever.",
            })
            check("Transcribe meeting turn", r)
        else:
            skip_test("Meetings", "No appointment_id")

        # ── 8. AI Agent Chat ─────────────────────────────────────────────
        print(f"\n{cyan('━' * 60)}")
        print(cyan("  8. AI AGENT CHAT (LangGraph)"))
        print(f"{cyan('━' * 60)}")

        session_patient = f"test-patient-{uuid4().hex[:8]}"
        session_doctor = f"test-doctor-{uuid4().hex[:8]}"
        state["session_id_patient"] = session_patient
        state["session_id_doctor"] = session_doctor

        r = await c.post(f"{API}/agent/patient/chat", headers=patient_headers(), json={
            "message": "What are my upcoming appointments?",
            "session_id": session_patient,
        })
        check("Patient agent chat", r, print_body=True)

        r = await c.post(f"{API}/agent/patient/chat", headers=patient_headers(), json={
            "message": "Do I have any medications?",
            "session_id": session_patient,
        })
        check("Patient agent chat (follow-up)", r)

        r = await c.post(f"{API}/agent/clinician/chat", headers=doctor_headers(), json={
            "message": f"Show me patient history for patient {state['patient_id']}",
            "session_id": session_doctor,
        })
        check("Clinician agent chat", r, print_body=True)

        if state["appointment_id"]:
            r = await c.post(f"{API}/agent/clinician/meeting-chat", headers=doctor_headers(), json={
                "message": "What ICD codes match recurring headaches with fever?",
                "appointment_id": state["appointment_id"],
                "session_id": f"meeting-{uuid4().hex[:8]}",
            })
            check("Clinician meeting chat", r, print_body=True)

        r = await c.get(f"{API}/agent/history/{session_doctor}", headers=doctor_headers())
        check("Get chat history", r)

        r = await c.delete(f"{API}/agent/history/{session_patient}", headers=patient_headers())
        check("Clear chat history", r)

        # ── 9. AI Proxy — Core AI Services ───────────────────────────────
        print(f"\n{cyan('━' * 60)}")
        print(cyan("  9. AI PROXY — CORE AI SERVICES (via backend)"))
        print(f"{cyan('━' * 60)}")

        # 9.1 ICD Lookup (fast, uses CSV — no Modal cost)
        r = await c.post(f"{API}/ai/icd-lookup", headers=doctor_headers(), json={
            "query": "headache",
        })
        check("ICD code lookup", r, print_body=True)

        # 9.2 Extract medical entities
        r = await c.post(f"{API}/ai/extract", headers=doctor_headers(), json={
            "transcript": (
                "DOCTOR: Patient presents with recurring headaches for 3 days. "
                "Mild fever 99.8F. BP normal at 120/80. "
                "Prescribing Paracetamol 500mg every 6 hours for 5 days."
            ),
        })
        extraction_result = check("Extract medical entities", r, print_body=True)

        # 9.3 Generate EMR
        if extraction_result:
            r = await c.post(f"{API}/ai/generate-emr", headers=doctor_headers(), json={
                "extraction": extraction_result,
            })
            emr_result = check("Generate EMR record", r, print_body=True)
        else:
            emr_result = None
            skip_test("Generate EMR", "No extraction result")

        # 9.4 Patient summary
        if emr_result:
            r = await c.post(f"{API}/ai/patient-summary", headers=doctor_headers(), json={
                "emr": emr_result,
            })
            check("Generate patient summary", r, print_body=True)
        else:
            skip_test("Patient summary", "No EMR result")

        # 9.5 Suggest diagnoses
        r = await c.post(f"{API}/ai/suggest-diagnoses", headers=doctor_headers(), json={
            "symptoms": "recurring headaches, mild fever 99.8F, nausea, no vomiting",
        })
        check("Suggest diagnoses", r, print_body=True)

        # 9.6 MedGemma Chat
        try:
            r = await c.post(f"{API}/ai/chat", headers=doctor_headers(), json={
                "messages": [
                    {"role": "user", "content": "What are common causes of recurring headaches with mild fever?"},
                ],
            })
            check("MedGemma chat", r, print_body=True)
        except httpx.ReadTimeout:
            skip_test("MedGemma chat", "Timeout (Modal cold start)")

        # 9.7 Transcribe (with test audio)
        try:
            audio_data = create_test_audio()
            r = await c.post(
                f"{API}/ai/transcribe",
                headers=doctor_auth_only(),
                files={"file": ("test_audio.wav", audio_data, "audio/wav")},
            )
            check("Transcribe audio", r, print_body=True)
        except httpx.ReadTimeout:
            skip_test("Transcribe audio", "Timeout (Modal cold start)")

        # 9.8 Analyze document (vision — Qwen2-VL)
        try:
            pdf_data = create_test_pdf()
            r = await c.post(
                f"{API}/ai/analyze-document",
                headers=doctor_auth_only(),
                files={"file": ("test_report.pdf", pdf_data, "application/pdf")},
            )
            check("Analyze document (vision)", r, print_body=True)
        except httpx.ReadTimeout:
            skip_test("Analyze document (vision)", "Timeout (Modal cold start)")

        # 9.9 Doc patient report
        try:
            r = await c.post(
                f"{API}/ai/doc/patient-report",
                headers=patient_auth_only(),
                files={"file": ("lab_report.pdf", create_test_pdf(), "application/pdf")},
            )
            check("Doc patient report", r, print_body=True)
        except httpx.ReadTimeout:
            skip_test("Doc patient report", "Timeout (Modal cold start)")

        # 9.10 Doc clinician report
        try:
            r = await c.post(
                f"{API}/ai/doc/clinician-report",
                headers=doctor_auth_only(),
                files={"file": ("lab_report.pdf", create_test_pdf(), "application/pdf")},
                data={"medical_history": "Patient has history of hypertension and type 2 diabetes."},
            )
            check("Doc clinician report", r, print_body=True)
        except httpx.ReadTimeout:
            skip_test("Doc clinician report", "Timeout (Modal cold start)")

        # ── 10. FHIR R4 ─────────────────────────────────────────────────
        print(f"\n{cyan('━' * 60)}")
        print(cyan("  10. FHIR R4 ENDPOINTS"))
        print(f"{cyan('━' * 60)}")

        if state["patient_id"]:
            r = await c.get(f"{API}/fhir/Patient/{state['patient_id']}", headers=doctor_headers())
            check("FHIR Patient resource", r, print_body=True)

        if state["consultation_id"]:
            r = await c.get(f"{API}/fhir/Encounter/{state['consultation_id']}", headers=doctor_headers())
            check("FHIR Encounter", r)

            r = await c.get(f"{API}/fhir/Condition/{state['consultation_id']}", headers=doctor_headers())
            check("FHIR Condition (Diagnosis)", r)

            r = await c.get(f"{API}/fhir/MedicationRequest/{state['consultation_id']}", headers=doctor_headers())
            check("FHIR MedicationRequest", r)

            r = await c.get(f"{API}/fhir/Bundle/consultation/{state['consultation_id']}", headers=doctor_headers())
            check("FHIR Bundle (full consultation)", r, print_body=True)

            r = await c.get(f"{API}/fhir/Bundle/consultation/{state['consultation_id']}/download", headers=doctor_headers())
            check("FHIR Bundle download (JSON file)", r)

            r = await c.get(f"{API}/fhir/export/visit-report/{state['consultation_id']}", headers=doctor_headers())
            check("FHIR Export: Visit Report PDF", r)

        else:
            skip_test("FHIR Encounter/Condition/MedicationRequest/Bundle", "No consultation_id")

        # FHIR Patient EMR PDF (patient-token)
        if state["patient_id"]:
            r = await c.get(f"{API}/fhir/export/patient-emr", headers=patient_headers())
            check("FHIR Export: Patient EMR PDF", r)

        # ── 11. Drugs ─────────────────────────────────────────────────
        print(f"\n{cyan('━' * 60)}")
        print(cyan("  11. DRUGS"))
        print(f"{cyan('━' * 60)}")

        r = await c.get(f"{API}/drugs/search", headers=doctor_headers(), params={"q": "paracetamol"})
        check("Drug search (paracetamol)", r, print_body=True)

        r = await c.get(f"{API}/drugs/options", headers=doctor_headers())
        check("Drug options (dose/frequency/duration)", r, print_body=True)

        # ── 12. Access Control Checks ────────────────────────────────────
        print(f"\n{cyan('━' * 60)}")
        print(cyan("  12. ACCESS CONTROL / AUTHORIZATION"))
        print(f"{cyan('━' * 60)}")

        # Patient should NOT access doctor-only routes
        r = await c.post(f"{API}/consultations", headers=patient_headers(), json={
            "patient_id": state["patient_id"],
            "appointment_id": state["appointment_id"],
        })
        check("Patient blocked from creating consultation", r, expected_status=403)

        # Unauthenticated should be blocked (FastAPI OAuth2 returns 403 when no token)
        r = await c.get(f"{API}/patients/me")
        check("Unauthenticated blocked from patient profile", r, expected_status=403)

        r = await c.post(f"{API}/ai/extract", json={"transcript": "test"})
        check("Unauthenticated blocked from AI extract", r, expected_status=403)

        # Doctor blocked from patient-only route
        r = await c.get(f"{API}/patients/me", headers=doctor_headers())
        check("Doctor blocked from patient /me route", r, expected_status=403)

        # ── 13. Cleanup — Cancel Appointment ─────────────────────────
        print(f"\n{cyan('━' * 60)}")
        print(cyan("  13. CLEANUP"))
        print(f"{cyan('━' * 60)}")

        # Book a second appointment just to test cancel
        appt_date2 = (datetime.now(timezone.utc) + timedelta(days=14)).isoformat()
        r = await c.post(f"{API}/appointments", headers=patient_headers(), json={
            "doctor_id": state["doctor_id"],
            "appointment_date": appt_date2,
            "appointment_type": "in_person",
            "reason": "Follow-up check",
            "duration_minutes": 15,
        })
        body = check("Book 2nd appointment for cancel test", r, 201)
        cancel_id = body.get("appointment_id") if body else None

        if cancel_id:
            r = await c.delete(f"{API}/appointments/{cancel_id}", headers=patient_headers())
            check("Cancel appointment (DELETE)", r)

        # Reject test — book another
        r = await c.post(f"{API}/appointments", headers=patient_headers(), json={
            "doctor_id": state["doctor_id"],
            "appointment_date": (datetime.now(timezone.utc) + timedelta(days=21)).isoformat(),
            "appointment_type": "telehealth",
            "reason": "Rejection test",
            "duration_minutes": 30,
        })
        body = check("Book 3rd appointment for reject test", r, 201)
        reject_id = body.get("appointment_id") if body else None

        if reject_id:
            r = await c.post(f"{API}/appointments/{reject_id}/reject", headers=doctor_headers(), json={
                "reason": "Doctor unavailable on requested date",
            })
            check("Reject appointment (doctor)", r)

    # ── Summary ───────────────────────────────────────────────────────────
    print(f"\n{'=' * 60}")
    total = passed + failed + skipped
    print(f"  RESULTS: {green(f'{passed} passed')} / {red(f'{failed} failed')} / {yellow(f'{skipped} skipped')} — {total} total")
    print(f"{'=' * 60}")

    if errors:
        print(f"\n{red('FAILURES:')}")
        for e in errors:
            print(f"  • {e}")

    return failed == 0


# ═════════════════════════════════════════════════════════════════════════════

if __name__ == "__main__":
    print("=" * 60)
    print("  MedScribe AI — Comprehensive Backend Test Suite")
    print(f"  Server:  {BASE_URL}")
    print(f"  AI Core: {AI_CORE_URL}")
    print(f"  Time:    {datetime.now().isoformat()}")
    print("=" * 60)

    success = asyncio.run(run_all_tests())
    sys.exit(0 if success else 1)

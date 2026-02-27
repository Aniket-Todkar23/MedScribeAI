"""
Manual LangGraph Agent Test — Step-by-step
==========================================
Registers doctor + patient, creates data, then tests all agent endpoints.
"""
import asyncio, json, sys, io
import httpx

if sys.platform == "win32":
    sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding="utf-8", errors="replace")

BASE = "http://localhost:3001/api/v1"
T = httpx.Timeout(120.0, connect=30.0)

async def main():
    async with httpx.AsyncClient(timeout=T) as c:

        # ── 1. Register doctor ────────────────────────────────────────────
        print("=" * 60)
        print("  STEP 1: Register Doctor")
        print("=" * 60)
        r = await c.post(f"{BASE}/auth/signup/doctor", json={
            "full_name": "Dr. Agent Tester",
            "email": "agentdoc@test.dev",
            "password": "test1234",
            "specialization": "Neurology",
            "license_number": "AGT-001",
            "hospital_name": "Smart EMR Hospital",
            "phone": "+911111111111",
        })
        if r.status_code == 409:
            print("  Doctor already exists, logging in...")
            r = await c.post(f"{BASE}/auth/login", json={
                "email": "agentdoc@test.dev", "password": "test1234",
            })
        d = r.json()
        doc_token = d["access_token"]
        doc_id = d["user"]["id"]
        print(f"  Doctor ID:    {doc_id}")
        print(f"  Doctor Token: {doc_token[:40]}...")

        # ── 2. Register patient ───────────────────────────────────────────
        print("\n" + "=" * 60)
        print("  STEP 2: Register Patient")
        print("=" * 60)
        r = await c.post(f"{BASE}/auth/signup/patient", json={
            "full_name": "Agent Patient Demo",
            "email": "agentpat@test.dev",
            "password": "test1234",
            "phone": "+912222222222",
            "date_of_birth": "1990-03-15",
            "gender": "female",
            "blood_group": "A+",
        })
        if r.status_code == 409:
            print("  Patient already exists, logging in...")
            r = await c.post(f"{BASE}/auth/login", json={
                "email": "agentpat@test.dev", "password": "test1234",
            })
        d = r.json()
        pat_token = d["access_token"]
        pat_id = d["user"]["id"]
        print(f"  Patient ID:    {pat_id}")
        print(f"  Patient Token: {pat_token[:40]}...")

        dh = {"Authorization": f"Bearer {doc_token}", "Content-Type": "application/json"}
        ph = {"Authorization": f"Bearer {pat_token}", "Content-Type": "application/json"}

        # ── 3. Submit onboarding (so agent has medical history) ───────────
        print("\n" + "=" * 60)
        print("  STEP 3: Submit Patient Onboarding")
        print("=" * 60)
        r = await c.post(f"{BASE}/patients/me/onboarding", headers=ph, json={
            "has_diabetes": True,
            "diabetes_type": "Type 2",
            "has_heart_disease": False,
            "has_lung_disease": False,
            "taking_medications": True,
            "medications_list": "Metformin 500mg twice daily",
            "has_allergies": True,
            "allergies_list": "Penicillin, Sulfa drugs",
            "smoking_status": "former",
            "alcohol_use": "occasional",
            "had_major_surgeries": True,
            "surgeries_details": "Appendectomy (2018)",
            "consent_data_storage": True,
            "consent_ai_assist": True,
        })
        print(f"  Onboarding: {r.status_code} ({'OK' if r.status_code in (200,201) else r.text[:100]})")

        # ── 4. Book appointment + create consultation (so agent has data) ─
        print("\n" + "=" * 60)
        print("  STEP 4: Create Appointment + Consultation with SOAP/ICD/Rx")
        print("=" * 60)
        from datetime import datetime, timedelta, timezone
        appt_date = (datetime.now(timezone.utc) + timedelta(days=3)).isoformat()
        r = await c.post(f"{BASE}/appointments", headers=ph, json={
            "doctor_id": doc_id,
            "appointment_date": appt_date,
            "appointment_type": "telehealth",
            "reason": "Persistent headaches and dizziness for 5 days",
            "duration_minutes": 30,
        })
        appt = r.json()
        appt_id = appt.get("appointment_id")
        print(f"  Appointment: {r.status_code} — ID: {appt_id}")

        # Approve
        await c.post(f"{BASE}/appointments/{appt_id}/approve", headers=dh)

        # Create consultation
        r = await c.post(f"{BASE}/consultations", headers=dh, json={
            "patient_id": pat_id,
            "appointment_id": appt_id,
        })
        cons = r.json()
        cons_id = cons.get("consultation_id")
        print(f"  Consultation: {r.status_code} — ID: {cons_id}")

        # Update with SOAP, ICD, Prescription
        r = await c.put(f"{BASE}/consultations/{cons_id}", headers=dh, json={
            "soap_note": {
                "subjective": "Patient reports persistent headaches for 5 days, dizziness when standing, mild nausea. History of Type 2 diabetes on Metformin.",
                "objective": "BP 140/90, HR 88, Temp 98.6F. Fundoscopy normal. Romberg negative.",
                "assessment": "Hypertension-related headache with orthostatic dizziness. Rule out secondary causes.",
                "plan": "Start Amlodipine 5mg daily. CBC, BMP, HbA1c ordered. Follow-up in 2 weeks."
            },
            "icd_codes": [
                {"code": "R51.9", "description": "Headache, unspecified"},
                {"code": "R42", "description": "Dizziness and giddiness"},
                {"code": "I10", "description": "Essential hypertension"},
                {"code": "E11.65", "description": "Type 2 diabetes with hyperglycemia"},
            ],
            "prescription": [
                {"drug": "Amlodipine", "dose": "5mg", "frequency": "Once daily", "duration": "30 days"},
                {"drug": "Metformin", "dose": "500mg", "frequency": "Twice daily", "duration": "Ongoing"},
            ],
            "patient_summary": "You have high blood pressure causing your headaches and dizziness. We're starting a new medicine (Amlodipine) to lower your blood pressure. Continue your Metformin for diabetes. We've ordered blood tests. Please come back in 2 weeks.",
            "status": "confirmed",
        })
        print(f"  Updated consultation: {r.status_code}")

        # ── 5. TEST: Patient Agent Chat ───────────────────────────────────
        print("\n" + "=" * 60)
        print("  TEST 1: Patient Agent — Health Summary")
        print("=" * 60)
        r = await c.post(f"{BASE}/agent/patient/chat", headers=ph, json={
            "message": "Can you give me a summary of my health? What conditions do I have and what medications am I on?",
            "session_id": "test-patient-session",
        })
        body = r.json()
        print(f"  Status: {r.status_code}")
        print(f"  Tool calls: {body.get('tool_calls', [])}")
        print(f"  Response:\n{body.get('response', 'NO RESPONSE')}\n")

        # ── 6. TEST: Patient Agent — Appointments ─────────────────────────
        print("=" * 60)
        print("  TEST 2: Patient Agent — My Appointments")
        print("=" * 60)
        r = await c.post(f"{BASE}/agent/patient/chat", headers=ph, json={
            "message": "What appointments do I have scheduled?",
            "session_id": "test-patient-session",
        })
        body = r.json()
        print(f"  Status: {r.status_code}")
        print(f"  Tool calls: {body.get('tool_calls', [])}")
        print(f"  Response:\n{body.get('response', 'NO RESPONSE')}\n")

        # ── 7. TEST: Patient Agent — Explain term ─────────────────────────
        print("=" * 60)
        print("  TEST 3: Patient Agent — Explain Medical Term")
        print("=" * 60)
        r = await c.post(f"{BASE}/agent/patient/chat", headers=ph, json={
            "message": "What does hypertension mean? And what is HbA1c?",
            "session_id": "test-patient-session",
        })
        body = r.json()
        print(f"  Status: {r.status_code}")
        print(f"  Tool calls: {body.get('tool_calls', [])}")
        print(f"  Response:\n{body.get('response', 'NO RESPONSE')}\n")

        # ── 8. TEST: Clinician Agent — Patient History ────────────────────
        print("=" * 60)
        print("  TEST 4: Clinician Agent — Patient History")
        print("=" * 60)
        r = await c.post(f"{BASE}/agent/clinician/chat", headers=dh, json={
            "message": f"Show me the complete medical history for patient {pat_id}",
            "session_id": "test-doctor-session",
        })
        body = r.json()
        print(f"  Status: {r.status_code}")
        print(f"  Tool calls: {body.get('tool_calls', [])}")
        print(f"  Response:\n{body.get('response', 'NO RESPONSE')}\n")

        # ── 9. TEST: Clinician Agent — ICD Lookup ─────────────────────────
        print("=" * 60)
        print("  TEST 5: Clinician Agent — ICD Code Search")
        print("=" * 60)
        r = await c.post(f"{BASE}/agent/clinician/chat", headers=dh, json={
            "message": "What are the ICD-10 codes for tension headache and essential hypertension?",
            "session_id": "test-doctor-session",
        })
        body = r.json()
        print(f"  Status: {r.status_code}")
        print(f"  Tool calls: {body.get('tool_calls', [])}")
        print(f"  Response:\n{body.get('response', 'NO RESPONSE')}\n")

        # ── 10. TEST: Clinician Meeting Chat ──────────────────────────────
        print("=" * 60)
        print("  TEST 6: Clinician Meeting Chat (live consultation)")
        print("=" * 60)
        r = await c.post(f"{BASE}/agent/clinician/meeting-chat", headers=dh, json={
            "message": "What allergies does this patient have? And what medications are they currently on?",
            "appointment_id": appt_id,
            "session_id": "test-meeting-session",
        })
        body = r.json()
        print(f"  Status: {r.status_code}")
        print(f"  Tool calls: {body.get('tool_calls', [])}")
        print(f"  Response:\n{body.get('response', 'NO RESPONSE')}\n")

        # ── 11. TEST: Chat History ────────────────────────────────────────
        print("=" * 60)
        print("  TEST 7: Get Chat History")
        print("=" * 60)
        r = await c.get(f"{BASE}/agent/history/test-patient-session", headers=ph)
        body = r.json()
        msg_count = len(body.get("messages", []))
        print(f"  Status: {r.status_code}")
        print(f"  Session: {body.get('session_id')}")
        print(f"  Message count: {msg_count}")
        print(f"  Last 2 messages:")
        for m in body.get("messages", [])[-2:]:
            role = m.get("role", "?")
            content = m.get("content", "")[:120]
            print(f"    [{role}] {content}...")

        # ── 12. Cleanup ──────────────────────────────────────────────────
        print("\n" + "=" * 60)
        print("  TEST 8: Clear Chat History")
        print("=" * 60)
        r = await c.delete(f"{BASE}/agent/history/test-patient-session", headers=ph)
        print(f"  Delete patient session: {r.status_code} — {r.json()}")
        r = await c.delete(f"{BASE}/agent/history/test-doctor-session", headers=dh)
        print(f"  Delete doctor session:  {r.status_code} — {r.json()}")
        r = await c.delete(f"{BASE}/agent/history/test-meeting-session", headers=dh)
        print(f"  Delete meeting session: {r.status_code} — {r.json()}")

        print("\n" + "=" * 60)
        print("  ALL AGENT TESTS COMPLETE")
        print("=" * 60)


if __name__ == "__main__":
    asyncio.run(main())

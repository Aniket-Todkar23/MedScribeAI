"""
Smart EMR — Database Seed Script
Creates 5 doctors, 10 patients, appointments, consultations, and documents.
Run:  cd server && python seed_data.py
"""

import asyncio
import uuid
from datetime import date, datetime, timedelta, timezone

from sqlalchemy import text

from app.config import settings
from app.database import async_session_factory, engine, Base
from app.models.user import Doctor, Patient, PatientOnboarding
from app.models.appointment import Appointment
from app.models.consultation import Consultation
from app.models.document import Document

# Hash password directly with bcrypt (passlib has compat issues with bcrypt>=4)
import bcrypt

def _hash_pw(plain: str) -> str:
    return bcrypt.hashpw(plain.encode(), bcrypt.gensalt()).decode()

# ── Helpers ────────────────────────────────────────────────────────────────────

DEFAULT_PASSWORD = _hash_pw("password123")

now = datetime.now(timezone.utc)


def uid():
    return uuid.uuid4()


# ── Seed Data ──────────────────────────────────────────────────────────────────

DOCTORS = [
    dict(doctor_id=uid(), full_name="Dr. Robert Chen", email="robert.chen@smartemr.local",
         password_hash=DEFAULT_PASSWORD, phone="+1-555-0101",
         specialization="Internal Medicine", license_number="LIC-IM-2023-001",
         hospital_name="Metro General Hospital"),
    dict(doctor_id=uid(), full_name="Dr. Priya Sharma", email="priya.sharma@smartemr.local",
         password_hash=DEFAULT_PASSWORD, phone="+1-555-0102",
         specialization="Cardiology", license_number="LIC-CA-2023-002",
         hospital_name="Heart Care Center"),
    dict(doctor_id=uid(), full_name="Dr. James Wilson", email="james.wilson@smartemr.local",
         password_hash=DEFAULT_PASSWORD, phone="+1-555-0103",
         specialization="Pulmonology", license_number="LIC-PU-2023-003",
         hospital_name="Metro General Hospital"),
    dict(doctor_id=uid(), full_name="Dr. Maria Garcia", email="maria.garcia@smartemr.local",
         password_hash=DEFAULT_PASSWORD, phone="+1-555-0104",
         specialization="Endocrinology", license_number="LIC-EN-2023-004",
         hospital_name="City Medical Center"),
    dict(doctor_id=uid(), full_name="Dr. Aisha Patel", email="aisha.patel@smartemr.local",
         password_hash=DEFAULT_PASSWORD, phone="+1-555-0105",
         specialization="General Practice", license_number="LIC-GP-2023-005",
         hospital_name="Community Health Clinic"),
]

PATIENTS = [
    dict(patient_id=uid(), full_name="Sarah Jenkins", email="sarah.jenkins@email.com",
         password_hash=DEFAULT_PASSWORD, phone="+1-555-1001",
         date_of_birth=date(1990, 3, 15), gender="female", blood_group="A+",
         address="123 Oak Street, Springfield", emergency_contact="+1-555-9001"),
    dict(patient_id=uid(), full_name="Michael Torres", email="michael.torres@email.com",
         password_hash=DEFAULT_PASSWORD, phone="+1-555-1002",
         date_of_birth=date(1985, 7, 22), gender="male", blood_group="O+",
         address="456 Elm Avenue, Riverside", emergency_contact="+1-555-9002"),
    dict(patient_id=uid(), full_name="Emily Watson", email="emily.watson@email.com",
         password_hash=DEFAULT_PASSWORD, phone="+1-555-1003",
         date_of_birth=date(1978, 11, 8), gender="female", blood_group="B-",
         address="789 Pine Road, Lakewood", emergency_contact="+1-555-9003"),
    dict(patient_id=uid(), full_name="David Kim", email="david.kim@email.com",
         password_hash=DEFAULT_PASSWORD, phone="+1-555-1004",
         date_of_birth=date(1995, 1, 30), gender="male", blood_group="AB+",
         address="321 Maple Drive, Hillcrest", emergency_contact="+1-555-9004"),
    dict(patient_id=uid(), full_name="Olivia Brown", email="olivia.brown@email.com",
         password_hash=DEFAULT_PASSWORD, phone="+1-555-1005",
         date_of_birth=date(1988, 5, 12), gender="female", blood_group="O-",
         address="654 Cedar Lane, Brookfield", emergency_contact="+1-555-9005"),
    dict(patient_id=uid(), full_name="James Anderson", email="james.anderson@email.com",
         password_hash=DEFAULT_PASSWORD, phone="+1-555-1006",
         date_of_birth=date(1972, 9, 25), gender="male", blood_group="A-",
         address="987 Birch Court, Westville", emergency_contact="+1-555-9006"),
    dict(patient_id=uid(), full_name="Sophia Lee", email="sophia.lee@email.com",
         password_hash=DEFAULT_PASSWORD, phone="+1-555-1007",
         date_of_birth=date(1999, 12, 3), gender="female", blood_group="B+",
         address="147 Walnut Street, Eastdale", emergency_contact="+1-555-9007"),
    dict(patient_id=uid(), full_name="Daniel Martinez", email="daniel.martinez@email.com",
         password_hash=DEFAULT_PASSWORD, phone="+1-555-1008",
         date_of_birth=date(1982, 4, 18), gender="male", blood_group="O+",
         address="258 Ash Avenue, Northpoint", emergency_contact="+1-555-9008"),
    dict(patient_id=uid(), full_name="Ava Johnson", email="ava.johnson@email.com",
         password_hash=DEFAULT_PASSWORD, phone="+1-555-1009",
         date_of_birth=date(1993, 8, 7), gender="female", blood_group="AB-",
         address="369 Spruce Way, Southgate", emergency_contact="+1-555-9009"),
    dict(patient_id=uid(), full_name="Ethan Davis", email="ethan.davis@email.com",
         password_hash=DEFAULT_PASSWORD, phone="+1-555-1010",
         date_of_birth=date(1968, 2, 14), gender="male", blood_group="A+",
         address="741 Poplar Blvd, Fairview", emergency_contact="+1-555-9010"),
]

# ── Onboarding (varied medical histories)

ONBOARDING = [
    # Sarah Jenkins — Diabetes Type 2, on insulin
    dict(patient_id=PATIENTS[0]["patient_id"], has_diabetes=True, diabetes_type="type_2",
         on_insulin=True, taking_medications=True, medications_list="Metformin 500mg, Insulin Glargine",
         has_allergies=True, allergies_list="Penicillin", smoking_status="never",
         alcohol_use="occasional", consent_data_storage=True, consent_ai_assist=True),
    # Michael Torres — Heart Disease
    dict(patient_id=PATIENTS[1]["patient_id"], has_heart_disease=True,
         heart_conditions=["atrial_fibrillation", "hypertension"],
         taking_medications=True, medications_list="Warfarin 5mg, Lisinopril 10mg",
         smoking_status="former", alcohol_use="none", consent_data_storage=True, consent_ai_assist=True),
    # Emily Watson — Lung Disease (COPD)
    dict(patient_id=PATIENTS[2]["patient_id"], has_lung_disease=True,
         lung_conditions=["copd"], uses_inhaler_daily=True,
         taking_medications=True, medications_list="Fluticasone Inhaler, Albuterol PRN",
         has_allergies=True, allergies_list="Sulfa drugs", smoking_status="former",
         alcohol_use="occasional", had_major_surgeries=True,
         surgeries_details="Appendectomy (2005)", consent_data_storage=True, consent_ai_assist=True),
    # David Kim — No conditions (healthy young adult)
    dict(patient_id=PATIENTS[3]["patient_id"], no_medical_conditions=True,
         smoking_status="never", alcohol_use="social",
         consent_data_storage=True, consent_ai_assist=True),
    # Olivia Brown — Diabetes Type 1
    dict(patient_id=PATIENTS[4]["patient_id"], has_diabetes=True, diabetes_type="type_1",
         on_insulin=True, taking_medications=True,
         medications_list="Insulin Lispro, Insulin Glargine",
         has_allergies=True, allergies_list="Latex", smoking_status="never",
         alcohol_use="none", consent_data_storage=True, consent_ai_assist=True),
    # James Anderson — Heart + Diabetes
    dict(patient_id=PATIENTS[5]["patient_id"], has_diabetes=True, diabetes_type="type_2",
         has_heart_disease=True, heart_conditions=["coronary_artery_disease"],
         taking_medications=True, medications_list="Metformin 1000mg, Aspirin 81mg, Atorvastatin 40mg",
         smoking_status="former", alcohol_use="none",
         had_major_surgeries=True, surgeries_details="Coronary stent placement (2020)",
         consent_data_storage=True, consent_ai_assist=True),
    # Sophia Lee — No conditions
    dict(patient_id=PATIENTS[6]["patient_id"], no_medical_conditions=True,
         smoking_status="never", alcohol_use="social",
         consent_data_storage=True, consent_ai_assist=True),
    # Daniel Martinez — Hypertension
    dict(patient_id=PATIENTS[7]["patient_id"], has_heart_disease=True,
         heart_conditions=["hypertension"],
         taking_medications=True, medications_list="Amlodipine 5mg",
         smoking_status="current", alcohol_use="moderate",
         consent_data_storage=True, consent_ai_assist=True),
    # Ava Johnson — Asthma
    dict(patient_id=PATIENTS[8]["patient_id"], has_lung_disease=True,
         lung_conditions=["asthma"], uses_inhaler_daily=True,
         taking_medications=True, medications_list="Montelukast 10mg, Fluticasone Inhaler",
         has_allergies=True, allergies_list="Dust mites, Pollen",
         smoking_status="never", alcohol_use="occasional",
         consent_data_storage=True, consent_ai_assist=True),
    # Ethan Davis — Multiple conditions (elderly)
    dict(patient_id=PATIENTS[9]["patient_id"], has_diabetes=True, diabetes_type="type_2",
         has_heart_disease=True, heart_conditions=["hypertension", "heart_failure"],
         has_lung_disease=True, lung_conditions=["copd"],
         taking_medications=True,
         medications_list="Metformin 500mg, Losartan 50mg, Furosemide 40mg, Tiotropium Inhaler",
         has_allergies=True, allergies_list="Aspirin, Codeine",
         smoking_status="former", alcohol_use="none",
         had_major_surgeries=True, surgeries_details="CABG (2015), Hip replacement (2019)",
         consent_data_storage=True, consent_ai_assist=True),
]

# ── Appointments (spread across doctors, varied statuses/dates) ───────────────

def make_appointments():
    appts = []
    # Past completed appointments
    for i, (pi, di) in enumerate([
        (0, 0), (1, 1), (2, 2), (3, 4), (4, 3),
        (5, 0), (6, 4), (7, 1), (8, 2), (9, 0),
    ]):
        appts.append(dict(
            appointment_id=uid(),
            doctor_id=DOCTORS[di]["doctor_id"],
            patient_id=PATIENTS[pi]["patient_id"],
            appointment_date=now - timedelta(days=30 - i * 3, hours=2),
            duration_minutes=30,
            appointment_type="in_person" if i % 2 == 0 else "telehealth",
            status="completed",
            reason=["Routine Checkup", "Follow-up Visit", "Chest Pain Evaluation",
                    "Annual Physical", "Diabetes Management", "Blood Pressure Review",
                    "General Consultation", "Heart Palpitations", "Breathing Difficulty",
                    "Medication Review"][i],
            notes=f"Completed visit #{i+1}",
        ))

    # Upcoming confirmed appointments
    for i, (pi, di) in enumerate([
        (0, 0), (1, 1), (2, 2), (3, 4), (4, 3),
        (5, 0), (7, 1), (8, 2),
    ]):
        appts.append(dict(
            appointment_id=uid(),
            doctor_id=DOCTORS[di]["doctor_id"],
            patient_id=PATIENTS[pi]["patient_id"],
            appointment_date=now + timedelta(days=i + 1, hours=9 + i),
            duration_minutes=30 if i % 2 == 0 else 45,
            appointment_type="telehealth" if i % 3 == 0 else "in_person",
            status="confirmed",
            reason=["Follow-up: Diabetes", "Cardiac Monitoring", "COPD Review",
                    "General Checkup", "Insulin Adjustment", "Post-Surgery Review",
                    "Heart Rate Monitoring", "Asthma Management"][i],
        ))

    # A pending appointment
    appts.append(dict(
        appointment_id=uid(),
        doctor_id=DOCTORS[4]["doctor_id"],
        patient_id=PATIENTS[9]["patient_id"],
        appointment_date=now + timedelta(days=10, hours=14),
        duration_minutes=45,
        appointment_type="in_person",
        status="pending",
        reason="Comprehensive Geriatric Assessment",
    ))

    return appts


APPOINTMENTS = make_appointments()


# ── Consultations (for completed appointments) ────────────────────────────────

def make_consultations():
    consults = []
    completed = [a for a in APPOINTMENTS if a["status"] == "completed"]
    soap_templates = [
        {
            "subjective": "Patient reports feeling well overall. Occasional headaches in the morning. No chest pain or shortness of breath.",
            "objective": "BP 128/82, HR 76, Temp 98.4F, SpO2 98%. Physical exam unremarkable. Heart sounds normal, lungs clear.",
            "assessment": "Well-controlled Type 2 Diabetes. Mild tension headaches likely related to screen time.",
            "plan": "Continue Metformin 500mg BID. Recommend screen breaks every 30 min. Follow up in 3 months. Order HbA1c."
        },
        {
            "subjective": "Patient presents with intermittent palpitations over the past 2 weeks. No syncope. Denies caffeine increase.",
            "objective": "BP 140/88, HR 82 irregular, Temp 98.6F. ECG shows occasional PACs. No murmurs. JVP normal.",
            "assessment": "Atrial fibrillation — rate controlled on current medication. Premature atrial complexes noted.",
            "plan": "Continue Warfarin. Add Metoprolol 25mg BID for rate control. 24-hour Holter monitor ordered. Follow up in 2 weeks."
        },
        {
            "subjective": "Patient reports increased cough and sputum production over 5 days. Using rescue inhaler 4x daily. No fever.",
            "objective": "BP 122/78, HR 88, Temp 98.8F, SpO2 93% on room air. Bilateral wheezes. Prolonged expiration.",
            "assessment": "COPD exacerbation, moderate severity. No signs of pneumonia on exam.",
            "plan": "Start Prednisone 40mg x5 days. Increase inhaler to QID. Chest X-ray ordered. Follow up in 1 week or sooner if worsening."
        },
        {
            "subjective": "Here for annual physical. No complaints. Exercises 3x/week. Balanced diet. Good sleep hygiene.",
            "objective": "BP 118/72, HR 68, BMI 22.4. All systems review normal. No abnormalities on physical exam.",
            "assessment": "Healthy young adult. No acute issues.",
            "plan": "Continue current lifestyle. Standard blood panel ordered. Return in 1 year for routine checkup."
        },
        {
            "subjective": "Difficulty managing blood glucose levels. Frequent lows in the afternoon. Adjusting carb intake.",
            "objective": "BP 110/68, HR 74, Temp 98.2F. Recent HbA1c 7.8%. Weight stable. Injection sites healthy.",
            "assessment": "Type 1 Diabetes with suboptimal glycemic control. Afternoon hypoglycemic episodes concerning.",
            "plan": "Reduce lunchtime Lispro by 1 unit. Add afternoon snack protocol. CGM data review in 2 weeks. Consider pump therapy."
        },
        {
            "subjective": "Post-stent placement follow-up. No chest pain. Tolerating medications well. Walking 20 min daily.",
            "objective": "BP 132/80, HR 72, Temp 98.4F. Heart sounds normal S1/S2. No edema. Stent insertion site healed.",
            "assessment": "Stable coronary artery disease post-PCI. Diabetes well-managed.",
            "plan": "Continue Aspirin, Atorvastatin, Metformin. Cardiac rehab referral. Stress test in 6 months."
        },
        {
            "subjective": "Sore throat and mild cough for 3 days. No fever. No sick contacts.",
            "objective": "BP 112/70, HR 70, Temp 98.6F. Oropharynx mildly erythematous. No exudates. Lungs clear.",
            "assessment": "Viral upper respiratory infection. Low suspicion for strep.",
            "plan": "Symptomatic treatment: warm salt water gargles, rest, fluids. Rapid strep test negative. Return if symptoms worsen or fever develops."
        },
        {
            "subjective": "Feeling palpitations and dizziness when standing quickly. No chest pain. Taking Amlodipine as prescribed.",
            "objective": "BP sitting 138/86, standing 118/74 (orthostatic drop). HR 78. ECG: normal sinus rhythm.",
            "assessment": "Hypertension, partially controlled. Orthostatic hypotension likely from Amlodipine.",
            "plan": "Switch from Amlodipine 5mg to Losartan 50mg. Hydration counseling. BP diary for 2 weeks. Follow up."
        },
        {
            "subjective": "Increased wheezing and nighttime cough over 2 weeks. Using rescue inhaler almost daily. Seasonal allergies worsening.",
            "objective": "BP 116/72, HR 80, Temp 98.4F, SpO2 96%. Bilateral expiratory wheezes. Peak flow 75% of personal best.",
            "assessment": "Asthma — poorly controlled, likely triggered by seasonal allergens.",
            "plan": "Step up to medium-dose ICS/LABA combination. Continue Montelukast. Allergy referral. Provide updated asthma action plan."
        },
        {
            "subjective": "Here for medication review. Managing multiple conditions. Reports stable symptoms. Mild ankle swelling noticed.",
            "objective": "BP 142/88, HR 76, Temp 98.2F, SpO2 94%. Trace bilateral pedal edema. Lungs: bibasilar crackles. Weight up 2kg.",
            "assessment": "CHF with mild fluid retention. COPD stable. Diabetes requires optimization.",
            "plan": "Increase Furosemide to 60mg. Fluid restriction 1.5L/day. Check BMP and BNP. Adjust Metformin based on renal function. Follow up in 1 week."
        },
    ]

    icd_templates = [
        [{"code": "E11.9", "description": "Type 2 diabetes mellitus without complications", "version": 10},
         {"code": "R51", "description": "Headache", "version": 10}],
        [{"code": "I48.91", "description": "Unspecified atrial fibrillation", "version": 10},
         {"code": "I49.1", "description": "Premature atrial complexes", "version": 10}],
        [{"code": "J44.1", "description": "COPD with acute exacerbation", "version": 10},
         {"code": "R05", "description": "Cough", "version": 10}],
        [{"code": "Z00.00", "description": "Encounter for general adult medical examination", "version": 10}],
        [{"code": "E10.65", "description": "Type 1 diabetes mellitus with hyperglycemia", "version": 10},
         {"code": "E16.2", "description": "Hypoglycemia, unspecified", "version": 10}],
        [{"code": "I25.10", "description": "Atherosclerotic heart disease of native coronary artery", "version": 10},
         {"code": "Z95.5", "description": "Presence of coronary angioplasty implant and graft", "version": 10}],
        [{"code": "J06.9", "description": "Acute upper respiratory infection, unspecified", "version": 10}],
        [{"code": "I10", "description": "Essential (primary) hypertension", "version": 10},
         {"code": "I95.1", "description": "Orthostatic hypotension", "version": 10}],
        [{"code": "J45.40", "description": "Moderate persistent asthma, uncomplicated", "version": 10},
         {"code": "J30.1", "description": "Allergic rhinitis due to pollen", "version": 10}],
        [{"code": "I50.9", "description": "Heart failure, unspecified", "version": 10},
         {"code": "J44.9", "description": "COPD, unspecified", "version": 10},
         {"code": "E11.9", "description": "Type 2 diabetes mellitus", "version": 10}],
    ]

    rx_templates = [
        [{"drug": "Metformin", "dose": "500mg", "frequency": "Twice daily", "duration": "90 days", "notes": "Take with meals"}],
        [{"drug": "Warfarin", "dose": "5mg", "frequency": "Once daily", "duration": "Ongoing", "notes": "Monitor INR"},
         {"drug": "Metoprolol", "dose": "25mg", "frequency": "Twice daily", "duration": "30 days", "notes": "New addition for rate control"}],
        [{"drug": "Prednisone", "dose": "40mg", "frequency": "Once daily", "duration": "5 days", "notes": "Taper not required for 5-day course"},
         {"drug": "Fluticasone Inhaler", "dose": "250mcg", "frequency": "4x daily", "duration": "14 days", "notes": "Increased from BID"}],
        [],
        [{"drug": "Insulin Lispro", "dose": "Reduce by 1 unit at lunch", "frequency": "Before meals", "duration": "Ongoing", "notes": "Adjust per BG readings"},
         {"drug": "Insulin Glargine", "dose": "20 units", "frequency": "Bedtime", "duration": "Ongoing", "notes": "No change"}],
        [{"drug": "Aspirin", "dose": "81mg", "frequency": "Once daily", "duration": "Ongoing", "notes": "Antiplatelet therapy"},
         {"drug": "Atorvastatin", "dose": "40mg", "frequency": "Once daily at bedtime", "duration": "Ongoing", "notes": "LDL target <70"},
         {"drug": "Metformin", "dose": "1000mg", "frequency": "Twice daily", "duration": "Ongoing", "notes": "With meals"}],
        [],
        [{"drug": "Losartan", "dose": "50mg", "frequency": "Once daily", "duration": "30 days", "notes": "Switch from Amlodipine"}],
        [{"drug": "Fluticasone/Salmeterol", "dose": "250/50mcg", "frequency": "Twice daily", "duration": "90 days", "notes": "Step-up therapy"},
         {"drug": "Montelukast", "dose": "10mg", "frequency": "Once daily at bedtime", "duration": "Ongoing", "notes": "Continue"}],
        [{"drug": "Furosemide", "dose": "60mg", "frequency": "Once daily morning", "duration": "30 days", "notes": "Increased from 40mg"},
         {"drug": "Losartan", "dose": "50mg", "frequency": "Once daily", "duration": "Ongoing", "notes": "Continue"},
         {"drug": "Metformin", "dose": "500mg", "frequency": "Twice daily", "duration": "Ongoing", "notes": "Pending renal function check"}],
    ]

    for i, apt in enumerate(completed):
        cid = uid()
        consults.append(dict(
            consultation_id=cid,
            doctor_id=apt["doctor_id"],
            patient_id=apt["patient_id"],
            appointment_id=apt["appointment_id"],
            transcription=f"[Transcription for visit on {apt['appointment_date'].strftime('%Y-%m-%d')}]\nDoctor: Hello, how are you feeling today?\nPatient: {soap_templates[i]['subjective'][:80]}...\n[Full transcription available]",
            soap_note=soap_templates[i],
            icd_codes=icd_templates[i],
            prescription=rx_templates[i],
            patient_summary=f"Visit Summary: {soap_templates[i]['assessment']} Your doctor has recommended: {soap_templates[i]['plan'][:100]}...",
            emr_data={
                "vitals": {
                    "blood_pressure": soap_templates[i]["objective"].split("BP ")[1].split(",")[0] if "BP " in soap_templates[i]["objective"] else "N/A",
                    "heart_rate": soap_templates[i]["objective"].split("HR ")[1].split(",")[0] if "HR " in soap_templates[i]["objective"] else "N/A",
                    "temperature": soap_templates[i]["objective"].split("Temp ")[1].split(",")[0].split(".")[0] + "F" if "Temp " in soap_templates[i]["objective"] else "N/A",
                    "spo2": soap_templates[i]["objective"].split("SpO2 ")[1].split("%")[0] + "%" if "SpO2 " in soap_templates[i]["objective"] else "N/A",
                },
                "chief_complaint": apt["reason"],
                "assessment": soap_templates[i]["assessment"],
                "plan": soap_templates[i]["plan"],
            },
            status="confirmed" if i < 7 else "reviewed",
            consultation_date=apt["appointment_date"],
        ))
        # Link consultation back to appointment
        apt["consultation_id"] = cid

    return consults


CONSULTATIONS = make_consultations()


# ── Documents (sample analyzed docs) ──────────────────────────────────────────

DOCUMENTS = [
    dict(
        document_id=uid(),
        patient_id=PATIENTS[0]["patient_id"],
        doctor_id=DOCTORS[0]["doctor_id"],
        document_name="HbA1c_Lab_Report_2025.pdf",
        document_type="lab_report",
        file_path="uploads/documents/hba1c_sarah.pdf",
        file_size_kb=245,
        mime_type="application/pdf",
        notes="Quarterly diabetes monitoring",
        analysis_result={
            "summary": "HbA1c level is 7.2% indicating fair glycemic control. Fasting glucose 128 mg/dL (slightly elevated). Kidney function normal with eGFR >90.",
            "key_findings": ["HbA1c: 7.2% (Target <7%)", "Fasting Glucose: 128 mg/dL (High)", "eGFR: 92 mL/min (Normal)"],
            "recommendations": ["Consider adjusting insulin dosage", "Recheck in 3 months"],
            "risk_level": "moderate"
        },
    ),
    dict(
        document_id=uid(),
        patient_id=PATIENTS[1]["patient_id"],
        doctor_id=DOCTORS[1]["doctor_id"],
        document_name="ECG_Report_Michael.pdf",
        document_type="ecg",
        file_path="uploads/documents/ecg_michael.pdf",
        file_size_kb=189,
        mime_type="application/pdf",
        notes="Follow-up ECG for atrial fibrillation",
        analysis_result={
            "summary": "12-lead ECG shows controlled atrial fibrillation with ventricular rate of 78 bpm. No ST changes. PR interval normal in conducted beats.",
            "key_findings": ["Atrial fibrillation - rate controlled", "Ventricular rate: 78 bpm", "No acute ischemic changes"],
            "recommendations": ["Continue rate control medication", "Repeat ECG in 6 months"],
            "risk_level": "low"
        },
    ),
    dict(
        document_id=uid(),
        patient_id=PATIENTS[2]["patient_id"],
        doctor_id=DOCTORS[2]["doctor_id"],
        document_name="Chest_XRay_Emily.pdf",
        document_type="xray",
        file_path="uploads/documents/cxr_emily.pdf",
        file_size_kb=512,
        mime_type="application/pdf",
        notes="COPD exacerbation evaluation",
        analysis_result={
            "summary": "PA and lateral chest X-ray shows hyperinflated lungs consistent with COPD. No focal consolidation or effusion. Heart size normal.",
            "key_findings": ["Hyperinflated lungs", "No pneumonia", "No pleural effusion", "Normal cardiac silhouette"],
            "recommendations": ["Continue current COPD management", "No antibiotics needed based on imaging"],
            "risk_level": "low"
        },
    ),
    dict(
        document_id=uid(),
        patient_id=PATIENTS[5]["patient_id"],
        doctor_id=DOCTORS[0]["doctor_id"],
        document_name="Lipid_Panel_James.pdf",
        document_type="lab_report",
        file_path="uploads/documents/lipid_james.pdf",
        file_size_kb=178,
        mime_type="application/pdf",
        notes="Cardiac risk monitoring post-stent",
        analysis_result={
            "summary": "Total cholesterol 195 mg/dL (borderline). LDL 98 mg/dL — close to target of <70 for high-risk patients. HDL 52 mg/dL. Triglycerides 140 mg/dL.",
            "key_findings": ["Total Cholesterol: 195 mg/dL", "LDL: 98 mg/dL (Target <70)", "HDL: 52 mg/dL", "Triglycerides: 140 mg/dL"],
            "recommendations": ["Consider increasing Atorvastatin to 80mg", "Dietary modifications for LDL reduction"],
            "risk_level": "moderate"
        },
    ),
    dict(
        document_id=uid(),
        patient_id=PATIENTS[9]["patient_id"],
        doctor_id=DOCTORS[0]["doctor_id"],
        document_name="BNP_Renal_Panel_Ethan.pdf",
        document_type="lab_report",
        file_path="uploads/documents/bnp_ethan.pdf",
        file_size_kb=220,
        mime_type="application/pdf",
        notes="Heart failure and renal monitoring",
        analysis_result={
            "summary": "BNP elevated at 480 pg/mL indicating active heart failure. Creatinine 1.4 mg/dL with eGFR 52 (Stage 3a CKD). Potassium 4.8 mEq/L (upper normal).",
            "key_findings": ["BNP: 480 pg/mL (Elevated)", "Creatinine: 1.4 mg/dL (High)", "eGFR: 52 (Stage 3a CKD)", "Potassium: 4.8 mEq/L"],
            "recommendations": ["Optimize diuretic therapy", "Monitor potassium closely", "Consider cardiology referral for advanced HF management"],
            "risk_level": "high"
        },
    ),
]


# ── Main Seed Function ─────────────────────────────────────────────────────────

async def seed():
    async with async_session_factory() as session:
        # Clean all tables first
        print("Cleaning existing data...")
        await session.execute(text(
            "TRUNCATE documents, consultations, appointments, patient_onboarding, patients, doctors, audit_log, chat_history, notification_log CASCADE"
        ))
        await session.commit()
        print("  Tables truncated.")

        print("Seeding database...")

        # Doctors
        for d in DOCTORS:
            session.add(Doctor(**d))
        print(f"  + {len(DOCTORS)} doctors")

        # Patients
        for p in PATIENTS:
            session.add(Patient(**p))
        print(f"  + {len(PATIENTS)} patients")

        # Onboarding
        for o in ONBOARDING:
            session.add(PatientOnboarding(onboarding_id=uid(), **o))
        print(f"  + {len(ONBOARDING)} onboarding records")

        # Appointments
        for a in APPOINTMENTS:
            session.add(Appointment(**a))
        print(f"  + {len(APPOINTMENTS)} appointments")

        # Consultations
        for c in CONSULTATIONS:
            session.add(Consultation(**c))
        print(f"  + {len(CONSULTATIONS)} consultations")

        # Documents
        for doc in DOCUMENTS:
            session.add(Document(**doc))
        print(f"  + {len(DOCUMENTS)} documents")

        await session.commit()
        print("\nSeed complete!")
        print(f"Login credentials: any email above with password 'password123'")
        print(f"Example: sarah.jenkins@email.com / password123 (patient)")
        print(f"Example: robert.chen@smartemr.local / password123 (doctor)")


if __name__ == "__main__":
    asyncio.run(seed())

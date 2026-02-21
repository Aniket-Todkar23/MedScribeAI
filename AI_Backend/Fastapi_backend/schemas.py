"""
EMR Pipeline — Pydantic Models (FHIR R4 Aligned)
=================================================
Comprehensive schemas aligned to HL7 FHIR R4 resources for
interoperability with Epic, Cerner, Allscripts, and other EMR systems.

FHIR Resource Mapping:
  Patient               → PatientDemographics
  Encounter             → EncounterInfo
  Condition             → Diagnosis (+ ICD-10)
  Observation           → Vital, LabResult
  MedicationStatement   → Medication
  AllergyIntolerance    → Allergy
  Procedure             → Procedure
  FamilyMemberHistory   → FamilyHistoryItem
  DocumentReference     → Clinical narratives (CC, HPI, ROS, PE, A&P)
"""

from __future__ import annotations
from pydantic import BaseModel, Field
from typing import List, Optional, Dict
from enum import Enum
from datetime import datetime
import uuid


# ═════════════════════════════════════════════════════════════════════════════
# ENUMS
# ═════════════════════════════════════════════════════════════════════════════

class SpeakerRole(str, Enum):
    CLINICIAN = "CLINICIAN"
    PATIENT   = "PATIENT"
    UNKNOWN   = "UNKNOWN"

class EncounterStatus(str, Enum):
    DRAFT       = "draft"
    IN_PROGRESS = "in-progress"
    COMPLETED   = "completed"
    REVIEWED    = "reviewed"
    AMENDED     = "amended"
    CANCELLED   = "cancelled"

class EncounterType(str, Enum):
    OUTPATIENT  = "outpatient"
    INPATIENT   = "inpatient"
    EMERGENCY   = "emergency"
    TELEHEALTH  = "telehealth"
    HOME_VISIT  = "home-visit"
    OTHER       = "other"

class DiagnosisCertainty(str, Enum):
    CONFIRMED    = "confirmed"
    SUSPECTED    = "suspected"
    PROVISIONAL  = "provisional"
    RULED_OUT    = "ruled_out"
    DIFFERENTIAL = "differential"

class MedicationStatus(str, Enum):
    ACTIVE        = "active"
    PRESCRIBED    = "prescribed"
    DISCONTINUED  = "discontinued"
    ON_HOLD       = "on-hold"
    COMPLETED     = "completed"

class AllergySeverity(str, Enum):
    MILD     = "mild"
    MODERATE = "moderate"
    SEVERE   = "severe"
    UNKNOWN  = "unknown"

class AllergyStatus(str, Enum):
    ACTIVE   = "active"
    INACTIVE = "inactive"
    RESOLVED = "resolved"

class AllergyType(str, Enum):
    ALLERGY     = "allergy"
    INTOLERANCE = "intolerance"
    UNKNOWN     = "unknown"


# ═════════════════════════════════════════════════════════════════════════════
# PIPELINE INTERMEDIATE TYPES (Transcription)
# ═════════════════════════════════════════════════════════════════════════════

class DialogueTurn(BaseModel):
    index: int
    speaker: SpeakerRole
    text: str
    start_time: Optional[float] = None
    end_time: Optional[float]   = None
    confidence: float = 0.0
    method: str = ""

class ClassifiedTranscript(BaseModel):
    turns: List[DialogueTurn]
    total_turns: int
    clinician_turns: int
    patient_turns: int
    unknown_turns: int
    raw_transcript: str


# ═════════════════════════════════════════════════════════════════════════════
# FHIR-ALIGNED CODING SYSTEM
# ═════════════════════════════════════════════════════════════════════════════

class CodingEntry(BaseModel):
    """FHIR Coding — represents a code in a specific code system."""
    system: str                          # e.g. "http://hl7.org/fhir/sid/icd-10-cm"
    code: str                            # e.g. "R07.9"
    display: str                         # e.g. "Chest pain, unspecified"
    version: Optional[str] = None

class ICDCode(BaseModel):
    """ICD code with match metadata (used for auto-mapping)."""
    code: str
    title: str
    version: int = 10                    # 9 or 10
    score: Optional[float] = None        # match confidence 0-1


# ═════════════════════════════════════════════════════════════════════════════
# PATIENT DEMOGRAPHICS (FHIR: Patient)
# ═════════════════════════════════════════════════════════════════════════════

class ContactInfo(BaseModel):
    phone: Optional[str] = None
    email: Optional[str] = None
    address: Optional[str] = None
    city: Optional[str] = None
    state: Optional[str] = None
    zip_code: Optional[str] = None
    country: Optional[str] = None

class InsuranceInfo(BaseModel):
    provider: Optional[str] = None
    policy_number: Optional[str] = None
    group_number: Optional[str] = None
    subscriber_name: Optional[str] = None

class EmergencyContact(BaseModel):
    name: Optional[str] = None
    relationship: Optional[str] = None
    phone: Optional[str] = None

class PatientDemographics(BaseModel):
    """FHIR Patient resource — core demographic data."""
    patient_id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    mrn: Optional[str] = None                          # Medical Record Number
    name: Optional[str] = None
    date_of_birth: Optional[str] = None                # ISO date string
    age: Optional[str] = None
    gender: Optional[str] = None                       # male | female | other | unknown
    race: Optional[str] = None
    ethnicity: Optional[str] = None
    preferred_language: Optional[str] = None
    contact: Optional[ContactInfo] = None
    insurance: Optional[InsuranceInfo] = None
    emergency_contact: Optional[EmergencyContact] = None


# ═════════════════════════════════════════════════════════════════════════════
# ENCOUNTER INFO (FHIR: Encounter)
# ═════════════════════════════════════════════════════════════════════════════

class ProviderInfo(BaseModel):
    """Clinician who conducted the encounter."""
    provider_id: Optional[str] = None
    name: Optional[str] = None
    role: Optional[str] = None                         # e.g. "attending", "resident"
    specialty: Optional[str] = None
    npi: Optional[str] = None                          # National Provider Identifier

class FacilityInfo(BaseModel):
    name: Optional[str] = None
    type: Optional[str] = None                         # e.g. "hospital", "clinic"
    address: Optional[str] = None

class EncounterInfo(BaseModel):
    """FHIR Encounter resource — visit context."""
    encounter_id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    encounter_type: EncounterType = EncounterType.OUTPATIENT
    encounter_date: str = Field(default_factory=lambda: datetime.utcnow().strftime("%Y-%m-%d"))
    start_time: Optional[str] = None
    end_time: Optional[str] = None
    reason_for_visit: Optional[str] = None
    provider: Optional[ProviderInfo] = None
    facility: Optional[FacilityInfo] = None
    referral_source: Optional[str] = None


# ═════════════════════════════════════════════════════════════════════════════
# CLINICAL ENTITIES (FHIR Resources)
# ═════════════════════════════════════════════════════════════════════════════

# ── Vitals (FHIR: Observation — vital-signs category) ────────────────────
class Vital(BaseModel):
    name: str                                          # e.g. "blood_pressure"
    value: str
    unit: Optional[str] = None
    timestamp: Optional[str] = None
    coding: List[CodingEntry] = []                     # LOINC codes

# ── Symptoms (extracted from patient narrative) ──────────────────────────
class Symptom(BaseModel):
    description: str
    duration: Optional[str] = None
    severity: Optional[str] = None
    location: Optional[str] = None
    onset: Optional[str] = None
    character: Optional[str] = None
    aggravating_factors: List[str] = []
    relieving_factors: List[str] = []
    associated_symptoms: List[str] = []
    icd_codes: List[ICDCode] = []

# ── Diagnoses (FHIR: Condition) ──────────────────────────────────────────
class Diagnosis(BaseModel):
    condition: str
    certainty: Optional[str] = "suspected"
    onset_date: Optional[str] = None
    notes: Optional[str] = None
    coding: List[CodingEntry] = []                     # ICD-10-CM / SNOMED CT
    icd_codes: List[ICDCode] = []

# ── Medications (FHIR: MedicationStatement / MedicationRequest) ──────────
class Medication(BaseModel):
    name: str
    dose: Optional[str] = None
    frequency: Optional[str] = None
    route: Optional[str] = None                        # oral, IV, topical, etc.
    status: Optional[str] = "active"
    prescribed_date: Optional[str] = None
    prescriber: Optional[str] = None
    reason: Optional[str] = None
    coding: List[CodingEntry] = []                     # RxNorm codes

# ── Allergies (FHIR: AllergyIntolerance) ─────────────────────────────────
class Allergy(BaseModel):
    substance: str
    reaction: Optional[str] = None
    severity: Optional[str] = None                     # mild | moderate | severe
    allergy_type: Optional[str] = None                 # allergy | intolerance
    clinical_status: Optional[str] = "active"          # active | inactive | resolved
    onset_date: Optional[str] = None
    coding: List[CodingEntry] = []

# ── Lab Results (FHIR: Observation — laboratory category) ────────────────
class LabResult(BaseModel):
    test_name: str
    value: Optional[str] = None
    unit: Optional[str] = None
    reference_range: Optional[str] = None
    interpretation: Optional[str] = None               # normal | abnormal | critical
    date_collected: Optional[str] = None
    coding: List[CodingEntry] = []                     # LOINC codes

# ── Procedures (FHIR: Procedure) ─────────────────────────────────────────
class Procedure(BaseModel):
    name: str
    date: Optional[str] = None
    status: Optional[str] = None                       # completed | in-progress | planned
    notes: Optional[str] = None
    coding: List[CodingEntry] = []                     # CPT / SNOMED codes

# ── Medical History (FHIR: Condition with category=problem-list) ─────────
class MedicalHistoryItem(BaseModel):
    condition: str
    date_or_duration: Optional[str] = None
    status: Optional[str] = None                       # active | resolved | inactive
    relation: Optional[str] = "self"

# ── Family History (FHIR: FamilyMemberHistory) ───────────────────────────
class FamilyHistoryItem(BaseModel):
    relation: str                                      # father, mother, sibling, etc.
    condition: str
    age_at_onset: Optional[str] = None
    deceased: Optional[bool] = None
    notes: Optional[str] = None

# ── Social History ───────────────────────────────────────────────────────
class SocialHistory(BaseModel):
    smoking: Optional[str] = None
    alcohol: Optional[str] = None
    cannabis: Optional[str] = None
    other_drugs: Optional[str] = None
    occupation: Optional[str] = None
    exercise: Optional[str] = None
    living_situation: Optional[str] = None
    marital_status: Optional[str] = None
    sexual_history: Optional[str] = None
    diet: Optional[str] = None
    education: Optional[str] = None
    travel_history: Optional[str] = None


# ═════════════════════════════════════════════════════════════════════════════
# EXTRACTED ENTITIES (NER output)
# ═════════════════════════════════════════════════════════════════════════════

class ExtractedEntities(BaseModel):
    vitals: List[Vital] = []
    symptoms: List[Symptom] = []
    diagnoses: List[Diagnosis] = []
    medications: List[Medication] = []
    allergies: List[Allergy] = []
    lab_results: List[LabResult] = []
    procedures: List[Procedure] = []
    medical_history: List[MedicalHistoryItem] = []
    family_history: List[FamilyHistoryItem] = []
    social_history: Optional[SocialHistory] = None


# ═════════════════════════════════════════════════════════════════════════════
# REVIEW OF SYSTEMS (ROS) — Standard 14-system review
# ═════════════════════════════════════════════════════════════════════════════

class ReviewOfSystems(BaseModel):
    """Standard 14-system ROS used in clinical documentation."""
    constitutional: Optional[str] = None               # fever, weight change, fatigue
    eyes: Optional[str] = None                         # vision changes, pain
    ent: Optional[str] = None                          # ear/nose/throat
    cardiovascular: Optional[str] = None               # chest pain, palpitations
    respiratory: Optional[str] = None                  # cough, dyspnea, wheezing
    gastrointestinal: Optional[str] = None             # nausea, vomiting, diarrhea
    genitourinary: Optional[str] = None                # dysuria, frequency
    musculoskeletal: Optional[str] = None              # joint pain, swelling
    integumentary: Optional[str] = None                # rashes, lesions
    neurological: Optional[str] = None                 # headache, dizziness, numbness
    psychiatric: Optional[str] = None                  # mood, anxiety, sleep
    endocrine: Optional[str] = None                    # polyuria, heat/cold intolerance
    hematologic: Optional[str] = None                  # bleeding, bruising
    immunologic: Optional[str] = None                  # recurrent infections


# ═════════════════════════════════════════════════════════════════════════════
# CLINICAL NARRATIVES (SOAP Format)
# ═════════════════════════════════════════════════════════════════════════════

class ClinicalNarratives(BaseModel):
    """Standard clinical documentation sections (SOAP note)."""
    chief_complaint: str = ""
    history_of_present_illness: str = ""
    review_of_systems: Optional[ReviewOfSystems] = None
    physical_examination: Optional[str] = None
    assessment: str = ""
    plan: str = ""
    patient_instructions: str = ""
    follow_up: Optional[str] = None


# ═════════════════════════════════════════════════════════════════════════════
# STRUCTURED EMR RECORD (Complete FHIR-aligned document)
# ═════════════════════════════════════════════════════════════════════════════

class EMRRecord(BaseModel):
    """
    Complete EMR record aligned to HL7 FHIR R4.
    Maps to: Patient, Encounter, Condition, Observation,
    MedicationStatement, AllergyIntolerance, Procedure,
    FamilyMemberHistory, DocumentReference.
    """
    # ── Record metadata ──────────────────────────────────────────────────
    record_id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    fhir_version: str = "R4"
    status: EncounterStatus = EncounterStatus.DRAFT
    created_at: str = Field(default_factory=lambda: datetime.utcnow().isoformat())
    updated_at: Optional[str] = None

    # ── Patient & Encounter ──────────────────────────────────────────────
    patient: PatientDemographics
    encounter: EncounterInfo

    # ── Clinical Entities ────────────────────────────────────────────────
    vitals: List[Vital] = []
    symptoms: List[Symptom] = []
    diagnoses: List[Diagnosis] = []
    medications: List[Medication] = []
    allergies: List[Allergy] = []
    lab_results: List[LabResult] = []
    procedures: List[Procedure] = []

    # ── History ──────────────────────────────────────────────────────────
    medical_history: List[MedicalHistoryItem] = []
    surgical_history: List[MedicalHistoryItem] = []
    family_history: List[FamilyHistoryItem] = []
    social_history: Optional[SocialHistory] = None
    immunization_status: Optional[str] = None

    # ── Clinical Narratives (SOAP) ───────────────────────────────────────
    narratives: ClinicalNarratives = Field(default_factory=ClinicalNarratives)

    # ── Coding & Billing ─────────────────────────────────────────────────
    icd10_codes: List[ICDCode] = []                    # All ICD-10 codes for encounter
    cpt_codes: List[CodingEntry] = []                  # CPT procedure codes

    # ── Processing Metadata ──────────────────────────────────────────────
    audio_duration_seconds: Optional[float] = None
    transcript_char_count: int = 0
    total_dialogue_turns: int = 0
    processing_notes: List[str] = []                   # Warnings, info from pipeline


# ═════════════════════════════════════════════════════════════════════════════
# ENDPOINT REQUEST / RESPONSE SCHEMAS
# ═════════════════════════════════════════════════════════════════════════════

class TranscribeResponse(BaseModel):
    transcript: ClassifiedTranscript
    audio_duration_seconds: float

class ExtractRequest(BaseModel):
    transcript: ClassifiedTranscript

class ExtractResponse(BaseModel):
    entities: ExtractedEntities

class GenerateEMRRequest(BaseModel):
    entities: ExtractedEntities
    transcript: ClassifiedTranscript
    patient_id: Optional[str] = None
    encounter_date: Optional[str] = None
    encounter_type: Optional[str] = None
    audio_duration: Optional[float] = None
    # Optional pre-populated fields
    patient_name: Optional[str] = None
    provider_name: Optional[str] = None
    facility_name: Optional[str] = None

class GenerateEMRResponse(BaseModel):
    emr_record: EMRRecord

class PatientSummaryRequest(BaseModel):
    emr_record: EMRRecord

class PatientSummaryResponse(BaseModel):
    patient_summary: str


# ─── ICD Code Endpoints ──────────────────────────────────────────────────

class ICDLookupRequest(BaseModel):
    query: str
    version: Optional[int] = 10
    top_k: int = 5

class ICDLookupResponse(BaseModel):
    query: str
    matches: List[ICDCode]

class DiagnosticSuggestion(BaseModel):
    condition: str
    likelihood: str                                    # high | moderate | low
    reasoning: str
    icd10_codes: List[ICDCode] = []

class SuggestDiagnosesRequest(BaseModel):
    symptoms: List[Symptom]
    age: Optional[str] = None
    gender: Optional[str] = None
    social_history: Optional[SocialHistory] = None
    family_history: List[FamilyHistoryItem] = []

class SuggestDiagnosesResponse(BaseModel):
    suggestions: List[DiagnosticSuggestion]


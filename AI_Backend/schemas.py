"""
AI Core Service — Pydantic Schemas
====================================
Unified schemas for all endpoints. Clean reimplementation combining
the old Fastapi_backend schemas and Doc_Analysis_Backend schemas.

The primary backend (server/) sends requests matching these shapes and
expects responses matching these shapes.
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

class DocumentType(str, Enum):
    LAB_REPORT     = "lab_report"
    PRESCRIPTION   = "prescription"
    RADIOLOGY      = "radiology"
    PATHOLOGY      = "pathology"
    DISCHARGE      = "discharge_summary"
    CLINICAL_NOTE  = "clinical_note"
    UNKNOWN        = "unknown"

class AbnormalityFlag(str, Enum):
    NORMAL    = "normal"
    HIGH      = "high"
    LOW       = "low"
    CRITICAL  = "critical"
    ABNORMAL  = "abnormal"

class UrgencyLevel(str, Enum):
    ROUTINE  = "routine"
    URGENT   = "urgent"
    CRITICAL = "critical"


# ═════════════════════════════════════════════════════════════════════════════
# FHIR-ALIGNED CODING
# ═════════════════════════════════════════════════════════════════════════════

class CodingEntry(BaseModel):
    system: str
    code: str
    display: str
    version: Optional[str] = None

class ICDCode(BaseModel):
    code: str
    title: str
    version: int = 10
    score: Optional[float] = None


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
    patient_id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    mrn: Optional[str] = None
    name: Optional[str] = None
    date_of_birth: Optional[str] = None
    age: Optional[str] = None
    gender: Optional[str] = None
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
    provider_id: Optional[str] = None
    name: Optional[str] = None
    role: Optional[str] = None
    specialty: Optional[str] = None
    npi: Optional[str] = None

class FacilityInfo(BaseModel):
    name: Optional[str] = None
    type: Optional[str] = None
    address: Optional[str] = None

class EncounterInfo(BaseModel):
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
# CLINICAL ENTITIES
# ═════════════════════════════════════════════════════════════════════════════

class Vital(BaseModel):
    name: str
    value: str
    unit: Optional[str] = None
    timestamp: Optional[str] = None
    coding: List[CodingEntry] = []

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

class Diagnosis(BaseModel):
    condition: str
    certainty: Optional[str] = "suspected"
    onset_date: Optional[str] = None
    notes: Optional[str] = None
    coding: List[CodingEntry] = []
    icd_codes: List[ICDCode] = []

class Medication(BaseModel):
    name: str
    dose: Optional[str] = None
    frequency: Optional[str] = None
    route: Optional[str] = None
    status: Optional[str] = "active"
    prescribed_date: Optional[str] = None
    prescriber: Optional[str] = None
    reason: Optional[str] = None
    coding: List[CodingEntry] = []

class Allergy(BaseModel):
    substance: str
    reaction: Optional[str] = None
    severity: Optional[str] = None
    allergy_type: Optional[str] = None
    clinical_status: Optional[str] = "active"
    onset_date: Optional[str] = None
    coding: List[CodingEntry] = []

class LabResult(BaseModel):
    test_name: str
    value: Optional[str] = None
    unit: Optional[str] = None
    reference_range: Optional[str] = None
    interpretation: Optional[str] = None
    date_collected: Optional[str] = None
    coding: List[CodingEntry] = []

class Procedure(BaseModel):
    name: str
    date: Optional[str] = None
    status: Optional[str] = None
    notes: Optional[str] = None
    coding: List[CodingEntry] = []

class MedicalHistoryItem(BaseModel):
    condition: str
    date_or_duration: Optional[str] = None
    status: Optional[str] = None
    relation: Optional[str] = "self"

class FamilyHistoryItem(BaseModel):
    relation: str
    condition: str
    age_at_onset: Optional[str] = None
    deceased: Optional[bool] = None
    notes: Optional[str] = None

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
# REVIEW OF SYSTEMS & NARRATIVES
# ═════════════════════════════════════════════════════════════════════════════

class ReviewOfSystems(BaseModel):
    constitutional: Optional[str] = None
    eyes: Optional[str] = None
    ent: Optional[str] = None
    cardiovascular: Optional[str] = None
    respiratory: Optional[str] = None
    gastrointestinal: Optional[str] = None
    genitourinary: Optional[str] = None
    musculoskeletal: Optional[str] = None
    integumentary: Optional[str] = None
    neurological: Optional[str] = None
    psychiatric: Optional[str] = None
    endocrine: Optional[str] = None
    hematologic: Optional[str] = None
    immunologic: Optional[str] = None

class ClinicalNarratives(BaseModel):
    chief_complaint: str = ""
    history_of_present_illness: str = ""
    review_of_systems: Optional[ReviewOfSystems] = None
    physical_examination: Optional[str] = None
    assessment: str = ""
    plan: str = ""
    patient_instructions: str = ""
    follow_up: Optional[str] = None


# ═════════════════════════════════════════════════════════════════════════════
# EMR RECORD (FHIR R4)
# ═════════════════════════════════════════════════════════════════════════════

class EMRRecord(BaseModel):
    record_id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    fhir_version: str = "R4"
    status: EncounterStatus = EncounterStatus.DRAFT
    created_at: str = Field(default_factory=lambda: datetime.utcnow().isoformat())
    updated_at: Optional[str] = None

    patient: PatientDemographics
    encounter: EncounterInfo

    vitals: List[Vital] = []
    symptoms: List[Symptom] = []
    diagnoses: List[Diagnosis] = []
    medications: List[Medication] = []
    allergies: List[Allergy] = []
    lab_results: List[LabResult] = []
    procedures: List[Procedure] = []

    medical_history: List[MedicalHistoryItem] = []
    surgical_history: List[MedicalHistoryItem] = []
    family_history: List[FamilyHistoryItem] = []
    social_history: Optional[SocialHistory] = None
    immunization_status: Optional[str] = None

    narratives: ClinicalNarratives = Field(default_factory=ClinicalNarratives)

    icd10_codes: List[ICDCode] = []
    cpt_codes: List[CodingEntry] = []

    audio_duration_seconds: Optional[float] = None
    transcript_char_count: int = 0
    total_dialogue_turns: int = 0
    processing_notes: List[str] = []


# ═════════════════════════════════════════════════════════════════════════════
# TRANSCRIPTION SCHEMAS
# ═════════════════════════════════════════════════════════════════════════════

class TranscriptionSegment(BaseModel):
    """A single transcribed segment with timing."""
    text: str
    start: float
    end: float

class TranscribeResponse(BaseModel):
    """Response from /transcribe — plain text transcription of a single audio track."""
    text: str
    segments: List[TranscriptionSegment] = []
    language: str = "en"
    duration: float = 0.0


# ═════════════════════════════════════════════════════════════════════════════
# EXTRACTION SCHEMAS
# ═════════════════════════════════════════════════════════════════════════════

class ExtractRequest(BaseModel):
    """Request body for /extract — transcript text to extract entities from."""
    transcript: str

class ExtractResponse(BaseModel):
    entities: ExtractedEntities


# ═════════════════════════════════════════════════════════════════════════════
# EMR GENERATION SCHEMAS
# ═════════════════════════════════════════════════════════════════════════════

class GenerateEMRRequest(BaseModel):
    """Request body for /generate-emr."""
    extraction: dict   # Raw extraction dict from the primary backend

class GenerateEMRResponse(BaseModel):
    emr_record: EMRRecord


# ═════════════════════════════════════════════════════════════════════════════
# PATIENT SUMMARY SCHEMAS
# ═════════════════════════════════════════════════════════════════════════════

class PatientSummaryRequest(BaseModel):
    emr_record: dict   # Raw EMR dict from the primary backend

class PatientSummaryResponse(BaseModel):
    patient_summary: str


# ═════════════════════════════════════════════════════════════════════════════
# ICD SCHEMAS
# ═════════════════════════════════════════════════════════════════════════════

class ICDLookupRequest(BaseModel):
    query: str
    version: Optional[int] = 10
    limit: int = 5

class ICDLookupResponse(BaseModel):
    query: str
    matches: List[ICDCode]

class DiagnosticSuggestion(BaseModel):
    condition: str
    likelihood: str
    reasoning: str
    icd10_codes: List[ICDCode] = []

class SuggestDiagnosesRequest(BaseModel):
    symptoms: List[dict]   # List of symptom dicts with at least "description"
    age: Optional[str] = None
    gender: Optional[str] = None

class SuggestDiagnosesResponse(BaseModel):
    suggestions: List[DiagnosticSuggestion]


# ═════════════════════════════════════════════════════════════════════════════
# DOCUMENT ANALYSIS SCHEMAS
# ═════════════════════════════════════════════════════════════════════════════

class DocumentMetadata(BaseModel):
    document_type: DocumentType = DocumentType.UNKNOWN
    patient_name: Optional[str] = None
    patient_id: Optional[str] = None
    age: Optional[str] = None
    gender: Optional[str] = None
    date_of_birth: Optional[str] = None
    report_date: Optional[str] = None
    sample_collection_date: Optional[str] = None
    ordering_physician: Optional[str] = None
    reporting_physician: Optional[str] = None
    lab_name: Optional[str] = None
    facility_name: Optional[str] = None
    facility_address: Optional[str] = None
    accession_number: Optional[str] = None
    contact_phone: Optional[str] = None
    patient_address: Optional[str] = None

class LabTest(BaseModel):
    test_name: str
    result: Optional[str] = None
    unit: Optional[str] = None
    reference_range: Optional[str] = None
    flag: AbnormalityFlag = AbnormalityFlag.NORMAL
    notes: Optional[str] = None

class LabPanel(BaseModel):
    panel_name: str
    tests: List[LabTest] = []

class DocICDCode(BaseModel):
    code: str
    description: str
    version: int = 10

class ClinicalInsight(BaseModel):
    finding: str
    significance: str
    urgency: UrgencyLevel = UrgencyLevel.ROUTINE
    related_tests: List[str] = []
    icd_codes: List[DocICDCode] = []
    suggested_followup: Optional[str] = None

class MedicationSuggestion(BaseModel):
    name: str
    indication: str
    dose: Optional[str] = None
    frequency: Optional[str] = None
    route: Optional[str] = None
    notes: Optional[str] = None

class PrescriptionItem(BaseModel):
    drug_name: str
    strength: Optional[str] = None
    form: Optional[str] = None
    quantity: Optional[str] = None
    sig: Optional[str] = None
    refills: Optional[str] = None
    dispense_as_written: Optional[bool] = None
    prescribing_doctor: Optional[str] = None

class StructuredLabReport(BaseModel):
    metadata: DocumentMetadata = Field(default_factory=DocumentMetadata)
    panels: List[LabPanel] = []
    abnormal_results: List[LabTest] = []
    prescriptions: List[PrescriptionItem] = []
    clinical_insights: List[ClinicalInsight] = []
    icd_codes: List[DocICDCode] = []
    medication_suggestions: List[MedicationSuggestion] = []

class ClinicianSummary(BaseModel):
    overall_assessment: str = ""
    system_findings: Dict[str, str] = {}
    critical_values: List[str] = []
    differential_considerations: List[str] = []
    recommended_actions: List[str] = []
    icd_code_summary: List[DocICDCode] = []
    medication_recommendations: List[MedicationSuggestion] = []

class PatientDocSummary(BaseModel):
    greeting: str = ""
    what_was_tested: str = ""
    key_results: str = ""
    what_is_normal: str = ""
    what_needs_attention: str = ""
    next_steps: str = ""
    lifestyle_tips: Optional[str] = None

class DocumentAnalysisResponse(BaseModel):
    document_id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    created_at: str = Field(default_factory=lambda: datetime.utcnow().isoformat())
    markdown_content: str = ""
    structured_report: StructuredLabReport = Field(default_factory=StructuredLabReport)
    clinician_summary: Optional[ClinicianSummary] = None
    patient_summary: Optional[PatientDocSummary] = None
    page_count: int = 1
    processing_time_ms: float = 0
    stages_completed: List[str] = []


# ═════════════════════════════════════════════════════════════════════════════
# PATIENT REPORT RESPONSE (patient-facing document analysis)
# ═════════════════════════════════════════════════════════════════════════════

class PatientReportResponse(BaseModel):
    """Response for /doc/patient-report — patient-friendly document summary."""
    document_id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    created_at: str = Field(default_factory=lambda: datetime.utcnow().isoformat())
    document_type: DocumentType = DocumentType.UNKNOWN
    markdown_content: str = ""
    structured_report: StructuredLabReport = Field(default_factory=StructuredLabReport)
    patient_summary: PatientDocSummary = Field(default_factory=PatientDocSummary)
    page_count: int = 1
    processing_time_ms: float = 0


# ═════════════════════════════════════════════════════════════════════════════
# CLINICIAN REPORT RESPONSE (doctor-facing document analysis)
# ═════════════════════════════════════════════════════════════════════════════

class ClinicianReportResponse(BaseModel):
    """Response for /doc/clinician-report — clinical analysis with flags & ICD codes."""
    document_id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    created_at: str = Field(default_factory=lambda: datetime.utcnow().isoformat())
    document_type: DocumentType = DocumentType.UNKNOWN
    markdown_content: str = ""
    structured_report: StructuredLabReport = Field(default_factory=StructuredLabReport)
    clinician_summary: ClinicianSummary = Field(default_factory=ClinicianSummary)
    page_count: int = 1
    processing_time_ms: float = 0
    medical_history_included: bool = False


# ═════════════════════════════════════════════════════════════════════════════
# CHAT SCHEMAS
# ═════════════════════════════════════════════════════════════════════════════

class ChatMessage(BaseModel):
    role: str
    content: str

class ChatCompletionRequest(BaseModel):
    messages: List[ChatMessage]
    max_tokens: int = 2000
    temperature: float = 0.2

class ChatCompletionResponse(BaseModel):
    response: str
    content: str = ""

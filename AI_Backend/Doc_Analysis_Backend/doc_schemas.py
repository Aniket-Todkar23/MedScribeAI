"""
Document Analysis Pipeline — Pydantic Schemas
==============================================
Structured models for the 3-stage document analysis pipeline:
  Stage 1: Document Perception (raw markdown from Qwen2.5-VL)
  Stage 2: Clinical Extraction (structured JSON from MedGemma)
  Stage 3: Summary Generation (clinician + patient summaries)
"""

from __future__ import annotations
from pydantic import BaseModel, Field
from typing import List, Optional, Dict, Any
from enum import Enum
from datetime import datetime
import uuid


# ═════════════════════════════════════════════════════════════════════════════
# ENUMS
# ═════════════════════════════════════════════════════════════════════════════

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
# STAGE 1: Document Perception Output
# ═════════════════════════════════════════════════════════════════════════════

class DocumentMetadata(BaseModel):
    """Metadata extracted from the document header/footer."""
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


# ═════════════════════════════════════════════════════════════════════════════
# STAGE 2: Clinical Extraction Output
# ═════════════════════════════════════════════════════════════════════════════

class LabTest(BaseModel):
    """A single lab test result."""
    test_name: str
    result: Optional[str] = None
    unit: Optional[str] = None
    reference_range: Optional[str] = None
    flag: AbnormalityFlag = AbnormalityFlag.NORMAL
    notes: Optional[str] = None

class LabPanel(BaseModel):
    """A group of related lab tests (e.g., CBC, BMP, Lipid Panel)."""
    panel_name: str
    tests: List[LabTest] = []

class ICDCode(BaseModel):
    """ICD code mapping."""
    code: str
    description: str
    version: int = 10

class ClinicalInsight(BaseModel):
    """A clinical insight derived from the lab results."""
    finding: str
    significance: str
    urgency: UrgencyLevel = UrgencyLevel.ROUTINE
    related_tests: List[str] = []
    icd_codes: List[ICDCode] = []
    suggested_followup: Optional[str] = None

class MedicationSuggestion(BaseModel):
    """A suggested medication from clinical reasoning."""
    name: str
    indication: str
    dose: Optional[str] = None
    frequency: Optional[str] = None
    route: Optional[str] = None
    notes: Optional[str] = None

class PrescriptionItem(BaseModel):
    """A single prescription item extracted from a prescription document."""
    drug_name: str
    strength: Optional[str] = None              # e.g. "400 mg/5 mL"
    form: Optional[str] = None                   # e.g. "oral suspension", "tablet"
    quantity: Optional[str] = None               # e.g. "100 mL", "30 tablets"
    sig: Optional[str] = None                    # e.g. "1 tsp q.i.d. until all medication is taken"
    refills: Optional[str] = None                # e.g. "0", "3"
    dispense_as_written: Optional[bool] = None   # DAW flag
    prescribing_doctor: Optional[str] = None

class StructuredLabReport(BaseModel):
    """Fully structured lab report from Stage 2."""
    metadata: DocumentMetadata = Field(default_factory=DocumentMetadata)
    panels: List[LabPanel] = []
    abnormal_results: List[LabTest] = []
    prescriptions: List[PrescriptionItem] = []   # Rx items (for prescription documents)
    clinical_insights: List[ClinicalInsight] = []
    icd_codes: List[ICDCode] = []
    medication_suggestions: List[MedicationSuggestion] = []


# ═════════════════════════════════════════════════════════════════════════════
# STAGE 3: Summary Outputs
# ═════════════════════════════════════════════════════════════════════════════

class ClinicianSummary(BaseModel):
    """High-density clinical summary for the provider."""
    overall_assessment: str = ""
    system_findings: Dict[str, str] = {}        # e.g. {"hematologic": "...", "metabolic": "..."}
    critical_values: List[str] = []
    differential_considerations: List[str] = []
    recommended_actions: List[str] = []
    icd_code_summary: List[ICDCode] = []
    medication_recommendations: List[MedicationSuggestion] = []

class PatientSummary(BaseModel):
    """Patient-friendly summary in plain language."""
    greeting: str = ""
    what_was_tested: str = ""
    key_results: str = ""
    what_is_normal: str = ""
    what_needs_attention: str = ""
    next_steps: str = ""
    lifestyle_tips: Optional[str] = None


# ═════════════════════════════════════════════════════════════════════════════
# API REQUEST / RESPONSE SCHEMAS
# ═════════════════════════════════════════════════════════════════════════════

class PerceiveDocumentResponse(BaseModel):
    """Stage 1 result: raw markdown from document perception."""
    document_id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    markdown_content: str
    page_count: int = 1
    processing_time_ms: float = 0

class ExtractFromMarkdownRequest(BaseModel):
    """Request for Stage 2+3: markdown → structured data + summaries."""
    markdown_content: str
    conversation_transcript: Optional[str] = None   # optional context from voice pipeline
    document_type: Optional[DocumentType] = None     # hint for better extraction
    include_summaries: bool = True                   # whether to run Stage 3

class DocumentAnalysisResponse(BaseModel):
    """Full pipeline response (Stages 1+2+3)."""
    document_id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    created_at: str = Field(default_factory=lambda: datetime.utcnow().isoformat())

    # Stage 1
    markdown_content: str = ""

    # Stage 2
    structured_report: StructuredLabReport = Field(default_factory=StructuredLabReport)

    # Stage 3
    clinician_summary: Optional[ClinicianSummary] = None
    patient_summary: Optional[PatientSummary] = None

    # Meta
    page_count: int = 1
    processing_time_ms: float = 0
    stages_completed: List[str] = []


# ═════════════════════════════════════════════════════════════════════════════
# ROLE-SPECIFIC RESPONSE SCHEMAS
# ═════════════════════════════════════════════════════════════════════════════

class DoctorAnalysisResponse(BaseModel):
    """
    Doctor/Clinician-facing response.
    Contains: EMR-ready structured data + clinical summary + anomalies + alerts.
    Use case: Doctor uploads a patient's previous report to review before consultation.
    """
    document_id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    created_at: str = Field(default_factory=lambda: datetime.utcnow().isoformat())

    # Patient & document metadata (EMR fields)
    metadata: DocumentMetadata = Field(default_factory=DocumentMetadata)

    # Structured extraction (EMR data)
    panels: List[LabPanel] = []
    abnormal_results: List[LabTest] = []
    prescriptions: List[PrescriptionItem] = []

    # Clinical reasoning (AI-generated)
    clinical_insights: List[ClinicalInsight] = []
    icd_codes: List[ICDCode] = []
    medication_suggestions: List[MedicationSuggestion] = []

    # Clinician summary (AI-generated consultation report)
    clinician_summary: Optional[ClinicianSummary] = None

    # Meta
    page_count: int = 1
    processing_time_ms: float = 0


class PatientAnalysisResponse(BaseModel):
    """
    Patient-facing response.
    Contains: simple summary of results + lifestyle tips + next steps.
    Use case: Patient uploads their lab report to understand it in plain language.
    """
    document_id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    created_at: str = Field(default_factory=lambda: datetime.utcnow().isoformat())

    # Basic metadata (patient-relevant only)
    patient_name: Optional[str] = None
    report_date: Optional[str] = None
    lab_name: Optional[str] = None
    document_type: DocumentType = DocumentType.UNKNOWN

    # Simplified test results (just abnormal ones)
    abnormal_results: List[LabTest] = []
    total_tests_count: int = 0
    abnormal_count: int = 0
    prescriptions: List[PrescriptionItem] = []

    # Patient-friendly summary (AI-generated)
    patient_summary: Optional[PatientSummary] = None

    # Meta
    page_count: int = 1
    processing_time_ms: float = 0

# ─────────────────────────────────────────────────────────────────────────────
# CHAT API SCHEMAS
# ─────────────────────────────────────────────────────────────────────────────

class ChatMessage(BaseModel):
    role: str = Field(..., description="'system', 'user', or 'assistant'")
    content: str

class ChatCompletionRequest(BaseModel):
    messages: List[ChatMessage]
    max_tokens: int = Field(default=2000)
    temperature: float = Field(default=0.2)
    stream: bool = Field(default=False, description="Whether to stream the response (currently only synchronous supported via proxy)")

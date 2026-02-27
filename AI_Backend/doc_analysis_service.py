"""
Document Analysis Service — 3-Stage Pipeline
=============================================
Orchestrates the full document analysis pipeline:
  Stage 1: Document Perception (Qwen2.5-VL on Modal) — image → markdown
  Stage 2: Clinical Extraction (local parse + MedGemma on Modal) — markdown → structured JSON
  Stage 3: Summary Generation (MedGemma on Modal) — JSON → clinician + patient summaries

Reimplemented from Doc_Analysis_Backend, integrated into AI_Backend.
"""

import re
import json
import time
import base64
import logging
from pathlib import Path
from typing import List, Optional
import asyncio

import httpx

from schemas import (
    DocumentType, AbnormalityFlag, UrgencyLevel,
    DocumentMetadata, LabTest, LabPanel, DocICDCode,
    ClinicalInsight, MedicationSuggestion, PrescriptionItem,
    StructuredLabReport, ClinicianSummary, PatientDocSummary,
    DocumentAnalysisResponse, PatientReportResponse, ClinicianReportResponse,
)

logger = logging.getLogger(__name__)


# ─────────────────────────────────────────────────────────────────────────────
# PROMPTS
# ─────────────────────────────────────────────────────────────────────────────

CLINICAL_REASONING_PROMPT = """You are a senior clinical pathologist. Analyze these lab results and provide clinical interpretation.

⚠ GROUNDING RULES — READ FIRST:
- Base ALL insights ONLY on the ABNORMAL RESULTS explicitly listed below
- Do NOT add diagnoses, conditions, or medications not directly supported by the values shown
- Reference actual test values in your reasoning (e.g., "FBS 141 mg/dL")
- Every ICD code must correspond to a finding directly evidenced by the values below
- If you cannot confirm a finding from the data, omit it — do NOT speculate

DO NOT repeat the test data. Focus ONLY on clinical reasoning.

ABNORMAL RESULTS:
{abnormal_summary}

{transcript_section}

Return ONLY valid JSON with this schema:
{{
  "clinical_insights": [
    {{
      "finding": "Elevated fasting glucose and HbA1c indicating diabetes mellitus",
      "significance": "FBS 141 mg/dL with HbA1c 7.10% confirms Type 2 DM.",
      "urgency": "routine|urgent|critical",
      "related_tests": ["Fasting Blood Sugar", "HbA1c"],
      "icd_codes": [{{"code": "E11.9", "description": "Type 2 diabetes mellitus without complications", "version": 10}}],
      "suggested_followup": "Endocrinology referral, recheck HbA1c in 3 months"
    }}
  ],
  "diagnoses": [
    {{
      "condition": "Type 2 Diabetes Mellitus",
      "certainty": "confirmed",
      "icd_code": "E11.9",
      "icd_description": "Type 2 diabetes mellitus without complications",
      "notes": "Based on FBS 141 and HbA1c 7.10%"
    }}
  ],
  "medication_suggestions": [
    {{
      "name": "Metformin",
      "indication": "Type 2 diabetes",
      "dose": "500mg",
      "frequency": "twice daily",
      "route": "oral",
      "notes": "First-line therapy"
    }}
  ]
}}

CRITICAL OUTPUT RULES:
1. MAX 8 clinical insights — group aggressively
2. Keep "significance" to 1-2 sentences MAX
3. Keep "finding" to under 15 words
4. Provide ICD-10 codes for EVERY insight
5. Correlate findings across panels
6. Suggest medications ONLY when clinically appropriate
7. IMPORTANT: Keep total output SHORT to avoid truncation

JSON:"""

CLINICIAN_SUMMARY_PROMPT = """You are a senior clinical pathologist writing a consultation report for a fellow physician.

⚠ GROUNDING RULES — READ FIRST:
- Base ALL findings, assessments, and recommendations STRICTLY on the document and abnormal findings below
- Do NOT add diagnoses, ICD codes, or medications not directly supported by the provided values
- Reference actual test values in your response (e.g., "FBS 141 mg/dL [high]")
- If a system has no data in the document below, set that system_findings entry to null
- Do NOT generate clinical content beyond what the document supports

Analyze this medical document and its abnormal findings to generate a professional clinical summary.

DOCUMENT (Structured Markdown):
{markdown}

ABNORMAL FINDINGS:
{abnormal_summary}

Return ONLY valid JSON:
{{
  "overall_assessment": "Comprehensive 2-3 sentence clinical assessment.",
  "system_findings": {{
    "hematologic": "CBC summary or null",
    "metabolic": "Glucose/HbA1c summary or null",
    "hepatic": "Liver function or null",
    "renal": "Kidney/urine findings or null",
    "lipid": "Lipid panel or null",
    "thyroid": "Thyroid function or null",
    "endocrine": "Endocrine findings or null",
    "nutritional": "Vitamin D/B12/Iron or null",
    "immunologic": "IgE/allergy or null"
  }},
  "critical_values": ["List critical values needing immediate action"],
  "differential_considerations": ["Differential diagnoses based on lab pattern"],
  "recommended_actions": ["1. Specific action with timeframe", "2. Another action"],
  "icd_code_summary": [{{"code": "E11.9", "description": "Type 2 DM", "version": 10}}],
  "medication_recommendations": [{{"name": "Drug", "indication": "Why", "dose": "Dose", "frequency": "Freq", "route": "oral", "notes": "Brief"}}]
}}

RULES:
- Include system_findings ONLY for systems with actual test data
- Be specific with recommendations
- Reference actual patient values
- ICD codes should cover ALL identified conditions

JSON:"""

PATIENT_SUMMARY_PROMPT = """You are a compassionate health educator explaining lab results to a patient.

⚠ GROUNDING RULES — READ FIRST:
- Base your response ONLY on the CLINICAL ANALYSIS data provided below
- Do NOT invent test results, diagnoses, conditions, or advice not supported by the data
- Only mention tests that actually appear in the data below
- If it is a prescription, do NOT guess why the medication was prescribed

Given this clinical analysis, create a warm, clear, jargon-free summary.

CLINICAL ANALYSIS:
{analysis_json}

Return ONLY valid JSON:
{{
  "greeting": "A warm opening.",
  "what_was_tested": "Simple explanation of what tests were run (from the data above only).",
  "key_results": "Plain language overview of findings shown above. No jargon.",
  "what_is_normal": "Reassuring summary of findings that are within normal range (from the data above).",
  "what_needs_attention": "Gentle explanation of items explicitly flagged abnormal in the data above. If nothing is abnormal, say so positively.",
  "next_steps": "Clear action items based only on what is shown above.",
  "lifestyle_tips": "Helpful, actionable tips relevant to the specific results shown."
}}

RULES:
- NO medical jargon
- Be reassuring but honest
- Keep each field to 2-4 sentences MAX
- Focus on what the patient CAN DO
- Stay strictly within the information provided \u2014 no assumptions

JSON:"""


# ─────────────────────────────────────────────────────────────────────────────
# PATIENT REPORT PROMPT (single MedGemma call, patient-friendly)
# ─────────────────────────────────────────────────────────────────────────────

PATIENT_REPORT_PROMPT = """You are a friendly, compassionate health educator. A patient has uploaded their medical document and wants to understand their results in simple language.

DOCUMENT TYPE: {document_type}

{results_section}

⚠ GROUNDING RULES — READ FIRST:
- Base your response ONLY on the data explicitly provided above
- Do NOT invent test results, diagnoses, or reasons that are not shown in the data
- For prescriptions: do NOT guess why the medication was prescribed or add side effects not mentioned
- For lab results: only flag tests that are explicitly marked as abnormal in the data above
- If a field has no relevant data, say "Nothing specific to note here" — do NOT fabricate content

Return ONLY valid JSON:
{{
  "greeting": "A warm, reassuring opening addressing the patient by name if known.",
  "what_was_tested": "Simple 1-2 sentence explanation of what tests/items are in this document (from the data above only).",
  "key_results": "Plain language overview of the most important findings shown above. No jargon.",
  "what_is_normal": "Reassuring summary of tests/items shown that look fine. Be specific about which ones.",
  "what_needs_attention": "Gentle, non-alarming explanation of any items explicitly marked abnormal in the data above. Explain what each means in everyday language. If nothing is flagged abnormal, say so positively.",
  "next_steps": "Clear, numbered action items the patient should take based on what is shown above.",
  "lifestyle_tips": "2-3 practical health tips relevant to the specific findings shown."
}}

STYLE RULES:
- NO medical jargon — explain like you're talking to a friend
- Use analogies where helpful (e.g., "think of cholesterol like plumbing")
- Be reassuring but honest
- Keep each field to 2-4 sentences MAX to avoid truncation
- Stay strictly within the information provided — no assumptions

JSON:"""


# ─────────────────────────────────────────────────────────────────────────────
# CLINICIAN REPORT PROMPT (single combined MedGemma call)
# ─────────────────────────────────────────────────────────────────────────────

CLINICIAN_REPORT_PROMPT = """You are a senior clinical pathologist providing a report for a fellow physician.

⚠ GROUNDING RULES — READ FIRST:
- Base ALL findings STRICTLY on the ABNORMAL RESULTS listed below
- Do NOT diagnose conditions, suggest medications, or add clinical insights beyond what the provided values directly support
- Do NOT add conditions from the patient history as new diagnoses — only use history to contextualize the lab findings
- Reference actual test values and flags from the data provided (e.g., "WBC 10570 /cmm [high]") — do NOT invent numbers
- If a system has no data in the results below, set its system_findings entry to null
- Every ICD code MUST correspond to a finding directly supported by the values below

ABNORMAL RESULTS FROM THIS REPORT:
{abnormal_summary}

{medical_history_section}

Return ONLY valid JSON (no extra text):
{{
  "clinical_insights": [
    {{
      "finding": "Brief title citing the specific test and value (under 15 words)",
      "significance": "1-2 sentence interpretation based only on the value above",
      "urgency": "routine|urgent|critical",
      "related_tests": ["Exact test names from the data above"],
      "icd_codes": [{{"code": "E11.9", "description": "Type 2 DM", "version": 10}}],
      "suggested_followup": "Specific follow-up based on this finding"
    }}
  ],
  "overall_assessment": "2-3 sentence professional assessment citing specific values from the report.",
  "system_findings": {{
    "hematologic": "CBC summary citing actual values, or null if no CBC data",
    "metabolic": "Glucose/HbA1c summary citing actual values, or null if no metabolic data",
    "hepatic": "Liver function summary, or null if no liver data",
    "renal": "Kidney/urine findings, or null if no renal data",
    "lipid": "Lipid panel summary citing actual values, or null if no lipid data",
    "thyroid": "Thyroid summary citing actual values, or null if no thyroid data"
  }},
  "critical_values": ["Only values from above that require immediate action — leave empty if none"],
  "flags": [
    {{
      "level": "critical|urgent|routine",
      "message": "Flag citing the specific test name and value",
      "action_required": "What to do about this specific value"
    }}
  ],
  "differential_considerations": ["Only differentials directly supported by the lab pattern above"],
  "recommended_actions": ["Specific action with timeframe, based on values above"],
  "icd_codes": [{{"code": "E11.9", "description": "Type 2 DM", "version": 10}}],
  "medication_suggestions": [
    {{
      "name": "Drug name",
      "indication": "Specific finding from above that warrants this",
      "dose": "Standard starting dose",
      "frequency": "Frequency",
      "route": "oral",
      "notes": "Brief note"
    }}
  ]
}}

OUTPUT RULES:
1. MAX 6 clinical insights — group related findings aggressively
2. Keep "significance" to 1-2 sentences, citing actual values
3. Every insight must be grounded in a specific abnormal value listed above
4. {history_instruction}
5. Keep total output tight — aim for concise, factual entries

JSON:"""


# ─────────────────────────────────────────────────────────────────────────────
# DOCUMENT ANALYSIS SERVICE
# ─────────────────────────────────────────────────────────────────────────────

class DocumentAnalysisService:
    """Orchestrates the 3-stage document analysis pipeline."""

    def __init__(self, qwen_vl_url: str, medgemma_url: str, timeout: float = 300.0):
        self.qwen_vl_url = qwen_vl_url.rstrip("/")
        self.medgemma_url = medgemma_url.rstrip("/")
        if self.medgemma_url.endswith("/v1/chat/completions"):
            self.medgemma_url = self.medgemma_url[:-20]

        self._client = httpx.AsyncClient(
            timeout=timeout,
            follow_redirects=True,
        )
        self._ready = False

    async def check_health(self) -> dict:
        """Verify connectivity to both Modal endpoints."""
        status = {"qwen_vl": False, "medgemma": False}
        try:
            resp = await self._client.get(f"{self.qwen_vl_url}/health")
            status["qwen_vl"] = resp.status_code == 200
        except Exception as e:
            logger.warning(f"Qwen-VL health check failed: {e}")

        try:
            resp = await self._client.get(f"{self.medgemma_url}/health")
            status["medgemma"] = resp.status_code == 200
        except Exception as e:
            logger.warning(f"MedGemma health check failed: {e}")

        self._ready = status["qwen_vl"] and status["medgemma"]
        return status

    # ─── PDF → Images ────────────────────────────────────────────────────────

    @staticmethod
    def pdf_to_images(pdf_bytes: bytes, dpi: int = 200) -> List[bytes]:
        """Convert PDF pages to PNG images using PyMuPDF."""
        import fitz  # PyMuPDF

        doc = fitz.open(stream=pdf_bytes, filetype="pdf")
        images = []
        for page in doc:
            mat = fitz.Matrix(dpi / 72, dpi / 72)
            pix = page.get_pixmap(matrix=mat)
            images.append(pix.tobytes("png"))
        doc.close()
        return images

    @staticmethod
    def encode_image_base64(image_bytes: bytes) -> str:
        return base64.b64encode(image_bytes).decode("utf-8")

    # ─── Stage 1: Document Perception ────────────────────────────────────────

    async def perceive_document(self, image_bytes_list: List[bytes]) -> str:
        """Stage 1: Send document images to Qwen2.5-VL for markdown extraction."""
        images_payload = [
            {"base64_data": self.encode_image_base64(img)}
            for img in image_bytes_list
        ]

        payload = {
            "images": images_payload,
            "max_tokens": 4096,
            "temperature": 0.1,
        }

        logger.info(f"Stage 1: Sending {len(image_bytes_list)} page(s) to Qwen2.5-VL...")
        resp = await self._client.post(
            f"{self.qwen_vl_url}/v1/analyze-document",
            json=payload,
        )
        resp.raise_for_status()
        data = resp.json()
        markdown = data.get("content", "")
        # Strip markdown code fences that Qwen sometimes wraps around output
        markdown = _strip_code_fences(markdown)
        logger.info(f"Stage 1 complete: {len(markdown)} chars of markdown")
        return markdown

    # ─── Stage 2: Clinical Extraction ────────────────────────────────────────

    async def extract_and_reason(
        self,
        markdown: str,
        conversation_transcript: Optional[str] = None,
    ) -> StructuredLabReport:
        """Stage 2: Parse markdown locally, then call MedGemma for reasoning."""
        report = self._parse_markdown_to_report(markdown)
        logger.info(
            f"Stage 2A (local parse): {len(report.panels)} panels, "
            f"{len(report.abnormal_results)} abnormal"
        )

        # Skip reasoning for prescriptions or empty lab reports
        is_prescription = report.metadata.document_type == DocumentType.PRESCRIPTION
        has_panels = len(report.panels) > 0

        if is_prescription or not has_panels:
            if is_prescription:
                report.prescriptions = self._parse_prescriptions_from_markdown(markdown)
                logger.info(f"Parsed {len(report.prescriptions)} prescription item(s)")
            return report

        # Build abnormal summary for MedGemma
        abnormal_lines = []
        for test in report.abnormal_results:
            line = f"- {test.test_name}: {test.result} {test.unit or ''} (ref: {test.reference_range or 'N/A'}) [{test.flag.value}]"
            abnormal_lines.append(line)

        if not abnormal_lines:
            abnormal_lines = ["No abnormal results found."]

        abnormal_summary = "\n".join(abnormal_lines)

        transcript_section = ""
        if conversation_transcript:
            transcript_section = f"CONVERSATION TRANSCRIPT:\n{conversation_transcript}\n"

        prompt = CLINICAL_REASONING_PROMPT.format(
            abnormal_summary=abnormal_summary,
            transcript_section=transcript_section,
        )

        raw = await self._call_medgemma(prompt, max_tokens=4096)
        logger.info(f"Stage 2D (clinical reasoning): {len(raw)} chars from MedGemma")

        # Merge reasoning into report
        reasoning = _parse_json(raw)
        for insight_data in reasoning.get("clinical_insights", []):
            urgency = insight_data.get("urgency", "routine")
            try:
                urgency_enum = UrgencyLevel(urgency)
            except ValueError:
                urgency_enum = UrgencyLevel.ROUTINE

            icd_codes = [
                DocICDCode(
                    code=str(c.get("code", "")),
                    description=str(c.get("description", "")),
                    version=c.get("version", 10),
                )
                for c in insight_data.get("icd_codes", [])
            ]

            report.clinical_insights.append(ClinicalInsight(
                finding=str(insight_data.get("finding", "")),
                significance=str(insight_data.get("significance", "")),
                urgency=urgency_enum,
                related_tests=insight_data.get("related_tests", []),
                icd_codes=icd_codes,
                suggested_followup=insight_data.get("suggested_followup"),
            ))

        for d in reasoning.get("diagnoses", []):
            code = d.get("icd_code", "")
            desc = d.get("icd_description", d.get("condition", ""))
            if code:
                report.icd_codes.append(DocICDCode(code=code, description=desc, version=10))

        for m in reasoning.get("medication_suggestions", []):
            report.medication_suggestions.append(MedicationSuggestion(
                name=str(m.get("name", "")),
                indication=str(m.get("indication", "")),
                dose=m.get("dose"),
                frequency=m.get("frequency"),
                route=m.get("route"),
                notes=m.get("notes"),
            ))

        logger.info(
            f"Stage 2 complete: {len(report.panels)} panels, "
            f"{len(report.clinical_insights)} insights, "
            f"{len(report.icd_codes)} ICD codes"
        )
        return report

    # ─── Stage 3: Summary Generation ─────────────────────────────────────────

    async def generate_clinician_summary(
        self,
        report: StructuredLabReport,
        markdown: str = "",
    ) -> ClinicianSummary:
        """Stage 3a: Generate clinician summary."""
        is_prescription = report.metadata.document_type == DocumentType.PRESCRIPTION
        if is_prescription or (not report.panels and not report.abnormal_results):
            rx_lines = []
            for rx in report.prescriptions:
                parts = [rx.drug_name]
                if rx.strength:
                    parts.append(rx.strength)
                if rx.quantity:
                    parts.append(f"Qty: {rx.quantity}")
                if rx.sig:
                    parts.append(f"Sig: {rx.sig}")
                if rx.refills:
                    parts.append(f"Refills: {rx.refills}")
                if rx.dispense_as_written is True:
                    parts.append("DAW")
                rx_lines.append(" | ".join(parts))

            rx_desc = "; ".join(rx_lines) if rx_lines else "No specific medications identified."
            patient_name = report.metadata.patient_name or "Patient"
            doctor = report.metadata.reporting_physician or report.metadata.ordering_physician or "Unknown physician"

            return ClinicianSummary(
                overall_assessment=(
                    f"Prescription document for {patient_name}, prescribed by {doctor}. "
                    f"Medications: {rx_desc}."
                ),
                recommended_actions=[
                    "Review prescription in context of patient's medical history.",
                    "Verify no drug interactions or allergies before dispensing.",
                ],
            )

        abnormal_lines = []
        for test in report.abnormal_results:
            line = f"- {test.test_name}: {test.result} {test.unit or ''} (ref: {test.reference_range or 'N/A'}) [{test.flag.value}]"
            abnormal_lines.append(line)
        abnormal_summary = "\n".join(abnormal_lines) if abnormal_lines else "No abnormal results."

        prompt = CLINICIAN_SUMMARY_PROMPT.format(
            markdown=markdown,
            abnormal_summary=abnormal_summary,
        )

        raw = await self._call_medgemma(prompt, max_tokens=2000)
        data = _parse_json(raw)
        return self._to_clinician_summary(data)

    async def generate_patient_summary(self, report: StructuredLabReport) -> PatientDocSummary:
        """Stage 3b: Generate patient-friendly summary."""
        is_prescription = report.metadata.document_type == DocumentType.PRESCRIPTION
        if is_prescription or (not report.panels and not report.abnormal_results):
            rx_parts = []
            for rx in report.prescriptions:
                desc = rx.drug_name
                if rx.strength:
                    desc += f" ({rx.strength})"
                if rx.sig:
                    desc += f" — {rx.sig}"
                rx_parts.append(desc)

            rx_text = ", ".join(rx_parts) if rx_parts else "your prescribed medication"
            doctor = report.metadata.reporting_physician or report.metadata.ordering_physician or "your doctor"

            return PatientDocSummary(
                greeting="Hello! Here is a summary of your prescription.",
                what_was_tested=f"This is a prescription from {doctor}. No lab test results.",
                key_results=f"You have been prescribed: {rx_text}.",
                what_is_normal="This is a prescription — no lab results to review.",
                what_needs_attention="Take your medication exactly as directed.",
                next_steps="1. Fill this prescription.\n2. Take as directed.\n3. Follow up if side effects occur.",
                lifestyle_tips="Stay hydrated, take medications with food if recommended.",
            )

        simplified = {
            "panels": [
                {
                    "panel_name": p.panel_name,
                    "tests": [
                        {
                            "test_name": t.test_name,
                            "result": t.result,
                            "unit": t.unit,
                            "reference_range": t.reference_range,
                            "flag": t.flag.value,
                        }
                        for t in p.tests
                    ],
                }
                for p in report.panels
            ],
            "clinical_insights": [
                {
                    "finding": i.finding,
                    "significance": i.significance,
                    "urgency": i.urgency.value,
                    "suggested_followup": i.suggested_followup,
                }
                for i in report.clinical_insights
            ],
        }
        prompt = PATIENT_SUMMARY_PROMPT.format(analysis_json=json.dumps(simplified, indent=2))

        raw = await self._call_medgemma(prompt, max_tokens=1500)
        data = _parse_json(raw)
        return self._to_patient_summary(data)

    # ─── Full Pipeline ───────────────────────────────────────────────────────

    async def analyze_for_patient(
        self,
        file_bytes: bytes,
        filename: str,
    ) -> PatientReportResponse:
        """Patient-facing pipeline: Qwen perception → local parse → 1 MedGemma patient summary.
        
        Optimized for speed (1 Qwen + 1 MedGemma call) and patient-friendly output.
        Skips clinical reasoning entirely.
        """
        t0 = time.time()

        # Convert file to images
        ext = filename.rsplit(".", 1)[-1].lower() if "." in filename else ""
        if ext == "pdf":
            image_bytes_list = self.pdf_to_images(file_bytes)
            page_count = len(image_bytes_list)
        elif ext in ("png", "jpg", "jpeg", "webp", "bmp", "tiff", "tif"):
            image_bytes_list = [file_bytes]
            page_count = 1
        else:
            raise ValueError(f"Unsupported file type: .{ext}. Use PDF, PNG, JPG, or WEBP.")

        # Stage 1: Qwen-VL perception
        markdown = await self.perceive_document(image_bytes_list)

        # Stage 2: Local parse only (no MedGemma reasoning)
        report = self._parse_markdown_to_report(markdown)
        logger.info(
            f"Patient report parse: {len(report.panels)} panels, "
            f"{len(report.abnormal_results)} abnormal"
        )

        # Handle prescriptions
        is_prescription = report.metadata.document_type == DocumentType.PRESCRIPTION
        if is_prescription or not report.panels:
            report.prescriptions = self._parse_prescriptions_from_markdown(markdown)

        # Stage 3: Single MedGemma call for patient-friendly summary
        patient_summary = await self._generate_patient_report_summary(report)

        elapsed_ms = (time.time() - t0) * 1000
        return PatientReportResponse(
            document_type=report.metadata.document_type,
            markdown_content=markdown,
            structured_report=report,
            patient_summary=patient_summary,
            page_count=page_count,
            processing_time_ms=round(elapsed_ms, 1),
        )

    async def analyze_for_clinician(
        self,
        file_bytes: bytes,
        filename: str,
        medical_history: Optional[str] = None,
    ) -> ClinicianReportResponse:
        """Clinician-facing pipeline: Qwen perception → local parse → 1 combined MedGemma analysis.
        
        Optimized for clinical depth (1 Qwen + 1 MedGemma call).
        Returns clinical insights, ICD codes, flags, and professional summary in one shot.
        Optionally incorporates patient medical history for deeper analysis.
        """
        t0 = time.time()

        # Convert file to images
        ext = filename.rsplit(".", 1)[-1].lower() if "." in filename else ""
        if ext == "pdf":
            image_bytes_list = self.pdf_to_images(file_bytes)
            page_count = len(image_bytes_list)
        elif ext in ("png", "jpg", "jpeg", "webp", "bmp", "tiff", "tif"):
            image_bytes_list = [file_bytes]
            page_count = 1
        else:
            raise ValueError(f"Unsupported file type: .{ext}. Use PDF, PNG, JPG, or WEBP.")

        # Stage 1: Qwen-VL perception
        markdown = await self.perceive_document(image_bytes_list)

        # Stage 2: Local parse
        report = self._parse_markdown_to_report(markdown)
        logger.info(
            f"Clinician report parse: {len(report.panels)} panels, "
            f"{len(report.abnormal_results)} abnormal"
        )

        # Handle prescriptions
        is_prescription = report.metadata.document_type == DocumentType.PRESCRIPTION
        if is_prescription or not report.panels:
            report.prescriptions = self._parse_prescriptions_from_markdown(markdown)

        # For prescriptions with no lab panels, return quick assessment
        if is_prescription or (not report.panels and not report.abnormal_results):
            clinician_summary = await self.generate_clinician_summary(report, markdown=markdown)
            elapsed_ms = (time.time() - t0) * 1000
            return ClinicianReportResponse(
                document_type=report.metadata.document_type,
                markdown_content=markdown,
                structured_report=report,
                clinician_summary=clinician_summary,
                page_count=page_count,
                processing_time_ms=round(elapsed_ms, 1),
                medical_history_included=bool(medical_history),
            )

        # Stage 3: Single combined MedGemma call (reasoning + summary)
        clinician_summary = await self._generate_clinician_report(
            report, markdown, medical_history
        )

        elapsed_ms = (time.time() - t0) * 1000
        return ClinicianReportResponse(
            document_type=report.metadata.document_type,
            markdown_content=markdown,
            structured_report=report,
            clinician_summary=clinician_summary,
            page_count=page_count,
            processing_time_ms=round(elapsed_ms, 1),
            medical_history_included=bool(medical_history),
        )

    # ─── Patient Report Summary (single MedGemma call) ──────────────────────

    async def _generate_patient_report_summary(
        self,
        report: StructuredLabReport,
    ) -> PatientDocSummary:
        """Generate patient-friendly summary with a single MedGemma call."""
        is_prescription = report.metadata.document_type == DocumentType.PRESCRIPTION

        if is_prescription:
            # Build prescription results for prompt (with all parsed fields)
            rx_parts = []
            for rx in report.prescriptions:
                parts = [rx.drug_name]
                if rx.strength:
                    parts.append(rx.strength)
                if rx.quantity:
                    parts.append(f"Qty: {rx.quantity}")
                if rx.sig:
                    parts.append(f"Directions: {rx.sig}")
                if rx.refills:
                    parts.append(f"Refills: {rx.refills}")
                if rx.dispense_as_written is True:
                    parts.append("Dispense as written (no substitution)")
                rx_parts.append("  - " + " | ".join(parts))
            results_section = (
                "PRESCRIBED MEDICATIONS:\n"
                + ("\n".join(rx_parts) if rx_parts else "  (none identified)")
            )
        else:
            # Build lab results for prompt
            lines = []
            for panel in report.panels[:6]:  # Limit panels to manage tokens
                lines.append(f"\n{panel.panel_name}:")
                for test in panel.tests[:15]:  # Limit tests per panel
                    flag_marker = f" [{test.flag.value}]" if test.flag != AbnormalityFlag.NORMAL else ""
                    ref = f" (ref: {test.reference_range})" if test.reference_range else ""
                    lines.append(f"  - {test.test_name}: {test.result} {test.unit or ''}{ref}{flag_marker}")
            results_section = "LAB RESULTS:" + "\n".join(lines) if lines else "No specific test results found."

        prompt = PATIENT_REPORT_PROMPT.format(
            document_type=report.metadata.document_type.value,
            results_section=results_section,
        )

        raw = await self._call_medgemma(prompt, max_tokens=1500)
        data = _parse_json(raw)
        return self._to_patient_summary(data)

    # ─── Clinician Report (single combined MedGemma call) ────────────────────

    async def _generate_clinician_report(
        self,
        report: StructuredLabReport,
        markdown: str,
        medical_history: Optional[str] = None,
    ) -> ClinicianSummary:
        """Generate combined clinical analysis + summary in one MedGemma call."""
        # Build abnormal summary — cap at 25 to avoid prompt overflow
        MAX_ABNORMALS = 25
        total_abnormals = len(report.abnormal_results)
        if total_abnormals > MAX_ABNORMALS:
            logger.info(
                f"Clinician report: capping {total_abnormals} abnormals to {MAX_ABNORMALS} "
                f"for prompt. With improved flag detection this should rarely trigger."
            )
        abnormal_lines = []
        for test in report.abnormal_results[:MAX_ABNORMALS]:
            line = (
                f"- {test.test_name}: {test.result} {test.unit or ''} "
                f"(ref: {test.reference_range or 'N/A'}) [{test.flag.value}]"
            )
            abnormal_lines.append(line)

        if not abnormal_lines:
            abnormal_lines = ["No abnormal results found in this report."]

        abnormal_summary = "\n".join(abnormal_lines)

        # Build medical history section (truncate to ~1500 chars to stay within context)
        medical_history_section = ""
        history_instruction = "No patient history provided — base analysis on lab values only"
        if medical_history:
            truncated_history = medical_history[:1500]
            if len(medical_history) > 1500:
                truncated_history += "\n... (history truncated for context window)"
            medical_history_section = f"PATIENT MEDICAL HISTORY:\n{truncated_history}\n"
            history_instruction = "Correlate lab findings with the patient's medical history when possible"

        prompt = CLINICIAN_REPORT_PROMPT.format(
            abnormal_summary=abnormal_summary,
            medical_history_section=medical_history_section,
            history_instruction=history_instruction,
        )

        raw = await self._call_medgemma(prompt, max_tokens=3500)
        data = _parse_json(raw)
        n_insights = len(data.get('clinical_insights', []))
        n_icd = len(data.get('icd_codes', []))
        logger.info(
            f"Clinician report: {n_insights} insights, {n_icd} ICD codes from MedGemma"
        )
        if n_insights == 0:
            logger.warning(
                f"Clinician report returned 0 insights. "
                f"Raw MedGemma output (first 600 chars): {raw[:600]!r}"
            )

        # Merge clinical insights into the report
        for insight_data in data.get("clinical_insights", []):
            urgency = insight_data.get("urgency", "routine")
            try:
                urgency_enum = UrgencyLevel(urgency)
            except ValueError:
                urgency_enum = UrgencyLevel.ROUTINE

            icd_codes = [
                DocICDCode(
                    code=str(c.get("code", "")),
                    description=str(c.get("description", "")),
                    version=c.get("version", 10),
                )
                for c in insight_data.get("icd_codes", [])
            ]

            report.clinical_insights.append(ClinicalInsight(
                finding=str(insight_data.get("finding", "")),
                significance=str(insight_data.get("significance", "")),
                urgency=urgency_enum,
                related_tests=insight_data.get("related_tests", []),
                icd_codes=icd_codes,
                suggested_followup=insight_data.get("suggested_followup"),
            ))

        # Merge ICD codes into report
        for c in data.get("icd_codes", []):
            code = str(c.get("code", ""))
            desc = str(c.get("description", ""))
            if code:
                report.icd_codes.append(DocICDCode(code=code, description=desc, version=c.get("version", 10)))

        # Merge medication suggestions
        for m in data.get("medication_suggestions", []):
            report.medication_suggestions.append(MedicationSuggestion(
                name=str(m.get("name", "")),
                indication=str(m.get("indication", "")),
                dose=m.get("dose"),
                frequency=m.get("frequency"),
                route=m.get("route"),
                notes=m.get("notes"),
            ))

        # Build ClinicianSummary from the combined output
        system_findings_raw = data.get("system_findings", {})
        system_findings = {
            k: v for k, v in system_findings_raw.items()
            if v is not None and isinstance(v, str) and v.strip() and v.strip().lower() != "null"
        }

        icd_summary = [
            DocICDCode(
                code=str(c.get("code", "")),
                description=str(c.get("description", "")),
                version=c.get("version", 10),
            )
            for c in data.get("icd_codes", [])
        ]

        med_recs = [
            MedicationSuggestion(
                name=str(m.get("name", "")),
                indication=str(m.get("indication", "")),
                dose=m.get("dose"),
                frequency=m.get("frequency"),
                route=m.get("route"),
                notes=m.get("notes"),
            )
            for m in data.get("medication_suggestions", [])
        ]

        # Build flags into recommended_actions if present
        flags_data = data.get("flags", [])
        flag_actions = []
        for f in flags_data:
            level = f.get("level", "routine").upper()
            msg = f.get("message", "")
            action = f.get("action_required", "")
            if msg:
                flag_actions.append(f"[{level}] {msg}" + (f" → {action}" if action else ""))

        recommended_actions = data.get("recommended_actions", [])
        if flag_actions:
            recommended_actions = flag_actions + recommended_actions

        return ClinicianSummary(
            overall_assessment=data.get("overall_assessment", ""),
            system_findings=system_findings,
            critical_values=data.get("critical_values", []),
            differential_considerations=data.get("differential_considerations", []),
            recommended_actions=recommended_actions,
            icd_code_summary=icd_summary,
            medication_recommendations=med_recs,
        )

    # ─── Full Pipeline (existing) ────────────────────────────────────────────

    async def analyze_document(
        self,
        file_bytes: bytes,
        filename: str,
        include_summaries: bool = True,
    ) -> DocumentAnalysisResponse:
        """Full 3-stage pipeline."""
        t0 = time.time()
        stages_completed = []

        ext = filename.rsplit(".", 1)[-1].lower() if "." in filename else ""
        if ext == "pdf":
            image_bytes_list = self.pdf_to_images(file_bytes)
            page_count = len(image_bytes_list)
        elif ext in ("png", "jpg", "jpeg", "webp", "bmp", "tiff", "tif"):
            image_bytes_list = [file_bytes]
            page_count = 1
        else:
            raise ValueError(f"Unsupported file type: .{ext}. Use PDF, PNG, JPG, or WEBP.")

        # Stage 1
        markdown = await self.perceive_document(image_bytes_list)
        stages_completed.append("perception")

        # Stage 2
        structured_report = await self.extract_and_reason(markdown)
        stages_completed.append("extraction")

        # Stage 3
        clinician_summary = None
        patient_summary = None
        if include_summaries:
            clinician_summary = await self.generate_clinician_summary(structured_report, markdown=markdown)
            patient_summary = await self.generate_patient_summary(structured_report)
            stages_completed.append("summarization")

        elapsed_ms = (time.time() - t0) * 1000

        return DocumentAnalysisResponse(
            markdown_content=markdown,
            structured_report=structured_report,
            clinician_summary=clinician_summary,
            patient_summary=patient_summary,
            page_count=page_count,
            processing_time_ms=round(elapsed_ms, 1),
            stages_completed=stages_completed,
        )

    # ─── MedGemma API Call ───────────────────────────────────────────────────

    async def _call_medgemma(self, prompt: str, max_tokens: int = 2000) -> str:
        """Call MedGemma-27B on Modal with retry logic (handles 5xx and connection errors)."""
        payload = {
            "model": "medgemma-27b-it",
            "messages": [{"role": "user", "content": prompt}],
            "max_tokens": max_tokens,
            "temperature": 0.05,
        }

        last_error = None
        for attempt in range(1, 4):
            try:
                resp = await self._client.post(
                    f"{self.medgemma_url}/v1/chat/completions",
                    json=payload,
                )
                # Retry on 5xx (Modal container crash / timeout)
                if resp.status_code >= 500:
                    last_error = f"HTTP {resp.status_code}: {resp.text[:200]}"
                    wait = 2 ** attempt
                    logger.warning(
                        f"MedGemma returned {resp.status_code} (attempt {attempt}/3). "
                        f"Retrying in {wait}s..."
                    )
                    await asyncio.sleep(wait)
                    continue
                resp.raise_for_status()
                data = resp.json()
                choices = data.get("choices", [])
                if choices:
                    return choices[0].get("message", {}).get("content", "")
                return str(data)
            except (httpx.ReadError, httpx.ConnectError, httpx.RemoteProtocolError, httpx.ReadTimeout) as e:
                last_error = e
                wait = 2 ** attempt
                logger.warning(f"MedGemma call failed (attempt {attempt}/3): {e}. Retrying in {wait}s...")
                try:
                    await self._client.aclose()
                except Exception:
                    pass
                self._client = httpx.AsyncClient(timeout=300.0, follow_redirects=True)
                await asyncio.sleep(wait)
            except Exception:
                raise

        raise RuntimeError(f"MedGemma call failed after 3 retries. Last error: {last_error}")

    # ─── Markdown Parsers ────────────────────────────────────────────────────

    def _parse_markdown_to_report(self, markdown: str) -> StructuredLabReport:
        """Parse Stage 1 markdown into StructuredLabReport (no LLM)."""
        report = StructuredLabReport()

        kv_map = self._extract_kv_table(markdown)

        # Document metadata
        doc_type_raw = kv_map.get("document type", "unknown").lower()
        try:
            report.metadata.document_type = DocumentType(doc_type_raw)
        except ValueError:
            report.metadata.document_type = DocumentType.UNKNOWN

        report.metadata.lab_name = self._clean_val(kv_map.get("lab/facility name"))
        report.metadata.facility_name = self._clean_val(kv_map.get("lab/facility name"))
        report.metadata.facility_address = self._clean_val(kv_map.get("facility address"))
        report.metadata.report_date = self._clean_val(kv_map.get("report date"))
        report.metadata.sample_collection_date = self._clean_val(kv_map.get("sample collection date"))
        report.metadata.accession_number = self._clean_val(
            kv_map.get("report id / accession no.") or kv_map.get("report id")
        )

        report.metadata.patient_name = self._clean_val(kv_map.get("patient name"))
        report.metadata.patient_id = self._clean_val(
            kv_map.get("patient id / uhid") or kv_map.get("patient id")
        )
        report.metadata.age = self._clean_val(kv_map.get("age"))
        gender_raw = self._clean_val(kv_map.get("gender / sex") or kv_map.get("gender"))
        if gender_raw:
            report.metadata.gender = gender_raw.lower()
        report.metadata.date_of_birth = self._clean_val(kv_map.get("date of birth"))
        report.metadata.contact_phone = self._clean_val(
            kv_map.get("contact / phone") or kv_map.get("contact")
        )
        report.metadata.patient_address = self._clean_val(kv_map.get("address"))

        report.metadata.ordering_physician = self._clean_val(
            kv_map.get("ordering / referring doctor") or kv_map.get("referring doctor")
        )
        report.metadata.reporting_physician = self._clean_val(
            kv_map.get("pathologist / reporting doctor") or kv_map.get("reporting doctor")
        )

        # Parse test panels
        report.panels = self._extract_test_panels(markdown)

        # Collect abnormal results
        for panel in report.panels:
            for test in panel.tests:
                if test.flag not in (AbnormalityFlag.NORMAL, None):
                    report.abnormal_results.append(test)

        return report

    def _parse_prescriptions_from_markdown(self, markdown: str) -> List[PrescriptionItem]:
        """Parse prescription items from markdown."""
        prescriptions = []
        lines = markdown.split("\n")

        kv_map = self._extract_kv_table(markdown)
        prescriber = self._clean_val(
            kv_map.get("pathologist / reporting doctor")
            or kv_map.get("reporting doctor")
            or kv_map.get("ordering / referring doctor")
        )

        # Strategy 1: Structured Rx section
        rx_section_start = None
        rx_section_end = None
        for i, line in enumerate(lines):
            stripped = line.strip()
            if re.match(r'^#+\s*Prescription\s+Details', stripped, re.IGNORECASE):
                rx_section_start = i + 1
            elif rx_section_start is not None and stripped.startswith("#"):
                rx_section_end = i
                break

        if rx_section_start is not None:
            rx_section_lines = lines[rx_section_start: rx_section_end or len(lines)]
            rx_blocks = []
            current_block = []
            for line in rx_section_lines:
                stripped = line.strip()
                if stripped == "---" and current_block:
                    rx_blocks.append(current_block)
                    current_block = []
                elif stripped:
                    current_block.append(stripped)
            if current_block:
                rx_blocks.append(current_block)

            for block in rx_blocks:
                rx_data = {}
                for line in block:
                    clean_line = line.strip()
                    if clean_line.startswith("|"):
                        clean_line = clean_line[1:]
                    if clean_line.endswith("|"):
                        clean_line = clean_line[:-1]
                    clean_line = clean_line.strip()

                    if "|" in clean_line:
                        parts = [p.strip() for p in clean_line.split("|", 1)]
                        if len(parts) == 2:
                            key = parts[0].replace(":", "").strip().lower()
                            val = parts[1].strip()
                            if key in ("rx", "disp", "sig", "refill", "refills", "daw"):
                                if val.lower() not in ("not specified", "n/a", "none", "-", ""):
                                    rx_data[key.rstrip("s")] = val
                                continue

                    kv_match = re.match(r'^(Rx|Disp|Sig|Refills?|DAW)\s*:\s*(.+)', clean_line, re.IGNORECASE)
                    if kv_match:
                        key = kv_match.group(1).lower().rstrip("s")
                        val = kv_match.group(2).strip()
                        if val.startswith("|"):
                            val = val[1:].strip()
                        if val.lower() not in ("not specified", "n/a", "none", "-", ""):
                            rx_data[key] = val

                drug_name_raw = rx_data.get("rx", "")
                if not drug_name_raw:
                    continue

                strength = None
                name_parts = re.split(
                    r'\s+(\d+\s*(?:mg|mcg|g|IU)(?:\s*/\s*\d+\s*(?:mg|mcg|g|ml|mL))?)',
                    drug_name_raw, maxsplit=1
                )
                if len(name_parts) > 1:
                    clean_name = name_parts[0].strip()
                    strength = name_parts[1].strip()
                else:
                    clean_name = drug_name_raw

                daw = None
                daw_val = rx_data.get("daw", "").lower()
                if "yes" in daw_val:
                    daw = True
                elif "no" in daw_val:
                    daw = False

                prescriptions.append(PrescriptionItem(
                    drug_name=clean_name,
                    strength=strength,
                    quantity=rx_data.get("disp"),
                    sig=rx_data.get("sig"),
                    refills=rx_data.get("refill"),
                    dispense_as_written=daw,
                    prescribing_doctor=prescriber,
                ))

            if prescriptions:
                return prescriptions

        # Strategy 2: Medication tables
        med_tables = self._extract_medication_tables(markdown)
        if med_tables:
            for med in med_tables:
                drug_name = med.get("medication", med.get("drug", med.get("medicine", ""))).strip()
                if not drug_name:
                    continue

                # Map Qwen's standard column names (Strength / Quantity / Instructions / DAW)
                # as well as generic names (dose, dosage, route, frequency, sig)
                strength = (
                    med.get("strength") or
                    med.get("dose") or
                    med.get("dosage") or ""
                ).strip() or None

                quantity = (
                    med.get("quantity") or
                    med.get("disp") or ""
                ).strip() or None

                sig_raw = (
                    med.get("instructions") or
                    med.get("sig") or
                    med.get("frequency") or
                    med.get("directions") or ""
                ).strip()
                # Combine strength+route+frequency if sig_raw is empty
                if not sig_raw:
                    route = med.get("route", "").strip()
                    freq = med.get("frequency", "").strip()
                    parts = [p for p in [strength, route, freq] if p]
                    sig_raw = " ".join(parts)
                sig = sig_raw or None

                # Dispense-as-written flag
                daw_val = (med.get("daw") or "").lower()
                if "written" in daw_val or "yes" in daw_val:
                    daw = True
                elif "substitute" in daw_val or "no" in daw_val:
                    daw = False
                else:
                    daw = None

                refills_raw = (med.get("refills") or med.get("refill") or "").strip()
                refills = refills_raw or None

                prescriptions.append(PrescriptionItem(
                    drug_name=drug_name,
                    strength=strength,
                    quantity=quantity,
                    sig=sig,
                    refills=refills,
                    dispense_as_written=daw,
                    prescribing_doctor=prescriber,
                ))

            if prescriptions:
                return prescriptions

        return prescriptions

    @staticmethod
    def _extract_kv_table(markdown: str) -> dict:
        kv = {}
        for line in markdown.split("\n"):
            line = line.strip()
            if not line.startswith("|"):
                continue
            parts = [p.strip() for p in line.split("|")]
            parts = [p for p in parts if p]
            if len(parts) == 2:
                key, val = parts
                if key.startswith("---") or key.lower() == "field":
                    continue
                kv[key.lower()] = val
        return kv

    @staticmethod
    def _extract_test_panels(markdown: str) -> List[LabPanel]:
        panels = []
        lines = markdown.split("\n")
        current_panel_name = None
        current_tests = []
        in_test_table = False
        header_cols = []

        for line in lines:
            stripped = line.strip()

            if stripped.startswith("#"):
                if current_panel_name and current_tests:
                    panels.append(LabPanel(panel_name=current_panel_name, tests=current_tests))
                    current_tests = []

                heading = stripped.lstrip("# ").strip()
                if heading.lower() in (
                    "document information", "patient demographics",
                    "physician details", "test results",
                    "summary of abnormal findings", "analysis comments",
                ):
                    current_panel_name = None
                    in_test_table = False
                    continue

                current_panel_name = heading
                in_test_table = False
                header_cols = []
                continue

            if stripped.startswith("|") and current_panel_name:
                parts = [p.strip() for p in stripped.split("|")]
                parts = [p for p in parts if p]

                if parts and all(set(p) <= {'-', ':', ' '} for p in parts):
                    continue

                if parts and parts[0].lower() in ("test name", "field"):
                    header_cols = [p.lower() for p in parts]
                    in_test_table = parts[0].lower() == "test name"
                    continue

                if in_test_table and len(parts) >= 2:
                    test_name = parts[0]
                    result = parts[1] if len(parts) > 1 else None
                    unit = parts[2] if len(parts) > 2 else None
                    ref_range = parts[3] if len(parts) > 3 else None
                    flag_raw = parts[4] if len(parts) > 4 else None

                    if unit and unit.lower() in ("not specified", "n/a"):
                        unit = None
                    if ref_range and ref_range.lower() in ("not specified", "n/a"):
                        ref_range = None

                    flag = _determine_flag(result, ref_range, flag_raw)

                    current_tests.append(LabTest(
                        test_name=test_name,
                        result=result,
                        unit=unit,
                        reference_range=ref_range,
                        flag=flag,
                    ))

        if current_panel_name and current_tests:
            panels.append(LabPanel(panel_name=current_panel_name, tests=current_tests))

        return panels

    @staticmethod
    def _extract_medication_tables(markdown: str) -> List[dict]:
        medications = []
        lines = markdown.split("\n")
        i = 0
        while i < len(lines):
            line = lines[i].strip()
            if "|" in line and re.search(r'medication|drug|medicine|insulin', line, re.IGNORECASE):
                headers = [col.strip().lower() for col in line.split("|") if col.strip()]
                i += 1
                if i < len(lines) and re.match(r'^\s*\|[\s\-|]+\|\s*$', lines[i]):
                    i += 1
                while i < len(lines):
                    row = lines[i].strip()
                    if not row or not row.startswith("|"):
                        break
                    if re.match(r'^\s*\|[\s\-|]+\|\s*$', row):
                        i += 1
                        continue
                    cols = [col.strip() for col in row.split("|") if col.strip()]
                    if len(cols) >= 1:
                        med_data = {}
                        for j, header in enumerate(headers):
                            if j < len(cols):
                                val = cols[j].strip()
                                if val.lower() not in ("not specified", "n/a", "-", ""):
                                    med_data[header] = val
                        if med_data:
                            medications.append(med_data)
                    i += 1
                continue
            i += 1
        return medications

    @staticmethod
    def _clean_val(val: Optional[str]) -> Optional[str]:
        if not val:
            return None
        val = val.strip()
        if val.lower() in ("not specified", "n/a", "none", "-", ""):
            return None
        return val

    @staticmethod
    def _to_clinician_summary(data: dict) -> ClinicianSummary:
        system_findings_raw = data.get("system_findings", {})
        system_findings = {
            k: v for k, v in system_findings_raw.items()
            if v is not None and isinstance(v, str) and v.strip()
        }
        icd_codes = [
            DocICDCode(
                code=str(c.get("code", "")),
                description=str(c.get("description", "")),
                version=c.get("version", 10),
            )
            for c in data.get("icd_code_summary", [])
        ]
        med_recs = [
            MedicationSuggestion(
                name=str(m.get("name", "")),
                indication=str(m.get("indication", "")),
                dose=m.get("dose"),
                frequency=m.get("frequency"),
                route=m.get("route"),
                notes=m.get("notes"),
            )
            for m in data.get("medication_recommendations", [])
        ]
        return ClinicianSummary(
            overall_assessment=data.get("overall_assessment", ""),
            system_findings=system_findings,
            critical_values=data.get("critical_values", []),
            differential_considerations=data.get("differential_considerations", []),
            recommended_actions=data.get("recommended_actions", []),
            icd_code_summary=icd_codes,
            medication_recommendations=med_recs,
        )

    @staticmethod
    def _to_patient_summary(data: dict) -> PatientDocSummary:
        return PatientDocSummary(
            greeting=data.get("greeting", ""),
            what_was_tested=data.get("what_was_tested", ""),
            key_results=data.get("key_results", ""),
            what_is_normal=data.get("what_is_normal", ""),
            what_needs_attention=data.get("what_needs_attention", ""),
            next_steps=data.get("next_steps", ""),
            lifestyle_tips=data.get("lifestyle_tips"),
        )

    async def close(self):
        await self._client.aclose()


# ─────────────────────────────────────────────────────────────────────────────
# HELPERS
# ─────────────────────────────────────────────────────────────────────────────

def _strip_code_fences(text: str) -> str:
    """Strip markdown code fences that Qwen-VL sometimes wraps around its output.
    
    Handles: ```markdown\n...\n```, ```\n...\n```, etc.
    """
    stripped = text.strip()
    # Match opening fence with optional language tag
    fence_open = re.match(r'^```[a-zA-Z]*\n', stripped)
    if fence_open:
        content = stripped[fence_open.end():]
        # Remove closing fence
        if content.endswith('```'):
            content = content[:-3].rstrip()
        return content
    return text


def _determine_flag(
    result: Optional[str],
    ref_range: Optional[str],
    flag_symbol: Optional[str],
) -> AbnormalityFlag:
    """Determine abnormality flag using numeric comparison when possible.

    Priority order (most→least reliable):
    1. H / L / HH / LL prefix in the result value itself  (e.g. "H 168.0")
    2. Numeric comparison against a parseable reference range
    3. Special string comparison (Present vs Absent, Reactive vs Non-Reactive)
    4. ⬇ / ⬆ arrow from Qwen — ⬇ is trusted; ⬆ is NOT (Qwen uses it generically)
    """
    if not result:
        return AbnormalityFlag.NORMAL

    result_stripped = result.strip()

    # ── 1. Explicit H / L prefix in result string ──────────────────────────
    hl_match = re.match(r'^([HhLlCc]{1,2})\s+[\d\.\<]', result_stripped)
    if hl_match:
        prefix = hl_match.group(1).upper()
        if prefix in ("H", "HH"):
            return AbnormalityFlag.HIGH
        if prefix in ("L", "LL"):
            return AbnormalityFlag.LOW
        if prefix == "C":
            return AbnormalityFlag.CRITICAL

    # ── 2. String-match non-numeric references ──────────────────────────────
    ref_lower = (ref_range or "").lower()
    res_lower = result_stripped.lower()
    if "absent" in ref_lower:
        if "present" in res_lower or "(+)" in res_lower or "+" in res_lower:
            return AbnormalityFlag.HIGH
        return AbnormalityFlag.NORMAL
    if "non reactive" in ref_lower or "non-reactive" in ref_lower:
        if "reactive" in res_lower and "non" not in res_lower:
            return AbnormalityFlag.HIGH
        return AbnormalityFlag.NORMAL

    # ── 3. Numeric comparison against reference range ───────────────────────
    num_match = re.search(r'[\d]+\.?[\d]*', result_stripped)
    result_num = None
    if num_match:
        try:
            result_num = float(num_match.group())
        except ValueError:
            pass

    numeric_determined = False  # True when we got a definitive answer from numeric compare
    numeric_result = AbnormalityFlag.NORMAL

    if result_num is not None and ref_range:
        ref_clean = ref_range.strip()

        # "X - Y" or "X – Y"  (clean range — most reliable)
        range_m = re.match(
            r'^([\d]+\.?[\d]*)\s*[-\u2013]\s*([\d]+\.?[\d]*)$', ref_clean
        )
        if range_m:
            try:
                lo, hi = float(range_m.group(1)), float(range_m.group(2))
                numeric_determined = True
                if result_num > hi:
                    numeric_result = AbnormalityFlag.HIGH
                elif result_num < lo:
                    numeric_result = AbnormalityFlag.LOW
                else:
                    numeric_result = AbnormalityFlag.NORMAL
            except ValueError:
                pass

        if not numeric_determined:
            # Upper bound only: "< X" or "Up to X" — value should be below X
            # Only when there's no ">" in the ref to avoid ambiguous screening cutoffs
            upper_m = (
                re.search(r'<\s*([\d]+\.?[\d]*)', ref_clean) or
                re.search(r'\bup\s+to\s+([\d]+\.?[\d]*)', ref_clean, re.IGNORECASE)
            )
            if upper_m and not re.search(r'>\s*[\d]', ref_clean):
                try:
                    hi = float(upper_m.group(1))
                    numeric_determined = True
                    numeric_result = AbnormalityFlag.HIGH if result_num >= hi else AbnormalityFlag.NORMAL
                except ValueError:
                    pass

        # NOTE: We intentionally do NOT parse lone ">X" references because their
        # direction is ambiguous — ">6.5%" in HbA1c means "abnormal if high" while
        # ">16 for children" means "abnormal if low". Fall through to Qwen arrow.

    if numeric_determined:
        # Numeric comparison is authoritative — return it directly
        # (This overrides Qwen's ⬆ when it incorrectly marks in-range values)
        return numeric_result

    # ── 4. Fall back to Qwen arrow symbol ───────────────────────────────────
    # When numeric comparison could NOT run (complex/unparseable reference),
    # trust BOTH ⬆ and ⬇ since they may reflect the lab's own flagging.
    if flag_symbol:
        sym = flag_symbol.strip().lower()
        if "⬆" in flag_symbol or sym in ("high", "above", "h"):
            return AbnormalityFlag.HIGH
        if "⬇" in flag_symbol or sym in ("low", "below", "l"):
            return AbnormalityFlag.LOW
        if "⚠" in flag_symbol or sym == "critical":
            return AbnormalityFlag.CRITICAL

    return AbnormalityFlag.NORMAL


# ─────────────────────────────────────────────────────────────────────────────
# SHARED JSON PARSER (same as medgemma_service.py)
# ─────────────────────────────────────────────────────────────────────────────

def _parse_json(raw: str) -> dict:
    """Robustly extract a JSON object from LLM output."""
    cleaned = re.sub(r"```(?:json)?", "", raw).strip().rstrip("`").strip()

    try:
        result = json.loads(cleaned)
        if isinstance(result, dict):
            return result
    except json.JSONDecodeError:
        pass

    brace_positions = [m.start() for m in re.finditer(r'\{', cleaned)]
    for start_pos in reversed(brace_positions):
        candidate = cleaned[start_pos:]
        depth = 0
        end_pos = None
        for ci, ch in enumerate(candidate):
            if ch == '{':
                depth += 1
            elif ch == '}':
                depth -= 1
                if depth == 0:
                    end_pos = ci + 1
                    break
        if end_pos:
            try:
                result = json.loads(candidate[:end_pos])
                if isinstance(result, dict):
                    return result
            except json.JSONDecodeError:
                continue

    for match in reversed(list(re.finditer(r'\{[^{}]*(?:\{[^{}]*\}[^{}]*)*\}', cleaned, re.DOTALL))):
        try:
            result = json.loads(match.group())
            if isinstance(result, dict):
                return result
        except json.JSONDecodeError:
            continue

    # Attempt to repair a truncated JSON by finding the first { and
    # progressively closing open braces/brackets/strings.
    first_brace = cleaned.find('{')
    if first_brace >= 0:
        fragment = cleaned[first_brace:]
        open_braces = fragment.count('{') - fragment.count('}')
        open_brackets = fragment.count('[') - fragment.count(']')
        # Close any unterminated string that might be present
        # Count unescaped quotes to detect open strings
        in_string = False
        escape_next = False
        for ch in fragment:
            if escape_next:
                escape_next = False
                continue
            if ch == '\\':
                escape_next = True
                continue
            if ch == '"':
                in_string = not in_string
        suffix = ""
        if in_string:
            suffix += '"'  # close the open string
        # Close open arrays then open objects
        suffix += "]" * max(0, open_brackets) + "}" * max(0, open_braces)
        if suffix:
            try:
                result = json.loads(fragment + suffix)
                if isinstance(result, dict):
                    logger.info("_parse_json: repaired truncated JSON successfully")
                    return result
            except json.JSONDecodeError:
                pass
        # Simpler fallback: just close objects
        simple_suffix = "}" * max(0, open_braces)
        if simple_suffix:
            try:
                result = json.loads(fragment + simple_suffix)
                if isinstance(result, dict):
                    return result
            except json.JSONDecodeError:
                pass

    logger.warning(f"Could not parse JSON. Raw (first 500 chars): {raw[:500]}")
    return {}

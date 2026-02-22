"""
Document Analysis Service — 3-Stage Pipeline
=============================================
Orchestrates the full document analysis pipeline:
  Stage 1: Document Perception (Qwen2.5-VL on Modal) — image → markdown
  Stage 2: Clinical Reasoning (MedGemma-27B on Modal) — markdown → structured JSON
  Stage 3: Summary Generation (MedGemma-27B on Modal) — JSON → clinician + patient summaries
"""

import re
import io
import json
import time
import base64
import logging
from pathlib import Path
from typing import List, Optional, Tuple
import asyncio

import httpx

from doc_schemas import (
    DocumentType, AbnormalityFlag, UrgencyLevel,
    DocumentMetadata, LabTest, LabPanel, ICDCode,
    ClinicalInsight, MedicationSuggestion, PrescriptionItem,
    StructuredLabReport, ClinicianSummary, PatientSummary,
    PerceiveDocumentResponse, DocumentAnalysisResponse,
)

logger = logging.getLogger(__name__)


# ─────────────────────────────────────────────────────────────────────────────
# PROMPTS
# ─────────────────────────────────────────────────────────────────────────────

CLINICAL_REASONING_PROMPT = """You are a senior clinical pathologist. Analyze these lab results and provide clinical interpretation.

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
1. MAX 8 clinical insights — group aggressively (e.g. all CBC abnormalities = 1 insight)
2. Keep "significance" to 1-2 sentences MAX. Be concise.
3. Keep "finding" to under 15 words
4. Provide ICD-10 codes for EVERY insight
5. Correlate findings across panels (e.g. low B12 + high homocysteine)
6. Suggest medications ONLY when clinically appropriate
7. If transcript provided, correlate symptoms with lab findings
8. IMPORTANT: Keep total output SHORT to avoid truncation

JSON:"""

CLINICIAN_SUMMARY_PROMPT = """You are a senior clinical pathologist writing a consultation report for a fellow physician.

Analyze this medical document and its abnormal findings to generate a professional clinical summary.

DOCUMENT (Structured Markdown):
{markdown}

ABNORMAL FINDINGS:
{abnormal_summary}

Return ONLY valid JSON:
{{
  "overall_assessment": "Comprehensive 2-3 sentence clinical assessment. Include patient demographics and key findings.",
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
  "recommended_actions": [
    "1. Specific action with timeframe",
    "2. Another action"
  ],
  "icd_code_summary": [
    {{"code": "E11.9", "description": "Type 2 DM", "version": 10}}
  ],
  "medication_recommendations": [
    {{
      "name": "Drug name",
      "indication": "Why",
      "dose": "Dose",
      "frequency": "Frequency",
      "route": "oral",
      "notes": "Brief note"
    }}
  ]
}}

RULES:
- Include system_findings ONLY for systems with actual test data
- Be specific with recommendations — include timeframes and thresholds
- Reference actual patient values (e.g. 'FBS 141 mg/dL' not 'elevated glucose')
- ICD codes should cover ALL identified conditions
- Keep each system_finding to 1-2 sentences max

JSON:"""

PATIENT_SUMMARY_PROMPT = """You are a compassionate health educator explaining lab results to a patient.

Given this clinical analysis, create a warm, clear, jargon-free summary.

CLINICAL ANALYSIS:
{analysis_json}

Return ONLY valid JSON:
{{
  "greeting": "A warm opening like: 'Hello! Here is a summary of your recent lab results.'",
  "what_was_tested": "Simple explanation of what tests were run. Example: 'Your doctor ordered blood tests to check your blood cell counts, sugar levels, cholesterol, and kidney function.'",
  "key_results": "Plain language overview. Example: 'Most of your results look healthy and normal! A few things stood out that your doctor will want to keep an eye on.'",
  "what_is_normal": "Reassuring summary of normal findings. Example: 'Your blood cell counts are all in the healthy range, which means your body is fighting infections well and your blood is carrying oxygen properly.'",
  "what_needs_attention": "Gentle explanation of abnormal findings WITHOUT alarming language. Example: 'Your blood sugar level was slightly higher than the ideal range. This doesn't mean you have diabetes, but it's something to watch.'",
  "next_steps": "Clear action items. Example: 'Your doctor may want to: 1) Recheck your blood sugar in a few months, 2) Discuss ways to lower your cholesterol through diet.'",
  "lifestyle_tips": "Helpful, actionable tips. Example: 'Some easy steps that can help: eat more fruits, vegetables, and whole grains; aim for 30 minutes of walking most days; drink plenty of water.'"
}}

RULES:
- NO medical jargon — explain everything in simple terms
- Be reassuring but honest about concerning findings
- Use analogies where helpful (e.g., 'cholesterol is like plaque in pipes')
- Keep sentences short and clear
- Do NOT include specific numerical values unless essential
- Focus on what the patient CAN DO, not just what's wrong

JSON:"""


# ─────────────────────────────────────────────────────────────────────────────
# DOCUMENT ANALYSIS SERVICE
# ─────────────────────────────────────────────────────────────────────────────

class DocumentAnalysisService:
    """
    Orchestrates the 3-stage document analysis pipeline.
    All inference runs on Modal — this service only coordinates HTTP calls.
    """

    def __init__(
        self,
        qwen_vl_url: str,
        medgemma_url: str,
        timeout: float = 300.0,
    ):
        self.qwen_vl_url = qwen_vl_url.rstrip("/")
        self.medgemma_url = medgemma_url.rstrip("/")
        # Normalize medgemma URL — strip /v1/chat/completions if present
        if self.medgemma_url.endswith("/v1/chat/completions"):
            self.medgemma_url = self.medgemma_url[:-20]

        self._client = httpx.AsyncClient(
            timeout=timeout,
            follow_redirects=True,   # Modal returns 303 redirects for async calls
        )
        self._ready = False

        # Directory for saving intermediate outputs
        self._output_dir = Path("output")
        self._output_dir.mkdir(exist_ok=True)

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
            # Render at specified DPI
            mat = fitz.Matrix(dpi / 72, dpi / 72)
            pix = page.get_pixmap(matrix=mat)
            images.append(pix.tobytes("png"))
        doc.close()
        return images

    @staticmethod
    def encode_image_base64(image_bytes: bytes) -> str:
        """Encode image bytes to base64 string."""
        return base64.b64encode(image_bytes).decode("utf-8")

    # ─── Stage 1: Document Perception ────────────────────────────────────────

    async def perceive_document(
        self,
        image_bytes_list: List[bytes],
    ) -> str:
        """
        Stage 1: Send document images to Qwen2.5-VL for structured extraction.
        Returns markdown content with tables.
        """
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
        logger.info(f"Stage 1 complete: {len(markdown)} chars of markdown")

        # Save markdown to disk for cross-checking
        ts = time.strftime("%Y%m%d_%H%M%S")
        output_file = self._output_dir / f"stage1_markdown_{ts}.md"
        output_file.write_text(markdown, encoding="utf-8")
        logger.info(f"Stage 1 markdown saved to: {output_file}")

        return markdown

    # ─── Stage 2: Clinical Extraction ────────────────────────────────────────

    async def extract_and_reason(
        self,
        markdown: str,
        conversation_transcript: Optional[str] = None,
    ) -> StructuredLabReport:
        """
        Stage 2: Parse markdown locally for panels + metadata,
        then call MedGemma ONLY for clinical reasoning (insights, diagnoses, meds).
        This prevents token-limit truncation.
        """
        ts = time.strftime("%Y%m%d_%H%M%S")

        # ── Step A: Parse panels + metadata from Stage 1 markdown (no LLM) ──
        report = self._parse_markdown_to_report(markdown)
        logger.info(
            f"Stage 2A (local parse): {len(report.panels)} panels, "
            f"{len(report.abnormal_results)} abnormal, "
            f"patient={report.metadata.patient_name}"
        )

        # ── Step B: Guard — skip clinical reasoning if no test panels ────────
        #    Prescriptions, clinical notes without labs, etc. have no test data.
        #    Running MedGemma on empty data causes hallucinations.
        is_prescription = report.metadata.document_type == DocumentType.PRESCRIPTION
        has_panels = len(report.panels) > 0

        if is_prescription or not has_panels:
            logger.info(
                f"Stage 2B SKIPPED: {'prescription document' if is_prescription else 'no test panels found'} — "
                f"no clinical reasoning needed"
            )
            # For prescriptions, parse Rx details from the markdown
            if is_prescription:
                report.prescriptions = self._parse_prescriptions_from_markdown(markdown)
                logger.info(f"Parsed {len(report.prescriptions)} prescription item(s)")

            # Save structured report and return early (no MedGemma call)
            report_file = self._output_dir / f"stage2_structured_{ts}.json"
            report_file.write_text(
                json.dumps(report.model_dump(exclude_none=True), indent=2, default=str),
                encoding="utf-8",
            )
            logger.info(f"Stage 2 structured report saved to: {report_file}")
            return report

        # ── Step C: Build abnormal summary for MedGemma ─────────────────────
        abnormal_lines = []
        for test in report.abnormal_results:
            line = f"- {test.test_name}: {test.result} {test.unit or ''} (ref: {test.reference_range or 'N/A'}) [{test.flag.value}]"
            abnormal_lines.append(line)

        if not abnormal_lines:
            abnormal_lines = ["No abnormal results found."]

        abnormal_summary = "\n".join(abnormal_lines)

        transcript_section = ""
        if conversation_transcript:
            transcript_section = (
                f"CONVERSATION TRANSCRIPT (correlate with lab findings):\n"
                f"{conversation_transcript}\n"
            )

        # ── Step D: Call MedGemma for clinical reasoning ONLY ────────────────
        prompt = CLINICAL_REASONING_PROMPT.format(
            abnormal_summary=abnormal_summary,
            transcript_section=transcript_section,
        )

        raw = await self._call_medgemma(prompt, max_tokens=4096)
        logger.info(f"Stage 2D (clinical reasoning): {len(raw)} chars from MedGemma")

        # Save raw output
        output_file = self._output_dir / f"stage2_reasoning_{ts}.json"
        output_file.write_text(raw, encoding="utf-8")
        logger.info(f"Stage 2D raw output saved to: {output_file}")

        # ── Step E: Merge clinical reasoning into the report ─────────────────
        reasoning = self._parse_json(raw)
        logger.info(f"Stage 2E parsed keys: {list(reasoning.keys())}")

        # Add clinical insights
        for insight_data in reasoning.get("clinical_insights", []):
            urgency = insight_data.get("urgency", "routine")
            try:
                urgency_enum = UrgencyLevel(urgency)
            except ValueError:
                urgency_enum = UrgencyLevel.ROUTINE

            icd_codes = [
                ICDCode(
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

        # Add top-level ICD codes from diagnoses
        for d in reasoning.get("diagnoses", []):
            code = d.get("icd_code", "")
            desc = d.get("icd_description", d.get("condition", ""))
            if code:
                report.icd_codes.append(ICDCode(code=code, description=desc, version=10))

        # Add medication suggestions
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
            f"{len(report.icd_codes)} ICD codes, "
            f"{len(report.medication_suggestions)} medications"
        )

        # Save final structured report
        report_file = self._output_dir / f"stage2_structured_{ts}.json"
        report_file.write_text(
            json.dumps(report.model_dump(exclude_none=True), indent=2, default=str),
            encoding="utf-8",
        )
        logger.info(f"Stage 2 structured report saved to: {report_file}")

        return report

    # ─── Markdown Parser (Stage 1 → StructuredLabReport) ─────────────────────

    def _parse_markdown_to_report(self, markdown: str) -> StructuredLabReport:
        """
        Parse Stage 1 structured markdown directly into StructuredLabReport.
        Extracts metadata tables + test panels without any LLM call.
        """
        report = StructuredLabReport()

        # ── Parse metadata from key-value tables ─────────────────────────
        kv_map = self._extract_kv_table(markdown)

        # Document info
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
        report.metadata.accession_number = self._clean_val(kv_map.get("report id / accession no.") or kv_map.get("report id"))

        # Patient demographics
        report.metadata.patient_name = self._clean_val(kv_map.get("patient name"))
        report.metadata.patient_id = self._clean_val(kv_map.get("patient id / uhid") or kv_map.get("patient id"))
        report.metadata.age = self._clean_val(kv_map.get("age"))
        gender_raw = self._clean_val(kv_map.get("gender / sex") or kv_map.get("gender"))
        if gender_raw:
            report.metadata.gender = gender_raw.lower()
        report.metadata.date_of_birth = self._clean_val(kv_map.get("date of birth"))
        report.metadata.contact_phone = self._clean_val(kv_map.get("contact / phone") or kv_map.get("contact"))
        report.metadata.patient_address = self._clean_val(kv_map.get("address"))

        # Physician
        report.metadata.ordering_physician = self._clean_val(kv_map.get("ordering / referring doctor") or kv_map.get("referring doctor"))
        report.metadata.reporting_physician = self._clean_val(kv_map.get("pathologist / reporting doctor") or kv_map.get("reporting doctor"))

        logger.info(f"Parsed metadata: patient={report.metadata.patient_name}, lab={report.metadata.lab_name}")

        # ── Parse test panels from markdown tables ────────────────────────
        report.panels = self._extract_test_panels(markdown)
        logger.info(f"Parsed {len(report.panels)} test panels")

        # ── Collect abnormal results ─────────────────────────────────────
        for panel in report.panels:
            for test in panel.tests:
                if test.flag not in (AbnormalityFlag.NORMAL, None):
                    report.abnormal_results.append(test)

        return report

    def _parse_prescriptions_from_markdown(self, markdown: str) -> List[PrescriptionItem]:
        """
        Parse prescription details (Rx) from markdown content.
        Handles three formats (in priority order):
        1. Structured '## Prescription Details' with Rx/Disp/Sig/Refills/DAW lines
        2. Medication markdown tables (| Medication | Dose | Route | Frequency |)
        3. Fallback heuristic: search for Rx/Disp/Sig patterns anywhere
        """
        prescriptions = []
        lines = markdown.split("\n")
        full_text = markdown.lower()

        # Extract prescriber from metadata
        kv_map = self._extract_kv_table(markdown)
        prescriber = self._clean_val(
            kv_map.get("pathologist / reporting doctor")
            or kv_map.get("reporting doctor")
            or kv_map.get("ordering / referring doctor")
        )

        # ── Strategy 1: Structured Prescription Details section ──────────
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
                    # Strip leading/trailing table pipes if Qwen output them as a table
                    clean_line = line.strip()
                    if clean_line.startswith("|"):
                        clean_line = clean_line[1:]
                    if clean_line.endswith("|"):
                        clean_line = clean_line[:-1]
                    clean_line = clean_line.strip()
                    
                    # Handle both `Rx: Drug` and `| Rx: | Drug |` formats
                    # It might be split by a pipe or a colon
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
                    if len(name_parts) > 2 and name_parts[2].strip():
                        strength += name_parts[2].strip()
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
                logger.info(f"Parsed {len(prescriptions)} Rx item(s) from structured section")
                return prescriptions

        # ── Strategy 2: Medication markdown tables ───────────────────────
        # Qwen outputs prescriptions as markdown tables under headers like
        # ### Medications, ### Insulin, etc.
        # Format: | Medication | Dose | Route | Frequency |
        med_tables = self._extract_medication_tables(markdown)
        if med_tables:
            for med in med_tables:
                drug_name = med.get("medication", med.get("drug", "")).strip()
                if not drug_name:
                    continue

                dose = med.get("dose", med.get("dosage", "")).strip()
                route = med.get("route", "").strip()
                frequency = med.get("frequency", med.get("sig", "")).strip()
                quantity_raw = med.get("quantity", med.get("amount", "")).strip()

                # Parse quantity from route column if it contains "# NNN"
                quantity = None
                if quantity_raw:
                    quantity = quantity_raw
                elif route:
                    qty_match = re.search(r'#\s*(\d+)', route)
                    if qty_match:
                        quantity = qty_match.group(0).strip()
                        # Clean route — remove quantity part
                        route = re.sub(r'#\s*\d+', '', route).strip()

                # Build sig from frequency + route
                sig_parts = []
                if dose:
                    sig_parts.append(dose)
                if route and route.lower() not in ("not specified", "n/a", "-"):
                    sig_parts.append(route)
                if frequency:
                    sig_parts.append(frequency)
                sig = " ".join(sig_parts) if sig_parts else None

                # Extract strength from dose (e.g., "20 mg", "30 units")
                strength = dose if dose else None

                prescriptions.append(PrescriptionItem(
                    drug_name=drug_name,
                    strength=strength,
                    quantity=quantity,
                    sig=sig,
                    prescribing_doctor=prescriber,
                ))

            if prescriptions:
                logger.info(f"Parsed {len(prescriptions)} Rx item(s) from medication tables")
                return prescriptions

        # ── Strategy 3: Fallback — heuristic Rx/Disp/Sig patterns ────────
        rx_text = ""
        in_rx_section = False
        for line in lines:
            stripped = line.strip()
            if re.match(r'^Rx\s*:', stripped, re.IGNORECASE):
                in_rx_section = True
                rx_text = re.sub(r'^Rx\s*:\s*', '', stripped, flags=re.IGNORECASE)
                continue
            if in_rx_section:
                if stripped.startswith("#") or re.match(r'^(Disp|Sig|Refill)', stripped, re.IGNORECASE):
                    break
                rx_text += " " + stripped

        drug_name = rx_text.strip() if rx_text.strip() else None

        strength = None
        strength_match = re.search(r'(\d+\s*(?:mg|mcg|g|ml|mL|IU|units)(?:\s*/\s*\d+\s*(?:mg|mcg|g|ml|mL))?)', markdown)
        if strength_match:
            strength = strength_match.group(1).strip()

        quantity = None
        disp_match = re.search(r'Disp(?:ense)?[:\s]+(.+?)(?:\n|$)', markdown, re.IGNORECASE)
        if disp_match:
            quantity = disp_match.group(1).strip()

        sig = None
        sig_match = re.search(r'Sig[:\s]+(.+?)(?:\n|$)', markdown, re.IGNORECASE)
        if sig_match:
            sig = sig_match.group(1).strip()
            sig = re.sub(r'^[_\s]+', '', sig).strip()

        daw = None
        if re.search(r'dispense\s+as\s+written', full_text):
            daw = True
        elif re.search(r'may\s+substitute', full_text):
            daw = False

        refills = None
        refill_match = re.search(r'Refill[s]?[:\s]+(\d+)', markdown, re.IGNORECASE)
        if refill_match:
            refills = refill_match.group(1)

        if not drug_name:
            for line in lines:
                stripped = line.strip()
                if "|" in stripped or stripped.startswith("#") or not stripped:
                    continue
                if re.search(r'(tablet|capsule|syrup|suspension|cream|mg|mL|injection)', stripped, re.IGNORECASE):
                    drug_name = stripped
                    break

        if drug_name:
            name_parts = re.split(r'\s+(\d+\s*(?:mg|mcg|g)(?:\s*/\s*\d+\s*(?:mg|mcg|g|ml|mL))?)', drug_name, maxsplit=1)
            if len(name_parts) > 1:
                clean_name = name_parts[0].strip()
                if not strength:
                    strength = name_parts[1].strip()
            else:
                clean_name = drug_name

            prescriptions.append(PrescriptionItem(
                drug_name=clean_name,
                strength=strength,
                quantity=quantity,
                sig=sig,
                refills=refills,
                dispense_as_written=daw,
                prescribing_doctor=prescriber,
            ))
            logger.info(f"Parsed 1 Rx item from fallback heuristic")

        return prescriptions

    @staticmethod
    def _extract_medication_tables(markdown: str) -> List[dict]:
        """
        Extract medication data from markdown tables with headers like
        | Medication | Dose | Route | Frequency |.
        Returns a list of dicts, one per medication row.
        """
        medications = []
        lines = markdown.split("\n")
        i = 0
        while i < len(lines):
            line = lines[i].strip()
            # Look for table header rows containing medication-related columns
            if "|" in line and re.search(
                r'medication|drug|medicine|insulin',
                line, re.IGNORECASE
            ):
                # Parse header columns
                headers = [
                    col.strip().lower()
                    for col in line.split("|")
                    if col.strip()
                ]
                # Skip separator row (| --- | --- | ...)
                i += 1
                if i < len(lines) and re.match(r'^\s*\|[\s\-|]+\|\s*$', lines[i]):
                    i += 1

                # Parse data rows
                while i < len(lines):
                    row = lines[i].strip()
                    if not row or not row.startswith("|"):
                        break
                    # Skip separator rows
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
        """Return None for empty/unspecified values."""
        if not val:
            return None
        val = val.strip()
        if val.lower() in ("not specified", "n/a", "none", "-", ""):
            return None
        return val

    @staticmethod
    def _extract_kv_table(markdown: str) -> dict:
        """Extract key-value pairs from markdown tables like | Field | Value |."""
        kv = {}
        lines = markdown.split("\n")
        for i, line in enumerate(lines):
            line = line.strip()
            if not line.startswith("|"):
                continue
            parts = [p.strip() for p in line.split("|")]
            parts = [p for p in parts if p]  # remove empty from edges
            if len(parts) == 2:
                key, val = parts
                # Skip header separators and actual headers
                if key.startswith("---") or key.lower() == "field":
                    continue
                kv[key.lower()] = val
        return kv

    @staticmethod
    def _extract_test_panels(markdown: str) -> List[LabPanel]:
        """Parse test result tables from markdown into LabPanel objects."""
        panels = []
        lines = markdown.split("\n")
        current_panel_name = None
        current_tests = []
        in_test_table = False
        header_cols = []

        for i, line in enumerate(lines):
            stripped = line.strip()

            # Detect panel headers (## or ### headings)
            if stripped.startswith("#"):
                # Save previous panel
                if current_panel_name and current_tests:
                    panels.append(LabPanel(panel_name=current_panel_name, tests=current_tests))
                    current_tests = []

                heading = stripped.lstrip("# ").strip()
                # Skip non-test headings
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

            # Detect table header row
            if stripped.startswith("|") and current_panel_name:
                parts = [p.strip() for p in stripped.split("|")]
                parts = [p for p in parts if p]

                # Skip separator rows
                if parts and all(set(p) <= {'-', ':', ' '} for p in parts):
                    continue

                # Check if this is a header row with "Test Name"
                if parts and parts[0].lower() in ("test name", "field"):
                    header_cols = [p.lower() for p in parts]
                    in_test_table = parts[0].lower() == "test name"
                    continue

                # Parse test data rows
                if in_test_table and len(parts) >= 2:
                    test_name = parts[0]
                    result = parts[1] if len(parts) > 1 else None
                    unit = parts[2] if len(parts) > 2 else None
                    ref_range = parts[3] if len(parts) > 3 else None
                    flag_raw = parts[4] if len(parts) > 4 else None

                    # Clean unit/ref values
                    if unit and unit.lower() in ("not specified", "n/a"):
                        unit = None
                    if ref_range and ref_range.lower() in ("not specified", "n/a"):
                        ref_range = None

                    # Parse flag
                    flag = AbnormalityFlag.NORMAL
                    if flag_raw:
                        flag_raw_clean = flag_raw.strip().lower()
                        if "⬆" in flag_raw or flag_raw_clean in ("high", "above"):
                            flag = AbnormalityFlag.HIGH
                        elif "⬇" in flag_raw or flag_raw_clean in ("low", "below"):
                            flag = AbnormalityFlag.LOW
                        elif "⚠" in flag_raw or flag_raw_clean == "critical":
                            flag = AbnormalityFlag.CRITICAL
                        elif flag_raw_clean in ("not specified", "n/a", ""):
                            flag = AbnormalityFlag.NORMAL

                    current_tests.append(LabTest(
                        test_name=test_name,
                        result=result,
                        unit=unit,
                        reference_range=ref_range,
                        flag=flag,
                    ))

        # Save last panel
        if current_panel_name and current_tests:
            panels.append(LabPanel(panel_name=current_panel_name, tests=current_tests))

        return panels

    # ─── Stage 3: Summary Generation ─────────────────────────────────────────

    async def generate_clinician_summary(
        self,
        report: StructuredLabReport,
        markdown: str = "",
    ) -> ClinicianSummary:
        """Stage 3a: Generate high-density clinician summary from document."""
        # Guard: For prescriptions/documents with no test data, return a simple summary
        is_prescription = report.metadata.document_type == DocumentType.PRESCRIPTION
        if is_prescription or (not report.panels and not report.abnormal_results):
            logger.info("Stage 3a SKIPPED: no test data — returning prescription summary")
            # Build prescription description
            rx_lines = []
            for rx in report.prescriptions:
                parts = [rx.drug_name]
                if rx.strength:
                    parts.append(rx.strength)
                if rx.quantity:
                    parts.append(f"Disp: {rx.quantity}")
                if rx.sig:
                    parts.append(f"Sig: {rx.sig}")
                rx_lines.append(", ".join(parts))

            rx_desc = "; ".join(rx_lines) if rx_lines else "No specific medications identified."
            patient_name = report.metadata.patient_name or "Patient"
            doctor = report.metadata.reporting_physician or report.metadata.ordering_physician or "Unknown physician"

            return ClinicianSummary(
                overall_assessment=(
                    f"This is a prescription document for {patient_name}, prescribed by {doctor}. "
                    f"Medications: {rx_desc}. No laboratory test results are available for clinical interpretation."
                ),
                system_findings={},
                critical_values=[],
                differential_considerations=[],
                recommended_actions=[
                    "Review prescription in the context of the patient's medical history and current medications.",
                    "Verify no drug interactions or allergies exist before dispensing.",
                ],
                icd_code_summary=[],
                medication_recommendations=[],
            )

        # Normal path: build abnormal summary and call MedGemma
        abnormal_lines = []
        for test in report.abnormal_results:
            line = f"- {test.test_name}: {test.result} {test.unit or ''} (ref: {test.reference_range or 'N/A'}) [{test.flag.value}]"
            abnormal_lines.append(line)
        abnormal_summary = "\n".join(abnormal_lines) if abnormal_lines else "No abnormal results."

        prompt = CLINICIAN_SUMMARY_PROMPT.format(
            markdown=markdown,
            abnormal_summary=abnormal_summary,
        )

        raw = await self._call_medgemma(prompt, max_tokens=3000)
        logger.info(f"Stage 3a (clinician summary) complete: {len(raw)} chars")

        data = self._parse_json(raw)
        return self._to_clinician_summary(data)

    async def generate_patient_summary(
        self,
        report: StructuredLabReport,
    ) -> PatientSummary:
        """Stage 3b: Generate patient-friendly summary."""
        # Guard: For prescriptions/documents with no test data, return a simple summary
        is_prescription = report.metadata.document_type == DocumentType.PRESCRIPTION
        if is_prescription or (not report.panels and not report.abnormal_results):
            logger.info("Stage 3b SKIPPED: no test data — returning prescription summary")
            # Build patient-friendly prescription description
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

            return PatientSummary(
                greeting="Hello! Here is a summary of your prescription.",
                what_was_tested=(
                    f"This document is a prescription from {doctor}. "
                    f"It does not contain any lab test results."
                ),
                key_results=f"You have been prescribed: {rx_text}.",
                what_is_normal="This is a prescription — no lab test results to review.",
                what_needs_attention=(
                    "Make sure to take your medication exactly as directed by your doctor. "
                    "If you have any questions about the dosage or timing, ask your pharmacist."
                ),
                next_steps=(
                    "1. Fill this prescription at your pharmacy.\n"
                    "2. Take the medication as directed.\n"
                    "3. Follow up with your doctor if you experience any side effects."
                ),
                lifestyle_tips=(
                    "Stay well-hydrated, take medications with food if recommended, "
                    "and complete the full course of medication even if you feel better."
                ),
            )

        # Normal path: build simplified data and call MedGemma
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
        logger.info(f"Stage 3b (patient summary) complete")

        data = self._parse_json(raw)
        return self._to_patient_summary(data)

    # ─── Full Pipeline ───────────────────────────────────────────────────────

    async def analyze_document(
        self,
        file_bytes: bytes,
        filename: str,
        conversation_transcript: Optional[str] = None,
        include_summaries: bool = True,
    ) -> DocumentAnalysisResponse:
        """
        Full 3-stage pipeline: file → markdown → structured data → summaries.
        Accepts PDF or image files.
        """
        t0 = time.time()
        stages_completed = []

        # ── Convert to images ──────────────────────────────────────────
        ext = filename.rsplit(".", 1)[-1].lower() if "." in filename else ""
        if ext == "pdf":
            image_bytes_list = self.pdf_to_images(file_bytes)
            page_count = len(image_bytes_list)
        elif ext in ("png", "jpg", "jpeg", "webp", "bmp", "tiff", "tif"):
            image_bytes_list = [file_bytes]
            page_count = 1
        else:
            raise ValueError(f"Unsupported file type: .{ext}. Use PDF, PNG, JPG, or WEBP.")

        # ── Stage 1: Document Perception ───────────────────────────────
        markdown = await self.perceive_document(image_bytes_list)
        stages_completed.append("perception")

        # ── Stage 2: Clinical Extraction ───────────────────────────────
        structured_report = await self.extract_and_reason(
            markdown,
            conversation_transcript=conversation_transcript,
        )
        stages_completed.append("extraction")

        # ── Stage 3: Summary Generation ────────────────────────────────
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

    async def _call_medgemma(
        self,
        prompt: str,
        max_tokens: int = 2000,
        max_retries: int = 3,
    ) -> str:
        """Call MedGemma-27B on Modal with retry logic for transient errors."""
        payload = {
            "model": "medgemma-27b-it",
            "messages": [{"role": "user", "content": prompt}],
            "max_tokens": max_tokens,
            "temperature": 0.05,
        }

        last_error = None
        for attempt in range(1, max_retries + 1):
            try:
                resp = await self._client.post(
                    f"{self.medgemma_url}/v1/chat/completions",
                    json=payload,
                )
                resp.raise_for_status()
                data = resp.json()

                choices = data.get("choices", [])
                if choices:
                    return choices[0].get("message", {}).get("content", "")
                return str(data)

            except (httpx.ReadError, httpx.ConnectError, httpx.RemoteProtocolError) as e:
                last_error = e
                wait = 2 ** attempt  # 2s, 4s, 8s
                logger.warning(
                    f"MedGemma call failed (attempt {attempt}/{max_retries}): {type(e).__name__}: {e}. "
                    f"Retrying in {wait}s..."
                )
                # Recreate the HTTP client to get a fresh connection
                try:
                    await self._client.aclose()
                except Exception:
                    pass
                self._client = httpx.AsyncClient(
                    timeout=300.0,
                    follow_redirects=True,
                )
                await asyncio.sleep(wait)

            except Exception as e:
                # Non-retryable errors — raise immediately
                raise

        raise RuntimeError(
            f"MedGemma call failed after {max_retries} retries. Last error: {last_error}"
        )

    async def chat_completion(
        self,
        messages: List[dict],
        max_tokens: int = 2000,
        temperature: float = 0.2,
    ) -> dict:
        """Proxy a generic chat completion request to MedGemma on Modal."""
        payload = {
            "model": "medgemma-27b-it",
            "messages": messages,
            "max_tokens": max_tokens,
            "temperature": temperature,
        }
        
        try:
            resp = await self._client.post(
                f"{self.medgemma_url}/v1/chat/completions",
                json=payload,
            )
            resp.raise_for_status()
            return resp.json()
        except httpx.HTTPStatusError as e:
            logger.error(f"MedGemma Chat endpoint returned HTTP {e.response.status_code}: {e.response.text}")
            raise
        except Exception as e:
            logger.error(f"MedGemma Chat endpoint failed: {e}")
            raise

    # ─── JSON Parsing (robust, same strategy as medgemma_service.py) ──────────

    @staticmethod
    def _parse_json(raw: str) -> dict:
        """
        Robustly extract a JSON object from LLM output.
        Handles: clean JSON, markdown-fenced JSON, prompt-echo, truncated JSON.
        """
        # Strip markdown code fences
        cleaned = re.sub(r"```(?:json)?", "", raw).strip().rstrip("`").strip()

        # Strategy 1: Direct parse
        try:
            result = json.loads(cleaned)
            if isinstance(result, dict):
                return result
        except json.JSONDecodeError:
            pass

        # Strategy 2: Find last balanced {...} block
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

        # Strategy 3: Regex extract
        for match in reversed(list(re.finditer(r'\{[^{}]*(?:\{[^{}]*\}[^{}]*)*\}', cleaned, re.DOTALL))):
            try:
                result = json.loads(match.group())
                if isinstance(result, dict):
                    return result
            except json.JSONDecodeError:
                continue

        # Strategy 4: Truncated JSON repair — find outermost { and close properly
        first_brace = cleaned.find('{')
        if first_brace >= 0:
            truncated = cleaned[first_brace:]

            # Find the last complete JSON object boundary (last '}' that
            # might close an array element). We strip from the last
            # incomplete element backwards.
            # Try progressively removing trailing content until we can
            # close brackets and parse.
            for trim_point in range(len(truncated), 0, -1):
                candidate = truncated[:trim_point]

                # Count open/close braces and brackets
                open_braces = candidate.count('{') - candidate.count('}')
                open_brackets = candidate.count('[') - candidate.count(']')

                # Only try if we have more opens than closes (truncation)
                if open_braces >= 0 and open_brackets >= 0:
                    # Close all opens
                    repaired = candidate + ']' * open_brackets + '}' * open_braces
                    try:
                        result = json.loads(repaired)
                        if isinstance(result, dict):
                            logger.info(
                                f"Recovered truncated JSON (trimmed {len(truncated) - trim_point} chars, "
                                f"closed {open_brackets} brackets, {open_braces} braces)"
                            )
                            return result
                    except json.JSONDecodeError:
                        continue

            # Last resort: try simpler repair
            open_braces = truncated.count('{') - truncated.count('}')
            open_brackets = truncated.count('[') - truncated.count(']')
            if open_braces > 0 or open_brackets > 0:
                repaired = truncated + ']' * max(0, open_brackets) + '}' * max(0, open_braces)
                try:
                    result = json.loads(repaired)
                    if isinstance(result, dict):
                        logger.info("Recovered truncated JSON (simple repair)")
                        return result
                except json.JSONDecodeError:
                    pass

        logger.warning(f"Could not parse JSON. Raw (first 500 chars): {raw[:500]}")
        return {}

    # ─── Type Converters ─────────────────────────────────────────────────────

    @staticmethod
    def _to_structured_report(data: dict) -> StructuredLabReport:
        """Convert raw JSON to typed StructuredLabReport."""
        report = StructuredLabReport()

        if not data:
            logger.warning("Stage 2: Empty data after JSON parsing — no structured report")
            return report

        # Metadata
        meta = data.get("metadata", {})
        if meta:
            doc_type = meta.get("document_type", "unknown")
            try:
                report.metadata.document_type = DocumentType(doc_type)
            except ValueError:
                report.metadata.document_type = DocumentType.UNKNOWN
            report.metadata.patient_name = meta.get("patient_name")
            report.metadata.patient_id = meta.get("patient_id")
            report.metadata.date_of_birth = meta.get("date_of_birth")
            report.metadata.age = meta.get("age")
            report.metadata.gender = meta.get("gender")
            report.metadata.report_date = meta.get("report_date")
            report.metadata.sample_collection_date = meta.get("sample_collection_date")
            report.metadata.ordering_physician = meta.get("ordering_physician")
            report.metadata.reporting_physician = meta.get("reporting_physician")
            report.metadata.lab_name = meta.get("lab_name")
            report.metadata.facility_name = meta.get("facility_name")
            report.metadata.facility_address = meta.get("facility_address")
            report.metadata.accession_number = meta.get("accession_number")
            report.metadata.contact_phone = meta.get("contact_phone")
            report.metadata.patient_address = meta.get("patient_address")
            logger.info(f"Metadata: patient={report.metadata.patient_name}, type={doc_type}")
        else:
            logger.warning("No metadata found in Stage 2 output")

        # Panels
        panels_data = data.get("panels", [])
        logger.info(f"Parsing {len(panels_data)} panels from Stage 2")
        for panel_data in panels_data:
            tests = []
            for t in panel_data.get("tests", []):
                flag = t.get("flag", "normal")
                try:
                    flag_enum = AbnormalityFlag(flag)
                except ValueError:
                    flag_enum = AbnormalityFlag.NORMAL

                tests.append(LabTest(
                    test_name=str(t.get("test_name", "")),
                    result=t.get("result"),
                    unit=t.get("unit"),
                    reference_range=t.get("reference_range"),
                    flag=flag_enum,
                    notes=t.get("notes"),
                ))
            report.panels.append(LabPanel(
                panel_name=str(panel_data.get("panel_name", "Unknown Panel")),
                tests=tests,
            ))

        # Collect abnormal results
        for panel in report.panels:
            for test in panel.tests:
                if test.flag != AbnormalityFlag.NORMAL:
                    report.abnormal_results.append(test)

        # Clinical insights
        for insight_data in data.get("clinical_insights", []):
            urgency = insight_data.get("urgency", "routine")
            try:
                urgency_enum = UrgencyLevel(urgency)
            except ValueError:
                urgency_enum = UrgencyLevel.ROUTINE

            icd_codes = [
                ICDCode(
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

        # Top-level ICD codes
        for c in data.get("icd_codes", []):
            report.icd_codes.append(ICDCode(
                code=str(c.get("code", "")),
                description=str(c.get("description", "")),
                version=c.get("version", 10),
            ))

        # Medication suggestions
        for m in data.get("medication_suggestions", []):
            report.medication_suggestions.append(MedicationSuggestion(
                name=str(m.get("name", "")),
                indication=str(m.get("indication", "")),
                dose=m.get("dose"),
                frequency=m.get("frequency"),
                route=m.get("route"),
                notes=m.get("notes"),
            ))

        return report

    @staticmethod
    def _to_clinician_summary(data: dict) -> ClinicianSummary:
        """Convert raw JSON to typed ClinicianSummary."""
        # Filter system_findings to only non-null values
        system_findings_raw = data.get("system_findings", {})
        system_findings = {
            k: v for k, v in system_findings_raw.items()
            if v is not None and isinstance(v, str) and v.strip()
        }

        icd_codes = [
            ICDCode(
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
    def _to_patient_summary(data: dict) -> PatientSummary:
        """Convert raw JSON to typed PatientSummary."""
        return PatientSummary(
            greeting=data.get("greeting", ""),
            what_was_tested=data.get("what_was_tested", ""),
            key_results=data.get("key_results", ""),
            what_is_normal=data.get("what_is_normal", ""),
            what_needs_attention=data.get("what_needs_attention", ""),
            next_steps=data.get("next_steps", ""),
            lifestyle_tips=data.get("lifestyle_tips"),
        )

    async def close(self):
        """Close the HTTP client."""
        await self._client.aclose()

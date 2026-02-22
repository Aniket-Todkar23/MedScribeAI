"""
MedGemma Service
================
Wraps MedGemma-4B-IT (local or Modal-hosted) for:
  1. Medical NER — extract structured entities from classified dialogue
  2. EMR Narrative generation — Chief Complaint, HPI, A&P, Patient Instructions
"""

import re
import json
import logging
import os
import torch
import httpx
from datetime import date
from typing import List, Tuple, Optional
import uuid

from schemas import (
    ExtractedEntities, Vital, Symptom, Diagnosis, Medication,
    Allergy, LabResult, MedicalHistoryItem, SocialHistory, ICDCode,
    Procedure, FamilyHistoryItem, CodingEntry,
    EMRRecord, PatientDemographics, EncounterInfo, EncounterType,
    ClinicalNarratives, ReviewOfSystems,
    ClassifiedTranscript, DialogueTurn, SpeakerRole, EncounterStatus,
)

logger = logging.getLogger(__name__)


# ─────────────────────────────────────────────────────────────────────────────
# PROMPTS
# ─────────────────────────────────────────────────────────────────────────────

NER_PROMPT = """You are a clinical NER specialist. Extract all medical entities from this clinical dialogue between a CLINICIAN (D/CLINICIAN) and PATIENT (P/PATIENT).

CRITICAL RULES:
1. Only extract information the PATIENT actually reports or confirms — NOT examples/options the clinician offers
2. If the clinician asks "Is the pain sharp, burning, or achy?" and patient says "sharp" — only extract "sharp", not "burning" or "achy"
3. Use the patient's own words for symptom descriptions
4. For duration, use the patient's stated duration (e.g., if patient says "maybe like 8 hours", record "approximately 8 hours")
5. Do NOT include conditions the patient denies
6. For family_history, use the relation field (e.g. "father", "mother", "sibling")
7. For procedures, only include ones explicitly mentioned as done, planned, or ordered — never invent them

DIALOGUE:
{dialogue}

Return ONLY valid JSON matching this schema. Use null for unknown fields, empty arrays [] for empty categories:
{{
  "vitals": [{{"name":"...","value":"...","unit":"..."}}],
  "symptoms": [{{
    "description":"...","duration":"...","severity":"...","location":"...",
    "onset":"...","character":"...",
    "aggravating_factors":["..."],"relieving_factors":["..."],"associated_symptoms":["..."]
  }}],
  "diagnoses": [{{"condition":"...","certainty":"suspected|confirmed|provisional|ruled_out|differential","onset_date":"...","notes":"..."}}],
  "medications": [{{"name":"...","dose":"...","frequency":"...","route":"...","status":"active|prescribed|discontinued|on-hold","reason":"..."}}],
  "allergies": [{{"substance":"...","reaction":"...","severity":"mild|moderate|severe","allergy_type":"allergy|intolerance","clinical_status":"active|inactive|resolved"}}],
  "lab_results": [{{"test_name":"...","value":"...","unit":"...","reference_range":"...","interpretation":"normal|abnormal|critical","date_collected":"..."}}],
  "procedures": [{{"name":"...","date":"...","status":"completed|in-progress|planned","notes":"..."}}],
  "medical_history": [{{"condition":"...","date_or_duration":null,"status":"active|resolved|inactive"}}],
  "family_history": [{{"relation":"...","condition":"...","age_at_onset":"...","deceased":null,"notes":"..."}}],
  "social_history": {{
    "smoking":"...","alcohol":"...","cannabis":"...","other_drugs":"...",
    "occupation":"...","exercise":"...","living_situation":"...",
    "marital_status":"...","diet":"...","education":"...","travel_history":"..."
  }}
}}

JSON:"""

NARRATIVE_PROMPT = """You are a clinical documentation specialist. Generate EMR narrative sections from these extracted entities and dialogue context.

ENTITIES:
{entities}

DIALOGUE CONTEXT:
{dialogue_summary}

Return ONLY valid JSON:
{{
  "chief_complaint": "Single sentence: primary reason for visit.",
  "history_of_present_illness": "2-4 sentences in SOAP style: onset, duration, character, severity, associated symptoms, aggravating/relieving factors.",
  "review_of_systems": {{
    "constitutional": "Denies fever, chills, weight loss" or "Reports fatigue, unintentional weight loss",
    "cardiovascular": "...",
    "respiratory": "...",
    "gastrointestinal": "...",
    "musculoskeletal": "...",
    "neurological": "...",
    "psychiatric": "...",
    "eyes": null,
    "ent": null,
    "genitourinary": null,
    "integumentary": null,
    "endocrine": null,
    "hematologic": null,
    "immunologic": null
  }},
  "physical_examination": "Brief PE findings if mentioned in dialogue, otherwise null.",
  "assessment": "Clinical impression paragraph.",
  "plan": "Numbered treatment plan: medications, investigations, referrals, follow-up.",
  "patient_instructions": "Plain English instructions for the patient. No jargon.",
  "follow_up": "Follow-up timeline and instructions, e.g. 'Return in 2 weeks or sooner if symptoms worsen.'"
}}

RULES:
- For review_of_systems, use null for body systems NOT discussed in the dialogue
- Only populate systems that were explicitly asked about or volunteered by the patient
- Do NOT invent findings — if nothing was said about a system, set it to null

JSON:"""

PATIENT_SUMMARY_PROMPT = """You are a compassionate medical assistant. Translate the following EMR record into a patient-friendly summary.
Avoid medical jargon. Explain the diagnosis, the treatment plan, and any instructions clearly and simply.

EMR RECORD:
{emr_record}

Return ONLY the patient-friendly summary text. Do not include JSON formatting.
"""

# ─────────────────────────────────────────────────────────────────────────────
# MEDGEMMA LOCAL (downloaded model)
# ─────────────────────────────────────────────────────────────────────────────

class MedGemmaLocal:

    MODEL_ID = "google/medgemma-4b-it"

    def __init__(self, device: str = "auto"):
        self._model = None
        self._tokenizer = None
        self._device = device
        self.loaded = False

    def load(self):
        from transformers import AutoTokenizer, AutoModelForCausalLM

        logger.info(f"Loading MedGemma locally: {self.MODEL_ID}")
        hf_token = os.getenv("HF_TOKEN")

        self._tokenizer = AutoTokenizer.from_pretrained(
            self.MODEL_ID, token=hf_token
        )
        self._model = AutoModelForCausalLM.from_pretrained(
            self.MODEL_ID,
            torch_dtype=torch.bfloat16,
            device_map=self._device,
            token=hf_token,
        )
        self._model.eval()
        self.loaded = True
        logger.info("MedGemma local model ready.")

    def generate(self, prompt: str, max_new_tokens: int = 1500) -> str:
        messages = [{"role": "user", "content": prompt}]
        inputs = self._tokenizer.apply_chat_template(
            messages, tokenize=True, add_generation_prompt=True, return_tensors="pt"
        ).to(self._model.device)

        with torch.no_grad():
            out = self._model.generate(
                inputs,
                max_new_tokens=max_new_tokens,
                temperature=0.05,
                do_sample=True,
                repetition_penalty=1.1,
                pad_token_id=self._tokenizer.eos_token_id,
            )
        return self._tokenizer.decode(
            out[0][inputs.shape[1]:], skip_special_tokens=True
        ).strip()

    @property
    def model(self): return self._model

    @property
    def tokenizer(self): return self._tokenizer


# ─────────────────────────────────────────────────────────────────────────────
# MEDGEMMA MODAL (hosted on Modal via vLLM OpenAI-compatible API)
# ─────────────────────────────────────────────────────────────────────────────

class MedGemmaModal:


    def __init__(self):
        self.base_url = os.getenv("MODAL_MEDGEMMA_URL", "").rstrip("/")
        # If the user provided the full /v1/chat/completions URL, strip it back to the base
        if self.base_url.endswith("/v1/chat/completions"):
            self.base_url = self.base_url[:-20]
        self.loaded   = False
        self.model    = None   # Not applicable for API
        self.tokenizer = None  # Not applicable for API
        self._client  = None

    def load(self):
        """Validate the Modal endpoint URL and create HTTP client."""
        if not self.base_url:
            raise RuntimeError(
                "Set MODAL_MEDGEMMA_URL env var to your Modal endpoint URL. "
                "Deploy with: modal deploy modal_medgemma.py"
            )
        self._client = httpx.Client(base_url=self.base_url, timeout=300.0)
        # Quick connectivity check
        try:
            # vLLM endpoints might not expose /v1/models by default, so we just log it
            resp = self._client.get("/v1/models")
            if resp.status_code == 200:
                logger.info(f"Modal MedGemma endpoint ready: {self.base_url}")
            else:
                logger.info(f"Modal MedGemma endpoint configured: {self.base_url} (status {resp.status_code})")
        except Exception as e:
            logger.warning(f"Modal endpoint check failed (may still work): {e}")
        self.loaded = True

    def generate(self, prompt: str, max_new_tokens: int = 1500) -> str:
        """Call the Modal vLLM endpoint (OpenAI-compatible chat completions)."""
        if not self._client:
            self.load()

        payload = {
            "model": "medgemma-27b-it",
            "messages": [{"role": "user", "content": prompt}],
            "max_tokens": max_new_tokens,
            "temperature": 0.05,
        }

        resp = self._client.post("/v1/chat/completions", json=payload)
        resp.raise_for_status()
        data = resp.json()

        choices = data.get("choices", [])
        if choices:
            return choices[0].get("message", {}).get("content", "")
        return str(data)


# ─────────────────────────────────────────────────────────────────────────────
# MEDGEMMA SERVICE  (wraps either backend)
# ─────────────────────────────────────────────────────────────────────────────

class MedGemmaService:
    """
    Unified interface for MedGemma — local or Modal-hosted.
    Provides NER extraction + EMR narrative generation + ICD enrichment.
    """

    def __init__(self, backend: str = "modal"):
        """
        backend: "local" → MedGemmaLocal (requires GPU)
                 "modal" → MedGemmaModal  (requires Modal deployment)
        """
        if backend == "modal":
            self._backend = MedGemmaModal()
        else:
            self._backend = MedGemmaLocal(device=os.getenv("DEVICE", "auto"))

        self.backend_name = backend
        self._icd_service = None  # set externally via set_icd_service()

    def set_icd_service(self, icd_service):
        """Attach the ICD service for auto-mapping codes to entities."""
        self._icd_service = icd_service

    def load(self):
        self._backend.load()

    @property
    def model(self):
        return getattr(self._backend, "model", None)

    @property
    def tokenizer(self):
        return getattr(self._backend, "tokenizer", None)

    # ── NER ──────────────────────────────────────────────────────────────────

    def extract_entities(
        self, turns: List[DialogueTurn]
    ) -> Tuple[ExtractedEntities, Optional[str]]:
        """Extract structured medical entities from classified dialogue."""
        dialogue_text = "\n".join(
            f"[{t.speaker.value}]: {t.text}" for t in turns
        )
        prompt = NER_PROMPT.format(dialogue=dialogue_text)
        raw = self._backend.generate(prompt, max_new_tokens=1500)
        logger.debug(f"NER raw output: {raw[:400]}")

        data = self._parse_json(raw)
        entities = self._to_entities(data)

        # Auto-map ICD codes to symptoms and diagnoses
        if self._icd_service and self._icd_service.loaded:
            entities = self._enrich_with_icd(entities)

        return entities, raw

    def _enrich_with_icd(self, entities: ExtractedEntities) -> ExtractedEntities:
        """Attach ICD-10 codes to each symptom and diagnosis."""
        for i, symptom in enumerate(entities.symptoms):
            matches = self._icd_service.lookup(symptom.description, top_k=3, version=10)
            entities.symptoms[i] = symptom.model_copy(update={
                "icd_codes": [
                    ICDCode(code=m.code, title=m.title, version=m.version, score=m.score)
                    for m in matches
                ],
            })

        for i, dx in enumerate(entities.diagnoses):
            matches = self._icd_service.lookup(dx.condition, top_k=3, version=10)
            entities.diagnoses[i] = dx.model_copy(update={
                "icd_codes": [
                    ICDCode(code=m.code, title=m.title, version=m.version, score=m.score)
                    for m in matches
                ],
            })

        return entities

    # ── Narrative generation ──────────────────────────────────────────────────

    def generate_narratives(
        self,
        entities: ExtractedEntities,
        transcript: ClassifiedTranscript,
    ) -> dict:
        """Generate clinical narrative sections (HPI, ROS, A&P, etc.)."""
        entities_json = json.dumps({
            "symptoms": [s.model_dump(exclude_none=True, exclude={"icd_codes", "coding"}) for s in entities.symptoms],
            "diagnoses": [d.model_dump(exclude_none=True, exclude={"icd_codes", "coding"}) for d in entities.diagnoses],
            "vitals": [v.model_dump(exclude_none=True, exclude={"coding"}) for v in entities.vitals],
            "medications": [m.model_dump(exclude_none=True, exclude={"coding"}) for m in entities.medications],
            "allergies": [a.model_dump(exclude_none=True, exclude={"coding"}) for a in entities.allergies],
            "procedures": [p.model_dump(exclude_none=True, exclude={"coding"}) for p in entities.procedures],
            "social_history": entities.social_history.model_dump(exclude_none=True) if entities.social_history else {},
            "family_history": [f.model_dump(exclude_none=True) for f in entities.family_history],
        }, indent=2)

        patient_lines  = [t.text for t in transcript.turns if t.speaker == SpeakerRole.PATIENT][:6]
        clinician_lines = [t.text for t in transcript.turns if t.speaker == SpeakerRole.CLINICIAN][:4]
        dialogue_summary = (
            f"Patient: {' | '.join(patient_lines)}\n"
            f"Clinician: {' | '.join(clinician_lines)}"
        )

        prompt = NARRATIVE_PROMPT.format(
            entities=entities_json,
            dialogue_summary=dialogue_summary,
        )
        raw = self._backend.generate(prompt, max_new_tokens=800)
        logger.debug(f"Narrative raw output: {raw[:400]}")
        return self._parse_json(raw)

    # ── EMR builder ───────────────────────────────────────────────────────────

    def build_emr(
        self,
        entities: ExtractedEntities,
        transcript: ClassifiedTranscript,
        patient_id: Optional[str] = None,
        encounter_date: Optional[str] = None,
        encounter_type: Optional[str] = None,
        audio_duration: Optional[float] = None,
        patient_name: Optional[str] = None,
        provider_name: Optional[str] = None,
        facility_name: Optional[str] = None,
    ) -> EMRRecord:
        """Build a complete FHIR-aligned EMR record."""
        narr_data = self.generate_narratives(entities, transcript)

        # Build ReviewOfSystems from narrative LLM output
        ros_data = narr_data.get("review_of_systems")
        ros = None
        if ros_data and isinstance(ros_data, dict):
            ros_fields = {k: v for k, v in ros_data.items() if k in ReviewOfSystems.model_fields and v}
            if ros_fields:
                ros = ReviewOfSystems(**ros_fields)

        narratives = ClinicalNarratives(
            chief_complaint=narr_data.get("chief_complaint", ""),
            history_of_present_illness=narr_data.get("history_of_present_illness", ""),
            review_of_systems=ros,
            physical_examination=narr_data.get("physical_examination"),
            assessment=narr_data.get("assessment", ""),
            plan=narr_data.get("plan", ""),
            patient_instructions=narr_data.get("patient_instructions", ""),
            follow_up=narr_data.get("follow_up"),
        )

        # Build encounter info
        enc_type = EncounterType.OUTPATIENT
        if encounter_type:
            try:
                enc_type = EncounterType(encounter_type)
            except ValueError:
                pass

        from schemas import ProviderInfo, FacilityInfo
        encounter = EncounterInfo(
            encounter_type=enc_type,
            encounter_date=encounter_date or date.today().isoformat(),
            reason_for_visit=narratives.chief_complaint or None,
            provider=ProviderInfo(name=provider_name) if provider_name else None,
            facility=FacilityInfo(name=facility_name) if facility_name else None,
        )

        # Collect all ICD-10 codes across entities
        all_icd = []
        for s in entities.symptoms:
            all_icd.extend(s.icd_codes)
        for d in entities.diagnoses:
            all_icd.extend(d.icd_codes)
        # Deduplicate by code
        seen_codes = set()
        unique_icd = []
        for ic in all_icd:
            if ic.code not in seen_codes:
                seen_codes.add(ic.code)
                unique_icd.append(ic)

        # Separate surgical history from medical history
        surgical_keywords = {"surgery", "surgical", "appendectomy", "cholecystectomy",
                            "arthroplasty", "replacement", "repair", "excision",
                            "resection", "transplant", "bypass", "amputation"}
        surgical_history = []
        medical_history = []
        for mh in entities.medical_history:
            if any(kw in mh.condition.lower() for kw in surgical_keywords):
                surgical_history.append(mh)
            else:
                medical_history.append(mh)

        return EMRRecord(
            status=EncounterStatus.DRAFT,
            patient=PatientDemographics(
                patient_id=patient_id or str(uuid.uuid4()),
                name=patient_name,
            ),
            encounter=encounter,

            # Clinical entities
            vitals=entities.vitals,
            symptoms=entities.symptoms,
            diagnoses=entities.diagnoses,
            medications=entities.medications,
            allergies=entities.allergies,
            lab_results=entities.lab_results,
            procedures=entities.procedures,

            # History
            medical_history=medical_history,
            surgical_history=surgical_history,
            family_history=entities.family_history,
            social_history=entities.social_history,

            # Narratives
            narratives=narratives,

            # Coding
            icd10_codes=unique_icd,

            # Meta
            audio_duration_seconds=audio_duration,
            transcript_char_count=len(transcript.raw_transcript),
            total_dialogue_turns=transcript.total_turns,
        )

    def generate_patient_summary(self, emr_record: EMRRecord) -> str:
        """Generate a patient-friendly summary from an EMR record."""
        emr_json = emr_record.model_dump_json(exclude_none=True, indent=2)
        prompt = PATIENT_SUMMARY_PROMPT.format(emr_record=emr_json)
        raw = self._backend.generate(prompt, max_new_tokens=800)
        logger.debug(f"Patient summary raw output: {raw[:400]}")
        return raw.strip()

    # ── Helpers ───────────────────────────────────────────────────────────────

    @staticmethod
    def _parse_json(raw: str) -> dict:
        """
        Robustly extract a JSON object from LLM output.
        Handles: clean JSON, markdown-fenced JSON, prompt-echo with JSON at end,
        truncated JSON, and other common LLM output quirks.
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

        # Strategy 2: Find the LAST {...} block (LLMs sometimes echo the prompt)
        # Use greedy match from the rightmost { to find the closing }
        brace_positions = [m.start() for m in re.finditer(r'\{', cleaned)]
        for start_pos in reversed(brace_positions):
            candidate = cleaned[start_pos:]
            # Try to find balanced braces
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

        # Strategy 3: Regex extract any {...} with re.DOTALL
        for match in reversed(list(re.finditer(r'\{[^{}]*(?:\{[^{}]*\}[^{}]*)*\}', cleaned, re.DOTALL))):
            try:
                result = json.loads(match.group())
                if isinstance(result, dict):
                    return result
            except json.JSONDecodeError:
                continue

        # Strategy 4: Truncated JSON — try adding closing braces
        last_brace = cleaned.rfind('{')
        if last_brace >= 0:
            truncated = cleaned[last_brace:]
            # Count open vs close braces
            open_count = truncated.count('{') - truncated.count('}')
            if open_count > 0:
                repaired = truncated + ']}' * 2 + '}' * open_count  # close arrays then objects
                try:
                    result = json.loads(repaired)
                    if isinstance(result, dict):
                        logger.info("Recovered truncated JSON by adding closing braces")
                        return result
                except json.JSONDecodeError:
                    pass

        logger.warning(f"Could not parse JSON from model output. Raw (first 500 chars): {raw[:500]}")
        return {}

    @staticmethod
    def _to_entities(data: dict) -> ExtractedEntities:
        """Convert raw JSON dict to typed ExtractedEntities, tolerating LLM quirks."""
        e = ExtractedEntities()

        for v in data.get("vitals", []):
            try:
                e.vitals.append(Vital(
                    name=str(v.get("name", "")),
                    value=str(v.get("value", "")),
                    unit=v.get("unit"),
                ))
            except Exception:
                pass

        for s in data.get("symptoms", []):
            try:
                # Handle list fields that LLM might return as strings
                def _to_list(val):
                    if isinstance(val, list):
                        return [str(x) for x in val if x]
                    if isinstance(val, str) and val:
                        return [val]
                    return []

                e.symptoms.append(Symptom(
                    description=str(s.get("description", "")),
                    duration=s.get("duration"),
                    severity=s.get("severity"),
                    location=s.get("location"),
                    onset=s.get("onset"),
                    character=s.get("character"),
                    aggravating_factors=_to_list(s.get("aggravating_factors")),
                    relieving_factors=_to_list(s.get("relieving_factors")),
                    associated_symptoms=_to_list(s.get("associated_symptoms")),
                ))
            except Exception:
                pass

        for d in data.get("diagnoses", []):
            try:
                e.diagnoses.append(Diagnosis(
                    condition=str(d.get("condition", "")),
                    certainty=d.get("certainty", "suspected"),
                    onset_date=d.get("onset_date"),
                    notes=d.get("notes"),
                ))
            except Exception:
                pass

        for m in data.get("medications", []):
            try:
                e.medications.append(Medication(
                    name=str(m.get("name", "")),
                    dose=m.get("dose"),
                    frequency=m.get("frequency"),
                    route=m.get("route"),
                    status=m.get("status", "active"),
                    reason=m.get("reason"),
                ))
            except Exception:
                pass

        for a in data.get("allergies", []):
            try:
                e.allergies.append(Allergy(
                    substance=str(a.get("substance", "")),
                    reaction=a.get("reaction"),
                    severity=a.get("severity"),
                    allergy_type=a.get("allergy_type"),
                    clinical_status=a.get("clinical_status", "active"),
                ))
            except Exception:
                pass

        for lr in data.get("lab_results", []):
            try:
                e.lab_results.append(LabResult(
                    test_name=str(lr.get("test_name", "")),
                    value=lr.get("value"),
                    unit=lr.get("unit"),
                    reference_range=lr.get("reference_range"),
                    interpretation=lr.get("interpretation"),
                    date_collected=lr.get("date_collected"),
                ))
            except Exception:
                pass

        for p in data.get("procedures", []):
            try:
                if isinstance(p, str):
                    if p:
                        e.procedures.append(Procedure(name=p))
                elif isinstance(p, dict):
                    e.procedures.append(Procedure(
                        name=str(p.get("name", "")),
                        date=p.get("date"),
                        status=p.get("status"),
                        notes=p.get("notes"),
                    ))
            except Exception:
                pass

        for h in data.get("medical_history", []):
            try:
                e.medical_history.append(MedicalHistoryItem(
                    condition=str(h.get("condition", "")),
                    date_or_duration=h.get("date_or_duration"),
                    status=h.get("status"),
                ))
            except Exception:
                pass

        for fh in data.get("family_history", []):
            try:
                # Support both old format (MedicalHistoryItem) and new (FamilyHistoryItem)
                e.family_history.append(FamilyHistoryItem(
                    relation=str(fh.get("relation", "unknown")),
                    condition=str(fh.get("condition", "")),
                    age_at_onset=fh.get("age_at_onset"),
                    deceased=fh.get("deceased"),
                    notes=fh.get("notes"),
                ))
            except Exception:
                pass

        sh = data.get("social_history", {})
        if sh and isinstance(sh, dict):
            try:
                valid_fields = {k: v for k, v in sh.items()
                               if k in SocialHistory.model_fields and v}
                if valid_fields:
                    e.social_history = SocialHistory(**valid_fields)
            except Exception:
                pass

        return e

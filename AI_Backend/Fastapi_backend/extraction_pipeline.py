"""
=============================================================================
EMR Pipeline
=============================================================================
Stages:
  1. Dialogue Classification  — tag each turn as CLINICIAN or PATIENT
  2. Medical NER              — extract vitals, symptoms, diagnoses, etc.
                                (MedGemma-27B-text-it  OR  fallback options)
  3. ICD-9/10 Mapping         — match extracted entities to your CSV dataset
=============================================================================
Install:
    pip install transformers torch accelerate pandas scikit-learn
    pip install sentence-transformers   # for semantic ICD matching
    pip install anthropic               # optional: Claude fallback
=============================================================================
"""

import re
import json
import csv
import pandas as pd
import torch
from pathlib import Path
from dataclasses import dataclass, field, asdict
from typing import List, Optional
from sentence_transformers import SentenceTransformer, util


# ─────────────────────────────────────────────────────────────────────────────
# 0.  DATA STRUCTURES
# ─────────────────────────────────────────────────────────────────────────────

@dataclass
class DialogueTurn:
    index: int
    speaker: str          # "CLINICIAN" | "PATIENT" | "UNKNOWN"
    text: str
    confidence: float = 1.0


@dataclass
class MedicalEntity:
    entity_type: str      # symptom | vital | diagnosis | medication | ...
    value: str
    duration: Optional[str] = None
    severity: Optional[str] = None
    location: Optional[str] = None
    source_speaker: str = "PATIENT"


@dataclass
class ICDMatch:
    icd_code: str
    icd_title: str
    matched_entity: str
    similarity_score: float
    version: str = "ICD-10"   # or "ICD-9"


@dataclass
class EMROutput:
    classified_dialogue: List[DialogueTurn] = field(default_factory=list)
    entities: List[MedicalEntity] = field(default_factory=list)
    icd_matches: List[ICDMatch] = field(default_factory=list)
    patient_summary: str = ""


# ─────────────────────────────────────────────────────────────────────────────
# 1.  DIALOGUE CLASSIFICATION
#     Approach: lightweight rule/heuristic layer → zero-shot LLM layer
# ─────────────────────────────────────────────────────────────────────────────

class DialogueClassifier:
    """
    Classifies each transcript line as CLINICIAN or PATIENT.

    Strategy priority:
      A) Speaker-prefixed transcript 
      B) Heuristic pattern matching   
      C) Zero-shot with MedGemma-4B  
    """

    # -- Heuristic patterns --------------------------------------------------
    _CLINICIAN_RE = re.compile(
        r"\b(how long|since when|any history|do you have|are you (taking|allergic)|"
        r"pain (scale|level)|describe (the|your)|on a scale|let me (check|examine)|"
        r"blood pressure|temperature|pulse|i('ll| will) prescribe|my (diagnosis|assessment)|"
        r"we('ll| will) (run|order)|refer you|follow.?up|any (other )?complaints|"
        r"where (exactly|does it)|does it (radiate|spread)|any (nausea|vomiting|fever))\b",
        re.IGNORECASE
    )
    _PATIENT_RE = re.compile(
        r"\b(i (feel|have|notice|started|can't|am)|it (hurts|started|feels)|"
        r"since (last|yesterday|morning|week|month)|my (chest|head|stomach|leg|arm|back)|"
        r"the pain|i've been|doctor|yes( doctor)?|no( doctor)?|"
        r"about \d+ (day|week|month|year)|kind of|sort of|a little)\b",
        re.IGNORECASE
    )

    # Prefix patterns like "Doctor:", "Dr.:", "Patient:", "P:", "C:" etc.
    _PREFIX_MAP = {
        re.compile(r"^(doctor|dr\.?|clinician|physician|nurse|therapist)\s*:", re.I): "CLINICIAN",
        re.compile(r"^(patient|pt\.?|p)\s*:", re.I): "PATIENT",
    }

    def classify_line(self, line: str) -> tuple[str, float]:
        """Returns (role, confidence)."""
        # A) Prefix detection
        for pattern, role in self._PREFIX_MAP.items():
            if pattern.match(line.strip()):
                return role, 1.0

        # B) Heuristic
        c_score = len(self._CLINICIAN_RE.findall(line))
        p_score = len(self._PATIENT_RE.findall(line))

        if c_score > p_score and c_score > 0:
            conf = min(0.5 + 0.1 * c_score, 0.95)
            return "CLINICIAN", conf
        elif p_score > c_score and p_score > 0:
            conf = min(0.5 + 0.1 * p_score, 0.95)
            return "PATIENT", conf

        return "UNKNOWN", 0.0

    def classify_transcript(
        self,
        transcript: str,
        use_llm_for_unknown: bool = True,
        llm_classifier=None,
    ) -> List[DialogueTurn]:
        """
        Main entry. Parses a raw transcript string (one line per turn).
        Lines starting with a blank or continuation are merged with prior turn.
        """
        lines = [l.strip() for l in transcript.strip().splitlines() if l.strip()]
        turns: List[DialogueTurn] = []

        for i, line in enumerate(lines):
            # Strip speaker prefix before storing text
            clean_text = line
            for pattern in self._PREFIX_MAP:
                clean_text = pattern.sub("", clean_text).strip()

            role, conf = self.classify_line(line)

            # If still UNKNOWN and a LLM classifier provided → use it
            if role == "UNKNOWN" and use_llm_for_unknown and llm_classifier:
                role, conf = llm_classifier.classify_single(line, context=turns[-3:])

            turns.append(DialogueTurn(index=i, speaker=role, text=clean_text, confidence=conf))

        # Post-process: propagate context (if UNKNOWN between two same-role turns → inherit)
        for i, t in enumerate(turns):
            if t.speaker == "UNKNOWN" and i > 0 and i < len(turns) - 1:
                prev_role = turns[i - 1].speaker
                next_role = turns[i + 1].speaker
                if prev_role == next_role and prev_role != "UNKNOWN":
                    turns[i].speaker = prev_role
                    turns[i].confidence = 0.55

        return turns

    def to_dataframe(self, turns: List[DialogueTurn]) -> pd.DataFrame:
        return pd.DataFrame([asdict(t) for t in turns])


# ─────────────────────────────────────────────────────────────────────────────
# 2a.  MEDICAL NER — MedGemma (Primary, Recommended)
#
#  MedGemma-27B-text-it: text-only, best for EHR/clinical text NER
#  MedGemma-4B-it:       lighter, good for resource-constrained environments
#
#  Both are instruction-tuned → prompt them directly for structured extraction
# ─────────────────────────────────────────────────────────────────────────────

class MedGemmaNER:
    """
    Uses google/medgemma-27b-text-it (or 4b-it) for structured medical NER.
    MedGemma is pre-trained on medical text, FHIR records, and clinical QA —
    making it significantly better than general LLMs for clinical entity extraction.
    """

    MODEL_OPTIONS = {
        "27b": "google/medgemma-27b-text-it",   # Best accuracy, needs ~55GB VRAM
        "4b":  "google/medgemma-4b-it",          # Lighter, ~8GB VRAM, good for dev
    }

    ENTITY_SCHEMA = {
        "vitals":            ["blood_pressure", "heart_rate", "temperature",
                               "oxygen_saturation", "respiratory_rate", "weight", "height", "bmi"],
        "symptoms":          ["description", "duration", "severity (1-10)", "location", "onset"],
        "diagnoses":         ["condition", "certainty (confirmed/suspected/ruled_out)"],
        "medications":       ["name", "dose", "frequency", "route"],
        "allergies":         ["substance", "reaction_type"],
        "medical_history":   ["condition", "date_or_duration"],
        "procedures":        ["name", "date"],
        "lab_results":       ["test_name", "value", "unit", "normal_range"],
        "family_history":    ["condition", "relation"],
        "social_history":    ["smoking", "alcohol", "occupation", "exercise"],
    }

    SYSTEM_PROMPT = """You are a clinical NER specialist. Extract structured medical 
entities from the provided clinician-patient dialogue. Return ONLY valid JSON — 
no markdown, no preamble. Null fields should be omitted. Be conservative: 
only extract what is explicitly stated or clinically implied."""

    def __init__(self, model_size: str = "4b", device: str = "auto"):
        from transformers import AutoTokenizer, AutoModelForCausalLM

        model_id = self.MODEL_OPTIONS[model_size]
        print(f"[MedGemmaNER] Loading {model_id}...")

        self.tokenizer = AutoTokenizer.from_pretrained(model_id)
        self.model = AutoModelForCausalLM.from_pretrained(
            model_id,
            torch_dtype=torch.bfloat16,
            device_map=device,
        )
        self.model.eval()
        print("[MedGemmaNER] Model ready.")

    def _build_prompt(self, dialogue_text: str) -> str:
        schema_str = json.dumps(self.ENTITY_SCHEMA, indent=2)
        return f"""Extract medical entities from the following clinical dialogue.
Return a JSON object with keys matching this schema:
{schema_str}

Each key maps to a list of objects with the sub-fields shown.

DIALOGUE:
{dialogue_text}

RESPONSE (JSON only):"""

    def extract(self, turns: List[DialogueTurn]) -> List[MedicalEntity]:
        """Run NER on role-tagged dialogue turns."""
        # Format dialogue for the model
        dialogue_text = "\n".join(
            f"[{t.speaker}] {t.text}" for t in turns
        )

        prompt = self._build_prompt(dialogue_text)
        messages = [
            {"role": "user", "content": prompt}
        ]

        inputs = self.tokenizer.apply_chat_template(
            messages,
            tokenize=True,
            add_generation_prompt=True,
            return_tensors="pt"
        ).to(self.model.device)

        with torch.no_grad():
            output_ids = self.model.generate(
                inputs,
                max_new_tokens=1024,
                temperature=0.1,      # Low temp for deterministic extraction
                do_sample=True,
                pad_token_id=self.tokenizer.eos_token_id,
            )

        output_text = self.tokenizer.decode(
            output_ids[0][inputs.shape[1]:],
            skip_special_tokens=True
        )

        return self._parse_output(output_text)

    def _parse_output(self, raw: str) -> List[MedicalEntity]:
        """Parse JSON output into MedicalEntity objects."""
        # Strip any accidental markdown fences
        raw = re.sub(r"```json|```", "", raw).strip()
        try:
            data = json.loads(raw)
        except json.JSONDecodeError:
            # Attempt to extract the first JSON block
            match = re.search(r"\{.*\}", raw, re.DOTALL)
            if match:
                data = json.loads(match.group())
            else:
                print("[MedGemmaNER] Warning: could not parse JSON output.")
                return []

        entities = []

        for symptom in data.get("symptoms", []):
            entities.append(MedicalEntity(
                entity_type="symptom",
                value=symptom.get("description", ""),
                duration=symptom.get("duration"),
                severity=str(symptom.get("severity (1-10)", "")),
                location=symptom.get("location"),
            ))

        for diag in data.get("diagnoses", []):
            entities.append(MedicalEntity(
                entity_type="diagnosis",
                value=diag.get("condition", ""),
            ))

        for vital_name, vital_val in data.get("vitals", {}).items():
            if vital_val:
                entities.append(MedicalEntity(
                    entity_type="vital",
                    value=f"{vital_name}: {vital_val}",
                ))

        for med in data.get("medications", []):
            entities.append(MedicalEntity(
                entity_type="medication",
                value=med.get("name", ""),
            ))

        for lab in data.get("lab_results", []):
            entities.append(MedicalEntity(
                entity_type="lab_result",
                value=f"{lab.get('test_name','')}: {lab.get('value','')} {lab.get('unit','')}",
            ))

        return entities


# ─────────────────────────────────────────────────────────────────────────────
# 2b.  ALTERNATIVE NER MODELS — Comparison & Usage
# ─────────────────────────────────────────────────────────────────────────────
"""
┌─────────────────────────────┬──────────────────────────────────────────────────┬─────────────┬────────────┐
│ Model                       │ Best For                                         │ Size        │ Speed      │
├─────────────────────────────┼──────────────────────────────────────────────────┼─────────────┼────────────┤
│ MedGemma-27B-text-it ✅     │ Full clinical NER, FHIR, EHR understanding       │ ~27B params │ Slow/GPU   │
│ MedGemma-4B-it              │ Lightweight dev/prod, good accuracy              │ ~4B params  │ Medium     │
│ scispaCy + UMLS             │ Fast token-level NER, UMLS concept linking       │ ~150MB      │ Very Fast  │
│ Bio_ClinicalBERT (NER)      │ Fine-tuned NER on i2b2 clinical notes            │ ~110MB      │ Fast       │
│ medalpaca-13b               │ General medical Q&A + extraction                 │ ~13B params │ Medium     │
│ BioMedLM                    │ Biomedical literature text                       │ ~2.7B       │ Fast       │
│ Claude API (claude-opus-4-6)│ Best accuracy, no local GPU required             │ API         │ Fast       │
└─────────────────────────────┴──────────────────────────────────────────────────┴─────────────┴────────────┘

Recommendation:
  - Production + GPU available   → MedGemma-27B-text-it
  - Low resource / quick prototyping → MedGemma-4B-it
  - Token-level speed critical   → scispaCy en_core_sci_lg
  - No GPU / cloud               → Claude API
"""

class ScispaCyNER:
    """Fast token-level NER using scispaCy + UMLS linker (no GPU needed)."""

    def __init__(self):
        import spacy
        import scispacy                          # noqa
        from scispacy.linking import EntityLinker  # noqa

        self.nlp = spacy.load("en_core_sci_lg")
        self.nlp.add_pipe(
            "scispacy_linker",
            config={"resolve_abbreviations": True, "linker_name": "umls"}
        )

    def extract(self, turns: List[DialogueTurn]) -> List[MedicalEntity]:
        # Use only patient + clinician observation text
        text = " ".join(t.text for t in turns if t.speaker in ("PATIENT", "CLINICIAN"))
        doc = self.nlp(text)
        entities = []
        for ent in doc.ents:
            entity_type = self._map_label(ent.label_)
            entities.append(MedicalEntity(entity_type=entity_type, value=ent.text))
        return entities

    def _map_label(self, label: str) -> str:
        mapping = {
            "DISEASE": "diagnosis",
            "CHEMICAL": "medication",
            "SIGN_SYMPTOM": "symptom",
            "DIAGNOSTIC_PROCEDURE": "procedure",
            "BIOLOGICAL_FUNCTION": "vital",
        }
        return mapping.get(label, label.lower())


class BioClinicalBERTNER:
    """
    Token classification NER using urchade/gliner_mediumv2.1 (GLiNER)
    or samrawal/bert-base-uncased_clinical-ner.
    GLiNER allows zero-shot NER with custom entity types — ideal for custom schemas.
    """

    def __init__(self):
        from gliner import GLiNER
        self.model = GLiNER.from_pretrained("urchade/gliner_mediumv2.1")
        self.labels = [
            "symptom", "diagnosis", "vital sign", "medication",
            "lab result", "procedure", "allergy", "medical history"
        ]

    def extract(self, turns: List[DialogueTurn]) -> List[MedicalEntity]:
        text = " ".join(t.text for t in turns)
        entities_raw = self.model.predict_entities(text, self.labels, threshold=0.5)
        entities = []
        for ent in entities_raw:
            entities.append(MedicalEntity(
                entity_type=ent["label"].replace(" ", "_"),
                value=ent["text"],
            ))
        return entities


# ─────────────────────────────────────────────────────────────────────────────
# 3.  ICD CODE MAPPER — uses YOUR CSV dataset
#     Two matching strategies:
#     A) TF-IDF + cosine similarity  → fast, no GPU
#     B) Semantic embedding (MiniLM) → best accuracy, small model
# ─────────────────────────────────────────────────────────────────────────────

class ICDMapper:
    """
    Maps extracted medical entities to ICD-9/10 codes using your dataset.
    
    Your CSV columns: icd_code, icd_title
    The mapper detects ICD version from the code format:
      - ICD-10: alphanumeric, e.g. R531, G20, S0181XA
      - ICD-9:  numeric only, e.g. 780.79
    """

    def __init__(self, icd_csv_path: str, use_semantic: bool = True, top_k: int = 3):
        self.top_k = top_k
        self.use_semantic = use_semantic
        self.df = self._load_csv(icd_csv_path)
        self._build_index()

    def _load_csv(self, path: str) -> pd.DataFrame:
        df = pd.read_csv(path, dtype=str)
        # Normalize column names
        df.columns = [c.strip().lower().replace(" ", "_") for c in df.columns]
        assert "icd_code" in df.columns and "icd_title" in df.columns, \
            "CSV must have columns: icd_code, icd_title"
        df = df.dropna(subset=["icd_code", "icd_title"])
        df["version"] = df["icd_code"].apply(self._detect_version)
        print(f"[ICDMapper] Loaded {len(df)} ICD codes "
              f"({(df.version=='ICD-10').sum()} ICD-10, {(df.version=='ICD-9').sum()} ICD-9)")
        return df

    @staticmethod
    def _detect_version(code: str) -> str:
        """ICD-10 codes start with a letter; ICD-9 are purely numeric."""
        return "ICD-10" if re.match(r"^[A-Z]", str(code)) else "ICD-9"

    def _build_index(self):
        titles = self.df["icd_title"].tolist()

        if self.use_semantic:
            print("[ICDMapper] Building semantic index with all-MiniLM-L6-v2...")
            self.embedder = SentenceTransformer("sentence-transformers/all-MiniLM-L6-v2")
            self.title_embeddings = self.embedder.encode(
                titles, convert_to_tensor=True, show_progress_bar=True
            )
        else:
            from sklearn.feature_extraction.text import TfidfVectorizer
            self.vectorizer = TfidfVectorizer(ngram_range=(1, 2))
            self.tfidf_matrix = self.vectorizer.fit_transform(titles)

    def map_entity(self, entity_text: str, icd_version: str = "both") -> List[ICDMatch]:
        """Map a single entity string to top-k ICD codes."""
        if self.use_semantic:
            query_emb = self.embedder.encode(entity_text, convert_to_tensor=True)
            scores = util.cos_sim(query_emb, self.title_embeddings)[0]
            top_indices = scores.argsort(descending=True)[:self.top_k].tolist()
            top_scores = scores[top_indices].tolist()
        else:
            query_vec = self.vectorizer.transform([entity_text])
            from sklearn.metrics.pairwise import cosine_similarity
            sims = cosine_similarity(query_vec, self.tfidf_matrix)[0]
            top_indices = sims.argsort()[::-1][:self.top_k].tolist()
            top_scores = sims[top_indices].tolist()

        results = []
        for idx, score in zip(top_indices, top_scores):
            row = self.df.iloc[idx]
            # Version filter
            if icd_version != "both" and row["version"] != icd_version:
                continue
            results.append(ICDMatch(
                icd_code=row["icd_code"],
                icd_title=row["icd_title"],
                matched_entity=entity_text,
                similarity_score=round(float(score), 4),
                version=row["version"],
            ))
        return results

    def map_entities(
        self,
        entities: List[MedicalEntity],
        icd_version: str = "both",
        min_score: float = 0.30,
    ) -> List[ICDMatch]:
        """Map all extracted entities; filter by min similarity score."""
        # Only map clinically meaningful entity types
        mappable_types = {"symptom", "diagnosis", "lab_result", "vital"}
        all_matches = []

        for ent in entities:
            if ent.entity_type not in mappable_types:
                continue
            matches = self.map_entity(ent.value, icd_version=icd_version)
            all_matches.extend([m for m in matches if m.similarity_score >= min_score])

        # Deduplicate by ICD code, keeping highest score
        seen = {}
        for m in all_matches:
            if m.icd_code not in seen or m.similarity_score > seen[m.icd_code].similarity_score:
                seen[m.icd_code] = m

        return sorted(seen.values(), key=lambda x: x.similarity_score, reverse=True)


# ─────────────────────────────────────────────────────────────────────────────
# 4.  FULL PIPELINE
# ─────────────────────────────────────────────────────────────────────────────

class SmartEMRPipeline:
    """
    End-to-end pipeline:
      transcript (str) → EMROutput

    Choose NER backend:
      "medgemma-27b"  → best accuracy, local GPU ~55GB VRAM
      "medgemma-4b"   → lighter, local GPU ~8GB VRAM
      "scispacy"      → CPU fast, no GPU
      "gliner"        → zero-shot NER, CPU/GPU
    """

    def __init__(
        self,
        icd_csv_path: str,
        ner_backend: str = "medgemma-4b",
        use_semantic_icd: bool = True,
    ):
        print(f"\n[Pipeline] Initializing | NER: {ner_backend}")

        # Stage 1: Dialogue classifier (always loaded, lightweight)
        self.classifier = DialogueClassifier()

        # Stage 2: NER backend
        if ner_backend == "medgemma-27b":
            self.ner = MedGemmaNER(model_size="27b")
        elif ner_backend == "medgemma-4b":
            self.ner = MedGemmaNER(model_size="4b")
        elif ner_backend == "scispacy":
            self.ner = ScispaCyNER()
        elif ner_backend == "gliner":
            self.ner = BioClinicalBERTNER()
        else:
            raise ValueError(f"Unknown NER backend: {ner_backend}")

        # Stage 3: ICD mapper
        self.icd_mapper = ICDMapper(icd_csv_path, use_semantic=use_semantic_icd)

    def run(
        self,
        transcript: str,
        icd_version: str = "both",
        min_icd_score: float = 0.35,
    ) -> EMROutput:
        output = EMROutput()

        # ── Stage 1: Classify dialogue ──────────────────────────────────────
        print("\n[Stage 1] Classifying dialogue turns...")
        output.classified_dialogue = self.classifier.classify_transcript(transcript)
        self._print_dialogue(output.classified_dialogue)

        # ── Stage 2: Extract medical entities ───────────────────────────────
        print("\n[Stage 2] Extracting medical entities (NER)...")
        output.entities = self.ner.extract(output.classified_dialogue)
        self._print_entities(output.entities)

        # ── Stage 3: ICD mapping ─────────────────────────────────────────────
        print("\n[Stage 3] Mapping to ICD codes...")
        output.icd_matches = self.icd_mapper.map_entities(
            output.entities,
            icd_version=icd_version,
            min_score=min_icd_score,
        )
        self._print_icd(output.icd_matches)

        return output

    def export_json(self, output: EMROutput, path: str = "emr_output.json"):
        with open(path, "w") as f:
            json.dump({
                "dialogue": [asdict(t) for t in output.classified_dialogue],
                "entities": [asdict(e) for e in output.entities],
                "icd_matches": [asdict(m) for m in output.icd_matches],
            }, f, indent=2)
        print(f"\n[Pipeline] Saved structured EMR → {path}")

    # ── Pretty print helpers ──────────────────────────────────────────────────
    @staticmethod
    def _print_dialogue(turns: List[DialogueTurn]):
        print("─" * 60)
        for t in turns:
            tag = "🩺" if t.speaker == "CLINICIAN" else "🧑" if t.speaker == "PATIENT" else "❓"
            print(f"  {tag} [{t.speaker}] (conf:{t.confidence:.2f}) {t.text}")
        print("─" * 60)

    @staticmethod
    def _print_entities(entities: List[MedicalEntity]):
        print("─" * 60)
        for e in entities:
            extra = " | ".join(filter(None, [e.duration, e.severity, e.location]))
            print(f"  [{e.entity_type.upper():15s}] {e.value}" + (f" ({extra})" if extra else ""))
        print("─" * 60)

    @staticmethod
    def _print_icd(matches: List[ICDMatch]):
        print("─" * 60)
        for m in matches:
            print(f"  [{m.version}] {m.icd_code:<12} {m.icd_title:<45} "
                  f"score:{m.similarity_score:.3f}  ← '{m.matched_entity}'")
        print("─" * 60)


# ─────────────────────────────────────────────────────────────────────────────
# 5.  DEMO — Run with a sample transcript
# ─────────────────────────────────────────────────────────────────────────────

SAMPLE_TRANSCRIPT = """
Doctor: Good morning. What brings you in today?
Patient: Good morning, Doctor. I've been having this really bad headache for about three days now.
Doctor: I see. Can you describe the pain? Is it on one side or both sides?
Patient: Mostly on the left side, near my temple. It's like a throbbing kind of pain.
Doctor: On a scale of 1 to 10, how severe would you say it is?
Patient: I'd say around a 7. It's pretty debilitating.
Doctor: Any nausea or vomiting associated with the headache?
Patient: Yes, I felt nauseous yesterday morning and actually vomited once.
Doctor: Any sensitivity to light or sound?
Patient: Yes, both actually. I've been staying in a dark room mostly.
Doctor: Do you have any history of migraines?
Patient: My mother has migraines, but I've never been diagnosed with them.
Doctor: Let me check your blood pressure. It's 138 over 88 — slightly elevated.
Doctor: Your temperature is 98.6, heart rate 82 beats per minute.
Patient: Is that concerning, doctor?
Doctor: Slightly elevated BP, but let's not worry yet. Are you on any medications currently?
Patient: Just ibuprofen 400mg for the pain, but it barely helps.
Doctor: Any known allergies?
Patient: I'm allergic to penicillin — I get a rash.
Doctor: Based on your symptoms — unilateral throbbing headache, nausea, photophobia, phonophobia — this looks like a migraine episode.
Patient: So what do we do now?
Doctor: I'll prescribe sumatriptan 50mg. Take it at the onset of headache. I'd also recommend avoiding known triggers.
"""


def demo():
    # ── Create a small sample ICD CSV for testing ────────────────────────────
    sample_icd_data = [
        ["icd_code", "icd_title"],
        ["R531",    "Weakness"],
        ["G20",     "Parkinson's disease"],
        ["R4182",   "Altered mental status, unspecified"],
        ["F0390",   "Unspecified dementia without behavioral disturbance"],
        ["S0181XD", "Laceration w/o foreign body of oth part of head, subs encntr"],
        ["G43909",  "Migraine, unspecified, not intractable, without status migrainosus"],
        ["R51",     "Headache"],
        ["R110",    "Nausea"],
        ["R112",    "Nausea with vomiting"],
        ["H531",    "Subjective visual disturbances (photophobia)"],
        ["I10",     "Essential (primary) hypertension"],
        ["Z8819",   "Allergy status to other antibiotic agents status"],
        ["G4309",   "Migraine, unspecified"],
        ["R509",    "Fever, unspecified"],
        ["R000",    "Tachycardia, unspecified"],
    ]

    icd_path = "/tmp/sample_icd.csv"
    with open(icd_path, "w", newline="") as f:
        writer = csv.writer(f)
        writer.writerows(sample_icd_data)

    print("=" * 70)
    print("  Smart EMR Pipeline — Demo Run")
    print("=" * 70)

    # ── Stage 1 only (no GPU needed for dialogue classification) ─────────────
    print("\n--- STAGE 1: Dialogue Classification (Rule-based, no model needed) ---")
    classifier = DialogueClassifier()
    turns = classifier.classify_transcript(SAMPLE_TRANSCRIPT)
    df = classifier.to_dataframe(turns)
    print(df.to_string(index=False))

    # ── ICD Mapping demo (semantic, no GPU needed for MiniLM) ───────────────
    print("\n--- STAGE 3: ICD Mapping Demo (Semantic Similarity) ---")
    mapper = ICDMapper(icd_path, use_semantic=True, top_k=3)

    test_entities = [
        MedicalEntity(entity_type="symptom", value="throbbing headache left side"),
        MedicalEntity(entity_type="symptom", value="nausea and vomiting"),
        MedicalEntity(entity_type="diagnosis", value="migraine episode"),
        MedicalEntity(entity_type="vital", value="blood pressure 138/88"),
        MedicalEntity(entity_type="symptom", value="sensitivity to light"),
    ]

    matches = mapper.map_entities(test_entities, min_score=0.25)
    print(f"\n{'ICD Code':<12} {'ICD Title':<50} {'Score':<8} {'Matched From'}")
    print("-" * 100)
    for m in matches:
        print(f"{m.icd_code:<12} {m.icd_title:<50} {m.similarity_score:<8.4f} {m.matched_entity}")

    print("\n✅ Demo complete.")
    print("\nTo run the FULL pipeline with MedGemma NER:")
    print("""
    pipeline = SmartEMRPipeline(
        icd_csv_path="your_icd_dataset.csv",
        ner_backend="medgemma-4b",     # or "medgemma-27b", "scispacy", "gliner"
        use_semantic_icd=True,
    )
    result = pipeline.run(YOUR_TRANSCRIPT)
    pipeline.export_json(result, "output.json")
    """)


if __name__ == "__main__":
    demo()

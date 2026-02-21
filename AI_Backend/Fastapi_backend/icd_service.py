"""
ICD Code Service
================
Provides:
  1. Fast fuzzy lookup of ICD-9 and ICD-10 codes from CSV datasets
  2. Auto-mapping of extracted symptoms/diagnoses → ICD codes
  3. Symptom-based differential diagnosis suggestion (via MedGemma)

Uses token-overlap scoring with normalized medical terms — no external
ML dependencies required. Falls back to MedGemma for ambiguous mappings.
"""

import csv
import re
import logging
import json
from pathlib import Path
from dataclasses import dataclass, field
from typing import List, Dict, Optional, Tuple, Callable
from collections import defaultdict

logger = logging.getLogger(__name__)


# ─────────────────────────────────────────────────────────────────────────────
# DATA STRUCTURES
# ─────────────────────────────────────────────────────────────────────────────

@dataclass
class ICDEntry:
    code: str
    title: str
    version: int          # 9 or 10
    tokens: set = field(default_factory=set, repr=False)


@dataclass
class ICDMatch:
    code: str
    title: str
    version: int
    score: float          # 0.0 – 1.0


# ─────────────────────────────────────────────────────────────────────────────
# TEXT NORMALIZATION
# ─────────────────────────────────────────────────────────────────────────────

# Common medical abbreviations → full form for better matching
_MEDICAL_SYNONYMS = {
    "htn": "hypertension",
    "dm": "diabetes mellitus",
    "dm2": "type 2 diabetes mellitus",
    "dm1": "type 1 diabetes mellitus",
    "mi": "myocardial infarction",
    "cad": "coronary artery disease",
    "chf": "heart failure",
    "copd": "chronic obstructive pulmonary disease",
    "uti": "urinary tract infection",
    "afib": "atrial fibrillation",
    "sob": "shortness of breath",
    "ha": "headache",
    "cp": "chest pain",
    "n/v": "nausea vomiting",
    "lbp": "low back pain",
    "uri": "upper respiratory infection",
    "dvt": "deep vein thrombosis",
    "pe": "pulmonary embolism",
    "ckd": "chronic kidney disease",
    "esrd": "end stage renal disease",
    "gerd": "gastroesophageal reflux",
    "tia": "transient ischemic attack",
    "cva": "cerebrovascular accident stroke",
    "bph": "benign prostatic hyperplasia",
    "osa": "obstructive sleep apnea",
    "gout": "gout",
    "hld": "hyperlipidemia",
    "pna": "pneumonia",
}

_STOP_WORDS = {
    "a", "an", "the", "of", "in", "to", "for", "with", "without", "and",
    "or", "not", "no", "is", "are", "was", "were", "by", "on", "at",
    "as", "other", "unspecified", "unsp", "nec", "nos", "init", "subs",
    "initial", "encounter", "subsequent", "sequela", "due", "type",
    "specified", "part", "site", "oth", "w/o", "w", "from",
}

_TOKEN_RE = re.compile(r"[a-z0-9]+")


def _normalize(text: str) -> set:
    """Tokenize and normalize a medical term for matching."""
    text = text.lower().strip()
    # Expand abbreviations
    for abbr, expansion in _MEDICAL_SYNONYMS.items():
        if text == abbr or text.startswith(abbr + " "):
            text = text.replace(abbr, expansion, 1)
    tokens = set(_TOKEN_RE.findall(text))
    tokens -= _STOP_WORDS
    return tokens


# ─────────────────────────────────────────────────────────────────────────────
# ICD SERVICE
# ─────────────────────────────────────────────────────────────────────────────

class ICDService:
    """
    Loads ICD-9 and ICD-10 code databases from CSV files and provides
    fast fuzzy matching for medical condition → ICD code mapping.
    """

    def __init__(self):
        self._entries: List[ICDEntry] = []
        self._by_code: Dict[str, ICDEntry] = {}
        self._inverted: Dict[str, List[int]] = defaultdict(list)  # token → entry indices
        self.loaded = False

    def load(
        self,
        icd9_path: Optional[str] = None,
        icd10_path: Optional[str] = None,
    ):
        """Load ICD code databases from CSV files."""
        data_dir = Path(__file__).resolve().parent.parent  # AI_Backend/

        if icd9_path is None:
            icd9_path = str(data_dir / "unique_icd9_codes.csv")
        if icd10_path is None:
            icd10_path = str(data_dir / "unique_icd10_codes.csv")

        icd9_count = self._load_csv(icd9_path, version=9)
        icd10_count = self._load_csv(icd10_path, version=10)

        # Build inverted index for fast lookup
        self._build_index()

        self.loaded = True
        logger.info(
            f"ICD service loaded: {icd9_count} ICD-9 codes, "
            f"{icd10_count} ICD-10 codes, "
            f"{len(self._inverted)} unique tokens indexed"
        )

    def _load_csv(self, path: str, version: int) -> int:
        """Load a single CSV file (icd_code, icd_title)."""
        count = 0
        try:
            with open(path, "r", encoding="utf-8") as f:
                reader = csv.DictReader(f)
                for row in reader:
                    code = row.get("icd_code", "").strip()
                    title = row.get("icd_title", "").strip()
                    if not code or not title:
                        continue
                    tokens = _normalize(title)
                    entry = ICDEntry(code=code, title=title, version=version, tokens=tokens)
                    self._entries.append(entry)
                    self._by_code[code] = entry
                    count += 1
        except FileNotFoundError:
            logger.warning(f"ICD CSV not found: {path}")
        except Exception as e:
            logger.warning(f"Error loading ICD CSV {path}: {e}")
        return count

    def _build_index(self):
        """Build inverted index: token → list of entry indices."""
        self._inverted.clear()
        for idx, entry in enumerate(self._entries):
            for token in entry.tokens:
                self._inverted[token].append(idx)

    # ── LOOKUP ───────────────────────────────────────────────────────────────

    def lookup(
        self,
        query: str,
        top_k: int = 5,
        version: Optional[int] = 10,
        min_score: float = 0.3,
    ) -> List[ICDMatch]:
        """
        Find ICD codes matching a medical condition/symptom query.
        Uses token-overlap scoring with Jaccard-like similarity.
        
        Args:
            query: Natural language condition (e.g., "chest pain", "type 2 diabetes")
            top_k: Max results to return
            version: 9 or 10 (None = both)
            min_score: Minimum similarity score threshold
            
        Returns:
            Ranked list of ICDMatch objects
        """
        query_tokens = _normalize(query)
        if not query_tokens:
            return []

        # Score all candidate entries via inverted index
        scores: Dict[int, float] = defaultdict(float)
        for token in query_tokens:
            for idx in self._inverted.get(token, []):
                scores[idx] += 1.0

        # Compute normalized similarity
        results = []
        for idx, raw_score in scores.items():
            entry = self._entries[idx]
            if version is not None and entry.version != version:
                continue
            # Jaccard-like: intersection / union
            union_size = len(query_tokens | entry.tokens)
            if union_size == 0:
                continue
            sim = raw_score / union_size
            # Boost exact substring matches
            if query.lower().strip() in entry.title.lower():
                sim = max(sim, 0.85)
            elif entry.title.lower().startswith(query.lower().strip()):
                sim = max(sim, 0.80)
            if sim >= min_score:
                results.append(ICDMatch(
                    code=entry.code, title=entry.title,
                    version=entry.version, score=round(sim, 3),
                ))

        # Sort by score descending, then by code for consistency
        results.sort(key=lambda m: (-m.score, m.code))
        return results[:top_k]

    def get_by_code(self, code: str) -> Optional[ICDEntry]:
        """Direct lookup by ICD code."""
        return self._by_code.get(code)

    # ── ENTITY MAPPING ───────────────────────────────────────────────────────

    def map_entities(
        self,
        symptoms: List[dict],
        diagnoses: List[dict],
        version: int = 10,
    ) -> dict:
        """
        Auto-map extracted symptoms and diagnoses to ICD codes.
        
        Args:
            symptoms: List of symptom dicts with 'description' field
            diagnoses: List of diagnosis dicts with 'condition' field
            
        Returns:
            {
                "symptom_mappings": [{"description": ..., "icd_matches": [...]}],
                "diagnosis_mappings": [{"condition": ..., "icd_matches": [...]}],
            }
        """
        symptom_mappings = []
        for s in symptoms:
            desc = s.get("description", "")
            if not desc:
                continue
            matches = self.lookup(desc, top_k=3, version=version)
            symptom_mappings.append({
                "description": desc,
                "icd_matches": [
                    {"code": m.code, "title": m.title, "score": m.score}
                    for m in matches
                ],
            })

        diagnosis_mappings = []
        for d in diagnoses:
            condition = d.get("condition", "")
            if not condition:
                continue
            matches = self.lookup(condition, top_k=3, version=version)
            diagnosis_mappings.append({
                "condition": condition,
                "icd_matches": [
                    {"code": m.code, "title": m.title, "score": m.score}
                    for m in matches
                ],
            })

        return {
            "symptom_mappings": symptom_mappings,
            "diagnosis_mappings": diagnosis_mappings,
        }

    # ── DIFFERENTIAL DIAGNOSIS (MedGemma-assisted) ───────────────────────────

    def suggest_diagnoses(
        self,
        symptoms: List[dict],
        patient_info: dict,
        generate_fn: Callable,
        top_k: int = 5,
    ) -> List[dict]:
        """
        Generate differential diagnoses from symptoms using MedGemma,
        then map each suggestion to ICD-10 codes.
        
        Args:
            symptoms: Extracted symptom list
            patient_info: Dict with age, gender, social_history, etc.
            generate_fn: MedGemma generate function
            top_k: Max diagnoses to suggest
            
        Returns:
            List of diagnostic suggestions with ICD codes
        """
        # Build symptom summary for the prompt
        symptom_texts = []
        for s in symptoms:
            parts = [s.get("description", "")]
            if s.get("location"):
                parts.append(f"location: {s['location']}")
            if s.get("severity"):
                parts.append(f"severity: {s['severity']}")
            if s.get("duration"):
                parts.append(f"duration: {s['duration']}")
            if s.get("character"):
                parts.append(f"character: {s['character']}")
            if s.get("onset"):
                parts.append(f"onset: {s['onset']}")
            symptom_texts.append(", ".join(parts))

        symptom_summary = "\n".join(f"- {st}" for st in symptom_texts)

        # Patient context
        age = patient_info.get("age", "unknown")
        gender = patient_info.get("gender", "unknown")
        social = patient_info.get("social_history", {})
        smoking = social.get("smoking", "unknown") if isinstance(social, dict) else "unknown"
        family_hx = patient_info.get("family_history", [])
        family_text = ", ".join(
            f"{fh.get('relation', '?')}: {fh.get('condition', '?')}"
            for fh in family_hx if isinstance(fh, dict)
        ) or "none reported"

        prompt = f"""You are a clinical diagnostic assistant. Based on the patient presentation below, generate a ranked differential diagnosis list.

PATIENT:
- Age: {age}, Gender: {gender}
- Smoking: {smoking}
- Family history: {family_text}

SYMPTOMS:
{symptom_summary}

Generate the top {top_k} most likely differential diagnoses, ranked by probability.
For each diagnosis, provide:
1. The condition name (use standard medical terminology)
2. Likelihood: high/moderate/low
3. Brief reasoning (1 sentence)

Return ONLY a JSON array:
[{{"condition": "...", "likelihood": "high|moderate|low", "reasoning": "..."}}]

JSON:"""

        try:
            raw = generate_fn(prompt, max_new_tokens=800)
            suggestions = self._parse_suggestions(raw)
        except Exception as e:
            logger.warning(f"MedGemma differential diagnosis failed: {e}")
            suggestions = []

        # Map each suggestion to ICD codes
        results = []
        for s in suggestions[:top_k]:
            condition = s.get("condition", "")
            icd_matches = self.lookup(condition, top_k=3, version=10)

            results.append({
                "condition": condition,
                "likelihood": s.get("likelihood", "unknown"),
                "reasoning": s.get("reasoning", ""),
                "icd10_codes": [
                    {"code": m.code, "title": m.title, "score": m.score}
                    for m in icd_matches
                ],
            })

        return results

    @staticmethod
    def _parse_suggestions(raw: str) -> list:
        """Parse MedGemma's differential diagnosis JSON output."""
        raw = re.sub(r"```(?:json)?", "", raw).strip().rstrip("`")
        try:
            result = json.loads(raw)
            if isinstance(result, list):
                return result
        except Exception:
            pass
        match = re.search(r"\[.*\]", raw, re.DOTALL)
        if match:
            try:
                result = json.loads(match.group())
                if isinstance(result, list):
                    return result
            except Exception:
                pass
        return []

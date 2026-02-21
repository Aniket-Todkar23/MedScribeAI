"""
Hybrid Dialogue Classifier
===========================
Classifies turns still marked UNKNOWN (from text-only Whisper fallback)
using a two-pass approach:

  Pass 1: Heuristic NLP  (fast, no model)
  Pass 2: MedGemma LLM   (for low-confidence turns only)
"""

import re
import json
import logging
import torch
from typing import List, Tuple, Optional

from schemas import DialogueTurn, SpeakerRole

logger = logging.getLogger(__name__)


# ─────────────────────────────────────────────────────────────────────────────
# HEURISTIC SCORER
# ─────────────────────────────────────────────────────────────────────────────

class HeuristicScorer:
    """
    Scores each sentence independently on clinician vs patient signals.
    Returns (role, confidence 0-1).
    """

    _C_QUESTION = re.compile(r"\?\s*$")
    _C_ACTIONS  = re.compile(
        r"\b(prescri(be|bed|bing)|diagnos(e|ed|ing|is)|referr(ed|ing|al)|"
        r"order(ed|ing)|recommend(ed|ing)|examin(e|ed|ing)|assess(ed|ing)|"
        r"let me (check|take|have|examine)|i('ll| will) (prescribe|order|refer|run|check)|"
        r"blood pressure is|temperature is|heart rate is|"
        r"you (should|need to|must)|we('ll| will)|based on (your|the))\b",
        re.IGNORECASE,
    )
    _C_QUESTIONS_PHRASES = re.compile(
        r"\b(how long|since when|when did|how (severe|bad|often|would you|much)|"
        r"do you (have|feel|experience|take|notice|suffer|find|smoke|drink|use|live)|"
        r"are you (taking|allergic|feeling|experiencing|on any)|"
        r"have you (had|noticed|been|taken|used)|"
        r"any (history|fever|nausea|vomiting|pain|swelling|allerg|prior|recent|trauma|rash|changes|immuniz)|"
        r"where (exactly|does it|is the|do you)|"
        r"does it (radiate|spread|worsen|improve)|"
        r"on a scale|can you describe|tell me about|could you tell me|"
        r"any (other )?complaints|what brings you|what brought you|"
        r"has (anything|anybody|anyone)|sounds like|that's great)\b",
        re.IGNORECASE,
    )
    _P_SYMPTOMS = re.compile(
        r"\b(i (feel|have|am|was|get|got|notice|think|guess|thought|tried|wanted|'ve been|'ve had)|"
        r"i'm (just|having|going|feeling|an?|not|a )|"
        r"i('d|'ll) (say|like|describe)|"
        r"i('ve| have) (had|been|noticed|felt|taken|started)|"
        r"i (don't|didn't|can't|couldn't|haven't|wasn't|wouldn't)|"
        r"it (hurts|started|feels|is|gets|began|'s been|'s getting|'s becoming)|"
        r"my (chest|head|stomach|leg|arm|back|neck|throat|eye|ear|knee|shoulder|pain|father|mother|dad|mom|family|brother|sister|wife|husband)|"
        r"the (pain|ache|discomfort|swelling|redness|bleeding)|"
        r"since (last|yesterday|this morning|a few|\d)|"
        r"for (about|around|the past|\d)|i can't|sort of|kind of|a little|not that much|"
        r"they're all up to date|i (do|did|live|smoke|run|try|eat)|i would say)\b",
        re.IGNORECASE,
    )
    # First-person sentence opener — strong patient indicator in medical interviews
    _P_FIRST_PERSON = re.compile(
        r"^(i'm |i'd |i've |i'll |i was |i guess |i think |i would |i don't |i didn't |i can't |i live |i do[.\s]|i smoke|i run |i try |i eat |actually[,.]? (yes|my))",
        re.IGNORECASE,
    )
    _P_SHORT_ANSWERS = re.compile(
        r"^(yes|no|yeah|nope|not really|i think so|"
        r"maybe|kind of|sort of|"
        r"about \d|around \d|since \d|for \d)",
        re.IGNORECASE,
    )
    # Bare acknowledgments — ambiguous without context (could be either speaker)
    _BARE_ACKNOWLEDGMENT = re.compile(
        r"^(ok|okay|sure|alright|all right|right|excellent|great|i see)\.?$",
        re.IGNORECASE,
    )

    def score(self, text: str) -> Tuple[SpeakerRole, float]:
        text_stripped = text.strip()
        c, p = 0.0, 0.0

        # Bare acknowledgments are ambiguous — return UNKNOWN with low confidence
        # so the context-aware pass or LLM can resolve them
        if self._BARE_ACKNOWLEDGMENT.match(text_stripped):
            return SpeakerRole.UNKNOWN, 0.0

        if self._C_QUESTION.search(text_stripped):   c += 2.0
        c += len(self._C_ACTIONS.findall(text_stripped))          * 3.0
        c += len(self._C_QUESTIONS_PHRASES.findall(text_stripped)) * 2.5
        p += len(self._P_SYMPTOMS.findall(text_stripped))          * 2.5
        if self._P_FIRST_PERSON.match(text_stripped):     p += 3.0
        if self._P_SHORT_ANSWERS.match(text_stripped):    p += 3.0
        if len(text_stripped.split()) < 5 and not self._C_QUESTION.search(text_stripped): p += 1.5
        if re.search(r"\byou\b", text_stripped, re.I) and not self._C_QUESTION.search(text_stripped): c += 1.0

        total = c + p
        if total == 0:
            return SpeakerRole.UNKNOWN, 0.0

        if c > p:
            return SpeakerRole.CLINICIAN, round(min(0.50 + 0.10 * (c - p), 0.93), 3)
        return SpeakerRole.PATIENT, round(min(0.50 + 0.10 * (p - c), 0.93), 3)


# ─────────────────────────────────────────────────────────────────────────────
# LLM CLASSIFIER  (MedGemma — passed in from main app state)
# ─────────────────────────────────────────────────────────────────────────────

LLM_BATCH_PROMPT = """You are a clinical NLP specialist. Below is a segment of a medical conversation between one clinician and one patient. Turns marked with "???" need classification. Other turns are already classified.

Rules:
- CLINICIAN: asks questions, gives assessments/instructions, prescribes, mentions vitals, uses medical jargon
- PATIENT: describes symptoms, answers questions, uses "I feel/have/noticed/since...", gives short yes/no answers
- "OK" / "Alright" after a patient's answer = CLINICIAN acknowledging before their next question
- "OK" / "Sure" before answering a question = PATIENT
- Medical conversations naturally alternate between speakers

CONVERSATION SEGMENT:
{turns_text}

Classify ONLY the "???" turns. Return ONLY a JSON array, nothing else:
[{{"index": 0, "role": "CLINICIAN", "confidence": 0.92}}, ...]"""


class LLMDialogueClassifier:
    """Uses MedGemma to classify low-confidence turns.
    Supports either local model/tokenizer or a remote generate_fn callable.
    Chunks conversation into manageable batches to fit model context window.
    """

    CHUNK_SIZE = 40  # turns per LLM call (with context overlap)
    CONTEXT_OVERLAP = 5  # extra context turns on each side

    def __init__(self, model=None, tokenizer=None, generate_fn=None, confidence_threshold: float = 0.65):
        self.model = model
        self.tokenizer = tokenizer
        self._generate_fn = generate_fn
        self.threshold = confidence_threshold

    def classify_uncertain(self, turns: List[DialogueTurn]) -> List[DialogueTurn]:
        """Re-classify all turns below confidence threshold using chunked LLM calls."""
        uncertain_indices = set(
            i for i, t in enumerate(turns) if t.confidence < self.threshold
        )

        if not uncertain_indices:
            return turns

        logger.info(f"LLM reclassifying {len(uncertain_indices)} uncertain turns...")

        # Build chunks of turns, each containing ~CHUNK_SIZE turns with context
        chunks = self._build_chunks(turns, uncertain_indices)
        logger.info(f"Split into {len(chunks)} chunks for LLM classification")

        result = list(turns)
        total_classified = 0

        for chunk_idx, (chunk_turns, chunk_uncertain) in enumerate(chunks):
            if not chunk_uncertain:
                continue

            # Build prompt for this chunk
            lines = []
            for t in chunk_turns:
                if t.index in chunk_uncertain:
                    lines.append(f"[{t.index}] ??? : {t.text}")
                else:
                    lines.append(f"[{t.index}] {t.speaker.value}: {t.text}")
            turns_text = "\n".join(lines)
            prompt = LLM_BATCH_PROMPT.format(turns_text=turns_text)

            try:
                raw = self._call(prompt)
                logger.debug(f"LLM chunk {chunk_idx} raw response: {raw[:500]}")
                classifications = self._parse(raw)

                cls_map = {item["index"]: item for item in classifications if "index" in item}

                for idx in chunk_uncertain:
                    item = cls_map.get(idx)
                    if not item:
                        continue
                    role_str = item.get("role", "UNKNOWN").upper()
                    try:
                        role = SpeakerRole[role_str]
                    except KeyError:
                        role = SpeakerRole.UNKNOWN
                    result[idx] = result[idx].model_copy(update={
                        "speaker": role,
                        "confidence": float(item.get("confidence", 0.70)),
                        "method": "llm_reclassified",
                    })
                    total_classified += 1

            except Exception as e:
                logger.warning(f"LLM chunk {chunk_idx} failed: {e}")

        logger.info(f"LLM classified {total_classified}/{len(uncertain_indices)} uncertain turns")
        return result

    def _build_chunks(
        self, turns: List[DialogueTurn], uncertain_indices: set
    ) -> List[Tuple[List[DialogueTurn], set]]:
        """Split turns into overlapping chunks, each containing some uncertain turns."""
        sorted_uncertain = sorted(uncertain_indices)
        chunks = []

        i = 0
        while i < len(sorted_uncertain):
            # Take a batch of uncertain indices
            batch_uncertain = set()
            batch_end_idx = sorted_uncertain[i]
            for j in range(i, min(i + self.CHUNK_SIZE, len(sorted_uncertain))):
                batch_uncertain.add(sorted_uncertain[j])
                batch_end_idx = sorted_uncertain[j]

            # Determine window with context overlap
            first_uncertain = sorted_uncertain[i]
            start = max(0, first_uncertain - self.CONTEXT_OVERLAP)
            end = min(len(turns), batch_end_idx + self.CONTEXT_OVERLAP + 1)

            chunk_turns = turns[start:end]
            chunks.append((chunk_turns, batch_uncertain))

            i += len(batch_uncertain)

        return chunks

    def _call(self, prompt: str) -> str:
        # Use remote generate function if available (Modal endpoint)
        if self._generate_fn:
            return self._generate_fn(prompt)

        # Fallback to local model
        messages = [{"role": "user", "content": prompt}]
        inputs = self.tokenizer.apply_chat_template(
            messages, tokenize=True, add_generation_prompt=True, return_tensors="pt"
        ).to(self.model.device)

        with torch.no_grad():
            out = self.model.generate(
                inputs,
                max_new_tokens=512,
                temperature=0.05,
                do_sample=True,
                pad_token_id=self.tokenizer.eos_token_id,
            )
        return self.tokenizer.decode(out[0][inputs.shape[1]:], skip_special_tokens=True).strip()

    @staticmethod
    def _parse(raw: str) -> list:
        raw = re.sub(r"```(?:json)?", "", raw).strip().rstrip("`")
        # Try full JSON array first
        try:
            result = json.loads(raw)
            if isinstance(result, list):
                return result
        except Exception:
            pass
        
        # Try extracting [...] from the response
        match = re.search(r"\[.*\]", raw, re.DOTALL)
        if match:
            try:
                result = json.loads(match.group())
                if isinstance(result, list):
                    return result
            except Exception:
                pass
        
        # Line-by-line fallback: extract individual {index:..., role:...} objects
        items = []
        for obj_match in re.finditer(r'\{[^{}]*"index"\s*:\s*(\d+)[^{}]*"role"\s*:\s*"(\w+)"[^{}]*\}', raw):
            try:
                obj = json.loads(obj_match.group())
                items.append(obj)
            except Exception:
                # Manual extraction from regex groups
                idx = int(obj_match.group(1))
                role = obj_match.group(2)
                conf_m = re.search(r'"confidence"\s*:\s*([\d.]+)', obj_match.group())
                conf = float(conf_m.group(1)) if conf_m else 0.70
                items.append({"index": idx, "role": role, "confidence": conf})
        
        # Also try role-first format: {"role": "...", "index": N}
        if not items:
            for obj_match in re.finditer(r'\{[^{}]*"role"\s*:\s*"(\w+)"[^{}]*"index"\s*:\s*(\d+)[^{}]*\}', raw):
                idx = int(obj_match.group(2))
                role = obj_match.group(1)
                conf_m = re.search(r'"confidence"\s*:\s*([\d.]+)', obj_match.group())
                conf = float(conf_m.group(1)) if conf_m else 0.70
                items.append({"index": idx, "role": role, "confidence": conf})
        
        if items:
            logger.debug(f"Parsed {len(items)} items via line-by-line fallback")
        
        return items


# ─────────────────────────────────────────────────────────────────────────────
# HYBRID CLASSIFIER  (main entry point)
# ─────────────────────────────────────────────────────────────────────────────

class HybridClassifier:
    """
    Two-pass classifier for unlabeled/uncertain turns:
      1. Heuristic scoring of all turns
      2. MedGemma LLM on low-confidence turns only
      3. Alternation smoothing

    If diarization already assigned roles (confidence ≥ 0.8), those are preserved.
    """

    def __init__(
        self,
        model=None,
        tokenizer=None,
        generate_fn=None,
        confidence_threshold: float = 0.65,
    ):
        self.heuristic = HeuristicScorer()
        # Use generate_fn (for Modal/remote), or local model/tokenizer, or skip LLM pass
        if generate_fn:
            self.llm = LLMDialogueClassifier(
                generate_fn=generate_fn, confidence_threshold=confidence_threshold
            )
        elif model and tokenizer:
            self.llm = LLMDialogueClassifier(
                model=model, tokenizer=tokenizer, confidence_threshold=confidence_threshold
            )
        else:
            self.llm = None
        self.threshold = confidence_threshold

    def classify(self, turns: List[DialogueTurn]) -> List[DialogueTurn]:
        """
        Classify/re-classify all turns.
        Preserves turns already classified with high confidence by diarization.
        Pipeline: heuristic → LLM → context-aware acknowledgements → smoothing → merge
        """
        result = []

        for t in turns:
            # High-confidence diarization result — keep as-is
            if t.confidence >= 0.80 and t.speaker != SpeakerRole.UNKNOWN:
                result.append(t)
                continue

            # Apply heuristic
            role, conf = self.heuristic.score(t.text)
            result.append(t.model_copy(update={
                "speaker": role if role != SpeakerRole.UNKNOWN else t.speaker,
                "confidence": max(conf, t.confidence),
                "method": "heuristic" if role != SpeakerRole.UNKNOWN else t.method,
            }))

        # LLM pass on remaining uncertain turns (chunked)
        if self.llm:
            result = self.llm.classify_uncertain(result)

        # Context-aware pass: resolve remaining UNKNOWN/low-confidence
        # acknowledgments ("OK", "Sure", etc.) based on medical interview patterns
        result = self._resolve_acknowledgments(result)

        # Fill remaining unknowns by alternation (D→P→D→P principle)
        result = self._fill_unknowns_by_alternation(result)

        # Merge consecutive same-speaker turns for natural conversation flow
        result = self._merge_consecutive(result)

        return result

    @staticmethod
    def _resolve_acknowledgments(turns: List[DialogueTurn]) -> List[DialogueTurn]:
        """
        Resolve bare acknowledgments (OK, Sure, etc.) using medical interview patterns.
        
        In clinical interviews, standalone "OK"/"Alright"/"Excellent"/"I see" are
        almost exclusively CLINICIAN transitions (acknowledging → next question).
        "Sure" before a patient answer can be PATIENT ("Sure, I smoke").
        
        Strategy:
        - Clinician-typical acks (OK, Alright, Excellent, I see, Great) → CLINICIAN
        - Ambiguous acks (Sure, Right) → look at next turn content
        """
        # Definitely clinician acknowledgments in medical interviews
        _CLIN_ACK = re.compile(
            r"^(ok|okay|alright|all right|excellent|great|i see)\.?$",
            re.IGNORECASE,
        )
        # Could be patient opener: "Sure, I live alone" / "Right"
        _AMBIG_ACK = re.compile(
            r"^(sure|right)\.?$",
            re.IGNORECASE,
        )
        
        n = len(turns)
        for i in range(n):
            t = turns[i]
            # Only resolve UNKNOWN or very low confidence bare acknowledgments
            if not (t.speaker == SpeakerRole.UNKNOWN or t.confidence < 0.30):
                continue
            text = t.text.strip()

            if _CLIN_ACK.match(text):
                # These are almost always clinician in medical interviews
                turns[i] = t.model_copy(update={
                    "speaker": SpeakerRole.CLINICIAN,
                    "confidence": 0.60,
                    "method": "context_acknowledgment",
                })
            elif _AMBIG_ACK.match(text):
                # "Sure" / "Right" — check if next turn looks like patient content
                # If prev speaker is CLINICIAN (asked a question), "Sure" = PATIENT starting answer
                # If prev speaker is PATIENT, "Sure" = CLINICIAN
                prev_speaker = None
                for j in range(i - 1, max(-1, i - 5), -1):
                    if turns[j].speaker != SpeakerRole.UNKNOWN and turns[j].confidence >= 0.40:
                        prev_speaker = turns[j].speaker
                        break
                
                if prev_speaker == SpeakerRole.CLINICIAN:
                    role = SpeakerRole.PATIENT
                elif prev_speaker == SpeakerRole.PATIENT:
                    role = SpeakerRole.CLINICIAN
                else:
                    role = SpeakerRole.CLINICIAN  # default
                
                turns[i] = t.model_copy(update={
                    "speaker": role,
                    "confidence": 0.55,
                    "method": "context_acknowledgment",
                })

        return turns

    @staticmethod
    def _fill_unknowns_by_alternation(turns: List[DialogueTurn]) -> List[DialogueTurn]:
        """
        Fill remaining UNKNOWN turns using the alternation principle.
        
        Medical interviews naturally alternate D→P→D→P.
        For isolated UNKNOWN turns, assign opposite of the previous known speaker.
        For runs of consecutive UNKNOWNs, alternate starting from the previous speaker.
        """
        last_known = SpeakerRole.CLINICIAN  # medical interviews start with doctor
        
        for i, t in enumerate(turns):
            if t.speaker != SpeakerRole.UNKNOWN:
                last_known = t.speaker
            else:
                # Assign opposite of last known speaker
                new_role = (SpeakerRole.PATIENT if last_known == SpeakerRole.CLINICIAN
                           else SpeakerRole.CLINICIAN)
                turns[i] = t.model_copy(update={
                    "speaker": new_role,
                    "confidence": 0.40,
                    "method": "alternation_fill",
                })
                last_known = new_role
        
        return turns

    @staticmethod
    def _merge_consecutive(turns: List[DialogueTurn]) -> List[DialogueTurn]:
        """
        Merge consecutive turns with the same speaker into a single turn.
        Produces a natural conversation flow (D → P → D → P ...).
        
        Boundary rules that PREVENT merging even with the same speaker:
        - Question boundary: if prev text ends with '?', next turn is likely
          the other speaker's answer (even if both classified same speaker)
        - Max merge limit: prevent mega-turns from runaway merges
        """
        if not turns:
            return turns

        MAX_MERGE_SEGMENTS = 5  # max segments to merge into one turn

        merged: List[DialogueTurn] = [turns[0].model_copy()]
        merge_count = 1  # how many segments in current merged turn

        for t in turns[1:]:
            last = merged[-1]
            
            # Same speaker — check if we should merge or break
            if t.speaker == last.speaker:
                # Question boundary: if previous text ends with ?, this is likely
                # a different speaker's response (classification error)
                prev_text = last.text.rstrip()
                if prev_text.endswith('?'):
                    # Don't merge — force a speaker break
                    # Flip the new turn to opposite speaker
                    opposite = (SpeakerRole.PATIENT if t.speaker == SpeakerRole.CLINICIAN
                               else SpeakerRole.CLINICIAN)
                    merged.append(t.model_copy(update={
                        "speaker": opposite,
                        "confidence": min(t.confidence, 0.50),
                        "method": t.method + "+qbreak",
                    }))
                    merge_count = 1
                    continue
                
                # Max merge limit — prevent mega-turns
                if merge_count >= MAX_MERGE_SEGMENTS:
                    merged.append(t.model_copy())
                    merge_count = 1
                    continue
                
                # Normal merge
                merged[-1] = last.model_copy(update={
                    "text": last.text.rstrip() + " " + t.text.lstrip(),
                    "end_time": t.end_time if t.end_time is not None else last.end_time,
                    "confidence": min(last.confidence, t.confidence),
                    "method": last.method if last.method == t.method else f"{last.method}+merged",
                })
                merge_count += 1
            else:
                merged.append(t.model_copy())
                merge_count = 1

        # Re-index sequentially
        for i, t in enumerate(merged):
            merged[i] = t.model_copy(update={"index": i})

        logger.info(f"Merged {len(turns)} turns → {len(merged)} turns")
        return merged

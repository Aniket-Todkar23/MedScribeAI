"""
Transcription Service
=====================
Stage 1: Video → Audio → Whisper transcription + Pyannote speaker diarization
Produces timestamped, speaker-labeled dialogue turns.

Pipeline:
  video file
    → ffmpeg extract audio (wav 16kHz mono)
    → pyannote diarization  → SPEAKER_00 / SPEAKER_01 + timestamps
    → whisper transcription → text + word timestamps
    → align whisper segments with diarization segments
    → identify which speaker ID is CLINICIAN vs PATIENT
    → ClassifiedTranscript
"""

import os
import re
import logging
import subprocess
import tempfile
from collections import defaultdict
from pathlib import Path
from typing import List, Dict, Optional, Tuple
import imageio_ffmpeg

# Patch torchaudio BEFORE pyannote imports it (torchaudio ≥2.10 removed AudioMetaData)
import torchaudio_compat  # noqa: F401

# Add ffmpeg to PATH for whisper
os.environ["PATH"] += os.pathsep + os.path.dirname(imageio_ffmpeg.get_ffmpeg_exe())

from schemas import DialogueTurn, SpeakerRole, ClassifiedTranscript

logger = logging.getLogger(__name__)


# ─────────────────────────────────────────────────────────────────────────────
# AUDIO EXTRACTOR  (ffmpeg)
# ─────────────────────────────────────────────────────────────────────────────

class AudioExtractor:
    """
    Extracts audio from video using ffmpeg.
    Outputs 16kHz mono WAV — the format Whisper and pyannote both expect.
    """

    @staticmethod
    def extract(video_path: str) -> str:
        """Returns path to extracted WAV file (temp file)."""
        audio_tmp = tempfile.NamedTemporaryFile(suffix=".wav", delete=False)
        audio_path = audio_tmp.name
        audio_tmp.close()

        ffmpeg_exe = imageio_ffmpeg.get_ffmpeg_exe()
        cmd = [
            ffmpeg_exe, "-y",
            "-i", video_path,
            "-vn",                      # no video
            "-acodec", "pcm_s16le",     # PCM WAV
            "-ar", "16000",             # 16kHz sample rate
            "-ac", "1",                 # mono
            audio_path,
        ]
        logger.info(f"Extracting audio: {video_path} → {audio_path}")
        result = subprocess.run(cmd, capture_output=True, text=True)

        if result.returncode != 0:
            raise RuntimeError(f"ffmpeg failed: {result.stderr}")

        size_mb = os.path.getsize(audio_path) / 1024 / 1024
        logger.info(f"Audio extracted: {size_mb:.1f} MB")
        return audio_path


# ─────────────────────────────────────────────────────────────────────────────
# WHISPER TRANSCRIBER
# ─────────────────────────────────────────────────────────────────────────────

class WhisperTranscriber:
    """
    Transcribes audio using faster-whisper (CTranslate2 backend).
    Returns segments with timestamps for alignment with diarization.

    Uses CTranslate2 instead of raw PyTorch, so it is immune to
    torch version-specific tensor-reshape bugs and runs faster on CPU.
    """

    def __init__(self, model_size: str = "base", language: Optional[str] = None):
        self.model_size = model_size
        self.language = language
        self._model = None

    def load(self):
        if self._model is None:
            from faster_whisper import WhisperModel
            import torch

            device = "cuda" if torch.cuda.is_available() else "cpu"
            compute_type = "float16" if device == "cuda" else "int8"

            logger.info(
                f"Loading faster-whisper model: {self.model_size} "
                f"(device={device}, compute={compute_type})"
            )
            self._model = WhisperModel(
                self.model_size, device=device, compute_type=compute_type
            )
            logger.info("Whisper loaded.")

    def transcribe(self, audio_input) -> dict:
        """
        Returns dict compatible with openai-whisper format:
          - result['text']:     full transcript string
          - result['segments']: list of {start, end, text, words:[{word, start, end}]}
        """
        if not self._model:
            self.load()

        logger.info("Transcribing with faster-whisper...")
        # Use word_timestamps=True to get better sentence boundaries
        # condition_on_previous_text=False prevents hallucination loops
        options = {
            "beam_size": 2, 
            "word_timestamps": True, 
            "vad_filter": True,
            "condition_on_previous_text": False
        }
        if self.language:
            options["language"] = self.language

        segments_gen, info = self._model.transcribe(audio_input, **options)

        # Convert faster-whisper output to openai-whisper compatible format
        # We will split segments on punctuation to ensure clean speaker boundaries
        segments = []
        full_text_parts = []

        import re
        sentence_end = re.compile(r'[.!?]\s*$')

        for segment in segments_gen:
            # If the segment is long and contains multiple sentences, split it
            # This helps the classifier assign different speakers to different sentences
            words = segment.words if segment.words else []
            
            if not words:
                # Fallback if no word timestamps
                seg_dict = {
                    "start": segment.start,
                    "end": segment.end,
                    "text": segment.text,
                }
                segments.append(seg_dict)
                full_text_parts.append(segment.text)
                continue

            current_sentence = []
            current_start = words[0].start
            
            for i, w in enumerate(words):
                current_sentence.append(w.word)
                
                # Split if word ends with punctuation OR gap between words is > 0.8s (likely speaker change)
                is_last_word = (i == len(words) - 1)
                has_punctuation = sentence_end.search(w.word)
                long_pause = False
                
                if not is_last_word:
                    next_word = words[i+1]
                    if next_word.start - w.end > 0.6:
                        long_pause = True

                if has_punctuation or long_pause or is_last_word:
                    text = "".join(current_sentence).strip()
                    if text:
                        segments.append({
                            "start": current_start,
                            "end": w.end,
                            "text": text
                        })
                        full_text_parts.append(" " + text)
                    
                    current_sentence = []
                    if not is_last_word:
                        current_start = words[i+1].start

        result = {
            "text": "".join(full_text_parts).strip(),
            "segments": segments,
            "language": info.language,
        }

        duration = segments[-1]["end"] if segments else 0
        logger.info(f"Transcription complete: {len(segments)} segments, ~{duration:.0f}s")
        return result


# ─────────────────────────────────────────────────────────────────────────────
# PYANNOTE DIARIZER
# ─────────────────────────────────────────────────────────────────────────────

class PyannoteDiarizer:
    """
    Speaker diarization using pyannote.audio 3.x.
    Identifies speaker segments: (start_time, end_time, speaker_id).

    Requires:
      - pip install pyannote.audio
      - HuggingFace token with pyannote model access accepted
      - Set env var: HF_TOKEN=your_token
    """

    def __init__(self, hf_token: Optional[str] = None):
        self.hf_token = hf_token or os.getenv("HF_TOKEN")
        self._pipeline = None

    def load(self):
        if self._pipeline is None:
            from pyannote.audio import Pipeline
            import torch

            if not self.hf_token:
                raise ValueError(
                    "HF_TOKEN not set. Get token from https://huggingface.co/settings/tokens "
                    "and accept pyannote/speaker-diarization-3.1 terms."
                )

            logger.info("Loading pyannote speaker diarization pipeline...")
            
            # Pyannote 3.1 requires BOTH token and use_auth_token depending on the internal module
            # We pass both to ensure all sub-models (segmentation, embedding) authenticate correctly
            import os
            os.environ["HF_TOKEN"] = self.hf_token
            
            self._pipeline = Pipeline.from_pretrained(
                "pyannote/speaker-diarization-3.1",
                use_auth_token=self.hf_token,
            )

            # Use GPU if available
            if torch.cuda.is_available():
                self._pipeline.to(torch.device("cuda"))
                logger.info("Pyannote using CUDA")
            else:
                # Optimize for CPU: use more threads since user has 24 cores
                torch.set_num_threads(16)
                logger.info("Pyannote using CPU (optimized threads: 16)")
            logger.info("Pyannote loaded.")

    def diarize(self, audio_path: str) -> List[Dict]:
        """
        Returns list of speaker segments:
          [{"speaker": "SPEAKER_00", "start": 0.5, "end": 3.2}, ...]
        """
        if not self._pipeline:
            self.load()

        logger.info("Running speaker diarization...")
        
        # Optimize Pyannote for speed:
        # 1. Limit max speakers to 2 (Clinician and Patient)
        diarization = self._pipeline(
            audio_path, 
            num_speakers=2
        )

        segments = []
        for turn, _, speaker in diarization.itertracks(yield_label=True):
            segments.append({
                "speaker": speaker,
                "start": round(turn.start, 3),
                "end": round(turn.end, 3),
            })

        unique_speakers = set(s["speaker"] for s in segments)
        logger.info(f"Diarization complete: {len(segments)} segments, {len(unique_speakers)} speakers")
        return segments


# ─────────────────────────────────────────────────────────────────────────────
# ALIGNMENT — Whisper segments + Pyannote diarization → labeled turns
# ─────────────────────────────────────────────────────────────────────────────

class TranscriptAligner:
    """
    Aligns Whisper text segments with pyannote speaker segments.
    For each Whisper segment, find the dominant speaker in that time window.
    Then identify which speaker ID is the clinician vs patient.
    """

    # Clinical language signals — used to identify which speaker ID is the clinician
    _CLINICIAN_MARKERS = re.compile(
        r"\b(prescri|diagnos|referr|how long|do you have|any history|"
        r"any (fever|nausea|pain)|let me (check|examine)|blood pressure|"
        r"i('ll| will) (prescribe|order|refer)|on a scale|your (symptoms|condition)|"
        r"recommend|treatment|follow.?up|assessment|examination)\b",
        re.IGNORECASE,
    )

    def align(
        self,
        whisper_result: dict,
        diarization_segments: List[Dict],
    ) -> List[Dict]:
        """
        Returns list of aligned segments:
          [{"text": "...", "speaker": "SPEAKER_00", "start": 0.5, "end": 3.2}]
        """
        aligned = []
        for seg in whisper_result["segments"]:
            seg_start, seg_end = seg["start"], seg["end"]
            text = seg["text"].strip()
            if not text:
                continue

            # Find dominant speaker for this whisper segment
            speaker = self._dominant_speaker(seg_start, seg_end, diarization_segments)
            aligned.append({
                "text": text,
                "speaker": speaker,
                "start": seg_start,
                "end": seg_end,
            })

        return aligned

    def _dominant_speaker(
        self, start: float, end: float, diarization_segments: List[Dict]
    ) -> str:
        """Return the speaker ID with maximum overlap in [start, end]."""
        overlap_by_speaker: Dict[str, float] = defaultdict(float)
        for seg in diarization_segments:
            overlap = max(0, min(end, seg["end"]) - max(start, seg["start"]))
            if overlap > 0:
                overlap_by_speaker[seg["speaker"]] += overlap

        if not overlap_by_speaker:
            return "SPEAKER_UNKNOWN"
        return max(overlap_by_speaker, key=overlap_by_speaker.get)

    def assign_roles(self, aligned_segments: List[Dict]) -> List[Dict]:
        """
        Determine which SPEAKER_XX is CLINICIAN and which is PATIENT.
        Strategy: score each speaker on clinical language usage.
        The speaker with higher clinical score = CLINICIAN.
        """
        # Aggregate text per speaker
        speaker_text: Dict[str, str] = defaultdict(str)
        for seg in aligned_segments:
            speaker_text[seg["speaker"]] += " " + seg["text"]

        if len(speaker_text) < 2:
            # Only one speaker found — likely a short clip or diarization issue
            logger.warning("Only 1 speaker found in diarization. Defaulting to UNKNOWN.")
            return [
                {**seg, "role": SpeakerRole.UNKNOWN, "confidence": 0.0}
                for seg in aligned_segments
            ]

        # Score each speaker
        scores = {
            spk: len(self._CLINICIAN_MARKERS.findall(text))
            for spk, text in speaker_text.items()
        }

        # Sort speakers by score descending
        ranked = sorted(scores, key=scores.get, reverse=True)
        clinician_id = ranked[0]
        patient_id = ranked[1] if len(ranked) > 1 else None

        logger.info(f"Speaker roles: {clinician_id}=CLINICIAN (score {scores[clinician_id]}), "
                    f"{patient_id}=PATIENT (score {scores.get(patient_id, 0)})")

        # Assign roles
        result = []
        for seg in aligned_segments:
            spk = seg["speaker"]
            if spk == clinician_id:
                role, conf = SpeakerRole.CLINICIAN, 0.88
            elif spk == patient_id:
                role, conf = SpeakerRole.PATIENT, 0.88
            else:
                role, conf = SpeakerRole.UNKNOWN, 0.0
            result.append({**seg, "role": role, "confidence": conf})

        return result


# ─────────────────────────────────────────────────────────────────────────────
# MAIN TRANSCRIPTION SERVICE
# ─────────────────────────────────────────────────────────────────────────────

class TranscriptionService:
    """
    Orchestrates the full transcription pipeline:
      Video file → audio extraction → Whisper → diarization → alignment → ClassifiedTranscript
    """

    def __init__(
        self,
        whisper_model: str = "base",
        language: Optional[str] = None,
        hf_token: Optional[str] = None,
    ):
        self.audio_extractor   = AudioExtractor()
        self.whisper           = WhisperTranscriber(model_size=whisper_model, language=language)
        self._diarization_available = False

    def load_models(self):
        """Pre-load Whisper at startup."""
        self.whisper.load()

    def process(self, audio_path: str) -> Tuple[ClassifiedTranscript, float]:
        """
        Full pipeline: audio file → ClassifiedTranscript.
        Returns (ClassifiedTranscript, audio_duration_seconds).
        """
        try:
            # Step 0: Normalize audio to WAV 16kHz mono via ffmpeg (imageio)
            wav_path = self.audio_extractor.extract(audio_path)

            import soundfile as sf
            audio_info = sf.info(wav_path)
            audio_duration = audio_info.frames / audio_info.samplerate

            # Step 1: Transcribe the entire audio with Whisper
            # We rely on Whisper's built-in VAD and punctuation to create natural segments
            whisper_result = self.whisper.transcribe(wav_path)
            
            # Step 2: Use text-only classification (Heuristic + LLM)
            # This is much faster, more private, and cheaper than Pyannote
            turns = self._pipeline_text_only(whisper_result)

            raw_transcript = " ".join(t.text for t in turns)

            # Build ClassifiedTranscript
            result = ClassifiedTranscript(
                turns=turns,
                total_turns=len(turns),
                clinician_turns=sum(1 for t in turns if t.speaker == SpeakerRole.CLINICIAN),
                patient_turns=sum(1 for t in turns if t.speaker == SpeakerRole.PATIENT),
                unknown_turns=sum(1 for t in turns if t.speaker == SpeakerRole.UNKNOWN),
                raw_transcript=raw_transcript,
            )
            return result, audio_duration

        except Exception as e:
            logger.error(f"Transcription process failed: {e}")
            raise
        finally:
            # Clean up normalized WAV if it differs from the input
            if 'wav_path' in locals() and wav_path != audio_path and os.path.exists(wav_path):
                os.unlink(wav_path)

    def _pipeline_text_only(self, whisper_result: dict) -> List[DialogueTurn]:
        """
        Fallback: no diarization. Each Whisper segment gets role=UNKNOWN.
        The downstream HybridClassifier will assign roles from text content.
        """
        logger.info("Using text-only mode (no diarization). Roles will be inferred from text.")
        turns = []
        for i, seg in enumerate(whisper_result["segments"]):
            text = seg["text"].strip()
            if text:
                turns.append(DialogueTurn(
                    index=i,
                    speaker=SpeakerRole.UNKNOWN,
                    text=text,
                    start_time=seg.get("start"),
                    end_time=seg.get("end"),
                    confidence=0.0,
                    method="whisper_text_only",
                ))
        return turns

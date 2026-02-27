"""
Transcription Service — faster-whisper
=======================================
Simple audio-to-text transcription using faster-whisper.
No diarization, no classification. The primary backend handles
speaker identity via separate LiveKit tracks.
"""

import asyncio
import os
import logging
import tempfile
import shutil
from typing import Tuple, List

from faster_whisper import WhisperModel

logger = logging.getLogger(__name__)


class TranscriptionService:
    """Wraps faster-whisper for CPU/GPU transcription."""

    def __init__(
        self,
        model_size: str = "base",
        device: str = "cpu",
        compute_type: str = "int8",
    ):
        self._model_size = model_size
        self._device = device
        self._compute_type = compute_type
        self._model: WhisperModel = None
        self.loaded = False

    def load(self):
        """Load the Whisper model."""
        logger.info(
            f"Loading faster-whisper model: {self._model_size} "
            f"on {self._device} ({self._compute_type})"
        )
        self._model = WhisperModel(
            self._model_size,
            device=self._device,
            compute_type=self._compute_type,
        )
        self.loaded = True
        logger.info("Whisper model loaded.")

    def transcribe(self, audio_path: str) -> dict:
        """
        Transcribe an audio file to text.

        Args:
            audio_path: Path to the audio file (wav, mp3, m4a, etc.)

        Returns:
            dict with keys: text, segments, language, duration
        """
        if not self.loaded:
            raise RuntimeError("Whisper model not loaded. Call load() first.")

        segments_gen, info = self._model.transcribe(
            audio_path,
            beam_size=5,
            language=None,        # auto-detect
            vad_filter=True,      # filter out silence
            vad_parameters=dict(
                min_silence_duration_ms=500,
            ),
        )

        segments = []
        full_text_parts = []
        for seg in segments_gen:
            segments.append({
                "text": seg.text.strip(),
                "start": round(seg.start, 3),
                "end": round(seg.end, 3),
            })
            full_text_parts.append(seg.text.strip())

        full_text = " ".join(full_text_parts)
        duration = info.duration if info.duration else 0.0
        language = info.language if info.language else "en"

        logger.info(
            f"Transcription complete: {len(segments)} segments, "
            f"{len(full_text)} chars, {duration:.1f}s, lang={language}"
        )

        return {
            "text": full_text,
            "segments": segments,
            "language": language,
            "duration": round(duration, 2),
        }

    def _transcribe_bytes_sync(self, audio_bytes: bytes, filename: str = "audio.wav") -> dict:
        """Synchronous transcribe-from-bytes (runs in thread pool)."""
        ext = os.path.splitext(filename)[1] or ".wav"
        fd, temp_path = tempfile.mkstemp(suffix=ext)
        try:
            with os.fdopen(fd, "wb") as f:
                f.write(audio_bytes)
            return self.transcribe(temp_path)
        finally:
            if os.path.exists(temp_path):
                os.unlink(temp_path)

    async def transcribe_bytes(self, audio_bytes: bytes, filename: str = "audio.wav") -> dict:
        """
        Async transcribe audio from bytes. Offloads to thread pool since
        faster-whisper is CPU-bound.

        Args:
            audio_bytes: Raw audio bytes
            filename: Original filename (used for extension detection)

        Returns:
            dict with keys: text, segments, language, duration
        """
        return await asyncio.to_thread(self._transcribe_bytes_sync, audio_bytes, filename)

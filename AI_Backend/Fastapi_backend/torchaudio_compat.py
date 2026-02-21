"""
torchaudio compatibility shim
=============================
torchaudio ≥2.10 removed `AudioMetaData` and `info()` which pyannote.audio 3.x
still references at import time. This module monkey-patches them back using
soundfile as the audio backend.

Import this module BEFORE importing pyannote.audio:

    import torchaudio_compat  # patches torchaudio
    from pyannote.audio import Pipeline
"""

import torchaudio
import soundfile as sf
from dataclasses import dataclass
from typing import Optional
import logging

logger = logging.getLogger(__name__)


@dataclass
class AudioMetaData:
    """Drop-in replacement for the removed torchaudio.AudioMetaData."""
    sample_rate: int
    num_frames: int
    num_channels: int
    bits_per_sample: int = 16
    encoding: str = "PCM_S"
    codec: Optional[str] = None


def _info(filepath: str, **kwargs) -> AudioMetaData:
    """Drop-in replacement for the removed torchaudio.info()."""
    info = sf.info(filepath)
    # Extract bits from subtype like "PCM_16" → 16
    bits = 16
    if info.subtype:
        import re
        m = re.search(r'(\d+)', info.subtype)
        if m:
            bits = int(m.group(1))
    return AudioMetaData(
        sample_rate=info.samplerate,
        num_frames=info.frames,
        num_channels=info.channels,
        bits_per_sample=bits,
        encoding=info.subtype or "PCM_S",
    )


# Apply patches only if missing
if not hasattr(torchaudio, "AudioMetaData"):
    torchaudio.AudioMetaData = AudioMetaData
    logger.info("Patched torchaudio.AudioMetaData")

if not hasattr(torchaudio, "info"):
    torchaudio.info = _info
    logger.info("Patched torchaudio.info")

if not hasattr(torchaudio, "list_audio_backends"):
    def _list_audio_backends():
        """Return a list of available audio backends."""
        return ["soundfile"]
    torchaudio.list_audio_backends = _list_audio_backends
    logger.info("Patched torchaudio.list_audio_backends")

if not hasattr(torchaudio, "get_audio_backend"):
    def _get_audio_backend():
        return "soundfile"
    torchaudio.get_audio_backend = _get_audio_backend
    logger.info("Patched torchaudio.get_audio_backend")

if not hasattr(torchaudio, "set_audio_backend"):
    def _set_audio_backend(backend: str):
        pass  # no-op
    torchaudio.set_audio_backend = _set_audio_backend
    logger.info("Patched torchaudio.set_audio_backend")

# Also patch the load function signature if needed — pyannote expects
# torchaudio.load to return (waveform, sample_rate). In torchaudio 2.10
# load() still exists, so this should be fine.

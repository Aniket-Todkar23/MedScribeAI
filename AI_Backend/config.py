"""
AI Core Service — Configuration
================================
All settings are loaded from environment variables or .env file.
"""

from pydantic_settings import BaseSettings


class Settings(BaseSettings):
    # ── Modal Endpoints ───────────────────────────────────────────────────────
    MODAL_MEDGEMMA_URL: str = ""
    MODAL_QWEN_VL_URL: str = ""

    # ── Whisper ───────────────────────────────────────────────────────────────
    WHISPER_MODEL_SIZE: str = "base"         # tiny, base, small, medium, large-v3
    WHISPER_DEVICE: str = "cpu"              # cpu or cuda
    WHISPER_COMPUTE_TYPE: str = "int8"       # int8, float16, float32

    # ── ICD CSV Paths ─────────────────────────────────────────────────────────
    ICD9_CSV_PATH: str = ""
    ICD10_CSV_PATH: str = ""

    # ── Server ────────────────────────────────────────────────────────────────
    HOST: str = "0.0.0.0"
    PORT: int = 8000
    DEBUG: bool = True

    model_config = {"env_file": ".env", "env_file_encoding": "utf-8", "extra": "ignore"}


settings = Settings()

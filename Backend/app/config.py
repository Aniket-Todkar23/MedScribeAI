"""
MedScribe AI Backend — Configuration
"""

from pathlib import Path
from pydantic_settings import BaseSettings


class Settings(BaseSettings):
    # ── Database ──────────────────────────────────────────────────────────────
    DATABASE_URL: str = "postgresql+asyncpg://smartemr:smartemr_dev_2026@localhost:5432/smartemr"

    # ── JWT Auth ──────────────────────────────────────────────────────────────
    JWT_SECRET: str = "change-this-to-a-secure-random-string-in-production"
    JWT_ALGORITHM: str = "HS256"
    JWT_ACCESS_EXPIRE_MINUTES: int = 30
    JWT_REFRESH_EXPIRE_DAYS: int = 7

    # ── AI Backend ────────────────────────────────────────────────────────────
    AI_BACKEND_URL: str = "http://localhost:8000/api/v1"
    MODAL_MEDGEMMA_URL: str = ""
    MODAL_QWEN_VL_URL: str = ""

    # ── Gemini (LangGraph agent LLM) ─────────────────────────────────────────
    GEMINI_API_KEY: str = ""

    # ── Ollama (local fallback LLM) ──────────────────────────────────────────
    OLLAMA_BASE_URL: str = "http://localhost:11434"
    OLLAMA_MODEL: str = "qwen2.5:7b"

    # ── LiveKit ───────────────────────────────────────────────────────────────
    LIVEKIT_URL: str = "http://localhost:7880"
    LIVEKIT_API_KEY: str = "devkey"
    LIVEKIT_API_SECRET: str = "secret"

    # ── Email ─────────────────────────────────────────────────────────────────
    EMAIL_HOST: str = "smtp.gmail.com"
    EMAIL_PORT: int = 587
    EMAIL_USER: str = ""
    EMAIL_PASSWORD: str = ""
    EMAIL_FROM: str = "MedScribe AI <noreply@medscribe.local>"

    # ── Storage ───────────────────────────────────────────────────────────────
    UPLOAD_DIR: str = "./uploads"
    MAX_UPLOAD_SIZE_MB: int = 50

    # ── Server ────────────────────────────────────────────────────────────────
    HOST: str = "0.0.0.0"
    PORT: int = 3001
    DEBUG: bool = True

    model_config = {"env_file": ".env", "env_file_encoding": "utf-8", "extra": "ignore"}

    @property
    def upload_path(self) -> Path:
        p = Path(self.UPLOAD_DIR)
        p.mkdir(parents=True, exist_ok=True)
        return p


settings = Settings()

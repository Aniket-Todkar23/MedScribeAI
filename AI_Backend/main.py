"""
AI Core Service — FastAPI Application Entry Point
===================================================
Merges the old Fastapi_backend (port 8000) and Doc_Analysis_Backend (port 8001)
into a single, clean service running on port 8000.

All model inference is offloaded to Modal GPU servers (MedGemma-27B, Qwen2.5-VL).
Local compute: faster-whisper transcription, ICD lookups, markdown parsing.
"""

import logging
import sys
from contextlib import asynccontextmanager

import uvicorn
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from config import settings
from transcription_service import TranscriptionService
from medgemma_service import MedGemmaService
from icd_service import ICDService
from doc_analysis_service import DocumentAnalysisService
from routes import router

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s [%(levelname)s] %(name)s: %(message)s",
    handlers=[logging.StreamHandler(sys.stdout)],
)
logger = logging.getLogger(__name__)


@asynccontextmanager
async def lifespan(app: FastAPI):
    """Start-up: load all services. Shutdown: clean up."""
    logger.info("═" * 60)
    logger.info("  AI Core Service — Starting up")
    logger.info("═" * 60)

    # 1. Transcription (faster-whisper)
    transcription = TranscriptionService(
        model_size=settings.WHISPER_MODEL_SIZE,
        device=settings.WHISPER_DEVICE,
        compute_type=settings.WHISPER_COMPUTE_TYPE,
    )
    transcription.load()
    app.state.transcription = transcription
    logger.info("[✓] Transcription service loaded")

    # 2. MedGemma (Modal proxy)
    medgemma = MedGemmaService(modal_url=settings.MODAL_MEDGEMMA_URL)
    await medgemma.load()
    app.state.medgemma = medgemma
    logger.info("[✓] MedGemma service connected")

    # 3. ICD lookup
    icd = ICDService(icd9_path=settings.ICD9_CSV_PATH, icd10_path=settings.ICD10_CSV_PATH)
    icd.load()
    app.state.icd = icd
    logger.info("[✓] ICD service loaded")

    # 4. Document analysis (Qwen-VL + MedGemma via Modal)
    doc_analysis = DocumentAnalysisService(
        qwen_vl_url=settings.MODAL_QWEN_VL_URL,
        medgemma_url=settings.MODAL_MEDGEMMA_URL,
    )
    await doc_analysis.check_health()
    app.state.doc_analysis = doc_analysis
    logger.info("[✓] Document analysis service initialized")

    logger.info("═" * 60)
    logger.info("  All services ready — listening on %s:%s", settings.HOST, settings.PORT)
    logger.info("═" * 60)

    yield

    # Shutdown
    logger.info("Shutting down AI Core Service ...")
    await medgemma.close()
    await doc_analysis.close()
    logger.info("Shutdown complete.")


# ─── Create App ──────────────────────────────────────────────────────────────

app = FastAPI(
    title="Smart EMR — AI Core Service",
    description=(
        "Unified AI backend for medical transcription, entity extraction, "
        "EMR generation, ICD coding, document analysis, and clinical chat."
    ),
    version="2.0.0",
    lifespan=lifespan,
)

# CORS — allow primary backend and frontend
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # tighten in production
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Mount routes at /api/v1 (matches server/app/config.py: AI_BACKEND_URL)
app.include_router(router, prefix="/api/v1")


# ─── Entrypoint ──────────────────────────────────────────────────────────────

if __name__ == "__main__":
    uvicorn.run(
        "main:app",
        host=settings.HOST,
        port=settings.PORT,
        reload=True,
        log_level="info",
    )

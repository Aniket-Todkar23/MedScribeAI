"""
EMR Extractor — Full Pipeline Server
"""

import logging
import os
from contextlib import asynccontextmanager

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse

from routes import router
from transcription_service import TranscriptionService
from medgemma_service import MedGemmaService
from classifier import HybridClassifier
from icd_service import ICDService

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s [%(levelname)s] %(name)s — %(message)s",
)
logger = logging.getLogger(__name__)


@asynccontextmanager
async def lifespan(app: FastAPI):
    logger.info("═" * 60)
    logger.info("  Smart EMR — Starting Up")
    logger.info("═" * 60)

    # ── Transcription Service (Whisper + Pyannote) ────────────────────────────
    whisper_model = os.getenv("WHISPER_MODEL", "base")
    hf_token      = os.getenv("HF_TOKEN")

    app.state.transcription_service = TranscriptionService(
        whisper_model=whisper_model,
        hf_token=hf_token,
    )
    # Defer loading models until first request to speed up startup
    # app.state.transcription_service.load_models()
    logger.info(f"✅ Transcription service initialized (Whisper: {whisper_model}) - Models will load on first request")

    # ── MedGemma Service ─────────────────────────────────────────────────────
    backend = os.getenv("MEDGEMMA_BACKEND", "modal")
    app.state.medgemma = MedGemmaService(backend=backend)

    try:
        app.state.medgemma.load()
        logger.info(f"✅ MedGemma ready (backend: {backend})")
    except Exception as e:
        logger.error(f"❌ MedGemma load failed: {e}")
        logger.warning("⚠️  NER endpoints will fail. Check MEDGEMMA_BACKEND and credentials.")

    # ── ICD Code Service ─────────────────────────────────────────────────────
    app.state.icd_service = ICDService()
    try:
        # Defer loading ICD CSVs until first request to speed up startup
        # app.state.icd_service.load()
        app.state.medgemma.set_icd_service(app.state.icd_service)
        logger.info("✅ ICD code service initialized - CSVs will load on first request")
    except Exception as e:
        logger.warning(f"⚠️  ICD service load failed: {e}")

    # ── Hybrid Classifier (uses MedGemma for LLM pass) ───────────────────────
    # For Modal/remote backends, pass generate_fn; for local, pass model/tokenizer
    if backend == "local" and app.state.medgemma.model and app.state.medgemma.tokenizer:
        app.state.classifier = HybridClassifier(
            model=app.state.medgemma.model,
            tokenizer=app.state.medgemma.tokenizer,
            confidence_threshold=0.65,
        )
    else:
        # Use the backend's generate() method as a callable
        app.state.classifier = HybridClassifier(
            generate_fn=app.state.medgemma._backend.generate,
            confidence_threshold=0.65,
        )
    logger.info("✅ Hybrid classifier ready")

    logger.info("═" * 60)
    logger.info("  Server ready → http://localhost:8000/docs")
    logger.info("═" * 60)

    yield

    logger.info("Shutting down...")


app = FastAPI(
    title="EMR ASSISSTANT",
    description="""
## EMR GENERATION Pipeline

Converts audio recordings into fully structured EMR records with ICD code mapping.

### Full Pipeline
```
Audio File
    ↓  [1] Upload
    ↓  [2] Transcribe (Whisper)
    ↓  [3] Diarize Speakers (pyannote)
    ↓  [4] Classify CLINICIAN/PATIENT (Hybrid: heuristic + MedGemma)
    ↓  [5] Extract Medical Entities (MedGemma NER)
    ↓  [6] Auto-map ICD-9/ICD-10 Codes
    ↓  [7] Generate Narratives (MedGemma)
    ↓  [8] Build Structured EMR Record
```

### Endpoints
- `POST /api/v1/transcribe` — Audio upload → transcript
- `POST /api/v1/extract` — Transcript → medical entities (with ICD codes)
- `POST /api/v1/generate-emr` — Entities → EMR record
- `POST /api/v1/patient-summary` — EMR → plain-English summary
- `POST /api/v1/icd-lookup` — Search ICD-9/ICD-10 codes
- `POST /api/v1/suggest-diagnoses` — AI differential diagnosis + ICD mapping
- `GET  /api/v1/icd-stats` — ICD database statistics
- `GET  /api/v1/health` — Health check
    """,
    version="2.0.0",
    lifespan=lifespan,
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
    expose_headers=["*"],
)

app.include_router(router, prefix="/api/v1")


@app.exception_handler(Exception)
async def global_error(request, exc):
    logger.exception(f"Unhandled: {exc}")
    return JSONResponse(
        status_code=500,
        content={"success": False, "error": str(exc)}
    )


@app.get("/", tags=["system"])
async def root():
    return {
        "service": "Smart EMR API",
        "docs": "/docs",
        "endpoints": {
            "transcribe":        "POST /api/v1/transcribe",
            "extract":           "POST /api/v1/extract",
            "generate_emr":      "POST /api/v1/generate-emr",
            "patient_summary":   "POST /api/v1/patient-summary",
            "icd_lookup":        "POST /api/v1/icd-lookup",
            "suggest_diagnoses": "POST /api/v1/suggest-diagnoses",
            "icd_stats":         "GET  /api/v1/icd-stats",
            "health":            "GET  /api/v1/health",
        }
    }

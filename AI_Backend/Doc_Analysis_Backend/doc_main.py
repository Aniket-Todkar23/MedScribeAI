"""
Document Analysis Server — FastAPI Entrypoint
===============================================
Separate FastAPI server (port 8001) for the document analysis pipeline.

Orchestrates the 3-stage pipeline:
  Stage 1: Document Perception (Qwen2.5-VL on Modal)
  Stage 2: Clinical Extraction (MedGemma-27B on Modal)
  Stage 3: Summary Generation (MedGemma-27B on Modal)

Run:
  uvicorn doc_main:app --host 0.0.0.0 --port 8001 --reload

Requires:
  MODAL_QWEN_VL_URL   — URL of deployed Qwen2.5-VL Modal endpoint
  MODAL_MEDGEMMA_URL   — URL of deployed MedGemma-27B Modal endpoint
"""

import logging
import os
from contextlib import asynccontextmanager

from dotenv import load_dotenv
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse

from doc_routes import router
from doc_analysis_service import DocumentAnalysisService

load_dotenv()

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s [%(levelname)s] %(name)s — %(message)s",
)
logger = logging.getLogger(__name__)


@asynccontextmanager
async def lifespan(app: FastAPI):
    logger.info("═" * 60)
    logger.info("  Document Analysis Server — Starting Up")
    logger.info("═" * 60)

    # ── Validate environment ─────────────────────────────────────────────────
    qwen_url = os.getenv("MODAL_QWEN_VL_URL", "")
    medgemma_url = os.getenv("MODAL_MEDGEMMA_URL", "")

    if not qwen_url:
        logger.error("❌ MODAL_QWEN_VL_URL not set. Deploy Qwen2.5-VL: modal deploy modal_qwen2_vl.py")
    if not medgemma_url:
        logger.error("❌ MODAL_MEDGEMMA_URL not set. Deploy MedGemma: modal deploy modal_medgemma27b.py")

    # ── Initialize service ───────────────────────────────────────────────────
    service = DocumentAnalysisService(
        qwen_vl_url=qwen_url,
        medgemma_url=medgemma_url,
        timeout=300.0,
    )
    app.state.doc_service = service

    # ── Health check ─────────────────────────────────────────────────────────
    try:
        status = await service.check_health()
        if status["qwen_vl"]:
            logger.info("✅ Qwen2.5-VL endpoint ready")
        else:
            logger.warning("⚠️  Qwen2.5-VL endpoint not reachable (may need cold start)")

        if status["medgemma"]:
            logger.info("✅ MedGemma-27B endpoint ready")
        else:
            logger.warning("⚠️  MedGemma-27B endpoint not reachable (may need cold start)")
    except Exception as e:
        logger.warning(f"⚠️  Health check skipped: {e}")

    logger.info("═" * 60)
    logger.info("  Server ready → http://localhost:8001/docs")
    logger.info("═" * 60)

    yield

    # ── Cleanup ──────────────────────────────────────────────────────────────
    await service.close()
    logger.info("Shutting down...")


app = FastAPI(
    title="AI Document Analysis",
    description="""
## Document Analysis Pipeline

Analyzes medical documents (lab reports, prescriptions, clinical notes) using AI.

### Pipeline
```
PDF / Image Upload
    ↓  [1] Convert to images (PyMuPDF)
    ↓  [2] Document Perception (Qwen2.5-VL on Modal)
    ↓      → Structured Markdown Tables
    ↓  [3] Clinical Extraction (MedGemma-27B on Modal)
    ↓      → Structured JSON + ICD-10 Codes + Medication Suggestions
    ↓  [4] Summary Generation (MedGemma-27B on Modal)
    ↓      → Clinician Summary + Patient-Friendly Summary
```

### Endpoints
- `POST /api/v1/analyze-document`     — Full pipeline (Stages 1+2+3)
- `POST /api/v1/analyze-for-doctor`   — Doctor view: EMR data + clinician summary
- `POST /api/v1/analyze-for-patient`  — Patient view: simple summary + tips
- `POST /api/v1/perceive-document`    — Stage 1 only (document → markdown)
- `POST /api/v1/extract-from-markdown` — Stages 2+3 (markdown → structured + summaries)
- `GET  /api/v1/health`               — Health check
    """,
    version="1.0.0",
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
        content={"success": False, "error": str(exc)},
    )


@app.get("/", tags=["system"])
async def root():
    return {
        "service": "Smart EMR — Document Analysis API",
        "docs": "/docs",
        "endpoints": {
            "analyze_document":     "POST /api/v1/analyze-document",
            "analyze_for_doctor":   "POST /api/v1/analyze-for-doctor",
            "analyze_for_patient":  "POST /api/v1/analyze-for-patient",
            "perceive_document":    "POST /api/v1/perceive-document",
            "extract_from_markdown": "POST /api/v1/extract-from-markdown",
            "health":               "GET  /api/v1/health",
        },
    }

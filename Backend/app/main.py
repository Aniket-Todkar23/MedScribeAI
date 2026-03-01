"""
MedScribe AI Backend — FastAPI Application Entry Point
"""

import logging
from contextlib import asynccontextmanager

from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse

from app.config import settings
from app.database import engine, Base

# Import all models so they're registered with Base
from app.models import user, appointment, consultation, document, chat_history, notification, audit  # noqa: F401

# Import routers
from app.api import auth, patients, doctors, appointments, consultations, documents, meetings, agent, ai_proxy, fhir, drugs

# Import compliance middleware
from app.compliance.audit_middleware import AuditMiddleware

logging.basicConfig(level=logging.INFO if settings.DEBUG else logging.WARNING)
logger = logging.getLogger(__name__)


@asynccontextmanager
async def lifespan(app: FastAPI):
    """Application startup/shutdown lifecycle."""
    logger.info("🚀 MedScribe AI Backend starting up...")

    # Tables are managed by Alembic migrations (run via `alembic upgrade head`)
    logger.info("✅ Database ready (migrations managed by Alembic)")

    # Ensure upload directory exists
    settings.upload_path.mkdir(parents=True, exist_ok=True)
    logger.info(f"📁 Upload directory: {settings.upload_path}")

    yield

    logger.info("🛑 MedScribe AI Backend shutting down...")
    await engine.dispose()


app = FastAPI(
    title="MedScribe AI — Diagnostic Assistant",
    description=(
        "A voice-first system that transforms clinician-patient interactions "
        "into structured data, diagnoses, and actionable insights."
    ),
    version="2.0.0",
    lifespan=lifespan,
    docs_url="/docs",
    redoc_url="/redoc",
)

# ── CORS ──────────────────────────────────────────────────────────────────────

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000", "http://localhost:5173", "http://127.0.0.1:5173"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# ── Audit Middleware (HIPAA) ──────────────────────────────────────────────────

app.add_middleware(AuditMiddleware)

# ── Routers ───────────────────────────────────────────────────────────────────

API_PREFIX = "/api/v1"

app.include_router(auth.router, prefix=API_PREFIX)
app.include_router(patients.router, prefix=API_PREFIX)
app.include_router(doctors.router, prefix=API_PREFIX)
app.include_router(appointments.router, prefix=API_PREFIX)
app.include_router(consultations.router, prefix=API_PREFIX)
app.include_router(documents.router, prefix=API_PREFIX)
app.include_router(meetings.router, prefix=API_PREFIX)
app.include_router(agent.router, prefix=API_PREFIX)
app.include_router(ai_proxy.router, prefix=API_PREFIX)
app.include_router(fhir.router, prefix=API_PREFIX)
app.include_router(drugs.router, prefix=API_PREFIX)


# ── Health Check ──────────────────────────────────────────────────────────────

@app.get("/health")
async def health():
    return {
        "status": "healthy",
        "service": "medscribe-ai-backend",
        "version": "2.0.0",
    }


# ── Global Exception Handler ─────────────────────────────────────────────────

@app.exception_handler(Exception)
async def global_exception_handler(request: Request, exc: Exception):
    logger.error(f"Unhandled exception: {exc}", exc_info=True)
    return JSONResponse(
        status_code=500,
        content={"detail": "Internal server error"},
    )


if __name__ == "__main__":
    import uvicorn
    uvicorn.run("app.main:app", host=settings.HOST, port=settings.PORT, reload=settings.DEBUG)

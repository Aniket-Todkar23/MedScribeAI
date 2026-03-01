# AI Core Service

Unified AI backend for the MedScribe AI system. Provides audio transcription, medical entity extraction, EMR generation, ICD code lookup, and multi-stage document analysis — all exposed through a single FastAPI service.

## Architecture

```
AI_Backend/
├── main.py                     # FastAPI app + lifespan (loads all services)
├── config.py                   # Settings from env / .env
├── routes.py                   # All API endpoints (mounted at /api/v1)
├── schemas.py                  # Pydantic models (FHIR R4 aligned)
├── transcription_service.py    # faster-whisper wrapper (local CPU)
├── medgemma_service.py         # MedGemma-27B proxy (Modal GPU)
├── icd_service.py              # ICD-9/10 fuzzy lookup (local CSV)
├── doc_analysis_service.py     # 3-stage document analysis pipeline
├── unique_icd9_codes.csv       # ICD-9 code database
├── unique_icd10_codes.csv      # ICD-10 code database
├── test_service.py             # Service tests
├── requirements.txt
├── Dockerfile
└── .env.example
```

## GPU Offloading

All heavy inference runs on **Modal** (serverless GPU):

| Model | GPU | Purpose |
|-------|-----|---------|
| **MedGemma-27B** | A100-80 GB | Entity extraction, clinical reasoning, narrative generation, summaries |
| **Qwen2.5-VL-7B** | A100-40 GB | Document perception (image/PDF → markdown) |

Local compute (CPU only):
- **faster-whisper**: Audio transcription (configurable model size)
- **ICD lookup**: Token-overlap fuzzy matching over 26 k+ codes
- **Markdown parsing**: Structured data extraction from Qwen-VL output

## Endpoints

All endpoints are prefixed with `/api/v1` (11 routes):

| Method | Path | Description |
|--------|------|-------------|
| GET | `/health` | Health check + model/service status |
| POST | `/transcribe` | Audio transcription via faster-whisper (multipart file) |
| POST | `/extract` | Medical entity extraction from transcript (MedGemma-27B) |
| POST | `/generate-emr` | FHIR R4-aligned EMR generation (MedGemma-27B) |
| POST | `/patient-summary` | Patient-friendly visit summary (MedGemma-27B) |
| POST | `/icd-lookup` | ICD-9/10 fuzzy code search (local CSV) |
| POST | `/suggest-diagnoses` | AI differential diagnosis from symptoms (MedGemma-27B) |
| POST | `/doc/analyze-document` | 3-stage document analysis pipeline (multipart file) |
| POST | `/doc/patient-report` | Generate patient-friendly report from analysis |
| POST | `/doc/clinician-report` | Generate clinician-oriented report with ICD codes |
| POST | `/doc/chat` | MedGemma chat completion (general medical Q&A) |

## Setup

### 1. Prerequisites
- Python 3.11+
- Modal endpoints deployed (MedGemma-27B + Qwen2.5-VL)
- ICD CSV files (included in repo)

### 2. Install
```bash
cd AI_Backend
pip install -r requirements.txt
```

### 3. Configure
```bash
cp .env.example .env
# Edit .env with your Modal endpoint URLs
```

Required environment variables:

| Variable | Required | Description |
|----------|----------|-------------|
| `MODAL_MEDGEMMA_URL` | Yes | Modal MedGemma-27B endpoint URL |
| `MODAL_QWEN_VL_URL` | Yes | Modal Qwen2.5-VL endpoint URL |
| `WHISPER_MODEL_SIZE` | No | faster-whisper model (default: `base`) |
| `WHISPER_DEVICE` | No | Compute device (default: `cpu`) |
| `WHISPER_COMPUTE_TYPE` | No | Quantization (default: `int8`) |
| `ICD9_CSV_PATH` | No | Path to ICD-9 CSV |
| `ICD10_CSV_PATH` | No | Path to ICD-10 CSV |

### 4. Run
```bash
uvicorn main:app --host 0.0.0.0 --port 8000 --reload
```

### Docker
```bash
# From project root:
docker compose up --build ai_backend
```

## Document Analysis Pipeline

The `/doc/analyze-document` endpoint runs a 3-stage pipeline:

1. **Stage 1 — Perception** (Qwen2.5-VL): PDF/image → rich markdown
2. **Stage 2 — Reasoning** (MedGemma-27B): Markdown → clinical reasoning + structured JSON
3. **Stage 3 — Reports**: Structured data → patient-friendly or clinician-friendly narrative

## Modal Deployment

GPU model servers are defined in the `Modal/` directory at the project root:

| Script | Model | GPU |
|--------|-------|-----|
| `modal_medgemma27b.py` | MedGemma-27B | A100-80 GB |
| `modal_medgemma4b.py` | MedGemma-4B | A100-40 GB |
| `modal_qwen2_vl.py` | Qwen2.5-VL-7B | A100-40 GB |

Deploy with:
```bash
modal deploy Modal/modal_medgemma27b.py
modal deploy Modal/modal_qwen2_vl.py
```

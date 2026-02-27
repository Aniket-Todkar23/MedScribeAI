# AI Core Service

Unified AI backend for the Smart EMR system. Merges the previous `Fastapi_backend` (audio pipeline) and `Doc_Analysis_Backend` (document pipeline) into a single service.

## Architecture

```
AI_Backend/
├── main.py                     # FastAPI app + lifespan
├── config.py                   # Settings from env / .env
├── routes.py                   # All API endpoints (mounted at /api/v1)
├── schemas.py                  # Pydantic models (FHIR R4 aligned)
├── transcription_service.py    # faster-whisper wrapper
├── medgemma_service.py         # MedGemma-27B proxy (Modal)
├── icd_service.py              # ICD-9/10 fuzzy lookup
├── doc_analysis_service.py     # 3-stage document analysis pipeline
├── requirements.txt
├── Dockerfile
└── .env.example
```

## Endpoints

All endpoints are prefixed with `/api/v1` (12 routes):

| Method | Path | Description |
|--------|------|-------------|
| GET | `/health` | Health check |
| POST | `/transcribe` | Audio transcription via faster-whisper (multipart file) |
| POST | `/extract` | Medical entity extraction from transcript (MedGemma-27B) |
| POST | `/generate-emr` | FHIR R4-aligned EMR generation (MedGemma-27B) |
| POST | `/patient-summary` | Patient-friendly visit summary (MedGemma-27B) |
| POST | `/icd-lookup` | ICD-9/10 fuzzy code search (local CSV) |
| POST | `/suggest-diagnoses` | AI differential diagnosis from symptoms (MedGemma-27B) |
| POST | `/doc/analyze-document` | 3-stage document analysis pipeline (multipart file) |
| POST | `/doc/patient-report` | Generate patient-friendly report from analysis |
| POST | `/doc/clinician-report` | Generate clinician-oriented report from analysis |
| POST | `/doc/chat` | MedGemma chat completion (general medical Q&A) |

## Setup

### 1. Prerequisites
- Python 3.11+
- Modal endpoints deployed (MedGemma-27B + Qwen2.5-VL)
- ICD CSV files (included in `AI_Backend/Fastapi_backend/`)

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

### 4. Run
```bash
python main.py
# or
uvicorn main:app --host 0.0.0.0 --port 8000 --reload
```

### Docker
```bash
# From project root:
docker compose up ai-core
```

## GPU Offloading

All heavy inference runs on Modal:
- **MedGemma-27B** (A100-80GB): Entity extraction, clinical reasoning, narrative generation, summaries
- **Qwen2.5-VL-7B** (A100-40GB): Document perception (image → markdown)

Local compute:
- **faster-whisper** (CPU): Audio transcription
- **ICD lookup** (CPU): Token-overlap fuzzy matching
- **Markdown parsing** (CPU): Structured data extraction from Qwen-VL output

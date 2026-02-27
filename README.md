# Smart EMR & Diagnostic Assistant

> A voice-first, AI-powered Electronic Medical Record system that transforms clinician-patient interactions into structured data, diagnoses, and actionable insights.

## Architecture Overview

```
┌───────────────────────────────────────────────────────────────┐
│                       Docker Compose                          │
│                                                               │
│  ┌──────────┐  ┌──────────┐  ┌──────────┐  ┌──────────────┐   │
│  │ postgres │  │ livekit  │  │ ai-core  │  │   server     │   │
│  │ :5433    │  │ :7880    │  │ :8000    │  │   :3001      │   │
│  └──────────┘  └──────────┘  └─────┬────┘  └───────┬──────┘   │
│                                    │               │          │
│                              ┌─────▼───────────────▼──────┐   │
│                              │   Modal GPU Cloud          │   │
│                              │ MedGemma-27B │ Qwen2.5-VL  │   │
│                              └────────────────────────────┘   │
│                                                               │
│  ┌─────────────────────────────────────────────────────────┐  │
│  │              Ollama (host) — Qwen2.5:7b                 │  │
│  │              Fallback LLM for LangGraph agents          │  │
│  └─────────────────────────────────────────────────────────┘  │
└───────────────────────────────────────────────────────────────┘
```

| Service | Technology | Role |
|---------|-----------|------|
| **server** | Python FastAPI, PostgreSQL 16, Alembic | Central orchestrator — Auth, CRUD, HIPAA compliance, FHIR R4, LiveKit rooms, LangGraph agents |
| **ai-core** | Python FastAPI, faster-whisper | Stateless AI gateway — transcription, entity extraction, ICD lookup, Modal GPU proxy |
| **livekit** | LiveKit Server | WebRTC real-time video/audio for telehealth consultations |
| **postgres** | PostgreSQL 16 Alpine | Relational DB with 9 tables managed by Alembic migrations |
| **Ollama** | Qwen2.5:7b (host-side) | Local LLM fallback when Gemini quota is exhausted |
| **Modal** | MedGemma-27B, Qwen2.5-VL-7B | Remote GPU inference for clinical NLP and document vision |

## Key Features

### Patient Portal
- Dashboard with health snapshot & quick actions
- AI Health Assistant (LangGraph agent with DB-backed tools)
- Document center with AI-powered plain-English breakdowns
- Telehealth consultations via LiveKit WebRTC

### Doctor Portal
- Appointment inbox/queue with approve/reject workflow
- Patient viewer with longitudinal records & FHIR R4 export
- Live meeting room with AI sidebar (clinician agent + MedGemma)
- ICD-10 diagnostic sandbox with fuzzy search
- Post-meeting SOAP note auto-drafting

### AI Pipeline
- **Speech-to-Text**: Faster-whisper local transcription (no diarization — LiveKit provides separate tracks)
- **Entity Extraction**: MedGemma-27B extracts structured clinical entities with regex auto-healing
- **EMR Generation**: FHIR-aligned EMR from extracted entities
- **Document Analysis**: PDF/Image → Qwen2.5-VL markdown → MedGemma clinical reasoning → structured JSON
- **ICD Lookup**: In-memory fuzzy search over ICD-9 & ICD-10 CSV datasets
- **Differential Diagnosis**: Symptom input → MedGemma reasoning + ICD code mapping

### LangGraph Agents (3-Tier Fallback)
Both patient and clinician agents use an automatic fallback chain:

1. **Gemini 2.0 Flash** — Primary LLM via Google API (with 5-minute circuit-breaker on quota errors)
2. **Ollama Qwen2.5:7b** — Local fallback via httpx (zero extra dependencies)
3. **Keyword matching** — Deterministic tool dispatch when no LLM is available

### Security & HIPAA Compliance
- JWT authentication with bcrypt password hashing
- PII masking middleware (audit trail)
- De-identification before external LLM calls
- Immutable audit logging (WHO, WHAT, WHEN)
- Auto-logout after 15 min inactivity (frontend)

## Quick Start

### Prerequisites
- Docker & Docker Compose
- Ollama installed on host (for local LLM fallback)
- Modal account with deployed MedGemma-27B & Qwen2.5-VL endpoints

### 1. Clone & Configure

```bash
git clone <repository-url>
cd Cavista
```

Create `Backend/.env`:
```env
DATABASE_URL=postgresql+asyncpg://smartemr:smartemr_dev_2026@localhost:5433/smartemr
JWT_SECRET=dev-secret-key-change-in-production-2026
GEMINI_API_KEY=<your-gemini-api-key>
AI_BACKEND_URL=http://localhost:8000/api/v1
LIVEKIT_URL=http://localhost:7880
LIVEKIT_API_KEY=devkey
LIVEKIT_API_SECRET=secret
OLLAMA_BASE_URL=http://localhost:11434
OLLAMA_MODEL=qwen2.5:7b
```

Create `AI_Backend/.env`:
```env
MODAL_MEDGEMMA_URL=https://<your-modal-medgemma-endpoint>.modal.run
MODAL_QWEN_VL_URL=https://<your-modal-qwen-endpoint>.modal.run
```

### 2. Pull Ollama Model (Optional — enables local fallback)

```bash
ollama pull qwen2.5:7b
```

### 3. Start All Services

```bash
docker compose up --build -d
```

This starts 4 containers:
- `smartemr-postgres` → `:5433`
- `smartemr-livekit` → `:7880`
- `smartemr-ai-core` → `:8000`
- `smartemr-server` → `:3001`

### 4. Verify

```bash
curl http://localhost:3001/health     # Server health
curl http://localhost:8000/api/v1/health  # AI Core health
```

## API Documentation

Interactive Swagger docs available at:
- **Server**: http://localhost:3001/docs
- **AI Core**: http://localhost:8000/docs

### Server Endpoints (58 routes)

| Prefix | Routes | Description |
|--------|--------|-------------|
| `/auth` | 5 | Signup, login, refresh, profile |
| `/patients` | 6 | Patient CRUD, onboarding |
| `/doctors` | 4 | Doctor CRUD, listing |
| `/appointments` | 8 | Book, approve, reject, cancel |
| `/consultations` | 5 | Create, update, audio processing |
| `/documents` | 5 | Upload, AI analysis, patient/clinician views |
| `/meetings` | 4 | LiveKit room create, join token, end |
| `/agent` | 5 | LangGraph chat (patient/clinician/meeting), history |
| `/ai` | 11 | Proxy to AI Core (transcribe, extract, EMR, ICD, chat, etc.) |
| `/fhir` | 4 | FHIR R4 resources (Patient, Encounter, Condition, MedicationRequest) |

### AI Core Endpoints (11 routes)

| Method | Path | Description |
|--------|------|-------------|
| GET | `/health` | Service health + model status |
| POST | `/transcribe` | Audio → text (faster-whisper) |
| POST | `/extract` | Transcript → structured entities (MedGemma) |
| POST | `/generate-emr` | Entities → FHIR-aligned EMR (MedGemma) |
| POST | `/patient-summary` | EMR → plain-English summary (MedGemma) |
| POST | `/icd-lookup` | Fuzzy ICD-9/10 code search |
| POST | `/suggest-diagnoses` | Symptoms → differential diagnosis + ICD codes |
| POST | `/doc/analyze-document` | PDF/image → structured clinical report |
| POST | `/doc/patient-report` | Patient-friendly document report |
| POST | `/doc/clinician-report` | Clinician-focused document report |
| POST | `/doc/chat` | General AI chat completion |

## Database Schema (9 Tables)

| Table | Description |
|-------|-------------|
| `doctors` | Doctor accounts with specialization, license |
| `patients` | Patient accounts with demographics |
| `patient_onboarding` | Medical history, allergies, medications, lifestyle |
| `appointments` | Booking with status workflow (pending → approved → in_progress → completed) |
| `consultations` | SOAP notes, ICD codes, prescriptions, AI-generated fields |
| `documents` | Uploaded medical documents with AI analysis results |
| `chat_history` | LangGraph agent conversation persistence |
| `audit_log` | Immutable HIPAA audit trail |
| `notification_log` | Email/push notification records |

## Testing

### Full Backend Test Suite (69 tests)
```bash
cd Backend
python test_backend.py
```

### Agent-Specific Tests (8 tests)
```bash
cd Backend
python test_agents.py
```

## Project Structure

```
Cavista/
├── docker-compose.yml          # 4-service orchestration
│
├── Backend/                    # Primary Backend (FastAPI)
│   ├── Dockerfile
│   ├── requirements.txt
│   ├── alembic.ini + alembic/  # DB migrations
│   ├── test_backend.py         # 69-test comprehensive suite
│   ├── test_agents.py          # Agent endpoint tester
│   └── app/
│       ├── main.py, config.py, database.py
│       ├── api/                # 10 route modules (58 endpoints)
│       ├── models/             # 9 SQLAlchemy models
│       ├── schemas/            # Pydantic schemas
│       ├── services/           # AI service client, meeting service
│       ├── agents/             # LangGraph agents
│       │   ├── patient_agent.py
│       │   ├── clinician_agent.py
│       │   ├── ollama_agent.py # Local LLM fallback (httpx)
│       │   ├── prompts.py
│       │   └── tools.py        # DB-backed agent tools
│       └── compliance/         # PII masker, audit middleware
│
├── AI_Backend/                 # AI Core Service (FastAPI)
│   ├── Dockerfile
│   ├── main.py, config.py, routes.py, schemas.py
│   ├── transcription_service.py  # faster-whisper
│   ├── medgemma_service.py       # Modal MedGemma proxy
│   ├── icd_service.py            # ICD fuzzy search
│   ├── doc_analysis_service.py   # Document analysis pipeline
│   └── unique_icd9/10_codes.csv  # ICD CSV data files
│
└── Modal/                      # Modal deployment scripts
```

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Backend Framework | FastAPI 0.115, Python 3.11 |
| Database | PostgreSQL 16, SQLAlchemy 2.0 (async), Alembic |
| Auth | JWT (python-jose), bcrypt |
| AI Orchestration | LangGraph 0.2.60, LangChain 0.3.14 |
| LLM (Cloud) | Gemini 2.0 Flash (Google), MedGemma-27B (Modal A100) |
| LLM (Local) | Qwen2.5:7b via Ollama |
| Vision AI | Qwen2.5-VL-7B (Modal A100) |
| Transcription | faster-whisper (local CPU) |
| Video/Audio | LiveKit WebRTC |
| Document Parsing | PyMuPDF, Pillow |
| Containerization | Docker Compose (4 services) |

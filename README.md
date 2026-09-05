# MedScribe AI — AI-Powered EMR & Clinical Diagnostic Assistant

> A voice-first, AI-powered Electronic Medical Record system that transforms clinician-patient interactions into structured clinical data, diagnoses, and actionable insights — all inside a unified web platform.

---

## Architecture

![System Architecture](architecture-diagram.png)

| Service | Technology | Role |
|---------|-----------|------|
| **frontend** | React 19, Vite 7, Tailwind CSS v4, nginx | SPA served via nginx; reverse-proxies `/api/v1` to the backend |
| **backend** | Python FastAPI, PostgreSQL 16, Alembic | Central orchestrator — Auth, CRUD, HIPAA compliance, FHIR R4, LiveKit rooms, LangGraph agents |
| **ai_backend** | Python FastAPI, faster-whisper | Stateless AI gateway — transcription, entity extraction, ICD lookup, Modal GPU proxy |
| **livekit** | LiveKit Server | WebRTC real-time video/audio for telehealth consultations |
| **postgresdb** | PostgreSQL 16 Alpine | Relational DB with 9 tables managed by Alembic migrations |
| **Ollama** | Qwen2.5:7b (host-side) | Local LLM fallback when Gemini quota is exhausted |
| **Modal** | MedGemma-27B, Qwen2.5-VL-7B | Remote GPU inference for clinical NLP and document vision |

---

## Key Features

### Patient Portal
- Dashboard with health snapshot, vital-status indicators, appointment countdown & quick actions
- AI Health Assistant (LangGraph agent with DB-backed tools)
- Document center with AI-powered plain-English breakdowns
- Telehealth consultations via LiveKit WebRTC
- Full EMR PDF export and FHIR R4 record download

### Doctor Portal
- Appointment inbox/queue with approve/reject workflow and pending-approval badge
- Patient viewer with longitudinal records & FHIR R4 export
- Live meeting room with AI sidebar (clinician agent + MedGemma)
- ICD-10 diagnostic sandbox with fuzzy search
- Post-meeting SOAP note auto-drafting
- Per-visit PDF report generation

### AI Pipeline
- **Speech-to-Text**: faster-whisper local transcription (LiveKit provides separate per-participant tracks)
- **Entity Extraction**: MedGemma-27B extracts structured clinical entities with regex auto-healing
- **EMR Generation**: FHIR-aligned EMR from extracted entities
- **Document Analysis**: PDF/Image → Qwen2.5-VL markdown → MedGemma clinical reasoning → structured JSON
- **ICD Lookup**: In-memory fuzzy search over ICD-9 & ICD-10 CSV datasets (26 k+ codes)
- **Differential Diagnosis**: Symptom input → MedGemma reasoning + ICD code mapping

### LangGraph Agents (3-Tier Fallback)
Both patient and clinician agents use an automatic fallback chain:

![LangGraph Healthcare Agent Flow](langgraph-agent-flow.png)

1. **Gemini 2.0 Flash** — Primary LLM via Google API (5-minute circuit-breaker on quota errors)
2. **Ollama Qwen2.5:7b** — Local fallback via httpx (zero extra dependencies)
3. **Keyword matching** — Deterministic tool dispatch when no LLM is available

### Security & HIPAA Compliance
- JWT authentication (HS256) with bcrypt password hashing
- PII masking middleware (audit trail)
- De-identification before external LLM calls
- Immutable audit logging (WHO, WHAT, WHEN)
- Auto-logout after 15 min inactivity (frontend)

---

## Quick Start

### Prerequisites

| Requirement | Notes |
|--|--|
| Docker & Docker Compose | Required |
| Ollama (host) | Optional — enables local LLM fallback (`ollama pull qwen2.5:7b`) |
| Modal account | Required — MedGemma-27B & Qwen2.5-VL endpoints |
| Gemini API key | Required — LangGraph agent primary LLM |

### 1. Clone & Configure

```bash
git clone <repository-url>
cd MedScribe-AI
```

Create **`Backend/.env`** (see `Backend/.env.example`):

```env
DATABASE_URL=postgresql+asyncpg://smartemr:smartemr_dev_2026@localhost:5433/smartemr
JWT_SECRET=dev-secret-key-change-in-production-2026
GEMINI_API_KEY=<your-gemini-key>
AI_BACKEND_URL=http://localhost:8000/api/v1
LIVEKIT_URL=http://localhost:7880
LIVEKIT_API_KEY=devkey
LIVEKIT_API_SECRET=secret
OLLAMA_BASE_URL=http://localhost:11434
OLLAMA_MODEL=qwen2.5:7b
```

Create **`AI_Backend/.env`** (see `AI_Backend/.env.example`):

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

This starts **5 containers**:

| Container | Port | URL |
|-----------|------|-----|
| `postgresdb` | 5433 | — |
| `livekit` | 7880 | `ws://localhost:7880` |
| `ai_backend` | 8000 | `http://localhost:8000/docs` |
| `backend` | 3001 | `http://localhost:3001/docs` |
| `frontend` | 5173 | **`http://localhost:5173`** |

### 4. Seed the Database (Optional)

```bash
docker exec backend python -m app.seed_data
```

Inserts 5 doctors, 10 patients, 10 onboarding records, 16+ consultations with full transcriptions, SOAP notes, ICD codes, and prescriptions.

### 5. Verify

```bash
curl http://localhost:3001/health          # Server health
curl http://localhost:8000/api/v1/health   # AI Core health
curl http://localhost:5173                  # Frontend (HTML)
```

---

## Running Without Docker (Local Dev)

### Backend

```bash
cd Backend
python -m venv venv && venv\Scripts\activate   # Windows
pip install -r requirements.txt
# Start Postgres separately on port 5433
alembic upgrade head
uvicorn app.main:app --host 0.0.0.0 --port 3001 --reload
```

### AI Core

```bash
cd AI_Backend
pip install -r requirements.txt
uvicorn main:app --host 0.0.0.0 --port 8000 --reload
```

### Frontend

```bash
cd frontend
npm install
npm run dev          # → http://localhost:5173
```

---

## API Documentation

Interactive Swagger docs:
- **Server**: http://localhost:3001/docs
- **AI Core**: http://localhost:8000/docs

### Server Endpoints (69 routes)

| Prefix | Routes | Description |
|--------|--------|-------------|
| `/auth` | 5 | Signup (doctor/patient), login, refresh, profile |
| `/patients` | 7 | Patient CRUD, onboarding |
| `/doctors` | 4 | Doctor CRUD, listing |
| `/appointments` | 9 | Book, schedule, approve, reject, cancel |
| `/consultations` | 5 | Create, update, audio processing |
| `/documents` | 6 | Upload, AI analysis, patient/clinician views |
| `/meetings` | 6 | LiveKit room create, join, transcribe-turn |
| `/agent` | 5 | LangGraph chat (patient/clinician/meeting), history |
| `/ai` | 11 | Proxy to AI Core (transcribe, extract, EMR, ICD, chat, etc.) |
| `/fhir` | 8 | FHIR R4 resources, bundles, visit-report PDF, patient-EMR PDF |
| `/drugs` | 2 | Drug search & options |
| `/health` | 1 | Health check |

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

---

## Database Schema (9 Tables)

| Table | Description |
|-------|-------------|
| `doctors` | Doctor accounts with specialization, license |
| `patients` | Patient accounts with demographics |
| `patient_onboarding` | Medical history, allergies, medications, lifestyle |
| `appointments` | Booking with status workflow (pending → approved → in_progress → completed) |
| `consultations` | SOAP notes, ICD codes, prescriptions, AI-generated fields (JSONB) |
| `documents` | Uploaded medical documents with AI analysis results |
| `chat_history` | LangGraph agent conversation persistence |
| `audit_log` | Immutable HIPAA audit trail |
| `notification_log` | Email/push notification records |

---

## Testing

### Backend Test Suite (69 tests)
```bash
cd Backend
python test_backend.py
```

### Agent-Specific Tests (8 tests)
```bash
cd Backend
python test_agents.py
```

### Postman Collection
Import `MedScribe_AI_Postman_Collection.json` into Postman for manual API testing.

---

## Project Structure

```
MedScribe-AI/
├── docker-compose.yml              # 5-service orchestration
├── README.md                       # This file
│
├── frontend/                       # React SPA
│   ├── Dockerfile                  # Multi-stage: node build → nginx serve
│   ├── nginx.conf                  # SPA routing + API reverse-proxy
│   ├── package.json
│   ├── vite.config.ts
│   └── src/
│       ├── App.tsx                 # Router with role-based routes
│       ├── main.tsx                # React entry point
│       ├── index.css               # Tailwind v4 imports
│       ├── components/             # 4 shared components
│       │   ├── Layout.tsx          #   App shell wrapper
│       │   ├── Navbar.tsx          #   Top nav with active route pills
│       │   ├── DocumentViewer.tsx  #   AI analysis result renderer
│       │   └── PatientAgentChat.tsx #   Floating AI assistant widget
│       ├── pages/                  # 11 pages
│       │   ├── Home.tsx            #   Landing / login
│       │   ├── DoctorDashboard.tsx #   Doctor home with pending approvals
│       │   ├── PatientDashboard.tsx#   Patient home with vital indicators
│       │   ├── ConsultationEditor.tsx # Voice-first consultation workspace
│       │   ├── MeetingRoom.tsx     #   LiveKit WebRTC video room
│       │   ├── Meetings.tsx        #   Meeting list / scheduling
│       │   ├── DocumentCenter.tsx  #   Document upload & AI analysis
│       │   ├── FindDoctors.tsx     #   Doctor discovery & booking
│       │   ├── PatientProfile.tsx  #   Patient profile & onboarding
│       │   ├── DoctorAnalytics.tsx #   Doctor analytics / stats
│       │   └── PatientAnalytics.tsx#   Patient analytics + EMR download
│       ├── lib/                    # Utilities
│       │   ├── api.ts             #   Typed Axios client (auth, FHIR, etc.)
│       │   ├── types.ts           #   TypeScript interfaces
│       │   └── utils.ts           #   Helpers (cn, formatDate, etc.)
│       └── store/
│           └── authStore.ts       #   Zustand auth / user state
│
├── Backend/                        # Primary FastAPI Backend
│   ├── Dockerfile
│   ├── requirements.txt
│   ├── alembic.ini + alembic/     # DB migrations
│   └── app/
│       ├── main.py, config.py, database.py
│       ├── api/                   # 11 route modules (69 endpoints)
│       │   ├── auth.py            #   Signup, login, refresh
│       │   ├── patients.py        #   Patient CRUD + onboarding
│       │   ├── doctors.py         #   Doctor CRUD
│       │   ├── appointments.py    #   Booking workflow
│       │   ├── consultations.py   #   SOAP / audio pipeline
│       │   ├── documents.py       #   Upload + AI analysis
│       │   ├── meetings.py        #   LiveKit room management
│       │   ├── agent.py           #   LangGraph chat endpoints
│       │   ├── ai_proxy.py        #   Proxy to AI Core
│       │   ├── fhir.py            #   FHIR R4 + PDF export
│       │   └── drugs.py           #   Drug search
│       ├── models/                # 9 SQLAlchemy models
│       ├── schemas/               # Pydantic request/response schemas
│       ├── services/              # AI service client, meeting service
│       ├── agents/                # LangGraph agents
│       │   ├── patient_agent.py   #   5 DB-backed tools
│       │   ├── clinician_agent.py #   4 clinical tools
│       │   ├── ollama_agent.py    #   Local LLM fallback (httpx)
│       │   ├── prompts.py         #   System prompt templates
│       │   └── tools.py           #   Shared agent tool definitions
│       └── compliance/            # PII masker, audit middleware
│
├── AI_Backend/                    # AI Core Service (FastAPI)
│   ├── Dockerfile
│   ├── main.py                    # Entry point (port 8000)
│   ├── routes.py                  # 11 API endpoints
│   ├── schemas.py                 # Pydantic models
│   ├── config.py                  # Settings from env
│   ├── transcription_service.py   # faster-whisper
│   ├── medgemma_service.py        # Modal MedGemma-27B proxy
│   ├── icd_service.py             # ICD-9/10 fuzzy lookup
│   ├── doc_analysis_service.py    # 3-stage document analysis
│   ├── unique_icd9_codes.csv      # ICD-9 code database
│   └── unique_icd10_codes.csv     # ICD-10 code database
│
└── Modal/                         # Modal GPU deployment scripts
    ├── modal_medgemma27b.py       # MedGemma-27B server
    ├── modal_medgemma4b.py        # MedGemma-4B server
    └── modal_qwen2_vl.py          # Qwen2.5-VL document analysis server
```

---

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Frontend | React 19, Vite 7.3, TypeScript 5.9, Tailwind CSS v4, Framer Motion |
| State Management | Zustand, React Query (TanStack) |
| Routing | React Router v7 |
| Video/Audio | LiveKit WebRTC (`@livekit/components-react`) |
| Backend Framework | FastAPI 0.115, Python 3.11 |
| Database | PostgreSQL 16, SQLAlchemy 2.0 (async), Alembic |
| Auth | JWT (python-jose), bcrypt |
| AI Orchestration | LangGraph 0.2.60, LangChain 0.3.14 |
| LLM (Cloud) | Gemini 2.0 Flash (Google), MedGemma-27B (Modal A100-80 GB) |
| LLM (Local) | Qwen2.5:7b via Ollama |
| Vision AI | Qwen2.5-VL-7B (Modal A100-40 GB) |
| Transcription | faster-whisper (local CPU) |
| Document Parsing | PyMuPDF, Pillow |
| PDF Generation | ReportLab |
| Containerization | Docker Compose (5 services) |

---

## Environment Variables

### Backend (`Backend/.env`)

| Variable | Required | Description |
|----------|----------|-------------|
| `DATABASE_URL` | Yes | PostgreSQL connection string |
| `JWT_SECRET` | Yes | Secret key for JWT signing |
| `JWT_ALGORITHM` | No | Default `HS256` |
| `JWT_ACCESS_EXPIRE_MINUTES` | No | Default `30` |
| `JWT_REFRESH_EXPIRE_DAYS` | No | Default `7` |
| `AI_BACKEND_URL` | Yes | AI Core base URL |
| `GEMINI_API_KEY` | Yes | Google Gemini API key |
| `LIVEKIT_URL` | Yes | LiveKit server URL |
| `LIVEKIT_API_KEY` | Yes | LiveKit API key |
| `LIVEKIT_API_SECRET` | Yes | LiveKit API secret |
| `OLLAMA_BASE_URL` | No | Ollama URL (local LLM fallback) |
| `OLLAMA_MODEL` | No | Default `qwen2.5:7b` |
| `UPLOAD_DIR` | No | Default `./uploads` |

### AI Core (`AI_Backend/.env`)

| Variable | Required | Description |
|----------|----------|-------------|
| `MODAL_MEDGEMMA_URL` | Yes | Modal MedGemma-27B endpoint |
| `MODAL_QWEN_VL_URL` | Yes | Modal Qwen2.5-VL endpoint |
| `WHISPER_MODEL_SIZE` | No | Default `base` |
| `WHISPER_DEVICE` | No | Default `cpu` |
| `WHISPER_COMPUTE_TYPE` | No | Default `int8` |

---
